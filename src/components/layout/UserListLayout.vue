<template>
  <ul class="userGrid">
    <li v-for="u in list" :key="u.userId" class="userItem">
      <div class="hitArea" @click="uClk(u.userId)">
        <div class="avatar">
          <cover-image :src="u.avatarUrl || ''" :alt="(u.nickname || '用户') + '的头像'"/>
        </div>
        <div class="info">
          <p class="name" :title="u.nickname">
            {{ u.nickname }}
            <i v-if="u.gender===1" class="el-icon-male"></i>
            <i v-if="u.gender===2" class="el-icon-female"></i>
          </p>
          <p class="sign" v-if="u.signature" :title="u.signature">{{ u.signature }}</p>
          <p class="meta">
            <span v-if="u.followeds != null">{{ u.followeds }} 粉丝</span>
            <span v-if="u.follows != null">{{ u.follows }} 关注</span>
            <!-- 关注时长：只有 /user/followeds 带 time（对方关注 TA 的时间），/user/follows 恒为 0 不显示 -->
            <span v-if="u.time > 0" class="since" :title="formatMs(u.time, 'YYYY.MM.DD') + ' 关注'">
              {{ followDaysText(u.time) }}
            </span>
          </p>
        </div>
      </div>
      <!-- 操作按钮只在粉丝列表出现，且必须登录、且不是我自己 -->
      <button v-if="showAction && !isMe(u)" class="actBtn" :class="{ 'is-mutual': isMutual(u) }"
              :disabled="!!pending[u.userId]" @click.stop="onAction(u)">
        <i v-if="pending[u.userId]" class="el-icon-loading"></i>
        <template v-else-if="isMutual(u)">互相关注</template>
        <template v-else>回关</template>
      </button>
    </li>
  </ul>
</template>

<script>
/**
 * UserListLayout
 * 用户卡片网格：用户详情页的「关注 / 粉丝」列表共用。
 * 与 ArtistLayout 等 layout 组件一致，点击只发 $bus 事件，跳转由 App.vue 统一处理。
 *
 * mode:
 *   'list'      → 纯列表（关注列表用），不显示操作按钮
 *   'followeds' → 粉丝列表，右侧显示「回关 / 互相关注」按钮
 *
 * 按钮状态只有一个来源：列表项自带的 mutual 字段（/user/followeds 每项都有），
 * 不额外逐条打 /user/mutualfollow/get —— 30 条就是 30 次请求，且列表字段和它同源。
 */
import CoverImage from "@/components/common/CoverImage";
import { followDaysText, followSpanText, formatMs } from "@/utils/filters";
import { followUser, followMixed } from "@/api/User";
import { isLoggedIn } from "@/utils/auth";

// 找「我关注 TA 的时长」时最多翻几页 /user/follow/mixed，防关注过多时无限拉
const SPAN_MAX_PAGES = 8;
const SPAN_PAGE_SIZE = 30;

