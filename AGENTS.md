# ACMUSIC (cloudmusic)

NetEase Cloud Music third-party web client. Vue 2 SPA, no tests, no CI.

## Commands

- `yarn serve` — dev server with HMR
- `yarn build` — production build to `dist/`
- `yarn lint` — ESLint (config lives in `package.json` eslintConfig key)

No test runner exists.

## Setup gotchas

- **node-sass 4.14.1** requires **Node 16**. Node 17+ will fail to install native bindings. Migrate to dart-sass if you need a newer Node.
- API base URL is hardcoded in `src/main.js`. No `.env` file.
- DevServer proxies `/api` → `https://music.163.com` in `vue.config.js`.
- `lintOnSave: false` in `vue.config.js` — errors only surface on `yarn lint`.

## Architecture

- **Vue 2 Options API** (no Composition API, no `<script setup>`)
- **Vue Router 3** (hash mode), **Vuex 3** with 3 modules: `UserAbout`, `TracksAbout`, `StatusAbout`
- **Element UI** installed globally (`Vue.use`)
- **xgplayer** (bytedance) for MV/Video playback; native `Audio` element for music
- Cross-component communication via global event bus (`Vue.prototype.$bus`) and `pubsub-js`
- `js-cookie` + `localStorage` for login persistence
- 9 search result sub-views share a `searchMixin` in `src/assets/mixin/index.js`
- Reusable layout components in `src/components/layout/` (emit events via $bus)
- Custom iconfont in `src/assets/ac-font/`

## API

- All requests go to `https://netease-cloud-music-api-nu-rosy.vercel.app` (Vercel-deployed NeteaseCloudMusicApi instance)
- `withCredentials: true` for cookie-based auth
- Thin wrappers in `src/api/*.js` around `axios.get` / `axios()`

## Key conventions

- Route names: `listDetail`, `albumDetail`, `artistDetail`, `mvPlay`, `videoPlay`, `trackList`, etc.
- Detail pages receive `id` / `uid` via query params with Vue Router `props` function pattern
- NetEase API returns inconsistent field names — code uses fallback checks (`coverImgUrl` vs `picUrl`, etc.)
- `VueRouter.prototype.push` is patched globally to suppress duplicate navigation errors
