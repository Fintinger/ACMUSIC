<template>
  <div v-cloak class="listDetail">
    <div class="listInfo">
      <PlaylistInfoSkeleton v-if="infoLoading"/>
      <el-row v-else>
        <el-col :span="6">
          <div class="imgContainer">
            <cover-image :alt="listInfo.name + '的封面'" :src="listInfo.coverImgUrl" eager />
          </div>
        </el-col>
        <el-col class="info" :span="12">
          <div class="info-wrap">
            <scoText class="listName">{{ listInfo.name }}</scoText>
            <el-row class="creator">
              By <span class="name" @click="uClk(creator.userId)">{{ creator.nickname }}</span>
            </el-row>
                      <el-row class="listTag">
                        <span class="listCount">{{ listInfo.trackCount }}首</span> | <span class="play-count">播放{{ listInfo.playCount | Div1w(listInfo.playCount) }}</span>
                      </el-row>
            <el-row class="listTime">创建于{{ listInfo.createTime |formatMs("YYYY年MM月DD日") }}，最后更新于{{ listInfo.updateTime|fromNow }}</el-row>
            <el-row class="listDescription">
              <pre v-text="listInfo.description"></pre>
            </el-row>
            <!-- 只有歌单创建者能编辑：订阅来的歌单改不了 -->
            <el-row v-if="isOwner" class="ownerActions">
              <button class="actBtn" :disabled="saving" @click="openEdit">编辑信息</button>
              <button class="actBtn" :class="{ active: manageMode }" @click="toggleManage">
                {{ manageMode ? '完成管理' : '管理歌曲' }}
              </button>
              <span v-if="manageMode" class="actHint">
                {{ allLoaded ? '可调整顺序与移出歌曲' : '还有歌曲未加载，顺序调整需先加载全部' }}
              </span>
            </el-row>
          </div>
        </el-col>
      </el-row>
    </div>
    <div class="songs-comment">
      <el-tabs v-model="activeName">
        <el-tab-pane label="歌曲" name="songs">
          <TrackListSkeleton v-if="initialLoading"/>
          <template v-else>
            <TracksLayout :list="songs" :show-actions="isOwner && manageMode">
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
            <LoadMore :load="load" :loading="loading" :noMore="noMore"/>
          </template>
        </el-tab-pane>
        <el-tab-pane label="评论" name="comment">
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
import LoadMore from "@/components/LoadMore";
import TracksLayout from "@/components/layout/TracksLayout";
import CommentLayout from "@/components/layout/CommentLayout";
import PlaylistInfoSkeleton from "@/components/Skeleton/PlaylistInfoSkeleton";
import TrackListSkeleton from "@/components/Skeleton/TrackListSkeleton";

import scoText from "@/components/scoText";
import CoverImage from "@/components/common/CoverImage";
import * as playlistApi from "@/api/Playlist";

