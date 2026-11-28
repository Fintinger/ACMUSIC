<template>
  <div class="VoiceRes">
    <div class="res-head">
      <h2>声音</h2>
      <!-- 声音节目没有音乐音源，不能进播放列表，只保留播放 -->
      <PlayAllButton v-if="list.length" :tracks="list" size="xs" :addable="false"/>
    </div>
    <EmptyState
        v-if="!searchLoading && !list.length"
        :title="searchError ? '搜索暂时不可用' : '没有找到相关结果'"
        :desc="searchError ? '请检查网络后重新加载' : '试试其他关键词，或切换搜索分类'"
        :action-text="searchError ? '重新加载' : ''"
        @action="initLoad"
    />
    <div v-if="searchLoading" class="skel-list">
      <div v-for="n in 6" :key="n" class="skel-row"><div class="skel-bar skeleton-item"></div></div>
    </div>
    <TracksLayout v-if="!searchLoading && list.length" :list="list" :need-btn="false"/>
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
import * as searchApi from "@/api/Search";

export default {
  name: "VoiceRes",
  props: ["keyword"],
  components: {LoadMore, TracksLayout, PlayAllButton},
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
      this.searchLoading = true
      this.searchError = false
      return this.getList().then(res => {
        this.list = []
        const resources = (res.data && res.data.data && res.data.data.resources) || []
        resources.forEach(val => { this.dataProcessing(val.baseInfo.mainSong); this.list.push(val.baseInfo.mainSong) })
        this.totalCount = Number(res.data.data.totalCount) || this.list.length
      }).catch(() => {
        this.list = []
        this.totalCount = 0
        this.searchError = true
      }).finally(() => {
        this.searchLoading = false
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
/* 标题 + 播放全部同一行（与 TrackRes / LyricRes 一致） */
.res-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px; margin-bottom: 20px;
}
.res-head h2 { margin: 0; }
.res-head .play-all-combo { margin-top: 0; }

::v-deep .tracksContainer { margin: 0; }
.skel-list { padding: 8px 0; }
.skel-row { padding: 10px 0; }
.skel-bar { height: 14px; border-radius: 6px; width: 80%; }
</style>
