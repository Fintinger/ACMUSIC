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
          <div class="hero-avatar"><img :src="profile.avatarUrl" alt=""></div>
          <div class="hero-info">
            <h1 class="hero-name">{{ profile.nickname }}<i v-if="profile.gender===1" class="el-icon-male"></i><i v-if="profile.gender===2" class="el-icon-female"></i></h1>
            <p class="hero-sig" v-if="profile.signature" :title="profile.signature">{{ profile.signature }}</p>
            <p class="hero-meta">
              <span v-if="locationName">📍 {{ locationName }}</span>
              <span>{{ profile.follows }} 关注</span><span>{{ profile.followeds }} 粉丝</span>
            </p>
            <p class="hero-login" v-if="isSelf && loginInfoText">
              <span v-if="lastLoginInfo.location">最近登录于 {{ lastLoginInfo.location }}</span>
              <span v-else-if="lastLoginInfo.IP">最近登录 IP {{ lastLoginInfo.IP }}</span>
              <span v-if="loginTimeText">{{ loginTimeText }}</span>
            </p>
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
          <h2>歌单</h2>
          <div v-if="favorTracks.length"><h3>喜欢</h3><PlaylistLayout :list="favorTracks" pic-name="coverImgUrl"/></div>
          <div v-if="createList.length"><h3>创建</h3><PlaylistLayout :list="createList" pic-name="coverImgUrl"/></div>
          <div v-if="subList.length"><h3>收藏</h3><PlaylistLayout :list="subList" pic-name="coverImgUrl"/></div>
          <p v-if="!favorTracks.length&&!createList.length&&!subList.length" class="empty-text">未公开</p>
        </section>
      </div>
    </transition>
  </div>
</template>

<script>
import PlaylistLayout from "@/components/layout/PlaylistLayout";
import TracksLayout from "@/components/layout/TracksLayout";
import AlbumLayout from "@/components/layout/AlbumLayout";
import ArtistLayout from "@/components/layout/ArtistLayout";
import VideoLayout from "@/components/layout/VideoLayout";
import * as User from "@/api/User";
import { getAreaName, getCityName } from "@/utils/areaCode";
import { formatMs } from "@/utils/filters";
import { getIpLocation } from "@/utils/ipLocation";
import coverLight from "@/mixins/coverLight";

export default {
  name: "UserDetailLayout",
  mixins: [coverLight],
  components: {PlaylistLayout, TracksLayout, AlbumLayout, ArtistLayout, VideoLayout},
  props: { uid: { required: true } },
  data() {
    return {
      userInfo: {}, favorTracks: [], createList: [], subList: [],
      weekTracksData: [], allTracksData: [], listenedAcName: "week", favorsAcName: "cloud",
      cloudTracks: [], favors: { vids: [], artists: [], albums: [] },
      locationName: '', pageLoading: true,
      lastLoginInfo: { time: "", IP: "", location: "" },
    }
  },
  computed: {
    profile() { return this.userInfo.profile },
    loginInfo() { return this.$store.state.UserAbout.profile },
    isSelf() { return this.uid === this.loginInfo.userId },
    loginTimeText() {
      return this.lastLoginInfo.time ? formatMs(this.lastLoginInfo.time, 'YYYY年MM月DD日 HH:mm') : ''
    },
    loginInfoText() {
      return !!(this.lastLoginInfo.location || this.lastLoginInfo.IP || this.loginTimeText)
    }
  },
  methods: {
    getUserInfo(uid) {
      return this.$axios('/user/detail', {params: {uid}}).then(res => {
        this.userInfo = res.data
        if (res.data.profile) {
          const p = res.data.profile
          const prov = getAreaName(p.province)
          const city = getCityName(p.city||p.province)
          this.locationName = [prov,city].filter(Boolean).join(' · ')
        }
      })
    },
    getPlaylist(uid) { return this.$axios('/user/playlist', {params: {uid, limit: 2000}}) },
    getRecentTracks(uid, type = 1) { return this.$axios('/user/record', {params: {uid, type}}) },
    handleThisTracksData(tracks, target) {
      tracks.forEach(l => { l.song.recordPlayCount = l.playCount; target.push(l.song) })
    },
    async loadPage() {
      this.pageLoading = true
      const uid = this.uid
      const p1 = this.getPlaylist(uid).then(res => {
        res.data.playlist.forEach((pl) => {
          if (pl.creator.userId*1 === uid*1) this.createList.push(pl)
          else this.subList.push(pl)
        })
        if (res.data.playlist[0]) this.favorTracks.push(res.data.playlist[0])
      })
      const isSelf = uid === this.loginInfo.userId
      // 本人: 补充最近登录信息(IP→位置, 时间戳→日期)
      const p5 = isSelf
        ? this.$axios('/login/status').then(res => {
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
      await Promise.all([this.getUserInfo(uid), p1, p2, p3, p4, p5])
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
  mounted() { if (this.uid) this.loadPage() },
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
  .hero-login { margin: 12px 0 0; font-size: 12px; color: $font-black-2; display: flex; gap: 16px; flex-wrap: wrap; padding-top: 12px; border-top: 1px solid rgba(0,0,0,.05); }
}

/* ---------- Section 卡片 ---------- */
.ud-section {
  margin-bottom: 28px;
  h2 { font-size: 20px; font-weight: 700; color: $font-black; margin: 0 0 18px; display: flex; align-items: center; }
  h2::before {
    content: ''; display: inline-block; width: 4px; height: 18px;
    border-radius: 2px; background: $color-main; margin-right: 12px; flex-shrink: 0;
  }
  h3 { font-size: 16px; font-weight: 600; color: $font-black-1; margin: 20px 0 14px; }
  .empty-text { color: $font-black-2; font-size: 14px; padding: 20px 0; }
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
