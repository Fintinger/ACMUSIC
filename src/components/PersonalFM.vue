<template>
  <div class="personal-fm">
    <!-- 固定 Ambient 多色融合背景 (不随歌曲变化) -->

    <!-- 模块标题 (左上角) -->
    <div class="fm-section-title">
      <div class="fm-title-row">
        <BaseIcon name="radio"/>
        <span>私人FM</span>
      </div>
      <div class="fm-section-subtitle">为你推荐可能喜欢的音乐</div>
    </div>

    <!-- 播放全部按钮 (右上角, 玻璃质感) -->
    <button class="fm-play-all-btn" @click.stop="playAllFM">
      <span class="btn-icon-circle"><BaseIcon name="play"/></span>
      <span>播放全部</span>
    </button>

    <!-- Cover 区域 -->
    <div class="fm-cover-group">
      <div class="fm-stage" v-if="displayList.length" ref="stage">
        <div
            v-for="(item, i) in displayList"
            :key="item.id"
            class="fm-card-wrapper"
            :class="['fm-' + cardPos(i), { 'light-cover': isLightCover(item) }]"
            :style="[cardStyle(i), item && item.album ? { '--fm-cover-url': `url('${item.album.picUrl}')` } : null]"
            @click="playCard(item, $event)"
            @mouseenter="onCardEnter(i)"
            @mouseleave="onCardLeave"
            @mousemove="i === 1 ? onStageMove($event) : null"
        >
          <div class="fm-card">
            <img :src="item.album ? item.album.picUrl : ''" class="fm-cover" alt="">
            <!-- 歌曲信息 (绑定每张卡片, 随卡片轮播/旋转) -->
            <div class="fm-track-info">
              <div class="fm-title">{{ item.name }}</div>
              <div class="fm-artist">{{ artistsOf(item) }}</div>
            </div>
          </div>
          <!-- 每张卡独立镜面倒影平面 -->
          <div class="fm-reflection-plane">
            <div class="fm-reflection">
              <img :src="item.album ? item.album.picUrl : ''" alt=""/>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import pubsub from 'pubsub-js'
import * as tracksApi from "@/api/Tracks"

