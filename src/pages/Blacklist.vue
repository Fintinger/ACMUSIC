<template>
  <div class="blacklistPage">
    <header class="bl-head">
      <h1>音乐黑名单</h1>
      <p class="bl-desc">
        被屏蔽的歌曲和歌手不会出现在列表与推荐中，播放时自动跳过。
        这份名单存在账号上，和官方客户端共用。
      </p>
    </header>

    <div class="bl-tabs">
      <button type="button" :class="{ active: tab === 'song' }" @click="tab = 'song'">
        歌曲 <em>{{ songItems.length }}</em>
      </button>
      <button type="button" :class="{ active: tab === 'artist' }" @click="tab = 'artist'">
        歌手 <em>{{ artistItems.length }}</em>
      </button>
      <button v-if="total" type="button" class="bl-clear" @click="clearAll">清空名单</button>
    </div>

    <div v-if="loading" class="bl-skel" aria-hidden="true">
      <div v-for="n in 5" :key="n" class="bl-skel-row">
        <span class="bl-skel-cover"></span>
        <span class="bl-skel-line"></span>
      </div>
    </div>

    <EmptyState
        v-else-if="!currentItems.length"
        :title="tab === 'song' ? '还没有屏蔽任何歌曲' : '还没有屏蔽任何歌手'"
        :desc="tab === 'song' ? '在播放器或歌曲列表里点「更多」就能屏蔽' : '在歌手页点「屏蔽」，或从歌曲的更多菜单里屏蔽其歌手'"
    />

    <ul v-else class="bl-list">
      <li v-for="item in currentItems" :key="item.id" class="bl-item">
        <CoverImage :src="item.cover" :alt="(item.name || '未知') + '的封面'" class="bl-cover"/>
        <div class="bl-main">
          <p class="bl-name" :title="item.name">{{ item.name || '未知' }}</p>
          <p class="bl-sub" :title="item.sub">{{ item.sub || '—' }}</p>
        </div>
        <button type="button" class="bl-unblock" @click="unblock(item)">解除</button>
      </li>
    </ul>

    <p v-if="total" class="bl-foot">
      共 {{ total }} 项。解除后立即恢复，无需等待。
    </p>
  </div>
</template>

<script>
import CoverImage from '@/components/common/CoverImage'
import EmptyState from '@/components/common/EmptyState'
import * as tracksApi from '@/api/Tracks'
import * as artistApi from '@/api/Artist'

// 歌手详情只有单个查询接口，批量拉的时候限一下并发，别一次打几十个
const ARTIST_CONCURRENCY = 5

