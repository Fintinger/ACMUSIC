<template>
  <el-dialog
      title="添加到歌单"
      :visible.sync="open"
      width="440px"
      append-to-body
      :close-on-click-modal="false"
      @closed="onClosed">
    <div class="atp">
      <p class="atp-summary">
        将 <b>{{ songs.length }}</b> 首歌加入歌单
        <span v-if="source === 'queue'" class="atp-src">（来自当前播放列表）</span>
      </p>

      <div class="atp-search">
        <el-input v-model="keyword" size="small" clearable placeholder="搜索我创建的歌单"/>
      </div>

      <div v-if="listLoading" class="atp-skeleton" aria-hidden="true">
        <i v-for="n in 4" :key="n"></i>
      </div>
      <p v-else-if="listError" class="atp-error">{{ listError }}</p>
      <div v-else-if="filtered.length" class="atp-list">
        <button
            v-for="p in filtered"
            :key="p.id"
            type="button"
            class="atp-row"
            :disabled="busy"
            :title="'把歌曲加入《' + (p.name || '歌单') + '》'"
            @click="addTo(p)">
          <cover-image :src="p.coverImgUrl || ''" :alt="(p.name || '歌单') + '的封面'" custom-class="atp-cover"/>
          <span class="atp-main">
            <span class="atp-name">{{ p.name }}</span>
            <span class="atp-meta">{{ p.trackCount || 0 }} 首</span>
          </span>
          <span class="atp-go" :class="{ 'is-busy': busyPid === p.id }">
            {{ busyPid === p.id ? (progressText || '加入中') : '加入' }}
          </span>
        </button>
      </div>
      <p v-else class="atp-empty">{{ keyword ? '没有匹配的歌单' : '还没有创建过歌单，先新建一个' }}</p>

      <div class="atp-new">
        <el-input
            v-model="newName"
            size="small"
            maxlength="40"
            placeholder="新建歌单并加入"
            @keyup.enter.native="createAndAdd"/>
        <el-button size="small" :loading="creating" :disabled="busy" @click="createAndAdd">新建</el-button>
      </div>

      <p class="atp-tip">只显示你创建的歌单（收藏来的歌单不能加歌）。已在歌单里的歌会自动跳过。</p>
    </div>
  </el-dialog>
</template>

<script>
/**
 * 全局「添加到歌单」弹窗。
 *
 * 为什么做成全局单例：入口分散在歌曲行、播放列表、大播放器三处，
 * 每处各放一个弹窗意味着三份歌单列表请求、三份查重逻辑、三处登录校验。
 * 这里挂在 App.vue 上，任何组件通过 `$bus.$emit('open-add-to-playlist', {songs, source})` 唤起。
 *
 * 两条关键约束（都是实测/踩过的）：
 *  1. 只能往「自己创建」的歌单里加歌，收藏来的歌单服务端会拒绝；
 *     红心歌单（specialType=5）也排除——它走 /like 通道，直接加歌会让播放条的红心状态不同步。
 *  2. /playlist/tracks 是 GET，tracks 参数是逗号分隔的 id。800 首 ≈ 8KB 查询串会被 nginx
 *     的默认请求头缓冲（8k）拦掉，所以按 100 首分片，并且**串行**发（并发会让服务端
 *     按到达顺序 append，歌曲顺序被打乱）。
 */
import * as playlistApi from "@/api/Playlist";
import * as userDetailApi from "@/api/UserDetail";
import * as authApi from "@/api/auth";
import CoverImage from "@/components/common/CoverImage";
import { isLoggedIn } from "@/utils/auth";
import { parseWriteResult } from "@/utils/writeResult";

/** 单次请求携带的歌曲数 */
const CHUNK = 100;
/** 拉全部歌单的上限（接口默认 2000，一般用户远小于这个数） */
const PLAYLIST_LIMIT = 2000;

