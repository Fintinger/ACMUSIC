<template>
  <ul class="rankList">
    <li v-for="(t, i) in list" :key="t.id" class="rankRow" :class="{ 'is-top': showRank && i < 3 }"
        @dblclick="play(t)">
      <span v-if="showRank" class="rankNo">{{ i + 1 }}</span>
      <div class="rankCover" @click.stop="play(t)">
        <cover-image :src="coverOf(t)" :alt="(t.name || '歌曲') + '的封面'" height="40"/>
        <span class="playMask"><BaseIcon name="play"/></span>
      </div>
      <div class="rankMeta">
        <p class="rankName" :title="t.name">{{ t.name || '未知' }}</p>
        <p v-if="artistText(t)" class="rankArtist" :title="artistText(t)">
          <span v-for="(a, ind) in (t.ar || [])" :key="ind" @click.stop="arClk(a.id)">{{ a.name }}<i
              v-if="ind !== t.ar.length - 1">, </i></span>
        </p>
      </div>
      <span v-if="metaText(t)" class="rankVal">{{ metaText(t) }}</span>
      <button v-if="downloadable" class="rankDownload" type="button" :aria-label="'下载 ' + (t.name || '歌曲')" :disabled="!!downloading[t.id]" @click.stop="download(t)" @dblclick.stop>
        <BaseIcon v-if="downloading[t.id]" class="is-spinning" name="loader"/><BaseIcon v-else name="download"/>
      </button>
    </li>
  </ul>
</template>

<script>
/**
 * RankList —— 个人主页用的紧凑排行列表（听歌排行 / 云盘）。
 *
 * 为什么不复用 TracksLayout：那是一张「封面 + 歌名 + 专辑 + 时长 + 计数」的宽表，
 * 放进两栏布局里的窄卡片会把专辑名和时长挤成省略号；而这里只需要
 * 「序号 + 封面 + 歌名/歌手 + 一个右对齐的数字」。
 *
 * 交互与全站保持一致：双击播放；封面 hover 出现播放按钮（单击即播）；点歌手跳详情。
 */
import CoverImage from "@/components/common/CoverImage";
import {downloadUrlV1} from '@/api/Tracks';
import config from '@/config';

export default {
  name: "RankList",
  components: { CoverImage },
  props: {
    list: { type: Array, required: true },
    // 是否显示序号列（听歌排行要，云盘不要）
    showRank: { type: Boolean, default: true },
    // 右侧数字：count = 播放次数 / size = 文件大小 / none = 不显示
    meta: { type: String, default: 'count' },
    downloadable: { type: Boolean, default: false },
  },
  data() { return {downloading: {}} },
  methods: {
    async download(t) {
      if (!t.id || this.downloading[t.id]) return
      this.$set(this.downloading, t.id, true)
      try {
        const res = await downloadUrlV1(t.id, config.player.level || 'standard')
        const data = (res.data && res.data.data) || {}
        if (!data.url) { this.$toast.warning('该歌曲暂不可下载，请检查登录状态或下载权限'); return }
        const link = document.createElement('a')
        link.href = data.url; link.download = (t.name || '歌曲') + '.' + (data.type || 'mp3')
        link.target = '_blank'; link.rel = 'noopener'
        document.body.appendChild(link); link.click(); link.remove()
        this.$toast.info('已打开下载链接')
      } catch (_) { this.$toast.error('下载链接获取失败，请稍后重试') }
      finally { this.$set(this.downloading, t.id, false) }
    },
    coverOf(t) {
      const al = t.al || t.album || {}
      return al.picUrl || ''
    },
    artistText(t) {
      return (t.ar || []).map(a => a.name).join(', ')
    },
    metaText(t) {
      if (this.meta === 'count') return t.recordPlayCount ? t.recordPlayCount + ' 次' : ''
      if (this.meta === 'size') return t.fileSize ? (t.fileSize / 1024 / 1024).toFixed(1) + ' MB' : ''
      return ''
    },
    play(t) {
      this.$bus.$emit('songClk', t)
    },
    arClk(id) {
      if (id) this.$bus.$emit('arClk', id)
    },
  },
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/base/variables";

.rankList {
  margin: 0;
  padding: 0;
  list-style: none;
}
.rankDownload {
  flex: none; width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--c-border-strong); border-radius: 50%; background: var(--c-bg-elevated); color: var(--c-text-secondary); cursor: pointer;
  &:hover { color: var(--c-accent-text); border-color: var(--c-accent); }
  &:disabled { opacity: .5; cursor: wait; }
}

.rankRow {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 7px 10px;
  border-radius: 12px;
  cursor: default;
  transition: background .18s;

  &:hover { background: rgba(0,0,0,.035); }
}

// 序号：等宽数字 + 前三名主色，让"排行"这件事在视觉上成立
.rankNo {
  width: 16px;
  flex-shrink: 0;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  text-align: right;
  color: $font-black-2;

  .is-top & { color: $color-main-text; font-weight: 600; }
}

.rankCover {
  position: relative;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  background: rgba(0,0,0,.04);

  ::v-deep img { width: 100%; height: 100%; object-fit: cover; display: block; }
}

// 播放按钮：平时隐藏，hover 才浮出，减少日常浏览的视觉噪音
.playMask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,.35);
  color: #fff;
  font-size: 14px;
  opacity: 0;
  transition: opacity .18s;
}

.rankCover:hover .playMask { opacity: 1; }

.rankMeta { flex: 1; min-width: 0; }

.rankName {
  margin: 0;
  font-size: 14px;
  color: $font-black;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rankArtist {
  margin: 3px 0 0;
  font-size: 12px;
  color: $font-black-2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  span { cursor: pointer; transition: color .18s; }
  span:hover { color: $color-main-text; text-decoration: underline; }
}

// 数字列：右对齐 + 等宽，多行时数字纵向成一条线
.rankVal {
  flex-shrink: 0;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: $font-black-1;
  white-space: nowrap;
}
</style>
