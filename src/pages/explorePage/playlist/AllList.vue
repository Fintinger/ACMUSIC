<template>
  <div class="all-list">
    <!-- 筛选面板 -->
    <div class="filter-panel glass-panel">
      <!-- 当前筛选状态（始终显示，默认"全部"无关闭） -->
      <div class="filter-status">
        <span class="status-label">正在浏览:</span>
        <span v-if="curTag === '全部'" class="filter-text">全部</span>
        <template v-else>
          <span class="filter-chip">
            {{ curTag }}
            <i class="chip-close" @click="resetTag">×</i>
          </span>
          <span class="reset-btn" @click="resetTag">清除</span>
        </template>
      </div>

      <!-- 分类导航：横向排列 + 悬浮下拉 -->
      <div v-if="categoriesLoading && !categories.length" class="category-nav">
        <span v-for="i in 5" :key="i" class="skel-nav-pill skeleton-item"></span>
      </div>
      <EmptyState v-else-if="categoriesError" compact title="分类加载失败" action-text="重试分类" @action="loadCategories"/>
      <div v-else class="category-nav">
        <div
            v-for="c in categories"
            :key="c"
            class="category-nav-wrap"
        >
          <button
              class="category-nav-item"
              :class="{ active: curCat === c, open: curCat === c }"
              @click="toggleCategory(c)"
          >
            {{ c }}
            <span class="nav-arrow" :class="{ up: curCat === c }"></span>
          </button>

          <!-- 悬浮下拉菜单（absolute 定位，不占文档流，限制高度滚动） -->
          <transition name="dropdown">
            <div v-if="curCat === c && allTag[c]" class="category-dropdown">
              <button
                  v-for="t in allTag[c]"
                  :key="t.name"
                  class="filter-tag"
                  :class="{ active: curTag === t.name }"
                  @click="tagClick(t.name)"
              >{{ t.name }}</button>
            </div>
          </transition>
        </div>
      </div>
    </div>

    <!-- 歌单列表 -->
    <el-row class="render-list">
      <GridSkeleton v-if="(loading || initialLoading) && !renderList.length" type="playlist"/>
      <PlaylistLayout v-if="renderList.length" :list="renderList" pic-name="coverImgUrl"/>
    </el-row>
    <EmptyState v-if="listError" compact :title="renderList.length ? '更多歌单加载失败' : '歌单加载失败'" desc="请检查网络后重试" action-text="重试" @action="retryList"/>
    <EmptyState v-else-if="!initialLoading && !loading && !renderList.length" compact title="这个分类暂无歌单"/>
    <el-row v-if="!initialLoading && !listError && renderList.length" class="load-more">
      <LoadMore :load="load" :loading="loading" :no-more="noMore"/>
    </el-row>
  </div>
</template>

<script>
import EmptyState from '@/components/common/EmptyState';
import PlaylistLayout from "@/components/layout/PlaylistLayout";
import LoadMore from "@/components/LoadMore";
import GridSkeleton from "@/components/Skeleton/GridSkeleton";
import * as playlistApi from "@/api/Playlist";

export default {
  name: "AllList",
  components: {EmptyState, PlaylistLayout, LoadMore, GridSkeleton},
  data() {
    return {
      categories: [],
      allTag: {},
      curTag: "全部",
      curCat: null,
      renderList: [],
      params: {
        cat: "全部",
        limit: 24,
        order: 'hot',
      },
      page: 0,
      loading: false,
      initialLoading: true,
      listError: false,
      categoriesError: false,
      categoriesLoading: false,
      requestVersion: 0,
      more: true,
    }
  },
  computed: {
    offset() {
      return this.params.limit * this.page
    },
    noMore() {
      return !this.more
    }
  },
  watch: {
    curTag() { this.fetchList(true) }
  },
  beforeDestroy() { this.requestVersion++ },
  methods: {
    getCategories() {
      return playlistApi.catlist()
    },
    getListByClass(cat) {
      return playlistApi.top({...this.params, cat, offset: this.offset})
    },
    handleCategoricalData(cat) {
      //将得到的对象类型的分类数据变成数组类型
      this.categories = Array.from(Object.values(cat.categories), x => x);

      //解析各分类下的tag
      //1:先初始化allTag对象
      this.categories.map(val => {
        this.allTag[val] = []
      })
      //2:allTag对象中加入内容
      cat.sub.map(val => {
        this.allTag[this.categories[val.category]].push(val)
      })
    },
    async loadCategories() {
      if (this.categoriesLoading) return
      this.categoriesLoading = true; this.categoriesError = false
      try {
        const res = await this.getCategories()
        if (!res.data || !res.data.categories || !Array.isArray(res.data.sub)) throw new Error('Invalid categories')
        this.handleCategoricalData(res.data)
      } catch (_) { this.categoriesError = true }
      finally { this.categoriesLoading = false }
    },
    concurrentRequests() { return Promise.all([this.loadCategories(), this.fetchList(true)]) },
    retryList() { return this.fetchList(!this.renderList.length) },
    async fetchList(reset) {
      if (!reset && (this.loading || this.noMore)) return
      if (reset) { this.requestVersion++; this.page = 0; this.more = true; this.renderList = []; this.initialLoading = true }
      const version = this.requestVersion
      const page = reset ? 0 : this.page + 1
      this.loading = true; this.listError = false
      try {
        const res = await playlistApi.top({...this.params, cat: this.curTag, offset: page * this.params.limit})
        if (version !== this.requestVersion) return
        const data = res.data || {}
        if (!Array.isArray(data.playlists)) throw new Error('Invalid playlists')
        const seen = new Set(this.renderList.map(item => item.id))
        this.renderList = this.renderList.concat(data.playlists.filter(item => !seen.has(item.id)))
        this.page = page
        this.more = data.playlists.length > 0 && (data.more === undefined ? data.playlists.length >= this.params.limit : !!data.more)
      } catch (_) { if (version === this.requestVersion) this.listError = true }
      finally { if (version === this.requestVersion) { this.loading = false; this.initialLoading = false } }
    },
    tagClick(tag) {
      this.curTag = tag
      this.curCat = null
    },
    resetTag() {
      this.curTag = '全部'
      this.curCat = null
    },
    toggleCategory(c) {
      //再次点击当前分类则收起
      this.curCat = this.curCat === c ? null : c
    },
    load() { return this.fetchList(false) }
  },
  activated() {
    //初步加载分类名和全部分类下的歌单
    this.concurrentRequests()
  }
}
</script>

