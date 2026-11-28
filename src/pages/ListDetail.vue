<template>
  <div v-cloak class="listDetail">
    <div class="listInfo">
      <PlaylistInfoSkeleton v-if="infoLoading"/>
      <EmptyState v-else-if="infoError" :title="infoError" desc="请检查歌单链接或网络后重试" action-text="重新加载详情" @action="loadInfo"/>
      <el-row v-else>
        <el-col :span="6">
          <div class="imgContainer">
            <cover-image :alt="listInfo.name + '的封面'" :src="listInfo.coverImgUrl" eager />
          </div>
        </el-col>
        <el-col class="info" :span="18">
          <div class="info-wrap">
            <scoText class="listName">{{ listInfo.name }}</scoText>
            <el-row class="creator">
              By <span class="name" @click="uClk(creator.userId)">{{ creator.nickname }}</span>
            </el-row>
                      <el-row class="listTag">
                        <span class="listCount">{{ listInfo.trackCount }}首</span> | <span class="play-count">播放{{ listInfo.playCount | Div1w(listInfo.playCount) }}</span>
                      </el-row>
            <el-row v-if="listInfo.createTime || listInfo.updateTime" class="listTime"><span v-if="listInfo.createTime">创建于{{ listInfo.createTime |formatMs("YYYY年MM月DD日") }}</span><span v-if="listInfo.updateTime">{{ listInfo.createTime ? '，' : '' }}最后更新于{{ listInfo.updateTime|fromNow }}</span></el-row>
            <el-row class="listDescription">
              <pre v-text="listInfo.description"></pre>
            </el-row>
            <div class="detail-play-actions">
              <PlayAllButton :tracks="songs" size="lg" :disabled="initialLoading"/>
              <!-- 收藏：自己的歌单 / 系统歌单（我喜欢的音乐、榜单）不显示，服务端本来也不允许 -->
              <button
                  v-if="canSubscribe"
                  type="button"
                  class="detail-subscribe"
                  :class="{ 'is-on': isSubscribed }"
                  :disabled="subPending"
                  :title="isSubscribed ? '取消收藏这个歌单' : '收藏这个歌单'"
                  @click="toggleSubscribe"
              >
                <BaseIcon :name="isSubscribed ? 'starFill' : 'star'" :size="16"/>
                {{ isSubscribed ? '已收藏' : '收藏' }}
                <span v-if="listInfo.subscribedCount != null" class="subCount">{{ listInfo.subscribedCount | Div1w(listInfo.subscribedCount) }}</span>
              </button>
            </div>
            <!-- 只有歌单创建者能编辑：订阅来的歌单改不了 -->
            <el-row v-if="isOwner" class="ownerActions">
              <button class="actBtn" :disabled="saving" @click="openEdit">编辑信息</button>
              <button class="actBtn" :class="{ active: manageMode }" @click="toggleManage">
                {{ manageMode ? '完成管理' : '管理歌曲' }}
              </button>
              <!-- 「我喜欢的音乐」是账号自带的系统歌单，删不掉，直接不给入口 -->
              <button v-if="!isFavPlaylist" class="actBtn danger" :disabled="saving || deleting"
                      @click="deletePlaylist">删除歌单
              </button>
              <span v-if="manageMode" class="actHint">
                {{ allLoaded ? '可调整顺序与移出歌曲' : '还有歌曲未加载，顺序调整需先加载全部' }}
              </span>
            </el-row>
          </div>
        </el-col>
      </el-row>
    </div>
    <div v-if="!infoLoading && !infoError" class="songs-comment">
      <el-tabs v-model="activeName">
        <el-tab-pane label="歌曲" name="songs">
          <TrackListSkeleton v-if="initialLoading"/>
          <template v-else>
            <TracksLayout v-if="songs.length" :need-btn="false" :list="songs" :show-actions="isOwner && manageMode">
              <template #actions="{ track, index }">
                <button class="rowAct" title="上移" :disabled="saving || index === 0"
                        @click="moveTrack(index, -1)">↑
                </button>
                <button class="rowAct" title="下移" :disabled="saving || index === songs.length - 1"
                        @click="moveTrack(index, 1)">↓
                </button>
                <button class="rowAct danger" title="移出歌单" :disabled="saving"
                        @click="removeTrack(track)">✕
                </button>
              </template>
            </TracksLayout>
            <EmptyState v-if="songsError" compact :title="songs.length ? '更多歌曲加载失败' : '歌曲加载失败'" desc="已加载的歌曲会保留，请检查网络后重试" action-text="重试歌曲" @action="load"/>
            <EmptyState v-else-if="!songs.length" compact title="这张歌单暂无可用歌曲"/>
            <LoadMore v-if="songs.length && !songsError" :load="load" :loading="loading" :noMore="noMore"/>
          </template>
        </el-tab-pane>
        <el-tab-pane :label="'评论' + (listInfo.commentCount != null ? ' ' + listInfo.commentCount : '')" name="comment">
          <CommentLayout :id="id" type="2"/>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 编辑歌单信息（仅创建者可见入口） -->
    <el-dialog
        title="编辑歌单信息"
        :visible.sync="editVisible"
        width="460px"
        append-to-body
        :close-on-click-modal="false">
      <div class="editForm">
        <label class="editLabel">歌单名</label>
        <el-input v-model="editForm.name" maxlength="40" show-word-limit placeholder="给歌单起个名字"/>
        <label class="editLabel">简介</label>
        <el-input v-model="editForm.desc" type="textarea" :rows="4" maxlength="200" show-word-limit
                  placeholder="介绍一下这个歌单（可留空）"/>
      </div>
      <span slot="footer">
        <el-button size="small" @click="editVisible = false">取消</el-button>
        <el-button size="small" type="primary" :loading="saving" @click="saveEdit">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import EmptyState from '@/components/common/EmptyState';
