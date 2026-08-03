<template>
  <div class="mvPlay">
    <VideoPlayerLayout :id="id" :detail="detail" :simi-click-evt="mvClk" :simi-video="simiMvs" :url="url"/>
  </div>
</template>

<script>
import VideoPlayerLayout from "@/components/layout/VideoPlayerLayout";

export default {
  name: "mvPlay",
  props: ["id"],
  components: {VideoPlayerLayout},
  data() {
    return {
      detail: {},
      url: "",
      simiMvs: [],
      loading: true
    }
  },
  methods: {
    getDetail(id) {
      return this.$axios('/mv/detail?mvid=' + id)
    },
    getUrl(id, r = 1080) {
      return this.$axios('/mv/url', {params: {id, r}})
    },
    getSimiMv(id) {
      return this.$axios('/simi/mv?mvid=' + id)
    },
    mvClk(id) {
      this.$bus.$emit('mvClk', id)
    }
  },
  activated() {
    this.loading = true
    this.$axios.all([this.getDetail(this.id), this.getUrl(this.id), this.getSimiMv(this.id)])
        .then(this.$axios.spread((detail, url, simiMv) => {
          this.detail = detail.data.data
          this.url = url.data.data.url
          this.simiMvs = simiMv.data.mvs
        }))
        .finally(() => { this.loading = false })
  },
}
</script>

<style lang="scss" scoped>
.mvPlay {
  text-align: left; height: 100%;
}

.simiMV { margin-bottom: 30px; }

.mvPlaySkeleton {
  max-width: 1280px; margin: 0 auto; padding: 24px 0;
  .skelPlayer {
    width: 100%; aspect-ratio: 16/9; border-radius: 16px;
    background: linear-gradient(90deg, #e8e8e8 25%, #f0f0f0 50%, #e8e8e8 75%);
    background-size: 200% 100%; animation: shimmer 1.5s infinite;
  }
  .skelLine {
    height: 16px; border-radius: 8px; margin-top: 16px;
    background: linear-gradient(90deg, #e8e8e8 25%, #f0f0f0 50%, #e8e8e8 75%);
    background-size: 200% 100%; animation: shimmer 1.5s infinite;
    &--long { width: 50%; }
    &--short { width: 30%; height: 12px; }
  }
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>