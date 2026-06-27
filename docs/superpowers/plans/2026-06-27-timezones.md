# Tidssoner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Legg til et visuelt tidssone-overlay med 24 fargede 15°-bånd og UTC-offset-labels, styrt av en ny 🕐-toggle.

**Architecture:** Ny modul `js/timezones.js` med (1) en ShaderMaterial-sfære som farger piksler basert på longitude, og (2) 24 THREE.Sprite-labels i en Group. Ny toggle i index.html, controls.js og app.js.

**Tech Stack:** Three.js r165 (ES modules, importmap), GLSL, CanvasTexture.

## Global Constraints

- Three.js importeres som `'three'` (importmap, ikke CDN-URL)
- Alle nye mesh: `depthWrite: false`, `depthTest: false`, `transparent: true`
- Async-safe visibility: `_visible`-variabel, anvend ved opprettelse
- Ingen ekstern datafil — timezone-logikk er ren matematikk (15°-bånd)
- renderOrder for bånds-mesh = 1 (over terrain 0, under aurora 2)
- Sprites: `depthTest: false`, `transparent: true`
- Toggle-id: `timezones-toggle`, toggle-ikon: 🕐

---

### Task 1: Opprett `js/timezones.js`

**Files:**
- Create: `js/timezones.js`

**Interfaces:**
- Consumes: ingenting fra andre moduler
- Produces:
  - `initTimezones(scene: THREE.Scene): void`
  - `setTimezonesVisible(v: boolean): void`

- [ ] **Steg 1: Opprett filen med shader og buildBands**

Opprett `/home/ricky/Dokumenter/Koding/globus/js/timezones.js`:

```js
import * as THREE from 'three'

let _mesh = null
let _group = null
let _visible = false

const vertexShader = `
varying vec3 vWorldPos;
void main() {
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = `
varying vec3 vWorldPos;

vec3 hsl2rgb(float h, float s, float l) {
  float c = (1.0 - abs(2.0 * l - 1.0)) * s;
  float h6 = h * 6.0;
  float x = c * (1.0 - abs(mod(h6, 2.0) - 1.0));
  float m = l - c * 0.5;
  vec3 rgb;
  if (h6 < 1.0)      rgb = vec3(c, x, 0.0);
  else if (h6 < 2.0) rgb = vec3(x, c, 0.0);
  else if (h6 < 3.0) rgb = vec3(0.0, c, x);
  else if (h6 < 4.0) rgb = vec3(0.0, x, c);
  else if (h6 < 5.0) rgb = vec3(x, 0.0, c);
  else               rgb = vec3(c, 0.0, x);
  return rgb + m;
}

void main() {
  vec3 n = normalize(vWorldPos);
  float lon = atan(n.z, n.x);
  float zone = floor(lon / (3.14159265 / 12.0) + 0.5);
  zone = clamp(zone, -12.0, 11.0);
  float t = (zone + 12.0) / 24.0;
  vec3 col = hsl2rgb(t, 0.75, 0.5);
  gl_FragColor = vec4(col, 0.3);
}
`

function buildBands(scene) {
  const mat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: THREE.FrontSide,
  })
  _mesh = new THREE.Mesh(new THREE.SphereGeometry(100.5, 72, 36), mat)
  _mesh.renderOrder = 1
  _mesh.visible = _visible
  scene.add(_mesh)
}
```

- [ ] **Steg 2: Legg til buildLabels og eksporter**

Legg til etter `buildBands`:

```js
function makeSprite(text) {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 40
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillRect(0, 0, 128, 40)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 16px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 64, 20)
  const mat = new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(canvas),
    transparent: true,
    depthTest: false,
  })
  return new THREE.Sprite(mat)
}

function buildLabels(scene) {
  _group = new THREE.Group()
  const lat = 20 * Math.PI / 180
  const r = 104

  for (let n = -12; n <= 11; n++) {
    const lon = n * 15 * Math.PI / 180
    const sprite = makeSprite(n >= 0 ? `UTC+${n}` : `UTC${n}`)
    sprite.position.set(
      r * Math.cos(lat) * Math.cos(lon),
      r * Math.sin(lat),
      r * Math.cos(lat) * Math.sin(lon)
    )
    sprite.scale.set(9, 2.8, 1)
    _group.add(sprite)
  }

  _group.visible = _visible
  scene.add(_group)
}

export function initTimezones(scene) {
  buildBands(scene)
  buildLabels(scene)
}

