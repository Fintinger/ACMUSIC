<template>
  <div class="roam-strip">
    <h2 class="roam-heading">私人漫游</h2>

    <div class="roam-track" ref="track" :style="trackStyle">
      <button
          v-show="canLeft"
          class="strip-arrow strip-arrow-left"
          title="上一组"
          @click="scrollByCards(-1)"
      ><BaseIcon name="arrowLeft" :size="16"/></button>

      <div class="roam-scroller" ref="scroller" :style="scrollerStyle" @scroll.passive="updateArrows">
        <div
            v-for="c in cards"
            :key="c.key"
            class="roam-card"
            :class="{ active: isActive(c) }"
            @click="pick(c)"
        >
          <div class="card-media" :style="{ background: c.grad }">
            <span class="card-watermark">{{ c.name.charAt(0) }}</span>
            <div class="card-visual">
              <span class="card-name">{{ c.name }}</span>
              <span class="card-sub">{{ c.sub }}</span>
            </div>
            <span v-if="isActive(c)" class="card-playing">播放中</span>
          </div>
          <div class="card-caption">{{ c.caption }}</div>
        </div>
      </div>

      <button
          v-show="canRight"
          class="strip-arrow strip-arrow-right"
          title="下一组"
          @click="scrollByCards(1)"
      ><BaseIcon name="arrowRight" :size="16"/></button>
    </div>
  </div>
</template>

<script>
/**
 * 私人漫游卡片行
 *
 * 参考网易云首页那排「每日推荐 / 私人雷达 / 私人漫游 / 心动模式 / 民谣专区」：
 * 每个入口一张独立卡片，只有一行，超出用左右箭头翻。
 *
 * 关键设计：**把 mode 和场景统一成"卡片"这一种东西**。
 * `/personal/fm/mode` 的 mode 是互斥枚举（DEFAULT / FAMILIAR / EXPLORE / SCENE_RCMD），
 * 场景只是 SCENE_RCMD 的参数。与其做"场景模式 + 二级选择"，不如让每个场景各自成卡——
 * 卡片天然携带 (mode, submode)，一层结构覆盖全部模式。
 *
 * 视觉：**不用专辑封面做背景**。封面要能"完整显示"就得占满方形图区，而 11 张卡
 * 各拉一次封面 = 11 个额外请求 + 图色不可控（和首页浅色基调冲突）。
 * 改用每张卡自己的渐变色 + 名字首字水印，零请求、观感统一。
 *
 * 本组件只负责选，不负责拉播放：写入 store 后广播 'fm-roam'，
 * 由 PersonalFM 用已有的批次/预取/应用机制执行。
 */
