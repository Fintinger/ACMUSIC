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

    <div class="mv-load-more">
      <button v-if="!loading&&hasMore" @click="load()">加载更多</button>
      <p v-if="loading">加载中...</p>
      <p v-if="!hasMore">没有更多了</p>
    </div>
  </div>
</template>

<script>
import MvLayout from "@/components/layout/MvLayout";
import GridSkeleton from "@/components/Skeleton/GridSkeleton";
import * as mvApi from "@/api/Mv";

export default {
  name: "mvList",
  components: {MvLayout, GridSkeleton},
  data() {
    return {
      renderedList: [],
      loading: false,
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
    handleClick(title, i) {
      //更新监听的值
      this.title = title
      this.item = i
      this.params.page = 1
    },
    selectItem(title, i) {
      this.handleClick(title, i)
      this.curCat = null
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
    //GET请求数据触发页面更新
    refreshTheRenderList() {
      this.loading = true
      this.renderedList = []
      this.fadeKey++
      mvApi.all({ area: this.params.area, order: this.params.order, type: this.params.type, limit: this.params.limit }).then(res => {
        this.hasMore = res.data.hasMore
        this.renderedList = res.data.data
      }).finally(() => { this.loading = false })
    },
    load() {
      this.loading = true
      this.page++

      mvApi.all({
        area: this.params.area,
        order: this.params.order,
        type: this.params.type,
        limit: this.params.limit,
        offset: this.params.limit * this.page
      }).then(res => {
        this.hasMore = res.data.hasMore
        this.renderedList.push(...res.data.data)
        this.loading = false
      })
    },
    mvClk(id) {
      this.$bus.$emit('mvClk', id)
    }
  },
  watch: {
    title(val) {
      switch (val) {
        case "地区":
          this.params.area = this.item
          break;
        case "类型":
          this.params.type = this.item
          break;
        case "排序":
          this.params.order = this.item
          break;
      }
    },
    item(val) {
      switch (this.title) {
        case "地区":
          this.params.area = val
          break;
        case "类型":
          this.params.type = val
          break;
        case "排序":
          this.params.order = val
          break;
      }
      this.refreshTheRenderList();
    }
  },
  beforeMount() {
    this.loading = true
    mvApi.first(100).then(res => {
      this.renderedList = res.data.data
    }).finally(() => { this.loading = false })
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
    background: rgba(255,255,255,.55);
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
      color: #555;
      font-weight: 500;
      line-height: 30px;
    }

    .filter-chip {
      display: inline-flex; align-items: center; gap: 6px;
      height: 30px; padding: 0 14px;
      border-radius: 15px;
      background: rgba(129,120,255,.12);
      color: #8178ff; font-size: 13px; font-weight: 500;

      .chip-close {
        display: inline-flex; align-items: center; justify-content: center;
        width: 18px; height: 18px; border-radius: 50%;
        font-style: normal; font-size: 14px; cursor: pointer; line-height: 1;
        transition: background .2s;
        &:hover { background: rgba(129,120,255,.2); }
      }
    }

    .reset-btn {
      font-size: 13px; color: #999; cursor: pointer;
      &:hover { color: #8178ff; }
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
      background: rgba(255,255,255,.45);
      color: #666;
      font-size: 14px;
      cursor: pointer;
      white-space: nowrap;
      transition: all .25s ease;
      &:hover { background: rgba(129,120,255,.08); color: #8178ff; }
      &.active, &.open {
        background: #8178ff;
        color: #fff;
        border-color: transparent;
        box-shadow: 0 5px 12px rgba(129,120,255,.25);
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
    background: rgba(255,255,255,.9);
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
    border: 1px solid rgba(0,0,0,.05);
    background: rgba(255,255,255,.45);
    color: #666;
    font-size: 13px;
    cursor: pointer;
    white-space: nowrap;
    transition: all .25s ease;
    &:hover {
      transform: translateY(-1px);
      background: rgba(129,120,255,.08);
      color: #8178ff;
    }
    &.active {
      background: #8178ff;
      color: #fff;
      border-color: transparent;
      box-shadow: 0 5px 12px rgba(129,120,255,.25);
    }
  }
}
</style>
