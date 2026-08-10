<template>
  <div ref="playerWindow" class="playerWrapper" :class="{ expandWindow: isExpand, hideFloatingBtn: isExpand && fsm === 'TOP' }" :style="{ background: bgStyle }" @keydown.esc="onEsc">
    <div class="mainWin">
      <PlayCore ref="pgPanel" :isExpand="isExpand" :song="song"/>
    </div>
    <transition
        name="player-expand"
        @enter="onExpandEnter"
        @after-enter="onExpandAfterEnter"
        @leave="onExpandLeave"
        @after-leave="onExpandAfterLeave"
    >
      <div v-if="isExpand" class="expandedOverlay" ref="scrollEl" @wheel="onWheel">
      <button class="closeBtn" @click="closePlayer" title="关闭 (Esc)">
        <BaseIcon name="close"/>
      </button>

      <section class="heroSection">
        <div class="heroLeft">
          <div class="coverWrapper">
            <div class="coverGlow"></div>
            <div class="coverArt">
              <img ref="coverImg" :src="coverUrl | imgParam('400y400')" alt="" @load="onCoverLoad" crossorigin="anonymous" />
            </div>
          </div>
          <div class="songMeta">
            <h1 class="songTitle">{{ songName }}</h1>
            <p class="songArtist" @click="arClick">{{ artistNames }}</p>
            <p v-if="albumName" class="songAlbum" @click="alClick">{{ albumName }}</p>
          </div>
          <div class="progressSection" ref="progressPanel">
            <div class="progressTrack" @click="progressClk">
              <div class="progressFill" :style="{ width: progressPercent + '%' }"><div class="progressThumb" @mousedown.stop="dragProgress"></div></div>
            </div>
            <div class="progressTimes"><span>{{ formatTime(timeNow) }}</span><span>{{ formatTime(duration) }}</span></div>
          </div>
          <div class="controlsRow">
            <BaseIcon name="prev" :size="20" @click="prevTrack"/>
            <div class="playBtn" @click="togglePlay"><BaseIcon v-if="!isPlaying" name="play"/><BaseIcon v-else name="pause"/></div>
            <BaseIcon name="next" :size="20" @click="nextTrack"/>
          </div>
          <div class="actionsRow">
            <button class="actionBtn" :class="{ active: isLiked }" @click="toggleLike"><BaseIcon :name="isLiked ? 'likeFill' : 'like'"/><span>{{ likedCount | Div1w }}</span></button>
            <button class="actionBtn" @click="shareSong"><BaseIcon name="share"/><span>分享</span></button>
          </div>
        </div>
        <div class="heroRight">
          <div class="rightTabs">
            <span :class="{ active: rightTab === 'lyric' }" @click="rightTab = 'lyric'"><BaseIcon name="radio"/> 歌词</span>
            <span :class="{ active: rightTab === 'tracks' }" @click="rightTab = 'tracks'"><BaseIcon name="play"/> 相似歌曲</span>
            <span :class="{ active: rightTab === 'playlist' }" @click="rightTab = 'playlist'"><BaseIcon name="share"/> 相似歌单</span>
          </div>
          <div class="rightContent">
            <div v-show="rightTab === 'lyric'" class="tabPanel">
              <div v-if="!lyric.length" class="panelEmpty"><p>暂无歌词</p><p class="emptyHint">纯音乐，请欣赏</p></div>
              <div v-else class="lyricsScroll" ref="lyricsScroll">
                <div class="lyricsInner">
                  <p v-for="(line, idx) in lyric" :key="idx" :class="{ active: line.cur, spacer: !line.lytxt || line.lytxt === '<br>' }" @click="lyricClick(line.t)" v-html="line.lytxt || '&nbsp;'"></p>
                </div>
              </div>
            </div>
            <div v-show="rightTab === 'tracks'" class="tabPanel">
              <div v-if="!simiTracks.length" class="panelEmpty"><p>暂无相似歌曲</p></div>
              <div v-else class="cardScroll"><div v-for="t in simiTracks" :key="t.id" class="musicCard" @click="playSimilarTrack(t)"><div class="cardCover"><img :src="trackAlbumPic(t) | imgParam('200y200')" loading="lazy" /><div class="cardOverlay"><BaseIcon name="play" :size="34"/></div></div><p class="cardTitle">{{ t.name }}</p><p class="cardSubtitle">{{ trackArtists(t) }}</p></div></div>
            </div>
            <div v-show="rightTab === 'playlist'" class="tabPanel">
              <div v-if="!simiPlaylist.length" class="panelEmpty"><p>暂无相似歌单</p></div>
              <div v-else class="cardScroll"><div v-for="pl in simiPlaylist" :key="pl.id" class="musicCard" @click="plClk(pl.id)"><div class="cardCover"><img :src="(pl.coverImgUrl || pl.picUrl) | imgParam('200y200')" loading="lazy" /><div class="cardOverlay"><BaseIcon name="play" :size="34"/></div></div><p class="cardTitle">{{ pl.name }}</p><p class="cardSubtitle">{{ pl.creator && pl.creator.nickname || '' }}</p></div></div>
            </div>
          </div>
        </div>
      </section>

      <section class="commentsSection" ref="commentsSection">
        <div class="sectionHeader" ref="commentsAnchor"><h2>评论</h2></div>
        <div ref="commentsContent">
          <CommentLayout :id="currentSong.id" type="0" @modal-open="onCommentModalOpen" @modal-close="onCommentModalClose"/>
        </div>
      </section>
    </div>
    </transition>

    <!-- Overlay buttons -->
    <button v-if="isExpand && fsm === 'TOP'" class="overlayBtn bottomBtn" @click="scrollToComments">
      <BaseIcon name="arrowDown"/> 查看评论
    </button>
    <button v-if="isExpand && fsm !== 'TOP'" class="overlayBtn topBtn" @click="scrollToTop">
      <BaseIcon name="arrowUp"/> 返回顶部
    </button>
  </div>
