<template>
  <div class="VideoPlay">
    <!-- id 为 undefined 时（如直接访问 /video 路径），不渲染子组件避免 Vue required prop 警告 -->
    <VideoPlayerLayout v-if="newId || id" :id="newId || id" :detail="detail" :nameConfig="nameConfig" :simi-click-evt="vClk"
                         :simi-video="simiVid"
                         :simi-loading="simiLoading"
                         :simi-fallback="simiFallback"
                         :url-failed="urlFailed"
                         :url="url"/>
  </div>
</template>

<script>
import VideoPlayerLayout from "@/components/layout/VideoPlayerLayout";
import * as videoApi from "@/api/Video";
import { fetchRelatedVideos, fetchRecommendVideos } from "@/utils/relatedVideos";

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
      urlFailed: false,
      simiVid: [],
      simiLoading: false,
      // 相关视频搜不到时是否退化成推荐流（用于侧栏标题文案）
      simiFallback: false,
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
    /** 相关推荐: /related/allvideo 上游已废(恒 data:[])，改按标题搜索 */
    async loadSimi(id) {
      const d = this.detail || {}
      const title = d.title || d.name || ""
      // 标题搜索可能为空(如节目期数、生僻标题)，用作者/歌手名兜底，避免推荐区消失
      const fallback = (d.creator && d.creator.nickname) || d.artistName || ""
      // 视频标签(videoGroup)比作者名更贴近内容，作为中间候选；实测如
      // "【好想爱这个世界啊X少年的你】"整标题搜 0 条，"好想爱这个世界啊" 9 条、"少年的你" 12 条
      const extras = (d.videoGroup || []).map(t => t && t.name).filter(Boolean).slice(0, 3)
      this.simiLoading = true
      this.simiFallback = false
      try {
        let list = await fetchRelatedVideos(title, { excludeId: id, fallbackKeyword: fallback, extraKeywords: extras })
        // 标题/标签/作者全部搜不到时，侧栏会因为列表为空被整个 v-if 拿掉，
        // 这里退化成推荐流补位，保证右侧始终有内容
        if (!list.length) {
          list = await fetchRecommendVideos({ excludeId: id, limit: 10 })
          this.simiFallback = list.length > 0
        }
        this.simiVid = list
      } finally {
        this.simiLoading = false
      }
    },
    mlog2video(id) {
      return videoApi.mlogToVideo(id)
    },
    vClk(id) {
      this.$bus.$emit('vClk', id)
    },
    concurrentRequests(id) {
      return this.getUrl(id).then(res => {
        // /video/url 可能返回空 urls 或 null 地址：转空串 + 失败态，避免把 null 传给必填 prop
        const urls = (res.data && res.data.urls) || []
        const last = urls[urls.length - 1] || {}
        this.url = last.url || ""
        this.urlFailed = !this.url
        return this.loadSimi(id)
      }).catch(() => {
        this.url = ""
        this.urlFailed = true
      })
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