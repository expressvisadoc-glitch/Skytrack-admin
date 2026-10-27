import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  getGeofenceSettings,
  saveGeofenceSettings,
  type GeofenceSettings,
  type GeofenceHistoryEntry,
  type GeofenceSettingsInput,
} from '../lib/api'
import { getBrowserLocation } from '../lib/geolocation'

// Mirrors GEOFENCE_LIMITS in the skytrack-api Edge Function and the table CHECK constraints.
const LIMITS = {
  radiusMeters: { min: 10, max: 5000, default: 100 },
  maxAccuracyMeters: { min: 5, max: 500, default: 50 },
  maxLocationAgeSeconds: { min: 10, max: 600, default: 120 },
  officeNameMaxLength: 120,
}

interface FormState {
  officeName: string
  latitude: string
  longitude: string
  radiusMeters: string
  isActive: boolean
  maxAccuracyMeters: string
  maxLocationAgeSeconds: string
}

type FieldErrors = Partial<Record<keyof FormState, string>>

const NUMBER_PATTERN = /^\s*-?\d+(\.\d+)?\s*$/

function formFromSettings(s: GeofenceSettings | null): FormState {
  return {
    officeName: s?.officeName ?? '',
    latitude: s?.latitude != null ? String(s.latitude) : '',
    longitude: s?.longitude != null ? String(s.longitude) : '',
    radiusMeters: String(s?.radiusMeters ?? LIMITS.radiusMeters.default),
    isActive: s?.configured ? s.isActive : true,
    maxAccuracyMeters: String(s?.maxAccuracyMeters ?? LIMITS.maxAccuracyMeters.default),
    maxLocationAgeSeconds: String(s?.maxLocationAgeSeconds ?? LIMITS.maxLocationAgeSeconds.default),
  }
}

function validate(form: FormState): { errors: FieldErrors; value: GeofenceSettingsInput | null } {
  const errors: FieldErrors = {}
  const lat = NUMBER_PATTERN.test(form.latitude) ? Number(form.latitude) : NaN
  const lng = NUMBER_PATTERN.test(form.longitude) ? Number(form.longitude) : NaN

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    errors.latitude = 'Enter a latitude between -90 and 90 (e.g. 9.931233).'
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    errors.longitude = 'Enter a longitude between -180 and 180 (e.g. 76.267303).'
  }
  if (lat === 0 && lng === 0) {
    errors.latitude = '0, 0 is not a valid office location.'
  }

  const wholeNumber = (key: keyof FormState, raw: string, limits: { min: number; max: number }, unit: string) => {
    const n = /^\s*\d+\s*$/.test(raw) ? Number(raw) : NaN
    if (!Number.isInteger(n) || n < limits.min || n > limits.max) {
      errors[key] = `Enter a whole number from ${limits.min} to ${limits.max} ${unit}.`
    }
    return n
  }
  const radius = wholeNumber('radiusMeters', form.radiusMeters, LIMITS.radiusMeters, 'metres')
  const maxAccuracy = wholeNumber('maxAccuracyMeters', form.maxAccuracyMeters, LIMITS.maxAccuracyMeters, 'metres')
  const maxAge = wholeNumber('maxLocationAgeSeconds', form.maxLocationAgeSeconds, LIMITS.maxLocationAgeSeconds, 'seconds')

  if (form.officeName.trim().length > LIMITS.officeNameMaxLength) {
    errors.officeName = `Use at most ${LIMITS.officeNameMaxLength} characters.`
  }

  if (Object.keys(errors).length > 0) return { errors, value: null }
  return {
    errors,
    value: {
      officeName: form.officeName.trim() || null,
      latitude: lat,
      longitude: lng,
      radiusMeters: radius,
      isActive: form.isActive,
      maxAccuracyMeters: maxAccuracy,
      maxLocationAgeSeconds: maxAge,
    },
  }
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    })
  } catch {
    return iso
  }
}

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback
}

function formatCoord(n: number | null | undefined): string {
  return n == null ? '—' : n.toFixed(6)
}

