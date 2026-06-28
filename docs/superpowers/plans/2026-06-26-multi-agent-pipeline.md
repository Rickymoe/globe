# Multi-Agent Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sett opp en label-drevet multi-agent pipeline der GitHub issue-labels trigge autonome Claude-agenter for brainstorm, build og verify.

**Architecture:** Hybrid — cloud-agent (`/schedule`) orkestrerer `@claude-brainstorm`-issues og lager sub-issues med `@claude-build`. Lokal loop (`/loop`) håndterer `@claude-build` og `@claude-verify` mot lokalt repo.

**Tech Stack:** Claude Code CLI (`/schedule`, `/loop`), GitHub CLI (`gh`), git

## Global Constraints

- Repos som watches: `Rickymoe/globus` (kan utvides)
- Lokalt repo-path: `/home/ricky/Dokumenter/Koding/globus`
- Cloud-agent kjøres cold — ingen tilgang til lokal filsystem
- Spec-filer lagres i `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
- Aldri commit med `--no-verify`

---

## Task 1: Cloud brainstorm-agent

**Files:**
- Create: `docs/agents/brainstorm-prompt.md` — agentens selvstendige prompt
- Schedule: via `/schedule` i Claude Code

**Interfaces:**
- Konsumerer: GitHub issues med `@claude-brainstorm` label på `Rickymoe/globus`
- Produserer: sub-issues med `@claude-build` label + spec-fil committet via gh api

- [ ] **Steg 1: Opprett prompt-fil**

Opprett `docs/agents/brainstorm-prompt.md` med følgende innhold:

```markdown
Du er en autonom brainstorm-agent i en multi-agent pipeline.

## Repos å overvåke
- Rickymoe/globus

## Jobb per kjøring

For hvert repo, kjør:
```
gh issue list --repo <repo> --label "@claude-brainstorm" --json number,title,body,labels
```

For hvert issue funnet, gjør dette i rekkefølge:

### 1. Forstå kodebasen
Les filstrukturen:
```
gh api repos/<repo>/contents/
gh api repos/<repo>/contents/js
gh api repos/<repo>/contents/css
```
Les relevante kildefiler via:
```
gh api repos/<repo>/contents/<filepath> --jq '.content' | base64 -d
```

### 2. Skriv spec
Lag en konsis spec med:
- Hva som skal bygges
- Hvilke filer som påvirkes
- Teknisk tilnærming
- Dekomponert i fokuserte build-oppgaver

Commit spec-filen til repoet:
```
CONTENT=$(base64 -w0 <<'SPEC'
<spec-innhold her>
SPEC
)
gh api repos/<repo>/contents/docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md \
  --method PUT \
  --field message="docs: add spec for <topic>" \
  --field content="$CONTENT"
```

### 3. Lag sub-issues
Én issue per fokusert build-oppgave. Bodyen skal inneholde:
- Referanse til spec: `Spec: docs/superpowers/specs/<fil>`
- Konkret oppgavebeskrivelse
- Relevante filer å endre

```
gh issue create --repo <repo> \
  --title "<konkret oppgave>" \
  --label "@claude-build" \
  --body "Spec: docs/superpowers/specs/<fil>\n\n<oppgavebeskrivelse>\n\nFiler: <relevante filer>"
```

### 4. Kommenter og rydd
Kommenter på original issue med lenke til spec og sub-issues:
```
gh issue comment <nr> --repo <repo> \
  --body "Brainstorm ferdig.\n\nSpec: docs/superpowers/specs/<fil>\n\nSub-issues: #<nr1>, #<nr2>"
```

Fjern `@claude-brainstorm`-label:
```
gh issue edit <nr> --repo <repo> --remove-label "@claude-brainstorm"
```

### 5. Neste issue
Behandle neste issue i listen. Stopp når listen er tom.
```

- [ ] **Steg 2: Verifiser at prompt-filen er lesbar**

```bash
cat /home/ricky/Dokumenter/Koding/globus/docs/agents/brainstorm-prompt.md
```
Forventet: hele prompt-teksten uten feil

- [ ] **Steg 3: Commit prompt-filen**

```bash
cd /home/ricky/Dokumenter/Koding/globus
git add docs/agents/brainstorm-prompt.md
git commit -m "feat: add cloud brainstorm agent prompt"
git push
```

- [ ] **Steg 4: Sett opp cloud schedule**

I Claude Code, kjør:
```
/schedule
```
Når du blir spurt om prompt, lim inn innholdet fra `docs/agents/brainstorm-prompt.md`.
Sett intervall: hvert 10. minutt (`*/10 * * * *`).

- [ ] **Steg 5: Bekreft at schedule er opprettet**

```bash
# Claude Code viser job-ID etter /schedule. Noter det her.
# Eksempel output: "Scheduled: job_abc123, every 10 minutes"
```
Forventet: job-ID synlig i output

---

## Task 2: Lokal build+verify loop

**Files:**
- Create: `docs/agents/loop-prompt.md` — lokal loops selvstendige prompt

**Interfaces:**
- Konsumerer: GitHub issues med `@claude-build` eller `@claude-verify` på `Rickymoe/globus`
- Produserer: commits til main, label-bytter, lukkede issues

- [ ] **Steg 1: Opprett loop prompt-fil**

Opprett `docs/agents/loop-prompt.md` med følgende innhold:

```markdown
Du er en autonom build+verify-agent. Jobb lokalt i /home/ricky/Dokumenter/Koding/globus.

