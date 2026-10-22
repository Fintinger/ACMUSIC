<template>
  <transition name="mode-menu">
    <div v-if="visible" class="mode-menu" @click.stop>
      <div class="mm-header">队列</div>
      <div
        v-for="opt in policies"
        :key="opt.key"
        class="mm-item"
        :class="{ active: opt.key === policy, muted: fm }"
        @click="pickPolicy(opt.key)"
      >
        <span class="mm-label">{{ opt.label }}</span>
        <span v-if="opt.key === policy" class="mm-check"><BaseIcon name="loop" :size="14"/></span>
      </div>
      <div v-if="fm" class="mm-note">私人 FM 中，队列策略暂不生效</div>

      <div class="mm-header mm-header-gap">来源</div>
      <div
          class="mm-item"
          :class="{ active: heart, muted: heartBusy }"
          @click="$emit('toggle-heart')"
      >
        <span class="mm-label">心动模式</span>
        <span v-if="heartBusy" class="mm-busy">取流中</span>
        <span v-else-if="heart" class="mm-check"><BaseIcon name="loop" :size="14"/></span>
      </div>
      <div class="mm-note">从红心歌单 + 当前这首，续出一路相似风格</div>
    </div>
  </transition>
</template>

<script>
/**
 * 播放模式菜单（队列策略）
 *
 * 「队列策略」（下一首是队列里的谁）与「单曲形态」（这一首怎么播）是正交的两层，
 * 塞进同一个枚举会导致 N 种组合只能靠反复点击切换。
 * 这里只负责队列策略的直达选择；单曲形态（完整/副歌）的入口在控制条右侧。
 */
export default {
  name: "ModeMenu",
  props: {
    visible: { type: Boolean, default: false },
    // order=列表循环 / loop=单曲循环 / random=随机播放
    policy: { type: String, default: 'order' },
    // 私人 FM 态：队列策略被 FM 覆盖，这里只提示不隐藏
    fm: { type: Boolean, default: false },
    // 心动模式：开启时接管"下一首从哪来"，与 FM 互斥
    heart: { type: Boolean, default: false },
    // 取流中：置灰并给文字反馈，避免连点
    heartBusy: { type: Boolean, default: false }
  },
  data() {
    return {
      policies: [
        { key: 'order', label: '列表循环' },
        { key: 'sequence', label: '顺序播放' },
        { key: 'loop', label: '单曲循环' },
        { key: 'random', label: '随机播放' }
      ]
    }
  },
  methods: {
    pickPolicy(key) {
      this.$emit('select-policy', key)
    }
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/base/motion";
$accent: #8685EF;

.mode-menu {
  position: absolute;
  bottom: calc(100% + 12px);
  left: -6px;
  width: 196px;
  background: rgba(20, 22, 32, 0.94);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
  z-index: 110;
  cursor: default;
}

.mm-header {
  font-size: 11px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.35);
  letter-spacing: .8px;
  padding: 6px 10px 6px;

  // 分组之间隔一条细线，否则"队列"和"来源"两组会糊成一片
  &.mm-header-gap {
    margin-top: 4px;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.07);
  }
}

.mm-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 9px;
  cursor: pointer;
  transition: background 180ms $ease-standard;

  &:hover { background: rgba(255, 255, 255, 0.06); }
  &.active { background: rgba(134, 133, 239, 0.12); }
  &.muted { opacity: 0.55; }

  .mm-label { font-size: 13px; font-weight: 400; color: rgba(255, 255, 255, 0.85); }
  &.active .mm-label { color: #fff; }
}

.mm-check { color: $accent; display: flex; align-items: center; flex-shrink: 0; }
.mm-busy { font-size: 10px; color: rgba(255, 255, 255, 0.32); flex-shrink: 0; }

.mm-note {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
  line-height: 1.5;
  padding: 0 10px 6px;
}

.mode-menu-enter-active,
.mode-menu-leave-active {
  transition: opacity 180ms $ease-standard, transform 180ms $ease-standard;
}
.mode-menu-enter,
.mode-menu-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(.97);
}
</style>
