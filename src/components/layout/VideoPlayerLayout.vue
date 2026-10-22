<template>
  <div class="video-page">
    <div v-if="dt_name" class="video-body">
      <div class="video-main">
        <!-- 标题与基础信息置于播放器上方 -->
        <section class="video-head" ref="videoHead">
          <h1 class="video-title">{{ dt_name }}</h1>
          <div class="video-sub-row">
            <span class="video-author" v-if="authorText" title="查看主页" @click="goAuthor">
              <img v-if="authorAvatar" :src="authorAvatar | https" class="author-avatar" alt="">
              <span class="author-name">{{ authorText }}</span>
            </span>
            <span class="video-duration" v-if="durationText">时长 {{ durationText }}</span>
            <span class="video-publish" v-if="detail.publishTime">发布于 {{ detail.publishTime | formatMs("YYYY-MM-DD") }}</span>
          </div>
          <p v-if="descText" class="video-desc" :title="descText">{{ descText }}</p>
        </section>

        <div v-if="urlFailed" class="video-error">
          <i class="el-icon-warning-outline"></i>
          <p>该视频暂无可用播放源</p>
          <span>接口未返回播放地址（可能是付费内容或已下架），你仍然可以浏览下方评论与相关推荐</span>
        </div>
        <template v-else-if="url && dt_cover">
          <section class="video-player-section" ref="playerSection" :style="playerBgStyle">
            <vidPlayer :poster="dt_cover" :url="url"/>
            <!-- 隐藏 img：触发封面主色提取，@load 在封面加载完时触发 onCoverLoad -->
            <img :src="dt_cover | https" alt="" crossorigin="anonymous" @load="onCoverLoad" class="cover-color-source">
          </section>

        </template>
        <div v-else-if="!url && !urlFailed" class="skel-player skeleton-item video-skel"></div>

        <!-- 统计与标签不依赖播放地址，无播放源时也要能看/能点 -->
        <section class="video-info-section" v-if="dt_cover">
          <div class="video-stats">
            <span v-for="s in videoStats" :key="s.label" class="stat"
                  :class="{ 'stat--clickable': s.clickable }" @click="onStatClick(s)">
              <i :class="s.icon"></i>
              <b>{{ s.value | div1w(s.value) }}</b>
              <em>{{ s.label }}</em>
            </span>
          </div>
          <div v-if="detail.videoGroup && detail.videoGroup.length" class="video-tags">
            <span v-for="t in detail.videoGroup" :key="t.id" class="video-tag" title="查看该标签下的视频" @click="goTag(t)">#{{ t.name }}</span>
          </div>
        </section>
      </div>

      <!-- 相关推荐：有数据或仍在请求时都占位，避免列表出来后播放区被挤窄 -->
      <aside v-if="simiVideo.length || simiLoading" class="simi-sidebar" :style="sidebarStyle">
        <h2 class="simi-title">{{ simiFallback ? '为你推荐' : '相关推荐' }}</h2>
        <div class="simi-list">
          <template v-if="simiLoading && !simiVideo.length">
            <div v-for="n in 6" :key="'sk' + n" class="simi-item simi-item--skeleton">
              <div class="simi-cover skeleton-item"></div>
              <div class="simi-info">
                <div class="skel-line skeleton-item"></div>
                <div class="skel-line skel-line--short skeleton-item"></div>
              </div>
            </div>
          </template>
          <div v-for="v in simiVideo" :key="v[si_id]" class="simi-item" @click="simiClickEvt(v[si_id])">
            <div class="simi-cover"><cover-image :src="v[si_cover]" :alt="v[si_name] + '的封面'"/></div>
            <div class="simi-info">
              <div class="simi-name" :title="v[si_name]">{{ v[si_name] }}</div>
              <div class="simi-artist" v-if="typeof v[si_arName] === 'string' && v[si_arName]">{{ v[si_arName] }}</div>
              <div class="simi-artist" v-else-if="Array.isArray(v[si_arName]) && v[si_arName].length">
                <span v-for="n in v[si_arName]" :key="n.userId">{{ n.userName }} </span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>

    <!-- 评论区占满整页宽度（在两栏布局之外） -->
    <section class="comment-section" v-if="dt_name">
      <CommentLayout :key="commentKey" :id="id" :type="commentType" :hide-load-more-when-empty="true"/>
    </section>

    <div v-if="!dt_name" class="video-loading">
      <div class="skel-player skeleton-item"></div>
      <div class="skel-line skel-line--long skeleton-item"></div>
      <div class="skel-line skel-line--short skeleton-item"></div>
    </div>

    <!-- 写评论入口改到信息区的"评论"统计项上，用本页自有的弹窗（不动评论组件） -->
    <el-dialog title="发表评论" :visible.sync="showWriteModal" width="520px" append-to-body custom-class="vp-comment-dialog">
      <div class="vp-send-wrap">
        <SendComment v-if="showWriteModal" :sid="id" :stype="commentType" :type="1"
                     @cancel="showWriteModal = false" @updateNewestComment="onCommentSent"/>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import vidPlayer from "@/components/vidPlayer";
