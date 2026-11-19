<template>
  <div ref="playerWindow" class="playerWrapper" :class="{ expandWindow: isExpand, hideFloatingBtn: isExpand && fsm === 'TOP' }" :style="{ background: bgStyle }" @keydown.esc="onEsc">
    <div class="mainWin">
      <PlayCore ref="pgPanel" :isExpand="isExpand" :song="song"/>
    </div>
    <transition name="player-expand">
      <div v-if="isExpand" class="expandedOverlay" ref="scrollEl" @wheel="onWheel">
      <button class="closeBtn" @click="closePlayer" title="关闭 (Esc)">
        <BaseIcon name="close"/>
      </button>

      <div class="playerAtmosphere" :style="{ backgroundImage: 'url(' + coverUrl + ')' }"></div>
      <section class="heroSection">
        <div class="heroLeft">
          <div class="coverWrapper">
            <div class="coverGlow"></div>
            <div class="coverArt">
              <img ref="coverImg" :src="coverUrl | imgParam('400y400')" alt="" @load="onCoverLoad" crossorigin="anonymous" class="playerCover" />
            </div>
          </div>
          <div class="songMeta">
            <div class="songTitleRow">
              <h1 class="songTitle">{{ songName }}</h1>
              <!-- MV 入口做成歌名旁的方标：比独占一行按钮省空间，也比纯图标更好认 -->
              <button
                  v-if="currentMvId && !isMvDead(currentMvId)"
                  type="button"
                  class="mvTag"
                  :title="'播放《' + songName + '》的 MV'"
                  @click="openMv"
              >MV</button>
              <button
                  type="button"
                  class="likeBtn"
                  :class="{ 'is-on': isLiked }"
                  :aria-pressed="isLiked"
                  :title="isLiked ? '取消喜欢' : '喜欢'"
                  @click="toggleLike"
              >
                <BaseIcon :name="isLiked ? 'likeFill' : 'like'" :size="22"/>
                <span v-if="likedTotalText" class="likeCount">{{ likedTotalText }}</span>
              </button>
            </div>
            <p class="songSub">
              <span class="songArtist" @click="arClick">{{ artistNames }}</span>
              <template v-if="albumName">
                <span class="subSep">·</span>
                <span class="songAlbum" @click="alClick">{{ albumName }}</span>
              </template>
            </p>
          </div>
          <div class="progressSection" ref="progressPanel">
            <div class="progressTrack" @click="progressClk">
              <div v-if="chorusBand" class="expandedChorusBand" :style="chorusBand" title="副歌区间"></div>
              <div class="progressBuffer" :style="{ width: bufferPercent + '%' }"></div>
              <div class="progressFill" :style="{ width: progressPercent + '%' }"><div class="progressThumb" @mousedown.stop="dragProgress"></div></div>
            </div>
            <div class="progressTimes"><span>{{ formatTime(timeNow) }}</span><span>{{ formatTime(duration) }}</span></div>
          </div>
          <div class="controlsRow" @keydown.left.stop @keydown.right.stop>
            <button type="button"
                class="modeBtn"
                :class="{ 'is-locked': modeLocked && playMode !== 'loop' }"
                :title="modeBtnTitle"
                @click="togglePlayMode"
            >
              <BaseIcon v-if="playMode === 'order'" name="loopList" :size="24"/>
              <BaseIcon v-else-if="playMode === 'random'" name="shuffle" :size="24"/>
              <BaseIcon v-else-if="playMode === 'sequence'" name="sequence" :size="24"/>
              <BaseIcon v-else name="loopOne" :size="24"/>
            </button>
            <button type="button" aria-label="上一首" class="trackBtn prevBtn" @click="prevTrack"><BaseIcon name="prev" :size="24"/></button>
            <button type="button" class="playBtn" :aria-label="isPlaying ? '暂停' : '播放'" @click="togglePlay">
              <!-- 不加 mode：两个图标在同一个网格格里重叠，交接时交叉淡入淡出，
                   不会出现 out-in 那种"先空一帧再出现"的闪烁 -->
              <transition name="play-swap">
                <i v-if="isLoading" key="loading" class="player-loading-spinner"></i>
                <BaseIcon v-else-if="!isPlaying" key="play" name="play"/>
                <BaseIcon v-else key="pause" name="pause"/>
              </transition>
            </button>
            <button type="button" aria-label="下一首" class="trackBtn nextBtn" @click="nextTrack"><BaseIcon name="next" :size="24"/></button>
            <button type="button" class="iconBtn" :disabled="downloading"
                    :title="downloading ? '获取中' : '下载'" aria-label="下载" @click="downloadSong">
              <BaseIcon name="download" :size="24"/>
            </button>
          </div>
        </div>
        <div class="heroRight">
          <div class="rightTabs">
            <span :class="{ active: rightTab === 'lyric' }" @click="rightTab = 'lyric'"><BaseIcon name="lyrics"/> 歌词</span>
            <span :class="{ active: rightTab === 'info' }" @click="rightTab = 'info'"><BaseIcon name="disc"/> 歌曲信息</span>
            <span :class="{ active: rightTab === 'tracks' }" @click="rightTab = 'tracks'"><BaseIcon name="play"/> 相似歌曲</span>
            <span :class="{ active: rightTab === 'playlist' }" @click="rightTab = 'playlist'"><BaseIcon name="list"/> 相似歌单</span>
          </div>
          <div class="rightContent">
            <div v-show="rightTab === 'lyric'" class="tabPanel">
              <!-- 加载中不留白也不闪"纯音乐"：先用几行占位条撑住版面 -->
              <div v-if="lyricLoading && !lyric.length" class="lyricSkeleton" aria-hidden="true">
                <span v-for="n in 7" :key="n" class="lyricSkLine" :style="{ width: lyricSkWidths[n - 1] }"></span>
              </div>
              <div v-else-if="!lyric.length" class="panelEmpty"><p>暂无歌词</p><p class="emptyHint">纯音乐，请欣赏</p></div>
              <div v-else class="lyricsScroll" ref="lyricsScroll">
                <div class="lyricsInner">
                  <p v-for="(line, idx) in lyric" :key="idx" :class="{ active: line.cur, spacer: !line.lytxt || line.lytxt === '<br>' }" @click="lyricClick(line.t)">
                    <template v-if="line.words && line.words.length">
                      <span v-for="(w, wi) in line.words" :key="wi" class="lyricWord" :class="{ on: line.wcur >= wi }">{{ w.txt }}</span>
                    </template>
                    <span v-else v-html="line.lytxt || '&nbsp;'"></span>
                    <span v-if="line.tr" class="lyricTr">{{ line.tr }}</span>
                  </p>
                </div>
              </div>
            </div>
            <div v-show="rightTab === 'info'" class="tabPanel">
              <SongInfoPanel :song="currentSong" :active="rightTab === 'info'" @close-player="isExpand = false"/>
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
import SongInfoPanel from "@/components/musicPlayer/SongInfoPanel";
import CommentLayout from "@/components/layout/CommentLayout";
import { buildBackground } from "@/utils/colorExtractor";
import { parseLyricData, parseLrcText, findActiveIndex, findActiveWord } from "@/utils/lyric";
import config from "@/config";
import * as tracksApi from "@/api/Tracks";
import { isLoggedIn } from "@/utils/auth";
import { songMvMixin } from "@/mixins/songMvMixin";
import { collectSongs } from "@/utils/songList";

