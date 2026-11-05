<template>
  <div class="searchResult">
    <section class="search-header">
      <h1>搜索结果</h1>
      <p>关于 "{{ keyword }}" 的搜索结果</p>
    </section>

    <section v-if="multiRes.length" class="multimatch-section">
      <h2>智能匹配</h2>
      <!-- 一块面板装所有类型，类型标题在面板内按行排（原先是每个类型一张卡并排 → 高度对不齐） -->
      <div class="mm-panel">
        <MultimatchLayout v-for="res in multiRes" :key="res.name" :name="res.name" :target-list="res.data"/>
      </div>
    </section>

    <section class="search-tabs ac-tabs">
      <router-link
        v-for="t in tabList"
        :key="t.name"
        :to="{name: t.name, query: {keyword}}"
        :class="{ active: $route.name === t.name }"
      >{{ t.label }}</router-link>
    </section>

    <section class="search-content">
      <!-- 只替换分类内容；keep-alive 保证现有九分类 activated 取数入口继续生效。 -->
      <keep-alive :max="1">
        <router-view :key="$route.name"/>
      </keep-alive>
    </section>
  </div>
</template>

<script>
import MultimatchLayout from "@/components/layout/MultimatchLayout";
import * as searchApi from "@/api/Search";

export default {
  name: "SearchResult",
  props: ["keyword"],
  components: {MultimatchLayout},
  data() {
    return {
      tabList: [
        { name: 'trackList',   label: '歌曲' },
        { name: 'albumRes',    label: '专辑' },
        { name: 'artistRes',   label: '歌手' },
        { name: 'mvRes',       label: 'MV' },
        { name: 'playlistRes', label: '歌单' },
        { name: 'lyricRes',    label: '歌词' },
        { name: 'userRes',     label: '用户' },
        { name: 'videoRes',    label: '视频' },
        { name: 'voiceRes',    label: '声音' },
      ],
      multiRes: [],
    }
  },
  watch: {
    keyword: {
      immediate: true,
      handler(keywords) {
        this.getMultimatch(keywords)
      }
    }
  },
  methods: {
    getMultimatch(keywords) {
      this.multiRes = []
      if (!keywords) return
      searchApi.multimatch(keywords)
          .then(res => {
            const result = (res.data && res.data.result) || {}
            const orders = Array.isArray(result.orders) ? result.orders : []
            const rows = []
            // 只认这 4 种：接口的 orders 里还可能混进 video/djprogram 等类型，
            // 没有对应渲染分支，推进来就是一个空行 + 空标题
            orders.forEach(val => {
              if (val === 'new_mlog') {
                const mlogData = Array.isArray(result.new_mlog) ? result.new_mlog : []
                const list = mlogData.map(item => item && item.baseInfo).filter(Boolean)
                if (list.length) rows.push({name: 'new_mlog', data: list})
                return
              }
              if (!['artist', 'playlist', 'album'].includes(val)) return
              const list = result[val]
              if (Array.isArray(list) && list.length) rows.push({name: val, data: list})
            })
            this.multiRes = rows
          })
          .catch(() => { this.multiRes = [] })
    }
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/base/variables";

.searchResult {
  // 容器由外层 el-main 统一（max-width 1200 + 24 padding）
  padding-bottom: 60px;
  background: transparent;
}

.search-header {
  padding: $sp-6 0 $sp-5;
  h1 { font-size: $fs-page; font-weight: 700; line-height: 1.3; color: $font-black; margin: 0 0 $sp-2; }
  p { font-size: 14px; color: $font-black-2; margin: 0; }
}

.multimatch-section {
  margin-bottom: 28px;
  h2 { font-size: $fs-module; font-weight: 700; color: $font-black-1; margin: 0; }
  .mm-panel {
    display: flex;
    align-items: flex-start;
    gap: $sp-5;
    width: 100%;
    padding: $sp-5 $sp-5 14px;
    box-sizing: border-box;
    background: var(--c-bg-sunken);
    border-radius: 24px;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, .14) transparent;

    &::-webkit-scrollbar { height: 6px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, .14);
      border-radius: 3px;
    }
    &::-webkit-scrollbar-thumb:hover { background: rgba(0, 0, 0, .24); }
  }
}

.search-tabs { --tab-inline-space: 18px; }

.search-content { margin-top: 8px; min-height: 500px; }
::v-deep h2 + * { margin-top: 20px; }
::v-deep .user-list > *,
::v-deep .tracksContainer .tracks {
  animation: fadeUp .35s ease both;
}

@keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
</style>
