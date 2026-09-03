<template>
  <div
    ref="playerPanel"
    class="playerPanel"
    :class="{ expanded: showBar, paused: !isPlay, hasSong: currentSong.id }"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @mousemove="onMouseMove"
  >
    <div class="miniBar" @click="onProgressClick">
      <div class="miniTrack" ref="miniTrack">
        <div class="miniFill" :style="{ width: progress + '%' }"></div>
      </div>
    </div>
    <div class="fullBar" v-show="showBar" :style="miniBgStyle ? { background: miniBgStyle } : null">
      <div class="barLeft">
        <div class="barCover" @click="showSongDetail">
          <transition name="cover-fade" mode="out-in">
            <img v-if="coverUrl" :key="coverUrl" :src="coverUrl | imgParam('200y200')" alt="" />
            <div v-else key="placeholder" class="coverPlaceholder"><BaseIcon name="play"/></div>
          </transition>
        </div>
        <div class="barInfo" @click="showSongDetail">
          <div class="barInfoInner">
            <transition name="slide-up" mode="out-in">
              <p class="barTitle" :key="currentSong.id">{{ songName }}</p>
            </transition>
            <transition name="slide-up" mode="out-in">
              <p class="barArtist" :key="currentSong.id">{{ artistNames }}</p>
            </transition>
          </div>
        </div>
        <i :class="['likeBtn', { liked: isLiked }]" :title="isLiked?'取消收藏':'收藏'" @click.stop="toggleLike">
          <BaseIcon v-if="isLiked" name="likeFill"/>
          <BaseIcon v-else name="like"/>
        </i>
      </div>
      <div class="barCenter">
        <div class="barControls">
          <span
              class="modeBtn"
              :class="'mode-' + playMode"
              :title="playMode === 'order' ? '列表循环' : playMode === 'random' ? '随机播放' : '单曲循环'"
              @click="togglePlayMode"
          >
            <BaseIcon v-if="playMode === 'order'" name="loopList" :size="18"/>
            <BaseIcon v-else-if="playMode === 'random'" name="shuffle" :size="18"/>
            <BaseIcon v-else name="loopOne" :size="18"/>
          </span>
          <span class="miniTrackBtn" @click="preSong"><BaseIcon name="prev" :size="18"/></span>
          <div class="barPlay" @click="togglePlay">
            <i v-if="isLoading" class="player-loading-spinner"></i>
            <transition v-else name="btn-swap" mode="out-in">
              <BaseIcon v-if="!isPlay" key="play" name="play"/>
              <BaseIcon v-else key="pause" name="pause"/>
            </transition>
          </div>
          <span class="miniTrackBtn" @click="nextSong"><BaseIcon name="next" :size="18"/></span>
        </div>
        <div class="barProgress">
          <span class="barTime">{{ formatTime(timeNow) }}</span>
          <div class="barTrack" ref="barTrack" @click="onProgressClick">
            <div class="barFill" :style="{ width: progress + '%' }">
              <div class="barThumb" ref="barThumb" @mousedown.stop="startDrag"></div>
            </div>
          </div>
          <span class="barTime">{{ formatTime(timeDuration) }}</span>
        </div>
      </div>
      <div class="barRight">
        <div class="barItem volumeWrap">
          <BaseIcon name="volume" @click="showVolume = !showVolume"/>
          <transition name="volume-pop">
            <div v-if="showVolume" class="volumeSlider" @click.stop>
              <input v-model="volume" type="range" min="0" max="100" @input="onInteract" />
            </div>
          </transition>
        </div>
        <div class="barItem qualityWrap">
          <button class="qualityBtn" @click.stop="showQualityMenu = !showQualityMenu">
            {{ currentQualityShort }}
          </button>
          <QualityMenu :visible="showQualityMenu" :selected="config.player.level" @select="onQualitySelect"/>
        </div>
        <div class="barItem playlistWrap">
          <el-dropdown v-if="currentPlaylist.length" trigger="click" placement="top" @command="handleCommand" @visible-change="onDropdownToggle">
            <span class="playlistTrigger">
              <BaseIcon name="play"/>
              <span class="plCount">{{ currentPlaylist.length }}</span>
            </span>
            <el-dropdown-menu slot="dropdown" class="playlistDropdown">
              <div class="plHeader">
                <span>播放列表</span>
                <span class="plTotal">{{ currentPlaylist.length }} 首</span>
              </div>
              <div class="plActions">
                <el-button size="mini" type="text" @click="clearPlaylist">清空列表</el-button>
              </div>
              <div class="plItems">
                <el-dropdown-item v-for="s in currentPlaylist" :key="s.id" :class="{ active: s.curSong }" :command="s">
                  <span class="plSongName">{{ s.name }}</span>
                  <span class="plSongArtist">{{ getArtistStr(s) }}</span>
                </el-dropdown-item>
              </div>
              <div v-if="!currentPlaylist.length" class="plEmpty">
                <div class="plEmptyIcon">♪</div>
                <p>播放列表为空</p>
                <p class="plEmptyHint">播放歌曲后会自动添加</p>
              </div>
            </el-dropdown-menu>
          </el-dropdown>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import pubsub from "pubsub-js";
import { mapState } from "vuex"
import { normalizeTrack } from "@/utils/normalize"
import config from "@/config"
import { buildBackground } from "@/utils/colorExtractor"
import QualityMenu from "@/components/musicPlayer/QualityMenu"
import { setAudioCache, getAudioCache, getAudioUrl } from "@/utils/audioCache"
import { setSongTitle, clearSongTitle, BASE } from "@/utils/title";

const FALLBACK_BG = '#1a1a2e'

