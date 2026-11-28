<template>
  <div class="trackRes">
    <div class="res-head">
      <h2>单曲</h2>
      <PlayAllButton v-if="list.length" :tracks="list" size="xs"/>
    </div>
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
    <TracksLayout
        v-if="!searchLoading && list.length"
        :list="list"
        blocked-mode="mark"
        :show-origin-tags="true"
        :need-btn="false"
    />
    <el-row>
      <LoadMore :error="searchPageError" v-if="!searchLoading && list.length" :load="load" :loading="loading" :noMore="noMore"/>
    </el-row>
  </div>
</template>

<script>
import LoadMore from "@/components/LoadMore";
import TracksLayout from "@/components/layout/TracksLayout";
import PlayAllButton from "@/components/common/PlayAllButton";
import {searchMixin} from "@/mixins/searchMixin";

export default {
  name: "TrackRes",
  props: ["keyword"],
  components: {LoadMore,TracksLayout,PlayAllButton},
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
/* 标题 + 播放全部同一行：搜索页公共头只管搜索词和 tab，这里管列表级动作 */
.res-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; margin-bottom: 20px;
}
.res-head h2 { margin: 0; }
/* 覆盖父级 SearchResult 的 `h2 + * { margin-top: 20px }`，避免按钮被顶下来 */
.res-head .play-all-combo { margin-top: 0; }

::v-deep .gridLayout li { padding: 0 !important; }
::v-deep .tracksContainer { margin: 0; }
.skel-list { padding: 8px 0; }
.skel-row { padding: 10px 0; }
.skel-bar {
  height: 14px; border-radius: 6px; width: 80%;
}
</style>