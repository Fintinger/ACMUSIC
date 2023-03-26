<template>
  <div class="playIcon row-col-center">
    <i class="ac-font ac-play1" @click.stop="playAllTracks(val)"></i>
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
    // ...mapActions('TracksAbout', {playAllTracks: 'playAllTracks'})
  },
  nextTick(callback, context) {
    console.log("nextTick");
    console.log(callback);
    console.log(context);
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
      //color: #c7c7c7;
      color: $font-white;
      transform: scale(1.1);
      //background: rgba(255,255,255,.5);

    }
  }


}
</style>