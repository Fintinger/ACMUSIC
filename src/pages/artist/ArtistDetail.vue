<template>
  <div class="artistDetail">
    <div v-if="loading" class="artist-hero skel-hero">
      <div class="hero-content">
        <div class="hero-avatar skel-avatar skeleton-item"></div>
        <div class="hero-info">
          <div class="skel-line skel-line--lg skeleton-item"></div>
          <div class="skel-line skel-line--md skeleton-item"></div>
          <div class="skel-line skel-line--sm skeleton-item"></div>
        </div>
      </div>
    </div>
    <div v-if="loading" class="skel-sections">
      <div v-for="s in 4" :key="s" class="skel-sec">
        <div class="skel-line skel-line--title skeleton-item"></div>
        <div class="skel-grid">
          <div v-for="c in 4" :key="c" class="skel-card"><div class="skel-card-img skeleton-item"></div><div class="skel-card-line skeleton-item"></div></div>
        </div>
      </div>
    </div>
      <div v-if="arBasicInfo.name && !loading" class="artist-hero">
      <div class="hero-bg" :style="{backgroundImage: `url(${arBasicInfo.img1v1Url||arBasicInfo.picUrl})`}"></div>
      <div class="hero-content">
        <div class="hero-avatar">
          <cover-image :src="arBasicInfo.img1v1Url||arBasicInfo.picUrl" :alt="arBasicInfo.name + '的头像'" eager/>
        </div>
        <div class="hero-info">
          <h1 class="hero-name">{{ arBasicInfo.name }}</h1>
          <p class="hero-alias" v-if="arBasicInfo.alias">{{ arBasicInfo.alias.join(' / ') }}</p>
          <p class="hero-stats">{{ arBasicInfo.musicSize }} 首歌 · {{ arBasicInfo.albumSize }} 张专辑 · {{ arBasicInfo.mvSize }} 个 MV</p>
          <p class="hero-desc" v-if="arBasicInfo.briefDesc" :title="arBasicInfo.briefDesc">{{ arBasicInfo.briefDesc }}</p>
        </div>
        <!-- 关注歌手：/artists?id= 返回的 artist.followed 即初始状态 -->
        <div class="hero-actions" v-if="isLogin">
          <button class="followBtn" :class="{ 'is-followed': followed }" :disabled="followPending"
                  :title="followed ? '点击取消收藏' : '收藏该歌手'" @click="toggleFollow">
            <i v-if="followPending" class="el-icon-loading"></i>
            <template v-else-if="followed">已关注</template>
            <template v-else>关注</template>
          </button>
        </div>
      </div>
    </div>

    <template v-if="!loading">
    <section class="ar-section">
      <div class="section-head">
        <h2>热门歌曲</h2>
        <!-- 热门只到 50 首（/artist/top/song 上限），全部歌曲走独立页分页 -->
        <span class="section-more" @click="arAsClk(id)" title="查看该歌手的全部歌曲">
          全部 <BaseIcon name="arrowRight"/>
        </span>
      </div>
      <TracksLayout v-if="top50songs.length" :list="top50songs.slice(0, SONG_PREVIEW)"/>
    </section>

    <section class="ar-section">
      <div class="section-head">
        <h2>专辑<em v-if="arBasicInfo.albumSize" class="section-count">{{ arBasicInfo.albumSize }} 张</em></h2>
        <!-- 详情页只展示前 8 张，全量走 /artistAllAlbums 独立页（offset 分页） -->
        <span v-if="hasMoreAlbums" class="section-more" @click="arAlClk(id)" title="查看该歌手的全部专辑">
          更多 <BaseIcon name="arrowRight"/>
        </span>
      </div>
      <AlbumLayout v-if="hotAlbums.length" :list="hotAlbums.slice(0, CARD_PREVIEW)"/>
    </section>

    <section class="ar-section ar-mv-section">
      <div class="section-head">
        <h2>MV<em v-if="arBasicInfo.mvSize" class="section-count">{{ arBasicInfo.mvSize }} 个</em></h2>
        <span v-if="mvToggleable" class="section-more" :class="{ 'is-loading': mvPaging.loading }"
              @click="toggleMvs">
          <template v-if="mvPaging.loading"><i class="el-icon-loading"/> 加载中…</template>
          <template v-else>{{ expanded.mvs ? '收起' : '更多' }} <BaseIcon :name="expanded.mvs ? 'arrowUp' : 'arrowRight'"/></template>
        </span>
      </div>
      <MvLayout v-if="mvs.length" :list="expanded.mvs ? mvs : mvs.slice(0, CARD_PREVIEW)" pic-name="imgurl16v9"/>
    </section>

    <section class="ar-section ar-video-section">
      <div class="section-head">
        <h2>视频</h2>
        <!-- /artist/video 是 cursor 分页、一次一批，所以这里只能"换一批"而不是累计展开 -->
        <el-button size="small" :loading="vidLoading" @click="loadMoreVid" style="margin-right:8px">换一批</el-button>
      </div>
      <VideoLayout v-if="videos.length" :list="videos" :is-mlog="true"/>
    </section>

    <section class="ar-section ar-simi-section">
      <div class="section-head">
        <h2>相似歌手</h2>
        <!-- /simi/artist 固定返回 20 个，没有分页参数，所以最多只能展开到 20 -->
        <span v-if="simiArtists.length > CARD_PREVIEW" class="section-more" @click="expanded.simi = !expanded.simi">
          {{ expanded.simi ? '收起' : '更多' }} <BaseIcon :name="expanded.simi ? 'arrowUp' : 'arrowRight'"/>
        </span>
      </div>
      <ArtistLayout v-if="simiArtists.length" :list="expanded.simi ? simiArtists : simiArtists.slice(0, CARD_PREVIEW)"/>
    </section>
    </template>
  </div>
