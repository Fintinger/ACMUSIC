<template>
    <div class="accent-picker">
      <label class="accent-custom">自定义颜色<input type="color" :value="color" aria-label="自定义主题色" @input="choose($event.target.value)"></label>
      <div class="accent-presets">
        <button v-for="value in presets" :key="value" type="button" :style="{background: value}" :aria-label="'主题色 ' + value" :aria-pressed="color === value" @click="choose(value)"><span v-if="color === value">✓</span></button>
      </div>
      <button class="accent-reset" type="button" @click="choose(defaultColor)">恢复默认颜色</button>
    </div>
</template>
<script>
import {getAccent, setAccent, watchAccent, DEFAULT_ACCENT, ACCENT_PRESETS} from '@/utils/accent'
export default {
  name: 'AccentPicker',
  data() { return {color: getAccent(), presets: ACCENT_PRESETS, defaultColor: DEFAULT_ACCENT} },
  mounted() { this.stopWatch = watchAccent(value => { this.color = value }) },
  beforeDestroy() { if (this.stopWatch) this.stopWatch() },
  methods: {
    choose(value) { this.color = setAccent(value) },
  },
}
</script>
<style lang="scss" scoped>
.accent-picker {
  color: var(--c-text-primary);
  p { margin: 0 0 16px; font-size: 16px; font-weight: 600; }
  .accent-custom { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  input { width: 54px; height: 36px; border: 1px solid var(--c-border-strong); padding: 2px; background: var(--c-bg-sunken); cursor: pointer; }
  .accent-presets { display: flex; justify-content: space-between; gap: 12px; margin: 16px 0; }
  .accent-presets button { width: 32px; height: 32px; border: 2px solid var(--c-border-strong); border-radius: 50%; cursor: pointer; }
  .accent-presets button[aria-pressed="true"] { outline: 2px solid var(--c-text-primary); outline-offset: 3px; }
  .accent-presets span { color: white; text-shadow: 0 1px 3px black; }
  .accent-reset { border: 0; padding: 8px 0; background: transparent; color: var(--c-accent-text); cursor: pointer; }
}
</style>