export default {
  name: "PlayCore",
  props: ["song", "isExpand"],
  components: { QualityMenu },
  data() {
    return {
      currentSong: {},
      isPlay: false,
      sel: {},
      timeNow: "",
      timeDuration: "",
      volume: 20,
      curIndex: 0,
      isPending: false,
      promiseList: [],
      showBar: true,
      showVolume: false,
      isLiked: false,
      hideTimer: null,
      isDropdownOpen: false,
      miniBgStyle: '',
      playRequestId: 0,
      pendingUrlRequests: new Map(),
      urlCache: new Map(),
      currentQuality: { requested: '', actual: '' },
      showQualityMenu: false,
      currentLevel: config.player.level,
      currentSongSource: 'unknown',
      isLoading: false,
      showPlayerPending: false,
      hasRestoreProgress: false,
      resumeTime: 0,
      restoreSongId: null,
      lastSaveTime: 0,
      isRestoring: false,
      bufferedTime: 0,
      playContextId: 0,
      playlistContextId: 0,
      playIntentId: 0,
      currentPlaySourceLocked: false,
      audioRetryCount: 0,
      audioLastSrc: '',
      audioUseProxy: false,
      playMode: 'order',
      shuffleOrder: [],
      shufflePos: -1,
      // _autoNext 锁：防止 song end 期间 timeNow watcher 多次触发 _autoNext
      // （音频暂停前 timeupdate 事件持续触发，会让 _autoNext 被多次调用）
      // 第一次 _autoNext 触发过渡后，$nextTick 期间锁住，避免后续误触发 curIndex++
      autoNextLocked: false,
    }
  },
  computed: {
    ...mapState('TracksAbout', ['currentPlaylist', 'isPersonalFM']),
    isLogin() { return this.$store.getters["UserAbout/isLogin"] },
    progress() { return (this.timeNow / this.timeDuration) * 100 || 0 },
    /**
     * FM 模式预加载信号：在 FM 模式下进入最后一首时变 true
     * watcher 监听到此变化会主动 publish 'getPersonalFM' 触发预加载
     * 这样歌曲结束前新批次已就绪，避免听感上的"静音空白"
     */
    fmShouldPrefetch() {
      if (!this.isPersonalFM) return false
      const len = this.currentPlaylist.length
      return len > 0 && this.curIndex === len - 1
    },
    coverUrl() {
      const s = this.currentSong
      return (s.al && s.al.picUrl) || (s.album && s.album.picUrl) || ''
    },
    songName() { return this.currentSong.name || '未选择歌曲' },
    artistNames() {
      const s = this.currentSong
      const ar = s.ar || s.artists
      if (!ar) return ''
      if (typeof ar === 'string') return ar
      if (Array.isArray(ar)) return ar.map(a => a.name || a).join(' / ')
      return ''
    },
    config() { return config },
    currentQualityShort() {
      const opts = config.player.qualityOptions || []
      const f = opts.find(o => o.key === this.currentLevel)
      return f ? f.short : '标'
    },
  },
  watch: {
    song(val) {
      console.trace('[CurrentSongSet] song_watch', val && val.id)
      console.log('[SongState]', { action: 'song_watch', currentSongId: this.currentSong.id || null, playlistFirstId: this.currentPlaylist[0] && this.currentPlaylist[0].id || null, requestId: this.playRequestId })
      this.playIntentId++
      this.playContextId++
      this.currentSongSource = 'unknown'
      this.currentPlaySourceLocked = true
      console.log('[SourceChange]', { to: 'unknown', songId: val && val.id, trigger: 'song_watch' })
      this.currentSong = normalizeTrack(val)
      this.updateMiniBackground()
    },
    currentSong(val) {
      if (val.id) {
        console.log('[PlayIntent]', { songId: val.id, source: this.currentSongSource, playIntentId: this.playIntentId, playContextId: this.playContextId, requestId: this.playRequestId, action: 'start' })
        console.log('[PlayContext]', { songId: val.id, source: this.currentSongSource, contextId: this.playContextId, playlistContextId: this.playlistContextId, requestId: this.playRequestId })
        normalizeTrack(val)
        this.updateMiniBackground()
        if (this.isRestoring) {
          this.isRestoring = false
          this.isPlay = false
        } else {
          this.pauseSong()
          this.playRequestId++
          this.pushPromise(this.checkSong(this.currentSong.id, this.playRequestId))
        }
        const inPlaylist = this.currentPlaylist.findIndex(item => item.id === val.id)
        if (this.currentSongSource !== 'playlist' && this.currentSongSource !== 'restore' && inPlaylist) {
          console.log('[SourceGuard]', { songId: val.id, source: this.currentSongSource, playlistContains: true, action: 'keep_source' })
        }
        if (this.currentSongSource === 'playlist') {
          this.curIndex = inPlaylist
          if (this.curIndex === -1) this.curIndex = 0
          if (inPlaylist === -1) {
            this.$store.commit("TracksAbout/PUSH_PLAYLIST", val)
          }
          this.currentPlaylist.forEach(el => { el.curSong = el.id === val.id })
        } else {
          if (inPlaylist !== -1) {
            this.curIndex = inPlaylist
            console.log('[PlaylistSync]', { action: 'exist', songId: val.id, index: inPlaylist, source: this.currentSongSource })
          } else if (this.currentSongSource !== 'restore') {
            this.$store.commit("TracksAbout/PUSH_PLAYLIST", val)
            this.curIndex = this.currentPlaylist.length - 1
            console.log('[PlaylistSync]', { action: 'append', songId: val.id, index: this.curIndex, source: this.currentSongSource })
          }
          this.currentPlaylist.forEach(el => { el.curSong = el.id === val.id })
        }
        this.$emit('songChange', val)
        this.$emit('getLyric', val.id)
        this.$emit('getSimi', val.id)
        this.$nextTick(() => this.scheduleHide())
        this._saveState()
      }
    },
    promiseList() {
      if (this.promiseList.length) {
        const reqId = this.playRequestId
        this.promiseList[0].then(() => {
          if (reqId !== this.playRequestId) {
            console.log('[PlayRace]', { requestId: reqId, currentRequestId: this.playRequestId, action: 'ignore_stale_play' })
            return
          }
          console.log('%c[PlayReady] %creq=%s src=%s readyState=%s', 'background:#16a34a;color:#fff;padding:2px 6px', '', reqId, this.sel.src ? 'SET' : 'EMPTY', this.sel.readyState)
          this.isPending = false
          console.trace('[PlaySongCall] promiseList')
          this.playSong()
        })
      }
    },
    curIndex(ind) {
      // 仅 playlist / restore（恢复后的播放列表）允许同步切歌；search/fm 等跳过
      if (this.currentSongSource !== 'playlist' && this.currentSongSource !== 'restore') {
        console.log('[PlaylistGuard]', { action: 'skip_curIndex', source: this.currentSongSource, playlistSyncLock: this.playlistSyncLock, songId: this.currentSong.id, contextId: this.playContextId })
        return
      }
      // 【关键修复】恢复期间不执行切歌逻辑：恢复状态由 _restoreState() 控制，
      // curIndex watcher 的切歌行为会覆盖正确恢复的 currentSong，导致切到错误歌曲
      if (this.isRestoring) {
        console.log('[RestoreGuard] skip curIndex_watch during isRestoring', { ind })
        return
      }
      if (this.playContextId !== this.playlistContextId) {
        console.warn('[PlaylistSync]', { action: 'skip_non_playlist_song', source: this.currentSongSource, songId: this.currentSong.id, curIndex: ind, playContextId: this.playContextId, playlistContextId: this.playlistContextId })
        return
      }
      // 【修复】目标歌曲与当前歌曲相同（如恢复后 curIndex 对齐）时跳过，
      // 避免重新赋值 currentSong（对象引用变化）再次触发播放链路，
      // 导致刷新后自动播放（被浏览器拦截成 isPlay=true 但无声）、点击从头播放
      const target = this.currentPlaylist[ind]
      if (target && target.id === this.currentSong.id) {
        console.log('[CurIndexGuard]', { action: 'skip_same_song', songId: target.id })
        return
      }
      console.trace('[CurrentSongSet] curIndex_watch', this.currentPlaylist[ind] && this.currentPlaylist[ind].id)
      console.log('[SongState]', { action: 'curIndex_watch', currentSongId: this.currentSong.id, nextId: this.currentPlaylist[ind] && this.currentPlaylist[ind].id, requestId: this.playRequestId })
      this.playIntentId++
      this.playContextId++
      this.currentSongSource = 'playlist'
      this.currentPlaySourceLocked = true
      this.playlistContextId = this.playContextId
      console.log('[SourceChange]', { to: 'playlist', songId: this.currentPlaylist[ind] && this.currentPlaylist[ind].id, trigger: 'curIndex' })
      this.currentSong = this.currentPlaylist[ind]
      if (this.isDropdownOpen) this._scrollActiveSong('change')
    },
    timeNow(n) {
      this.isExpand && this.$emit('tUpdate', n)
      if (this.sel.currentTime === this.timeDuration) this._autoNext()
      if ((this.timeDuration - n) < 0.5 && this.sel.currentTime !== this.timeDuration) {
        this._autoNext()
      }
    },
    volume(val) { this.sel.volume = val / 100 },
    isPersonalFM(val) {
      if (!val) this.$store.commit('TracksAbout/REPLACE_PLAYLIST', [this.currentSong])
    },
    /**
     * FM 预加载：进入最后一首时主动 publish 'fmPrefetch'（**只拉数据，不应用**）
     * PersonalFM 收到后 fetch /personal_fm 并 SET_FM_STAGED_BATCH（暂存，不 REPLACE）
     * 真正的切换由 reactive 流程在歌曲自然结束 / 用户点 next 时触发
     */
    fmShouldPrefetch(needed) {
      if (needed) pubsub.publish('fmPrefetch', Date.now())
    },
    'currentSong.id'() {
      this._syncTitle()
    },
    isPlay() {
      this._syncTitle()
    }
  },
  methods: {
    _syncTitle() {
      const s = this.currentSong
      if (s && s.id) {
        const name = s.name || '未知歌曲'
        const ar = this.artistNames
        const prefix = this.isPlay ? '♪' : '❚❚'
        setSongTitle(`${prefix} ${name}${ar ? ' - ' + ar : ''} · ${BASE}`)
      } else {
        clearSongTitle()
      }
    },
    getArtistStr(s) {
      const ar = s.ar || s.artists
      if (!ar) return ''
      if (typeof ar === 'string') return ar
      if (Array.isArray(ar)) return ar.map(a => a.name || a).join(' / ')
      return ''
    },
    updateMiniBackground() {
      const s = this.currentSong
      const cover = (s.al && s.al.picUrl) || (s.album && s.album.picUrl) || s.coverImgUrl || ''
      if (!cover) {
        // 无封面保持默认深色
        this.miniBgStyle = ''
        return
      }
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        this.miniBgStyle = buildBackground(img)
      }
      img.onerror = () => {
        this.miniBgStyle = ''
      }
      img.src = cover
    },
    init() { this.promiseList = []; this.isPlay = false; this.timeDuration = 0; this.timeNow = 0 },
    pushPromise(promise) { this.promiseList.unshift(promise) },
    async checkSong(id, requestId) {
      const key = id + '_' + this.playIntentId
      const pending = this.pendingUrlRequests.get(key)
      if (pending) {
        await pending
        return
      }
      const self = this
      const promise = new Promise(resolve => {
        if (self.isLogin) self.checkSongLoggedIn(id, requestId).then(res => resolve(res))
        else self.checkSongDntLogin(id, requestId).then(res => resolve(res))
      })
      this.pendingUrlRequests.set(key, promise)
      try {
        await promise
      } finally {
        this.pendingUrlRequests.delete(key)
      }
    },
    checkSongDntLogin(id, requestId) {
      const self = this
      this.isLoading = true
      console.log('[PlayerLoading]', { action: 'start', songId: id, requestId })
      return new Promise(resolve => {
        // 未登录用户也走完整 fallback 链 (v1 → /song/url → /song/url/match)
        self.getSongUrl(id, requestId).then(res => {
          if (res && res.cancelled) { self.isLoading = false; self.showPlayerPending = false; resolve({ cancelled: true }); return }
          if (requestId !== self.playRequestId) { self.isLoading = false; self.showPlayerPending = false; resolve({ cancelled: true }); return }
          const data = res && res.data && res.data.data
          const url = data && data[0] && data[0].url
          if (url) {
            self.sel.src = url
            self.audioLastSrc = url
            self.audioRetryCount = 0
            self.audioUseProxy = false
            self.sel.load()
            resolve()
            return
          }
          // 所有 fallback 均失败 → 查询 song detail 判断原因，然后自动切下一首
          self.$axios.get('/song/detail?ids=' + id).then(detailRes => {
            if (requestId !== self.playRequestId) { resolve({ cancelled: true }); return }
            const fee = detailRes.data && detailRes.data.songs && detailRes.data.songs[0] && detailRes.data.songs[0].fee
            if (fee === 1) self.$message.warning("VIP歌曲，尝试解锁失败")
            else if (fee === 4) self.$message.warning("专辑歌曲，暂无资源")
            else self.$message.warning("暂无可用音源")
            self.isLoading = false
            resolve("no_url")
            if (self._inPlaylist()) self.nextSong()
          }).catch(() => {
            self.isLoading = false
            console.warn('[PlayerLoading]', { action: 'error', songId: id, requestId })
            if (requestId === self.playRequestId) self.$message.warning("暂无可用音源")
            resolve("no_url")
            if (self._inPlaylist()) self.nextSong()
          })
        }).catch(err => {
          if (err && err.message === 'REQUEST_CANCELLED') { self.isLoading = false; resolve({ cancelled: true }); return }
          console.error('[PlayError]', { songId: id, stage: 'DNT_LOGIN_FAIL', error: err && err.message || String(err) })
          self.isLoading = false
          if (requestId === self.playRequestId) self.$message.warning("暂无可用音源")
          resolve("dnt_fail")
          if (self._inPlaylist()) self.nextSong()
        })
      })
    },
    checkSongLoggedIn(id, requestId) {
      const self = this
      this.isLoading = true
      console.log('[PlayerLoading]', { action: 'start', songId: id, requestId })
      return new Promise(resolve => {
        self.getSongUrl(id, requestId).then(res => {
          if (res && res.cancelled) { self.isLoading = false; resolve({ cancelled: true }); return }
          if (requestId !== self.playRequestId) { self.isLoading = false; resolve({ cancelled: true }); return }
          const data = res && res.data && res.data.data
          const item = data && data[0]
          const newUrl = item && item.url
          if (newUrl) {
            console.log('%c✅ 播放就绪 %cid=%s', 'background:#059669;color:#fff;padding:2px 6px', '', id)
            self.sel.src = newUrl
            self.audioLastSrc = newUrl
            self.audioRetryCount = 0
            self.audioUseProxy = false
            self.sel.load()
            resolve()
            return
          }
          // 所有 fallback 均失败 → 查询 song detail 判断原因，然后自动切下一首
          self.$axios.get('/song/detail?ids=' + id).then(detailRes => {
            if (requestId !== self.playRequestId) { resolve({ cancelled: true }); return }
            const fee = detailRes.data && detailRes.data.songs && detailRes.data.songs[0] && detailRes.data.songs[0].fee
            if (fee === 1) self.$message.warning("VIP歌曲，尝试解锁失败")
            else if (fee === 4) self.$message.warning("专辑歌曲，暂无资源")
            else self.$message.warning("暂无可用音源")
            self.isLoading = false
            resolve("no_url")
            if (self._inPlaylist()) self.nextSong()
          }).catch(() => {
            self.isLoading = false
            console.warn('[PlayerLoading]', { action: 'error', songId: id, requestId })
            if (requestId === self.playRequestId) self.$message.warning("暂无可用音源")
            resolve("no_url")
            if (self._inPlaylist()) self.nextSong()
          })
        }).catch(err => {
          if (err && err.message === 'REQUEST_CANCELLED') { self.isLoading = false; resolve({ cancelled: true }); return }
          const isNoResource = err && err.message === 'NO_RESOURCE'
          self.isLoading = false
          console.error('[PlayError]', { songId: id, stage: isNoResource ? 'NO_RESOURCE' : 'NETWORK_ERROR', requestId, error: err && err.message || String(err) })
          if (requestId !== self.playRequestId) self.$message.warning(isNoResource ? "暂无可用音源" : "播放失败，请稍后重试")
          resolve("url_fail")
        })
      })
    },

    getSongUrl(id, requestId, br = 0) {
      if (requestId !== this.playRequestId) return Promise.resolve({ cancelled: true })

      const cachedUrl = getAudioCache(id)
      if (cachedUrl) {
        if (requestId !== this.playRequestId) return Promise.resolve({ cancelled: true })
        return Promise.resolve({ data: { data: [{ url: cachedUrl }] } })
      }

      const preferred = config.player.level
      const levels = config.player.fallbackLevels
        ? config.player.qualityLevels.slice(config.player.qualityLevels.indexOf(preferred))
        : [preferred]

      console.log('%c▶ 获取音源 %c/song/url/v1?id=%s&level=%s&unblock=true', 'background:#059669;color:#fff;padding:2px 6px', '', id, preferred)

      // fallback br 根据 level 映射 (仅 /song/url 兜底时使用)
      const BR_MAP = { hires: 999000, lossless: 999000, exhigh: 320000, higher: 192000, standard: 128000 }
      const fallbackBr = br || BR_MAP[preferred] || 320000

      const self = this
      const CACHE_TTL = 10 * 60 * 1000

      const tryLevel = (index) => {
        if (requestId !== self.playRequestId) return Promise.resolve({ cancelled: true })
        if (index >= levels.length) {
          return self.requestFallbackUrl(id, fallbackBr, requestId).catch(() => {
            return self.requestMatchSongUrl(id, requestId)
          })
        }

        const lv = levels[index]
        const ck = id + '_' + lv
        const cached = self.urlCache.get(ck)
        if (cached && Date.now() < cached.expire) {
          if (requestId !== self.playRequestId) return Promise.resolve({ cancelled: true })
          self.currentQuality = { requested: preferred, actual: lv }
          return Promise.resolve({ data: { data: [{ url: cached.url }] } })
        }

        return self.$axios('/song/url/v1', {
          params: { id, level: lv, unblock: true, timestamp: Date.now() }
        }).then(res => {
          if (requestId !== self.playRequestId) return Promise.resolve({ cancelled: true })
          const d = res.data && res.data.data && res.data.data[0]
          const url = d && d.url
          if (!url) {
            console.log('%c↓ 降级 %s→%s', 'background:#d97706;color:#fff;padding:2px 6px', lv, levels[index + 1] || 'fallback')
            return tryLevel(index + 1)
          }
          self.urlCache.set(ck, { url, level: lv, br: d && d.br, size: d && d.size, expire: Date.now() + CACHE_TTL })
          setAudioCache(id, url)
          self.currentQuality = { requested: preferred, actual: lv }
          return res
        }).catch(err => {
          if (requestId !== self.playRequestId) return Promise.resolve({ cancelled: true })
          console.error('[PlayError]', { songId: id, stage: 'TRY_LEVEL_FAIL', level: lv, requestId, error: err && err.message || String(err) })
          return tryLevel(index + 1)
        })
      }

      return tryLevel(0)
    },
    requestFallbackUrl(id, br, requestId) {
      if (requestId !== this.playRequestId) return Promise.resolve({ cancelled: true })
      const ck = id + '_fallback'
      console.log('%c▶ 旧接口兜底 %c/song/url?id=%s&br=%s', 'background:#ea580c;color:#fff;padding:2px 6px', '', id, br)
      return this.$axios('/song/url', { params: { id, br } }).then(r => {
        if (requestId !== this.playRequestId) return Promise.resolve({ cancelled: true })
        const fbUrl = r.data && r.data.data && r.data.data[0] && r.data.data[0].url
        console.log('%c  %s %s', '', fbUrl ? '✅成功' : '❌失败', fbUrl ? '' : '→尝试match')
        if (!fbUrl) return Promise.reject(new Error('FALLBACK_EMPTY'))
        this.urlCache.set(ck, { url: fbUrl, level: 'fallback', expire: Date.now() + 10 * 60 * 1000 })
        return r
      }).catch(err => {
        console.error('[PlayError]', { songId: id, stage: 'FALLBACK_FAIL', requestId: this.playRequestId, reason: err && err.message || String(err) })
        throw err
      })
    },
    requestMatchSongUrl(id, requestId) {
      if (requestId !== this.playRequestId) return Promise.resolve({ cancelled: true })
      const ck = id + '_match'
      console.log('%c▶ 匹配解灰 %c/song/url/match?id=%s', 'background:#dc2626;color:#fff;padding:2px 6px', '', id)
      const cached = this.urlCache.get(ck)
      if (cached && Date.now() < cached.expire) {
        return Promise.resolve({ data: { data: [{ url: cached.url }] }, source: 'match' })
      }
      return this.$axios('/song/url/match', { params: { id } }).then(r => {
        if (requestId !== this.playRequestId) return Promise.resolve({ cancelled: true })
        const matchUrl = r.data && r.data.data && r.data.data[0] && r.data.data[0].url
        if (!matchUrl) return Promise.reject(new Error('NO_RESOURCE'))
        this.urlCache.set(ck, { url: matchUrl, level: 'match', source: 'match', expire: Date.now() + 10 * 60 * 1000 })
        return { data: r.data, source: 'match' }
      }).catch(err => {
        console.error('[PlayError]', { songId: id, stage: 'MATCH_FAIL', reason: err && err.message || String(err) })
        throw err
      })
    },
    initAudioByOuterUrl(id, requestId) {
      if (requestId !== this.playRequestId) return
      this.sel.src = location.origin + "/api/song/media/outer/url?id=" + id
      this.audioLastSrc = this.sel.src
      this.audioRetryCount = 0
      this.sel.load()
    },
    playSong() {
      const isCurrentEmpty = JSON.stringify(this.currentSong) === '{}'
      const playlistFirst = this.currentPlaylist[0]
      console.log('[SongState]', { action: 'playSong', isCurrentEmpty, currentSongId: this.currentSong.id || null, playlistFirstId: playlistFirst && playlistFirst.id || null, requestId: this.playRequestId })
      if (isCurrentEmpty && this.currentPlaylist.length) { console.trace('[CurrentSongSet] playSong_fallback'); this.currentSongSource = 'playlist'; this.currentSong = this.currentPlaylist[0] }
      if (!this.sel.src && this.currentSong.id) {
        this.isLoading = true
        this.playRequestId++
        this.pushPromise(this.checkSong(this.currentSong.id, this.playRequestId))
        return
      }
      this.isPlay = true
      console.log('%c[PlayCall] %csrc=%s ready=%s currentTime=%s', 'background:#2563eb;color:#fff;padding:2px 6px', '', this.sel.src ? 'SET' : 'EMPTY', this.sel.readyState, this.sel.currentTime)
      const playPromise = this.sel.play()
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.log('%c[AudioPlayError] %c%s', 'background:#dc2626;color:#fff;padding:2px 6px', '', err.name + ': ' + err.message)
          // 【修复】autoplay 拦截时回滚 isPlay，避免 UI 显示播放状态但实际未播
          if (err.name === 'NotAllowedError') {
            this.isPlay = false
            console.log('[AutoPlayBlocked] isPlay rolled back to false')
          }
        })
      }
    },
    pauseSong() { this.isPlay = false; this.sel.pause() },
    togglePlay() { this.onInteract(); console.trace('[PlaySongCall] togglePlay'); this.isPlay ? this.pauseSong() : this.playSong() },
    preSong() {
      this.onInteract()
      if (!this._inPlaylist()) return
      this.curIndex = this.getPrevIndex()
    },
    nextSong() {
      this.onInteract()
      if (this.isPersonalFM) {
        // FM 模式：未到末尾时顺序切，到末尾才触发 reactive 流程
        if (this.curIndex < this.currentPlaylist.length - 1) {
          this.curIndex = this.curIndex + 1
        } else {
          // 末尾：通知 PersonalFM 应用 staged batch（数据应已 prefetch 完毕）
          // curIndex 由 playFmNewBatch 在 staged 应用后推进
          pubsub.publish('getPersonalFM', new Date().getTime())
        }
        return
      }
      if (!this._inPlaylist()) return
      this.curIndex = this.getNextIndex()
    },
    // 当前歌曲是否在播放列表中（用于切歌判断，不依赖 source）
    _inPlaylist() {
      const id = this.currentSong && this.currentSong.id
      return id && this.currentPlaylist.findIndex(s => s.id === id) !== -1
    },
    // 自动播放到结尾触发：loop 模式重播当前曲
    _autoNext() {
      // 防止 song end 触发多次：timeNow watcher 在音频暂停前会持续触发 _autoNext
      // 第一次触发后加锁，$nextTick 后释放（覆盖同步过渡 + 残留 timeupdate 事件）
      if (this.autoNextLocked) return
      this.autoNextLocked = true
      this.$nextTick(() => {
        this.autoNextLocked = false
      })
      if (this.playMode === 'loop') { this._restartCurrent(); return }
      if (this.isPersonalFM) {
        // FM 模式：未到末尾时顺序切，到末尾才触发 reactive 流程
        if (this.curIndex < this.currentPlaylist.length - 1) {
          this.curIndex = this.curIndex + 1
        } else {
          // 末尾：通知 PersonalFM 应用 staged batch（proactive prefetch 应已就绪）
          // 若是首次 FM session（无 staged），PersonalFM 会同步 fetch + apply（有 ~200ms 静音）
          pubsub.publish('getPersonalFM', new Date().getTime())
        }
        return
      }
      if (!this._inPlaylist()) return
      this.curIndex = this.getNextIndex()
    },
    getNextIndex() {
      if (this.playMode === 'random') return this._nextShuffleIndex()
      return this.curIndex + 1 > this.currentPlaylist.length - 1 ? 0 : this.curIndex + 1
    },
    getPrevIndex() {
      if (this.playMode === 'random') return this._prevShuffleIndex()
      return this.curIndex - 1 < 0 ? this.currentPlaylist.length - 1 : this.curIndex - 1
    },
    // 随机播放洗牌序列：Fisher-Yates 打乱，当前曲放首位，保证一轮内每首只播一次
    _initShuffle() {
      const len = this.currentPlaylist.length
      if (!len) { this.shuffleOrder = []; this.shufflePos = -1; return }
      const order = Array.from({ length: len }, (_, i) => i)
      for (let i = len - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const t = order[i]; order[i] = order[j]; order[j] = t
      }
      const curIdx = order.indexOf(this.curIndex)
      if (curIdx > 0) {
        order.splice(curIdx, 1)
        order.unshift(this.curIndex)
      }
      this.shuffleOrder = order
      this.shufflePos = 0
      console.log('[Shuffle]', { action: 'init', cur: this.curIndex, len, order: this.shuffleOrder.join(',') })
    },
    _nextShuffleIndex() {
      if (this.shuffleOrder.length !== this.currentPlaylist.length || this.shufflePos === -1) this._initShuffle()
      this.shufflePos = (this.shufflePos + 1) % this.shuffleOrder.length
      return this.shuffleOrder[this.shufflePos]
    },
    _prevShuffleIndex() {
      if (this.shuffleOrder.length !== this.currentPlaylist.length || this.shufflePos === -1) this._initShuffle()
      this.shufflePos = (this.shufflePos - 1 + this.shuffleOrder.length) % this.shuffleOrder.length
      return this.shuffleOrder[this.shufflePos]
    },
    _restartCurrent() {
      this.onInteract()
      if (this.sel) {
        try {
          this.sel.currentTime = 0
          if (!this.isPlay) this.playSong()
        } catch (e) { /* ignore */ }
      }
    },
    togglePlayMode() {
      const order = ['order', 'random', 'loop']
      const idx = order.indexOf(this.playMode)
      this.playMode = order[(idx + 1) % order.length]
      if (this.playMode === 'random') {
        this._initShuffle()
      } else {
        this.shuffleOrder = []
        this.shufflePos = -1
      }
      try { localStorage.setItem('acmusic_play_mode', this.playMode) } catch (e) { /* ignore */ }
      console.log('[PlayMode]', { mode: this.playMode })
    },
    toggleLike() { this.onInteract(); this.isLiked = !this.isLiked },
    showSongDetail() { if (!this.currentSong.isVoice) this.$emit('SDClk', this.currentSong) },
    onMouseEnter() { this.clearHideTimer(); this.showBar = true },
    onMouseLeave() { this.scheduleHide() },
    onMouseMove() { this.clearHideTimer(); if (!this.showBar) this.showBar = true },
    onInteract() { this.clearHideTimer() },
    onQualitySelect(key) {
      const oldLevel = this.currentLevel
      const oldSrc = this.sel.src
      console.log('[QualitySwitch]', { action: 'select', oldLevel, newLevel: key, songId: this.currentSong.id, oldSrc: oldSrc ? oldSrc.slice(0, 80) : '', playRequestId: this.playRequestId })
      config.player.level = key
      this.currentLevel = key
      localStorage.setItem('acmusic_player_quality', JSON.stringify({ level: key }))
      this.showQualityMenu = false
      if (this.currentSong.id) {
        this.pauseSong()
        this.sel.src = ''
        this.pendingUrlRequests.clear()
        for (const lv of config.player.qualityLevels) {
          this.urlCache.delete(this.currentSong.id + '_' + lv)
        }
        this.urlCache.delete(this.currentSong.id + '_fallback')
        this.playRequestId++
        this.pushPromise(this.checkSong(this.currentSong.id, this.playRequestId))
      }
    },
    onDropdownToggle(visible) {
      this.isDropdownOpen = visible
      if (visible) {
        this.clearHideTimer()
        this.$nextTick(() => this._scrollActiveSong('open'))
      } else {
        this.scheduleHide()
      }
    },
    _scrollActiveSong(reason) {
      setTimeout(() => {
        const container = document.querySelector('.plItems')
        const active = container && container.querySelector('.el-dropdown-menu__item.active')
        if (!active) {
          console.log('[PlaylistScroll]', { action: 'missing', songId: this.currentSong.id })
          return
        }
        const idx = this.currentPlaylist.findIndex(s => s.id === this.currentSong.id)
        console.log('[PlaylistScroll]', { action: reason || 'change', songId: this.currentSong.id, index: idx })
        container.scrollTop = active.offsetTop - container.clientHeight / 2 + active.clientHeight / 2
      }, 100)
    },
    scheduleHide() {
      if (this.isDropdownOpen) return
      this.clearHideTimer()
      this.hideTimer = setTimeout(() => { this.showBar = false; this.showVolume = false }, this.isPlay ? 10000 : 10000)
    },
    clearHideTimer() { if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null } },
    formatTime(s) {
      s = s * 1; if (!s || isNaN(s) || !isFinite(s)) return '00:00'
      return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(Math.floor(s % 60)).padStart(2, '0')
    },
    onProgressClick(evt) {
      this.onInteract()
      const el = this.$refs.barTrack || this.$refs.miniTrack
      if (!el || !this.timeDuration) return
      const rect = el.getBoundingClientRect()
      this.sel.currentTime = Math.max(0, Math.min(1, (evt.clientX - rect.left) / rect.width)) * this.timeDuration
    },
    startDrag(evt) {
      this.onInteract()
      if (!this.timeDuration) return
      const onMove = (e) => {
        const el = this.$refs.barTrack; if (!el) return
        const rect = el.getBoundingClientRect()
        this.sel.currentTime = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * this.timeDuration
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', () => { document.removeEventListener('mousemove', onMove); this.scheduleHide() }, { once: true })
      evt.preventDefault()
    },
    handleCommand(s) { this.onInteract(); this.showPlayerPending = true; this.isLoading = true; console.trace('[HandleCommandCall]'); console.log('[SongState]', { action: 'handleCommand', songId: s && s.id, requestId: this.playRequestId }); this.playIntentId++; this.playContextId++; this.currentSongSource = 'playlist'; this.currentPlaySourceLocked = true; this.playlistContextId = this.playContextId; console.log('[SourceChange]', { to: 'playlist', songId: s && s.id, trigger: 'handleCommand' }); console.trace('[CurrentSongSet] handleCommand', s && s.id); this.currentSong = s },
    playAllSong(msgName, mode = "order") {
      this.showPlayerPending = true
      this.isLoading = true
      this.playIntentId++
      this.playContextId++
      if (mode === "random") { console.trace('[CurrentSongSet] playAllSong_random'); this.currentSong = this.currentPlaylist[Math.ceil(Math.random() * (this.currentPlaylist.length - 1))] }
      else { console.trace('[CurrentSongSet] playAllSong'); this.currentSong = this.currentPlaylist[0] }
      this.currentPlaySourceLocked = true
      this.playlistContextId = this.playContextId
      this.currentSongSource = 'playlist'
      console.log('[SongState]', { action: 'playAllSong', currentSongId: this.currentSong.id, mode, requestId: this.playRequestId })
    },
    /**
     * FM 续播：PersonalFM 拉取新批次成功后，publish 'fmNewBatch' 并附带 startIndex
     * 这里把 curIndex 推进到 startIndex，让 watch 链路自动加载并播放新曲
     */
    /**
     * FM 续播：PersonalFM 在 reactive 路径下完成 REPLACE_PLAYLIST 后 publish 'fmNewBatch'
     * 此时把 curIndex 推进到 startIndex（替换模式下永远传 0），让 watch 链路加载并播放新曲
     * proactive 路径不调用此方法（PersonalFM 只 SET_FM_STAGED_BATCH，不 publish fmNewBatch）
     */
    playFmNewBatch(msgName, startIndex) {
      if (!this.isPersonalFM) return
      if (typeof startIndex !== 'number' || startIndex < 0) return
      if (startIndex >= this.currentPlaylist.length) return
      this.curIndex = startIndex
    },
    clearPlaylist() {
      this.$confirm('确定清空全部播放歌曲？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        const prevLen = this.currentPlaylist.length
        console.log('[PlaylistEmpty]', { action: 'clear', previousLength: prevLen })
        this.pauseSong()
        this.$bus.$emit("clearPlaylist")
        this.$message.success('播放列表已清空')
      }).catch(() => {})
    },
    addEventListeners() {
      this.sel.addEventListener('timeupdate', this._currentTime)
      this.sel.addEventListener('canplay', this._durationTime)
      this.sel.addEventListener('pause', this._onPause)
      this.sel.addEventListener('progress', this._onProgress)
      this.sel.addEventListener('error', this._onAudioError)
    },
    removeEventListeners() {
      this.sel.removeEventListener('timeupdate', this._currentTime)
      this.sel.removeEventListener('canplay', this._durationTime)
      this.sel.removeEventListener('pause', this._onPause)
      this.sel.removeEventListener('progress', this._onProgress)
      this.sel.removeEventListener('error', this._onAudioError)
    },
    _currentTime() {
      if (this.sel) {
        this.timeNow = (this.sel.currentTime).toFixed(4)
        if (this.currentSong && this.currentSong.id) {
          const now = Date.now()
          if (now - this.lastSaveTime > 5000) {
            this.lastSaveTime = now
            this._saveState()
          }
        }
      }
    },
    _durationTime() {
      if (this.sel) {
        this.audioRetryCount = 0
        this.isLoading = false
        this.showPlayerPending = false
        console.log('[PlayerLoading]', { action: 'ready', songId: this.currentSong.id, requestId: this.playRequestId })
        console.log('%c[AudioReady] %cduration=%s', 'background:#7c3aed;color:#fff;padding:2px 6px', '', this.sel.duration)
        this.timeDuration = this.sel.duration
        if (this.hasRestoreProgress && this.currentSong.id && this.currentSong.id === this.restoreSongId && this.resumeTime > 0) {
          console.log('[PlayerState] seek_restore', { songId: this.currentSong.id, currentTime: this.resumeTime })
          this.sel.currentTime = this.resumeTime
          this.timeNow = this.resumeTime
          this.hasRestoreProgress = false
          this.resumeTime = 0
          this.restoreSongId = null
        }
        this._preloadNext()
      }
    },
    _onPause() {
      if (this.currentSong.id) this._saveState()
    },
    _onProgress() {
      try {
        const b = this.sel.buffered
        if (b && b.length) {
          this.bufferedTime = b.end(b.length - 1)
        }
      } catch (e) { /* ignore */ }
    },
    _onAudioError() {
      const curSrc = this.sel.src || this.audioLastSrc
      if (!curSrc) return
      // 直连模式: 重试3次后降级到代理
      if (!this.audioUseProxy && this.audioRetryCount >= 3) {
        this.audioUseProxy = true
        this.audioRetryCount = 0
        const proxySrc = this._toProxyUrl(curSrc)
        console.log('[AudioRetry]', { action: 'downgrade_to_proxy', songId: this.currentSong.id, src: proxySrc.slice(0, 60) })
        this.sel.src = proxySrc
        this.audioLastSrc = proxySrc
        setTimeout(() => {
          try { this.sel.load(); if (this.isPlay) { const p = this.sel.play(); if (p && p.catch) p.catch(() => {}) } } catch (e) { /* ignore */ }
        }, 400)
        return
      }
      // 代理模式: 重试3次后放弃
      if (this.audioUseProxy && this.audioRetryCount >= 3) {
        this.audioRetryCount = 0
        this.audioUseProxy = false
        console.log('[AudioRetry]', { action: 'giveup', songId: this.currentSong.id })
        return
      }
      this.audioRetryCount++
      console.log('[AudioRetry]', { action: 'retry', attempt: this.audioRetryCount, mode: this.audioUseProxy ? 'proxy' : 'direct', songId: this.currentSong.id })
      setTimeout(() => {
        try { this.sel.load(); if (this.isPlay) { const p = this.sel.play(); if (p && p.catch) p.catch(() => {}) } } catch (e) { /* ignore */ }
      }, 400)
    },
    _toProxyUrl(src) {
      if (src && src.indexOf('/api/audio-proxy') !== -1) return src
      return location.origin + '/api/audio-proxy?url=' + encodeURIComponent(src)
    },
    _saveState() {
      const s = this.currentSong
      if (!s || !s.id) return
      try {
        const playlist = this.currentPlaylist.slice(0, 200).map(t => ({
          id: t.id,
          name: t.name || '',
          artists: (t.ar || t.artists || []).map(a => a.name).join(' / '),
          album: (t.al && t.al.name) || (t.album && t.album.name) || '',
          picUrl: (t.al && t.al.picUrl) || (t.album && t.album.picUrl) || '',
          duration: t.dt || t.duration || 0,
          source: t.source || ''
        }))
        localStorage.setItem('acmusic_player_state', JSON.stringify({
          song: {
            id: s.id,
            name: s.name || '',
            cover: (s.al && s.al.picUrl) || (s.album && s.album.picUrl) || '',
            artists: (s.ar || s.artists || []).map(a => a.name).join(' / ')
          },
          playlist,
          currentIndex: this.curIndex,
          currentTime: (this.timeNow * 1) || this.sel.currentTime || 0,
          duration: this.sel.duration || 0,
          quality: this.currentQuality,
          source: this.currentSongSource,
          playMode: this.playMode,
          timestamp: Date.now()
        }))
        console.log('[PlaylistPersist]', { action: 'save', count: playlist.length })
      } catch (e) { /* ignore */ }
    },
    _preloadNext() {
      if (this.currentSongSource !== 'playlist') return
      if (this.playMode === 'random') return
      const nextIdx = this.curIndex + 1
      if (nextIdx >= this.currentPlaylist.length) return
      const nextSong = this.currentPlaylist[nextIdx]
      if (!nextSong || !nextSong.id) return
      console.log('[AudioPreload]', { action: 'start', songId: nextSong.id })
      getAudioUrl(nextSong.id, () => {
        return this.getSongUrl(nextSong.id, this.playRequestId + 1).then(res => {
          const url = res && res.data && res.data.data && res.data.data[0] && res.data.data[0].url
          return url || null
        })
      }).catch(() => { /* silent */ })
    },
    _restoreState() {
      try {
        const raw = localStorage.getItem('acmusic_player_state')
        if (!raw) return
        const data = JSON.parse(raw)
        if (Date.now() - data.timestamp > 7 * 24 * 60 * 60 * 1000) {
          localStorage.removeItem('acmusic_player_state')
          return
        }
        if (data.playlist && data.playlist.length) {
          const deduped = []
          const seen = new Set()
          for (const t of data.playlist) {
            if (seen.has(t.id)) continue
            seen.add(t.id)
            // 补全为 PlayerCore 期望的完整结构
            deduped.push({
              id: t.id,
              name: t.name || '',
              artists: t.artists || '',
              ar: t.artists ? [{ name: t.artists }] : [],
              album: t.album || '',
              al: { name: t.album || '', picUrl: t.picUrl || '' },
              picUrl: t.picUrl || '',
              dt: t.duration || 0,
              duration: t.duration || 0,
              source: t.source || ''
            })
          }
          this.$store.commit('TracksAbout/REPLACE_PLAYLIST', deduped)
          console.log('[PlaylistPersist]', { action: 'restore', count: deduped.length })
        }
        if (data.playMode && ['order', 'random', 'loop'].indexOf(data.playMode) !== -1) {
          this.playMode = data.playMode
        }
        if (data.song && data.song.id) {
          this.isRestoring = true
          this.playContextId++
          this.playlistContextId = this.playContextId
          this.currentSongSource = 'restore'
          this.currentPlaySourceLocked = true
          if (data.currentIndex !== undefined) this.curIndex = data.currentIndex
          console.log('[PlaylistRestore]', { currentSongId: data.song.id, currentIndex: data.currentIndex })
          console.trace('[CurrentSongSet] restore', data.song.id)
          this.currentSong = {
            id: data.song.id,
            name: data.song.name,
            al: { picUrl: data.song.cover },
            ar: [{ name: data.song.artists }]
          }
          this.showBar = true
        }
        if (data.currentTime > 0) {
          this.resumeTime = data.currentTime
          this.hasRestoreProgress = true
          this.restoreSongId = data.song ? data.song.id : null
          this.timeNow = data.currentTime
          console.log('[PlayerState] restore', { songId: this.restoreSongId, resumeTime: this.resumeTime })
        }
        if (data.duration) this.timeDuration = data.duration
        if (data.quality) this.currentQuality = data.quality

        // 【关键修复】恢复完成后，同步 curIndex 到正确歌曲位置，再解除守卫
        // 原因：恢复时直接赋值 currentSong（不触发 watcher），但 curIndex 默认为 0，
        // 如果恢复的歌曲不在 index=0，curIndex watcher 会把它错误覆盖成 playlist[0]。
        // 此处用 $nextTick 在 curIndex watcher 之后执行，确保 curIndex 与 currentSong 一致。
        this.$nextTick(() => {
          if (data.song && data.song.id) {
            const savedIdx = this.currentPlaylist.findIndex(s => s.id === data.song.id)
            if (savedIdx !== -1) {
              this.curIndex = savedIdx
              console.log('[RestoreSync] curIndex aligned to', savedIdx)
            }
          }
          this.isRestoring = false
          this.currentSongSource = 'playlist'
          if (this.playMode === 'random') this._initShuffle()
        })
      } catch (e) { /* ignore */ }
    },
  },
  beforeMount() { this.sel = new Audio() },
  mounted() {
    this._restoreState()
    try {
      const savedMode = localStorage.getItem('acmusic_play_mode')
      if (savedMode && ['order', 'random', 'loop'].indexOf(savedMode) !== -1) this.playMode = savedMode
    } catch (e) { /* ignore */ }
    this.addEventListeners()
    this.pubId = pubsub.subscribe('playAll', this.playAllSong)
    this.fmBatchId = pubsub.subscribe('fmNewBatch', this.playFmNewBatch)
    this._onBeforeUnload = () => { this._saveState() }
    window.addEventListener('beforeunload', this._onBeforeUnload)
  },
  beforeDestroy() {
    window.removeEventListener('beforeunload', this._onBeforeUnload)
    this._saveState()
    this.removeEventListeners(); this.init(); this.clearHideTimer(); pubsub.unsubscribe(this.pubId); pubsub.unsubscribe(this.fmBatchId)
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/scss/base/motion";
$bar-h: 60px; $mini-h: 4px; $accent: #8685EF;
$bg: #1c1d28; $text: rgba(255,255,255,0.9); $text-sec: rgba(255,255,255,0.44); $text-ter: rgba(255,255,255,0.24);
$border: rgba(255,255,255,0.06); $radius: 12px;

.playerPanel {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
  &.hasSong { display: block; }
  .fullBar {
    display: flex; align-items: center; height: $bar-h;
    background: linear-gradient(180deg, rgba($bg, 0.94) 0%, rgba(darken($bg, 3%), 0.98) 100%);
    border-top: 1px solid $border;
    box-shadow: 0 -4px 24px rgba(0,0,0,0.28);
    padding: 0 20px; gap: 10px;
    backdrop-filter: blur(20px);
    animation: slideUp 260ms cubic-bezier(0.22,0.61,0.36,1);
    transition: background 500ms ease;
  }
}

.miniBar {
  position: fixed; bottom: 0; left: 0; right: 0; height: 28px; z-index: 101; cursor: pointer;
  .miniTrack {
    position: absolute; bottom: 0; left: 0; right: 0; height: $mini-h;
    background: rgba(255,255,255,0.05);
    transition: height 180ms ease;
    .miniFill {
      height: 100%;
      background: linear-gradient(90deg, $accent, lighten($accent, 6%));
      border-radius: 0 2px 2px 0;
      transition: width 0.1s linear;
      box-shadow: 0 0 8px rgba($accent, 0.2);
    }
  }
  &:hover .miniTrack { height: 6px; }
}

.playerPanel.expanded .miniBar { display: none; }

@keyframes slideUp {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

// Cover fade transition (歌曲切换时封面渐隐渐显)
.cover-fade-enter-active,
.cover-fade-leave-active {
  transition: opacity 240ms cubic-bezier(0.22,0.61,0.36,1), transform 240ms cubic-bezier(0.22,0.61,0.36,1);
}
.cover-fade-enter { opacity: 0; transform: scale(.94); }
.cover-fade-leave-to { opacity: 0; transform: scale(.94); }

// Song title/artist slide-up transition
.slide-up-enter-active,
.slide-up-leave-active {
  transition: opacity 220ms cubic-bezier(0.22,0.61,0.36,1), transform 220ms cubic-bezier(0.22,0.61,0.36,1);
}
.slide-up-enter { opacity: 0; transform: translateY(8px); }
.slide-up-leave-to { opacity: 0; transform: translateY(-8px); }

// Play/pause button swap transition
.btn-swap-enter-active,
.btn-swap-leave-active {
  transition: opacity 180ms cubic-bezier(0.22,0.61,0.36,1), transform 180ms cubic-bezier(0.22,0.61,0.36,1);
}
.btn-swap-enter { opacity: 0; transform: scale(.6); }
.btn-swap-leave-to { opacity: 0; transform: scale(.6); }

.barInfoInner { overflow: hidden; }

.barLeft {
  flex: 0 0 230px; width: 230px; display: flex; align-items: center; gap: 12px; min-width: 0;
  .barCover {
    width: 44px; height: 44px; border-radius: 8px; overflow: hidden; flex-shrink: 0; cursor: pointer;
    background: rgba(255,255,255,0.04); box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    img { width: 100%; height: 100%; object-fit: cover; }
    .coverPlaceholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: $text-sec; font-size: 16px; }
  }
  .barInfo {
    flex: 1; min-width: 0; cursor: pointer;
    p { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .barTitle { font-size: 14px; font-weight: 600; color: $text; line-height: 1.3; }
    .barArtist { font-size: 12px; color: $text-sec; line-height: 1.3; }
  }
  .likeBtn {
    font-size: 18px; color: $text-sec; cursor: pointer; flex-shrink: 0; padding: 5px;
    transition: all 200ms cubic-bezier(0.22,0.61,0.36,1);
    &:hover { color: $text; transform: scale(1.15); }
    &.liked { color: #ef4444; filter: drop-shadow(0 0 4px rgba(239,68,68,0.25)); }
  }
}

.barCenter {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 200px;
  .barControls {
    display: flex; align-items: center; gap: 16px; color: $text;
    .miniTrackBtn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 30px; height: 30px; border-radius: 50%;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.08);
      cursor: pointer;
      transition: all 180ms ease;
      color: rgba(255,255,255,0.6);
      &:hover { background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.9); transform: scale(1.08); }
      &:active { transform: scale(0.92); }
    }
    .modeBtn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 22px; height: 22px; cursor: pointer; color: rgba(255,255,255,0.4);
      transition: all 160ms ease; font-size: 13px;
      i { font-style: normal; }
      &.mode-random { color: $accent; }
      &.mode-loop { color: $accent; }
      &:hover { opacity: 0.9; transform: scale(1.1); }
    }
    .barPlay {
      width: 28px; height: 28px; border-radius: 50%; background: $accent; color: #fff;
      display: flex; align-items: center; justify-content: center; cursor: pointer;
      box-shadow: 0 2px 12px rgba($accent, 0.3);
      transition: all 200ms cubic-bezier(0.22,0.61,0.36,1);
      i { font-size: 17px; margin-left: 1px; }
      &:hover { transform: scale(1.1); box-shadow: 0 4px 18px rgba($accent, 0.45); }
      &:active { transform: scale(0.94); }
    }
    .player-loading-spinner {
      display: block;
      width: 14px; height: 14px;
      border: 2px solid rgba(255, 255, 255, .3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: player-loading-spin .8s linear infinite;
    }
    @keyframes player-loading-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  }
  .barProgress {
    width: 100%; max-width: 480px; display: flex; align-items: center; gap: 9px;
    .barTime { font-size: 11px; color: $text-ter; font-variant-numeric: tabular-nums; min-width: 34px; &:first-child { text-align: right; } }
    .barTrack {
      flex: 1; height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; cursor: pointer; position: relative;
      transition: height 160ms ease;
      &:hover { height: 6px; border-radius: 3px; }
      .barFill {
        height: 100%; background: $accent; border-radius: inherit; position: relative;
        transition: width 0.1s linear; box-shadow: 0 0 6px rgba($accent, 0.18);
        .barThumb {
          position: absolute; right: -8px; top: 50%; transform: translateY(-50%);
          width: 15px; height: 15px; background: #fff; border-radius: 50%;
          box-shadow: 0 1px 6px rgba(0,0,0,0.45); opacity: 0;
          transition: opacity 160ms ease; cursor: pointer;
        }
      }
      &:hover .barFill .barThumb { opacity: 1; }
    }
  }
}