export default {
  name: "FmRoamCards",
  data() {
    return {
      canLeft: false,
      canRight: false,
      // 卡片几何：gapW 与 SCSS 里 .roam-scroller 的 gap 保持一致（12）。
      // cardW 由 _fit() 反解得出并通过 --roam-card-w 下发，168 只是 JS 跑起来前的兜底，
      // SCSS 里不要再写死宽度，否则改宽窄要改两处
      cardW: 168,
      gapW: 12,
      // 右箭头的专用车道：箭头 30px 宽、right:-8px，压在轨道右边缘外 8px，
      // 也就是要占轨道内 22px；不给它留位就会压在最后一张卡上
      // （也就是"那一小条"被遮住的来源）
      lane: 22,
      // 吸附后的整数列数与滚动区宽度（0 = 还没测量，先按 CSS 默认走）
      cols: 0,
      fittedWidth: 0,
      cards: [
        {
          key: 'DEFAULT', mode: 'DEFAULT', name: '私人漫游', sub: '默认推荐',
          caption: '从你最近的喜好继续', grad: 'linear-gradient(135deg, #6b7cff 0%, #a68bff 100%)'
        },
        {
          key: 'FAMILIAR', mode: 'FAMILIAR', name: '熟悉', sub: '听过的',
          caption: '听回那些熟的', grad: 'linear-gradient(135deg, #ff8f6b 0%, #ffc46b 100%)'
        },
        {
          key: 'EXPLORE', mode: 'EXPLORE', name: '探索', sub: '陌生的',
          caption: '换点没听过的', grad: 'linear-gradient(135deg, #38b6ff 0%, #5f7cff 100%)'
        },
        {
          key: 'SCENE:EXERCISE', mode: 'SCENE_RCMD', submode: 'EXERCISE', name: '运动', sub: '跟节拍',
          caption: '让心跳和鼓点对齐', grad: 'linear-gradient(135deg, #ff5f6d 0%, #ff9966 100%)'
        },
        {
          key: 'SCENE:FOCUS', mode: 'SCENE_RCMD', submode: 'FOCUS', name: '专注', sub: '屏蔽噪音',
          caption: '只留旋律陪你想事', grad: 'linear-gradient(135deg, #3a8dde 0%, #63d3d0 100%)'
        },
        {
          key: 'SCENE:SLEEP_HELP', mode: 'SCENE_RCMD', submode: 'SLEEP_HELP', name: '助眠', sub: '慢下来',
          caption: '轻一点，准备入睡', grad: 'linear-gradient(135deg, #4b4f9e 0%, #7b6cc4 100%)'
        },
        {
          key: 'SCENE:COMMUTE', mode: 'SCENE_RCMD', submode: 'COMMUTE', name: '通勤', sub: '路上',
          caption: '适合车窗外的背景音', grad: 'linear-gradient(135deg, #5b8c85 0%, #8fbfae 100%)'
        },
        {
          key: 'SCENE:COFFEE_SHOP', mode: 'SCENE_RCMD', submode: 'COFFEE_SHOP', name: '咖啡馆', sub: '午后',
          caption: '一杯咖啡的时间', grad: 'linear-gradient(135deg, #a47148 0%, #d8a86a 100%)'
        },
        {
          key: 'SCENE:GUOFENG', mode: 'SCENE_RCMD', submode: 'GUOFENG', name: '国风', sub: '山河',
          caption: '一曲山河入梦', grad: 'linear-gradient(135deg, #8a6d3b 0%, #c9a227 100%)'
        },
        {
          key: 'SCENE:YUEYU', mode: 'SCENE_RCMD', submode: 'YUEYU', name: '粤语', sub: '港味',
          caption: '港味情歌与旧时光', grad: 'linear-gradient(135deg, #7d5fff 0%, #c56cf0 100%)'
        },
        {
          key: 'SCENE:NIGHT_EMO', mode: 'SCENE_RCMD', submode: 'NIGHT_EMO', name: '伤感', sub: '夜里',
          caption: '适合夜里 emo 一会', grad: 'linear-gradient(135deg, #3f4c6b 0%, #606c88 100%)'
        }
      ]
    }
  },
  computed: {
    fmMode() { return this.$store.state.TracksAbout.fmMode },
    fmSubmode() { return this.$store.state.TracksAbout.fmSubmode },
    /** 滚动区宽度：吸附到"整数张卡片"，末尾不再露出半张 */
    scrollerStyle() {
      return this.fittedWidth ? { width: this.fittedWidth + 'px' } : null
    },
    /**
     * 轨道宽度 = 卡片区 + 滚动区左右各 2px padding（=4）。箭头车道不写在这里，
     * 它由 .roam-track 的 padding-right: var(--roam-lane) 提供，
     * 两者都算进去会把车道算两遍、整行多出 22px。
     *
     * 关键：宽度吸附在**轨道**上，外层 .roam-strip 仍然 flex:1 吃满剩余空间。
     * 这样吸附剩下的零头会落在轨道右侧、心动卡左侧——也就是"中间的间距"，
     * 心动卡自然被顶到最右边。如果反过来把宽度吸附在 .roam-strip 上，
     * 零头就跑到整行末尾，右边会空出一大块。
     */
    trackStyle() {
      return this.fittedWidth ? { width: (this.fittedWidth + 4) + 'px' } : null
    }
  },
  mounted() {
    this._restoreSelection()
    this.$nextTick(() => { this._fit(); this.updateArrows() })
    this._onResize = () => { this._fit(); this.updateArrows() }
    window.addEventListener('resize', this._onResize)
    // resize 事件覆盖不到"页面滚动条出现/消失导致内容区变窄"这类情况，
    // 用 ResizeObserver 盯住父容器补上。观察的是父级（.roam-line），
    // 它的宽度由页面决定、不随本组件变，所以不会自我触发死循环。
    const host = this.$el && this.$el.parentElement
    if (host && typeof ResizeObserver !== 'undefined') {
      this._ro = new ResizeObserver(this._onResize)
      this._ro.observe(host)
    }
  },
  beforeDestroy() {
    window.removeEventListener('resize', this._onResize)
    if (this._ro) { this._ro.disconnect(); this._ro = null }
  },
  methods: {
    /**
     * 自适应填满：反解出"卡片宽度 + 列数"，让整行刚好铺满、末尾不露半张。
     *
     * 之前是固定 168px + 把容器宽度吸附到整数张，代价是吸附剩下的零头最多能有
     * 一张卡那么宽（~180px），中间或行尾会空一大块。改成卡片宽度自适应后，
     * 零头被摊进每张卡的宽度里，间距可以锁成固定值。
     *
     * 宽度方程（cw=卡宽, N=漫游卡列数, cg=卡间距, mg=中间间距, lane=右箭头车道）：
     *   W = padX + N*cw + (N-1)*cg + lane + mg + cw      // 末尾那张 cw 是心动卡
     * 先令 cw = 168（原设计尺寸）反解出 N，再把 N 取整、回解出精确的 cw。
     *
     * 结果通过 CSS 变量 --roam-card-w / --roam-line-gap 写在父容器 .roam-line 上，
     * 右侧的心动卡读同一个变量跟着变宽，两张卡永远同宽。
     */
    _fit() {
      const host = this.$el && this.$el.parentElement
      if (!host) return
      // clientWidth 是 padding box（含 padding），而摆放卡片的是 content box，
      // 所以要把 .roam-line 自己的左右内边距减掉，否则算出来的卡宽会超出可用宽度，
      // 整行被撑出 24px。这样 padding 只在 SCSS 里写一处，改它不用同步改 JS。
      const cs = window.getComputedStyle(host)
      const inset = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0)
      const total = host.clientWidth - inset
      if (!total) return
      const narrow = window.innerWidth <= 768
      const cg = this.gapW
      const padX = 4
      // 中间间距的基准值（cw 取整剩下的零头会并到这里，实际值略大一点）
      const mgBase = 16
      const lane = narrow ? 0 : 22
      // 最多只能排 cards.length 张，再多就会在末尾空出一段没有卡的位置
      const cap = this.cards.length

      // K = (N+1)*cw + N*cg，代入 cw=168 反解 N
      const K = total - padX - lane - mgBase + cg
      let n = Math.round((K - 168) / (168 + cg))
      n = Math.min(cap, Math.max(2, n))
      // 用取整后的 N 回解精确卡宽，并夹在合理区间（太窄像缩略图，太宽一屏放不下几张）
      let cw = Math.floor((K - n * cg) / (n + 1))
      if (cw < 120 && n > 2) { n -= 1; cw = Math.floor((K - n * cg) / (n + 1)) }
      if (cw > 240 && n < cap) { n += 1; cw = Math.floor((K - n * cg) / (n + 1)) }
      cw = Math.min(240, Math.max(96, cw))

      // 卡宽被夹住后可能填不满/装不下，用中间间距兜住：间距不够就减一张卡重算
      const widthOf = k => k * cw + (k - 1) * cg
      let fitted = widthOf(n)
      let mg = total - padX - fitted - lane - cw
      while (mg < 12 && n > 2) {
        n -= 1
        cw = Math.min(240, Math.max(96, Math.floor((K - n * cg) / (n + 1))))
        fitted = widthOf(n)
        mg = total - padX - fitted - lane - cw
      }

      this.cols = n
      this.cardW = cw
      this.lane = lane
      this.fittedWidth = fitted
      // 中间间距取"刚好铺满"的剩余量：cw 向下取整丢掉的那点会并进来，
      // 这样心动卡能严丝合缝贴在最右，不会多出一条缝
      host.style.setProperty('--roam-card-w', cw + 'px')
      host.style.setProperty('--roam-line-gap', Math.max(12, mg) + 'px')
      host.style.setProperty('--roam-lane', lane + 'px')
    },
    isActive(c) {
      if (c.mode !== this.fmMode) return false
      if (c.mode === 'SCENE_RCMD') return c.submode === this.fmSubmode
      return true
    },
    updateArrows() {
      const el = this.$refs.scroller
      if (!el) return
      this.canLeft = el.scrollLeft > 4
      this.canRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
    },
    scrollByCards(dir) {
      const el = this.$refs.scroller
      if (!el) return
      // 一次翻三张（含间距），比逐张滚更符合"翻页"直觉
      const step = (this.cardW + this.gapW) * 3
      el.scrollBy({ left: dir * step, behavior: 'smooth' })
    },
    _restoreSelection() {
      try {
        const raw = localStorage.getItem('acmusic_fm_roam')
        if (!raw) return
        const saved = JSON.parse(raw)
        const hit = this.cards.find(c => c.mode === saved.mode && (c.submode || '') === (saved.submode || ''))
        if (hit) {
          this.$store.commit('TracksAbout/SET_FM_MODE', { mode: hit.mode, submode: hit.submode || this.fmSubmode })
        }
      } catch (e) { /* ignore */ }
    },
    pick(c) {
      if (this.isActive(c)) {
        // 已选中：再点等于重新要一批（时间窗可能已经换过）
        this.$bus.$emit('fm-roam')
        return
      }
      this.$store.commit('TracksAbout/SET_FM_MODE', {
        mode: c.mode,
        submode: c.submode || this.fmSubmode
      })
      try {
        localStorage.setItem('acmusic_fm_roam', JSON.stringify({ mode: c.mode, submode: c.submode || '' }))
      } catch (e) { /* ignore */ }
      this.$bus.$emit('fm-roam')
      console.log('[FmRoam]', { mode: c.mode, submode: c.submode || '', card: c.key })
    }
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/base/variables";

// 首页把这一行和右侧的「心动模式」入口并排放（.roam-line）。
// 这里必须 flex:1 吃满剩余宽度：吸附后的零头要留在轨道与心动卡之间当"中间间距"，
// 心动卡才会被顶到最右。宽度吸附发生在 .roam-track 上（见 trackStyle）。
.roam-strip {
  flex: 1;
  min-width: 0;
}

// 标题：对齐首页其他板块的 h2（reset 里 h2 已左对齐 1.5rem），这里压小一档
// 免得压过 hero，另外给行内留一点呼吸
.roam-heading {
  margin: 0 0 14px 2px;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: 0.5px;
  text-align: left;
  color: rgba(0, 0, 0, 0.9);
}

// 箭头要对齐"卡片行"的垂直中线，而不是整块（含标题）的中线，
// 所以定位容器下沉到这一层。
// padding-right 是右箭头的车道：滚动区宽度已由 _fit() 吸附成整数张，
// 剩下的这条空位正好把箭头挪出卡片区，不再压住最后一张卡。
// 车道宽度跟 --roam-lane 走（窄屏箭头隐藏时为 0），和 trackStyle 里的
// 宽度计算共用同一个值，避免两处各写一遍 22 导致对不齐。
.roam-track {
  position: relative;
  padding-right: var(--roam-lane, 22px);
}

.roam-scroller {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 2px 2px 8px;
  scroll-snap-type: x proximity;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;

  &::-webkit-scrollbar { height: 0; display: none; }
}

// 左右翻页箭头：只在真的有内容可翻时才出现，贴在两端
.strip-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 5;
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  color: rgba(0, 0, 0, 0.55);
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.14);
  transition: background 160ms ease, color 160ms ease, transform 160ms ease;

  &:hover { background: #fff; color: rgba(0, 0, 0, 0.8); }
  &:active { transform: translateY(-50%) scale(0.94); }
}

