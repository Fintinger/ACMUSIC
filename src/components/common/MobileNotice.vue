<template>
  <transition name="mn">
    <div v-if="visible" class="mobile-notice" role="dialog" aria-modal="true" aria-labelledby="mn-title">
      <span class="mn-glow mn-glow-a" aria-hidden="true"></span>
      <span class="mn-glow mn-glow-b" aria-hidden="true"></span>

      <div class="mn-card">
        <div class="mn-badge"><BaseIcon name="monitor" :size="24"/></div>

        <h2 id="mn-title" class="mn-title">当前暂未适配移动端</h2>

        <p class="mn-desc">
          ACMUSIC 是为宽屏设计的桌面版播放器，手机上的排版、播放器和交互还没有单独适配，
          部分内容可能错位或无法点击。
        </p>
        <p class="mn-desc mn-desc-strong">请在<strong>电脑浏览器</strong>中打开下面的地址：</p>

        <div class="mn-url">
          <span class="mn-url-text">{{ siteUrl }}</span>
        </div>

        <button type="button" class="mn-primary" :class="{ 'is-copied': copied }" @click="copy">
          <BaseIcon :name="copied ? 'check' : 'copy'" :size="14"/>
          {{ copied ? '链接已复制' : '复制链接' }}
        </button>

        <button type="button" class="mn-ghost" @click="dismiss">仍要在手机上继续浏览</button>
        <p class="mn-note">继续浏览仅本次有效，体验可能不完整。</p>
      </div>
    </div>
  </transition>
</template>

<script>
import { isMobileDevice } from "@/utils/device"
import { toggleScrollY } from "@/utils/tools"

/**
 * 移动端提示：本站在手机上未做适配，进入即用一层全屏提示引导到电脑端。
 * 每次打开页面都会出现（不写任何存储）；「仍要继续浏览」只对当前这次打开有效，
 * 这样既不会硬拦，也不会让用户以后再也看不到提示。
 */
export default {
  name: "MobileNotice",
  data() {
    return {
      visible: false,
      copied: false
    }
  },
  computed: {
    // 用当前完整地址（含 query）而不是写死域名：从分享链接点进来的人，
    // 复制到电脑上还能落回同一个页面；本地开发时也能正确复制。
    siteUrl() {
      if (typeof window === "undefined") return ""
      return window.location.href
    }
  },
  mounted() {
    // 不加任何「本次不再提示」的持久化：刷新、重新打开都要再提示一次
    if (!isMobileDevice()) return
    this.visible = true
    toggleScrollY(false)
    document.addEventListener("keydown", this.onKeydown)
  },
  beforeDestroy() {
    document.removeEventListener("keydown", this.onKeydown)
    if (this.copiedTimer) clearTimeout(this.copiedTimer)
    if (this.visible) toggleScrollY(true)
  },
  methods: {
    copy() {
      const url = this.siteUrl
      if (!url) return
      // 非安全上下文（http）没有 navigator.clipboard，退回复制 textarea
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(() => this.onCopied(), () => this.fallbackCopy(url))
        return
      }
      this.fallbackCopy(url)
    },
    fallbackCopy(url) {
      const ta = document.createElement("textarea")
      ta.value = url
      ta.setAttribute("readonly", "")
      ta.style.position = "fixed"
      ta.style.top = "-1000px"
      ta.style.opacity = "0"
      document.body.appendChild(ta)
      ta.select()
      // iOS 上 select() 不会选中 textarea 内容，需要显式指定选区
      ta.setSelectionRange(0, url.length)
      let ok = false
      try {
        ok = document.execCommand("copy")
      } catch (e) {
        ok = false
      }
      document.body.removeChild(ta)
      if (ok) this.onCopied()
      else this.$toast.warning("复制失败，请手动输入 " + url)
    },
    onCopied() {
      this.copied = true
      this.$toast.success("链接已复制，发到电脑上打开吧")
      if (this.copiedTimer) clearTimeout(this.copiedTimer)
      this.copiedTimer = setTimeout(() => { this.copied = false }, 2200)
    },
    dismiss() {
      this.visible = false
      toggleScrollY(true)
      document.removeEventListener("keydown", this.onKeydown)
    },
    onKeydown(e) {
      if (e.key === "Escape") this.dismiss()
    }
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/base/variables";
@import "src/assets/scss/base/motion";

.mobile-notice {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  /* 全屏浮层档位（$z-overlay=3000）：压在 Element 弹层与评论浮层之上，但低于 toast(4000) */
  z-index: $z-overlay + 10;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow: hidden;
  background: $color-theme-sec;
}

.mn-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(58px);
  pointer-events: none;
}

