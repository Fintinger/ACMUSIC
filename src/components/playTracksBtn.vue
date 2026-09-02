<template>
  <button v-if="expand" class="play-btn-expand" @click.stop="playAllTracks(val)">
    <span class="play-btn-icon"><BaseIcon name="play"/></span>
    <span class="play-btn-text">播放全部</span>
  </button>
  <div v-else class="playIcon row-col-center">
    <BaseIcon name="play" @click.stop="playAllTracks(val)"/>
  </div>
</template>

<script>
import {getAllTrack} from "@/api/Playlist";
import {getDetail} from "@/api/Album";

export default {
  name: "playTracksBtn",
  props: {
    val: {
      required: true,
    },
    type: {
      type: Number,
      default: 0,//0-Array,1-playlist,2-album
    },
    expand: {
      type: Boolean,
      default: false
    }
  },
  methods: {
    getByPlaylist(id) {
      getAllTrack(id, {limit: 1000}).then(res => {
        this.$store.dispatch("TracksAbout/playAllTracks", res.data.songs)
      })
    },
    getByAlbum(id) {
      getDetail(id).then(res => {
        this.$store.dispatch("TracksAbout/playAllTracks", res.data.songs)
      })
    },
    playAllTracks(val) {
      switch (this.type) {
        case 0:
          this.$store.dispatch("TracksAbout/playAllTracks", val);
          break;
        case 1:
          this.getByPlaylist(val.id);
          break;
        case 2:
          this.getByAlbum(val.id);
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/base/variables";

.playIcon {
  width: 100%;
  height: 100%;

  i {
    cursor: pointer;
    color: $font-white-1;
    font-size: 3.5rem;
    transition: all .5s;
    border-radius: 50%;
    padding: .1rem;
    padding-left: .3rem;
    background: rgba(255, 255, 255, 0.25);
    backdrop-filter: blur(1rem);

    &:hover {
      color: $font-white;
      transform: scale(1.1);
    }
  }
}

.play-btn-expand {
  display: inline-flex;
  align-items: center;
  height: 44px;
  padding: 0 10px;
  border: none;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(1rem);
  -webkit-backdrop-filter: blur(1rem);
  cursor: pointer;
  transition: all .35s cubic-bezier(.4, 0, .2, 1);
  overflow: hidden;
  white-space: nowrap;

  .play-btn-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: rgba(255,255,255,.25);
    flex-shrink: 0;
    font-size: 20px;

    i {
      color: $font-white-1;
      font-size: 20px;
    }
  }

  .play-btn-text {
    font-size: 14px;
    font-weight: 500;
    color: $font-white;
    letter-spacing: .3px;
    margin-left: 0;
    max-width: 0;
    overflow: hidden;
    white-space: nowrap;
    transition: all .35s cubic-bezier(.4, 0, .2, 1);
    opacity: 0;
  }

  &:hover {
    padding: 0 18px 0 10px;
    background: rgba(255, 255, 255, 0.35);
    transform: translateY(-1px);

    .play-btn-text {
      max-width: 80px;
      margin-left: 8px;
      opacity: 1;
    }
  }

  &:active {
    transform: scale(.96);
  }
}
</style>