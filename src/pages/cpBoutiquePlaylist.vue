<template>
  <div class="boutiquePlaylist">
    <!--    精品歌单tags-->
    <ul class="listTags">
      <li v-for="t in BoutiquePlaylistTags" :key="t.id">
        <el-button size="small" type="success" @click="getListForCurrentTag(t.name)">{{ t.name }}</el-button>
      </li>
    </ul>
    <ul class="list gridLayout">
      <li v-for="playlist in listForCurrentTag" :key="playlist.id" class="playlist">
        <el-card :body-style="{ padding: 0} " shadow="hover">
          <div class="imgContainer">
            <img :src="playlist.coverImgUrl" class="image">
          </div>
          <div class="moreInfo">
            <p class="listName">{{ playlist.name }}</p>
            <p class="playCount">{{ playlist.playCount | Div1w(playlist.playCount) }}</p>
            <p class="allTag">{{ playlist.tag }}</p>
          </div>
        </el-card>
      </li>
    </ul>
    <button v-if="!loading&&!noMore" @click="load(currentTag,lastTime)">加载更多</button>
    <p v-if="loading">加载中...</p>
    <p v-if="noMore">没有更多了</p>
  </div>
</template>

<script>
export default {
  name: "cpBoutiquePlaylist",
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
      this.$axios.get('/top/playlist/highquality', {
        params: {
          cat, limit: 12, before
        }
      }).then(res => {
        this.listForCurrentTag.push(...res.data.playlists)
        this.lastTime = res.data.lasttime
        this.loading = false
      })
    },
    //获取当前标签的歌单
    getListForCurrentTag(cat) {
      this.$axios.get('/top/playlist/highquality', {
        params: {cat, limit: 12}
      }).then(res => {
        this.currentTag = cat
        this.listForCurrentTag = res.data.playlists
        this.lastTime = res.data.lasttime
      })
    },
  },
  beforeMount() {
    //获取精品歌单tags
    this.$axios.get(`/playlist/highquality/tags`).then(res => {
      this.BoutiquePlaylistTags = res.data.tags
      //默认加载一些歌单（无tag参数）
      this.load()
    })

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