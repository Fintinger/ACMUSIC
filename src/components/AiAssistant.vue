<template>
  <div v-show="!hidden" class="ai-assistant">
    <!-- 浮动入口：右下角，避开底部播放条 -->
    <button
        v-show="!open"
        ref="fabRoot"
        type="button"
        class="ai-fab"
        :class="{ 'has-player': hasPlayer, 'is-pulse': songPulse }"
        aria-label="打开 AI 点歌"
        title="AI 点歌"
        @click="openPanel"
    >
      <!-- Glass Orb：质感做在玻璃本体上。
           层级从下到上：玻璃球 → 表面高光 / 内部漫射 / 弧形反射 → 图标 -->
      <span class="orb-glass">
        <span class="orb-inner-glow" aria-hidden="true"></span>
        <span class="orb-highlight" aria-hidden="true"></span>
        <span class="orb-reflection" aria-hidden="true"></span>
        <svg class="orb-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path class="glyph-main"
                d="M11.5 2.8Q12.7 9.4 19.3 10.6Q12.7 11.8 11.5 18.4Q10.3 11.8 3.7 10.6Q10.3 9.4 11.5 2.8Z"
                fill="currentColor"/>
          <path class="glyph-mini"
                d="M18.2 12.8Q19.1 16.1 22.4 17Q19.1 17.9 18.2 21.2Q17.3 17.9 14 17Q17.3 16.1 18.2 12.8Z"
                fill="currentColor"/>
        </svg>
      </span>

      <!-- 外沿一道很细的弧光，转速固定（BPM 只驱动呼吸，不驱动转速） -->
      <span class="orb-arc" aria-hidden="true"></span>
    </button>

    <!-- 面板：宽度和高度都设上限，窄屏时自动收到视口内 -->
    <transition name="panel-pop">
      <section
          v-if="open"
          class="ai-panel"
          :class="{ 'has-player': hasPlayer }"
          role="dialog"
          aria-label="AI 点歌"
      >
        <header class="panel-head">
          <span class="head-avatar">
            <span class="ha-img"><img ref="headImg" src="/favicon.ico" alt=""></span>
          </span>
          <div class="head-text">
            <strong>AI 点歌</strong>
            <span>{{ headSub }}</span>
          </div>
          <button
              v-if="messages.length"
              type="button"
              class="head-btn"
              title="开始新对话"
              @click="reset"
          ><BaseIcon name="edit" :size="15"/></button>
          <button type="button" class="head-btn" title="收起" @click="closePanel">
            <BaseIcon name="close" :size="15"/>
          </button>
        </header>

        <div ref="thread" class="panel-thread">
          <!-- 空态：窗口小，只给三个方向差异明显的例子 -->
          <!-- 空态：只给几个方向，正在播放的提示统一放在底部输入区上方 -->
          <div v-if="!messages.length" class="panel-intro">
            <p class="intro-title">想听点什么？</p>
            <div class="intro-presets">
              <button
                  v-for="p in presets"
                  :key="p"
                  type="button"
                  class="intro-preset"
                  @click="ask(p)"
              >{{ p }}</button>
            </div>
          </div>

          <div
              v-for="(m, i) in messages"
              :key="i"
              class="msg"
              :class="m.role === 'user' ? 'is-user' : 'is-ai'"
          >
            <img v-if="m.role === 'ai'" class="msg-avatar" src="/favicon.ico" alt="AI">
            <img
                v-else-if="userAvatar"
                class="msg-avatar"
                :src="userAvatar | https"
                alt="我"
            >
            <span v-else class="msg-avatar is-default"><BaseIcon name="user" :size="13"/></span>

            <div class="msg-body">
              <!-- 用户 -->
              <div v-if="m.role === 'user'" class="bubble is-user">{{ m.text }}</div>

              <!-- AI -->
              <template v-else>
                <div v-if="m.pending" class="bubble is-ai is-thinking">
                  <BaseIcon name="loader" :size="13" class="spin"/>
                  <span>正在选歌…</span>
                </div>

                <div v-else-if="m.error" class="bubble is-ai is-error">
                  <span>{{ m.error }}</span>
                  <button type="button" class="retry" @click="retry(i)">重试</button>
                </div>

                <template v-else>
                  <div v-if="m.reply" class="bubble is-ai">{{ m.reply }}</div>

                  <div v-if="m.playlist" class="sheet">
                    <div class="sheet-head">
                      <strong class="sheet-title">{{ m.playlist.title }}</strong>
                      <p v-if="m.playlist.desc" class="sheet-desc">{{ m.playlist.desc }}</p>
                    </div>

                    <div class="sheet-meta">
                      <span>{{ m.playlist.tracks.length }} 首</span>
                      <span v-if="m.playlist.pickReason" class="sheet-why">{{ m.playlist.pickReason }}</span>
                    </div>

                    <div class="sheet-actions">
                      <button
                          type="button"
                          class="sheet-btn is-primary"
                          :disabled="!m.playlist.tracks.length"
                          @click="playSheet(m.playlist)"
                      ><BaseIcon name="play" :size="12"/><span>播放全部</span></button>
                      <button
                          type="button"
                          class="sheet-btn"
                          :disabled="m.saving || m.saved || !m.playlist.tracks.length"
                          @click="saveSheet(m)"
                      ><BaseIcon :name="m.saved ? 'check' : 'star'" :size="12"/>
                        <span>{{ m.saved ? '已存' : m.saving ? '保存中' : '收藏' }}</span></button>
                      <button
                          type="button"
                          class="sheet-btn is-quiet"
                          :disabled="!m.playlist.tracks.length"
                          @click="m.open = !m.open"
                      >{{ m.open ? '收起' : '曲目' }}</button>
                    </div>

                    <!-- 浮窗里不用整张 TracksLayout（四列在 420px 里会挤成一团），
                         换成两行的精简列表，点一首直接从这首开始放 -->
                    <ol v-if="m.open" class="mini-tracks">
                      <li
                          v-for="(t, ti) in m.playlist.tracks"
                          :key="t.id"
                          class="mini-track"
                          @click="playTrack(t)"
                      >
                        <span class="mt-idx">{{ ti + 1 }}</span>
                        <span class="mt-main">
                          <span class="mt-name">{{ t.name }}</span>
                          <span class="mt-artist">{{ artistNames(t) }}</span>
                        </span>
                      </li>
                    </ol>

                    <p v-if="m.degraded === 'no-key'" class="sheet-note">
                      服务端还没配模型密钥，这次是按原话直搜的。
                    </p>
                    <p v-else-if="m.degraded === 'llm-failed'" class="sheet-note">
                      模型这次没返回结果，已退回关键词直搜。
                    </p>
                    <p v-if="m.playlist && !m.playlist.tracks.length" class="sheet-note is-warn">
                      这些描述暂时没搜到能播的歌，换个说法试试。
                    </p>
                  </div>
                </template>
              </template>
            </div>
          </div>

          <div ref="anchor" class="anchor"></div>
        </div>

        <div class="panel-composer">
          <!-- 正在播放的提示统一收在底部：一条虚线标签，不占对话区空间，
               空态和有对话时都在同一个位置 -->
          <div v-if="sameVibeText" class="vibe-row">
            <button type="button" class="vibe-chip" @click="askSameVibe">
              <BaseIcon name="sparkles" :size="10"/><span>照着《{{ nowSong.name }}》来一张</span>
            </button>
          </div>

          <div v-if="exclude.length" class="exclude-row">
            <span class="ex-label">已排除</span>
            <button
                v-for="x in exclude"
                :key="x"
                type="button"
                class="ex-chip"
                :title="'点掉就不再排除「' + x + '」'"
                @click="removeExclude(x)"
            >{{ x }}<i>×</i></button>
          </div>

          <div class="composer-box">
            <textarea
                v-model="draft"
                class="composer-input"
                :placeholder="sending ? '正在选歌…' : '例如：通勤路上想听点带劲的'"
                rows="1"
                maxlength="200"
                :disabled="sending"
                @keydown.enter.exact.prevent="send"
            ></textarea>
            <button
                type="button"
                class="composer-send"
                :disabled="!canSend"
                @click="send"
            ><BaseIcon name="arrowUp" :size="14"/></button>
          </div>
        </div>
      </section>
    </transition>
  </div>
