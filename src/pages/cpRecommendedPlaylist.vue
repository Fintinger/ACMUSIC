<template>
  <div class="recommendPlaylist">
    <ul class="list gridLayout">
      <li v-for="playlist in renderedList" :key="playlist.id" class="list-item playlist">
        <el-card :body-style="{ padding: 0} " shadow="hover">
          <div class="imgContainer">
            <img :src="playlist.picUrl" class="image">
          </div>
          <div class="moreInfo">
            <p class="listName">{{ playlist.name }}</p>
            <p class="playCount">{{ playlist.playCount | Div1w(playlist.playCount) }}</p>
          </div>
        </el-card>
      </li>
    </ul>
    <button v-if="!loading&&!noMore" @click="load">加载更多</button>
    <p v-if="loading">加载中...</p>
    <p v-if="noMore">没有更多了</p>
  </div>
</template>

<script>
export default {
  name: "cpRecommendedPlaylist",
  data() {
    return {
      recommendedPlaylistAll: [],
      renderedList: [],
      loading: false
    }
  },
  computed: {
    noMore() {
      return this.renderedList.length === 0 ? false : this.renderedList.length >= this.recommendedPlaylistAll.length
    },
    count() {
      return this.renderedList.length
    }
  },
  methods: {
    load() {
      this.loading = true
      setTimeout(() => {
        this.renderedList.push(...this.recommendedPlaylistAll.slice(this.count, this.count + 12))
        this.loading = false
      }, 500)
    },
  },
  beforeMount() {
    this.$axios.get(`/personalized?limit=500`).then(res => {
      this.recommendedPlaylistAll = res.data.result
      this.load();
    })
  },
}
</script>

<style lang="scss">
.recommendPlaylist {
  padding: 0 30px;
}
</style>