export default {
  name: 'BlacklistPage',
  components: { CoverImage, EmptyState },
  data() {
    return {
      tab: 'song',
      songItems: [],
      artistItems: [],
      loading: false,
      // 每次拉详情的令牌：快速切页时丢弃上一轮结果
      loadToken: 0,
    }
  },
  computed: {
    songIds() {
      return Object.keys(this.$store.state.BlockAbout.songIds)
    },
    artistIds() {
      return Object.keys(this.$store.state.BlockAbout.artistIds)
    },
    total() {
      return this.songIds.length + this.artistIds.length
    },
    currentItems() {
      return this.tab === 'song' ? this.songItems : this.artistItems
    }
  },
  activated() {
    this.refresh()
  },
  methods: {
    /**
     * 进页面先同步一次名单（带时间戳绕开后端 2 分钟 GET 缓存），
     * 再按 id 批量补详情：名单接口只返回 id，没有名字和封面。
     */
    refresh() {
      this.loading = true
      const token = ++this.loadToken
      this.$store.dispatch('BlockAbout/fetch')
          .catch(() => { /* 未登录/网络异常：用现有缓存继续渲染 */ })
          .then(() => {
            if (token !== this.loadToken) return
            return Promise.all([this.loadSongs(token), this.loadArtists(token)])
          })
          .finally(() => {
            if (token === this.loadToken) this.loading = false
          })
    },
    loadSongs(token) {
      const ids = this.songIds
      if (!ids.length) {
        this.songItems = []
        return Promise.resolve()
      }
      return tracksApi.detail(ids.join(','))
          .then(res => {
            if (token !== this.loadToken) return
            const songs = (res && res.data && res.data.songs) || []
            // 接口可能漏掉已下架的歌曲：以 id 列表为准，缺详情的用本地缓存的 name 兜底
            const metaMap = this.$store.state.BlockAbout.songIds
            const byId = {}
            songs.forEach(s => { byId[String(s.id)] = s })
            this.songItems = ids.map(id => {
              const s = byId[id]
              const meta = metaMap[id] || {}
              return {
                id,
                name: (s && s.name) || meta.name || '已下架歌曲',
                cover: (s && s.al && s.al.picUrl) || '',
                sub: s && Array.isArray(s.ar) ? s.ar.map(a => a.name).join(' / ') : ''
              }
            })
          })
          .catch(() => {
            if (token !== this.loadToken) return
            const metaMap = this.$store.state.BlockAbout.songIds
            this.songItems = ids.map(id => ({
              id,
              name: (metaMap[id] && metaMap[id].name) || '未知歌曲',
              cover: '',
              sub: ''
            }))
          })
    },
    loadArtists(token) {
      const ids = this.artistIds
      if (!ids.length) {
        this.artistItems = []
        return Promise.resolve()
      }
      const metaMap = this.$store.state.BlockAbout.artistIds
      const results = []
      const runBatch = start => {
        if (start >= ids.length) return Promise.resolve()
        const batch = ids.slice(start, start + ARTIST_CONCURRENCY)
        return Promise.all(batch.map(id => artistApi.detail(id).catch(() => null)))
            .then(resList => {
              resList.forEach((res, i) => {
                const id = batch[i]
                const a = res && res.data && res.data.artist
                results.push({
                  id,
                  name: (a && a.name) || (metaMap[id] && metaMap[id].name) || '未知歌手',
                  cover: (a && (a.picUrl || a.img1v1Url)) || '',
                  sub: a ? `${a.musicSize || 0} 首歌` : ''
                })
              })
              return runBatch(start + ARTIST_CONCURRENCY)
            })
      }
      return runBatch(0).then(() => {
        if (token !== this.loadToken) return
        this.artistItems = results
      })
    },
    unblock(item) {
      const isSong = this.tab === 'song'
      const action = isSong ? 'unblockSong' : 'unblockArtist'
      this.$store.dispatch('BlockAbout/' + action, item.id)
          .then(() => {
            this.$toast.success('已解除屏蔽')
            if (isSong) this.songItems = this.songItems.filter(x => String(x.id) !== String(item.id))
            else this.artistItems = this.artistItems.filter(x => String(x.id) !== String(item.id))
          })
          .catch(() => this.$toast.error('解除失败，请稍后重试'))
    },
    clearAll() {
      if (!this.total) return
      this.$confirmBox({
        title: '清空音乐黑名单',
        message: `将解除 ${this.songIds.length} 首歌曲、${this.artistIds.length} 位歌手的屏蔽，之后他们会重新出现在列表和推荐中。`,
        confirmText: '全部清空',
        cancelText: '取消'
      }).then(() => {
        this.$store.dispatch('BlockAbout/clearAll')
            .then(count => {
              this.songItems = []
              this.artistItems = []
              this.$toast.success(`已清空 ${count} 项`)
            })
            .catch(() => this.$toast.error('清空失败，请稍后重试'))
      }).catch(() => { /* 取消 */ })
    }
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/base/variables";

.blacklistPage {
  max-width: 880px;
  margin: 0 auto;
  padding: 28px 16px 60px;
}

.bl-head {
  margin-bottom: 22px;

  h1 {
    margin: 0 0 6px;
    font-size: 24px;
    font-weight: 700;
    color: $font-black;
  }
}

.bl-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--c-text-secondary);
}

.bl-tabs {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--c-border, rgba(127, 127, 127, .18));

  button {
    appearance: none;
    border: 0;
    background: transparent;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 14px;
    color: var(--c-text-secondary);
    cursor: pointer;
    transition: color .15s ease, background .15s ease;

    em {
      font-style: normal;
      font-size: 12px;
      opacity: .7;
      margin-left: 2px;
    }

    &:hover { color: var(--c-text-primary, inherit); background: var(--c-bg-hover); }

    &.active {
      color: var(--c-accent);
      font-weight: 600;
      background: var(--c-bg-hover);
    }
  }

  .bl-clear {
    margin-left: auto;
    color: #f56c6c;

    &:hover { background: rgba(245, 108, 108, .1); color: #f56c6c; }
  }
}

.bl-list {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
}

.bl-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 4px;
  border-radius: 10px;
  transition: background .15s ease;

  &:hover { background: var(--c-bg-hover); }
}

.bl-cover {
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  overflow: hidden;

  ::v-deep img { width: 100%; height: 100%; object-fit: cover; }
}

.bl-main {
  min-width: 0;
  flex: 1 1 auto;
}

.bl-name {
  margin: 0 0 3px;
  font-size: 14px;
  font-weight: 500;
  color: $font-black;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bl-sub {
  margin: 0;
  font-size: 12px;
  color: var(--c-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bl-unblock {
  flex: 0 0 auto;
  appearance: none;
  border: 1px solid var(--c-border, rgba(127, 127, 127, .25));
  background: transparent;
  color: var(--c-text-secondary);
  font-size: 12px;
  padding: 5px 14px;
  border-radius: 14px;
  cursor: pointer;
  transition: all .15s ease;

  &:hover { color: var(--c-accent); border-color: var(--c-accent); }
}

.bl-foot {
  margin: 18px 0 0;
  font-size: 12px;
  color: var(--c-text-secondary);
  opacity: .8;
}

.bl-skel-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 4px;
}

.bl-skel-cover {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: var(--c-bg-sunken, rgba(127, 127, 127, .12));
  animation: bl-pulse 1.2s ease-in-out infinite;
}

.bl-skel-line {
  flex: 1;
  height: 12px;
  max-width: 42%;
  border-radius: 6px;
  background: var(--c-bg-sunken, rgba(127, 127, 127, .12));
  animation: bl-pulse 1.2s ease-in-out infinite;
}

@keyframes bl-pulse {
  0%, 100% { opacity: .55; }
  50% { opacity: 1; }
}
</style>
