<template>
  <div ref="scroller" class="songInfoScroll">
    <!-- 骨架：三块卡片的形状，避免切歌时右栏突然空白 -->
    <div v-if="loading" class="siSkeleton" aria-hidden="true">
      <span v-for="n in 8" :key="n" class="siSkLine" :style="{ width: (96 - n * 8) + '%' }"></span>
    </div>

    <div v-else-if="!info || !info.hasData" class="siEmpty">
      <p>暂无歌曲资料</p>
      <p class="siEmptyHint">{{ error ? '资料加载失败，稍后再试' : '这首歌还没有人补充百科' }}</p>
    </div>

    <template v-else>
      <p v-if="info.subtitle" class="siSubtitle">{{ info.subtitle }}</p>

      <section v-if="hasBasics" class="siCard">
        <h3 class="siCardTitle">基本信息</h3>

        <dl v-if="info.facts.length" class="siFacts">
          <div v-for="fact in info.facts" :key="fact.label" class="siFact">
            <dt>{{ fact.label }}</dt>
            <dd>{{ fact.value }}</dd>
          </div>
        </dl>

        <div v-if="info.credits.length" class="siCredits">
          <div v-for="credit in info.credits" :key="credit.role" class="siCreditRow">
            <span class="siLabel">{{ credit.role }}</span>
            <span class="siCreditNames">
              <button
                  v-for="artist in credit.artists"
                  :key="credit.role + '-' + artist.id + '-' + artist.name"
                  type="button"
                  class="siCreditName"
                  :title="'查看歌手 ' + artist.name"
                  @click="artistClk(artist)"
              >{{ artist.name }}</button>
            </span>
          </div>
        </div>

        <div v-if="info.styles.length || info.moods.length" class="siTags">
          <span v-for="tag in info.styles" :key="'style-' + tag" class="siTag siTag--style">{{ tag }}</span>
          <span v-for="tag in info.moods" :key="'mood-' + tag" class="siTag">{{ tag }}</span>
        </div>
      </section>

      <!-- 官方 MV：这首歌「有什么可看的」也是资料的一部分，和背景故事同级 -->
      <section v-if="mv" class="siCard">
        <h3 class="siCardTitle">MV</h3>
        <button type="button" class="siMv" :title="'播放《' + mv.name + '》的 MV'" @click="playMv">
          <span class="siMvCover">
            <img v-if="mv.cover" :src="mv.cover | https" alt="">
            <BaseIcon v-else name="mv" :size="18"/>
          </span>
          <span class="siMvMain">
            <span class="siMvName">{{ mv.name }}</span>
            <span class="siMvSub">{{ mvMeta }}</span>
          </span>
          <span class="siMvGo"><BaseIcon name="play" :size="11"/></span>
        </button>
      </section>

      <!-- 背景故事：目前唯一能给成段长文的来源是专辑介绍（专辑级，同专辑歌曲共享） -->
      <section v-if="info.album" class="siCard">
        <h3 class="siCardTitle">背景故事</h3>
        <p class="siCardSub">专辑《{{ info.album.name }}》介绍</p>
        <p ref="desc" class="siDesc" :class="{ 'is-open': descOpen }">{{ info.album.desc }}</p>
        <div class="siCardFoot">
          <button v-if="descOverflow" type="button" class="siLinkBtn" @click="toggleDesc">{{ descOpen ? '收起' : '展开全文' }}</button>
          <button v-if="info.album.id" type="button" class="siLinkBtn" @click="albumClk">查看专辑</button>
        </div>
      </section>

      <section v-if="info.review" class="siCard siCard--quote">
        <h3 class="siCardTitle">乐评</h3>
        <blockquote class="siQuote">{{ info.review.text }}</blockquote>
        <p v-if="info.review.author" class="siQuoteBy">— {{ info.review.author }}</p>
      </section>

      <section v-if="info.honors.length || info.entertainment.length" class="siCard">
        <h3 class="siCardTitle">收录与获奖</h3>
        <ul v-if="info.honors.length" class="siList">
          <li v-for="(honor, idx) in info.honors" :key="'honor-' + idx">
            <span class="siListMain">{{ honor.award }}</span>
            <span v-if="honor.work" class="siListSub">{{ honor.work }}</span>
          </li>
        </ul>
        <div v-if="info.entertainment.length" class="siTags siTags--ent">
          <span v-for="item in info.entertainment" :key="'ent-' + item" class="siTag">{{ item }}</span>
        </div>
      </section>
    </template>
  </div>
</template>

