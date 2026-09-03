<template>
  <div class="VideoPlay">
    <!-- id 为 undefined 时（如直接访问 /video 路径），不渲染子组件避免 Vue required prop 警告 -->
    <VideoPlayerLayout v-if="newId || id" :id="newId || id" :detail="detail" :nameConfig="nameConfig" :simi-click-evt="vClk"
                         :simi-video="simiVid"
                         :url="url"/>
  </div>
</template>

<script>
import VideoPlayerLayout from "@/components/layout/VideoPlayerLayout";
import * as videoApi from "@/api/Video";

export default {
  name: "VideoPlay",
  components: {VideoPlayerLayout},
  props: ["id"],
  data() {
    return {
      detail: {},
      //保存mlog转换成video后的id
      newId: "",
      url: "",
      simiVid: [],
      nameConfig: {
        dt: {
          cover: "coverUrl",
          name: "title",
          artistName: "creator",
          playCount: "playTime"
        },
        si: {
          id: "vid",
          cover: "coverUrl",
          name: "title",
          artistName: "creator",
          playCount: "playTime"
        }
      }
    }
  },
  methods: {
    getVidDetail(id) {
      return videoApi.detail(id)
    },
    getUrl(id) {
      return videoApi.url(id)
    },
    getSimiVid(id) {
      return videoApi.related(id)
    },
    mlog2video(id) {
      return videoApi.mlogToVideo(id)
    },
    vClk(id) {
      this.$bus.$emit('vClk', id)
    },
    concurrentRequests(id) {
      this.$axios.all([this.getUrl(id), this.getSimiVid(id)])
          .then(this.$axios.spread((url, simiVid) => {
            //URL
            this.url = url.data.urls[url.data.urls.length - 1].url
            //相似视频
            this.simiVid = simiVid.data.data
          }))
    },
    mlg_mv_video(id) {
      if (/^a1/.test(id)) {//mlog
        this.mlog2video(id).then(res => {
          let newVid = res.data.data
          //保存mblog转换后的新id
          this.newId = newVid
          this.getVidDetail(newVid).then(res => {
            //正常，是视频
            this.detail = res.data.data;
            this.concurrentRequests(newVid)
          })
        })
      } else if (Number.isInteger(id * 1)) {//是MV
        this.$router.replace({
          name: "mvPlay",
          query: {id}
        })
      } else {//是视频
        this.getVidDetail(id).then(res => {
          //正常，是视频
          this.detail = res.data.data;
          this.concurrentRequests(id)
        })
      }
    }
  },
  activated() {
    this.mlg_mv_video(this.id)
  }
}
</script>

<style scoped>

</style>