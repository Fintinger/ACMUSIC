<template>
  <!-- 字体图标 -->
  <i
      v-if="icon && icon.type === 'font' && icon.class"
      class="ac-icon ac-font"
      :class="[icon.class, customClass]"
      :style="iconStyle"
      v-bind="$attrs"
  />
  <!-- SVG 图标 -->
  <i
      v-else-if="icon && icon.type === 'svg' && icon.path"
      class="ac-icon ac-icon-svg"
      :class="customClass"
      :style="svgStyle"
      v-bind="$attrs"
  >
    <svg :width="svgSize" :height="svgSize" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path :d="icon.path" :fill="icon.fill || 'currentColor'" :stroke="icon.stroke || 'currentColor'" :stroke-width="icon.strokeWidth || 0" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </i>
  <!-- 占位 -->
  <i
      v-else
      class="ac-icon icon-fallback"
      :class="customClass"
      :style="iconStyle"
      v-bind="$attrs"
  />
</template>

<script>
import icons from "@/config/icon";

export default {
  name: "BaseIcon",
  inheritAttrs: false,
  props: {
    name: {
      type: String,
      required: true,
    },
    size: {
      type: [String, Number],
      default: "",
    },
    color: {
      type: String,
      default: "",
    },
  },
  computed: {
    icon() {
      return icons[this.name] || null
    },
    customClass() {
      return this.$attrs.class || ''
    },
    // 字体/占位用的尺寸(px)
    iconStyle() {
      const style = {}
      if (this.size) style.fontSize = typeof this.size === 'number' ? this.size + 'px' : this.size
      if (this.color) style.color = this.color
      return style
    },
    // SVG 用的尺寸
    // 未传 size 时使用 1em, 继承容器的 font-size, 与字体图标对齐
    svgSize() {
      if (typeof this.size === 'number') return this.size
      if (typeof this.size === 'string' && this.size) {
        const n = parseFloat(this.size)
        return isNaN(n) ? null : n
      }
      return null
    },
    svgStyle() {
      const style = {}
      if (this.svgSize) {
        style.width = this.svgSize + 'px'
        style.height = this.svgSize + 'px'
      } else {
        style.width = '1em'
        style.height = '1em'
      }
      if (this.color) style.color = this.color
      return style
    },
  },
}
</script>

<style scoped>
.ac-icon-svg {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.ac-icon-svg svg {
  display: block;
  width: 100%;
  height: 100%;
}

.icon-fallback {
  color: transparent;
  width: 1em;
  height: 1em;
  background: currentColor;
  opacity: 0.25;
  border-radius: 2px;
}
</style>
