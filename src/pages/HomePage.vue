<template>
  <div class="homePage">
    <!--轮播图-->
    <!--    <div class="carousel">
          <el-row>
            <el-col :span="24">
              <el-carousel :autoplay="false" indicator-position="outside" type="card">
                <el-carousel-item v-for="(b,ind) in banners" :key="ind">
                  <div class="bannerPic" @click="carouselClick(b)">
                    <img :src="b.imageUrl" alt="">
                    <span :style={background:b.titleColor} v-text="b.typeTitle"></span>
                  </div>
                </el-carousel-item>
              </el-carousel>
            </el-col>
          </el-row>
        </div>-->
    <!--每日推荐-->
    <template v-if="isLogin">
      <!--每日推荐-推荐歌曲X每日推荐-私人FM-->
      <el-row :gutter="50" class="recTracks-personalFM">
        <el-col :span="12" class="recTracks">
          <div class="wrapper-for-click-event" @click="goDailySongs">
            <el-row v-if="dailySongs[0]" :style="{backgroundImage:`url('${dailySongs[0].al.picUrl}')`}">
              <el-col :span="12" class="text row-col-center"><span>每日推荐</span></el-col>
              <el-col :span="12" class="play-tracks-btn">
                <div class="btn-container">
                  <playTracksBtn :val="dailySongs"/>
                </div>
              </el-col>
            </el-row>
          </div>
        </el-col>
        <el-col :span="12" class="personalFM">
          <div class="wrapper-for-click-event"  @click="playPersonalFM">
            <el-row>
              <PersonalFM ref="personalFM" :list="personalFM"/>
            </el-row>
          </div>
        </el-col>
      </el-row>
      <!--每日推荐-推荐歌单-->
      <el-row>
        <h2>每日推荐-推荐歌单</h2>
        <PlaylistLayout :list="personalPlaylist" pic-name="picUrl"/>
      </el-row>
    </template>

    <!--网友精选碟-->
    <div class="topPlayList">
      <el-row>
        <h2>网友精选碟</h2>
        <PlaylistLayout :list="netizensFeaturedDiscs" pic-name="coverImgUrl"/>
      </el-row>
    </div>
    <!--最新专辑-->
    <div class="topAlbum">
      <el-row>
        <h2>最新专辑</h2>
        <AlbumLayout :list="albums"/>
      </el-row>
    </div>
    <!--推荐歌单-->
    <div class="recommendedPlaylist">
      <h2>推荐歌单</h2>
      <PlaylistLayout :list="recommendedPlaylist"/>
    </div>
    <!--热门歌手-->
    <div class="hotArtists">
      <h2>热门歌手</h2>
      <ArtistLayout :list="hotArtists"/>
    </div>
    <!--获取排行榜-->
    <div class="lists">
      <el-row>
        <h2>排行榜</h2>
        <el-col v-for="l in lists" :key="l.id" :span="4">
          <div class="topList" @click="plClk(l.id)">
            <el-card :body-style="{ padding: 0 }" shadow="never">
              <div class="img-wrapper">
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

import playTracksBtn from "@/components/playTracksBtn";

export default {
  name: "HomePage",
  data() {
    return {
      banners: [],
      recommendedPlaylist: [],
      netizensFeaturedDiscs: [],
      albums: [],
      hotArtists: [],
      lists: [],
      personalPlaylist: [],
      personalFM: [],
      dailySongs: []
    }
  },
  components: {PlaylistLayout, AlbumLayout, ArtistLayout, PersonalFM, playTracksBtn},
  computed: {
    isLogin() {
      return this.$store.getters["UserAbout/isLogin"];
    }
  },
  methods: {
    //轮播图点击
    carouselClick(i) {
      /*targetType(不是歌单类的处理)
      * 3000=>数字专辑,有url跳转
      * 1=>新歌首发,有targetId
      * 10=>新碟首发,有targetId
      * */
      console.log(i);
    },
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
    //请求banner
    /*  getBanner(){
        return this.$axios('./banner')
      },*/
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
            // 推荐歌单
            this.recommendedPlaylist = RecPlaylist.data.result
            // 网友精选碟
            this.netizensFeaturedDiscs = TopPlaylist.data.playlists
            // 本周最新专辑
            this.limitNum(NewAlbum.data.albums, 10, el => this.albums.push(el))
            // 热门歌手
            this.hotArtists = TopAt.data.artists
            // 获取榜单
            this.limitNum(TopList.data.list, 6, el => this.lists.push(el))
          }))

      //请求需要登录
      this.$axios.all([this.getPersonalPlaylist(), this.getPersonalFM(), this.getDailySongs()])
          .then(this.$axios.spread((personalPlaylist, personalFM, dailySongs) => {
            //每日推荐歌单
            this.limitNum(personalPlaylist.data.recommend,5,item=>this.personalPlaylist.push(item))
            // this.personalPlaylist = personalPlaylist.data.recommend
            //私人FM
            this.personalFM = personalFM.data.data
            //每日推荐歌曲
            this.dailySongs = dailySongs.data.data.dailySongs
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