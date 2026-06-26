import * as THREE from 'three'

const R = 101.5
const PERIOD = 2.5  // seconds per pulse cycle

let _group = null
let _rings = []  // { mesh, maxScale, phase }
let _elapsed = 0

function latLonToVec3(lat, lon) {
  const phi   = (90 - lat) * Math.PI / 180
  const theta = (lon + 180) * Math.PI / 180
  return new THREE.Vector3(
    -R * Math.cos(theta) * Math.sin(phi),
     R * Math.cos(phi),
     R * Math.sin(theta) * Math.sin(phi),
  )
}

function magColor(mag) {
  if (mag >= 6.0) return 0xff1a1a
  if (mag >= 4.0) return 0xff7700
  return 0xffee00
}

function magScale(mag) {
  if (mag >= 6.0) return 4.0
  if (mag >= 4.0) return 2.5
  return 1.5
}

export async function initEarthquakes(scene) {
  _group = new THREE.Group()
  _group.visible = false
  scene.add(_group)

  let data
  try {
    const res = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson')
    data = await res.json()
  } catch {
    return
  }

  for (const feature of data.features) {
    const [lon, lat] = feature.geometry.coordinates
    const mag = feature.properties.mag ?? 2.5

    const pos = latLonToVec3(lat, lon)
    const normal = pos.clone().normalize()

    const geo = new THREE.RingGeometry(0.8, 1.2, 32)
    const mat = new THREE.MeshBasicMaterial({
      color: magColor(mag),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    })
    const mesh = new THREE.Mesh(geo, mat)

    // Orient ring tangent to globe surface
    mesh.position.copy(pos)
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)

    _group.add(mesh)
    _rings.push({ mesh, maxScale: magScale(mag), phase: Math.random() })
  }
}

export function setEarthquakesVisible(visible) {
  if (_group) _group.visible = visible
}

export function updateEarthquakes(delta) {
  if (!_group?.visible) return
  _elapsed += delta
  for (const { mesh, maxScale, phase } of _rings) {
    const t = ((_elapsed / PERIOD) + phase) % 1
    mesh.scale.setScalar(t * maxScale)
    mesh.material.opacity = 1 - t
  }
}
