# Tektoniske plater — Design

**Dato:** 2026-06-26
**Repo:** Rickymoe/globus

## Oversikt

Viser tektoniske plategrenser som oransje LineSegments på jordkloden. Gjør jordskalvdataene forståelige ved å vise *hvorfor* skjelv skjer der de gjør.

**Datakilde:** `https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json`
(GeoJSON FeatureCollection med LineString-features, åpent tilgjengelig, støtter CORS)

## Filer som påvirkes

- **Ny:** `js/tectonic.js` — fetch, geometri, toggle
- **Modifiser:** `index.html` — legg til toggle-knapp
- **Modifiser:** `js/controls.js` — legg til `onTectonic` callback
- **Modifiser:** `js/app.js` — importer, init, toggle

## Teknisk tilnærming

### tectonic.js

R = 101.5 (identisk med borders.js — over vannoverflaten).

GeoJSON-strukturen er enklere enn TopoJSON — ingen `mesh()` trengs:
```json
{
  "type": "FeatureCollection",
  "features": [
    { "geometry": { "type": "LineString", "coordinates": [[lon,lat],...] } },
    { "geometry": { "type": "MultiLineString", "coordinates": [[[lon,lat],...]] } }
  ]
}
```

```js
function latLonToVec3(lat, lon) {
  const phi   = (90 - lat) * Math.PI / 180
  const theta = (lon + 180) * Math.PI / 180
  return new THREE.Vector3(
    -R * Math.cos(theta) * Math.sin(phi),
     R * Math.cos(phi),
     R * Math.sin(theta) * Math.sin(phi),
  )
}

export async function initTectonic(scene) {
  const data = await fetch('https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json').then(r => r.json())

  const positions = []
  for (const feature of data.features) {
    const lines = feature.geometry.type === 'MultiLineString'
      ? feature.geometry.coordinates
      : [feature.geometry.coordinates]
    for (const line of lines) {
      for (let i = 0; i < line.length - 1; i++) {
        const [lon1, lat1] = line[i]
        const [lon2, lat2] = line[i + 1]
        const a = latLonToVec3(lat1, lon1)
        const b = latLonToVec3(lat2, lon2)
        positions.push(a.x, a.y, a.z, b.x, b.y, b.z)
      }
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))

  _lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
    color: 0xff6600,
    transparent: true,
    opacity: 0.85,
  }))
  scene.add(_lines)
}

export function setTectonicVisible(visible) {
  if (_lines) _lines.visible = visible
}
```

### index.html

Legg til etter `#iss-toggle`:
```html
<div id="tectonic-toggle" class="float-toggle" title="Tektoniske plategrenser">
  <span class="toggle-icon">🌍</span>
  <div class="toggle-track"><div class="toggle-thumb"></div></div>
</div>
```

### controls.js

Legg til `onTectonic` parameter og `makeToggle('tectonic-toggle', onTectonic)`.

### app.js

```js
import { initTectonic, setTectonicVisible } from './tectonic.js'
// i main():
initTectonic(scene)
// i initControls:
onTectonic: setTectonicVisible,
```

## Dekomponering

**Task 1:** Opprett `js/tectonic.js` og koble inn i `index.html`, `controls.js`, `app.js`

(Én task — identisk mønster som borders.js, svært liten endring)
