<template>
  <div class="videoRes">
    <h2>视频</h2>
    <EmptyState
        v-if="!searchLoading && !list.length"
        :title="searchError ? '搜索暂时不可用' : '没有找到相关结果'"
        :desc="searchError ? '请检查网络后重新加载' : '试试其他关键词，或切换搜索分类'"
        :action-text="searchError ? '重新加载' : ''"
        @action="initLoad"
    />
    <el-row class="video-res-grid">
      <GridSkeleton v-if="searchLoading" :count="8" type="video"/>
      <VideoLayout v-if="!searchLoading && list.length" :list="list"/>
    </el-row>
    <el-row>
      <LoadMore :error="searchPageError" v-if="!searchLoading && list.length" :load="load" :loading="loading" :noMore="noMore"/>
    </el-row>
  </div>
</template>

<script>
import VideoLayout from "@/components/layout/VideoLayout";
import LoadMore from "@/components/LoadMore";
import GridSkeleton from "@/components/Skeleton/GridSkeleton";
import {searchMixin} from "@/mixins/searchMixin";

export default {
  name: "VideoRes",
  props: ["keyword"],
  components: {VideoLayout, LoadMore, GridSkeleton},
  mixins: [searchMixin],
  data() {
    return { type: 1014, limit: 12, id: "vid", resultIn: 'videos', countIn: 'videoCount', searchLoading: true }
  },
  watch: { list() { this.searchLoading = false } },
  methods: { vClk(id) { this.$bus.$emit('vClk', id) } },
  activated() { this.searchLoading = true; this.initLoad() }
}
</script>

<style scoped>
.video-res-grid ::v-deep .mvList.gridLayout { grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)) !important; gap: 20px; }
.video-res-grid ::v-deep .imgContainer img { aspect-ratio: 16/9; object-fit: cover; border-radius: 14px 14px 0 0; }
</style>
