<template>
  <transition name="mode-menu">
    <div v-if="visible" class="mode-menu" @click.stop>
      <!-- A 队列策略：下一首是队列里的谁 -->
      <div class="mm-header">队列</div>
      <div
        v-for="opt in policies"
        :key="opt.key"
        class="mm-item"
        :class="{ active: opt.key === layers.policy, muted: layers.fm }"
        @click="pickPolicy(opt.key)"
      >
        <span class="mm-label">{{ opt.label }}</span>
        <span v-if="opt.key === layers.policy" class="mm-check"><BaseIcon name="loop" :size="14"/></span>
      </div>
      <div v-if="layers.fm" class="mm-note">私人 FM 中，队列策略暂不生效</div>

      <!-- B 内容来源：下一首从哪来 -->
      <div class="mm-header mm-header-gap">来源</div>
      <div
          class="mm-item"
          :class="{ active: layers.heart, muted: layers.heartBusy }"
          @click="$emit('toggle-heart')"
      >
        <span class="mm-label">心动模式</span>
        <span v-if="layers.heartBusy" class="mm-busy">取流中</span>
        <span v-else-if="layers.heart" class="mm-check"><BaseIcon name="loop" :size="14"/></span>
      </div>

      <!-- C 单曲形态：这一首怎么播 -->
      <div class="mm-header mm-header-gap">单曲形态</div>
      <div
          class="mm-item"
          :class="{ active: layers.form === 'full' }"
          @click="$emit('select-form', 'full')"
      >
        <span class="mm-label">完整播放</span>
        <span v-if="layers.form === 'full'" class="mm-check"><BaseIcon name="loop" :size="14"/></span>
      </div>
      <div
          class="mm-item"
          :class="{ active: layers.form === 'chorus', muted: !layers.chorusAvailable }"
          @click="$emit('select-form', 'chorus')"
      >
        <span class="mm-label">只播副歌</span>
        <span v-if="!layers.chorusAvailable" class="mm-tag">本曲无数据</span>
        <span v-else-if="layers.form === 'chorus'" class="mm-check"><BaseIcon name="loop" :size="14"/></span>
      </div>
      <div
          class="mm-item"
          :class="{ active: layers.form === 'ab' }"
          @click="$emit('select-form', 'ab')"
      >
        <span class="mm-label">A-B 循环</span>
        <span class="mm-tag">{{ layers.abHint }}</span>
      </div>
      <!-- 只有区间真的设好了才有"清除"可点，否则这一行是永远点不动的死按钮 -->
      <div
          v-if="layers.abValid"
          class="mm-item mm-item-sub"
          @click="$emit('select-form', 'ab-clear')"
      >
        <span class="mm-label">清除 A-B 区间</span>
      </div>

      <!-- D 环境约束：什么时候停 -->
      <div class="mm-header mm-header-gap">定时停止</div>
      <div
          class="mm-item"
          :class="{ active: layers.sleepMode === 'off' }"
          @click="$emit('sleep-command', 'off')"
      >
        <span class="mm-label">不定时</span>
        <span v-if="layers.sleepMode === 'off'" class="mm-check"><BaseIcon name="loop" :size="14"/></span>
      </div>
      <div
          class="mm-item"
          :class="{ active: layers.sleepMode === 'song' }"
          @click="$emit('sleep-command', 'song')"
      >
        <span class="mm-label">播完本首停止</span>
        <span v-if="layers.sleepMode === 'song'" class="mm-check"><BaseIcon name="loop" :size="14"/></span>
      </div>

      <!-- 两档可调节：−/+ 步进，数字框里也能直接敲；改动即时生效。
           视觉与右下角定时下拉里的同一套行保持一致（那份样式挂在 .sleepDropdown 下，
           因为是 el-dropdown 传送到 body 的，这里没法直接复用，只能镜像一份） -->
      <div class="sdRow" :class="{ 'is-active': layers.sleepMode === 'count' }" title="从现在起重新计数">
        <span class="sdLabel">再播</span>
        <span class="sdStep" :class="{ disabled: layers.countValue <= 1 }" @click="step('count', -1)">−</span>
        <input
            class="sdNum"
            type="text"
            inputmode="numeric"
            :value="layers.countValue"
            @click.stop
            @change="onNum('count', $event)"
        />
        <span class="sdStep" :class="{ disabled: layers.countValue >= 99 }" @click="step('count', 1)">+</span>
        <span class="sdUnit">首</span>
      </div>
      <div class="sdRow" :class="{ 'is-active': layers.sleepMode === 'time' }" title="从现在起重新计时">
        <span class="sdLabel">播放</span>
        <span class="sdStep" :class="{ disabled: layers.timeValue <= 1 }" @click="step('time', -1)">−</span>
        <input
            class="sdNum"
            type="text"
            inputmode="numeric"
            :value="layers.timeValue"
            @click.stop
            @change="onNum('time', $event)"
        />
        <span class="sdStep" :class="{ disabled: layers.timeValue >= 180 }" @click="step('time', 1)">+</span>
        <span class="sdUnit">分钟</span>
      </div>

      <div class="sdFade" @click="$emit('toggle-fade')">
        <span>最后 {{ layers.fadeSec }} 秒渐弱淡出</span>
        <i class="sdSwitch" :class="{ on: layers.sleepFade }"></i>
      </div>

      <!-- 复位：只清"临时叠上去的"三层，队列策略是长期偏好，不该被顺手抹掉 -->
      <div class="mm-reset" title="关掉心动模式、回到完整播放、取消定时；队列策略保留" @click="$emit('reset')">
        <span>复位</span>
        <span class="mm-reset-note">保留队列策略</span>
      </div>
    </div>
  </transition>
