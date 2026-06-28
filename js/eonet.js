import * as THREE from 'three'

const R = 101.8
const PERIOD = 3.5

const CATEGORY_STYLE = {
  wildfires:       { color: 0xff4400, scale: 2.0, icon: '🔥' },
  volcanoes:       { color: 0xff1111, scale: 2.5, icon: '🌋' },
  severeStorms:    { color: 0x5566ff, scale: 3.0, icon: '⛈️' },
  floods:          { color: 0x0099ff, scale: 2.0, icon: '💧' },
  seaLakeIce:      { color: 0xaaddff, scale: 1.5, icon: '🧊' },
  dustHaze:        { color: 0xccaa44, scale: 1.5, icon: '🌫️' },
  landslides:      { color: 0xaa7733, scale: 1.5, icon: '⛰️' },
  earthquakes:     { color: 0xffee00, scale: 2.0, icon: '🌊' },
  manMade:         { color: 0xff66ff, scale: 1.5, icon: '⚠️' },
  _default:        { color: 0xffffff, scale: 1.5, icon: '●' },
}

function latLonToVec3(lat, lon) {
  const phi   = (90 - lat) * Math.PI / 180
  const theta = (lon + 180) * Math.PI / 180
  return new THREE.Vector3(
    -R * Math.cos(theta) * Math.sin(phi),
     R * Math.cos(phi),
     R * Math.sin(theta) * Math.sin(phi),
  )
}

let _group = null
let _rings = []
let _elapsed = 0
let _visible = false
let _eventData = []
let _tooltip = null
let _camera = null
let _canvas = null

function createTooltip() {
  const el = document.createElement('div')
  el.style.cssText = [
    'position:absolute',
    'background:rgba(0,0,0,0.78)',
    'color:#fff',
    'padding:6px 12px',
    'border-radius:8px',
    'font-size:13px',
    'pointer-events:none',
    'white-space:nowrap',
    'display:none',
    'font-family:system-ui,sans-serif',
    'border:1px solid rgba(255,255,255,0.2)',
    'line-height:1.5',
  ].join(';')
  document.getElementById('canvas-container').appendChild(el)
  return el
}

function onPointerMove(e) {
  if (!_group?.visible || !_camera) { _tooltip.style.display = 'none'; return }

  const rect = _canvas.getBoundingClientRect()
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top

  const camDir = _camera.position.clone().normalize()
  const proj = new THREE.Vector3()
  let bestDist = 22
  let bestEv = null

  for (const ev of _eventData) {
    const norm = ev.pos.clone().normalize()
    if (norm.dot(camDir) < 0.1) continue
    proj.copy(ev.pos).project(_camera)
    const sx = (proj.x * 0.5 + 0.5) * rect.width
    const sy = (-proj.y * 0.5 + 0.5) * rect.height
    const d = Math.hypot(sx - mx, sy - my)
    if (d < bestDist) { bestDist = d; bestEv = ev }
  }

  if (bestEv) {
    _tooltip.innerHTML =
      `<strong>${bestEv.icon} ${bestEv.title}</strong><br>` +
      `<span style="opacity:0.75;font-size:11px">${bestEv.category} · ${bestEv.date}</span>`
    _tooltip.style.display = 'block'
    const tipW = _tooltip.offsetWidth
    const tipH = _tooltip.offsetHeight
    _tooltip.style.left = Math.min(mx + 16, rect.width - tipW - 8) + 'px'
    _tooltip.style.top  = Math.max(my - tipH - 8, 4) + 'px'
  } else {
    _tooltip.style.display = 'none'
  }
}

export async function initEonet(scene, camera, canvas) {
  _camera = camera
  _canvas = canvas
  _group = new THREE.Group()
  _group.visible = _visible
  scene.add(_group)

  _tooltip = createTooltip()
  canvas.addEventListener('pointermove', onPointerMove)

  let data
  try {
    const res = await fetch('https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=200')
    data = await res.json()
  } catch {
    return
  }

  for (const event of data.events ?? []) {
    const geoms = event.geometry ?? []
    if (!geoms.length) continue
    const latest = geoms[geoms.length - 1]
    if (latest.type !== 'Point') continue
    const [lon, lat] = latest.coordinates

    const catId = event.categories?.[0]?.id ?? '_default'
    const catTitle = event.categories?.[0]?.title ?? 'Ukjent'
    const style = CATEGORY_STYLE[catId] ?? CATEGORY_STYLE._default

    const rawDate = latest.date?.slice(0, 10) ?? ''
    const pos = latLonToVec3(lat, lon)
    const normal = pos.clone().normalize()

    const geo = new THREE.RingGeometry(0.6, 1.0, 32)
    const mat = new THREE.MeshBasicMaterial({
      color: style.color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.copy(pos)
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)

    _group.add(mesh)
    _rings.push({ mesh, maxScale: style.scale, phase: Math.random() })
    _eventData.push({
      pos,
      title: event.title,
      category: catTitle,
      date: rawDate,
      icon: style.icon,
    })
  }
}

export function setEonetVisible(v) {
  _visible = v
  if (_group) _group.visible = v
  if (!v && _tooltip) _tooltip.style.display = 'none'
}

export function updateEonet(delta) {
  if (!_group?.visible) return
  _elapsed += delta
  for (const { mesh, maxScale, phase } of _rings) {
    const t = ((_elapsed / PERIOD) + phase) % 1
    mesh.scale.setScalar(t * maxScale)
    mesh.material.opacity = 1 - t
  }
}
