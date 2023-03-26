<template>
  <div class="searchResult">
    <el-row v-if="multiRes.length" class="multimatch">
      <h2>多重匹配</h2>
      <div class="resContainer">
        <MultimatchLayout  v-for="(res,ind) in multiRes" :key="ind" :name="res.name" :target-list="res.data"/>
      </div>
    </el-row>
    <el-row class="result-tab">
      <el-col v-for="(name,ind) in tabs" :key="ind" :span="2">
        <router-link :to="{name,query:{keyword}}">{{ name }}</router-link>
      </el-col>
    </el-row>
    <el-row>
      <router-view :key="$route.fullpath"></router-view>
    </el-row>
  </div>
</template>

<script>
import MultimatchLayout from "@/components/layout/MultimatchLayout";

export default {
  name: "SearchResult",
  props: ["keyword"],
  components: {MultimatchLayout},
  data() {
    return {
      tabs: ['albumRes', 'artistRes', 'lyricRes', 'mvRes', 'playlistRes', 'trackList', 'userRes', 'videoRes', 'voiceRes'],
      multiRes: [],
    }
  },
  watch: {
    keyword: {
      immediate: true,
      handler(keywords) {
        this.getMultimatch(keywords)
      }
    }
  },
  methods: {
    getMultimatch(keywords) {
      this.multiRes = []
      this.$axios('/search/multimatch', {params: {keywords}})
          .then(res => {
            res.data.result.orders.map(val => {
              if (val === "new_mlog") {
                res.data.result.new_mlog.forEach(val => {
                  console.log([{name: val, data: val.baseInfo}]);
                  this.multiRes.push({name: 'new_mlog', data:[ val.baseInfo]})
                })
              } else {
                this.multiRes.push({name: val, data: res.data.result[val]})
              }

            })
          })
    }
  }
}
</script>

<style lang="scss" scoped>
.searchResult {
  width: 100%;
  height: auto;
  //height: 100vh;
  background: #e4bbb9;

  .multimatch {
    .resContainer {
      display: flex;
      flex-wrap: wrap;
    }
  }
}
</style>