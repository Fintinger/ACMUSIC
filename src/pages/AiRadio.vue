<template>
  <div class="ai-radio">
    <!-- 页面头：与发现页/每日推荐同一套 hero 规格，不另起一套视觉 -->
    <header class="ai-hero">
      <div class="ai-hero-main">
        <h1 class="ai-title">AI 点歌</h1>
        <p class="ai-sub">说一句你想听什么，整理成一张能直接播放的歌单</p>
      </div>
      <button v-if="messages.length" type="button" class="ai-reset" @click="reset">
        <BaseIcon name="edit"/><span>新对话</span>
      </button>
    </header>

    <div ref="thread" class="ai-thread">
      <!-- 空态：给几个方向差异明显的例子，比一句「请输入」有用 -->
      <div v-if="!messages.length" class="ai-intro">
        <p class="ai-intro-title">不知道怎么说？试试这些</p>
        <div class="ai-presets">
          <button
              v-for="p in presets"
              :key="p"
              type="button"
              class="ai-preset"
              @click="ask(p)"
          >{{ p }}</button>
        </div>
        <p class="ai-intro-note">
          每个歌名都会回到曲库核对一遍，搜不到的歌不会出现在列表里。
        </p>
      </div>

      <div
          v-for="(m, i) in messages"
          :key="i"
          class="ai-msg"
          :class="m.role === 'user' ? 'is-user' : 'is-ai'"
      >
        <!-- 用户：右对齐气泡，只说原话，不再复述 -->
        <div v-if="m.role === 'user'" class="ai-bubble">{{ m.text }}</div>

        <!-- AI：一句话回应 + 歌单卡片 -->
        <div v-else class="ai-answer">
          <p v-if="m.reply" class="ai-reply">{{ m.reply }}</p>

          <div v-if="m.pending" class="ai-thinking">
            <BaseIcon name="loader" class="is-spinning"/>
            <span>正在按你的描述找歌，每个候选都会回曲库核对…</span>
          </div>

          <div v-else-if="m.error" class="ai-fail">
            <span>{{ m.error }}</span>
            <button type="button" class="ai-retry" @click="retry(i)">再试一次</button>
          </div>

          <div v-else-if="m.playlist" class="ai-sheet">
            <div class="sheet-head">
              <h3 class="sheet-title">{{ m.playlist.title }}</h3>
              <p v-if="m.playlist.desc" class="sheet-desc">{{ m.playlist.desc }}</p>
            </div>

            <div class="sheet-meta">
              <span class="sheet-count">{{ m.playlist.tracks.length }} 首</span>
              <span v-if="m.playlist.keywords.length" class="sheet-keys" :title="m.playlist.keywords.join(' / ')">
                {{ m.playlist.keywords.join(' · ') }}
              </span>
            </div>

            <div class="sheet-actions">
              <button
                  type="button"
                  class="sheet-btn is-primary"
                  :disabled="!m.playlist.tracks.length"
                  @click="playSheet(m.playlist)"
              >
                <BaseIcon name="play"/><span>播放全部</span>
              </button>
              <button
                  type="button"
                  class="sheet-btn"
                  :disabled="m.saving || m.saved || !m.playlist.tracks.length"
                  @click="saveSheet(m)"
              >
                <BaseIcon :name="m.saved ? 'check' : 'star'"/>
                <span>{{ m.saved ? '已存为歌单' : m.saving ? '保存中…' : '收藏为歌单' }}</span>
              </button>
              <button
                  type="button"
                  class="sheet-btn is-quiet"
                  :disabled="!m.playlist.tracks.length"
                  @click="m.open = !m.open"
              >
                <span>{{ m.open ? '收起曲目' : '展开 ' + m.playlist.tracks.length + ' 首' }}</span>
              </button>
            </div>

            <TracksLayout v-if="m.open" :list="m.playlist.tracks" :need-btn="false"/>

            <!-- 降级要说清楚：否则用户会以为模型挑的就是这些，实际是按原话直搜的结果 -->
            <p v-if="m.degraded === 'no-key'" class="sheet-note">
              服务端还没配模型密钥，这次是按你的原话直接搜的，多轮理解用不了。
            </p>
            <p v-else-if="m.degraded === 'llm-failed'" class="sheet-note">
              模型这次没返回结果，已退回关键词直搜。
            </p>
            <p v-if="!m.playlist.tracks.length" class="sheet-note is-warn">
              这些描述暂时没搜到能播的歌，换个说法再试一次。
            </p>
          </div>
        </div>
      </div>

      <!-- 滚动锚点：每次新增消息滚到这里 -->
      <div ref="anchor" class="ai-anchor"></div>
    </div>

    <!-- 输入区：sticky 贴在视口底部；页面有播放器时由 hasPlayer 抬高，避免被盖住 -->
    <div class="ai-composer" :class="{ 'has-player': hasPlayer }">
      <div class="composer-inner">
        <textarea
            v-model="draft"
            class="composer-input"
            :placeholder="sending ? '正在选歌…' : '例如：通勤路上想听点带劲的日系摇滚'"
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
        >{{ sending ? '选歌中' : '发送' }}</button>
      </div>
    </div>
  </div>
