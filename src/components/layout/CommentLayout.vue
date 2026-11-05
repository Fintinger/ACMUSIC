<template>
  <div class="comment-container" :aria-busy="initialLoading || loading">
    <div class="comment-header-bar">
      <h2>评论</h2>
    </div>

    <button class="floating-comment-btn" @click="showCommentModal = true">
      <BaseIcon name="edit"/> 写评论
    </button>

    <div v-if="initialLoading" class="comment-status" role="status" aria-live="polite">正在加载评论…</div>
    <div v-else-if="loadError" class="comment-status" role="alert">
      <p>评论加载失败，请检查网络后重试</p><button type="button" @click="getCommentByParams">重新加载</button>
    </div>
    <div v-if="(hotError || hotLoading) && !initialLoading && !loadError" class="comment-status comment-status--inline" role="status">
      <span>{{ hotLoading ? '正在加载热门评论…' : '热门评论暂时加载失败' }}</span><button type="button" :disabled="hotLoading" @click="retryHotComment">重试热门评论</button>
    </div>
    <div v-if="hotComment.length" class="hot-comments-section">
      <h3><span class="fire-icon">🔥</span> 热门评论</h3>
      <CommentContentLayout :id="id" :list="hotComment" :type="type"/>
      <div class="section-divider"></div>
    </div>

    <div v-if="newComment.length" class="new-comments-section">
      <h3>最新评论 ({{ count }})</h3>
      <CommentContentLayout :id="id" :list="newComment" :type="type" @updateNewestComment="getCommentByParams"/>
    </div>
    <div v-else-if="!initialLoading && !loadError && !hotComment.length" class="empty-state">
      <p>暂无评论</p>
    </div>

    <div v-if="pageError" class="comment-status" role="alert"><p>更多评论加载失败，已加载的评论仍可查看</p><button type="button" @click="loadMoreNewComment">重试加载更多</button></div>
    <div class="load-more" v-if="!initialLoading && !loadError && !pageError && (!hideLoadMoreWhenEmpty || hotComment.length || newComment.length)">
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
    hideLoadMoreWhenEmpty: { type: Boolean, default: false },
  },
  components: { SendComment, CommentContentLayout, LoadMore },
  data() {
    return {
      count: 0,
      newComment: [],
      hotComment: [],
      cursor: '',
      loading: false,
      initialLoading: true,
      loadError: false,
      hotError: false,
      hotLoading: false,
      pageError: false,
      exhausted: false,
      requestVersion: 0,
      page: 1,
      showCommentModal: false,
    }
  },
  watch: {
    resourceKey: {
      immediate: true,
      handler() { this.showCommentModal = false; this.getCommentByParams() }
    },
    showCommentModal(val) {
      this.$emit(val ? 'modal-open' : 'modal-close')
    },
  },
  beforeDestroy() { this.requestVersion++ },
  computed: {
    resourceKey() { return this.type + ':' + this.id },
    noMore() {
      return this.exhausted || this.newComment.length >= this.count
    }
  },
  methods: {
    commentData(res) {
      const data = res && res.data && res.data.data
      if (!data || !Array.isArray(data.comments)) throw new Error('Invalid comment response')
      return data
    },
    async loadMoreNewComment() {
      if (this.loading || this.initialLoading || this.loadError || this.noMore) return
      const version = this.requestVersion
      const nextPage = this.page + 1
      this.loading = true
      this.pageError = false
      try {
        const res = await comment.gain(this.id, this.type, { pageNo: nextPage, pageSize: 20, sortType: 3, cursor: this.cursor })
        if (version !== this.requestVersion) return
        const data = this.commentData(res)
        this.cursor = data.cursor
        this.newComment.push(...data.comments)
        this.page = nextPage
        this.exhausted = data.hasMore === false || !data.comments.length
      } catch (_) {
        if (version === this.requestVersion) this.pageError = true
      } finally {
        if (version === this.requestVersion) this.loading = false
      }
    },
    async getCommentByParams() {
      const version = ++this.requestVersion
      this.page = 1
      this.count = 0
      this.cursor = ''
      this.newComment = []
      this.hotComment = []
      this.loading = false
      this.initialLoading = true
      this.loadError = false
      this.hotError = false
      this.hotLoading = false
      this.pageError = false
      this.exhausted = false
      if (!this.id) { this.initialLoading = false; return }
      // 热门失败不影响最新评论；分别结算，也避免 Promise 拒绝没有界面反馈。
      await Promise.all([
        this.getNewestComment().then(res => {
          if (version !== this.requestVersion) return
          const data = this.commentData(res)
          this.count = Number(data.totalCount) || 0
          this.cursor = data.cursor
          this.newComment = data.comments
          this.exhausted = data.hasMore === false
        }).catch(() => { if (version === this.requestVersion) this.loadError = true }),
        this.retryHotComment(version)
      ])
      if (version === this.requestVersion) this.initialLoading = false
    },
    async retryHotComment(requestVersion) {
      // 点击事件传入 MouseEvent；只有首屏内部调用才传数字版本。
      const version = typeof requestVersion === 'number' ? requestVersion : this.requestVersion
      if (version === this.requestVersion && this.hotLoading) return
      this.hotError = false
      this.hotLoading = true
      try {
        const res = await this.getHotComment()
        if (version === this.requestVersion) this.hotComment = this.commentData(res).comments
      } catch (_) {
        if (version === this.requestVersion) this.hotError = true
      } finally {
        if (version === this.requestVersion) this.hotLoading = false
      }
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
