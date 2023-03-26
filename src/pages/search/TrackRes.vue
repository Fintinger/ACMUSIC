<template>
  <div class="trackRes">
    <h2>单曲</h2>
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
  name: "TrackRes",
  props: ["keyword"],
  components: {LoadMore,TracksLayout},
  mixins: [searchMixin],
  data() {
    return {
      type:1,
      limit:50,
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
  },
  activated() {
    this.initLoad()
  }
}
</script>

<style scoped>

</style>