</template>

<script>
import TracksLayout from "@/components/layout/TracksLayout";
import AlbumLayout from "@/components/layout/AlbumLayout";
import ArtistLayout from "@/components/layout/ArtistLayout";
import MvLayout from "@/components/layout/MvLayout";
import VideoLayout from "@/components/layout/VideoLayout";
import CoverImage from "@/components/common/CoverImage";
import * as artistApi from "@/api/Artist";

// 首屏各区块只渲染 CARD_PREVIEW 张，专辑多取几张做缓冲（点「更多」是整页跳转，不再续拉）
const ALBUM_INIT = 12;
const MV_INIT = 16;
const MV_PAGE = 50;

export default {
  name: "ArtistDetail",
  props: ["id"],
  components: {TracksLayout, AlbumLayout, ArtistLayout, MvLayout, VideoLayout, CoverImage},
  data() {
    return {
      arBasicInfo: {},
      top50songs: [], hotAlbums: [], mvs: [], simiArtists: [], videos: [],
      vidParams: { id: this.id, cursor: 0, order: 1 },
      vidLoading: false,
      loading: true,
      // 展示数量常量（模板里要用，必须挂在实例上）
      SONG_PREVIEW: 5,
      CARD_PREVIEW: 8,
      /**
       * 展开状态必须在这里一次性声明全。
       * 原实现写成 `expanded: {}`（空对象）再靠 `expanded.mvs = !expanded.mvs` 赋值 ——
       * Vue 2 侦测不到对象新增属性，赋值没有 setter，视图不会重渲染，
       * 表现就是「【更多】点了完全没反应」。改成预声明后才是响应式的。
       */
      expanded: { mvs: false, simi: false },
      // 专辑还有没有下一页（只用来判断是否显示【更多】，真正的分页在 ArtistAllAlbums 页里做）
      albumMore: false,
      // /artist/mv 是 offset 分页（返回 hasMore），用游标对象记录，展开时按页续拉
      mvPaging: { offset: 0, more: false, loading: false },
      // 关注歌手（收藏歌手）状态
      followed: false,
      followPending: false,
    }
  },
  computed: {
    isLogin() {
      return this.$store.getters["UserAbout/isLogin"]
    },
    /** 专辑区块是否显示【更多】（跳转全部专辑页） */
    hasMoreAlbums() {
      return this.arBasicInfo.albumSize > this.CARD_PREVIEW
        || this.albumMore
        || this.hotAlbums.length > this.CARD_PREVIEW
    },
    mvToggleable() {
      return this.expanded.mvs || this.mvPaging.more || this.mvs.length > this.CARD_PREVIEW
    }
  },
  methods: {
    alClk(id) { this.$bus.$emit('alClk', id) },
    arClk(id) { this.$bus.$emit('arClk', id) },
    /** 跳到「该歌手全部歌曲」页（App.vue 里监听 arAsClk 做路由跳转） */
    arAsClk(id) { this.$bus.$emit('arAsClk', id) },
    /** 跳到「该歌手全部专辑」页（App.vue 里监听 arAlClk 做路由跳转） */
    arAlClk(id) { this.$bus.$emit('arAlClk', id) },
    songClk(song) { this.$bus.$emit('songClk', song) },
    mvClick(id) { this.$bus.$emit('mvClk', id) },

    /** MV：【更多】= 展开并自动续拉到最后一页；展开后点击变【收起】 */
    toggleMvs() {
      if (this.mvPaging.loading) return
      this.expanded.mvs = !this.expanded.mvs
      if (this.expanded.mvs) this.loadRestMvs()
    },
    loadRestMvs() {
      if (!this.mvPaging.more || this.mvPaging.loading) return Promise.resolve()
      this.mvPaging.loading = true
      const step = () => {
        if (!this.mvPaging.more || !this.expanded.mvs) return Promise.resolve()
        return artistApi.mvs(this.id, MV_PAGE, this.mvPaging.offset).then(res => {
          const data = res.data || {}
          const list = data.mvs || []
          if (!list.length) { this.mvPaging.more = false; return }
          const seen = new Set(this.mvs.map(m => m.id))
          this.mvs = this.mvs.concat(list.filter(m => !seen.has(m.id)))
          this.mvPaging.offset += list.length
          this.mvPaging.more = !!data.hasMore
          return step()
        })
      }
      return step()
        .catch(() => this.$toast.error('MV 加载失败，请稍后重试'))
        .finally(() => { this.mvPaging.loading = false })
    },

    /** 关注 / 取消关注该歌手 */
    toggleFollow() {
      if (this.followPending || !this.isLogin) return
      if (!this.followed) return this.setFollow(1)
      this.$confirmBox({
        title: '取消关注',
        message: `取消后你将不再收藏「${this.arBasicInfo.name}」，其新歌也不会出现在你的关注动态里。`,
        confirmText: '仍然取消',
        cancelText: '继续关注',
        distinguishCancelAndClose: true,
      })
        .then(() => this.setFollow(0))
        .catch(() => { /* 继续关注 */ })
    },
    setFollow(t) {
      this.followPending = true
      artistApi.subArtist(this.id, t)
        .then(res => {
          const code = res && res.data && res.data.code
          if (code === 200) {
            const on = t === 1
            this.followed = on
            this.$set(this.arBasicInfo, 'followed', on)
            this.$toast.success(on ? '已关注该歌手' : '已取消关注')
          } else if (code === 301 || code === 302) {
            // 未登录时 /artist/sub 返回 301「未登录」
            this.$toast.warning('登录态已失效，请重新登录后再试')
          } else {
            this.$toast.error('关注失败，请稍后重试')
          }
        })
        .catch(() => this.$toast.error('网络异常，关注失败，请检查网络后重试'))
        .finally(() => { this.followPending = false })
    },
    getAtDetail() { return artistApi.detail(this.id) },
    getTop50() { return artistApi.topSongs(this.id) },
    getAlbum() { return artistApi.albums(this.id, ALBUM_INIT, 0) },
    getMVs() { return artistApi.mvs(this.id, MV_INIT, 0) },
    getSimiAt() { return artistApi.simi(this.id) },
    getVid() { return artistApi.videos(this.vidParams) },
    /** 换一批视频：cursor 分页，一批一批替换；到底后把游标复位，避免反复点击毫无反馈 */
    loadMoreVid() {
      if (this.vidLoading) return
      this.vidLoading = true
      this.getVid()
        .then(res => {
          const data = (res.data && res.data.data) || {}
          const page = data.page || {}
          const records = data.records || []
          if (records.length) this.videos = records
          if (page.more) {
            this.vidParams.cursor = page.cursor
          } else {
            this.vidParams.cursor = 0
            this.$toast.info('已经是最后一批了')
          }
        })
        .catch(() => this.$toast.error('视频加载失败，请稍后重试'))
        .finally(() => { this.vidLoading = false })
    }
  },
  activated() {
    this.loading = true
    // 重新进入页面时列表会重拉，MV 的展开态一并复位，避免"展开着但只剩 16 个"的错位
    this.expanded = { mvs: false, simi: false }
    this.$nextTick(() => {
    this.$axios.all([this.getAtDetail(), this.getTop50(), this.getAlbum(), this.getMVs(), this.getSimiAt(), this.getVid()])
        .then(this.$axios.spread((AtDetail, Top50, Album, MVs, SimiAt, video) => {
          this.arBasicInfo = AtDetail.data.artist
          this.followed = !!this.arBasicInfo.followed
          this.top50songs = Top50.data.songs

          const albumData = Album.data || {}
          this.hotAlbums = albumData.hotAlbums || []
          this.albumMore = !!albumData.more

          const mvData = MVs.data || {}
          this.mvs = mvData.mvs || []
          this.mvPaging.offset = this.mvs.length
          this.mvPaging.more = !!mvData.hasMore

          this.simiArtists = SimiAt.data.artists
          this.videos = video.data.data.records
          this.vidParams.cursor = video.data.data.page.cursor
        }))
        .finally(() => { this.loading = false })
    })
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/base/variables";

.artistDetail { max-width: 1200px; margin: 0 auto; padding-bottom: 80px; }

.artist-hero {
  position: relative; border-radius: 20px; overflow: hidden; margin-bottom: 40px;
  .hero-bg {
    position: absolute; inset: 0; background-size: cover; background-position: center;
    filter: blur(40px) brightness(.35); transform: scale(1.1);
  }
  .hero-content {
    position: relative; display: flex; align-items: center; gap: 32px; padding: 48px;
    color: #fff;
  }
  .hero-avatar {
    flex-shrink: 0; width: 180px; height: 180px; border-radius: 50%; overflow: hidden;
    box-shadow: 0 8px 32px rgba(0,0,0,.3);
    img { width: 100%; height: 100%; object-fit: cover; }
  }
  .hero-name { font-size: 36px; font-weight: 700; margin: 0 0 8px; }
  .hero-alias { font-size: 15px; opacity: .7; margin: 0 0 12px; }
  .hero-stats { font-size: 14px; opacity: .65; margin: 0 0 8px; }
  .hero-desc { font-size: 13px; opacity: .5; margin: 0; max-width: 600px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  // 关注按钮贴右侧（hero 是深色磨砂底，用白底/半透明描边两态）
  .hero-actions { margin-left: auto; flex-shrink: 0; padding-left: 24px; }
  .followBtn {
    min-width: 104px;
    height: 38px;
    padding: 0 26px;
    border-radius: 19px;
    font-size: 14px;
    cursor: pointer;
    border: none;
    background: rgba(255,255,255,.95);
    color: #1a1a1a;
    transition: all .2s;

    &:hover { background: #fff; transform: translateY(-1px); }

    &.is-followed {
      background: rgba(255,255,255,.14);
      color: #fff;
      border: 1px solid rgba(255,255,255,.55);

      &:hover { background: rgba(245,108,108,.25); border-color: rgba(255,255,255,.85); }
    }

    &:disabled { opacity: .6; cursor: default; transform: none; }
  }
}

.ar-section {
  margin-bottom: 44px;
  .section-head {
    display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;
    h2 {
      font-size: 20px; font-weight: 700; color: $font-black; margin: 0;
      display: flex; align-items: baseline; gap: 10px;
    }
    // 标题旁的统计（如「47 张」），弱化处理，不抢标题
    .section-count { font-size: 13px; font-weight: 400; font-style: normal; color: #aaa; }
    .section-more {
      font-size: 14px; color: $font-black-2; cursor: pointer; display: flex; align-items: center; gap: 4px;
      &:hover { color: $color-main; }
      // 续拉期间不可再点，防止连点叠请求
      &.is-loading { color: #aaa; cursor: default; pointer-events: none; }
    }
    .el-button { border-radius: 20px; }
  }
}

::v-deep .gridLayout { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) !important; gap: 20px; }
::v-deep .gridLayout li { padding: 0 !important; }
::v-deep .mvList.gridLayout { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)) !important; }

.skel-hero { border-radius: 20px; overflow: hidden; margin-bottom: 40px; background: rgba(0,0,0,.06); }
.skel-avatar { width: 180px; height: 180px; border-radius: 50%; flex-shrink: 0; }
.skel-line { height: 14px; border-radius: 6px; margin-bottom: 12px; }
.skel-line--lg { width: 240px; height: 28px; }
.skel-line--md { width: 160px; }
.skel-line--sm { width: 120px; }
.skel-line--title { width: 80px; margin-bottom: 20px; }
.skel-sections { margin-top: 12px; }
.skel-sec { margin-bottom: 44px; }
.skel-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.skel-card { border-radius: 12px; overflow: hidden; background: #fff; border: 1px solid rgba(0,0,0,.04); }
.skel-card-img { aspect-ratio: 1; }
.skel-card-line { height: 12px; border-radius: 6px; margin: 10px 8px; width: 70%; }

.ar-mv-section ::v-deep .playCount,
.ar-mv-section ::v-deep .duration,
.ar-video-section ::v-deep .playCount,
.ar-video-section ::v-deep .duration { display: inline-flex !important; align-items: center; gap: 3px; font-size: 12px; color: #999; margin-top: 8px; }
.ar-mv-section ::v-deep .playCount::before,
.ar-video-section ::v-deep .playCount::before { content: "▶ "; font-size: 11px; opacity: .7; }
.ar-mv-section ::v-deep .duration::before,
.ar-video-section ::v-deep .duration::before { content: "◷ "; font-size: 11px; opacity: .7; margin-left: 16px; }
.ar-mv-section ::v-deep li,
.ar-video-section ::v-deep li,
.ar-simi-section ::v-deep li { transition: transform .25s; &:hover { transform: translateY(-4px); } }
.ar-mv-section ::v-deep .el-card,
.ar-video-section ::v-deep .el-card { border-radius: 14px; overflow: hidden; border: 1px solid rgba(0,0,0,.06); }
.ar-mv-section ::v-deep .imgContainer img,
.ar-video-section ::v-deep .imgContainer img { aspect-ratio: 16/9; object-fit: cover; border-radius: 14px 14px 0 0; }
.ar-mv-section ::v-deep .moreInfo,
.ar-video-section ::v-deep .moreInfo { padding: 10px 14px 12px; }
.ar-mv-section ::v-deep .pb-time,
.ar-video-section ::v-deep .pb-time { font-size: 12px; color: #999; margin-top: 4px; }

.ar-section { animation: fadeUp .4s ease both; }
@for $i from 1 through 6 { .ar-section:nth-child(#{$i}) { animation-delay: #{$i*.06}s; } }

@keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
</style>