<script>
import * as tracksApi from "@/api/Tracks"
import * as albumApi from "@/api/Album"
import * as mvApi from "@/api/Mv"
import { buildSongInfo } from "@/utils/songInfo"
import { formatCount, format_s } from "@/utils/filters"
import { mvIdOf, markMvDead, ensureMvId } from "@/utils/songMv"

/**
 * SongInfoPanel —— 播放详情页右栏「歌曲信息」
 *
 * 数据是三条接口拼的（见 utils/songInfo.js 顶部说明）：
 *   /ugc/song/get + /song/wiki/summary + /album
 *
 * 两个刻意的设计：
 * 1. **懒加载**：右栏四个 tab 都用 v-show 常驻，若在 mounted 就请求，切歌一次会白打三个请求；
 *    这里只有 active（当前 tab 是「歌曲信息」）且歌变了才发。切回歌词不销毁，避免来回切重复请求。
 * 2. **序号守卫**：快速连点下一首时，旧歌的响应可能后到；reqSeq 比对失败直接丢弃。
 */
export default {
  name: "SongInfoPanel",
  props: {
    song: { type: Object, required: true },
    // 当前 tab 是否停在「歌曲信息」，false 时不请求
    active: { type: Boolean, default: false }
  },
  data() {
    return {
      loading: false,
      error: false,
      info: null,
      // 官方 MV（/mv/detail 拉回来的一小块摘要），没有就不渲染这张卡
      mv: null,
      // 已加载完成的歌曲 id，避免同一首歌重复请求
      loadedId: 0,
      // 请求序号：只认最后一次请求的响应
      reqSeq: 0,
      descOpen: false,
      // 专辑介绍超过折叠高度时才给「展开全文」
      descOverflow: false
    }
  },
  computed: {
    songId() {
      return (this.song && this.song.id) || 0
    },
    hasBasics() {
      const info = this.info
      return !!(info && (info.facts.length || info.credits.length || info.styles.length || info.moods.length))
    },
    mvMeta() {
      const m = this.mv
      if (!m) return ''
      const parts = []
      if (m.playCount) parts.push(formatCount(m.playCount) + ' 次播放')
      if (m.duration) parts.push(format_s(m.duration))
      return parts.join(' · ')
    }
  },
  watch: {
    active(val) {
      if (!val) return
      this.ensureLoaded()
      // 回到这个 tab 时补量一次：隐藏期间量不出真实高度
      this.$nextTick(this.measureDesc)
    },
    songId() {
      this.descOpen = false
      this.descOverflow = false
      this.ensureLoaded()
    }
  },
  methods: {
    ensureLoaded() {
      if (!this.active) return
      const id = this.songId
      if (!id || id === this.loadedId) return
      this.load(id)
    },
    load(id) {
      const seq = ++this.reqSeq
      this.loading = true
      this.error = false
      this.info = null
      this.mv = null

      const albumId = (this.song.al && this.song.al.id) || (this.song.album && this.song.album.id) || 0

      // MV 摘要单独一路：没有 MV 的歌曲完全不发这个请求
      const mvId = mvIdOf(this.song)
      if (mvId) this.loadMv(mvId, seq)
      else ensureMvId(this.song).then(id => { if (id && seq === this.reqSeq) this.loadMv(id, seq) })

      // 三路并发、各自兜底：百科没收录是常态，一路失败不该把整页变空白
      let failed = 0
      const guard = promise => promise.catch(err => {
        // 有 response 说明接口答复了（404 = 这首歌确实没收录），只有连不上才算真失败
        if (!(err && err.response)) failed++
        return null
      })

      Promise.all([
        guard(tracksApi.songWikiMeta(id).then(res => (res && res.data && res.data.data) || null)),
        guard(tracksApi.songWikiSummary(id).then(res => (res && res.data && res.data.data) || null)),
        albumId
            ? guard(albumApi.getDetail(albumId).then(res => (res && res.data && res.data.album) || null))
            : Promise.resolve(null)
      ]).then(([ugc, wiki, album]) => {
        if (seq !== this.reqSeq) return
        this.info = buildSongInfo({ ugc, wiki, album })
        // 全部空且有一路连不上，多半是网络问题；否则是上游没收录
        this.error = failed > 0
        this.loadedId = id
        this.loading = false
        // 换歌后回到顶部，否则会停在上一首滚到的位置
        if (this.$refs.scroller) this.$refs.scroller.scrollTop = 0
        this.$nextTick(this.measureDesc)
      }).catch(() => {
        if (seq !== this.reqSeq) return
        this.loading = false
        this.error = true
      })
    },
    /**
     * MV 摘要。上游对下架 MV 回的是 HTTP 200 + {code:404}，所以判的是 data 里有没有 name。
     * 判到失效就记负缓存：列表徽标 / 播放条角标会同步消失，不用等这一页重开。
     */
    loadMv(id, seq) {
      mvApi.detail(id).then(res => {
        if (seq !== this.reqSeq) return
        const d = res && res.data && res.data.data
        if (!d || !d.name) { markMvDead(id); return }
        this.mv = {
          id,
          name: d.name,
          cover: d.cover || '',
          playCount: d.playCount || 0,
          duration: d.duration || 0
        }
      }).catch(err => {
        // 网络问题：这张卡不出现，但不写负缓存；HTTP 404 才是真的下架
        if (seq !== this.reqSeq) return
        if (err && err.response && err.response.status === 404) markMvDead(id)
      })
    },
    playMv() {
      if (!this.mv) return
      // 同「查看专辑」：先收全屏播放器，否则遮罩会盖住 MV 页
      this.$emit('close-player')
      this.$bus.$emit('mvClk', this.mv.id)
    },
    /** 折叠态量一次高度，判断要不要出「展开全文」 */
    measureDesc() {
      const el = this.$refs.desc
      if (!el || this.descOpen) return
      // 面板被 v-show 收起时高度是 0，此时量出来的「没溢出」是假的，别采信
      if (el.offsetParent === null) return
      this.descOverflow = el.scrollHeight > el.clientHeight + 2
    },
    toggleDesc() {
      this.descOpen = !this.descOpen
      if (!this.descOpen) this.$nextTick(this.measureDesc)
    },
    artistClk(artist) {
      // id 可能为 0（歌手词条缺失），App 侧会按名字反查
      this.$bus.$emit('arClk', artist.id, artist.name)
    },
    /**
     * 查看专辑：先收播放器再跳转。
     *
     * 不能只靠 MusicPlayer 的 `$route` watcher —— 已经在目标专辑页时，`router.push` 到同一地址
     * 会被路由去重（不产生路由变化），watcher 不触发，全屏播放器就会一直盖在专辑页上。
     * 专辑 id 有值才渲染这个按钮，所以这里可以放心先收再跳。
     */
    albumClk() {
      if (!this.info || !this.info.album || !this.info.album.id) return
      this.$emit('close-player')
      this.$bus.$emit('alClk', this.info.album.id)
    },
    onResize() { this.measureDesc() }
  },
  mounted() {
    this.ensureLoaded()
    window.addEventListener('resize', this.onResize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.onResize)
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/scss/base/variables";
@import "../../assets/scss/base/motion";

// 根容器接管右栏的剩余高度，内部自己滚（父级 .tabPanel 是 overflow:hidden）
.songInfoScroll {
  height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 2px $sp-5;
  box-sizing: border-box;
  // 内容还在下面时底部淡出一点，和歌词面板的裁切语言保持一致（不是纯硬切）
  mask-image: linear-gradient(to bottom, #000 calc(100% - 16px), transparent 100%);
  -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 16px), transparent 100%);

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 2px; }
}

