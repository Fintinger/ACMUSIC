<template>
  <div class="mvPlay">
    <VideoPlayerLayout :id="id" :detail="detail" :simi-click-evt="mvClk" :simi-video="simiMvs" :url="url"/>
  </div>
</template>

<script>
import VideoPlayerLayout from "@/components/layout/VideoPlayerLayout";
import * as mvApi from "@/api/Mv";

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
      return mvApi.detail(id)
    },
    getUrl(id, r = 1080) {
      return mvApi.url(id, r)
    },
    getSimiMv(id) {
      return mvApi.simi(id)
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
</style>