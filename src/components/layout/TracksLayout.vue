<template>
  <div class="tracksContainer">
    <el-row v-if="needBtn" class="btns">
      <div class="btn-container">
        <i class="ac-font ac-play1" @click="playAllTracks(list)"> 播放全部</i>
        <i class="ac-font ac-jia" @click="pushAllTracks(list)"></i>
      </div>
      <!--      <el-button type="warning" @click="playAllTracks(list)">播放全部</el-button>-->
      <!--      <el-button type="warning" @click="pushAllTracks(list)">添加到播放列表</el-button>-->
    </el-row>
    <el-row v-for="t in list" :key="t.id" class="tracks">
      <div class="tracks-wrap" @dblclick="songClk(t)">
        <template cover-img>
          <el-col v-if="t.al" :span="2" class="coverImg"><img :src="t.al.picUrl" alt="" height="50"></el-col>
          <el-col v-else-if="t.album" :span="2" class="coverImg">
            <img v-if="t.album.picUrl" :src="t.album.picUrl" alt="" height="50">
          </el-col>
          <el-col v-else :span="2" class="coverImg">
            <img :src="defaultImg" alt="" height="50">
          </el-col>

        </template>
        <el-col :span="7" class="name-artist">
          <template name>
            <scoText v-if=" t.name" class="name">{{ t.name }}</scoText>
            <span v-else>未知</span>
          </template>
          <template artist>
            <scoText v-if="t.ar">
            <span v-for="(a,ind) in t.ar" :key="ind" class="artist" @click="arClk(a.id)">{{ a.name }} <i
                v-if="ind!==t.ar.length-1">, </i></span>
            </scoText>
            <scoText v-else-if="t.artists">
            <span v-for="(a,ind) in t.artists" :key="ind" class="artist" @click="arClk(a.id)">{{ a.name }}
              <i v-if="ind!==t.ar.length-1">, </i> </span>
            </scoText>
            <el-col v-else>
              <span v-for="(a,ind) in t.artists" :key="ind">未知</span>
            </el-col>
          </template>
        </el-col>
        <template album-name>
          <el-col v-if="t.al&&t.al.name" :span="7" class="album"><span @click="alClk(t.al.id)">{{ t.al.name }}</span>
          </el-col>
          <el-col v-else-if="t.album&&t.album.name" :span="7" class="album">
            <span @click="alClk(t.album.id)">{{ t.album.name }}</span>
          </el-col>
          <el-col v-else :span="7" class="album">未知</el-col>
        </template>
        <template duration>
          <el-col v-if="t.dt" :span="7" class="duration">{{ t.dt | formatS }}</el-col>
          <el-col v-if="t.duration" :span="7" class="duration">{{ t.duration | formatS }}</el-col>
        </template>
        <!--      <template v-if="needBtn">
                <el-col v-if="t.mv" :span="2" class="mv">
                  <button :disabled="!t.mv" @click="mvClk(t.mv)">MV</button>
                </el-col>
                <el-col v-else-if="t.mvid" :span="2" class="mv">
                  <button :disabled="!t.mvid" @click="mvClk(t.mv)">MV</button>
                </el-col>
                <el-col v-else :span="2" class="placeholder">
                  <button disabled>MV</button>
                </el-col>
              </template>
              <el-col v-if="needBtn" :span="2" class="play">
                <button @click="songClk(t)">play</button>
              </el-col>-->
        <!--播放次数-->
        <el-col v-if="t.recordPlayCount" :span="3" class="playCount">{{ t.recordPlayCount }}</el-col>
        <!--文件大小-->
        <el-col v-if="t.fileSize" :span="2" class="fileSize">{{ (t.fileSize / 1024 / 2024).toFixed(2) }}MB</el-col>
      </div>
    </el-row>
  </div>
</template>

<script>
import {mapActions} from 'vuex'
import scoText from "@/components/scoText";

export default {
  name: "TracksLayout",
  components: {scoText},
  props: {
    list: {
      type: Array,
      required: true,
    },
    //是否展示按钮
    needBtn: {
      type: Boolean,
      default: true
    }
  },
  data() {
    return {
      defaultImg: "http://p3.music.126.net/UeTuwE7pvjBpypWLudqukA==/3132508627578625.jpg",
    }
  },
  methods: {
    mvClk(id) {
      this.$bus.$emit('mvClk', id)
    },
    songClk(song) {
      this.$bus.$emit('songClk', song)
    },
    arClk(id) {
      this.$bus.$emit('arClk', id)
    },
    alClk(id) {
      this.$bus.$emit('alClk', id)
    },
    ...mapActions('TracksAbout', {playAllTracks: 'playAllTracks', pushAllTracks: "pushAllTracks"})
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/tracksLayout";
</style>