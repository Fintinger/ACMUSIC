<template>
  <div class="comment-content">
    <div class="comment-item" v-for="cm in list" :key="cm.commentId">
      <div v-if="cm.user" class="avatar"><img :src="cm.user.avatarUrl" alt=""></div>
      <div v-if="cm.user" class="main">
        <div class="name">
          <span class="nickname" @click="uClk(cm.user.userId)">{{ cm.user.nickname }}</span>
          <span v-if="cm.user.avatarDetail" class="identityIcon"><img :src="cm.user.avatarDetail.identityIconUrl" alt=""></span>
          <span class="time-tag">{{ cm.time | formatMs("MM月DD日 HH:mm") }}</span>
        </div>
        <div class="content">{{ cm.content }}</div>
        <div class="time-ribbon">
          <div class="ribbon">
            <span class="comment-like">
              <span class="like" @click="handleLike($event,cm)">
                <i v-if="!cm.liked" class="ac-font ac-like"></i>
                <i v-if="cm.liked" class="ac-font ac-likefill"></i>
              </span>
              <span class="like-count">{{ cm.likedCount | div1w }}</span>
            </span>
            <span class="comment-reply">
              <i class="ac-font ac-comment" @click="replyComment(cm)"></i>
              <span class="reply-count">{{ cm.replyCount | div1w }}</span>
            </span>
            <span v-if="cm.user.userId===loggedUser.userId" class="comment-delete">
              <el-button size="mini" type="text" @click="deleteComment(cm)">删除</el-button>
            </span>
          </div>
        </div>
      </div>
    </div>
    <div v-if="replyTarget" class="comment-overlay" @click.self="replyTarget = null" @keydown.esc="replyTarget = null">
      <div class="comment-dialog">
        <div class="dialog-header">
          <div>
            <h3>回复 @{{ replyTarget.user.nickname }}</h3>
            <p class="dialog-subtitle">文明交流，理性讨论。</p>
          </div>
          <button class="dialog-close" @click="replyTarget = null"><i class="el-icon-close"></i></button>
        </div>
        <div class="dialog-body">
          <SendComment :comment-id="replyTarget.commentId" :sid="id" :stype="type" :type="2" @reply="replyTarget = null"/>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import * as comment from "@/api/Comment";
import SendComment from "@/components/SendComment";

export default {
  name: "CommentContentLayout",
  components: {SendComment},
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
    }
  },
  data() {
    return {
      replyTarget: null,
    }
  },
  methods: {
    handleLike(evt, cm) {
      let t = cm.liked ? 0 : 1;
      console.log(cm);
      comment.like(this.id, cm.commentId, t, this.type).then(res => {
        if (res.data.code === 200) {
          this.toggleLike(evt)
          console.log(res.data);
        } else {
          this.alertErr()
        }
      })
    },
    toggleLike(evt) {
      const like = "ac-likefill", unlike = "ac-like";
      const likeCount = evt.target.parentElement.nextElementSibling.innerHTML * 1
      if (evt.target.classList.contains(like)) {
        //取消赞
        evt.target.classList.replace(like, unlike)
        evt.target.parentElement.nextElementSibling.innerText = likeCount - 1
        this.alertUnlike()
      } else {
        //点赞
        evt.target.classList.replace(unlike, like)
        evt.target.parentElement.nextElementSibling.innerText = likeCount + 1
        this.alertLike()
      }
    },
    alertLike() {
      this.$message({
        message: '点赞成功',
        type: 'success'
      });
    },
    alertUnlike() {
      this.$message.error("取消点赞")
    },
    alertErr() {
      this.$message.error("出现错误")
    },
    replyComment(cm) {
      this.replyTarget = cm;
    },
    deleteComment(cm) {
      this.$confirm('此操作将永久删除该评论, 是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        comment.del(this.type, this.id, cm.commentId).then(res => {
          console.log(res);
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