.strip-arrow-left { left: -8px; }
.strip-arrow-right { right: -8px; }

.roam-card {
  position: relative;
  // 宽度由 _fit() 算出的 --roam-card-w 决定（自适应填满），168 是 JS 没跑时的兜底
  flex: 0 0 var(--roam-card-w, 168px);
  width: var(--roam-card-w, 168px);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  background: #fff;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.1);
  transition: transform 200ms ease, box-shadow 200ms ease;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 22px rgba(0, 0, 0, 0.18);
  }

  // 选中态改用主题色描边：卡片下半部分是白底，白色描边会看不见
  &.active {
    outline: 2px solid $color-main;
    outline-offset: -2px;
    box-shadow: 0 6px 20px rgba(134, 133, 239, 0.35);
  }
}

// 方形色块区：不再拉专辑封面，直接用每张卡自己的渐变。
// 高度跟卡宽走（--roam-card-w），卡片自适应变宽时图区同步变高，永远是正方形
.card-media {
  position: relative;
  width: 100%;
  height: var(--roam-card-w, 168px);
  flex-shrink: 0;
  background-size: cover;
  background-position: center;

  // 纯色卡也要一点底部纵深，否则白字像悬在色块上
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0, 0, 0, 0) 55%, rgba(0, 0, 0, 0.22) 100%);
    pointer-events: none;
  }
}