function osmEmbedUrl(lat: number, lng: number, radiusMeters: number): string {
  const halfSpan = Math.max(radiusMeters * 2.5, 150)
  const dLat = halfSpan / 111195
  const dLng = halfSpan / (111195 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01))
  const bbox = [lng - dLng, lat - dLat, lng + dLng, lat + dLat].map((v) => v.toFixed(6)).join(',')
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(6)},${lng.toFixed(6)}`
}

export function OfficeGeofence() {
  const { token } = useAuth()
  const [settings, setSettings] = useState<GeofenceSettings | null>(null)
  const [history, setHistory] = useState<GeofenceHistoryEntry[]>([])
  const [form, setForm] = useState<FormState>(formFromSettings(null))
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [pendingSave, setPendingSave] = useState<GeofenceSettingsInput | null>(null)
  const [isLocating, setIsLocating] = useState(false)
  const [locateNote, setLocateNote] = useState('')
  const [preview, setPreview] = useState<{ lat: number; lng: number; radius: number } | null>(null)

  const load = useCallback(() => {
    if (!token) return Promise.resolve()
    return getGeofenceSettings(token)
      .then((res) => {
        setSettings(res.settings)
        setHistory(res.history ?? [])
        setForm(formFromSettings(res.settings))
        setFieldErrors({})
        setLoadError('')
      })
      .catch((err: unknown) => {
        console.error('Failed to load geofence settings:', err)
        setLoadError(errorMessage(err, 'Failed to load office location settings.'))
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [token])

  useEffect(() => {
    load()
  }, [load])

  const handleRetryLoad = () => {
    setIsLoading(true)
    setLoadError('')
    load()
  }

  // Debounced map preview for valid coordinates only
  useEffect(() => {
    const timer = setTimeout(() => {
      const lat = NUMBER_PATTERN.test(form.latitude) ? Number(form.latitude) : NaN
      const lng = NUMBER_PATTERN.test(form.longitude) ? Number(form.longitude) : NaN
      const radius = /^\s*\d+\s*$/.test(form.radiusMeters) ? Number(form.radiusMeters) : LIMITS.radiusMeters.default
      if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0)) {
        setPreview({ lat, lng, radius: Math.min(Math.max(radius, LIMITS.radiusMeters.min), LIMITS.radiusMeters.max) })
      } else {
        setPreview(null)
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [form.latitude, form.longitude, form.radiusMeters])

  const updateField = (key: keyof FormState, value: string | boolean) => {
    setForm((prev) => {
      // Accept "lat, lng" pasted into either coordinate field
      if ((key === 'latitude' || key === 'longitude') && typeof value === 'string' && value.includes(',')) {
        const [a, b] = value.split(',').map((p) => p.trim())
        if (NUMBER_PATTERN.test(a) && NUMBER_PATTERN.test(b)) {
          return { ...prev, latitude: a, longitude: b }
        }
      }
      return { ...prev, [key]: value }
    })
    setFieldErrors((prev) => ({ ...prev, [key]: undefined, ...(key === 'latitude' || key === 'longitude' ? { latitude: undefined, longitude: undefined } : {}) }))
    setSuccessMsg('')
  }

  const handleUseCurrentLocation = async () => {
    setIsLocating(true)
    setLocateNote('')
    setErrorMsg('')
    try {
      const fix = await getBrowserLocation()
      setForm((prev) => ({ ...prev, latitude: fix.latitude.toFixed(6), longitude: fix.longitude.toFixed(6) }))
      setFieldErrors((prev) => ({ ...prev, latitude: undefined, longitude: undefined }))
      setLocateNote(`Captured with about ±${Math.round(fix.accuracy)} m accuracy. Check the pin on the map before saving.`)
    } catch (err: unknown) {
      setErrorMsg(errorMessage(err, 'Unable to get your current location.'))
    } finally {
      setIsLocating(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    const { errors, value } = validate(form)
    setFieldErrors(errors)
    if (!value) {
      setErrorMsg('Please correct the highlighted fields.')
      return
    }
    setPendingSave(value)
  }

  const handleConfirmSave = async () => {
    if (!token || !pendingSave) return
    setIsSaving(true)
    setErrorMsg('')
    try {
      const res = await saveGeofenceSettings(token, pendingSave)
      setPendingSave(null)
      setSuccessMsg(res.message || 'Office location settings saved.')
      await load()
    } catch (err: unknown) {
      console.error('Failed to save geofence settings:', err)
      setPendingSave(null)
      setErrorMsg(errorMessage(err, 'Failed to save office location settings.'))
    } finally {
      setIsSaving(false)
    }
  }

  const isDirty = JSON.stringify(form) !== JSON.stringify(formFromSettings(settings))
  const radiusNum = Number(form.radiusMeters)
  const accuracyNum = Number(form.maxAccuracyMeters)

  if (isLoading) {
    return (
      <main className="relative w-full pt-28 px-4 sm:px-8 pb-14 min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="w-8 h-8 rounded-full bg-red-500 animate-ping"></span>
          <p className="text-sm font-semibold text-slate-500">Loading Office Location...</p>
        </div>
      </main>
    )
  }

  if (loadError) {
    return (
      <main className="relative w-full pt-28 px-4 sm:px-8 pb-14 min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md text-center flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-[32px] text-red-500">error</span>
          <p className="text-sm text-slate-600">{loadError}</p>
          <button
            onClick={handleRetryLoad}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer"
            type="button"
          >
            Retry
          </button>
        </div>
      </main>
    )
  }

  const inputClass = (key: keyof FormState) =>
    `h-10 px-3 rounded-lg border text-sm font-medium focus:outline-none focus:ring-1 ${
      fieldErrors[key]
        ? 'border-red-400 focus:border-red-500 focus:ring-red-500 bg-red-50/40'
        : 'border-slate-200 focus:border-red-500 focus:ring-red-500'
    }`

  const fieldError = (key: keyof FormState) =>
    fieldErrors[key] ? <p className="text-[11.5px] text-red-600 font-medium">{fieldErrors[key]}</p> : null

  return (
    <main className="relative w-full pt-28 px-4 sm:px-8 pb-14 bg-[#faf9fd] min-h-screen">
      {/* Save Confirmation Modal */}
      {pendingSave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 max-w-md w-full flex flex-col gap-5">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px]">rule</span>
              </div>
              <div className="flex flex-col">
                <h3 className="text-base font-bold text-slate-900">Apply new attendance location rules?</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  These settings take effect immediately for every future check-in and check-out on the mobile app and
                  employee portal. Existing attendance records are not changed.
                </p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs bg-slate-50 rounded-xl border border-slate-100 p-4">
              <dt className="text-slate-500">Office</dt>
              <dd className="font-semibold text-slate-800 text-right">{pendingSave.officeName || 'Unnamed office'}</dd>
              <dt className="text-slate-500">Coordinates</dt>
              <dd className="font-semibold text-slate-800 text-right">{formatCoord(pendingSave.latitude)}, {formatCoord(pendingSave.longitude)}</dd>
              <dt className="text-slate-500">Radius</dt>
              <dd className="font-semibold text-slate-800 text-right">{pendingSave.radiusMeters} m</dd>
              <dt className="text-slate-500">Accuracy / age limit</dt>
              <dd className="font-semibold text-slate-800 text-right">±{pendingSave.maxAccuracyMeters} m / {pendingSave.maxLocationAgeSeconds} s</dd>
              <dt className="text-slate-500">Status</dt>
              <dd className={`font-bold text-right ${pendingSave.isActive ? 'text-emerald-600' : 'text-red-600'}`}>
                {pendingSave.isActive ? 'Active' : 'Inactive'}
              </dd>
            </dl>
            {!pendingSave.isActive && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 leading-relaxed">
                While inactive, all employees will be unable to check in or check out until geofencing is re-activated.
              </p>
            )}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                onClick={() => setPendingSave(null)}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSave}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-60"
                type="button"
              >
                {isSaving ? 'Saving…' : 'Save and Apply'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        {/* Page Breadcrumb & Title */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-red-50 text-red-700 text-[11px] font-bold tracking-wider uppercase border border-red-200/60">
              ATTENDANCE RULES
            </span>
            <span className="text-slate-300 text-xs font-semibold">•</span>
            <span className="text-slate-500 text-[11px] font-semibold tracking-wider uppercase">
              OFFICE GEOFENCE
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Office Location & Geofence</h1>
            <p className="text-[13.5px] text-slate-500 mt-0.5">
              Employees can only check in and check out within this radius of the office. Breaks are recorded but never blocked.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[13px] flex items-start gap-2.5">
          <span className="material-symbols-outlined text-[18px] mt-0.5">info</span>
          <span>
            Saving changes the rules used for <strong>all future</strong> check-in and check-out attempts, immediately and
            without an app update. GPS location is strong evidence but cannot guarantee physical presence or fully prevent spoofing.
          </span>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium flex items-center gap-2 animate-in fade-in">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            {successMsg}
          </div>
        )}

        {/* Current saved configuration */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-6">
          <div className="flex items-center justify-between gap-3 pb-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">location_on</span>
              </div>
              <div>
                <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">Saved Configuration</h2>
                <p className="text-[12px] text-slate-500">Currently enforced by the server</p>
              </div>
            </div>
            {!settings?.configured ? (
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-[11px] font-bold border border-slate-200">NOT CONFIGURED</span>
            ) : settings.isActive ? (
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">ACTIVE</span>
            ) : (
              <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-[11px] font-bold border border-red-200">INACTIVE</span>
            )}
          </div>

          {!settings?.configured ? (
            <p className="pt-4 text-sm text-slate-600">
              No office location has been saved yet. <strong>Check-in and check-out are blocked for all employees</strong> until
              you save a valid, active office location below.
            </p>
          ) : (
            <div className="pt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                ['Office', settings.officeName || 'Unnamed office'],
                ['Coordinates', `${formatCoord(settings.latitude)}, ${formatCoord(settings.longitude)}`],
                ['Radius', `${settings.radiusMeters} m`],
                ['Accuracy / age limit', `±${settings.maxAccuracyMeters} m / ${settings.maxLocationAgeSeconds} s`],
                ['Last changed', formatDateTime(settings.updatedAt)],
                ['Changed by', settings.updatedBy?.name ? `${settings.updatedBy.name}${settings.updatedBy.employeeId ? ` (${settings.updatedBy.employeeId})` : ''}` : '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{label}</span>
                  <span className="text-sm font-semibold text-slate-800 break-words">{value}</span>
                </div>
              ))}
              {!settings.isActive && (
                <p className="col-span-2 md:col-span-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
                  Geofencing is inactive: all check-in and check-out attempts are currently rejected.
                </p>
              )}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Edit form */}
          <form onSubmit={handleSubmit} noValidate className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">edit_location_alt</span>
              </div>
              <div>
                <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">Edit Office Location</h2>
                <p className="text-[12px] text-slate-500">Paste "latitude, longitude" from any map into either field</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="geo-name" className="text-[11px] font-bold text-slate-500 uppercase">Office name (optional)</label>
              <input id="geo-name" type="text" value={form.officeName} maxLength={LIMITS.officeNameMaxLength}
                onChange={(e) => updateField('officeName', e.target.value)} className={inputClass('officeName')} placeholder="Head Office" />
              {fieldError('officeName')}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="geo-lat" className="text-[11px] font-bold text-slate-500 uppercase">Latitude</label>
                <input id="geo-lat" type="text" inputMode="decimal" value={form.latitude}
                  onChange={(e) => updateField('latitude', e.target.value)} className={inputClass('latitude')} placeholder="9.931233" />
                {fieldError('latitude')}
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="geo-lng" className="text-[11px] font-bold text-slate-500 uppercase">Longitude</label>
                <input id="geo-lng" type="text" inputMode="decimal" value={form.longitude}
                  onChange={(e) => updateField('longitude', e.target.value)} className={inputClass('longitude')} placeholder="76.267303" />
                {fieldError('longitude')}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <button type="button" onClick={handleUseCurrentLocation} disabled={isLocating}
                className="self-start px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-60 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">my_location</span>
                {isLocating ? 'Locating…' : 'Use my current location'}
              </button>
              {locateNote && <p className="text-[11.5px] text-slate-500">{locateNote}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="geo-radius" className="text-[11px] font-bold text-slate-500 uppercase">Radius (metres)</label>
              <input id="geo-radius" type="number" min={LIMITS.radiusMeters.min} max={LIMITS.radiusMeters.max} step={1} value={form.radiusMeters}
                onChange={(e) => updateField('radiusMeters', e.target.value)} className={inputClass('radiusMeters')} />
              {fieldError('radiusMeters') ?? (
                <p className="text-[11.5px] text-slate-400">Default 100 m. Allowed {LIMITS.radiusMeters.min}–{LIMITS.radiusMeters.max} m.</p>
              )}
              {!fieldErrors.radiusMeters && Number.isFinite(radiusNum) && Number.isFinite(accuracyNum) && radiusNum < accuracyNum && (
                <p className="text-[11.5px] text-amber-700">The radius is smaller than the accepted accuracy, so valid check-ins near the edge may be rejected.</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="geo-acc" className="text-[11px] font-bold text-slate-500 uppercase">Max accuracy (metres)</label>
                <input id="geo-acc" type="number" min={LIMITS.maxAccuracyMeters.min} max={LIMITS.maxAccuracyMeters.max} step={1} value={form.maxAccuracyMeters}
                  onChange={(e) => updateField('maxAccuracyMeters', e.target.value)} className={inputClass('maxAccuracyMeters')} />
                {fieldError('maxAccuracyMeters')}
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="geo-age" className="text-[11px] font-bold text-slate-500 uppercase">Max location age (seconds)</label>
                <input id="geo-age" type="number" min={LIMITS.maxLocationAgeSeconds.min} max={LIMITS.maxLocationAgeSeconds.max} step={1} value={form.maxLocationAgeSeconds}
                  onChange={(e) => updateField('maxLocationAgeSeconds', e.target.value)} className={inputClass('maxLocationAgeSeconds')} />
                {fieldError('maxLocationAgeSeconds')}
              </div>
            </div>
            <p className="text-[11.5px] text-slate-400 -mt-2 leading-relaxed">
              Location accuracy policy: fixes less precise than the accuracy limit, older than the age limit, timestamped in the
              future, or flagged as mock locations are rejected for check-in and check-out. Lower limits are stricter but may
              reject genuine indoor fixes; defaults are ±50 m and 120 s.
            </p>

            <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 cursor-pointer">
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-800">Geofence active</span>
                <span className="text-[11.5px] text-slate-500">When inactive, check-in and check-out are blocked for everyone.</span>
              </div>
              <input type="checkbox" checked={form.isActive} onChange={(e) => updateField('isActive', e.target.checked)}
                className="w-5 h-5 rounded border-slate-300 text-red-600 focus:ring-red-500" />
            </label>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              {isDirty && (
                <button type="button" onClick={() => { setForm(formFromSettings(settings)); setFieldErrors({}); setLocateNote('') }}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer">
                  Discard changes
                </button>
              )}
              <button type="submit" disabled={isSaving}
                className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm transition-all cursor-pointer disabled:opacity-60">
                Save
              </button>
            </div>
          </form>

          {/* Location preview */}
          <section className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">map</span>
              </div>
              <div>
                <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">Location Preview</h2>
                <p className="text-[12px] text-slate-500">OpenStreetMap view centred on the entered coordinates</p>
              </div>
            </div>
            {preview ? (
              <>
                <iframe
                  title="Office location preview"
                  src={osmEmbedUrl(preview.lat, preview.lng, preview.radius)}
                  className="w-full h-72 rounded-xl border border-slate-200"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
                <p className="text-[11.5px] text-slate-500">
                  The pin marks the office centre; the view spans roughly {Math.round(Math.max(preview.radius * 2.5, 150) * 2)} m
                  across. Employees must be within {preview.radius} m of the pin.
                </p>
                <div className="flex flex-wrap gap-2">
                  <a href={`https://www.openstreetmap.org/?mlat=${preview.lat}&mlon=${preview.lng}#map=18/${preview.lat}/${preview.lng}`}
                    target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    Open in OpenStreetMap
                  </a>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${preview.lat},${preview.lng}`}
                    target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    Open in Google Maps
                  </a>
                </div>
              </>
            ) : (
              <div className="h-72 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-sm text-slate-400 text-center px-6">
                Enter valid coordinates to preview the office location.
              </div>
            )}
          </section>
        </div>

        {/* Change history */}
        <section className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] p-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">history</span>
            </div>
            <div>
              <h2 className="text-[16px] font-bold text-slate-900 tracking-tight">Change History</h2>
              <p className="text-[12px] text-slate-500">Last 10 changes</p>
            </div>
          </div>
          {history.length === 0 ? (
            <p className="pt-4 text-sm text-slate-400">No changes recorded yet.</p>
          ) : (
            <div className="pt-2 overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-400 uppercase tracking-wide">
                    <th className="py-2 pr-3 font-bold">When</th>
                    <th className="py-2 pr-3 font-bold">By</th>
                    <th className="py-2 pr-3 font-bold">Coordinates</th>
                    <th className="py-2 pr-3 font-bold">Radius</th>
                    <th className="py-2 pr-3 font-bold">Limits</th>
                    <th className="py-2 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id} className="border-t border-slate-100 text-slate-700">
                      <td className="py-2 pr-3 whitespace-nowrap">{formatDateTime(h.changedAt)}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{h.changedBy?.name || '—'}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">{formatCoord(h.latitude)}, {formatCoord(h.longitude)}</td>
                      <td className="py-2 pr-3">{h.radiusMeters} m</td>
                      <td className="py-2 pr-3 whitespace-nowrap">±{h.maxAccuracyMeters} m / {h.maxLocationAgeSeconds} s</td>
                      <td className={`py-2 font-bold ${h.isActive ? 'text-emerald-600' : 'text-red-600'}`}>{h.isActive ? 'Active' : 'Inactive'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
