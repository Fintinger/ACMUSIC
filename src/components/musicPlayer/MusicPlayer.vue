<template>
  <div ref="playerWindow" class="playerWrapper">
    <div class="mainWin">
      <PlayCore ref="pgPanel" :isExpand="isExpand" :song="song"/>
    </div>
    <div v-show="isExpand" class="lyric">
      <el-button class="packUp" @click="isExpand=false">收起</el-button>
      <ul class="lyricContainer">
        <li v-for="(ly,ind) in lyric" :key="ind" :class="{'cur':ly.cur}" class="lyric" @click="lyricClick(ly.t)"
            v-html="ly.lytxt"></li>
      </ul>
    </div>
    <div v-if="isExpand" class="simi-groups">
      <el-row class="simiTracks">
        <h2>相似歌曲</h2>
        <TracksLayout v-if="simiTracks.length" :list="simiTracks"/>
      </el-row>
      <el-row class="simiPlaylist">
        <h2>相似歌单</h2>
        <!--特殊定制-->
        <PlaylistLayout v-if="simiPlaylist.length" :isExpandInPlayerWin.sync="isExpand" :list="simiPlaylist"
                        pic-name="coverImgUrl"/>
        <p v-else>没有更多...</p>
      </el-row>
    </div>
    <div v-if="isExpand" class="comments">
      <CommentLayout :id="currentSong.id" type="0"/>
    </div>
  </div>

</template>

<script>
import PlayCore from "@/components/musicPlayer/PlayerCore";
import TracksLayout from "@/components/layout/TracksLayout";
import PlaylistLayout from "@/components/layout/PlaylistLayout";
import CommentLayout from "@/components/layout/CommentLayout";



export default {
  name: "MusicPlayer",
  props: ['song'],
  components: {PlayCore, TracksLayout, PlaylistLayout, CommentLayout},
  data() {
    return {
      isExpand: false,
      lyric: [],
      timeNow: 0,
      currentSong:{},
      simiTracks: [],
      simiPlaylist: [],
    }
  },
  watch: {
    isExpand(val) {
      val ? this.expanded()
          : this.minified()
    },
    timeNow(val) {
      // this.更新
      //如果到最后一句歌词，不再触发更新
      this.needUpdate(val)
      /*  if (!this.lyric[this.lyric.length - 2].cur) {
        }*/
    },
  },
  methods: {
    showSongDetail(data) {
      console.log("CLICKED");
      this.isExpand = true
      //歌曲相关
      this.currentSong = data
    },
    expanded() {
      document.body.parentNode.style.overflowY = "hidden"
      this.$refs.playerWindow.classList.add('expandWindow')
      this.$refs.pgPanel.$on('tUpdate', this.timeUpdate)

    },
    minified() {
      document.body.parentNode.style.overflowY = "auto"
      this.$refs.playerWindow.classList.remove('expandWindow')
      this.$refs.pgPanel.$off('tUpdate')
    },
    parseLyric(ly) {
      /*
      * [00:00.000] 作词 : 李焯雄
  [00:01.000] 作曲 : 梁翘柏
  [00:02.000] 编曲 : 梁翘柏
  [00:15.540]白如白牙热情被吞噬
  [00:18.190]香槟早挥发得彻底
  [00:22.890]白如白蛾潜回红尘俗世
  [00:25.900]俯瞰过灵位
  [00:29.350]但是爱骤变芥蒂后
      * */
      //每一行一个数组
      let allLine = ly.split("\n")
      let t, lytxt, resArr = [];
      allLine.map(el => {
        //得到00:02.016格式的时间
        t = el.split("]")[0].replace('[', '').trim()
        let min, s, ms
        //得到s
        if (t) {
          min = t.split(":")[0] * 1
          s = t.split(":")[1].split(".")[0] * 1
          ms = t.split(":")[1].split(".")[1] * 1
        }
        t = (min * 60 + s + ms / 1000) || ""

        lytxt = el.split("]")[1] ? el.split("]")[1].trim() : "<br>"
        resArr.push({t, lytxt, cur: false})
      })
      return resArr
    },
    getLyric(id) {
      this.lyric = []
      this.$axios.get('/lyric', {params: {id}}).then(res => {
        this.lyric = this.parseLyric(res.data.lrc.lyric)
      })
    },
    timeUpdate(t) {
      this.timeNow = t * 1
    },
    lyricClick(t) {
      // console.log(this.$refs.pgPanel);
      t + 0.1 > this.$refs.pgPanel.timeDuration
          ? this.$refs.pgPanel.sel.currentTime = this.$refs.pgPanel.timeDuration
          : this.$refs.pgPanel.sel.currentTime = t + 0.01;
      // this.currentSong.currentTime = t;
    },
    needUpdate(val) {
      //undefined报错
      if (this.lyric[0]) {
        let temp = this.lyric.filter(ly => ly.t >= val)[0];
        this.lyric.forEach((ly, ind) => {
          if (this.lyric[ind - 1]) {
            // console.log("OK")
            if (temp) {
              this.lyric[ind - 1].cur = temp.t === ly.t;
            } else {
              // console.log("ERROR");
              //为什么会有下面奇怪的代码呢？
              //因为这是最后两句处理
              this.lyric[this.lyric.length - 2].cur = true
              this.lyric[this.lyric.length - 3].cur = false
            }
          }
        })
      }
    },
    getSimiTracks(id) {
      return this.$axios('/simi/song', {params: {id}})
    },
    getSimiPlaylist(id) {
      return this.$axios('/simi/playlist', {params: {id}})
    },
    concurrentRequestsGetSimi(id) {
      //不需要登录则并发
      this.$axios.all([this.getSimiTracks(id), this.getSimiPlaylist(id)])
          .then(this.$axios.spread((tracks, list) => {
            this.simiTracks = tracks.data.songs
            this.simiPlaylist = list.data.playlists
          })).catch(err => {
        console.log(err.message);
      })
    }
  },
  mounted() {
    this.$refs.pgPanel.$on('SDClk', this.showSongDetail)
    this.$refs.pgPanel.$on('getLyric', this.getLyric)
    this.$refs.pgPanel.$on('getSimi', this.concurrentRequestsGetSimi)
  },
}
</script>

