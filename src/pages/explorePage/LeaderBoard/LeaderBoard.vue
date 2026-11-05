<template>
  <div class="topList">
    <GridSkeleton v-if="loading" type="playlist"/>
    <EmptyState v-else-if="error" title="榜单加载失败" action-text="重试" @action="load"/>
    <EmptyState v-else-if="!topList.length" title="暂无榜单"/>
    <PlaylistLayout v-if="!loading && topList.length" :list="topList" pic-name="coverImgUrl">
      <template v-slot:top>
        <li class="playlist" @click="showArtists()">
          <el-card :body-style="{ padding: 0} " shadow="hover">
            <div class="imgContainer">
              <img :src="topArtists.coverUrl | https" class="image" loading="lazy" decoding="async">
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
import EmptyState from '@/components/common/EmptyState';
import PlaylistLayout from "@/components/layout/PlaylistLayout";
import GridSkeleton from "@/components/Skeleton/GridSkeleton";
import * as playlistApi from "@/api/Playlist";

export default {
  name: "LeaderBoard",
  components: {EmptyState, PlaylistLayout, GridSkeleton},
  data() {
    return {
      topArtists: {},
      topList: [],
      loading: true,
      error: false,
    }
  },
  methods: {
    async load() {
      this.loading = true; this.error = false
      try {
        const res = await playlistApi.toplistDetail()
        if (!res.data || !Array.isArray(res.data.list)) throw new Error('Invalid charts')
        this.topArtists = res.data.artistToplist || {}; this.topList = res.data.list
      } catch (_) { this.error = true }
      finally { this.loading = false }
    },
    //歌单点击
    plClk(id) {
      this.$bus.$emit('plClk', id)
    },
    showArtists() {
      this.$bus.$emit("showArtistList")
    }
  },
  beforeMount() { this.load() },
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