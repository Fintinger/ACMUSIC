<template>
  <div class="comment">
    <el-row>
      <el-col class="avatar" :span="4" >
        <img :src="profile.avatarUrl" alt="">
      </el-col>
      <el-col class="input-box" :span="16">
        <el-input
            v-model="commentContent"
            maxlength="140"
            placeholder="发表你的评论"
            rows="8"
            show-word-limit
            size="medium"
            type="textarea"
        >
        </el-input>
      </el-col>

      <el-col :span="4">
        <div class="btn-send row-col-center">
          <span @click="sendComment">发 送</span>
        </div>
      </el-col>
    </el-row>

  </div>
</template>

<script>
import {send} from "@/api/Comment";

export default {
  name: "SendComment",
  props: {
    type: {
      required: true,
    },
    stype: {
      required: true,
    },
    sid: {
      required: true,
    },
    commentId: {},
  },
  data() {
    return {
      commentContent: "",
    }
  },
  computed: {
    profile() {
      return this.$store.getters["UserAbout/userProfile"]
    },
    params() {
      return [this.type, this.stype, this.sid, this.commentContent, this.commentId]
    }
  },
  methods: {
    sendComment() {
      if (this.commentContent) {
        send(...this.params).then(res => {
          //是回复评论
          if (this.type * 1 === 2) {
            this.$emit('reply')
          }
          this.$emit('updateNewestComment')
          this.commentContent = ""
          console.log(res);
        })
      } else {
        alert('评论不为空')
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/comment/sendComment";
</style>