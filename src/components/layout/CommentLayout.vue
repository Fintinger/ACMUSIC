<template>
  <div class="comment-container">
    <el-row class="send-top-comment clearfix">
      <el-col :span="12">
        <el-row class="send-comment">
          <SendComment :sid="id" :stype="type" :type="1" @updateNewestComment="getCommentByParams"/>
        </el-row>
      </el-col>
      <el-col :span="12">
        <el-row class="top-comment">
          <CommentContentLayout :id="id" :list="hotComment" :type="type"/>
        </el-row>
      </el-col>
    </el-row>

    <el-row v-if="newComment.length" class="comment-content-list">
      <h2>最新评论({{ count }})</h2>
      <!--点赞之后更新评论-->
      <CommentContentLayout :id="id" :list="newComment" :type="type" @updateNewestComment="getCommentByParams"/>
    </el-row>
    <!--获取到评论为空-->
    <el-row v-else>
      <p>暂无评论</p>
    </el-row>
    <el-row class="load-more">
      <LoadMore :load="loadMoreNewComment" :loading="loading" :no-more="noMore"/>
    </el-row>
  </div>
</template>

<script>
import * as comment from "@/api/Comment";
import SendComment from "@/components/SendComment";
import CommentContentLayout from "@/components/layout/CommentContentLayout";
import LoadMore from "@/components/LoadMore";

export default {
  name: "CommentLayout",
  props: {
    type: {
      required: true,
      type: String,
    },
    id: {
      required: true,
    },
  },
  components: {SendComment, CommentContentLayout, LoadMore},
  data() {
    return {
      count: 0,
      newComment: [],
      hotComment: [],
      like: false,
      cursor: "",
      loading: false,
      page: 1,
    }
  },
  watch: {
    id: {
      immediate: true,
      handler() {
        this.getCommentByParams()
      }
    },
  },
  computed: {
    noMore() {
      return this.hotComment.length === this.count
    }
  },
  methods: {
    uClk(uid) {
      this.$bus.$emit('uClk', uid)
    },
    loadMoreNewComment() {
      this.loading = true
      this.page++
      comment.gain(this.id, this.type, {
        pageNo: this.page,
        pageSize: 20,
        sortType: 3,
        cursor: this.cursor,
      }).then(res => {
        this.cursor = res.data.data.cursor
        this.newComment.push(...res.data.data.comments)
        this.loading = false
      })
    },
    getCommentByParams() {
      this.$axios.all([this.getNewestComment(), this.getHotComment()])
          .then(this.$axios.spread((newestCm, hotCm) => {
            //最新评论
            this.count = newestCm.data.data.totalCount
            this.cursor = newestCm.data.data.cursor
            this.newComment = newestCm.data.data.comments
            //热评
            this.hotComment = hotCm.data.data.comments
          }))
    },
    //获取全部最新评论
    getNewestComment() {
      return comment.gain(this.id, this.type, {
        pageNo: 1,
        pageSize: 20,
        sortType: 3,
        //避免刷新走缓存
        t: new Date().getTime(),
      })
    },
    //获取5条热度最高的评论
    getHotComment() {
      return comment.gain(this.id, this.type, {
        pageNo: 1,
        pageSize: 5,
        sortType: 2,
        //避免刷新走缓存
        t: new Date().getTime(),
      })
    },
  },
}
</script>

<style scoped lang="scss">
@import "src/assets/scss/comment/commentLayout";
</style>