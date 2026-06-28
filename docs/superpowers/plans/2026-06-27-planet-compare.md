# Planet Comparison Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Legge til et planetpanel (vises når 🪐 er på) der brukeren kan velge en planet som vises i korrekt størrelse bak jordkloden, med OrbitControls target satt til planetsentrum.

**Architecture:** Ny modul `js/planet-compare.js` oppretter planet-meshene, HTML-panelet og tilbake-knappen dynamisk. Den importerer `setSolarSystemVisible` fra `solar-system.js` direkte for å skjule banene under sammenligning. `app.js` kaller `initPlanetCompare` og utvider `onSolarSystem`-callbacken.

**Tech Stack:** Three.js r165 (ES modules), HTML/CSS (dynamisk opprettet), OrbitControls (allerede i bruk)

## Global Constraints

- Earth-sfæren er alltid ved origo (0, 0, 0), radius = 100 world units
- Kamera starter ved z = 350 i compare-modus (tett på Jorda)
- OrbitControls target = planetsentrum (ikke origo)
- Mobilmål: knapper minimum 56×56 px, panel med horizontal scroll
- Ingen nye npm-pakker — kun Three.js og standard DOM

---

### Task 1: Opprett `js/planet-compare.js`

**Files:**
- Create: `js/planet-compare.js`

**Interfaces:**
- Consumes: `setSolarSystemVisible(bool)` fra `./solar-system.js`, `getCamera()` / `getControls()` via init-argumenter
- Produces:
  - `initPlanetCompare(scene, camera, controls): void`
  - `showPlanetPanel(visible: bool): void`
  - `enterPlanetCompare(planetName: string): void`
  - `exitPlanetCompare(): void`
  - `isPlanetCompareActive(): bool`

- [ ] **Steg 1: Skriv modulskjelettet**

Opprett `/home/ricky/Dokumenter/Koding/globus/js/planet-compare.js` med følgende innhold:

