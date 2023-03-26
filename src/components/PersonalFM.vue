<template>
  <div class="personal-fm">

    <el-carousel
        :autoplay="true"
        :interval="10000"
        :loop="true"
        direction="vertical"
        indicator-position="none"
    >
      <el-carousel-item v-for="item in currentList" :key="item.id">
        <el-row class="cover-img-base-info" v-if="item.album">
          <div class="cover-img">
            <el-image :src="item.album.picUrl"></el-image>
          </div>
          <div class="base-info">
            <el-row class="track-name">
              <scoText>{{ item.name }}</scoText>
            </el-row>
            <el-row class="album-name">
              <scoText>
                <span>{{ item.album.name }}--</span>
                <span v-for="ar in item.artists" :key="ar.id">{{ar.name}} </span>
              </scoText>
            </el-row>
          </div>
        </el-row>
      </el-carousel-item>
    </el-carousel>
    <span class="text-personalFM"><i class="ac-font ac-diantai"></i> 私人FM</span>
  </div>
</template>

<script>
import pubsub from "pubsub-js";
import scoText from "@/components/scoText";

export default {
  name: "PersonalFM",
  components:{scoText},
  props: {
    list: []
  },
  data() {
    return {
      list_FM: [],
      currentList: []
    }
  },
  watch: {
    list(n, o) {
      if (o.length)
        this.currentList = o
      else
        this.currentList = n
    },
    list_FM(arr) {
      this.currentList = arr
      this.$store.dispatch('TracksAbout/playAllTracks', arr)
    }
  },
  methods: {
    initPlay() {
      this.$store.dispatch('TracksAbout/playAllTracks', this.list)
    },
    getPersonalFM(msgName, t) {
      this.$axios('/personal_fm', {params: {t}}).then(res => {
        this.list_FM = res.data.data
      })
    }
  },
  mounted() {
    this.$on('initPlay', this.initPlay)
    pubsub.subscribe('getPersonalFM', this.getPersonalFM)
  }
}
</script>

<style scoped>
.ac-diantai{
  font-size: 1.3rem;
}
</style>