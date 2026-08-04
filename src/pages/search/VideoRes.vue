<template>
  <div class="videoRes">
    <h2>视频</h2>
    <el-row class="video-res-grid">
      <GridSkeleton v-if="searchLoading" :count="8" type="video"/>
      <VideoLayout v-if="!searchLoading" :list="list"/>
    </el-row>
    <el-row>
      <LoadMore :load="load" :loading="loading" :noMore="noMore"/>
    </el-row>
  </div>
</template>

<script>
import VideoLayout from "@/components/layout/VideoLayout";
import LoadMore from "@/components/LoadMore";
import GridSkeleton from "@/components/Skeleton/GridSkeleton";
import {searchMixin} from "@/assets/mixin";

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
.video-res-grid ::v-deep .mvList.gridLayout { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)) !important; gap: 20px; }
.video-res-grid ::v-deep li { padding: 0 !important; transition: transform .25s; &:hover { transform: translateY(-4px); } }
.video-res-grid ::v-deep .el-card { border-radius: 14px; overflow: hidden; border: 1px solid rgba(0,0,0,.06); }
.video-res-grid ::v-deep .imgContainer img { aspect-ratio: 16/9; object-fit: cover; border-radius: 14px 14px 0 0; }
.video-res-grid ::v-deep .moreInfo { padding: 10px 14px 12px; }
.video-res-grid ::v-deep .title { font-size: 16px; font-weight: 600; color: #222; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.video-res-grid ::v-deep .vCreator { font-size: 13px; color: #999; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.video-res-grid ::v-deep .playCount,
.video-res-grid ::v-deep .duration { display: inline-flex !important; align-items: center; gap: 3px; font-size: 12px; color: #999; margin-top: 8px; }
.video-res-grid ::v-deep .playCount::before { content: "▶ "; font-size: 11px; opacity: .7; }
.video-res-grid ::v-deep .duration::before { content: "◷ "; font-size: 11px; opacity: .7; margin-left: 16px; }
</style>