import LoadMore from "@/components/LoadMore";
import TracksLayout from "@/components/layout/TracksLayout";
import CommentLayout from "@/components/layout/CommentLayout";
import PlaylistInfoSkeleton from "@/components/Skeleton/PlaylistInfoSkeleton";
import TrackListSkeleton from "@/components/Skeleton/TrackListSkeleton";
import PlayAllButton from "@/components/common/PlayAllButton";

import scoText from "@/components/scoText";
import CoverImage from "@/components/common/CoverImage";
import * as playlistApi from "@/api/Playlist";
import { isLoggedIn } from "@/utils/auth";
import { parseWriteResult } from "@/utils/writeResult";

export default {
  name: "listDetail",
  components: {EmptyState, LoadMore, TracksLayout, CommentLayout, PlaylistInfoSkeleton, TrackListSkeleton, scoText, CoverImage, PlayAllButton},
  data() {
    // const LIMIT = 50, OFFSET = 50;
    return {
      LIMIT: 50,
      OFFSET: 0,
      songs: [],
      listInfo: {},
      creator: {},
      loading: false,
      infoLoading: true,
      infoError: '',
      songsError: false,
      exhausted: false,
      requestVersion: 0,
      initialLoading: true,
      params: {
        limit: this.LIMIT,
        offset: this.OFFSET
      },
      //默认显示的页面
      activeName:"songs",
      // 歌单管理（仅创建者）
      manageMode: false,
      editVisible: false,
      saving: false,
      // 删除歌单单独一个 loading：删除成功会跳走，不能和 saving 混用
      deleting: false,
      // 收藏/取消收藏的并发锁：连点会一收一取，最后状态取决于谁后回来
      subPending: false,
      editForm: { name: '', desc: '' },
    }
  },
  //接收来自路由的query参数
  props: ['id'],
  computed: {
    listID() {
      return this.$route.query.id
    },
    trackCount() {
      return this.listInfo.trackCount
    },
    nextCount() {
      return (this.params.offset + 1) * this.params.limit
    },
    noMore() {
      return this.exhausted || (this.trackCount != null && this.songs.length >= Number(this.trackCount))
    },
    profile() {
      return this.$store.getters["UserAbout/userProfile"] || {}
    },
    /** 只有歌单创建者能编辑；订阅来的歌单只读 */
    isOwner() {
      const uid = this.profile && this.profile.userId
      const owner = this.listInfo && this.listInfo.userId
      return !!uid && this.$store.getters["UserAbout/isLogin"] && String(owner) === String(uid)
    },
    /**
     * 「我喜欢的音乐」：账号自带系统歌单，specialType 实测为 5（`/user/playlist` 首条），
     * 删除接口对它必然报错，所以入口直接不渲染。
     */
    isFavPlaylist() {
      return Number(this.listInfo && this.listInfo.specialType) === 5
    },
    /**
     * 歌曲是否已全部加载。排序接口要求提交**完整** id 序列，
     * 只传已加载的一部分会把后面的歌全挤到最后，所以未加载完不允许调整顺序。
     */
    allLoaded() {
      const total = this.listInfo && this.listInfo.trackCount
      return total != null && Number.isFinite(Number(total)) && Number(total) >= 0 && !this.infoError && this.songs.length >= Number(total)
    },
    /** 是否已收藏（/playlist/detail 在登录态下返回 subscribed） */
    isSubscribed() {
      return !!(this.listInfo && this.listInfo.subscribed)
    },
    /**
     * 收藏按钮是否出现。
     *  - 自己的歌单：服务端不允许收藏自己的歌单；
     *  - specialType 非 0：系统歌单。实测 5=我喜欢的音乐、10=榜单，
     *    这两类都订阅不了，显示出来只会让用户点了报错。
     */
    canSubscribe() {
      const st = Number(this.listInfo && this.listInfo.specialType) || 0
      return !!this.listInfo.id && !this.isOwner && st === 0
    }
  },
  methods: {
    async loadInfo() {
      const version = this.requestVersion
      this.infoLoading = true; this.infoError = ''
      if (!/^[1-9]\d*$/.test(String(this.id || ''))) {
        this.infoError = '歌单链接无效'; this.infoLoading = false; this.initialLoading = false; return
      }
      try {
        const res = await playlistApi.detail(this.id)
        if (version !== this.requestVersion) return
        const pl = res.data && res.data.playlist
        if (!pl || !pl.id) throw new Error('Invalid playlist response')
        this.listInfo = pl; this.creator = pl.creator || {}
      } catch (_) { if (version === this.requestVersion) this.infoError = '歌单详情加载失败' }
      finally { if (version === this.requestVersion) this.infoLoading = false }
    },
    async loadSongs(id, limit) {
      if (!/^[1-9]\d*$/.test(String(id || ''))) { this.initialLoading = false; return }
      const version = this.requestVersion
      const pageSize = limit || this.params.limit
      const offset = this.params.offset
      this.loading = true; this.songsError = false
      if (!this.songs.length) this.initialLoading = true
      try {
        const res = await playlistApi.getAllTrack(id, {limit: pageSize, offset})
        if (version !== this.requestVersion) return
        const rows = res.data && res.data.songs
        if (!Array.isArray(rows)) throw new Error('Invalid tracks response')
        const seen = new Set(this.songs.map(track => track.id))
        rows.forEach(track => { if (!seen.has(track.id)) { this.songs.push(track); seen.add(track.id) } })
        this.params.offset = offset + rows.length
        this.exhausted = rows.length < pageSize
      } catch (_) { if (version === this.requestVersion) this.songsError = true }
      finally { if (version === this.requestVersion) { this.loading = false; this.initialLoading = false } }
    },
    load() {
      if (this.loading || (!this.songsError && this.noMore)) return
      return this.loadSongs(this.id)
    },
    initialize() {
      this.requestVersion++
      this.songs = []; this.listInfo = {}; this.creator = {}
      this.infoLoading = true; this.initialLoading = true; this.loading = false
      this.infoError = ''; this.songsError = false; this.exhausted = false
      this.manageMode = false; this.editVisible = false
      this.params.limit = this.LIMIT; this.params.offset = this.OFFSET
      return Promise.all([this.loadInfo(), this.loadSongs(this.id)])
    },
    songClk(song) {
      this.$bus.$emit('songClk', song)
    },
    uClk(uid) {
      this.$bus.$emit('uClk', uid)
    },
    // ---------- 收藏歌单 ----------
    /**
     * 收藏 / 取消收藏。
     * 乐观更新 + 失败回滚：写接口是 GET 往返，点了不立刻变样会让人以为没点上；
     * 但 `subscribed` 以服务端为准，失败必须整块退回去（包括收藏数）。
     */
    toggleSubscribe() {
      if (this.subPending) return
      const id = this.id || this.listInfo.id
      if (!id) return
      if (!isLoggedIn()) {
        this.$toast.warning('收藏歌单需要先登录')
        return
      }
      const next = !this.isSubscribed
      const before = Number(this.listInfo.subscribedCount) || 0
      this.subPending = true
      // $set：游客访问时 subscribed 可能压根不在响应里，直接赋值不会触发视图更新
      this.$set(this.listInfo, 'subscribed', next)
      this.$set(this.listInfo, 'subscribedCount', Math.max(0, before + (next ? 1 : -1)))
      playlistApi.subscribe(next ? 1 : 2, id)
        .then(res => {
          const r = parseWriteResult(res, next ? '收藏失败' : '取消收藏失败')
          if (!r.ok) throw new Error(r.message)
          this.$toast.success(next ? '已收藏歌单' : '已取消收藏')
          // 「我的」页的收藏分组 + 收藏计数都是 keep-alive 的，不广播就不会更新
          this.$bus.$emit('playlistSubscribed', { id, subscribed: next })
        })
        .catch(e => {
          this.listInfo.subscribed = !next
          this.listInfo.subscribedCount = before
          this.$toast.error((next ? '收藏失败：' : '取消收藏失败：') + (e.message || '请稍后重试'))
        })
        .finally(() => { this.subPending = false })
    },
    // ---------- 歌单管理（仅创建者入口）----------
    /**
     * 统一解析写接口结果（实现见 utils/writeResult.js）。
     * 上游有 {code:200} / {status:200} / {status:200, body:{code:400}} 三种形态，
     * 只看前两层会把第三种判成成功。
     */
    _writeResult(res, fallback) {
      return parseWriteResult(res, fallback)
    },
    openEdit() {
      this.editForm.name = this.listInfo.name || ''
      this.editForm.desc = this.listInfo.description || ''
      this.editVisible = true
    },
    async saveEdit() {
      const name = (this.editForm.name || '').trim()
      if (!name) {
        this.$toast.warning('歌单名不能为空')
        return
      }
      this.saving = true
      try {
        const res = await playlistApi.updateInfo(this.id, name, this.editForm.desc || '')
        const r = this._writeResult(res, '保存失败')
        if (!r.ok) throw new Error(r.message)
        // 本地同步，避免为了看效果再请求一次详情
        this.listInfo.name = name
        this.listInfo.description = this.editForm.desc || ''
        this.editVisible = false
        this.$toast.success('歌单信息已更新')
      } catch (e) {
        this.$toast.error('保存失败：' + (e.message || '请稍后重试'))
      } finally {
        this.saving = false
      }
    },
    toggleManage() {
      this.manageMode = !this.manageMode
      if (this.manageMode && !this.allLoaded) {
        this.$toast.info('还有歌曲未加载，调整顺序前请先把列表加载到底')
      }
    },
    /**
     * 删除歌单（仅创建者）：
     * - 不可恢复，二次确认里写清「删的是歌单不是歌曲」
     * - 成功后广播 playlistDeleted，让被 keep-alive 缓存的用户主页重拉歌单区
     *   （UserDetailLayout 只在 mounted 取数，不广播就会继续显示已删的歌单）
     * - 然后跳回「我的」，否则当前页会停在一个已经不存在的歌单上
     */
    async deletePlaylist() {
      if (this.saving || this.deleting) return
      const name = this.listInfo.name || '这个歌单'
      const count = this.listInfo.trackCount || 0
      try {
        // 不可逆操作：升级为「输入歌单名确认」，避免误点一次就丢掉整张歌单
        await this.$confirmTyped({
          title: '删除歌单',
          message: `删除后无法恢复。《${name}》以及其中的 ${count} 首歌会从你的账号里移除（歌曲本身不会被删除）。`,
          expect: name,
          inputPlaceholder: `请输入「${name}」以确认`,
          confirmText: '确认删除',
          cancelText: '取消'
        })
      } catch (e) {
        return // 用户取消
      }
      this.deleting = true
      try {
        const res = await playlistApi.del(this.id)
        const r = this._writeResult(res, '删除失败')
        if (!r.ok) throw new Error(r.message)
        this.$toast.success('歌单已删除')
        this.$bus.$emit('playlistDeleted', this.id)
        this.$router.push('/me')
      } catch (e) {
        this.$toast.error('删除失败：' + (e.message || '请稍后重试'))
      } finally {
        this.deleting = false
      }
    },
    /** 上移/下移：先本地交换，提交成功才落地，失败保持原顺序 */
    async moveTrack(index, dir) {
      const target = index + dir
      if (this.saving || target < 0 || target >= this.songs.length) return
      if (!this.allLoaded) {
        this.$toast.warning('还有歌曲未加载，请先加载全部歌曲再调整顺序')
        return
      }
      const arr = this.songs.slice()
      const moved = arr.splice(index, 1)[0]
      if (!moved) return
      arr.splice(target, 0, moved)
      this.saving = true
      try {
        // 必须提交完整序列（接口内部会序列化成 JSON 数组），缺一首就会被打乱
        const res = await playlistApi.updateOrder(this.id, arr.map(s => s.id))
        const r = this._writeResult(res, '调整顺序失败')
        if (!r.ok) throw new Error(r.message)
        this.songs = arr
      } catch (e) {
        this.$toast.error('调整顺序失败：' + (e.message || '请稍后重试'))
      } finally {
        this.saving = false
      }
    },
    async removeTrack(track) {
      if (this.saving || !track || !track.id) return
      try {
        await this.$confirmBox({
          title: '移出歌曲',
          message: `把《${track.name || '这首歌'}》从歌单移出？只是移出歌单，歌曲本身不会被删除。`,
          confirmText: '移出',
          cancelText: '取消'
        })
      } catch (e) {
        return // 用户取消
      }
      this.saving = true
      try {
        const res = await playlistApi.removeTracks(this.id, track.id)
        const r = this._writeResult(res, '移出失败')
        if (!r.ok) throw new Error(r.message)
        const idx = this.songs.findIndex(s => s.id === track.id)
        if (idx !== -1) this.songs.splice(idx, 1)
        if (this.listInfo.trackCount > 0) this.listInfo.trackCount -= 1
        this.$toast.success('已移出歌单')
      } catch (e) {
        this.$toast.error('移出失败：' + (e.message || '请稍后重试'))
      } finally {
        this.saving = false
      }
    },
    /**
     * 全局「加入歌单」弹窗写完之后的通知：加的正好是当前这张歌单就整体重载。
     * 不做局部 append —— 队列里的歌可能是刷新恢复出来的 lite 结构（没有专辑/封面），
     * 直接塞进列表会是一行残缺数据。
     */
    onTracksAdded(payload) {
      if (!payload || String(payload.id) !== String(this.id)) return
      this.initialize()
    }
  },
  mounted() {
    // 本页被 keep-alive 缓存，返回时不会重新 mounted；目标歌单被改只能靠事件通知
    this.$bus.$on('playlistTracksAdded', this.onTracksAdded)
  },
  beforeDestroy() {
    this.requestVersion++
    this.$bus.$off('playlistTracksAdded', this.onTracksAdded)
  },
  activated() { this.initialize() }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/listDetail";

/* ---------- 歌单管理（仅创建者可见） ---------- */
.ownerActions {
  display: flex;
  align-items: center;
  gap: .5rem;
  margin-top: 1rem;
  flex-wrap: wrap;

  .actHint {
    font-size: .75rem;
    color: var(--c-text-tertiary);
  }
}

.actBtn {
  height: 28px;
  padding: 0 14px;
  border-radius: 14px;
  border: 1px solid var(--c-border-strong);
  background: transparent;
  font-size: .78rem;
  color: var(--c-text-secondary);
  cursor: pointer;
  transition: all .2s;

  &:hover:not(:disabled) {
    border-color: var(--c-accent);
    color: var(--c-accent);
  }

  &.active {
    background: var(--c-accent);
    border-color: var(--c-accent);
    color: var(--theme-on-accent);
  }

  /* 破坏性操作：常态就带红，悬停加深；比 .actBtn:hover 优先级高，不会被紫色覆盖 */
  &.danger {
    border-color: rgba(229, 72, 77, .35);
    color: var(--c-danger-text);
  }

  &.danger:hover:not(:disabled) {
    border-color: var(--c-danger);
    background: rgba(229, 72, 77, .08);
    color: var(--c-danger-text);
  }

  &:disabled {
    opacity: .45;
    cursor: not-allowed;
  }
}

/* 行内操作按钮（由 TracksLayout 的 actions 插槽渲染） */
.rowAct {
  width: 24px;
  height: 24px;
  line-height: 1;
  border: none;
  border-radius: 6px;
  background: var(--c-bg-hover);
  color: var(--c-text-secondary);
  font-size: .8rem;
  cursor: pointer;
  transition: all .15s;

  &:hover:not(:disabled) {
    background: rgba(var(--theme-accent-rgb), .16);
    color: var(--c-accent);
  }

  &.danger:hover:not(:disabled) {
    background: rgba(229, 72, 77, .14);
    color: var(--c-danger-text);
  }

  &:disabled {
    opacity: .3;
    cursor: not-allowed;
  }
}

.editForm {
  .editLabel {
    display: block;
    font-size: .8rem;
    color: var(--c-text-tertiary);
    margin: .9rem 0 .35rem;

    &:first-child {
      margin-top: 0;
    }
  }
}
.detail-play-actions {
  display: flex; align-items: center; flex-wrap: wrap; gap: $sp-3; margin-top: $sp-5;
  // 播放全部 / 添加到播放列表由 PlayAllButton 自带样式，这里只管收藏按钮
  .detail-subscribe {
    display: inline-flex; align-items: center; gap: $sp-2;
    border-radius: $radius-pill; padding: $sp-3 $sp-5;
    font: inherit; font-weight: 600; cursor: pointer;
    border: 1px solid var(--c-border-strong);
    background: transparent;
    color: var(--c-text-secondary);

    &.is-on {
      border-color: var(--c-accent);
      color: var(--c-accent);
    }

    .subCount {
      font-size: .72rem;
      font-weight: 500;
      color: var(--c-text-tertiary);
      font-variant-numeric: tabular-nums;
    }

    &.is-on .subCount { color: inherit; opacity: .8; }

    &:disabled { opacity: .5; cursor: default; }
  }
}
</style>
