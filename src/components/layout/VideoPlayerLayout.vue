<template>
  <div class="video-page">
    <div v-if="url && dt_cover">
      <section class="video-player-section" :style="playerBgStyle">
        <vidPlayer :poster="dt_cover" :url="url"/>
        <!-- 隐藏 img：触发封面主色提取，@load 在封面加载完时触发 onCoverLoad -->
        <img :src="dt_cover" alt="" crossorigin="anonymous" @load="onCoverLoad" class="cover-color-source">
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
      <div class="skel-player skeleton-item"></div>
      <div class="skel-line skel-line--long skeleton-item"></div>
      <div class="skel-line skel-line--short skeleton-item"></div>
    </div>
  </div>
</template>

<script>
import vidPlayer from "@/components/vidPlayer";
import CommentLayout from "@/components/layout/CommentLayout";
import CoverImage from "@/components/common/CoverImage";
import { extractColors } from "@/utils/colorExtractor";

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
  },
  data() {
    return {
      // 视频容器左右两侧背景色（从封面主色动态提取）
      // 用于 9:16 竖屏视频的"黑边"区域，让视觉上不刺眼
      playerBgStyle: ''
    }
  },
  methods: {
    /**
     * 从视频封面提取主色，构建播放器容器左右两侧的渐变
     * 9:16 视频居中后，左右黑边会显示主色
     * 16:9 视频居中后，video 覆盖全容器，颜色不可见（无副作用）
     * 复用 utils/colorExtractor.extractColors（MusicPlayer 在用 buildBackground）
     *
     * ⚠️ 注意：NetEase 封面图（p*.music.126.net）不返回 CORS 头，
     *    canvas.drawImage 会抛 SecurityError 被 try/catch 吞掉，extractColors 返回 []
     *    所以必须加 fallback：失败时用 MusicPlayer 同款 FALLBACK 色 #1a1a2e
     *    否则背景保持 CSS 默认 #000（纯黑），看起来跟没改一样
     */
    onCoverLoad(img) {
      if (!img || !img.complete) {
        this.playerBgStyle = 'background: #1a1a2e'
        return
      }
      const colors = extractColors(img)
      if (!colors.length) {
        // 跨域污染 fallback：跟 MusicPlayer 的 FALLBACK 保持一致
        this.playerBgStyle = 'background: #1a1a2e'
        return
      }
      // 取第一个主色（已经过 extractColors 排序），颜色稍暗以避免抢夺 video 注意力
      const [r, g, b] = colors[0]
      const main = `rgb(${r},${g},${b})`
      this.playerBgStyle = `background: linear-gradient(to right, ${main} 0%, #000 35%, #000 65%, ${main} 100%)`
    }
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/base/variables";

.video-page {
  max-width: 1100px; margin: 0 auto; padding: 0 0 80px;
}

.video-player-section {
  width: 100%; aspect-ratio: 16 / 9;          /* 容器保持 16:9（用户要求窗口大小不变） */
  max-width: 1100px; margin: 0 auto;           /* 限制最大宽度，水平居中 */
  background: #000; border-radius: 16px; overflow: hidden;
  position: relative;

  /* 控制条 z-index 必须高于 xgplayer 内部 overlay，
     避免被 overflow:hidden + 9:16 视频的 contain 黑边遮挡 */
  ::v-deep .xgplayer-controls,
  ::v-deep .xgplayer-bottom-bar,
  ::v-deep .xgplayer-start { z-index: 100; }

  /* 用于提取主色：完全隐藏 img，但保持加载触发 @load */
  .cover-color-source {
    position: absolute; width: 1px; height: 1px;
    opacity: 0; pointer-events: none; left: -9999px;
  }
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
  }
  .skel-line {
    height: 16px; border-radius: 8px; margin-top: 16px;
    &--long { width: 50%; }
    &--short { width: 30%; height: 12px; }
  }
}
</style>
