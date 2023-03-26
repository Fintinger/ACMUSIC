<template>
  <div class="playlistRes">
    <h2>歌单</h2>
    <el-row>
      <PlaylistLayout :list="list" picName="coverImgUrl"/>
    </el-row>
    <el-row>
      <LoadMore :load="load" :loading="loading" :noMore="noMore"/>
    </el-row>

  </div>
</template>

<script>
import LoadMore from "@/components/LoadMore";
import {searchMixin} from "@/assets/mixin";
import PlaylistLayout from "@/components/layout/PlaylistLayout";

export default {
  name: "PlaylistRes",
  props: ["keyword"],
  components: {LoadMore,PlaylistLayout},
  mixins: [searchMixin],
  data() {
    return {
      type: 1000,
      limit: 12,
      resultIn: 'playlists',
      countIn: 'playlistsCount',
    }
  },
  methods: {
    arClk(id) {
      this.$bus.$emit('arClk', id)
    }
  },
  activated() {
    this.initLoad()
  }
}
</script>

<style scoped>

</style>