</template>

<script>
import PlayCore from "@/components/musicPlayer/PlayerCore";
import CommentLayout from "@/components/layout/CommentLayout";
import { buildBackground } from "@/utils/colorExtractor";

export default {
  name: "MusicPlayer",
  props: ['song'],
  components: { PlayCore, CommentLayout },
  data() {
    return {
      isExpand: false,
      isModalOpen: false,
      lyric: [],
      timeNow: 0,
      currentSong: {},
      simiTracks: [],
      simiPlaylist: [],
      isLiked: false,
      likedCount: 0,
      rightTab: 'lyric',
      lastActiveIdx: -1,
      bgStyle: 'linear-gradient(170deg, #1a1a2e 0%, #0f0f23 100%)',
      fsm: 'TOP',
      scrollObserver: null,
      wheelAccum: 0,
      transitioning: false,
    }
  },
  computed: {
    coverUrl() {
      const s = this.currentSong
      return (s.al && s.al.picUrl) || (s.album && s.album.picUrl) || ''
    },
    songName() { return this.currentSong.name || '未知歌曲' },
    artistNames() {
      const s = this.currentSong; const ar = s.ar || s.artists
      return (ar && ar.length) ? ar.map(a => a.name).join(' / ') : '未知歌手'
    },
    albumName() {
      const s = this.currentSong
      return (s.al && s.al.name) || (s.album && s.album.name) || ''
    },
    duration() { return this.$refs.pgPanel ? this.$refs.pgPanel.timeDuration * 1 : 0 },
    isPlaying() { return this.$refs.pgPanel ? this.$refs.pgPanel.isPlay : false },
    progressPercent() { return this.duration ? (this.timeNow / this.duration) * 100 : 0 },
  },
  watch: {
    isExpand(val) { val ? this.expanded() : this.minified() },
    timeNow(val) { this.needUpdate(val) },
    coverUrl(url) { if (url) this.$nextTick(() => this.updateBackground()) },
  },
  methods: {
    showSongDetail(data) {
      this.isExpand = true
      this.currentSong = data
      this.rightTab = 'lyric'
      this.lastActiveIdx = -1
      this.fsm = 'TOP'
      this.wheelAccum = 0
    },
    // Vue transition JS hooks (不依赖 transitionend/RAF, 更可靠)
    onExpandEnter(el, done) {
      el.style.opacity = 0
      el.style.transform = 'scale(.96) translateY(20px)'
      setTimeout(() => {
        el.style.transition = 'opacity 300ms cubic-bezier(.22,.61,.36,1), transform 300ms cubic-bezier(.22,.61,.36,1)'
        el.style.opacity = 1
        el.style.transform = 'scale(1) translateY(0)'
        setTimeout(done, 320)
      }, 20)
    },
    onExpandAfterEnter(el) {
      // 清除 transform, 避免 expandedOverlay 残留 transform 破坏内部 fixed 定位
      el.style.transition = ''
      el.style.opacity = ''
      el.style.transform = ''
    },
    onExpandLeave(el, done) {
      el.style.transition = 'opacity 300ms cubic-bezier(.22,.61,.36,1), transform 300ms cubic-bezier(.22,.61,.36,1)'
      el.style.opacity = 0
      el.style.transform = 'scale(.98) translateY(20px)'
      setTimeout(done, 320)
    },
    onExpandAfterLeave(el) {
      el.style.transition = ''
      el.style.opacity = ''
      el.style.transform = ''
    },
    expanded() {
      document.body.style.overflow = 'hidden'
      this.$refs.pgPanel.$on('tUpdate', this.timeUpdate)
      this.$nextTick(() => this.setupScrollObserver())
    },
    minified() {
      document.body.style.overflow = ''
      this.$refs.pgPanel.$off('tUpdate')
      if (this.scrollObserver) { this.scrollObserver.disconnect(); this.scrollObserver = null }
    },
    closePlayer() {
      if (this.isModalOpen) {
        this.isModalOpen = false
        return
      }
      this.isExpand = false
    },
    onEsc(e) {
      if (this.isModalOpen) {
        this.isModalOpen = false
        return
      }
      this.isExpand = false
    },
    onCommentModalOpen() { this.isModalOpen = true },
    onCommentModalClose() { this.isModalOpen = false },

    setupScrollObserver() {
      if (this.scrollObserver) this.scrollObserver.disconnect()
      const scroller = this.$refs.scrollEl
      if (!scroller) return
      this.scrollObserver = new IntersectionObserver(() => {
        if (this.transitioning || !scroller) return
        const top = scroller.scrollTop
        if (top <= 20 && this.fsm !== 'TOP') this.fsm = 'TOP'
      }, { threshold: [0, 0.01] })
      this.scrollObserver.observe(scroller)
    },

    onWheel(e) {
      const scroller = this.$refs.scrollEl
      if (!scroller) return
      if (this.transitioning) { e.preventDefault(); return }

      if (this.fsm === 'TOP' && e.deltaY > 0) {
        this.wheelAccum += e.deltaY
        if (this.wheelAccum > 50) { this.wheelAccum = 0; e.preventDefault(); this.scrollToComments() }
        return
      }

      if (this.fsm === 'BOTTOM_LOCK' && e.deltaY < 0) {
        const anchor = this.$refs.commentsAnchor
        if (!anchor) return
        const anchorTop = anchor.getBoundingClientRect().top + scroller.scrollTop
        const nearTop = scroller.scrollTop <= anchorTop + 100
        if (nearTop) {
          e.preventDefault()
          this.wheelAccum += Math.abs(e.deltaY)
          if (this.wheelAccum > 60) { this.wheelAccum = 0; this.fsm = 'RETURNING'; this.scrollToTop() }
          return
        }
      }
    },

    scrollToComments() {
      const anchor = this.$refs.commentsAnchor
      const scroller = this.$refs.scrollEl
      if (!anchor || !scroller) return
      this.transitioning = true; this.wheelAccum = 0
      const target = anchor.getBoundingClientRect().top + scroller.scrollTop
      const start = scroller.scrollTop; const dist = target - start
      const t0 = performance.now()
      const step = (now) => {
        const p = Math.min((now - t0) / 400, 1)
        scroller.scrollTop = start + dist * (1 - Math.pow(1 - p, 3))
        if (p < 1) requestAnimationFrame(step)
        else { this.fsm = 'BOTTOM_LOCK'; this.transitioning = false }
      }
      requestAnimationFrame(step)
    },

    scrollToTop() {
      const scroller = this.$refs.scrollEl
      if (!scroller) return
      this.transitioning = true; this.wheelAccum = 0
      const start = scroller.scrollTop
      const t0 = performance.now()
      const step = (now) => {
        const p = Math.min((now - t0) / 400, 1)
        scroller.scrollTop = start * (1 - (1 - Math.pow(1 - p, 3)))
        if (p < 1) requestAnimationFrame(step)
        else { this.fsm = 'TOP'; this.transitioning = false }
      }
      requestAnimationFrame(step)
    },

    onCoverLoad() { this.updateBackground() },
    updateBackground() {
      const img = this.$refs.coverImg
      if (!img || !img.complete) return
      this.bgStyle = buildBackground(img)
    },
    parseLyric(ly) {
      const allLine = ly.split("\n"); const resArr = []
      allLine.map(el => {
        let t = el.split("]")[0].replace('[', '').trim()
        let min = 0, s = 0, ms = 0
        if (t) {
          const parts = t.split(":")
          min = parts[0] * 1
          const secMs = parts[1] ? parts[1].split(".") : [0]
          s = secMs[0] * 1; ms = (secMs[1] || 0) * 1
        }
        t = min * 60 + s + ms / 1000
        const lytxt = el.split("]")[1] ? el.split("]")[1].trim() : "<br>"
        resArr.push({ t, lytxt, cur: false })
      })
      return resArr
    },
    getLyric(id) {
      this.lyric = []; this.lastActiveIdx = -1
      this.$axios.get('/lyric', { params: { id } }).then(res => {
        this.lyric = this.parseLyric(res.data.lrc.lyric)
      })
    },
    timeUpdate(t) { this.timeNow = t * 1 },
    lyricClick(t) {
      const panel = this.$refs.pgPanel
      if (!panel) return
      t + 0.1 > panel.timeDuration ? panel.sel.currentTime = panel.timeDuration : panel.sel.currentTime = t + 0.01
    },
    needUpdate(val) {
      if (!this.lyric[0]) return
      const temp = this.lyric.filter(ly => ly.t >= val)[0]
      let curIdx = -1
      this.lyric.forEach((ly, ind) => {
        if (!this.lyric[ind - 1]) return
        if (temp) {
          const isCur = temp.t === ly.t
          this.lyric[ind - 1].cur = isCur
          if (isCur) curIdx = ind - 1
        } else {
          this.lyric[this.lyric.length - 2].cur = true
          curIdx = this.lyric.length - 2
          this.lyric[this.lyric.length - 3].cur = false
        }
      })
      if (curIdx !== -1 && curIdx !== this.lastActiveIdx) {
        this.lastActiveIdx = curIdx
        this.$nextTick(() => {
          const container = this.$refs.lyricsScroll
          if (!container) return
          const active = container.querySelector('p.active')
          if (active) {
            const containerTop = container.scrollTop
            const targetTop = active.offsetTop - container.clientHeight / 2 + active.clientHeight / 2
            container.scrollTo({ top: targetTop, behavior: 'smooth' })
          }
        })
      }
    },
    getSimiTracks(id) { return this.$axios('/simi/song', { params: { id } }) },
    getSimiPlaylist(id) { return this.$axios('/simi/playlist', { params: { id } }) },
    concurrentRequestsGetSimi(id) {
      this.$axios.all([this.getSimiTracks(id), this.getSimiPlaylist(id)])
        .then(this.$axios.spread((tracks, list) => {
          this.simiTracks = tracks.data.songs || []
          this.simiPlaylist = list.data.playlists || []
        })).catch(err => { console.log(err.message) })
    },
    togglePlay() { const p = this.$refs.pgPanel; if (p) p.isPlay ? p.pauseSong() : p.playSong() },
    prevTrack() { if (this.$refs.pgPanel) this.$refs.pgPanel.preSong() },
    nextTrack() { if (this.$refs.pgPanel) this.$refs.pgPanel.nextSong() },
    toggleLike() { this.isLiked = !this.isLiked; this.isLiked ? this.likedCount++ : this.likedCount-- },
    shareSong() {},
    formatTime(s) { s = s * 1; if (!s || isNaN(s)) return '00:00'; const m = Math.floor(s / 60); return String(m).padStart(2, '0') + ':' + String(Math.floor(s % 60)).padStart(2, '0') },
    trackAlbumPic(t) { return (t.album && t.album.picUrl) || (t.al && t.al.picUrl) || '' },
    trackArtists(t) { const ar = t.ar || t.artists; return ar && ar.length ? ar.map(a => a.name).join(' / ') : '' },
    playSimilarTrack(t) { this.$bus.$emit('songClk', t) },
    arClick() { const ar = (this.currentSong.ar || this.currentSong.artists); if (ar && ar[0]) this.$bus.$emit('arClk', ar[0].id) },
    alClick() { const id = (this.currentSong.al && this.currentSong.al.id) || (this.currentSong.album && this.currentSong.album.id); if (id) this.$bus.$emit('alClk', id) },
    plClk(id) { this.$bus.$emit('plClk', id) },
    progressClk(evt) {
      const p = this.$refs.pgPanel; if (!p || !this.$refs.progressPanel) return
      const r = this.$refs.progressPanel.getBoundingClientRect()
      p.sel.currentTime = Math.max(0, Math.min(1, (evt.clientX - r.left) / r.width)) * this.duration
    },
    dragProgress(evt) {
      const p = this.$refs.pgPanel; if (!p || !this.$refs.progressPanel) return
      const onMove = (e) => { const r = this.$refs.progressPanel.getBoundingClientRect(); p.sel.currentTime = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * this.duration }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', () => document.removeEventListener('mousemove', onMove), { once: true })
      evt.preventDefault()
    },
  },
  mounted() {
    this.$refs.pgPanel.$on('SDClk', this.showSongDetail)
    this.$refs.pgPanel.$on('songChange', (s) => { this.currentSong = s; this.lastActiveIdx = -1 })
    this.$refs.pgPanel.$on('getLyric', this.getLyric)
    this.$refs.pgPanel.$on('getSimi', this.concurrentRequestsGetSimi)
  },
  beforeDestroy() {
    if (this.scrollObserver) this.scrollObserver.disconnect()
  }
}
</script>

