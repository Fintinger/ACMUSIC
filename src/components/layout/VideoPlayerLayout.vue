<template>
  <div class="video-page">
    <div v-if="url && dt_cover">
      <section class="video-player-section">
        <vidPlayer :poster="dt_cover" :url="url"/>
      </section>

      <section class="video-info-section">
        <h1 class="video-title">{{ dt_name }}</h1>
        <div class="video-artist" v-if="!dt_arName.nickname">@{{ dt_arName }}</div>
        <div class="video-artist" v-if="dt_arName.nickname">@{{ dt_arName.nickname }}</div>
        <div class="video-meta">
          <span>▶ {{ dt_playCt | div1w(dt_playCt) }}</span>
          <span>👍 {{ detail.praisedCount | div1w(detail.praisedCount) }}</span>
          <span>💬 {{ detail.commentCount | div1w(detail.commentCount) }}</span>
          <span>↗ {{ detail.shareCount | div1w(detail.shareCount) }}</span>
        </div>
        <div v-if="detail.videoGroup" class="video-tags">
          <span v-for="t in detail.videoGroup" :key="t.id" class="video-tag">#{{ t.name }}</span>
        </div>
      </section>

      <section v-if="simiVideo.length" class="simi-section">
        <h2>相关推荐</h2>
        <div class="simi-grid">
          <div v-for="v in simiVideo" :key="v[si_id]" class="simi-card" @click="simiClickEvt(v[si_id])">
            <div class="simi-cover"><cover-image :src="v[si_cover]" :alt="v[si_name] + '的封面'"/></div>
            <div class="simi-name">{{ v[si_name] }}</div>
            <div class="simi-artist" v-if="!v[si_arName].length">{{ v[si_arName] }}</div>
            <div class="simi-artist" v-if="v[si_arName].length">
              <span v-for="n in v[si_arName]" :key="n.userId">@{{ n.userName }} </span>
            </div>
          </div>
        </div>
      </section>

      <section class="comment-section">
        <CommentLayout v-if="Number.isInteger(id)" :id="id" type="1"/>
        <CommentLayout v-else :id="id" type="5"/>
      </section>
    </div>

    <div v-else class="video-loading">
      <div class="skel-player"></div>
      <div class="skel-line skel-line--long"></div>
      <div class="skel-line skel-line--short"></div>
    </div>
  </div>
</template>

<script>
import vidPlayer from "@/components/vidPlayer";
import CommentLayout from "@/components/layout/CommentLayout";
import CoverImage from "@/components/common/CoverImage";

export default {
  name: "VideoPlayerLayout",
  components: {vidPlayer, CommentLayout, CoverImage},
  props: {
    url: { type: String, required: true },
    detail: { type: Object, required: true },
    simiVideo: { type: Array, required: true },
    simiClickEvt: { type: Function, required: true },
    id: { required: true },
    nameConfig: {
      type: Object,
      default() {
        return {
          dt:{cover:"cover",name:"name",artistName:"artistName",playCount:"playCount"},
          si:{id:"id",cover:"cover",name:"name",artistName:"artistName",playCount:"playCount"}
        }
      }
    }
  },
  computed: {
    dt_name() { return this.detail[this.nameConfig.dt.name] },
    dt_cover() { return this.detail[this.nameConfig.dt.cover] },
    dt_arName() { return this.detail[this.nameConfig.dt.artistName] },
    dt_playCt() { return this.detail[this.nameConfig.dt.playCount] },
    si_id() { return this.nameConfig.si.id },
    si_cover() { return this.nameConfig.si.cover },
    si_name() { return this.nameConfig.si.name },
    si_arName() { return this.nameConfig.si.artistName },
    si_playCt() { return this.nameConfig.si.playCount }
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/base/variables";

.video-page {
  max-width: 1100px; margin: 0 auto; padding: 0 0 80px;
}

.video-player-section {
  width: 100%; aspect-ratio: 16 / 9;
  background: #000; border-radius: 16px; overflow: hidden;
  position: relative;

  ::v-deep .xgplayer-controls,
  ::v-deep .xgplayer-bottom-bar,
  ::v-deep .xgplayer-start { z-index: 100; }
}

.video-info-section {
  padding: 24px 0;
  .video-title { font-size: 26px; font-weight: 700; color: $font-black; margin: 0 0 8px; }
  .video-artist { font-size: 15px; color: $font-black-2; margin-bottom: 16px; }
  .video-meta { display: flex; gap: 20px; flex-wrap: wrap; color: $font-black-2; font-size: 14px; }
  .video-tags { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
  .video-tag {
    padding: 4px 12px; border-radius: 20px;
    background: $color-theme-sec; font-size: 13px; color: $font-black-2;
  }
}

.simi-section {
  padding: 40px 0;
  h2 { font-size: 20px; font-weight: 700; color: $font-black; margin: 0 0 20px; }
}

.simi-grid {
  display: flex; gap: 16px; overflow-x: auto; overflow-y: hidden;
  padding-bottom: 8px;
  scrollbar-width: thin;
  &::-webkit-scrollbar { height: 6px; }
  &::-webkit-scrollbar-thumb { background: rgba(0,0,0,.15); border-radius: 10px; }
  &::-webkit-scrollbar-track { background: transparent; }
}

.simi-card {
  flex: 0 0 220px; width: 220px;
  cursor: pointer; transition: transform .25s;
  &:hover { transform: translateY(-4px); }
}

.simi-cover {
  border-radius: 12px; overflow: hidden; margin-bottom: 10px;
  img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; display: block; }
}

.simi-name {
  font-size: 14px; font-weight: 600; color: $font-black;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.simi-artist {
  font-size: 12px; color: $font-black-2; margin-top: 4px;
}

.comment-section {
  padding-top: 40px; border-top: 1px solid rgba(0,0,0,.06);

  ::v-deep .comment-container {
    .comment-header-bar h2 { display: none; }
    .hot-comments-section h3, .new-comments-section h3 { color: $font-black-1 !important; }
    .section-divider { background: linear-gradient(to right, rgba(0,0,0,.06), transparent) !important; }
    .floating-comment-btn {
      position: static !important; transform: none !important;
      margin: 24px auto 0; display: flex; bottom: auto !important; left: auto !important;
    }
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
}

.video-loading {
  max-width: 1100px; margin: 0 auto; padding: 24px 0;
  .skel-player {
    width: 100%; aspect-ratio: 16/9; border-radius: 16px;
    background: linear-gradient(90deg,#e8e8e8 25%,#f0f0f0 50%,#e8e8e8 75%);
    background-size: 200% 100%; animation: shimmer 1.5s infinite;
  }
  .skel-line {
    height: 16px; border-radius: 8px; margin-top: 16px;
    background: linear-gradient(90deg,#e8e8e8 25%,#f0f0f0 50%,#e8e8e8 75%);
    background-size: 200% 100%; animation: shimmer 1.5s infinite;
    &--long { width: 50%; }
    &--short { width: 30%; height: 12px; }
  }
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
