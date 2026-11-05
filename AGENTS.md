# ACMUSIC (cloudmusic)

NetEase Cloud Music third-party web client. Vue 2 SPA. No tests; deploy is GitHub Actions (`.github/workflows/deploy.yml`, fallback `scripts/deploy.sh`).

## Commands

- `yarn serve` — dev server with HMR
- `yarn build` — production build to `dist/`
- `yarn lint` — ESLint (config lives in `package.json` eslintConfig key)
- `yarn changelog` — regenerate `src/data/changelog.generated.js` from `CHANGELOG.md` (also runs automatically via `prebuild` / `preserve`)

No test runner exists.

## Setup gotchas

- Styling uses **dart-sass** (`sass` 1.77 + `sass-loader` 7.3.1), not `node-sass`; builds work on modern Node (verified on Node 24). Sass emits `@import`/`legacy-js-api` deprecation warnings — noise, not errors.
- API base URL comes from `VUE_APP_API_BASE_URL` in `.env`, read via `src/config.js`. (`.env` is git-tracked and also holds `VUE_APP_AMAP_KEY`.)
- DevServer proxies `/api` → `https://music.archai.space` in `vue.config.js` (keeps the `/api` prefix; the live nginx does the final dispatch).
- `lintOnSave: false` in `vue.config.js` — errors only surface on `yarn lint`.
- Production build memory: `yarn build` spawns thread-loader workers; in a sandboxed/restricted shell it can fail with `spawn EPERM` even though the build itself is fine.

## Architecture

- **Vue 2 Options API** (no Composition API, no `<script setup>`)
- **Vue Router 3** (**history mode**), **Vuex 3** with 2 modules: `UserAbout`, `TracksAbout`
- **Element UI** installed globally (`Vue.use`)
- **xgplayer** (bytedance) for MV/Video playback; native `Audio` element for music
- Cross-component communication via global event bus (`Vue.prototype.$bus`) and `pubsub-js`
- `js-cookie` + `localStorage` for login persistence
- 9 search result sub-views share `searchMixin` in `src/mixins/searchMixin.js`
- Reusable layout components in `src/components/layout/` (emit events via $bus)
- Icons: `BaseIcon` + `src/config/icon.js` (font classes + inline SVG paths); font files in `src/assets/ac-font/` (`iconfont.css` is the one actually imported — `iconfont.js` is unreferenced)

## API

- Requests go to the gateway in `VUE_APP_API_BASE_URL` (`/api` in `.env`), a **self-hosted** NeteaseCloudMusicApi on the same VPS — nginx strips `/api` and proxies to `127.0.0.1:3000`
- Audio fallback: `PlayerCore` rewrites the src to `location.origin + '/api/audio-proxy?url=…'`; nginx maps that exact path to the helper service on `127.0.0.1:3001`. `api/audio-proxy.js` is the Vercel-era implementation (SSRF allowlist + Range forwarding) kept as reference.
- `withCredentials: true` for cookie-based auth
- Thin wrappers in `src/api/*.js` around the shared `request` instance from `src/api/request.js`

## Ops

- nginx runs on the same VPS as the API gateway (Ubuntu, nginx 1.24; host in `.github/workflows/deploy.yml` → `SSH_HOST` — docs deliberately don't repeat the IP, the repo is public). Live site config: `/etc/nginx/sites-available/music` (symlinked from `sites-enabled/`); the repo mirror is `ops/nginx/`.
- **nginx is not deployed by CI.** Editing `ops/nginx/*.conf` changes nothing on the server — follow the deploy + verify steps in `ops/nginx/README.md`.
- API abuse guard (per-IP rate limit, CORS pinning, audio throttle, `MUSIC_U` log redaction) lives in `ops/nginx/acmusic-guard.conf` + `ops/nginx/acmusic-api-common.conf`. Read that README before touching nginx.
- Backend ports are firewalled to localhost only (ufw allows 80/443/22 `/`): `3000` = NeteaseCloudMusicApi, `3001` = audio-proxy + ip-location helper.

## Key conventions

- Route names: `listDetail`, `albumDetail`, `artistDetail`, `mvPlay`, `videoPlay`, `trackList`, etc.
- Detail pages receive `id` / `uid` via query params with Vue Router `props` function pattern
- NetEase API returns inconsistent field names — code uses fallback checks (`coverImgUrl` vs `picUrl`, etc.)
- `VueRouter.prototype.push` is patched globally to suppress duplicate navigation errors

## Version & changelog

- Two logs, don't mix them: `CHANGELOG.md` (repo root) is **user-facing**; `docs/CHANGELOG_AI.md` is the internal dev log (acceptance status, deployment notes, trade-offs).
- `CHANGELOG.md` format is strict and minimal — `## <version> — <date>`, `### <section>`, `- <item>`. `scripts/build-changelog.mjs` parses exactly that into `src/data/changelog.generated.js`; **never hand-edit the generated file**.
- Version lives only in `package.json` (`src/config.js` reads it for the footer + in-app changelog). At release time keep it in sync with an annotated git tag `vX.Y.Z`; tags do not trigger the deploy workflow (it keys off `push master` + path filters).
- In-app entry: avatar menu and footer → `ChangelogDialog`. The unread dot compares `localStorage.acmusic_seen_changelog` with the current version.