export function setTimezonesVisible(v) {
  _visible = v
  if (_mesh) _mesh.visible = v
  if (_group) _group.visible = v
}
```

- [ ] **Steg 3: Verifiser syntaks**

```bash
cd /home/ricky/Dokumenter/Koding/globus
node --input-type=module --eval "import './js/timezones.js'" 2>&1 | head -5
```

Forventet: ingen output (ingen syntaksfeil). Eventuelle feil om `document` / `THREE` er forventet i Node-kontekst og betyr ikke at filen er feil.

- [ ] **Steg 4: Commit**

```bash
git add js/timezones.js
git commit -m "feat: timezones module – HSL band shader + UTC label sprites"
```

---

### Task 2: Koble timezones inn i index.html, controls.js og app.js

**Files:**
- Modify: `index.html`
- Modify: `js/controls.js`
- Modify: `js/app.js`

**Interfaces:**
- Consumes:
  - `initTimezones(scene)` fra `./timezones.js`
  - `setTimezonesVisible(v)` fra `./timezones.js`
- Produces: 🕐-toggle aktiverer tidssone-overlay

- [ ] **Steg 1: Legg til toggle i index.html**

Finn i `/home/ricky/Dokumenter/Koding/globus/index.html`:
```html
      <div id="countryinfo-toggle" class="float-toggle" title="Klikk på land for info">
        <span class="toggle-icon">ℹ️</span>
        <div class="toggle-track"><div class="toggle-thumb"></div></div>
      </div>
```

Legg til rett etter:
```html
      <div id="timezones-toggle" class="float-toggle" title="Tidssoner">
        <span class="toggle-icon">🕐</span>
        <div class="toggle-track"><div class="toggle-thumb"></div></div>
      </div>
```

- [ ] **Steg 2: Legg til onTimezones i controls.js**

Finn i `/home/ricky/Dokumenter/Koding/globus/js/controls.js`:
```js
export function initControls({ onOpacity, onBorders, onLabels, onDragMode, onEquator, onCapitals, onSolarSystem, onSun, onCityLights, onAurora, onWeatherClick, onEarthquakes, onIss, onTectonic, onCountryInfo, onReset }) {
```

Bytt ut med:
```js
export function initControls({ onOpacity, onBorders, onLabels, onDragMode, onEquator, onCapitals, onSolarSystem, onSun, onCityLights, onAurora, onWeatherClick, onEarthquakes, onIss, onTectonic, onCountryInfo, onTimezones, onReset }) {
```

Finn:
```js
  const countryInfoToggle   = makeToggle('countryinfo-toggle',   onCountryInfo)
```

Legg til rett etter:
```js
  const timezonesToggle     = makeToggle('timezones-toggle',     onTimezones)
```

Finn:
```js
  onCountryInfo(countryInfoToggle.classList.contains('active'))
```

Legg til rett etter:
```js
  onTimezones(timezonesToggle.classList.contains('active'))
```

- [ ] **Steg 3: Koble inn i app.js**

Finn i `/home/ricky/Dokumenter/Koding/globus/js/app.js`:
```js
import { initAurora, setAuroraVisible, updateAurora } from './aurora.js'
```

Legg til rett etter:
```js
import { initTimezones, setTimezonesVisible } from './timezones.js'
```

Finn:
```js
  initMagnetField(scene)
```

Legg til rett etter:
```js
  initTimezones(scene)
```

Finn:
```js
    onCountryInfo: setCountryInfoEnabled,
```

Legg til rett etter:
```js
    onTimezones: setTimezonesVisible,
```

- [ ] **Steg 4: Visuell verifisering**

Start server:
```bash
cd /home/ricky/Dokumenter/Koding/globus && python3 -m http.server 8090
```

Åpne `http://localhost:8090` og:
1. Scroll ned i toggle-karusellen — 🕐 skal vises som siste toggle
2. Klikk 🕐 → 24 fargede soner skal vises på globen
3. UTC-labels («UTC+0», «UTC+1» etc.) skal vises ved 20°N-breddegrad
4. Klikk togglen av → alt forsvinner
5. DevTools Console: ingen feil

- [ ] **Steg 5: Commit, push og lukk issue**

```bash
git add index.html js/controls.js js/app.js
git commit -m "feat: wire timezones toggle (issue #24)"
git push
gh issue close 24 --repo Rickymoe/globus --comment "Implementert: 24 fargede 15°-soner + UTC-labels, aktivert av 🕐-toggle"
```