<style lang="scss" scoped>
.all-list {
  /* 让歌单列表创建独立 stacking context，防止卡片内部 z-index(playCount:3)穿透盖住下拉 */
  ::v-deep .render-list {
    position: relative;
    z-index: 0;
  }

  /* 玻璃拟态筛选容器 */
  .glass-panel {
    position: relative;
    z-index: 1;
    background: var(--c-bg-elevated);
    backdrop-filter: blur(30px);
    -webkit-backdrop-filter: blur(30px);
    border-radius: 24px;
    border: 1px solid rgba(255,255,255,.45);
    box-shadow: 0 12px 40px rgba(0,0,0,.06);
    padding: 16px 24px;
    margin-bottom: 28px;
  }

  /* 当前筛选状态 */
  .filter-status {
    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    min-height: 30px;
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(0,0,0,.04);

    .status-label { font-size: 13px; color: #999; }

    .filter-text {
      font-size: 13px;
      color: var(--c-text-secondary);
      font-weight: 500;
      line-height: 30px;
    }

    .filter-chip {
      display: inline-flex; align-items: center; gap: 6px;
      height: 30px; padding: 0 14px;
      border-radius: 15px;
      background: rgba(var(--theme-accent-rgb),.12);
      color: var(--c-accent-text); font-size: 13px; font-weight: 500;

      .chip-close {
        display: inline-flex; align-items: center; justify-content: center;
        width: 18px; height: 18px; border-radius: 50%;
        font-style: normal; font-size: 14px; cursor: pointer; line-height: 1;
        transition: background .2s;
        &:hover { background: rgba(var(--theme-accent-rgb),.2); }
      }
    }

    .reset-btn {
      font-size: 13px; color: #999; cursor: pointer;
      &:hover { color: var(--c-accent-text); }
    }
  }

  /* 分类导航 - 横向排列 */
  .category-nav {
    display: flex;
    gap: 10px;
    padding: 4px 0;
    position: relative;
    z-index: 999;

    .category-nav-wrap {
      position: relative;
      flex-shrink: 0;
    }

    .category-nav-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 34px;
      padding: 0 16px;
      border: 1px solid rgba(0,0,0,.05);
      border-radius: 17px;
      background: var(--c-bg-elevated);
      color: #666;
      font-size: 14px;
      cursor: pointer;
      white-space: nowrap;
      transition: all .25s ease;
      &:hover { background: rgba(var(--theme-accent-rgb),.08); color: var(--c-accent-text); }
      &.active, &.open {
        background: var(--c-button-primary);
        color: var(--c-text-on-accent);
        border-color: transparent;
        box-shadow: 0 5px 12px rgba(var(--theme-accent-rgb),.25);
      }

      .nav-arrow {
        display: inline-block;
        width: 6px; height: 6px;
        border-right: 1.5px solid currentColor;
        border-bottom: 1.5px solid currentColor;
        transform: rotate(45deg);
        transition: transform .25s ease;
        &.up { transform: rotate(-135deg); }
      }
    }
  }

  /* 分类导航骨架屏 */
  .skel-nav-pill {
    width: 72px;
    height: 34px;
    border-radius: 17px;
    flex-shrink: 0;
  }

  /* 悬浮下拉菜单 - absolute 定位不占文档流 */
  .category-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    z-index: 9999;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    width: 320px;
    max-height: 220px;
    overflow-y: auto;
    padding: 12px 14px;
    background: var(--c-bg-elevated);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255,255,255,.6);
    border-radius: 16px;
    box-shadow: 0 12px 32px rgba(0,0,0,.12);
    scrollbar-width: thin;
    scrollbar-color: rgba(0,0,0,.12) transparent;
    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-thumb { background: rgba(0,0,0,.12); border-radius: 2px; }
    &::-webkit-scrollbar-track { background: transparent; }
  }

  /* 下拉动画 */
  .dropdown-enter-active { transition: opacity .25s ease, transform .25s ease; }
  .dropdown-leave-active { transition: opacity .15s ease, transform .15s ease; }
  .dropdown-enter, .dropdown-leave-to { opacity: 0; transform: translateY(-6px); }

  /* Apple Music pill 标签 */
  .filter-tag {
    height: 32px;
    padding: 0 16px;
    border-radius: 16px;
    border: 1px solid rgba(0,0,0,.05);
    background: var(--c-bg-elevated);
    color: #666;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
    transition: all .25s ease;
    &:hover {
      transform: translateY(-1px);
      background: rgba(var(--theme-accent-rgb),.08);
      color: var(--c-accent-text);
    }
    &.active {
      background: var(--c-button-primary);
      color: var(--c-text-on-accent);
      border-color: transparent;
      box-shadow: 0 5px 12px rgba(var(--theme-accent-rgb),.25);
    }
  }
}
</style>
