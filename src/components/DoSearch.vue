<template>
  <div class="search">
    <div class="search-wrapper">
      <el-container class="search-container">
        <el-header class="title"><h2>搜 索</h2></el-header>
        <el-main class="main">
          <el-row></el-row>
          <el-row class="search-input">
            <el-row class="input-container">
              <input ref="input" v-model="keyword" :placeholder="placeholder" class="search-box" type="text"
                     @blur="toggleSearch(false)"
                     @focus="toggleSearch(true)"
                     @keypress.enter="search(keyword)"
              >
              <i class="ac-font ac-Search" @click="search(keyword)"></i>
            </el-row>
            <el-row v-show="keyword" class="search-suggest scrollbar-outer">
              <el-row v-if="suggest.songs.length" class="songs">
                <el-divider content-position="left">单曲</el-divider>
                <div class="suggest-container">
                  <el-row v-for="s in suggest.songs" :key="s.id" class="tracks">
                    <div class="wrapper" @click="songClk(s)">

                      <span class="name">{{ s.name }}</span>
                      -
                      <span v-for="ar in s.artists" :key="ar.id" class="ar">{{ ar.name }}</span>
                    </div>

                  </el-row>
                </div>

              </el-row>
              <el-row v-if="suggest.artists.length" class="artists">
                <el-divider content-position="left">歌手</el-divider>
                <div class="suggest-container">
                  <el-row v-for="ar in suggest.artists" :key="ar.id">
                    <div class="wrapper" @click="arClk(ar.id)">
                      <span>{{ ar.name }}</span>
                    </div>
                  </el-row>
                </div>
              </el-row>
              <el-row v-if="suggest.albums.length" class="albums">
                <el-divider content-position="left">专辑</el-divider>
                <div class="suggest-container">
                  <el-row v-for="al in suggest.albums" :key="al.id">
                    <div class="wrapper" @click="alClk(al.id)">
                      <span>{{ al.name }}</span>
                      -
                      <span v-if="al.artist">{{ al.artist.name }}</span>
                    </div>
                  </el-row>
                </div>
              </el-row>
              <el-row v-if="suggest.playlists.length" class="playlists">
                <el-divider content-position="left">歌单</el-divider>
                <div class="suggest-container">
                  <el-row v-for="pl in suggest.playlists" :key="pl.id">
                    <div class="wrapper" @click="plClk(pl.id)">
                      <span>{{ pl.name }}</span>
                    </div>
                  </el-row>
                </div>
              </el-row>
            </el-row>
          </el-row>
          <el-row class="hot-search-list">
            <el-row class="title"><h2>热搜榜</h2></el-row>
            <el-row class="hot-list">
              <el-row v-for="(item,ind) in hotSearch" :key="ind" class="hot-item row-col-center">
                <div class="wrapper" @click="itemClick(item.searchWord)">
                  <el-col :order="ind + 1" :span="2" class="serial-number">{{ ind + 1 }}</el-col>
                  <el-col :span="18" class="info">
                    <scoText class="name-score-icon">
                      <el-col :span="24" class="name">
                        <span class="name">{{ item.searchWord }}</span>
                        <span v-if="item.iconUrl" class="icon"> <img :src="item.iconUrl" alt=""
                                                                     style="width: auto;height: 1rem"></span>
                        <span class="score">{{ item.score }}</span>
                      </el-col>
                    </scoText>
                    <scoText v-if="item.content" class="content"> {{ item.content }}</scoText>
                  </el-col>
                </div>
              </el-row>
            </el-row>
          </el-row>
        </el-main>
      </el-container>
    </div>
  </div>
</template>

<script>
import {toggleScrollY} from "@/utils/tools";
import scoText from "@/components/scoText";

export default {
  name: "DoSearch",
  components: {scoText},
  data() {
    return {
      keyword: "",
      placeholder: "",
      suggest: {
        songs: [],
        artists: [],
        albums: [],
        playlists: []
      },
      hotSearch: [],
    }
  },
  watch: {
    keyword(n) {
      this.getSearchSuggest(n).then(res => {
        this.suggest = {...this.suggest, ...res.data.result}
      })
    }
  },
  methods: {
    toggleSearch(key) {
      setTimeout(() => {
        this.$emit('toggleSearch', key)
      }, 800)
    },
    search(keyword) {
      this.toggleSearch(false)
      this.$router.push({
        //默认激活歌曲搜索
        name: "trackList",
        query: {keyword: keyword || this.placeholder}
      })
      this.keyword = ""
    },
    getDefaultKeyword() {
      return this.$axios('/search/default')
    },
    getHotSearch() {
      return this.$axios('/search/hot/detail')
    },
    getSearchSuggest(keywords) {
      return this.$axios('/search/suggest', {params: {keywords}})
    },
    concurrentRequests() {
      this.$axios.all([this.getDefaultKeyword(), this.getHotSearch()])
          .then(this.$axios.spread((defaultKeyword, hotSearch) => {
            //默认搜索关键词
            this.placeholder = defaultKeyword.data.data.showKeyword
            //热搜榜（详细）
            this.hotSearch = hotSearch.data.data
          }))
    },
    getCoverUrl(ids) {
      return this.$axios('/song/detail', {params: {ids}})
    },
    songClk(song) {
      this.getCoverUrl(song.id).then(res => {
        this.$bus.$emit('songClk', res.data.songs[0])
      })
    },
    arClk(id) {
      this.$bus.$emit('arClk', id)
    },
    alClk(id) {
      this.$bus.$emit('alClk', id)
    },
    plClk(id) {
      this.$bus.$emit('plClk', id)
    },
    itemClick(keyword) {
      this.search(keyword)
    }
  },
  mounted() {
    this.concurrentRequests()
    this.$refs.input.focus()
    toggleScrollY(false)
  },
  beforeDestroy() {
    toggleScrollY(true)
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/searchpage";
</style>