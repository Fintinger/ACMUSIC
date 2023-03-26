<template xmlns:el-col="http://www.w3.org/1999/html">
  <div class="artistDetail">
    <h2>歌手</h2>
    <el-row class="ar-basic-info">
      <el-col :span="6">
        <div class="imgContainer"><img :alt="arBasicInfo.picId" :src="arBasicInfo.img1v1Url||arBasicInfo.picUrl"
                                       class="artist"></div>
      </el-col>
      <el-col :span="18">
        <el-row class="ar-name">
          {{ arBasicInfo.name }}
        </el-row>
        <el-row v-if="arBasicInfo.alias" class="ar-alias">
          {{ arBasicInfo.alias.join('/') }}
        </el-row>
        <el-row class="ar-achieve">
          {{ arBasicInfo.musicSize }}首歌·{{ arBasicInfo.albumSize }}张专辑·{{ arBasicInfo.mvSize }}个MV
        </el-row>
        <el-row class="ar-desc">
          {{ arBasicInfo.briefDesc }}
        </el-row>
      </el-col>
    </el-row>

    <el-row class="ar-top-songs">
      <el-row>
        <el-col :span="12"><h2>TOP50</h2></el-col>
        <el-col :span="12">
          <el-button @click="arAsClk(arBasicInfo.id)">全部</el-button>
        </el-col>
      </el-row>
      <TracksLayout :list="top50songs"/>
    </el-row>

    <el-row class="ar-album">
      <h2>专辑</h2>
      <AlbumLayout :list="hotAlbums"/>
    </el-row>

    <el-row class="ar-mvs">
      <h2>MV</h2>
      <MvLayout :list="mvs" pic-name="imgurl16v9"/>
    </el-row>

    <el-row class="ar-vid">
      <h2>视频</h2>
      <el-button type="success" @click="loadMoreVid">换一批</el-button>
      <VideoLayout :list="videos" :is-mlog="true"/>
    </el-row>

    <el-row class="ar-similar">
      <h2>相似歌手</h2>
      <ArtistLayout :list="simiArtists"/>
    </el-row>
  </div>
</template>

<script>
import TracksLayout from "@/components/layout/TracksLayout";
import AlbumLayout from "@/components/layout/AlbumLayout";
import ArtistLayout from "@/components/layout/ArtistLayout";
import MvLayout from "@/components/layout/MvLayout";
import VideoLayout from "@/components/layout/VideoLayout";

export default {
  name: "ArtistDetail",
  props: ["id"],
  components: {TracksLayout, AlbumLayout, ArtistLayout, MvLayout, VideoLayout},
  data() {
    return {
      arBasicInfo: {},
      top50songs: [],
      hotAlbums: [],
      mvs: [],
      simiArtists: [],
      videos: [],
      vidParams: {
        id: this.id,
        cursor: 0,
        order: 1
      }
    }
  },
  methods: {
    alClk(id) {
      this.$bus.$emit('alClk', id)
    },
    arClk(id) {
      this.$bus.$emit('arClk', id)
    },
    arAsClk(id) {
      this.$bus.$emit('arAsClk', id)
    },
    songClk(song) {
      this.$bus.$emit('songClk', song)
    },
    mvClick(id) {
      this.$bus.$emit('mvClk', id)
    },
    getAtDetail() {
      return this.$axios.get('/artists', {params: {id: this.id}})
    },
    getTop50() {
      return this.$axios.get('/artist/top/song', {params: {id: this.id}})
    },
    getAlbum() {
      return this.$axios.get('/artist/album', {params: {id: this.id}})
    },
    getMVs() {
      return this.$axios.get('/artist/mv', {params: {id: this.id}})
    },
    getSimiAt() {
      return this.$axios.get('/simi/artist', {params: {id: this.id}})
    },
    getVid() {
      return this.$axios('/artist/video', {params: {...this.vidParams}})
    },
    loadMoreVid() {
      console.log(this.vidParams.cursor);
      this.getVid().then(res => {
        console.log(res.data.data);
        if (res.data.data.page.more) {
          this.videos = res.data.data.records
          this.vidParams.cursor = res.data.data.page.cursor
        } else {
          this.vidParams.cursor = 0
        }
      })
    }
  },
  activated() {
    this.$axios.all([this.getAtDetail(), this.getTop50(), this.getAlbum(), this.getMVs(), this.getSimiAt(), this.getVid()])
        .then(this.$axios.spread((AtDetail, Top50, Album, MVs, SimiAt, video) => {
          this.arBasicInfo = AtDetail.data.artist
          this.top50songs = Top50.data.songs
          this.hotAlbums = Album.data.hotAlbums
          this.mvs = MVs.data.mvs
          this.simiArtists = SimiAt.data.artists
          //相关视频
          this.videos = video.data.data.records
          this.vidParams.cursor = video.data.data.page.cursor
        }))
        .catch(err => {
          console.log(err.message);
        })
  },
  beforeUpdate() {
  }
}
</script>

<style lang="scss" scoped>
.artistDetail {
  .ar-basic-info {
    text-align: left;
  }
}

h2 {
  text-align: left;
  font-size: 1.7rem;
  font-weight: bold;
}
</style>