```js
import * as THREE from 'three'
import { setSolarSystemVisible } from './solar-system.js'

const EARTH_R = 100

const PLANETS = [
  { name: 'Merkur',  r:  38,   color: 0xaaaaaa },
  { name: 'Venus',   r:  95,   color: 0xe8d08c },
  { name: 'Mars',    r:  53,   color: 0xc1440e },
  { name: 'Jupiter', r: 1120,  color: 0xc88b3a },
  { name: 'Saturn',  r:  945,  color: 0xe8d87c, rings: true },
  { name: 'Uranus',  r:  400,  color: 0x7de8e8 },
  { name: 'Neptun',  r:  390,  color: 0x4060ff },
]

let _scene, _camera, _controls
let _compareGroup = null
let _panel = null
let _backBtn = null
let _active = false
let _savedCamPos = null
let _savedTarget = null
let _savedMinDist = 0
let _savedMaxDist = 0

export function initPlanetCompare(scene, camera, controls) {
  _scene = scene
  _camera = camera
  _controls = controls

  _compareGroup = new THREE.Group()
  _compareGroup.visible = false
  scene.add(_compareGroup)

  _buildPlanetMeshes()
  _buildPanel()
  _buildBackButton()
}

function _buildPlanetMeshes() {
  for (const p of PLANETS) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(p.r, 32, 32),
      new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.8 })
    )
    mesh.userData.planetName = p.name
    mesh.visible = false
    _compareGroup.add(mesh)

    if (p.rings) {
      const rings = new THREE.Mesh(
        new THREE.RingGeometry(p.r * 1.5, p.r * 2.6, 64),
        new THREE.MeshBasicMaterial({
          color: 0xd4c57a, side: THREE.DoubleSide,
          transparent: true, opacity: 0.65,
        })
      )
      rings.rotation.x = Math.PI * 0.42
      mesh.add(rings)
    }
  }
}

function _buildPanel() {
  _panel = document.createElement('div')
  _panel.id = 'planet-panel'
  _panel.style.cssText = [
    'position:fixed', 'bottom:1rem', 'left:50%', 'transform:translateX(-50%)',
    'display:none', 'flex-direction:row', 'gap:0.75rem',
    'overflow-x:auto', 'max-width:calc(100vw - 2rem)',
    'padding:0.75rem 1rem', 'background:rgba(0,0,0,0.75)',
    'border-radius:1.25rem', 'backdrop-filter:blur(10px)',
    'z-index:100', '-webkit-overflow-scrolling:touch',
  ].join(';')

  for (const p of PLANETS) {
    const btn = document.createElement('button')
    btn.style.cssText = [
      'display:flex', 'flex-direction:column', 'align-items:center',
      'gap:0.3rem', 'background:none', 'border:none', 'cursor:pointer',
      'color:white', 'font-size:11px', 'font-family:system-ui,sans-serif',
      'padding:0.25rem', 'min-width:64px', 'flex-shrink:0',
    ].join(';')

    const hex = '#' + p.color.toString(16).padStart(6, '0')
    const circle = document.createElement('div')
    circle.style.cssText = [
      'width:56px', 'height:56px', 'border-radius:50%',
      `background:${hex}`,
      'border:2px solid rgba(255,255,255,0.25)',
      'flex-shrink:0',
    ].join(';')

    const label = document.createElement('span')
    label.textContent = p.name

    btn.appendChild(circle)
    btn.appendChild(label)
    btn.addEventListener('click', () => enterPlanetCompare(p.name))
    _panel.appendChild(btn)
  }

  document.body.appendChild(_panel)
}

function _buildBackButton() {
  _backBtn = document.createElement('button')
  _backBtn.textContent = '← Tilbake'
  _backBtn.style.cssText = [
    'position:fixed', 'top:1rem', 'left:1rem', 'z-index:101',
    'display:none', 'background:rgba(0,0,0,0.75)', 'color:white',
    'border:1px solid rgba(255,255,255,0.3)', 'border-radius:2rem',
    'padding:0.5rem 1.25rem', 'font-size:14px', 'cursor:pointer',
    'font-family:system-ui,sans-serif', 'backdrop-filter:blur(8px)',
  ].join(';')
  _backBtn.addEventListener('click', exitPlanetCompare)
  document.body.appendChild(_backBtn)
}

export function showPlanetPanel(visible) {
  if (_panel) _panel.style.display = visible ? 'flex' : 'none'
}

export function enterPlanetCompare(planetName) {
  if (!_compareGroup) return
  const p = PLANETS.find(pd => pd.name === planetName)
  if (!p) return

  setSolarSystemVisible(false)

  // Vis kun valgt planet, skjul resten
  for (const child of _compareGroup.children) {
    if (child.userData.planetName) child.visible = child.userData.planetName === planetName
  }
  _compareGroup.visible = true

  // Planet bak Jorda (Jorda er alltid ved origo)
  const planetZ = -(p.r + EARTH_R + 10)
  const planetMesh = _compareGroup.children.find(c => c.userData.planetName === planetName)
  planetMesh.position.set(0, 0, planetZ)

  // Lagre eksisterende kamera/controls-tilstand
  _savedCamPos = _camera.position.clone()
  _savedTarget = _controls.target.clone()
  _savedMinDist = _controls.minDistance
  _savedMaxDist = _controls.maxDistance

  // Sett kamera tett på Jorda, orbit rundt planetsentrum
  const target = new THREE.Vector3(0, 0, planetZ)
  _controls.target.copy(target)
  _camera.position.set(0, 0, EARTH_R * 3.5)
  _camera.lookAt(target)
  _controls.minDistance = p.r * 0.5 + 120
  _controls.maxDistance = Math.max(p.r * 8, 2000)
  _controls.update()

  _backBtn.style.display = 'block'
  _active = true
}

export function exitPlanetCompare() {
  if (!_active) return

  // Skjul sammenligning
  _compareGroup.visible = false
  for (const child of _compareGroup.children) {
    if (child.userData.planetName) child.visible = false
  }

  // Gjenopprett sol-system (🪐-toggle er fortsatt på)
  setSolarSystemVisible(true)

  // Gjenopprett kamera og controls
  _camera.position.copy(_savedCamPos)
  _controls.target.copy(_savedTarget)
  _controls.minDistance = _savedMinDist
  _controls.maxDistance = _savedMaxDist
  _controls.update()

  _backBtn.style.display = 'none'
  _active = false
}

export function isPlanetCompareActive() {
  return _active
}
```

- [ ] **Steg 2: Verifiser at filen ikke har syntaksfeil**

```bash
cd /home/ricky/Dokumenter/Koding/globus
node --input-type=module --eval "import('./js/planet-compare.js')" 2>&1 | head -5
```

Forventet: Ingen feilmeldinger (eller kun advarsler om THREE som ikke finnes i Node — det er OK siden dette er browser-kode).

