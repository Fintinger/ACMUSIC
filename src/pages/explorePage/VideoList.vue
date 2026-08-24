<template>
  <div class="video-list">
    <el-row class="video-tags">
          <el-button v-for="t in tags" :key="t.id" class="video-tag-btn" size="small" @click="tagClick(t.id)">{{ t.name }}</el-button>
    </el-row>
    <el-row class="video-result">
      <GridSkeleton v-if="loading && !renderList.length" type="video"/>
      <VideoLayout v-if="renderList.length" :list="renderList"/>
      <LoadMore v-if="renderList.length && !curId" :load="loadRec" :loading="loadingMore" :no-more="noMore"/>
      <LoadMore v-if="renderList.length && curId" :load="load" :loading="loadingMore" :no-more="noMore"/>
    </el-row>
  </div>
</template>

<script>
import VideoLayout from "@/components/layout/VideoLayout";
import LoadMore from "@/components/LoadMore";
import GridSkeleton from "@/components/Skeleton/GridSkeleton";

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
      more: true
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
      this.getVideoByTagId(id).then(res => {
        res.data.datas.map(val => this.renderList.push(val.data))
      })
    }
  },
  methods: {
    getVideoTags() {
      return this.$axios('/video/group/list')
    },
    getVideoByTagId(id) {
      return this.$axios('/video/group', {params: {id, offset: this.offset}})
    },
    tagClick(id) {
      this.curId = id
    },
    loadRec() {
      this.offset++;
      this.loadingMore = true
      this.getRecommendedVideos().then(res => {
        console.log(res);
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
      return this.$axios('/video/timeline/recommend', {params: {offset: this.offset}})
    },
    concurrentRequests() {
      this.loading = true
      this.renderList = []
      this.$axios.all([this.getVideoTags(), this.getRecommendedVideos()])
          .then(this.$axios.spread((tags, recommend) => {
            this.tags = tags.data.data
            recommend.data.datas.map(val => {
              this.renderList.push(val.data)
            })
            this.more = recommend.data.hasmore
          }))
          .finally(() => { this.loading = false })
    }
  },
  activated() {
    this.concurrentRequests();
  }
}
</script>

<style scoped>
.video-list .video-tags {
  display: flex;
  flex-wrap: nowrap;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  gap: 8px;
  padding-bottom: 6px;
  margin-left: 0;
  margin-right: 0;
  &::-webkit-scrollbar { height: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(0,0,0,.12); border-radius: 2px; }
  &::-webkit-scrollbar-track { background: transparent; }
}
</style>