export default {
  name: "UserListLayout",
  components: { CoverImage },
  props: {
    list: {
      type: Array,
      required: true,
    },
    mode: {
      type: String,
      default: 'list',
    },
  },
  data() {
    return {
      // 正在请求中的用户 id → true，防重复点击
      pending: {},
      // uid → { followDay, mutualFollowDay }：从 /user/follow/mixed 查到后缓存，避免重复翻页
      spanCache: {},
      // 登录态：mounted 时读一次 cookie。不用 UserAbout/isLogin getter ——
      // 它内部直接调 isLoggedIn()、无响应式依赖，会被 Vue 永久缓存，会话中途登录后仍是 false
      loggedIn: false,
    }
  },
  computed: {
    isLogin() {
      return this.loggedIn
    },
    // state 优先、getter（localStorage）兜底，兼顾首屏与补资料后的重算
    myId() {
      const st = this.$store.state.UserAbout.profile
      if (st && st.userId) return st.userId
      return (this.$store.getters["UserAbout/userProfile"] || {}).userId
    },
    showAction() {
      return this.mode === 'followeds' && this.isLogin
    },
  },
  mounted() {
    this.loggedIn = isLoggedIn()
  },
  methods: {
    followDaysText,
    followSpanText,
    formatMs,
    uClk(uid) {
      this.$bus.$emit('uClk', uid)
    },
    isMe(u) {
      return !!this.myId && u.userId === this.myId
    },
    isMutual(u) {
      return !!u.mutual
    },
    onAction(u) {
      if (this.pending[u.userId]) return
      if (this.isMutual(u)) this.openUnfollowConfirm(u)
      else this.doFollow(u)
    },
    setPending(uid, val) {
      this.$set(this.pending, uid, val)
    },
    /**
     * 查「我关注 TA 多久 / 互关多久」。
     * 数据只在 /user/follow/mixed 的 records 里（followDay / mutualFollowDay 是官方算好的文案），
     * 而它没有「按 uid 查单个」的能力，只能游标翻页找。
     * 所以：命中就缓存，最多翻 SPAN_MAX_PAGES 页，找不到就放弃（弹窗降级）。
     */
    async findFollowSpan(uid) {
      if (this.spanCache[uid] !== undefined) return this.spanCache[uid]
      let cursor = 0
      for (let page = 0; page < SPAN_MAX_PAGES; page++) {
        const res = await followMixed(2, SPAN_PAGE_SIZE, cursor)
        const data = (res && res.data && res.data.data) || {}
        const records = data.records || []
        const hit = records.find(r => r.type === 1 && r.followId === uid)
        if (hit) {
          const span = { followDay: hit.followDay || '', mutualFollowDay: hit.mutualFollowDay || '' }
          this.$set(this.spanCache, uid, span)
          return span
        }
        const p = data.page || {}
        if (!p.more || p.cursor === undefined || p.cursor === null) break
        cursor = p.cursor
      }
      this.$set(this.spanCache, uid, null)
      return null
    },
    /** 回关：直接把 TA 关注回来 */
    doFollow(u) {
      this.setPending(u.userId, true)
      followUser(u.userId, 1)
        .then(res => {
          const code = res && res.data && res.data.code
          if (code === 200) {
            this.$set(u, 'mutual', true)
            this.$set(u, 'followed', true)
            // 关系重建 → 时长从此刻重新计算，丢掉旧缓存
            this.$delete(this.spanCache, u.userId)
            this.$toast.success(`已回关 ${u.nickname}`)
          } else if (code === 301 || code === 302) {
            this.$toast.warning('登录态已失效，请重新登录后再试')
          } else {
            this.$toast.error('关注失败，请稍后重试')
          }
        })
        .catch(() => this.$toast.error('网络错误，关注失败'))
        .finally(() => this.setPending(u.userId, false))
    },
    /**
     * 取消关注前的确认。
     * 时长优先用 /user/follow/mixed 的官方文案（followDay「2年77天」/ mutualFollowDay）；
     * 查不到（未登录、翻页上限、对方不在关注列表）时降级为列表项 time 算出的
     * 「对方已关注你 N 天」—— 这项来自 /user/followeds，一定有，且绝不编造。
     * 点击时先拉数据再弹窗，按钮在此期间显示 loading，避免弹窗内容闪烁。
     */
    async openUnfollowConfirm(u) {
      this.setPending(u.userId, true)
      let span = null
      try {
        span = await this.findFollowSpan(u.userId)
      } catch (e) {
        span = null
      }
      this.setPending(u.userId, false)

      const h = this.$createElement
      const rows = []
      if (span && span.followDay) {
        rows.push(this.buildSpanRow(h, '已关注：', span.followDay))
      }
      if (span && span.mutualFollowDay) {
        rows.push(this.buildSpanRow(h, '互相关注：', span.mutualFollowDay))
      }
      if (!rows.length) {
        const own = followSpanText(u.time)
        if (own) rows.push(this.buildSpanRow(h, '对方已关注你：', own))
      }

      const message = h('div', { style: 'line-height:1.7' }, [
        h('p', { style: 'margin:0' }, `取消后你将不再关注「${u.nickname}」，互相关注状态会被解除。`),
        ...rows,
        h('p', { style: 'margin:10px 0 0;color:#999;font-size:12px' }, '取消后关注时长将重新计算。'),
      ])
      this.$confirmBox({
        title: '取消关注',
        message,
        confirmText: '仍然取消',
        cancelText: '继续关注',
        distinguishCancelAndClose: true,
      })
        .then(() => this.doUnfollow(u))
        .catch(() => { /* 继续关注：什么都不做 */ })
    },
    buildSpanRow(h, label, value) {
      return h('p', { style: 'margin:10px 0 0;color:#555' },
        [label, h('b', { style: 'color:#8685EF;font-weight:600;margin-left:2px' }, value)])
    },
    doUnfollow(u) {
      this.setPending(u.userId, true)
      followUser(u.userId, 0)
        .then(res => {
          const code = res && res.data && res.data.code
          if (code === 200) {
            this.$set(u, 'mutual', false)
            this.$set(u, 'followed', false)
            // 关系解除 → 时长作废，下次再关注时从新时间重新算
            this.$delete(this.spanCache, u.userId)
            // 只翻关系状态：u.time 是「TA 关注我」的时间，取关不影响它（TA 还在我的粉丝里）
            this.$toast.success(`已取消关注 ${u.nickname}`)
          } else if (code === 301 || code === 302) {
            this.$toast.warning('登录态已失效，请重新登录后再试')
          } else {
            this.$toast.error('取消关注失败，请稍后重试')
          }
        })
        .catch(() => this.$toast.error('网络错误，取消关注失败'))
        .finally(() => this.setPending(u.userId, false))
    },
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/base/variables";

.userGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;

  @media (max-width: 900px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 600px) { grid-template-columns: 1fr; }
}

.userItem {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255,255,255,.72);
  border: 1px solid rgba(0,0,0,.05);
  transition: transform .25s, box-shadow .25s, border-color .25s;

  &:hover {
    transform: translateY(-3px);
    border-color: rgba($color-main, .35);
    box-shadow: 0 8px 24px rgba(0,0,0,.08);
  }
}

