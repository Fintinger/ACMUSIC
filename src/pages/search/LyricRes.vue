<template>
  <div class="lyricRes">
    <h2>LyricRes</h2>
    <TracksLayout :list="list"/>
    <el-row>
      <LoadMore :load="load" :loading="loading" :noMore="noMore"/>
    </el-row>
  </div>
</template>

<script>
import LoadMore from "@/components/LoadMore";
import TracksLayout from "@/components/layout/TracksLayout";
import {searchMixin} from "@/assets/mixin";

export default {
  name: "LyricRes",
  props: ["keyword"],
  components: {LoadMore, TracksLayout},
  mixins: [searchMixin],
  data() {
    return {
      type: 1006,
      limit: 20,
      resultIn: 'songs',
      countIn: 'songCount'
    }
  },
  computed: {},
  methods: {
    mvClk(id) {
      this.$bus.$emit('mvClk', id)
    },
    songClk(song) {
      this.$bus.$emit('songClk', song);
    },
  }
  ,
  activated() {
    this.initLoad()
  }
}
</script>

<style scoped>

</style>