export default {
  name: "AddToPlaylistDialog",
  components: {CoverImage},
  data() {
    return {
      open: false,
      songs: [],
      source: '',
      keyword: '',
      playlists: [],
      uid: 0,
      // 这份 playlists 是为哪个 uid 拉的：换账号要重拉
      loadedFor: 0,
      listLoading: false,
      listError: '',
      busy: false,
      busyPid: null,
      progressText: '',
      creating: false,
      newName: ''
    }
  },
  computed: {
    filtered() {
      const kw = (this.keyword || '').trim().toLowerCase()
      if (!kw) return this.playlists
      return this.playlists.filter(p => (p.name || '').toLowerCase().indexOf(kw) !== -1)
    }
  },
  created() {
    this.$bus.$on('open-add-to-playlist', this.openDialog)
  },
  beforeDestroy() {
    this.$bus.$off('open-add-to-playlist', this.openDialog)
  },
  methods: {
    openDialog(payload) {
      if (!isLoggedIn()) {
        this.$toast.warning('添加到歌单需要先登录')
        return
      }
      const songs = (payload && Array.isArray(payload.songs)) ? payload.songs : []
      const valid = songs.filter(s => s && s.id != null)
      if (!valid.length) {
        this.$toast.warning('没有可加入的歌曲')
        return
      }
      this.songs = valid
      this.source = (payload && payload.source) || ''
      this.keyword = ''
      this.newName = ''
      this.open = true
      this.loadPlaylists()
    },
    /** 拉「我创建的歌单」。同一个 uid 复用一次会话内的结果，换账号会重新拉（见 resolveUid） */
    loadPlaylists(force) {
      if (this.listLoading) return
      this.listLoading = true
      this.listError = ''
      return this.resolveUid()
        .then(uid => {
          if (!uid) throw new Error('未登录或拿不到用户信息')
          if (!force && this.loadedFor === uid && this.playlists.length) {
            this.uid = uid
            return null
          }
          this.uid = uid
          return userDetailApi.playlists(uid, PLAYLIST_LIMIT, 0).then(res => {
            const list = (res && res.data && res.data.playlist) || []
            this.playlists = list.filter(p => p && p.creator &&
                String(p.creator.userId) === String(uid) &&
                Number(p.specialType) !== 5)
            this.loadedFor = uid
          })
        })
        .catch(e => {
          this.listError = (e && e.message) || '歌单列表加载失败，请稍后重试'
        })
        .finally(() => {
          this.listLoading = false
        })
    },
    /**
     * 取当前账号 uid。不能直接读 Vuex 的 profile：setLogin 只写 cookie 不写 profile，
     * 用户没进过「我的」页时 profile 是空的（utils/heartMode.js 也是同一个原因先问接口）。
     * 刻意不缓存到 this.uid 就返回——同一标签页里退出再登另一个账号时，
     * 必须重新问一次，否则会把上一个账号的歌单列出来。
     */
    resolveUid() {
      return authApi.loginStatus().then(res => {
        const d = (res && res.data && res.data.data) || {}
        return (d.profile && d.profile.userId) || (d.account && d.account.id) || 0
      }).catch(() => 0)
    },
    async addTo(p) {
      if (this.busy || !p || !p.id) return
      // 电台节目（isVoice）不是音乐，进不了歌单；先剔掉再判断有没有可加的
      const songs = this.songs.filter(s => s && s.id != null && !s.isVoice)
      if (!songs.length) {
        this.$toast.warning('没有可加入的歌曲')
        return
      }

      this.busy = true
      this.busyPid = p.id
      try {
        this.progressText = '检查'
        const existing = await this.fetchTrackIds(p.id)
        const pending = songs.filter(s => !existing.has(String(s.id)))
        const skipped = songs.length - pending.length
        if (!pending.length) {
          this.$toast.info('这些歌都已在歌单中')
          return
        }
        if (pending.length > 200) {
          try {
            await this.$confirmBox({
              title: '加入歌单',
              message: `将 ${pending.length} 首歌加入《${p.name || '这个歌单'}》？` +
                  (skipped ? `（已跳过 ${skipped} 首已在歌单中的）` : ''),
              confirmText: '加入',
              cancelText: '取消'
            })
          } catch (e) {
            return // 用户取消，不是失败
          }
        }

        const added = await this.addChunks(p.id, pending)
        this.$toast.success(`已加入 ${added} 首到《${p.name || '歌单'}》` +
            (skipped ? `，跳过 ${skipped} 首已存在` : ''))
        this.$bus.$emit('playlistTracksAdded', {id: p.id, count: added})
        this.open = false
      } catch (e) {
        this.$toast.error((e && e.message) || '添加失败，请稍后重试')
      } finally {
        this.busy = false
        this.busyPid = null
        this.progressText = ''
      }
    },
    /**
     * 查重：/playlist/detail 会带回**全部**歌曲 id（playlist.trackIds），比
     * /playlist/track/all 拉整批歌曲对象轻一个量级（1–2MB → 几十 KB）。
     */
    fetchTrackIds(pid) {
      return playlistApi.detail(pid).then(res => {
        const pl = (res && res.data && res.data.playlist) || {}
        const ids = Array.isArray(pl.trackIds) ? pl.trackIds : []
        return new Set(ids.map(item => String(item && item.id != null ? item.id : item)))
      })
    },
    /** 分片串行写入：顺序即队列顺序，中途失败能报出"成功了几首" */
    async addChunks(pid, songs) {
      let done = 0
      for (let i = 0; i < songs.length; i += CHUNK) {
        const chunk = songs.slice(i, i + CHUNK)
        this.progressText = `${done}/${songs.length}`
        const res = await playlistApi.addTracks('add', pid, chunk.map(s => s.id).join(','))
        const r = parseWriteResult(res, '添加失败')
        if (!r.ok) {
          throw new Error(`已加入 ${done} 首，剩余 ${songs.length - done} 首失败：${r.message || '请稍后重试'}`)
        }
        done += chunk.length
      }
      this.progressText = `${done}/${songs.length}`
      return done
    },
    async createAndAdd() {
      if (this.creating || this.busy) return
      if (!this.uid) {
        this.$toast.info('正在加载歌单，请稍候')
        return
      }
      const name = (this.newName || '').trim()
      if (!name) {
        this.$toast.warning('歌单名不能为空')
        return
      }
      this.creating = true
      try {
        const res = await playlistApi.create(name)
        const r = parseWriteResult(res, '新建歌单失败')
        if (!r.ok) throw new Error(r.message)
        const d = (res && res.data) || {}
        const body = d.body || {}
        const pl = d.playlist || body.playlist || {}
        const id = d.id || body.id || pl.id
        if (!id) throw new Error('新建成功但没拿到歌单 id，请到「我的」页确认')
        this.newName = ''
        const created = {
          id,
          name: pl.name || name,
          coverImgUrl: pl.coverImgUrl || '',
          trackCount: 0,
          creator: {userId: this.uid}
        }
        // 先塞进列表再走同一条加歌链路：查重、分片、事件通知全部复用
        this.playlists = [created].concat(this.playlists)
        this.keyword = ''
        await this.addTo(created)
        // 新歌单的封面/统计要等接口回填，静默重拉一次（失败不影响已经加进去的歌）
        this.loadPlaylists(true)
      } catch (e) {
        this.$toast.error((e && e.message) || '新建歌单失败')
      } finally {
        this.creating = false
      }
    },
    onClosed() {
      this.songs = []
      this.source = ''
      this.busyPid = null
      this.progressText = ''
    }
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/base/variables";

.atp {
  .atp-summary {
    margin: 0 0 12px;
    font-size: 13px;
    color: $font-black-1;

    b { color: $color-main; }
    .atp-src { color: $font-black-2; font-weight: normal; }
  }

  .atp-search { margin-bottom: 8px; }

  .atp-list {
    max-height: 300px;
    overflow-y: auto;
    margin: 0 -4px;
    padding: 0 4px;
  }

  .atp-row {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 7px 8px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    cursor: pointer;
    transition: background .15s ease;

    &:hover:not(:disabled) { background: $color-theme-sec; }
    &:disabled { cursor: default; opacity: .6; }
    &:focus-visible { outline: 1px solid $color-main; outline-offset: -1px; }
  }

  .atp-cover {
    width: 40px;
    height: 40px;
    border-radius: 6px;
    object-fit: cover;
    flex-shrink: 0;
    background: $color-theme-sec;
    overflow: hidden;
    // 封面加载失败时浏览器会把 alt 文字画在 40×40 的框里并溢出去，
    // 长歌单名会被渲染成一列竖排文字、盖住右边的名字。alt 仍保留给读屏。
    color: transparent;
    font-size: 0;
  }

  .atp-main {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }

  .atp-name {
    font-size: 13px;
    color: $font-black;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .atp-meta {
    font-size: 11px;
    color: $font-black-2;
  }

  .atp-go {
    flex-shrink: 0;
    font-size: 12px;
    color: $font-black-2;
    font-variant-numeric: tabular-nums;

    .atp-row:hover:not(:disabled) & { color: $color-main; }
    &.is-busy { color: $color-main; }
  }

  .atp-empty,
  .atp-error {
    margin: 0;
    padding: 24px 0;
    text-align: center;
    font-size: 13px;
    color: $font-black-2;
  }

  .atp-error { color: #e6a23c; }

  .atp-skeleton {
    padding: 4px 0;

    i {
      display: block;
      height: 40px;
      margin-bottom: 8px;
      border-radius: 8px;
      background: $color-theme-sec;
      animation: atp-pulse 1.4s ease-in-out infinite;
    }
  }

  .atp-new {
    display: flex;
    gap: 8px;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--c-border);
  }

  .atp-tip {
    margin: 10px 0 0;
    font-size: 11px;
    line-height: 1.6;
    color: $font-black-2;
  }
}

@keyframes atp-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .45; }
}
</style>
