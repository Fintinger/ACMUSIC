<template>
  <div class="searchResult">
    <section class="search-header">
      <h1>搜索结果</h1>
      <p>关于 "{{ keyword }}" 的搜索结果</p>
    </section>

    <section v-if="multiRes.length" class="multimatch-section">
      <h2>智能匹配</h2>
      <div class="resContainer">
        <MultimatchLayout v-for="(res,ind) in multiRes" :key="ind" :name="res.name" :target-list="res.data"/>
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
      <router-view :key="$route.fullpath"></router-view>
    </section>
  </div>
</template>

<script>
import MultimatchLayout from "@/components/layout/MultimatchLayout";

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
      this.$axios('/search/multimatch', {params: {keywords}})
          .then(res => {
            res.data.result.orders.map(val => {
              if (val === "new_mlog") {
                res.data.result.new_mlog.forEach(val => {
                  this.multiRes.push({name: 'new_mlog', data:[ val.baseInfo]})
                })
              } else {
                this.multiRes.push({name: val, data: res.data.result[val]})
              }
            })
          })
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
  background: #fff; border-radius: 16px; padding: 24px;
  box-shadow: 0 4px 16px rgba(0,0,0,.04);
  margin-bottom: 28px;
  h2 { font-size: 18px; font-weight: 700; color: $font-black-1; margin: 0 0 16px; }
  .resContainer { display: flex; flex-wrap: wrap; gap: 12px; }
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
::v-deep .gridLayout li,
::v-deep .mvList li,
::v-deep .user-list > *,
::v-deep .tracksContainer .tracks {
  animation: fadeUp .35s ease both;
}
::v-deep .gridLayout li:nth-child(1) { animation-delay: .02s; }
::v-deep .gridLayout li:nth-child(2) { animation-delay: .06s; }
::v-deep .gridLayout li:nth-child(3) { animation-delay: .10s; }
::v-deep .gridLayout li:nth-child(4) { animation-delay: .14s; }
::v-deep .gridLayout li:nth-child(5) { animation-delay: .18s; }

@keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
</style>
