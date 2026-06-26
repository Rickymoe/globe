import * as THREE from 'three'

let _mesh = null
let _elapsed = 0

const vertexShader = `
varying vec3 vWorldPos;
void main() {
  vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = `
uniform float uTime;
varying vec3 vWorldPos;

void main() {
  vec3 n = normalize(vWorldPos);
  float lat = asin(clamp(n.y, -1.0, 1.0));
  float lon = atan(n.z, n.x);
  float absLat = abs(lat);

  // Auroral oval: 62-78 degrees
  float aMin = 1.082;
  float aMax = 1.361;
  float inZone = smoothstep(aMin, aMin + 0.12, absLat) *
                 smoothstep(aMax + 0.12, aMax, absLat);

  if (inZone < 0.001) discard;

  // Layered wave animation
  float w1 = sin(lon * 7.0 + uTime * 0.7 + lat * 14.0);
  float w2 = sin(lon * 4.0 - uTime * 0.4 + lat * 9.0 + 1.8);
  float w3 = sin(lon * 11.0 + uTime * 1.1 - lat * 6.0 + 3.5);
  float intensity = (w1 * 0.5 + w2 * 0.3 + w3 * 0.2) * 0.5 + 0.5;
  intensity = pow(intensity, 1.5);

  // Color: green <-> cyan with purple hints
  float colorPhase = sin(uTime * 0.25 + lon * 2.5) * 0.5 + 0.5;
  vec3 green  = vec3(0.0, 1.0, 0.35);
  vec3 cyan   = vec3(0.15, 0.85, 1.0);
  vec3 purple = vec3(0.7, 0.2, 1.0);
  vec3 col = mix(green, cyan, colorPhase);
  col = mix(col, purple, smoothstep(0.7, 1.0, colorPhase));

  float alpha = inZone * intensity * 0.55;
  gl_FragColor = vec4(col, alpha);
}
`

export function initAurora(scene) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  })
  _mesh = new THREE.Mesh(new THREE.SphereGeometry(101, 64, 64), mat)
  _mesh.visible = false
  _mesh.renderOrder = 2
  scene.add(_mesh)
}

export function updateAurora(delta) {
  if (_mesh && _mesh.visible) {
    _elapsed += delta
    _mesh.material.uniforms.uTime.value = _elapsed
  }
}

export function setAuroraVisible(visible) {
  if (_mesh) _mesh.visible = visible
}
