<template>
  <ul class="gridLayout">
    <li v-for="ar in list" :key="ar.id" class="artist">
      <el-card :body-style="{ padding: 0 }" shadow="never">
        <el-row class="imgContainer"><cover-image :src="(ar.img1v1Url||ar.picUrl) | imgParam('300y300')" :alt="ar.name + '的头像'" @click.native="arClk(ar.id)"/></el-row>
        <el-row class="name">
          {{ ar.name }}
          <span @click="uClk(ar.accountId)" title="用户主页" v-if="ar.accountId" class="accountId">
            <BaseIcon name="user"/>
          </span>
        </el-row>
      </el-card>
    </li>
  </ul>
</template>

<script>
import CoverImage from "@/components/common/CoverImage";

export default {
  name: "ArtistLayout",
  components: { CoverImage },
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