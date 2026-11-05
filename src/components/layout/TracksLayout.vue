<template>
  <div class="tracksContainer" :class="{ 'has-actions': showActions }">
    <el-row v-if="needBtn" class="btns">
      <div class="btn-container">
        <button type="button" class="btn-item" :disabled="!list.length" @click="playAllTracks(list)"><BaseIcon name="play"/><span> 播放全部</span></button>
        <button type="button" class="btn-item" :disabled="!list.length" aria-label="全部加入播放列表" title="全部加入播放列表" @click="pushAllTracks(list)"><BaseIcon name="listPlus"/></button>
      </div>
    </el-row>

    <!-- 列头：让「歌曲 / 专辑 / 时长」的列义可读（原先四列全靠猜） -->
    <div v-if="list.length" class="tracks-head" aria-hidden="true">
      <span class="col-index">#</span>
      <span class="col-cover"></span>
      <span class="col-title">歌曲</span>
      <span class="col-album">专辑</span>
      <span v-if="hasExtra" class="col-extra">{{ extraLabel }}</span>
      <span class="col-duration">时长</span>
    </div>

    <!-- 行结构：flex + 垂直居中（原 el-col 栅格 + margin-top 补偿，
         字号一变就基线错位，且 span 总和可超 24 列导致换行） -->
    <div
        v-for="(t, index) in list"
        :key="t.id"
        class="tracks"
        :class="{ 'has-actions': showActions, 'is-current': isCurrent(t) }"
    >
      <div class="tracks-wrap">
        <span class="col-index">
          <BaseIcon v-if="isCurrent(t)" name="play" :size="12" class="index-play"/>
          <template v-else>{{ index + 1 }}</template>
        </span>
        <span class="col-cover">
          <cover-image :src="coverOf(t)" :alt="(t.name || '未知') + '的封面'"/>
        </span>
        <div class="col-title">
          <button type="button" class="name" :title="'播放 ' + (t.name || '未知')" @click="songClk(t)">{{ t.name || '未知' }}</button>
          <span class="artist" :title="artistList(t).map(a => a.name).join(', ')">
            <span
                v-for="(a, ind) in artistList(t)"
                :key="ind"
                class="artist-link"
                @click.stop="arClk(a.id)"
            >{{ a.name }}<i v-if="ind !== artistList(t).length - 1">, </i></span>
          </span>
        </div>
        <span class="col-album" :title="albumName(t)" @click.stop="albumClick(t)">{{ albumName(t) || '未知' }}</span>
        <span v-if="hasExtra" class="col-extra">{{ extraOf(t) }}</span>
        <span class="col-duration">{{ durationOf(t) }}</span>
      </div>
      <!-- 行操作：由调用方通过作用域插槽提供（如歌单详情的删歌/排序）。
           TracksLayout 是全站共用的展示组件，这里只留位置，不放业务逻辑。 -->
      <div v-if="showActions" class="trackActions" @click.stop>
        <slot name="actions" :track="t" :index="index"/>
      </div>
    </div>
  </div>
</template>

<script>
import {mapActions} from 'vuex'
import CoverImage from "@/components/common/CoverImage";
import {format_s} from "@/utils/filters";

export default {
  name: "TracksLayout",
  components: {CoverImage},
  props: {
    list: {
      type: Array,
      required: true,
    },
    //是否展示按钮
    needBtn: {
      type: Boolean,
      default: true
    },
    // 是否展示行操作插槽（由调用方决定，如歌单详情只在"管理歌曲"模式下开）
    showActions: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      defaultImg: "http://p3.music.126.net/UeTuwE7pvjBpypWLudqukA==/3132508627578625.jpg",
    }
  },
  computed: {
    hasExtra() {
      return this.list.some(t => t.recordPlayCount != null || t.fileSize != null)
    },
    extraLabel() {
      return this.list.some(t => t.recordPlayCount != null) ? '播放次数' : '文件大小'
    },
    /** 当前播放曲目 id：PlayerCore 切歌时给队列项打 curSong 标记（见 PlayerCore.vue:739） */
    currentId() {
      const cp = (this.$store.state.TracksAbout && this.$store.state.TracksAbout.currentPlaylist) || []
      const cur = cp.find(s => s && s.curSong)
      return cur ? cur.id : null
    }
  },
  methods: {
    extraOf(t) {
      if (this.extraLabel === '播放次数') return t.recordPlayCount != null ? `${t.recordPlayCount} 次` : '—'
      return t.fileSize != null ? `${(t.fileSize / 1024 / 1024).toFixed(2)} MB` : '—'
    },
    isCurrent(t) {
      return this.currentId != null && t.id === this.currentId
    },
    coverOf(t) {
      return (t.al && t.al.picUrl) || (t.album && t.album.picUrl) || this.defaultImg
    },
    artistList(t) {
      return t.ar || t.artists || []
    },
    albumName(t) {
      return (t.al && t.al.name) || (t.album && t.album.name) || ''
    },
    albumId(t) {
      return (t.al && t.al.id) || (t.album && t.album.id)
    },
    albumClick(t) {
      const id = this.albumId(t)
      if (id) this.alClk(id)
    },
    durationOf(t) {
      const v = t.dt || t.duration
      return v ? format_s(v) : ''
    },
    mvClk(id) {
      this.$bus.$emit('mvClk', id)
    },
    songClk(song) {
      // 单击播放（原为 dblclick：与全站卡片单击跳转的习惯相反，新用户发现不了）
      this.$bus.$emit('songClk', song)
    },
    arClk(id) {
      this.$bus.$emit('arClk', id)
    },
    alClk(id) {
      this.$bus.$emit('alClk', id)
    },
    ...mapActions('TracksAbout', {playAllTracks: 'playAllTracks', pushAllTracks: "pushAllTracks"})
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/tracksLayout";

// 行操作区（可选插槽）：hover 才出现，避免日常浏览时干扰
.trackActions {
  position: absolute;
  top: 50%;
  right: $sp-3;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: .25rem;
  padding: .25rem .4rem;
  border-radius: 8px;
  background: var(--c-bg-elevated);
  box-shadow: 0 2px 10px var(--c-shadow-mid);
  opacity: 0;
  pointer-events: none;
  transition: opacity .18s ease;
}

.tracks:hover .trackActions,
.tracks:focus-within .trackActions {
  opacity: 1;
  pointer-events: auto;
}
</style>