.mn-glow-a {
  top: -90px;
  right: -80px;
  width: 320px;
  height: 320px;
  background: rgba($color-main, .38);
}

.mn-glow-b {
  bottom: -110px;
  left: -70px;
  width: 300px;
  height: 300px;
  background: rgba($color-ornament, .30);
}

.mn-card {
  position: relative;
  width: 100%;
  max-width: 360px;
  padding: 34px 24px 20px;
  border: 1px solid rgba($color-theme, .9);
  border-radius: 22px;
  background: rgba($color-theme, .88);
  box-shadow: 0 24px 60px rgba($color-main-1, .16);
  text-align: center;
  -webkit-backdrop-filter: blur(18px);
  backdrop-filter: blur(18px);
  animation: mn-rise $motion-normal $ease-standard both;
}

@keyframes mn-rise {
  from { opacity: 0; transform: translateY(14px) scale(.98); }
  to { opacity: 1; transform: none; }
}

.mn-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  border-radius: 18px;
  background: linear-gradient(135deg, $color-main, $color-main-1);
  box-shadow: 0 10px 24px rgba($color-main, .34);
  color: $font-white;
}

.mn-title {
  margin: 0 0 10px;
  font-size: 19px;
  font-weight: 700;
  letter-spacing: .2px;
  color: $font-black-1;
}

.mn-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.85;
  color: $font-black-2;

  &-strong {
    margin-top: 10px;
    color: $font-black-1;

    strong {
      color: $color-main;
      font-weight: 700;
    }
  }
}

.mn-url {
  margin: 18px 0 12px;
  padding: 11px 12px;
  border: 1px dashed rgba($color-main, .38);
  border-radius: 12px;
  background: $color-theme-sec;

  .mn-url-text {
    display: block;
    overflow: hidden;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 13px;
    letter-spacing: .2px;
    color: $font-black-1;
    line-height: 1.5;
    text-overflow: ellipsis;
    white-space: nowrap;
    user-select: all;
    -webkit-user-select: all;
  }
}

.mn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 42px;
  padding: 0 16px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, $color-main, $color-main-1);
  box-shadow: 0 8px 20px rgba($color-main, .32);
  color: $font-white;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: .3px;
  cursor: pointer;
  transition: background $motion-fast $ease-standard,
              box-shadow $motion-fast $ease-standard,
              transform $motion-fast $ease-standard;

  &:active {
    transform: scale(.985);
    box-shadow: 0 4px 12px rgba($color-main, .28);
  }

  /* 复制成功：换成成功色，配合按钮文案一起给出结果反馈 */
  &.is-copied {
    background: $feedback-success;
    box-shadow: 0 8px 20px rgba($feedback-success, .3);
  }
}

.mn-ghost {
  display: block;
  width: 100%;
  margin-top: 10px;
  padding: 8px;
  border: none;
  background: none;
  color: $font-black-2;
  font-family: inherit;
  font-size: 12.5px;
  text-decoration: underline;
  text-decoration-color: rgba($font-black, .16);
  text-underline-offset: 3px;
  cursor: pointer;
  transition: color $motion-fast $ease-standard;

  &:active { color: $color-main; }
}

.mn-note {
  margin: 0;
  font-size: 11px;
  color: rgba($font-black, .32);
}

.mn-enter-active,
.mn-leave-active {
  transition: opacity $motion-normal $ease-standard;
}

.mn-enter,
.mn-leave-to {
  opacity: 0;
}
</style>
