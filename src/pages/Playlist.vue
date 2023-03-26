<template>
  <div class="playlist">
    <el-row>
      <el-col :span="4"><router-link :to="{name:'allList'}">全部歌单</router-link></el-col>
      <el-col :span="4"><router-link :to="{name:'boutique'}">精品歌单</router-link></el-col>
    </el-row>
    <el-row>
      <router-view :key="$route.fullPath"/>
    </el-row>
  </div>
</template>

<script>
export default {
  name: "Playlist"
}
</script>

<style lang="scss" scoped>

</style>