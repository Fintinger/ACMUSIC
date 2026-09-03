<template>
  <div class="VoiceRes">
    <h2>声音</h2>
    <div v-if="searchLoading" class="skel-list">
      <div v-for="n in 6" :key="n" class="skel-row"><div class="skel-bar"></div></div>
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
      return this.$axios.get('/search', { params: { keywords: this.keyword, limit: this.limit, offset: this.offset, type: this.type, ...params } })
    },
    initLoad() {
      this.getList().then(res => {
        this.list = []
        res.data.data.resources.forEach(val => { this.dataProcessing(val.baseInfo.mainSong); this.list.push(val.baseInfo.mainSong) })
        this.totalCount = res.data.data.totalCount
      })
    },
    load() {
      this.page++; this.loading = true;
      this.getList().then(res => {
        res.data.data.resources.forEach(val => {
          this.dataProcessing(val.baseInfo.mainSong)
          if (this.list.findIndex(item => item.id === val.baseInfo.mainSong.id === -1)) { this.list.push(val.baseInfo.mainSong); this.loading = false }
        })
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
.skel-bar { height: 14px; border-radius: 6px; width: 80%; background: linear-gradient(90deg,#e8e8e8 25%,#f0f0f0 50%,#e8e8e8 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; }
@keyframes shimmer { 0% { background-position:200% 0; } 100% { background-position:-200% 0; } }
</style>
