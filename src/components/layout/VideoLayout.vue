<template>
  <div class="video">
    <ul v-if="!isMlog" class="mvList gridLayout">
      <li v-for="v in list" :key="v.vid" class="list-item v" @click="vClk(v.vid)">
        <el-card :body-style="{ padding: 0 }">
          <div class="imgContainer">
            <img :src="v[coverImg] | imgParam('500y280')" alt="" class="image">
          </div>
          <div class="moreInfo">
            <div class="title">{{ v.title }}</div>
            <div v-if="Array.isArray(v.creator)" class="vCreator"><span v-for="u in v.creator" :key="u.id||u.userId">{{ u.userName }}</span></div>
            <div v-else-if="v.creator" :key="v.creator.userId" class="vCreator">{{ v.creator.userName }}</div>
            <div class="meta-row">
              <span class="meta-item"><BaseIcon name="play"/>{{ v.playTime | Div1w(v.playTime) }}</span>
              <span class="meta-item"><i class="icon-time"></i>{{ v.durationms | formatDuration }}</span>
              <span class="meta-item"><i class="icon-date"></i>{{ v.publishTime | formatMs("YYYY年MM月DD日") }}</span>
            </div>
          </div>
        </el-card>
      </li>
    </ul>
    <ul v-if="isMlog" class="mvList gridLayout">
      <li v-for="v in list" :key="v.id" class="list-item v" @click="vClk(v.id)">
        <el-card :body-style="{ padding: 0 }">
          <div class="imgContainer">
            <img :src="v.resource.mlogBaseData.coverUrl | imgParam('500y280')" alt="" class="image">
          </div>
          <div class="moreInfo">
            <div class="title">{{ v.resource.mlogBaseData.text }}</div>
            <div v-if="v.creator" class="vCreator"><span v-for="u in v.creator" :key="u.id">{{ u.userName }}</span></div>
            <div class="meta-row">
              <span class="meta-item"><BaseIcon name="play"/>{{ v.playTime | Div1w(v.playTime) }}</span>
              <span class="meta-item"><i class="icon-time"></i>{{ v.resource.mlogBaseData.duration | formatDuration }}</span>
              <span class="meta-item"><i class="icon-date"></i>{{ v.resource.mlogBaseData.pubTime | formatMs("YYYY年MM月DD日") }}</span>
            </div>
          </div>
        </el-card>
      </li>
    </ul>
  </div>
</template>

<script>
export default {
  name: "VideoLayout",
  props: {
    list: { type: Array, required: true },
    coverImg: { type: String, default: "coverUrl" },
    isMlog: { type: Boolean, default: false }
  },
  methods: {
    vClk(id) { this.$bus.$emit('vClk', id) }
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
.title {
  font-size: 15px; font-weight: 600; color: #222;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  line-height: 1.4; margin-bottom: 6px;
}
.vCreator {
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