import CommentLayout from "@/components/layout/CommentLayout";
import SendComment from "@/components/SendComment";
import CoverImage from "@/components/common/CoverImage";
import { extractColors } from "@/utils/colorExtractor";

export default {
  name: "VideoPlayerLayout",
  components: {vidPlayer, CommentLayout, SendComment, CoverImage},
  props: {
    url: { type: String, required: true },
    detail: { type: Object, required: true },
    simiVideo: { type: Array, required: true },
    simiClickEvt: { type: Function, required: true },
    // 相关推荐是否在请求中（父页面传入，用于占位）
    simiLoading: { type: Boolean, default: false },
    // 相关视频搜不到、侧栏退化成推荐流时为 true。只影响标题文案，不涉及任何样式
    simiFallback: { type: Boolean, default: false },
    // 播放地址取不到（上游返回 null/取流失败）：不再卡在骨架屏，给出明确提示
    urlFailed: { type: Boolean, default: false },
    id: { required: true },
    nameConfig: {
      type: Object,
      default() {
        return {
          dt:{cover:"cover",name:"name",artistName:"artistName",playCount:"playCount"},
          si:{id:"id",cover:"cover",name:"name",artistName:"artistName",playCount:"playCount"}
        }
      }
    }
  },
  computed: {
    dt_name() { return this.detail[this.nameConfig.dt.name] },
    dt_cover() { return this.detail[this.nameConfig.dt.cover] },
    dt_arName() { return this.detail[this.nameConfig.dt.artistName] },
    dt_playCt() { return this.detail[this.nameConfig.dt.playCount] },
    si_id() { return this.nameConfig.si.id },
    si_cover() { return this.nameConfig.si.cover },
    si_name() { return this.nameConfig.si.name },
    si_arName() { return this.nameConfig.si.artistName },
    si_playCt() { return this.nameConfig.si.playCount },
    /**
     * 评论资源类型：1 = MV，5 = 视频
     * ⚠️ id 来自路由 query 是字符串，Number.isInteger('5604136') 为 false，
     *    原实现因此把 MV 当成视频(type=5) 去取评论 → 实测 type=1 有 7376 条、type=5 为 0
     */
    commentType() {
      return /^\d+$/.test(String(this.id)) ? "1" : "5"
    },
    /** 作者名：视频是 creator.nickname，MV 是 artistName 字符串 */
    authorText() {
      const a = this.dt_arName
      if (a == null) return ""
      if (typeof a === "string") return a
      return a.nickname != null ? a.nickname : (a.userName || "")
    },
    /** 作者头像：视频 creator.avatarUrl / MV artists[0].img1v1Url */
    authorAvatar() {
      const d = this.detail || {}
      if (d.creator && d.creator.avatarUrl) return d.creator.avatarUrl
      if (d.artists && d.artists[0] && d.artists[0].img1v1Url) return d.artists[0].img1v1Url
      return ""
    },
    /** 简介：视频 description / MV desc */
    descText() {
      const t = this.detail.description || this.detail.desc || ""
      return String(t).trim()
    },
    /** 视频是 durationms，MV 是 duration（毫秒） */
    durationText() {
      const ms = this.detail.durationms != null ? this.detail.durationms : this.detail.duration
      return (ms != null && ms > 0) ? this.$options.filters.formatDuration(ms) : ""
    },
    /**
     * 统计条目：视频与 MV 字段名不同（点赞 praisedCount vs 收藏 subCount），
     * 取不到的字段直接不渲染，避免出现假 0
     */
    videoStats() {
      const d = this.detail || {}
      return [
        { icon: "el-icon-video-play", label: "播放", value: this.dt_playCt },
        { icon: "el-icon-thumb", label: "点赞", value: d.praisedCount },
        { icon: "el-icon-star-off", label: "收藏", value: d.subCount },
        { icon: "el-icon-chat-dot-square", label: "评论", value: d.commentCount, clickable: true },
        { icon: "el-icon-share", label: "分享", value: d.shareCount }
      ].filter(s => s.value != null)
    },
    /** 侧栏与播放器顶部对齐（下移标题区高度）+ 与播放窗口等高 */
    sidebarStyle() {
      return {
        "--simi-top": `${this.headH || 0}px`,
        "--simi-max-h": `${this.playerH || 560}px`
      }
    }
  },
  data() {
    return {
      // 视频容器左右两侧背景色（从封面主色动态提取）
      playerBgStyle: '',
      // 标题区/播放器实时高度 → 侧栏对齐与限高
      headH: 0,
      playerH: 0,
      showWriteModal: false,
      // 评论发送后递增，强制评论区重载
      commentKey: 0
    }
  },
  methods: {
    /** 作者可点：视频 → 用户主页(userDetail?uid=)，MV → 歌手页(artistDetail?id=) */
    goAuthor() {
      const d = this.detail || {}
      if (d.creator && d.creator.userId) {
        this.$router.push({ name: "userDetail", query: { uid: d.creator.userId } })
        return
      }
      const a = (d.artists && d.artists[0]) || null
      if (a && a.id) {
        this.$router.push({ name: "artistDetail", query: { id: a.id } })
      }
    },
    /** 标签可点：跳视频列表页并自动选中该标签 */
    goTag(t) {
      this.$router.push({ path: "/explore/videoList", query: { tag: t.name } })
    },
    /** 统计项点击：目前只有"评论"可点，打开写评论弹窗 */
    onStatClick(s) {
      if (s.clickable) this.showWriteModal = true
    },
    onCommentSent() {
      this.showWriteModal = false
      // 重建评论区，拉取最新评论
      this.commentKey++
    },
    /**
     * 从视频封面提取主色，构建播放器容器左右两侧的渐变
     * ⚠️ NetEase 封面图不返回 CORS 头，提取失败时 fallback 到 #1a1a2e（同 MusicPlayer）
     */
    onCoverLoad(img) {
      if (!img || !img.complete) {
        this.playerBgStyle = 'background: #1a1a2e'
        return
      }
      const colors = extractColors(img)
      if (!colors.length) {
        this.playerBgStyle = 'background: #1a1a2e'
        return
      }
      const [r, g, b] = colors[0]
      const main = `rgb(${r},${g},${b})`
      this.playerBgStyle = `background: linear-gradient(to right, ${main} 0%, #000 35%, #000 65%, ${main} 100%)`
    },
    /** 监听标题区与播放器尺寸，驱动侧栏对齐与限高 */
    observeLayout() {
      const head = this.$refs.videoHead
      if (!head || this._ro) return
      const measure = () => {
        this.headH = head.offsetHeight
        if (this.$refs.playerSection) this.playerH = this.$refs.playerSection.offsetHeight
      }
      measure()
      if (typeof ResizeObserver === "undefined") {
        window.addEventListener("resize", measure)
        this._measure = measure
        return
      }
      this._ro = new ResizeObserver(measure)
      this._ro.observe(head)
      if (this.$refs.playerSection) this._ro.observe(this.$refs.playerSection)
    }
  },
  updated() {
    this.observeLayout()
  },
  beforeDestroy() {
    if (this._ro) { this._ro.disconnect(); this._ro = null }
    if (this._measure) { window.removeEventListener("resize", this._measure); this._measure = null }
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/base/variables";

.video-page {
  max-width: 1100px; margin: 0 auto; padding: 0 0 120px;
}

/* 左（播放器+信息+评论）右（相关推荐）两栏 */
.video-body {
  display: flex; gap: 24px; align-items: flex-start;
}

.video-main {
  flex: 1; min-width: 0;
}

/* 播放器上方：标题 + 基础信息 */
.video-head {
  padding: 4px 0 16px;
  .video-title { font-size: 24px; font-weight: 700; color: $font-black; margin: 0 0 10px; line-height: 1.4; }
}

.video-sub-row {
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
  font-size: 14px; color: $font-black-2;
}

.video-author {
  display: inline-flex; align-items: center; gap: 8px;
  cursor: pointer; padding: 4px 10px 4px 4px; border-radius: 20px;
  transition: background .2s;
  &:hover { background: $color-theme-sec; .author-name { color: $color-main; } }
  .author-avatar {
    width: 26px; height: 26px; border-radius: 50%; object-fit: cover; display: block;
  }
  .author-name { font-weight: 600; color: $font-black; }
}

.video-desc {
  margin: 10px 0 0; font-size: 13px; color: $font-black-2; line-height: 1.6;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  max-width: 760px;
}

.video-player-section {
  width: 100%; aspect-ratio: 16 / 9;
  background: #000; border-radius: 16px; overflow: hidden;
  position: relative;

  ::v-deep .xgplayer-controls,
  ::v-deep .xgplayer-bottom-bar,
  ::v-deep .xgplayer-start { z-index: 100; }

  .cover-color-source {
    position: absolute; width: 1px; height: 1px;
    opacity: 0; pointer-events: none; left: -9999px;
  }
}

.video-skel { margin-top: 16px; }

.video-error {
  width: 100%; aspect-ratio: 16 / 9; max-height: 420px;
  border-radius: 16px; background: #f7f7fa; border: 1px dashed rgba(0,0,0,.12);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; padding: 24px; gap: 6px;
  i { font-size: 36px; color: #c0c4cc; }
  p { margin: 0; font-size: 16px; font-weight: 600; color: $font-black; }
  span { font-size: 13px; color: $font-black-2; max-width: 460px; line-height: 1.6; }
}

.video-info-section {
  padding: 16px 0 8px;
}

.video-stats {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  .stat {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 14px; border-radius: 20px;
    background: $color-theme-sec; font-size: 13px;
    i { font-size: 15px; color: $font-black-2; }
    b { font-weight: 600; color: $font-black; }
    em { font-style: normal; color: $font-black-2; }
  }
  .stat--clickable {
    cursor: pointer; transition: all .2s;
    &:hover { background: $color-main; i, b, em { color: #fff; } }
  }
}

.video-tags {
  display: flex; gap: 8px; flex-wrap: wrap; margin-top: 14px;
  .video-tag {
    padding: 4px 12px; border-radius: 20px; cursor: pointer;
    border: 1px solid rgba(0,0,0,.08); background: #fff;
    font-size: 12px; color: $font-black-2; transition: all .2s;
    &:hover { color: $color-main; border-color: $color-main; }
  }
}

/* 相关推荐侧栏：顶部与播放器对齐，高度不超过播放窗口 */
.simi-sidebar {
  flex: 0 0 320px; width: 320px;
  margin-top: var(--simi-top, 0);
  max-height: var(--simi-max-h, 560px);
  display: flex; flex-direction: column;
  background: #fff; border-radius: 16px;
  padding: 18px 0 6px; box-shadow: 0 4px 16px rgba(0,0,0,.06);

  .simi-title {
    font-size: 16px; font-weight: 700; color: $font-black;
    margin: 0 18px 12px; flex-shrink: 0;
  }
}

.simi-list {
  flex: 1; min-height: 0; overflow-y: auto;
  padding: 0 10px 10px;
  scrollbar-width: thin;
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: rgba(0,0,0,.15); border-radius: 10px; }
  &::-webkit-scrollbar-track { background: transparent; }
}

.simi-item {
  display: flex; gap: 10px; align-items: flex-start;
  padding: 8px; border-radius: 12px;
  cursor: pointer; transition: background .2s;
  &:hover { background: $color-theme-sec; }
  & + .simi-item { margin-top: 4px; }
}

.simi-cover {
  flex: 0 0 128px; width: 128px; height: 72px;
  border-radius: 8px; overflow: hidden;
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
}

/* 加载占位：骨架尺寸与真实卡片一致，避免出现后布局跳动 */
.simi-item--skeleton {
  cursor: default; pointer-events: none;
  &:hover { background: none; }
  .simi-cover { background: rgba(0,0,0,.06); }
  .simi-info { display: flex; flex-direction: column; gap: 8px; padding-top: 4px; }
  .skel-line { height: 12px; border-radius: 6px; width: 100%; }
  .skel-line--short { width: 55%; }
}

.simi-info { flex: 1; min-width: 0; }

.simi-name {
  font-size: 13px; font-weight: 600; color: $font-black; line-height: 1.45;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden;
}

.simi-artist {
  font-size: 12px; color: $font-black-2; margin-top: 4px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.comment-section {
  margin-top: 24px; padding-top: 32px; border-top: 1px solid rgba(0,0,0,.06);

  /* 写评论入口已移到信息区，隐藏评论组件自带的浮动按钮（仅本页） */
  ::v-deep .floating-comment-btn { display: none !important; }

  ::v-deep .comment-container {
    .comment-header-bar h2 { display: none; }
    .hot-comments-section h3, .new-comments-section h3 { color: $font-black-1 !important; }
    .section-divider { background: linear-gradient(to right, rgba(0,0,0,.06), transparent) !important; }
  }
  ::v-deep .comment-content {
    .comment-item { background: $color-theme-sec !important; &:hover { background: darken($color-theme-sec,3%) !important; } }
    .main {
      .name .nickname { color: $font-black-1 !important; &:hover { color: $color-main !important; } }
      .name .time-tag { color: $font-black-2 !important; }
      .content { color: $font-black-1 !important; }
      .time-ribbon .ribbon > span { color: $font-black-2 !important; }
      .comment-delete .el-button { color: $font-black-2 !important; }
    }
  }
}

/* 窄屏：侧栏退回下方，限高滚动 */
@media (max-width: 900px) {
  .video-body { flex-direction: column; }
  .simi-sidebar {
    flex: none; width: 100%;
    margin-top: 16px;
    max-height: 420px;
  }
}

.video-loading {
  max-width: 1100px; margin: 0 auto; padding: 24px 0;
  .skel-player {
    width: 100%; aspect-ratio: 16/9; border-radius: 16px;
  }
  .skel-line {
    height: 16px; border-radius: 8px; margin-top: 16px;
    &--long { width: 50%; }
    &--short { width: 30%; height: 12px; }
  }
}
</style>

<!--
  写评论弹窗（本页专属，非 scoped 块）
  ⚠️ SendComment 的公用样式（scss/comment/sendComment.scss）是按"全宽暗色评论区"设计的：
    1) 按钮列 el-col 只占 span=4（16.6%），520px 弹窗里仅 ~80px 宽，放不下 202px 的按钮组，
       叠上全局 .row-col-center 的 justify-content:center 后从两侧溢出 →「取消」按钮甩出弹窗左缘；
    2) 暗色配色（rgba 白字/白边）在白色 dialog 上几乎不可读。
  这里用非 scoped 块，所有选择器都限定在 .vp-send-wrap / .vp-comment-dialog 下，不碰任何公用样式。
-->
<style lang="scss">
@import "src/assets/scss/base/variables";

.vp-comment-dialog {
  border-radius: 14px;

  .el-dialog__title { font-size: 16px; font-weight: 600; color: #303133; }
  .el-dialog__body { padding: 10px 24px 24px; }

  // —— 以下覆盖 SendComment 的公用样式（scoped 特异性为 类+attr，这里统一多挂一层类稳赢）——
  .vp-send-wrap {
    .comment .el-row {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    // 关键修复：所有列一律占满整行，按钮组才有地方放
    .comment .el-col {
      width: 100% !important;
      flex: 0 0 auto;
      padding: 0;
    }

    .comment .avatar { display: none; }

    .comment .input-box .el-textarea .el-textarea__inner {
      height: 160px;
      resize: none;
      background: #f7f8fc;
      border: 1px solid rgba(0, 0, 0, .10);
      border-radius: 12px;
      padding: 14px 16px 30px;
      color: #303133;
      font-size: 14px;
      line-height: 1.7;
      transition: border-color .2s ease, box-shadow .2s ease;

      &::placeholder { color: rgba(0, 0, 0, .32); }
      &:focus {
        border-color: $color-main;
        box-shadow: 0 0 0 3px rgba($color-main, .14);
        outline: none;
      }
    }

    // 字数统计保持 textarea 内右下角，改成深色才看得清
    .comment .input-box .el-input__count {
      color: rgba(0, 0, 0, .38);
      font-size: 12px;
      background: transparent;

      .el-input__count-inner { background: transparent; }
    }

    .comment .btn-send {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 0;

      .btn-cancel {
        height: 38px;
        padding: 0 22px;
        min-width: 76px;
        background: #fff;
        border: 1px solid rgba(0, 0, 0, .14);
        border-radius: 999px;
        color: #606266;
        font-size: 13px;
        cursor: pointer;
        white-space: nowrap;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all .2s ease;

        &:hover {
          border-color: rgba(0, 0, 0, .26);
          color: #303133;
          background: #fafafa;
        }
      }

      > span {
        min-width: 96px;
        height: 38px;
        padding: 0 22px;
        background: linear-gradient(135deg, $color-main, lighten($color-main, 8%));
        color: #fff;
        border: none;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 6px 18px rgba($color-main, .3);
        transition: transform .2s ease, box-shadow .2s ease;

        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 24px rgba($color-main, .36);
        }
        &:active { transform: translateY(0); }
      }
    }
  }
}
</style>
