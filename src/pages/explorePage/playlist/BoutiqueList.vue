<template>
  <div class="boutiquePlaylist">
    <!--    精品歌单tags-->
    <div class="tag-scroller" ref="tagScroller">
      <button
          v-show="BoutiquePlaylistTags.length"
          class="scroll-arrow scroll-arrow--left"
          :class="{ disabled: !canScrollLeft }"
          @click="scrollTags(-1)"
      >‹</button>
      <ul
          ref="listTags"
          class="listTags"
          @scroll="onTagsScroll"
      >
        <li v-for="t in BoutiquePlaylistTags" :key="t.id">
          <el-button class="playlist-tag-btn" size="small" @click="getListForCurrentTag(t.name)">{{ t.name }}</el-button>
        </li>
      </ul>
      <button
          v-show="BoutiquePlaylistTags.length"
          class="scroll-arrow scroll-arrow--right"
          :class="{ disabled: !canScrollRight }"
          @click="scrollTags(1)"
      >›</button>
    </div>
    <el-row class="list">
      <GridSkeleton v-if="loading && !listForCurrentTag.length" type="playlist"/>
      <transition
          v-if="!loading && listForCurrentTag.length"
          name="btq-fade"
          mode="out-in"
      >
        <PlaylistLayout :key="fadeKey" :list="listForCurrentTag" pic-name="coverImgUrl"/>
      </transition>
    </el-row>
    <LoadMore :load="load" :loading="loading" :no-more="noMore"/>
  </div>
</template>

<script>
import PlaylistLayout from "@/components/layout/PlaylistLayout";
import LoadMore from "@/components/LoadMore";
import GridSkeleton from "@/components/Skeleton/GridSkeleton";
import * as playlistApi from "@/api/Playlist";

export default {
  name: "BoutiquePlaylist",
  components: {PlaylistLayout, LoadMore, GridSkeleton},
  data() {
    return {
      loading: false,
      BoutiquePlaylistTags: [],
      listForCurrentTag: [],
      currentTag: "",
      lastTime: 123,
      canScrollLeft: false,
      canScrollRight: false,
      fadeKey: 0,
    }
  },
  computed: {
    noMore() {
      return !this.lastTime
    },
  },
  mounted() {
    this.$nextTick(() => this.updateArrows())
  },
  updated() {
    this.updateArrows()
  },
  methods: {
    //加载更多
    load() {
      if (this.loading || this.noMore) return
      this.loading = true
      this.getList(this.currentTag, this.lastTime).then(res => {
        this.loadCallback(res.data)
      })
    },
    //获取当前标签的歌单
    getListForCurrentTag(cat) {
      this.loading = true
      this.listForCurrentTag = []
      this.fadeKey++
      this.getList(cat).then(res => {
        this.currentTag = cat
        this.listForCurrentTag = res.data.playlists
        this.lastTime = res.data.lasttime
      }).finally(() => { this.loading = false })
    },
    loadCallback(data) {
      this.listForCurrentTag.push(...data.playlists)
      this.lastTime = data.lasttime
      this.loading = false
    },
    //歌单点击
    plClk(id) {
      this.$bus.$emit('plClk', id)
    },
    //getTags
    getTags() {
      return playlistApi.highqualityTags()
    },
    //获取列表
    getList(cat = "", before = "") {
      return playlistApi.highquality(cat, before)
    },
    // 箭头滚动
    updateArrows() {
      const el = this.$refs.listTags
      if (!el) return
      const maxLeft = el.scrollWidth - el.clientWidth
      this.canScrollLeft = el.scrollLeft > 4
      this.canScrollRight = el.scrollLeft < maxLeft - 4
    },
    onTagsScroll() {
      this.updateArrows()
    },
    scrollTags(dir) {
      const el = this.$refs.listTags
      if (!el) return
      el.scrollBy({ left: dir * 320, behavior: 'smooth' })
    }
  },
  beforeMount() {
    //获取精品歌单tags,默认加载一些歌单（无tag参数）
    this.$axios.all([this.getTags(), this.getList()])
        .then(this.$axios.spread((tags, list) => {
          this.BoutiquePlaylistTags = tags.data.tags
          this.loadCallback(list.data)
          this.$nextTick(() => this.updateArrows())
        }))
  },
}
</script>

<style lang="scss" scoped>
.boutiquePlaylist {

  /* 标签滚动容器：flex 布局, 箭头在两侧, 中间滚动 */
  .tag-scroller {
    display: flex;
    align-items: center;
    margin-bottom: 30px;

    ul.listTags {
      text-align: left;
      display: flex;
      flex-wrap: nowrap;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      gap: 8px;
      margin: 0;
      line-height: 0;
      flex: 1;
      min-width: 0;
      scrollbar-width: none;
      -ms-overflow-style: none;
      &::-webkit-scrollbar { display: none; }

      li {
        display: inline-block;
        margin: 0;
        flex-shrink: 0;
      }
    }

    /* 左右箭头：作为 flex 项放在滚动区两侧, 不遮挡标签 */
    .scroll-arrow {
      z-index: 5;
      flex-shrink: 0;
      align-self: center;
      width: 32px;
      height: 32px;
      border: 1px solid rgba(0,0,0,.06);
      border-radius: 50%;
      background: rgba(255,255,255,.9);
      color: #666;
      font-size: 22px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,.08);
      transition: all .2s ease;
      &:hover {
        background: #fff;
        color: #8178ff;
        box-shadow: 0 6px 16px rgba(0,0,0,.12);
      }
      &.disabled {
        opacity: .35;
        cursor: default;
        box-shadow: none;
        &:hover {
          background: rgba(255,255,255,.9);
          color: #666;
          box-shadow: none;
        }
      }

      &--left { margin-right: 10px; }
      &--right { margin-left: 10px; }
    }
  }

  /* 列表内容出现 - 轻微上浮 */
  .btq-fade-enter-active { transition: opacity .3s ease, transform .3s ease; }
  .btq-fade-leave-active { transition: opacity .15s ease, transform .15s ease; }
  .btq-fade-enter { opacity: 0; transform: translateY(14px); }
  .btq-fade-leave-to { opacity: 0; transform: translateY(-8px); }

}
</style>
