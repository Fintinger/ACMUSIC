<template>
  <div class="userDetail">
    <transition name="detail-fade">
      <div v-if="pageLoading" class="ud-full-skel" key="skel">
        <div class="skel-hero-row"><div class="skel-avatar"></div><div class="skel-lines"><div class="skel-line skel-line--lg"></div><div class="skel-line skel-line--md"></div></div></div>
        <div v-for="n in 3" :key="n" class="skel-section"><div class="skel-sec-title"></div><div class="skel-grid"><div v-for="m in 4" :key="m" class="skel-card"><div class="skel-card-img"></div><div class="skel-card-line"></div></div></div></div>
      </div>
      <div v-else key="content" class="ud-content">
        <div class="user-hero" v-if="profile" :class="{ 'dark-bg': profile.avatarUrl && !isLightCover(profile.avatarUrl) }">
          <div class="hero-blur-bg" v-if="profile.avatarUrl" :style="{ backgroundImage: 'url(' + profile.avatarUrl + ')' }"></div>
          <div class="hero-avatar"><cover-image :src="profile.avatarUrl" :alt="profile.nickname + '的头像'"/></div>
          <div class="hero-info">
            <h1 class="hero-name">{{ profile.nickname }}<i v-if="profile.gender===1" class="el-icon-male"></i><i v-if="profile.gender===2" class="el-icon-female"></i><VipBadge :uid="uid" :is-self="isSelf"/></h1>
            <p class="hero-sig" v-if="profile.signature" :title="profile.signature">{{ profile.signature }}</p>
            <p class="hero-meta">
              <span v-if="locationName" class="hero-chip">📍 {{ locationName }}</span>
              <span v-if="profile.follows != null" class="hero-chip hero-chip--link" title="查看关注列表" @click="jumpSocial('follows')">{{ profile.follows }} 关注</span>
              <span v-if="profile.followeds != null" class="hero-chip hero-chip--link" title="查看粉丝列表" @click="jumpSocial('followeds')">{{ profile.followeds }} 粉丝</span>
              <span v-if="isSelf && subcount.createdPlaylistCount != null" class="hero-chip">{{ subcount.createdPlaylistCount }} 创建歌单</span>
              <span v-if="isSelf && subcount.subPlaylistCount != null" class="hero-chip">{{ subcount.subPlaylistCount }} 收藏歌单</span>
            </p>
          </div>
          <!-- 右侧动作区：年度报告（本人）+ 关注按钮（他人）+ 上次登录（本人，最次要） -->
          <div class="hero-side" v-if="isSelf">
            <!-- 年度听歌报告入口：仅本人可见（接口只能取当前登录用户的数据） -->
            <router-link v-if="isSelf" to="/annual" class="hero-annual">
              年度听歌报告<span class="hero-annual-arrow">→</span>
            </router-link>
            <p class="hero-login" v-if="isSelf && lastLoginText">{{ lastLoginText }}</p>
          </div>
          <!-- 关注 / 已关注：仅登录且非本人时出现，初始状态取 /user/detail 的 profile.followed -->
          <div class="hero-side hero-side--action" v-if="canFollow">
            <button class="followBtn" :class="{ 'is-followed': followed, 'is-mutual': followState === 'mutual' }"
                    :disabled="followPending"
                    :title="followed ? '点击取消关注' : (followState === 'followBack' ? 'TA 也关注了你，点击回关' : '关注 TA')"
                    @click="toggleFollow">
              <i v-if="followPending" class="el-icon-loading"></i>
              <template v-else>{{ followBtnText }}</template>
            </button>
          </div>
        </div>
        <!-- 锚点条：页面有 4 个区块、滚动距离长，给一个随手可点的位置标 -->
        <nav class="ud-anchor">
          <button v-for="a in anchors" :key="a.key" class="anchorBtn" @click="scrollTo(a.key)">{{ a.label }}</button>
        </nav>
        <!-- 两个都是「矮列表」，并排省掉一整屏：排行占 2 份宽，云盘 1 份 -->
        <div class="ud-duo" :class="{ 'is-solo': !isSelf }">
          <section ref="secRank" class="ud-section ud-card ud-sec">
            <h2>听歌排行</h2>
            <el-tabs v-if="weekTracksData.length||allTracksData.length" v-model="listenedAcName">
              <el-tab-pane label="最近一周" name="week">
                <RankList v-if="weekTracksData.length" :list="weekTracksData"/>
                <p v-else class="empty-text">最近一周还没有听歌记录（只有在本站播放超过 30 秒的歌才会被统计）</p>
              </el-tab-pane>
              <el-tab-pane label="所有时间" name="all">
                <RankList v-if="allTracksData.length" :list="allTracksData"/>
                <p v-else class="empty-text">还没有听歌记录</p>
              </el-tab-pane>
            </el-tabs>
            <p v-else-if="recordErr" class="empty-text">听歌排行获取失败，稍后再试</p>
            <p v-else class="empty-text">未公开</p>
          </section>
          <section v-if="isSelf" ref="secFavors" class="ud-section ud-card ud-sec">
            <h2>云盘与收藏</h2>
            <el-tabs v-model="favorsAcName">
              <el-tab-pane label="云盘" name="cloud">
                <p v-if="cloudTracks.length" class="cloudCount">共 {{ cloudTracks.length }} 个文件</p>
                <RankList v-if="cloudTracks.length" :list="cloudTracks" :show-rank="false" meta="size"/>
                <p v-else class="empty-text">云盘还是空的</p>
              </el-tab-pane>
              <!-- 专辑/歌手改成小图标行：卡片很窄，大封面网格放不下两张 -->
              <el-tab-pane label="专辑" name="album">
                <ul v-if="(favors.albums||[]).length" class="miniRows">
                  <li v-for="a in favors.albums" :key="a.id" class="miniRow" @click="openAlbum(a.id)">
                    <img class="miniCover" :src="albumCover(a) | imgParam('80y80')" :alt="a.name + '的封面'" loading="lazy">
                    <div class="miniMain">
                      <p class="miniName" :title="a.name">{{ a.name }}</p>
                      <p class="miniMeta">{{ albumArtist(a) }}</p>
                    </div>
                  </li>
                </ul>
                <p v-else class="empty-text">还没有收藏专辑</p>
              </el-tab-pane>
              <el-tab-pane label="歌手" name="artists">
                <ul v-if="(favors.artists||[]).length" class="miniRows">
                  <li v-for="ar in favors.artists" :key="ar.id" class="miniRow" @click="openArtist(ar.id)">
                    <img class="miniCover miniCover--round" :src="artistAvatar(ar) | imgParam('80y80')"
                         :alt="ar.name + '的头像'" loading="lazy">
                    <div class="miniMain">
                      <p class="miniName" :title="ar.name">{{ ar.name }}</p>
                      <p class="miniMeta">专辑 {{ ar.albumSize || 0 }} · MV {{ ar.mvSize || 0 }}</p>
                    </div>
                  </li>
                </ul>
                <p v-else class="empty-text">还没有关注歌手</p>
              </el-tab-pane>
              <el-tab-pane label="视频" name="videos"><VideoLayout :list="favors.vids"/></el-tab-pane>
            </el-tabs>
          </section>
        </div>
        <section ref="secPlaylist" class="ud-section ud-card ud-sec">
          <h2>
            歌单
            <!-- 导入外部歌单（仅本人）：只有登录态才有写入权限，入口也只在自己主页出现 -->
            <el-button v-if="isSelf" class="import-btn" size="mini" round @click="importVisible = true">
              导入外部歌单
            </el-button>
          </h2>
          <!-- 分类标签：合并成一张列表后用它切回「喜欢 / 创建 / 收藏」，
               比三个 h3 分组轻，又不占版面 -->
          <div v-if="allPlaylists.length" class="plTags">
            <button v-for="t in playlistTabs" :key="t.key" class="plTag"
                    :class="{ 'is-active': plFilter === t.key }" @click="plFilter = t.key">
              {{ t.label }}<span class="plTagNum">{{ t.count }}</span>
            </button>
          </div>
          <!-- 喜欢 / 创建 / 收藏合成一张网格：原来分组渲染时，只有一个"喜欢"的歌单会独占一整行，
               右边留出大片空白；合并后它们按同一尺寸连续排列。
               网格在本页内私有实现（plGrid），不改公共的 PlaylistLayout -->
          <!-- 横向排布：小封面在左、文字在右。歌单多了之后比大封面网格省一半高度；
               外层 plScroll 限定最大高度，避免歌单过多把页面拉长 -->
          <div v-if="filteredPlaylists.length" class="plScroll">
            <ul class="plRows">
              <li v-for="p in filteredPlaylists" :key="p.id" class="plRow" @click="openPl(p.id)">
                <img class="plCover" :src="p.coverImgUrl | imgParam('120y120')" :alt="p.name + '的封面'"
                     loading="lazy" decoding="async">
                <div class="plMain">
                  <p class="plName" :title="p.name">
                    {{ p.name }}
                    <span v-if="p._kind === 'favor'" class="plFavorMark" title="喜欢"><BaseIcon name="likeFill"/></span>
                  </p>
                  <p class="plMeta">
                    <span v-if="p.trackCount">{{ p.trackCount }} 首</span>
                    <span v-if="p.playCount" class="plPlays"><BaseIcon name="play"/> {{ p.playCount | Div1w }}</span>
                  </p>
                </div>
              </li>
              <li v-if="isSelf && plFilter !== 'sub'" class="plRow plRowNew" @click="importVisible = true">
                <span class="plNewPlus">+</span>
                <span class="plNewText">新建 / 导入歌单</span>
              </li>
            </ul>
          </div>
          <p v-else-if="allPlaylists.length" class="empty-text">这个分类下还没有歌单</p>
          <p v-else class="empty-text">未公开</p>
        </section>
        <section ref="secSocial" class="ud-section ud-card ud-sec">
          <h2>关注与粉丝</h2>
          <el-tabs v-model="socialAcName" @tab-click="onSocialTabClick">
            <el-tab-pane :label="socialLabels.follows" name="follows" lazy>
              <!-- 本人：分类条 + 混排（用户/歌手）；他人拿不到歌手关注，按约定不显示分类条 -->
              <template v-if="useMixedFollow">
                <el-radio-group v-model="followScene" size="mini" class="sceneTabs" @change="onFollowSceneChange">
                  <el-radio-button :label="0">全部</el-radio-button>
                  <el-radio-button :label="2">用户</el-radio-button>
                  <el-radio-button :label="1">歌手</el-radio-button>
                </el-radio-group>
                <template v-if="mixed.list.length">
                  <!-- 收起：头像墙（本页私有形态，不占用公共组件） -->
                  <div v-if="!expand.follows" class="wallGrid">
                    <button v-for="w in wallMixed" :key="w.key" class="wallItem" @click="openUser(w.id)">
                      <img :src="w.avatar | imgParam('100y100')" :alt="w.name + '的头像'" loading="lazy">
                      <span class="wallName" :title="w.name">{{ w.name }}<i v-if="w.tag" class="wallTag">{{ w.tag }}</i></span>
                    </button>
                  </div>
                  <!-- 展开：完整卡片（公共组件原样使用） -->
                  <template v-else>
                    <FollowMixedLayout :list="mixed.list"/>
                    <div class="listFoot">
                      <LoadMore :loading="mixed.loading" :noMore="mixed.noMore" :load="loadMixed" noMoreText="没有更多了"/>
                    </div>
                  </template>
                  <div v-if="!expand.follows && mixed.list.length > denseLimit" class="listFoot">
                    <button class="expandBtn" @click="expandList('follows')">
                      查看全部 {{ mixed.list.length }} 位 <span class="caret">▾</span>
                    </button>
                  </div>
                </template>
                <p v-else class="empty-text">{{ mixedEmptyText }}</p>
              </template>
              <template v-else>
                <template v-if="social.follows.list.length">
                  <div v-if="!expand.follows" class="wallGrid">
                    <button v-for="w in wallFollows" :key="w.key" class="wallItem" @click="openUser(w.id)">
                      <img :src="w.avatar | imgParam('100y100')" :alt="w.name + '的头像'" loading="lazy">
                      <span class="wallName" :title="w.name">{{ w.name }}</span>
                    </button>
                  </div>
                  <template v-else>
                    <UserListLayout :list="social.follows.list"/>
                    <div class="listFoot">
                      <LoadMore :loading="social.follows.loading" :noMore="social.follows.noMore"
                                :load="loadFollows" noMoreText="没有更多了"/>
                    </div>
                  </template>
                  <div v-if="!expand.follows && social.follows.list.length > denseLimit" class="listFoot">
                    <button class="expandBtn" @click="expandList('follows')">
                      查看全部 {{ social.follows.list.length }} 位 <span class="caret">▾</span>
                    </button>
                  </div>
                </template>
                <p v-else class="empty-text">{{ socialEmptyText('follows') }}</p>
              </template>
            </el-tab-pane>
            <el-tab-pane :label="socialLabels.followeds" name="followeds" lazy>
              <!-- self：本人的粉丝列表才显示「回关」；他人粉丝列表里的人关注的是页面主人，只能「关注」 -->
              <template v-if="social.followeds.list.length">
                <div v-if="!expand.followeds" class="wallGrid">
                  <button v-for="w in wallFolloweds" :key="w.key" class="wallItem" @click="openUser(w.id)">
                    <img :src="w.avatar | imgParam('100y100')" :alt="w.name + '的头像'" loading="lazy">
                    <span class="wallName" :title="w.name">{{ w.name }}</span>
                  </button>
                </div>
                <template v-else>
                  <UserListLayout :list="social.followeds.list" mode="followeds" :self="isSelf"/>
                  <div class="listFoot">
                    <LoadMore :loading="social.followeds.loading" :noMore="social.followeds.noMore"
                              :load="loadFolloweds" noMoreText="没有更多了"/>
                  </div>
                </template>
                <p v-if="social.followeds.cap" class="cap-hint">接口只返回最近的前 30 位粉丝，更早的粉丝暂时取不到</p>
                <div v-if="!expand.followeds && social.followeds.list.length > denseLimit" class="listFoot">
                  <button class="expandBtn" @click="expandList('followeds')">
                    查看全部 {{ social.followeds.list.length }} 位 <span class="caret">▾</span>
                  </button>
                </div>
              </template>
              <p v-else class="empty-text">{{ socialEmptyText('followeds') }}</p>
            </el-tab-pane>
          </el-tabs>
        </section>
      </div>
    </transition>

    <!-- 导入外部歌单：链接导入（QQ音乐等平台歌单链接），成功后刷新本页歌单列表 -->
    <PlaylistImportDialog
        v-if="importVisible"
        @close="importVisible = false"
        @done="reloadPlaylists"/>
  </div>
