<template>
  <ul class="gridLayout">
    <li
        v-for="ar in visibleList"
        :key="ar.id"
        class="artist"
        :class="{ 'is-blocked': blockedMode === 'mark' && isBlocked(ar) }"
    >
      <el-card :body-style="{ padding: 0 }" shadow="never">
        <el-row class="imgContainer">
          <cover-image :src="(ar.img1v1Url||ar.picUrl) | imgParam('300y300')" :alt="ar.name + '的头像'" @click.native="arClk(ar.id)"/>
          <span v-if="blockedMode === 'mark' && isBlocked(ar)" class="blockedBadge">已屏蔽</span>
        </el-row>
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
    /**
     * 被屏蔽歌手的处理方式：
     *  - hide（默认）：直接不渲染。首页/发现页这类被动浏览的场景
     *  - mark：保留但压暗 + 打角标，点进去仍可看详情并解除。搜索页用这个
     *  - none：不过滤
     */
    blockedMode: {
      type: String,
      default: 'hide'
    }
  },
  computed: {
    visibleList() {
      if (this.blockedMode !== 'hide') return this.list
      return (this.list || []).filter(ar => !this.isBlocked(ar))
    }
  },
  methods: {
    isBlocked(ar) {
      if (this.blockedMode === 'none') return false
      return !!(ar && ar.id != null && this.$store.getters['BlockAbout/isArtistBlocked'](ar.id))
    },
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

// 已屏蔽的歌手卡：整体压暗，但不拦截点击——详情页里有解除按钮
.artist {
  position: relative;

  &.is-blocked {
    opacity: .55;
  }
}

.blockedBadge {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  line-height: 16px;
  color: #fff;
  background: rgba(0, 0, 0, .5);
}
</style>