</template>

<script>
/**
 * 播放模式总览面板（四层）
 *
 * 播放模式是四个正交的层，之前它们散落在三处：队列策略 + 内容来源在模式菜单、
 * 单曲形态在进度条、定时停止在右下角 —— 结果就是"没有任何一处能看到当前生效的组合"。
 * 这个面板把四层摆在一起，每层显示当前值并可就地改。
 *
 *   A 队列策略 playMode    下一首是队列里的谁（列表循环 / 顺序 / 单曲 / 随机）
 *   B 内容来源 heartMode   下一首从哪来（普通队列 / 私人 FM / 心动模式）
 *   C 单曲形态 trackForm   这一首怎么播（完整 / 副歌 / A-B）
 *   D 环境约束 sleepMode   什么时候停（不定时 / 播完本首 / N 首后 / M 分钟后）
 *
 * 本组件是纯展示 + 转发：所有状态由 PlayerCore 通过 layers 一次传进来（避免十几条 props），
 * 所有改动以事件冒泡回去，不在组件里另存一份状态，防止两处不同步。
 */
export default {
  name: "ModeMenu",
  props: {
    visible: { type: Boolean, default: false },
    /**
     * 四层的当前值（PlayerCore.modeLayers 计算得来）。
     * sleepSpec 是两档的取值范围/步进，数字框要就地夹边界，所以一起传进来。
     */
    layers: {
      type: Object,
      default: () => ({
        policy: 'order',
        fm: false,
        heart: false,
        heartBusy: false,
        form: 'full',
        chorusAvailable: false,
        abHint: '',
        abValid: false,
        sleepMode: 'off',
        countValue: 20,
        timeValue: 30,
        sleepFade: true,
        fadeSec: 20,
        sleepSpec: { count: { min: 1, max: 99, step: 1 }, time: { min: 1, max: 180, step: 5 } }
      })
    }
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
    },
    step(kind, dir) {
      this.$emit('sleep-step', { kind, dir })
    },
    /**
     * 数字框直接输入：在这里就地把越界值夹回边界并写回 input，
     * 因为 :value 绑的是 layers 里的值 —— 夹完和现值相同时 Vue 不会重渲染，
     * 不手动写回的话输入框会一直显示用户敲进去的那个非法值。
     */
    onNum(kind, e) {
      const spec = (this.layers.sleepSpec || {})[kind]
      if (!spec) return
      const cur = kind === 'count' ? this.layers.countValue : this.layers.timeValue
      const raw = parseInt(e.target.value, 10)
      if (!raw || isNaN(raw)) { e.target.value = cur; return }
      const next = Math.min(spec.max, Math.max(spec.min, raw))
      e.target.value = next
      if (next === cur && this.layers.sleepMode === kind) return
      this.$emit('sleep-input', { kind, value: next })
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
  width: 224px;
  // 四层全展开比较高，小屏上要能滚，否则顶部会被截掉且够不着
  max-height: 62vh;
  overflow-y: auto;
  background: rgba(20, 22, 32, 0.94);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
  z-index: 110;
  cursor: default;
  scrollbar-width: thin;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.14); border-radius: 2px; }
}

