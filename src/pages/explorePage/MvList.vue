<template>
  <div class="recommendPlaylist">
    <!-- 筛选面板 -->
    <div class="filter-panel glass-panel">
      <!-- 当前筛选状态（始终显示，默认"全部"无关闭） -->
      <div class="filter-status">
        <span class="status-label">正在浏览:</span>
        <span v-if="!activeFilters.length" class="filter-text">全部</span>
        <template v-else>
          <span
              v-for="f in activeFilters"
              :key="f.key"
              class="filter-chip"
          >
            {{ f.label }}:{{ f.value }}
            <i class="chip-close" @click="clearFilter(f.key)">×</i>
          </span>
          <span class="reset-btn" @click="clearAllFilters">清除</span>
        </template>
      </div>

      <!-- 分类导航：横向排列 + 悬浮下拉 -->
      <div class="category-nav">
        <div v-for="m in mvMenu" :key="m.id" class="category-nav-wrap">
          <button
              class="category-nav-item"
              :class="{ active: curCat === m.title, open: curCat === m.title }"
              @click="toggleCategory(m.title)"
          >
            {{ m.title }}
            <span class="nav-arrow" :class="{ up: curCat === m.title }"></span>
          </button>

          <!-- 悬浮下拉菜单（absolute 定位，不占文档流，限制高度滚动） -->
          <transition name="dropdown">
            <div v-if="curCat === m.title" class="category-dropdown">
              <button
                  v-for="(i, ind) in m.children"
                  :key="ind"
                  class="filter-tag"
                  :class="{ active: title === m.title && item === i }"
                  @click="selectItem(m.title, i)"
              >{{ i }}</button>
            </div>
          </transition>
        </div>
      </div>
    </div>

    <!-- MV 列表 -->
    <el-row class="mvList">
      <GridSkeleton v-if="loading && !renderedList.length" type="mv"/>
      <transition
          v-if="!loading && renderedList.length"
          name="mv-fade"
          mode="out-in"
      >
        <MvLayout :key="fadeKey" :list="renderedList"/>
      </transition>
    </el-row>

    <EmptyState v-if="listError" compact :title="renderedList.length ? '更多 MV 加载失败' : 'MV 加载失败'" desc="请检查网络后重试" action-text="重试" @action="retryList"/>
    <EmptyState v-else-if="!loading && !renderedList.length" compact title="当前筛选下暂无 MV"/>
    <div v-if="!listError && renderedList.length" class="mv-load-more">
      <button v-if="!loading && !loadingMore && hasMore" @click="load()">加载更多</button>
      <p v-if="loading || loadingMore">加载中...</p>
      <p v-if="!hasMore">没有更多了</p>
    </div>
  </div>
</template>

<script>
import EmptyState from '@/components/common/EmptyState';
import MvLayout from "@/components/layout/MvLayout";
import GridSkeleton from "@/components/Skeleton/GridSkeleton";
import * as mvApi from "@/api/Mv";

