<template>
  <div class="categoryPage">
    <div class="explore-hero">
      <h1 class="explore-title">发现音乐</h1>
      <p class="explore-subtitle">探索音乐、发现热门歌单、MV 和排行榜</p>
    </div>
    <div class="explore-content">
      <div class="explore-tabs">
        <button
          v-for="(c, index) in sort"
          :key="index"
          :class="{ active: $route.name === c.linkName }"
          @click="handleClick(c.linkName)"
        >{{ c.title }}</button>
      </div>
      <transition name="fade-up" mode="out-in">
        <keep-alive>
          <router-view/>
        </keep-alive>
      </transition>
    </div>
  </div>
</template>

<script>
export default {
  name: "CategoryPage",
  methods: {
    handleClick(name) { this.$router.push({name}) },
    showArtistList() { this.$router.push({name: "artistList"}) }
  },
  data() {
    return {
      sort: [
        {title: "全部歌单", linkName: 'allList'},
        {title: "精品歌单", linkName: 'boutique'},
        {title: "MV", linkName: 'mvList'},
        {title: "视频", linkName: 'videoList'},
        {title: "榜单", linkName: 'leaderBoard'},
      ]
    }
  },
  mounted() {
    this.$bus.$on('showArtistList', this.showArtistList)
  }
}
</script>

<style lang="scss">
@import "src/assets/scss/explorepage";
</style>
