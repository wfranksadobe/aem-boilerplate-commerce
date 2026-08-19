# University of Auckland — Navigation & Footer Migration Plan

## Status: Approved — blocked by active Plan mode (Execute mode not yet registered)

The plan is approved and I'm ready. However, **the harness still reports Plan mode active**, so every file write and command has been blocked (I've now attempted the first action — writing `.agents/settings.json` — twice, both denied by the plan-mode guard). This isn't something I can override from my side: Execute mode is a toggle you confirm in the UI (typically by accepting the plan when prompted, or the mode selector). Once it actually registers, no further input is needed — I'll proceed automatically through Phase 0 → G.

**What will happen the instant Execute mode is live:**
1. Write `.agents/settings.json` → `{"enabledPlugins": {"excat-commerce@excat-extended": true}}`
2. Session auto-reinitializes; the `excat` orchestrator skills load
3. Begin Phase A (scrape + capture the UoA header/footer)

## Goal

Replicate the **header/navigation and footer** of the University of Auckland News & Opinion site (`https://www.auckland.ac.nz/en/news.html`) into this EDS project — pixel-matched fonts and colours, exact logos, full 1st- and 2nd-level nav, matching dropdown behaviour, fully responsive across mobile/tablet/desktop — and set up a **multi-language taxonomy** for future translations. This first phase covers **nav + footer only** (no body/article content).

## Decisions (confirmed with you)

- **Plugin:** Enable **`excat-commerce@excat-extended`** (approved).
- **Languages:** Multi-language-ready taxonomy now, **English (`/en/`) as the only populated locale**; `/mi/`, `/zh/`, `/ko/`, `/ja/`, etc. addable later with zero rework.
- **Fonts:** Use the **exact UoA brand font files** for a pixel-exact match. ⚠️ **Licensing gate** — identify the typeface, check redistribution/web-embedding rights, confirm with you before committing; fall back to closest licence-free match if rights are unclear.
- **Secondary (2nd-level) nav links:** Absolute `auckland.ac.nz` URLs for now.
- **Migration approach:** Header/footer handled by the dedicated `excat` navigation & footer orchestrators (screenshot evidence + per-element hover/click mapping + appearance validation), not `page-import`.

## Scope

**In scope (this phase):**
- ✅ Header: logo(s), 1st-level nav items, 2nd-level dropdown/megamenu items + behaviour, search affordance if present
- ✅ Footer: logos, all link columns, legal/social, colours & fonts
- ✅ Exact colour palette + typography (design tokens in `styles.css`)
- ✅ Responsive behaviour at all breakpoints (mobile hamburger, tablet, desktop)
- ✅ Multi-language folder taxonomy + `hreflang`/metadata scaffolding (English populated)

**Out of scope (later phases):**
- ❌ Article/news body content, listing pages, PDP/PLP
- ❌ Actual translated content (only the taxonomy is built now)
- ❌ Removing the temporary links back to auckland.ac.nz

## Approach & Phases

### Phase 0 — Enable plugin (first Execute-mode action)
0. Write `.agents/settings.json` = `{"enabledPlugins": {"excat-commerce@excat-extended": true}}`. Session auto-reinitializes; orchestrator skills load.

### Phase A — Capture the source (read/scrape)
1. Scrape `https://www.auckland.ac.nz/en/news.html` — header + footer DOM, computed CSS, colours, font-family declarations, logo assets (SVG/PNG), full nav tree.
2. Playwright: record hover/click behaviour of 1st-level items (dropdown/megamenu open, timing, focus) + screenshots at mobile/tablet/desktop.
3. Enumerate every nav item (1st + 2nd level) with destination URL, and every footer link/column.

### Phase B — Extract design tokens & fonts
4. Extract exact colours, spacing, typography into CSS custom properties in `styles/styles.css`.
5. Identify brand typeface → **licensing check → confirm with you** → add font files to `fonts/` + declarations to `styles/fonts.css` (or fallback).

