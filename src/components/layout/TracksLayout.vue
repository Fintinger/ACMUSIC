<template>
  <div class="tracksContainer" :class="{ 'has-actions': showActions }">
    <el-row v-if="needBtn" class="btns">
      <div class="btn-container">
        <button type="button" class="btn-item" :disabled="!list.length" @click="playAllTracks(list)"><BaseIcon name="play"/><span> 播放全部</span></button>
        <button type="button" class="btn-item" :disabled="!list.length" aria-label="全部加入播放列表" title="全部加入播放列表" @click="pushAllToQueue"><BaseIcon name="listPlus"/></button>
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
          <!-- 歌名 + MV 角标同一行：角标只在真的有 MV 时出现（实测约 4~6 成歌曲有），
               不占固定列宽，避免整列留白 -->
          <div class="titleRow">
            <button type="button" class="name" :title="'播放 ' + (t.name || '未知')" @click="songClk(t)">{{ t.name || '未知' }}</button>
            <button v-if="mvOf(t)" type="button" class="mvTag" :title="'播放《' + (t.name || '未知') + '》的 MV'" @click.stop="mvClk(mvOf(t))">MV</button>
          </div>
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
      <!-- 行内快捷操作：hover 才出现，日常浏览不干扰。
           和下面的 actions 插槽二选一——管理模式下右侧已经有 ↑↓✕，再叠一层会挤。
           电台节目（isVoice）没有音乐音源，两个入口都给不了，直接不渲染。 -->
      <div v-if="!showActions && !t.isVoice" class="trackAdd" @click.stop>
        <button
            type="button"
            class="rowAddBtn"
            :class="{ 'is-blocked': queueAddBlocked }"
            :aria-disabled="queueAddBlocked"
            :title="queueAddTitle"
            aria-label="加入播放列表"
            @click.stop="addToQueue(t)"
        >
          <BaseIcon name="listPlus" :size="14"/>
        </button>
        <button
            type="button"
            class="rowAddBtn"
            title="加入歌单"
            aria-label="加入歌单"
            @click.stop="addToPlaylist(t)"
        >
          <BaseIcon name="playlistPlus" :size="14"/>
        </button>
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
import {mvIdOf, isMvDead} from "@/utils/songMv";

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
    },
    // 是否把「推荐理由」当作额外一列（每日推荐 v1 的 reason，如"超77%人播放"）
    showReason: {
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
      return this.showReason || this.list.some(t => t.recordPlayCount != null || t.fileSize != null)
    },
    extraLabel() {
      if (this.showReason) return '推荐理由'
      return this.list.some(t => t.recordPlayCount != null) ? '播放次数' : '文件大小'
    },
    /** 当前播放曲目 id：PlayerCore 切歌时给队列项打 curSong 标记（见 PlayerCore.vue:739） */
    currentId() {
      const cp = (this.$store.state.TracksAbout && this.$store.state.TracksAbout.currentPlaylist) || []
      const cur = cp.find(s => s && s.curSong)
      return cur ? cur.id : null
    },
    /**
     * 心动 / 私人FM 正在接管队列时，不能往队列里加歌：
     *  - FM 在队尾 `_applyFmBatch` 会 REPLACE 整队，加进去的歌直接被冲掉；
     *  - 心动在队尾 `_heartExtend` 会 concat 红心推荐，加进去的歌被夹在两批推荐中间；
     *  - heartBusy 是"正在取流"的那 1 秒，此时队列马上要被换掉，加了也白加。
     *
     * 判断不能用 `fmMode`——那是"用户选了哪个模式"的长期偏好（持久化），
     * 人早就不在 FM 里了它还是非 DEFAULT；`fmActive` 才是"此刻真的在放"。
     */
    queueAddBlocked() {
      const s = this.$store.state.TracksAbout || {}
      return !!(s.heartMode || s.heartBusy || s.fmActive)
    },
    queueAddTitle() {
      const s = this.$store.state.TracksAbout || {}
      if (s.heartBusy) return '正在进入心动模式，请稍候再试'
      if (s.heartMode) return '心动模式播放中，不支持加入播放列表'
      if (s.fmActive) return '私人 FM 播放中，不支持加入播放列表'
      return '加入播放列表'
    }
  },
  methods: {
    extraOf(t) {
      if (this.showReason) return t.reason || '—'
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
    /**
     * 这一行可播的 MV id，0 表示不显示角标
     * 只读 song.mv，不为每一行发请求：列表里绝大多数接口本来就带这个字段，
     * 缺字段的（私人 FM 之类）宁可没有入口，也不值得 50 行打 50 个请求
     */
    mvOf(t) {
      const id = mvIdOf(t)
      if (!id || isMvDead(id)) return 0
      return id
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
    /**
     * 单曲加入当前播放列表。
     * FM / 心动下按钮置灰，点击只解释原因（真 disable 掉的话用户点不出任何反馈，
     * 只会觉得按钮坏了）。
     */
    addToQueue(t) {
      if (this.queueAddBlocked) {
        this.$toast.info(this.queueAddTitle)
        return
      }
      // 加之前队列是不是空的：决定 PlayerCore 要不要顺手开播（清空后加歌、首次加歌）
      const wasEmpty = !(this.$store.state.TracksAbout.currentPlaylist || []).length
      this.$store.dispatch('TracksAbout/pushTrack', t).then(added => {
        if (!added) {
          this.$toast.info('这首歌已在播放列表中')
          return
        }
        this.$toast.success('已加入播放列表')
        // 队列变了要立刻落盘：PlayerCore 只在切歌/每 5 秒/关页面时保存，
        // 空队列（还没在播歌）时不会自动保存，不通知就会"加了歌刷新就没了"
        this.$bus.$emit('queue-changed', { playId: t.id, wasEmpty })
      })
    },
    /** 单曲加入歌单：交给 App 里的全局弹窗（登录校验、歌单列表、查重都在那边） */
    addToPlaylist(t) {
      this.$bus.$emit('open-add-to-playlist', { songs: [t], source: 'track-row' })
    },
    /** 顶部「全部加入播放列表」：先算清楚有几首是新的，避免提示"已加入 50 首"其实一首没进 */
    pushAllToQueue() {
      if (!this.list.length) return
      if (this.queueAddBlocked) {
        this.$toast.info(this.queueAddTitle)
        return
      }
      // 声音（电台节目）搜索页也复用这个列表，它们没有音乐音源，不能进队列
      const valid = this.list.filter(t => t && !t.isVoice && t.id != null)
      if (!valid.length) {
        this.$toast.warning('声音节目不支持加入播放列表')
        return
      }
      const wasEmpty = !(this.$store.state.TracksAbout.currentPlaylist || []).length
      const existing = new Set(
          (this.$store.state.TracksAbout.currentPlaylist || []).map(t => String(t.id))
      )
      const fresh = valid.filter(t => !existing.has(String(t.id)))
      if (!fresh.length) {
        this.$toast.info('这些歌都已在播放列表中')
        return
      }
      this.$store.dispatch('TracksAbout/pushAllTracks', fresh).then(() => {
        this.$toast.success(`已加入 ${fresh.length} 首到播放列表`)
        this.$bus.$emit('queue-changed', { playId: fresh[0].id, wasEmpty })
      })
    },
    ...mapActions('TracksAbout', {playAllTracks: 'playAllTracks'})
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/tracksLayout";

// 行内快捷操作（加入播放列表 / 加入歌单）：hover 才出现，避免日常浏览时干扰。
// 绝对定位在右侧并带底色——它盖住的是时长列，不给底色会和数字叠在一起。
.trackAdd {
  position: absolute;
  top: 50%;
  right: $sp-3;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  gap: .2rem;
  padding: .2rem .3rem;
  border-radius: 8px;
  background: var(--c-bg-elevated);
  box-shadow: 0 2px 10px var(--c-shadow-mid);
  opacity: 0;
  pointer-events: none;
  transition: opacity .18s ease;
}

.rowAddBtn {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--c-text-secondary);
  cursor: pointer;
  transition: color .15s ease, background .15s ease;

  &:hover {
    background: var(--c-bg-hover);
    color: var(--c-accent);
  }

  &:focus-visible {
    outline: 1px solid var(--c-accent);
    outline-offset: 1px;
  }

  // 心动 / FM 下不可用：视觉压暗，但仍然可点（点击给出原因）
  &.is-blocked {
    opacity: .35;
    cursor: not-allowed;

    &:hover {
      background: transparent;
      color: var(--c-text-secondary);
    }
  }
}

.tracks:hover .trackAdd,
.tracks:focus-within .trackAdd {
  opacity: 1;
  pointer-events: auto;
}

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
