<template>
  <div v-show="!hidden" class="ai-assistant">
    <!-- 浮动入口：右下角，避开底部播放条 -->
    <button
        v-show="!open"
        type="button"
        class="ai-fab"
        :class="{ 'has-player': hasPlayer }"
        aria-label="打开 AI 点歌"
        title="AI 点歌"
        @click="openPanel"
    >
      <BaseIcon name="sparkles" :size="22"/>
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
          <img class="head-avatar" src="/favicon.ico" alt="">
          <div class="head-text">
            <strong>AI 点歌</strong>
            <span>说一句，给你挑一张歌单</span>
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
      presets: ['下雨天写代码', '90 年代粤语金曲', '跑步时听的快节奏']
    }
  },
  computed: {
    canSend() {
      return !this.sending && this.draft.trim().length >= 2
    },
    hasPlayer() {
      const list = this.$store.state.TracksAbout.currentPlaylist
      return Array.isArray(list) && list.length > 0
    },
    userAvatar() {
      const p = this.$store.getters['UserAbout/userProfile']
      return (p && p.avatarUrl) || ''
    }
  },
  mounted() {
    // 全屏播放详情页上不显示入口
    this.$bus.$on('playerExpand', this.onPlayerExpand)
  },
  beforeDestroy() {
    this.$bus.$off('playerExpand', this.onPlayerExpand)
  },
  methods: {
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

// ---- 浮动按钮 ----
.ai-fab {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 90;
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 50%;
  background: var(--c-button-primary);
  color: var(--c-text-on-accent);
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(var(--theme-accent-rgb), .38);
  transition: transform .2s ease, box-shadow .2s ease;

  // 有播放条时抬高，避免压在播放条上
  &.has-player { bottom: 104px; }

  &:hover {
    transform: translateY(-2px) scale(1.04);
    box-shadow: 0 12px 30px rgba(var(--theme-accent-rgb), .48);
  }

  &:active { transform: scale(.96); }
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
    width: 30px;
    height: 30px;
    border-radius: 9px;
    object-fit: cover;
    flex-shrink: 0;
    // favicon 是透明底深色图形，深色主题下会糊进背景，垫一层浅底才看得见
    background: #fff;
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
</style>
