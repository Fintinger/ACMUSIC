<template>
  <transition name="back-fade">
    <button v-if="visible" class="page-back-btn" @click="goBack" title="返回">
      <BaseIcon class="el-icon-arrow-left" name="arrowLeft"/>
    </button>
  </transition>
</template>

<script>
export default {
  name: "PageBack",
  computed: {
    visible() {
      const level = this.$route.meta && this.$route.meta.level
      return level && level > 1
    }
  },
  methods: {
    goBack() {
      if (this.$route.meta && this.$route.meta.hasHistory) {
        this.$router.back()
      } else {
        this.$router.push('/')
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.page-back-btn {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 150;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--c-border-strong);
  background: var(--c-bg-sunken);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: var(--c-text-primary);
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform .2s ease, background .2s ease;
  padding: 0;

  &:hover {
    background: var(--c-bg-sunken-hover);
    transform: translateX(-2px);
  }

  &:active {
    transform: scale(.94);
  }
  &:focus-visible { outline: 2px solid var(--c-accent-text); outline-offset: 3px; }
}

.back-fade-enter-active,
.back-fade-leave-active {
  transition: opacity .25s ease, transform .25s ease;
}
.back-fade-enter,
.back-fade-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}
</style>
