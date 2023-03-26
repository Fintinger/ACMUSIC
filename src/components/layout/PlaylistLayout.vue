<template>
  <ul class="gridLayout">
    <!--插入一些未来可能要置顶的歌单-->
    <slot name="top"></slot>
    <li v-for="playlist in list" :key="playlist.id" class="playlist" @click="plClk(playlist.id)">
      <el-card :body-style="{ padding: 0} " shadow="never">
        <div class="imgContainer">
          <!--播放量-->
          <template playCount>
            <!--离谱的key名-->
            <p v-if="playlist.playCount" class="playCount"><i class="ac-font ac-play"></i>
              {{ playlist.playCount | Div1w(playlist.playCount) }}</p>
            <p v-if="playlist.playcount" class="playCount"><i class="ac-font ac-play"></i>
              {{ playlist.playcount | Div1w(playlist.playcount) }}</p>
          </template>
          <!--收藏数-->
          <template>
            <p v-if="playlist.bookCount" class="bookCount">
              <i class="el-icon-star-off"></i> {{ playlist.bookCount | Div1w(playlist.bookCount) }}</p>
            <p v-else-if="playlist.subscribedCount" class="bookCount">
              <i class="el-icon-star-off"></i> {{ playlist.subscribedCount | Div1w(playlist.subscribedCount) }}</p>
          </template>
          <img :src="playlist[picName]" class="image">
        </div>
        <div class="info">
          <!--歌单名-->
          <scoText v-if="playlist.name" class="listName">{{ playlist.name }}</scoText>
          <!--其他信息-->
          <div class="moreInfo">
            <!--更新时间-->
            <template about-time>
              <p v-if="playlist.updateTime" class="updateTime">最近更新 {{ playlist.updateTime | formatMs }}</p>
              <!--              <p v-if="playlist.createTime" class="createTime">创建于 {{ playlist.updateTime | formatMs}}</p>-->
            </template>
            <p v-if="playlist.copywriter" class="copywriter">{{ playlist.copywriter }}</p>
            <p v-if="playlist.updateFrequency" class="updateFrequency">{{ playlist.upateFrequency }}</p>
            <!--          <p v-if="playlist.description" class="copywriter">{{ playlist.description }}</p>-->
          </div>
        </div>
        <div class="play-btn">
          <playTracksBtn :type="1" :val="playlist"/>
        </div>
      </el-card>
    </li>
  </ul>
</template>

<script>
import scoText from "@/components/scoText";
import playTracksBtn from "@/components/playTracksBtn";

export default {
  name: "PlaylistLayout",
  components: {scoText, playTracksBtn},
  props: {
    list: {
      type: Array,
      required: true,
    },
    picName: {
      type: String,
      default: "picUrl",
    },
    isExpandInPlayerWin: {
      type: Boolean,
    }
  },
  methods: {
    plClk(id) {
      if (this.isExpandInPlayerWin) {
        this.$emit('update:isExpandInPlayerWin', false)
      }
      this.$bus.$emit('plClk', id)
    },
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/playlistLayout";

/*ul.gridLayout {
  li.playlist {
    //margin-top: 20px;

    .imgContainer {
      width: 100%;
      max-height: 340px;
      overflow: hidden;
    }

    .moreInfo {
      & > p {
        height: 1.5rem;
        width: 100%;
        overflow: hidden;
      }
    }
  }
}*/
</style>