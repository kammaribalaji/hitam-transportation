// ============================================================================
// HypeGPS provider service — server-only live GPS integration.
// ----------------------------------------------------------------------------
// Pulls device locations from the HypeGPS platform API and converts them into
// this application's own payload shape. The API hash is read from environment
// variables ONLY and is never exposed to the frontend, Vite, or any API
// response. A short in-memory TTL cache prevents every student/browser from
// independently calling the provider, and a per-device "last known good"
// snapshot is served (marked stale) when the provider is temporarily
// unreachable. HypeGPS data is NEVER replaced with simulated coordinates.
//
// Route -> device mapping lives in the PostgreSQL GpsDevice table (seeded from
// backend/prisma/route12-data.js). ROUTE_TO_DEVICE_FALLBACK below is only a
// bootstrap used while the table is empty (e.g. before `npm run seed`), so a
// mapped route never silently falls back to simulated data.
//
// NOTE: the HypeGPS `get_devices` response format is not publicly documented,
// so the normalizer accepts several common field-name variants (id, lat/lng,
// speed, course/heading, online status, timestamp, tail). Verify the mapping
// against a real response from your account if the provider schema differs.
// ============================================================================

import prisma from '../lib/prisma.js';

const API_URL = process.env.HYPEGPS_API_URL || '';
const API_HASH = process.env.HYPEGPS_API_HASH || '';
const HITAM_GROUP = process.env.HYPEGPS_HITAM_GROUP || '';
const CACHE_TTL_MS = Math.max(1, Number(process.env.HYPEGPS_CACHE_TTL_SECONDS) || 5) * 1000;
const STALE_MS = Math.max(0, Number(process.env.HYPEGPS_STALE_SECONDS) || 120) * 1000;
const REQUEST_TIMEOUT_MS = 8000;

// Bootstrap mapping used ONLY while the GpsDevice table is empty. The seeded
// table is the source of truth; any DB row overrides this fallback.
const ROUTE_TO_DEVICE_FALLBACK = {
  '1': '1357',
  '2': '1358',
  '3': '1359',
  '4': '1360',
  '5': '1361',
  '6': '1362',
  '7': '1363',
  '8': '1364',
  '9': '1365',
  '10': '1366',
  '11': '1367',
  '12': '1368',
  '13': '1369',
  '14': '1370',
  '15': '1371',
  '16': '1372',
  '17': '1373',
  '18': '1374',
  '19': '1375',
  '20': '1376',
  '21': '1377',
  '22': '1378',
  '23': '1379',
};

export const SOURCE = 'HYPEGPS';

export const isHypegpsEnabled = () => Boolean(API_URL && API_HASH);

// ---------------------------------------------------------------------------
// Route -> device map (DB-backed, TTL-cached, bootstrap fallback)
// ---------------------------------------------------------------------------

let routeMapCache = { map: null, loadedAt: 0 };
const ROUTE_MAP_TTL_MS = 60_000;
let didLogFallbackMap = false;

async function loadRouteMap() {
  const now = Date.now();
  if (routeMapCache.map && now - routeMapCache.loadedAt < ROUTE_MAP_TTL_MS) return routeMapCache.map;

  let dbRows = [];
  try {
    dbRows = await prisma.gpsDevice.findMany({ select: { routeId: true, deviceId: true } });
  } catch {
    dbRows = []; // DB unreachable — use the bootstrap map for this request.
  }

  const dbMap = Object.fromEntries(dbRows.map((r) => [r.routeId, String(r.deviceId)]));
  const map = { ...ROUTE_TO_DEVICE_FALLBACK, ...dbMap };

  if (dbRows.length === 0 && !didLogFallbackMap) {
    didLogFallbackMap = true;
    console.log(`[HypeGPS] GpsDevice table empty — using bootstrap route map ${JSON.stringify(ROUTE_TO_DEVICE_FALLBACK)}`);
  }

  routeMapCache = { map, loadedAt: now };
  return map;
}

/** Device id for a route (from the GpsDevice table), or null when unmapped. */
export const getDeviceIdForRoute = async (routeId) => {
  const map = await loadRouteMap();
  return map[String(routeId)] || null;
};

/** Force the route-map cache to reload on the next lookup (after admin edits). */
export const refreshRouteMapCache = () => {
  routeMapCache = { map: null, loadedAt: 0 };
};

export class HypeGpsError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'HypeGpsError';
    this.code = code; // TIMEOUT | NETWORK | AUTH | INVALID_RESPONSE | DEVICE_NOT_FOUND | NO_COORDS | NOT_CONFIGURED
  }
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

