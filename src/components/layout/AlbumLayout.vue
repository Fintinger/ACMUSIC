<template>
  <ul class="gridLayout">
    <li v-for="album in list" :key="album.id" class="album">
      <el-card :body-style="{ padding: 0} " shadow="never">
        <div
            :style="{backgroundImage: `url('${LP}')`}"
            class="img-wrapper"
            @click="alClk(album.id)"
        >
          <img :src="album.picUrl"
               alt="" class="image">
        </div>
        <div class="info">
          <scoText class="albumName">{{ album.name }}</scoText>
          <template>
            <scoText v-if="Array.isArray(album.artists)" class="albumArtist">
              <span v-for="ar in album.artists" :key="ar.id" class="artist"
                    @click.stop="arClk(ar.id)">{{ ar.name }} </span>
            </scoText>
            <scoText v-else class="albumArtist">{{ album.artist.name }}</scoText>
          </template>
          <scoText :title="album.publishTime|formatMs('YYYY.MM.DD HH:mm:ss')" class="albumCompany">{{ album.company }} |
            {{ album.publishTime| fromNow }}
          </scoText>
          <scoText class="pub-time"></scoText>
        </div>

        <div class="play-btn">
          <playTracksBtn :type="2" :val="album"/>
        </div>
      </el-card>
    </li>
  </ul>
</template>

<script>
import config from "@/config";
import scoText from "@/components/scoText";
import playTracksBtn from "@/components/playTracksBtn";

export default {
  name: "AlbumLayout",
  components: {scoText,playTracksBtn},
  props: {
    list: {
      type: Array,
      required: true,
    },
  },
  computed: {
    LP() {
      return config.imgUrl.LP
    }
  },
  methods: {
    alClk(id) {
      this.$bus.$emit('alClk', id)
    },
    arClk(id) {
      this.$bus.$emit('arClk', id)
    }
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/albumLayout";
</style>