</template>

<script>
import TracksLayout from "@/components/layout/TracksLayout";
import {recommendPlaylist} from "@/api/Ai";
import {create, addTracks} from "@/api/Playlist";
import {isLoggedIn} from "@/utils/auth";

/**
 * AI 点歌页
 *
 * 产品形态：一个可以连续追问的聊天窗，每次回答给一张**可播放、可收藏**的歌单，
 * 而不是一串需要用户自己去搜的歌名。
 *
 * 关键约定：歌曲数组来自服务端已校验的结果，前端不再做二次搜索；
 * 播放复用 TracksAbout/playAllTracks，收藏复用 /playlist/create + /playlist/tracks，
 * 因此这里不碰播放器，也不新增任何状态管理。
 */
export default {
  name: "AiRadio",
  components: {TracksLayout},
  data() {
    return {
      messages: [],
      draft: '',
      sending: false,
      presets: [
        '下雨天在窗边写代码',
        '90 年代粤语金曲',
        '跑步时听的快节奏',
        '失眠了，想被哄睡'
      ]
    }
  },
  computed: {
    canSend() {
      return !this.sending && this.draft.trim().length >= 2
    },
    /** 有播放器时底部被固定播放条占着，输入区要跟着抬高，否则最后一行字永远看不见 */
    hasPlayer() {
      const list = this.$store.state.TracksAbout.currentPlaylist
      return Array.isArray(list) && list.length > 0
    }
  },
  methods: {
    /**
     * 历史只取已完成的问答，且只传文字。
     * 歌单对象不进 history —— 模型不需要知道上一轮具体是哪 18 首，
     * 传了既费 token 又会诱导它复读同样的歌。
     */
    buildHistory() {
      const out = []
      for (const m of this.messages) {
        if (m.role === 'user' && m.text) out.push({role: 'user', content: m.text})
        else if (m.role === 'ai' && m.reply && m.playlist) out.push({role: 'assistant', content: m.reply})
      }
      return out.slice(-6)
    },
    ask(text) {
      this.draft = text
      this.send()
    },
    reset() {
      if (this.sending) return
      this.messages = []
      this.draft = ''
      this.scrollToEnd()
    },
    send() {
      const text = this.draft.trim()
      if (this.sending || text.length < 2) return

      const history = this.buildHistory()
      this.messages.push({role: 'user', text})
      // 先占位再请求：用户必须立刻看到"收到了"，而不是点了没反应。
      // 字段必须一次写全 —— Vue 2 侦测不到后加的对象属性，缺哪个后面改了都不刷新。
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

      recommendPlaylist({message: text, history})
          .then(res => {
            const data = res && res.data
            if (!data || !data.ok) throw new Error((data && data.error) || '选歌失败')
            const pl = data.playlist
            if (!pl || !Array.isArray(pl.tracks)) throw new Error('返回结构异常')
            aiMsg.pending = false
            aiMsg.reply = pl.reply || ''
            aiMsg.playlist = pl
            aiMsg.degraded = data.degraded || ''
            // 默认收起：18 行曲目会把整段对话撑得很长，想看再展开
            aiMsg.open = false
          })
          .catch(err => {
            aiMsg.pending = false
            const status = err && err.response && err.response.status
            const serverMsg = err && err.response && err.response.data && err.response.data.error
            if (status === 429) aiMsg.error = serverMsg || '问得有点快，歇一分钟再来'
            else if (status === 404) aiMsg.error = 'AI 服务还没部署到线上，本地先跑 node api/ai-recommend.mjs'
            else aiMsg.error = serverMsg || '选歌没成功，再试一次'
          })
          .finally(() => {
            this.sending = false
            this.scrollToEnd()
          })
    },
    retry(index) {
      // 重试 = 回到「上一条用户消息」再发一次，而不是把失败那条也当成历史
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
    playSheet(playlist) {
      const tracks = playlist && playlist.tracks
      if (!tracks || !tracks.length) return
      // 与每日推荐页同一套黑名单处理：列表里能看见，队列里也不该偷偷带进去
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
            // 两种返回形态都见过：顶层 id 与 playlist.id，取到一个就行
            const data = res && res.data
            const pid = (data && data.id) || (data && data.playlist && data.playlist.id)
            if (!pid) throw new Error('创建歌单没有返回 id')
            const ids = playlist.tracks.map(t => t.id).join(',')
            return addTracks('add', pid, ids)
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

.ai-radio {
  // 撑满一屏：对话还短的时候输入框要停在底部，而不是浮在页面中间。
  // 减掉的 300px 是「导航 80 + el-main 上边距 40 + 页脚与间距」，高度超了也不影响（长对话自然撑开）
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 300px);
}

// 中间的消息流吃掉剩余空间，把输入区压到底部
.ai-thread {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
}

.ai-anchor {
  height: 1px;
}

.ai-hero {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: $sp-4;
  flex-wrap: wrap;
  padding: $sp-6 0 $sp-5;
  border-bottom: 1px solid var(--c-border);
  margin-bottom: $sp-4;

  .ai-hero-main { min-width: 0; }

  .ai-title {
    font-size: $fs-page;
    font-weight: 700;
    line-height: 1.3;
    color: $font-black;
    margin: 0 0 $sp-2;
  }

  .ai-sub {
    font-size: 14px;
    color: $font-black-2;
    margin: 0;
  }

  .ai-reset {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 16px;
    border-radius: $radius-pill;
    border: 1px solid var(--c-border-strong);
    background: transparent;
    color: var(--c-text-secondary);
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: color .2s ease, border-color .2s ease;

    &:hover { color: var(--c-text-primary); border-color: var(--c-border-primary); }
  }
}

// ---- 空态 ----
.ai-intro {
  padding: $sp-5 0 $sp-4;
  // 空态时垂直居中：否则所有内容挤在顶部，下面留出一大片空白
  margin: auto 0;

  .ai-intro-title {
    font-size: 14px;
    color: $font-black-1;
    margin: 0 0 $sp-3;
  }

  .ai-presets {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .ai-preset {
    height: 36px;
    padding: 0 16px;
    border-radius: $radius-pill;
    border: 1px solid var(--c-border-strong);
    background: var(--c-bg-sunken);
    color: var(--c-text-secondary);
    font-size: 13px;
    font-family: inherit;
    cursor: pointer;
    transition: all .18s ease;

    &:hover {
      color: var(--c-text-primary);
      border-color: var(--c-border-primary);
      background: var(--c-bg-elevated);
    }
  }

  .ai-intro-note {
    margin: $sp-4 0 0;
    font-size: 12px;
    color: $font-black-2;
  }
}

// ---- 消息流 ----
.ai-msg {
  display: flex;
  margin-bottom: $sp-5;

  &.is-user { justify-content: flex-end; }
  &.is-ai { justify-content: flex-start; }
}

.ai-bubble {
  max-width: min(560px, 82%);
  padding: 11px 16px;
  border-radius: 16px 16px 4px 16px;
  background: var(--c-button-primary);
  color: var(--c-text-on-accent);
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
  white-space: pre-wrap;
}

.ai-answer {
  width: 100%;
  max-width: 720px;
  min-width: 0;
}

.ai-reply {
  margin: 0 0 10px;
  font-size: 14px;
  line-height: 1.6;
  color: $font-black;
}

.ai-thinking {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  border-radius: 14px;
  background: var(--c-bg-sunken);
  border: 1px solid var(--c-border);
  font-size: 13px;
  color: $font-black-2;

  .is-spinning {
    animation: ai-spin 1s linear infinite;
  }
}

@keyframes ai-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .ai-thinking .is-spinning { animation: none; }
}

.ai-fail {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid var(--c-border);
  background: var(--c-bg-sunken);
  font-size: 13px;
  color: $font-black-2;

  .ai-retry {
    flex-shrink: 0;
    height: 28px;
    padding: 0 14px;
    border-radius: $radius-pill;
    border: 1px solid var(--c-border-strong);
    background: transparent;
    color: var(--c-text-primary);
    font-size: 12px;
    font-family: inherit;
    cursor: pointer;

    &:hover { border-color: var(--c-border-primary); }
  }
}

// ---- 歌单卡片 ----
.ai-sheet {
  padding: $sp-4;
  border-radius: 16px;
  border: 1px solid var(--c-border);
  background: var(--c-bg-sunken);

  .sheet-head {
    min-width: 0;
  }

  .sheet-title {
    margin: 0 0 6px;
    font-size: 17px;
    font-weight: 700;
    line-height: 1.4;
    color: $font-black;
  }

  .sheet-desc {
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    color: $font-black-1;
  }

  .sheet-meta {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 10px;
    font-size: 12px;
    color: $font-black-2;
  }

  .sheet-count { flex-shrink: 0; }

  .sheet-keys {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    opacity: .85;
  }

  .sheet-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin: 14px 0 4px;
  }

  .sheet-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    padding: 0 16px;
    border-radius: $radius-pill;
    border: 1px solid var(--c-border-strong);
    background: transparent;
    color: var(--c-text-secondary);
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all .18s ease;

    &:hover:not(:disabled) {
      color: var(--c-text-primary);
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
    }
  }

  .sheet-note {
    margin: 10px 0 0;
    font-size: 12px;
    line-height: 1.6;
    color: $font-black-2;

    &.is-warn { color: var(--c-warning, #d9534f); }
  }
}

// ---- 输入区 ----
.ai-composer {
  position: sticky;
  bottom: 0;
  z-index: 20;
  padding: 12px 0 16px;
  margin-top: $sp-4;
  // 半透明压底：消息从下面滚过去时不会和文字重叠
  background: linear-gradient(to bottom, transparent, var(--c-bg-base) 24px);
  background-color: transparent;

  &.has-player { bottom: 64px; }

  .composer-inner {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    padding: 8px 8px 8px 16px;
    border-radius: 18px;
    border: 1px solid var(--c-border-strong);
    background: var(--c-bg-elevated);
    box-shadow: 0 6px 24px rgba(0, 0, 0, .16);
  }

  .composer-input {
    flex: 1 1 auto;
    min-width: 0;
    max-height: 120px;
    padding: 8px 0;
    border: none;
    background: transparent;
    color: $font-black;
    font-size: 14px;
    line-height: 1.6;
    font-family: inherit;
    resize: none;
    outline: none;

    &::placeholder { color: $font-black-2; }
    &:disabled { opacity: .6; }
  }

  .composer-send {
    flex-shrink: 0;
    height: 36px;
    padding: 0 20px;
    border: none;
    border-radius: $radius-pill;
    background: var(--c-button-primary);
    color: var(--c-text-on-accent);
    font-size: 13px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: opacity .2s ease;

    &:disabled { opacity: .45; cursor: not-allowed; }
  }
}

@media (max-width: 720px) {
  .ai-sheet .sheet-actions .sheet-btn { padding: 0 12px; }
  .ai-bubble { max-width: 92%; }
}
</style>
