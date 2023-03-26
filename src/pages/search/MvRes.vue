<template>
  <div class="mvRes">
    <h2>MvRes</h2>
    <el-row class="mvs">
      <MvLayout :list="list"/>
    </el-row>
    <el-row>
      <LoadMore :load="load" :loading="loading" :noMore="noMore"/>
    </el-row>
  </div>
</template>

<script>
import LoadMore from "@/components/LoadMore";
import MvLayout from "@/components/layout/MvLayout";
import {searchMixin} from "@/assets/mixin";

export default {
  name: "MvRes",
  props: ["keyword"],
  components: {LoadMore, MvLayout},
  mixins: [searchMixin],
  data() {
    return {
      type: 1004,
      limit: 12,
      resultIn: 'mvs',
      countIn: 'mvCount',
    }
  },
  methods: {
    arClk(id) {
      this.$bus.$emit('mvClk', id)
    }
  },
  activated() {
    this.initLoad()
  }
}
</script>

<style scoped>

</style>