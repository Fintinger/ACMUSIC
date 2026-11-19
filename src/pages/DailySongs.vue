<template>
  <div class="daily-songs">
    <!-- 页面头：与发现页/搜索页同一套 hero 规格（原先是 96px 居中大标题 + 12.8px 副标题）。
         播放全部放在 hero 右侧，列表内不再重复（need-btn=false） -->
    <header class="daily-hero">
      <div class="daily-hero-main">
        <h1 class="daily-title">{{ mode === 'style' ? '风格推荐' : '每日推荐' }}</h1>
        <p class="daily-sub">
          <template v-if="mode === 'style'">
            {{ styleLabel }} · 按你选的风格生成 · 每天 6:00 更新
            <button type="button" class="daily-link" @click="backToDaily">回到每日推荐</button>
          </template>
          <template v-else>{{ today }} · 根据你的音乐口味生成 · 每天 6:00 更新</template>
        </p>
      </div>
      <div class="daily-actions">
        <button type="button" class="daily-style-btn" :class="{ 'is-open': styleOpen }" @click="toggleStyle">
          <BaseIcon name="explore"/><span>风格</span>
        </button>
        <button v-if="list.length" type="button" class="daily-play" @click="playAll">
          <BaseIcon name="play"/><span>播放全部</span>
        </button>
      </div>
    </header>

    <!-- 风格选择：两行 chip（分类 → 标签），应用后写入账号并换成风格日推 -->
    <section v-if="styleOpen" class="style-panel">
      <p v-if="styleLoading" class="style-tip">正在读取风格配置…</p>
      <p v-else-if="styleError" class="style-tip is-error">{{ styleError }}</p>
      <template v-else>
        <div class="style-cats">
          <button
              v-for="c in categories"
              :key="c.categoryId"
              type="button"
              class="style-cat"
              :class="{ active: c.categoryId === activeCat }"
              @click="pickCategory(c.categoryId)"
          >{{ c.categoryName }}</button>
        </div>
        <div class="style-tags">
          <button
              v-for="t in activeTags"
              :key="t.tagId"
              type="button"
              class="style-tag"
              :class="{ active: picked.indexOf(t.tagId) > -1 }"
              @click="toggleTag(t.tagId)"
          >{{ t.tagName }}</button>
        </div>
        <div class="style-foot">
          <span class="style-hint">{{ styleHint }}</span>
          <button
              type="button"
              class="style-apply"
              :disabled="applying || !picked.length"
              @click="applyStyle"
          >{{ applying ? '应用中…' : '应用' }}</button>
        </div>
      </template>
    </section>

    <p v-if="loading" class="daily-songs__tip">加载中…</p>
    <EmptyState
        v-else-if="error"
        icon="disc"
        :title="error"
        desc="每日推荐需要登录后才会生成，每天 6:00 更新一次"
        action-text="重新加载"
        @action="fetchDailySongs"
    />
    <TracksLayout v-else-if="list.length" :list="list" :need-btn="false" :show-reason="mode === 'daily'"/>
    <EmptyState
        v-else
        icon="disc"
        title="今天还没有推荐"
        desc="登录后每天 6:00 会生成属于你的每日推荐"
    />
  </div>
</template>

<script>
import TracksLayout from "@/components/layout/TracksLayout";
import EmptyState from "@/components/common/EmptyState";
import * as tracksApi from "@/api/Tracks";
import * as recommendApi from "@/api/Recommend";
import {normalizeTrack} from "@/utils/normalize";
import {isLoggedIn} from "@/utils/auth";

