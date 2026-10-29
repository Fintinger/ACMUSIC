<template>
  <div class="artistAllSongs">
    <header class="asp-head">
      <div class="asp-avatar">
        <cover-image v-if="arBasicInfo.img1v1Url || arBasicInfo.picUrl"
                     :src="arBasicInfo.img1v1Url || arBasicInfo.picUrl"
                     :alt="(arBasicInfo.name || '歌手') + '的头像'" eager/>
        <div v-else class="asp-avatar-ph"><BaseIcon name="user" :size="28"/></div>
      </div>
      <div class="asp-info">
        <h1 class="asp-name">{{ arBasicInfo.name || '全部歌曲' }}</h1>
        <p class="asp-meta">
          <span>共 {{ total || arBasicInfo.musicSize || '—' }} 首</span>
          <span v-if="songs.length">已加载 {{ songs.length }} 首</span>
        </p>
      </div>
      <button v-if="arBasicInfo.id" class="asp-back" @click="$bus.$emit('arClk', id)">返回歌手页</button>
    </header>

    <TracksLayout v-if="songs.length" :list="songs"/>

    <div v-if="firstLoading" class="asp-state"><i class="el-icon-loading"/> 加载中…</div>
    <div v-else-if="error && !songs.length" class="asp-state">
      加载失败
      <button class="asp-retry" @click="load">重试</button>
    </div>
    <LoadMore v-else :load="load" :loading="loading" :noMore="noMore" noMoreText="已加载全部歌曲"/>
  </div>
</template>

<script>
/**
 * 歌手全部歌曲页
 * - 入口：歌手详情页「热门歌曲 · 全部」
 * - 数据源：/artist/songs?id&limit&offset，返回 { songs, total, more }
 *   热门歌曲最多只有 50 首（/artist/top/song 上限），全量歌曲只能靠这个接口 offset 翻页
 * - 翻页：LoadMore 触底自动续拉（IntersectionObserver），每页 50 首
 */
import LoadMore from "@/components/LoadMore";
import TracksLayout from "@/components/layout/TracksLayout";
import CoverImage from "@/components/common/CoverImage";
import * as artistApi from "@/api/Artist";

const PAGE_SIZE = 50;

export default {
  name: "ArtistAllSongs",
  components: {LoadMore, TracksLayout, CoverImage},
  props: ["id"],
  data() {
    return {
      arBasicInfo: {},
      songs: [],
      total: 0,
      // 接口 more 字段：是否还有下一页
      more: true,
      offset: 0,
      loading: false,
      firstLoading: true,
      error: false,
      // 记住已加载的歌手 id：同一 id 走 keep-alive 回来时不重新拉取，保住滚动位置和已加载的页
      loadedId: null,
    }
  },
  computed: {
    // 接口说没有了，或已拿到的条数够了，都算到底（dedupe 可能让长度略少于 total，所以用 >=）
    noMore() {
      return !this.more || (this.total > 0 && this.songs.length >= this.total)
    }
  },
  methods: {
    load() {
      if (this.loading || this.noMore) return
      this.loading = true
      this.error = false
      artistApi.songs(this.id, PAGE_SIZE, this.offset)
        .then(res => {
          const data = res.data || {}
          const list = data.songs || []
          if (data.total) this.total = data.total
          const seen = new Set(this.songs.map(s => s.id))
          this.songs = this.songs.concat(list.filter(s => !seen.has(s.id)))
          this.offset += list.length
          // 接口没有 more 时按"本页是否满页"兜底判断
          this.more = data.more === undefined ? list.length >= PAGE_SIZE : !!data.more
        })
        .catch(() => { this.error = true })
        .finally(() => {
          // 失败也必须复位，否则「加载中…」永久卡死
          this.loading = false
          this.firstLoading = false
        })
    },
    init() {
      if (this.loadedId === this.id) return
      this.loadedId = this.id
      this.songs = []
      this.offset = 0
      this.total = 0
      this.more = true
      this.firstLoading = true
      artistApi.detail(this.id)
        .then(res => { this.arBasicInfo = res.data.artist || {} })
        .catch(() => { /* 头部信息失败不影响歌曲列表 */ })
      this.load()
    }
  },
  activated() {
    this.init()
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/artistSubPage";

.artistAllSongs { max-width: 1200px; margin: 0 auto; padding-bottom: 80px; }
</style>
