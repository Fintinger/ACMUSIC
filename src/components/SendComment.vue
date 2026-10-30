<template>
  <div class="comment">
    <el-row>
      <el-col class="avatar" :span="4" >
        <img :src="profile.avatarUrl | https" alt="">
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
          <button class="btn-cancel" type="button" @click="$emit('cancel')">取消</button>
          <span :class="{ 'is-disabled': !canSend }" @click="sendComment">发送</span>
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
    /** 空评论直接在按钮上禁用，不再靠 alert 事后拦截 */
    canSend() {
      return !!this.commentContent.trim()
    },
    params() {
      return [this.type, this.stype, this.sid, this.commentContent, this.commentId]
    }
  },
  methods: {
    sendComment() {
      if (!this.canSend) return
      send(...this.params).then(() => {
        //是回复评论
        if (this.type * 1 === 2) {
          this.$emit('reply')
        }
        this.$emit('updateNewestComment')
        this.commentContent = ""
      }).catch(() => {
        // 原来发送失败是彻底静默的：点了发送什么反馈都没有
        this.$toast.error('评论发送失败，请稍后重试')
      })
    }
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/comment/sendComment";
</style>