<template>
  <div class="artistDetail">
    <div v-if="loading" class="artist-hero skel-hero">
      <div class="hero-content">
        <div class="hero-avatar skel-avatar"></div>
        <div class="hero-info">
          <div class="skel-line skel-line--lg"></div>
          <div class="skel-line skel-line--md"></div>
          <div class="skel-line skel-line--sm"></div>
        </div>
      </div>
    </div>
    <div v-if="loading" class="skel-sections">
      <div v-for="s in 4" :key="s" class="skel-sec">
        <div class="skel-line skel-line--title"></div>
        <div class="skel-grid">
          <div v-for="c in 4" :key="c" class="skel-card"><div class="skel-card-img"></div><div class="skel-card-line"></div></div>
        </div>
      </div>
    </div>
      <div v-if="arBasicInfo.name && !loading" class="artist-hero">
      <div class="hero-bg" :style="{backgroundImage: `url(${arBasicInfo.img1v1Url||arBasicInfo.picUrl})`}"></div>
      <div class="hero-content">
        <div class="hero-avatar">
          <cover-image :src="arBasicInfo.img1v1Url||arBasicInfo.picUrl" :alt="arBasicInfo.name + '的头像'"/>
        </div>
        <div class="hero-info">
          <h1 class="hero-name">{{ arBasicInfo.name }}</h1>
          <p class="hero-alias" v-if="arBasicInfo.alias">{{ arBasicInfo.alias.join(' / ') }}</p>
          <p class="hero-stats">{{ arBasicInfo.musicSize }} 首歌 · {{ arBasicInfo.albumSize }} 张专辑 · {{ arBasicInfo.mvSize }} 个 MV</p>
          <p class="hero-desc" v-if="arBasicInfo.briefDesc" :title="arBasicInfo.briefDesc">{{ arBasicInfo.briefDesc }}</p>
        </div>
      </div>
    </div>

    <template v-if="!loading">
    <section class="ar-section">
      <div class="section-head">
        <h2>热门歌曲</h2>
        <span class="section-more" @click="expanded.songs=!expanded.songs">
          {{ expanded.songs ? '收起' : '全部' }} <BaseIcon :name="expanded.songs ? 'arrowUp' : 'arrowRight'"/>
        </span>
      </div>
      <TracksLayout v-if="top50songs.length" :list="expanded.songs ? top50songs : top50songs.slice(0,5)"/>
    </section>

    <section class="ar-section">
      <div class="section-head">
        <h2>专辑</h2>
        <span v-if="hotAlbums.length>8" class="section-more" @click="expanded.albums=!expanded.albums">
          {{ expanded.albums ? '收起' : '更多' }} <BaseIcon :name="expanded.albums ? 'arrowUp' : 'arrowRight'"/>
        </span>
      </div>
      <AlbumLayout v-if="hotAlbums.length" :list="expanded.albums ? hotAlbums : hotAlbums.slice(0,8)"/>
    </section>

    <section class="ar-section ar-mv-section">
      <div class="section-head">
        <h2>MV</h2>
        <span v-if="mvs.length>8" class="section-more" @click="expanded.mvs=!expanded.mvs">
          {{ expanded.mvs ? '收起' : '更多' }} <BaseIcon :name="expanded.mvs ? 'arrowUp' : 'arrowRight'"/>
        </span>
      </div>
      <MvLayout v-if="mvs.length" :list="expanded.mvs ? mvs : mvs.slice(0,8)" pic-name="imgurl16v9"/>
    </section>

    <section class="ar-section ar-video-section">
      <div class="section-head">
        <h2>视频</h2>
        <el-button size="small" @click="loadMoreVid" style="margin-right:8px">换一批</el-button>
        <span v-if="videos.length>8" class="section-more" @click="expanded.videos=!expanded.videos">
          {{ expanded.videos ? '收起' : '更多' }}
        </span>
      </div>
      <VideoLayout v-if="videos.length" :list="expanded.videos ? videos : videos.slice(0,8)" :is-mlog="true"/>
    </section>

    <section class="ar-section ar-simi-section">
      <div class="section-head">
        <h2>相似歌手</h2>
        <span v-if="simiArtists.length>8" class="section-more" @click="expanded.simi=!expanded.simi">
          {{ expanded.simi ? '收起' : '更多' }}
        </span>
      </div>
      <ArtistLayout v-if="simiArtists.length" :list="expanded.simi ? simiArtists : simiArtists.slice(0,8)"/>
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

