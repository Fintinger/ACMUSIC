<template>
  <img
      :src="src"
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
 *
 * 用法：
 *   <cover-image :src="t.al.picUrl" :alt="t.name + '的封面'" />
 *   <cover-image :src="ar.img1v1Url" :alt="ar.name + '的头像'" custom-class="my-class" />
 */
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
  }
}
</script>