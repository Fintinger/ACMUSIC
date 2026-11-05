<template>
  <div ref="trigger" class="loadMore">
    <div v-if="loading" class="state">
      <BaseIcon class="is-spinning" name="loader"/>
      <span>加载中...</span>
    </div>
    <button v-else-if="error" type="button" class="loadBtn" @click="load">加载失败，点击重试</button>
    <p v-else-if="noMore" class="state">{{ noMoreText }}</p>
    <button v-else class="loadBtn" @click="load">加载更多</button>
  </div>
</template>

<script>
export default {
  name: "LoadMore",
  props: {
    loading: { type: Boolean, required: true },
    noMore: { type: Boolean, required: true },
    load: { type: Function, required: true },
    error: { type: Boolean, default: false },
    // 自定义"没有更多"文案（如播放页评论区传"暂无评论"），默认不影响其他页面
    noMoreText: { type: String, default: "已经到底了" }
  },
  data() {
    return { observer: null }
  },
  mounted() {
    this.setupObserver()
  },
  beforeDestroy() {
    if (this.observer) this.observer.disconnect()
  },
  methods: {
    setupObserver() {
      if (this.observer) this.observer.disconnect()
      if (typeof IntersectionObserver === 'undefined') return
      this.observer = new IntersectionObserver((entries) => {
        const entry = entries[0]
        if (entry.isIntersecting && !this.loading && !this.noMore && !this.error) {
          this.load()
        }
      }, { rootMargin: '200px' })
      if (this.$refs.trigger) {
        this.observer.observe(this.$refs.trigger)
      }
    }
  },
  watch: {
    error(val) {
      if (val && this.observer) this.observer.disconnect()
      else if (!val) this.setupObserver()
    },
    noMore(val) {
      if (val && this.observer) this.observer.disconnect()
      else if (!val) this.setupObserver()
    }
  }
}
</script>

<style scoped>
.loadMore {
  padding: 20px 0;
  text-align: center;
}
.state {
  color: var(--comment-muted, var(--c-text-tertiary));
  font-size: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.state i {
  font-size: 14px;
  animation: spin 1s linear infinite;
}
.loadBtn {
  background: none;
  border: 1px solid var(--comment-border, var(--c-border-strong));
  border-radius: 20px;
  padding: 6px 24px;
  font-size: 13px;
  color: var(--comment-muted, var(--c-text-tertiary));
  cursor: pointer;
  transition: all 0.2s;
}
.loadBtn:hover {
  border-color: var(--comment-accent, var(--c-accent));
  color: var(--comment-accent, var(--c-accent-text));
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
