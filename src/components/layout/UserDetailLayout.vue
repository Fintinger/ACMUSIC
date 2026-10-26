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
              <span v-if="locationName">📍 {{ locationName }}</span>
              <span v-if="profile.follows != null" class="hero-stat" title="查看关注列表" @click="jumpSocial('follows')">{{ profile.follows }} 关注</span>
              <span v-if="profile.followeds != null" class="hero-stat" title="查看粉丝列表" @click="jumpSocial('followeds')">{{ profile.followeds }} 粉丝</span>
              <span v-if="isSelf && subcount.createdPlaylistCount != null">{{ subcount.createdPlaylistCount }} 创建歌单</span>
              <span v-if="isSelf && subcount.subPlaylistCount != null">{{ subcount.subPlaylistCount }} 收藏歌单</span>
            </p>
            <p class="hero-login" v-if="isSelf && lastLoginText">{{ lastLoginText }}</p>
            <!-- 年度听歌报告入口：仅本人可见（接口只能取当前登录用户的数据） -->
            <router-link v-if="isSelf" to="/annual" class="hero-annual">
              年度听歌报告<span class="hero-annual-arrow">→</span>
            </router-link>
          </div>
          <!-- 关注 / 已关注：仅登录且非本人时出现，初始状态取 /user/detail 的 profile.followed -->
          <div class="hero-side" v-if="canFollow">
            <button class="followBtn" :class="{ 'is-followed': followed }" :disabled="followPending"
                    :title="followed ? '点击取消关注' : '关注 TA'" @click="toggleFollow">
              <i v-if="followPending" class="el-icon-loading"></i>
              <template v-else-if="followed">已关注</template>
              <template v-else>关注</template>
            </button>
          </div>
        </div>
        <section class="ud-section ud-card">
          <h2>听歌排行</h2>
          <el-tabs v-if="weekTracksData.length||allTracksData.length" v-model="listenedAcName">
            <el-tab-pane label="最近一周" name="week"><TracksLayout :list="weekTracksData"/></el-tab-pane>
            <el-tab-pane label="所有时间" name="all"><TracksLayout :list="allTracksData"/></el-tab-pane>
          </el-tabs>
          <p v-else class="empty-text">未公开</p>
        </section>
        <section v-if="uid===loginInfo.userId" class="ud-section ud-card">
          <h2>云盘与收藏</h2>
          <el-tabs v-model="favorsAcName">
            <el-tab-pane label="云盘" name="cloud"><TracksLayout :list="cloudTracks"/></el-tab-pane>
            <el-tab-pane label="专辑" name="album"><AlbumLayout :list="favors.albums"/></el-tab-pane>
            <el-tab-pane label="歌手" name="artists"><ArtistLayout :list="favors.artists"/></el-tab-pane>
            <el-tab-pane label="视频" name="videos"><VideoLayout :list="favors.vids"/></el-tab-pane>
          </el-tabs>
        </section>
        <section class="ud-section ud-card">
          <h2>
            歌单
            <!-- 导入外部歌单（仅本人）：只有登录态才有写入权限，入口也只在自己主页出现 -->
            <el-button v-if="isSelf" class="import-btn" size="mini" round @click="importVisible = true">
              导入外部歌单
            </el-button>
          </h2>
          <div v-if="favorTracks.length"><h3>喜欢</h3><PlaylistLayout :list="favorTracks" pic-name="coverImgUrl"/></div>
          <div v-if="createList.length"><h3>创建</h3><PlaylistLayout :list="createList" pic-name="coverImgUrl"/></div>
          <div v-if="subList.length"><h3>收藏</h3><PlaylistLayout :list="subList" pic-name="coverImgUrl"/></div>
          <p v-if="!favorTracks.length&&!createList.length&&!subList.length" class="empty-text">未公开</p>
        </section>
        <section ref="socialSection" class="ud-section ud-card">
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
                <FollowMixedLayout v-if="mixed.list.length" :list="mixed.list"/>
                <p v-else class="empty-text">{{ mixedEmptyText }}</p>
                <LoadMore v-if="mixed.list.length" :loading="mixed.loading"
                          :noMore="mixed.noMore" :load="loadMixed" noMoreText="没有更多了"/>
              </template>
              <template v-else>
                <UserListLayout v-if="social.follows.list.length" :list="social.follows.list"/>
                <p v-else class="empty-text">{{ socialEmptyText('follows') }}</p>
                <LoadMore v-if="social.follows.list.length" :loading="social.follows.loading"
                          :noMore="social.follows.noMore" :load="loadFollows" noMoreText="没有更多了"/>
              </template>
            </el-tab-pane>
            <el-tab-pane :label="socialLabels.followeds" name="followeds" lazy>
              <UserListLayout v-if="social.followeds.list.length" :list="social.followeds.list" mode="followeds"/>
              <p v-else class="empty-text">{{ socialEmptyText('followeds') }}</p>
              <p v-if="social.followeds.cap" class="cap-hint">接口只返回最近的前 30 位粉丝，更早的粉丝暂时取不到</p>
              <LoadMore v-if="social.followeds.list.length" :loading="social.followeds.loading"
                        :noMore="social.followeds.noMore" :load="loadFolloweds" noMoreText="没有更多了"/>
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
import PlaylistLayout from "@/components/layout/PlaylistLayout";
import TracksLayout from "@/components/layout/TracksLayout";
import AlbumLayout from "@/components/layout/AlbumLayout";
import ArtistLayout from "@/components/layout/ArtistLayout";
import VideoLayout from "@/components/layout/VideoLayout";
import UserListLayout from "@/components/layout/UserListLayout";
import FollowMixedLayout from "@/components/layout/FollowMixedLayout";
import VipBadge from "@/components/userPage/VipBadge";
import LoadMore from "@/components/LoadMore";
import CoverImage from "@/components/common/CoverImage";
import PlaylistImportDialog from "@/components/common/PlaylistImportDialog";
import * as User from "@/api/User";
import * as userDetailApi from "@/api/UserDetail";
import * as authApi from "@/api/auth";
import { getAreaName, getCityName } from "@/utils/areaCode";
import { formatMs, followSpanText } from "@/utils/filters";
import { getIpLocation, maskIP } from "@/utils/ipLocation";
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
  components: {PlaylistLayout, TracksLayout, AlbumLayout, ArtistLayout, VideoLayout, UserListLayout, FollowMixedLayout, LoadMore, CoverImage, VipBadge, PlaylistImportDialog},
  props: { uid: { required: true } },
  data() {
    return {
      userInfo: {}, favorTracks: [], createList: [], subList: [],
      // 导入外部歌单弹窗开关（仅本人可开）
      importVisible: false,
      weekTracksData: [], allTracksData: [], listenedAcName: "week", favorsAcName: "cloud",
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
      followPending: false,
    }
  },
  computed: {
    profile() { return this.userInfo.profile },
    loginInfo() { return this.$store.state.UserAbout.profile },
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
    isLogin() {
      return this.$store.getters["UserAbout/isLogin"]
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
    }
  },
  methods: {
    getUserInfo(uid) {
      return userDetailApi.detail(uid).then(res => {
        this.userInfo = res.data
        if (res.data.profile) {
          const p = res.data.profile
          // 关注状态直接取自详情接口，省一次额外请求
          this.followed = !!p.followed
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
            // 粉丝数做本地即时反馈（服务端为准，刷新后会校正）
            const p = this.profile
            if (p && p.followeds != null) this.$set(p, 'followeds', Math.max(0, p.followeds + (on ? 1 : -1)))
            this.$message.success(on ? '已关注' : '已取消关注')
          } else if (code === 301 || code === 302) {
            // 网关对未登录/失效 cookie 分别回 301「未登录」和 302「系统错误」
            this.$message.warning('登录态已失效，请重新登录后再试')
          } else {
            this.$message.error('操作失败，请稍后重试')
          }
        })
        .catch(() => this.$message.error('网络错误，操作失败'))
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
        h('p', { style: 'margin:0' }, `取消后你将不再关注「${name}」。`),
        ...rows,
      ])
      this.$confirm(message, '取消关注', {
        confirmButtonText: '仍然取消',
        cancelButtonText: '继续关注',
        type: 'warning',
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
      if (kind === 'follows' && this.useMixedFollow) this.loadMixed()
      else this.loadSocial(kind)
      this.$nextTick(() => {
        const el = this.$refs.socialSection
        if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    },
    /**
     * 别处删了歌单（歌单详情页）：本人主页要重拉，他人主页不涉及。
     * 只重拉歌单区而不是 loadPage —— 排行榜/云盘/关注都没变，没必要全量重取
     */
    onPlaylistDeleted() {
      if (this.isSelf) this.reloadPlaylists()
    },
    handleThisTracksData(tracks, target) {
      tracks.forEach(l => { l.song.recordPlayCount = l.playCount; target.push(l.song) })
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
      const p2 = isSelf
        ? Promise.all([
            this.getRecentTracks(uid), this.getRecentTracks(uid, 0)
          ]).then(([week, all]) => {
            this.handleThisTracksData(week.data.weekData, this.weekTracksData)
            this.handleThisTracksData(all.data.allData, this.allTracksData)
          }).catch(() => {
            this.weekTracksData = []
            this.allTracksData = []
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
    },
    layout() {
      this.$nextTick(() => {
        const el = this.$el.querySelector('.tracksContainer')
        if (el && el.querySelector('.tracks')) {
          el.style.height = el.querySelector('.tracks').clientHeight * 8 + 'px'
          el.style.overflow = 'auto'
        }
      })
    }
  },
  mounted() {
    if (this.uid) this.loadPage()
    // 歌单详情页删歌单后广播：本页被 keep-alive 缓存，返回时不会重新 mounted，只能靠事件刷新
    this.$bus.$on('playlistDeleted', this.onPlaylistDeleted)
  },
  beforeDestroy() {
    this.$bus.$off('playlistDeleted', this.onPlaylistDeleted)
  },
  updated() { this.layout() }
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
  .hero-name { font-size: 28px; font-weight: 700; color: $font-black; margin: 0 0 8px; display: flex; align-items: center; gap: 8px; i { display: inline-block; font-size: 18px; line-height: 1; flex-shrink: 0; } i.el-icon-male { color: #47a1ce; } i.el-icon-female { color: #ff86b6; } }
  .hero-sig { font-size: 14px; color: $font-black-1; margin: 0 0 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; max-width: 460px; }
  .hero-meta { display: flex; gap: 20px; font-size: 13px; color: $font-black-1; margin: 0; }
  // 关注/粉丝可点，跳转到页面底部的关注与粉丝区块
  .hero-stat {
    cursor: pointer;
    transition: color .2s;
    &:hover { color: $color-main; text-decoration: underline; }
  }
  .hero-login { margin: 12px 0 0; font-size: 12px; color: $font-black-2; display: flex; gap: 16px; flex-wrap: wrap; padding-top: 12px; border-top: 1px solid rgba(0,0,0,.05); }
  // 年度听歌报告入口（仅本人）
  // 用实心主色：hero 背景是头像模糊渐变（深浅不定），半透明底会糊掉
  .hero-annual {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 14px;
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

  // 关注按钮贴右侧
  .hero-side { margin-left: auto; flex-shrink: 0; }
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

    &:disabled { opacity: .6; cursor: default; }
  }
}

/* ---------- Section 卡片 ---------- */
.ud-section {
  margin-bottom: 28px;
  h2 { font-size: 20px; font-weight: 700; color: $font-black; margin: 0 0 18px; display: flex; align-items: center; }
  // 标题右侧的操作入口（导入外部歌单）：h2 是 flex，margin-left:auto 推到最右
  h2 .import-btn { margin-left: auto; font-size: 12px; font-weight: 500; }
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

.ud-card {
  padding: 28px 32px;
  border-radius: 24px;
  background: rgba(255,255,255,.55);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border: 1px solid rgba(255,255,255,.45);
  box-shadow: 0 12px 40px rgba(0,0,0,.06);
}

/* ---------- 美化滚动条 ---------- */
::v-deep .tracksContainer {
  max-height: 520px;
  overflow-y: auto;
  padding-right: 6px;
  scrollbar-width: thin;
  scrollbar-color: rgba(0,0,0,.12) transparent;
  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(0,0,0,.12); border-radius: 3px; }
  &::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,.2); }
}

/* ---------- 听歌排行/云盘：播放次数+文件大小 字体样式 & 垂直居中平齐 ---------- */
// 根因：el-col 默认 align-items:stretch，内容靠 margin-top 偏下，封面 img/文字/数字高度各异 → 不平齐
// 修复：把各 el-col 变成内部 flex 容器居中内容；去掉 margin-top；播放次数/文件大小加左边距保持距离
::v-deep .tracksContainer .tracks .tracks-wrap {
  display: flex;
  align-items: stretch;          // el-col 等高撑满 tracks-wrap 高度
}
// 每个 el-col 自身变成 flex 容器，内容垂直居中（基准线对齐）
::v-deep .tracksContainer .tracks .tracks-wrap .coverImg,
::v-deep .tracksContainer .tracks .tracks-wrap .name-artist,
::v-deep .tracksContainer .tracks .tracks-wrap .album,
::v-deep .tracksContainer .tracks .tracks-wrap .duration,
::v-deep .tracksContainer .tracks .tracks-wrap .playCount,
::v-deep .tracksContainer .tracks .tracks-wrap .fileSize {
  display: flex;
  align-items: center;          // 内容在 el-col 内垂直居中 → 所有列基线平齐
}
// 去掉 margin-top（原本靠它偏下，现在由 align-items:center 取代）
::v-deep .tracksContainer .tracks .tracks-wrap .name-artist { padding: 0; }
::v-deep .tracksContainer .tracks .tracks-wrap .name-artist .name,
::v-deep .tracksContainer .tracks .tracks-wrap .name-artist .artist { margin: 0; }
::v-deep .tracksContainer .tracks .tracks-wrap .album { padding: 0; margin: 0; }
::v-deep .tracksContainer .tracks .tracks-wrap .duration { padding: 0; margin: 0; }
// 播放次数/文件大小：字体样式 + 左边距与时长保持距离
::v-deep .tracksContainer .tracks .tracks-wrap .playCount,
::v-deep .tracksContainer .tracks .tracks-wrap .fileSize {
  font-size: .8rem;
  color: $font-black-1;
  white-space: nowrap;
  padding-left: .6rem;          // 与时长列保持距离
  box-sizing: border-box;
}
// 封面列不压缩
::v-deep .tracksContainer .tracks .tracks-wrap .coverImg { flex-shrink: 0; }
/* fileSize 计算公式（÷1024）需要在 TracksLayout.vue 模板改一行，
   此处仅保留字体样式，CSS 无法覆盖内联文本内容 */

::v-deep .gridLayout {
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) !important;
  gap: 20px;
  max-height: calc(280px*2 + 20px);
  overflow-y: auto;
  padding-right: 6px;
  scrollbar-width: thin;
  scrollbar-color: rgba(0,0,0,.12) transparent;
  &::-webkit-scrollbar { width: 5px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(0,0,0,.12); border-radius: 3px; }
  &::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,.2); }
}
::v-deep .gridLayout li { padding: 0 !important; }

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