export default {
  name: "ArtistDetail",
  props: ["id"],
  components: {TracksLayout, AlbumLayout, ArtistLayout, MvLayout, VideoLayout, CoverImage},
  data() {
    return {
      arBasicInfo: {},
      top50songs: [], hotAlbums: [], mvs: [], simiArtists: [], videos: [],
      vidParams: { id: this.id, cursor: 0, order: 1 },
      loading: true,
      showCount: { songs: 5, albums: 8, mvs: 8, videos: 8, simi: 8 },
      expanded: {}
    }
  },
  methods: {
    alClk(id) { this.$bus.$emit('alClk', id) },
    arClk(id) { this.$bus.$emit('arClk', id) },
    arAsClk(id) { this.$bus.$emit('arAsClk', id) },
    songClk(song) { this.$bus.$emit('songClk', song) },
    mvClick(id) { this.$bus.$emit('mvClk', id) },
    getAtDetail() { return this.$axios.get('/artists', {params: {id: this.id}}) },
    getTop50() { return this.$axios.get('/artist/top/song', {params: {id: this.id}}) },
    getAlbum() { return this.$axios.get('/artist/album', {params: {id: this.id}}) },
    getMVs() { return this.$axios.get('/artist/mv', {params: {id: this.id}}) },
    getSimiAt() { return this.$axios.get('/simi/artist', {params: {id: this.id}}) },
    getVid() { return this.$axios('/artist/video', {params: {...this.vidParams}}) },
    loadMoreVid() {
      this.getVid().then(res => {
        if (res.data.data.page.more) {
          this.videos = res.data.data.records
          this.vidParams.cursor = res.data.data.page.cursor
        } else { this.vidParams.cursor = 0 }
      })
    }
  },
  activated() {
    this.loading = true
    this.$nextTick(() => {
    this.$axios.all([this.getAtDetail(), this.getTop50(), this.getAlbum(), this.getMVs(), this.getSimiAt(), this.getVid()])
        .then(this.$axios.spread((AtDetail, Top50, Album, MVs, SimiAt, video) => {
          this.arBasicInfo = AtDetail.data.artist
          this.top50songs = Top50.data.songs; this.hotAlbums = Album.data.hotAlbums
          this.mvs = MVs.data.mvs; this.simiArtists = SimiAt.data.artists
          this.videos = video.data.data.records; this.vidParams.cursor = video.data.data.page.cursor
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
}

.ar-section {
  margin-bottom: 44px;
  .section-head {
    display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;
    h2 { font-size: 20px; font-weight: 700; color: $font-black; margin: 0; }
    .section-more { font-size: 14px; color: $font-black-2; cursor: pointer; display: flex; align-items: center; gap: 4px; &:hover { color: $color-main; } }
    .el-button { border-radius: 20px; }
  }
}

::v-deep .gridLayout { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) !important; gap: 20px; }
::v-deep .gridLayout li { padding: 0 !important; }
::v-deep .mvList.gridLayout { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)) !important; }

.skel-hero { border-radius: 20px; overflow: hidden; margin-bottom: 40px; background: rgba(0,0,0,.06); }
.skel-avatar { width: 180px; height: 180px; background: #e0e0e0; border-radius: 50%; flex-shrink: 0; }
.skel-line { height: 14px; border-radius: 6px; background: linear-gradient(90deg, #e0e0e0 25%, #eee 50%, #e0e0e0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; margin-bottom: 12px; }
.skel-line--lg { width: 240px; height: 28px; }
.skel-line--md { width: 160px; }
.skel-line--sm { width: 120px; }
.skel-line--title { width: 80px; margin-bottom: 20px; }
.skel-sections { margin-top: 12px; }
.skel-sec { margin-bottom: 44px; }
.skel-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.skel-card { border-radius: 12px; overflow: hidden; background: #fff; border: 1px solid rgba(0,0,0,.04); }
.skel-card-img { aspect-ratio: 1; background: linear-gradient(90deg, #e0e0e0 25%, #eee 50%, #e0e0e0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
.skel-card-line { height: 12px; border-radius: 6px; margin: 10px 8px; width: 70%; background: linear-gradient(90deg, #e0e0e0 25%, #eee 50%, #e0e0e0 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }

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
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
</style>
