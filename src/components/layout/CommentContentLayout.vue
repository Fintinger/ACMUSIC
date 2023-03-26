<template>
  <div class="comment-content">
    <el-row class="comment-item" v-for="cm in list" :key="cm.commentId" :gutter="20">
      <el-col v-if="cm.user" :span="2" class="avatar"><img :src="cm.user.avatarUrl" alt=""></el-col>
      <el-col v-if="cm.user" :span="20" class="main">
        <el-row class="name">
          <span class="nickname" @click="uClk(cm.user.userId)">{{ cm.user.nickname }}</span>
          <span v-if="cm.user.avatarDetail" class="identityIcon"><img :src="cm.user.avatarDetail.identityIconUrl"
                                                                      alt=""
                                                                      style="height: 1rem;width: auto;"></span>
        </el-row>
        <el-row class="content">{{ cm.content }}</el-row>
        <el-row class="time-ribbon">
          <el-col :span="12" class="time">
            {{ cm.time | formatMs("YYYY年MM月DD日") }}
          </el-col>
          <el-col :span="12" class="ribbon">
            <span class="comment-like">
              <span class="like" @click="handleLike($event,cm)">
              <i v-if="!cm.liked" class="ac-font ac-like"></i>
              <i v-if="cm.liked" class="ac-font ac-likefill"></i>
              </span>
              <span class="like-count">{{ cm.likedCount | div1w }}</span>
            </span>
            <span class="comment-reply">
              <i class="ac-font ac-comment" @click="replyComment(cm)"></i>
              <!--             -->
              <el-dialog :key="cm.commentId" :visible.sync="openComment">
                <span slot="title">回复{{ replyName }}</span>
              <SendComment :comment-id="cm.commentId" :sid="id" :stype="type" :type="2" @reply="openComment=false"/>
              </el-dialog>
            <span class="reply-count">{{ cm.replyCount|div1w }}</span>
          </span>
<!--            <span>{{ cm.user.userId }}==={{ $store.state}}</span>-->
            <span v-if="cm.user.userId===loggedUser.userId" class="comment-delete">
              <el-button size="mini" type="text" @click="deleteComment(cm)">删除</el-button>
            </span>
          </el-col>
        </el-row>
      </el-col>
    </el-row>
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
      openComment: false,
      replyName: "",
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
      this.openComment = true;
      this.replyName = cm.user.nickname;
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