<style lang="scss">
@import "../../assets/scss/base/variables";
@import "../../assets/scss/base/motion";

.playerWrapper {
  .expandedOverlay { display: none; }
}

// Expanded Player 进入/离开动画由 JS hooks (onExpandEnter/onExpandLeave) 控制
// (不使用 CSS transition/animation 类, 避免 Vue 2 走 CSS 模式依赖 transitionend)

.playerWrapper.expandWindow {
  position: fixed; inset: 0; z-index: 200;
  transition: background 500ms ease;

  .mainWin { display: none; }

  .expandedOverlay {
    display: block; width: 100%; height: 100%;
    overflow-y: auto; overflow-x: hidden;
    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.10); border-radius: 2px; }
  }

  .closeBtn {
    position: fixed; top: 28px; right: 36px; z-index: 20;
    width: 44px; height: 44px; border-radius: 50%;
    border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.05);
    color: rgba(255,255,255,0.5); font-size: 20px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    backdrop-filter: blur(12px); transition: all 220ms ease;
    &:hover { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.85); transform: scale(1.05); }
  }

  .heroSection {
    display: flex; align-items: center; min-height: 100vh;
    gap: 5%; padding: 60px 5% 60px 6%; box-sizing: border-box;
    max-width: 1400px; margin: 0 auto;
  }

  .heroLeft {
    flex: 0 0 32%; max-width: 360px; min-width: 260px;
    display: flex; flex-direction: column; align-items: center; gap: 18px;
  }

  .coverWrapper {
    position: relative; width: 260px; height: 260px; flex-shrink: 0;
  .coverGlow { position: absolute; inset: -30px; border-radius: 50%; background: radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%); filter: blur(50px); pointer-events: none; }
  .coverArt { position: relative; width: 100%; height: 100%; border-radius: 16px; overflow: hidden; box-shadow: 0 16px 48px rgba(0,0,0,0.35); img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .3s ease, opacity .3s ease; } }
  .coverArt img { transform: scale(1); opacity: 1; }
  }

  .songMeta {
    text-align: center; width: 100%;
    .songTitle { font-size: 24px; font-weight: 700; color: rgba(255,255,255,0.92); line-height: 1.3; margin: 0 0 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; padding: 0 8px; }
    .songArtist { font-size: 15px; font-weight: 500; color: rgba(255,255,255,0.5); cursor: pointer; margin: 0 0 3px; &:hover { color: #8685EF; } }
    .songAlbum { font-size: 13px; color: rgba(255,255,255,0.32); cursor: pointer; margin: 0; &:hover { color: rgba(255,255,255,0.5); } }
  }

  .progressSection {
    width: 100%; max-width: 300px;
    .progressTrack { width: 100%; height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; cursor: pointer; &:hover { height: 6px; }
      .progressFill { height: 100%; background: #8685EF; border-radius: inherit; position: relative; transition: width 0.1s linear; box-shadow: 0 0 8px rgba(134,133,239,0.2);
        .progressThumb { position: absolute; right: -6px; top: 50%; transform: translateY(-50%); width: 14px; height: 14px; background: #fff; border-radius: 50%; box-shadow: 0 1px 6px rgba(0,0,0,0.4); opacity: 0; transition: opacity 180ms ease; }
      }
      &:hover .progressFill .progressThumb { opacity: 1; }
    }
    .progressTimes { display: flex; justify-content: space-between; margin-top: 6px; font-size: 11px; color: rgba(255,255,255,0.28); font-variant-numeric: tabular-nums; }
  }

  .controlsRow {
    display: flex; align-items: center; justify-content: center; gap: 28px; color: rgba(255,255,255,0.85);
    > i { font-size: 24px; cursor: pointer; opacity: 0.55; transition: all 180ms ease; &:hover { opacity: 0.9; transform: scale(1.12); } }
    .playBtn { width: 32px; height: 32px; border-radius: 50%; background: #8685EF; color: #fff; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 20px rgba(134,133,239,0.35); transition: all 220ms ease; i { font-size: 20px; margin-left: 1px; } &:hover { transform: scale(1.06); box-shadow: 0 6px 28px rgba(134,133,239,0.5); } &:active { transform: scale(0.95); } }
  }

  .actionsRow {
    display: flex; gap: 10px;
    .actionBtn { display: flex; align-items: center; gap: 5px; padding: 7px 16px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.5); font-size: 12px; cursor: pointer; transition: all 180ms ease; i { font-size: 14px; } &:hover { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.8); } &.active { color: rgba(255,255,255,0.9); border-color: rgba(134,133,239,0.3); background: rgba(134,133,239,0.12); i { color: #ef4444; } } }
  }

  .heroRight { flex: 1; min-width: 0; align-self: stretch; display: flex; flex-direction: column; }

  .rightTabs {
    display: flex; border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0;
    span { padding: 12px 20px; font-size: 13px; color: rgba(255,255,255,0.35); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all 180ms ease; display: flex; align-items: center; gap: 5px; i { font-size: 14px; } &:hover { color: rgba(255,255,255,0.6); } &.active { color: rgba(255,255,255,0.88); font-weight: 600; border-bottom-color: #8685EF; } }
  }

  .rightContent { flex: 1; min-height: 0; overflow: hidden; padding-top: 16px; }
  .tabPanel { height: 100%; overflow: hidden; }

  .lyricsScroll {
    max-height: calc(70vh - 120px); height: calc(70vh - 120px);
    overflow-y: auto; position: relative;
    mask-image: linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%);
    -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%);
    &::-webkit-scrollbar { width: 4px; } &::-webkit-scrollbar-track { background: transparent; } &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
    .lyricsInner { padding: 40vh 0; }
    p { font-size: 16px; line-height: 2.5; color: rgba(255,255,255,0.28); text-align: center; cursor: pointer; transition: all 400ms cubic-bezier(0.22,0.61,0.36,1); margin: 0; padding: 0 16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; &:hover { color: rgba(255,255,255,0.45); } &.active { font-size: 26px; font-weight: 700; color: rgba(255,255,255,0.92); line-height: 2; } &.spacer { height: 10px; font-size: 0; } }
  }

  .panelEmpty { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 200px; color: rgba(255,255,255,0.28); p { margin: 0; font-size: 15px; } .emptyHint { font-size: 13px; opacity: 0.5; margin-top: 6px; } }

  .cardScroll { display: flex; gap: 14px; overflow-x: auto; padding: 8px 0; scroll-snap-type: x mandatory; height: 100%; align-content: flex-start; flex-wrap: wrap; &::-webkit-scrollbar { height: 4px; } &::-webkit-scrollbar-track { background: transparent; } &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; } }

  .musicCard { flex: 0 0 150px; width: 150px; scroll-snap-align: start; cursor: pointer; transition: transform 250ms cubic-bezier(0.22,0.61,0.36,1); &:hover { transform: translateY(-6px); .cardOverlay { opacity: 1; } .cardCover img { transform: scale(1.06); } }
    .cardCover { position: relative; width: 150px; height: 150px; border-radius: 12px; overflow: hidden; margin-bottom: 10px; background: rgba(255,255,255,0.05); img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 400ms cubic-bezier(0.22,0.61,0.36,1); } .cardOverlay { position: absolute; inset: 0; background: rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 250ms ease; i { font-size: 34px; color: #fff; filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3)); } } }
    .cardTitle { font-size: 13px; font-weight: 600; color: rgba(255,255,255,0.85); margin: 0 0 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .cardSubtitle { font-size: 11px; color: rgba(255,255,255,0.32); margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  }

  .commentsSection {
    padding: 80px 6% 120px; box-sizing: border-box; max-width: 1400px; margin: 0 auto;
    border-top: 1px solid rgba(255,255,255,0.06);
    .sectionHeader { margin-bottom: 28px; h2 { font-size: 22px; font-weight: 700; color: rgba(255,255,255,0.88); margin: 0; } }
    .comment-container {
      .comment-header-bar { display: none; }
      .section-divider { background: linear-gradient(to right, rgba(255,255,255,0.08), transparent); }
      .empty-state p { color: rgba(255,255,255,.28); }
      .load-more {
        button { background: rgba(255,255,255,.06); border-color: rgba(255,255,255,.08); color: rgba(255,255,255,.5); &:hover { background: rgba(255,255,255,.1); } }
        p { color: rgba(255,255,255,.3); }
      }
      .comment-content .comment-item {
        .main { .name { color: rgba(255,255,255,0.8); .nickname { color: rgba(255,255,255,0.45); &:hover { color: #8685EF; } } } .content { color: rgba(255,255,255,0.7); }
          .time-ribbon { .ribbon > span { color: rgba(255,255,255,0.3); &:hover { color: rgba(255,255,255,0.55); } } .comment-delete .el-button { color: rgba(255,255,255,0.3); &:hover { color: #ef4444; } } }
        }
      }
    }
  }

  .overlayBtn {
    position: fixed; z-index: 30;
    display: flex; align-items: center; gap: 6px;
    padding: 10px 24px; border-radius: 24px;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(30,30,46,0.85); color: rgba(255,255,255,0.7);
    font-size: 13px; font-weight: 500; cursor: pointer;
    backdrop-filter: blur(12px);
    transition: all 220ms cubic-bezier(0.22,0.61,0.36,1);
    i { font-size: 16px; }
    &:hover { background: rgba(40,40,60,0.9); color: rgba(255,255,255,0.9); transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
    &.bottomBtn { bottom: 32px; left: 50%; transform: translateX(-50%); &:hover { transform: translateX(-50%) translateY(-2px); } }
    &.topBtn { top: 36px; left: 50%; transform: translateX(-50%); &:hover { transform: translateX(-50%) translateY(-2px); } }
  }
}

.playerWrapper.expandWindow.hideFloatingBtn .floating-comment-btn {
  display: none !important;
}

@media (max-width: 1280px) {
  .playerWrapper.expandWindow {
    .heroSection { gap: 3%; padding: 60px 4% 60px 5%; }
    .heroLeft { flex: 0 0 30%; min-width: 240px; }
    .coverWrapper { width: 220px; height: 220px; }
    .lyricsScroll { max-height: calc(70vh - 140px); height: calc(70vh - 140px); p { font-size: 14px; &.active { font-size: 22px; } } }
    .musicCard { flex: 0 0 130px; width: 130px; .cardCover { width: 130px; height: 130px; } }
    .commentsSection { padding: 80px 5% 100px; }
  }
}

@media (max-width: 1024px) {
  .playerWrapper.expandWindow {
    .heroSection { flex-direction: column; gap: 32px; min-height: auto; padding: 100px 32px 60px; }
    .heroLeft { flex: 0 0 auto; width: 100%; max-width: 280px; }
    .coverWrapper { width: 200px; height: 200px; }
    .heroRight { width: 100%; min-height: 50vh; }
    .lyricsScroll { max-height: calc(60vh - 100px); height: calc(60vh - 100px); .lyricsInner { padding: 20vh 0; } }
    .musicCard { flex: 0 0 120px; width: 120px; .cardCover { width: 120px; height: 120px; } }
    .commentsSection { padding: 60px 32px 80px; }
  }
}
</style>
