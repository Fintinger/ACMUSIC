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
    <EmptyState v-if="tagsError" compact title="歌单标签加载失败" action-text="重试标签" @action="loadTags"/>
    <el-row class="list">
      <GridSkeleton v-if="loading && !listForCurrentTag.length" type="playlist"/>
      <transition
          v-if="listForCurrentTag.length"
          name="btq-fade"
          mode="out-in"
      >
        <PlaylistLayout :key="fadeKey" :list="listForCurrentTag" pic-name="coverImgUrl"/>
      </transition>
    </el-row>
    <EmptyState v-if="listError" compact :title="listForCurrentTag.length ? '更多精品歌单加载失败' : '精品歌单加载失败'" desc="请检查网络后重试" action-text="重试" @action="retryList"/>
    <EmptyState v-else-if="!initialLoading && !loading && !listForCurrentTag.length" compact title="这个标签暂无精品歌单"/>
    <LoadMore v-if="!initialLoading && !listError && listForCurrentTag.length" :load="load" :loading="loading" :no-more="noMore"/>
  </div>
</template>

<script>
import EmptyState from '@/components/common/EmptyState';
import PlaylistLayout from "@/components/layout/PlaylistLayout";
import LoadMore from "@/components/LoadMore";
import GridSkeleton from "@/components/Skeleton/GridSkeleton";
import * as playlistApi from "@/api/Playlist";

export default {
  name: "BoutiquePlaylist",
  components: {EmptyState, PlaylistLayout, LoadMore, GridSkeleton},
  data() {
    return {
      loading: false,
      initialLoading: true,
      listError: false,
      tagsError: false,
      tagsLoading: false,
      requestVersion: 0,
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
    load() { return this.fetchList(false) },
    getListForCurrentTag(cat) {
      this.currentTag = cat
      return this.fetchList(true)
    },
    retryList() { return this.fetchList(!this.listForCurrentTag.length) },
    async fetchList(reset) {
      if (!reset && (this.loading || this.noMore)) return
      if (reset) { this.requestVersion++; this.listForCurrentTag = []; this.lastTime = ''; this.fadeKey++; this.initialLoading = true }
      const version = this.requestVersion
      this.loading = true; this.listError = false
      try {
        const res = await this.getList(this.currentTag, reset ? '' : this.lastTime)
        if (version !== this.requestVersion) return
        const data = res.data || {}
        if (!Array.isArray(data.playlists)) throw new Error('Invalid playlists')
        const seen = new Set(this.listForCurrentTag.map(item => item.id))
        this.listForCurrentTag = this.listForCurrentTag.concat(data.playlists.filter(item => !seen.has(item.id)))
        this.lastTime = data.more === false || !data.playlists.length ? '' : data.lasttime
      } catch (_) { if (version === this.requestVersion) this.listError = true }
      finally { if (version === this.requestVersion) { this.loading = false; this.initialLoading = false } }
    },
    async loadTags() {
      if (this.tagsLoading) return
      this.tagsLoading = true; this.tagsError = false
      try {
        const res = await this.getTags()
        if (!res.data || !Array.isArray(res.data.tags)) throw new Error('Invalid tags')
        this.BoutiquePlaylistTags = res.data.tags
        this.$nextTick(() => this.updateArrows())
      } catch (_) { this.tagsError = true }
      finally { this.tagsLoading = false }
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
  beforeDestroy() { this.requestVersion++ },
  beforeMount() {
    this.loadTags()
    this.getListForCurrentTag('')
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
      border: 1px solid var(--c-border-strong);
      border-radius: 50%;
      background: var(--c-bg-elevated);
      color: var(--c-text-secondary);
      font-size: 22px;
      line-height: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,.08);
      transition: all .2s ease;
      &:hover {
        background: var(--c-bg-elevated);
        color: var(--c-accent-text);
        box-shadow: 0 6px 16px rgba(0,0,0,.12);
      }
      &.disabled {
        opacity: .35;
        cursor: default;
        box-shadow: none;
        &:hover {
          background: var(--c-bg-elevated);
          color: var(--c-text-secondary);
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