</template>

<script>
import VideoLayout from "@/components/layout/VideoLayout";
import UserListLayout from "@/components/layout/UserListLayout";
import FollowMixedLayout from "@/components/layout/FollowMixedLayout";
import VipBadge from "@/components/userPage/VipBadge";
import RankList from "@/components/userPage/RankList";
import LoadMore from "@/components/LoadMore";
import CoverImage from "@/components/common/CoverImage";
import PlaylistImportDialog from "@/components/common/PlaylistImportDialog";
import * as User from "@/api/User";
import * as userDetailApi from "@/api/UserDetail";
import * as authApi from "@/api/auth";
import { getAreaName, getCityName } from "@/utils/areaCode";
import { formatMs, followSpanText } from "@/utils/filters";
import { getIpLocation, maskIP } from "@/utils/ipLocation";
import { isLoggedIn } from "@/utils/auth";
import coverLight from "@/mixins/coverLight";

// 关注/粉丝列表每页数量：/user/follows 默认 30，/user/followeds 网关默认 20，这里统一显式传 30
const SOCIAL_PAGE_SIZE = 30;
// /user/follow/mixed 每页数量（游标分页，翻页用返回的 page.cursor）
const MIXED_PAGE_SIZE = 30;

/** 关注/粉丝两个 tab 各自的初始分页状态（loadPage 复用时需要能整体复位） */
function createSocialState() {
  const empty = () => ({list: [], offset: 0, noMore: false, loading: false, err: false, cap: false})
  return { follows: empty(), followeds: empty() }
}

