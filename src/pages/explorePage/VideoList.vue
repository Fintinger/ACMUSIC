<template>
  <div class="video-list">
    <el-row>
          <el-button v-for="t in tags" :key="t.id" type="small" @click="tagClick(t.id)">{{ t.name }}</el-button>
    </el-row>
    <el-row>
      <VideoLayout :list="renderList"/>
      <LoadMore v-if="!curId" :load="loadRec" :loading="loading" :no-more="noMore"/>
      <LoadMore v-else :load="load" :loading="loading" :no-more="noMore"/>
    </el-row>
  </div>
</template>

<script>
import VideoLayout from "@/components/layout/VideoLayout";
import LoadMore from "@/components/LoadMore";

export default {
  name: "VideoList",
  components: {VideoLayout, LoadMore},
  data() {
    return {
      tags: [],
      curId: "",
      offset: 0,
      renderList: [],
      loading: false,
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
      this.loading = true
      this.getRecommendedVideos().then(res => {
        console.log(res);
        res.data.datas.forEach(val => {
          if (this.renderList.findIndex(item => item.vid === val.vid) === -1) {
            this.renderList.push(val.data)
          }
        })
        this.more = res.data.hasmore
        this.loading = false
      })
    },
    load() {
      this.offset++;
      this.loading = true
      this.getVideoByTagId(this.curId).then(res => {
        console.log(res);
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
      this.renderList = []
      this.$axios.all([this.getVideoTags(), this.getRecommendedVideos()])
          .then(this.$axios.spread((tags, recommend) => {
            //标签列表
            this.tags = tags.data.data
            //推荐视频
            recommend.data.datas.map(val => {
              this.renderList.push(val.data)
            })
            this.more = recommend.data.hasmore
          }))
    }
  },
  activated() {
    this.concurrentRequests();
  }
}
</script>

<style scoped>

</style>