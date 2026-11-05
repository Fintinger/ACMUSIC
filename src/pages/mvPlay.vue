<template>
  <div class="mvPlay">
    <VideoPlayerLayout :id="id || ''" :detail="detail" :simi-click-evt="mvClk" :simi-video="simiMvs"
                       :detail-failed="detailFailed" @retry-detail="loadMedia" @retry-url="loadUrl" :simi-loading="simiLoading" :url-failed="urlFailed" :url="url"/>
  </div>
</template>

<script>
import VideoPlayerLayout from "@/components/layout/VideoPlayerLayout";
import * as mvApi from "@/api/Mv";
import { fetchRelatedVideos } from "@/utils/relatedVideos";

export default {
  name: "mvPlay",
  props: ["id"],
  components: {VideoPlayerLayout},
  data() {
    return {
      detail: {},
      url: "",
      simiMvs: [],
      simiLoading: false,
      urlFailed: false,
      loading: true,
      detailFailed: false,
      requestVersion: 0
    }
  },
  methods: {
    async loadUrl() {
      const version = this.requestVersion
      this.url = ''; this.urlFailed = false
      try {
        const res = await this.getUrl(this.id)
        if (version !== this.requestVersion) return
        this.url = (res.data && res.data.data && res.data.data.url) || ''
        this.urlFailed = !this.url
      } catch (_) { if (version === this.requestVersion) this.urlFailed = true }
    },
    async loadMedia() {
      const version = ++this.requestVersion
      this.detail = {}; this.url = ''; this.simiMvs = []; this.simiLoading = false
      this.detailFailed = false; this.urlFailed = false; this.loading = true
      if (!/^[1-9]\d*$/.test(String(this.id || ''))) { this.detailFailed = true; this.loading = false; return }
      const source = this.loadUrl()
      try {
        const res = await this.getDetail(this.id)
        if (version !== this.requestVersion) return
        const data = res.data && res.data.data
        if (!data || !data.name) throw new Error('Invalid MV detail')
        this.detail = data
        this.getSimiMv(this.id, version).then(list => { if (version === this.requestVersion) this.simiMvs = list }).catch(() => {})
      } catch (_) { if (version === this.requestVersion) this.detailFailed = true }
      finally { if (version === this.requestVersion) this.loading = false }
      await source
    },
    getDetail(id) {
      return mvApi.detail(id)
    },
    getUrl(id, r = 1080) {
      return mvApi.url(id, r)
    },
    getSimiMv(id, version = this.requestVersion) {
      // /simi/mv 上游已忽略 mvid，任何 id 都返回同一份固定列表，改按名称搜索（见 utils/relatedVideos.js）
      const d = this.detail || {}
      const fallback = (d.artists && d.artists[0] && d.artists[0].name) || d.artistName || ""
      this.simiLoading = true
      return fetchRelatedVideos(d.name || "", {
        excludeId: id,
        // hex 视频走 /mv/detail、/mv/url 会 502，MV 页只推数字 id（MV 体系）保证可点可播
        numericOnly: true,
        // 标题搜索为空时用歌手名兜底，避免推荐区消失（实测"王俊凯《生长》…"精确标题搜出 0 条）
        fallbackKeyword: fallback
      }).then(videos => videos.map(v => ({
        // 视频搜索结果(vid/coverUrl/title/creator) → MV 卡片字段(id/cover/name/artistName)
        id: v.vid,
        cover: v.coverUrl,
        name: v.title,
        artistName: (v.creator || []).map(c => c.userName).join(" / "),
        playCount: v.playTime
      }))).finally(() => { if (version === this.requestVersion) this.simiLoading = false })
    },
    mvClk(id) {
      this.$bus.$emit('mvClk', id)
    }
  },
  beforeDestroy() { this.requestVersion++ },
  activated() { this.loadMedia() },
}
</script>

<style lang="scss" scoped>
.mvPlay {
  text-align: left; height: 100%;
}

.simiMV { margin-bottom: 30px; }
</style>