export default {
  name: "DailySongs",
  components: {TracksLayout, EmptyState},
  props: {
    // 首页通过非 path 路由参数传入的 JSON 字符串; 刷新/直开时为空
    dailySongs: {type: String, default: ''}
  },
  data() {
    return {
      list: [],
      loading: true,
      error: '',
      today: '',
      // daily = 每日推荐 / style = 风格推荐
      mode: 'daily',
      styleOpen: false,
      styleLoading: false,
      styleError: '',
      categories: [],
      activeCat: 0,
      picked: [],
      applying: false,
      styleLabel: ''
    }
  },
  computed: {
    activeTags() {
      const cat = this.categories.find(c => c.categoryId === this.activeCat)
      return (cat && cat.tagVOList) || []
    },
    styleHint() {
      if (!isLoggedIn()) return '未登录：可以选择，但保存会失败'
      return this.picked.length ? '点「应用」后会同步到你的网易云账号' : '先选一个风格标签'
    }
  },
  created() {
    const d = new Date()
    this.today = `${d.getMonth() + 1} 月 ${d.getDate()} 日`
    // 1) 有路由参数: 直接取用(首页跳转路径)
    if (this.dailySongs) {
      try {
        const list = JSON.parse(this.dailySongs)
        if (!Array.isArray(list)) throw new Error('Invalid daily songs')
        this.list = list.map(normalizeTrack)
        this.loading = false
        return
      } catch (e) {
        // 参数损坏 -> 走下面的接口兜底
      }
    }
    // 2) 无参数(刷新 / 直开): 重新拉取, 避免模板里 JSON.parse(undefined) 崩溃
    this.fetchDailySongs()
  },
  methods: {
    playAll() {
      if (!this.list.length) return
      // 跳过黑名单：列表里已经隐藏了，播放全部也不能把它们带进队列
      const isBlocked = this.$store.getters['BlockAbout/isTrackBlocked']
      const playable = this.list.filter(t => !isBlocked(t))
      if (!playable.length) {
        this.$toast.info('这些歌都在音乐黑名单里')
        return
      }
      this.$store.dispatch('TracksAbout/playAllTracks', playable)
    },
    /** 从响应里取歌曲数组：v1 与老接口都放在 data.dailySongs */
    readDaily(res) {
      const daily = res && res.data && res.data.data && res.data.data.dailySongs
      return Array.isArray(daily) ? daily : null
    },
    fetchDailySongs() {
      this.loading = true
      this.error = ''
      this.mode = 'daily'
      // 先用 v1（多带推荐理由），失败或结构异常再退回老接口
      return tracksApi.recommendSongsV1()
          .then(res => this.readDaily(res) || tracksApi.recommendSongs().then(r2 => {
            const daily = this.readDaily(r2)
            if (!daily) throw new Error('Invalid daily songs response')
            return daily
          }))
          .then(daily => {
            this.list = daily.map(normalizeTrack)
          })
          .catch(() => {
            // 未登录时该接口返回 301, 此处只做兜底提示, 不再抛到渲染期
            this.error = '每日推荐加载失败'
          })
          .finally(() => {
            this.loading = false
          })
    },
    toggleStyle() {
      this.styleOpen = !this.styleOpen
      if (this.styleOpen && !this.categories.length) this.loadStyleConfig()
    },
    /** 拉分类配置，顺带取一次当前生效的风格（响应里的 tags 就是已保存的那组） */
    loadStyleConfig() {
      this.styleLoading = true
      this.styleError = ''
      Promise.all([
        recommendApi.categoryConfigs(),
        recommendApi.categorySongs().catch(() => null)
      ])
          .then(([cfgRes, songsRes]) => {
            const cats = (cfgRes.data && cfgRes.data.data && cfgRes.data.data.categorys) || []
            if (!cats.length) throw new Error('empty configs')
            this.categories = cats
            const current = songsRes && songsRes.data && songsRes.data.data && songsRes.data.data.tags
            const currentCat = current && current.categoryId
            this.activeCat = currentCat || cats[0].categoryId
            this.picked = ((current && current.tagVOList) || []).map(t => t.tagId)
          })
          .catch(() => {
            this.styleError = '风格配置加载失败，请稍后重试'
          })
          .finally(() => {
            this.styleLoading = false
          })
    },
    pickCategory(id) {
      if (this.activeCat === id) return
      this.activeCat = id
      // 标签是按分类保存的，跨分类保留旧选择没有意义
      this.picked = []
    },
    toggleTag(id) {
      const i = this.picked.indexOf(id)
      if (i > -1) this.picked.splice(i, 1)
      else this.picked.push(id)
    },
    applyStyle() {
      if (this.applying || !this.picked.length) return
      if (!isLoggedIn()) {
        this.styleError = '需要登录后才能保存风格'
        return
      }
      this.applying = true
      this.styleError = ''
      recommendApi.categorySet(this.activeCat, this.picked)
          .then(() => recommendApi.categorySongs())
          .then(res => {
            const daily = this.readDaily(res)
            if (!daily) throw new Error('invalid')
            this.list = daily.map(normalizeTrack)
            const cat = this.categories.find(c => c.categoryId === this.activeCat)
            const names = this.activeTags.filter(t => this.picked.indexOf(t.tagId) > -1).map(t => t.tagName)
            this.styleLabel = [cat && cat.categoryName, names.join(' / ')].filter(Boolean).join(' · ')
            this.mode = 'style'
            this.styleOpen = false
          })
          .catch(() => {
            this.styleError = '应用失败：保存或取歌没成功，请重试'
          })
          .finally(() => {
            this.applying = false
          })
    },
    backToDaily() {
      this.fetchDailySongs()
    }
  }
}
</script>

