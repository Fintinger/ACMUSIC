<template>
  <div class="artistRes">
    <h2>歌手</h2>
    <EmptyState
        v-if="!searchLoading && !list.length"
        :title="searchError ? '搜索暂时不可用' : '没有找到相关结果'"
        :desc="searchError ? '请检查网络后重新加载' : '试试其他关键词，或切换搜索分类'"
        :action-text="searchError ? '重新加载' : ''"
        @action="initLoad"
    />
    <div class="albumContainer">
      <GridSkeleton v-if="searchLoading" :count="8" type="artist"/>
      <ArtistLayout v-if="!searchLoading && list.length" :list="list"/>
    </div>
    <el-row>
      <LoadMore :error="searchPageError" v-if="!searchLoading && list.length" :load="load" :loading="loading" :noMore="noMore"/>
    </el-row>
  </div>
</template>

<script>
import LoadMore from "@/components/LoadMore";
import ArtistLayout from "@/components/layout/ArtistLayout";
import GridSkeleton from "@/components/Skeleton/GridSkeleton";
import {searchMixin} from "@/mixins/searchMixin";

export default {
  name: "ArtistRes",
  props: ["keyword"],
  components: {LoadMore, ArtistLayout, GridSkeleton},
  mixins: [searchMixin],
  data() {
    return {
      type: 100, limit: 12, resultIn: 'artists', countIn: 'artistCount',
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