// First defined (non-empty) value among the candidate keys, or undefined.
const pick = (obj, keys) => {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
};

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

const toIso = (v) => {
  if (v === undefined || v === null || v === '') return undefined;
  // HypeGPS returns Unix time in SECONDS (10-digit) while Date() expects
  // milliseconds (13-digit). Normalize both, plus ISO strings.
  let ms = v;
  if (typeof v === 'number' && v < 1e12) ms = v * 1000;
  else if (typeof v === 'string' && /^\d{10}$/.test(v)) ms = Number(v) * 1000;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
};

// Host only — never include the query string (the API hash travels in it).
const safeLogUrl = () => {
  try {
    return new URL(API_URL).host;
  } catch {
    return 'hypegps';
  }
};

const buildRequestUrl = () => {
  const url = new URL(API_URL);
  // The HypeGPS API authenticates with the account hash. `user_api_hash` is the
  // documented parameter; `hash` is sent as a compatibility alias since some
  // platform variants expect it. Both carry the same value — never logged.
  url.searchParams.set('user_api_hash', API_HASH);
  url.searchParams.set('hash', API_HASH);
  if (HITAM_GROUP) url.searchParams.set('group', HITAM_GROUP);
  return url;
};

// ---------------------------------------------------------------------------
// Cache + fetch (module-level, shared by every request in the process)
// ---------------------------------------------------------------------------

let devicesCache = { devices: null, fetchedAt: 0 };
let inflightFetch = null;
let didLogFirstFetch = false;

async function fetchDevices() {
  const now = Date.now();
  if (devicesCache.devices && now - devicesCache.fetchedAt < CACHE_TTL_MS) {
    return devicesCache.devices;
  }
  // De-duplicate concurrent requests when the cache just expired.
  if (inflightFetch) return inflightFetch;

  inflightFetch = (async () => {
    const url = buildRequestUrl();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res;
    try {
      try {
        res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
      } catch (err) {
        if (err?.name === 'AbortError') {
          throw new HypeGpsError('TIMEOUT', `HypeGPS request timed out after ${REQUEST_TIMEOUT_MS / 1000}s`);
        }
        throw new HypeGpsError('NETWORK', `HypeGPS request failed (${err?.message || 'network error'})`);
      } finally {
        clearTimeout(timer);
      }

      if (res.status === 401 || res.status === 403) {
        throw new HypeGpsError('AUTH', 'HypeGPS rejected the API hash (HTTP 401/403)');
      }
      if (!res.ok) {
        throw new HypeGpsError('INVALID_RESPONSE', `HypeGPS API responded with HTTP ${res.status}`);
      }

      let payload;
      try {
        payload = await res.json();
      } catch {
        throw new HypeGpsError('INVALID_RESPONSE', 'HypeGPS API returned a non-JSON response');
      }

      const devices = extractDevices(payload);
      devicesCache = { devices, fetchedAt: Date.now() };

      if (!didLogFirstFetch) {
        didLogFirstFetch = true;
        console.log(
          `[HypeGPS] first fetch OK — ${devices.length} device(s) from ${safeLogUrl()} ` +
          `(cache TTL ${CACHE_TTL_MS / 1000}s, stale after ${STALE_MS / 1000}s, group "${HITAM_GROUP || 'all'}")`
        );
      }
      return devices;
    } finally {
      inflightFetch = null;
    }
  })();

  return inflightFetch;
}

// Accepts a bare device array, common wrapper shapes ({ devices, data, result, ... }),
// or the REAL HypeGPS get_devices shape: an array of GROUPS, each
// { id, title, items: [devices...] }. Group items are flattened into the device
// list; a plain array without nested `items` is used as-is (backwards compatible).
function extractDevices(payload) {
  const raw = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object'
      ? (payload.devices ?? payload.data ?? payload.result ?? payload.list ?? payload.rows)
      : undefined;

  if (Array.isArray(raw)) {
    const nested = raw.flatMap((g) => (Array.isArray(g?.items) ? g.items : []));
    if (nested.length > 0) return applyGroupFilter(nested);
    return applyGroupFilter(raw);
  }
  if (raw && typeof raw === 'object') return applyGroupFilter([raw]);

  throw new HypeGpsError('INVALID_RESPONSE', 'HypeGPS response did not contain a device list');
}

