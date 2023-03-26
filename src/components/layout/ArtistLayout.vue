<template>
  <ul class="gridLayout">
    <li v-for="ar in list" :key="ar.id" class="artist">
      <el-card :body-style="{ padding: 0 }" shadow="never">
        <el-row class="imgContainer"><img :src="ar.img1v1Url||ar.picUrl" alt="" @click="arClk(ar.id)"></el-row>
        <el-row class="name">
          {{ ar.name }}
          <span @click="uClk(ar.accountId)" title="用户主页" v-if="ar.accountId" class="accountId">
            <i class="el-icon-user-solid"></i>
          </span>
        </el-row>
      </el-card>
    </li>
  </ul>
</template>

<script>
export default {
  name: "ArtistLayout",
  props: {
    list: {
      type: Array,
      required: true,
    },
  },
  methods: {
    arClk(id) {
      this.$bus.$emit('arClk', id)
    },
    uClk(id) {
      this.$bus.$emit('uClk', id)
    }
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/artistLayout";
</style>