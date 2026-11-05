<template>
  <div class="trackRes">
    <h2>单曲</h2>
    <EmptyState
        v-if="!searchLoading && !list.length"
        :title="searchError ? '搜索暂时不可用' : '没有找到相关结果'"
        :desc="searchError ? '请检查网络后重新加载' : '试试其他关键词，或切换搜索分类'"
        :action-text="searchError ? '重新加载' : ''"
        @action="initLoad"
    />
    <div v-if="searchLoading" class="skel-list">
      <div v-for="n in 8" :key="n" class="skel-row"><div class="skel-bar skeleton-item"></div></div>
    </div>
    <TracksLayout v-if="!searchLoading && list.length" :list="list"/>
    <el-row>
      <LoadMore :error="searchPageError" v-if="!searchLoading && list.length" :load="load" :loading="loading" :noMore="noMore"/>
    </el-row>
  </div>
</template>

<script>
import LoadMore from "@/components/LoadMore";
import TracksLayout from "@/components/layout/TracksLayout";
import {searchMixin} from "@/mixins/searchMixin";

export default {
  name: "TrackRes",
  props: ["keyword"],
  components: {LoadMore,TracksLayout},
  mixins: [searchMixin],
  data() {
    return {
      type:1, limit:50,
      resultIn: 'songs', countIn: 'songCount',
      searchLoading: true
    }
  },
  watch: { list() { this.searchLoading = false } },
  computed: {},
  methods: {
    mvClk(id) { this.$bus.$emit('mvClk', id) },
    songClk(song) { this.$bus.$emit('songClk', song) },
  },
  activated() { this.searchLoading = true; this.initLoad() }
}
</script>

<style scoped>
::v-deep .gridLayout li { padding: 0 !important; }
::v-deep .tracksContainer { margin: 0; }
.skel-list { padding: 8px 0; }
.skel-row { padding: 10px 0; }
.skel-bar {
  height: 14px; border-radius: 6px; width: 80%;
}
</style>