import * as THREE from 'three'

const BASE = 'https://threejs.org/examples/textures/planets/'

let _terrainMesh, _waterMesh, _wireMesh

export function initTerrain(scene) {
  const loader = new THREE.TextureLoader()

  const colorMap  = loader.load(BASE + 'earth_atmos_2048.jpg')
  const normalMap = loader.load(BASE + 'earth_normal_2048.jpg')

  const terrainGeo = new THREE.SphereGeometry(100, 64, 64)
  const terrainMat = new THREE.MeshStandardMaterial({
    map: colorMap,
    normalMap,
    roughness: 0.8,
    metalness: 0.1,
    transparent: true,
    opacity: 1.0,
  })
  _terrainMesh = new THREE.Mesh(terrainGeo, terrainMat)
  scene.add(_terrainMesh)

  const wireGeo = new THREE.SphereGeometry(100.5, 36, 36)
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0x44aaff,
    wireframe: true,
    transparent: true,
    opacity: 0.18,
  })
  _wireMesh = new THREE.Mesh(wireGeo, wireMat)
  _wireMesh.visible = false
  scene.add(_wireMesh)

  const waterGeo = new THREE.SphereGeometry(101, 64, 64)
  const waterMat = new THREE.MeshPhongMaterial({
    color: 0x1a6eb5,
    transparent: true,
    opacity: 0.15,
    shininess: 120,
  })
  _waterMesh = new THREE.Mesh(waterGeo, waterMat)
  scene.add(_waterMesh)
}

export function setSeaLevel(value) {
  if (!_waterMesh) return
  const scale = 0.985 + (value / 100) * 0.03
  _waterMesh.scale.setScalar(scale)
}

export function setOpacity(transparent) {
  if (!_terrainMesh) return
  _terrainMesh.material.opacity = transparent ? 0.45 : 1.0
  _wireMesh.visible = transparent
}