.siSubtitle {
  font-size: $fs-body;
  line-height: 1.6;
  color: $player-text-primary;
  margin: 0 0 $sp-3;
  padding-left: $sp-3;
  border-left: 2px solid $player-accent;
}

.siCard {
  background: $player-surface;
  border: 1px solid $player-border;
  border-radius: $player-radius-md;
  padding: $sp-4;
  margin-bottom: $sp-3;

  &:last-child { margin-bottom: 0; }
}

.siCardTitle {
  font-size: $fs-card-title;
  font-weight: 600;
  color: $player-text-primary;
  margin: 0 0 $sp-3;
}

.siCardSub {
  font-size: $fs-aux;
  color: $player-text-tertiary;
  margin: -$sp-2 0 $sp-2;
}

.siLabel {
  flex: 0 0 56px;
  font-size: $fs-aux;
  color: $player-text-tertiary;
}

/* ---------- 基本信息 ---------- */
.siFacts {
  margin: 0 0 $sp-2;
  display: grid;
  gap: 6px;

  .siFact {
    display: flex;
    align-items: baseline;
    gap: $sp-2;
    font-size: $fs-card-title;
    line-height: 1.5;
  }

  dt { flex: 0 0 56px; color: $player-text-tertiary; font-size: $fs-aux; }
  dd { margin: 0; color: $player-text-secondary; word-break: break-word; }
}

.siCredits {
  display: grid;
  gap: 6px;

  .siCreditRow { display: flex; align-items: baseline; gap: $sp-2; }
}

