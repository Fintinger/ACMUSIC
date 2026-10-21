<template>
  <img
      :src="realSrc"
      :alt="alt || ''"
      :loading="eager ? 'eager' : 'lazy'"
      decoding="async"
      :class="['ac-cover', customClass]"
      v-bind="$attrs"
      @load="$emit('load', $event)"
      @error="$emit('error', $event)"
  />
</template>

<script>
/**
 * CoverImage
 * 统一封面/头像 <img> 渲染，强制业务方提供 alt 文本
 * - inheritAttrs: false + v-bind="$attrs" 保留 crossorigin / ref 等 HTML 属性
 * - emit load / error 事件，调用方仍可监听（如 MusicPlayer 需 @load="onCoverLoad"）
 * - 统一把 http 图片升级为 https：网易云接口常返回 http 封面，https 页面下会被判 Mixed Content
 * - 懒加载用浏览器原生 loading="lazy" + decoding="async"，刻意不换 src：
 *   src 为空时 <img> 没有内在尺寸，容器一旦没写死宽高，图片到达就会跳一下；
 *   原生 lazy 在离屏时不发请求，尺寸与渲染行为与原来完全一致，风险最低。
 *   首屏关键图（详情页大封面、播放器封面）传 eager 跳过懒加载。
 *
 * 用法：
 *   <cover-image :src="t.al.picUrl" :alt="t.name + '的封面'" />
 *   <cover-image :src="ar.img1v1Url" :alt="ar.name + '的头像'" custom-class="my-class" />
 *   <cover-image :src="detail.coverImgUrl" :alt="detail.name + '的封面'" eager />
 */
import { toHttpsUrl } from "@/utils/filters"

export default {
  name: 'CoverImage',
  inheritAttrs: false,
  props: {
    src: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      default: ''
    },
    customClass: {
      type: String,
      default: ''
    },
    /** 首屏关键图置 true，跳过懒加载 */
    eager: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    realSrc() { return toHttpsUrl(this.src) }
  }
}
</script>