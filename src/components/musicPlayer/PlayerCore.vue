<template>
  <!--isFold隐藏控制按钮，info，和menu-->
  <div ref="progressPanel" class="progressPanel">
    <!--进度条和控制按钮-->
    <el-row class="progressContainer">
      <el-row v-show="isFold" class="unFold"><i class="el-icon-arrow-up" @click="isFold=false"></i></el-row>
      <!--进度条主体-->
      <div class="el-row progressWrapper" @click="progressClk">
        <div ref="progress" :style="{width:progress+'%'}" class="progress">
          <div ref="progressBar" class="progress-bar"></div>
        </div>
      </div>
      <!--控制按钮-->
      <el-row class="controls">
        <i class="el-icon-caret-left" @click="preSong"></i>
        <i v-if="!isPlay" class="play-status el-icon-video-play" @click="playSong"></i>
        <i v-if="isPlay" class="play-status el-icon-video-pause" @click="pauseSong"></i>
        <i class="el-icon-caret-right" @click="nextSong"></i>
      </el-row>
    </el-row>
    <!--基本信息-->
    <el-row class="info">
      <div class="infoWrap" @click="showSongDetail">
        <el-row>
          <!--相似音乐点击之后没有封面的情况-->
          <template cover-img>
            <el-col v-if="currentSong.al" :span="12" class="coverImg"><img :src="currentSong.al.picUrl" alt=""></el-col>
            <el-col v-if="currentSong.album" :span="12" class="coverImg"><img v-if="currentSong.album.picUrl"
                                                                              :src="currentSong.album.picUrl" alt="">
            </el-col>

          </template>
          <el-col :span="12" class="info">
            <el-row class="name">{{ currentSong.name }}</el-row>
            <template artist>
              <el-row v-if="currentSong.ar" class="artist">
                <el-col v-for="ar in currentSong.ar" :key="ar.id" :span="12">{{ ar.name }}</el-col>
              </el-row>
              <el-row v-if="currentSong.artists" class="artist">
                <el-col v-for="ar in currentSong.artists" :key="ar.id" :span="12">{{ ar.name }}</el-col>
              </el-row>
            </template>
          </el-col>
        </el-row>
      </div>
    </el-row>
    <!--菜单栏-->
    <el-row class="menus">
      <el-row>
        <el-col :span="6" class="playList">
          <el-dropdown v-if="currentPlaylist.length" placement="top" @command="handleCommand">
            <span class="el-dropdown-link">播放列表<i class="el-icon-arrow-down el-icon--right"></i></span>

            <el-dropdown-menu slot="dropdown">
              <el-row>
                <el-col :span="12">一共{{ currentPlaylist.length }}首歌</el-col>
                <el-col :span="12">
                  <el-button @click="clearPlaylist">清空列表</el-button>
                </el-col>
              </el-row>
              <el-dropdown-item v-for="s in currentPlaylist" :key="s.id" :class="{curSong:s.curSong}" :command="s">
                {{ s.name }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </el-col>
        <el-col :span="10" class="volume">
          <i class="el-icon-microphone"><input v-model="volume" max="100" min="0" name="points"
                                               type="range">{{ volume }}</i>
        </el-col>
        <el-col :span="8">
          <i class="el-icon-arrow-down" @click="isFold=true"></i>
        </el-col>
      </el-row>
    </el-row>
  </div>
</template>

<script>
import pubsub from "pubsub-js";
import {mapState} from "vuex"

export default {
  name: "PlayCore",
  props: ["song", "isExpand"],
  data() {
    return {
      currentSong: {},
      // songPlaylist: [],
      isFold: false,
      isPlay: false,
      //HTML_ELEMENT_OBJECT,虚拟DOM
      sel: {},
      timeNow: "",
      timeDuration: "",
      volume: 20,
      curIndex: 0,

      isPending: false,
      promiseList: []
    }
  },
  computed: {
    ...mapState('TracksAbout', ['currentPlaylist', 'isPersonalFM']),

    isLogin() {
      return this.$store.getters["UserAbout/isLogin"]
    },
    progress() {
      //进度条实时更新
      return (this.timeNow / this.timeDuration) * 100 || 0
    },
  },
  watch: {
    //接收到的song
    song(val) {
      console.warn("song发生变化");
      this.currentSong = val
    },
    currentSong(val) {
      if (val.id) {
        /*// 先初始化
      this.init()*/
        this.pauseSong()
        console.warn("currentSong发生变化");
        //加入Promise队列
        this.pushPromise(this.checkSong(this.currentSong.id))

        //更新当前歌曲索引
        this.curIndex = this.currentPlaylist.findIndex(item => item.id === this.currentSong.id) === -1 ? 0 : this.currentPlaylist.findIndex(item => item.id === this.currentSong.id)

        //播放列表中添加此歌（防止添加重复的歌曲）
        if (this.currentPlaylist.findIndex(item => item.id === val.id) === -1) {
          this.$store.commit("TracksAbout/PUSH_PLAYLIST", val)
        }

        //列表中当前播放歌曲添加特殊样式
        this.currentPlaylist.forEach(el => {
          el.curSong = el.id === val.id
        })
        //获取歌词
        this.$emit('getLyric', val.id)
        //获取相似
        this.$emit('getSimi', val.id)
      }
    },
    promiseList() {
      console.log("promiseList改变");
      //只执行最新的
      if (this.promiseList.length) {
        this.promiseList[0].then(() => {
          console.log("链接添加完毕")
          this.isPending = false
          this.playSong()
        })
      }
    },
    curIndex(ind) {
      //实现索引改变则当前歌曲改变的逻辑
      this.currentSong = this.currentPlaylist[ind]
    },
    timeNow(n) {
      //给父组件传输TimeNow(如果展开则需要)
      this.isExpand && this.$emit('tUpdate', n)
      //此时为相等，应该更新下一首歌
      if (this.sel.currentTime === this.timeDuration) {
        this.nextSong()
      }
      //最后一段处理
      if ((this.timeDuration - n) < 0.5 && this.sel.currentTime !== this.timeDuration) {
        this.sel.currentTime = this.timeDuration
        this.pauseSong()
      }
    },
    volume(val) {
      this.sel.volume = val / 100
    },
    isFold(val) {
      val ? this.$refs.progressPanel.classList.add('foldPanel')
          : this.$refs.progressPanel.classList.remove('foldPanel')
    },
    isPersonalFM(val) {
      if (!val) {
        this.$store.commit('TracksAbout/REPLACE_PLAYLIST', [this.currentSong])
      }
    }
  },
  methods: {
    init() {
      // console.log("init");
      this.promiseList = []
      // this.pauseSong();
      this.isPlay = false
      this.timeDuration = 0
      this.timeNow = 0
    },
    pushPromise(promise) {
      this.promiseList.unshift(promise)
    },
    async checkSong(id) {
      //检查是否登录
      await new Promise(resolve => {
        if (this.isLogin) {
          this.checkSongLoggedIn(id).then(res => {
            resolve(res)
          })
        } else {
          this.checkSongDntLogin(id).then(res => {
            resolve(res)
          })
        }
      })

    },
    //未登录
    checkSongDntLogin(id) {
      //检查是否需要VIP
      return new Promise(resolve => {
        this.$axios.get('/song/detail?ids=' + id).then(res => {
          switch (res.data.songs[0].fee) {
            case 1:
              alert("VIP歌曲")
              resolve("VIP歌曲")
              break
            case 8:
              // alert("非会员可免费播放低音质，会员可播放高音质及下载");
              this.initAudioByOuterUrl(id);
              resolve("initAudioByOuterUrl")
              break
            case 4:
              alert("购买专辑才能听");
              resolve("购买专辑才能听")
              break
            case 0://免费歌曲
              // this.checkCopyright(id)
              this.initAudioByOuterUrl(id);
              resolve("initAudioByOuterUrl")
              break
            default:
              alert("未知错误");
              resolve("未知错误")
              break
          }
        })
      })
    },
    //已登录
    checkSongLoggedIn(id) {
      //检查音乐是否可用
      return new Promise(resolve => {
        this.$axios('/check/music', {params: {id}}).then(res => {
          if (res.data.success) {//可用
            // 获取音乐URL
            this.getSongUrl(id).then(res => {
              this.sel.src = res.data.data[0].url
              resolve()
            }).catch(err => {
              // 调用外链请求一次
              console.info("调用外链请求一次")
              this.checkSongDntLogin(id)
              console.log(err.message);
            })
          }
        }).catch(err => {
          alert("暂无版权！")
          resolve("暂无版权！")
          console.log(err.message)
        })
      })
    },
    getSongUrl(id, br = 320000) {
      return this.$axios('/song/url', {params: {id, br}})
    },
    initAudioByOuterUrl(id) {
      this.sel.src = location.origin + "/api/song/media/outer/url?id=" + id
    },
    playSong() {
      //无播放歌曲但列表不为空的情况下点击播放按钮
      if (JSON.stringify(this.currentSong) === "{}" && this.currentPlaylist.length) {
        this.currentSong = this.currentPlaylist[0]
      }
      this.isPlay = true
      this.sel.play()
    },
    pauseSong() {
      this.isPlay = false
      this.sel.pause()
    },
    preSong() {
      this.curIndex = this.curIndex - 1 < 0 ? this.currentPlaylist.length - 1 : this.curIndex - 1
    },
    nextSong() {
      // isPersonalFM
      if (this.curIndex + 1 > this.currentPlaylist.length - 1) {
        if (this.isPersonalFM) {
          //subscribe in PersonalFM.vue
          pubsub.publish('getPersonalFM', new Date().getTime())
        } else {
          this.curIndex = 0
        }
      } else {
        this.curIndex += 1
      }
    },
    dragProgress() {
      document.addEventListener('mousemove', this.progressMouseEvent)
      //鼠标抬起则移除鼠标移动事件
      document.addEventListener('mouseup', () => {
        document.removeEventListener('mousemove', this.progressMouseEvent)
      })
      //取消浏览器对拖拽内容进行搜索的默认行为
      return false;
    },
    //进度条鼠标事件(包括点击和拖拽)
    progressMouseEvent(evt) {
      // 获取页面宽度
      const pageWidth = this.$refs.progressPanel.clientWidth;
      // 暂停拖动（如果拖动条超出范围，则停止拖动）
      if ((evt.x - this.$refs.progressPanel.offsetLeft) > pageWidth) {
        document.removeEventListener('mousemove', this.progressMouseEvent)
      }
      this.$refs.progress.style.width = ((evt.x - this.$refs.progressPanel.offsetLeft) / pageWidth) * 100 + "%"
      this.sel.currentTime = ((evt.x - this.$refs.progressPanel.offsetLeft) / pageWidth) * this.timeDuration
    },
    addEventListeners() {
      this.sel.addEventListener('timeupdate', this._currentTime)
      this.sel.addEventListener('canplay', this._durationTime)
      this.$refs.progressBar.addEventListener('mousedown', this.dragProgress)
    },
    removeEventListeners() {
      this.sel.removeEventListener('timeupdate', this._currentTime)
      this.sel.removeEventListener('canplay', this._durationTime)
      this.$refs.progressBar.removeEventListener('onmousedown', this.dragProgress)
    },
    _currentTime() {
      if (this.sel)
        this.timeNow = (this.sel.currentTime).toFixed(4)
    },
    _durationTime() {
      if (this.sel)
        this.timeDuration = this.sel.duration
    },
    progressClk(evt) {
      this.progressMouseEvent(evt)
    },
    //下蓝菜单点击(播放列表)
    handleCommand(s) {
      this.currentSong = s
      /*this.sel = {};
      this.initAudio(id)*/
    },
    //展开详情
    showSongDetail() {
      if (!this.currentSong.isVoice)
        this.$emit('SDClk', this.currentSong)
    },
    //播放所有歌曲
    playAllSong(msgName, mode = "order") {
      // console.log("当前列表中歌曲:\n");
      /* this.currentPlaylist.map(res => {
         console.log(res.name)
       })*/
      if (mode === "random") {
        this.currentSong = this.currentPlaylist[Math.ceil(Math.random() * (this.currentPlaylist.length - 1))]
      } else {//顺序播放
        this.currentSong = this.currentPlaylist[0]
      }
    },
    //清空播放列表
    clearPlaylist() {
      this.pauseSong()
      //on in APP.vue
      this.$bus.$emit("clearPlaylist")
    },
  },
  beforeMount() {
    this.sel = new Audio()
  },
  mounted() {
    this.addEventListeners()
    //publish in store
    this.pubId = pubsub.subscribe('playAll', this.playAllSong)//订阅消息
  },
  beforeDestroy() {
    this.removeEventListeners()
    this.init()
    pubsub.unsubscribe(this.pubId)
  }
}
</script>

<style lang="scss" scoped>
$height: 80px;
$progressWrapperHeight: 12px;
$progressHeight: 8px;
$l1: 1;
$l2: 2;
.el-dropdown-menu {
  max-height: 500px;
  overflow: auto;
}

.progressPanel.foldPanel {
  transform: translateY(100%);
}

.progressPanel {
  width: 100%;
  height: $height;
  display: flex;
  flex-flow: row wrap;
  justify-content: space-between;
  background: #515A81;
  position: relative;

  //紧接着的三个div高度撑满
  & > .el-row {
    height: 100%;
    width: 33%;
    transform: translateY(-100%);
    z-index: $l2;
  }

  //进度条和控制按钮
  .unFold {
    position: absolute;
    top: 0;
    width: 100%;
    text-align: center;
    transform: translateY(-$progressHeight*2);
    color: #fff;
  }

  .progressContainer {
    z-index: $l1;
    width: 100%;
    transform: translateY(-$progressWrapperHeight);
    background: transparent;

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
      height: $height;
      font-size: 2.5rem;
      line-height: $height;
      color: #fff;
      text-align: center;

      & > * {
        z-index: inherit;
      }
    }
  }

  //基本信息
  .info {
    text-align: left;
    float: left;

    .infoWrap {
      .coverImg {
        height: $height;
        width: $height;
        overflow: hidden;

        img {
          width: $height;
        }
      }
    }
  }

  //菜单栏
  .menus {
    text-align: right;
    float: right;

    .el-row {
      height: 100%;
      width: 100%;
      float: right;
      font-size: 2rem;

      & > .el-col {
        height: 100%;
      }

      .playList {

      }

      .volume {

      }
    }

  }
}
</style>