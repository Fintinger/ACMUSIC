<template>
  <div :id="uid" class="player-root"></div>
</template>

<script>
import Player from 'xgplayer'

// ⚠️ 不能用固定 id="player"：xgplayer 通过 document.getElementById 定位容器，
// 而 router-view 以 :key="$route.fullPath" 重建页面 —— 从一个播放页点相关推荐跳另一个播放页时，
// 新旧两个 #player 会短暂共存于文档，getElementById 命中前面的旧容器，
// 播放器渲染进即将销毁的旧 DOM → 新页面只剩黑框且控制台无任何报错。必须用唯一 id。
let playerSeq = 0

export default {
  name: "vidPlayer",
  props: ["url", "poster"],
  data() {
    return {
      ply: null,
      uid: `xgplayer-${Date.now()}-${playerSeq++}`
    }
  },
  methods: {
    initPlayer() {
      this.ply = new Player({
        id: this.uid,
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
    // url 为空等异常路径下 ply 可能未成功创建，安全销毁
    if (this.ply && typeof this.ply.destroy === 'function') {
      this.ply.destroy()
    }
    this.ply = null
  }
}
</script>

<style scoped>
.player-root{
  position: absolute; inset: 0;
  width: 100%; height: 100%;
}
/* 关键修复：之前用 width:100% !important; height:100% !important 强制拉伸 video
   配合 fitVideoSize:'auto'，9:16 视频会被选为 'fix-width' → 高度超出容器 → 上半被裁切
   现在改成只让 xgplayer 自然占满容器（容器固定 16:9，video 用 object-fit:contain 保持比例） */
.player-root ::v-deep .xgplayer {
  width: 100%;
  height: 100%;
}
.player-root ::v-deep video {
  object-fit: contain;
  /* 保证控制条 z-index 永远在视频之上（已有 100 即可，覆盖 xgplayer 内部样式） */
}
</style>
