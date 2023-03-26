<template>
  <div class="albumRes">
    <h2>专辑</h2>
    <el-row class="albumContainer">
      <AlbumLayout :list="list"/>
    </el-row>
    <el-row>
      <LoadMore :load="load" :loading="loading" :noMore="noMore"/>
    </el-row>
  </div>
</template>

<script>
import LoadMore from "@/components/LoadMore";
import AlbumLayout from "@/components/layout/AlbumLayout";
import {searchMixin} from "@/assets/mixin";

export default {
  name: "AlbumRes",
  props: ["keyword"],
  components: {LoadMore, AlbumLayout},
  mixins: [searchMixin],
  data() {
    return {
      type: 10,
      limit: 12,
      resultIn: 'albums',
      countIn: 'albumCount',
    }
  },
  methods: {
    alClk(id) {
      this.$bus.$emit('alClk', id)
    }
  },
  activated() {
    this.initLoad()
  }
}
</script>

<style scoped>

</style>