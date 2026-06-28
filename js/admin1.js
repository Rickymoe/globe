import * as THREE from 'three'
import { mesh }   from 'topojson-client'

const R = 101.5
let _lines   = null
let _visible = false

function latLonToVec3(lat, lon) {
  const phi   = (90 - lat) * Math.PI / 180
  const theta = (lon + 180) * Math.PI / 180
  return new THREE.Vector3(
    -R * Math.cos(theta) * Math.sin(phi),
     R * Math.cos(phi),
     R * Math.sin(theta) * Math.sin(phi),
  )
}

export async function initAdmin1(scene) {
  let topo
  try {
    topo = await fetch('./data/admin1.json').then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json()
    })
  } catch (e) {
    console.warn('[admin1] data not yet available — run GitHub Actions workflow', e.message)
    return
  }

  const borders = mesh(topo, topo.objects.admin1)

  const positions = []
  for (const line of borders.coordinates) {
    for (let i = 0; i < line.length - 1; i++) {
      const [lon1, lat1] = line[i]
      const [lon2, lat2] = line[i + 1]
      const a = latLonToVec3(lat1, lon1)
      const b = latLonToVec3(lat2, lon2)
      positions.push(a.x, a.y, a.z, b.x, b.y, b.z)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))

  _lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
    color: 0x00cc44,
    transparent: true,
    opacity: 0.45,
  }))
  _lines.visible = _visible
  scene.add(_lines)
}

export function setAdmin1Visible(visible) {
  _visible = visible
  if (_lines) _lines.visible = visible
}