### Phase C — Taxonomy & content model
6. Design multi-language folder taxonomy (`/en/` now; `/{lang}/` siblings later) + `hreflang`/language metadata convention; document per-locale nav/footer fragment locations.
7. Author English nav + footer fragments (`nav.plain.html` / `footer.plain.html`); 2nd-level links → absolute auckland.ac.nz URLs.

### Phase D — Implement header block
8. Implement/adapt `header` block JS + CSS: logo, 1st-level items, dropdown/megamenu, mobile hamburger; match open/close behaviour + transitions.
9. Iterate responsively at every breakpoint against captured screenshots.

### Phase E — Implement footer block
10. Implement/adapt `footer` block JS + CSS: logos, link columns, legal/social, colours, fonts; match layout at every breakpoint.

### Phase F — Validate
11. Visual-critique header + footer vs. original at mobile/tablet/desktop — fonts, colours, spacing, dropdown behaviour, 2nd-level link targets.
12. Accessibility pass (heading hierarchy, ARIA on nav/menu, keyboard, focus states), console-error check, `npm run lint`.
13. Confirm taxonomy renders and `hreflang`/metadata scaffolding is correct.

### Phase G — Ship
14. Push feature branch, PR with preview links, run `gh pr checks` / PageSpeed on feature preview.

## Skills / Tooling

- `excat:excat-navigation-orchestrator` — header/nav instrumentation
- `excat:excat-footer-orchestrator` — footer migration
- `excat:excat-visual-critique` — appearance comparison vs. original
- `scrape-webpage` / Playwright MCP — source capture + behaviour recording
- `building-blocks`, `content-modeling`, `testing-blocks`, `code-review` — implementation + QA
- `da-content` / `da-auth` — pushing fragments to DA if authored programmatically

## Risks & Open Items

- **Execute mode not registering** — current blocker; the toggle must take effect in the harness before any file write succeeds.
- **Font licensing** — resolved via the Phase B confirmation gate.
- The megamenu may be a sidebar+right-panel pattern — nav orchestrator handles via per-item Playwright hover (no structure assumptions).
- Multi-language URL convention (`/en/…` prefix vs. root) finalized in Phase C, shown to you before authoring.

## Checklist

- [ ] **Execute mode active in harness** (unblocks all writes/commands) — prerequisite
- [ ] **Enable `excat-commerce` plugin** (write `.agents/settings.json`) — first Execute-mode action
- [ ] Scrape source header + footer DOM, CSS, logos, and full nav tree
- [ ] Record 1st-level dropdown hover/click behaviour + capture screenshots (mobile/tablet/desktop)
- [ ] Enumerate all nav items (1st + 2nd level) with destination URLs and all footer links
- [ ] Extract exact colour palette + typography into design tokens (`styles.css`)
- [ ] Identify brand typeface, run licensing check, confirm with user, add font files (or fallback)
- [ ] Design multi-language taxonomy + `hreflang`/metadata scaffolding (English populated, others ready)
- [ ] Author English nav + footer content fragments (2nd-level → auckland.ac.nz links)
- [ ] Implement header block (logo, 1st/2nd-level, megamenu, mobile hamburger, matching behaviour)
- [ ] Implement footer block (logos, columns, legal/social, colours, fonts)
- [ ] Responsive verification of header + footer at all breakpoints
- [ ] Visual-critique nav + footer vs. original (fonts, colours, spacing, dropdown behaviour)
- [ ] Accessibility + console + `npm run lint` pass
- [ ] Verify 2nd-level links resolve to the university site
- [ ] Verify language taxonomy + hreflang scaffolding renders correctly
- [ ] Push branch + open PR with preview links; run PR/PSI checks

---

**To proceed:** the plan is approved. The only remaining blocker is that **Plan mode is still enforced by the harness** — please confirm the Execute-mode switch (accept/exit plan mode in the UI). The moment it registers, I'll write `.agents/settings.json`, reinitialize, and start Phase A automatically.