.mm-header {
  font-size: 11px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.35);
  letter-spacing: .8px;
  padding: 6px 10px 6px;

  // 分组之间隔一条细线，否则四组会糊成一片
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

  // 附属操作（清除 A-B）缩进一档，读起来是"上一项的子操作"
  &.mm-item-sub {
    padding-top: 4px;
    padding-bottom: 6px;
    .mm-label { font-size: 12px; color: rgba(255, 255, 255, 0.5); }
  }
}

.mm-check { color: $accent; display: flex; align-items: center; flex-shrink: 0; }
.mm-busy { font-size: 10px; color: rgba(255, 255, 255, 0.32); flex-shrink: 0; }
// 行内小注（本曲无数据 / A-B 的具体区间）：太长会挤掉主文案，所以限宽
.mm-tag {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.34);
  flex-shrink: 0;
  max-width: 84px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mm-note {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.3);
  line-height: 1.5;
  padding: 0 10px 6px;
}

.mm-reset {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 6px;
  padding: 9px 10px 7px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: color 160ms ease;

  &:hover { color: #fff; }
  .mm-reset-note { font-size: 10px; color: rgba(255, 255, 255, 0.3); }
}

// ---- 定时两档的可调节行：与 PlayerCore 的 .sleepDropdown 同一套视觉 ----
.sdRow {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 10px;
  border-radius: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.62);
  transition: background 160ms ease, color 160ms ease;

  &:hover { background: rgba(255, 255, 255, 0.06); }
  &.is-active { color: $accent; background: rgba(134, 133, 239, 0.1); font-weight: 600; }

  .sdLabel { flex-shrink: 0; }
  .sdUnit { flex-shrink: 0; font-weight: 400; }

  .sdStep {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 6px;
    font-size: 14px;
    line-height: 1;
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.8);
    cursor: pointer;
    user-select: none;
    transition: background 140ms ease, color 140ms ease;

    &:hover { background: rgba(255, 255, 255, 0.18); color: #fff; }
    &:active { transform: scale(0.92); }
    // 到边界置灰但仍占位，避免按钮消失导致行宽跳动
    &.disabled { opacity: 0.3; cursor: not-allowed; &:hover { background: rgba(255, 255, 255, 0.08); } }
  }

  // 定宽而不是 flex:1 —— 撑满会把整个面板拉宽，这里只需要放下两三位数字
  .sdNum {
    flex: 0 0 34px;
    width: 34px;
    height: 20px;
    padding: 0 2px;
    text-align: center;
    font-size: 13px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    font-family: inherit;
    color: inherit;
    background: rgba(0, 0, 0, 0.22);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    outline: none;
    transition: border-color 140ms ease, background 140ms ease;

    &:focus { border-color: rgba(134, 133, 239, 0.6); background: rgba(0, 0, 0, 0.34); }
  }
}

.sdFade {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 4px;
  padding: 9px 10px 7px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  cursor: pointer;
  transition: color 160ms ease;

  &:hover { color: rgba(255, 255, 255, 0.8); }
}

.sdSwitch {
  position: relative;
  flex-shrink: 0;
  width: 26px;
  height: 14px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.14);
  transition: background 180ms ease;

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.75);
    transition: transform 180ms ease, background 180ms ease;
  }

  &.on {
    background: rgba(134, 133, 239, 0.55);
    &::after { transform: translateX(12px); background: #fff; }
  }
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
