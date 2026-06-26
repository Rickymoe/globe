# US States Green Overlay — Design

**Dato:** 2026-06-26
**Issue:** Rickymoe/globus#1

## Hva som bygges

Vise alle 50 amerikanske staters grenser som grønne linjer på 3D-globusen. Alltid synlig, ingen toggle.

## Teknisk tilnærming

Følger samme mønster som `js/borders.js`:
- Henter US states TopoJSON fra CDN: `https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json`
- Bruker `topojson-client` `mesh()` på `us.objects.states`
- Renderer som `THREE.LineSegments` med grønn farge på radius 101.5 (over vann-sfæren)
- Ingen toggle — alltid synlig

## Filer

| Fil | Endring |
|-----|---------|
| `js/us-states.js` | Ny fil — henter TopoJSON, bygger LineSegments, eksporterer `initUsStates` |
| `js/app.js` | Legg til `import { initUsStates } from './us-states.js'` og kall `initUsStates(scene)` |

## Build-oppgaver

1. **Lag js/us-states.js** — modul som henter US states TopoJSON og tegner grønne linjer på globusen
2. **Koble til i app.js** — importer og kall initUsStates(scene) ved oppstart
