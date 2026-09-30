<template>
  <div class="VoiceRes">
    <h2>声音</h2>
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
import * as searchApi from "@/api/Search";

export default {
  name: "VoiceRes",
  props: ["keyword"],
  components: {LoadMore, TracksLayout},
  mixins: [searchMixin],
  data() {
    return { type: 2000, limit: 50, searchLoading: true }
  },
  watch: { list() { this.searchLoading = false } },
  methods: {
    dataProcessing(data) {
      data.al = data.album; data.ar = data.artists; delete data.album; delete data.artists; data.isVoice = true
    },
    getList(params) {
      return searchApi.search({ keywords: this.keyword, limit: this.limit, offset: this.offset, type: this.type, ...params })
    },
    initLoad() {
      // 重置分页, 否则切换关键词后会沿用上一次的 offset
      this.page = 0
      return this.getList().then(res => {
        this.list = []
        const resources = (res.data && res.data.data && res.data.data.resources) || []
        resources.forEach(val => { this.dataProcessing(val.baseInfo.mainSong); this.list.push(val.baseInfo.mainSong) })
        this.totalCount = res.data.data.totalCount
      }).catch(() => {
        this.list = []
        this.totalCount = 0
      })
    },
    load() {
      if (this.loading || this.noMore) return
      this.page++; this.loading = true;
      return this.getList().then(res => {
        const resources = (res.data && res.data.data && res.data.data.resources) || []
        const exists = new Set(this.list.map(item => item.id))
        resources.forEach(val => {
          this.dataProcessing(val.baseInfo.mainSong)
          const song = val.baseInfo.mainSong
          // 修正: 原写法 `item.id === x.id === -1` 恒为 false, 去重从未生效
          if (!exists.has(song.id)) {
            exists.add(song.id)
            this.list.push(song)
          }
        })
      }).catch(() => {
        this.page--
      }).finally(() => {
        this.loading = false
      })
    },
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
