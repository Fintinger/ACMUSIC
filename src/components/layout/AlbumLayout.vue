<template>
  <ul class="gridLayout">
    <li v-for="album in list" :key="album.id" class="album">
      <el-card :body-style="{ padding: 0}" shadow="never" @click.native="alClk(album.id)">
        <div class="img-wrapper">
          <cover-image :src="album.picUrl | imgParam('300y300')"
                       :alt="album.name + '的封面'" custom-class="image"/>
        </div>
        <div class="info">
          <div class="albumName" :title="album.name">{{ album.name }}</div>
          <template>
            <div v-if="Array.isArray(album.artists)" class="albumArtist">
              <span v-for="ar in album.artists" :key="ar.id" class="artist"
                    @click.stop="arClk(ar.id)">{{ ar.name }} </span>
            </div>
            <div v-else class="albumArtist">{{ album.artist ? album.artist.name : '未知歌手' }}</div>
          </template>
          <!-- title 用方法拼：Vue 2 的过滤器只能出现在表达式顶层，
               写成 `(a | fmt())` 会被当成位或运算 → 运行时报 _vm.fmt is not a function -->
          <div :title="albumTitle(album)" class="albumCompany">{{ album.company }} |
            {{ album.publishTime| fromNow }}
          </div>
        </div>

        <div class="play-btn">
          <playTracksBtn :type="2" :val="album"/>
        </div>
      </el-card>
    </li>
  </ul>
</template>

<script>
import playTracksBtn from "@/components/playTracksBtn";
import CoverImage from "@/components/common/CoverImage";
import {formatMs} from "@/utils/filters";

export default {
  name: "AlbumLayout",
  components: {playTracksBtn, CoverImage},
  props: {
    list: {
      type: Array,
      required: true,
    },
  },
  methods: {
    /** 悬浮提示：公司 + 精确发布时间（替代原来写在 v-bind 里的过滤器） */
    albumTitle(album) {
      const t = album && album.publishTime ? formatMs(album.publishTime, 'YYYY.MM.DD HH:mm:ss') : ''
      return [album && album.company, t].filter(Boolean).join(' | ')
    },
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
