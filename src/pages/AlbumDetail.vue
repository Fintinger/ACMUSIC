<template>
  <div class="albumDetail">
    <div v-if="loading" class="album-skel">
      <div class="skel-hero">
        <div class="skel-cover skeleton-item"></div>
        <div class="skel-info">
          <div class="skel-line skel-line--lg skeleton-item"></div>
          <div class="skel-line skel-line--md skeleton-item"></div>
          <div class="skel-line skel-line--sm skeleton-item"></div>
          <div class="skel-line skel-line--sm skeleton-item"></div>
        </div>
      </div>
      <div class="skel-tracks"><div v-for="n in 8" :key="n" class="skel-row"><div class="skel-bar skeleton-item"></div></div></div>
    </div>
    <template v-else>
    <div class="album-hero">
      <div class="album-cover"> <cover-image :src="albumInfo.picUrl" :alt="albumInfo.name + '的封面'"/> </div>
      <div class="album-info">
        <h1 class="album-name">{{ albumInfo.name }} <small v-if="albumInfo.subType">({{ albumInfo.subType }})</small></h1>
        <p class="album-artist" v-if="albumInfo.artist" @click="arClk(albumInfo.artist.id)">🎤 {{ albumInfo.artist.name }}</p>
        <p class="album-meta">📅 {{ albumInfo.publishTime | formatMs("YYYY年MM月DD日") }} · 🎵 {{ albumInfo.size }} 首</p>
        <p class="album-company" v-if="albumInfo.company">{{ albumInfo.company }}</p>
        <p class="album-desc" v-if="albumInfo.description" :title="albumInfo.description">{{ albumInfo.description }}</p>
      </div>
    </div>
    <div class="album-content">
      <el-tabs v-model="activeName">
        <el-tab-pane label="歌曲" name="songs">
          <TracksLayout :list="songs"/>
        </el-tab-pane>
        <el-tab-pane label="评论" name="comment">
          <CommentLayout :id="id" type="3"/>
        </el-tab-pane>
      </el-tabs>
    </div>
    </template>
  </div>
</template>

<script>
import TracksLayout from "@/components/layout/TracksLayout";
import CommentLayout from "@/components/layout/CommentLayout";
import CoverImage from "@/components/common/CoverImage";
import * as albumApi from "@/api/Album";

export default {
  name: "AlbumDetail",
  components:{TracksLayout,CommentLayout, CoverImage},
  data() {
    return {
      albumInfo: {}, songs: [],
      activeName:"songs", loading: true,
    }
  },
  props: ['id'],
  methods:{
    songClk(song){ this.$bus.$emit('songClk',song) },
    arClk(id){ this.$bus.$emit('arClk', id) },
    loadAlbum() {
      if (!this.id) { console.warn('[AlbumDetail] no id, skip'); return }
      this.albumInfo = {}; this.songs = []; this.loading = true
      albumApi.getDetail(this.id).then(res => {
        this.albumInfo = res.data.album; this.songs = res.data.songs
      }).catch(err => {
        console.error('[AlbumDetail] load error:', err)
      }).finally(() => { this.loading = false })
    }
  },
  activated() {
    this.loadAlbum()
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/base/variables";

.albumDetail { max-width: 1200px; margin: 0 auto; padding-bottom: 80px; }

.album-hero {
  display: flex; gap: 40px; padding: 40px 0; align-items: flex-start;
  animation: fadeUp .4s ease;
}

.album-cover {
  flex-shrink: 0; width: 260px; height: 260px;
  border-radius: 16px; overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,.1);
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
}

.album-info { flex: 1; min-width: 0; }

.album-name {
  font-size: 28px; font-weight: 700; color: $font-black; margin: 0 0 12px;
  small { font-size: 18px; color: $font-black-2; font-weight: 400; }
}

.album-artist {
  font-size: 16px; color: $font-black-1; margin: 0 0 10px; cursor: pointer;
  &:hover { color: $color-main; }
}

.album-meta { font-size: 14px; color: $font-black-2; margin: 0 0 8px; }

.album-company { font-size: 14px; color: $font-black-2; margin: 0 0 12px; }

.album-desc {
  font-size: 13px; color: $font-black-2; margin: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  max-width: 600px;
}

.album-content { animation: fadeUp .4s .1s ease backwards; }

::v-deep .comment-container {
  .comment-header-bar h2 { display: none; }
  .hot-comments-section h3, .new-comments-section h3 { color: $font-black-1 !important; }
  .section-divider { background: linear-gradient(to right, rgba(0,0,0,.06), transparent) !important; }
  .floating-comment-btn { position: static !important; transform: none !important; margin: 24px auto 0; display: flex; bottom: auto !important; left: auto !important; }
}

::v-deep .comment-content {
  .comment-item { background: $color-theme-sec !important; &:hover { background: darken($color-theme-sec,3%) !important; } }
  .main {
    .name .nickname { color: $font-black-1 !important; &:hover { color: $color-main !important; } }
    .name .time-tag { color: $font-black-2 !important; }
    .content { color: $font-black-1 !important; }
    .time-ribbon .ribbon > span { color: $font-black-2 !important; }
    .comment-delete .el-button { color: $font-black-2 !important; }
  }
}

/* skeleton */
.album-skel { padding-top: 40px; }
.skel-hero { display: flex; gap: 40px; margin-bottom: 40px; }
.skel-cover { width: 260px; height: 260px; border-radius: 16px; flex-shrink: 0; }
.skel-info { flex: 1; padding-top: 16px; }
.skel-line { height: 14px; border-radius: 6px; margin-bottom: 14px; }
.skel-line--lg { width: 60%; height: 28px; }
.skel-line--md { width: 40%; }
.skel-line--sm { width: 30%; height: 12px; }
.skel-tracks { margin-top: 20px; }
.skel-row { padding: 12px 0; }
.skel-bar { height: 14px; border-radius: 6px; width: 70%; }

@keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style>