export default {
  name: "mvList",
  components: {EmptyState, MvLayout, GridSkeleton},
  data() {
    return {
      renderedList: [],
      loading: true,
      listError: false,
      requestVersion: 0,
      offset: 0,
      //翻页专用标志: 与首屏 loading 分离, 避免翻页时列表整体卸载重挂
      loadingMore: false,
      title: "",
      item: '',
      curCat: null,
      page: 1,
      hasMore: true,
      fadeKey: 0,
      params: {
        area: '',
        type: '',
        order: '',
        limit: 12,
      },
      mvMenu: [
        {title: '地区', id: 'diqu', children: ['全部', '内地', '港台', '欧美', '日本', '韩国']},
        {title: '类型', id: 'leixing', children: ['全部', '官方版', '原生', '现场版', "网易出品"]},
        {title: '排序', id: 'paixu', children: ['最新', '上升最快', '最热']},
      ]
    }
  },
  computed: {
    noMore() {
      return false
    },
    activeFilters() {
      return [
        { key: 'area', label: '地区', value: this.params.area },
        { key: 'type', label: '类型', value: this.params.type },
        { key: 'order', label: '排序', value: this.params.order },
      ].filter(f => f.value !== '' && f.value !== '全部')
    }
  },
  methods: {
    selectItem(title, i) {
      this.title = title; this.item = i
      const key = { '地区': 'area', '类型': 'type', '排序': 'order' }[title]
      if (key) this.params[key] = i
      this.curCat = null
      return this.refreshTheRenderList()
    },
    toggleCategory(c) {
      //再次点击当前分类则收起
      this.curCat = this.curCat === c ? null : c
    },
    clearFilter(key) {
      this.params[key] = ''
      this.page = 1
      this.refreshTheRenderList()
    },
    clearAllFilters() {
      this.params.area = ''
      this.params.type = ''
      this.params.order = ''
      this.page = 1
      this.refreshTheRenderList()
    },
    //GET请求数据触发页面更新（切换筛选条件时调用，重置为第一页）
    retryList() { return this.renderedList.length ? this.load() : this.refreshTheRenderList() },
    refreshTheRenderList() { return this.fetchList(true) },
    async fetchList(reset) {
      if (!reset && (this.loading || this.loadingMore || !this.hasMore)) return
      if (reset) { this.requestVersion++; this.offset = 0; this.renderedList = []; this.fadeKey++; this.loadingMore = false; this.loading = true; this.hasMore = true }
      else this.loadingMore = true
      const version = this.requestVersion
      const offset = this.offset
      this.listError = false
      try {
        const res = await this.fetchPage(offset)
        if (version !== this.requestVersion) return
        const body = res.data || {}
        if (!Array.isArray(body.data)) throw new Error('Invalid MV list')
        const seen = new Set(this.renderedList.map(item => item.id))
        this.renderedList.push(...body.data.filter(item => !seen.has(item.id)))
        this.offset = offset + body.data.length
        this.hasMore = body.data.length > 0 && (body.hasMore === undefined ? body.data.length >= this.params.limit : !!body.hasMore)
      } catch (_) { if (version === this.requestVersion) this.listError = true }
      finally { if (version === this.requestVersion) { this.loading = false; this.loadingMore = false } }
    },
    fetchPage(offset) {
      return mvApi.all({
        area: this.params.area,
        order: this.params.order,
        type: this.params.type,
        limit: this.params.limit,
        offset
      })
    },
    load() { return this.fetchList(false) },
    mvClk(id) {
      this.$bus.$emit('mvClk', id)
    }
  },
  beforeDestroy() { this.requestVersion++ },
  beforeMount() {
    //首屏与翻页统一走 /mv/all, 保证列表口径一致。
    //原实现首屏用 /mv/first(100): 实测两个接口返回的数据零重叠, 点"加载更多"会从一批
    //MV 直接跳到另一批, 观感上就是"重新加载"。
    this.renderedList = []
    this.hasMore = true
    this.refreshTheRenderList()
  }
}
</script>

<style lang="scss" scoped>
.recommendPlaylist {
  /* 让 MV 列表创建独立 stacking context，防止卡片内部 z-index 穿透盖住下拉 */
  ::v-deep .mvList {
    position: relative;
    z-index: 0;
  }

  /* 玻璃拟态筛选容器 */
  .glass-panel {
    position: relative;
    z-index: 1;
    background: var(--c-glass);
    backdrop-filter: blur(30px);
    -webkit-backdrop-filter: blur(30px);
    border-radius: 24px;
    border: 1px solid var(--c-border-strong);
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

    .status-label { font-size: 13px; color: var(--c-text-tertiary); }

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
      font-size: 13px; color: var(--c-text-tertiary); cursor: pointer;
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
      border: 1px solid var(--c-border-strong);
      border-radius: 17px;
      background: var(--c-glass);
      color: var(--c-text-secondary);
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
    background: var(--c-glass);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--c-border-strong);
    border-radius: 16px;
    box-shadow: 0 12px 32px rgba(0,0,0,.12);
    scrollbar-width: thin;
    scrollbar-color: var(--c-text-tertiary) transparent;
    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-thumb { background: rgba(0,0,0,.12); border-radius: 2px; }
    &::-webkit-scrollbar-track { background: transparent; }
  }

  /* 下拉动画 */
  .dropdown-enter-active { transition: opacity .25s ease, transform .25s ease; }
  .dropdown-leave-active { transition: opacity .15s ease, transform .15s ease; }
  .dropdown-enter, .dropdown-leave-to { opacity: 0; transform: translateY(-6px); }

  /* MV 列表内容出现 - 轻微上浮 */
  .mv-fade-enter-active { transition: opacity .3s ease, transform .3s ease; }
  .mv-fade-leave-active { transition: opacity .15s ease, transform .15s ease; }
  .mv-fade-enter { opacity: 0; transform: translateY(14px); }
  .mv-fade-leave-to { opacity: 0; transform: translateY(-8px); }

  /* Apple Music pill 标签 */
  .filter-tag {
    height: 32px;
    padding: 0 16px;
    border-radius: 16px;
    border: 1px solid var(--c-border-strong);
    background: var(--c-glass);
    color: var(--c-text-secondary);
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
