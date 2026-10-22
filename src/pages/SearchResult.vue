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

    <section class="search-tabs">
      <router-link
        v-for="t in tabList"
        :key="t.name"
        :to="{name: t.name, query: {keyword}}"
        :class="{ active: $route.name === t.name }"
      >{{ t.label }}</router-link>
    </section>

    <section class="search-content">
      <!-- 这里曾经是 :key="$route.fullpath"（大小写拼错，实际值恒为 undefined）。
           外层 App.vue 的 router-view 已用 $route.fullPath 作 key，URL（含 keyword）变化时
           整个 SearchResult 会被 keep-alive 重建 → 9 个搜索子视图的 activated() 必然重新取数，
           所以本层 key 既冗余、又只会在「SearchResult 被复用」时制造出拿不到 activated() 的
           新子实例，故直接移除，不再补 :key。 -->
      <router-view/>
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
  max-width: 1200px; margin: 0 auto; padding-bottom: 60px;
  background: transparent;
}

.search-header {
  padding: 40px 0 24px;
  h1 { font-size: 28px; font-weight: 700; color: $font-black; margin: 0 0 8px; }
  p { font-size: 14px; color: $font-black-2; margin: 0; }
}

.multimatch-section {
  margin-bottom: 28px;
  h2 { font-size: 18px; font-weight: 700; color: $font-black-1; margin: 0; }
  .mm-panel {
    display: flex;
    align-items: flex-start;
    gap: 24px;
    width: 100%;
    padding: 24px 24px 14px;
    box-sizing: border-box;
    background: #f7f8fa;
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

.search-tabs {
  display: flex; gap: 0; margin-bottom: 24px;
  border-bottom: 1px solid rgba(0,0,0,.06);
  overflow-x: auto;
  a {
    padding: 12px 18px; font-size: 14px; font-weight: 500;
    color: $font-black-2; border-bottom: 2px solid transparent;
    margin-bottom: -1px; text-decoration: none;
    transition: color .2s, border-color .2s; white-space: nowrap;
    &:hover { color: $font-black-1; }
    &.active, &.router-link-active { color: $color-main; font-weight: 600; border-bottom-color: $color-main; }
  }
}

.search-content { margin-top: 8px; min-height: 500px; }
::v-deep h2 + * { margin-top: 20px; }
::v-deep .user-list > *,
::v-deep .tracksContainer .tracks {
  animation: fadeUp .35s ease both;
}

@keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
</style>
