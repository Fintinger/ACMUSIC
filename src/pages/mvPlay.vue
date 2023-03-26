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
      simiMvs: []
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
    this.$axios.all([this.getDetail(this.id), this.getUrl(this.id), this.getSimiMv(this.id)])
        .then(this.$axios.spread((detail, url, simiMv) => {
          //获取MV详情
          this.detail = detail.data.data
          // 获取Url
          this.url = url.data.data.url
          // 获取相似mv
          this.simiMvs = simiMv.data.mvs
        }))
  },
}
</script>

<style lang="scss" scoped>
.mvPlay {
  text-align: left;
  height: 100%;
}

.simiMV {
  margin-bottom: 30px;
}
</style>