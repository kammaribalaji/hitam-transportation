// Pure geometry and heading helpers for the tracking maps.
// Integrated from HypeGPS tracking engine.

export function haversineKm(a, b) {
  if (!a || !b || !Number.isFinite(a[0]) || !Number.isFinite(b[0])) return 0
  const toRad = (d) => (d * Math.PI) / 180
  const R = 6371
  const dLat = toRad(b[0] - a[0])
  const dLng = toRad(b[1] - a[1])
  const lat1 = toRad(a[0])
  const lat2 = toRad(b[0])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/**
 * Geographic bearing in degrees: 0 = North, 90 = East, 180 = South, 270 = West.
 */
export function bearingDegrees(from, to) {
  if (!from || !to) return 0
  const fromLat = from.latitude ?? from.lat ?? from[0]
  const fromLng = from.longitude ?? from.lng ?? from[1]
  const toLat = to.latitude ?? to.lat ?? to[0]
  const toLng = to.longitude ?? to.lng ?? to[1]

  const dLat = toLat - fromLat
  const dLng = toLng - fromLng
  if (Math.abs(dLat) < 1e-12 && Math.abs(dLng) < 1e-12) return 0
  return ((Math.atan2(dLng, dLat) * 180) / Math.PI + 360) % 360
}

export function normalizeHeading(deg) {
  if (!Number.isFinite(deg)) return 0
  return ((deg % 360) + 360) % 360
}

export function headingDelta(from, to) {
  return ((to - from + 540) % 360) - 180
}

/**
 * Calculate bearing from recent GPS trail tail points.
 */
export function bearingFromTail(lat, lng, tail) {
  if (!Array.isArray(tail) || tail.length < 1) return null

  const end = { lat, lng }
  const candidates = []
  for (let i = tail.length - 1; i >= 0 && candidates.length < 4; i--) {
    const p = tail[i]
    if (p) {
      candidates.push({
        lat: p.latitude ?? p.lat ?? p[0],
        lng: p.longitude ?? p.lng ?? p[1],
      })
    }
  }

  const MIN_SEGMENT = 2e-5
  for (const start of candidates) {
    const dist = Math.abs(end.lat - start.lat) + Math.abs(end.lng - start.lng)
    if (dist >= MIN_SEGMENT) {
      return bearingDegrees(start, end)
    }
  }

  if (candidates.length >= 2) {
    const a = candidates[1]
    const b = candidates[0]
    const dist = Math.abs(b.lat - a.lat) + Math.abs(b.lng - a.lng)
    if (dist >= MIN_SEGMENT) {
      return bearingDegrees(a, b)
    }
  }

  return null
}

/**
 * Calculate effective travel heading for the bus icon.
 */
export function effectiveBusHeading(location) {
  if (!location) return 0
  const course = normalizeHeading(Number(location.heading) || 0)
  const speed = Number(location.speed) || 0
  const moving = speed >= 3

  if (moving) {
    const fromTrail = bearingFromTail(
      location.latitude,
      location.longitude,
      location.tail
    )
    if (fromTrail != null) {
      const delta = Math.abs(headingDelta(course, fromTrail))
      if (delta > 25 || course === 0) {
        return fromTrail
      }
      return normalizeHeading(course + headingDelta(course, fromTrail) * 0.65)
    }
  }

  return course
}
