<template>
  <div class="artist-list">
    <el-row>
      <el-col :span="2"><h2>歌手榜</h2></el-col>
      <el-col :span="22" style="text-align: right">
        <el-select v-model="type" placeholder="请选择">
          <el-option
              v-for="item in options"
              :key="item.type"
              :label="item.label"
              :value="item.type">
          </el-option>
        </el-select>

      </el-col>
    </el-row>
    <ArtistLayout :list="artistList"/>
  </div>
</template>

<script>
import ArtistLayout from "@/components/layout/ArtistLayout";

export default {
  name: "ArtistList",
  components: {ArtistLayout},
  data() {
    return {
      artistList: [],
      options: [{
        type: 1,
        label: '华语'
      }, {
        type: 2,
        label: '欧美'
      }, {
        type: 3,
        label: '韩国'
      }, {
        type: 4,
        label: '日本'
      }],
      type: 1,
    }
  },
  watch: {
    type(val) {
      this.getArtistList(val)
    }
  },
  methods: {
    getArtistList(type) {
      this.$axios('/toplist/artist', {params: {type}}).then(res => {
        this.artistList = res.data.list.artists
      })
    }
  },
  activated() {
    this.getArtistList(this.type)
  }
}
</script>

<style scoped>

</style>