</template>

<script>
import {recommendPlaylist} from "@/api/Ai";
import {create, addTracks} from "@/api/Playlist";
import {likelist, detail as songDetail} from "@/api/Tracks";
import {isLoggedIn} from "@/utils/auth";
import {getBpm, breathSeconds as bpmToBreath, DEFAULT_BPM} from "@/utils/songBpm";

/**
 * AI 点歌浮窗
 *
 * 挂在 App 根部，不属于任何路由页面 —— 所以在全站任何位置都能唤起，
 * 也不会因为切页被销毁（对话记录天然保留，刷新才清空）。
 *
 * 唯一要主动躲开的是全屏播放详情页：那层是 z-index 200 的全屏覆盖，
 * 浮窗层级本来就在它下面，但这里仍然听 $bus 的 playerExpand 显式隐藏，
 * 不依赖层级高低这种"碰巧成立"的约定。
 */
export default {
  name: "AiAssistant",
  data() {
    return {
      hidden: false,
      open: false,
      messages: [],
      draft: '',
      sending: false,
      exclude: [],
      taste: [],
      tasteLoading: false,
      // 当前播放：由 PlayerCore 通过 $bus('nowPlaying') 推过来（那两个字段不在 store 里）
      nowSong: {id: 0, name: '', artist: ''},
      isPlaying: false,
      // 音源加载中：这段时间光圈只流动、不呼吸
      pending: false,
      // 当前歌曲 BPM。0 表示还在查，查不到统一回退 100
      bpm: 0,
      // 换歌时给入口一个短脉冲，让"它注意到你切歌了"这件事有反馈
      songPulse: false,
      presets: ['下雨天写代码', '90 年代粤语金曲', '跑步时听的快节奏']
    }
  },
  computed: {
    canSend() {
      return !this.sending && this.draft.trim().length >= 2
    },
    /**
     * 播放条是否在屏幕上。
     * 判据是「有当前歌」而不是「播放列表非空」—— 播放条显示的条件就是 currentSong.id，
     * 球要吸附的是那条真实的条，不是一个可能存在的列表
     */
    hasPlayer() {
      return !!this.nowSong.id
    },
    userAvatar() {
      const p = this.$store.getters['UserAbout/userProfile']
      return (p && p.avatarUrl) || ''
    },
    /** 头部副标题：有歌时它就是"我此刻知道你在听什么"的证据 */
    headSub() {
      if (!this.nowSong.id) return '说一句，给你挑一张歌单'
      if (!this.isPlaying) return `已暂停 · ${this.nowSong.name}`
      return `正在听《${this.nowSong.name}》`
    },
    /** 一句话把当前歌曲交给模型 —— 复用现有链路，不需要任何新接口 */
    sameVibeText() {
      const s = this.nowSong
      if (!s.id || !s.name) return ''
      return `照着《${s.name}》${s.artist ? ' - ' + s.artist : ''} 这种感觉来一张`
    },
    /** BPM → 一次完整呼吸的秒数（240/BPM，钳在 1.8–3.6） */
    breatheT() {
      return bpmToBreath(this.bpm || DEFAULT_BPM)
    },
    /** 状态机：rAF 按它选不同的幅度、转速、光晕强度 */
    motionState() {
      if (this.pending) return 'loading'
      if (!this.nowSong.id) return 'idle'
      return this.isPlaying ? 'playing' : 'paused'
    }
  },
  created() {
    /**
     * 动画状态全部放在非响应式对象里。
     * 每帧写 this.$data 会触发 watcher → 虚拟 DOM diff，60fps 就是 60 次重渲染，
     * 所以相位、角度、当前周期都挂在 _motion 上，只把结果直接写进 DOM style。
     */
    this._motion = {
      raf: 0,
      last: 0,
      frame: 0,
      phase: 0,
      breathe: 2.4,
      amp: 0.2,
      glow: 0.15,
      spin: 0.3,
      // 引力偏移：鼠标靠近时球会被"拽"过去一点
      pullX: 0,
      pullY: 0
    }
    this._pointer = {x: -1, y: -1}
    this._orbCenter = null
    this._raf = 0
  },
  mounted() {
    // 全屏播放详情页上不显示入口
    this.$bus.$on('playerExpand', this.onPlayerExpand)
    this.$bus.$on('nowPlaying', this.onNowPlaying)
    document.addEventListener('visibilitychange', this.onVisibility)
    window.addEventListener('mousemove', this.onPointerMove, {passive: true})
    window.addEventListener('resize', this.invalidateOrbCenter)
    this.startMotion()
  },
  beforeDestroy() {
    this.$bus.$off('playerExpand', this.onPlayerExpand)
    this.$bus.$off('nowPlaying', this.onNowPlaying)
    document.removeEventListener('visibilitychange', this.onVisibility)
    window.removeEventListener('mousemove', this.onPointerMove)
    window.removeEventListener('resize', this.invalidateOrbCenter)
    this.stopMotion()
  },
  methods: {
    /** 尊重系统「减少动态效果」：不开 rAF，只留静态样式 */
    prefersReduced() {
      try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches
      } catch (e) {
        return false
      }
    },
    /** 只记坐标，不做计算 —— mousemove 每秒能来上百次，重活留给 rAF */
    onPointerMove(e) {
      this._pointer.x = e.clientX
      this._pointer.y = e.clientY
    },
    invalidateOrbCenter() {
      this._orbCenter = null
    },
    /**
     * 球心的屏幕坐标。
     * 缓存是为了避免每帧 getBoundingClientRect 触发同步布局；
     * rAF 里每 15 帧失效一次，位置过渡（滑到播放条旁边）也能被跟上
     */
    orbCenter() {
      if (this._orbCenter) return this._orbCenter
      const el = this.$refs.fabRoot
      if (!el) return null
      const r = el.getBoundingClientRect()
      if (!r.width) return null
      this._orbCenter = {x: r.left + r.width / 2, y: r.top + r.height / 2}
      return this._orbCenter
    },
    onVisibility() {
      // 标签页切到后台就停：rAF 会被浏览器节流成 1fps，留着只会让相位和音乐脱节
      if (document.hidden) this.stopMotion()
      else this.startMotion()
    },
    startMotion() {
      if (this._raf) return
      if (this.prefersReduced()) return
      this._motion.last = 0
      this._raf = requestAnimationFrame(this.tickMotion)
    },
    stopMotion() {
      if (!this._raf) return
      cancelAnimationFrame(this._raf)
      this._raf = 0
    },
    /**
     * 单一时间基准：一次循环算出呼吸相位 → 同时驱动亮度、缩放、光晕、旋转。
     * 两个载体共享同一个 phase，所以永远不会越跑越偏。
     */
    tickMotion(ts) {
      const m = this._motion
      if (!m.last) m.last = ts
      // 切回前台的间隔可能很长，钳住避免相位一次跳掉
      const dt = Math.min(64, ts - m.last) / 1000
      m.last = ts

      const p = this.motionParams()
      // BPM 切换走插值（约 0.9s 到位），绝不直接替换周期 —— 否则时间轴重算会跳帧
      m.breathe += (p.t - m.breathe) * Math.min(1, dt / 0.9)
      m.amp += (p.amp - m.amp) * Math.min(1, dt / 0.6)
      m.glow += (p.glow - m.glow) * Math.min(1, dt / 0.6)
      m.spin += (p.spin - m.spin) * Math.min(1, dt / 0.9)

      m.phase = (m.phase + dt / Math.max(0.6, m.breathe)) % 1
      const curve = this.breathCurve(m.phase)
      const level = 0.18 + 0.82 * m.amp * curve

      // 每 15 帧让球心缓存失效一次：位置过渡期间也能跟上，
      // 又不必每帧都做一次会触发同步布局的 getBoundingClientRect
      m.frame = (m.frame + 1) % 15
      if (m.frame === 0) this._orbCenter = null

      // 浮窗关着时只有按钮需要动，降到约 20fps：
      // 呼吸周期以秒计，20 帧足够平滑，而写 DOM 的次数降到三分之一。
      // 相位上面已经按真实 dt 累积过，这里跳过的只是"写字"这一下
      const minGap = this.open ? 0 : 45
      if (minGap && ts - (m.wroteAt || 0) < minGap) {
        this._raf = requestAnimationFrame(this.tickMotion)
        return
      }
      m.wroteAt = ts

      // 第二层雾的相位差已经不需要了（外部柔光整层删掉），
      // 只保留一个缓慢位移给玻璃反射用
      const driftAmt = (0.5 + 0.5 * m.spin) * (0.6 + 0.4 * m.amp)
      const dx = Math.cos(m.phase * Math.PI * 2) * 2.2 * driftAmt
      const dy = Math.sin(m.phase * Math.PI * 2) * 1.8 * driftAmt

      // 玻璃本体的呼吸全部走 CSS 变量：球内漫射光、弧形反射、整体通透度
      const fab = this.$refs.fabRoot
      if (fab) {
        // 引力：鼠标进入 170px 内，球会朝鼠标方向偏最多 8px。
        // 距离越近引力越强（平方衰减），离开后回弹 —— 因为它是球，
        // 这点位移读起来是"被吸引"，不会像"位置抖了"
        const pointer = this._pointer
        if (!this.open && pointer.x >= 0) {
          const c = this.orbCenter()
          if (c) {
            const vx = pointer.x - c.x
            const vy = pointer.y - c.y
            const dist = Math.sqrt(vx * vx + vy * vy)
            const R = 180
            const k = dist < R ? Math.pow(1 - dist / R, 2) : 0
            const tx = dist > 1 ? (vx / dist) * 10 * k : 0
            const ty = dist > 1 ? (vy / dist) * 10 * k : 0
            const ease = Math.min(1, dt / 0.16)
            m.pullX += (tx - m.pullX) * ease
            m.pullY += (ty - m.pullY) * ease
          }
        } else {
          m.pullX += (0 - m.pullX) * Math.min(1, dt / 0.2)
          m.pullY += (0 - m.pullY) * Math.min(1, dt / 0.2)
        }
        fab.style.setProperty('--pull-x', m.pullX.toFixed(2) + 'px')
        fab.style.setProperty('--pull-y', m.pullY.toFixed(2) + 'px')

        fab.style.setProperty('--breath-intensity', (0.3 + 0.6 * level).toFixed(3))
        fab.style.setProperty('--breath-scale', (0.9 + 0.16 * level * m.amp).toFixed(3))
        fab.style.setProperty('--reflection-opacity', (0.35 + 0.5 * level).toFixed(3))
        fab.style.setProperty('--reflection-offset', `${(dx * 1.1).toFixed(2)}px`)
        fab.style.setProperty('--reflection-lift', `${(dy * 0.7).toFixed(2)}px`)
        fab.style.setProperty('--glass-opacity', (0.88 + 0.12 * m.amp).toFixed(3))
      }

      // 头像只在面板打开时存在，refs 为空就跳过 —— 不为看不见的元素算动画
      // 头像不再扩散光晕，只做亮度呼吸 —— 陪伴感不需要发光，亮一点就够
      const headImg = this.$refs.headImg
      if (headImg) {
        headImg.style.filter = `brightness(${(0.94 + 0.14 * level * m.amp).toFixed(3)})`
      }

      this._raf = requestAnimationFrame(this.tickMotion)
    },
    /** 每种播放状态一套参数 —— 加载中不呼吸、暂停后几乎静止 */
    motionParams() {
      const st = this.motionState
      if (st === 'playing') {
        return {t: this.breatheT, amp: 1, glow: 1, spin: 1}
      }
      if (st === 'loading') {
        return {t: 3.2, amp: 0.05, glow: 0.6, spin: 1.5}
      }
      if (st === 'paused') {
        return {t: 3.4, amp: 0.15, glow: 0.26, spin: 0.16}
      }
      return {t: 4.2, amp: 0.2, glow: 0.16, spin: 0.32}
    },
    /**
     * 呼吸曲线：吸气比呼气快，不是正弦波。
     * 0–36% 上升，36–52% 停在峰值，52–100% 缓慢回落（回落到 0.15，不是 0）。
     */
    breathCurve(p) {
      const ease = t => t * t * (3 - 2 * t)
      if (p < 0.36) return ease(p / 0.36)
      if (p < 0.52) return 1
      return 1 - 0.85 * ease((p - 0.52) / 0.48)
    },
    /** 查 BPM。回来时要校验 song id，防止快速切歌让旧歌的节奏盖到新歌上 */
    loadBpm(id) {
      const want = String(id)
      if (!want) return
      getBpm(want).then(bpm => {
        if (String(this.nowSong.id) !== want) return
        this.bpm = bpm
      })
    },
    onNowPlaying(payload) {
      if (!payload) return
      const changed = payload.id && payload.id !== this.nowSong.id
      this.nowSong = {
        id: payload.id || 0,
        name: payload.name || '',
        artist: payload.artist || ''
      }
      this.isPlaying = !!payload.playing
      this.pending = !!payload.pending
      if (changed) {
        this.songPulse = true
        clearTimeout(this._pulseTimer)
        this._pulseTimer = setTimeout(() => { this.songPulse = false }, 600)
        // 换歌先退回默认 100（2.4s），不继承上一首 —— 两首速度差太多时会明显错位。
        // 查到新 BPM 后由 rAF 平滑插值过去，不重启动画
        this.bpm = 0
        this.loadBpm(payload.id)
      }
    },
    askSameVibe() {
      if (!this.sameVibeText || this.sending) return
      this.ask(this.sameVibeText)
    },
    onPlayerExpand(expanded) {
      this.hidden = !!expanded
      if (expanded) this.open = false
    },
    openPanel() {
      this.open = true
      this.loadTaste()
      if (!this.messages.length) return
      this.$nextTick(() => this.scrollToEnd())
    },
    closePanel() {
      this.open = false
    },
    ask(text) {
      this.draft = text
      this.send()
    },
    reset() {
      if (this.sending) return
      this.messages = []
      this.draft = ''
      this.$nextTick(() => this.scrollToEnd())
    },
    /**
     * 历史只取已完成的问答，且只传文字。
     * 歌单对象不进 history —— 模型不需要知道上一轮具体是哪 16 首，
     * 传了既费 token 又会诱导它复读。
     */
    buildHistory() {
      const out = []
      for (const m of this.messages) {
        if (m.role === 'user' && m.text) out.push({role: 'user', content: m.text})
        else if (m.role === 'ai' && m.reply && m.playlist) out.push({role: 'assistant', content: m.reply})
      }
      return out.slice(-6)
    },
    send() {
      const text = this.draft.trim()
      if (this.sending || text.length < 2) return

      const history = this.buildHistory()
      this.messages.push({role: 'user', text})
      const aiMsg = {
        role: 'ai',
        reply: '',
        pending: true,
        playlist: null,
        error: '',
        degraded: '',
        open: false,
        saved: false,
        saving: false
      }
      this.messages.push(aiMsg)
      this.draft = ''
      this.sending = true
      this.scrollToEnd()

      const profile = this.$store.getters['UserAbout/userProfile'] || {}
      // 白名单密钥由站长手动存在 localStorage（acmusic_ai_key），普通用户没有这个键
      let authKey = ''
      try {
        authKey = localStorage.getItem('acmusic_ai_key') || ''
      } catch (e) { /* 隐私模式读不到，按普通用户处理 */ }

      recommendPlaylist({
        message: text,
        history,
        constraints: {exclude: this.exclude},
        taste: this.taste,
        // 只带一串数字 uid 用于白名单比对，不带昵称、头像等任何资料
        uid: profile.userId || undefined
      }, authKey)
          .then(res => {
            const data = res && res.data
            if (!data || !data.ok) throw new Error((data && data.error) || '选歌失败')
            aiMsg.pending = false
            // 服务端回传的排除项先同步（闲聊也会原样带回，别把会话状态清空）
            if (data.constraints && Array.isArray(data.constraints.exclude)) {
              this.exclude = data.constraints.exclude
            }
            // 闲聊：只显示一句话
            if (data.mode === 'chat') {
              aiMsg.reply = data.reply || ''
              aiMsg.playlist = null
              return
            }
            const pl = data.playlist
            if (!pl || !Array.isArray(pl.tracks)) throw new Error('返回结构异常')
            aiMsg.reply = pl.reply || ''
            aiMsg.playlist = pl
            aiMsg.degraded = data.degraded || ''
            aiMsg.open = false
          })
          .catch(err => {
            aiMsg.pending = false
            const status = err && err.response && err.response.status
            const serverMsg = err && err.response && err.response.data && err.response.data.error
            if (status === 429) aiMsg.error = serverMsg || '问得有点快，歇一分钟再来'
            else if (status === 404) aiMsg.error = 'AI 服务还没部署'
            else aiMsg.error = serverMsg || '选歌没成功，再试一次'
          })
          .finally(() => {
            this.sending = false
            this.scrollToEnd()
          })
    },
    retry(index) {
      const msg = this.messages[index]
      if (!msg || msg.pending) return
      let userText = ''
      for (let i = index - 1; i >= 0; i--) {
        if (this.messages[i].role === 'user') {
          userText = this.messages[i].text
          break
        }
      }
      if (!userText) return
      this.messages.splice(index - 1, 2)
      this.draft = userText
      this.$nextTick(() => this.send())
    },
    artistNames(track) {
      const ar = (track && (track.ar || track.artists)) || []
      return ar.map(a => a.name).filter(Boolean).join(' / ') || '未知歌手'
    },
    playTrack(track) {
      if (!track) return
      const isBlocked = this.$store.getters['BlockAbout/isTrackBlocked']
      if (isBlocked(track)) {
        this.$toast.info('这首歌在音乐黑名单里')
        return
      }
      this.$bus.$emit('songClk', track)
    },
    playSheet(playlist) {
      const tracks = playlist && playlist.tracks
      if (!tracks || !tracks.length) return
      const isBlocked = this.$store.getters['BlockAbout/isTrackBlocked']
      const playable = tracks.filter(t => !isBlocked(t))
      if (!playable.length) {
        this.$toast.info('这些歌都在音乐黑名单里')
        return
      }
      this.$store.dispatch('TracksAbout/playAllTracks', playable)
    },
    saveSheet(msg) {
      const playlist = msg.playlist
      if (!playlist || !playlist.tracks.length) return
      if (!isLoggedIn()) {
        this.$toast.info('登录后才能把歌单存到账号里')
        return
      }
      msg.saving = true
      create(playlist.title)
          .then(res => {
            const data = res && res.data
            const pid = (data && data.id) || (data && data.playlist && data.playlist.id)
            if (!pid) throw new Error('创建歌单没有返回 id')
            return addTracks('add', pid, playlist.tracks.map(t => t.id).join(','))
          })
          .then(() => {
            msg.saved = true
            this.$toast.success('已存到你的歌单')
          })
          .catch(() => {
            this.$toast.error('保存失败，稍后再试')
          })
          .finally(() => {
            msg.saving = false
          })
    },
    removeExclude(word) {
      this.exclude = this.exclude.filter(x => x !== word)
    },
    loadTaste() {
      if (this.tasteLoading || this.taste.length) return
      if (!isLoggedIn()) return
      const cached = this.readTasteCache()
      if (cached) {
        this.taste = cached
        return
      }
      this.tasteLoading = true
      likelist()
          .then(res => {
            const ids = ((res.data && res.data.ids) || []).slice(0, 20)
            if (!ids.length) return null
            return songDetail(ids.join(','))
          })
          .then(res => {
            if (!res) return
            const songs = (res.data && res.data.songs) || []
            const list = songs.map(s => {
              const ar = (s.ar && s.ar[0] && s.ar[0].name) || (s.artists && s.artists[0] && s.artists[0].name) || ''
              return ar ? `${s.name} - ${ar}` : String(s.name || '')
            }).filter(Boolean)
            if (!list.length) return
            this.taste = list
            this.writeTasteCache(list)
          })
          .catch(() => { /* 游客 / 没开红心歌单：按没有画像处理 */ })
          .finally(() => { this.tasteLoading = false })
    },
    readTasteCache() {
      try {
        const raw = localStorage.getItem('acmusic_ai_taste')
        if (!raw) return null
        const o = JSON.parse(raw)
        if (!o || !Array.isArray(o.list) || !o.list.length) return null
        if (Date.now() - Number(o.at || 0) > 24 * 60 * 60 * 1000) return null
        return o.list
      } catch (e) {
        return null
      }
    },
    writeTasteCache(list) {
      try {
        localStorage.setItem('acmusic_ai_taste', JSON.stringify({at: Date.now(), list}))
      } catch (e) { /* 隐私模式忽略 */ }
    },
    scrollToEnd() {
      this.$nextTick(() => {
        const el = this.$refs.anchor
        if (el && el.scrollIntoView) el.scrollIntoView({block: 'end', behavior: 'smooth'})
      })
    }
  }
}
</script>