export default {
  name: "MusicPlayer",
  props: ['song'],
  components: { PlayCore, SongInfoPanel, CommentLayout },
  // currentMvId：当前歌曲的 MV，操作区「看 MV」按钮用（见 utils/songMv.js）
  mixins: [songMvMixin],
  data() {
    return {
      isExpand: false,
      coreReady: false,
      isModalOpen: false,
      lyric: [],
      // 歌词请求序号：只认最后一次请求的响应（快速切歌时旧响应会后到）
      lyricSeq: 0,
      // 歌词属于哪首歌，用来判断换歌时要不要先清空
      lyricSongId: 0,
      lyricLoading: false,
      // 占位条宽度，写成常量避免模板里算随机数
      lyricSkWidths: ['72%', '54%', '86%', '62%', '48%', '78%', '58%'],
      // 下载按钮请求中标志，防止连点
      downloading: false,
      timeNow: 0,
      currentSong: {},
      simiTracks: [],
      simiPlaylist: [],
      rightTab: 'lyric',
      lastActiveIdx: -1,
      bgStyle: 'linear-gradient(150deg, #30394b, #202633)',
      fsm: 'TOP',
      scrollObserver: null,
      wheelAccum: 0,
      transitioning: false,
      colorSongId: null,
      // 当前歌曲的全站红心总数（/song/red/count），0 表示还没取到
      likedTotal: 0,
    }
  },
  computed: {
    chorusBand() { return this.coreReady ? this.$refs.pgPanel.chorusStyle : null },
    coverUrl() {
      const s = this.currentSong
      return (s.al && s.al.picUrl) || (s.album && s.album.picUrl) || ''
    },
    songName() { return this.currentSong.name || '未知歌曲' },
    artistNames() {
      const s = this.currentSong; const ar = s.ar || s.artists
      if (!ar) return '未知歌手'
      if (typeof ar === 'string') return ar || '未知歌手'
      if (Array.isArray(ar)) return ar.map(a => a.name || a).join(' / ')
      return '未知歌手'
    },
    albumName() {
      const s = this.currentSong
      return (s.al && s.al.name) || (s.album && s.album.name) || ''
    },
    duration() { return this.$refs.pgPanel ? this.$refs.pgPanel.timeDuration * 1 : 0 },
    isPlaying() { return this.$refs.pgPanel ? this.$refs.pgPanel.isPlay : false },
    isLoading() { return this.$refs.pgPanel ? this.$refs.pgPanel.isLoading : false },
    bufferedTime() { return this.$refs.pgPanel ? this.$refs.pgPanel.bufferedTime : 0 },
    playMode() { return this.$refs.pgPanel ? this.$refs.pgPanel.playMode : 'order' },
    /**
     * 队列策略是否被"来源层"接管（心动 / 私人FM）—— 与 PlayerCore.policyLocked 同源，
     * 但这里必须走 Vuex：$refs 不是响应式的，直接读 pgPanel.isPersonalFM 拿不到更新。
     * fmActive 是 PlayerCore 单向镜像过来的"FM 真的在放"。
     */
    modeLocked() { return !!(this.heartMode || this.$store.state.TracksAbout.fmActive) },
    heartMode() { return this.$store.state.TracksAbout.heartMode },
    /**
     * 模式按钮的 tooltip：只报当前状态，不带操作说明（不写括号）。
     * 心动 / 私人FM 期间是"来源 · 当前那一档"（如 `心动模式 · 顺序播放`）。
     */
    modeBtnTitle() {
      const policy = { order: '列表循环', sequence: '顺序播放', random: '随机播放', loop: '单曲循环' }[this.playMode] || '列表循环'
      if (!this.modeLocked) return policy
      return `${this.heartMode ? '心动模式' : '私人FM'} · ${policy}`
    },
    progressPercent() { return this.duration ? (this.timeNow / this.duration) * 100 : 0 },
    bufferPercent() { return this.duration ? (this.bufferedTime / this.duration) * 100 : 0 },
    // 直接订阅 Core 的响应式状态，乐观更新与失败回滚同步显示。
    isLiked() { return this.coreReady ? this.$refs.pgPanel.isLiked : false },
    /** 红心旁的数字：`227w+`（万以下直接给原数）。
     *  不用接口的 countDesc —— 它是粗分档，682 万会被描述成 "100w+"。 */
    likedTotalText() {
      const n = this.likedTotal
      if (!n) return ''
      return n < 10000 ? String(n) : `${Math.floor(n / 10000)}w+`
    },
  },
  watch: {
    isExpand(val) {
      val ? this.expanded() : this.minified()
      this._rememberUi()
    },
    'currentSong.id'(id) {
      if (!id) return
      this.resolveSongMv(this.currentSong)
      this.fetchLikedTotal(id)
    },
    timeNow(val) { this.needUpdate(val) },
    rightTab() { this._rememberUi() },
    coverUrl(url) { if (url) this.$nextTick(() => this.updateBackground()) },
    '$route'() { if (this.isExpand) this.isExpand = false },
  },
  methods: {
    showSongDetail(data) {
      this.isExpand = true
      this.currentSong = data
      this.rightTab = 'lyric'
      this.lastActiveIdx = -1
      this.fsm = 'TOP'
      this.wheelAccum = 0
      this.colorSongId = null
    },
    expanded() {
      document.body.style.overflow = 'hidden'
      this.timeNow = Number(this.$refs.pgPanel.timeNow) || 0
      this.$refs.pgPanel.$on('tUpdate', (t) => this.timeUpdate(t))
      this.$nextTick(() => this.setupScrollObserver())
    },
    minified() {
      document.body.style.overflow = ''
      this.$refs.pgPanel.$off('tUpdate')
      if (this.scrollObserver) { this.scrollObserver.disconnect(); this.scrollObserver = null }
      // 收起大播放器时把底条还原成完整态。PlayerCore 的 showBar 会在 10 秒无操作后
      // 自己收成一条 28px 的细进度线（空闲形态）；大播放器盖住过底条，期间可能已经排了
      // 一个 hideTimer，不取消的话刚"缩小"出来的播放条一两秒后又塌成细线，
      // 看起来就像播放器没了。所以这里先撤掉残留计时器再点亮。
      if (this.$refs.pgPanel) {
        this.$refs.pgPanel.clearHideTimer()
        this.$refs.pgPanel.showBar = true
      }
    },
    closePlayer() {
      if (this.isModalOpen) {
        this.isModalOpen = false
        return
      }
      this.isExpand = false
    },
    onEsc() {
      if (this.isModalOpen) {
        this.isModalOpen = false
        return
      }
      this.isExpand = false
    },
    onCommentModalOpen() { this.isModalOpen = true },
    onCommentModalClose() { this.isModalOpen = false },

    /**
     * 大播放器的界面状态用 sessionStorage：刷新要保留（"我刚在看歌词"），
     * 关掉标签页就该忘掉（下次打开不该凭空弹一个全屏播放器）。
     * 不用 localStorage —— 那是长期偏好，全屏展开属于这一次的会话状态。
     */
    _rememberUi() {
      try {
        sessionStorage.setItem('acmusic_player_ui', JSON.stringify({ expand: this.isExpand, rightTab: this.rightTab }))
      } catch (e) { /* ignore */ }
    },
    _restoreUi() {
      let saved = null
      try { saved = JSON.parse(sessionStorage.getItem('acmusic_player_ui') || 'null') } catch (e) { saved = null }
      if (!saved) return
      if (['lyric', 'info', 'tracks', 'playlist'].indexOf(saved.rightTab) !== -1) this.rightTab = saved.rightTab
      const pg = this.$refs.pgPanel
      // 没有在播的歌别硬撑全屏；PlayerCore 是子组件，mounted 顺序保证它的队列已恢复完
      if (saved.expand && pg && pg.currentSong && pg.currentSong.id) {
        this.currentSong = pg.currentSong
        this.isExpand = true
      }
    },

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
      // 歌词、队列和信息各自滚动，避免在里面滚鼠标时整页跳到评论区。
      if (e.target.closest && e.target.closest('.lyricsScroll, .cardScroll, .songInfoScroll')) return
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
      const sid = this.currentSong.id
      if (!sid || sid === this.colorSongId) return
      this.colorSongId = sid
      this.bgStyle = 'linear-gradient(rgba(41,49,62,.72), rgba(32,38,51,.88)), ' + buildBackground(img)
    },
    /**
     * 取歌词。三条来源的顺序：/lyric/new（带 yrc 逐字）→ 失败或空 → 旧 /lyric 兜底。
     *
     * 两道守卫，都是踩过的坑：
     * 1. **序号**：快速切歌时旧歌的歌词可能比新歌晚到，直接赋值会把上一首的词写进面板
     *    （表现为"歌词和歌对不上"，刷新才好）。
     * 2. **清空时机**：换歌时才置空，并且用骨架占位，否则面板会闪一下"纯音乐，请欣赏"。
     */
    getLyric(id) {
      const songId = id || (this.currentSong && this.currentSong.id) || 0
      const seq = ++this.lyricSeq
      this.lyricLoading = true
      if (this.lyricSongId !== songId) {
        this.lyricSongId = songId
        this.lyric = []
        this.lastActiveIdx = -1
      }

      const apply = rows => {
        // 旧请求的迟到响应直接丢弃
        if (seq !== this.lyricSeq) return
        this.lyric = rows
        this.lyricLoading = false
        this.lastActiveIdx = -1
        // 新歌词的第一句可能十几秒后才出现，needUpdate 那时才会滚动；
        // 不在这里归零就会停在上一首滚到的位置，看起来像歌词串了
        this.$nextTick(() => {
          if (this.$refs.lyricsScroll) this.$refs.lyricsScroll.scrollTop = 0
        })
      }

      // 旧接口兜底：/lyric 只给标准 LRC，但覆盖最广
      const legacy = () => tracksApi.lyric(songId).then(res => {
        const text = res && res.data && res.data.lrc && res.data.lrc.lyric
        apply(text ? parseLrcText(text) : [])
      }).catch(() => apply([]))

      tracksApi.lyricNew(songId).then(res => {
        const rows = parseLyricData(res && res.data)
        if (rows.length) apply(rows)
        else return legacy()
      }).catch(() => legacy())
    },
    timeUpdate(t) { this.timeNow = t * 1 },
    lyricClick(t) {
      const panel = this.$refs.pgPanel
      if (!panel) return
      t + 0.1 > panel.timeDuration ? panel.sel.currentTime = panel.timeDuration : panel.sel.currentTime = t + 0.01
    },
    needUpdate(val) {
      if (!this.lyric.length) return
      // 当前行 = 最后一个 t <= 播放进度 的行（旧实现取的是"下一行"，会导致高亮提前一行）
      const curIdx = findActiveIndex(this.lyric, val)
      if (curIdx !== this.lastActiveIdx) {
        this.lyric.forEach((ly, i) => {
          const on = i === curIdx
          if (ly.cur !== on) ly.cur = on
          /**
           * 顺便把逐字进度归一：唱过的行直接置成"整行唱完"，还没到的行置 -1，
           * 当前行的进度由下面那步实时算。
           * 不归一的话，行切走的瞬间会把它那一刻的 wcur 留在原地——那一行于是永远
           * 停在"半行亮半行暗"的样子，看起来像唱过的词也有深浅（yrc 的字时间经常越过
           * 下一行的行首，最后几个字根本等不到点亮）。
           */
          if (ly.words && ly.words.length) {
            const want = i < curIdx ? ly.words.length - 1 : (i > curIdx ? -1 : ly.wcur)
            if (ly.wcur !== want) ly.wcur = want
          }
        })
        this.lastActiveIdx = curIdx
        this.$nextTick(() => {
          const container = this.$refs.lyricsScroll
          if (!container) return
          const active = container.querySelector('p.active')
          if (active) {
            const targetTop = active.offsetTop - container.clientHeight / 2 + active.clientHeight / 2
            container.scrollTo({ top: targetTop, behavior: 'smooth' })
          }
        })
      }
      // 逐字进度：仅对 yrc 行生效，wcur 之前的字点亮
      const line = curIdx >= 0 ? this.lyric[curIdx] : null
      if (line && line.words && line.words.length) {
        const wi = findActiveWord(line, val)
        if (line.wcur !== wi) line.wcur = wi
      }
    },
    /**
     * 相似歌曲：先用新版 /song/simi/get（插播相似歌曲，官方"工具栏推荐"那套，
     * 返回的是多个资源位而不是纯 songs 数组），取不到歌再退回经典 /simi/song。
     *
     * 旧接口对一部分曲目是空的（实测《晴天》直接返回 songs: []），
     * 新接口是补充而不是替换：任何一边失败都不影响另一条路径。
     */
    getSimiTracks(id) {
      const legacy = () => tracksApi.simiTracks(id)
      return tracksApi.songSimiGet(id)
          .then(res => {
            const songs = collectSongs(res && res.data && res.data.data)
            if (songs.length) {
              console.log('[Simi]', { songId: id, via: 'simi/get', count: songs.length })
              return { data: { songs } }
            }
            console.log('[Simi]', { songId: id, via: 'simi/get', count: 0, action: 'fallback' })
            return legacy()
          })
          .catch(() => legacy())
    },
    getSimiPlaylist(id) { return tracksApi.simiPlaylist(id) },
    concurrentRequestsGetSimi(id) {
      this.$axios.all([this.getSimiTracks(id), this.getSimiPlaylist(id)])
        .then(this.$axios.spread((tracks, list) => {
          this.simiTracks = tracks.data.songs || []
          this.simiPlaylist = list.data.playlists || []
        })).catch(err => { console.error(err.message) })
    },
    togglePlay() { const p = this.$refs.pgPanel; if (p) p.isPlay ? p.pauseSong() : p.playSong() },
    prevTrack() { if (this.$refs.pgPanel) this.$refs.pgPanel.preSong() },
    nextTrack() { if (this.$refs.pgPanel) this.$refs.pgPanel.nextSong() },
    togglePlayMode() { if (this.$refs.pgPanel) this.$refs.pgPanel.togglePlayMode() },
    toggleLike() {
      // 委托给 PlayerCore（单一数据源，含 likePending 锁 + API 调用 + 失败回滚）
      if (this.$refs.pgPanel) this.$refs.pgPanel.toggleLike()
    },
    /**
     * 全站红心总数：/song/red/count 返回 { count, countDesc }。
     * 失败就不显示（不影响播放），换歌时先清零避免上一首的数字闪一下。
     */
    fetchLikedTotal(id) {
      this.likedTotal = 0
      if (!id) return
      const reqId = String(id)
      tracksApi.songRedCount(id)
          .then(res => {
            // 竞态：慢响应回来时可能已经换歌了
            if (String(this.currentSong.id) !== reqId) return
            const data = res && res.data && res.data.data
            this.likedTotal = Number(data && data.count) || 0
          })
          .catch(() => { /* 静默：喜欢数只是锦上添花 */ })
    },
    /**
     * 下载当前歌曲。
     * 1) 解灰曲目 / 未登录：版权下载接口一定拿不到链接（-105/-110），直接存正在播的文件。
     * 2) 其余歌曲走 /song/download/url/v1；它不给链接时，用当前音源兜底而不是报错。
     * 浏览器对跨域 URL 的 download 属性无效，所以只保证触发下载/新标签打开，不做二次转存。
     */
    downloadSong() {
      const song = this.currentSong || {}
      if (!song.id) return
      if (this.downloading) return

      const core = this.$refs.pgPanel
      const playing = core && core.playableDownloadSource ? core.playableDownloadSource() : null

      if (playing && (playing.unblock || !isLoggedIn())) {
        this._triggerDownload(playing.url, `${song.name || 'song'}.${playing.type}`)
        this.$toast.success(playing.unblock ? '已开始下载（解灰源）' : '已开始下载')
        return
      }
      // 未登录又没有可用音源：不要误导成"去登录"，就是还没解析出来
      if (!isLoggedIn()) {
        this.$toast.warning('音源还没准备好，稍后再试')
        return
      }

      this.downloading = true
      const level = config.player.level || 'standard'
      tracksApi.downloadUrlV1(song.id, level).then(res => {
        const d = (res && res.data && res.data.data) || {}
        const url = d.url
        if (!url) {
          // -105/-110 是版权侧的"无权限"（需要 VIP / 已下架），跟登录态无关。
          // 手上还有正在播的完整文件就存它，别拿"需要登录"糊弄人。
          const sameSong = playing && String(playing.id) === String(song.id)
          if (sameSong) {
            this._triggerDownload(playing.url, `${song.name || 'song'}.${playing.type}`)
            this.$toast.success('已开始下载（当前音源）')
            return
          }
          this.$toast.warning('这首歌版权方暂未开放下载')
          return
        }
        this._triggerDownload(url, `${song.name || 'song'}${d.type ? '.' + d.type : '.mp3'}`)
        this.$toast.success('已开始下载')
      }).catch(err => {
        console.warn('[Download]', err && err.message)
        this.$toast.warning('下载失败，请稍后重试')
      }).then(() => { this.downloading = false })
    },
    /** 触发浏览器下载（跨域地址浏览器会新开标签页，无法强制另存） */
    _triggerDownload(url, filename) {
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.target = '_blank'
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    },
    formatTime(s) { s = s * 1; if (!s || isNaN(s)) return '00:00'; const m = Math.floor(s / 60); return String(m).padStart(2, '0') + ':' + String(Math.floor(s % 60)).padStart(2, '0') },
    trackAlbumPic(t) { return (t.album && t.album.picUrl) || (t.al && t.al.picUrl) || '' },
    trackArtists(t) { const ar = t.ar || t.artists; return ar && ar.length ? ar.map(a => a.name).join(' / ') : '' },
    playSimilarTrack(t) { this.$bus.$emit('songClk', t) },
    /**
     * 歌手名点击。刷新后 currentSong 是从 player_state 恢复的精简对象，
     * 老数据里可能只有名字没有 id —— 名字一起发出去，由 App 兜底反查 id。
     */
    arClick() {
      const ar = this.currentSong.ar || this.currentSong.artists
      const first = Array.isArray(ar) ? ar[0] : ar
      if (!first) return
      if (typeof first === 'string') this.$bus.$emit('arClk', 0, first)
      else this.$bus.$emit('arClk', first.id, first.name)
    },
    alClick() { const id = (this.currentSong.al && this.currentSong.al.id) || (this.currentSong.album && this.currentSong.album.id); if (id) this.$bus.$emit('alClk', id) },
    /**
     * 看 MV：必须先把全屏播放器收起来。
     * 展开态是一个铺满视口的遮罩，直接 router.push 只会把 MV 页盖在下面，
     * 用户看到的还是歌词页（SongInfoPanel 的「查看专辑」踩过同一个坑）。
     */
    openMv() {
      if (!this.currentMvId || this.isMvDead(this.currentMvId)) return
      this.isExpand = false
      this.$bus.$emit('mvClk', this.currentMvId)
    },
    plClk(id) { this.$bus.$emit('plClk', id) },
    progressClk(evt) {
      const p = this.$refs.pgPanel; if (!p || !this.$refs.progressPanel) return
      const r = this.$refs.progressPanel.getBoundingClientRect()
      const time = Math.max(0, Math.min(1, (evt.clientX - r.left) / r.width)) * this.duration
      if (p.abSetting) { p._abPickPoint(time); return }
      p._seekTo(time)
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
    this.$refs.pgPanel.$on('songChange', (s) => { this.currentSong = s; this.lastActiveIdx = -1; this.colorSongId = null })
    this.$refs.pgPanel.$on('getLyric', this.getLyric)
    this.$refs.pgPanel.$on('getSimi', this.concurrentRequestsGetSimi)
    this.coreReady = true
    this._restoreUi()
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
  transition: background $motion-slow $ease-smooth;
}

.playerWrapper {
  .expandedOverlay { display: none; }
}

// Player Expand Transition (CSS-based, Vue 2 transition classes)
.player-expand-enter-active,
.player-expand-leave-active {
  transition: opacity $motion-normal $ease-standard, transform $motion-normal $ease-standard;
}

.player-expand-enter {
  opacity: 0;
  transform: scale($player-expand-scale) translateY($player-expand-shift);
}

.player-expand-enter-to {
  opacity: 1;
  transform: scale(1) translateY(0);
}

.player-expand-leave-to {
  opacity: 0;
  transform: scale(.98) translateY($player-expand-shift);
}

// Cover Animation (expanded 进入时从缩放到完整)
.expandWindow .playerCover {
  transition: transform $motion-normal $ease-standard, opacity $motion-normal $ease-standard;
  transform: scale(1);
  opacity: 1;
}
.player-expand-enter .playerCover {
  transform: scale(.92);
  opacity: .8;
}

.playerWrapper.expandWindow {
  position: fixed; inset: 0; z-index: 200;

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
    // 封面撑满左栏：歌词区/标题/控制行的左右边缘都跟它对齐
    position: relative; width: 100%; aspect-ratio: 1 / 1; flex-shrink: 0;
  .coverGlow { position: absolute; inset: -30px; border-radius: 50%; background: radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%); filter: blur(50px); pointer-events: none; }
  .coverArt { position: relative; width: 100%; height: 100%; border-radius: 16px; overflow: hidden; box-shadow: 0 16px 48px rgba(0,0,0,0.35); img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .3s ease, opacity .3s ease; } }
  .coverArt img { transform: scale(1); opacity: 1; }
  }

  .songMeta {
    text-align: left; width: 100%;
    // 歌名 + MV 方标 + 红心同一行；红心推到最右，和封面右边缘对齐
    .songTitleRow {
      display: flex; align-items: center; gap: 10px;
      margin: 0 0 6px;
    }
    .songTitle {
      font-size: 24px; font-weight: 700; color: rgba(255,255,255,0.92); line-height: 1.3;
      margin: 0; padding: 0; min-width: 0;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    // MV 方标：比独占一行的按钮省地方，也比纯图标好认
    .mvTag {
      flex: 0 0 auto;
      height: 20px; padding: 0 6px;
      border-radius: 4px;
      border: 1px solid rgba(255,255,255,0.18);
      background: transparent;
      color: rgba(255,255,255,0.55);
      font-size: 11px; font-weight: 600; line-height: 18px; letter-spacing: .5px;
      font-family: inherit; cursor: pointer;
      transition: color 180ms ease, border-color 180ms ease;
      &:hover { color: #fff; border-color: rgba(255,255,255,0.42); }
    }
    .likeBtn {
      // 红心 + 数字作为整体靠右：不再固定 64px，数字短时右边不会空出一截。
      // 数字仍压在红心右上角——靠 align-self: flex-start 顶到容器上沿，
      // 红心垂直居中（顶部 5px），两者错开 5px，就是原来绝对定位 top:0 的效果。
      flex: 0 0 auto; margin-left: auto;
      display: inline-flex; align-items: center; gap: 2px;
      height: 32px; padding: 0;
      border: none; background: transparent;
      color: rgba(255,255,255,0.72);
      cursor: pointer;
      transition: color 180ms ease;
      &:hover { color: #fff; }
      &.is-on { color: $player-danger; }
      .likeCount {
        align-self: flex-start;
        font-size: 9px; font-weight: 600; line-height: 1;
        font-variant-numeric: tabular-nums; letter-spacing: .2px;
        color: rgba(255,255,255,0.8);
        white-space: nowrap; pointer-events: none;
      }
    }
    // 歌手 · 专辑 合并一行，左边缘与封面一致
    .songSub {
      display: flex; align-items: center; gap: 6px;
      margin: 0; min-width: 0;
      font-size: 14px;
      color: rgba(255,255,255,0.45);
      .songArtist, .songAlbum {
        min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        cursor: pointer;
        transition: color 180ms ease;
        &:hover { color: rgba(255,255,255,0.8); }
      }
      .subSep { flex: 0 0 auto; opacity: .5; }
    }
  }

  .progressSection {
    width: 100%; max-width: 300px;
    .progressTrack { width: 100%; height: 4px; background: rgba(255,255,255,0.08); border-radius: 2px; cursor: pointer; position: relative; &:hover { height: 6px; }
      .progressBuffer { position: absolute; inset: 0; height: 100%; background: rgba(255,255,255,0.1); border-radius: inherit; pointer-events: none; }
      .progressFill { height: 100%; background: var(--c-accent); border-radius: inherit; position: relative; transition: width 0.1s linear; box-shadow: 0 0 8px rgba(var(--theme-accent-rgb), 0.2);
        .progressThumb { position: absolute; right: -6px; top: 50%; transform: translateY(-50%); width: 14px; height: 14px; background: #fff; border-radius: 50%; box-shadow: 0 1px 6px rgba(0,0,0,0.4); opacity: 0; transition: opacity 180ms ease; }
      }
      &:hover .progressFill .progressThumb { opacity: 1; }
    }
    .progressTimes { display: flex; justify-content: space-between; margin-top: 7px; font-size: 11px; color: rgba(255,255,255,0.34); font-variant-numeric: tabular-nums; letter-spacing: .2px; }
  }

  .controlsRow {
    // 五个控件平均铺满整行：播放键落在正中，下载贴最右（与红心、封面右边缘对齐）
    display: flex; align-items: center; justify-content: space-between;
    width: 100%; gap: 8px;
    color: rgba(255,255,255,0.85);
    .trackBtn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 46px; height: 46px; border-radius: 50%;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.08);
      cursor: pointer;
      transition: all 180ms ease;
      &:hover { background: rgba(255,255,255,0.12); transform: scale(1.1); }
      &:active { transform: scale(0.94); }
    }
    // 与切歌按钮同尺寸、但不给底色：模式是次级控件，悬停才浮出背景
    .modeBtn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 46px; height: 46px; border-radius: 50%;
      border: 1px solid transparent;
      cursor: pointer;
      color: rgba(255,255,255,0.42);
      transition: all 180ms ease;
      // 四档模式一律同色：模式靠图标形状区分，主色不兼职（见 PlayerCore 同段注释）
      &:hover {
        color: rgba(255,255,255,0.9);
        background: rgba(255,255,255,0.07);
        border-color: rgba(255,255,255,0.06);
      }
      // 心动 / 私人FM 接管队列来源：非单曲循环的策略图标压暗（不换禁用手感，按钮仍可点）
      &.is-locked {
        opacity: .45;
        &:hover { color: rgba(255,255,255,0.42); background: transparent; border-color: transparent; }
      }
    }
    // 喜欢 / 下载：与切歌键同尺寸的透明圆钮，只有 hover 才浮出背景
    .iconBtn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 46px; height: 46px; border-radius: 50%;
      border: 1px solid transparent;
      background: transparent;
      color: rgba(255,255,255,0.42);
      cursor: pointer;
      padding: 0;
      transition: all 180ms ease;
      &:hover { color: rgba(255,255,255,0.9); background: rgba(255,255,255,0.07); }
      &:active { transform: scale(0.94); }
      &:disabled { opacity: .45; cursor: default; }
      // 已喜欢：红心实心 + 淡底
      &.is-on { color: $player-danger; background: rgba(255,255,255,0.06); }
    }
    .playBtn { width: 44px; height: 44px; border-radius: 50%; background: var(--c-accent); color: #fff; display: grid; grid-template: 1fr / 1fr; place-items: center; cursor: pointer; box-shadow: 0 4px 20px rgba(var(--theme-accent-rgb), 0.35); transition: all 220ms ease; i { font-size: 20px; } .player-loading-spinner { display: block; width: 18px; height: 18px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: player-loading-spin .8s linear infinite; } &:hover { transform: scale(1.06); box-shadow: 0 6px 28px rgba(var(--theme-accent-rgb), 0.5); } &:active { transform: scale(0.95); } }
    // 播放/暂停图标切换：两个图标叠在同一个网格格里交叉淡入淡出。
    // 用 out-in 会先空一帧再出现，看起来就是"闪一下"；不加 mode 让旧的一边淡出、
    // 新的一边淡入，全程至少有一个图标可见。
    .playBtn > * { grid-area: 1 / 1; }
    .play-swap-enter-active,
    .play-swap-leave-active {
      transition: opacity 180ms ease;
    }
    .play-swap-enter,
    .play-swap-leave-to { opacity: 0; }
  }

  .heroRight { flex: 1; min-width: 0; align-self: stretch; display: flex; flex-direction: column; }

  .rightTabs {
    display: flex; border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0;
    span { padding: 12px 20px; font-size: 13px; color: rgba(255,255,255,0.35); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all 180ms ease; display: flex; align-items: center; gap: 5px; i { font-size: 14px; } &:hover { color: rgba(255,255,255,0.6); } &.active { color: rgba(255,255,255,0.88); font-weight: 600; border-bottom-color: var(--c-accent); } }
  }

  // 详情页右栏：上留 20px 接标题、下留 70px 收尾，左右贴边（歌词/卡片自己已有内边距）
  .rightContent { flex: 1; min-height: 0; overflow: hidden; padding: 20px 0 70px; }
  .tabPanel { position: relative; height: 100%; overflow: hidden; }
  .lyricsScroll {
    max-height: calc(70vh - 120px); height: calc(70vh - 120px);
    overflow-y: auto; position: relative;
    mask-image: linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%);
    -webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 5%, black 95%, transparent 100%);
    &::-webkit-scrollbar { width: 4px; } &::-webkit-scrollbar-track { background: transparent; } &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
    .lyricsInner { padding: 40vh 0; }
    // 长句允许折行：原来 nowrap + ellipsis 会把长句从两侧切断（居中文本溢出是两头都切），
    // 英文歌和带长制作人名单的歌最明显，看起来像"歌词少了半句"
    p { font-size: 16px; line-height: 2.5; color: rgba(255,255,255,0.28); text-align: center; cursor: pointer; transition: all 400ms cubic-bezier(0.22,0.61,0.36,1); margin: 0; padding: 0 16px; white-space: normal; overflow-wrap: anywhere; &:hover { color: rgba(255,255,255,0.45); } &.active { font-size: 26px; font-weight: 700; color: rgba(255,255,255,0.92); line-height: 2; } &.spacer { height: 10px; font-size: 0; } }
    /* 逐字（yrc）：只有当前行做"唱到 / 没唱到"的区分。
       非当前行（唱过的、还没到的）统一满不透明度，靠行的淡色来区分层级——
       否则唱过的行会留下上一刻的 wcur，出现深浅不一的花字 */
    .lyricWord { opacity: 1; transition: opacity 120ms linear, color 120ms linear; }
    p.active .lyricWord { opacity: .45; }
    p.active .lyricWord.on { opacity: 1; color: #fff; text-shadow: 0 0 14px rgba(var(--theme-accent-rgb), 0.5); }
    /* 翻译副行 */
    .lyricTr { display: block; font-size: .6em; font-weight: 400; line-height: 1.7; color: rgba(255,255,255,0.5); white-space: normal; overflow-wrap: anywhere; }
    p.active .lyricTr { color: rgba(255,255,255,0.62); }
  }

  /* 歌词加载占位：位置和真实歌词一致（居中、行高相近），换歌时不会跳一下 */
  .lyricSkeleton {
    display: flex; flex-direction: column; align-items: center; gap: 26px;
    padding: 26vh 16px 0; box-sizing: border-box; height: 100%;
  }

  .lyricSkLine {
    height: 12px; border-radius: $radius-pill;
    background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.09) 50%, rgba(255,255,255,0.04) 75%);
    background-size: 200% 100%;
    animation: skeleton-shimmer $shimmer-duration infinite;
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
    .comment-container .comment-header-bar { display: none; }
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

