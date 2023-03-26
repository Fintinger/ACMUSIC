<template>
  <div class="video">
    <ul v-if="!isMlog" class="mvList gridLayout">
      <li v-for="v in list" :key="v.vid" class="list-item v" @click="vClk(v.vid)">
        <el-card :body-style="{ padding: 0} " shadow="hover">
          <div class="imgContainer">
            <img :src="v[coverImg]" alt="" class="image">
            <!--          <img :src="v.coverUrl" alt="" class="image">-->
          </div>
          <div class="moreInfo">
            <el-row class="title">{{ v.title }}</el-row>
            <el-row v-if="Array.isArray(v.creator)" class="vCreator"><span v-for="u in v.creator" :key="u.id||u.userId">{{
                u.userName
              }}</span>
            </el-row>
            <el-row v-else-if="v.creator" :key="v.creator.userId" class="vCreator">{{ v.creator.userName }}</el-row>
            <el-row class="playCount">{{ v.playTime | Div1w(v.playTime) }}</el-row>
            <el-row class="duration">{{ v.durationms }}</el-row>
            <el-row class="pb-time">{{ v.publishTime }}</el-row>
          </div>
        </el-card>
      </li>
    </ul>
    <ul v-if="isMlog" class="mvList gridLayout">
      <li v-for="v in list" :key="v.id" class="list-item v" @click="vClk(v.id)">
        <el-card :body-style="{ padding: 0} " shadow="hover">
          <div class="imgContainer">
            <img :src="v.resource.mlogBaseData.coverUrl" alt="" class="image">
            <!--          <img :src="v.coverUrl" alt="" class="image">-->
          </div>
          <div class="moreInfo">
            <el-row class="title">{{ v.resource.mlogBaseData.text }}</el-row>
            <el-row v-if="v.creator" class="vCreator"><span v-for="u in v.creator" :key="u.id">{{ u.userName }}</span>
            </el-row>
            <el-row class="playCount">{{ v.playTime | Div1w(v.playTime) }}</el-row>
            <el-row class="duration">{{ v.resource.mlogBaseData.duration }}</el-row>
            <el-row class="pb-time">{{ v.resource.mlogBaseData.pubTime }}
            </el-row>
          </div>
        </el-card>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  name: "VideoLayout",
  props: {
    list: {
      type: Array,
      required: true,
    },
    coverImg: {
      type: String,
      default: "coverUrl"
    },
    isMlog: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    vClk(id) {
      console.log(id);
      this.$bus.$emit('vClk', id)
    }
  }
}
</script>

<style scoped>

</style>