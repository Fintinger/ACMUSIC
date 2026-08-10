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
          <img v-if="coverUrl" :src="coverUrl | imgParam('200y200')" alt="" />
          <div v-else class="coverPlaceholder"><BaseIcon name="play"/></div>
        </div>
        <div class="barInfo" @click="showSongDetail">
          <p class="barTitle">{{ songName }}</p>
          <p class="barArtist">{{ artistNames }}</p>
        </div>
        <i :class="['likeBtn', { liked: isLiked }]" :title="isLiked?'取消收藏':'收藏'" @click.stop="toggleLike">
          <BaseIcon v-if="isLiked" name="likeFill"/>
          <BaseIcon v-else name="like"/>
        </i>
      </div>
      <div class="barCenter">
        <div class="barControls">
          <BaseIcon name="prev" @click="preSong"/>
          <div class="barPlay" @click="togglePlay">
            <BaseIcon v-if="!isPlay" name="play"/>
            <BaseIcon v-else name="pause"/>
          </div>
          <BaseIcon name="next" @click="nextSong"/>
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
          <div v-show="showVolume" class="volumeSlider" @click.stop>
            <input v-model="volume" type="range" min="0" max="100" @input="onInteract" />
          </div>
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
              <div v-if="!currentPlaylist.length" class="plEmpty">列表为空</div>
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

const FALLBACK_BG = '#1a1a2e'

