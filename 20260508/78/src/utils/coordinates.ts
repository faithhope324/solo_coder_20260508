export const degreesToRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180)
}

export const radiansToDegrees = (radians: number): number => {
  return radians * (180 / Math.PI)
}

export const calculateBearing = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const φ1 = degreesToRadians(lat1)
  const φ2 = degreesToRadians(lat2)
  const Δλ = degreesToRadians(lon2 - lon1)

  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)

  const θ = Math.atan2(y, x)
  return (radiansToDegrees(θ) + 360) % 360
}

export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371000
  const φ1 = degreesToRadians(lat1)
  const φ2 = degreesToRadians(lat2)
  const Δφ = degreesToRadians(lat2 - lat1)
  const Δλ = degreesToRadians(lon2 - lon1)

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

export const offsetLatLon = (
  lat: number,
  lon: number,
  distance: number,
  bearing: number
): { lat: number; lon: number } => {
  const R = 6371000
  const φ1 = degreesToRadians(lat)
  const λ1 = degreesToRadians(lon)
  const brng = degreesToRadians(bearing)

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(distance / R) +
    Math.cos(φ1) * Math.sin(distance / R) * Math.cos(brng)
  )

  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(distance / R) * Math.cos(φ1),
      Math.cos(distance / R) - Math.sin(φ1) * Math.sin(φ2)
    )

  return {
    lat: radiansToDegrees(φ2),
    lon: radiansToDegrees(λ2)
  }
}

export const kelvinToCelsius = (kelvin: number): number => {
  return kelvin - 273.15
}

export const celsiusToKelvin = (celsius: number): number => {
  return celsius + 273.15
}
