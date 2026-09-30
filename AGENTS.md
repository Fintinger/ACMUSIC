# ACMUSIC (cloudmusic)

NetEase Cloud Music third-party web client. Vue 2 SPA, no tests, no CI.

## Commands

- `yarn serve` — dev server with HMR
- `yarn build` — production build to `dist/`
- `yarn lint` — ESLint (config lives in `package.json` eslintConfig key)

No test runner exists.

## Setup gotchas

- Styling uses **dart-sass** (`sass` 1.77 + `sass-loader` 7.3.1), not `node-sass`; builds work on modern Node (verified on Node 24). Sass emits `@import`/`legacy-js-api` deprecation warnings — noise, not errors.
- API base URL comes from `VUE_APP_API_BASE_URL` in `.env`, read via `src/config.js`. (`.env` is git-tracked and also holds `VUE_APP_AMAP_KEY`.)
- DevServer proxies `/api` → `https://music.163.com` in `vue.config.js`.
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

- Requests go to the gateway in `VUE_APP_API_BASE_URL` (Vercel-deployed NeteaseCloudMusicApi instance)
- Audio fallback: when direct CDN playback fails repeatedly, `PlayerCore` routes audio through the self-hosted serverless proxy `api/audio-proxy.js` on the site origin
- `withCredentials: true` for cookie-based auth
- Thin wrappers in `src/api/*.js` around the shared `request` instance from `src/api/request.js`

## Key conventions

- Route names: `listDetail`, `albumDetail`, `artistDetail`, `mvPlay`, `videoPlay`, `trackList`, etc.
- Detail pages receive `id` / `uid` via query params with Vue Router `props` function pattern
- NetEase API returns inconsistent field names — code uses fallback checks (`coverImgUrl` vs `picUrl`, etc.)
- `VueRouter.prototype.push` is patched globally to suppress duplicate navigation errors
