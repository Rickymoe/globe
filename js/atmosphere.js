import * as THREE from 'three'

const _uniforms = {
  uSunDir:   { value: new THREE.Vector3(1, 0, 0) },
  uSunOn:    { value: 0.0 },
  uDistFade: { value: 0.0 },
}

const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;
  void main() {
    vNormal    = normalize(normalMatrix * normal);
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewDir   = normalize(-mvPos.xyz);
    vWorldPos  = position;
    gl_Position = projectionMatrix * mvPos;
  }
`

const fragmentShader = `
  uniform vec3  uSunDir;
  uniform float uSunOn;
  uniform float uDistFade;
  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying vec3 vWorldPos;
  void main() {
    float rim = 1.0 - abs(dot(vNormal, vViewDir));
    float lit;
    if (uSunOn > 0.5) {
      float sunDot = dot(normalize(vWorldPos), uSunDir);
      lit = smoothstep(-0.15, 0.45, sunDot);
    } else {
      lit = 0.35;
    }
    float glow = pow(rim, 7.0) * lit * uDistFade;
    gl_FragColor = vec4(0.55, 0.80, 1.0, glow * 0.55);
  }
`

let _mesh = null
let _forceHidden = false

export function initAtmosphere(scene) {
  const mat = new THREE.ShaderMaterial({
    uniforms: _uniforms,
    vertexShader,
    fragmentShader,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  _mesh = new THREE.Mesh(new THREE.SphereGeometry(106, 64, 64), mat)
  scene.add(_mesh)
}

export function updateAtmosphere(sunPos, camDist) {
  _uniforms.uSunDir.value.copy(sunPos).normalize()
  const fade = Math.max(0, 1 - (camDist - 120) / 80)
  _uniforms.uDistFade.value = fade
  if (_mesh && !_forceHidden) _mesh.visible = fade > 0
}

export function setSunOnAtmosphere(on) {
  _uniforms.uSunOn.value = on ? 1.0 : 0.0
}

export function setAtmosphereVisible(v) {
  _forceHidden = !v
  if (_mesh) _mesh.visible = v
}