/** 混排关注列表的初始分页状态（cursor 游标分页，与 offset 分页不同） */
function createMixedState() {
  return {list: [], cursor: 0, noMore: false, loading: false, err: false}
}

export default {
  name: "UserDetailLayout",
  mixins: [coverLight],
  components: {VideoLayout, UserListLayout, FollowMixedLayout, LoadMore, CoverImage, VipBadge, PlaylistImportDialog, RankList},
  props: { uid: { required: true } },
  data() {
    return {
      userInfo: {}, favorTracks: [], createList: [], subList: [],
      // 导入外部歌单弹窗开关（仅本人可开）
      importVisible: false,
      weekTracksData: [], allTracksData: [], listenedAcName: "week", favorsAcName: "cloud",
      // 听歌排行拉取失败标记：与「未公开」区分开，否则接口挂了也提示"未公开"（误导）
      recordErr: false,
      cloudTracks: [], favors: { vids: [], artists: [], albums: [] },
      locationName: '', pageLoading: true,
      lastLoginInfo: { time: "", IP: "", location: "" },
      // 当前登录用户的收藏计数（/user/subcount，仅本人可见）
      subcount: {},
      // 关注与粉丝：两个 tab 各自独立分页，首次切到该 tab 才请求
      socialAcName: "follows",
      social: createSocialState(),
      // 本人关注列表的「全部/用户/歌手」分类（scene: 0 全部 / 2 用户 / 1 歌手），默认用户
      followScene: 2,
      mixed: createMixedState(),
      // 并发保护：快速切分类时丢弃过期响应
      mixedSeq: 0,
      // 关注状态（本人不可关注自己，故只在他人页面出现）
      followed: false,
      mutual: false,
      followMe: false,
      followPending: false,
      // 关注/粉丝列表的展开状态：默认只给头像墙（前 12 位），点「查看全部」才切成完整卡片 + 翻页。
      // 20 多行的大卡片会把整页拉得极长，而看主页的人多数只是想扫一眼"关注了谁"。
      expand: { follows: false, followeds: false },
      // 头像墙一屏展示的位数（12 = 两行 × 6 列）
      denseLimit: 12,
      // 歌单分类标签当前选中项：all / favor / create / sub
      plFilter: 'all',
      // 登录态：mounted 时读一次 cookie（不使用会被永久缓存的 getter）
      loggedIn: false,
    }
  },
  computed: {
    profile() { return this.userInfo.profile },
    /**
     * 登录用户信息：state 优先，localStorage 兜底。
     * 两条都要 —— 只读 state 会让首屏（refreshLogin 未完成）拿不到 userId；
     * 只读 getter 则因为 getter 命中 localStorage 后不再依赖 state，
     * 补完资料也不会重算，isSelf 卡在 false。
     */
    loginInfo() {
      const st = this.$store.state.UserAbout.profile
      if (st && st.userId) return st
      return this.$store.getters["UserAbout/userProfile"] || {}
    },
    // 注意 userId 是 number，而 /user-detail?uid=xxx 路由里拿到的是 string，
    // 用 === 会导致「从他人主页跳到自己主页」时误判为非本人 → 统一转字符串比较
    isSelf() { return this.uid != null && this.loginInfo.userId != null && String(this.uid) === String(this.loginInfo.userId) },
    // 格式：「上次登录 · 浙江杭州 · 8月26日 17:37」
    // 城市解析成功 → 城市+时间；失败 → IP打码+时间
    lastLoginText() {
      if (!this.lastLoginInfo.time) return ''
      const time = formatMs(this.lastLoginInfo.time, 'M月D日 HH:mm')
      if (this.lastLoginInfo.location) return `上次登录 · ${this.lastLoginInfo.location} · ${time}`
      if (this.lastLoginInfo.IP) return `上次登录 · IP ${maskIP(this.lastLoginInfo.IP)} · ${time}`
      return `上次登录 · ${time}`
    },
    loginInfoText() {
      return !!this.lastLoginInfo.time
    },
    // tab 标题带计数，数字直接取 profile 上的统计值（比列表长度更准，列表是分页的）
    socialLabels() {
      const p = this.profile || {}
      return {
        follows: p.follows != null ? `关注 ${p.follows}` : '关注',
        followeds: p.followeds != null ? `粉丝 ${p.followeds}` : '粉丝',
      }
    },
    // 只有本人页面能用 /user/follow/mixed —— 它取的是「当前登录账号」的关注，不接受 uid。
    // 他人页面拿不到歌手关注，退回 /user/follows（只有用户），因此也不显示分类条。
    useMixedFollow() {
      return this.isSelf
    },
    // 登录态自己读，不用 UserAbout/isLogin getter：那个 getter 内部直接调 isLoggedIn()，
    // 没有任何响应式依赖，Vue 会把它永久缓存 —— 会话中途登录后仍然返回 false。
    isLogin() {
      return this.loggedIn
    },
    // 关注按钮四态：互相关注 / 已关注 / 回关（对方已关注我）/ 关注
    followState() {
      if (this.followed) return this.mutual ? 'mutual' : 'followed'
      return this.followMe ? 'followBack' : 'none'
    },
    followBtnText() {
      return { mutual: '互相关注', followed: '已关注', followBack: '回关', none: '关注' }[this.followState]
    },
    // 关注按钮：登录后、且不是自己主页才显示
    canFollow() {
      return this.isLogin && !this.isSelf
    },
    mixedEmptyText() {
      if (this.mixed.loading) return '加载中…'
      if (this.mixed.err) return '关注列表获取失败'
      if (this.followScene === 1) return '暂无关注歌手'
      if (this.followScene === 2) return '暂无关注用户'
      return '暂无关注'
    },
    /**
     * 歌单区统一成一张网格：喜欢 → 创建 → 收藏。
     * 之前三组分别渲染，只有一个歌单的「喜欢」会独占一整行，右边空着；
     * 合并后同尺寸连续排列，少了三个小标题，也少了三块空白。
     */
    allPlaylists() {
      const tag = (list, kind) => (list || []).map(p => Object.assign({}, p, {_kind: kind}))
      // 「喜欢」的歌单（uid 同名歌单）也会出现在创建列表里 —— /user/playlist 第一项
      // 既是喜欢也是自己创建的。以前分三组渲染不明显，合并成一张网格后会连出两张一样的卡。
      const favorIds = {}
      this.favorTracks.forEach(p => { favorIds[p.id] = 1 })
      return [
        ...tag(this.favorTracks, 'favor'),
        ...tag(this.createList.filter(p => !favorIds[p.id]), 'create'),
        ...tag(this.subList, 'sub'),
      ]
    },
    // 分类标签：合并成一张列表后，用它切回「喜欢 / 创建 / 收藏」
    playlistTabs() {
      return [
        {key: 'all', label: '全部', count: this.allPlaylists.length},
        {key: 'favor', label: '喜欢', count: this.favorTracks.length},
        {key: 'create', label: '创建', count: this.allPlaylists.filter(p => p._kind === 'create').length},
        {key: 'sub', label: '收藏', count: this.subList.length},
      ]
    },
    filteredPlaylists() {
      return this.plFilter === 'all'
        ? this.allPlaylists
        : this.allPlaylists.filter(p => p._kind === this.plFilter)
    },
    // 锚点条：云盘只有本人可见，别人的主页少一项
    anchors() {
      const list = [{key: 'secRank', label: '听歌排行'}]
      if (this.isSelf) list.push({key: 'secFavors', label: '云盘与收藏'})
      list.push({key: 'secPlaylist', label: '歌单'}, {key: 'secSocial', label: '关注与粉丝'})
      return list
    },
    /**
     * 头像墙数据：把两种列表（混排 records / 用户列表）归一成 {key,id,name,avatar,tag}。
     * 只在本页渲染收起态；展开后交给公共卡片组件（FollowMixedLayout / UserListLayout），
     * 所以这里不碰它们的内部实现。
     */
    wallMixed() {
      return this.mixed.list.slice(0, this.denseLimit).map(r => {
        if (r.type === 1) {
          const pf = r.userProfile || {}
          return { key: 'u' + r.followId, id: pf.userId || r.followId, name: pf.nickname || '用户', avatar: pf.avatarUrl || '', tag: '' }
        }
        const a = r.artistInfo || {}
        return { key: 'a' + r.followId, id: a.id || r.followId, name: a.name || '歌手', avatar: a.picUrl || a.img1v1Url || '', tag: '歌手' }
      })
    },
    wallFollows() {
      return this.social.follows.list.slice(0, this.denseLimit).map(u => (
        { key: u.userId, id: u.userId, name: u.nickname || '用户', avatar: u.avatarUrl || '', tag: '' }
      ))
    },
    wallFolloweds() {
      return this.social.followeds.list.slice(0, this.denseLimit).map(u => (
        { key: u.userId, id: u.userId, name: u.nickname || '用户', avatar: u.avatarUrl || '', tag: '' }
      ))
    }
  },
  methods: {
    /**
     * 补齐登录用户资料。
     * 背景：state.profile 只在 setLogin / initProfileInfo 时写入，而建站早期的会话
     * 可能只写了 cookie、没写 user-profile（localStorage 里是 {}）。
     * 这时 loginInfo.userId 为 undefined → isSelf 永假 → 自己主页也会渲染「关注」按钮，
     * 还能把自己关注上；本人专属区块（云盘/导入歌单/年度报告）也全都不显示。
     * 有登录态但拿不到 userId 时，用 /login/status 补一次并写回 store / localStorage。
     */
    ensureLoginProfile() {
      if (!this.loggedIn) return Promise.resolve()
      if (this.loginInfo && this.loginInfo.userId) return Promise.resolve()
      return authApi.loginStatus()
        .then(res => {
          const pf = res && res.data && res.data.data && res.data.data.profile
          if (pf && pf.userId) return this.$store.dispatch('UserAbout/initProfileInfo', pf)
        })
        .catch(() => {})
    },
    getUserInfo(uid) {
      return userDetailApi.detail(uid).then(res => {
        this.userInfo = res.data
        if (res.data.profile) {
          const p = res.data.profile
          // 关注状态直接取自详情接口，省一次额外请求
          this.followed = !!p.followed
          this.mutual = !!p.mutual
          // followMe：对方是否关注我（回关的判定依据）
          this.followMe = !!p.followMe
          const prov = getAreaName(p.province)
          const city = getCityName(p.city||p.province)
          this.locationName = [prov,city].filter(Boolean).join(' · ')
        }
      })
    },
    /** 关注 / 取消关注 TA */
    toggleFollow() {
      if (!this.canFollow || this.followPending) return
      if (this.followed) this.confirmUnfollowUser()
      else this.setFollow(1)
    },
    setFollow(t) {
      this.followPending = true
      User.followUser(this.uid, t)
        .then(res => {
          const code = res && res.data && res.data.code
          if (code === 200) {
            const on = t === 1
            this.followed = on
            // mutual ⇔ 我关注 TA 且 TA 关注我；关注后能否算互关取决于 followMe
            this.mutual = on ? this.followMe : false
            // 粉丝数做本地即时反馈（服务端为准，刷新后会校正）
            const p = this.profile
            if (p && p.followeds != null) this.$set(p, 'followeds', Math.max(0, p.followeds + (on ? 1 : -1)))
            this.$toast.success(on ? '已关注' : '已取消关注')
          } else if (code === 301 || code === 302) {
            // 网关对未登录/失效 cookie 分别回 301「未登录」和 302「系统错误」
            this.$toast.warning('登录态已失效，请重新登录后再试')
          } else {
            this.$toast.error('操作失败，请稍后重试')
          }
        })
        .catch(() => this.$toast.error('网络错误，操作失败'))
        .finally(() => { this.followPending = false })
    },
    /**
     * 取消关注前确认。
     * 详情接口在有关系时会带 profile.followTime，但它没有文档说明单位，
     * 这里只在「看起来是毫秒且不在未来」时才拿它算时长，否则只显示文案，绝不瞎算。
     */
    confirmUnfollowUser() {
      const h = this.$createElement
      const name = (this.profile && this.profile.nickname) || 'TA'
      const rows = []
      const t = Number(this.profile && this.profile.followTime)
      if (t > 1e12 && t < Date.now() + 86400000) {
        const span = followSpanText(t)
        if (span) {
          rows.push(h('p', { style: 'margin:10px 0 0;color:#555' },
            ['已关注：', h('b', { style: 'color:#8685EF;font-weight:600' }, span)]))
        }
      }
      const message = h('div', { style: 'line-height:1.7' }, [
        h('p', { style: 'margin:0' },
          this.mutual ? `取消后你将不再关注「${name}」，互相关注状态会被解除。` : `取消后你将不再关注「${name}」。`),
        ...rows,
      ])
      this.$confirmBox({
        title: '取消关注',
        message,
        confirmText: '仍然取消',
        cancelText: '继续关注',
        distinguishCancelAndClose: true,
      })
        .then(() => this.setFollow(0))
        .catch(() => { /* 继续关注 */ })
    },
    getPlaylist(uid) { return userDetailApi.playlists(uid, 2000) },
    /**
     * 只重拉歌单区（导入完成后调用）：
     * loadPage 是「push 不 clear」的写法，直接复用会渲染出重复歌单，所以这里先清空三个数组
     */
    async reloadPlaylists() {
      this.favorTracks = []
      this.createList = []
      this.subList = []
      try {
        const res = await this.getPlaylist(this.uid)
        const list = (res.data && res.data.playlist) || []
        list.forEach(pl => {
          if (pl.creator && pl.creator.userId * 1 === this.uid * 1) this.createList.push(pl)
          else this.subList.push(pl)
        })
        if (list[0]) this.favorTracks.push(list[0])
      } catch (e) {
        // 拉取失败保持空列表：下次进页面 loadPage 会重新拉一次，这里不弹错打断导入流程
      }
    },
    getRecentTracks(uid, type = 1) { return userDetailApi.record(uid, type) },
    /** 关注/粉丝列表请求：kind = 'follows' | 'followeds' */
    getSocial(kind, offset) {
      return kind === 'follows'
        ? userDetailApi.follows(this.uid, SOCIAL_PAGE_SIZE, offset)
        : userDetailApi.followeds(this.uid, SOCIAL_PAGE_SIZE, offset)
    },
    /**
     * 拉下一页。翻页终止条件有两层：
     * 1) 上游 more === false
     * 2) 这一页没带回任何新用户 —— /user/followeds 的网关实现不透传 limit/offset，
     *    每次都会返回同一批前 30 位，若只认 more 会无限「加载更多」并渲染出重复用户
     */
    async loadSocial(kind) {
      const st = this.social[kind]
      if (st.loading || st.noMore) return
      st.loading = true
      const offset = st.offset
      try {
        const res = await this.getSocial(kind, offset)
        const data = res.data || {}
        const raw = (kind === 'follows' ? data.follow : data.followeds) || []
        const seen = {}
        st.list.forEach(u => { seen[u.userId] = 1 })
        const fresh = raw.filter(u => u && u.userId != null && !seen[u.userId])
        st.list = st.list.concat(fresh)
        st.offset = st.list.length
        const exhausted = fresh.length === 0
        st.noMore = !data.more || exhausted
        st.cap = exhausted && !!data.more
        st.err = false
      } catch (e) {
        st.err = true
        st.noMore = true
      } finally {
        st.loading = false
      }
    },
    loadFollows() { return this.loadSocial('follows') },
    loadFolloweds() { return this.loadSocial('followeds') },
    /**
     * 关注列表（本人，含歌手）—— 游标分页。
     * 返回体：data.records[] + data.page{cursor, more}
     *   records[].type      1 用户 / 2 歌手
     *   records[].followId  用户 id 或歌手 id（两者 id 空间独立，key 必须拼 type）
     * cursor 传上一页的 page.cursor；page.more 为 false 即到底。
     */
    async loadMixed() {
      const m = this.mixed
      if (m.loading || m.noMore) return
      const seq = ++this.mixedSeq
      m.loading = true
      try {
        const res = await User.followMixed(this.followScene, MIXED_PAGE_SIZE, m.cursor)
        // 快速切分类时，旧请求回来直接丢弃
        if (seq !== this.mixedSeq) return
        const data = (res.data && res.data.data) || {}
        const records = data.records || []
        const page = data.page || {}
        const seen = {}
        m.list.forEach(r => { seen[r.type + '-' + r.followId] = 1 })
        const fresh = records.filter(r => r.followId != null && !seen[r.type + '-' + r.followId])
        m.list = m.list.concat(fresh)
        if (page.cursor !== undefined && page.cursor !== null) m.cursor = page.cursor
        m.noMore = !page.more || fresh.length === 0
        m.err = false
      } catch (e) {
        if (seq === this.mixedSeq) {
          m.err = true
          m.noMore = true
        }
      } finally {
        if (seq === this.mixedSeq) m.loading = false
      }
    },
    onFollowSceneChange() {
      this.mixedSeq++ // 让在途请求失效
      this.mixed = createMixedState()
      this.expand.follows = false
      this.loadMixed()
    },
    // 切 tab 时才首次请求，避免每次进用户页都多打两个接口
    onSocialTabClick() {
      if (this.socialAcName === 'follows' && this.useMixedFollow) return this.loadMixed()
      return this.loadSocial(this.socialAcName)
    },
    socialEmptyText(kind) {
      const st = this.social[kind]
      if (st.loading) return '加载中…'
      if (st.err) return '列表不可见（对方可能设置了隐私）'
      return kind === 'follows' ? '暂无关注' : '暂无粉丝'
    },
    // 点 hero 上的「关注 / 粉丝」数字 → 切到对应 tab 并滚到该区块
    jumpSocial(kind) {
      this.socialAcName = kind
      this.expand[kind] = false
      if (kind === 'follows' && this.useMixedFollow) this.loadMixed()
      else this.loadSocial(kind)
      this.$nextTick(() => {
        const el = this.$refs.secSocial
        if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    },
    /** 私有网格的跳转：与公共组件走同一条 $bus 通道，行为保持一致 */
    openPl(id) {
      if (id) this.$bus.$emit('plClk', id)
    },
    openUser(uid) {
      if (uid) this.$bus.$emit('uClk', uid)
    },
    /** 收藏专辑 / 关注歌手：小图标列表的跳转，沿用公共组件的 $bus 通道 */
    openAlbum(id) {
      if (id) this.$bus.$emit('alClk', id)
    },
    openArtist(id) {
      if (id) this.$bus.$emit('arClk', id)
    },
    // 专辑封面 / 歌手头像的兜底：字段在网易云各接口里不统一
    albumCover(a) { return (a.picUrl || a.blurPicUrl || a.pic || '') },
    albumArtist(a) {
      const ar = Array.isArray(a.artists) ? a.artists[0] : a.artist
      return (ar && ar.name) || '未知歌手'
    },
    artistAvatar(ar) { return (ar.picUrl || ar.img1v1Url || ar.pic || '') },
    /** 锚点条：滚到对应区块（区块自带 scroll-margin-top，不会被吸顶条挡住） */
    scrollTo(ref) {
      const el = this.$refs[ref]
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
    /** 头像墙 → 完整卡片列表 */
    expandList(kind) {
      this.expand[kind] = true
    },
    /**
     * 别处删了歌单（歌单详情页）：本人主页要重拉，他人主页不涉及。
     * 只重拉歌单区而不是 loadPage —— 排行榜/云盘/关注都没变，没必要全量重取
     */
    onPlaylistDeleted() {
      if (this.isSelf) this.reloadPlaylists()
    },
    handleThisTracksData(tracks, target) {
      // 上游偶有缺 song 的空壳条目，直接跳过，别让一条脏数据把整个排行榜打空
      (tracks || []).forEach(l => {
        if (!l || !l.song) return
        l.song.recordPlayCount = l.playCount
        target.push(l.song)
      })
    },
    async loadPage() {
      this.pageLoading = true
      const uid = this.uid
      // 关注/粉丝状态复位（loadPage 可能因复用组件被二次触发）
      this.socialAcName = 'follows'
      this.social = createSocialState()
      this.followScene = 2
      this.mixed = createMixedState()
      this.mixedSeq++
      this.expand = { follows: false, followeds: false }
      const p1 = this.getPlaylist(uid).then(res => {
        res.data.playlist.forEach((pl) => {
          if (pl.creator.userId*1 === uid*1) this.createList.push(pl)
          else this.subList.push(pl)
        })
        if (res.data.playlist[0]) this.favorTracks.push(res.data.playlist[0])
      })
      const isSelf = this.isSelf
      // 本人: 补充最近登录信息(IP→位置, 时间戳→日期)
      const p5 = isSelf
        ? authApi.loginStatus().then(res => {
            const pf = res.data.data && res.data.data.profile
            if (pf && pf.lastLoginIP) {
              this.lastLoginInfo.IP = pf.lastLoginIP
              this.lastLoginInfo.time = pf.lastLoginTime
              return getIpLocation(pf.lastLoginIP).then(loc => { this.lastLoginInfo.location = loc })
            }
          }).catch(() => {})
        : Promise.resolve()
      // 听歌排行仅本人可看(他人 record 接口返回 400), 非本人跳过请求, 显示"未公开"
      // 先复位：组件被复用于另一个 uid 时，上一页的排行不能留在这里
      this.weekTracksData = []
      this.allTracksData = []
      this.recordErr = false
      const p2 = isSelf
        ? Promise.all([
            this.getRecentTracks(uid), this.getRecentTracks(uid, 0)
          ]).then(([week, all]) => {
            // type=1 只回 weekData、type=0 只回 allData，字段缺失按空数组处理
            this.handleThisTracksData(week.data && week.data.weekData, this.weekTracksData)
            this.handleThisTracksData(all.data && all.data.allData, this.allTracksData)
            this.recordErr = false
          }).catch(() => {
            this.weekTracksData = []
            this.allTracksData = []
            this.recordErr = true
          })
        : Promise.resolve()
      const p3 = isSelf
        ? User.getCloud().then(res => {
            res.data.data.forEach(val => { val.simpleSong.fileSize = val.fileSize; this.cloudTracks.push(val.simpleSong) })
          }).catch(() => { this.cloudTracks = [] })
        : Promise.resolve()
      const p4 = isSelf
        ? Promise.all([User.subArtistList(), User.subAlbumList(), User.subMvList()])
            .then(([artists, albums, mvs]) => {
              this.favors.artists = artists.data.data; this.favors.albums = albums.data.data; this.favors.vids = mvs.data.data
            })
            .catch(() => { this.favors = { vids: [], artists: [], albums: [] } })
        : Promise.resolve()
      // 收藏计数只有本人能取（接口不带 uid，取的是当前登录态）
      const p6 = isSelf
        ? User.subcount().then(res => { this.subcount = res.data || {} }).catch(() => { this.subcount = {} })
        : Promise.resolve()
      // 关注列表先取第一页（默认 tab）：本人走混排接口（带分类），他人走 /user/follows
      const p7 = this.useMixedFollow ? this.loadMixed() : this.loadSocial('follows')
      await Promise.all([this.getUserInfo(uid), p1, p2, p3, p4, p5, p6, p7])
      this.pageLoading = false
    }
  },
  mounted() {
    // 登录态在这里取一次：cookie 是同步可读的，且这个组件每次进详情页都会重新挂载
    this.loggedIn = isLoggedIn()
    // 先把登录用户资料补齐，再加载页面 —— 否则 isSelf 会误判（见 ensureLoginProfile）
    this.ensureLoginProfile().finally(() => {
      if (this.uid) this.loadPage()
    })
    // 歌单详情页删歌单后广播：本页被 keep-alive 缓存，返回时不会重新 mounted，只能靠事件刷新
    this.$bus.$on('playlistDeleted', this.onPlaylistDeleted)
  },
  beforeDestroy() {
    this.$bus.$off('playlistDeleted', this.onPlaylistDeleted)
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/base/variables";

.userDetail { max-width: 1200px; margin: 0 auto; padding-bottom: 80px; }

/* ---------- Hero 毛玻璃卡片 ---------- */
.user-hero {
  position: relative;
  display: flex; align-items: center; gap: 28px;
  padding: 36px 32px;
  margin-bottom: 28px;
  border-radius: 24px;
  background: rgba(255,255,255,.55);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border: 1px solid rgba(255,255,255,.45);
  box-shadow: 0 12px 40px rgba(0,0,0,.06);
  overflow: hidden;

  // 深头像背景: 模糊层压暗会导致毛玻璃面板发灰、深字看不清 → 提亮面板+减弱模糊层
  &.dark-bg {
    background: rgba(255,255,255,.86);
    border-color: rgba(255,255,255,.7);
    box-shadow: 0 12px 40px rgba(0,0,0,.10);
  }
  &.dark-bg .hero-blur-bg {
    opacity: .32;
    filter: blur(50px) brightness(.35);
  }

  .hero-blur-bg {
    position: absolute; inset: 0; z-index: 0;
    background-size: cover; background-position: center;
    filter: blur(50px) brightness(.5);
    transform: scale(1.2);
    opacity: .55;
  }

  > * { position: relative; z-index: 1; }

  .hero-avatar {
    flex-shrink: 0; width: 132px; height: 132px;
    border-radius: 50%; overflow: hidden;
    border: 3px solid rgba(134,133,239,.4);
    box-shadow: 0 8px 28px rgba(0,0,0,.15);
    img { width: 100%; height: 100%; object-fit: cover; }
  }
  // 关键：hero-info 必须可压缩。原来没有 flex，内容一宽就把右侧按钮顶出容器，
  // 再被 .user-hero 的 overflow:hidden 裁掉 —— 表现为「别人主页看不到关注按钮」
  .hero-info { flex: 1; min-width: 0; }
  .hero-name { font-size: 28px; font-weight: 700; color: $font-black; margin: 0 0 8px; display: flex; align-items: center; gap: 8px; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; i { display: inline-block; font-size: 18px; line-height: 1; flex-shrink: 0; } i.el-icon-male { color: #47a1ce; } i.el-icon-female { color: #ff86b6; } }
  .hero-sig { font-size: 14px; color: $font-black-1; margin: 0 0 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; max-width: 460px; }
  // 统计信息做成 chip：原来是一行朴素文字，数字和标签糊在一起，扫读时分不清边界
  .hero-meta { display: flex; flex-wrap: wrap; gap: 8px; font-size: 12px; color: $font-black-1; margin: 0; }
  .hero-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 999px;
    background: rgba(0,0,0,.045);
    color: $font-black-1;
    white-space: nowrap;
  }
  // 关注/粉丝可点，跳转到页面底部的关注与粉丝区块
  .hero-chip--link {
    cursor: pointer;
    transition: background .2s, color .2s;
    &:hover { background: rgba($color-main, .12); color: $color-main; }
  }
  .hero-login { margin: 0; font-size: 11px; color: $font-black-2; white-space: nowrap; }
  // 年度听歌报告入口（仅本人）
  // 用实心主色：hero 背景是头像模糊渐变（深浅不定），半透明底会糊掉
  .hero-annual {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 16px;
    border-radius: 999px;
    background: $color-main-1;
    color: #fff;
    font-size: 13px;
    font-weight: 500;
    text-decoration: none;
    box-shadow: 0 4px 14px rgba($color-main-1, .3);
    transition: background .2s, transform .2s, box-shadow .2s;
    &:hover { background: darken($color-main-1, 6%); transform: translateY(-1px); box-shadow: 0 6px 18px rgba($color-main-1, .38); }
    .hero-annual-arrow { font-size: 12px; opacity: .85; }
  }

  // 右侧动作区：主操作（年度报告 / 关注按钮）在上，次要信息（上次登录）在下
  .hero-side {
    margin-left: auto;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
  }
  .hero-side--action { justify-content: center; }
  .followBtn {
    min-width: 96px;
    height: 36px;
    padding: 0 22px;
    border-radius: 18px;
    font-size: 14px;
    cursor: pointer;
    border: 1px solid $color-main;
    background: $color-main;
    color: #fff;
    transition: all .2s;

    &:hover { background: $color-main-1; border-color: $color-main-1; }

    // 已关注：描边态，hover 提示可取消
    &.is-followed {
      background: transparent;
      color: $font-black-1;
      border-color: rgba(0,0,0,.15);

      &:hover { color: #f56c6c; border-color: #f56c6c; background: rgba(245,108,108,.06); }
    }

    // 互相关注：加一个小圆点区分「已关注」与「互关」，语义更强
    &.is-mutual {
      border-color: rgba($color-main, .45);
      color: $color-main;

      &::before {
        content: '';
        display: inline-block;
        width: 6px;
        height: 6px;
        margin-right: 6px;
        border-radius: 50%;
        background: $color-main;
        vertical-align: middle;
      }
    }

    &:disabled { opacity: .6; cursor: default; }
  }
}

/* ---------- Section 卡片 ---------- */
.ud-section {
  margin-bottom: 28px;
  h2 { font-size: 20px; font-weight: 700; color: $font-black; margin: 0 0 18px; display: flex; align-items: center; }
  // 标题右侧的操作入口（导入外部歌单）：h2 是 flex，margin-left:auto 推到最右
  h2 .import-btn { margin-left: auto; font-size: 12px; font-weight: 500; }
  // 歌单区的分类计数，替代原来的三个 h3 小标题
  h2 .h2-count { margin-left: 10px; font-size: 12px; font-weight: 400; color: $font-black-2; }
  h2::before {
    content: ''; display: inline-block; width: 4px; height: 18px;
    border-radius: 2px; background: $color-main; margin-right: 12px; flex-shrink: 0;
  }
  h3 { font-size: 16px; font-weight: 600; color: $font-black-1; margin: 20px 0 14px; }
  .empty-text { color: $font-black-2; font-size: 14px; padding: 20px 0; }
  // 上游分页失效时的提示（见 loadSocial 注释）
  .cap-hint { color: $font-black-2; font-size: 12px; margin: 14px 0 0; }
  // 关注列表的「全部/用户/歌手」分类
  .sceneTabs { margin-bottom: 18px; }
}

// 并排两卡与歌单区的统一高度上限：防止内容一多就把整页拉长
$duo-h: 520px;
$pl-max-h: 420px;

/* ---------- 锚点条 ---------- */
// 页面从"一屏看完"变成"四块内容"，给一个随手可点的位置标；吸顶是为了滚动中途也能点
.ud-anchor {
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  gap: 8px;
  margin: 0 0 18px;
  padding: 8px 0;
  // 半透明底 + 模糊：滚过卡片时字不会和封面糊在一起
  background: rgba(250, 250, 252, .82);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.anchorBtn {
  padding: 6px 16px;
  border: 1px solid rgba(0,0,0,.08);
  border-radius: 999px;
  background: rgba(255,255,255,.7);
  font-size: 13px;
  color: $font-black-1;
  cursor: pointer;
  transition: background .2s, color .2s, border-color .2s;

  &:hover { background: $color-main-1; border-color: $color-main-1; color: #fff; }
}

// 滚动定位时给吸顶条留出空间，否则标题会被盖住
.ud-sec { scroll-margin-top: 64px; }

/* ---------- 听歌排行 + 云盘：两个矮列表并排 ---------- */
// 两栏比例 1.6:1：排行榜是主内容（有数字列，需求更宽），云盘只是"收藏了什么"的速览
.ud-duo {
  display: grid;
  // 必须写 minmax(0, …)：纯 fr 的最小值是 auto，列宽会被内容（比如云盘超长列表、
  // 专辑网格）撑开 —— 表现就是「切到专辑 tab 时卡片宽度变化」
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: 20px;
  align-items: start;

  @media (max-width: 980px) { grid-template-columns: 1fr; }

  // 他人主页没有「云盘与收藏」（只有本人能取），只剩排行榜一张卡 →
  // 必须回到单列，否则排行会被挤在左侧 61% 处，右边空一格
  &.is-solo { grid-template-columns: 1fr; }

  // 子卡片的 margin-bottom 被清零了（并排时不需要），这里补回与下方歌单卡的间距
  margin-bottom: 28px;

  // 窄列里的专辑/歌手/视频网格：沿用全站的 minmax(200px) 会变成一列大卡，这里压到两列
  ::v-deep .gridLayout {
    grid-template-columns: repeat(auto-fill, minmax(126px, 1fr)) !important;
    gap: 14px;
  }
}

// 两张卡等高（DUO_HEIGHT）+ 内容区内部滚动：
// 之前只有云盘自己限高，排行卡跟着内容长，两块高度完全对不上
// 只在真正并排（本人页：排行 + 云盘）时锁高；他人页只有一张卡，按内容自适应
.ud-duo:not(.is-solo) > .ud-section {
  margin-bottom: 0;
  height: $duo-h;
  display: flex;
  flex-direction: column;

  > h2 { flex: none; }

  // el-tabs 变纵向 flex，让内容区吃掉剩余高度并滚动
  ::v-deep .el-tabs {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;

    > .el-tabs__header { flex: none; }
    > .el-tabs__content {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding-right: 6px;
      scrollbar-width: thin;
      scrollbar-color: rgba(0,0,0,.14) transparent;
      &::-webkit-scrollbar { width: 5px; }
      &::-webkit-scrollbar-track { background: transparent; }
      &::-webkit-scrollbar-thumb { background: rgba(0,0,0,.14); border-radius: 3px; }
    }
  }

  // 窄屏恢复自适应高度，别在手机上锁死 520px
  @media (max-width: 980px) {
    height: auto;
    max-height: none;
    ::v-deep .el-tabs__content { overflow: visible; }
  }
}

// 他人主页：单列、不锁高，避免「未公开」三个字撑出一整张空卡
.ud-duo.is-solo > .ud-section { margin-bottom: 0; height: auto; }

/* ---------- 关注列表：头像墙 + 查看全部 ---------- */
.listFoot { display: flex; justify-content: center; margin-top: 14px; }

.expandBtn {
  padding: 7px 18px;
  border: 1px solid rgba(0,0,0,.08);
  border-radius: 999px;
  background: rgba(255,255,255,.7);
  font-size: 13px;
  color: $font-black-1;
  cursor: pointer;
  transition: background .2s, border-color .2s, color .2s;

  &:hover { border-color: rgba($color-main, .5); color: $color-main; }
  .caret { font-size: 11px; opacity: .7; }
}

/* ---------- 歌单分类标签 ---------- */
.plTags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 14px;
}

.plTag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 14px;
  border: 1px solid rgba(0,0,0,.08);
  border-radius: 999px;
  background: rgba(255,255,255,.65);
  font-family: inherit;
  font-size: 13px;
  color: $font-black-1;
  cursor: pointer;
  transition: background .2s, border-color .2s, color .2s;

  &:hover { border-color: rgba($color-main, .45); color: $color-main; }

  &.is-active {
    background: $color-main-1;
    border-color: $color-main-1;
    color: #fff;
  }

  // 未选中的标签里数字弱化处理，避免抢标题
  .plTagNum { font-size: 11px; opacity: .7; }
}

/* ---------- 云盘与收藏：专辑 / 歌手的小图标列表 ---------- */
.miniRows {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.miniRow {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 6px 8px;
  border-radius: 10px;
  cursor: pointer;
  transition: background .18s;

  &:hover { background: rgba(0,0,0,.035); }

  .miniCover {
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    border-radius: 8px;
    object-fit: cover;
    display: block;
    background: rgba(0,0,0,.05);
  }
  // 歌手用圆形头像，与专辑方角封面区分
  .miniCover--round { border-radius: 50%; }

  .miniMain { flex: 1; min-width: 0; }

  .miniName {
    margin: 0;
    font-size: 13px;
    color: $font-black;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .miniMeta {
    margin: 2px 0 0;
    font-size: 11px;
    color: $font-black-2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

/* ---------- 歌单：横向排布（左小封面 + 右文字），页内私有 ---------- */
// 歌单数量不定，网格会被撑得很长；横排一行只占 ~64px，同样高度能多放一倍内容。
// 外层 plScroll 兜住最大高度，剩下的走内部滚动。
.plScroll {
  max-height: $pl-max-h;
  overflow-y: auto;
  padding-right: 6px;
  scrollbar-width: thin;
  scrollbar-color: rgba(0,0,0,.14) transparent;
  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(0,0,0,.14); border-radius: 3px; }
}

.plRows {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.plRow {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 8px 12px;
  border-radius: 14px;
  background: rgba(255,255,255,.6);
  border: 1px solid rgba(0,0,0,.05);
  cursor: pointer;
  transition: transform .2s, border-color .2s, box-shadow .2s;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba($color-main, .35);
    box-shadow: 0 6px 18px rgba(0,0,0,.06);
  }

  .plCover {
    width: 52px;
    height: 52px;
    flex-shrink: 0;
    border-radius: 10px;
    object-fit: cover;
    display: block;
    background: rgba(0,0,0,.05);
  }

  .plMain { flex: 1; min-width: 0; }

  .plName {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 14px;
    color: $font-black;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  // 「喜欢」标记：合并成一张列表后用它在喜欢歌单上打标
  .plFavorMark { flex-shrink: 0; color: $color-main; font-size: 12px; }

  .plMeta {
    margin: 4px 0 0;
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 12px;
    color: $font-black-2;

    .plPlays { display: inline-flex; align-items: center; gap: 3px; }
  }
}

// 尾部「新建 / 导入」：与歌单行同高，虚线卡
.plRowNew {
  justify-content: flex-start;
  background: transparent;
  border: 1px dashed rgba(0,0,0,.16);
  color: $font-black-2;

  &:hover { background: rgba($color-main, .04); border-color: rgba($color-main, .55); color: $color-main; transform: none; box-shadow: none; }
  .plNewPlus { margin-left: 7px; font-size: 20px; line-height: 1; }
  .plNewText { font-size: 13px; }
}

/* ---------- 关注列表收起态：头像墙（页内私有，公共组件零改动） ---------- */
.wallGrid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;

  @media (max-width: 1100px) { grid-template-columns: repeat(5, 1fr); }
  @media (max-width: 900px) { grid-template-columns: repeat(4, 1fr); }
  @media (max-width: 600px) { grid-template-columns: repeat(3, 1fr); }
}

.wallItem {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 10px 4px 9px;
  border: none;
  border-radius: 12px;
  background: transparent;
  font-family: inherit;
  cursor: pointer;
  transition: background .18s;

  &:hover { background: rgba(255,255,255,.8); }

  img {
    width: 44px; height: 44px;
    border-radius: 50%;
    object-fit: cover;
    display: block;
    background: rgba(0,0,0,.05);
  }

  .wallName {
    max-width: 100%;
    display: flex; align-items: center; gap: 4px;
    font-size: 12px; color: $font-black-1;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  // 歌手小标（混排列表里区分用户/歌手）
  .wallTag {
    font-size: 10px; font-style: normal;
    color: $color-main;
    border: 1px solid rgba($color-main, .4);
    border-radius: 4px;
    padding: 0 3px;
    flex-shrink: 0;
  }
}

/* ---------- 云盘：文件总数说明（滚动由卡片统一接管） ---------- */
.cloudCount { margin: 0 0 8px; font-size: 12px; color: $font-black-2; }

.ud-card {
  padding: 28px 32px;
  border-radius: 24px;
  background: rgba(255,255,255,.55);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border: 1px solid rgba(255,255,255,.45);
  box-shadow: 0 12px 40px rgba(0,0,0,.06);
}


/* skeleton */
.ud-full-skel { padding-top: 40px; }
.skel-hero-row { display: flex; align-items: center; gap: 28px; margin-bottom: 40px; }
.skel-avatar { width: 120px; height: 120px; border-radius: 50%; background: #e8e8e8; flex-shrink: 0; }
.skel-lines { flex: 1; }
.skel-line { height: 16px; border-radius: 8px; margin-bottom: 12px; background: #e8e8e8; }
.skel-line--lg { width: 200px; }
.skel-line--md { width: 130px; }
.skel-section { margin-bottom: 40px; }
.skel-sec-title { width: 80px; height: 16px; border-radius: 8px; margin-bottom: 16px; background: #e8e8e8; }
.skel-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.skel-card { border-radius: 12px; overflow: hidden; }
.skel-card-img { aspect-ratio: 1; background: #e8e8e8; }
.skel-card-line { height: 12px; border-radius: 6px; margin: 10px 8px; width: 70%; background: #e8e8e8; }

/* transitions */
.detail-fade-enter-active, .detail-fade-leave-active { transition: opacity .35s ease, transform .35s ease; }
.detail-fade-enter, .detail-fade-leave-to { opacity: 0; transform: translateY(16px); }
</style>
