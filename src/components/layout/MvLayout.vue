<template>
  <ul class="mvList gridLayout">
    <li v-for="mv in list" :key="mv.id" class="list-item mv" @click="mvClk(mv.id)">
      <el-card :body-style="{ padding: 0} " shadow="hover">
        <div class="imgContainer">
          <img :src="mv[picName]" class="image">
        </div>
        <div class="moreInfo">
          <el-row class="mvName">{{ mv.name }}</el-row>
          <el-row class="mvArtist">{{ mv.artistName }}</el-row>
          <el-row class="playCount">{{ mv.playCount | Div1w(mv.playCount) }}</el-row>
          <el-row class="duration">{{ mv.duration }}</el-row>
          <el-row class="pb-time">{{ mv.publishTime }}</el-row>
        </div>
      </el-card>
    </li>
  </ul>
</template>

<script>
export default {
  name: "MvLayout",
  props: {
    list: {
      type: Array,
      required: true,
    },
    picName: {
      type:String,
      default:'cover',
    }
  },
  methods: {
    mvClk(id) {
      this.$bus.$emit('mvClk', id)
    },
  }
}
</script>

<style scoped>

</style>