/* 头像+信息整块可点，避免按钮区域误触跳转 */
.hitArea {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  min-width: 0;
  cursor: pointer;

  &:active { transform: scale(.98); }
}

.avatar {
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  overflow: hidden;
  background: $color-theme-sec;

  img { width: 100%; height: 100%; object-fit: cover; display: block; }
}

.info { flex: 1; min-width: 0; }

.name {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: $font-black;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  i { flex-shrink: 0; font-size: 14px; line-height: 1; }
  i.el-icon-male { color: #47a1ce; }
  i.el-icon-female { color: #ff86b6; }
}

.sign {
  margin: 4px 0 0;
  font-size: 12px;
  color: $font-black-2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 4px 0 0;
  font-size: 12px;
  color: $font-black-2;
}

// 关注时长：跟粉丝数/关注数区分开，用主题色标出来
.since {
  color: $color-main;
  white-space: nowrap;
}

/* 右侧操作按钮 */
.actBtn {
  flex-shrink: 0;
  min-width: 76px;
  height: 30px;
  padding: 0 12px;
  border-radius: 15px;
  font-size: 12px;
  cursor: pointer;
  transition: all .2s;
  border: 1px solid $color-main;
  background: transparent;
  color: $color-main;

  &:hover { background: rgba($color-main, .1); }

  // 已互关：实心，hover 时提示可取消
  &.is-mutual {
    border-color: rgba(0,0,0,.12);
    background: $color-theme-sec;
    color: $font-black-1;

    &:hover {
      border-color: #f56c6c;
      color: #f56c6c;
      background: rgba(245,108,108,.08);
    }
  }

  &:disabled { cursor: default; opacity: .6; }
}
</style>
