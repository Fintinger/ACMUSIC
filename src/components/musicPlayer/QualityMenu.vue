<template>
  <transition name="quality-menu">
    <div v-if="visible" class="quality-menu" @click.stop>
      <div class="qm-header">音质选择</div>
      <div
        v-for="opt in options"
        :key="opt.key"
        class="qm-item"
        :class="{ active: opt.key === selected }"
        @click="select(opt.key)"
      >
        <div class="qm-left">
          <span class="qm-short">{{ opt.short }}</span>
          <div class="qm-info">
            <span class="qm-label">{{ opt.label }}</span>
            <span v-if="opt.desc" class="qm-desc">{{ opt.desc }} · {{ opt.bitrate }}</span>
          </div>
        </div>
        <span v-if="opt.key === selected" class="qm-check">
          <BaseIcon name="loop" :size="16"/>
        </span>
      </div>
    </div>
  </transition>
</template>

<script>
import config from "@/config";

export default {
  name: "QualityMenu",
  props: {
    visible: { type: Boolean, default: false },
    selected: { type: String, default: '' }
  },
  computed: {
    options() {
      return config.player.qualityOptions || []
    }
  },
  methods: {
    select(key) {
      this.$emit('select', key)
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
  background: rgba(20, 22, 32, 0.94);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
  z-index: 110;
}

.qm-header {
  font-size: 11px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.35);
  text-transform: uppercase;
  letter-spacing: .8px;
  padding: 6px 12px 8px;
}

.qm-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 180ms $ease-standard;

  &:hover { background: rgba(255, 255, 255, 0.06); }
  &.active { background: rgba(134, 133, 239, 0.12); }

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
    background: rgba(134, 133, 239, 0.2);
    color: rgba(255, 255, 255, 0.8);
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

    .qm-label { font-size: 13px; font-weight: 600; color: rgba(255, 255, 255, 0.85); line-height: 1.3; }
    .qm-desc { font-size: 11px; color: rgba(255, 255, 255, 0.35); margin-top: 1px; }
  }

  .qm-check { color: #8685EF; font-size: 16px; flex-shrink: 0; }
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
