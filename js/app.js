import { initScene, startLoop, resetCamera, getCompassAngle } from './globe.js'
import { initTerrain, setSeaLevel, setOpacity } from './terrain.js'
import { initWeather, fetchCloudTiles, setWeatherVisible } from './weather.js'
import { setGravity, setWindDirection } from './particles.js'
import { initControls } from './controls.js'
import { initBorders, setBordersVisible } from './borders.js'
import { initLabels, setLabelsVisible } from './labels.js'

function main() {
  const container = document.getElementById('canvas-container')
  const { scene } = initScene(container)

  initTerrain(scene)
  initWeather(scene)
  initBorders(scene)
  initLabels(scene)

  const needle = document.getElementById('compass-needle')

  initControls({
    onSeaLevel: setSeaLevel,
    onOpacity: setOpacity,
    onWeatherToggle: setWeatherVisible,
    onWeatherRefresh: () => {},
    onGravity: setGravity,
    onWind: setWindDirection,
    onBorders: setBordersVisible,
    onLabels: setLabelsVisible,
    onReset: resetCamera,
  })

  startLoop(() => {
    needle.style.transform = `rotate(${getCompassAngle()}deg)`
  })
}

main()