<style scoped lang="scss">
@import "src/assets/scss/base/variables";

/**
 * 组件内统一 border-box。
 * 项目的 reset 没有设全局盒模型，而这里的卡片和气泡全是
 * 「width:100% + padding + border」的组合 —— content-box 下每一条都会比容器宽 20 多像素，
 * 叠起来就是底部那条横向滚动条。
 */
.ai-assistant,
.ai-assistant *,
.ai-assistant *::before,
.ai-assistant *::after {
  box-sizing: border-box;
}

// ---- 浮动按钮（Glass Orb）----
.ai-fab {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 90;
  width: 64px;
  height: 64px;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  // 位移留给"引力"（rAF 每帧写变量），缩放交给内层玻璃 ——
  // 两者分开，才不会像之前那样互相覆盖
  transform: translate3d(var(--pull-x, 0px), var(--pull-y, 0px), 0);
  --pull-x: 0px;
  --pull-y: 0px;
  // 位置切换要有过渡：有歌时它会从角落"滑"到播放条旁边
  transition: right .34s cubic-bezier(.22, .61, .36, 1), bottom .34s cubic-bezier(.22, .61, .36, 1);

  // rAF 每帧只改这几个变量，玻璃本体据此呼吸；不直接改属性值，
  // 是为了让"呼吸"这件事由一份配置驱动，而不是散落在各处
  --breath-intensity: .5;
  --breath-scale: 1;
  --reflection-opacity: .7;
  --reflection-offset: 0px;
  --reflection-lift: 0px;
  --glass-opacity: 1;
  // 球体三段渐变的浓度，浅色主题下会整体覆盖（见文件末尾）
  --orb-top: rgba(255, 255, 255, .42);
  --orb-core: rgba(var(--theme-accent-rgb), .48);
  --orb-bottom: rgba(30, 24, 62, .45);
  --orb-border: rgba(255, 255, 255, .3);

  // 有歌时贴到播放条（60px 高）右端，像一个从条上长出来的旋钮；
  // 没歌时回到角落。之前是 bottom 104，离条 44px，悬在半空才显得多余
  &.has-player {
    bottom: 72px;
    right: 20px;
  }

  // 缩放做在玻璃上，外层留给引力位移
  &:hover .orb-glass { transform: scale(1.05); }
  &:active .orb-glass { transform: scale(.96); }

  &.is-pulse .orb-glass {
    animation: fab-pulse .55s ease;
  }

  // ---- 玻璃球本体 ----
  .orb-glass {
    position: relative;
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 50%;
    overflow: hidden;
    // 三段渐变：顶部被光照亮、中间是主色、底部压暗表现玻璃的厚度。
    // 三个 alpha 都提成变量，浅色主题下要整体加浓，否则半透明球在浅背景上会被"透白"
    background: linear-gradient(145deg,
        var(--orb-top, rgba(255, 255, 255, .42)) 0%,
        var(--orb-core, rgba(var(--theme-accent-rgb), .48)) 44%,
        var(--orb-bottom, rgba(30, 24, 62, .45)) 100%);
    border: 1px solid var(--orb-border, rgba(255, 255, 255, .3));
    box-shadow:
      inset 0 1px 2px rgba(255, 255, 255, .5),
      // 底部只留一点内壁的暗，压太重会像塑料壳的厚度
      inset 0 -8px 16px rgba(40, 30, 90, .16),
      // 落地阴影用中性黑：主色投影在浅色背景上会糊成一圈光晕，用户不要那个
      0 6px 16px rgba(0, 0, 0, .22);
    backdrop-filter: blur(12px) saturate(140%);
    -webkit-backdrop-filter: blur(12px) saturate(140%);
    opacity: var(--glass-opacity, 1);
    transition: transform .22s ease;
  }

  // 内部漫射光：球心那团亮，随呼吸缩放 —— 这是"玻璃里有光"的来源
  .orb-inner-glow {
    position: absolute;
    inset: 8px;
    border-radius: 50%;
    background: radial-gradient(circle,
        rgba(255, 255, 255, .52) 0%,
        rgba(var(--theme-accent-rgb), .32) 48%,
        rgba(var(--theme-accent-rgb), 0) 75%);
    filter: blur(5px);
    opacity: var(--breath-intensity, .5);
    transform: scale(var(--breath-scale, 1));
    will-change: transform, opacity;
  }

  // 表面高光：左上亮、右下极淡，制造球面的弧度
  .orb-highlight {
    position: absolute;
    inset: 1px;
    border-radius: 50%;
    pointer-events: none;
    background: linear-gradient(155deg,
        rgba(255, 255, 255, .4) 0%,
        rgba(255, 255, 255, 0) 38%,
        rgba(255, 255, 255, 0) 70%,
        rgba(255, 255, 255, .1) 100%);
  }

  // 弧形玻璃反射：顶部那道弯月形亮边，是"玻璃"最直接的证据
  .orb-reflection {
    position: absolute;
    top: 5px;
    left: 8px;
    width: 42px;
    height: 18px;
    border-top: 2px solid rgba(255, 255, 255, .55);
    border-radius: 50%;
    filter: blur(1px);
    pointer-events: none;
    transform: rotate(-25deg) translate(var(--reflection-offset, 0px), var(--reflection-lift, 0px));
    opacity: var(--reflection-opacity, .7);
    will-change: transform, opacity;
  }

  // 外沿一道细弧光。转速固定 —— BPM 只决定呼吸快慢，不决定转速
  .orb-arc {
    position: absolute;
    inset: -5px;
    border-radius: 50%;
    pointer-events: none;
    background: conic-gradient(from 0deg,
        rgba(255, 255, 255, 0) 0deg,
        rgba(255, 255, 255, 0) 272deg,
        rgba(226, 220, 255, .55) 308deg,
        rgba(255, 255, 255, 0) 344deg);
    -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1.5px));
    mask: radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1.5px));
    animation: orb-orbit 7s linear infinite;
  }

  .orb-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 26px;
    height: 26px;
    transform: translate(-50%, -50%);
    overflow: visible;
    color: #fff;
    filter: drop-shadow(0 1px 2px rgba(20, 12, 50, .45));
  }

  // 两颗星各自绕自身中心动、相位错开：一起动会像整个图标在呼吸，
  // 错开才像真实的星光闪烁
  .glyph-main {
    transform-box: fill-box;
    transform-origin: center;
    animation: glyph-breathe 3.4s ease-in-out infinite;
  }

  .glyph-mini {
    transform-box: fill-box;
    transform-origin: center;
    animation: glyph-twinkle 3.4s ease-in-out infinite;
    animation-delay: .55s;
  }
}

