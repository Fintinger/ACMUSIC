<template>
  <div class="videoRes">
    <h2>VideoRes</h2>
    <el-row class="videoRes">
      <VideoLayout :list="list"/>
    </el-row>
    <el-row>
      <LoadMore :load="load" :loading="loading" :noMore="noMore"/>
    </el-row>
  </div>
</template>

<script>
import VideoLayout from "@/components/layout/VideoLayout";
import LoadMore from "@/components/LoadMore";
import {searchMixin} from "@/assets/mixin";

export default {
  name: "VideoRes",
  props: ["keyword"],
  components: {VideoLayout, LoadMore},
  mixins: [searchMixin],
  data() {
    return {
      type: 1014,
      limit: 12,
      id: "vid",
      resultIn: 'videos',
      countIn: 'videoCount'
    }
  },
  methods: {
    vClk(id) {
      this.$bus.$emit('vClk', id)
    },
  },
  activated() {
    this.initLoad()
  }
}
</script>

<style scoped>

</style>