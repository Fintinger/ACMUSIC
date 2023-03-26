<template>
  <div v-cloak class="albumDetail">
    <div class="albumInfo">
      <el-row>
        <el-col :span="6" class="cover">
          <div class="imgContainer"><img :alt="albumInfo.picId" :src="albumInfo.picUrl"></div>
        </el-col>
        <el-col :span="18">
          <el-row class="al-name">{{ albumInfo.name }}({{ albumInfo.subType }})</el-row>
          <el-row v-if="albumInfo.artist" class="al-artist">album by {{ albumInfo.artist.name }}</el-row>
          <el-row class="al-count">Total {{ albumInfo.size }}</el-row>
          <el-row class="al-desc">{{ albumInfo.description }}</el-row>
          <el-row class="al-company">发行公司：{{ albumInfo.company }}</el-row>
          <el-row class="al-publishTime">发行时间：{{ albumInfo.publishTime }}</el-row>
        </el-col>
      </el-row>
    </div>
    <div class="songs-comment">
      <el-tabs v-model="activeName">
        <el-tab-pane label="歌曲" name="songs">
          <TracksLayout :list="songs"/>
        </el-tab-pane>
        <el-tab-pane label="评论" name="comment">
          <CommentLayout :id="id" type="3"/>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script>
import TracksLayout from "@/components/layout/TracksLayout";
import CommentLayout from "@/components/layout/CommentLayout";
//专辑中的歌曲就不意义展示了，一下子展示
export default {
  name: "AlbumDetail",
  components:{TracksLayout,CommentLayout},
  data() {
    return {
      albumInfo: {},
      songs: [],
      activeName:"songs"
    }
  },
  //接收来自路由的query参数
  props: ['id'],
  methods:{
    songClk(song){
      this.$bus.$emit('songClk',song)
    }
  },
  activated() {
    //也是初始化
    this.albumInfo = {}
    this.songs = []


    this.$axios.get('album', {params: {id: this.id}}).then(res => {
      this.albumInfo = res.data.album
      this.songs = res.data.songs
    })
  }
}
</script>

<style lang="scss" scoped>


</style>