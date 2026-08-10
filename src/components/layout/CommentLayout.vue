<template>
  <div class="comment-container">
    <div class="comment-header-bar">
      <h2>评论</h2>
    </div>

    <button class="floating-comment-btn" @click="showCommentModal = true">
      <BaseIcon name="edit"/> 写评论
    </button>

    <div v-if="hotComment.length" class="hot-comments-section">
      <h3><span class="fire-icon">🔥</span> 热门评论</h3>
      <CommentContentLayout :id="id" :list="hotComment" :type="type"/>
      <div class="section-divider"></div>
    </div>

    <div v-if="newComment.length" class="new-comments-section">
      <h3>最新评论 ({{ count }})</h3>
      <CommentContentLayout :id="id" :list="newComment" :type="type" @updateNewestComment="getCommentByParams"/>
    </div>
    <div v-else-if="!hotComment.length" class="empty-state">
      <p>暂无评论</p>
    </div>

    <div class="load-more">
      <LoadMore :load="loadMoreNewComment" :loading="loading" :no-more="noMore"/>
    </div>

    <transition name="overlay-fade">
      <div v-if="showCommentModal" class="comment-overlay" @click.self="showCommentModal = false" @keydown.esc="showCommentModal = false">
        <transition name="modal-slide">
          <div v-if="showCommentModal" class="comment-dialog">
            <div class="dialog-header">
              <div>
                <h3>发表评论</h3>
                <p class="dialog-subtitle">分享你的听歌感受，与大家一起交流音乐。</p>
              </div>
              <button class="dialog-close" @click="showCommentModal = false"><BaseIcon name="close"/></button>
            </div>
            <div class="dialog-body">
              <SendComment :sid="id" :stype="type" :type="1" @updateNewestComment="onCommentSent" @cancel="showCommentModal = false"/>
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
import CommentContentLayout from "@/components/layout/CommentContentLayout";
import LoadMore from "@/components/LoadMore";

export default {
  name: "CommentLayout",
  props: {
    type: { required: true, type: String },
    id: { required: true },
  },
  components: { SendComment, CommentContentLayout, LoadMore },
  data() {
    return {
      count: 0,
      newComment: [],
      hotComment: [],
      cursor: "",
      loading: false,
      page: 1,
      showCommentModal: false,
    }
  },
  watch: {
    id: {
      immediate: true,
      handler() {
        this.page = 1
        this.newComment = []
        this.getCommentByParams()
      }
    },
    showCommentModal(val) {
      this.$emit(val ? 'modal-open' : 'modal-close')
    },
  },
  computed: {
    noMore() {
      return this.newComment.length >= this.count
    }
  },
  methods: {
    loadMoreNewComment() {
      if (this.loading || this.noMore) return
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
      }).catch(() => { this.loading = false })
    },
    getCommentByParams() {
      this.$axios.all([this.getNewestComment(), this.getHotComment()])
        .then(this.$axios.spread((newestCm, hotCm) => {
          this.count = newestCm.data.data.totalCount
          this.cursor = newestCm.data.data.cursor
          this.newComment = newestCm.data.data.comments || []
          this.hotComment = hotCm.data.data.comments || []
        }))
    },
    getNewestComment() {
      return comment.gain(this.id, this.type, {
        pageNo: 1, pageSize: 20, sortType: 3,
        t: new Date().getTime(),
      })
    },
    getHotComment() {
      return comment.gain(this.id, this.type, {
        pageNo: 1, pageSize: 5, sortType: 2,
        t: new Date().getTime(),
      })
    },
    onCommentSent() {
      this.showCommentModal = false
      this.page = 1
      this.newComment = []
      this.getCommentByParams()
    },
  },
}
</script>

<style scoped lang="scss">
@import "src/assets/scss/comment/commentLayout";
</style>