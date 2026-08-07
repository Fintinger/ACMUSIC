<template>
  <div :class="['multimatch', 'type-' + name]">
    <div class="match-title">{{ title }}</div>
    <div class="match-content">
      <!-- 歌手 -->
      <ul v-if="name === 'artist'" class="mm-list mm-artist">
        <li v-for="ar in list" :key="ar.id" class="mm-card mm-artist-card" @click="$bus.$emit('arClk', ar.id)">
          <img class="mm-avatar" :src="ar.img1v1Url || ar.picUrl || ar.avatarUrl" alt="">
          <div class="mm-name">{{ ar.name }}</div>
        </li>
      </ul>
      <!-- 歌单 -->
      <ul v-else-if="name === 'playlist'" class="mm-list mm-playlist">
        <li v-for="pl in list" :key="pl.id" class="mm-card mm-playlist-card" @click="$bus.$emit('plClk', pl.id)">
          <img class="mm-cover" :src="(pl.coverImgUrl || pl.picUrl) | imgParam('200y200')" alt="">
          <div class="mm-info">
            <div class="mm-name">{{ pl.name }}</div>
            <div class="mm-meta"><BaseIcon name="play"/>{{ pl.playCount | Div1w(pl.playCount) }}</div>
          </div>
        </li>
      </ul>
      <!-- 专辑 -->
      <ul v-else-if="name === 'album'" class="mm-list mm-album">
        <li v-for="al in list" :key="al.id" class="mm-card mm-album-card" @click="$bus.$emit('alClk', al.id)">
          <img class="mm-cover" :src="al.picUrl | imgParam('200y200')" alt="">
          <div class="mm-info">
            <div class="mm-name">{{ al.name }}</div>
            <div class="mm-meta">{{ albumArtists(al) }}</div>
          </div>
        </li>
      </ul>
      <!-- MV -->
      <ul v-else-if="name === 'new_mlog'" class="mm-list mm-mv">
        <li v-for="mv in list" :key="mv.id" class="mm-card mm-mv-card" @click="$bus.$emit('vClk', mv.id)">
          <img class="mm-img" :src="mv.resource.mlogBaseData.coverUrl | imgParam('500y280')" alt="">
          <div class="mm-info">
            <div class="mm-name">{{ mv.resource.mlogBaseData.text }}</div>
            <div class="mm-meta">
              <span class="mm-meta-item"><BaseIcon name="play"/>{{ mv.playTime | Div1w(mv.playTime) }}</span>
              <span class="mm-meta-item"><i class="icon-time"></i>{{ mv.resource.mlogBaseData.duration | formatDuration }}</span>
            </div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script>
const titles = { artist: "歌手", playlist: "歌单", album: "专辑", new_mlog: "MV" }

export default {
  name: "MultimatchLayout",
  props: {
    targetList: { type: Array, required: true },
    name: { type: String, required: true }
  },
  computed: {
    title() { return titles[this.name] || "" },
    list() { return this.targetList }
  },
  methods: {
    albumArtists(al) {
      if (Array.isArray(al.artists)) return al.artists.map(a => a.name).join(" / ")
      if (al.artist) return al.artist.name
      return ""
    }
  }
}
</script>

<style lang="scss">
/* ====== multimatch 卡片（独立布局，内容自适应高度） ====== */
.resContainer .multimatch {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: 20px;
  border-radius: 20px;
  background: rgba(255,255,255,.85);
  box-shadow: 0 8px 30px rgba(0,0,0,.06);
  transition: transform .25s ease, box-shadow .25s ease;
  animation: mmFade .4s ease;
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 30px rgba(0,0,0,.08);
  }
}

@keyframes mmFade { from { opacity: 0; transform: scale(.96); } to { opacity: 1; transform: scale(1); } }

.resContainer .match-title {
  height: 32px;
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  font-size: 18px;
  font-weight: 600;
  color: #222;
}

.resContainer .match-content {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ====== mm-list 基础：横向排列 ====== */
.resContainer .mm-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-start;
}

/* ====== 歌手：横向卡片，头像 + 名称 ====== */
.resContainer .type-artist .mm-list {
  justify-content: flex-start;
}

.resContainer .type-artist .mm-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  padding: 0;
}

.resContainer .type-artist .mm-avatar {
  width: 120px; height: 120px;
  margin-bottom: 12px;
  border-radius: 50%;
  object-fit: cover;
  background: #f2f3f5;
}

.resContainer .type-artist .mm-name {
  text-align: center;
  font-size: 16px; font-weight: 600; color: #222;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: 120px;
}

/* ====== 歌单 / 专辑：横向卡片 ====== */
.resContainer .type-playlist .mm-card,
.resContainer .type-album .mm-card {
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  padding: 0;
  width: 320px;
}

.resContainer .type-playlist .mm-cover,
.resContainer .type-album .mm-cover {
  width: 64px; height: 64px;
  flex: none;
  border-radius: 10px;
  object-fit: cover;
  background: #f2f3f5;
}

.resContainer .type-playlist .mm-info,
.resContainer .type-album .mm-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.resContainer .type-playlist .mm-name,
.resContainer .type-album .mm-name {
  font-size: 15px; font-weight: 600; color: #222;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.resContainer .type-playlist .mm-meta,
.resContainer .type-album .mm-meta {
  font-size: 12px; color: #999;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.resContainer .type-playlist .mm-meta i,
.resContainer .type-album .mm-meta i {
  font-size: 11px; margin-right: 3px;
}

/* ====== MV：横向卡片，禁止滚动条，最多 3 个 ====== */
.resContainer .type-new_mlog .mm-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  overflow: hidden;
  max-width: 100%;
}

.resContainer .type-new_mlog .mm-card {
  flex: none;
  width: 220px;
  cursor: pointer;
  padding: 0;
}

.resContainer .type-new_mlog .mm-card:nth-child(n+4) { display: none; }

.resContainer .type-new_mlog .mm-img {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 14px;
  background: #f2f3f5;
  display: block;
}

.resContainer .type-new_mlog .mm-info {
  padding-top: 10px;
}

.resContainer .type-new_mlog .mm-name {
  font-size: 14px; font-weight: 600; color: #222;
  line-height: 1.3;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.resContainer .type-new_mlog .mm-meta {
  display: flex;
  gap: 12px;
  margin-top: 6px;
  font-size: 12px; color: #999;
}

.resContainer .type-new_mlog .mm-meta-item {
  display: inline-flex; align-items: center; gap: 4px;
  white-space: nowrap;
}

.resContainer .type-new_mlog .mm-meta-item i { font-size: 11px; }

.resContainer .type-new_mlog .icon-time::before { content: "◷"; }
</style>
