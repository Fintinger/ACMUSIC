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
                <router-link to="/explore/playlists/all"><BaseIcon name="explore"/>发 现</router-link>
              </el-col>
              <el-col :span="8">
                <router-link to="/me"><BaseIcon name="user"/>我 的</router-link>
              </el-col>
            </el-row>
          </el-col>
          <!--右侧-->
          <el-col :span="8" class="right">
            <div class="right-inner">
              <button type="button" class="theme-switch" role="switch" :aria-checked="themeDark"
                :aria-label="themeDark ? '深色模式，切换为浅色' : '浅色模式，切换为深色'" :class="{ 'is-dark': themeDark }" @click="toggleTheme">
                <BaseIcon name="sun" :size="16"/><BaseIcon name="moon" :size="16"/><span class="theme-switch-thumb"></span>
              </button>
              <div class="search">
                <div class="input-container">
                  <input placeholder="搜索单曲、歌手、专辑、MV等" type="text"
                         @focus="showSearch=true">
                  <!-- AI 点歌做进搜索框：它本质就是"不用想关键词的搜索"，
                       放在这里视觉重量为零，语义也对得上 -->
                  <button
                      type="button"
                      class="ai-search-btn"
                      :class="{ 'is-open': aiOpen }"
                      title="AI 点歌：说一句想听什么"
                      aria-label="AI 点歌"
                      @click.stop="openAi"
                  >
                    <BaseIcon name="sparkles" :size="15"/>
                  </button>
                  <BaseIcon name="search"/>
                </div>
              </div>
              <div v-if="isLogin" class="avatar row-col-center">
                <el-dropdown class="row-col-center" size="small" trigger="click"
                             @command="handleCommand">
                  <!-- 默认插槽必须始终有内容：ElDropdown 的 render 直接取 $slots.default[0]，
                       头像为空（头像未加载完 / 用户没设头像）时会抛
                       "Cannot read properties of undefined (reading '0')" 导致整个导航区变白。 -->
                  <span class="avatar-trigger">
                    <img v-if="profile.avatarUrl" :src="profile.avatarUrl | https" alt="" class="el-dropdown-link">
                    <i v-else class="avatar-fallback"><BaseIcon name="user" :size="26"/></i>
                    <i v-if="changelogUnread" class="avatar-dot" aria-label="有新版本的更新日志"></i>
                  </span>
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
                    <el-dropdown-item :command="openAccentPicker" class="menu-item"><BaseIcon name="palette"/>主题颜色</el-dropdown-item>
                    <el-dropdown-item :command="goBlacklist" class="menu-item"><BaseIcon name="block"/>音乐黑名单</el-dropdown-item>
                    <el-dropdown-item :command="openChangelog" class="menu-item">
                      <BaseIcon name="calendar"/>更新日志<i v-if="changelogUnread" class="menu-dot"></i>
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
          <!-- 详情页按 fullPath 缓存；搜索外壳按关键词复用，分类取数由内部结果视图负责。
               :max 限制缓存条目数，被驱逐实例的销毁由 reapEvictedPages() 兜底（Vue 2 的 pruneCacheEntry
               在同名组件下不会调用 $destroy）。 -->
          <keep-alive ref="pageCache" :max="pageCacheMax">
            <router-view :key="pageCacheKey"/>
          </keep-alive>
        </transition>
        <!-- 全站页脚：放在 keep-alive 之外，避免随页面缓存重复挂载 -->
        <AppFooter @open-changelog="openChangelog"/>
      </el-main>
    </el-container>
    <!--播放器组件 -->
    <el-dialog title="主题颜色" :visible.sync="showAccentPicker" width="340px" append-to-body>
      <AccentPicker v-if="showAccentPicker"/>
    </el-dialog>
    <ChangelogDialog :visible.sync="showChangelog"/>
    <!-- 「添加到歌单」全局弹窗：歌曲行 / 播放列表 / 大播放器都通过 $bus 唤起，只此一份 -->
    <AddToPlaylistDialog/>
    <div v-show="showPlayer" class="player">
      <MusicPlayer :song="song"/>
    </div>
    <transition name="search">
      <DoSearch v-if="showSearch" @toggleSearch="toggleSearch"/>
    </transition>
    <!-- AI 点歌浮窗：挂在 App 根部，全站可用，不随路由切换销毁 -->
    <AiAssistant/>
    <!-- 移动端未适配提示（固定全屏浮层，不影响桌面端） -->
    <MobileNotice/>
  </div>
