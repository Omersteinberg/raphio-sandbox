# IP-based voice ordering + cleaner facet filters

Date: 2026-07-13
Status: approved

## Problem

The voice picker already knows the caller's region, but never uses it to order the list.

`merge-api/src/services/geo.service.js` maps IP -> country -> accent (`geoip-lite`, via a
`COUNTRY_TO_ACCENT` table covering US/GB/IE/AU/NZ/CA/IN/PK/BD/LK/NP). `GET /api/voices`
attaches `regionDefault = { countryCode, accent, voiceKey }` to the response, and
`src/services/voices.js` exposes it as `getRegionDefault()`.

That value is consumed in exactly one place: `PromptStep.jsx:864` preselects a single voice
and shows it under "Recommended for you", and only for users who have never picked a voice.

The list itself is region-blind. `VoiceSelector.jsx:127` groups voices by gender and renders
them in whatever order the backend array arrived in, so an Australian user scrolls past ~25
American voices to reach an Australian one. `IntroScriptStep.jsx:87` renders `<VoiceSelector>`
with no `recommendation` prop at all, so that screen gets no region signal whatsoever.

Separately, each facet dropdown option renders a `(count)` suffix ("American (24)") that the
user wants removed.

## Design

### 1. `sortVoicesByRegion(voices, accent)` in `src/lib/voiceMetadata.js`

A pure, **stable** partition. Voices whose `getVoiceAccent()` matches `accent`
(case-insensitive) move to the front; every other voice keeps its existing relative order.
Returns the input unchanged when `accent` is falsy.

Stability is the whole contract: this is an accent boost, not a re-sort. Nothing else about
the order may change.

Pure and DOM-free so it is testable under plain vitest (see Testing).

### 2. `VoiceSelector` reads the region itself

`VoiceSelector` already calls `voicesService.getVoices()` on mount, and that call is what
populates the `regionDefault` cache in `services/voices.js`. So the selector can read the
region for **zero extra HTTP** by peeking that cache once the voices resolve.

Add a sync `peekRegionDefault()` export to `services/voices.js` (cache-only, no fetch). The
existing async `getRegionDefault()` stays exactly as-is because `PromptStep` calls it
standalone and depends on it triggering a fetch. Peeking avoids a redundant second request
in the API-down path, where `getVoices()` returns the fallback list without populating the
region cache.

Store the accent in `regionAccent` state, then boost the flat filtered list before it is
grouped. Because the grouping reduce is order-preserving, boosting the flat list boosts
within each gender bucket - no need to sort bucket by bucket.

Doing this inside `VoiceSelector` rather than threading a prop is deliberate: it is what
makes `IntroScriptStep` region-aware for free.

The "Recommended for you" section is unaffected; it is already lifted out above the groups.

### 3. Drop the `(count)` from facet dropdowns

`FacetDropdown` renders `humanizeFacetValue(option)` only.

`collectVoiceFacet` keeps *computing* counts because it sorts options by frequency (most
common accent first, so "American" isn't buried behind an alphabetical accident). It just
stops surfacing them. Its trailing comment currently claims the count is shown to the user -
that rationale dies and the comment must be corrected.

## Behaviour when geolocation fails

Superseded during implementation - see "Geo source" below.

Any country outside the small `COUNTRY_TO_ACCENT` table still falls back to
`accent: 'American'`, so a German or Brazilian user gets American voices boosted. This is
accepted, not fixed: American-first is roughly the list's existing order, so the fallback is
a near no-op. Explicitly **not** adding a "don't boost when the country is unresolved" case.

## Geo source (revised: Cloudflare, not geoip-lite)

The original design inherited `geoip-lite`. That was **removed**, because it was returning a
confidently wrong country: it placed a Melbourne user in the Philippines, so they were served
American voices. `geoip-lite` is not a live lookup - it ships a static snapshot of MaxMind's
free GeoLite DB frozen at npm-publish time, and reassigned APNIC ranges rot.

The country now comes from Cloudflare's **`CF-IPCountry`** header. `api.raphio.ai` is
Cloudflare-proxied (confirmed: `Server: cloudflare`, and `CF-RAY: ...-MEL` routed the same
user through Cloudflare's Melbourne datacenter), so the header is present on every real
request and reflects Cloudflare's own live geo data.

No local fallback, deliberately: a wrong country is worse than no country, because it
silently recommends the wrong accent, whereas no country lands on `DEFAULT_ACCENT`, which is
honest. Local dev therefore always resolves to American. To exercise a real country locally,
send the header: `curl -H 'CF-IPCountry: AU' .../api/voices`.

`geo.service.js` surface: `countryFromRequest(req)` / `countryToAccent(code)` /
`accentFromRequest(req)`. Cloudflare's non-answers (`XX` unknown, `T1` Tor) map to "no
country". The `geoip-lite` dependency is uninstalled (~110 MB of `.dat` files gone).

## Testing

`vitest` is installed (`npm test` -> `vitest run`) but the repo has zero test files and no
jsdom/testing-library, so component tests are not set up. This is why the ordering logic is
a pure function.

`src/lib/voiceMetadata.test.js` covers `sortVoicesByRegion`:

- matching accents are boosted to the front
- relative order is preserved within both partitions (stability)
- a falsy accent is a no-op
- matching is case-insensitive
- an accent no voice carries leaves the list unchanged

## Out of scope

- Expanding `COUNTRY_TO_ACCENT` to more countries (backend change, separate concern).
- Reordering the accent dropdown's own options to put the user's region first.
- Any change to how the recommended voice is chosen or preselected.