<style scoped lang="scss">
@import "src/assets/scss/dailyTracks";

.daily-actions {
  display: flex; align-items: center; gap: 10px; flex-shrink: 0;
}

// 与「播放全部」并排的次级按钮：描边胶囊，不抢主按钮
.daily-style-btn {
  display: inline-flex; align-items: center; gap: 6px;
  height: 34px; padding: 0 16px;
  border-radius: $radius-pill;
  border: 1px solid var(--c-border-strong);
  background: transparent;
  color: var(--c-text-secondary);
  font-size: 13px; font-weight: 600; font-family: inherit;
  cursor: pointer;
  transition: color .2s ease, border-color .2s ease, background .2s ease;

  &:hover { color: var(--c-text-primary); border-color: var(--c-border-primary); }
  &.is-open {
    color: var(--c-text-on-accent);
    background: var(--c-button-primary);
    border-color: transparent;
  }
}

.daily-link {
  margin-left: 8px; padding: 0;
  border: none; background: none;
  color: var(--c-text-link, #6b8afd);
  font-size: 13px; font-family: inherit; cursor: pointer;
  text-decoration: underline;
}

.style-panel {
  margin: 0 0 $sp-4;
  padding: $sp-4 $sp-4 $sp-3;
  border-radius: 16px;
  background: var(--c-bg-sunken);
  border: 1px solid var(--c-border);
}

.style-tip {
  margin: 0; padding: 6px 2px; font-size: 13px; color: var(--c-text-tertiary);
  &.is-error { color: var(--c-warning, #d9534f); }
}

.style-cats, .style-tags { display: flex; flex-wrap: wrap; gap: 8px; }
.style-cats { margin-bottom: 12px; }

.style-cat {
  height: 28px; padding: 0 14px;
  border-radius: $radius-pill;
  border: 1px solid transparent;
  background: transparent;
  color: var(--c-text-tertiary);
  font-size: 13px; font-family: inherit; cursor: pointer;

  &:hover { color: var(--c-text-primary); }
  &.active {
    color: var(--c-text-primary);
    font-weight: 600;
    background: var(--c-bg-elevated);
    border-color: var(--c-border-strong);
  }
}

.style-tag {
  height: 30px; padding: 0 14px;
  border-radius: $radius-pill;
  border: 1px solid var(--c-border-strong);
  background: transparent;
  color: var(--c-text-secondary);
  font-size: 13px; font-family: inherit; cursor: pointer;
  transition: all .18s ease;

  &:hover { border-color: var(--c-border-primary); color: var(--c-text-primary); }
  &.active {
    color: var(--c-text-on-accent);
    background: var(--c-button-primary);
    border-color: transparent;
  }
}

.style-foot {
  display: flex; align-items: center; justify-content: space-between;
  gap: $sp-3; margin-top: 14px;
}

.style-hint { font-size: 12px; color: var(--c-text-tertiary); }

.style-apply {
  flex-shrink: 0;
  height: 32px; padding: 0 20px;
  border: none; border-radius: $radius-pill;
  background: var(--c-button-primary);
  color: var(--c-text-on-accent);
  font-size: 13px; font-weight: 600; font-family: inherit;
  cursor: pointer;
  transition: opacity .2s ease;

  &:disabled { opacity: .45; cursor: not-allowed; }
}
</style>
