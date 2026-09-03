<template>
  <div v-cloak class="listDetail">
    <el-row class="ar-basic-info">
      <el-col :span="6">
        <div class="imgContainer"><cover-image :alt="arBasicInfo.name + '的头像'" :src="arBasicInfo.img1v1Url||arBasicInfo.picUrl"
                                       custom-class="artist"/></div>
      </el-col>
      <el-col :span="18">
        <el-row class="ar-name">
          {{ arBasicInfo.name }}
        </el-row>
        <el-row class="count">
          {{ total }}
        </el-row>
      </el-col>
    </el-row>
    <div class="songs">
      <TracksLayout :list="songs"/>
    </div>
    <LoadMore :load="load" :loading="loading" :noMore="noMore"/>
  </div>
</template>

<script>
import LoadMore from "@/components/LoadMore";
import TracksLayout from "@/components/layout/TracksLayout";
import CoverImage from "@/components/common/CoverImage";
import * as artistApi from "@/api/Artist";

export default {
  name: "ArtistAllSongs",
  components: {LoadMore, TracksLayout, CoverImage},
  data() {
    return {
      arBasicInfo: {},
      LIMIT: 50,
      PAGE: 0,
      songs: [],
      total: 0,
      loading: false,
      params: {
        limit: this.LIMIT,
      }
    }
  },
  //接收来自路由的query参数
  props: ['id'],
  computed: {
    offset() {
      return this.LIMIT * this.PAGE
    },
    listID() {
      return this.$route.query.id
    },
    nextCount() {
      return (this.params.offset + 1) * this.params.limit
    },
    noMore() {
      return this.total === this.songs.length
    }
  },
  methods: {
    loadSongs(id) {
      artistApi.songs(id, this.params.limit, this.offset).then(res => {
        //歌曲数量
        this.total = res.data.total

        res.data.songs.forEach(val => {
          if (this.songs.findIndex(item => item.id === val.id) === -1) {
            this.songs.push(val)
          }
        })
        this.loading = false
        this.PAGE++
      })
    },
    load() {
      this.loading = true
      this.loadSongs(this.id)
    },
    songClk(song) {
      console.log(song)
      this.$bus.$emit('songClk', song)
    }
  },
  activated() {
    //初始化，以免携带上次数据
    this.songs = []
    this.PAGE = 0
    this.params.limit = this.LIMIT
    // this.params.offset = this.PAGE


    //获取歌手信息
    artistApi.detail(this.id).then(res => {
      this.arBasicInfo = res.data.artist
    })
    this.loadSongs(this.id)
  }
}
</script>

<style lang="scss">
.listDetail {
  padding-bottom: 80px;
}

.song {
  border-bottom: 1px solid #ededed;

  &:hover {
    background: #bda284;
  }
}
</style>