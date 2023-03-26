<template>
  <div class="VideoPlay">
    <VideoPlayerLayout :id="newId||id" :detail="detail" :nameConfig="nameConfig" :simi-click-evt="vClk"
                       :simi-video="simiVid"
                       :url="url"/>
  </div>
</template>

<script>
import VideoPlayerLayout from "@/components/layout/VideoPlayerLayout";

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
      return this.$axios('/video/detail?id=' + id)
    },
    getUrl(id) {
      return this.$axios('/video/url?id=' + id)
    },
    getSimiVid(id) {
      return this.$axios('/related/allvideo?id=' + id)
    },
    mlog2video(id) {
      return this.$axios('/mlog/to/video?id=' + id)
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
          console.log(newVid);
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