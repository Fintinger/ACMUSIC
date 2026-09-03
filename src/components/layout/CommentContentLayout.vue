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
              <span class="like-count">{{ cm.likedCount | div1w }}</span>
            </span>
            <span class="comment-reply">
              <BaseIcon name="comment" @click="replyComment(cm)"/>
              <span class="reply-count">{{ cm.replyCount | div1w }}</span>
            </span>
            <span v-if="cm.user.userId===loggedUser.userId" class="comment-delete">
              <el-button size="mini" type="text" @click="deleteComment(cm)">删除</el-button>
            </span>
          </div>
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
              <SendComment :comment-id="replyTarget.commentId" :sid="id" :stype="type" :type="2" @reply="replyTarget = null"/>
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
      likePending: {}
    }
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
    replyComment(cm) {
      this.replyTarget = cm;
    },
    uClk(uid) {
      this.$bus.$emit('uClk', uid)
    },
    deleteComment(cm) {
      this.$confirm('此操作将永久删除该评论, 是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        comment.del(this.type, this.id, cm.commentId).then(res => {
          //更新最新评论数据
          this.$emit('updateNewestComment')
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