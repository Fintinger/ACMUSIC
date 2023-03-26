<template>
  <el-row v-cloak class="user-detail">
    <el-row v-if="profile" class="info">
      <el-col :span="6">
        <div class="imgContainer"><img :alt="profile.avatarImgId" :src="profile.avatarUrl"></div>
      </el-col>
      <el-col :span="18">
        <el-row class="name-gender">
          <span class="name">{{ profile.nickname }}</span>
          <i :class="{'el-icon-male':profile.gender===1,'el-icon-female':profile.gender===2}"></i>
        </el-row>
        <el-row class="follow-fans">
          <el-col :span="6" class="follows">关注:{{ profile.follows }}</el-col>
          <el-col :span="6" class="followeds">粉丝:{{ profile.followeds }}</el-col>
        </el-row>
        <el-row class="birth">birthday:{{ profile.birthday }}</el-row>
        <el-row class="address">address:{{ profile.province }}·{{ profile.city }}</el-row>
        <el-row class="vip-type">vip-type:{{ profile.vipType }}</el-row>
        <el-row class="creat-time">createTime: {{ profile.createTime }}</el-row>
        <el-row class="signature">signature: {{ profile.signature }}</el-row>
      </el-col>
    </el-row>
    <el-row class="recent-tracks">
      <h2>Tracks</h2>
      <el-tabs v-if="weekTracksData.length&&allTracksData.length" ref="tracks" v-model="listenedAcName">
        <el-tab-pane :lazy="true" label="最近一周" name="week">
          <TracksLayout :list="weekTracksData"/>
        </el-tab-pane>
        <el-tab-pane :lazy="true" label="所有时间" name="all">
          <TracksLayout :list="allTracksData"/>
        </el-tab-pane>
      </el-tabs>
      <el-row v-else>
        未公开...
      </el-row>

    </el-row>
    <!--只有在登录用户详情页面才显示-->
    <el-row v-if="uid===loginInfo.userId" class="only-logged">
      <h2>云盘和收藏夹</h2>
      <el-tabs v-model="favorsAcName">
        <el-tab-pane label="云盘" name="cloud">
          <TracksLayout :list="cloudTracks"/>
        </el-tab-pane>
        <el-tab-pane label="专辑" name="album">
          <AlbumLayout :list="favors.albums"/>
        </el-tab-pane>
        <el-tab-pane label="歌手" name="artists">
          <ArtistLayout :list="favors.artists"/>
        </el-tab-pane>
        <el-tab-pane label="视频" name="videos">
          <VideoLayout :list="favors.vids"/>
        </el-tab-pane>
      </el-tabs>

    </el-row>
    <el-row class="playlist">
      <h2>喜欢歌单</h2>
      <PlaylistLayout v-if="favorTracks.length" ref="playlist" :list="favorTracks" pic-name="coverImgUrl"/>
      <h2>创建歌单</h2>
      <PlaylistLayout v-if="createList.length" ref="playlist" :list="createList" pic-name="coverImgUrl"/>
      <h2>收藏歌单</h2>
      <PlaylistLayout v-if="subList.length" ref="playlist" :list="subList" pic-name="coverImgUrl"/>
      <el-row v-else>
        未公开...
      </el-row>
    </el-row>
  </el-row>
</template>

<script>
import PlaylistLayout from "@/components/layout/PlaylistLayout";
import TracksLayout from "@/components/layout/TracksLayout";
import AlbumLayout from "@/components/layout/AlbumLayout";
import ArtistLayout from "@/components/layout/ArtistLayout";
import VideoLayout from "@/components/layout/VideoLayout";
import * as User from "@/api/User";

export default {
  name: "UserDetailLayout",
  components: {PlaylistLayout, TracksLayout,AlbumLayout,ArtistLayout,VideoLayout},
  props: {
    uid: {
      required: true
    },
  },
  data() {
    return {
      userInfo: {},
      favorTracks: [],
      createList: [],
      subList: [],
      weekTracksData: [],
      allTracksData: [],
      listenedAcName: "week",
      favorsAcName:"cloud",
      cloudTracks: [],
      favors: {
        vids: [],
        artists: [],
        albums: []
      },
    }
  },
  computed: {
    profile() {
      return this.userInfo.profile
    },
    loginInfo() {
      return this.$store.state.UserAbout.profile
    }
  },
  methods: {
    getUserInfo(uid) {
      this.$axios('/user/detail', {params: {uid}}).then(res => {
        //用户基本信息
        this.userInfo = res.data
      })
    },
    getPlaylist(uid) {
      return this.$axios('/user/playlist', {params: {uid, limit: 2000}})
    },
    getRecentTracks(uid, type = 1) {
      return this.$axios('/user/record', {params: {uid, type}})
    },
    handleThisTracksData(tracks, target) {
      tracks.forEach(l => {
        l.song.recordPlayCount = l.playCount
        target.push(l.song)
      })
    },
    concurrentRequestsForAll(uid) {
      this.getPlaylist(uid).then(res => {
        //歌单
        res.data.playlist.forEach((pl, ind) => {
          if (ind === 0)
            this.favorTracks.push(pl);
          else if (pl.creator.userId * 1 === this.uid * 1)
            this.createList.push(pl);
          else
            this.subList.push(pl)
        })
      })
      //听歌排行
      this.$axios.all([this.getRecentTracks(uid), this.getRecentTracks(uid, 0)])
          .then(this.$axios.spread((weekTracks, allTracks) => {
            //最近一周播放歌曲
            this.handleThisTracksData(weekTracks.data.weekData, this.weekTracksData);
            //所有时间播放歌曲
            this.handleThisTracksData(allTracks.data.allData, this.allTracksData);
          }))
          .catch(err => {
            //应该触发重新寻找数据的功能
            console.log(err.message)
          })
      //获取云盘信息
      User.getCloud().then(res => {
        res.data.data.forEach(val => {
          //添加文件大小属性
          val.simpleSong.fileSize = val.fileSize
          this.cloudTracks.push(val.simpleSong)
        })
      });
      //获取收藏夹
      /*   User.subAlbumList().then(res=>{
           console.log(res);
         })*/
      this.$axios.all([User.subArtistList(), User.subTopicList(), User.subMvList(), User.subAlbumList()])
          .then(this.$axios.spread((artists, topics, mvs, albums) => {
            this.favors.artists = artists.data.data
            //
            this.favors.vids = mvs.data.data
            this.favors.albums = albums.data.data
          }))
    },
    layout() {
      this.handleTracks();
    },
    handleTracks() {
      if (this.$refs.tracks) {
        const tracksContainers = this.$refs.tracks.$el.querySelectorAll('.tracksContainer');
        tracksContainers.forEach(el => {
          let h = el.querySelector('.tracks').clientHeight
          el.style.height = h * 8 + "px";
          // console.log(h * 8);
          el.style.overflow = "auto"
        })
      }
    },
  },
  beforeMount() {
    if (this.uid) {
      this.getUserInfo(this.uid)
      this.concurrentRequestsForAll(this.uid)
    }
  },
  updated() {
    this.layout()
  }
}
</script>

<style lang="scss" scoped>

h2 {
  font-size: 1.8rem;
  font-weight: bolder;
  margin: 10px 0;
}


.name-gender {
  i {
    color: #fff;
    display: inline-block;
    //width: 8px;
    //height: 8px;
    border-radius: 50%;
  }

  i.el-icon-male {
    background: #47a1ce;
  }

  i.el-icon-female {
    background: #ff86b6;
  }
}

</style>