@keyframes player-loading-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (max-width: 1280px) {
  .playerWrapper.expandWindow {
    .heroSection { gap: 3%; padding: 60px 4% 60px 5%; }
    .heroLeft { flex: 0 0 30%; min-width: 240px; }
    .coverWrapper { width: 100%; }
    // 五个控件（模式/上一首/播放/下一首/下载）在 240px 里排得下，
    // 只把间距收到 8px；尺寸略缩，避免贴着边框
    .controlsRow { gap: 8px; }
    .controlsRow .trackBtn, .controlsRow .modeBtn, .controlsRow .iconBtn { width: 40px; height: 40px; }
    .controlsRow .playBtn { width: 56px; height: 56px; }
    .lyricsScroll { max-height: calc(70vh - 140px); height: calc(70vh - 140px); p { font-size: 14px; &.active { font-size: 22px; } } }
    .musicCard { flex: 0 0 130px; width: 130px; .cardCover { width: 130px; height: 130px; } }
    .commentsSection { padding: 80px 5% 100px; }
  }
}

@media (max-width: 1024px) {
  .playerWrapper.expandWindow {
    .heroSection { flex-direction: column; gap: 32px; min-height: auto; padding: 100px 32px 60px; }
    .heroLeft { flex: 0 0 auto; width: 100%; max-width: 280px; }
    .coverWrapper { width: 100%; }
    .heroRight { width: 100%; min-height: 50vh; }
    .lyricsScroll { max-height: calc(60vh - 100px); height: calc(60vh - 100px); .lyricsInner { padding: 20vh 0; } }
    .musicCard { flex: 0 0 120px; width: 120px; .cardCover { width: 120px; height: 120px; } }
    .commentsSection { padding: 60px 32px 80px; }
  }
}
</style>

