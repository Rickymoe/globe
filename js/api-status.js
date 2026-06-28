// API health indicator — pill top-left, hover expands per-API list

const today = () => new Date().toISOString().slice(0, 10)

const APIS = [
  { name: 'USGS Earthquakes',   hint: 'Real-time earthquake data — magnitudes, locations, depth',                          url: () => 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson' },
  { name: 'NASA EONET',         hint: 'Natural disaster events — wildfires, storms, floods',                               url: () => 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=1' },
  { name: 'NASA DONKI',         hint: 'Solar flare activity — drives aurora intensity (Kp index)',                         url: () => `https://api.nasa.gov/DONKI/FLR?startDate=${today()}&endDate=${today()}&api_key=DEMO_KEY` },
  { name: 'NOAA Space Weather', hint: 'Planetary K-index — geomagnetic storm level for aurora oval',                      url: () => 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json' },
  { name: 'ISS Position',       hint: 'International Space Station real-time lat/lon/altitude',                           url: () => 'https://api.wheretheiss.at/v1/satellites/25544' },
  { name: 'MET Norway',         hint: 'Weather forecast — click any point on the globe for local weather',                url: () => 'https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=59.9&lon=10.7' },
  { name: 'OSM Nominatim',      hint: 'Reverse geocoding — country name and region when clicking the globe',              url: () => 'https://nominatim.openstreetmap.org/reverse?lat=59.9&lon=10.7&format=json&zoom=3' },
  { name: 'jsDelivr CDN',       hint: 'Country data (flags, population, capital) and TopoJSON world atlas',               url: () => 'https://cdn.jsdelivr.net/npm/world-countries@5/countries.json' },
  { name: 'GitHub Raw',         hint: 'Tectonic plate boundary data (Fraxen/tectonicplates)',                             url: () => 'https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json' },
]

async function ping(url) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 8000)
  try {
    const res = await fetch(url, { signal: ctrl.signal, cache: 'no-store' })
    clearTimeout(timer)
    ctrl.abort()
    return res.ok
  } catch {
    clearTimeout(timer)
    return false
  }
}

let _pill  = null
let _panel = null
let _statuses = APIS.map(() => null)

function pillColor() {
  const known = _statuses.filter(s => s !== null)
  if (!known.length)        return '#555'
  if (known.every(s => s))  return '#22c55e'
  if (known.some(s => s))   return '#eab308'
  return '#ef4444'
}

function pillLabel() {
  const ok   = _statuses.filter(s => s === true).length
  const fail = _statuses.filter(s => s === false).length
  const pending = _statuses.filter(s => s === null).length
  if (pending === APIS.length) return 'Checking APIs…'
  if (fail === 0)  return `${ok} / ${APIS.length} APIs`
  return `${fail} API${fail > 1 ? 's' : ''} down`
}

function render() {
  const col = pillColor()

  _pill.innerHTML = `
    <span style="width:7px;height:7px;border-radius:50%;background:${col};flex-shrink:0;display:inline-block;box-shadow:0 0 5px ${col}"></span>
    <span style="font-size:11px;color:#ccc;font-family:system-ui,sans-serif">${pillLabel()}</span>
  `

  const rows = APIS.map((api, i) => {
    const s = _statuses[i]
    const c = s === null ? '#555' : s ? '#22c55e' : '#ef4444'
    return `<div title="${api.hint}" style="display:flex;align-items:center;gap:7px;padding:2px 0;cursor:default">
      <span style="width:6px;height:6px;border-radius:50%;background:${c};flex-shrink:0;display:inline-block;box-shadow:${s ? `0 0 4px ${c}` : 'none'}"></span>
      <span style="color:${s === false ? '#ef4444' : '#ccc'};font-size:11px">${api.name}</span>
    </div>`
  }).join('')

  _panel.innerHTML = `
    <div style="font-family:system-ui,sans-serif;line-height:1.8">${rows}</div>
  `
}

async function refresh() {
  _statuses = APIS.map(() => null)
  render()
  await Promise.all(APIS.map(async (api, i) => {
    _statuses[i] = await ping(api.url())
    render()
  }))
}

export function initApiStatus() {
  _pill = document.createElement('div')
  _pill.style.cssText = [
    'position:fixed', 'top:1rem', 'left:1rem',
    'display:flex', 'align-items:center', 'gap:7px',
    'background:rgba(0,0,0,0.65)', 'border:1px solid rgba(255,255,255,0.14)',
    'border-radius:999px', 'padding:5px 12px',
    'backdrop-filter:blur(8px)', 'z-index:200',
    'cursor:default', 'user-select:none',
    'transition:border-color 0.2s',
  ].join(';')

  _panel = document.createElement('div')
  _panel.style.cssText = [
    'position:fixed', 'top:2.8rem', 'left:1rem',
    'background:rgba(8,8,8,0.88)', 'color:#ccc',
    'border:1px solid rgba(255,255,255,0.12)',
    'border-radius:12px', 'padding:10px 14px',
    'backdrop-filter:blur(8px)', 'z-index:201',
    'display:none', 'pointer-events:auto',
    'white-space:nowrap',
  ].join(';')

  const showPanel = () => { _panel.style.display = 'block'; _pill.style.borderColor = 'rgba(255,255,255,0.35)' }
  const hidePanel = () => { _panel.style.display = 'none';  _pill.style.borderColor = 'rgba(255,255,255,0.14)' }

  _pill.addEventListener('mouseenter',  showPanel)
  _pill.addEventListener('mouseleave',  () => setTimeout(() => { if (!_panel.matches(':hover')) hidePanel() }, 50))
  _panel.addEventListener('mouseenter', showPanel)
  _panel.addEventListener('mouseleave', hidePanel)

  document.body.appendChild(_pill)
  document.body.appendChild(_panel)

  refresh()
  setInterval(refresh, 5 * 60 * 1000)
}