.barRight {
  flex: 0 0 140px; width: 140px; display: flex; align-items: center; justify-content: flex-end; gap: 4px;
  .barItem {
    position: relative; cursor: pointer; color: $text-sec; display: flex; align-items: center;
    transition: color 160ms cubic-bezier(0.22,0.61,0.36,1);
    i { font-size: 16px; }
    &:hover { color: $text; }
  }
  .volumeWrap .volumeSlider {
    position: absolute; bottom: calc(100% + 12px); left: 50%; transform: translateX(-50%);
    display: flex; align-items: center; justify-content: center;
    background: #1f202b; border: 1px solid rgba(255,255,255,0.05);
    border-radius: 10px; padding: 14px 10px; box-shadow: 0 8px 32px rgba(0,0,0,0.45); z-index: 10;
    &::after {
      content: ''; position: absolute; top: 100%; left: 50%; margin-left: -6px;
      border-width: 6px 6px 0; border-style: solid;
      border-color: #1f202b transparent transparent;
    }
    input[type="range"] {
      writing-mode: vertical-lr; direction: rtl;
      width: 4px; height: 88px;
      -webkit-appearance: none; appearance: none;
      background: rgba(255,255,255,0.1); border-radius: 2px; outline: none; cursor: pointer;
      &::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #fff; cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.3); }
    }
  }
  .volume-pop-enter-active, .volume-pop-leave-active {
    transition: opacity 180ms ease, transform 180ms ease;
  }
  .volume-pop-enter, .volume-pop-leave-to {
    opacity: 0;
    transform: translateX(-50%) translateY(6px);
  }
  .playlistWrap .playlistTrigger {
    display: flex; align-items: center; gap: 3px;
    i { font-size: 16px; }
    .plCount { font-size: 10px; background: rgba(255,255,255,0.1); color: $text; border-radius: 8px; padding: 1px 5px; min-width: 14px; text-align: center; }
  }
  .qualityWrap .qualityBtn {
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.05);
    color: $text-sec;
    font-size: 11px; font-weight: 600;
    padding: 3px 7px; border-radius: 6px;
    cursor: pointer;
    line-height: 1.4;
    transition: all 180ms $ease-standard;
    &:hover { background: rgba(255, 255, 255, 0.1); color: $text; border-color: rgba(255, 255, 255, 0.18); }
  }
}

