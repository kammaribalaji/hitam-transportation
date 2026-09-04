import prisma from '../lib/prisma.js';

// Format current time into "hh:mm AM/PM"
export const formatTimeStr = (date = new Date()) => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const getTodayDateStr = (date = new Date()) => {
  return date.toISOString().split('T')[0];
};

/**
 * Automatically evaluates bus position against route stops and logs departed timestamps in DB.
 */
export async function autoRecordStopDepartures(routeId, busLat, busLng, busSpeed = 0, busNumber = '') {
  if (!routeId || !Number.isFinite(busLat) || !Number.isFinite(busLng) || (busLat === 0 && busLng === 0)) {
    return;
  }

  try {
    const stops = await prisma.routeStop.findMany({
      where: { routeId: String(routeId) },
      orderBy: { stopOrder: 'asc' },
    });

    if (!stops || stops.length === 0) return;

    const today = getTodayDateStr();
    const now = new Date();
    const nowFormatted = formatTimeStr(now);

    // Find the closest stop to current GPS location
    let closestIdx = -1;
    let minDistance = Infinity;

    for (let i = 0; i < stops.length; i++) {
      const s = stops[i];
      if (s.latitude && s.longitude) {
        const d = Math.hypot(s.latitude - busLat, s.longitude - busLng);
        if (d < minDistance) {
          minDistance = d;
          closestIdx = i;
        }
      }
    }

    // If bus is at or past stop index, all previous stops (and current stop if moving away) are marked departed
    if (closestIdx >= 0) {
      const stopsToDepart = stops.slice(0, closestIdx + 1);

      for (const st of stopsToDepart) {
        // Check if already logged today
        const existingLog = await prisma.stopDepartureLog.findFirst({
          where: {
            routeId: String(routeId),
            stopOrder: st.stopOrder,
            date: today,
          },
        });

        if (!existingLog) {
          // Calculate departure time (either stop's scheduled time or current time)
          const depTime = st.stopOrder < stopsToDepart.length ? (st.stopTime || nowFormatted) : nowFormatted;

          await prisma.stopDepartureLog.create({
            data: {
              routeId: String(routeId),
              stopName: st.name,
              stopOrder: st.stopOrder,
              scheduledTime: st.stopTime || '',
              departedTime: depTime,
              date: today,
              busNumber: busNumber || `TS 09 UB ${1200 + parseInt(routeId)}`,
              status: 'DEPARTED',
              departedAt: now,
            },
          });

          await prisma.routeStop.update({
            where: { id: st.id },
            data: {
              actualDepartureTime: depTime,
              departedAt: now,
            },
          });
        }
      }
    }
  } catch (err) {
    console.error('Error auto-recording stop departures:', err?.message);
  }
}

/**
 * Get all saved departed timestamps for a route
 */
export async function getRouteDepartures(routeId) {
  const today = getTodayDateStr();
  const logs = await prisma.stopDepartureLog.findMany({
    where: {
      routeId: String(routeId),
      date: today,
    },
    orderBy: { stopOrder: 'asc' },
  });

  return logs;
}
