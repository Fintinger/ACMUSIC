<template>
  <div class="albumRes">
    <h2>专辑</h2>
    <el-row class="albumContainer">
      <GridSkeleton v-if="searchLoading" :count="8"/>
      <AlbumLayout v-if="!searchLoading" :list="list"/>
    </el-row>
    <el-row>
      <LoadMore :load="load" :loading="loading" :noMore="noMore"/>
    </el-row>
  </div>
</template>

<script>
import LoadMore from "@/components/LoadMore";
import AlbumLayout from "@/components/layout/AlbumLayout";
import GridSkeleton from "@/components/Skeleton/GridSkeleton";
import {searchMixin} from "@/assets/mixin";

export default {
  name: "AlbumRes",
  props: ["keyword"],
  components: {LoadMore, AlbumLayout, GridSkeleton},
  mixins: [searchMixin],
  data() {
    return {
      type: 10, limit: 12, resultIn: 'albums', countIn: 'albumCount',
      searchLoading: true
    }
  },
  watch: { list() { this.searchLoading = false } },
  methods: {
    alClk(id) {
      this.$bus.$emit('alClk', id)
    }
  },
  activated() {
    this.initLoad()
  }
}
</script>

<style scoped>
::v-deep .gridLayout { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) !important; gap: 20px; }
::v-deep .gridLayout li { padding: 0 !important; }
::v-deep .playIcon i { font-size: 2rem !important; }
</style>