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
.multimatch {
  min-width: 160px;
  animation: fadeScale .4s ease;
  ::v-deep .gridLayout {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 12px;
  }
  ::v-deep li { padding: 0 !important; transition: transform .25s; &:hover { transform: translateY(-4px); } }
}

@keyframes fadeScale { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }
</style>