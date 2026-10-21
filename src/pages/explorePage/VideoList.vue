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
      <LoadMore v-if="renderList.length && !curId" :load="loadRec" :loading="loadingMore" :no-more="noMore"/>
      <LoadMore v-if="renderList.length && curId" :load="load" :loading="loadingMore" :no-more="noMore"/>
    </el-row>
  </div>
</template>

<script>
import VideoLayout from "@/components/layout/VideoLayout";
import LoadMore from "@/components/LoadMore";
import GridSkeleton from "@/components/Skeleton/GridSkeleton";
import * as videoApi from "@/api/Video";
import * as searchApi from "@/api/Search";

// 视频搜索类型: 1014 = 视频(cloudsearch / search 通用)
const VIDEO_SEARCH_TYPE = 1014

export default {
  name: "VideoList",
  components: {VideoLayout, LoadMore, GridSkeleton},
  data() {
    return {
      tags: [],
      curId: "",
      curName: "",
      // 标签模式下 offset 是"条数偏移"(cloudsearch 语义), 每页拉 limit 条
      limit: 30,
      offset: 0,
      renderList: [],
      loading: false,
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
    getVideosByTag() {
      return searchApi.searchV2({
        keywords: this.curName,
        type: VIDEO_SEARCH_TYPE,
        limit: this.limit,
        offset: this.offset
      })
    },
    /** 把响应按当前模式(标签/推荐)合并进 renderList, 按 vid 去重 */
    applyResult(res) {
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
      this.renderList = []
      this.more = true
      this.tagError = ""
      this.loading = true
      const fetcher = this.curId ? () => this.getVideosByTag() : () => this.getRecommendedVideos()
      this.retryOnce(fetcher)
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
    /** 回到推荐流 */
    selectAll() {
      this.curName = ""
      this.curId = ""
    },
    loadRec() {
      if (this.loadingMore || !this.more) return
      this.offset++;
      this.loadingMore = true
      return this.getRecommendedVideos().then(res => {
        this.applyResult(res)
      }).catch(() => {
        // 失败回退 offset, 允许重试
        this.offset--
      }).finally(() => {
        this.loadingMore = false
      })
    },
    /** 标签模式翻页: offset 按条数递增 */
    load() {
      if (this.loadingMore || !this.more) return
      this.offset += this.limit
      this.loadingMore = true
      return this.getVideosByTag().then(res => {
        this.applyResult(res)
      }).catch(() => {
        this.offset -= this.limit
      }).finally(() => {
        // 修正: 之前清的是 loading(首屏标志), 而按钮读的是 loadingMore, 导致永久"加载中"
        this.loadingMore = false
      })
    },
    getRecommendedVideos() {
      return videoApi.timelineRecommend(this.offset)
    },
    concurrentRequests() {
      this.loading = true
      this.tagError = ""
      if (!this.curId) {
        this.offset = 0
        this.renderList = []
        this.more = true
      }
      // 标签模式下只补标签, 不覆盖当前列表
      const jobs = [this.retryOnce(() => this.getVideoTags())]
      if (!this.curId) jobs.push(this.retryOnce(() => this.getRecommendedVideos()))
      this.$axios.all(jobs)
          .then(this.$axios.spread((tags, recommend) => {
            this.tags = (tags.data && tags.data.data) || []
            if (recommend) this.applyResult(recommend)
            this.$nextTick(() => this.updateArrows())
          }))
          .catch(() => { if (!this.curId) this.tagError = "加载失败，请稍后重试" })
          .finally(() => { this.loading = false; this.$nextTick(() => this.updateArrows()) })
    },
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
  activated() {
    // 首次进入拉标签 + 推荐流; 已选标签时保留标签视图, 只重拉一次避免数据过期
    if (!this.tags.length) this.concurrentRequests()
    else if (this.curId) this.reload()
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
  border: 1px solid rgba(0,0,0,.06);
  border-radius: 50%;
  background: rgba(255,255,255,.9);
  color: #666;
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
  background: #fff;
  color: #8178ff;
  box-shadow: 0 6px 16px rgba(0,0,0,.12);
}
.video-list .scroll-arrow.disabled {
  opacity: .35;
  cursor: default;
  box-shadow: none;
}
.video-list .scroll-arrow.disabled:hover {
  background: rgba(255,255,255,.9);
  color: #666;
  box-shadow: none;
}
.video-list .scroll-arrow--left { margin-right: 10px; }
.video-list .scroll-arrow--right { margin-left: 10px; }

.video-list .video-tag-btn.is-active,
.video-list .video-tag-btn.is-active:hover {
  background: #8685EF;
  border-color: #8685EF;
  color: #fff;
}

.video-list .video-empty {
  width: 100%;
  padding: 60px 0;
  text-align: center;
  color: #999;
  font-size: 14px;
}

.video-list .video-empty-retry {
  margin-left: 8px;
  padding: 0;
  font-size: 14px;
}
</style>
