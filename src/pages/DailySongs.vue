<template>
  <div class="daily-songs">
    <h1>每日歌曲推荐</h1>
    <p>根据你的音乐口味生成 · 每天6:00更新</p>
    <TracksLayout :list="JSON.parse(dailySongs)"/>
  </div>
</template>

<script>
import TracksLayout from "@/components/layout/TracksLayout";

export default {
  name: "DailySongs",
  components: {TracksLayout},
  props:["dailySongs"],
}
</script>

<style scoped lang="scss">
@import "src/assets/scss/dailyTracks";
</style>