- [ ] **Steg 3: Commit**

```bash
cd /home/ricky/Dokumenter/Koding/globus
git add js/planet-compare.js
git commit -m "feat: add planet-compare module with panel and compare mode"
```

---

### Task 2: Koble `planet-compare.js` inn i `app.js`

**Files:**
- Modify: `js/app.js`

**Interfaces:**
- Consumes: `initPlanetCompare`, `showPlanetPanel`, `exitPlanetCompare` fra `./planet-compare.js`
- Produces: Planet-panel vises/skjules med 🪐-toggle; compare-modus avsluttes automatisk når 🪐 slås av

- [ ] **Steg 1: Legg til import øverst i `app.js`**

Legg til denne linjen etter linje 24 (etter solar-system-importen):

```js
import { initPlanetCompare, showPlanetPanel, exitPlanetCompare } from './planet-compare.js'
```

- [ ] **Steg 2: Legg til `initPlanetCompare`-kall etter `initSolarSystem`**

Finn linje 49 i `app.js`:
```js
  initSolarSystem(scene)
```

Erstatt med:
```js
  initSolarSystem(scene)
  initPlanetCompare(scene, getCamera(), getControls())
```

- [ ] **Steg 3: Utvid `onSolarSystem`-callback i `initControls`-kallet**

Finn linje 65 i `app.js`:
```js
    onSolarSystem: setSolarSystemVisible,
```

Erstatt med:
```js
    onSolarSystem: v => {
      setSolarSystemVisible(v)
      showPlanetPanel(v)
      if (!v) exitPlanetCompare()
    },
```

- [ ] **Steg 4: Åpne appen i nettleser og test**

```bash
cd /home/ricky/Dokumenter/Koding/globus
python3 -m http.server 8090 &
```

Åpne `http://localhost:8090` og verifiser:

1. **Panel vises:** Slå på 🪐-toggle → planet-panel skal dukke opp nederst på skjermen med 7 fargerike knapper
2. **Sammenligning aktiveres:** Trykk Jupiter → jordkloden vises foran en enorm Jupiter-sfære i bakgrunnen
3. **Zoom og orbit:** Zoom ut → ser Jorda krympe mot Jupiter. Dra med mus/touch → roterer rundt Jupiters sentrum (ikke Jorda)
4. **Tilbake:** Trykk `← Tilbake` → tilbake til sol-system-visning med 🪐 fortsatt på
5. **Toggle av:** Slå av 🪐 → panel skjules, compare-modus avsluttes automatisk
6. **Saturn-ringer:** Velg Saturn → ringer vises korrekt
7. **Mobil:** Test i browser-devtools med mobil-emulering (iPhone 14) — panelet skal ha horisontal scroll og knappene skal være lette å trykke

- [ ] **Steg 5: Commit**

```bash
cd /home/ricky/Dokumenter/Koding/globus
git add js/app.js
git commit -m "feat: wire planet-compare into app — panel + compare mode on solar toggle"
```

---

## Self-review

**Spec coverage:**
- ✅ Panel med store knapper (C) — `_buildPanel()` med 56×56 px circles
- ✅ Planet som bakgrunn — planet plasseres bak Jorda langs −Z-aksen
- ✅ Korrekte størrelsesforhold — radiene er beregnet fra faktiske forholdstall
- ✅ Zoom fungerer — `minDistance` og `maxDistance` settes per planet
- ✅ Orbit rundt planeten (ikke Jorda) — `_controls.target` settes til planetsentrum
- ✅ Tilbake-knapp — `_buildBackButton()` med `exitPlanetCompare()`
- ✅ Panel skjules når 🪐 slås av — `showPlanetPanel(false)` i `onSolarSystem`-callback
- ✅ Saturn-ringer — `RingGeometry` med `rings: true`-flagg
- ✅ Mobilvennlig — `flex`, horisontal scroll, `56px` knapper, `fixed` posisjonering

**Type-konsistens:**
- `enterPlanetCompare(planetName: string)` — brukes i panel-klikk og eksporteres
- `exitPlanetCompare()` — brukes av tilbake-knapp og av `onSolarSystem(false)`
- `showPlanetPanel(visible: bool)` — brukes i `onSolarSystem`-callback
- Alle funksjoner matchet mellom Task 1 (definisjoner) og Task 2 (bruk) ✅
