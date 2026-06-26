# Atmosfæreglow — Design

**Dato:** 2026-06-26
**Repo:** Rickymoe/globus

## Oversikt

En blå limb-glow rundt jordkloden som simulerer atmosfæresøylen sett fra rommet. Implementert som en BackSide-sfære med custom `ShaderMaterial` (Fresnel-effekt). Alltid synlig, ingen toggle.

## Filer som påvirkes

- **Ny:** `js/atmosphere.js` — sfære + shader + init-funksjon
- **Modifiser:** `js/app.js` — importer og kall `initAtmosphere(scene)`

## Teknisk tilnærming

### Geometri

`THREE.SphereGeometry(115, 64, 64)` med `side: THREE.BackSide`.

Radius 115 er valgt fordi:
- Glob-overflaten er ved R=100 (terrain.js)
- Lag (borders, us-states, earthquakes) ligger ved R=101–103
- 115 gir rom for synlig glow uten å klippe eksisterende geometri

### ShaderMaterial

**Vertex shader:**
```glsl
varying vec3 vNormal;
varying vec3 vViewDir;
void main() {
  vNormal  = normalize(normalMatrix * normal);
  vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
  vViewDir = normalize(-mvPos.xyz);
  gl_Position = projectionMatrix * mvPos;
}
```

**Fragment shader:**
```glsl
varying vec3 vNormal;
varying vec3 vViewDir;
void main() {
  float rim = 1.0 - abs(dot(vNormal, vViewDir));
  float glow = pow(rim, 3.5);
  gl_FragColor = vec4(0.25, 0.55, 1.0, glow * 0.7);
}
```

Forklaring:
- `rim` er 0 i midten (kamera ser rett på normalen), 1 ved kanten (tangent)
- `pow(rim, 3.5)` gir skarp men myk overgang
- Farge `(0.25, 0.55, 1.0)` = himmelblå
- `glow * 0.7` maksimal opacity ved kanten

### Material-oppsett

```js
new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  side: THREE.BackSide,
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
})
```

`AdditiveBlending` gjør at glowet legger seg oppå bakgrunn uten å mørkne det.

### atmosphere.js

```js
import * as THREE from 'three'

const vertexShader = `...`
const fragmentShader = `...`

export function initAtmosphere(scene) {
  const geo = new THREE.SphereGeometry(115, 64, 64)
  const mat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  scene.add(new THREE.Mesh(geo, mat))
}
```

### app.js

```js
import { initAtmosphere } from './atmosphere.js'
// i main(), tidlig — før initTerrain slik at sfæren rendres bak alt annet:
initAtmosphere(scene)
```

## Dekomponering

**Task 1:** Opprett `js/atmosphere.js` og koble inn i `app.js`

(Én task — svært liten endring, to filer totalt)
