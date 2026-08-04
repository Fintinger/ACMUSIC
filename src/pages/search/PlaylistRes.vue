<template>
  <div class="playlistRes">
    <h2>歌单</h2>
    <el-row>
      <GridSkeleton v-if="searchLoading" :count="8"/>
      <PlaylistLayout v-if="!searchLoading" :list="list" picName="coverImgUrl"/>
    </el-row>
    <el-row>
      <LoadMore :load="load" :loading="loading" :noMore="noMore"/>
    </el-row>
  </div>
</template>

<script>
import LoadMore from "@/components/LoadMore";
import GridSkeleton from "@/components/Skeleton/GridSkeleton";
import {searchMixin} from "@/assets/mixin";
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
::v-deep .gridLayout li { padding: 0 !important; }
</style>
