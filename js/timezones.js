import * as THREE from 'three'

let _mesh = null
let _lines = null
let _group = null
let _visible = false

const R = 101.5
const LAT_MAX = 87 * Math.PI / 180

const vertexShader = `
varying vec3 vWorldPos;
void main() {
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = `
varying vec3 vWorldPos;

vec3 hsl2rgb(float h, float s, float l) {
  float c = (1.0 - abs(2.0 * l - 1.0)) * s;
  float h6 = h * 6.0;
  float x = c * (1.0 - abs(mod(h6, 2.0) - 1.0));
  float m = l - c * 0.5;
  vec3 rgb;
  if (h6 < 1.0)      rgb = vec3(c, x, 0.0);
  else if (h6 < 2.0) rgb = vec3(x, c, 0.0);
  else if (h6 < 3.0) rgb = vec3(0.0, c, x);
  else if (h6 < 4.0) rgb = vec3(0.0, x, c);
  else if (h6 < 5.0) rgb = vec3(x, 0.0, c);
  else               rgb = vec3(c, 0.0, x);
  return rgb + m;
}

void main() {
  vec3 n = normalize(vWorldPos);
  float lat = asin(clamp(n.y, -1.0, 1.0));
  if (abs(lat) > 1.5184) discard;
  float lon = atan(n.z, n.x);
  float zone = floor(lon / (3.14159265 / 12.0) + 0.5);
  zone = clamp(zone, -12.0, 11.0);
  float t = (zone + 12.0) / 24.0;
  vec3 col = hsl2rgb(t, 0.75, 0.5);
  gl_FragColor = vec4(col, 0.3);
}
`

function buildBands(scene) {
  const mat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: THREE.FrontSide,
  })
  _mesh = new THREE.Mesh(new THREE.SphereGeometry(100.5, 72, 36), mat)
  _mesh.renderOrder = 1
  _mesh.visible = _visible
  scene.add(_mesh)
}

function buildLines(scene) {
  const positions = []

  // 24 meridian-linjer (soneoverganger)
  for (let n = 0; n < 24; n++) {
    const lon = (n * 15 - 172.5) * Math.PI / 180
    for (let j = 0; j < 30; j++) {
      const lat0 = -LAT_MAX + (j / 30) * 2 * LAT_MAX
      const lat1 = -LAT_MAX + ((j + 1) / 30) * 2 * LAT_MAX
      positions.push(
        R * Math.cos(lat0) * Math.cos(lon), R * Math.sin(lat0), R * Math.cos(lat0) * Math.sin(lon),
        R * Math.cos(lat1) * Math.cos(lon), R * Math.sin(lat1), R * Math.cos(lat1) * Math.sin(lon)
      )
    }
  }

  // Polarsirkler ved ±87°
  for (const s of [-1, 1]) {
    const lat = s * LAT_MAX
    for (let i = 0; i < 72; i++) {
      const lon0 = (i / 72) * 2 * Math.PI
      const lon1 = ((i + 1) / 72) * 2 * Math.PI
      positions.push(
        R * Math.cos(lat) * Math.cos(lon0), R * Math.sin(lat), R * Math.cos(lat) * Math.sin(lon0),
        R * Math.cos(lat) * Math.cos(lon1), R * Math.sin(lat), R * Math.cos(lat) * Math.sin(lon1)
      )
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  const mat = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
    depthTest: true,
  })
  _lines = new THREE.LineSegments(geo, mat)
  _lines.renderOrder = 3
  _lines.visible = _visible
  scene.add(_lines)
}

function makeSprite(text) {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 40
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillRect(0, 0, 128, 40)
  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 16px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 64, 20)
  const mat = new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(canvas),
    transparent: true,
    depthTest: false,
  })
  return new THREE.Sprite(mat)
}

function buildLabels(scene) {
  _group = new THREE.Group()
  const lat = 20 * Math.PI / 180
  const r = 104

  for (let n = -12; n <= 11; n++) {
    const lon = n * 15 * Math.PI / 180
    const sprite = makeSprite(n >= 0 ? `UTC+${n}` : `UTC${n}`)
    sprite.position.set(
      r * Math.cos(lat) * Math.cos(lon),
      r * Math.sin(lat),
      r * Math.cos(lat) * Math.sin(lon)
    )
    sprite.scale.set(9, 2.8, 1)
    _group.add(sprite)
  }

  _group.visible = _visible
  scene.add(_group)
}

export function initTimezones(scene) {
  buildBands(scene)
  buildLines(scene)
  buildLabels(scene)
}

export function setTimezonesVisible(v) {
  _visible = v
  if (_mesh)  _mesh.visible  = v
  if (_lines) _lines.visible = v
  if (_group) _group.visible = v
}
