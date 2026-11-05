<template>
  <div class="albumDetail">
    <template v-if="loading">
      <PlaylistInfoSkeleton/>
      <TrackListSkeleton :count="8"/>
    </template>
    <EmptyState v-else-if="loadError" icon="disc" :title="loadError" desc="请检查链接或网络后重试" action-text="重新加载" @action="loadAlbum"/>
    <template v-else>
    <div class="album-hero">
      <div class="album-cover"> <cover-image :src="albumInfo.picUrl" :alt="albumInfo.name + '的封面'" eager/> </div>
      <div class="album-info">
        <h1 class="album-name">{{ albumInfo.name }} <small v-if="albumInfo.subType">({{ albumInfo.subType }})</small></h1>
        <p class="album-artist" v-if="albumInfo.artist" @click="arClk(albumInfo.artist.id)">
          <BaseIcon name="user" :size="14"/><span class="meta-text">{{ albumInfo.artist.name }}</span>
        </p>
        <p class="album-meta" v-if="albumInfo.publishTime || albumInfo.size != null">
          <template v-if="albumInfo.publishTime"><BaseIcon name="calendar" :size="14"/><span class="meta-text">{{ albumInfo.publishTime | formatMs("YYYY年MM月DD日") }}</span></template>
          <span v-if="albumInfo.publishTime && albumInfo.size != null" class="meta-dot">·</span>
          <template v-if="albumInfo.size != null"><BaseIcon name="disc" :size="14"/><span class="meta-text">{{ albumInfo.size }} 首</span></template>
        </p>
        <p class="album-company" v-if="albumInfo.company">{{ albumInfo.company }}</p>
        <p class="album-desc" v-if="albumInfo.description" :title="albumInfo.description">{{ albumInfo.description }}</p>
      </div>
    </div>
    <div class="album-content">
      <el-tabs v-model="activeName">
        <el-tab-pane label="歌曲" name="songs">
          <TracksLayout v-if="songs.length" :list="songs"/>
          <EmptyState v-else compact title="这张专辑暂无可用歌曲"/>
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
import EmptyState from '@/components/common/EmptyState';
import TracksLayout from "@/components/layout/TracksLayout";
import CommentLayout from "@/components/layout/CommentLayout";
import PlaylistInfoSkeleton from "@/components/Skeleton/PlaylistInfoSkeleton";
import TrackListSkeleton from "@/components/Skeleton/TrackListSkeleton";
import CoverImage from "@/components/common/CoverImage";
import * as albumApi from "@/api/Album";

export default {
  name: "AlbumDetail",
  components:{
    EmptyState,
    TracksLayout,
    CommentLayout,
    PlaylistInfoSkeleton,
    TrackListSkeleton,
    CoverImage
  },
  data() {
    return {
      albumInfo: {}, songs: [],
      activeName:"songs", loading: true, loadError: '', requestVersion: 0,
    }
  },
  props: ['id'],
  methods:{
    songClk(song){ this.$bus.$emit('songClk',song) },
    arClk(id){ this.$bus.$emit('arClk', id) },
    async loadAlbum() {
      const version = ++this.requestVersion
      this.albumInfo = {}; this.songs = []; this.loadError = ''; this.loading = true
      if (!/^[1-9]\d*$/.test(String(this.id || ''))) {
        this.loadError = '专辑链接无效'; this.loading = false; return
      }
      try {
        const res = await albumApi.getDetail(this.id)
        if (version !== this.requestVersion) return
        const data = res && res.data
        if (!data || !data.album || !data.album.id || !Array.isArray(data.songs)) throw new Error('Invalid album response')
        this.albumInfo = data.album; this.songs = data.songs
      } catch (_) {
        if (version === this.requestVersion) this.loadError = '专辑加载失败'
      } finally {
        if (version === this.requestVersion) this.loading = false
      }
    }
  },
  beforeDestroy() { this.requestVersion++ },
  activated() {
    this.loadAlbum()
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/base/variables";

// 容器由外层 el-main 统一（max-width 1200 + 24 padding），这里只留底部呼吸
.albumDetail { padding-bottom: 80px; }

.album-hero {
  display: flex; gap: 40px; padding: 40px 0; align-items: flex-start;
  animation: fadeUp .4s ease;
}

.album-cover {
  flex-shrink: 0; width: 260px; height: 260px;
  border-radius: $radius-img; overflow: hidden;
  box-shadow: 0 8px 32px var(--c-shadow-mid);
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
}

.album-info { flex: 1; min-width: 0; }

.album-name {
  font-size: $fs-hero; font-weight: 700; color: $font-black; margin: 0 0 12px;
  line-height: 1.3;
  small { font-size: 18px; color: $font-black-2; font-weight: 400; }
}

// 元信息行：图标 + 文字用 flex 对齐（原先 emoji 与文字基线随平台漂移）
.album-artist,
.album-meta {
  display: flex; align-items: center; flex-wrap: wrap; gap: 6px;
  margin: 0 0 10px;

  .ac-icon { flex-shrink: 0; color: $font-black-2; }
}

.album-artist {
  font-size: 16px; color: $font-black-1; cursor: pointer;
  &:hover { color: $color-main-text; .ac-icon { color: $color-main-text; } }
}

.album-meta { font-size: 14px; color: $font-black-2; }
.meta-dot { color: $font-black-2; margin: 0 2px; }

.album-company { font-size: 14px; color: $font-black-2; margin: 0 0 12px; }

.album-desc {
  font-size: 13px; color: $font-black-2; margin: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  max-width: 600px;
}

.album-content { animation: fadeUp .4s .1s ease backwards; }

::v-deep .comment-container {
  .comment-header-bar h2 { display: none; }
  .floating-comment-btn { position: static; transform: none; margin: 24px auto 0; display: flex; }
}



@keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
</style>
