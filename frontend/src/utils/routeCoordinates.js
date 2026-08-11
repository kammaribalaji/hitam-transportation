export const ROUTE_COORDINATES = {
  R1: [
    [17.3449, 78.5562],
    [17.3688, 78.5256],
    [17.3836, 78.4877],
    [17.4893, 78.4832],
    [17.6313, 78.4845],
    [17.7048, 78.4816],
  ],
  R2: [
    [17.4948, 78.3996],
    [17.5184, 78.3896],
    [17.5426, 78.3817],
    [17.5582, 78.3714],
    [17.5959, 78.4378],
    [17.7048, 78.4816],
  ],
  R3: [
    [17.4014, 78.5591],
    [17.4283, 78.5387],
    [17.434, 78.5013],
    [17.5137, 78.4992],
    [17.7048, 78.4816],
  ],
  R4: [
    [17.3949, 78.4399],
    [17.4264, 78.4504],
    [17.4449, 78.4669],
    [17.4692, 78.4493],
    [17.5057, 78.4705],
    [17.7048, 78.4816],
  ],
  R5: [
    [17.4816, 78.5531],
    [17.4793, 78.5458],
    [17.4907, 78.5336],
    [17.4955, 78.5008],
    [17.5133, 78.4999],
    [17.7048, 78.4816],
  ],
  R6: [
    [17.4401, 78.3489],
    [17.4504, 78.3801],
    [17.4497, 78.3915],
    [17.4693, 78.3699],
    [17.7048, 78.4816],
  ],
}

export function haversineKm(a, b) {
  const toRad = (d) => (d * Math.PI) / 180
  const R = 6371
  const dLat = toRad(b[0] - a[0])
  const dLng = toRad(b[1] - a[1])
  const lat1 = toRad(a[0])
  const lat2 = toRad(b[0])
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function getPointOnRoute(points, progress) {
  if (!points?.length) return [17.7048, 78.4816]
  if (points.length === 1) return points[0]

  const segments = []
  let total = 0
  for (let i = 0; i < points.length - 1; i += 1) {
    const len = haversineKm(points[i], points[i + 1])
    segments.push(len)
    total += len
  }

  const target = total * Math.min(Math.max(progress, 0), 1)
  let covered = 0
  for (let i = 0; i < segments.length; i += 1) {
    const segLen = segments[i]
    if (covered + segLen >= target) {
      const t = segLen === 0 ? 0 : (target - covered) / segLen
      const a = points[i]
      const b = points[i + 1]
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
    }
    covered += segLen
  }

  return points[points.length - 1]
}
