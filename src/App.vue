<template>
  <div id="app">
    <PageBack />
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
                <router-link to="/"><BaseIcon name="home"/>首 页</router-link>
              </el-col>
              <el-col :span="8">
                <router-link to="/explore/playlist/all"><BaseIcon name="explore"/>发 现</router-link>
              </el-col>
              <el-col :span="8">
                <router-link to="/user"><BaseIcon name="user"/>我 的</router-link>
              </el-col>
            </el-row>
          </el-col>
          <!--右侧-->
          <el-col :span="8" class="right">
            <div class="right-inner">
              <div class="search">
                <div class="input-container">
                  <input placeholder="搜索单曲、歌手、专辑、MV等" type="text"
                         @focus="showSearch=true">
                  <BaseIcon name="search"/>
                </div>
              </div>
              <div v-if="isLogin" class="avatar row-col-center">
                <el-dropdown class="row-col-center" size="small" trigger="click"
                             @command="handleCommand">
                  <img v-if="profile.avatarUrl" :src="profile.avatarUrl | https" alt="" class="el-dropdown-link">
                  <el-dropdown-menu slot="dropdown" class="user-dropdown">
                    <el-dropdown-item class="user-header" disabled>
                      <div class="user-header-inner">
                        <img v-if="profile.avatarUrl" :src="profile.avatarUrl | https" alt="" class="user-header-avatar">
                        <span class="user-header-name">{{ profile.nickname }}</span>
                      </div>
                    </el-dropdown-item>
                    <el-dropdown-item :command="goUserPage" class="menu-item">
                      <BaseIcon name="user"/>个人主页
                    </el-dropdown-item>
                    <el-dropdown-item :command="logout" class="menu-item logout-item">
                      <BaseIcon name="logout"/>退出登录
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </el-dropdown>
              </div>
            </div>
          </el-col>
        </el-row>
      </el-header>
      <el-main>
        <transition name="page-fade">
          <!-- :key="$route.fullPath" 必须保留：详情页与 9 个搜索子视图只在 activated() 里取数
               （见 docs/ARCHITECTURE_DECISIONS.md 决策 4：query → props），靠 URL 变化重建实例来刷新。
               :max 限制缓存条目数，被驱逐实例的销毁由 reapEvictedPages() 兜底（Vue 2 的 pruneCacheEntry
               在同名组件下不会调用 $destroy）。 -->
          <keep-alive ref="pageCache" :max="pageCacheMax">
            <router-view :key="$route.fullPath"/>
          </keep-alive>
        </transition>
      </el-main>
    </el-container>
    <!--播放器组件 -->
    <div v-show="showPlayer" class="player">
      <MusicPlayer :song="song"/>
    </div>
    <transition name="search">
      <DoSearch v-if="showSearch" @toggleSearch="toggleSearch"/>
    </transition>
  </div>
</template>

<script>
import MusicPlayer from "@/components/musicPlayer/MusicPlayer";
import DoSearch from "@/components/DoSearch";
import PageBack from "@/components/common/PageBack";
import {doLogout} from "@/utils/auth";
import config from "./config"

export default {
  name: 'App',
  components: {MusicPlayer, DoSearch, PageBack},
  data() {
    return {
      song: {},
      showSearch: false,
      //keep-alive 缓存页面实例上限（模板中 :max 绑定）
      pageCacheMax: 10,
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
  watch: {
    //路由变化（含 query 变化）后清理 keep-alive 漏掉的实例，见 reapEvictedPages
    '$route.fullPath'() {
      this.$nextTick(() => this.reapEvictedPages())
    }
  },
  methods: {
    //兜底释放 keep-alive 未能销毁的页面实例
    //背景：Vue 2 的 keep-alive 在 max 溢出时调用 pruneCacheEntry，其中
    //`entry.tag !== current.tag` 判断会让「同一组件、不同 key」（如 /listDetail?id=A → B）
    //的被驱逐实例跳过 $destroy()，实例连同 DOM 仍挂在 App.$children 上 → 内存只增不减。
    //（见 node_modules/vue/dist/vue.runtime.esm.js pruneCacheEntry）
    //这里在每次路由变化后，销毁「已不在 keep-alive 缓存里、且不在前台显示」的页面实例。
    reapEvictedPages() {
      const keepAlive = this.$refs.pageCache
      if (!keepAlive || !keepAlive.keys) return
      const cachedKeys = new Set(keepAlive.keys)
      this.$children.forEach(page => {
        const vnode = page.$vnode
        //只处理被 keep-alive 缓存过的页面组件（页面是 App 的直接子实例）
        if (!vnode || !vnode.data || !vnode.data.keepAlive) return
        //仍在缓存里的、以及当前正在显示的实例不能销毁
        if (cachedKeys.has(vnode.key) || page._inactive === false) return
        if (!page._isDestroyed) page.$destroy()
      })
    },
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
      //退出 FM 模式（isPersonalFM 已下沉到 PlayerCore，通过 $bus 通知）
      //原实现写的是 this.$store.state.isPersonalFM = false（缺模块前缀，实际没生效）
      this.$bus.$emit('fm-mode', false)
      this.song = { ...song }
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
        doLogout();
      }
    },
    handleCommand(command) {
      command();
    },
    clearAll() {
      // 走 Vuex mutation，不直接修改 state（避免 strict mode 警告 + 触发响应式）
      this.$store.commit('TracksAbout/REPLACE_PLAYLIST', [])
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

/* 搜索面板过渡（分层：遮罩淡入淡出 + 内容淡入上移） */
.search-enter-active,
.search-leave-active {
  transition: opacity .28s ease;
}
.search-enter-active .search-wrapper,
.search-leave-active .search-wrapper {
  transition: transform .28s ease;
}
.search-enter,
.search-leave-to {
  opacity: 0;
}
.search-enter .search-wrapper,
.search-leave-to .search-wrapper {
  transform: translateY(16px);
}
</style>
