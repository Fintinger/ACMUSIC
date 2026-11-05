<template>
  <div class="playlistRes">
    <h2>歌单</h2>
    <EmptyState
        v-if="!searchLoading && !list.length"
        :title="searchError ? '搜索暂时不可用' : '没有找到相关结果'"
        :desc="searchError ? '请检查网络后重新加载' : '试试其他关键词，或切换搜索分类'"
        :action-text="searchError ? '重新加载' : ''"
        @action="initLoad"
    />
    <el-row>
      <GridSkeleton v-if="searchLoading" :count="8"/>
      <PlaylistLayout v-if="!searchLoading && list.length" :list="list" picName="coverImgUrl"/>
    </el-row>
    <el-row>
      <LoadMore :error="searchPageError" v-if="!searchLoading && list.length" :load="load" :loading="loading" :noMore="noMore"/>
    </el-row>
  </div>
</template>

<script>
import LoadMore from "@/components/LoadMore";
import GridSkeleton from "@/components/Skeleton/GridSkeleton";
import {searchMixin} from "@/mixins/searchMixin";
import PlaylistLayout from "@/components/layout/PlaylistLayout";

export default {
  name: "PlaylistRes",
  props: ["keyword"],
  components: {LoadMore, PlaylistLayout, GridSkeleton},
  mixins: [searchMixin],
  data() {
    return {
      type: 1000, limit: 12, resultIn: 'playlists', countIn: 'playlistsCount',
      searchLoading: true
    }
  },
  watch: { list() { this.searchLoading = false } },
  methods: {
    arClk(id) { this.$bus.$emit('arClk', id) }
  },
  activated() { this.searchLoading = true; this.initLoad() }
}
</script>

<style scoped>
::v-deep .gridLayout { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) !important; gap: 20px; }
</style>
