<template>
  <div class="daily-songs">
    <h1>每日歌曲推荐</h1>
    <p>根据你的音乐口味生成 · 每天6:00更新</p>
    <p v-if="loading" class="daily-songs__tip">加载中…</p>
    <p v-else-if="error" class="daily-songs__tip">{{ error }}</p>
    <TracksLayout :list="list"/>
  </div>
</template>

<script>
import TracksLayout from "@/components/layout/TracksLayout";
import * as tracksApi from "@/api/Tracks";
import {normalizeTrack} from "@/utils/normalize";

export default {
  name: "DailySongs",
  components: {TracksLayout},
  props: {
    // 首页通过非 path 路由参数传入的 JSON 字符串; 刷新/直开时为空
    dailySongs: {type: String, default: ''}
  },
  data() {
    return {
      list: [],
      loading: true,
      error: '',
    }
  },
  created() {
    // 1) 有路由参数: 直接取用(首页跳转路径)
    if (this.dailySongs) {
      try {
        this.list = JSON.parse(this.dailySongs)
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
    fetchDailySongs() {
      this.loading = true
      this.error = ''
      tracksApi.recommendSongs()
          .then(res => {
            const daily = (res.data && res.data.data && res.data.data.dailySongs) || []
            this.list = daily.map(normalizeTrack)
            if (!this.list.length) {
              this.error = '暂无每日推荐, 请确认已登录'
            }
          })
          .catch(() => {
            // 未登录时该接口返回 301, 此处只做兜底提示, 不再抛到渲染期
            this.error = '每日推荐加载失败, 请重新登录后重试'
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

.daily-songs__tip {
  color: #888;
  font-size: 14px;
}
</style>
