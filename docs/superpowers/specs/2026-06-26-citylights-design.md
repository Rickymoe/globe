# Bybelysning på nattesiden — Design

**Dato:** 2026-06-26
**Repo:** Rickymoe/globus

## Oversikt

Legger et "Earth at Night"-teksturlag over kloden med `THREE.AdditiveBlending`. Naturlig effekt uten shader: byene er synlige på nattesiden, usynlige der sol lyser.

**Tekstur:** `https://threejs.org/examples/textures/planets/earth_lights_2048.png`
(Samme CDN som terrain.js — garantert tilgjengelig)

## Filer som påvirkes

- **Ny:** `js/citylights.js` — sphere, tekstur, toggle
- **Modifiser:** `index.html` — legg til toggle-knapp
- **Modifiser:** `js/controls.js` — legg til `onCityLights` callback
- **Modifiser:** `js/app.js` — importer, init, toggle

## Teknisk tilnærming

### Hvorfor AdditiveBlending virker

Terreng-sfæren bruker `MeshStandardMaterial` og reagerer på direktebelysning:
- **Sol på, natteside:** ambient=0.08, ingen direktebelysning → terreng er mørkt
- **Sol på, dagside:** ambient=0.08 + direktebelysning → terreng er lyst

By-laget bruker `MeshBasicMaterial` med `AdditiveBlending`:
- Legger teksturens pikselverdier *oppå* det som allerede er rendert
- Mørk bakgrunn (natt): byer lyser opp
- Lys bakgrunn (dag): de svake lysene drukner i solbelysningen
- Nøyaktig riktig oppførsel — uten en eneste GLSL-linje

### citylights.js

```js
import * as THREE from 'three'

const BASE = 'https://threejs.org/examples/textures/planets/'
let _mesh = null

export function initCityLights(scene) {
  const texture = new THREE.TextureLoader().load(BASE + 'earth_lights_2048.png')
  const geo = new THREE.SphereGeometry(100.2, 64, 64)
  const mat = new THREE.MeshBasicMaterial({
    map: texture,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  })
  _mesh = new THREE.Mesh(geo, mat)
  _mesh.visible = false
  scene.add(_mesh)
}

export function setCityLightsVisible(visible) {
  if (_mesh) _mesh.visible = visible
}
```

### index.html

Legg til etter `#sun-toggle` (logisk gruppering — begge handler om sol/natt):
```html
<div id="citylights-toggle" class="float-toggle" title="Bybelysning (fungerer best med sol på)">
  <span class="toggle-icon">🌃</span>
  <div class="toggle-track"><div class="toggle-thumb"></div></div>
</div>
```

### controls.js

Legg til `onCityLights` parameter og `makeToggle('citylights-toggle', onCityLights)`.

### app.js

```js
import { initCityLights, setCityLightsVisible } from './citylights.js'
// i main():
initCityLights(scene)
// i initControls:
onCityLights: setCityLightsVisible,
```

## Dekomponering

**Task 1:** Opprett `js/citylights.js` og koble inn i `index.html`, `controls.js`, `app.js`

(Én task — minimal, selvforsynt)
