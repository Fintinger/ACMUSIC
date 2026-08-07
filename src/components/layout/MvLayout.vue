<template>
  <ul class="mvList gridLayout">
    <li v-for="mv in list" :key="mv.id" class="list-item mv" @click="mvClk(mv.id)">
      <el-card :body-style="{ padding: 0 }">
        <div class="imgContainer">
          <img :src="mv[picName] | imgParam('500y280')" class="image">
        </div>
        <div class="moreInfo">
          <div class="mvName">{{ mv.name }}</div>
          <div class="mvArtist">{{ mv.artistName }}</div>
          <div class="meta-row">
            <span class="meta-item"><BaseIcon name="play"/>{{ mv.playCount | Div1w(mv.playCount) }}</span>
            <span class="meta-item"><i class="icon-time"></i>{{ mv.duration | formatDuration }}</span>
            <span class="meta-item"><i class="icon-date"></i>{{ mv.publishTime | formatMs("YYYY年MM月DD日") }}</span>
          </div>
        </div>
      </el-card>
    </li>
  </ul>
</template>

<script>
export default {
  name: "MvLayout",
  props: {
    list: { type: Array, required: true },
    picName: { type: String, default: 'cover' }
  },
  methods: {
    mvClk(id) { this.$bus.$emit('mvClk', id) }
  }
}
</script>

<style scoped>
.mvList > li {
  background: #fff;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0,0,0,.08);
  transition: transform .3s ease, box-shadow .3s ease;
  cursor: pointer;
  padding: 0;
}
.mvList > li:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px rgba(0,0,0,.14);
}
.mvList .el-card {
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  border-radius: 0;
}
.imgContainer {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 16px 16px 0 0;
}
.imgContainer img {
  width: 100%; height: 100%;
  object-fit: cover; display: block;
}
.moreInfo { padding: 14px 16px 16px; }
.mvName {
  font-size: 15px; font-weight: 600; color: #222;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  line-height: 1.4; margin-bottom: 6px;
}
.mvArtist {
  font-size: 13px; color: #999;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  line-height: 1.4; margin-bottom: 10px;
}
.meta-row {
  display: flex; align-items: center; gap: 12px;
  font-size: 12px; color: #999; flex-wrap: wrap;
}
.meta-item {
  display: inline-flex; align-items: center; gap: 4px;
  white-space: nowrap;
}
.meta-item i { font-size: 13px; }
.icon-time::before { content: "◷"; }
.icon-date::before { content: "⟓"; }
</style>
