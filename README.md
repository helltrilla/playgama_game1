# Coins Table 🪙

> A high-performance 3D idle/clicker game built from scratch with **Three.js** and **Playgama Bridge SDK v2**, fully compliant with Playgama moderation standards.

---

## 🎮 Concept & Highlights

- **Pure Physical Idle Gameplay:** Tap/click the table to toss coins. Coins fly in parabolic arcs, spin, bounce on felt cloth, and accumulate Gold. Hold for auto-tossing (capped at 8 taps/s).
- **Zero Gambling Theme:** Absolutely no bets, jackpots, casinos, slots, cards, or stakes. Pure collection and incremental progression.
- **3 Distinct Tables:**
  - 🪵 **Wooden Table** (free starter) — warm wood, green felt, x1 income multiplier.
  - 🏛️ **Marble Table** (unlockable) — polished white marble, royal blue felt, x5 income multiplier.
  - 👑 **Royal Table** (unlockable) — dark mahogany, gold trim, ruby velvet felt, x25 income multiplier.
- **Two Upgrade Branches:**
  - **Gold Upgrades:** Coin Value, Auto Tosser, Toss Speed, Multi Toss, Lucky Coin, Offline Vault. Buy modes: `x1`, `x10`, `Max`.
  - **Ad Boosts (Rewarded Ads):** Golden Hour (2x for 4h), Diamond Hands (tap power), Magnet Table (auto collection), Time Warp (instant income), Frenzy (rapid tosses).
- **Offline Earnings:** Calculates idle gains when away (up to 4–8h based on vault level) with an optional **Collect x2** rewarded boost.
- **Multi-language Support:** Complete English (default) and Russian localization with instant switching in Settings.
- **Audio:** WebAudio with smooth gain ramping, rate-limited coin clinks, and soft ambient jingles (Kenney CC0).
- **Responsive Layout:** Adaptive design tokens for Mobile Portrait (360×640, 390×844), Mobile Landscape (915×412), Desktop HD (1280×720+), and Square (800×800, 1:1).

---

## 🏗️ Architecture

The codebase adheres strictly to **Spec-Driven Development (SDD)** and a three-tier decoupled architecture:

```
src/
├── core/         # Pure, deterministic game logic (BigNum, Clock, Rng, GameEngine, SaveManager)
├── data/         # Declarative balance: tables, upgrades, ad boosts (zero magic numbers)
├── platform/     # Playgama Bridge SDK v2 wrapper (BridgePlatform) + mock (FakePlatform)
├── audio/        # WebAudio controller with unified volume, mute, and pause handling
├── scene/        # Three.js 3D rendering (InstancedMesh coins, lighting, materials, particles)
├── ui/           # High-performance HTML/CSS UI with custom design tokens & SVG icons
├── i18n/         # Localization dictionaries (en, ru)
├── app/          # Lifecycle orchestrator wiring core, scene, audio, platform, and UI
└── main.ts       # Entry point with boot sequence and single game_ready emission
```

### Architectural Guarantees
1. **Pure Core:** `src/core` contains zero dependencies on Three.js, DOM, or Playgama Bridge. Clock and RNG are injected.
2. **Deterministic Big Numbers:** Custom `BigNum` based on native `BigInt` prevents precision loss during long idle sessions.
3. **Optimized Rendering:** Uses `InstancedMesh` for coins, pooling up to 60 coin instances. Measured draw calls: **7**; triangles: **408** (well below the limit of 60 calls and 150k triangles).
4. **Single Volume Master:** WebAudio gain node hierarchy respects manual mute, platform mute (`isAudioEnabled`), and pause events.

---

## 🛠️ Tech Stack

