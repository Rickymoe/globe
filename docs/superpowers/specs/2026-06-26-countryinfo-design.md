# Country Info Panel — Design

**Dato:** 2026-06-26
**Repo:** Rickymoe/globus

## Oversikt

Klikk på globusen → lat/lon → reverse geocode (bigdatacloud.net) → land → REST Countries API → flytende info-panel med flagg, befolkning, areal, hovedstad, språk, valuta.

## API-er (gratis, ingen nøkkel)

- **Reverse geocode:** `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=LAT&longitude=LON&localityLanguage=en`
  - Returnerer: `countryCode` (ISO 3166-1 alpha-2), `countryName`
- **Country details:** `https://restcountries.com/v3.1/alpha/COUNTRYCODE`
  - Returnerer: flag emoji, navn, befolkning, areal, hovedstad, språk, valuta

## Filer som påvirkes

- **Ny:** `js/countryinfo.js` — click handler, API-kall, popup DOM
- **Modifiser:** `index.html` — ℹ️-toggle
- **Modifiser:** `js/controls.js` — onCountryInfo callback
- **Modifiser:** `js/app.js` — import, init, toggle

## Teknisk tilnærming

### Click-til-lat/lon

Samme mønster som yr-weather.js:
```js
canvas.addEventListener('click', async e => {
  if (!_enabled) return
  const rect = canvas.getBoundingClientRect()
  const ndc = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1,
  )
  _ray.setFromCamera(ndc, camera)
  const hits = _ray.intersectObject(earthSphere)
  if (!hits.length) return
  const p = hits[0].point.normalize()
  const lat = Math.asin(p.y) * (180 / Math.PI)
  const lon = Math.atan2(p.z, p.x) * (180 / Math.PI)
  showCountryInfo(lat, lon, e.clientX, e.clientY)
})
```

For earthSphere bruker vi et usynlig SphereGeometry(100) med `visible:false` som kun er til for raycasting.

### countryinfo.js

```js
import * as THREE from 'three'

let _enabled = false
let _popup = null
let _camera = null
let _canvas = null
let _ray = new THREE.Raycaster()
let _sphere = null

export function initCountryInfo(scene, camera, canvas) {
  _camera = camera
  _canvas = canvas
  // Invisible sphere for raycasting
  _sphere = new THREE.Mesh(
    new THREE.SphereGeometry(100, 32, 32),
    new THREE.MeshBasicMaterial({ visible: false })
  )
  scene.add(_sphere)
  _popup = createPopup()
  canvas.addEventListener('click', handleClick)
}

export function setCountryInfoEnabled(enabled) {
  _enabled = enabled
  if (!enabled && _popup) _popup.style.display = 'none'
}
```

### Info-panel HTML (dynamisk)

```html
<div class="country-popup">
  <div style="font-size:2.2em">🇳🇴</div>
  <div style="font-size:1.15em;font-weight:600">Norway</div>
  <div style="color:#aaa;font-size:11px">🏛 Oslo</div>
  <hr style="border-color:rgba(255,255,255,0.1);margin:8px 0">
  <div>👥 5 474 360</div>
  <div>📐 385 207 km²</div>
  <div>💬 Norwegian</div>
  <div>💰 Norwegian krone (NOK)</div>
</div>
```

### Popup-stil (konsistent med yr-weather.js)

```js
function createPopup() {
  const el = document.createElement('div')
  el.style.cssText = [
    'position:absolute',
    'min-width:180px',
    'max-width:240px',
    'background:rgba(8,8,8,0.88)',
    'color:#e0e0e0',
    'border:1px solid rgba(255,255,255,0.18)',
    'border-radius:14px',
    'padding:14px 16px 12px',
    'font-family:system-ui,sans-serif',
    'font-size:13px',
    'line-height:1.65',
    'display:none',
    'z-index:100',
    'backdrop-filter:blur(6px)',
    'pointer-events:none',
  ].join(';')
  document.getElementById('canvas-container').appendChild(el)
  return el
}
```

### Feilhåndtering

- Klikk utenfor landgrenser (hav): vis "🌊 Åpent hav" med koordinater
- API-feil: vis "Ukjent land"
- Loading state: vis spinner/… mens API kalles

### API-kall-flyt

```js
async function showCountryInfo(lat, lon, clientX, clientY) {
  showLoading(clientX, clientY)
  try {
    const geo = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    ).then(r => r.json())
    
    if (!geo.countryCode) {
      showOcean(lat, lon, clientX, clientY)
      return
    }
    
    const [country] = await fetch(
      `https://restcountries.com/v3.1/alpha/${geo.countryCode}`
    ).then(r => r.json())
    
    renderPanel(country, clientX, clientY)
  } catch {
    showError(clientX, clientY)
  }
}
```

### Klikk-utenfor-lukk

```js
document.addEventListener('click', e => {
  if (_popup && !_popup.contains(e.target) && e.target === _canvas) {
    // handled by canvas click; popup replaced
  }
})
// Close on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && _popup) _popup.style.display = 'none'
})
```

## index.html

```html
<div id="countryinfo-toggle" class="float-toggle" title="Klikk på land for info">
  <span class="toggle-icon">ℹ️</span>
  <div class="toggle-track"><div class="toggle-thumb"></div></div>
</div>
```
Etter `#tectonic-toggle`.

## controls.js

Legg til `onCountryInfo` parameter og `makeToggle('countryinfo-toggle', onCountryInfo)`.

## app.js

```js
import { initCountryInfo, setCountryInfoEnabled } from './countryinfo.js'
// init: initCountryInfo(scene, getCamera(), getCanvas())
// controls: onCountryInfo: setCountryInfoEnabled
```

## Dekomponering

**Task 1:** Opprett js/countryinfo.js og koble inn i index.html, controls.js, app.js
