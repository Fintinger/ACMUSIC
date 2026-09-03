<template>
  <div class="lyricRes">
    <h2>歌词</h2>
    <div v-if="searchLoading" class="skel-list">
      <div v-for="n in 6" :key="n" class="skel-row"><div class="skel-bar skeleton-item"></div></div>
    </div>
    <TracksLayout v-if="!searchLoading" :list="list"/>
    <el-row>
      <LoadMore :load="load" :loading="loading" :noMore="noMore"/>
    </el-row>
  </div>
</template>

<script>
import LoadMore from "@/components/LoadMore";
import TracksLayout from "@/components/layout/TracksLayout";
import {searchMixin} from "@/mixins/searchMixin";

export default {
  name: "LyricRes",
  props: ["keyword"],
  components: {LoadMore, TracksLayout},
  mixins: [searchMixin],
  data() {
    return { type: 1006, limit: 20, resultIn: 'songs', countIn: 'songCount', searchLoading: true }
  },
  watch: { list() { this.searchLoading = false } },
  methods: {
    mvClk(id) { this.$bus.$emit('mvClk', id) },
    songClk(song) { this.$bus.$emit('songClk', song) },
  },
  activated() { this.searchLoading = true; this.initLoad() }
}
</script>

<style scoped>
::v-deep .tracksContainer { margin: 0; }
.skel-list { padding: 8px 0; }
.skel-row { padding: 10px 0; }
.skel-bar { height: 14px; border-radius: 6px; width: 80%; }
</style>
