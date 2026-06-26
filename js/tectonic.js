import * as THREE from 'three'

const R = 101.5
let _lines = null

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
  let data
  try {
    const res = await fetch('https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json')
    data = await res.json()
  } catch {
    return
  }

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
