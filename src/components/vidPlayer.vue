<template>
  <div id="player"></div>
</template>

<script>
import Player from 'xgplayer'

export default {
  name: "vidPlayer",
  props: ["url", "poster"],
  data() {
    return {
      ply: {}
    }
  },
  methods: {
    initPlayer() {
      this.ply = new Player({
        id: 'player',
        url: this.url,
        definitionActive: 'click',
        fluid: false,
        width: '100%',
        height: '100%',
        // 关键修复：'auto' 在 9:16 视频时会选 'fix-width' 导致上下裁切
        // 改为 'contain' 强制视频完整显示在容器内（容器由父级 aspect-ratio: 16/9 固定）
        // 这样 9:16 视频会按高度 fit、左右留黑边（控制条永远在容器底部可见）
        fitVideoSize: 'contain',
        poster: this.poster,
        playbackRate: [0.5, 0.75, 1, 1.5, 2],
        defaultPlaybackRate: 1,
        // lastPlayTime: 20, //视频起播时间（单位：秒）
        // lastPlayTimeHideDelay: 5, //提示文字展示时长（单位：秒）
        download: true,
        pip: true,
        keyShortcut: 'on',
        keyShortcutStep: { //设置调整步长
          currentTime: 5, //播放进度调整步长，默认 0.1
          volume: 0.1 //音量调整步长，默认 0.1
        },
        screenShot: {
          saveImg: true,
          quality: 1,
          type: 'image/png',
          format: '.png'
        }
      })
    }
  },
  mounted() {
    this.initPlayer()
    this.$nextTick(() => { if (this.ply && this.ply.resize) this.ply.resize() })
  },
  beforeDestroy() {
    this.ply.destroy()
  }
}
</script>

<style scoped>
#player{
  position: absolute; inset: 0;
  width: 100%; height: 100%;
}
/* 关键修复：之前用 width:100% !important; height:100% !important 强制拉伸 video
   配合 fitVideoSize:'auto'，9:16 视频会被选为 'fix-width' → 高度超出容器 → 上半被裁切
   现在改成只让 xgplayer 自然占满容器（容器固定 16:9，video 用 object-fit:contain 保持比例） */
#player ::v-deep .xgplayer {
  width: 100%;
  height: 100%;
}
#player ::v-deep video {
  object-fit: contain;
  /* 保证控制条 z-index 永远在视频之上（已有 100 即可，覆盖 xgplayer 内部样式） */
}
</style>
