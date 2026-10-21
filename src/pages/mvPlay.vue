<template>
  <div class="mvPlay">
    <VideoPlayerLayout :id="id" :detail="detail" :simi-click-evt="mvClk" :simi-video="simiMvs"
                       :simi-loading="simiLoading" :url-failed="urlFailed" :url="url"/>
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
      }))).finally(() => { this.simiLoading = false })
    },
    mvClk(id) {
      this.$bus.$emit('mvClk', id)
    }
  },
  activated() {
    this.loading = true
    this.getDetail(this.id).then(detail => {
      this.detail = detail.data.data
      // 相关推荐依赖 detail.name，等详情落地再拉
      return this.getSimiMv(this.id)
    }).then(simiMvs => {
      this.simiMvs = simiMvs
    })
    // ⚠️ /mv/url 对部分 MV 恒返回 { data: { url: null } }（如 id=10961972，各分辨率皆为空），
    //    直接把 null 传给必填 String prop 会告警并卡在骨架屏，这里转成空串 + 失败态
    this.getUrl(this.id).then(url => {
      const d = (url.data && url.data.data) || {}
      this.url = d.url || ""
      this.urlFailed = !this.url
    }).catch(() => {
      this.url = ""
      this.urlFailed = true
    }).finally(() => { this.loading = false })
  },
}
</script>

<style lang="scss" scoped>
.mvPlay {
  text-align: left; height: 100%;
}

.simiMV { margin-bottom: 30px; }
</style>