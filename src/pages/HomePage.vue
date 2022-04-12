<template>
  <div class="homePage">
    <!--轮播图-->
    <div class="carousel">
      <el-row>
        <el-col :span="24">
          <el-carousel indicator-position="outside" type="card">
            <el-carousel-item v-for="(b,ind) in banners" :key="ind">
              <div class="bannerPic">
                <img :src="b.imageUrl" alt="">
                <span :style={background:b.titleColor} v-text="b.typeTitle"></span>
              </div>
            </el-carousel-item>
          </el-carousel>
        </el-col>
      </el-row>
    </div>
    <!--推荐歌单-->
    <div class="recommendedPlaylist">
      <h2>推荐歌单</h2>
      <ul class="gridLayout">
        <li v-for="playlist in recommendedPlaylist" :key="playlist.id" class="playlist">
          <el-card :body-style="{ padding: 0} " shadow="hover">
            <div class="imgContainer">
              <img :src="playlist.picUrl" class="image">
            </div>
            <div class="moreInfo">
              <p class="listName">{{ playlist.name }}</p>
              <p class="playCount">{{ playlist.playCount | Div1w(playlist.playCount) }}</p>
              <p class="copywriter">{{ playlist.copywriter }}</p>
            </div>
          </el-card>
        </li>
      </ul>
    </div>
    <!--网友精选碟-->
    <div class="topPlayList">
      <el-row :gutter="30">
        <h2>网友精选碟</h2>
        <ul class="gridLayout">
          <li v-for="disc in netizensFeaturedDiscs" :key="disc.id" :span="6">
            <el-card :body-style="{ padding: 0} " shadow="hover">
              <div class="imgContainer">
                <img :src="disc.coverImgUrl" class="image"></div>
              <div>
                <div class="moreInfo">
                  <p class="playCount">{{ disc.playCount | Div1w(disc.playCount) }}</p>
                  <p class="listName">{{ disc.name }}</p>
                </div>
              </div>
            </el-card>
          </li>
        </ul>
      </el-row>
    </div>
    <!--最新专辑-->
    <div class="topAlbum">
      <el-row :gutter="20">
        <h2>最新专辑</h2>
        <el-col v-for="album in albums" :key="album.id" :span="6">
          <el-card :body-style="{ padding: 0} " shadow="hover">
            <img :src="album.picUrl"
                 class="image">
            <div>
              <p class="albumName">{{ album.name }}</p>
              <p class="albumArtist">{{ album.artist.name }}</p>
              <p class="albumCompany">{{ album.company }}w</p>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
    <!--热门歌手-->
    <div class="hotArtists">
      <el-row :gutter="10">
        <h2>热门歌手</h2>
        <el-col v-for="artist in hotArtists" :key="artist.id" :span="3">
          <el-card :body-style="{ padding: 0 }" shadow="hover">
            <img :src="artist.img1v1Url"
                 class="image">
            <div style="padding: 14px;">
              <span>{{ artist.name }}</span>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
    <!--获取排行榜-->
    <div class="lists">
      <el-row :gutter="20">
        <h2>排行榜</h2>
        <el-col v-for="l in lists" :key="l.id" :span="4">
          <el-card :body-style="{ padding: 0 }" shadow="hover">
            <img :src="l.coverImgUrl"
                 class="image">
            <div style="padding: 14px;">
              <p class="listName">{{ l.name }}</p>
              <p class="updateFrequency">{{ l.updateFrequency }}</p>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script>

export default {
  name: "HomePage",
  data() {
    return {
      banners: [],
      recommendedPlaylist: [],
      netizensFeaturedDiscs: [],
      albums: [],
      hotArtists: [],
      lists: []
    }
  },
  created() {
    //请求banner
    this.$axios.get('./banner').then(res => {
      this.banners = res.data.banners
    })
    //请求推荐歌单
    this.$axios.get('/personalized', {params: {limit: 8}}).then(res => {
      this.recommendedPlaylist = res.data.result
    })
    //请求网友精选碟
    this.$axios.get('/top/playlist', {
      params: {limit: 12}
    }).then(res => {
      this.netizensFeaturedDiscs = res.data.playlists
    })
    //请求本周最新专辑
    this.$axios.get('/album/newest').then(res => {
      res.data.albums.map((d, i) => {
        if (i < 4) {
          this.albums.push(d)
        }
      })
    })
    //请求热门歌手
    this.$axios.get('/top/artists', {params: {limit: 8}}).then(res => {
      this.hotArtists = res.data.artists
    })
    //获取榜单
    this.$axios.get('/toplist/detail').then(res => {
      res.data.list.map((l, ind) => {
        if (ind < 6) {
          this.lists.push(l)
        }
      })
    })
  }
}
</script>

<style lang="scss">
.homePage {
  //全局样式
  & > div {
    margin-bottom: 50px;
  }

  h2 {
    text-align: left;
    font-size: 1.5rem
  }

  //轮播图效果
  $carouselMaxHeight: 280px;

  .carousel {
    .el-carousel__container {

      max-height: $carouselMaxHeight;

      .el-carousel__item {
        //max-height: $carouselMaxHeight;
      }

      .el-carousel__mask {
        width: 100%;
        background-color: #000;
        opacity: 0.34;
        transition: .2s;
        z-index: 9
      }

      .bannerPic {
        position: relative;
        border-radius: 5px;
        overflow: hidden;
        box-sizing: border-box;
        min-height: $carouselMaxHeight;

        img {
          min-height: $carouselMaxHeight;
        }

        span {
          position: absolute;
          right: 0;
          bottom: 35px;
          color: #fff;
          padding: 3px;
          font-size: .8rem;
        }
      }
    }
  }

  //推荐歌单
  .recommendedPlaylist {
    ul.gridLayout {
      li.playlist {
        //margin-top: 20px;

        .imgContainer {
          width: 100%;
          max-height: 340px;
          overflow: hidden;
        }

        .moreInfo {
          & > p {
            height: 1.5rem;
            width: 100%;
            overflow: hidden;
          }
        }
      }
    }
  }

  //网友推荐
  .topPlayList {
    @extend .recommendedPlaylist
  }

  //最新专辑
  .topAlbum {
    .el-col {
      margin-top: 20px;
    }
  }
}
</style>