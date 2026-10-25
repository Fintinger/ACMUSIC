<template>
  <div class="comment-content">
    <div class="comment-item" v-for="cm in list" :key="cm.commentId">
      <div v-if="cm.user" class="avatar"><cover-image :src="cm.user.avatarUrl" :alt="cm.user.nickname + '的头像'"/></div>
      <div v-if="cm.user" class="main">
        <div class="name">
          <span class="nickname" @click="uClk(cm.user.userId)">{{ cm.user.nickname }}</span>
          <span v-if="cm.user.avatarDetail" class="identityIcon"><cover-image :src="cm.user.avatarDetail.identityIconUrl" :alt="cm.user.nickname + '的身份标识'"/></span>
          <span class="time-tag">{{ cm.time | formatMs("MM月DD日 HH:mm") }}</span>
        </div>
        <div class="content">{{ cm.content }}</div>
        <div class="time-ribbon">
          <div class="ribbon">
            <span class="comment-like">
              <span
                class="like"
                :class="{ pending: likePending[cm.commentId] }"
                @click="toggleLike(cm)">
                <BaseIcon v-if="!cm.liked" name="like"/>
                <BaseIcon v-if="cm.liked" name="likeFill"/>
              </span>
              <span class="like-count">{{ cm.likedCount | Div1w }}</span>
            </span>
            <!-- 有楼层时: 图标+文案整块可点, 展开/收起楼中楼; 无楼层时该入口不渲染 -->
            <span
              v-if="cm.replyCount"
              class="comment-reply"
              :class="{ open: isFloorOpen(cm) }"
              @click="toggleFloor(cm)">
              <BaseIcon name="comment"/>
              <span class="reply-count">{{ replyLabel(cm) }}</span>
              <BaseIcon class="floor-arrow" :name="isFloorOpen(cm) ? 'arrowUp' : 'arrowDown'"/>
            </span>
            <span class="comment-reply-btn" @click="replyComment(cm)">回复</span>
            <span v-if="cm.user.userId===loggedUser.userId" class="comment-delete">
              <el-button size="mini" type="text" @click="deleteComment(cm)">删除</el-button>
            </span>
          </div>
        </div>

        <!-- 楼中楼：点击才请求，不做首屏预取（8 条热评全预取 = 8 个额外请求） -->
        <div v-if="isFloorOpen(cm)" class="floor-wrap">
          <div v-if="floorLoading(cm) && !floorList(cm).length" class="floor-tip">楼层加载中…</div>
          <div class="floor-item" v-for="fc in floorList(cm)" :key="fc.commentId">
            <div v-if="fc.user" class="floor-avatar">
              <cover-image :src="fc.user.avatarUrl" :alt="fc.user.nickname + '的头像'"/>
            </div>
            <div v-if="fc.user" class="floor-main">
              <div class="floor-name">
                <span class="nickname" @click="uClk(fc.user.userId)">{{ fc.user.nickname }}</span>
                <!-- 楼层只能平铺, "回复某人"只能靠 beReplied 表达; 被回复内容常为 null, 只取昵称 -->
                <span v-if="replyToName(fc)" class="reply-to">回复 @{{ replyToName(fc) }}</span>
                <span class="time-tag">{{ fc.time | formatMs("MM月DD日 HH:mm") }}</span>
              </div>
              <div class="floor-content">{{ fc.content }}</div>
              <div class="floor-ribbon">
                <span class="comment-like">
                  <span class="like" :class="{ pending: likePending[fc.commentId] }" @click="toggleLike(fc)">
                    <BaseIcon v-if="!fc.liked" name="like"/>
                    <BaseIcon v-if="fc.liked" name="likeFill"/>
                  </span>
                  <span class="like-count">{{ fc.likedCount | Div1w }}</span>
                </span>
                <span class="floor-reply-btn" @click="replyComment(fc)">回复</span>
                <span v-if="fc.user.userId===loggedUser.userId" class="comment-delete">
                  <el-button size="mini" type="text" @click="deleteComment(fc, cm)">删除</el-button>
                </span>
              </div>
            </div>
          </div>
          <div v-if="!floorLoading(cm) && !floorList(cm).length" class="floor-tip">暂无回复</div>
          <button v-if="floorHasMore(cm)" class="floor-more" :disabled="floorLoading(cm)" @click="loadFloor(cm)">
            {{ floorMoreLabel(cm) }}
          </button>
        </div>
      </div>
    </div>
    <transition name="overlay-fade">
      <div v-if="replyTarget" class="comment-overlay" @click.self="replyTarget = null" @keydown.esc="replyTarget = null">
        <transition name="modal-slide">
          <div v-if="replyTarget" class="comment-dialog">
            <div class="dialog-header">
              <div>
                <h3>回复 @{{ replyTarget.user.nickname }}</h3>
                <p class="dialog-subtitle">文明交流，理性讨论。</p>
              </div>
              <button class="dialog-close" @click="replyTarget = null"><BaseIcon name="close"/></button>
            </div>
            <div class="dialog-body">
              <SendComment :comment-id="replyTarget.commentId" :sid="id" :stype="type" :type="2" @reply="onReplySent"/>
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </div>
</template>

