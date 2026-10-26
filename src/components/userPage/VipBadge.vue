<template>
  <el-tooltip v-if="visible" effect="dark" placement="top" :open-delay="120">
    <div slot="content" class="vip-tip">
      <p class="vip-tip-title">{{ tipTitle }}</p>
      <p v-for="(line, i) in tipLines" :key="i" class="vip-tip-line">{{ line }}</p>
    </div>
    <span class="vip-badge" :class="badgeClass">
      <template v-if="blackVip.active || blackVip.expired">
        <span class="vip-badge-name">{{ vipName }}</span>
        <span v-if="blackVip.expired" class="vip-badge-state">已过期</span>
        <span v-else-if="levelText" class="vip-badge-level">{{ levelText }}</span>
      </template>
      <span v-else class="vip-badge-name">音乐包</span>
    </span>
  </el-tooltip>
</template>

<script>
import * as User from "@/api/User";
import { formatMs } from "@/utils/filters";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 昵称后面的会员小徽章（不做独立板块）。
 *
 * 两个接口的返回差异（已实测 uid=32953014）：
 *   /vip/info     → data 里只有 redVipLevel / redVipAnnualCount / redVip*Icon
 *   /vip/info/v2  → 多出 associator / musicPackage / redplus / albumVip / voiceBookVip
 *                   以及各自的 vipCode、vipLevel、expireTime
 *
 * vipCode 是「权益类型码」，不是等级：
 *   100 associator    = 黑胶VIP（VIP 和 SVIP 都有这一项）
 *   220 musicPackage  = 音乐包
 *   300 redplus       = 黑胶SVIP（升级包，SVIP 独有）
 *   400 albumVip      = 数字专辑权益（SVIP 打包附带）
 *   500 voiceBookVip  = 有声书权益（SVIP 打包附带，也可单独购买）
 *
 * SVIP 的判定只能靠 redplus —— 实测排除过的三条路：
 *   a) associator.vipCode 恒为 100，VIP / SVIP 完全一样（40 个账号抽样 0 例外）
 *   b) /user/detail 的 profile.vipType 对两者都返回 11
 *   c) redVipLevel 只是等级，SVIP 与 VIP 共用同一套等级体系（官方口径），分不出档位
 * 证据（40 个真实账号抽样 + 逐字段比对）：
 *   - redplus 与 albumVip、voiceBookVip 三者**永远同时出现**（28/28），且 expireTime 完全相同
 *     → 它们是被同一次 SVIP 订单一起发下来的，正好对应官方对 SVIP 的定义
 *       （黑胶VIP 权益 + 畅听数字专辑 + 付费有声书 + 多终端）
 *   - uid=16629617：associator 到 2026-09-18，redplus/albumVip/voiceBookVip 都停在 2025-05-09
 *     → SVIP 到期后回归普通 VIP，redplus 的到期时间独立于黑胶VIP，符合「两个独立商品」
 *   - uid=1344710603/318398276：只有 associator + 一个早已过期的 voiceBookVip，没有 redplus
 *     → 有声书可以单独买，不能反过来当 SVIP 用
 * 结论：redplus 存在且未过期 = 黑胶SVIP；只有 associator = 普通黑胶VIP。
 */