// ---- 面板 ----
.ai-panel {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 90;
  width: min(420px, calc(100vw - 32px));
  // 高度上限：再高就顶到导航栏了
  height: min(620px, calc(100vh - 160px));
  display: flex;
  flex-direction: column;
  border-radius: 18px;
  border: 1px solid var(--c-border-strong);
  background: var(--c-bg-elevated);
  box-shadow: 0 18px 48px rgba(0, 0, 0, .34);
  overflow: hidden;

  &.has-player { bottom: 104px; height: min(620px, calc(100vh - 240px)); }
}

.panel-head {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid var(--c-border);
  background: var(--c-bg-sunken);

  .head-avatar {
    position: relative;
    width: 30px;
    height: 30px;
    flex-shrink: 0;

    .ha-img {
      display: block;
      width: 100%;
      height: 100%;
      // 改圆形：方形头像套圆形光环会在四个角穿帮
      border-radius: 50%;
      overflow: hidden;
      // favicon 是透明底深色图形，深色主题下会糊进背景，垫一层浅底才看得见
      background: #fff;

      img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

  }

  .head-text {
    min-width: 0;
    flex: 1 1 auto;
    display: flex;
    flex-direction: column;
    line-height: 1.35;

    strong {
      font-size: 14px;
      font-weight: 500;
      color: $font-black;
    }

    span {
      font-size: 11px;
      color: $font-black-2;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  .head-btn {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: $font-black-2;
    cursor: pointer;
    transition: background .18s ease, color .18s ease;

    &:hover {
      background: var(--c-bg-elevated);
      color: $font-black;
    }
  }
}

// ---- 消息区 ----
.panel-thread {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  // 兜底：这个窗口只有 420px 宽，任何一处溢出都会立刻变成横条，宁可裁掉也不给横向滚动
  overflow-x: hidden;
  overscroll-behavior: contain;
  padding: 14px;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb {
    background: var(--c-border-strong);
    border-radius: 2px;
  }
}

.panel-intro {
  padding: 8px 2px 4px;


  .intro-title {
    margin: 0 0 10px;
    font-size: 13px;
    color: $font-black-1;
  }

  .intro-presets {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .intro-preset {
    height: 30px;
    padding: 0 12px;
    border-radius: $radius-pill;
    border: 1px solid var(--c-border-strong);
    background: transparent;
    color: $font-black-1;
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;
    transition: all .18s ease;

    &:hover {
      color: $font-black;
      border-color: var(--c-accent);
      background: var(--c-bg-sunken);
    }
  }
}

.msg {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 14px;

  &.is-user { flex-direction: row-reverse; }
}

.msg-avatar {
  flex: 0 0 auto;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--c-border);
  background: #fff;

  // 未登录的占位头像：圆底 + 人形图标，刻意不用站点图标
  &.is-default {
    display: grid;
    place-items: center;
    background: var(--c-bg-sunken);
    color: $font-black-2;
  }
}

.msg-body {
  min-width: 0;
  max-width: calc(100% - 40px);
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;

  .is-user & { align-items: flex-end; }
}

.bubble {
  max-width: 100%;
  padding: 9px 12px;
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-wrap;

  &.is-user {
    background: var(--c-button-primary);
    color: var(--c-text-on-accent);
    border-radius: 14px 14px 4px 14px;
  }

  &.is-ai {
    background: var(--c-bg-sunken);
    border: 1px solid var(--c-border);
    color: $font-black;
    border-radius: 14px 14px 14px 4px;
  }

  &.is-thinking {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: $font-black-2;

    .spin { animation: ai-spin 1s linear infinite; }
  }

  &.is-error {
    display: flex;
    align-items: center;
    gap: 8px;
    color: $font-black-2;

    .retry {
      flex-shrink: 0;
      height: 22px;
      padding: 0 9px;
      border-radius: $radius-pill;
      border: 1px solid var(--c-border-strong);
      background: transparent;
      color: $font-black;
      font-size: 11px;
      font-family: inherit;
      cursor: pointer;
    }
  }
}

@keyframes ai-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .bubble.is-thinking .spin { animation: none; }
}

// ---- 歌单卡片 ----
.sheet {
  width: 100%;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid var(--c-border);
  background: var(--c-bg-sunken);

  .sheet-head { min-width: 0; }

  .sheet-title {
    display: block;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.4;
    color: $font-black;
    margin-bottom: 4px;
  }

  .sheet-desc {
    margin: 0;
    font-size: 12px;
    line-height: 1.55;
    color: $font-black-1;
  }

  .sheet-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 8px;
    font-size: 11px;
    color: $font-black-2;
  }

  .sheet-why {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    opacity: .85;
  }

  .sheet-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin: 10px 0 2px;
  }

  .sheet-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 28px;
    padding: 0 12px;
    border-radius: $radius-pill;
    border: 1px solid var(--c-border-strong);
    background: transparent;
    color: $font-black-1;
    font-size: 12px;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: all .18s ease;

    &:hover:not(:disabled) {
      color: $font-black;
      border-color: var(--c-border-primary);
    }

    &:disabled { opacity: .5; cursor: not-allowed; }

    &.is-primary {
      border-color: transparent;
      background: var(--c-button-primary);
      color: var(--c-text-on-accent);

      &:hover:not(:disabled) { color: var(--c-text-on-accent); opacity: .9; }
    }

    &.is-quiet {
      border-color: transparent;
      font-weight: 400;
      padding: 0 8px;
    }
  }

  .sheet-note {
    margin: 8px 0 0;
    font-size: 11px;
    line-height: 1.55;
    color: $font-black-2;

    &.is-warn { color: var(--c-warning, #d9534f); }
  }
}

// 精简曲目：只有序号 + 歌名/歌手，两行一条，420px 里不会挤
.mini-tracks {
  list-style: none;
  margin: 10px 0 0;
  padding: 8px 0 0;
  border-top: 1px solid var(--c-border);
  max-height: 260px;
  overflow-y: auto;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb {
    background: var(--c-border-strong);
    border-radius: 2px;
  }
}

.mini-track {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 4px;
  border-radius: 6px;
  cursor: pointer;
  transition: background .15s ease;

  &:hover { background: var(--c-bg-elevated); }

  .mt-idx {
    flex: 0 0 16px;
    text-align: right;
    font-size: 11px;
    color: $font-black-2;
    font-variant-numeric: tabular-nums;
  }

  .mt-main {
    min-width: 0;
    display: flex;
    flex-direction: column;
    line-height: 1.35;
  }

  .mt-name {
    font-size: 12px;
    color: $font-black;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mt-artist {
    font-size: 11px;
    color: $font-black-2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

// ---- 输入区 ----
.panel-composer {
  flex: 0 0 auto;
  padding: 10px 12px 12px;
  border-top: 1px solid var(--c-border);
  background: var(--c-bg-elevated);
}

.vibe-row {
  padding: 0 2px 8px;
}

// 虚线边框：和「已排除」的实线 chip 区分开 —— 一个是你定下的规则，
// 一个是我主动给的建议
.vibe-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 100%;
  height: 24px;
  padding: 0 10px;
  border-radius: $radius-pill;
  border: 1px dashed rgba(var(--theme-accent-rgb), .55);
  background: transparent;
  color: $color-main-text;
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: border-color .18s ease;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover { border-style: solid; }
}

.exclude-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 2px 8px;

  .ex-label {
    font-size: 11px;
    color: $font-black-2;
  }

  .ex-chip {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    height: 21px;
    padding: 0 7px 0 8px;
    border-radius: $radius-pill;
    border: 1px solid rgba(var(--theme-accent-rgb), .35);
    background: rgba(var(--theme-accent-rgb), .10);
    color: $color-main-text;
    font-size: 11px;
    font-family: inherit;
    cursor: pointer;

    i {
      font-style: normal;
      opacity: .55;
    }

    &:hover i { opacity: 1; }
  }
}

.composer-box {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 6px 6px 6px 12px;
  border-radius: 14px;
  border: 1px solid var(--c-border-strong);
  background: var(--c-bg-sunken);
  transition: border-color .18s ease;

  &:focus-within { border-color: var(--c-accent); }
}

.composer-input {
  flex: 1 1 auto;
  min-width: 0;
  max-height: 88px;
  padding: 6px 0;
  border: none;
  background: transparent;
  color: $font-black;
  font-size: 13px;
  line-height: 1.55;
  font-family: inherit;
  resize: none;
  outline: none;

  &::placeholder { color: $font-black-2; }
  &:disabled { opacity: .6; }
}

.composer-send {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 50%;
  background: var(--c-button-primary);
  color: var(--c-text-on-accent);
  cursor: pointer;
  transition: opacity .2s ease;

  &:disabled { opacity: .4; cursor: not-allowed; }
}

// ---- 进出场 ----
.panel-pop-enter-active,
.panel-pop-leave-active {
  transition: opacity .18s ease, transform .18s ease;
  transform-origin: bottom right;
}

.panel-pop-enter,
.panel-pop-leave-to {
  opacity: 0;
  transform: translateY(8px) scale(.97);
}

@keyframes glyph-breathe {
  0%, 100% { transform: scale(.94); opacity: .88; }
  50% { transform: scale(1.06); opacity: 1; }
}

@keyframes glyph-twinkle {
  0%, 100% { transform: scale(.82); opacity: .32; }
  45% { transform: scale(1.12); opacity: 1; }
}

@keyframes fab-pulse {
  0% { transform: scale(1); }
  40% { transform: scale(1.12); }
  100% { transform: scale(1); }
}

// 外沿细弧光：匀速绕圈，和呼吸解耦
@keyframes orb-orbit {
  to { transform: rotate(360deg); }
}

// 系统开了「减少动态效果」：双星的 CSS 动画和换歌脉冲都停掉；
// 光环那边由 JS 判断，prefersReduced() 为真时干脆不启动 rAF
@media (prefers-reduced-motion: reduce) {
  .ai-fab .glyph-main,
  .ai-fab .glyph-mini,
  .ai-fab .orb-arc,
  .ai-fab.is-pulse {
    animation: none;
  }
}

// 浅色主题下球体必须加浓。
// 玻璃是半透明 + backdrop-filter，背景越亮透进来越多 —— 白底上原来的浓度
// 会淡成一个灰紫球，白色图标也跟着糊掉。这里只调浓度，不动结构
html[data-theme="light"] .ai-fab {
  --orb-top: rgba(255, 255, 255, .62);
  --orb-core: rgba(var(--theme-accent-rgb), .92);
  --orb-bottom: rgba(56, 44, 120, .68);
  // 浅底上白边框会糊出一圈光晕感，收细一点
  --orb-border: rgba(255, 255, 255, .38);
}
</style>
