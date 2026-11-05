<template>
  <div class="VideoPlay">
    <!-- 无 id 时仍渲染错误与重试入口，给展示组件传空串避免 required prop 警告。 -->
    <VideoPlayerLayout :id="newId || id || ''" :detail-failed="detailFailed" @retry-detail="loadMedia" @retry-url="loadUrl" :detail="detail" :nameConfig="nameConfig" :simi-click-evt="vClk"
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
      detailFailed: false,
      requestVersion: 0,
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
    async loadSimi(id, version = this.requestVersion) {
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
        if (version !== this.requestVersion) return
        // 标题/标签/作者全部搜不到时，侧栏会因为列表为空被整个 v-if 拿掉，
        // 这里退化成推荐流补位，保证右侧始终有内容
        if (!list.length) {
          list = await fetchRecommendVideos({ excludeId: id, limit: 10 })
          if (version !== this.requestVersion) return
          this.simiFallback = list.length > 0
        }
        this.simiVid = list
      } finally {
        if (version === this.requestVersion) this.simiLoading = false
      }
    },
    mlog2video(id) {
      return videoApi.mlogToVideo(id)
    },
    vClk(id) {
      this.$bus.$emit('vClk', id)
    },
    async loadUrl() {
      const version = this.requestVersion
      const id = this.newId || this.id
      this.url = ''; this.urlFailed = false
      try {
        const res = await this.getUrl(id)
        if (version !== this.requestVersion) return
        const urls = (res.data && res.data.urls) || []
        const last = urls[urls.length - 1] || {}
        this.url = last.url || ''; this.urlFailed = !this.url
      } catch (_) { if (version === this.requestVersion) this.urlFailed = true }
    },
    async loadMedia() {
      const version = ++this.requestVersion
      this.detail = {}; this.newId = ''; this.url = ''; this.simiVid = []
      this.simiLoading = false; this.simiFallback = false; this.detailFailed = false; this.urlFailed = false
      if (!String(this.id || '').trim()) { this.detailFailed = true; return }
      if (/^[1-9]\d*$/.test(String(this.id))) {
        this.$router.replace({name: 'mvPlay', query: {id: this.id}})
        return
      }
      try {
        let id = this.id
        if (/^a1/.test(id)) {
          const converted = await this.mlog2video(id)
          if (version !== this.requestVersion) return
          id = converted.data && converted.data.data
          if (typeof id !== 'string' || !id) throw new Error('Invalid Mlog ID')
          this.newId = id
        }
        const res = await this.getVidDetail(id)
        if (version !== this.requestVersion) return
        const data = res.data && res.data.data
        if (!data || !data.title) throw new Error('Invalid video detail')
        this.detail = data
        await Promise.all([this.loadUrl(), this.loadSimi(id, version).catch(() => {})])
      } catch (_) { if (version === this.requestVersion) this.detailFailed = true }
    }
  },
  beforeDestroy() { this.requestVersion++ },
  activated() { this.loadMedia() }
}
</script>

<style scoped>

</style>
