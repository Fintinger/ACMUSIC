<template>
  <div class="loadMore">
    <button v-if="!loading&&!noMore" @click="load">加载更多</button>
    <p v-if="loading">加载中...</p>
    <p v-if="noMore">没有更多了</p>
  </div>
</template>

<script>
export default {
  name: "LoadMore",
  props:{
    loading:{
      type:Boolean,
      required:true,
    },
    noMore:{
      type:Boolean,
      required: true,
    },
    load:{
      type:Function,
      required:true
    }
  },
}
</script>

<style scoped>
.loadMore{
  z-index: 999;
}
</style>