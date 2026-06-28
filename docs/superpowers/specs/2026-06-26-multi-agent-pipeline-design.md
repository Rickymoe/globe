# Multi-Agent Pipeline — Design

**Dato:** 2026-06-26  
**Repo:** Rickymoe/globus (startpunkt, kan utvides)

## Oversikt

Label-drevet pipeline der GitHub issue-labels trigge autonome Claude-agenter. Ingen menneskelig input kreves mellom stegene.

```
@claude-brainstorm → [cloud agent] → @claude-build sub-issues
@claude-build      → [lokal loop]  → @claude-verify
@claude-verify     → [lokal loop]  → lukket issue (eller bug-label)
```

## Arkitektur: Hybrid

| Komponent | Kjøremiljø | Trigger |
|-----------|-----------|---------|
| Brainstorm-agent | Anthropic cloud (`/schedule`) | Cron, hvert 10. min |
| Build + verify-loop | Lokal maskin (`/loop`) | Aktiv session, ~120s intervall |

Cloud-agenten orkestrerer og lager sub-issues. Lokal loop gjør kodearbeidet mot lokalt repo.

## Label-protokoll

| Label | Satt av | Fjernet av |
|-------|---------|-----------|
| `@claude-brainstorm` | Menneske | Cloud-agent (etter sub-issues er opprettet) |
| `@claude-build` | Cloud-agent | Lokal loop (etter commit + push) |
| `@claude-verify` | Lokal loop | Lokal loop (ved lukking eller bug) |

## Cloud-agent: `@claude-brainstorm`

Kjøres via `/schedule` med selvforsynt prompt. Starter cold ved hvert kjøring.

**Flyt per issue:**
1. `gh issue list --repo <repo> --label "@claude-brainstorm"` — finn kandidater
2. `gh api repos/<repo>/contents/` — les filstruktur og relevante filer
3. Skriv spec til `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` via `gh api` (PUT)
4. Dekomponér i fokuserte sub-issues: `gh issue create --label "@claude-build" --body "Ref spec: <path>\n\n<konkret oppgave>"`
5. Kommenter på original issue med lenke til spec og sub-issues
6. `gh issue edit <nr> --remove-label "@claude-brainstorm"` — fjern label før neste issue

**Rekkefølge-garanti:** Issues behandles sekvensielt. Label fjernes før neste plukkes opp — unngår dobbeltbehandling.

**Scope:** Starter med `Rickymoe/globus`. Utvides ved å legge til repos i prompt-konfigurasjon.

## Lokal loop: `@claude-build`

Kjøres i aktiv Claude Code-session via `/loop`.

**Flyt per issue:**
1. Les issue-body — hent spec-referanse og oppgavebeskrivelse
2. Les relevante filer i `/home/ricky/Dokumenter/Koding/globus/`
3. Implementer endringen
4. `git add <filer> && git commit && git push` til main
5. `gh issue edit <nr> --remove-label "@claude-build" --add-label "@claude-verify"`
6. Kommenter på issue med commit-hash

## Lokal loop: `@claude-verify`

Samme loop som build, sjekkes etter build i prioritert rekkefølge.

**Flyt per issue:**
1. `git pull` — hent siste endringer
2. Åpne appen i browser / kjør relevante sjekker
3. **Bestått:** `gh issue close <nr>` med kommentar om hva som ble verifisert
4. **Feilet:** fjern `@claude-verify`, sett `bug`-label + kommentar med feilbeskrivelse

## Feilhåndtering

- Issue med `bug`-label stoppes fra automatisk behandling — krever manuell vurdering
- Cloud-agent som feiler midt i en brainstorm lar `@claude-brainstorm`-label stå — plukkes opp ved neste kjøring
- Lokal loop som feiler midt i build lar `@claude-build`-label stå — plukkes opp ved neste iterasjon

## Utvidelse

- Flere repos: legg til i cloud-agentens prompt-konfigurasjon
- Parallell build: start to lokale loops i separate terminaler
- GitHub Actions webhook: erstatter polling med øyeblikkelig trigger (fremtidig forbedring)