export default {
  name: "PlayCore",
  props: ["song", "isExpand"],
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
    }
  },
  computed: {
    ...mapState('TracksAbout', ['currentPlaylist', 'isPersonalFM']),
    isLogin() { return this.$store.getters["UserAbout/isLogin"] },
    progress() { return (this.timeNow / this.timeDuration) * 100 || 0 },
    coverUrl() {
      const s = this.currentSong
      return (s.al && s.al.picUrl) || (s.album && s.album.picUrl) || ''
    },
    songName() { return this.currentSong.name || '未选择歌曲' },
    artistNames() {
      const s = this.currentSong
      const ar = s.ar || s.artists
      if (ar && ar.length) return ar.map(a => a.name).join(' / ')
      return ''
    },
  },
  watch: {
    song(val) {
      this.currentSong = normalizeTrack(val)
      this.updateMiniBackground()
    },
    currentSong(val) {
      if (val.id) {
        this.currentSong = normalizeTrack(this.currentSong)
        this.updateMiniBackground()
        this.pauseSong()
        this.pushPromise(this.checkSong(this.currentSong.id))
        this.curIndex = this.currentPlaylist.findIndex(item => item.id === this.currentSong.id) === -1
          ? 0 : this.currentPlaylist.findIndex(item => item.id === this.currentSong.id)
        if (this.currentPlaylist.findIndex(item => item.id === val.id) === -1) {
          this.$store.commit("TracksAbout/PUSH_PLAYLIST", val)
        }
        this.currentPlaylist.forEach(el => { el.curSong = el.id === val.id })
        this.$emit('songChange', val)
        this.$emit('getLyric', val.id)
        this.$emit('getSimi', val.id)
        this.$nextTick(() => this.scheduleHide())
      }
    },
    promiseList() {
      if (this.promiseList.length) {
        this.promiseList[0].then(() => { this.isPending = false; this.playSong() })
      }
    },
    curIndex(ind) { this.currentSong = this.currentPlaylist[ind] },
    timeNow(n) {
      this.isExpand && this.$emit('tUpdate', n)
      if (this.sel.currentTime === this.timeDuration) this.nextSong()
      if ((this.timeDuration - n) < 0.5 && this.sel.currentTime !== this.timeDuration) {
        this.sel.currentTime = this.timeDuration; this.pauseSong()
      }
    },
    volume(val) { this.sel.volume = val / 100 },
    isPersonalFM(val) {
      if (!val) this.$store.commit('TracksAbout/REPLACE_PLAYLIST', [this.currentSong])
    }
  },
  methods: {
    getArtistStr(s) {
      const ar = s.ar || s.artists
      return ar && ar.length ? ar.map(a => a.name).join(' / ') : ''
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
    async checkSong(id) {
      await new Promise(resolve => {
        if (this.isLogin) this.checkSongLoggedIn(id).then(res => resolve(res))
        else this.checkSongDntLogin(id).then(res => resolve(res))
      })
    },
    checkSongDntLogin(id) {
      return new Promise(resolve => {
        this.$axios.get('/song/detail?ids=' + id).then(res => {
          switch (res.data.songs[0].fee) {
            case 1: alert("VIP歌曲"); resolve("VIP歌曲"); break
            case 8: this.initAudioByOuterUrl(id); resolve("initAudioByOuterUrl"); break
            case 4: alert("购买专辑才能听"); resolve("购买专辑才能听"); break
            case 0: this.initAudioByOuterUrl(id); resolve("initAudioByOuterUrl"); break
            default: alert("未知错误"); resolve("未知错误"); break
          }
        })
      })
    },
    checkSongLoggedIn(id) {
      return new Promise(resolve => {
        this.$axios('/check/music', { params: { id } }).then(res => {
          if (res.data.success) {
            this.getSongUrl(id).then(res => { this.sel.src = res.data.data[0].url; resolve() })
              .catch(() => { this.checkSongDntLogin(id) })
          }
        }).catch(() => { alert("暂无版权！"); resolve("暂无版权！") })
      })
    },
    getSongUrl(id, br = 320000) {
      // 优先走新版接口: 支持音质等级 + 灰色歌曲解锁
      return this.$axios('/song/url/v1', {
        params: {
          id,
          level: config.player.level,
          unblock: true,
          timestamp: Date.now()
        }
      }).then(res => {
        const url = res.data && res.data.data && res.data.data[0] && res.data.data[0].url
        if (!url) {
          // v1 未返回可用地址 -> 回退旧接口
          return this.$axios('/song/url', { params: { id, br } })
        }
        return res
      }).catch(() => {
        // v1 报错 -> 回退旧接口
        return this.$axios('/song/url', { params: { id, br } })
      })
    },
    initAudioByOuterUrl(id) { this.sel.src = location.origin + "/api/song/media/outer/url?id=" + id },
    playSong() {
      if (JSON.stringify(this.currentSong) === "{}" && this.currentPlaylist.length) this.currentSong = this.currentPlaylist[0]
      this.isPlay = true; this.sel.play()
    },
    pauseSong() { this.isPlay = false; this.sel.pause() },
    togglePlay() { this.onInteract(); this.isPlay ? this.pauseSong() : this.playSong() },
    preSong() { this.onInteract(); this.curIndex = this.curIndex - 1 < 0 ? this.currentPlaylist.length - 1 : this.curIndex - 1 },
    nextSong() {
      this.onInteract()
      if (this.curIndex + 1 > this.currentPlaylist.length - 1) {
        if (this.isPersonalFM) pubsub.publish('getPersonalFM', new Date().getTime())
        else this.curIndex = 0
      } else this.curIndex += 1
    },
    toggleLike() { this.onInteract(); this.isLiked = !this.isLiked },
    showSongDetail() { if (!this.currentSong.isVoice) this.$emit('SDClk', this.currentSong) },
    onMouseEnter() { this.clearHideTimer(); this.showBar = true },
    onMouseLeave() { this.scheduleHide() },
    onMouseMove() { this.clearHideTimer(); if (!this.showBar) this.showBar = true },
    onInteract() { this.clearHideTimer() },
    onDropdownToggle(visible) {
      this.isDropdownOpen = visible
      if (visible) {
        this.clearHideTimer()
      } else {
        this.scheduleHide()
      }
    },
    scheduleHide() {
      if (this.isDropdownOpen) return
      this.clearHideTimer()
      this.hideTimer = setTimeout(() => { this.showBar = false; this.showVolume = false }, this.isPlay ? 2000 : 5000)
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
    handleCommand(s) { this.onInteract(); this.currentSong = s },
    playAllSong(msgName, mode = "order") {
      if (mode === "random") this.currentSong = this.currentPlaylist[Math.ceil(Math.random() * (this.currentPlaylist.length - 1))]
      else this.currentSong = this.currentPlaylist[0]
    },
    clearPlaylist() { this.pauseSong(); this.$bus.$emit("clearPlaylist") },
    addEventListeners() {
      this.sel.addEventListener('timeupdate', this._currentTime)
      this.sel.addEventListener('canplay', this._durationTime)
    },
    removeEventListeners() {
      this.sel.removeEventListener('timeupdate', this._currentTime)
      this.sel.removeEventListener('canplay', this._durationTime)
    },
    _currentTime() { if (this.sel) this.timeNow = (this.sel.currentTime).toFixed(4) },
    _durationTime() { if (this.sel) this.timeDuration = this.sel.duration },
  },
  beforeMount() { this.sel = new Audio() },
  mounted() {
    this.addEventListeners()
    this.pubId = pubsub.subscribe('playAll', this.playAllSong)
  },
  beforeDestroy() {
    this.removeEventListeners(); this.init(); this.clearHideTimer(); pubsub.unsubscribe(this.pubId)
  }
}
</script>

<style lang="scss" scoped>
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
    display: flex; align-items: center; gap: 22px; color: $text;
    > i { font-size: 20px; cursor: pointer; opacity: 0.5; transition: all 160ms ease; &:hover { opacity: 0.85; transform: scale(1.1); } }
    .barPlay {
      width: 28px; height: 28px; border-radius: 50%; background: $accent; color: #fff;
      display: flex; align-items: center; justify-content: center; cursor: pointer;
      box-shadow: 0 2px 12px rgba($accent, 0.3);
      transition: all 200ms cubic-bezier(0.22,0.61,0.36,1);
      i { font-size: 17px; margin-left: 1px; }
      &:hover { transform: scale(1.1); box-shadow: 0 4px 18px rgba($accent, 0.45); }
      &:active { transform: scale(0.94); }
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
    position: absolute; bottom: 44px; left: 50%; transform: translateX(-50%);
    background: #1f202b; border: 1px solid rgba(255,255,255,0.05);
    border-radius: 10px; padding: 12px 14px; box-shadow: 0 8px 32px rgba(0,0,0,0.45); z-index: 10;
    input[type="range"] {
      width: 80px; height: 4px; -webkit-appearance: none; appearance: none;
      background: rgba(255,255,255,0.1); border-radius: 2px; outline: none; cursor: pointer;
      &::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #fff; cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.3); }
    }
  }
  .playlistWrap .playlistTrigger {
    display: flex; align-items: center; gap: 3px;
    i { font-size: 16px; }
    .plCount { font-size: 10px; background: rgba(255,255,255,0.1); color: $text; border-radius: 8px; padding: 1px 5px; min-width: 14px; text-align: center; }
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
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;

      .plSongName { font-size: 13px; color: inherit; }
      .plSongArtist { font-size: 11px; color: rgba(255,255,255,0.25); }

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
    padding: 24px 18px; text-align: center; color: rgba(255,255,255,0.2); font-size: 13px;
  }
}

/* override element ui dropdown item hover */
.el-dropdown-menu__item:focus, .el-dropdown-menu__item:not(.is-disabled):hover {
  background-color: transparent !important;
}
</style>
