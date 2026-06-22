import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

let _scene, _camera, _renderer, _controls, _clock
let _resetting = false
const DEFAULT_CAM = new THREE.Vector3(0, 0, 250)

export function initScene(container) {
  _scene = new THREE.Scene()
  _clock = new THREE.Clock()

  const w = container.clientWidth || window.innerWidth
  const h = container.clientHeight || window.innerHeight
  _camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 1000)
  _camera.position.z = 250

  _addStars(_scene)

  _renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  _renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  _renderer.setSize(w, h)
  container.appendChild(_renderer.domElement)

  _controls = new OrbitControls(_camera, _renderer.domElement)
  _controls.enableDamping = true
  _controls.dampingFactor = 0.05
  _controls.minDistance = 120
  _controls.maxDistance = 500

  const ambient = new THREE.AmbientLight(0xffffff, 0.3)
  _scene.add(ambient)

  const sun = new THREE.DirectionalLight(0xffffff, 1.2)
  sun.position.set(5, 3, 5)
  _scene.add(sun)

  window.addEventListener('resize', () => {
    const rw = container.clientWidth || window.innerWidth
    const rh = container.clientHeight || window.innerHeight
    _camera.aspect = rw / rh
    _camera.updateProjectionMatrix()
    _renderer.setSize(rw, rh)
  })

  return { scene: _scene }
}

export function resetCamera() {
  _resetting = true
}

export function getCompassAngle() {
  if (!_camera) return 0
  const right = new THREE.Vector3()
  const up = new THREE.Vector3()
  _camera.matrixWorld.extractBasis(right, up, new THREE.Vector3())
  const north = new THREE.Vector3(0, 1, 0)
  return Math.atan2(north.dot(right), north.dot(up)) * (180 / Math.PI)
}

function _addStars(scene) {
  const positions = new Float32Array(3000 * 3)
  for (let i = 0; i < positions.length; i += 3) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = 600 + Math.random() * 200
    positions[i]     = r * Math.sin(phi) * Math.cos(theta)
    positions[i + 1] = r * Math.sin(phi) * Math.sin(theta)
    positions[i + 2] = r * Math.cos(phi)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const stars = new THREE.Points(geo, new THREE.PointsMaterial({
    color: 0xffffff, size: 0.7, sizeAttenuation: true,
  }))
  scene.add(stars)
}

export function startLoop(onFrame) {
  if (!_clock) throw new Error('initScene must be called before startLoop')
  let rafId
  function animate() {
    rafId = requestAnimationFrame(animate)
    const delta = _clock.getDelta()
    if (_resetting) {
      _camera.position.lerp(DEFAULT_CAM, 0.08)
      if (_camera.position.distanceTo(DEFAULT_CAM) < 0.5) {
        _camera.position.copy(DEFAULT_CAM)
        _resetting = false
      }
    }
    _controls.update()
    onFrame(delta)
    _renderer.render(_scene, _camera)
  }
  animate()
  return () => cancelAnimationFrame(rafId)
}
