<template>
  <div ref="trigger" class="loadMore">
    <div v-if="loading" class="state">
      <i class="el-icon-loading"></i>
      <span>加载中...</span>
    </div>
    <p v-else-if="noMore" class="state">已经到底了</p>
    <button v-else class="loadBtn" @click="load">加载更多</button>
  </div>
</template>

<script>
export default {
  name: "LoadMore",
  props: {
    loading: { type: Boolean, required: true },
    noMore: { type: Boolean, required: true },
    load: { type: Function, required: true }
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
        if (entry.isIntersecting && !this.loading && !this.noMore) {
          this.load()
        }
      }, { rootMargin: '200px' })
      if (this.$refs.trigger) {
        this.observer.observe(this.$refs.trigger)
      }
    }
  },
  watch: {
    noMore(val) {
      if (val && this.observer) this.observer.disconnect()
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
  color: #888;
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
  border: 1px solid #ddd;
  border-radius: 20px;
  padding: 6px 24px;
  font-size: 13px;
  color: #888;
  cursor: pointer;
  transition: all 0.2s;
}
.loadBtn:hover {
  border-color: #8685EF;
  color: #8685EF;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
