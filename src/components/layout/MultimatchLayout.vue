<template>
  <div class="multimatch">
    <!--歌手-->
    <ArtistLayout v-if="name==='artist'" :list="targetList"/>
    <!--用户-->
    <!--歌单-->
    <PlaylistLayout v-if="name==='playlist'" :list="targetList" pic-name="coverImgUrl"/>
    <!--专辑-->
    <AlbumLayout v-if="name==='album'" :list="targetList"/>
    <!--歌曲-->
    <!--mBlog-->
    <VideoLayout v-if="name==='new_mlog'" :isMlog="true" :list="targetList"/>
    <!--MV-->
  </div>
</template>

<script>
import ArtistLayout from "@/components/layout/ArtistLayout";
import PlaylistLayout from "@/components/layout/PlaylistLayout";
import VideoLayout from "@/components/layout/VideoLayout";
import AlbumLayout from "@/components/layout/AlbumLayout";

export default {
  name: "MultimatchLayout",
  components: {ArtistLayout, PlaylistLayout, VideoLayout,AlbumLayout},
  props: {
    targetList: {
      type: Array,
      required: true,
    },
    name: {
      type: String,
      required: true
    }
  }
}
</script>

<style scoped>

</style>