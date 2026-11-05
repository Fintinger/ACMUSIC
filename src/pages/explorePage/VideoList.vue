<template>
  <div class="video-list">
    <div class="tag-scroller">
      <button
          v-show="tags.length"
          class="scroll-arrow scroll-arrow--left"
          :class="{ disabled: !canScrollLeft }"
          @click="scrollTags(-1)"
      >‹</button>
      <el-row class="video-tags" ref="videoTags" @scroll.native="onTagsScroll">
            <el-button class="video-tag-btn" size="small" :class="{ 'is-active': !curId }" @click="selectAll">全部</el-button>
            <el-button v-for="t in tags" :key="t.id" class="video-tag-btn" size="small" :class="{ 'is-active': curId === t.id }" @click="tagClick(t)">{{ t.name }}</el-button>
      </el-row>
      <button
          v-show="tags.length"
          class="scroll-arrow scroll-arrow--right"
          :class="{ disabled: !canScrollRight }"
          @click="scrollTags(1)"
      >›</button>
    </div>
    <EmptyState v-if="tagsError" compact title="视频标签加载失败" action-text="重试标签" @action="loadVideoTags"/>
    <el-row class="video-result">
      <GridSkeleton v-if="loading && !renderList.length" type="video"/>
      <VideoLayout v-if="renderList.length" :list="renderList"/>
      <div v-if="!loading && tagError" class="video-empty">
        <span>{{ tagError }}</span>
        <el-button type="text" class="video-empty-retry" @click="reload">重试</el-button>
      </div>
      <div v-else-if="!loading && !renderList.length" class="video-empty">
        {{ curId ? '该标签下暂无视频，换个标签看看' : '暂无推荐视频，稍后再试' }}
      </div>
      <EmptyState v-if="pageError" compact title="更多视频加载失败" desc="已加载内容仍可浏览" action-text="重试加载更多" @action="curId ? load() : loadRec()"/>
      <LoadMore v-if="renderList.length && !curId && !pageError" :load="loadRec" :loading="loadingMore" :no-more="noMore"/>
      <LoadMore v-if="renderList.length && curId && !pageError" :load="load" :loading="loadingMore" :no-more="noMore"/>
    </el-row>
  </div>
</template>

<script>
import EmptyState from '@/components/common/EmptyState';
import VideoLayout from "@/components/layout/VideoLayout";
import LoadMore from "@/components/LoadMore";
import GridSkeleton from "@/components/Skeleton/GridSkeleton";
import * as videoApi from "@/api/Video";
import * as searchApi from "@/api/Search";

// 视频搜索类型: 1014 = 视频(cloudsearch / search 通用)
const VIDEO_SEARCH_TYPE = 1014

