// Real-time space weather: Kp index (NOAA SWPC) + solar flares (NASA DONKI)
// Activity level 0.0–1.0 drives aurora intensity in aurora.js

let _activity = 0.35
let _kp       = 0
let _flare    = ''   // strongest recent flare class e.g. 'X1.5', 'M3.2'

export function getAuroraActivity() { return _activity }
export function getKpIndex()        { return _kp }
export function getFlareClass()     { return _flare }

function flareBonus(flares) {
  if (!Array.isArray(flares) || !flares.length) return { bonus: 0, label: '' }
  const cutoff = Date.now() - 3 * 24 * 3600 * 1000
  const recent = flares.filter(f => new Date(f.beginTime).getTime() > cutoff)
  if (!recent.length) return { bonus: 0, label: '' }
  // Sort by class descending (X > M > C > B)
  const sorted = [...recent].sort((a, b) =>
    (b.classType ?? '').localeCompare(a.classType ?? ''))
  const top = sorted[0].classType ?? ''
  if (top.startsWith('X')) return { bonus: 0.3,  label: top }
  if (top.startsWith('M')) return { bonus: 0.15, label: top }
  if (top.startsWith('C')) return { bonus: 0.05, label: top }
  return { bonus: 0, label: top }
}

async function _refresh() {
  let kp = 0

  // 1. Real-time Kp from NOAA SWPC (no API key needed)
  try {
    const data = await fetch(
      'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json'
    ).then(r => r.json())
    // Array of [time_tag, Kp, ...]. Skip header row (index 0).
    if (data.length > 1) kp = parseFloat(data[data.length - 1][1]) || 0
    _kp = kp
  } catch {}

  // 2. Solar flares from NASA DONKI (last 7 days)
  try {
    const end   = new Date().toISOString().slice(0, 10)
    const start = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
    const flares = await fetch(
      `https://api.nasa.gov/DONKI/FLR?startDate=${start}&endDate=${end}&api_key=DEMO_KEY`
    ).then(r => r.json())
    const { bonus, label } = flareBonus(flares)
    _flare    = label
    _activity = Math.min(1.0, kp / 9 + bonus)
  } catch {
    _activity = Math.min(1.0, kp / 9)
  }
}

export async function initDonki() {
  await _refresh()
  setInterval(_refresh, 15 * 60 * 1000)
}