.siCreditNames { display: flex; flex-wrap: wrap; gap: 2px 6px; }

// 词曲编曲的歌手名：看起来像文字，hover 才提示可点
.siCreditName {
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: $fs-card-title;
  color: $player-text-secondary;
  cursor: pointer;
  transition: color $motion-fast $ease-standard;

  &:hover { color: $player-accent; }
  &:focus-visible { outline: 1px solid $player-accent; outline-offset: 2px; }
}

/* ---------- 标签 ---------- */
.siTags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: $sp-3;
}

.siTag {
  padding: 2px $sp-2;
  border-radius: $radius-pill;
  background: rgba(255, 255, 255, 0.06);
  font-size: $fs-aux;
  line-height: 1.6;
  color: $player-text-secondary;
}

.siTag--style {
  background: var(--player-menu-soft);
  color: $player-text-primary;
}

/* ---------- MV ---------- */
.siMv {
  display: flex;
  align-items: center;
  gap: $sp-3;
  width: 100%;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  text-align: left;
  cursor: pointer;

  &:hover .siMvName { color: $player-accent; }
  &:focus-visible { outline: 1px solid $player-accent; outline-offset: 2px; }
}

.siMvCover {
  flex: 0 0 56px;
  width: 56px;
  height: 36px;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $player-text-tertiary;
  background: rgba(255, 255, 255, 0.06);

  img { width: 100%; height: 100%; object-fit: cover; display: block; }
}

.siMvMain {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.siMvName {
  font-size: $fs-card-title;
  color: $player-text-secondary;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color $motion-fast $ease-standard;
}

.siMvSub {
  font-size: $fs-aux;
  color: $player-text-tertiary;
}

.siMvGo {
  flex: 0 0 auto;
  color: $player-text-tertiary;
}

/* ---------- 背景故事 ---------- */
.siDesc {
  margin: 0;
  // 上游介绍是多行纯文本，换行要保留
  white-space: pre-line;
  font-size: $fs-body;
  line-height: 1.85;
  color: $player-text-secondary;
  max-height: 10.6em;
  overflow: hidden;

  &.is-open { max-height: none; }
}

.siCardFoot {
  display: flex;
  gap: $sp-4;
  margin-top: $sp-3;
}

.siLinkBtn {
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: $fs-aux;
  color: $player-accent;
  cursor: pointer;

  &:hover { text-decoration: underline; }
  &:focus-visible { outline: 1px solid $player-accent; outline-offset: 2px; }
}

/* ---------- 乐评 ---------- */
.siCard--quote { padding-bottom: $sp-3; }

.siQuote {
  margin: 0;
  padding-left: $sp-3;
  border-left: 2px solid $player-border;
  font-size: $fs-body;
  line-height: 1.85;
  color: $player-text-secondary;
  white-space: pre-line;
}

.siQuoteBy {
  margin: $sp-2 0 0;
  font-size: $fs-aux;
  color: $player-text-tertiary;
  text-align: right;
}

/* ---------- 收录与获奖 ---------- */
.siList {
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    flex-wrap: wrap;
    gap: 4px $sp-2;
    font-size: $fs-card-title;
    line-height: 1.6;
    padding: 4px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);

    &:last-child { border-bottom: none; }
  }

  .siListMain { color: $player-text-secondary; }
  .siListSub { color: $player-text-tertiary; font-size: $fs-aux; }
}

.siTags--ent { margin-top: $sp-2; }

/* ---------- 空态 / 骨架 ---------- */
.siEmpty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  height: 100%;
  color: $player-text-secondary;

  p { margin: 0; font-size: $fs-body; }
}

.siEmptyHint {
  margin-top: 6px !important;
  font-size: $fs-aux !important;
  color: $player-text-tertiary;
}

.siSkeleton {
  display: grid;
  gap: $sp-2;
  padding: $sp-4;
  border: 1px solid $player-border;
  border-radius: $player-radius-md;
}

.siSkLine {
  height: 12px;
  border-radius: $radius-pill;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.1) 50%, rgba(255, 255, 255, 0.04) 75%);
  background-size: 200% 100%;
  animation: songInfoShimmer $shimmer-duration infinite;
}

@keyframes songInfoShimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

// 单列布局下右栏会铺到屏幕底部，「查看评论」悬浮按钮压在上面，
// 底部留出按钮的高度，滚到底时最后一块卡片不会被挡住
@media (max-width: 900px) {
  .songInfoScroll { padding-bottom: 76px; }
}
</style>
