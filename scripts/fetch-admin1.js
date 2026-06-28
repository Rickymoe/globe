// Fetches Natural Earth 50m admin-1 (states/provinces) GeoJSON,
// converts to compact TopoJSON, and writes data/admin1.json.
// Run via GitHub Actions (needs: npm install topojson-server topojson-simplify)

import { writeFileSync } from 'fs'
import { topology }      from 'topojson-server'
import { presimplify, simplify } from 'topojson-simplify'

const URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/' +
  'ne_50m_admin_1_states_provinces.geojson'

console.log('Fetching Natural Earth admin-1 50m …')
const geojson = await fetch(URL).then(r => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
})
console.log(`  ${geojson.features.length} features received`)

// Strip all properties except the ones we need for debugging / future filtering
const slim = {
  type: 'FeatureCollection',
  features: geojson.features
    .filter(f => f.geometry)
    .map(f => ({
      type: 'Feature',
      properties: {
        adm0_a3: f.properties.adm0_a3,   // ISO 3166-1 alpha-3 country code
        name:    f.properties.name,        // subdivision name
      },
      geometry: f.geometry,
    })),
}

// Convert to TopoJSON (deduplicates shared arcs → much smaller file)
let topo = topology({ admin1: slim })

// Presimplify computes per-vertex weights, then simplify removes low-weight points
topo = presimplify(topo)
topo = simplify(topo, 0.0005)  // lower = more aggressive simplification

const json = JSON.stringify(topo)
writeFileSync('data/admin1.json', json)

const mb = (json.length / 1024 / 1024).toFixed(2)
console.log(`Written data/admin1.json  (${mb} MB)`)
console.log(`Updated: ${new Date().toISOString().slice(0, 10)}`)