export default {
  name: "PersonalFM",
  props: {
    list: { type: Array, default: () => [] }
  },
  data() {
    return {
      currentList: [],
      activeIndex: 0,
      fmTimer: null,
      tiltX: 0,
      tiltY: 0,
      coverLight: {},
      // OPT-FM 双事件订阅：'fmPrefetch'（proactive，只拉数据）+ 'getPersonalFM'（reactive，应用或拉取）
      fmPrefetchSubId: null,
      fmReactiveSubId: null,
      fmFetching: false,
      fmLastFetchAt: 0,
      // reactive 触发时若 staged 不在且 fetch 进行中，设此标志
      // 等 fetch 完成后由 fetchAndStage 检测并立即应用
      fmPendingApply: false
    }
  },
  computed: {
    // 横向三卡: [previous, current, next]
    displayList() {
      if (!this.currentList.length) return []
      const len = this.currentList.length
      const prev = this.currentList[(this.activeIndex - 1 + len) % len]
      const cur = this.currentList[this.activeIndex % len]
      const next = this.currentList[(this.activeIndex + 1) % len]
      return [prev, cur, next]
    },
    currentCover() {
      const cur = this.currentList[this.activeIndex % this.currentList.length]
      return cur && cur.album ? cur.album.picUrl : ''
    },
    currentName() {
      const cur = this.currentList[this.activeIndex % this.currentList.length]
      return cur ? cur.name : ''
    },
    currentArtist() {
      const cur = this.currentList[this.activeIndex % this.currentList.length]
      if (!cur) return ''
      const ar = cur.ar || cur.artists
      return ar && ar.length ? ar.map(a => a.name).join(' / ') : ''
    }
  },
  watch: {
    list: {
      immediate: true,
      handler(n) {
        if (n && n.length) {
          this.currentList = n
          this.startCarousel()
        }
      }
    }
  },
  methods: {
    artistsOf(item) {
      if (!item) return ''
      const ar = item.ar || item.artists
      return ar && ar.length ? ar.map(a => a.name).join(' / ') : ''
    },
    // 该卡封面是否浅色(决定文字用深色)
    isLightCover(item) {
      const url = item && item.album ? item.album.picUrl : ''
      if (!url) return false
      if (this.coverLight[url] !== undefined) return this.coverLight[url]
      this.detectLightness(url)
      return false
    },
    // 加载封面并计算平均亮度
    detectLightness(url) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const size = 32
          const canvas = document.createElement('canvas')
          canvas.width = size
          canvas.height = size
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, size, size)
          const data = ctx.getImageData(0, 0, size, size).data
          let sum = 0, count = 0
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2]
            sum += 0.299 * r + 0.587 * g + 0.114 * b
            count++
          }
          const avg = sum / count
          this.$set(this.coverLight, url, avg > 180)
        } catch (e) {
          this.$set(this.coverLight, url, false)
        }
      }
      img.onerror = () => { this.$set(this.coverLight, url, false) }
      img.src = url
    },
    cardPos(i) {
      return i === 0 ? 'previous' : (i === 1 ? 'current' : 'next')
    },
    // 当前卡片: 中心 + 鼠标微倾斜
    cardStyle(i) {
      if (i !== 1) return null
      return {
        transform: `translateX(0) translateZ(120px) scale(1.03) rotateX(${this.tiltX}deg) rotateY(${this.tiltY}deg)`
      }
    },
    onStageMove(e) {
      const stage = this.$refs.stage
      if (!stage) return
      const r = stage.getBoundingClientRect()
      const dx = (e.clientX - r.left) / r.width - .5
      const dy = (e.clientY - r.top) / r.height - .5
      this.tiltX = -dy * 10
      this.tiltY = dx * 16
    },
    onStageLeave() {
      this.tiltX = 0
      this.tiltY = 0
    },
    playCard(item, evt) {
      // 阻止冒泡到外层 wrapper 的 playPersonalFM
      if (evt) evt.stopPropagation()
      // dispatch 先：playAllTracks 内部会重置 isPersonalFM = false
      this.$store.dispatch('TracksAbout/playAllTracks', [item])
      // 重新设回 true，保持 FM 模式
      this.$store.state.TracksAbout.isPersonalFM = true
      this.activeIndex = this.currentList.findIndex(s => s.id === item.id)
      this.$nextTick(() => this.startCarousel())
    },
    startCarousel() {
      this.stopCarousel()
      if (this.currentList.length > 1) {
        this.fmTimer = setInterval(() => {
          this.activeIndex = (this.activeIndex + 1) % this.currentList.length
        }, 6000)
      }
    },
    stopCarousel() {
      if (this.fmTimer) { clearInterval(this.fmTimer); this.fmTimer = null }
    },
    // 鼠标移入当前卡片 -> 暂停轮播; 移出 -> 继续
    onCardEnter(i) {
      if (i === 1) this.stopCarousel()
    },
    onCardLeave() {
      // 重置最前卡片的鼠标倾斜
      this.tiltX = 0
      this.tiltY = 0
      if (this.currentList.length > 1) this.startCarousel()
    },
    playAllFM() {
      if (!this.currentList.length) return
      this.$store.dispatch('TracksAbout/playAllTracks', this.currentList)
      this.$store.state.TracksAbout.isPersonalFM = true
    },
    /**
     * FM 预加载（proactive）：PlayerCore 进入 song 3 时 publish 'fmPrefetch'
     * 拉取新一批 FM 歌曲并暂存到 store.fmStagedBatch（**不 REPLACE_PLAYLIST**）
     * 这样 song 3 继续播放，等歌曲自然结束时 reactive 流程再无缝切换
     * - 1.5 秒去抖 + in-flight 检查
     * - 若 reactive 期间已发起请求（用户在 song 3 末尾点了 next），fetch 完成后立即应用
     */
    fetchAndStage() {
      this._doFetch().then(batch => {
        if (!batch) return
        this.$store.commit('TracksAbout/SET_FM_STAGED_BATCH', batch)
        // 若 reactive 期间正在在等待，则 fetch 完成后立即应用
        if (this.fmPendingApply) {
          this.fmPendingApply = false
          this._applyBatch(batch)
        }
      })
    },
    /**
     * FM 应用（reactive）：歌曲自然结束 / 用户在末尾点 next 时 publish 'getPersonalFM'
     * - 若 staged 已就绪：立即 REPLACE_PLAYLIST + curIndex=0（无缝过渡）
     * - 若 staged 不在且无 in-flight：fetch 后应用（首次 ~200ms 静音）
     * - 若 staged 不在但 fetch 在中：设 fmPendingApply，等待 fetch 完成
     */
    applyStagedOrFetch() {
      const staged = this.$store.state.TracksAbout.fmStagedBatch
      if (staged) {
        this._applyBatch(staged)
        return
      }
      if (this.fmFetching) {
        // proactive fetch 还在进行，设置标志，fetch 完成后 fetchAndStage 会处理
        this.fmPendingApply = true
        return
      }
      this._doFetch().then(batch => {
        if (batch) this._applyBatch(batch)
      })
    },
    /**
     * 公共 fetch 逻辑：1.5s 去抖 + in-flight，返回新批次或 null
     */
    _doFetch() {
      const now = Date.now()
      if (this.fmFetching) return Promise.resolve(null)
      if (now - this.fmLastFetchAt < 1500) return Promise.resolve(null)

      this.fmFetching = true
      return tracksApi.personalFM(now)
        .then(res => {
          const songs = res.data && res.data.data
          if (!Array.isArray(songs) || !songs.length) return null
          this.fmLastFetchAt = Date.now()
          return songs.slice(0, 3)
        })
        .catch(err => {
          console.error('[FMRefresh] failed', err)
          if (this.$message) this.$message.warning('FM 续播失败，请稍后再试')
          return null
        })
        .finally(() => {
          this.fmFetching = false
        })
    },
    /**
     * 应用批次：REPLACE_PLAYLIST + 同步 PersonalFM 组件 UI + 通知 PlayerCore
     */
    _applyBatch(batch) {
      this.$store.commit('TracksAbout/REPLACE_PLAYLIST', batch)
      this.$store.commit('TracksAbout/CLEAR_FM_STAGED_BATCH')
      this.currentList = batch
      this.activeIndex = 0
      this.$nextTick(() => this.startCarousel())
      pubsub.publish('fmNewBatch', 0)
    }
  },
  mounted() {
    this.$on('initPlay', () => {
      if (this.currentList.length) {
        this.$store.dispatch('TracksAbout/playAllTracks', this.currentList)
        this.$store.state.TracksAbout.isPersonalFM = true
      }
    })
    // 订阅 PlayerCore 的双事件：
    // - 'fmPrefetch'（proactive）：进入 song 3 时触发，只拉数据并 stage，不影响播放
    // - 'getPersonalFM'（reactive）：song 3 结束 / 末尾 next 时触发，应用 staged 或重新拉
    this.fmPrefetchSubId = pubsub.subscribe('fmPrefetch', () => {
      this.fetchAndStage()
    })
    this.fmReactiveSubId = pubsub.subscribe('getPersonalFM', () => {
      this.applyStagedOrFetch()
    })
  },
  beforeDestroy() {
    this.stopCarousel()
    if (this.fmPrefetchSubId !== null) pubsub.unsubscribe(this.fmPrefetchSubId)
    if (this.fmReactiveSubId !== null) pubsub.unsubscribe(this.fmReactiveSubId)
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/base/variables";

.personal-fm {
  position: relative;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-radius: 32px;
  overflow: hidden;
  /* 固定 Ambient 多色融合背景 (明亮高级, 不随歌曲变化) */
  background:
    radial-gradient(circle at 20% 20%, rgba(120,90,255,.35), transparent 45%),
    radial-gradient(circle at 80% 30%, rgba(255,120,180,.3), transparent 50%),
    radial-gradient(circle at 50% 90%, rgba(80,180,255,.25), transparent 55%),
    linear-gradient(135deg, #f8f9ff, #fff5f8);
}

// 播放全部按钮 (右上角, 玻璃质感)
.fm-play-all-btn {
  position: absolute;
  top: 24px;
  right: 28px;
  z-index: 20;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border: 1px solid rgba(255,255,255,.25);
  border-radius: 24px;
  background: rgba(255,255,255,.18);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: #5f6368;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all .25s ease;
  line-height: 1;
  letter-spacing: .3px;

  .btn-icon-circle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: rgba(95,99,104,.12);
  }

  &:hover {
    background: rgba(255,255,255,.32);
    border-color: rgba(255,255,255,.45);
    box-shadow: 0 2px 12px rgba(0,0,0,.06);
  }

  &:active {
    background: rgba(255,255,255,.24);
    transform: scale(.97);
  }
}

// 模块标题 (左上角)
.fm-section-title {
  position: absolute;
  top: 0;
  left: 0;
  padding: 24px 28px 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  z-index: 20;

  .fm-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 26px;
    font-weight: 700;
    letter-spacing: -0.4px;
    line-height: 1.4;
    color: #202124;

    .ac-icon {
      font-size: 26px;
      color: $color-main;
    }
  }

  .fm-section-subtitle {
    font-size: 14px;
    font-weight: 400;
    line-height: 1.6;
    color: rgba(0,0,0,.45);
    margin-top: 10px;
    /* 对齐标题文字(非图标): 24px 标题padding + 26px 图标 + 8px gap */
    padding-left: 34px;
  }
}

