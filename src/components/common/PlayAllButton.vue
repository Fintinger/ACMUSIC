<template>
  <div
      class="play-all-combo"
      :class="['size-' + size, 'variant-' + variant, { 'is-disabled': isDisabled, 'is-expand': expandOnHover }]"
  >
    <!-- 主段：播放全部 -->
    <button
        type="button"
        class="pac-main"
        :disabled="isDisabled"
        :title="playTitle"
        @click.stop="playAll"
    >
      <span class="pac-play-circle"><BaseIcon name="play" :size="circleIconSize"/></span>
      <span class="pac-text">{{ playLabel }}</span>
    </button>

    <!-- 副段：整批加入播放列表（队列）。默认收起，鼠标移到胶囊上才展开；title 说明动作与首数 -->
    <button
        v-if="addable"
        type="button"
        class="pac-add"
        :class="{ 'is-locked': queueAddBlocked }"
        :disabled="isDisabled"
        :aria-disabled="queueAddBlocked ? 'true' : 'false'"
        aria-label="添加到播放列表"
        :title="addTitle"
        @click.stop="addAll"
    >
      <BaseIcon name="listPlus" :size="iconSize"/>
    </button>
  </div>
</template>

<script>
/**
 * 全站统一的「播放全部」按钮（可选带「添加到播放列表」）。
 *
 * 尺寸刻意对齐各页原来的「播放全部」，不因为多了加入动作而变宽：
 *  - 主段永远按原尺寸渲染；
 *  - 加入动作默认宽度 0、不可见，鼠标悬停（或键盘 focus）时以 0.24s 缓动展开成图标，
 *    带 title 提示，移开后收回。这样日常浏览时按钮就是原来那颗播放按钮。
 *  - 首页每日推荐大卡片、私人 FM 这类不适合整批入队的场景传 `:addable="false"`，只剩播放；
 *    首页大卡片用 variant="cover" 恢复封面图上的透明玻璃按钮（悬停展开文字）。
 *
 * 行为只写一份：
 *  - 播放：跳过黑名单（PlayerCore 也会跳过，这里先过滤是为了「全部被屏蔽」时能给出提示）；
 *  - 加入：按 String(id) 去重后再入队，空队列时通知 PlayerCore 顺手开播并落盘；
 *  - FM / 心动接管队列时，加入图标压暗但保留点击反馈（真 disable 会让人以为按钮坏了）。
 *
 * 用法：<PlayAllButton :tracks="songs" size="xs|sm|md|lg"/>，
 * 私人 FM 用 variant="glass" 并传 keep-stream（保持 FM 流不被换台逻辑退掉）。
 */
