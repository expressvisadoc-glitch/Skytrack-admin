/**
 * Browser geolocation helper used for attendance actions (employee portal) and for
 * picking the office location (admin portal). The backend re-validates every fix.
 */

export interface AttendanceLocationPayload {
  latitude: number
  longitude: number
  accuracy: number
  capturedAt: string
  isMock: boolean | null
  platform: 'web'
}

export class BrowserLocationError extends Error {
  code: 'unsupported' | 'insecure' | 'permission_denied' | 'unavailable' | 'timeout'

  constructor(code: BrowserLocationError['code'], message: string) {
    super(message)
    this.code = code
  }
}

export function getBrowserLocation(timeoutMs = 20000): Promise<AttendanceLocationPayload> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      reject(new BrowserLocationError('insecure', 'Location is only available on a secure (https) connection.'))
      return
    }
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new BrowserLocationError('unsupported', 'This browser does not support location access. Please use the SkyTrack mobile app.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          // Fix time as reported by the browser; the server compares it against its own receipt time.
          capturedAt: new Date(position.timestamp).toISOString(),
          isMock: null,
          platform: 'web',
        })
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new BrowserLocationError('permission_denied', 'Location permission was denied. Allow location access for this site in your browser settings and try again.'))
        } else if (error.code === error.TIMEOUT) {
          reject(new BrowserLocationError('timeout', 'Getting your location timed out. Please check that location services are on and try again.'))
        } else {
          reject(new BrowserLocationError('unavailable', 'Your location is currently unavailable. Please check that location services are on and try again.'))
        }
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 }
    )
  })
}

export interface MapPoint {
  lat: number
  lng: number
}

/** Great-circle distance in metres; same formula and earth radius as public.geofence_distance_m on the server. */
export function distanceMeters(a: MapPoint, b: MapPoint): number {
  const R = 6371008.8
  const rad = (d: number) => (d * Math.PI) / 180
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}