// Cover 区域
.fm-cover-group {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 120px;
}

.fm-stage {
  position: relative;
  width: 100%;
  height: 440px;
  perspective: 1400px;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1;
}

// 歌曲信息 (专辑图左下角, 白色, 无阴影背景)
.fm-track-info {
  position: absolute;
  left: 0;
  bottom: 0;
  padding: 14px 18px;
  text-align: left;
  z-index: 20;

  .fm-title {
    font-size: 20px;
    font-weight: 700;
    line-height: 1.3;
    letter-spacing: -0.3px;
    color: #ffffff;
    text-shadow: 0 1px 4px rgba(0,0,0,.35);
    transition: color .35s ease;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .fm-artist {
    font-size: 13px;
    font-weight: 400;
    line-height: 1.4;
    color: rgba(255,255,255,.78);
    text-shadow: 0 1px 4px rgba(0,0,0,.3);
    transition: color .35s ease;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

// Cover 外层包装: 3D transform 容器
.fm-card-wrapper {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 306px;
  height: 306px;
  margin: -153px 0 0 -153px; /* 306x306 居中，90% of 340px */
  cursor: pointer;
  transform-style: preserve-3d;
  transition: transform .9s cubic-bezier(.16, 1, .3, 1), opacity .6s ease;
}

// Cover 内容容器 (圆角裁剪内部内容)
.fm-card {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  border-radius: 28px;
  overflow: hidden;

  .fm-cover {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    border-radius: 28px;
  }

  // Cover 底部渐变遮罩: 保证文字可读, 不覆盖整个图片
  &::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    height: 55%;
    border-radius: 0 0 28px 28px;
    pointer-events: none;
    background: linear-gradient(to top,
        rgba(0,0,0,.62) 0%,
        rgba(0,0,0,.32) 35%,
        rgba(0,0,0,0) 72%);
  }
}

// 浅色封面: 增强底部遮罩 (统一白字, 更深的 overlay)
.fm-card.light-cover::before {
  background: linear-gradient(to top,
      rgba(0,0,0,.75) 0%,
      rgba(0,0,0,.4) 40%,
      rgba(0,0,0,0) 75%);
}

// current: 中心 Z 轴浮起, 强悬浮阴影
.fm-current {
  z-index: 10;
  transform: translateX(0) translateZ(108px) scale(1.03);

  .fm-card {
    opacity: 1;
    filter: none;
    animation: fm-float 4s ease-in-out infinite;
    box-shadow:
      0 22px 54px rgba(0,0,0,.25),
      0 40px 90px rgba(0,0,0,.18);
  }
}

// previous: 左侧 rotateY 侧向
.fm-previous {
  z-index: 5;
  width: 261px;
  height: 261px;
  margin: -130.5px 0 0 -130.5px;
  transform: translateX(-285px) translateZ(-81px) rotateY(48deg) scale(1);

  .fm-card {
    opacity: .7;
    filter: brightness(.85) blur(1px);
    box-shadow: 0 12px 30px rgba(0,0,0,.14);
  }

  &:hover {
    transform: translateX(-285px) translateZ(-40.5px) rotateY(38deg) scale(1.03);

    .fm-reflection {
      opacity: .21;
      filter: blur(0px);
    }
  }
}

// next: 右侧 rotateY 侧向
.fm-next {
  z-index: 5;
  width: 261px;
  height: 261px;
  margin: -130.5px 0 0 -130.5px;
  transform: translateX(285px) translateZ(-81px) rotateY(-48deg) scale(1);

  .fm-card {
    opacity: .7;
    filter: brightness(.85) blur(1px);
    box-shadow: 0 12px 30px rgba(0,0,0,.14);
  }

  &:hover {
    transform: translateX(285px) translateZ(-40.5px) rotateY(-38deg) scale(1.03);

    .fm-reflection {
      opacity: .21;
      filter: blur(0px);
    }
  }
}

@keyframes fm-float {
  0%, 100% { translate: 0 0; }
  50% { translate: 0 -3px; }
}

// 每张卡独立镜面倒影平面 (继承 wrapper 3D transform, 卡片下方弱镜像)
.fm-reflection-plane {
  position: absolute;
  left: 0;
  top: 100%;
  width: 100%;
  height: 369px;
  overflow: hidden;
  pointer-events: none;
  z-index: 2;
  border-radius: 28px;
  clip-path: inset(0 0 270px 0);
  -webkit-clip-path: inset(0 0 270px 0);
}

// 侧卡 3D 投影补偿
.fm-card-wrapper.fm-previous .fm-reflection-plane,
.fm-card-wrapper.fm-next .fm-reflection-plane {
  top: calc(100% + 2px);
}

.fm-reflection {
  position: absolute;
  left: 0;
  top: 306px;
  width: 100%;
  height: 306px;
  overflow: hidden;
  opacity: .25;
  filter: blur(3px);
  transform: scaleY(-1);
  transform-origin: center top;
  mask-image: linear-gradient(
    to top,
    rgba(0,0,0,.78) 0%,
    rgba(0,0,0,.45) 15%,
    rgba(0,0,0,.18) 25%,
    rgba(0,0,0,.04) 32%,
    transparent 35%
  );
  -webkit-mask-image: linear-gradient(
    to top,
    rgba(0,0,0,.78) 0%,
    rgba(0,0,0,.45) 15%,
    rgba(0,0,0,.18) 25%,
    rgba(0,0,0,.04) 32%,
    transparent 35%
  );
}

.fm-reflection img {
  width: 100%;
  height: 306px;
  object-fit: cover;
  display: block;
}
</style>
