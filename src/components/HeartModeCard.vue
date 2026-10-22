<template>
  <div
      class="heart-entry"
      :class="{ on: heartMode, busy: heartBusy }"
      @click="onClick"
  >
    <div class="he-media">
      <BaseIcon :name="heartMode ? 'likeFill' : 'like'" :size="34"/>
      <span class="he-name">心动模式</span>
      <span class="he-sub">{{ stateText }}</span>
      <span v-if="heartMode" class="he-playing">播放中</span>
    </div>
    <!-- 说明条控制在单行：漫游卡的说明条是 40px（单行），这里一旦折行就会
         比隔壁卡片高出一截，同一排里非常明显 -->
    <div class="he-caption">{{ captionText }}</div>
  </div>
</template>

<script>
/**
 * 首页「心动模式」入口
 *
 * 位置：和私人漫游卡片行同一排、贴在它右侧，但**不是** FmRoamCards 的子组件。
 * 两者性质不同——漫游卡片选的是私人 FM 的 mode/submode，心动模式走的是
 * /playmode/intelligence/list（红心歌单 + 种子曲目），把它们塞进同一个组件
 * 会让"选 FM 模式"和"接管队列来源"两套逻辑互相污染。
 *
 * 本组件只负责显示状态和发信号：点击后 $bus 广播 'heart-toggle'，
 * PlayerCore 收到后执行登录校验、取流、整队替换、从第一首开始播。
 * 状态（heartMode / heartBusy）读 Vuex，不在这里另存一份，避免两处不同步。
 */
export default {
  name: "HeartModeCard",
  computed: {
    heartMode() { return this.$store.state.TracksAbout.heartMode },
    heartBusy() { return this.$store.state.TracksAbout.heartBusy },
    stateText() {
      if (this.heartBusy) return '正在取流…'
      if (this.heartMode) return '点击关闭'
      return '从红心歌单出发'
    },
    /**
     * 说明条：漫游卡那句写的是"这个入口能给你什么歌"，
     * 心动卡是"按一下开启"，所以用祈使句。
     */
    captionText() {
      if (this.heartBusy) return '正在向心动模式取流…'
      if (this.heartMode) return '心动模式进行中'
      return '开启心动模式吧'
    }
  },
  methods: {
    onClick() {
      if (this.heartBusy) return
      this.$bus.$emit('heart-toggle')
      console.log('[HeartCard]', { action: 'toggle_request', current: this.heartMode })
    }
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/base/variables";

// 与漫游卡同宽同高（图区 + 说明条），放在同一排才对得齐。
// 宽高都跟 FmRoamCards 下发的 --roam-card-w 走（168 是 JS 没跑时的兜底），
// 卡片自适应变宽时这张一起变，两张永远同宽。
// margin-bottom 8px 是补 .roam-scroller 的 padding-bottom（卡片底边离轨道底 8px），
// 不加的话底部对齐会齐到"轨道底"而不是"卡片底"，视觉上低 8px。
.heart-entry {
  flex: 0 0 var(--roam-card-w, 168px);
  width: var(--roam-card-w, 168px);
  margin-bottom: 8px;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  background: #fff;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
  transition: transform 200ms ease, box-shadow 200ms ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.18);
  }

  &.busy { cursor: progress; opacity: 0.7; &:hover { transform: none; } }
}

// 底色固定用「已开启」那一套（实心红 + 白字），不再随状态在"淡紫虚线"和"实心红"
// 之间跳。原因：这一排全是实心渐变卡，只有它一块淡色在视觉上会显得"没做完"；
// 而且未开启时那张浅底和首页白背景几乎融在一起，看着像空位。
// 状态区分改由三处承担：右上角「播放中」徽标、外描边、副标题文案。
.he-media {
  position: relative;
  height: var(--roam-card-w, 168px);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  box-sizing: border-box;
  // 只圆上方两角：下方紧接着白色说明条，圆了会在中间露出一段缝
  border-radius: 12px 12px 0 0;
  background: linear-gradient(135deg, #ff7a9c 0%, #ff5f6d 100%);
  color: #fff;
  transition: background 220ms ease, box-shadow 220ms ease;

  .heart-entry:hover & { background: linear-gradient(135deg, #ff6d92 0%, #ff5060 100%); }
}

.he-name {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.4px;
  line-height: 1.25;
}

.he-sub {
  font-size: 11px;
  font-weight: 400;
  opacity: 0.8;
  letter-spacing: 0.2px;
}

.he-playing {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 10px;
  line-height: 1.5;
  color: #fff;
  background: rgba(0, 0, 0, 0.42);
}

// 开启态：底色已经固定成实心红了，这里只加描边和一圈同色投影，
// 否则"正在生效"和"可以点"两者长得一模一样
.heart-entry.on {
  outline: 2px solid $color-main;
  outline-offset: -2px;
  box-shadow: 0 6px 20px rgba(255, 95, 109, 0.35);
}

// 与 .card-caption 完全同规格（padding / min-height / 字号），保证两张卡一样高
.he-caption {
  padding: 8px 12px 9px;
  min-height: 40px;
  box-sizing: border-box;
  font-size: 11px;
  line-height: 1.4;
  color: rgba(0, 0, 0, 0.55);
  background: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

// 卡宽由 JS 自适应，窄屏不再覆盖成固定 148（会和 --roam-card-w 打架）
@media (max-width: 768px) {
  .he-name { font-size: 16px; }
}
</style>
