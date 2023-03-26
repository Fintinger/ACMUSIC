<template>
  <el-row v-if="url && dt_cover" :gutter="20" class="vidContainer">
    <el-col :span="18">
      <el-row class="title">{{ dt_name }}</el-row>
      <template author><!--简单情况：MV作者携带在detail中-->
        <el-row v-if="!dt_arName.nickname" class="title">@{{ dt_arName }}</el-row>
        <!--稍复杂情况：Vide作者携带在creator中-->
        <el-row v-if="dt_arName.nickname" class="title">@{{ dt_arName.nickname }}</el-row>
      </template>
      <el-row class="player">
        <vidPlayer :poster="dt_cover" :url="url"/>
      </el-row>
      <el-row class="info">
        <el-row class="playCount">playCount: {{ dt_playCt|div1w(dt_playCt) }}</el-row>
        <el-row class="praisedCount">praisedCount: {{ detail.praisedCount|div1w(detail.praisedCount) }}</el-row>
        <el-row class="commentCount">commentCount: {{ detail.commentCount|div1w(detail.commentCount) }}</el-row>
        <el-row class="shareCount">shareCount: {{ detail.shareCount|div1w(detail.shareCount) }}</el-row>
        <el-row class="subscribeCount">subscribeCount: {{ detail.subscribeCount|div1w(detail.subscribeCount) }}</el-row>
        <el-row class="pbTime">publishTime: {{ detail.publishTime }}</el-row>
        <el-row v-if="detail.videoGroup" class="tags">
          Tags: <span v-for="t in detail.videoGroup" :key="t.id">#{{ t.name }}</span>
        </el-row>
      </el-row>
    </el-col>
    <el-col v-if="simiVideo.length" :span="6" class="recommendVid">
      <el-tabs v-model="activeName" @tab-click="handleClick">
        <el-tab-pane label="相似" name="simi">
          <el-row v-for="v in simiVideo" :key="v[si_id]" class="simiMV">
            <el-row class="imgWrap"><img :src="v[si_cover]" alt="" @click="simiClickEvt(v[si_id])"></el-row>
            <el-row class="playCount">{{ v[si_playCt] | div1w(v[si_playCt]) }}</el-row>
            <el-row class="title">{{ v[si_name] }}</el-row>
            <el-row v-if="!v[si_arName].length" class="ar">{{ v[si_arName] }}</el-row>
            <el-row v-if="v[si_arName].length" class="ar">
              <span v-for="n in v[si_arName]" :key="n.userId">@{{ n.userName }} </span>
            </el-row>
            <el-row class="duration">duration:{{ v.durationms }}</el-row>
          </el-row>
        </el-tab-pane>
        <el-tab-pane label="评论" name="comment">
          <!--是MV-->
          <CommentLayout v-if="Number.isInteger(id)" :id="id" type="1"/>
          <!--是视频-->
          <CommentLayout v-else :id="id" type="5"/>
        </el-tab-pane>
      </el-tabs>
    </el-col>
  </el-row>
</template>

<script>
import vidPlayer from "@/components/vidPlayer";
import CommentLayout from "@/components/layout/CommentLayout";

export default {
  name: "VideoPlayerLayout",
  components: {vidPlayer, CommentLayout},
  data() {
    return {
      activeName: "simi"
    }
  },
  props: {
    url: {
      type: String,
      required: true,
    },
    detail: {
      type: Object,
      required: true,
    },
    simiVideo: {
      type: Array,
      required: true,
    },
    simiClickEvt: {
      type: Function,
      required: true,
    },
    //当前ID，用于获取评论
    id: {
      required: true,
    },
    nameConfig: {
      type: Object,
      default() {
        return {
          dt: {
            cover: "cover",
            name: "name",
            artistName: "artistName",
            playCount: "playCount"
          },
          si: {
            id: "id",
            cover: "cover",
            name: "name",
            artistName: "artistName",
            playCount: "playCount"
          }
        }
      }
    }
  },
  computed: {
    dt_name() {
      return this.detail[this.nameConfig.dt.name]
    },
    dt_cover() {
      return this.detail[this.nameConfig.dt.cover]
    },
    dt_arName() {
      return this.detail[this.nameConfig.dt.artistName]
    },
    dt_playCt() {
      return this.detail[this.nameConfig.dt.playCount]
    },
    si_id() {
      return this.nameConfig.si.id
    },
    si_cover() {
      return this.nameConfig.si.cover
    },
    si_name() {
      return this.nameConfig.si.name
    },
    si_arName() {
      return this.nameConfig.si.artistName
    },
    si_playCt() {
      return this.nameConfig.si.playCount
    }
  },
  methods: {
    handleClick(tab, event) {
      console.log(tab, event);
    }
  }
}
</script>

<style scoped>
.vidContainer {
  text-align: left;
}
</style>