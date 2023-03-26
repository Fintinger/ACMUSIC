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
        fluid: true,
        fitVideoSize: 'fixWidth',
        // autoplay: true,
        poster: this.poster,
        playbackRate: [0.5, 0.75, 1, 1.5, 2],
        defaultPlaybackRate: 1,
        // lastPlayTime: 20, //视频起播时间（单位：秒）
        // lastPlayTimeHideDelay: 5, //提示文字展示时长（单位：秒）
        download: true,
        pip: true,
        keyShortcut: 'on',
        keyShortcutStep: { //设置调整步长
          currentTime: 5, //播放进度调整步长，默认10秒
          volume: 0.1 //音量调整步长，默认0.1
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
    // this.ply.play()
  },
  beforeDestroy() {
    this.ply.destroy()
  }
}
</script>

<style scoped>
#player{
  height: 100%!important;
}
</style>