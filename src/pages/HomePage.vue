<template>
  <div class="homePage">
    <!--每日推荐-->
    <template v-if="isLogin">
      <!-- Hero 双栏: 每日推荐 + 私人FM -->
      <transition name="fade-slide" mode="out-in">
        <div v-if="!personalLoading" key="content" class="hero-section">
          <!-- 每日推荐大卡片 -->
          <div class="daily-area">
            <div class="wrapper-for-click-event" @click="goDailySongs">
              <el-row v-if="dailySongs[0]" :style="{backgroundImage:`url('${dailySongs[0].al.picUrl}')`}" class="daily-card">
                <el-col :span="24" class="text">
                  <div class="daily-title">
                    <span class="line">每日</span>
                    <span class="line">推荐</span>
                  </div>
                </el-col>
                <el-col :span="24" class="play-tracks-btn">
                  <div class="btn-container">
                    <playTracksBtn :val="dailySongs" expand/>
                  </div>
                </el-col>
              </el-row>
            </div>
          </div>
          <!-- 私人FM沉浸式区域 -->
          <div class="personal-fm-area">
            <div class="wrapper-for-click-event" @click="playPersonalFM">
              <PersonalFM ref="personalFM" :list="personalFM"/>
            </div>
          </div>
        </div>
        <div v-else key="skeleton" class="hero-section">
          <div class="daily-area"><div class="rec-skeleton-block skeleton-item"></div></div>
          <div class="personal-fm-area"><div class="rec-skeleton-block skeleton-item"></div></div>
        </div>
      </transition>
      <!--每日推荐-推荐歌单-->
      <el-row>
        <h2>每日推荐-推荐歌单</h2>
        <transition name="fade-slide" mode="out-in">
          <GridSkeleton v-if="personalLoading || !personalReady" key="skeleton" type="playlist" :count="5" :title="false"/>
          <PlaylistLayout v-else key="content" :list="personalPlaylist" pic-name="picUrl"/>
        </transition>
      </el-row>
    </template>

    <!--网友精选碟-->
    <div class="topPlayList home-module">
      <el-row>
        <h2>网友精选碟</h2>
        <transition name="fade-slide" mode="out-in">
          <GridSkeleton v-if="discLoading || !discReady" key="skeleton" type="playlist" :count="5" :title="false"/>
          <PlaylistLayout v-else key="content" :list="netizensFeaturedDiscs" pic-name="coverImgUrl"/>
        </transition>
      </el-row>
    </div>
    <!--最新专辑-->
    <div class="topAlbum home-module">
      <el-row>
        <h2>最新专辑</h2>
        <transition name="fade-slide" mode="out-in">
          <GridSkeleton v-if="albumLoading || !albumReady" key="skeleton" type="album" :count="5" :title="false"/>
          <AlbumLayout v-else key="content" :list="albums"/>
        </transition>
      </el-row>
    </div>
    <!--推荐歌单（已登录时与"每日推荐-推荐歌单"重复, 不额外显示）-->
    <div v-if="!isLogin" class="recommendedPlaylist home-module">
      <h2>推荐歌单</h2>
      <transition name="fade-slide" mode="out-in">
        <GridSkeleton v-if="playlistLoading || !playlistReady" key="skeleton" type="playlist" :count="5" :title="false"/>
        <PlaylistLayout v-else key="content" :list="recommendedPlaylist"/>
      </transition>
    </div>
    <!--热门歌手-->
    <div class="hotArtists home-module">
      <h2>热门歌手</h2>
      <transition name="fade-slide" mode="out-in">
        <GridSkeleton v-if="artistLoading || !artistReady" key="skeleton" type="artist" :count="5" :title="false"/>
        <ArtistLayout v-else key="content" :list="hotArtists"/>
      </transition>
    </div>
    <!--获取排行榜-->
    <div class="lists home-module">
      <el-row>
        <h2>排行榜</h2>
        <transition name="fade-slide" mode="out-in">
          <GridSkeleton v-if="rankLoading || !rankReady" key="skeleton" type="rank" :count="6" :title="false"/>
          <div v-else key="content">
            <el-col v-for="l in lists" :key="l.id" :span="4">
          <div class="topList" @click="plClk(l.id)">
            <el-card :body-style="{ padding: 0 }" shadow="never">
              <div class="img-wrapper" style="aspect-ratio:1;overflow:hidden">
                <img :src="l.coverImgUrl"
                     class="image">
              </div>
              <div class="info">
                <p class="listName">{{ l.name }}</p>
                <p class="updateFrequency">{{ l.updateFrequency }}</p>
              </div>
            </el-card>
          </div>
        </el-col>
          </div>
        </transition>
      </el-row>
    </div>

    <router-view/>
  </div>
</template>

<script>
import PlaylistLayout from "@/components/layout/PlaylistLayout";
import AlbumLayout from "@/components/layout/AlbumLayout";
import ArtistLayout from "@/components/layout/ArtistLayout";

import PersonalFM from "@/components/PersonalFM";
import GridSkeleton from "@/components/Skeleton/GridSkeleton";

import playTracksBtn from "@/components/playTracksBtn";

import {normalizeTrack, normalizePlaylist, normalizeArtist} from "@/utils/normalize";

