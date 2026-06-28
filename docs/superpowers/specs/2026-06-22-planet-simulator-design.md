# Planet Simulator — Design Spec
_2026-06-22_

## Oversikt

Interaktiv 3D-jordklode i nettleseren. Brukeren kan rotere globusen, justere havnivå, gravitasjon og vindretning, og se ekte skydata som tekstur-overlay. Ren frontend — ingen backend, ingen build-steg, kjører direkte som HTML-fil.

## Tech-stack

- **Three.js r165** (CDN) — 3D-motor, geometri, teksturer, lys
- **OrbitControls** (Three.js addon) — dra for rotasjon, scroll for zoom
- **OpenWeatherMap Tiles API** — skylag (og later: nedbør, vind, temperatur)
- Ren HTML/CSS/JS, ingen bundler, GitHub Pages-klar

## Filstruktur

```
globus/
├── index.html
├── css/
│   └── style.css
└── js/
    ├── globe.js       — Three.js setup, renderer, kamera, lys, OrbitControls
    ├── terrain.js     — terrengkule (NASA tekstur + heightmap), vannkule
    ├── weather.js     — OpenWeatherMap tile-henting, canvas-tekstur, overlay-kule
    ├── particles.js   — partikkel-system styrt av gravitasjon + vindretning
    └── controls.js    — høyre-panel UI, sliders, toggles, event-binding
```

## Globe-rendering

### Terrengkule
`THREE.SphereGeometry(100, 256, 256)` — høy segmentoppløsning for jevn displacement.

Material: `THREE.MeshStandardMaterial` med:
- `map`: NASA Blue Marble dag-tekstur (2048×1024 JPG, fra `visibleearth.nasa.gov`)
- `displacementMap`: NASA SRTM heightmap (grayscale, samme kilde)
- `displacementScale`: 3.0 (justerbar konstant — eksaggererer terreng for synlig effekt)
- `transparent: true`, `opacity: 1.0` (endres av toggle)

### Vannkule
`THREE.SphereGeometry(101, 64, 64)` — separat kule, alltid litt større enn terreng.

Material: `THREE.MeshPhongMaterial`, farge `#1565c0`, `transparent: true`, `opacity: 0.75`.

Havnivå-slider endrer `waterSphere.scale.setScalar(value)` der `value` går fra `0.985` (lav, havbunn synlig) til `1.015` (høy, kystlinjer oversvømt).

### Overlay-kule (vær)
`THREE.SphereGeometry(102, 64, 64)` — aller ytterste lag.

Material: `THREE.MeshBasicMaterial` med canvas-tekstur (se Weather-seksjon), `transparent: true`, `opacity: 0.6`, `depthWrite: false`.

## Weather — OpenWeatherMap Tiles

OpenWeatherMap leverer kart-tiles i XYZ-format (samme som Google Maps / OpenStreetMap):
```
https://tile.openweathermap.org/map/{layer}/{z}/{x}/{y}.png?appid={API_KEY}
```

**Lag som implementeres (i rekkefølge):**
1. `clouds_new` — skydekke (grå/hvit, opacity basert på tetthet)
2. `precipitation_new` — nedbør
3. `wind_new` — vindvisualsiering
4. `temp_new` — temperatur-heatmap

### Tile → sfærisk tekstur

Zoom-nivå 2 gir 16 tiles (4×4 grid) som til sammen dekker hele jordkloden som en Mercator-projeksjon. Prosedyre:

1. Hent alle 16 tiles for zoom=2 (asynkront, parallelt)
2. Tegn dem på et `<canvas>` element (1024×1024 px, 256px per tile)
3. Bruk canvas som `THREE.CanvasTexture` på overlay-kulen
4. Oppdater teksturen med `texture.needsUpdate = true`

Tiles hentes ved oppstart og kan refreshes manuelt (knapp i panel) eller på interval (hvert 10. min).

API-nøkkel lagres som konstant øverst i `weather.js`. Gratis tier: 60 kall/min — zoom=2 bruker 16 kall per refresh, godt innenfor.

## Kontroll-panel (høyre side)

Fast sidebar, bredde 220px, mørk bakgrunn (`#161b22`). Globusen fyller resten av skjermen.

| Kontroll | Type | Teknisk effekt |
|---|---|---|
| 🌊 Havnivå | Slider 0–100 | `waterSphere.scale` |
| 🌍 Gravitasjon | Slider 0–100 | Partikkel-fallhastighet |
| 💨 Vindretning | Kompass-hjul (drag) | Partikkel-bevegelsesvinkel |
| 👁 Gjennomsiktig | Toggle | `terrainMesh.material.opacity` |
| ☁️ Skylag | Toggle | Overlay-kulens synlighet |
| 🔄 Oppdater vær | Knapp | Re-henter OWM tiles |

## Partikkel-system

~500 partikler som flyr lavt over globus-overflaten. Implementert som `THREE.Points` med `THREE.BufferGeometry`.

Hver partikkel har posisjon i sfæriske koordinater (θ, φ). Per frame:
- Beveger seg i vindretning med hastighet proporsjonalt til vindstyrke-konstanten
- Faller mot overflaten med akselerasjon `g * dt²` (gravitasjon-slider → `g`)
- Wrapper rundt globusen (passerer 360° → 0°)

Partiklene visualiserer gravitasjon og vind som kombinert effekt — lav gravitasjon = partikler svever høyere og beveger seg tregere mot overflaten.

## Lys

- `THREE.AmbientLight(0xffffff, 0.3)` — basisbelysning
- `THREE.DirectionalLight(0xffffff, 1.2)` — sol-effekt fra fast posisjon (simulerer dag/natt-grense)

## Kamera

`THREE.PerspectiveCamera(45°, aspect, 0.1, 1000)`. Starposisjon: `z = 250`.

OrbitControls med `enableDamping: true` for jevn, naturlig rotasjon.

## Fase-plan

**Fase 1 (MVP):** Terrengkule + vannkule + rotasjon + havnivå-slider + gjennomsiktig-toggle

**Fase 2:** OpenWeatherMap skylag (clouds_new tiles → canvas-tekstur)

**Fase 3:** Partikkel-system med gravitasjon og vindretning

**Fase 4:** Resterende OWM-lag (nedbør, vind, temperatur) som separate toggles

## Åpne spørsmål

- OWM API-nøkkel: brukeren må opprette gratis konto på openweathermap.org og legge inn nøkkel i `weather.js`
- NASA-teksturer lastes fra ekstern URL — CORS-headers på visibleearth.nasa.gov er OK for nettleser-fetch
- Heightmap-eksaggerering (displacementScale) trengs for synlig effekt — reell skala ville gjort fjell usynlige
