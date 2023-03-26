<template>
  <div id="app">
    <el-container>
      <el-header class="nav-bar" height="80px">
        <el-row>
          <!--左侧-->
          <el-col :span="8" class="logo">
            <img :src="logoUrl" alt="">
          </el-col>
          <!--中间-->
          <el-col :span="8" class="nav-link">
            <el-row>
              <el-col :span="8">
                <router-link to="/">首 页</router-link>
              </el-col>
              <el-col :span="8">
                <router-link to="/explore/playlist/all">发 现</router-link>
              </el-col>
              <el-col :span="8">
                <router-link to="/user">我 的</router-link>
              </el-col>
            </el-row>
          </el-col>
          <!--右侧-->
          <el-col :span="8" class="right">
            <el-row>
              <el-col :span="20" class="search">
                <div class="input-container">
                  <input placeholder="搜索单曲、歌手、专辑、MV等" type="text"
                         @focus="showSearch=true">
                  <i class="ac-font ac-Search"></i>
                </div>
              </el-col>
              <el-col :span="4" class="avatar row-col-center">
                <el-dropdown v-if="isLogin" class="row-col-center" size="small" trigger="click"
                             @command="handleCommand">
                  <img v-if="profile.avatarUrl" :src="profile.avatarUrl" alt="" class="el-dropdown-link">
                  <el-dropdown-menu>
                    <el-dropdown-item :command="goUserPage">{{ profile.nickname }}</el-dropdown-item>
                    <el-dropdown-item :command="logout" divided>logout</el-dropdown-item>
                  </el-dropdown-menu>
                </el-dropdown>
                <!--                用户头像-->
              </el-col>
            </el-row>
          </el-col>
        </el-row>
      </el-header>
      <el-main>
        <keep-alive>
          <router-view :key="$route.fullPath"/>
        </keep-alive>
      </el-main>
    </el-container>
    <!--播放器组件 -->
    <div v-show="showPlayer" class="player">
      <MusicPlayer :song="song"/>
    </div>
<!--    v-if="showSearch"-->
    <DoSearch v-if="showSearch"  @toggleSearch="toggleSearch"/>
  </div>
</template>

<script>
import MusicPlayer from "@/components/musicPlayer/MusicPlayer";
import DoSearch from "@/components/DoSearch";
import Cookies from 'js-cookie'
import {doLogout} from "@/utils/auth";
import config from "./config"

export default {
  name: 'App',
  components: {MusicPlayer, DoSearch},
  data() {
    return {
      song: {},
      showSearch: false,
    }
  },
  computed: {
    profile() {
      //获取保存的用户信息
      return this.$store.getters["UserAbout/userProfile"]
    },
    isLogin() {
      return this.$store.getters["UserAbout/isLogin"];
    },
    showPlayer() {
      return JSON.stringify(this.song) !== '{}' || this.$store.state.TracksAbout.currentPlaylist.length
    },
    logoUrl() {
      return config.imgUrl.logo
    }
  },
  methods: {
    playlistClick(id) {
      this.$router.push({
        name: "listDetail",
        query: {id}
      })
    },
    albumClick(id) {
      this.$router.push({
        name: "albumDetail",
        query: {id}
      })
    },
    artistClick(id) {
      this.$router.push({
        name: "artistDetail",
        query: {id},
      })
    },
    artistAllSongsClick(id) {
      this.$router.push({
        name: "artistAllSongs",
        query: {id}
      })
    },
    songClick(song) {
      //更新私人FM 标志
      this.$store.state.isPersonalFM = false
      this.song = song
    },
    mvClick(id) {
      this.$router.push({
        name: "mvPlay",
        query: {id}
      })
    },
    videoClick(id) {
      this.$router.push({
        name: "videoPlay",
        query: {id}
      })
    },
    userClick(uid) {
      this.$router.push({
        name: "userDetail",
        query: {uid}
      })
    },
    goUserPage() {
      this.$router.push('/user')
    },
    logout() {
      if (confirm('是否退出登录')) {
        console.log("清除所有数据");
        doLogout();
      } else {
        console.log(Cookies.get())
        console.log("取消退出");
      }
    },
    handleCommand(command) {
      command();
    },
    clearAll() {
      this.$store.state.TracksAbout.currentPlaylist = []
      this.song = {}
    },
    toggleSearch(key) {
      this.showSearch = key
    }
  },
  mounted() {
    this.$bus.$on('plClk', this.playlistClick)
    this.$bus.$on('alClk', this.albumClick)
    this.$bus.$on('arClk', this.artistClick)
    this.$bus.$on('arAsClk', this.artistAllSongsClick)
    this.$bus.$on('songClk', this.songClick)
    this.$bus.$on('mvClk', this.mvClick)
    this.$bus.$on('vClk', this.videoClick)
    this.$bus.$on('uClk', this.userClick)

    //清空播放列表
    //emit in PlayerCore.vue
    this.$bus.$on("clearPlaylist", this.clearAll)
  }
}
</script>

<style lang="scss">
//引入字体图标
//@import url("//at.alicdn.com/t/font_3420115_om6dc2ht2eb.css");
@import "assets/ac-font/iconfont.css";
//基本样式
@import "assets/scss/base/reset";
//当前页面样式
@import "assets/scss/app";
</style>