<script>
import * as comment from "@/api/Comment";
import SendComment from "@/components/SendComment";
import CoverImage from "@/components/common/CoverImage";
import { formatCount } from "@/utils/filters";

// 楼层每页条数。接口实测硬上限 40：传 100 / 500 都只返回 40 条且 hasMore 仍为 true，
// 所以翻页是唯一路径，不能靠调大 limit 一次性取完。
const FLOOR_PAGE_SIZE = 20

export default {
  name: "CommentContentLayout",
  components: {SendComment, CoverImage},
  props: {
    list: {
      required: true,
      type: Array,
    },
    id: {
      required: true,
    },
    type: {
      required: true,
    },
  },
  computed: {
    loggedUser() {
      return this.$store.getters["UserAbout/userProfile"]
    },
    isLogin() {
      return this.$store.getters["UserAbout/isLogin"]
    }
  },
  data() {
    return {
      replyTarget: null,
      // 单条评论点赞请求锁定：{ [commentId]: true } 表示该评论正在请求
      // 仅只锁定该评论，不影响其他评论 /不阻塞列表渲染
      likePending: {},
      // 楼层状态：{ [父评论 commentId]: { parent, open, loaded, list, hasMore, cursor, total, loading } }
      // 按需创建，默认不请求；切换资源后由 watch id 丢弃
      floors: {},
    }
  },
  watch: {
    // 切换资源（换歌 / 换歌单）必须丢弃旧楼层，否则会渲染上一条资源下的回复
    id() {
      this.floors = {}
    },
  },
  methods: {
    /**
     * 点赞 / 取消点赞评论
     * 流程：
     *   1. 登录检查（未登录直接提示，不发请求）
     *   2. 同一条评论的请求锁：避免快速连点产生并发请求
     *   3. 计算 t：根据当前 liked 状态决定点赞(1) 或 取消点赞(0)
     *   4. 调用 /comment/like（项目已有 @/api/Comment 的 like 封装）
     *   5. API 成功后：更新 cm.liked 反转 + cm.likedCount ± 1
     *   6. 失败 /网络错误：仅提示，不修改 UI（保持与服务端一致）
     *   7. 无论结果都解锁
     * 点击事件不依赖 evt.target，直接传 cm 对象，避免点击子节点导致 classList 失效
     * 楼层条目直接传 fc 也能用：/comment/like 只认 cid + 资源 id，不关心它是第几层
     */
    toggleLike(cm) {
      if (!this.isLogin) {
        this.$message.warning('请先登录')
        return
      }
      if (!cm || !cm.commentId) return
      // 同条评论并发保护
      if (this.likePending[cm.commentId]) return

      const wasLiked = !!cm.liked
      const t = wasLiked ? 0 : 1
      // 锁定该评论的点赞请求
      this.$set(this.likePending, cm.commentId, true)

      comment.like(this.id, cm.commentId, t, this.type)
        .then(res => {
          if (res && res.data && res.data.code === 200) {
            // 服务端成功 → 反映到 UI
            this.$set(cm, 'liked', !wasLiked)
            const prev = Number(cm.likedCount) || 0
            this.$set(cm, 'likedCount', Math.max(0, prev + (wasLiked ? -1 : 1)))
            this.$message.success(wasLiked ? '已取消点赞' : '点赞成功')
          } else {
            this.$message.error('操作失败，请稍后重试')
          }
        })
        .catch(err => {
          console.error('[CommentLike] failed', err)
          this.$message.error('网络错误，点赞失败')
        })
        .finally(() => {
          this.$set(this.likePending, cm.commentId, false)
        })
    },

    // ---- 楼中楼 ----
    floorState(cm) {
      return cm ? this.floors[cm.commentId] : null
    },
    isFloorOpen(cm) {
      const st = this.floorState(cm)
      return !!(st && st.open)
    },
    floorList(cm) {
      const st = this.floorState(cm)
      return st ? st.list : []
    },
    floorLoading(cm) {
      const st = this.floorState(cm)
      return !!(st && st.loading)
    },
    floorHasMore(cm) {
      const st = this.floorState(cm)
      return !!(st && st.hasMore)
    },
    /** 还没拉下来的楼层数，用于"还有 N 条"文案 */
    floorRemain(cm) {
      const st = this.floorState(cm)
      if (!st) return 0
      return Math.max(0, (Number(st.total) || 0) - st.list.length)
    },
    /**
     * "展开更多回复"按钮文案。剩余数拿不准时（totalCount 缺失）宁可不显示数字，
     * 也不要说"还有 0 条"——能否继续翻页的唯一权威是 hasMore，不是这个减法。
     */
    floorMoreLabel(cm) {
      if (this.floorLoading(cm)) return '加载中…'
      const remain = this.floorRemain(cm)
      return remain > 0 ? '展开更多回复（还有 ' + remain + ' 条）' : '展开更多回复'
    },
    /** 展开 / 收起。首次展开才发请求，之后纯本地切换 */
    toggleFloor(cm) {
      if (!cm || !cm.commentId) return
      const st = this.floorState(cm)
      if (st && st.open) {
        this.$set(st, 'open', false)
        return
      }
      if (st) {
        this.$set(st, 'open', true)
        if (!st.loaded) this.loadFloor(cm)
        return
      }
      this.$set(this.floors, cm.commentId, {
        parent: cm, open: true, loaded: false,
        list: [], hasMore: false, cursor: 0, total: 0, loading: false,
      })
      this.loadFloor(cm)
    },
    /**
     * 拉一页楼层。分页游标直接用响应里的 data.time（接口已算好"本页最后一条的 time"），
     * 不用自己从末项里抠；hasMore 才是到底标志，不能拿 totalCount 和已拉长度比来判断。
     */
    loadFloor(cm) {
      const st = this.floorState(cm)
      if (!st || st.loading) return
      if (st.loaded && !st.hasMore) return
      this.$set(st, 'loading', true)

      const args = { limit: FLOOR_PAGE_SIZE }
      if (st.cursor) args.time = st.cursor

      comment.floor(cm.commentId, this.id, this.type, args)
        .then(res => {
          const d = (res.data && res.data.data) || {}
          this.$set(st, 'list', st.list.concat(d.comments || []))
          this.$set(st, 'hasMore', !!d.hasMore)
          this.$set(st, 'cursor', d.time || 0)
          // totalCount 只在第一页（不带 time）返回真实值，翻页请求恒返回 0。
          // 无条件覆盖会把总数冲成 0，出现"还有 0 条"却还能继续翻页的鬼话
          if (d.totalCount) this.$set(st, 'total', d.totalCount)
          this.$set(st, 'loaded', true)
        })
        .catch(err => {
          console.error('[CommentFloor] failed', err)
          this.$message.error('楼层加载失败')
        })
        .finally(() => this.$set(st, 'loading', false))
    },
    /** 楼层数据失效（删掉自己的回复）后从头重拉，保留展开状态 */
    reloadFloor(parentCm) {
      const st = this.floorState(parentCm)
      if (!st) return
      this.$set(st, 'list', [])
      this.$set(st, 'cursor', 0)
      this.$set(st, 'hasMore', false)
      this.$set(st, 'loaded', false)
      this.loadFloor(parentCm)
    },
    /** 这个 cid 属于哪个已展开楼层的子项，用于回复/删除后只刷新那一楼 */
    findFloorOwner(cid) {
      for (const pid in this.floors) {
        const st = this.floors[pid]
        if (st && st.list && st.list.some(f => f.commentId === cid)) return st.parent
      }
      return null
    },
    /** 楼层的"回复 @xxx"来源 */
    replyToName(fc) {
      const r = fc && fc.beReplied && fc.beReplied[0]
      return (r && r.user && r.user.nickname) || ''
    },
    replyLabel(cm) {
      if (this.isFloorOpen(cm)) return '收起回复'
      return formatCount(cm.replyCount) + ' 条回复'
    },

    replyComment(cm) {
      this.replyTarget = cm;
    },
    /** 回复成功后：楼层内的回复只刷新本楼，顶层评论回复沿用整页刷新 */
    onReplySent() {
      const target = this.replyTarget
      this.replyTarget = null
      if (!target) return
      const owner = this.findFloorOwner(target.commentId)
      if (owner) {
        this.$set(owner, 'replyCount', (Number(owner.replyCount) || 0) + 1)
        this.reloadFloor(owner)
      } else {
        this.$emit('updateNewestComment')
      }
    },
    uClk(uid) {
      this.$bus.$emit('uClk', uid)
    },
    /**
     * 删除评论。parentCm 存在时表示删的是楼层回复：
     * 只需刷新该楼层 + 父评论回复数 -1，不必让整页列表重排（那会把已展开的楼层全部收起）
     */
    deleteComment(cm, parentCm) {
      this.$confirm('此操作将永久删除该评论, 是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        comment.del(this.type, this.id, cm.commentId).then(() => {
          if (parentCm) {
            this.$set(parentCm, 'replyCount', Math.max(0, (Number(parentCm.replyCount) || 0) - 1))
            this.reloadFloor(parentCm)
          } else {
            //更新最新评论数据
            this.$emit('updateNewestComment')
          }
          this.$message({
            type: 'success',
            message: '删除成功!'
          });
        })
      }).catch(() => {
        this.$message({
          type: 'info',
          message: '已取消删除'
        });
      });
    }
  }
}
</script>

<style scoped lang="scss">
@import "src/assets/scss/comment/commentContentLayout";
</style>
