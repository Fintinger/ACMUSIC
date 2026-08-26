<template>
  <div class="playlist">
    <router-view :key="$route.fullPath"/>
  </div>
</template>

<script>
export default {
  name: "Playlist"
}
</script>

<style lang="scss" scoped>
.playlist {
  padding-bottom: 80px;
}
</style>