@media (max-width: 1024px) {
  .barLeft { flex: 0 0 180px; width: 180px; }
  .barRight { flex: 0 0 110px; width: 110px; }
}
@media (max-width: 768px) {
  .fullBar { padding: 0 10px; gap: 6px; }
  .barLeft { flex: 0 0 130px; width: 130px; .likeBtn { display: none; } }
  .barRight { flex: 0 0 auto; width: auto; .volumeWrap { display: none; } }
  .barCenter .barProgress { max-width: 280px; .barTime { display: none; } }
}
</style>

<style lang="scss">
/* global: playlist dropdown (teleported to body) */
.playlistDropdown {
  background: #1c1d29 !important;
  border: 1px solid rgba(255,255,255,0.05) !important;
  box-shadow: 0 16px 48px rgba(0,0,0,0.55) !important;
  border-radius: 14px !important;
  padding: 0 !important;
  min-width: 280px !important;
  max-width: 380px;
  max-height: 420px;
  overflow: hidden;

  .plHeader {
    display: flex; justify-content: space-between; align-items: center;
    padding: 14px 18px 8px;
    font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.85);

    .plTotal { font-size: 12px; font-weight: 400; color: rgba(255,255,255,0.3); }
  }

  .plActions {
    padding: 0 18px 8px;
    .el-button--text { color: rgba(255,255,255,0.3); font-size: 11px; padding: 3px 10px; border-radius: 10px;
      &:hover { color: #ef4444; background: rgba(239,68,68,0.08); }
    }
  }

  .plItems {
    max-height: 340px; overflow-y: auto;

    &::-webkit-scrollbar { width: 3px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 2px; }

    .el-dropdown-menu__item {
      display: flex; flex-direction: column; gap: 2px;
      padding: 10px 18px; color: rgba(255,255,255,0.55); font-size: 13px;
      transition: all 180ms ease; line-height: 1.3;
      overflow: hidden; min-width: 0;

      .plSongName { font-size: 13px; color: inherit; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .plSongArtist { font-size: 11px; color: rgba(255,255,255,0.25); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

      &:hover {
        background: rgba(255,255,255,.08); color: rgba(255,255,255,.96);
        .plSongArtist { color: rgba(255,255,255,.70); }
        transform: translateX(3px);
      }

      &.active {
        background: rgba(134,133,239,0.1);
        color: #8685EF; font-weight: 600;
        border-left: 2px solid #8685EF;
        .plSongArtist { color: rgba(134,133,239,0.5); }
      }
    }
  }

  .plEmpty {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 40px 18px; text-align: center; color: rgba(255,255,255,0.2); font-size: 13px;
    .plEmptyIcon { font-size: 32px; margin-bottom: 12px; opacity: .5; }
    p { margin: 0; line-height: 1.6; }
    .plEmptyHint { font-size: 11px; color: rgba(255,255,255,0.1); margin-top: 4px; }
  }
}

/* override element ui dropdown item hover */
.el-dropdown-menu__item:focus, .el-dropdown-menu__item:not(.is-disabled):hover {
  background-color: transparent !important;
}
</style>