<style lang="scss">
.curSong {
  background: #000;
}

.playerWrapper.expandWindow {
  width: 100%;
  height: 100vh;
  background: #515A81;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  overflow: auto;
  padding: 30px;

  & > div {
    width: 50%;
    height: inherit;
  }

  .mainWin {
    $progressWrapperHeight: 12px;
    $progressHeight: 8px;

    padding: 50px 20px;

    .progressPanel {
      width: 100%;
      height: 100%;
      display: flex;
      flex-flow: column nowrap;
      justify-content: center;
      align-items: center;

      //紧接着的二个div宽度撑满
      & > .el-row {
        height: 50%;
        width: 100%;
      }

      .progressContainer {
        width: 100%;
        transform: none;
        background: transparent;
        order: 1;

        .unFold > .el-icon-arrow-up {
          background: #000;
        }

        .progressWrapper {
          width: 100%;
          height: $progressWrapperHeight;
          background: #bda284;

          .progress {
            width: 100%;
            height: $progressHeight;
            background: red;
            position: relative;
            margin-top: 2px;

            .progress-bar {
              width: $progressHeight;
              height: 100%;
              background: yellow;
              border-radius: 50%;
              position: absolute;
              right: 0;
            }
          }
        }


        .controls {
          height: auto;
          font-size: 2.5rem;
          line-height: 1;
          color: #fff;
        }
      }

      //基本信息
      $imgWrapHeight: 450px;

      .info {
        text-align: left;
        float: left;
        height: auto;
        transform: none;
        flex-basis: 70%;

        .infoWrap {
          width: min-content;
          height: auto;
          margin: 0 auto;

          .coverImg {
            height: $imgWrapHeight;
            width: $imgWrapHeight;
            overflow: hidden;

            img {
              width: $imgWrapHeight;
            }
          }
        }
      }

      .menus {
        display: none;
      }

    }
  }

  .lyric {
    position: relative;

    .packUp {
      position: absolute;
      top: 0;
      right: 0;
      z-index: 2;
    }

    .lyricContainer {
      height: 60%;
      overflow: auto;
      width: 100%;
      text-align: center;

      li:hover {
        background: #FDF4E2;
      }

      li.cur {
        color: red;
      }

    }
  }

  .simi-groups {
    width: 100%;
    height: auto;
  }

  .comments {
    width: 100%;
  }
}

</style>