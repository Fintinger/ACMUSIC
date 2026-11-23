<template>
  <div class="tracksContainer" :class="{ 'has-actions': showActions }">
    <el-row v-if="needBtn" class="btns">
      <div class="btn-container">
        <button type="button" class="btn-item" :disabled="!visibleEntries.length" @click="playAllTracks(visibleTracks)"><BaseIcon name="play"/><span> 播放全部</span></button>
        <button type="button" class="btn-item" :disabled="!visibleEntries.length" aria-label="全部加入播放列表" title="全部加入播放列表" @click="pushAllToQueue"><BaseIcon name="listPlus"/></button>
      </div>
    </el-row>

    <!-- 被屏蔽的行不渲染，但歌单总数对不上会让人以为丢歌了：这里明说屏蔽了几首，并给管理入口 -->
    <div v-if="blockedCount && effectiveBlockedMode === 'hide'" class="tracksBlockedHint">
      <BaseIcon name="block" :size="12"/>
      <span>已屏蔽 {{ blockedCount }} 首</span>
      <router-link to="/blacklist" class="hintLink">管理</router-link>
    </div>

    <!-- 列头：让「歌曲 / 专辑 / 时长」的列义可读（原先四列全靠猜） -->
    <div v-if="visibleEntries.length" class="tracks-head" aria-hidden="true">
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
        v-for="(entry, index) in visibleEntries"
        :key="entry.track.id"
        class="tracks"
        :class="{
          'has-actions': showActions,
          'is-current': isCurrent(entry.track),
          'is-blocked': effectiveBlockedMode === 'mark' && isBlocked(entry.track)
        }"
    >
      <div class="tracks-wrap">
        <span class="col-index">
          <BaseIcon v-if="isCurrent(entry.track)" name="play" :size="12" class="index-play"/>
          <template v-else>{{ index + 1 }}</template>
        </span>
        <span class="col-cover">
          <cover-image :src="coverOf(entry.track)" :alt="(entry.track.name || '未知') + '的封面'"/>
        </span>
        <div class="col-title">
          <!-- 歌名 + MV 角标同一行：角标只在真的有 MV 时出现（实测约 4~6 成歌曲有），
               不占固定列宽，避免整列留白 -->
          <div class="titleRow">
            <button type="button" class="name" :title="'播放 ' + (entry.track.name || '未知')" @click="songClk(entry.track)">{{ entry.track.name || '未知' }}</button>
            <!-- 搜索单曲的「原唱 / 翻唱」标注：只在 showOriginTags 打开时出现 -->
            <span v-if="showOriginTags && isOriginal(entry.track)" class="originTag">原唱</span>
            <span v-else-if="showOriginTags && isCover(entry.track)" class="coverTag">翻唱</span>
            <span v-if="effectiveBlockedMode === 'mark' && isBlocked(entry.track)" class="blockedTag">已屏蔽</span>
            <button v-if="mvOf(entry.track)" type="button" class="mvTag" :title="'播放《' + (entry.track.name || '未知') + '》的 MV'" @click.stop="mvClk(mvOf(entry.track))">MV</button>
          </div>
          <span class="artist" :title="artistList(entry.track).map(a => a.name).join(', ')">
            <span
                v-for="(a, ind) in artistList(entry.track)"
                :key="ind"
                class="artist-link"
                @click.stop="arClk(a.id)"
            >{{ a.name }}<i v-if="ind !== artistList(entry.track).length - 1">, </i></span>
          </span>
        </div>
        <span class="col-album" :title="albumName(entry.track)" @click.stop="albumClick(entry.track)">{{ albumName(entry.track) || '未知' }}</span>
        <span v-if="hasExtra" class="col-extra">{{ extraOf(entry.track) }}</span>
        <span class="col-duration">{{ durationOf(entry.track) }}</span>
      </div>
      <!-- 行内快捷操作：hover 才出现，日常浏览不干扰。
           和下面的 actions 插槽二选一——管理模式下右侧已经有 ↑↓✕，再叠一层会挤。
           电台节目（isVoice）没有音乐音源，这些入口都给不了，直接不渲染。 -->
      <div v-if="!showActions && !entry.track.isVoice" class="trackAdd" @click.stop>
        <button
            type="button"
            class="rowAddBtn"
            :class="{ 'is-blocked': queueAddBlocked }"
            :aria-disabled="queueAddBlocked"
            :title="queueAddTitle"
            aria-label="加入播放列表"
            @click.stop="addToQueue(entry.track)"
        >
          <BaseIcon name="listPlus" :size="14"/>
        </button>
        <button
            type="button"
            class="rowAddBtn"
            title="加入歌单"
            aria-label="加入歌单"
            @click.stop="addToPlaylist(entry.track)"
        >
          <BaseIcon name="playlistPlus" :size="14"/>
        </button>
        <!-- 第三个入口收进「更多」：行内空间只够两个按钮，硬塞会把时长列挤掉 -->
        <el-dropdown
            trigger="click"
            placement="bottom-end"
            @command="cmd => onRowCommand(cmd, entry.track)"
            @click.native.stop
        >
          <button type="button" class="rowAddBtn" title="更多" aria-label="更多操作">
            <BaseIcon name="more" :size="14"/>
          </button>
          <el-dropdown-menu slot="dropdown">
            <el-dropdown-item command="blockSong">屏蔽这首歌</el-dropdown-item>
            <el-dropdown-item command="blockArtist" :disabled="!primaryArtist(entry.track)">屏蔽这位歌手</el-dropdown-item>
          </el-dropdown-menu>
        </el-dropdown>
      </div>
      <!-- 行操作：由调用方通过作用域插槽提供（如歌单详情的删歌/排序）。
           TracksLayout 是全站共用的展示组件，这里只留位置，不放业务逻辑。
           注意 index 传的是**原始索引**：歌单管理用 moveTrack(index) 直接操作源数组，
           传可见索引会在有屏蔽行时删错歌。 -->
      <div v-if="showActions" class="trackActions" @click.stop>
        <slot name="actions" :track="entry.track" :index="entry.srcIndex"/>
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
    },
    /**
     * 被屏蔽曲目的处理方式：
     *  - hide（默认）：直接不渲染，配一条"已屏蔽 N 首"提示。歌单/专辑/每日推荐/首页用这个
     *  - mark：照常渲染但压暗 + 打「已屏蔽」角标，点了会问要不要解除。搜索页用这个
     *  - none：完全不过滤（管理模式必须用这个，否则 index 错位会删错歌）
     */
    blockedMode: {
      type: String,
      default: 'hide'
    },
    /**
     * 是否展示「原唱 / 翻唱」角标。
     * 默认 false：TracksLayout 全站复用，只有搜索单曲页需要这套标注，
     * 避免歌单/专辑/每日推荐等页面无端多出角标。
     */
    showOriginTags: {
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
    /** 管理模式下强制不过滤：上移/下移/删除都按源数组索引操作 */
    effectiveBlockedMode() {
      return this.showActions ? 'none' : this.blockedMode
    },
    /**
     * 渲染用的条目：track + 源数组索引。
     * 之所以不直接过滤成 track 数组，是因为 actions 插槽要拿原始 index。
     */
    visibleEntries() {
      const src = this.list || []
      const entries = src.map((track, srcIndex) => ({ track, srcIndex }))
      if (this.effectiveBlockedMode !== 'hide') return entries
      return entries.filter(e => !this.isBlocked(e.track))
    },
    visibleTracks() {
      return this.visibleEntries.map(e => e.track)
    },
    /** 被屏蔽的条数（hide 模式给提示条用；mark/none 不提示） */
    blockedCount() {
      if (this.effectiveBlockedMode !== 'hide') return 0
      return (this.list || []).filter(t => this.isBlocked(t)).length
    },
    hasExtra() {
      return this.showReason || this.visibleTracks.some(t => t.recordPlayCount != null || t.fileSize != null)
    },
    extraLabel() {
      if (this.showReason) return '推荐理由'
      return this.visibleTracks.some(t => t.recordPlayCount != null) ? '播放次数' : '文件大小'
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
    /** 这一行是否被屏蔽（mark 模式打角标、hide 模式过滤都用它） */
    isBlocked(t) {
      if (this.effectiveBlockedMode === 'none') return false
      return !!this.$store.getters['BlockAbout/isTrackBlocked'](t)
    },
    /** 3003 注入的原唱，或接口原生返回的原唱 */
    isOriginal(t) {
      return !!(t && (t._acOrigin || Number(t.originCoverType) === 1))
    },
    /** 翻唱：originCoverType 2/3，或带 originSongSimpleData 的同曲版本 */
    isCover(t) {
      if (!t || this.isOriginal(t)) return false
      return Number(t.originCoverType) === 2
          || Number(t.originCoverType) === 3
          || !!t.originSongSimpleData
    },
    /** 第一个带 id 的歌手：屏蔽歌手必须用真实 id，缺 id 的（恢复队列里的旧存档）不给入口 */
    primaryArtist(t) {
      const arr = this.artistList(t)
      return arr.find(a => a && a.id != null) || null
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
      // mark 模式下点了已屏蔽的歌：先问要不要解除，别让它静默不响
      if (this.isBlocked(song)) {
        this.$confirmBox({
          title: '这首歌已被屏蔽',
          message: `《${song.name || '未知'}》在你的音乐黑名单里，解除后才会播放。`,
          confirmText: '解除并播放',
          cancelText: '取消'
        }).then(() => {
          return this.$store.dispatch('BlockAbout/unblockSong', song.id).then(() => {
            this.$toast.success('已解除屏蔽')
            this.$bus.$emit('songClk', song)
          })
        }).catch(() => { /* 取消或接口失败，保持原样 */ })
        return
      }
      // 单击播放（原为 dblclick：与全站卡片单击跳转的习惯相反，新用户发现不了）
      this.$bus.$emit('songClk', song)
    },
    arClk(id) {
      this.$bus.$emit('arClk', id)
    },
    alClk(id) {
      this.$bus.$emit('alClk', id)
    },
    /** 行内「更多」菜单：目前只有两个屏蔽动作，后续要加复制链接之类直接在这里扩 */
    onRowCommand(cmd, track) {
      if (cmd === 'blockSong') {
        this.confirmBlockSong(track)
      } else if (cmd === 'blockArtist') {
        const artist = this.primaryArtist(track)
        if (artist) this.confirmBlockArtist(artist)
      }
    },
    confirmBlockSong(track) {
      this.$confirmBox({
        title: '屏蔽这首歌',
        message: `《${track.name || '未知'}》将从所有列表隐藏，播放时自动跳过，官方客户端同样生效。可在「音乐黑名单」中恢复。`,
        confirmText: '屏蔽',
        cancelText: '取消'
      }).then(() => {
        this.$store.dispatch('BlockAbout/blockSong', track)
            .then(() => {
              this.$toast.success('已屏蔽，可在「音乐黑名单」中恢复')
            })
            .catch(() => this.$toast.error('屏蔽失败，请稍后重试'))
      }).catch(() => { /* 取消 */ })
    },
    confirmBlockArtist(artist) {
      this.$confirmBox({
        title: '屏蔽这位歌手',
        message: `「${artist.name}」的所有歌曲（含合唱）都将隐藏，播放时自动跳过。可在「音乐黑名单」中恢复。`,
        confirmText: '屏蔽',
        cancelText: '取消'
      }).then(() => {
        this.$store.dispatch('BlockAbout/blockArtist', artist)
            .then(() => {
              this.$toast.success('已屏蔽该歌手')
            })
            .catch(() => this.$toast.error('屏蔽失败，请稍后重试'))
      }).catch(() => { /* 取消 */ })
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
      if (!this.visibleTracks.length) return
      if (this.queueAddBlocked) {
        this.$toast.info(this.queueAddTitle)
        return
      }
      // 声音（电台节目）搜索页也复用这个列表，它们没有音乐音源，不能进队列
      const valid = this.visibleTracks.filter(t => t && !t.isVoice && t.id != null)
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
    /** 外部（歌单页/日推页的"播放全部"）调用：只播可见的，跳过被屏蔽的 */
    playVisible() {
      if (!this.visibleTracks.length) return
      this.playAllTracks(this.visibleTracks)
    },
    ...mapActions('TracksAbout', {playAllTracks: 'playAllTracks'})
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/tracksLayout";

// 行内快捷操作（加入播放列表 / 加入歌单 / 更多）：hover 才出现，避免日常浏览时干扰。
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

// 已屏蔽提示条：告诉用户"少了 N 首"不是 bug，并给管理入口
.tracksBlockedHint {
  display: flex;
  align-items: center;
  gap: .35rem;
  padding: .3rem .1rem .55rem;
  font-size: 12px;
  color: var(--c-text-secondary);

  .hintLink {
    color: var(--c-accent);
    text-decoration: none;

    &:hover { text-decoration: underline; }
  }
}

// mark 模式（搜索结果）：整行压暗，但仍可交互——点播放会问要不要解除
.tracks.is-blocked {
  .name,
  .artist,
  .col-album,
  .col-duration {
    opacity: .45;
  }
}

.blockedTag {
  flex-shrink: 0;
  padding: 0 .28rem;
  border-radius: 4px;
  font-size: 10px;
  line-height: 16px;
  color: var(--c-text-secondary);
  background: var(--c-bg-sunken, rgba(127, 127, 127, .12));
  border: 1px solid var(--c-border, rgba(127, 127, 127, .25));
}

// 搜索单曲的「原唱 / 翻唱」角标：与 blockedTag 同尺寸，不抢歌名
.originTag,
.coverTag {
  flex-shrink: 0;
  padding: 0 .28rem;
  border-radius: 4px;
  font-size: 10px;
  line-height: 16px;
  border: 1px solid var(--c-border, rgba(127, 127, 127, .25));
}

.originTag {
  color: var(--c-accent);
  border-color: currentColor;
}

.coverTag {
  color: var(--c-text-secondary);
}
</style>
