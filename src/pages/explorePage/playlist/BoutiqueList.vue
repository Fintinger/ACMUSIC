<template>
  <div class="boutiquePlaylist">
    <!--    精品歌单tags-->
    <ul class="listTags">
      <li v-for="t in BoutiquePlaylistTags" :key="t.id">
        <el-button size="small" type="success" @click="getListForCurrentTag(t.name)">{{ t.name }}</el-button>
      </li>
    </ul>
    <el-row class="list">
      <PlaylistLayout :list="listForCurrentTag" pic-name="coverImgUrl"/>
    </el-row>
    <button v-if="!loading&&!noMore" @click="load(currentTag,lastTime)">加载更多</button>
    <p v-if="loading">加载中...</p>
    <p v-if="noMore">没有更多了</p>
  </div>
</template>

<script>
import PlaylistLayout from "@/components/layout/PlaylistLayout";

export default {
  name: "BoutiquePlaylist",
  components: {PlaylistLayout},
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
    load(cat, before) {
      this.loading = true
      this.getList(cat, before).then(res => {
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

    li {
      display: inline-block;
      margin: 10px 10px;
    }
  }

}

</style>