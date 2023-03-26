<template>
  <div v-cloak class="listDetail">
    <div class="listInfo ">
      <el-row>
        <el-col :span="6">
          <div class="imgContainer">
            <img :alt="listInfo.coverImgId" :src="listInfo.coverImgUrl">
          </div>
        </el-col>
        <el-col class="info" :span="12">
          <div class="info-wrap">
            <scoText class="listName">{{ listInfo.name }}</scoText>
            <el-row class="creator">
              By <span class="name" @click="uClk(creator.userId)">{{ creator.nickname }}</span>
            </el-row>
                      <el-row class="listTag">
                        <span class="listCount">{{ listInfo.trackCount }}首</span> | <span class="play-count">播放{{ listInfo.playCount | div1w(listInfo.playCount) }}</span>
                      </el-row>
            <el-row class="listTime">创建于{{ listInfo.createTime |formatMs("YYYY年MM月DD日") }}，最后更新于{{ listInfo.updateTime|fromNow }}</el-row>
            <el-row class="listDescription">
              <pre v-text="listInfo.description"></pre>
            </el-row>
          </div>
        </el-col>
      </el-row>
    </div>
    <div class="songs-comment">
      <el-tabs v-model="activeName">
        <el-tab-pane label="歌曲" name="songs">
          <TracksLayout :list="songs"/>
          <LoadMore :load="load" :loading="loading" :noMore="noMore"/>
        </el-tab-pane>
        <el-tab-pane label="评论" name="comment">
          <CommentLayout :id="id" type="2"/>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script>
import LoadMore from "@/components/LoadMore";
import TracksLayout from "@/components/layout/TracksLayout";
import CommentLayout from "@/components/layout/CommentLayout";

import scoText from "@/components/scoText";

export default {
  name: "listDetail",
  components: {LoadMore, TracksLayout,CommentLayout,scoText},
  data() {
    // const LIMIT = 50, OFFSET = 50;
    return {
      LIMIT: 50,
      OFFSET: 0,
      songs: [],
      listInfo: {},
      creator: {},
      loading: false,
      params: {
        limit: this.LIMIT,
        offset: this.OFFSET
      },
      //默认显示的页面
      activeName:"songs",
    }
  },
  //接收来自路由的query参数
  props: ['id'],
  computed: {
    listID() {
      return this.$route.query.id
    },
    trackCount() {
      return this.listInfo.trackCount
    },
    nextCount() {
      return (this.params.offset + 1) * this.params.limit
    },
    noMore() {
      return this.trackCount === this.songs.length
    }
  },
  methods: {
    loadSongs(id, limit) {
      this.$axios.get('/playlist/track/all', {
        params: {
          id,
          limit: limit || this.params.limit,
          offset: this.params.offset
        }
      }).then(res => {
        res.data.songs.forEach(val => {
          if (this.songs.findIndex(item => item.id === val.id) === -1) {
            this.songs.push(val)
          }
        })
        this.loading = false
        this.params.offset++
      })
    },
    load() {
      this.loading = true
      this.loadSongs(this.id)
    },
    songClk(song) {
      this.$bus.$emit('songClk', song)
    },
    uClk(uid) {
      this.$bus.$emit('uClk', uid)
    }
  },
  activated() {
    //初始化，以免携带上次数据
    this.songs = []
    this.listInfo = {}
    this.creator = {}
    this.params.limit = this.LIMIT
    this.params.offset = this.OFFSET
    // console.log(this.params.limit);
    //获取歌单详情
    this.$axios.get('/playlist/detail', {params: {id: this.id}}).then(res => {
      this.listInfo = res.data.playlist
      this.creator = res.data.playlist.creator
    })
    this.loadSongs(this.id)
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/listDetail";
</style>