export default {
  name: 'PlayAllButton',
  props: {
    /** 要播放 / 加入的歌曲数组（页面自己那块列表，按渲染顺序） */
    tracks: {
      type: Array,
      default: () => []
    },
    /** xs（列表顶部） / sm（浮窗） / md（每日推荐） / lg（详情页 hero） */
    size: {
      type: String,
      default: 'md'
    },
    /** solid（默认主题实色） / glass（私人 FM 磨砂玻璃） / cover（封面图上的透明玻璃） */
    variant: {
      type: String,
      default: 'solid'
    },
    /** 是否提供「添加到播放列表」动作（每日推荐 / 私人 FM 关掉） */
    addable: {
      type: Boolean,
      default: true
    },
    /** 外部条件禁用（如详情页还在加载、不可播放） */
    disabled: {
      type: Boolean,
      default: false
    },
    /** 保留当前推荐流（私人 FM 专用；普通歌单不能给，否则 FM 模式退不掉） */
    keepStream: {
      type: Boolean,
      default: false
    },
    /** 两态：默认只露播放按钮，鼠标移入 / 键盘 focus 才展开「播放全部」文字（首页每日推荐大卡片用） */
    expandOnHover: {
      type: Boolean,
      default: false
    },
    playLabel: {
      type: String,
      default: '播放全部'
    }
  },
  computed: {
    /** 可播放的歌：声音节目（电台）没有音乐音源，但历史行为是「能点播放全部」，所以这里只排掉没 id 的 */
    validTracks() {
      return (this.tracks || []).filter(t => t && t.id != null)
    },
    /** 再排掉黑名单：免得「点了播放全部却一首都没响」 */
    playableTracks() {
      const isBlocked = this.$store.getters['BlockAbout/isTrackBlocked']
      return this.validTracks.filter(t => !isBlocked(t))
    },
    /** 能进队列的声音节目没有音源，加进去也放不出声 */
    queueableTracks() {
      return this.playableTracks.filter(t => !t.isVoice)
    },
    isDisabled() {
      return this.disabled || !this.validTracks.length
    },
    iconSize() {
      return { xs: 12, sm: 12, md: 14, lg: 16 }[this.size] || 14
    },
    /** 播放三角统一装进圆底：solid 按尺寸，glass / cover 保住原来各自的圆底规格 */
    circleIconSize() {
      if (this.variant === 'glass') return 12
      if (this.variant === 'cover') return 16
      return { xs: 10, sm: 10, md: 12, lg: 13 }[this.size] || 12
    },
    /**
     * FM / 心动正在接管队列时不能往队列里加歌：
     * FM 每批会 REPLACE 整队，心动会在队尾 concat 推荐，加进去的歌不是被冲掉就是被夹在推荐中间。
     * 判断不能用 fmMode（那是长期偏好），fmActive 才是"此刻真的在放"。
     */
    queueAddBlocked() {
      const s = this.$store.state.TracksAbout || {}
      return !!(s.heartMode || s.heartBusy || s.fmActive)
    },
    queueAddTitle() {
      const s = this.$store.state.TracksAbout || {}
      if (s.heartBusy) return '正在进入心动模式，请稍候再试'
      if (s.heartMode) return '心动模式播放中，不支持加入播放列表'
      if (s.fmActive) return '私人 FM 播放中，不支持加入播放列表'
      return ''
    },
    playTitle() {
      const n = this.playableTracks.length
      return n ? `播放全部（${n} 首）` : this.playLabel
    },
    addTitle() {
      if (this.queueAddBlocked) return this.queueAddTitle
      const n = this.queueableTracks.length
      return n ? `把全部 ${n} 首加入播放列表` : '添加到播放列表'
    }
  },
  methods: {
    playAll() {
      if (this.isDisabled) return
      if (!this.playableTracks.length) {
        this.$toast.info('这些歌都在音乐黑名单里')
        return
      }
      // keepStream：这批歌本身就是 FM 的流，换队不能把 FM 模式退掉（见 TracksAbout/playAllTracks）
      this.$store.dispatch('TracksAbout/playAllTracks', this.keepStream
          ? { list: this.playableTracks, keepStream: true }
          : this.playableTracks)
      // 私人 FM 靠这个事件声明"这批歌就是 FM 的流"（PlayerCore 据此打开 FM 模式）
      this.$emit('play')
    },
    addAll() {
      if (this.isDisabled) return
      if (this.queueAddBlocked) {
        this.$toast.info(this.queueAddTitle)
        return
      }
      if (!this.playableTracks.length) {
        this.$toast.info('这些歌都在音乐黑名单里')
        return
      }
      // 声音节目搜索页也复用歌曲列表，它们没有音乐音源，不能进队列
      if (!this.queueableTracks.length) {
        this.$toast.warning('声音节目不支持加入播放列表')
        return
      }
      const queue = this.$store.state.TracksAbout.currentPlaylist || []
      const wasEmpty = !queue.length
      const existing = new Set(queue.map(t => String(t.id)))
      const fresh = this.queueableTracks.filter(t => !existing.has(String(t.id)))
      if (!fresh.length) {
        this.$toast.info('这些歌都已在播放列表中')
        return
      }
      this.$store.dispatch('TracksAbout/pushAllTracks', fresh).then(() => {
        this.$toast.success(`已加入 ${fresh.length} 首到播放列表`)
        // 队列变了要立刻落盘：空队列（还没在播歌）时 PlayerCore 不会自动保存，
        // 不通知就会"加了歌刷新就没了"
        this.$bus.$emit('queue-changed', { playId: fresh[0].id, wasEmpty })
      })
    }
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/base/variables";

.play-all-combo {
  display: inline-flex;
  align-items: stretch;
  flex-shrink: 0;
  box-sizing: border-box;
  border-radius: $radius-pill;
  overflow: hidden;
  background: var(--c-button-primary);
  // 播放全部文字/三角/加入图标统一浅色（默认主题实色底上更好辨认）
  color: $font-white;
  font-family: inherit;
  // 不加粗：按钮文字保持中等字重，浅色下不会显得发胖
  font-weight: 500;
  line-height: 1;
  user-select: none;
  transition: opacity .18s ease, transform .16s ease;

  &:active:not(.is-disabled) {
    transform: scale(.98);
  }

  .pac-main,
  .pac-add {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    white-space: nowrap;
    cursor: pointer;
  }

  .pac-main {
    gap: 6px;
    padding: 0 16px;
    transition: background-color .18s ease;
  }

  // 播放三角统一装进圆底；玻璃 / 封面变体各自覆盖尺寸与配色（见下方 variant）
  .pac-play-circle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    flex-shrink: 0;
    border-radius: 50%;
    // 浅色三角需要深一点的圆底，否则在主题色上会糊成一片
    background: rgba(0, 0, 0, .18);
    color: inherit;
  }

  .pac-main:hover:not(:disabled) { background: rgba(255, 255, 255, .12); }
  .pac-main:active:not(:disabled) { background: rgba(0, 0, 0, .14); }

  // 加入图标：收起时宽度 0 + 透明，悬停整颗胶囊时展开成图标段。
  // 用 width 过渡而不是 max-width，宽度是确定值，动画不会先快后慢。
  .pac-add {
    width: 0;
    height: 100%;
    padding: 0;
    overflow: hidden;
    opacity: 0;
    border-left: 1px solid transparent;
    background: rgba(0, 0, 0, .12);
    pointer-events: none;
    transition: width .24s cubic-bezier(.22, .61, .36, 1),
                opacity .18s ease,
                border-color .24s ease,
                background-color .18s ease;
  }

  &:hover .pac-add,
  &:focus-within .pac-add {
    opacity: 1;
    pointer-events: auto;
    border-left-color: rgba(255, 255, 255, .24);
  }

  .pac-add:hover:not(:disabled) { background: rgba(0, 0, 0, .22); }
  .pac-add:active:not(:disabled) { background: rgba(0, 0, 0, .28); }

  .pac-main:focus-visible,
  .pac-add:focus-visible {
    outline: 2px solid $font-white;
    outline-offset: -3px;
  }

  // 展开后的图标段宽度：按尺寸分别给，图标始终居中
  &.size-xs:hover .pac-add,
  &.size-xs:focus-within .pac-add { width: 28px; }

  &.size-sm:hover .pac-add,
  &.size-sm:focus-within .pac-add { width: 28px; }

  &.size-md:hover .pac-add,
  &.size-md:focus-within .pac-add { width: 32px; }

  &.size-lg:hover .pac-add,
  &.size-lg:focus-within .pac-add { width: 34px; }

  // 不可用（FM / 心动接管队列）：图标压暗，但仍可点出原因
  &:hover .pac-add.is-locked,
  &:focus-within .pac-add.is-locked { opacity: .55; }

  &.is-disabled {
    opacity: .5;

    .pac-main,
    .pac-add { cursor: default; }
  }

  // ---- 尺寸（对齐各页原来的「播放全部」，见文件头注释） ----
  &.size-xs {
    height: 32px;
    font-size: 13px;

    .pac-main { padding: 0 12px; }
    .pac-play-circle { width: 18px; height: 18px; }
  }

  &.size-sm {
    height: 28px;
    font-size: 12px;

    .pac-main { gap: 4px; padding: 0 12px; }
    .pac-play-circle { width: 16px; height: 16px; }
  }

  &.size-md {
    height: 38px;
    font-size: 13px;

    .pac-main { padding: 0 20px; }
    .pac-play-circle { width: 22px; height: 22px; }
  }

  &.size-lg {
    height: 42px;
    font-size: 14px;

    .pac-main { gap: 8px; padding: 0 24px; }
    .pac-play-circle { width: 24px; height: 24px; }
  }

  // ---- 私人 FM：磨砂玻璃，底是彩色 ambient，压主题实色会脏 ----
  &.variant-glass {
    height: 34px;
    font-size: 12px;
    background: rgba(255, 255, 255, .18);
    border: 1px solid rgba(255, 255, 255, .25);
    color: $font-black-1;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);

    .pac-main { gap: 6px; padding: 0 15px; }

    .pac-add {
      background: rgba(255, 255, 255, .10);
    }

    .pac-main:hover:not(:disabled) { background: rgba(255, 255, 255, .24); }
    .pac-main:active:not(:disabled) { background: rgba(255, 255, 255, .16); }
    .pac-add:hover:not(:disabled) { background: rgba(255, 255, 255, .18); }
    .pac-add:active:not(:disabled) { background: rgba(255, 255, 255, .12); }

    &:hover .pac-add,
    &:focus-within .pac-add { border-left-color: rgba(255, 255, 255, .32); }

    // 播放图标保留原来的主题色圆底（浅色磨砂上灰三角几乎看不见）
    .pac-play-circle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      border-radius: 50%;
      background: var(--c-accent);
      color: #fff;
    }
  }

  // ---- 首页每日推荐大卡片：封面图上的透明玻璃，恢复旧按钮的观感 ----
  &.variant-cover {
    height: 44px;
    font-size: 14px;
    background: rgba(255, 255, 255, .22);
    color: $font-white;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);

    .pac-main {
      gap: 8px;
      padding: 0 18px 0 10px;
    }

    .pac-main:hover:not(:disabled) { background: rgba(255, 255, 255, .32); }
    .pac-main:active:not(:disabled) { background: rgba(255, 255, 255, .26); }

    .pac-play-circle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      flex-shrink: 0;
      border-radius: 50%;
      background: rgba(255, 255, 255, .20);
      color: $font-white;
    }
  }

  // 封面按钮的两态：收起时只露圆底播放键（54×44），悬停 / 键盘 focus 才展开「播放全部」
  &.variant-cover.is-expand {
    .pac-main {
      gap: 0;
      padding: 0 10px;
      transition: padding .34s cubic-bezier(.4, 0, .2, 1),
                  background-color .18s ease;
    }

    .pac-text {
      max-width: 0;
      margin-left: 0;
      opacity: 0;
      overflow: hidden;
      transition: max-width .34s cubic-bezier(.4, 0, .2, 1),
                  margin-left .34s cubic-bezier(.4, 0, .2, 1),
                  opacity .2s ease;
    }

    &:hover .pac-main,
    &:focus-within .pac-main { padding: 0 18px 0 10px; }

    &:hover .pac-text,
    &:focus-within .pac-text {
      max-width: 96px;
      margin-left: 8px;
      opacity: 1;
    }
  }
}
</style>
