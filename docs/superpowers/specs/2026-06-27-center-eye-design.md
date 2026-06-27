# Sentrum Øye — Design Spec
_2026-06-27_

## Oversikt

Ny kamera-modus der kameraet flyttes animert til jordens sentrum (0,0,0). Brukeren ser jordoverflaten innenfra og kan se seg rundt ved å dra med mus/finger. Eksisterende toggles styrer hva som vises. Aktiveres via ny toggle (🔮) i karussellen.

---

## Ny modul: `js/center-eye.js`

Håndterer all logikk for modusen. Eksporterer:

- `initCenterEye(camera, controls, canvas)` — kobler til canvas-events, lagrer refs
- `setCenterEyeActive(active)` — aktiverer/deaktiverer modusen (kalt fra controls.js-toggle)
- `updateCenterEye()` — kalt én gang per frame fra app.js render-loop; driver fly-animasjonen

### Tilstand

| Variabel | Type | Beskrivelse |
|---|---|---|
| `_active` | bool | Er modusen på? |
| `_animating` | bool | Pågår fly-animasjon? |
| `_animT` | float 0–1 | Animasjons-fremgang |
| `_savedCamPos` | Vector3 | Kamera-posisjon før inngang |
| `_savedTarget` | Vector3 | OrbitControls.target før inngang |
| `_phi` | float | Vertikal blikk-vinkel (−π/2 → π/2) |
| `_theta` | float | Horisontal blikk-vinkel (fri) |

### Fly-animasjon

Varighet: 1,5 sekunder. Easing: `smoothstep` (0.5 − 0.5·cos(t·π)).

**Inn:** `_animT` fra 0 → 1. Kameraet lerper fra `_savedCamPos` → `(0,0,0)`. OrbitControls target lerper fra `_savedTarget` → `(0,0,0)`. OrbitControls deaktiveres når `_animT = 1`, look-around aktiveres.

**Ut:** Omvendt — lerper tilbake til `_savedCamPos`/`_savedTarget`, re-aktiverer OrbitControls.

Look-around-handleren deaktiveres under animasjon (hindrer klikk midt i flyturen).

### Look-around (drag)

Pointer drag på canvas-elementet oppdaterer `_phi`/`_theta`:

```
_theta -= dx * 0.005
_phi = clamp(_phi - dy * 0.005, -π/2 + 0.01, π/2 − 0.01)
```

Hvert frame kaller `camera.lookAt(cos(φ)·sin(θ), sin(φ), cos(φ)·cos(θ))` (retningsvektoren skalert til r=1).

Initial blikk-retning ved inngang beregnes fra kameraets posisjon relativt til origo — brukeren ser mot den siden de allerede kikker på.

`setPointerCapture` brukes for å beholde dragging utenfor canvas-kanten.

---

## Terreng/vann: DoubleSide

`terrain.js` eksporterer ny funksjon `setTerrainSide(side)` som setter `.material.side` på både terrain-mesh og water-mesh. `center-eye.js` kaller:

- `setTerrainSide(THREE.DoubleSide)` ved inngang
- `setTerrainSide(THREE.FrontSide)` ved utgang

Bybelysning (`citylights.js`) bruker ShaderMaterial — ikke berørt i denne omgang.

---

## Øvrige endringer

| Fil | Endring |
|---|---|
| `index.html` | Ny toggle-pill `#centereye-toggle` med ikon 🔮, legges til sist i `#toggle-stack` |
| `js/controls.js` | Legg til `onCenterEye` i `initControls`-signaturen |
| `js/app.js` | Import + `initCenterEye(...)`, `updateCenterEye()` i render-loop, `onCenterEye` i controls |
| `js/terrain.js` | Eksporter `setTerrainSide(side)` |

Kompass-reset (`onReset`) deaktiverer sentrum øye (kall `setCenterEyeActive(false)`) og re-nullstiller kamera.

---

## Avgrensninger

- Atmosfære-sprite, aurora og andre sfæriske overlays håndteres ikke automatisk — brukeren styrer dem via toggles
- Bybelysning (ShaderMaterial) rendres ikke korrekt innenfra — utenfor scope
- Ingen endring av himmelkulen (stjerner) — de er allerede synlige innenfra (`depthTest:false`)
