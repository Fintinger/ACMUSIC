<template>
  <div class="userRes">
    <h2>用户</h2>
    <el-row>
      <ul class="gridLayout">
        <li v-for="u in list" :key="u.userId">
          <div class="user-wrapper" @click="uClk(u.userId)">
            <el-card :body-style="{ padding: 0} " shadow="hover">
              <el-row class="imgContainer"><img :src="u.avatarUrl" alt=""></el-row>
              <el-row class="name-gender">
                <span class="name">{{ u.nickname }}</span>
                <i :class="{'el-icon-male':u.gender===1,'el-icon-female':u.gender===2}"></i>
              </el-row>
              <el-row class="signature">{{ u.signature }}</el-row>
              <el-row class="vipType">vipType{{ u.vipType }}</el-row>
              <el-row class="follow">Follow:{{ u.follows }} Followeds:{{ u.followeds }}</el-row>
              <el-row class="count">Playlist:{{ u.playlistCount }}</el-row>
            </el-card>
          </div>
        </li>
      </ul>
    </el-row>
    <el-row>
      <LoadMore :load="load" :loading="loading" :noMore="noMore"/>
    </el-row>
  </div>
</template>

<script>
import LoadMore from "@/components/LoadMore";
import {searchMixin} from "@/assets/mixin";

export default {
  name: "UserRes",
  props: ["keyword"],
  components: {LoadMore},
  mixins: [searchMixin],
  data() {
    return {
      id: 'userId',
      type: 1002,
      limit: 12,
      resultIn: 'userprofiles',
      countIn: 'userprofileCount',
    }
  },
  methods: {
    uClk(uid) {
      this.$bus.$emit('uClk', uid)
    }
  },
  activated() {
    this.initLoad()
  }
}
</script>

<style lang="scss" scoped>
.name-gender {
  i {
    color: #fff;
    display: inline-block;
    //width: 8px;
    //height: 8px;
    border-radius: 50%;
  }

  i.el-icon-male {
    background: #47a1ce;
  }

  i.el-icon-female {
    background: #ff86b6;
  }
}
</style>