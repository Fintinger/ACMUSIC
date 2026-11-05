<template>
  <transition name="quality-menu">
    <div v-if="visible" class="quality-menu" role="group" aria-label="音质选择" @click.stop
         @keydown.space.stop @keydown.left.stop @keydown.right.stop>
      <div class="qm-header">
        <span>音质选择</span>
        <span v-if="limited" class="qm-scope">本曲 {{ options.length }} 档</span>
      </div>
      <!-- 解灰曲目：第三方源只有一档固定音质，再列官方档位只会骗人 -->
      <div v-if="unblock" class="qm-item is-static" role="note">
        <span class="qm-left">
          <span class="qm-short">解灰</span>
          <span class="qm-info">
            <span class="qm-label">解灰源<span class="qm-tag">第三方</span></span>
            <span class="qm-desc">第三方音源 · 音质固定</span>
          </span>
        </span>
      </div>
      <button
        v-for="opt in options"
        :key="opt.key"
        class="qm-item"
        type="button"
        :aria-pressed="opt.key === selected"
        :aria-label="opt.label + (isVipTier(opt) ? '，会员音质，非会员会走解灰源' : '')"
        :class="{ active: opt.key === selected, 'is-vip-tier': isVipTier(opt) }"
        @click="select(opt)"
      >
        <span class="qm-left">
          <span class="qm-short">{{ opt.short }}</span>
          <span class="qm-info">
            <span class="qm-label">{{ opt.label }}<span v-if="isVipTier(opt)" class="qm-vip">VIP</span></span>
            <span v-if="opt.desc" class="qm-desc">{{ opt.desc }} · {{ opt.bitrate }}</span>
          </span>
        </span>
        <span v-if="opt.key === selected" class="qm-check">
          <BaseIcon name="check" :size="16"/>
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
    /**
     * 当前歌曲实际拥有的档位（由 PlayerCore 从 /song/detail 的 hr/sq/h/m/l 推导）。
     * 空数组 = 未知（详情还没回来/请求失败），此时不做限制，照旧显示完整列表。
     */
    levels: { type: Array, default: () => [] },
    /** 当前播放的是不是解灰源：是的话只显示一条"音质固定"的说明，不列官方档位 */
    unblock: { type: Boolean, default: false }
  },
  computed: {
    options() {
      if (this.unblock) return []
      const all = config.player.qualityOptions || []
      const levels = this.levels || []
      if (!levels.length) return all
      const list = all.filter(opt => levels.indexOf(opt.key) !== -1)
      // 一个都对不上（字段异常）就退回完整列表，别给用户一个空菜单
      return list.length ? list : all
    },
    limited() {
      if (this.unblock) return false
      const all = (config.player.qualityOptions || []).length
      // 只有真的隐藏了档位才解释一句；五档齐全时不用画蛇添足
      return !!(this.levels && this.levels.length) && this.options.length < all
    }
  },
  methods: {
    /**
     * 会员专属档位只做标记（右上角 VIP 徽标 + 无障碍提示），不再锁死。
     * 非会员选了无损/臻音，由取源链路去解灰源拿这一档的真文件；
     * 拿不到再退回上游压级的文件 —— 总之不会"点了没反应"。
     */
    isVipTier(opt) {
      return !!opt && (config.player.vipOnlyLevels || []).indexOf(opt.key) !== -1
    },
    select(opt) {
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
  display: flex; align-items: center; justify-content: space-between;
  font-size: 11px;
  font-weight: 600;
  color: var(--player-menu-muted);
  text-transform: uppercase;
  letter-spacing: .8px;
  padding: 6px 12px 8px;

  // 「本曲 N 档」：解释为什么列表比平时短
  .qm-scope {
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0;
    text-transform: none;
    color: var(--player-menu-muted);
    opacity: .8;
  }
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
  // 解灰说明行：不可点，只解释"为什么没有档位可选"
  &.is-static {
    cursor: default;
    &:hover { background: transparent; }
  }
  // 会员档位不再置灰（能选、能播），只靠 VIP 徽标说明它的出处
  &.is-vip-tier .qm-short { color: #f0c674; }

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

  // 「第三方」小标签，跟 VIP 徽标同尺寸但走中性色，避免抢"解灰"的琥珀色
  .qm-tag {
    display: inline-block;
    margin-left: 6px;
    padding: 0 5px;
    height: 15px;
    line-height: 15px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: .3px;
    color: rgba(255, 255, 255, 0.62);
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
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
