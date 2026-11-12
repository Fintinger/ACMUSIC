<template>
  <div class="artistAllMvs">
    <header class="asp-head">
      <div class="asp-avatar">
        <cover-image v-if="arBasicInfo.img1v1Url || arBasicInfo.picUrl"
                     :src="arBasicInfo.img1v1Url || arBasicInfo.picUrl"
                     :alt="(arBasicInfo.name || '歌手') + '的头像'" eager/>
        <div v-else class="asp-avatar-ph"><BaseIcon name="user" :size="28"/></div>
      </div>
      <div class="asp-info">
        <h1 class="asp-name">{{ arBasicInfo.name || '全部 MV' }}</h1>
        <p class="asp-meta">
          <!-- 接口只给 hasMore、不给总数，所以能说的只有"已加载多少"，到底了再补"共" -->
          <span>{{ more ? '已加载 ' + mvs.length : '共 ' + mvs.length }} 个</span>
        </p>
      </div>
      <button v-if="arBasicInfo.id" class="asp-back" @click="$bus.$emit('arClk', id)">返回歌手页</button>
    </header>

    <MvLayout v-if="mvs.length" :list="mvs" pic-name="imgurl16v9"/>

    <div v-if="firstLoading || (loading && !mvs.length)" class="asp-state"><BaseIcon class="is-spinning" name="loader"/> 加载中…</div>
    <div v-else-if="error" class="asp-state">
      {{ mvs.length ? '更多 MV 加载失败，已加载内容仍可查看' : 'MV 加载失败，请检查网络' }}
      <button class="asp-retry" @click="load">重试</button>
    </div>
    <EmptyState v-else-if="!mvs.length" compact title="暂无 MV"/>
    <LoadMore v-else :load="load" :loading="loading" :noMore="noMore" noMoreText="已加载全部 MV"/>
  </div>
</template>

<script>
/**
 * 歌手全部 MV 页
 * - 入口：歌手详情页「MV · 更多」（与「热门歌曲 · 全部」「专辑 · 更多」一致，都是整页跳转）
 * - 数据源：/artist/mv?id&limit&offset，返回 { mvs, hasMore }
 *   接口不给总数（arBasicInfo.mvSize 也不准，周杰伦实测 9、实际几百），所以头部只说已加载多少
 * - 翻页：offset 分页，LoadMore 触底续拉，每页 30 个
 */
import EmptyState from '@/components/common/EmptyState';
import LoadMore from "@/components/LoadMore";
import MvLayout from "@/components/layout/MvLayout";
import CoverImage from "@/components/common/CoverImage";
import * as artistApi from "@/api/Artist";

const PAGE_SIZE = 30;

export default {
  name: "ArtistAllMvs",
  components: {EmptyState, LoadMore, MvLayout, CoverImage},
  props: ["id"],
  data() {
    return {
      arBasicInfo: {},
      mvs: [],
      // 接口 hasMore：还有没有下一页
      more: true,
      offset: 0,
      loading: false,
      firstLoading: true,
      error: false,
      // 同一 id 从 keep-alive 回来时不重新拉取，保住已加载的页和滚动位置
      loadedId: null,
    }
  },
  computed: {
    noMore() {
      return !this.more
    }
  },
  methods: {
    load() {
      if (this.loading || this.noMore) return
      this.loading = true
      this.error = false
      return artistApi.mvs(this.id, PAGE_SIZE, this.offset)
        .then(res => {
          const data = res.data || {}
          if (!Array.isArray(data.mvs)) throw new Error('Invalid mvs response')
          const list = data.mvs
          const seen = new Set(this.mvs.map(m => m.id))
          this.mvs = this.mvs.concat(list.filter(m => !seen.has(m.id)))
          this.offset += list.length
          // 接口没有 hasMore 时按"本页是否满页"兜底
          this.more = data.hasMore === undefined ? list.length >= PAGE_SIZE : !!data.hasMore
        })
        .catch(() => { this.error = true })
        .finally(() => {
          // 失败也要复位，否则「加载中…」永久卡死
          this.loading = false
          this.firstLoading = false
        })
    },
    init() {
      if (this.loadedId === this.id) return
      this.loadedId = this.id
      this.mvs = []
      this.offset = 0
      this.more = true
      this.firstLoading = true
      artistApi.detail(this.id)
        .then(res => { this.arBasicInfo = res.data.artist || {} })
        .catch(() => { /* 头部信息失败不影响 MV 列表 */ })
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

// 容器由外层 el-main 统一（max-width 1400 + 24 padding）
.artistAllMvs { padding-bottom: 80px; }

// MV 卡片是 16:9，比专辑封面宽，列宽单独放宽一档
::v-deep .gridLayout {
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)) !important;
  gap: 20px;
}
::v-deep .gridLayout li { padding: 0 !important; }
</style>
