<template>
  <transition name="quality-menu">
    <div v-if="visible" class="quality-menu" role="group" aria-label="音质选择" @click.stop
         @keydown.space.stop @keydown.left.stop @keydown.right.stop>
      <div class="qm-header">音质选择</div>
      <button
        v-for="opt in options"
        :key="opt.key"
        class="qm-item"
        type="button"
        :aria-pressed="opt.key === selected"
        :aria-label="opt.label + (isLocked(opt) ? '，需要VIP' : '')"
        :class="{ active: opt.key === selected, locked: isLocked(opt) }"
        @click="select(opt)"
      >
        <span class="qm-left">
          <span class="qm-short">{{ opt.short }}</span>
          <span class="qm-info">
            <span class="qm-label">{{ opt.label }}<span v-if="isLocked(opt)" class="qm-vip">VIP</span></span>
            <span v-if="opt.desc" class="qm-desc">{{ opt.desc }} · {{ opt.bitrate }}</span>
          </span>
        </span>
        <span v-if="opt.key === selected" class="qm-check">
          <BaseIcon name="loop" :size="16"/>
        </span>
      </button>
    </div>
  </transition>
</template>

<script>
import config from "@/config";

export default {
  name: "QualityMenu",
  props: {
    visible: { type: Boolean, default: false },
    selected: { type: String, default: '' },
    // 0=确认无会员, 1=音乐包, 2=黑胶VIP, -1=未知（不做门控）
    vipType: { type: Number, default: 0 }
  },
  computed: {
    options() {
      return config.player.qualityOptions || []
    },
    isVip() {
      return this.vipType !== 0
    }
  },
  methods: {
    /** 确认非会员时，把无损/臻音标成 VIP 专属，点了给提示而不是切过去再降级 */
    isLocked(opt) {
      if (!opt || opt.key === this.selected) return false
      const vipOnly = (config.player.vipOnlyLevels || []).indexOf(opt.key) !== -1
      return vipOnly && this.vipType === 0
    },
    select(opt) {
      if (this.isLocked(opt)) {
        this.$emit('need-vip', opt)
        return
      }
      this.$emit('select', opt.key)
    }
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/base/motion";

.quality-menu {
  position: absolute;
  bottom: calc(100% + 10px);
  right: 0;
  width: 220px;
  background: var(--player-menu-bg);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid var(--player-menu-border);
  border-radius: 14px;
  padding: 8px;
  box-shadow: 0 8px 32px var(--player-menu-shadow);
  z-index: 110;
}

.qm-header {
  font-size: 11px;
  font-weight: 600;
  color: var(--player-menu-muted);
  text-transform: uppercase;
  letter-spacing: .8px;
  padding: 6px 12px 8px;
}

.qm-item {
  width: 100%;
  border: none;
  background: transparent;
  text-align: left;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 180ms $ease-standard;

  &:hover { background: rgba(255, 255, 255, 0.06); }
  &:focus-visible { outline: 2px solid var(--player-menu-accent); outline-offset: -2px; }
  &.active { background: var(--player-menu-soft); }
  &.locked {
    .qm-label { color: var(--player-menu-muted); }
    .qm-short { background: rgba(255, 255, 255, 0.08); color: var(--player-menu-muted); }
  }

  .qm-vip {
    display: inline-block;
    margin-left: 6px;
    padding: 0 5px;
    height: 15px;
    line-height: 15px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .3px;
    color: #f0c674;
    background: rgba(240, 198, 116, 0.14);
    border: 1px solid rgba(240, 198, 116, 0.28);
    vertical-align: 1px;
  }

  .qm-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .qm-short {
    width: 28px;
    height: 22px;
    border-radius: 5px;
    background: var(--player-menu-soft);
    color: var(--player-menu-text);
    font-size: 11px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .qm-info {
    display: flex;
    flex-direction: column;
    min-width: 0;

    .qm-label { font-size: 13px; font-weight: 600; color: var(--player-menu-text); line-height: 1.3; }
    .qm-desc { font-size: 11px; color: var(--player-menu-muted); margin-top: 1px; }
  }

  .qm-check { color: var(--player-menu-accent); font-size: 16px; flex-shrink: 0; }
}

// Menu transition (reuse motion tokens)
.quality-menu-enter-active,
.quality-menu-leave-active {
  transition: opacity 200ms $ease-standard, transform 200ms $ease-standard;
}
.quality-menu-enter {
  opacity: 0;
  transform: translateY(6px) scale(.96);
}
.quality-menu-enter-to {
  opacity: 1;
  transform: translateY(0) scale(1);
}
.quality-menu-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(.96);
}
</style>
