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
            <el-button v-for="t in tags" :key="t.id" class="video-tag-btn" size="small" @click="tagClick(t.id)">{{ t.name }}</el-button>
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
      <div v-if="!loading && curId && !renderList.length" class="video-empty">该分类暂无视频</div>
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

export default {
  name: "VideoList",
  components: {VideoLayout, LoadMore, GridSkeleton},
  data() {
    return {
      tags: [],
      curId: "",
      offset: 0,
      renderList: [],
      loading: false,
      loadingMore: false,
      more: true,
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
    curId(id) {
      this.offset = 0;
      this.renderList = []
      this.loading = true
      this.retryOnce(() => this.getVideoByTagId(id)).then(res => {
        const datas = res.data.datas || res.data.data || []
        if (Array.isArray(datas)) datas.map(val => this.renderList.push(val.data))
      }).finally(() => { this.loading = false })
    }
  },
  methods: {
    getVideoTags() {
      return videoApi.groupList()
    },
    getVideoByTagId(id) {
      return videoApi.group(id, this.offset)
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
    tagClick(id) {
      this.curId = id
    },
    loadRec() {
      this.offset++;
      this.loadingMore = true
      this.getRecommendedVideos().then(res => {
        res.data.datas.forEach(val => {
          if (this.renderList.findIndex(item => item.vid === val.vid) === -1) {
            this.renderList.push(val.data)
          }
        })
        this.more = res.data.hasmore
        this.loadingMore = false
      })
    },
    load() {
      this.offset++;
      this.loadingMore = true
      this.getVideoByTagId(this.curId).then(res => {
        res.data.datas.forEach(val => {
          if (this.renderList.findIndex(item => item.vid === val.vid) === -1) {
            this.renderList.push(val.data)
          }
        })
        this.more = res.data.hasmore
        this.loading = false
      })
    },
    getRecommendedVideos() {
      return videoApi.timelineRecommend(this.offset)
    },
    concurrentRequests() {
      this.loading = true
      this.renderList = []
      this.$axios.all([
        this.retryOnce(() => this.getVideoTags()),
        this.retryOnce(() => this.getRecommendedVideos())
      ])
          .then(this.$axios.spread((tags, recommend) => {
            this.tags = tags.data.data
            recommend.data.datas.map(val => {
              this.renderList.push(val.data)
            })
            this.more = recommend.data.hasmore
            this.$nextTick(() => this.updateArrows())
          }))
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
    this.concurrentRequests();
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

.video-list .video-empty {
  width: 100%;
  padding: 60px 0;
  text-align: center;
  color: #999;
  font-size: 14px;
}
</style>