export default {
  name: "VideoList",
  components: {EmptyState, VideoLayout, LoadMore, GridSkeleton},
  data() {
    return {
      tags: [],
      curId: "",
      curName: "",
      // 标签模式下 offset 是"条数偏移"(cloudsearch 语义), 每页拉 limit 条
      limit: 30,
      offset: 0,
      renderList: [],
      loading: true,
      pageError: false,
      tagsError: false,
      tagsLoading: false,
      loadingMore: false,
      more: true,
      tagError: "",
      // 请求序号: 快速切标签时丢弃过期响应
      reqSeq: 0,
      canScrollLeft: false,
      canScrollRight: false,
    }
  },
  computed: {
    noMore() {
      return !this.more
    }
  },
  watch: {
    curId() {
      this.reload()
    },
    // 从播放页点标签跳转过来（/explore/videoList?tag=现场）
    '$route.query.tag'() {
      this.applyRouteTag()
    }
  },
  methods: {
    getVideoTags() {
      return videoApi.groupList()
    },
    /**
     * 标签下的视频列表
     * 上游 /video/group (videotimeline/videogroup/otherclient/get) 已停止下发列表,
     * 实测匿名与真实 MUSIC_U 均返回 { code: 200, datas: null }, 且多组参数变体都无效;
     * 因此改用视频搜索 keywords=标签名&type=1014 (实测各标签均有结果, offset 为条数偏移)。
     */
    getVideosByTag(offset = this.offset) {
      return searchApi.searchV2({
        keywords: this.curName,
        type: VIDEO_SEARCH_TYPE,
        limit: this.limit,
        offset
      })
    },
    /** 把响应按当前模式(标签/推荐)合并进 renderList, 按 vid 去重 */
    applyResult(res) {
      const body = res && res.data
      const code = body && (body.code || body.status)
      if (!body || (code != null && Number(code) !== 200)) throw new Error('Invalid video response')
      if (this.curId && !body.result) throw new Error('Missing search result')
      if (!this.curId && body.datas !== null && !Array.isArray(body.datas)) throw new Error('Missing video feed')
      if (this.curId) {
        const videos = (res.data && res.data.result && res.data.result.videos) || []
        videos.forEach(v => this.pushUnique(v))
        // 搜索接口不返回 hasmore: 本页拉满才认为还有下一页
        this.more = videos.length >= this.limit
      } else {
        const datas = (res.data && res.data.datas) || []
        datas.forEach(val => val && val.data && this.pushUnique(val.data))
        this.more = !!res.data.hasmore
      }
    },
    pushUnique(item) {
      if (!item || !item.vid) return
      if (this.renderList.findIndex(i => i.vid === item.vid) === -1) {
        this.renderList.push(item)
      }
    },
    /** 首屏/切换标签/重试的统一入口 */
    reload() {
      const seq = ++this.reqSeq
      this.offset = 0
      this.loadingMore = false
      this.pageError = false
      this.renderList = []
      this.more = true
      this.tagError = ""
      this.loading = true
      const fetcher = this.curId ? () => this.getVideosByTag() : () => this.getRecommendedVideos()
      return this.retryOnce(fetcher)
          .then(res => {
            // 期间又切了标签/回推荐流: 丢弃这次结果
            if (seq !== this.reqSeq) return
            this.applyResult(res)
          })
          .catch(() => { if (seq === this.reqSeq) this.tagError = "加载失败，请稍后重试" })
          .finally(() => { if (seq === this.reqSeq) this.loading = false })
    },
    // 匿名登录 cookie 可能尚未就绪, HTTP 301 或业务 code 301(需要登录) 时延时重试, 最多 4 次
    retryOnce(promiseFactory, attempts = 4, delay = 800) {
      const tryOne = (n) => promiseFactory()
          .then(res => {
            const code = res.data && (res.data.code || res.data.status)
            if (code === 301 && n > 1) {
              // 业务层 301: 等 cookie 落地后重试
              return new Promise((resolve, reject) => {
                setTimeout(() => tryOne(n - 1).then(resolve, reject), delay)
              })
            }
            return res
          })
          .catch(err => {
            const st = err && err.response && err.response.status
            if ((st === 301 || st === 401) && n > 1) {
              return new Promise((resolve, reject) => {
                setTimeout(() => tryOne(n - 1).then(resolve, reject), delay)
              })
            }
            throw err
          })
      return tryOne(attempts)
    },
    tagClick(t) {
      // 先存名字再改 curId(触发 watch), 保证 watch 里拿到的关键字是最新的
      this.curName = t.name
      this.curId = t.id
    },
    /** 路由带 tag 时自动选中对应标签（播放页"#"标签跳转入口） */
    applyRouteTag() {
      const tag = this.$route && this.$route.query && this.$route.query.tag
      if (!tag || !this.tags.length) return false
      const t = this.tags.find(x => x.name === tag)
      if (t && t.id !== this.curId) {
        this.tagClick(t)
        return true
      }
      return false
    },
    /** 回到推荐流 */
    selectAll() {
      this.curName = ""
      this.curId = ""
    },
    loadRec() { return this.loadNextPage(false) },
    load() { return this.loadNextPage(true) },
    async loadNextPage(tagMode) {
      if (this.loading || this.loadingMore || !this.more) return
      const seq = this.reqSeq
      const next = this.offset + (tagMode ? this.limit : 1)
      this.loadingMore = true; this.pageError = false
      try {
        const res = await (tagMode ? this.getVideosByTag(next) : this.getRecommendedVideos(next))
        if (seq !== this.reqSeq) return
        this.applyResult(res)
        this.offset = next
      } catch (_) { if (seq === this.reqSeq) this.pageError = true }
      finally { if (seq === this.reqSeq) this.loadingMore = false }
    },
    getRecommendedVideos(offset = this.offset) { return videoApi.timelineRecommend(offset) },
    async loadVideoTags() {
      if (this.tagsLoading) return
      this.tagsLoading = true; this.tagsError = false
      try {
        const res = await this.retryOnce(() => this.getVideoTags())
        if (!res.data || !Array.isArray(res.data.data)) throw new Error('Invalid video tags')
        this.tags = res.data.data
        this.applyRouteTag()
        this.$nextTick(() => this.updateArrows())
      } catch (_) { this.tagsError = true }
      finally { this.tagsLoading = false }
    },
    concurrentRequests() { return Promise.all([this.loadVideoTags(), this.reload()]) },
    updateArrows() {
      const el = this.$refs.videoTags && this.$refs.videoTags.$el ? this.$refs.videoTags.$el : this.$refs.videoTags
      if (!el) return
      const maxLeft = el.scrollWidth - el.clientWidth
      this.canScrollLeft = el.scrollLeft > 4
      this.canScrollRight = el.scrollLeft < maxLeft - 4
    },
    onTagsScroll() {
      this.updateArrows()
    },
    scrollTags(dir) {
      const el = this.$refs.videoTags && this.$refs.videoTags.$el ? this.$refs.videoTags.$el : this.$refs.videoTags
      if (!el) return
      el.scrollBy({ left: dir * 320, behavior: 'smooth' })
    }
  },
  updated() {
    this.updateArrows()
  },
  beforeDestroy() { this.reqSeq++ },
  activated() {
    // 首次进入拉标签 + 推荐流; 已选标签时保留标签视图, 只重拉一次避免数据过期
    if (!this.tags.length) this.concurrentRequests()
    else if (this.curId) this.reload()
    this.applyRouteTag()
  }
}
</script>

