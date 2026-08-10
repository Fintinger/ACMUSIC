<template>
  <div class="userDetail">
    <transition name="detail-fade">
      <div v-if="pageLoading" class="ud-full-skel" key="skel">
        <div class="skel-hero-row"><div class="skel-avatar"></div><div class="skel-lines"><div class="skel-line skel-line--lg"></div><div class="skel-line skel-line--md"></div></div></div>
        <div v-for="n in 3" :key="n" class="skel-section"><div class="skel-sec-title"></div><div class="skel-grid"><div v-for="m in 4" :key="m" class="skel-card"><div class="skel-card-img"></div><div class="skel-card-line"></div></div></div></div>
      </div>
      <div v-else key="content" class="ud-content">
        <div class="user-hero" v-if="profile">
          <div class="hero-avatar"><img :src="profile.avatarUrl" alt=""></div>
          <div class="hero-info">
            <h1 class="hero-name">{{ profile.nickname }}<i v-if="profile.gender===1" class="el-icon-male"></i><i v-if="profile.gender===2" class="el-icon-female"></i></h1>
            <p class="hero-sig" v-if="profile.signature" :title="profile.signature">{{ profile.signature }}</p>
            <p class="hero-meta">
              <span v-if="locationName">📍 {{ locationName }}</span>
              <span>{{ profile.follows }} 关注</span><span>{{ profile.followeds }} 粉丝</span>
            </p>
          </div>
        </div>
        <section class="ud-section">
          <h2>听歌排行</h2>
          <el-tabs v-if="weekTracksData.length||allTracksData.length" v-model="listenedAcName">
            <el-tab-pane label="最近一周" name="week"><TracksLayout :list="weekTracksData"/></el-tab-pane>
            <el-tab-pane label="所有时间" name="all"><TracksLayout :list="allTracksData"/></el-tab-pane>
          </el-tabs>
          <p v-else class="empty-text">未公开</p>
        </section>
        <section v-if="uid===loginInfo.userId" class="ud-section">
          <h2>云盘与收藏</h2>
          <el-tabs v-model="favorsAcName">
            <el-tab-pane label="云盘" name="cloud"><TracksLayout :list="cloudTracks"/></el-tab-pane>
            <el-tab-pane label="专辑" name="album"><AlbumLayout :list="favors.albums"/></el-tab-pane>
            <el-tab-pane label="歌手" name="artists"><ArtistLayout :list="favors.artists"/></el-tab-pane>
            <el-tab-pane label="视频" name="videos"><VideoLayout :list="favors.vids"/></el-tab-pane>
          </el-tabs>
        </section>
        <section class="ud-section">
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

export default {
  name: "UserDetailLayout",
  components: {PlaylistLayout, TracksLayout, AlbumLayout, ArtistLayout, VideoLayout},
  props: { uid: { required: true } },
  data() {
    return {
      userInfo: {}, favorTracks: [], createList: [], subList: [],
      weekTracksData: [], allTracksData: [], listenedAcName: "week", favorsAcName: "cloud",
      cloudTracks: [], favors: { vids: [], artists: [], albums: [] },
      locationName: '', pageLoading: true,
    }
  },
  computed: {
    profile() { return this.userInfo.profile },
    loginInfo() { return this.$store.state.UserAbout.profile },
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
      await Promise.all([this.getUserInfo(uid), p1, p2, p3, p4])
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

.user-hero {
  display: flex; align-items: center; gap: 28px; padding: 40px 0; margin-bottom: 20px;
  .hero-avatar { flex-shrink: 0; width: 120px; height: 120px; border-radius: 50%; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,.1); img { width: 100%; height: 100%; object-fit: cover; } }
  .hero-name { font-size: 28px; font-weight: 700; color: $font-black; margin: 0 0 8px; display: flex; align-items: center; gap: 8px; i { display: inline-block; font-size: 18px; line-height: 1; flex-shrink: 0; } i.el-icon-male { color: #47a1ce; } i.el-icon-female { color: #ff86b6; } }
  .hero-sig { font-size: 14px; color: $font-black-2; margin: 0 0 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; max-width: 400px; }
  .hero-meta { display: flex; gap: 20px; font-size: 13px; color: $font-black-2; margin: 0; }
}

.ud-section {
  margin-bottom: 40px;
  h2 { font-size: 20px; font-weight: 700; color: $font-black; margin: 0 0 18px; }
  h3 { font-size: 16px; font-weight: 600; color: $font-black-1; margin: 20px 0 14px; }
  .empty-text { color: $font-black-2; font-size: 14px; padding: 20px 0; }
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

::v-deep .tracksContainer { max-height: 480px; overflow-y: auto; }
::v-deep .gridLayout { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) !important; gap: 20px; max-height: calc(280px*2 + 20px); overflow-y: auto; }
::v-deep .gridLayout li { padding: 0 !important; }
</style>
