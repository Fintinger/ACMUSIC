<template>
  <div class="topList">
    <PlaylistLayout :list="topList" pic-name="coverImgUrl">
      <template v-slot:top>
        <li class="playlist" @click="showArtists()">
          <el-card :body-style="{ padding: 0} " shadow="hover">
            <div class="imgContainer">
              <img :src="topArtists.coverUrl" class="image">
            </div>
            <div class="moreInfo">
              <p class="listName">{{ topArtists.name }}</p>
              <p class="upateFrequency">{{ topArtists.upateFrequency }}</p>
            </div>
          </el-card>
        </li>
      </template>
    </PlaylistLayout>
  </div>
</template>

<script>
import PlaylistLayout from "@/components/layout/PlaylistLayout";

export default {
  name: "LeaderBoard",
  components: {PlaylistLayout},
  data() {
    return {
      topArtists: {},
      topList: [],
      // topRewardList: {},
    }
  },
  methods: {
    //歌单点击
    plClk(id) {
      this.$bus.$emit('plClk', id)
    },
    showArtists() {
      this.$bus.$emit("showArtistList")
    }
  },
  beforeMount() {
    //获取所有排行榜详情
    this.$axios.get('/toplist/detail').then(res => {
      console.log(res);
      this.topArtists = res.data.artistToplist
      // this.topRewardList = res.data.rewardToplist
      this.topList = res.data.list
    })
  },
}
</script>

<style lang="scss">
.topList {
  .el-row {
    .el-divider__text {
      font-size: 1.5rem;
      font-weight: bold;
    }
  }
}
</style>