## Hvert polling-kall

### 1. Sjekk @claude-build (prioritet 1)
```
gh issue list --repo Rickymoe/globus --label "@claude-build" --json number,title,body
```

For hvert issue:
1. Les issue-body: finn spec-referanse og oppgavebeskrivelse
2. Les relevante filer lokalt
3. Implementer endringen
4. Commit og push:
   ```
   git add <filer>
   git commit -m "feat: <beskrivelse> (closes #<nr>)"
   git push
   ```
5. Oppdater issue:
   ```
   gh issue edit <nr> --repo Rickymoe/globus \
     --remove-label "@claude-build" \
     --add-label "@claude-verify"
   gh issue comment <nr> --repo Rickymoe/globus \
     --body "Implementert i commit $(git rev-parse --short HEAD)"
   ```

### 2. Sjekk @claude-verify (prioritet 2)
```
gh issue list --repo Rickymoe/globus --label "@claude-verify" --json number,title,body
```

For hvert issue:
1. `git pull` — hent siste endringer
2. Åpne appen og verifiser at funksjonen fungerer som beskrevet i issue
3. **Bestått:**
   ```
   gh issue close <nr> --repo Rickymoe/globus \
     --comment "Verifisert ✓ — <hva som ble sjekket>"
   ```
4. **Feilet:**
   ```
   gh issue edit <nr> --repo Rickymoe/globus \
     --remove-label "@claude-verify" \
     --add-label "bug"
   gh issue comment <nr> --repo Rickymoe/globus \
     --body "Verifikasjon feilet ✗\n\n<feilbeskrivelse>"
   ```
```

- [ ] **Steg 2: Commit loop prompt-filen**

```bash
cd /home/ricky/Dokumenter/Koding/globus
git add docs/agents/loop-prompt.md
git commit -m "feat: add local build+verify loop prompt"
git push
```

- [ ] **Steg 3: Start lokal loop**

I Claude Code, kjør:
```
/loop poll GitHub issues @claude-build og @claude-verify på Rickymoe/globus og behandle dem etter loop-prompten i docs/agents/loop-prompt.md
```

- [ ] **Steg 4: Bekreft at loop kjører**

Loop skal bekrefte at den har sjekket begge labels og rapportere antall issues funnet.
Forventet output: `@claude-build: 0 issues, @claude-verify: 0 issues — neste sjekk om ~120s`

---

## Task 3: End-to-end test med issue #1

Issue #1 (`Legg til stater i USA med en grønn farge`) ligger allerede på `Rickymoe/globus` med `@claude-brainstorm`-label.

**Files:**
- Modify: `js/app.js` eller ny `js/us-states.js` (bestemt av brainstorm-agenten)
- Modify: `css/style.css` (mulig)

**Interfaces:**
- Konsumerer: output fra Task 1 (cloud agent) og Task 2 (lokal loop)
- Produserer: verifisert feature i main

- [ ] **Steg 1: Bekreft at issue #1 har @claude-brainstorm**

```bash
gh issue view 1 --repo Rickymoe/globus --json labels
```
Forventet: `"name": "@claude-brainstorm"` i output

- [ ] **Steg 2: Vent på cloud-agenten (maks 10 min)**

Sjekk at `@claude-brainstorm` er fjernet og sub-issues opprettet:
```bash
gh issue list --repo Rickymoe/globus --state open --json number,title,labels
```
Forventet: issue #1 uten `@claude-brainstorm`, nye issues med `@claude-build`

- [ ] **Steg 3: Bekreft sub-issues og spec**

```bash
gh issue list --repo Rickymoe/globus --label "@claude-build"
ls /home/ricky/Dokumenter/Koding/globus/docs/superpowers/specs/
```
Forventet: minst én ny spec-fil datert i dag, minst ett `@claude-build`-issue

- [ ] **Steg 4: Bekreft at lokal loop plukker opp og bygger**

Loop-en kjører og behandler `@claude-build`-issues.
Sjekk commits:
```bash
git -C /home/ricky/Dokumenter/Koding/globus log --oneline -3
```
Forventet: ny commit med relevant feature

- [ ] **Steg 5: Bekreft verify og lukking**

```bash
gh issue list --repo Rickymoe/globus --state closed --json number,title
```
Forventet: issue(s) lukket med kommentar fra verify-agenten
