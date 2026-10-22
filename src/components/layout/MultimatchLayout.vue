<template>
  <div :class="['mm-strip-group', 'type-' + name]">
    <div v-for="item in list" :key="item.id" class="mm-item"
         role="button" tabindex="0" :aria-label="label + '：' + titleOf(item)"
         @click="clk(item)" @keydown.enter="clk(item)">
      <div class="mm-media">
        <cover-image class="mm-img" :src="coverOf(item)" :alt="titleOf(item) + '的封面'"/>
        <span class="mm-tag">{{ label }}</span>
      </div>
      <div class="mm-title">{{ titleOf(item) }}</div>
    </div>
  </div>
</template>

<script>
/**
 * MultimatchLayout —— 智能匹配里的一个类型，展开成若干张「同尺寸卡片」
 *
 * 布局约定（外层 .mm-panel 负责横向滚动）：
 * - 每张卡固定 240px 宽、封面固定 16:9、标题固定两行、meta 固定一行
 *   → 所有类型的所有条目尺寸完全一致，横向排成一条，超出由面板滚动
 * - 类型名做成封面左上角的角标，不再占用卡片内部首行，卡片高度只由内容决定
 * - 封面统一 16:9 裁切（歌单/专辑的方图也裁），换取整条卡片高度齐平
 */
import CoverImage from "@/components/common/CoverImage";
import {imgParam} from "@/utils/filters";

const titles = {artist: "歌手", playlist: "歌单", album: "专辑", new_mlog: "MV"}
const busEventOf = {artist: "arClk", playlist: "plClk", album: "alClk", new_mlog: "vClk"}

export default {
  name: "MultimatchLayout",
  components: {CoverImage},
  props: {
    targetList: {type: Array, required: true},
    name: {type: String, required: true}
  },
  computed: {
    label() { return titles[this.name] || "" },
    list() { return this.targetList }
  },
  methods: {
    clk(item) {
      const ev = busEventOf[this.name]
      if (ev && item) this.$bus.$emit(ev, item.id)
    },
    // MV 的真实数据藏在 resource.mlogBaseData 里，逐层兜底，别让模板直接点出来
    mlog(item) {
      const r = item && item.resource
      return (r && r.mlogBaseData) || {}
    },
    titleOf(item) {
      if (this.name === 'new_mlog') return this.mlog(item).text || 'MV'
      return item.name || ''
    },
    coverOf(item) {
      // 封面区域是 1:1，就统一按方图请求，避免 CDN 返回与容器比例不符的图
      if (this.name === 'new_mlog') return imgParam(this.mlog(item).coverUrl, '400y400') || ''
      if (this.name === 'artist') return imgParam(item.img1v1Url || item.picUrl || item.avatarUrl, '300y300') || ''
      if (this.name === 'album') return imgParam(item.picUrl, '300y300') || ''
      return imgParam(item.coverImgUrl || item.picUrl, '300y300') || ''
    }
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/base/variables";

/* 一个类型 = 一组同尺寸卡片横向连排；宽度由卡片数决定，不参与压缩 */
.mm-strip-group {
  flex: none;
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.mm-item {
  flex: 0 0 200px;
  width: 200px;
  cursor: pointer;
  outline: none;

  &:focus-visible {
    outline: 2px solid $color-main;
    outline-offset: 4px;
    border-radius: 14px;
  }
}

/* 媒体区：固定 1:1，与站内其它封面（歌单/专辑卡片）比例一致 */
.mm-media {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 12px;
  overflow: hidden;
  background: #f2f3f5;
}

/* 绝对定位 + inset:0 + object-fit:cover：无论原图比例如何都完整覆盖底框，不会露出灰边 */
.mm-media ::v-deep .mm-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform .35s ease;
}

.mm-item:hover .mm-media ::v-deep .mm-img { transform: scale(1.04); }

/* 类型角标：贴在封面上，不再占卡片内部的一行高度 */
.mm-tag {
  position: absolute;
  left: 8px;
  top: 8px;
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(0, 0, 0, .48);
  color: #fff;
  font-size: 11px;
  line-height: 16px;
  letter-spacing: .02em;
}

/* 标题固定两行高度 → 每张卡等高（不再展示下方的字段信息） */
.mm-title {
  margin-top: 10px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  color: #222;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.8em;
}

/* 歌手：圆头像居中，不跟着方图裁成硬边方框 */
.type-artist .mm-media ::v-deep .mm-img {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 132px;
  height: 132px;
  border-radius: 50%;
}

.type-artist .mm-item:hover .mm-media ::v-deep .mm-img { transform: scale(1.06); }
</style>