<style scoped>
.video-list .tag-scroller {
  display: flex;
  align-items: center;
  padding-bottom: 20px;
}

.video-list .video-tags {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  gap: 8px;
  margin-left: 0;
  margin-right: 0;
  line-height: 0;
  flex: 1;
  min-width: 0;
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar { display: none; }
}

.video-list .scroll-arrow {
  z-index: 5;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: 1px solid var(--c-border-strong);
  border-radius: 50%;
  background: var(--c-glass);
  color: var(--c-text-secondary);
  font-size: 22px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  align-self: center;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,.08);
  transition: all .2s ease;
}
.video-list .scroll-arrow:hover {
  background: var(--c-bg-elevated);
  color: var(--c-accent-text);
  box-shadow: 0 6px 16px rgba(0,0,0,.12);
}
.video-list .scroll-arrow.disabled {
  opacity: .35;
  cursor: default;
  box-shadow: none;
}
.video-list .scroll-arrow.disabled:hover {
  background: var(--c-glass);
  color: var(--c-text-secondary);
  box-shadow: none;
}
.video-list .scroll-arrow--left { margin-right: 10px; }
.video-list .scroll-arrow--right { margin-left: 10px; }

.video-list .video-tag-btn.is-active,
.video-list .video-tag-btn.is-active:hover {
  background: var(--c-button-primary);
  border-color: var(--c-button-primary);
  color: var(--c-text-on-accent);
}

.video-list .video-empty {
  width: 100%;
  padding: 60px 0;
  text-align: center;
  color: var(--c-text-tertiary);
  font-size: 14px;
}

.video-list .video-empty-retry {
  margin-left: 8px;
  padding: 0;
  font-size: 14px;
}
</style>
