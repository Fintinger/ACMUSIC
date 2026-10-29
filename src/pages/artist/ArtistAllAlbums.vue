<template>
  <div class="artistAllAlbums">
    <header class="asp-head">
      <div class="asp-avatar">
        <cover-image v-if="arBasicInfo.img1v1Url || arBasicInfo.picUrl"
                     :src="arBasicInfo.img1v1Url || arBasicInfo.picUrl"
                     :alt="(arBasicInfo.name || '歌手') + '的头像'" eager/>
        <div v-else class="asp-avatar-ph"><BaseIcon name="user" :size="28"/></div>
      </div>
      <div class="asp-info">
        <h1 class="asp-name">{{ arBasicInfo.name || '全部专辑' }}</h1>
        <p class="asp-meta">
          <span>共 {{ arBasicInfo.albumSize || total || '—' }} 张</span>
          <span v-if="albums.length">已加载 {{ albums.length }} 张</span>
        </p>
      </div>
      <button v-if="arBasicInfo.id" class="asp-back" @click="$bus.$emit('arClk', id)">返回歌手页</button>
    </header>

    <AlbumLayout v-if="albums.length" :list="albums"/>

    <div v-if="firstLoading" class="asp-state"><i class="el-icon-loading"/> 加载中…</div>
    <div v-else-if="error && !albums.length" class="asp-state">
      加载失败
      <button class="asp-retry" @click="load">重试</button>
    </div>
    <LoadMore v-else :load="load" :loading="loading" :noMore="noMore" noMoreText="已加载全部专辑"/>
  </div>
</template>

<script>
/**
 * 歌手全部专辑页
 * - 入口：歌手详情页「专辑 · 更多」
 * - 数据源：/artist/album?id&limit&offset，返回 { artist, hotAlbums, more }
 *   接口没有 total，总数用 artist.albumSize（实测周杰伦 47、陈奕迅 142，与实际条数一致）
 * - 翻页：offset 分页，LoadMore 触底续拉，每页 40 张
 */
import LoadMore from "@/components/LoadMore";
import AlbumLayout from "@/components/layout/AlbumLayout";
import CoverImage from "@/components/common/CoverImage";
import * as artistApi from "@/api/Artist";

const PAGE_SIZE = 40;

export default {
  name: "ArtistAllAlbums",
  components: {LoadMore, AlbumLayout, CoverImage},
  props: ["id"],
  data() {
    return {
      arBasicInfo: {},
      albums: [],
      total: 0,
      more: true,
      offset: 0,
      loading: false,
      firstLoading: true,
      error: false,
      loadedId: null,
    }
  },
  computed: {
    noMore() {
      return !this.more || (this.total > 0 && this.albums.length >= this.total)
    }
  },
  methods: {
    load() {
      if (this.loading || this.noMore) return
      this.loading = true
      this.error = false
      artistApi.albums(this.id, PAGE_SIZE, this.offset)
        .then(res => {
          const data = res.data || {}
          const list = data.hotAlbums || []
          const artist = data.artist || {}
          if (artist.albumSize) this.total = artist.albumSize
          const seen = new Set(this.albums.map(a => a.id))
          this.albums = this.albums.concat(list.filter(a => !seen.has(a.id)))
          this.offset += list.length
          // 接口没有 more 时按"本页是否满页"兜底
          this.more = data.more === undefined ? list.length >= PAGE_SIZE : !!data.more
        })
        .catch(() => { this.error = true })
        .finally(() => {
          this.loading = false
          this.firstLoading = false
        })
    },
    init() {
      if (this.loadedId === this.id) return
      this.loadedId = this.id
      this.albums = []
      this.offset = 0
      this.total = 0
      this.more = true
      this.firstLoading = true
      artistApi.detail(this.id)
        .then(res => { this.arBasicInfo = res.data.artist || {} })
        .catch(() => { /* 头部信息失败不影响专辑列表 */ })
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

.artistAllAlbums {
  max-width: 1200px;
  margin: 0 auto;
  padding-bottom: 80px;
}

::v-deep .gridLayout {
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)) !important;
  gap: 20px;
}
::v-deep .gridLayout li { padding: 0 !important; }
</style>