</template>

<script>
import MusicPlayer from "@/components/musicPlayer/MusicPlayer";
import DoSearch from "@/components/DoSearch";
import PageBack from "@/components/common/PageBack";
import AppFooter from "@/components/common/AppFooter";
import MobileNotice from "@/components/common/MobileNotice";
import AiAssistant from "@/components/AiAssistant";
import AccentPicker from '@/components/common/AccentPicker';
import ChangelogDialog from '@/components/common/ChangelogDialog';
import AddToPlaylistDialog from '@/components/common/AddToPlaylistDialog';
import { isChangelogUnread, markChangelogSeen } from '@/utils/changelog';
import {watchAccent} from '@/utils/accent';
import {doLogout} from "@/utils/auth";
import { saveScroll, restoreScroll } from "@/utils/scrollMemory";
import { resolveArtistId, isValidId } from '@/utils/artistLink'
import config from "./config"
import {getStoredTheme, setTheme, watchTheme} from '@/utils/theme'

export default {
  name: 'App',
  components: {MusicPlayer, DoSearch, PageBack, AppFooter, MobileNotice, AccentPicker, ChangelogDialog, AddToPlaylistDialog, AiAssistant},
  data() {
    return {
      song: {},
      themePreference: getStoredTheme(),
      themeDark: document.documentElement.dataset.theme === 'dark',
      showSearch: false,
      showAccentPicker: false,
      showChangelog: false,
      // AI 面板是否打开：只用来点亮搜索框里那个 ✦
      aiOpen: false,
      // 有新版本的更新日志未读时，头像与菜单项上点一个小红点
      changelogUnread: false,
      //keep-alive 缓存页面实例上限（模板中 :max 绑定）
      pageCacheMax: 10,
    }
  },
  computed: {
    pageCacheKey() {
      const isSearch = this.$route.matched.some(record => record.name === 'search')
      return isSearch ? 'search:' + JSON.stringify(this.$route.query.keyword || '') : this.$route.fullPath
    },
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
      // 登录成功后一般都会跳转，借这次导航补拉屏蔽名单（登录态 getter 不是响应式的，watch 未必触发）
      this.syncBlocklist()
    },
    /**
     * 登录态变化：登录后拉一次屏蔽名单，登出清空。
     * 名单是账号级的，换账号必须重新拉，否则会把上一份带过去。
     */
    isLogin(val) {
      if (val) this.$store.dispatch('BlockAbout/init')
      else this.$store.dispatch('BlockAbout/reset')
    }
  },
  methods: {
    /**
     * 打开 AI 点歌面板。
     * 把搜索框的矩形一并传过去 —— 面板要锚在它下方。
     * 让 AiAssistant 自己去 querySelector 也能做，但那样就把组件耦合到导航栏的 DOM 结构上了
     */
    openAi(e) {
      const el = e && e.currentTarget
      const rect = el && el.getBoundingClientRect ? el.getBoundingClientRect() : null
      this.$bus.$emit('ai-open', rect)
    },
    onAiPanelState(open) {
      this.aiOpen = !!open
    },
    /** 已登录且还没同步过时拉一次名单；未登录不发请求，避免 301 噪音 */
    syncBlocklist() {
      const st = this.$store.state.BlockAbout
      if (!st || st.loaded || st.loading) return
      if (this.isLogin) this.$store.dispatch('BlockAbout/init')
    },
    openAccentPicker() { this.showAccentPicker = true },
    openChangelog() {
      this.showChangelog = true
      // 打开即视为已读：小红点只在"还没看过这一版"时出现
      markChangelogSeen()
      this.changelogUnread = false
    },
    toggleTheme(e) {
      this.themeDark = !this.themeDark
      this.themePreference = this.themeDark ? 'dark' : 'light'
      // 把点击位置传给主题模块，作为圆形扩散动画的圆心（键盘触发时没有坐标，静默切换）
      const origin = e && typeof e.clientX === 'number' ? { x: e.clientX, y: e.clientY } : null
      setTheme(this.themePreference, origin)
    },
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
      // 没有 id 就别跳 —— 以前会把 undefined 拼成 `/albumDetail`，落到「加载失败」页
      if (!isValidId(id)) return
      this.$router.push({
        name: "albumDetail",
        query: {id}
      })
    },
    /**
     * 歌手名点击：优先用现成的 id；只有在拿不到 id 时才按名字反查
     * （刷新后恢复的播放器队列、云盘上传曲目都属于这一类，见 utils/artistLink.js）。
     */
    artistClick(id, name) {
      if (isValidId(id)) {
        this.$router.push({
          name: "artistDetail",
          query: {id},
        })
        return
      }
      if (!name) return
      resolveArtistId(0, name).then(artistId => {
        if (!artistId) {
          this.$toast.warning(`没找到歌手「${name}」`)
          return
        }
        this.$router.push({
          name: "artistDetail",
          query: {id: artistId},
        })
      })
    },
    artistAllSongsClick(id) {
      this.$router.push({
        name: "artistAllSongs",
        query: {id}
      })
    },
    artistAllAlbumsClick(id) {
      this.$router.push({
        name: "artistAllAlbums",
        query: {id}
      })
    },
    artistAllMvsClick(id) {
      this.$router.push({
        name: "artistAllMvs",
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
      this.$router.push('/me')
    },
    goBlacklist() {
      this.$router.push('/blacklist')
    },
    logout() {
      // 原实现用的是浏览器原生 confirm，与项目视觉完全脱节
      this.$confirmBox({
        title: '退出登录',
        message: '退出后需要重新扫码或短信登录，本地播放列表不受影响。',
        confirmText: '退出登录',
        cancelText: '再想想'
      }).then(() => {
        doLogout();
      }).catch(() => { /* 用户取消 */ });
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
    this._stopAccentWatch = watchAccent(() => {})
    // 首屏就同步一次屏蔽名单：有 localStorage 缓存的立刻生效，接口只做校正
    this.syncBlocklist()
    // 有未读的更新日志时，头像上点一个小红点（版本号来自 package.json）
    this.changelogUnread = isChangelogUnread()
    this._stopThemeWatch = watchTheme(mode => { this.themePreference = mode; this.themeDark = document.documentElement.dataset.theme === 'dark' })
    // 面板自己会在开关时广播状态，这里只负责点亮/熄灭入口图标
    this.$bus.$on('ai-panel-state', this.onAiPanelState)
    this.$bus.$on('plClk', this.playlistClick)
    this.$bus.$on('alClk', this.albumClick)
    this.$bus.$on('arClk', this.artistClick)
    this.$bus.$on('arAsClk', this.artistAllSongsClick)
    this.$bus.$on('arAlClk', this.artistAllAlbumsClick)
    this.$bus.$on('arAmClk', this.artistAllMvsClick)
    this.$bus.$on('songClk', this.songClick)
    this.$bus.$on('mvClk', this.mvClick)
    this.$bus.$on('vClk', this.videoClick)
    this.$bus.$on('uClk', this.userClick)

    //清空播放列表
    //emit in PlayerCore.vue
    this.$bus.$on("clearPlaylist", this.clearAll)

    /**
     * 滚动位置记忆：只在"刷新/重新打开"这条路径上补 —— SPA 内部导航由
     * router.scrollBehavior 处理（新页面回顶部、前进后退回原位），两者不重叠。
     * 300ms 节流是为了不在滚动时写爆 sessionStorage。
     */
    this._scrollTimer = null
    this._onScroll = () => {
      if (this._scrollTimer) return
      this._scrollTimer = setTimeout(() => {
        this._scrollTimer = null
        saveScroll(this.$route.fullPath)
      }, 300)
    }
    this._onPageHide = () => saveScroll(this.$route.fullPath)
    window.addEventListener('scroll', this._onScroll, { passive: true })
    window.addEventListener('pagehide', this._onPageHide)
    // 等首屏渲染完再开始找位置；内容异步到达由 restoreScroll 内部重试兜住
    const initialPath = this.$route.fullPath
    this.$nextTick(() => {
      restoreScroll(initialPath, { stopIf: () => this.$route.fullPath !== initialPath })
    })
  },
  beforeDestroy() {
    if (this._stopAccentWatch) this._stopAccentWatch()
    if (this._stopThemeWatch) this._stopThemeWatch()
    this.$bus.$off('ai-panel-state', this.onAiPanelState)
    window.removeEventListener('scroll', this._onScroll)
    window.removeEventListener('pagehide', this._onPageHide)
    if (this._scrollTimer) { clearTimeout(this._scrollTimer); this._scrollTimer = null }
  }
}
</script>

<style lang="scss">
// 图标：只剩内联 SVG 一套（src/config/icon.js + BaseIcon），字体图标已清掉
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