export default {
  name: "HomePage",
  data() {
    return {
      recommendedPlaylist: [],
      netizensFeaturedDiscs: [],
      albums: [],
      hotArtists: [],
      lists: [],
      personalPlaylist: [],
      personalFM: [],
      dailySongs: [],
      playlistLoading: true,
      discLoading: true,
      albumLoading: true,
      artistLoading: true,
      rankLoading: true,
      personalLoading: true,
      discReady: false,
      albumReady: false,
      artistReady: false,
      rankReady: false,
      personalReady: false,
      playlistReady: false,
    }
  },
  components: {PlaylistLayout, AlbumLayout, ArtistLayout, PersonalFM, GridSkeleton, playTracksBtn},
  computed: {
    isLogin() {
      return this.$store.getters["UserAbout/isLogin"];
    }
  },
  methods: {
    //歌单点击
    plClk(id) {
      this.$bus.$emit('plClk', id)
    },
    //专辑点击
    alClk(id) {
      ///album?id=32311
      this.$bus.$emit('alClk', id)
    },
    //歌手点击
    arClk(id) {
      this.$bus.$emit('arClk', id)
    },
    //请求推荐歌单
    getRecPlaylist() {
      return this.$axios('/personalized?limit=10')
    },
    //请求网友精选碟
    getTopPlaylist() {
      return this.$axios('/top/playlist?limit=10')
    },
    //请求本周最新专辑
    getNewAlbum() {
      return this.$axios('/album/newest')
    },
    //请求热门歌手
    getTopAt() {
      return this.$axios('/top/artists?limit=10')
    },
    //获取榜单
    getTopList() {
      return this.$axios('/toplist/detail')
    },
    //限制数据量
    limitNum(arr, num, callback) {
      arr.map((el, i) => {
        if (i < num) {
          callback(el)
        }
      })
    },
    getPersonalPlaylist() {
      return this.$axios('/recommend/resource')
    },
    getPersonalFM() {
      return this.$axios('/personal_fm', {params: {t: new Date().getTime()}})
    },
    getDailySongs() {
      return this.$axios('/recommend/songs')
    },
    revealAfterImages(selector, readyKey) {
      const el = this.$el.querySelector(selector)
      if (!el) { this[readyKey] = true; return }
      const imgs = el.querySelectorAll('img')
      if (!imgs.length) { this[readyKey] = true; return }
      let pending = imgs.length
      const done = () => { pending--; if (pending <= 0) this[readyKey] = true }
      imgs.forEach(img => {
        if (img.complete) done()
        else { img.addEventListener('load', done, { once: true }); img.addEventListener('error', done, { once: true }) }
      })
      setTimeout(() => { if (pending > 0) { pending = 0; this[readyKey] = true } }, 3000)
    },
    goDailySongs() {
      console.log('goDailySongs');
      //路由到每日推荐界面
      this.$router.push({
        name: "dailySongs",
        params: {
          dailySongs: JSON.stringify(this.dailySongs),
        }
      })
    },
    playPersonalFM() {
      //更新私人FM 标志
      this.$store.state.TracksAbout.isPersonalFM = true
      //初次播放私人FM
      this.getPersonalFM().then(res => {
        this.personalFM = res.data.data
      })
      this.$refs.personalFM.$emit('initPlay')
    },
    concurrentRequests() {
      //请求不许登录
      this.$axios.all([this.getRecPlaylist(), this.getTopPlaylist(), this.getNewAlbum(), this.getTopAt(), this.getTopList(),])
          .then(this.$axios.spread((RecPlaylist, TopPlaylist, NewAlbum, TopAt, TopList) => {
            this.recommendedPlaylist = (RecPlaylist.data.result || []).map(normalizePlaylist)
            this.playlistLoading = false
            this.$nextTick(() => this.revealAfterImages('.recommendedPlaylist', 'playlistReady'))
            this.netizensFeaturedDiscs = (TopPlaylist.data.playlists || []).map(normalizePlaylist)
            this.discLoading = false
            this.$nextTick(() => this.revealAfterImages('.topPlayList', 'discReady'))
            this.limitNum(NewAlbum.data.albums, 10, el => this.albums.push(el))
            this.albumLoading = false
            this.$nextTick(() => this.revealAfterImages('.topAlbum', 'albumReady'))
            this.hotArtists = (TopAt.data.artists || []).map(normalizeArtist)
            this.artistLoading = false
            this.$nextTick(() => this.revealAfterImages('.hotArtists', 'artistReady'))
            this.limitNum(TopList.data.list, 6, el => this.lists.push(el))
            this.rankLoading = false
            this.$nextTick(() => this.revealAfterImages('.lists', 'rankReady'))
          }))

      //请求需要登录
      this.$axios.all([this.getPersonalPlaylist(), this.getPersonalFM(), this.getDailySongs()])
          .then(this.$axios.spread((personalPlaylist, personalFM, dailySongs) => {
            this.limitNum(personalPlaylist.data.recommend,5,item=>this.personalPlaylist.push(normalizeTrack(item)))
            this.personalLoading = false
            this.$nextTick(() => this.revealAfterImages('.recTracks-personalFM + .el-row', 'personalReady'))
            this.personalFM = personalFM.data.data
            this.dailySongs = (dailySongs.data.data.dailySongs || []).map(normalizeTrack)
          }))
    }
  },
  beforeMount() {
    this.concurrentRequests()
  }

}
</script>

<style lang="scss">
@import "src/assets/scss/homepage";
</style>