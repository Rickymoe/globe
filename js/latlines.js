import * as THREE from 'three'

const R = 101.5
const SEGMENTS = 360

function latLonToVec3(lat, lon) {
  const phi   = (90 - lat) * Math.PI / 180
  const theta = (lon + 180) * Math.PI / 180
  return new THREE.Vector3(
    -R * Math.cos(theta) * Math.sin(phi),
     R * Math.cos(phi),
     R * Math.sin(theta) * Math.sin(phi),
  )
}

function makeLatLine(lat, color, opacity) {
  const pos = []
  for (let i = 0; i < SEGMENTS; i++) {
    const lon1 = -180 + (360 / SEGMENTS) * i
    const lon2 = -180 + (360 / SEGMENTS) * (i + 1)
    const a = latLonToVec3(lat, lon1)
    const b = latLonToVec3(lat, lon2)
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))

  const front = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
    color, transparent: true, opacity,
  }))
  front.renderOrder = 1

  const back = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
    color, transparent: true, opacity: opacity * 0.2,
    depthTest: false, depthWrite: false,
  }))
  back.renderOrder = 0

  const group = new THREE.Group()
  group.add(back, front)
  return group
}

// Latitude lines — all controlled by one toggle
const LINES = [
  // Equator
  { lat:   0,    color: 0x4fc3f7, opacity: 0.70 },
  // Tropics (Cancer & Capricorn)
  { lat:  23.5,  color: 0xffb74d, opacity: 0.55 },
  { lat: -23.5,  color: 0xffb74d, opacity: 0.55 },
  // Arctic & Antarctic circles
  { lat:  66.5,  color: 0x90caf9, opacity: 0.45 },
  { lat: -66.5,  color: 0x90caf9, opacity: 0.45 },
]

let _groups = []

export function initLatLines(scene) {
  _groups = LINES.map(({ lat, color, opacity }) => {
    const g = makeLatLine(lat, color, opacity)
    g.visible = false
    scene.add(g)
    return g
  })
}

export function setEquatorVisible(visible) {
  _groups.forEach(g => { g.visible = visible })
}
