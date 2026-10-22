<template>
  <div class="search" @click.self="toggleSearch(false)">
    <div class="search-wrapper">
      <el-container class="search-container">
        <el-header class="title"><h2>搜 索</h2></el-header>
        <el-main class="main">
          <el-row></el-row>
          <el-row class="search-input">
            <el-row class="input-container">
              <input ref="input" v-model="keyword" :placeholder="placeholder" class="search-box" type="text"
                     @blur="onBlur"
                     @focus="toggleSearch(true)"
                     @keypress.enter="search(keyword)"
              >
              <BaseIcon name="search" @click="search(keyword)"/>
            </el-row>
            <el-row v-show="keyword" class="search-suggest scrollbar-outer">
              <el-row v-if="suggest.songs.length" class="songs">
                <el-divider content-position="left">单曲</el-divider>
                <div class="suggest-container">
                  <el-row v-for="s in suggest.songs" :key="s.id" class="tracks" @click.native="songClk(s)">
                    <div class="wrapper">
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
                  <el-row v-for="ar in suggest.artists" :key="ar.id" @click.native="arClk(ar.id)">
                    <div class="wrapper">
                      <span>{{ ar.name }}</span>
                    </div>
                  </el-row>
                </div>
              </el-row>
              <el-row v-if="suggest.albums.length" class="albums">
                <el-divider content-position="left">专辑</el-divider>
                <div class="suggest-container">
                  <el-row v-for="al in suggest.albums" :key="al.id" @click.native="alClk(al.id)">
                    <div class="wrapper">
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
                  <el-row v-for="pl in suggest.playlists" :key="pl.id" @click.native="plClk(pl.id)">
                    <div class="wrapper">
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
              <el-row v-for="(item,ind) in hotSearch" :key="ind" class="hot-item row-col-center"
                      @click.native="itemClick(item.searchWord)">
                <div class="wrapper">
                  <el-col :order="ind + 1" :span="2" class="serial-number">{{ ind + 1 }}</el-col>
                  <el-col :span="18" class="info">
                    <scoText class="name-score-icon">
                      <el-col :span="24" class="name">
                        <span class="name">{{ item.searchWord }}</span>
                        <span v-if="item.iconUrl" class="icon"> <img :src="item.iconUrl | https" alt=""
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
import * as searchApi from "@/api/Search";
import * as tracksApi from "@/api/Tracks";

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
      suggestTimer: null,
      suggestSeq: 0,
      blurTimer: null,
    }
  },
  watch: {
    keyword(n) {
      // 防抖 300ms: 避免每个按键都打一次 /search/suggest
      clearTimeout(this.suggestTimer)
      // 请求序号: 丢弃过期响应, 防止慢的旧请求覆盖新结果
      const seq = ++this.suggestSeq
      if (!n) {
        this.suggest = {songs: [], artists: [], albums: [], playlists: []}
        return
      }
      this.suggestTimer = setTimeout(() => {
        this.getSearchSuggest(n)
            .then(res => {
              if (seq !== this.suggestSeq) return
              this.suggest = {...this.suggest, ...((res.data && res.data.result) || {})}
            })
            .catch(() => {
              // 建议接口失败不应影响搜索框输入, 静默处理
            })
      }, 300)
    }
  },
  methods: {
    toggleSearch(key) {
      this.$emit('toggleSearch', key)
    },
    /**
     * input 失焦不再立刻关窗。
     * 搜索窗在 App.vue 是 v-if，点击建议项时 mousedown 先触发 blur → 组件被卸载，
     * 后面的 mouseup/click 就落空了（表现为「只有精确点中文字才生效」）。
     * 这里延后 120ms 再关，给 click 留出执行窗口；真正关窗时 beforeDestroy 会清掉这个定时器。
     */
    onBlur() {
      clearTimeout(this.blurTimer)
      this.blurTimer = setTimeout(() => this.toggleSearch(false), 120)
    },
    onKeydown(e) {
      if (e.key === 'Escape') {
        this.toggleSearch(false)
      }
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
      return searchApi.defaultKeyword()
    },
    getHotSearch() {
      return searchApi.hotDetail()
    },
    getSearchSuggest(keywords) {
      return searchApi.suggest(keywords)
    },
    concurrentRequests() {
      this.$axios.all([this.getDefaultKeyword(), this.getHotSearch()])
          .then(this.$axios.spread((defaultKeyword, hotSearch) => {
            //默认搜索关键词
            this.placeholder = (defaultKeyword.data && defaultKeyword.data.data && defaultKeyword.data.data.showKeyword) || ''
            //热搜榜（详细）
            this.hotSearch = (hotSearch.data && hotSearch.data.data) || []
          }))
          .catch(() => {
            // 默认词/热搜失败不阻塞搜索输入, 保持静默
          })
    },
    getCoverUrl(ids) {
      return tracksApi.detail(ids)
    },
    songClk(song) {
      // 先取 bus 引用：关窗会让本组件卸载，回调里 this 不再可靠
      const bus = this.$bus
      this.close()
      this.getCoverUrl(song.id).then(res => {
        const first = res.data && res.data.songs && res.data.songs[0]
        if (first) bus.$emit('songClk', first)
      })
    },
    arClk(id) {
      this.$bus.$emit('arClk', id)
      this.close()
    },
    alClk(id) {
      this.$bus.$emit('alClk', id)
      this.close()
    },
    plClk(id) {
      this.$bus.$emit('plClk', id)
      this.close()
    },
    itemClick(keyword) {
      this.search(keyword)
    },
    /** 主动关窗（点了建议项/热搜项之后），清掉挂起的 blur 定时器 */
    close() {
      clearTimeout(this.blurTimer)
      this.toggleSearch(false)
    }
  },
  mounted() {
    this.concurrentRequests()
    this.$refs.input.focus()
    toggleScrollY(false)
    window.addEventListener('keydown', this.onKeydown)
  },
  beforeDestroy() {
    clearTimeout(this.suggestTimer)
    clearTimeout(this.blurTimer)
    toggleScrollY(true)
    window.removeEventListener('keydown', this.onKeydown)
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/searchpage";
</style>