<style lang="scss">
@import "../../assets/scss/base/variables";
@import "../../assets/scss/base/motion";

.playerWrapper.expandWindow {
  .playerAtmosphere { position: fixed; inset: -10%; background-size: cover; background-position: center; filter: blur(100px); opacity: .16; pointer-events: none; }
  .heroSection { position: relative; display: grid; grid-template-columns: minmax(280px, .85fr) minmax(0, 1.35fr); gap: clamp(40px, 6vw, 100px); min-height: 100vh; padding: 80px 6% 100px; }
  .heroLeft { position: relative; width: 100%; min-width: 0; max-width: 420px; justify-self: center; gap: $sp-5; }
  .coverWrapper { width: 100%; height: auto; aspect-ratio: 1; }
  .coverWrapper .coverArt { border-radius: $player-radius-xl; box-shadow: $player-shadow-lg; }
  .songMeta .songTitle { text-align: left; font-size: clamp(24px, 2.2vw, 32px); }
  .songMeta .songArtist { color: var(--player-menu-secondary); }
  .songMeta .songAlbum { color: var(--player-menu-muted); }
  .progressSection { max-width: none; width: 100%; }
  .progressSection .progressTrack { height: 6px; isolation: isolate; }
  .expandedChorusBand { position: absolute; top: -3px; height: 12px; background: var(--player-menu-accent); opacity: .38; border-radius: $radius-pill; pointer-events: none; }
  .progressSection .progressTimes { color: var(--player-menu-muted); }
  .controlsRow button { padding: 0; font: inherit; color: inherit; }
  // 大播放页按钮放大到 58px 后图标仍是基础尺寸 20px（占 34%），比 mini 条的
  // 18/32（56%）明显偏小；这里按同一比例补到 34px（可见三角高约 21px），
  // 加载圈同步放大
  .controlsRow .playBtn {
    width: 64px; height: 64px; border: none;
    i { font-size: 38px; }
    .player-loading-spinner { width: 24px; height: 24px; border-width: 2.5px; }
  }
  .controlsRow .modeBtn { background: transparent; color: var(--player-menu-secondary); }
  .controlsRow .iconBtn { color: var(--player-menu-secondary); }
  .controlsRow .iconBtn.is-on { color: $player-danger; }
  .heroRight { align-self: center; width: 100%; min-width: 0; height: clamp(440px, 72vh, 760px); }
  .rightTabs { justify-content: center; span { color: var(--player-menu-muted); padding: $sp-3 $sp-4; } }
  .rightContent { padding: 20px 0 70px; min-height: 0; flex: 1; }
  .rightTabs { flex: 0 0 auto; }
  .tabPanel { height: 100%; }
  .tabPanel .lyricsScroll, .tabPanel .cardScroll { height: 100%; min-height: 0; max-height: none; box-sizing: border-box; }
  .lyricsScroll { height: 66vh; max-height: 700px; min-height: 400px;
    .lyricsInner { padding: 30vh 0; }
    // word-break: keep-all 会让中文长句断不开（只能整行溢出被裁），配合折行改成 normal
    p { font-size: clamp(16px, 1.6vw, 22px); line-height: 2.8; color: var(--player-menu-muted); white-space: normal; word-break: normal; overflow-wrap: anywhere; }
    p.active { font-size: clamp(22px, 2.2vw, 32px); color: var(--player-menu-text); }
    /**
     * 层级：唱过的行（当前行之前）保持基础灰度，还没到的行（当前行之后的所有兄弟）再压一档。
     * 用兄弟选择器而不是逐行打标记：歌词是顺序渲染的，当前行后面必然是"未到"的部分，
     * 少一份状态就少一处同步问题；切换时 p 上已有的 transition 会把这个变化带成渐变。
     */
    p.active ~ p { opacity: .58; }
    // 逐字片段的字/词内部不拆开，折行只发生在片段之间（这条别写给 p span：
    // 会把整行文本和翻译行也锁成 nowrap，长句就又溢出被裁了）
    p .lyricWord { white-space: nowrap; }
  }
  .cardScroll { max-height: 66vh; overflow-y: auto; }
  button:focus-visible { outline: 2px solid var(--player-menu-accent); outline-offset: 3px; }
}
@media (max-width: 900px) {
  .playerWrapper.expandWindow {
    .heroSection { grid-template-columns: minmax(0, 1fr); padding: 80px $sp-5 100px; gap: $sp-6; }
    .heroLeft { max-width: 360px; }
    .heroRight { min-height: 0; height: 58vh; }
    .coverWrapper { width: 100%; }
    .lyricsScroll { height: 50vh; min-height: 300px; .lyricsInner { padding: 20vh 0; } }
  }
}
@media (min-width: 901px) and (max-height: 800px) {
  .playerWrapper.expandWindow {
    .heroSection { padding-top: 48px; padding-bottom: 80px; }
    .heroLeft { gap: $sp-4; }
    .coverWrapper { width: clamp(190px, 32vh, 270px); }
    .lyricsScroll { min-height: 300px; height: 65vh; }
  }
}
</style>
