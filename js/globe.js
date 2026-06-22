// Returns { scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer }
export function initScene(container) { return { scene: undefined, camera: undefined, renderer: undefined } }

// onFrame(deltaSeconds: number) — called each animation frame
export function startLoop(onFrame) {}
