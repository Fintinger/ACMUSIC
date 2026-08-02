<template>
  <div class="topList">
    <GridSkeleton v-if="loading" type="playlist"/>
    <PlaylistLayout v-if="!loading && topList.length" :list="topList" pic-name="coverImgUrl">
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
import GridSkeleton from "@/components/Skeleton/GridSkeleton";

export default {
  name: "LeaderBoard",
  components: {PlaylistLayout, GridSkeleton},
  data() {
    return {
      topArtists: {},
      topList: [],
      loading: false,
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
    this.loading = true
    this.$axios.get('/toplist/detail').then(res => {
      this.topArtists = res.data.artistToplist
      this.topList = res.data.list
    }).finally(() => { this.loading = false })
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