- **Engine & Graphics:** [Three.js](https://threejs.org/) (r170)
- **Language:** TypeScript 5.6+ in strict mode
- **Bundler:** [Vite 6](https://vitejs.dev/)
- **SDK:** [Playgama Bridge SDK v2](https://wiki.playgama.com/playgama/bridge-sdk/getting-started.md)
- **Unit & Property Testing:** [Vitest](https://vitest.dev/) + [fast-check](https://fast-check.dev/)
- **E2E & Visual Testing:** [Playwright](https://playwright.dev/)
- **Packaging:** [fflate](https://github.com/101arrowz/fflate) for automated `game.zip` compression

---

## 🚀 Quick Start & Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Run Test Suite
```bash
# Unit & Property tests (13 test files, 38 tests)
npm test

# Playwright E2E and visual matrix tests
npm run test:e2e

# Playgama compliance scanner
npm run test:compliance
```

### 4. Build & Package
```bash
# Compile TypeScript & bundle with Vite
npm run build

# Create optimized game.zip package and run compliance scan
npm run package
```
The output package `game.zip` (only **0.40 MB**) will be generated in the root directory.

### 5. Full Verification
```bash
npm run verify
```
Runs `lint` (ESLint + Prettier), `typecheck` (`tsc --noEmit`), `test` (Vitest), and `package` (build + zip + compliance scan).

---

## 🛡️ Playgama Moderation & Compliance

The build is automatically validated against all Playgama requirements (`docs/PLAYGAMA_COMPLIANCE.md`):

| Check | Requirement | Status |
|---|---|---|
| **Bridge Script** | First script in `<head>`, synchronous (no `async`/`defer`) | ✅ Verified |
| **Config File** | `playgama-bridge-config.json` located next to `index.html` | ✅ Verified |
| **Storage** | 100% via `bridge.storage` (zero `localStorage`, `sessionStorage`, `cookies`) | ✅ Verified |
| **Escape Key** | No `Escape` key handlers (preventing conflicts with fullscreen exit) | ✅ Verified |
| **game_ready** | Emitted exactly once after first interactive 3D frame | ✅ Verified |
| **Ad Monetization** | Rewarded ads voluntary; interstitials only on natural pauses | ✅ Verified |
| **Clean Package** | Latin filenames, `index.html` at zip root, size 0.40 MB (limit: 300 MB) | ✅ Verified |
| **Content Policy** | Zero gambling words (`casino`, `bet`, `jackpot`, `slot`, etc.) in all locales | ✅ Verified |

---

## ⚙️ Configuring Platform IDs for Release

Before publishing to specific partner networks (Yandex Games, VK Play, CrazyGames, GameDistribution, etc.):

1. Open `public/playgama-bridge-config.json`.
2. Configure your game IDs and ad placement IDs per platform:
```json
{
  "platforms": {
    "yandex": { "gameId": "<YOUR_YANDEX_APP_ID>" },
    "vk": { "gameId": "<YOUR_VK_APP_ID>" },
    "crazy_games": { "gameId": "<YOUR_CRAZYGAMES_GAME_ID>" }
  },
  "advertisement": {
    "banner": { "yandex": "<BANNER_BLOCK_ID>" }
  }
}
```
*(You can also use the online [Playgama Bridge Config Editor](https://wiki.playgama.com/playgama/bridge-sdk/config.md)).*

3. Run `npm run package` to rebuild `game.zip`.
4. Upload `game.zip` to the **Playgama Developer Console**.

---

## 🔍 Debugging & Developer Tools

Append `?debug=1` to the game URL to enable developer diagnostics:
- **Performance Overlay:** Displays real-time FPS, draw calls count, active triangles, and active coin instances.
- **Global Console Hooks (`window.__game`):**
  ```javascript
  __game.addGold(1000000);       // Add 1,000,000 gold
  __game.setTable('royal');       // Switch to Royal Table
  __game.getState();              // Inspect current game state
  __game.flush();                 // Immediately persist state to storage
  __game.reset();                 // Reset all progress
  ```

---

## 📄 Documentation Index

- [`PRODUCT.md`](file:///Users/helltrilla/flutter/playgama_game1/coins-table/docs/PRODUCT.md) — Product vision and scope
- [`ACCEPTANCE.md`](file:///Users/helltrilla/flutter/playgama_game1/coins-table/docs/ACCEPTANCE.md) — Acceptance criteria (`AC-*`)
- [`ECONOMY_SPEC.md`](file:///Users/helltrilla/flutter/playgama_game1/coins-table/docs/ECONOMY_SPEC.md) — Exact mathematical formulas and balance tables
- [`ARCHITECTURE.md`](file:///Users/helltrilla/flutter/playgama_game1/coins-table/docs/ARCHITECTURE.md) — Modular design and boundary enforcement
- [`TEST_PLAN.md`](file:///Users/helltrilla/flutter/playgama_game1/coins-table/docs/TEST_PLAN.md) — Test pyramid and AC-to-test traceability matrix
- [`PLAYGAMA_COMPLIANCE.md`](file:///Users/helltrilla/flutter/playgama_game1/coins-table/docs/PLAYGAMA_COMPLIANCE.md) — Playgama moderation checklist
- [`DECISIONS.md`](file:///Users/helltrilla/flutter/playgama_game1/coins-table/docs/DECISIONS.md) — Architectural Decision Records (ADRs)
- [`RELEASE.md`](file:///Users/helltrilla/flutter/playgama_game1/coins-table/docs/RELEASE.md) — Pre-flight checklist and release guide
- [`CREDITS.md`](file:///Users/helltrilla/flutter/playgama_game1/CREDITS.md) — Open-source and CC0 asset licenses
