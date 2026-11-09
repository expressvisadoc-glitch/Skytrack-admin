/**
 * Reads an office location from what an admin pastes: a Google Maps or Apple Maps link, plain
 * "latitude, longitude", or the degrees/minutes/seconds text Google Maps shows (10°00'14.0"N 76°22'32.6"E).
 *
 * Short share links (maps.app.goo.gl, goo.gl/maps, maps.apple/p/…) hide the coordinates behind a redirect that a
 * browser cannot follow, so they are reported as `needsServer` and resolved by the skytrack-api Edge Function
 * (`admin_resolve_map_link`, which uses the same rules).
 */

export type MapSource = 'google' | 'apple' | 'coordinates'

export type MapLinkResult =
  | { kind: 'found'; latitude: number; longitude: number; source: MapSource; placeName?: string }
  | { kind: 'needsServer'; url: string; source: MapSource }
  | { kind: 'invalid'; message: string }

const NUM = String.raw`[-+]?\d{1,3}(?:\.\d+)?`
const PAIR = new RegExp(String.raw`^\s*(${NUM})\s*[,\s]\s*(${NUM})\s*$`)

function validPair(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && !(lat === 0 && lng === 0)
}

/** "10.0039, 76.3757" (comma or space separated) */
function parsePair(text: string): { latitude: number; longitude: number } | null {
  const m = PAIR.exec(text)
  if (!m) return null
  const lat = Number(m[1])
  const lng = Number(m[2])
  return validPair(lat, lng) ? { latitude: lat, longitude: lng } : null
}

/** 10°00'14.0"N 76°22'32.6"E (also with ′ ″ or plain spaces) */
function parseDms(text: string): { latitude: number; longitude: number } | null {
  const part = String.raw`(\d{1,3})\s*°\s*(?:(\d{1,2})\s*['′]\s*)?(?:(\d{1,2}(?:\.\d+)?)\s*(?:"|″|'')\s*)?([NSEW])`
  const m = new RegExp(String.raw`^\s*${part}[\s,]+${part}\s*$`, 'i').exec(text)
  if (!m) return null
  const toDecimal = (d: string, mi?: string, s?: string) => Number(d) + Number(mi || 0) / 60 + Number(s || 0) / 3600
  let a = toDecimal(m[1], m[2], m[3]) * (/[SW]/i.test(m[4]) ? -1 : 1)
  let b = toDecimal(m[5], m[6], m[7]) * (/[SW]/i.test(m[8]) ? -1 : 1)
  // The latitude is the N/S part, whichever order it was written in
  if (/[EW]/i.test(m[4]) && /[NS]/i.test(m[8])) [a, b] = [b, a]
  const latitude = Number(a.toFixed(7))
  const longitude = Number(b.toFixed(7))
  return validPair(latitude, longitude) ? { latitude, longitude } : null
}

const SHORT_LINK_HOSTS = ['maps.app.goo.gl', 'goo.gl', 'g.co', 'maps.apple', 'apple.co']

function sourceOf(host: string): MapSource | null {
  const h = host.toLowerCase()
  if (h === 'maps.apple.com' || h === 'maps.apple' || h === 'apple.co') return 'apple'
  if (h === 'maps.app.goo.gl' || h === 'goo.gl' || h === 'g.co' || /(^|\.)google\.[a-z.]+$/.test(h)) return 'google'
  return null
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/** Coordinates inside a full Google or Apple Maps URL; the place pin is preferred over the view centre */
export function coordinatesFromMapUrl(url: URL): { latitude: number; longitude: number } | null {
  const full = safeDecode(url.href)
  // Google place pin: …!3d10.0039!4d76.3757
  const pin = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(full)
  if (pin && validPair(Number(pin[1]), Number(pin[2]))) return { latitude: Number(pin[1]), longitude: Number(pin[2]) }
  // Query parameters used by Google (q, query, ll, center, destination, daddr) and Apple (coordinate, ll, q, sll, daddr)
  for (const key of ['coordinate', 'q', 'query', 'll', 'center', 'destination', 'daddr', 'sll']) {
    const value = url.searchParams.get(key)
    if (value) {
      const pair = parsePair(value.replace(/^loc:/i, ''))
      if (pair) return pair
    }
  }
  // Google path forms: /maps/search/10.0039,+76.3757  /maps/place/10.0039,76.3757  /@10.0039,76.3757,17z
  const path = safeDecode(url.pathname).replace(/\+/g, ' ')
  const inPath = /\/(?:search|place|dir)\/(?:[^/]*\/)*?\s*([-+]?\d{1,3}\.\d+)\s*,\s*([-+]?\d{1,3}\.\d+)/.exec(path)
  if (inPath && validPair(Number(inPath[1]), Number(inPath[2]))) return { latitude: Number(inPath[1]), longitude: Number(inPath[2]) }
  const at = /@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/.exec(full)
  if (at && validPair(Number(at[1]), Number(at[2]))) return { latitude: Number(at[1]), longitude: Number(at[2]) }
  return null
}

/** The place name in a Google /maps/place/<Name>/ link or an Apple ?q=<Name> / ?name= link */
function placeNameFromUrl(url: URL): string | undefined {
  const google = /\/maps\/place\/([^/@]+)/.exec(url.pathname)
  const raw = google ? google[1] : url.searchParams.get('name') ?? url.searchParams.get('q') ?? undefined
  if (!raw) return undefined
  const name = safeDecode(raw.replace(/\+/g, ' ')).trim()
  if (!name || parsePair(name) || name.length > 120) return undefined
  return name
}

export function parseMapLocation(input: string): MapLinkResult {
  const text = input.trim()
  if (!text) return { kind: 'invalid', message: 'Paste a Google Maps or Apple Maps link, or coordinates.' }

  const pair = parsePair(text) ?? parseDms(text)
  if (pair) return { kind: 'found', ...pair, source: 'coordinates' }

  const looksLikeUrl = /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/|$)/i.test(text) || /^(https?:\/\/)?maps\.apple\//i.test(text)
  if (!looksLikeUrl) {
    return {
      kind: 'invalid',
      message: 'That is not a map link or coordinates. Paste a Google Maps or Apple Maps link, or "latitude, longitude".',
    }
  }
  let url: URL
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`)
  } catch {
    return { kind: 'invalid', message: 'That link could not be read. Copy it again from Google Maps or Apple Maps.' }
  }
  const source = sourceOf(url.hostname)
  if (!source) {
    return { kind: 'invalid', message: 'Only Google Maps and Apple Maps links are supported.' }
  }
  const coordinates = coordinatesFromMapUrl(url)
  if (coordinates) return { kind: 'found', ...coordinates, source, placeName: placeNameFromUrl(url) }
  if (SHORT_LINK_HOSTS.includes(url.hostname.toLowerCase()) || source === 'google' || source === 'apple') {
    return { kind: 'needsServer', url: url.href, source }
  }
  return { kind: 'invalid', message: 'No location was found in that link.' }
}

export function sourceLabel(source: MapSource): string {
  return source === 'google' ? 'Google Maps link' : source === 'apple' ? 'Apple Maps link' : 'coordinates'
}
