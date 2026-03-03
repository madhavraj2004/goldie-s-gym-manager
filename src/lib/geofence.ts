// Gym location configuration
const GYM_LOCATION = {
  lat: 23.538101778815808,
  lng: 87.33420091125525,
  radiusMeters: 20,
};

/** Haversine distance in meters between two lat/lng points */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function isInsideGym(lat: number, lng: number): boolean {
  return haversineDistance(lat, lng, GYM_LOCATION.lat, GYM_LOCATION.lng) <= GYM_LOCATION.radiusMeters;
}

export function getDistanceFromGym(lat: number, lng: number): number {
  return Math.round(haversineDistance(lat, lng, GYM_LOCATION.lat, GYM_LOCATION.lng));
}

export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });
  });
}
