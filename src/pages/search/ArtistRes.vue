<template>
  <div class="artistRes">
    <h2>歌手</h2>
    <div class="albumContainer">
      <ArtistLayout :list="list"/>
    </div>
    <el-row>
      <LoadMore :load="load" :loading="loading" :noMore="noMore"/>
    </el-row>
  </div>
</template>

<script>
import LoadMore from "@/components/LoadMore";
import ArtistLayout from "@/components/layout/ArtistLayout";
import {searchMixin} from "@/assets/mixin";

export default {
  name: "ArtistRes",
  props: ["keyword"],
  components: {LoadMore, ArtistLayout},
  mixins: [searchMixin],
  data() {
    return {
      type: 100,
      limit: 12,
      resultIn: 'artists',
      countIn: 'artistCount',
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