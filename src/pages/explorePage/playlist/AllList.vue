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
      <div v-if="!categories.length" class="category-nav">
        <span v-for="i in 5" :key="i" class="skel-nav-pill skeleton-item"></span>
      </div>
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
      <GridSkeleton v-if="loading && !renderList.length" type="playlist"/>
      <PlaylistLayout v-if="renderList.length" :list="renderList" pic-name="coverImgUrl"/>
    </el-row>
    <el-row class="load-more">
      <LoadMore :load="load" :loading="loading" :no-more="noMore"/>
    </el-row>
  </div>
</template>

<script>
import PlaylistLayout from "@/components/layout/PlaylistLayout";
import LoadMore from "@/components/LoadMore";
import GridSkeleton from "@/components/Skeleton/GridSkeleton";

export default {
  name: "AllList",
  components: {PlaylistLayout, LoadMore, GridSkeleton},
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
    curTag(n) {
      this.page = 0;
      this.getListByClass(n).then(res => {
        this.renderList = res.data.playlists
        this.more = res.data.more
      }).finally(() => { this.loading = false })
    }
  },
  methods: {
    getCategories() {
      return this.$axios('/playlist/catlist')
    },
    getListByClass(cat) {
      return this.$axios('/top/playlist?', {params: {...this.params, cat, offset: this.offset}})
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
    concurrentRequests() {
      this.loading = true
      this.$axios.all([this.getCategories(), this.getListByClass("全部")])
          .then(this.$axios.spread((categories, list) => {
            this.handleCategoricalData(categories.data);
            this.renderList = list.data.playlists
            this.more = list.data.more
          }))
          .finally(() => { this.loading = false })
    },
    tagClick(tag) {
      this.curTag = tag
      this.curCat = null
      this.loading = true
    },
    resetTag() {
      this.curTag = '全部'
      this.loading = true
    },
    toggleCategory(c) {
      //再次点击当前分类则收起
      this.curCat = this.curCat === c ? null : c
    },
    load() {
      this.page++
      this.loading = true
      this.getListByClass(this.curTag).then(res => {
        res.data.playlists.forEach(val => {
          if (this.renderList.findIndex(item => item.id === val.id) === -1) {
            this.renderList.push(val)
          }
        })
        //记录是否还有更多数据的量
        this.more = res.data.more
        this.loading = false
      })
    }
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