export default {
  name: "VipBadge",
  props: {
    uid: { type: [String, Number], default: '' },
    // 由父级判定是否本人（本人才能看到期时间，与官方 App 一致）
    isSelf: { type: Boolean, default: false }
  },
  data() {
    return {
      v1Body: null,
      v2Body: null,
      v1Err: '',
      v2Err: ''
    }
  },
  computed: {
    v1Data() { return (this.v1Body && this.v1Body.data) || null },
    v2Data() { return (this.v2Body && this.v2Body.data) || null },
    showExpire() {
      if (this.isSelf) return true
      const me = (this.$store.state.UserAbout.profile || {}).userId
      return me != null && String(me) === String(this.uid)
    },
    redVipLevel() {
      const d = this.v2Data || {}
      const v2Level = Number(d.redVipLevel)
      if (isFinite(v2Level) && v2Level > 0) return v2Level
      const v1Level = Number((this.v1Data || {}).redVipLevel)
      return isFinite(v1Level) ? v1Level : 0
    },
    levelText() {
      return this.redVipLevel > 0 ? 'V' + this.redVipLevel : ''
    },
    blackVip() {
      const a = (this.v2Data || {}).associator
      // v2 没拿到（只成功 v1）→ 只能凭 redVipLevel 判断有没有黑胶
      if (!a) return { active: this.redVipLevel > 0, expired: false, expireTime: 0, daysLeft: null }
      return this.rightState(a)
    },
    musicPackage() { return this.rightState((this.v2Data || {}).musicPackage) },
    // redplus = 黑胶SVIP 升级包，见文件头注释的判定依据
    svip() { return this.rightState((this.v2Data || {}).redplus) },
    albumVip() { return this.rightState((this.v2Data || {}).albumVip) },
    voiceBook() { return this.rightState((this.v2Data || {}).voiceBookVip) },
    // 黑胶（含已过期）才挂徽章；只有音乐包时用中性样式标一下，两种都没有则不渲染
    visible() { return this.blackVip.active || this.blackVip.expired || this.musicPackage.active },
    vipName() { return this.svip.active ? '黑胶SVIP' : '黑胶VIP' },
    badgeClass() {
      if (this.blackVip.active) return this.svip.active ? 'is-black is-svip' : 'is-black'
      if (this.blackVip.expired) return 'is-expired'
      return 'is-package'
    },
    tipTitle() {
      if (this.blackVip.active) {
        const name = this.svip.active ? '黑胶SVIP' : (this.svip.expired ? '黑胶VIP（SVIP 已过期）' : '黑胶VIP')
        return this.levelText ? `${name} ${this.levelText}` : name
      }
      if (this.blackVip.expired) return '黑胶VIP · 已过期'
      return '音乐包'
    },
    tipLines() {
      const lines = []
      // SVIP 是独立商品：生效时它已包含黑胶VIP 权益，不必再单独列一行 VIP；
      // 失效时反而要单独说明「SVIP 已过期、VIP 仍在」，因为两者的到期时间可以不一样。
      if (this.svip.active) {
        lines.push(this.expireLine('黑胶SVIP', this.svip))
      } else {
        if (this.blackVip.expireTime) {
          lines.push(this.expireLine('黑胶VIP', this.blackVip))
        } else if (this.blackVip.active) {
          lines.push('黑胶VIP 当前接口未返回到期时间')
        }
        if (this.svip.expired) lines.push(this.expireLine('黑胶SVIP', this.svip))
      }
      if (this.albumVip.active) lines.push(this.expireLine('数字专辑权益', this.albumVip))
      if (this.musicPackage.active) lines.push(this.expireLine('音乐包', this.musicPackage))
      if (this.voiceBook.active || this.voiceBook.expired) lines.push(this.expireLine('有声书VIP', this.voiceBook))
      return lines
    }
  },
  methods: {
    /** 一行权益描述，统一处理「本人可见 / 仅他人可见」的到期时间口径 */
    expireLine(label, st) {
      // 他人的到期时间不展示，但"有效/已过期"这个事实要照常说，否则过期权益会被读成未知
      if (!this.showExpire) return `${label} ${st.active ? '有效' : '已过期'}`
      if (!st.expireTime) return `${label} 有效`
      if (st.active) {
        const days = st.daysLeft !== null ? `（剩余 ${st.daysLeft} 天）` : ''
        return `${label} 到期 ${this.expireText(st.expireTime)}${days}`
      }
      return `${label} 已于 ${this.expireText(st.expireTime)} 过期`
    },
    /**
     * 单项权益 → 展示态。
     * vipCode > 0 只代表「开通过」，不代表「现在有效」：
     * 实测有账号 voiceBookVip.vipCode=500 但 expireTime 是 2023-09-03（早已过期）。
     * 所以有效性必须再和 expireTime 比一次，过期的不能标成有效。
     */
    rightState(raw) {
      const o = raw || {}
      const code = Number(o.vipCode)
      const hasCode = isFinite(code) && code > 0
      const expireTime = Number(o.expireTime) || 0
      const expired = hasCode && expireTime > 0 && expireTime < Date.now()
      const active = hasCode && !expired
      return {
        active,
        expired,
        expireTime,
        daysLeft: active ? this.daysLeft(expireTime) : null
      }
    },
    daysLeft(expireTime) {
      const ts = Number(expireTime)
      if (!isFinite(ts) || ts <= 0) return null
      return Math.max(0, Math.ceil((ts - Date.now()) / DAY_MS))
    },
    expireText(ts) {
      const n = Number(ts)
      if (!isFinite(n) || n <= 0) return '—'
      return formatMs(n, 'YYYY.MM.DD')
    },
    load() {
      if (!this.uid) return Promise.resolve()
      const pick = res => (res && res.data) || null
      const fail = e => (e && e.message) || '请求异常'
      return Promise.all([
        User.vipInfo(this.uid).then(pick).catch(e => { this.v1Err = fail(e); return null }),
        User.vipInfoV2(this.uid).then(pick).catch(e => { this.v2Err = fail(e); return null })
      ]).then(([v1, v2]) => {
        this.v1Body = v1
        this.v2Body = v2
      })
    }
  },
  watch: {
    uid() { this.load() }
  },
  mounted() { this.load() }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/base/variables";

.vip-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 20px;
  padding: 0 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .2px;
  line-height: 1;
  flex-shrink: 0;
  cursor: default;
  user-select: none;
  white-space: nowrap;

  // 黑胶：暗色 + 金色字，和播放器里的黑胶视觉记忆一致
  &.is-black {
    background: linear-gradient(135deg, #3a3a44 0%, #1e1e24 100%);
    color: #f3d9a4;
    box-shadow: 0 2px 8px rgba(0, 0, 0, .18);
  }

  // SVIP：再叠一圈金边 + 偏金底色，和普通黑胶一眼分得开
  &.is-svip {
    background: linear-gradient(135deg, #4a3d23 0%, #221e18 100%);
    color: #f7e3b6;
    box-shadow: 0 2px 8px rgba(0, 0, 0, .22), inset 0 0 0 1px rgba(243, 217, 164, .5);
  }

  // 已过期：降级成灰底，别跟"有会员"混淆
  &.is-expired {
    background: rgba(0, 0, 0, .07);
    color: $font-black-2;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .06);
  }

  // 只有音乐包：用主题紫区分，不冒充黑胶
  &.is-package {
    background: rgba(134, 133, 239, .16);
    color: $color-main-1;
  }

  .vip-badge-state { font-weight: 500; opacity: .9; }
  .vip-badge-level { font-weight: 700; }
}
</style>

<style lang="scss">
/* tooltip 被挂到 body 上，scoped 样式够不到，单独放一个非 scoped 块 */
.vip-tip {
  max-width: 260px;
  line-height: 1.6;

  .vip-tip-title {
    margin: 0 0 4px;
    font-size: 12px;
    font-weight: 600;
  }

  .vip-tip-line {
    margin: 0;
    font-size: 12px;
    opacity: .86;
  }
}
</style>