// 首字水印：纯色块太空，用名字第一个字当图形，避免再加请求或图标资源
.card-watermark {
  position: absolute;
  right: 4px;
  bottom: -18px;
  z-index: 1;
  font-size: 96px;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -4px;
  color: rgba(255, 255, 255, 0.13);
  pointer-events: none;
  user-select: none;
}

.card-visual {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 10px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 1px;
  color: #fff;
  text-shadow: 0 1px 6px rgba(0, 0, 0, 0.45);
}

.card-name {
  font-size: 17px;
  font-weight: 700;
  letter-spacing: 0.4px;
  line-height: 1.25;
}

.card-sub {
  font-size: 11px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.82);
  letter-spacing: 0.2px;
}

.card-caption {
  padding: 8px 12px 9px;
  min-height: 40px;
  box-sizing: border-box;
  font-size: 11px;
  line-height: 1.4;
  color: rgba(0, 0, 0, 0.55);
  background: #fff;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-playing {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 3;
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 10px;
  line-height: 1.5;
  color: #fff;
  background: rgba(0, 0, 0, 0.42);
}

// 窄屏不再写死卡宽：_fit() 会把 lane 算成 0 并给出更窄的 --roam-card-w，
// 这里如果再覆盖成固定值就会和 JS 打架（之前 148 是写死的，改宽窄要改两处）
@media (max-width: 768px) {
  .card-name { font-size: 16px; }
  .strip-arrow { display: none !important; }
}
</style>