// When HYPEGPS_HITAM_GROUP is set, keep only devices that carry a matching
// group field (devices without a group field are kept as a fallback).
function applyGroupFilter(devices) {
  if (!HITAM_GROUP) return devices;
  const group = HITAM_GROUP.toLowerCase();
  const filtered = devices.filter((d) => {
    const g = pick(d, ['group', 'group_name', 'groupName']);
    return g === undefined || String(g).toLowerCase() === group;
  });
  if (filtered.length !== devices.length && !didLogFirstFetch) {
    console.log(`[HypeGPS] group "${HITAM_GROUP}" filtered ${devices.length - filtered.length} device(s) out`);
  }
  return filtered;
}

// ---------------------------------------------------------------------------
// Normalization: provider device -> application payload
// ---------------------------------------------------------------------------

const DEVICE_ID_KEYS = ['id', 'device_id', 'deviceId', 'deviceID', 'imei'];
const LAT_KEYS = ['lat', 'latitude'];
const LNG_KEYS = ['lng', 'lon', 'longitude'];
const SPEED_KEYS = ['speed', 'velocity'];
const HEADING_KEYS = ['heading', 'course', 'direction', 'bearing'];
const TIME_KEYS = ['gps_time', 'gpsTime', 'device_time', 'timestamp', 'last_update', 'lastUpdate', 'time'];
const STATUS_KEYS = ['status', 'connection_status', 'online', 'is_online', 'state'];
const TAIL_KEYS = ['tail', 'track', 'history', 'points', 'recent_coordinates', 'recentCoordinates'];

function normalizeStatus(rawStatus, isStale) {
  if (rawStatus === undefined || rawStatus === null || rawStatus === '') {
    return isStale ? 'offline' : 'online';
  }
  const s = String(rawStatus).toLowerCase().trim();
  if (['online', 'active', 'connected', 'on', '1', 'true', 'yes'].includes(s)) return 'online';
  // "ack" = device acknowledged but has no live GPS fix — preserved as-is so the
  // frontend never shows it as LIVE.
  if (s === 'ack') return 'ack';
  if (['offline', 'inactive', 'disconnected', 'off', '0', 'false', 'no'].includes(s)) return 'offline';
  return isStale ? 'offline' : 'online';
}

function normalizeTail(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const points = [];
  for (const item of raw) {
    if (Array.isArray(item) && item.length >= 2) {
      const lat = toNumber(item[0]);
      const lng = toNumber(item[1]);
      if (lat !== undefined && lng !== undefined) {
        points.push({
          latitude: lat,
          longitude: lng,
          timestamp: item.length >= 3 ? toIso(item[2]) : undefined,
        });
      }
    } else if (item && typeof item === 'object') {
      const lat = toNumber(pick(item, LAT_KEYS));
      const lng = toNumber(pick(item, LNG_KEYS));
      if (lat !== undefined && lng !== undefined) {
        points.push({
          latitude: lat,
          longitude: lng,
          timestamp: toIso(pick(item, [...TIME_KEYS, 't'])),
        });
      }
    }
  }
  return points;
}

function normalizeDevice(raw, deviceId) {
  const lat = toNumber(pick(raw, LAT_KEYS));
  const lng = toNumber(pick(raw, LNG_KEYS));
  if (lat === undefined || lng === undefined) {
    throw new HypeGpsError('NO_COORDS', `HypeGPS device ${deviceId} has no coordinates yet`);
  }

  const gpsTime = toIso(pick(raw, TIME_KEYS));
  const nowIso = new Date().toISOString();
  const pingMs = gpsTime ? new Date(gpsTime).getTime() : Date.now();
  const isStale = Date.now() - pingMs > STALE_MS;

  return {
    gpsDeviceId: String(deviceId),
    latitude: lat,
    longitude: lng,
    speed: Math.max(0, toNumber(pick(raw, SPEED_KEYS)) ?? 0),
    heading: toNumber(pick(raw, HEADING_KEYS)) ?? null,
    status: normalizeStatus(pick(raw, STATUS_KEYS), isStale),
    source: SOURCE,
    // Aliases so consumers can use either naming convention.
    timestamp: gpsTime || nowIso, // GPS fix time from the provider
    lastUpdated: nowIso,          // when the backend last fetched it
    lastPingAt: gpsTime || nowIso,
    isStale,
    tail: normalizeTail(pick(raw, TAIL_KEYS)),
    fetchedAt: nowIso,
  };
}

function findDevice(devices, deviceId) {
  const want = String(deviceId);
  return devices.find((d) => String(pick(d, DEVICE_ID_KEYS) ?? '') === want) || null;
}

// ---------------------------------------------------------------------------
// Per-device "last known good" snapshot (served stale when provider is down)
// ---------------------------------------------------------------------------

