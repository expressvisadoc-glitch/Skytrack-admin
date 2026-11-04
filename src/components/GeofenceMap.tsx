import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { distanceMeters, type MapPoint } from '../lib/geolocation'

export interface UserFix extends MapPoint {
  accuracy: number
}

// Beyond this the view stays on the office instead of zooming out to include a far-away viewer
const MAX_FIT_DISTANCE_M = 5000

// Same colours and markers as the Android app's Home map
const ZONE = '#e53935'
const INSIDE = '#059669'
const OUTSIDE = '#2563eb'
// Material "business" icon
const OFFICE_ICON = 'M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z'
const LABEL_STYLE = [
  'transform:translate(8px,-50%)',
  'width:max-content',
  'background:#fff',
  `color:${ZONE}`,
  'border:1px solid rgba(229,57,53,.5)',
  'border-radius:999px',
  'padding:1px 7px',
  'font:700 11px/16px system-ui,sans-serif',
  'white-space:nowrap',
  'box-shadow:0 1px 3px rgba(0,0,0,.2)',
].join(';')

/** Round badge with a white ring and a white icon, centred on the point. */
function badgeIcon(path: string, color: string, size: number): L.DivIcon {
  const icon = Math.round(size * 0.56)
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2.5px solid #fff;box-sizing:border-box;box-shadow:0 1px 4px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center"><svg width="${icon}" height="${icon}" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="${path}"/></svg></div>`,
  })
}

/** The viewer's location: a dot in the status colour with a white edge (same as the Android app). */
function locationDotIcon(tone: string): L.DivIcon {
  const size = 18
  return L.divIcon({
    className: '',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${tone};border:3px solid #fff;box-sizing:border-box;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
  })
}

/** Point at the given distance and bearing (degrees) from start, on the same sphere as distanceMeters. */
function destination(start: MapPoint, meters: number, bearingDeg: number): MapPoint {
  const R = 6371008.8
  const rad = (d: number) => (d * Math.PI) / 180
  const deg = (r: number) => (r * 180) / Math.PI
  const δ = meters / R
  const θ = rad(bearingDeg)
  const φ1 = rad(start.lat)
  const λ1 = rad(start.lng)
  const φ2 = Math.asin(Math.sin(φ1) * Math.cos(δ) + Math.cos(φ1) * Math.sin(δ) * Math.cos(θ))
  const λ2 = λ1 + Math.atan2(Math.sin(θ) * Math.sin(δ) * Math.cos(φ1), Math.cos(δ) - Math.sin(φ1) * Math.sin(φ2))
  return { lat: deg(φ2), lng: deg(λ2) }
}

/**
 * OpenStreetMap preview of the office geofence: the office pin, the allowed radius and, when known, the
 * viewer's own location with its accuracy circle. Circle markers are used instead of image pins so no
 * marker assets need bundling.
 */
export function GeofenceMap({ office, radius, user }: { office: MapPoint; radius: number; user: UserFix | null }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layersRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const map = L.map(containerRef.current, { scrollWheelZoom: false })
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)
    map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>')
    mapRef.current = map
    layersRef.current = L.layerGroup().addTo(map)
    return () => {
      map.remove()
      mapRef.current = null
      layersRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layers = layersRef.current
    if (!map || !layers) return
    layers.clearLayers()

    // Position the map before drawing: Leaflet cannot place a circle on a map that has no view yet
    let bounds = L.latLng(office.lat, office.lng).toBounds(radius * 2)
    if (user && distanceMeters(office, user) <= MAX_FIT_DISTANCE_M) {
      bounds = bounds.extend(L.latLng(user.lat, user.lng).toBounds(Math.min(user.accuracy, MAX_FIT_DISTANCE_M) * 2))
    }
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 18 })

    // Allowed zone: tinted area only, no border
    L.circle([office.lat, office.lng], { radius, stroke: false, fillColor: ZONE, fillOpacity: 0.18, interactive: false }).addTo(layers)

    // Radius line to the eastern edge, with its length just outside the edge (readable for small radii)
    const edge = destination(office, radius, 90)
    L.polyline([[office.lat, office.lng], [edge.lat, edge.lng]], { color: ZONE, weight: 1.5, opacity: 0.9, dashArray: '5 4', interactive: false }).addTo(layers)
    L.marker([edge.lat, edge.lng], {
      icon: L.divIcon({ className: '', html: `<div style="${LABEL_STYLE}">${radius} m</div>`, iconSize: [0, 0] }),
      interactive: false,
      keyboard: false,
    }).addTo(layers)

    if (user) {
      const tone = distanceMeters(office, user) <= radius ? INSIDE : OUTSIDE
      L.circle([user.lat, user.lng], {
        radius: user.accuracy,
        color: tone,
        weight: 1.5,
        opacity: 0.7,
        dashArray: '4 4',
        fillColor: tone,
        fillOpacity: 0.1,
        interactive: false,
      }).addTo(layers)
    }

    L.marker([office.lat, office.lng], { icon: badgeIcon(OFFICE_ICON, ZONE, 30), title: 'Office centre', keyboard: false })
      .bindTooltip('Office centre')
      .addTo(layers)
    if (user) {
      const tone = distanceMeters(office, user) <= radius ? INSIDE : OUTSIDE
      L.marker([user.lat, user.lng], { icon: locationDotIcon(tone), title: 'You', keyboard: false, zIndexOffset: 1000 })
        .bindTooltip(`You (±${Math.round(user.accuracy)} m)`)
        .addTo(layers)
    }
  }, [office, radius, user])

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Map of the office location and allowed radius"
      className="w-full h-72 rounded-xl border border-slate-200 overflow-hidden z-0"
    />
  )
}