export default {
  name: "listDetail",
  components: {LoadMore, TracksLayout, CommentLayout, PlaylistInfoSkeleton, TrackListSkeleton, scoText, CoverImage},
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
      return this.trackCount === this.songs.length
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
     * 歌曲是否已全部加载。排序接口要求提交**完整** id 序列，
     * 只传已加载的一部分会把后面的歌全挤到最后，所以未加载完不允许调整顺序。
     */
    allLoaded() {
      const total = this.listInfo && this.listInfo.trackCount
      return !total || this.songs.length >= total
    }
  },
  methods: {
    loadSongs(id, limit) {
      return playlistApi.getAllTrack(id, {
        limit: limit || this.params.limit,
        offset: this.params.offset
      }).then(res => {
        const songs = (res.data && res.data.songs) || []
        songs.forEach(val => {
          if (this.songs.findIndex(item => item.id === val.id) === -1) {
            this.songs.push(val)
          }
        })
        this.params.offset++
      }).catch(() => {
        // 失败不推进 offset, 允许重试同一页
      }).finally(() => {
        // 请求失败也必须恢复, 否则"加载中..."永久卡死
        this.loading = false
        this.initialLoading = false
      })
    },
    load() {
      if (this.loading || this.noMore) return
      this.loading = true
      this.loadSongs(this.id)
    },
    songClk(song) {
      this.$bus.$emit('songClk', song)
    },
    uClk(uid) {
      this.$bus.$emit('uClk', uid)
    },
    // ---------- 歌单管理（仅创建者入口）----------
    /**
     * 统一解析写接口结果：上游写接口有 {code:200} 和 {status:200} 两种形态，
     * 没有 code/status 字段时按 HTTP 成功处理，避免把成功误判成失败。
     */
    _writeResult(res, fallback) {
      const d = (res && res.data) || {}
      const code = d.code !== undefined ? d.code : d.status
      if (code === undefined || code === null || Number(code) === 200) return {ok: true}
      const msg = d.message || d.msg || (d.data && d.data.message) || fallback
      return {ok: false, message: msg}
    },
    openEdit() {
      this.editForm.name = this.listInfo.name || ''
      this.editForm.desc = this.listInfo.description || ''
      this.editVisible = true
    },
    async saveEdit() {
      const name = (this.editForm.name || '').trim()
      if (!name) {
        this.$message.warning('歌单名不能为空')
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
        this.$message.success('歌单信息已更新')
      } catch (e) {
        this.$message.error('保存失败：' + (e.message || '请稍后重试'))
      } finally {
        this.saving = false
      }
    },
    toggleManage() {
      this.manageMode = !this.manageMode
      if (this.manageMode && !this.allLoaded) {
        this.$message.info('还有歌曲未加载，调整顺序前请先把列表加载到底')
      }
    },
    /** 上移/下移：先本地交换，提交成功才落地，失败保持原顺序 */
    async moveTrack(index, dir) {
      const target = index + dir
      if (this.saving || target < 0 || target >= this.songs.length) return
      if (!this.allLoaded) {
        this.$message.warning('还有歌曲未加载，请先加载全部歌曲再调整顺序')
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
        this.$message.error('调整顺序失败：' + (e.message || '请稍后重试'))
      } finally {
        this.saving = false
      }
    },
    async removeTrack(track) {
      if (this.saving || !track || !track.id) return
      try {
        await this.$confirm(`把《${track.name || '这首歌'}》从歌单移出？`, '移出歌曲', {
          type: 'warning', confirmButtonText: '移出', cancelButtonText: '取消'
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
        this.$message.success('已移出歌单')
      } catch (e) {
        this.$message.error('移出失败：' + (e.message || '请稍后重试'))
      } finally {
        this.saving = false
      }
    }
  },
  activated() {
    this.songs = []
    this.listInfo = {}
    this.creator = {}
    this.infoLoading = true
    this.initialLoading = true
    this.manageMode = false
    this.editVisible = false
    this.params.limit = this.LIMIT
    this.params.offset = this.OFFSET
    playlistApi.detail(this.id).then(res => {
      // 上游对不存在的歌单/匿名歌单会返回 playlist 缺失或 creator 为 null，
      // 直接赋值会让模板里的 creator.nickname 抛 render 错（整页白一块）。
      const pl = (res.data && res.data.playlist) || {}
      this.listInfo = pl
      this.creator = pl.creator || {}
    }).catch(() => {
      // 取详情失败：保持已清空的空态，由骨架屏/空列表兜住，不再向外抛
    }).finally(() => { this.infoLoading = false })
    this.loadSongs(this.id)
  }
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
    color: #999;
  }
}

.actBtn {
  height: 28px;
  padding: 0 14px;
  border-radius: 14px;
  border: 1px solid rgba(0, 0, 0, .12);
  background: transparent;
  font-size: .78rem;
  color: #555;
  cursor: pointer;
  transition: all .2s;

  &:hover:not(:disabled) {
    border-color: #8685EF;
    color: #8685EF;
  }

  &.active {
    background: #8685EF;
    border-color: #8685EF;
    color: #fff;
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
  background: rgba(0, 0, 0, .05);
  color: #555;
  font-size: .8rem;
  cursor: pointer;
  transition: all .15s;

  &:hover:not(:disabled) {
    background: rgba(134, 133, 239, .16);
    color: #8685EF;
  }

  &.danger:hover:not(:disabled) {
    background: rgba(220, 38, 38, .12);
    color: #dc2626;
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
    color: #888;
    margin: .9rem 0 .35rem;

    &:first-child {
      margin-top: 0;
    }
  }
}
</style>