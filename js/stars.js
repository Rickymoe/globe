import * as THREE from 'three'

function starLayer(count, radius, size, opacity) {
  const pos = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const theta = 2 * Math.PI * Math.random()
    const phi   = Math.acos(2 * Math.random() - 1)
    pos[i*3]   = radius * Math.sin(phi) * Math.cos(theta)
    pos[i*3+1] = radius * Math.sin(phi) * Math.sin(theta)
    pos[i*3+2] = radius * Math.cos(phi)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xffffff,
    size,
    sizeAttenuation: true,
    transparent: true,
    opacity,
    depthTest: false,
    depthWrite: false,
  }))
  points.renderOrder = -10
  return points
}

export function initStars(scene) {
  scene.add(starLayer(1800, 90000, 1.2, 0.55))
  scene.add(starLayer( 600, 87000, 1.9, 0.80))
  scene.add(starLayer( 120, 85000, 2.8, 1.00))
}