const lastKnown = new Map(); // deviceId -> normalized payload

export function getLastKnownLocation(deviceId) {
  return lastKnown.get(String(deviceId)) || null;
}

// ---------------------------------------------------------------------------
// Admin/debug helpers (device list + sync status — never the API hash)
// ---------------------------------------------------------------------------

// Tolerant per-device summary for the admin device list (no error on missing
// coordinates — those are reported as null instead).
function summarizeDevice(raw) {
  const id = String(pick(raw, DEVICE_ID_KEYS) ?? '');
  const lat = toNumber(pick(raw, LAT_KEYS));
  const lng = toNumber(pick(raw, LNG_KEYS));
  const gpsTime = toIso(pick(raw, TIME_KEYS));
  const pingMs = gpsTime ? new Date(gpsTime).getTime() : Date.now();
  const isStale = Date.now() - pingMs > STALE_MS;
  const tailRaw = pick(raw, TAIL_KEYS);

  return {
    gpsDeviceId: id,
    latitude: lat ?? null,
    longitude: lng ?? null,
    speed: Math.max(0, toNumber(pick(raw, SPEED_KEYS)) ?? 0),
    heading: toNumber(pick(raw, HEADING_KEYS)) ?? null,
    status: normalizeStatus(pick(raw, STATUS_KEYS), isStale),
    lastPingAt: gpsTime || null,
    isStale,
    tailPoints: Array.isArray(tailRaw) ? tailRaw.length : 0,
  };
}

/**
 * Normalized list of every device in the (group-filtered) provider response.
 * Throws HypeGpsError when not configured or the provider call fails.
 */
export async function getAllDevices() {
  if (!isHypegpsEnabled()) {
    throw new HypeGpsError(
      'NOT_CONFIGURED',
      'HypeGPS is not configured (set HYPEGPS_API_URL and HYPEGPS_API_HASH)'
    );
  }
  const devices = await fetchDevices();
  return devices.map(summarizeDevice).filter((d) => d.gpsDeviceId);
}

/** Current provider sync info (cache age, route map, config — no secrets). */
export async function getSyncInfo() {
  const routeMap = await loadRouteMap();
  return {
    configured: isHypegpsEnabled(),
    apiHost: isHypegpsEnabled() ? safeLogUrl() : null,
    group: HITAM_GROUP,
    cacheTtlSeconds: CACHE_TTL_MS / 1000,
    staleSeconds: STALE_MS / 1000,
    lastSyncAt: devicesCache.devices ? new Date(devicesCache.fetchedAt).toISOString() : null,
    deviceCount: devicesCache.devices ? devicesCache.devices.length : 0,
    routeMap,
  };
}

/** Reverse of getDeviceIdForRoute: deviceId -> routeId (or null). */
export const getRouteForDevice = async (deviceId) => {
  const map = await loadRouteMap();
  const want = String(deviceId);
  for (const [routeId, devId] of Object.entries(map)) {
    if (String(devId) === want) return routeId;
  }
  return null;
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Latest normalized location for one HypeGPS device.
 * Throws HypeGpsError on provider/device problems.
 */
export async function getDeviceLocation(deviceId) {
  if (!isHypegpsEnabled()) {
    throw new HypeGpsError(
      'NOT_CONFIGURED',
      'HypeGPS is not configured (set HYPEGPS_API_URL and HYPEGPS_API_HASH)'
    );
  }

  const devices = await fetchDevices();
  const raw = findDevice(devices, deviceId);
  if (!raw) {
    throw new HypeGpsError('DEVICE_NOT_FOUND', `HypeGPS device ${deviceId} not found in provider response`);
  }

  const payload = normalizeDevice(raw, deviceId);
  lastKnown.set(String(deviceId), payload);
  return payload;
}

// ---------------------------------------------------------------------------
// Startup log (never includes the API hash or full URL)
// ---------------------------------------------------------------------------

if (isHypegpsEnabled()) {
  console.log(
    `[HypeGPS] enabled — ${safeLogUrl()} · cache TTL ${CACHE_TTL_MS / 1000}s · ` +
    `stale after ${STALE_MS / 1000}s · group "${HITAM_GROUP || 'all'}" · ` +
    'route map: GpsDevice table (bootstrap ' + `${JSON.stringify(ROUTE_TO_DEVICE_FALLBACK)})`
  );
} else {
  console.log(
    '[HypeGPS] disabled — set HYPEGPS_API_URL and HYPEGPS_API_HASH to enable real GPS tracking ' +
    '(legacy location endpoints remain active)'
  );
}
