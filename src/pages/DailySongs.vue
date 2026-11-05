<template>
  <div class="daily-songs">
    <!-- 页面头：与发现页/搜索页同一套 hero 规格（原先是 96px 居中大标题 + 12.8px 副标题）。
         播放全部放在 hero 右侧，列表内不再重复（need-btn=false） -->
    <header class="daily-hero">
      <div class="daily-hero-main">
        <h1 class="daily-title">每日推荐</h1>
        <p class="daily-sub">{{ today }} · 根据你的音乐口味生成 · 每天 6:00 更新</p>
      </div>
      <button v-if="list.length" type="button" class="daily-play" @click="playAll">
        <BaseIcon name="play"/><span>播放全部</span>
      </button>
    </header>

    <p v-if="loading" class="daily-songs__tip">加载中…</p>
    <EmptyState
        v-else-if="error"
        icon="disc"
        :title="error"
        desc="每日推荐需要登录后才会生成，每天 6:00 更新一次"
        action-text="重新加载"
        @action="fetchDailySongs"
    />
    <TracksLayout v-else-if="list.length" :list="list" :need-btn="false"/>
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
import {normalizeTrack} from "@/utils/normalize";

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
      today: ''
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
      this.$store.dispatch('TracksAbout/playAllTracks', this.list)
    },
    fetchDailySongs() {
      this.loading = true
      this.error = ''
      return tracksApi.recommendSongs()
          .then(res => {
            const daily = res.data && res.data.data && res.data.data.dailySongs
            if (!Array.isArray(daily)) throw new Error('Invalid daily songs response')
            this.list = daily.map(normalizeTrack)
          })
          .catch(() => {
            // 未登录时该接口返回 301, 此处只做兜底提示, 不再抛到渲染期
            this.error = '每日推荐加载失败'
          })
          .finally(() => {
            this.loading = false
          })
    }
  }
}
</script>

<style scoped lang="scss">
@import "src/assets/scss/dailyTracks";
</style>
