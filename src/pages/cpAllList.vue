<template>
  <div class="topList">
    <ul class="list gridLayout">
      <!--歌手榜-->
      <li class="list-item list">
        <el-card :body-style="{ padding: 0} " shadow="hover">
          <div class="imgContainer">
            <img :src="topArtists.coverUrl" class="image">
          </div>
          <div class="moreInfo">
            <p class="listName">{{ topArtists.name }}</p>
            <p class="updateFrequency">{{ topArtists.updateFrequency }}</p>
          </div>
        </el-card>
      </li>
      <!--赞赏榜-->
      <li class="list-item list">
        <el-card :body-style="{ padding: 0} " shadow="hover">
          <div class="imgContainer">
            <img :src="topRewardList.coverUrl" class="image">
          </div>
          <div class="moreInfo">
            <p class="listName">{{ topRewardList.name }}</p>
          </div>
        </el-card>
      </li>
      <!--其他榜单-->
      <li v-for="list in topList" :key="list.id" class="list-item list">
        <el-card :body-style="{ padding: 0} " shadow="hover">
          <div class="imgContainer">
            <img :src="list.coverImgUrl" class="image">
          </div>
          <div class="moreInfo">
            <p class="listName">{{ list.name }}</p>
            <p class="playCount">{{ list.playCount | Div1w(list.playCount) }}</p>
            <p class="playDesc">{{ list.description}}</p>
          </div>
        </el-card>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  name: "cpAllList",
  data() {
    return {
      topArtists: {},
      topList: [],
      topRewardList: {},
    }
  },
  beforeMount() {
    //获取所有排行榜详情
    this.$axios.get('/toplist/detail').then(res => {
      this.topArtists = res.data.artistToplist
      this.topRewardList = res.data.rewardToplist
      this.topList = res.data.list
    })
  }
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