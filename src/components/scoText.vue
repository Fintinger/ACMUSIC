<template>
  <div ref="marquee" class="marquee">
    <div
        ref="content"
        class="marquee-content"
        :class="{scrolling: isOverflow}"
        :style="isOverflow ? { '--dist': dist + 'px' } : null"
    >
      <slot></slot>
    </div>
  </div>
</template>

<script>
export default {
  name: "scoText",
  data() {
    return {
      isOverflow: false,
      dist: 0
    }
  },
  mounted() {
    this.checkOverflow()
    this.$bus && this.$bus.$on && this.$bus.$on('resize', this.checkOverflow)
  },
  beforeDestroy() {
    this.$bus && this.$bus.$off && this.$bus.$off('resize', this.checkOverflow)
  },
  methods: {
    checkOverflow() {
      this.$nextTick(() => {
        const content = this.$refs.content
        const container = this.$refs.marquee
        if (content && container) {
          const diff = content.scrollWidth - container.clientWidth
          this.isOverflow = diff > 1
          this.dist = this.isOverflow ? diff : 0
        }
      })
    }
  }
}
</script>

<style scoped lang="scss">
.marquee {
  overflow: hidden;
  white-space: nowrap;
  width: 100%;
  max-width: 100%;
}

.marquee-content {
  display: inline-block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.marquee-content.scrolling {
  text-overflow: clip;
  animation: marquee-scroll 8s linear infinite;
  animation-delay: 1.2s;
}

@keyframes marquee-scroll {
  0% {
    transform: translateX(0);
  }
  20% {
    transform: translateX(0);
  }
  80% {
    transform: translateX(calc(-1 * var(--dist)));
  }
  100% {
    transform: translateX(calc(-1 * var(--dist)));
  }
}
</style>
