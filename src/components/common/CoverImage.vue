<template>
  <img
      :src="realSrc"
      :alt="alt || ''"
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
 *
 * 用法：
 *   <cover-image :src="t.al.picUrl" :alt="t.name + '的封面'" />
 *   <cover-image :src="ar.img1v1Url" :alt="ar.name + '的头像'" custom-class="my-class" />
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
    }
  },
  computed: {
    realSrc() { return toHttpsUrl(this.src) }
  }
}
</script>