<template>
  <div class="boutiquePlaylist">
    <!--    精品歌单tags-->
    <ul class="listTags">
      <li v-for="t in BoutiquePlaylistTags" :key="t.id">
        <el-button class="playlist-tag-btn" size="small" @click="getListForCurrentTag(t.name)">{{ t.name }}</el-button>
      </li>
    </ul>
    <el-row class="list">
      <GridSkeleton v-if="loading && !listForCurrentTag.length" type="playlist"/>
      <PlaylistLayout v-if="listForCurrentTag.length" :list="listForCurrentTag" pic-name="coverImgUrl"/>
    </el-row>
    <LoadMore :load="load" :loading="loading" :no-more="noMore"/>
  </div>
</template>

<script>
import PlaylistLayout from "@/components/layout/PlaylistLayout";
import LoadMore from "@/components/LoadMore";
import GridSkeleton from "@/components/Skeleton/GridSkeleton";

export default {
  name: "BoutiquePlaylist",
  components: {PlaylistLayout, LoadMore, GridSkeleton},
  data() {
    return {
      loading: false,
      BoutiquePlaylistTags: [],
      listForCurrentTag: [],
      currentTag: "",
      lastTime: 123,
    }
  },
  computed: {
    noMore() {
      return !this.lastTime
    },
  },
  methods: {
    //加载更多
    load() {
      if (this.loading || this.noMore) return
      this.loading = true
      this.getList(this.currentTag, this.lastTime).then(res => {
        this.loadCallback(res.data)
      })
    },
    //获取当前标签的歌单
    getListForCurrentTag(cat) {
      this.getList(cat).then(res => {
        this.currentTag = cat
        this.listForCurrentTag = res.data.playlists
        this.lastTime = res.data.lasttime
      })
    },
    loadCallback(data) {
      this.listForCurrentTag.push(...data.playlists)
      this.lastTime = data.lasttime
      this.loading = false
    },
    //歌单点击
    plClk(id) {
      this.$bus.$emit('plClk', id)
    },
    //getTags
    getTags() {
      return this.$axios('/playlist/highquality/tags')
    },
    //获取列表
    getList(cat = "", before = "") {
      return this.$axios(`/top/playlist/highquality?limit=12&cat=${cat}&before=${before}`)
    }
  },
  beforeMount() {
    //获取精品歌单tags,默认加载一些歌单（无tag参数）
    this.$axios.all([this.getTags(), this.getList()])
        .then(this.$axios.spread((tags, list) => {
          this.BoutiquePlaylistTags = tags.data.tags
          this.loadCallback(list.data)
        }))
  },
}
</script>

<style lang="scss" scoped>
.boutiquePlaylist {

  ul.listTags {
    text-align: left;
    padding-top: 20px;
    display: flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
    gap: 8px;
    padding-bottom: 6px;
    &::-webkit-scrollbar { height: 4px; }
    &::-webkit-scrollbar-thumb { background: rgba(0,0,0,.12); border-radius: 2px; }
    &::-webkit-scrollbar-track { background: transparent; }

    li {
      display: inline-block;
      margin: 0;
      flex-shrink: 0;
    }
  }

}

</style>