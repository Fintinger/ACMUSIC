<template>
  <div class="annual-page">
    <header class="an-hero">
      <p class="an-kicker">年度听歌报告</p>
      <h1 class="an-title">{{ spanText }}</h1>
      <p class="an-sub">
        每年一首「年度之歌」和一位「年度歌手」，外加当年的播放量。数据取自网易云年度报告与听歌足迹接口，仅本人可见。
      </p>
    </header>

    <!-- 未登录 -->
    <div v-if="!isLogin" class="an-state">
      <p class="an-state-title">需要登录</p>
      <p class="an-state-desc">年度报告只有本人能看，先去<router-link to="/user">登录</router-link>。</p>
    </div>

    <!-- 加载 -->
    <div v-else-if="loading" class="an-loading">
      <div v-for="n in 4" :key="n" class="an-skel">
        <div class="an-skel-year"></div>
        <div class="an-skel-card"></div>
      </div>
      <p class="an-loading-tip">正在拉取报告…接口有频控，需要逐年串行请求</p>
    </div>

    <!-- 失败 -->
    <div v-else-if="error" class="an-state is-error">
      <p class="an-state-title">没拿到数据</p>
      <p class="an-state-desc">{{ error }}</p>
      <button class="an-retry" @click="load">重试</button>
    </div>

    <!-- 空 -->
    <div v-else-if="!rows.length" class="an-state">
      <p class="an-state-title">这些年还没有报告</p>
      <p class="an-state-desc">接口只保留 2017–2024 的年度报告，且需要当年有足够的听歌记录。</p>
    </div>

    <template v-else>
      <div class="an-stats">
        <div class="an-stat">
          <p class="an-stat-num">{{ rows.length }}</p>
          <p class="an-stat-label">个年份</p>
        </div>
        <div class="an-stat">
          <p class="an-stat-num">{{ totalHours }}</p>
          <p class="an-stat-label">小时累计</p>
        </div>
        <div class="an-stat">
          <p class="an-stat-num">{{ singerCount }}</p>
          <p class="an-stat-label">位不同的年度歌手</p>
        </div>
      </div>

      <ol class="an-tl">
        <li v-for="row in rows" :key="row.year" class="an-item">
          <div class="an-year">
            <span class="an-year-num">{{ row.year }}</span>
            <span v-if="row.song && row.song.publishYear" class="an-year-extra">曲发行于 {{ row.song.publishYear }}</span>
          </div>

          <div class="an-rail"><span class="an-dot"></span></div>

          <div class="an-body">
            <div v-if="row.stats" class="an-volume">
              <span class="an-volume-dur">{{ fmtHours(row.stats.playDuration) }}</span>
              <span v-if="row.countReliable" class="an-volume-sub">{{ row.stats.playNum }} 次播放</span>
              <span v-else class="an-volume-sub is-unknown" title="该年的播放次数口径与其它年份不一致，故不展示">播放次数口径异常</span>
            </div>
            <div v-if="row.stats" class="an-bar">
              <span class="an-bar-fill" :style="{ width: barWidth(row) }"></span>
            </div>

            <div v-if="row.song" class="an-song" :title="'播放 ' + row.song.name" @click="play(row.song)">
              <cover-image class="an-cover" :src="row.song.cover | imgParam('200y200')" :alt="row.song.name + '的封面'"/>
              <div class="an-song-meta">
                <p class="an-song-name">
                  {{ row.song.name }}
                  <span v-if="row.song.approx" class="an-approx">月报聚合</span>
                </p>
                <p class="an-song-artist">{{ row.song.artist || '未知歌手' }}</p>
                <p v-if="row.song.playCnt" class="an-song-plays">
                  全年 {{ row.song.playCnt }} 次
                  <template v-if="row.song.playDays"> · {{ row.song.playDays }} 天</template>
                  <template v-if="row.song.userCount"> · 同年 {{ row.song.userCount }} 人同选</template>
                </p>
              </div>
              <span class="an-play">播放</span>
            </div>
            <div v-else class="an-missing">
              <span class="an-missing-text">{{ missingSongText(row) }}</span>
              <template v-if="row.year > LAST_ANNUAL_YEAR">
                <button v-if="!aggLoading" class="an-agg-btn" @click="buildYearAgg(row.year)">
                  用 {{ row.year }} 的月报拼一份
                </button>
                <span v-else-if="aggYear === row.year" class="an-agg-progress">{{ aggProgress }}</span>
                <span v-if="aggError && aggErrorYear === row.year" class="an-agg-error">{{ aggError }}</span>
              </template>
            </div>

            <div v-if="row.singer" class="an-singer">
              <span class="an-singer-label">年度歌手</span>
              <cover-image v-if="row.singer.cover" class="an-singer-cover" :src="row.singer.cover | imgParam('100y100')" :alt="row.singer.name + '的头像'"/>
              <span class="an-singer-name">{{ row.singer.name }}</span>
              <span v-if="row.singer.approx" class="an-approx">月报聚合</span>
              <span v-else-if="firstName === row.singer.name" class="an-singer-badge">最常出现</span>
            </div>
            <div v-else class="an-singer is-missing">
              <span class="an-singer-label">年度歌手</span>
              <span class="an-singer-name">{{ row.year > LAST_ANNUAL_YEAR ? '暂未开放' : '该年接口未提供' }}</span>
            </div>
          </div>
        </li>
      </ol>

      <p v-for="(note, i) in notes" :key="'n' + i" class="an-note">{{ note }}</p>

      <p class="an-foot">
        数据来源：<code>/listen/data/year/report</code>（逐年次数与时长，统一为秒，含 2025）
        + <code>/summary/annual</code>（年度之歌与年度歌手，网关仅到 2024）。
        2016–2022 的年度之歌来自 2023 年报告内置的「云村足迹」，年度歌手仅 2019 年起有数据；
        2025 年的年度之歌/歌手尚未开放，因此只显示播放量。
      </p>
    </template>
  </div>
</template>

<script>
import * as Summary from "@/api/Summary";
import { mergeTimeline, describeFailure, pickYearStats, monthEnd, aggregateYearRank } from "@/utils/annualReport";
import { isLoggedIn } from "@/utils/auth";
import CoverImage from "@/components/common/CoverImage";

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// 网关 /summary/annual 的年份白名单上限（超出返回「接口未找到！」）
const LAST_ANNUAL_YEAR = 2024

// 月报聚合结果缓存：12 次请求太贵，只跑一次
const AGG_CACHE_KEY = 'acmusic_annual_agg_v1'

// 串行请求的年份：2024 提供 2020–2024 年度歌手 + 2024 年度之歌，
// 2023 提供 2016–2022 年度之歌（yuncunFootprintPage）+ 2019–2023 年度歌手。
const FETCH_YEARS = [2024, 2023]

/** 秒 → 「N 小时」 */
function formatHours(sec) {
  const h = Math.round((Number(sec) || 0) / 3600)
  return h.toLocaleString('zh-CN') + ' 小时'
}

export default {
  name: "AnnualReport",
  components: {CoverImage},
  data() {
    return {
      loading: true,
      error: '',
      rows: [],
      notes: [],
      // 2025 这类「没有官方年报」的年份，用月报聚合补一份近似值
      aggLoading: false,
      aggYear: null,
      aggProgress: '',
      aggError: '',
      aggErrorYear: null,
      LAST_ANNUAL_YEAR
    }
  },
  computed: {
    isLogin() {
      // 用 cookie 判据而不是 store.state.UserAbout.IS_LOGIN：
      // 后者只在进过「我的」页并 /login/status 成功后才被置 true，
      // 直接打开 /annual 时它还是初始值 false，会把已登录用户误判成未登录。
      return isLoggedIn()
    },
    spanText() {
      if (!this.rows.length) return '你的音乐轨迹'
      const years = this.rows.map(r => r.year)
      const max = Math.max(...years)
      const min = Math.min(...years)
      return max === min ? `${max} 年` : `${min} → ${max} 的 ${max - min + 1} 年`
    },
    songYears() {
      return this.rows.filter(r => r.song).length
    },
    /** 所有年份累计收听小时（数据来自 /listen/data/year/report） */
    totalHours() {
      const sec = this.rows.reduce((sum, r) => sum + ((r.stats && r.stats.playDuration) || 0), 0)
      return Math.round(sec / 3600).toLocaleString('zh-CN')
    },
    /** 出现次数最多的年度歌手（并列取最近一年） */
    firstName() {
      const counter = new Map()
      this.rows.forEach(r => {
        if (!r.singer) return
        const cur = counter.get(r.singer.name) || {count: 0, latest: r.year}
        counter.set(r.singer.name, {count: cur.count + 1, latest: Math.max(cur.latest, r.year)})
      })
      let best = null
      counter.forEach((v, name) => {
        if (!best || v.count > best.count || (v.count === best.count && v.latest > best.latest)) {
          best = {name, ...v}
        }
      })
      return best && best.count > 1 ? best.name : ''
    },
    singerCount() {
      const set = new Set()
      this.rows.forEach(r => r.singer && set.add(r.singer.name))
      return set.size
    }
  },
  methods: {
    fmtHours(sec) {
      return formatHours(sec)
    },
    barWidth(row) {
      const r = (row && row.ratio) || 0
      // 留 4% 下限，避免极少年份条形直接消失
      return Math.max(4, Math.round(r * 100)) + '%'
    },
    missingSongText(row) {
      return row.year > LAST_ANNUAL_YEAR
        ? `年报接口只到 ${LAST_ANNUAL_YEAR}，${row.year} 暂无年度之歌`
        : '该年未提供年度之歌'
    },
    /* ---------- 2025 的月报聚合 ---------- */

    saveAggCache(year, agg) {
      try {
        const all = JSON.parse(localStorage.getItem(AGG_CACHE_KEY) || '{}')
        all[year] = agg
        localStorage.setItem(AGG_CACHE_KEY, JSON.stringify(all))
      } catch (e) { /* 隐私模式写不进去，忽略 */ }
    },
    restoreAggCache() {
      try {
        const all = JSON.parse(localStorage.getItem(AGG_CACHE_KEY) || '{}')
        Object.keys(all).forEach(year => this.applyAgg(Number(year), all[year]))
      } catch (e) { /* 缓存损坏就当没缓存 */ }
    },
    /** 把聚合结果贴到对应的年份行上 */
    applyAgg(year, agg) {
      const row = this.rows.find(r => r.year === year)
      if (!row || !agg) return
      if (agg.topSong) {
        this.$set(row, 'song', {
          id: agg.topSong.id,
          name: agg.topSong.name,
          artist: agg.topSong.artist || '',
          cover: agg.topSong.cover || '',
          playCnt: agg.topSong.playCnt,
          playDays: null,
          userCount: null,
          approx: true
        })
      }
      if (agg.topArtist) {
        this.$set(row, 'singer', {
          id: null,
          name: agg.topArtist.name,
          cover: '',
          approx: true
        })
      }
    },
    /**
     * 逐月拉 TOP20 再聚合。12 次请求约 20 秒，所以：
     * 只在用户点按钮时触发、700ms 间隔躲频控、结果落 localStorage。
     */
    buildYearAgg(year) {
      if (this.aggLoading) return
      this.aggLoading = true
      this.aggYear = year
      this.aggError = ''
      this.aggErrorYear = null

      const run = async () => {
        const bodies = []
        for (let m = 1; m <= 12; m++) {
          this.aggProgress = `正在取 ${m}/12 月…`
          try {
            const body = await this.withRetry(() => Summary.listenSongRank(monthEnd(year, m)))
            if (body) bodies.push(body)
          } catch (e) { /* 单月失败不中断整体 */ }
          if (m < 12) await sleep(700)
        }
        const agg = aggregateYearRank(bodies)
        if (!agg.months) {
          this.aggError = '12 个月都没数据，可能该年没有听歌记录'
          this.aggErrorYear = year
        } else {
          this.applyAgg(year, agg)
          this.saveAggCache(year, agg)
          this.notes.push(
            `${year} 的年度之歌/歌手是「月报聚合」估算（覆盖 ${agg.months} 个月、${agg.songCount} 首歌），非官方年报`
          )
        }
        this.aggProgress = ''
        this.aggLoading = false
        this.aggYear = null
      }
      run()
    },
    /**
     * 单次请求 + 重试。
     * 网关对连续请求会返回伪 301（「需要登录」），实测间隔 3s 全部恢复，
     * 所以这里把 301 与网络异常都当作可重试，退避 900ms。
     */
    withRetry(fn, retries = 2) {
      return fn()
        .then(res => (res && res.data) || null)
        .catch(err => {
          if (retries <= 0) throw err
          return sleep(900).then(() => this.withRetry(fn, retries - 1))
        })
        .then(body => {
          if (body && body.code === 301 && retries > 0) {
            return sleep(900).then(() => this.withRetry(fn, retries - 1))
          }
          return body
        })
    },
    fetchYear(year) {
      return this.withRetry(() => Summary.annual(year))
    },
    async load() {
      this.loading = true
      this.error = ''
      this.rows = []
      this.notes = []
      if (!this.isLogin) {
        this.loading = false
        return
      }

      // 1) 逐年量化数据：一次拿全 2017–2025，统一秒，是这条时间线的骨架
      let statsMap = null
      let statsBody = null
      try {
        statsBody = await this.withRetry(() => Summary.listenYearReport())
        if (statsBody && statsBody.code === 200) {
          statsMap = pickYearStats(statsBody).stats
        }
      } catch (e) {
        this.notes.push('逐年播放量获取失败：' + ((e && e.message) || '网络错误'))
      }
      await sleep(320)

      // 2) 年报：补「年度之歌 / 年度歌手」（网关只到 2024）
      const sources = []
      let lastBody = null
      for (const year of FETCH_YEARS) {
        try {
          const body = await this.fetchYear(year)
          lastBody = body
          if (body && body.code === 200) sources.push({year, body})
        } catch (e) {
          this.notes.push(`${year} 年报告请求异常：${(e && e.message) || '网络错误'}`)
        }
        // 串行 + 间隔，避免触发网关频控（并发拉取会整批伪 301）
        await sleep(320)
      }

      if (!sources.length && !(statsMap && statsMap.size)) {
        this.error = describeFailure(lastBody || statsBody) || '没拿到任何年度数据'
        this.loading = false
        return
      }

      this.rows = mergeTimeline(sources, statsMap)
      this.restoreAggCache()
      if (!this.rows.length) this.error = '数据取到了，但里面没有年度内容'
      if (!sources.length) {
        this.notes.push('年度之歌/歌手没取到，只显示了播放量')
      } else if (sources.length < FETCH_YEARS.length) {
        this.notes.push('部分年份报告没取到，年度之歌可能不完整（已取到：' + sources.map(s => s.year).join('、') + '）')
      }
      this.loading = false
    },
    play(song) {
      if (!song || !song.id) return
      // 与 TracksLayout 一致：只传 id/name，PlayerCore 会自己拉详情和音源
      this.$bus.$emit('songClk', {id: song.id, name: song.name})
    }
  },
  mounted() {
    this.load()
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/base/variables";

.annual-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 24px 96px;
}

/* ---------- 头部 ---------- */
.an-hero {
  padding: 48px 0 28px;

  .an-kicker {
    margin: 0 0 10px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 2px;
    color: $color-main;
    text-transform: uppercase;
  }

  .an-title {
    margin: 0 0 10px;
    font-size: 34px;
    font-weight: 700;
    color: $font-black;
    letter-spacing: -.5px;
  }

  .an-sub {
    margin: 0;
    font-size: 13px;
    line-height: 1.7;
    color: $font-black-2;
    max-width: 620px;
  }
}

/* ---------- 汇总数字 ---------- */
.an-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 32px;
}

.an-stat {
  background: $color-theme-sec;
  border: 1px solid rgba(0, 0, 0, .04);
  border-radius: 16px;
  padding: 18px 20px;

  .an-stat-num {
    margin: 0 0 4px;
    font-size: 28px;
    font-weight: 700;
    line-height: 1;
    color: $color-main-1;
    font-variant-numeric: tabular-nums;
  }

  .an-stat-label {
    margin: 0;
    font-size: 12px;
    color: $font-black-2;
  }
}

/* ---------- 时间轴 ---------- */
.an-tl {
  list-style: none;
  margin: 0;
  padding: 0;
}

.an-item {
  display: grid;
  grid-template-columns: 92px 24px 1fr;
  align-items: stretch;

  &:last-child .an-rail::after { display: none; }
}

.an-year {
  padding: 14px 0 0;
  text-align: right;

  .an-year-num {
    display: block;
    font-size: 22px;
    font-weight: 700;
    line-height: 1;
    color: $font-black;
    font-variant-numeric: tabular-nums;
  }

  .an-year-extra {
    display: block;
    margin-top: 6px;
    font-size: 11px;
    color: $font-black-2;
  }
}

.an-rail {
  position: relative;
  display: flex;
  justify-content: center;

  &::after {
    content: '';
    position: absolute;
    top: 22px;
    bottom: -14px;
    width: 1px;
    background: linear-gradient(180deg, rgba($color-main, .35), rgba(0, 0, 0, .06));
  }

  .an-dot {
    position: relative;
    z-index: 1;
    width: 9px;
    height: 9px;
    margin-top: 18px;
    border-radius: 50%;
    background: $color-main;
    box-shadow: 0 0 0 4px rgba($color-main, .14);
  }
}

.an-body {
  padding: 12px 0 20px;
}

/* ---------- 当年播放量 ---------- */
.an-volume {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 6px;

  .an-volume-dur {
    font-size: 15px;
    font-weight: 600;
    color: $font-black;
    font-variant-numeric: tabular-nums;
  }

  .an-volume-sub {
    font-size: 12px;
    color: $font-black-2;

    &.is-unknown {
      font-style: italic;
      opacity: .75;
      cursor: help;
      border-bottom: 1px dashed rgba(0, 0, 0, .18);
    }
  }
}

.an-bar {
  height: 4px;
  margin-bottom: 12px;
  border-radius: 999px;
  background: rgba(0, 0, 0, .05);
  overflow: hidden;

  .an-bar-fill {
    display: block;
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, rgba($color-main, .55), $color-main);
    transition: width .5s $player-ease-out;
  }
}

/* ---------- 年度之歌卡 ---------- */
.an-song {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, .62);
  border: 1px solid rgba(0, 0, 0, .05);
  border-radius: 16px;
  cursor: pointer;
  transition: background .2s, transform .2s, box-shadow .2s;

  &:hover {
    background: rgba(255, 255, 255, .92);
    transform: translateY(-1px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, .06);

    .an-play { opacity: 1; }
  }

  .an-cover {
    width: 56px;
    height: 56px;
    flex: 0 0 56px;
    border-radius: 10px;
    object-fit: cover;
    background: $color-theme-sec;
  }

  .an-song-meta {
    min-width: 0;
    flex: 1;
  }

  .an-song-name {
    margin: 0 0 3px;
    font-size: 15px;
    font-weight: 600;
    color: $font-black;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .an-song-artist {
    margin: 0;
    font-size: 13px;
    color: $font-black-1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .an-song-plays {
    margin: 5px 0 0;
    font-size: 12px;
    color: $font-black-2;
  }

  .an-play {
    flex: 0 0 auto;
    padding: 5px 12px;
    border: none;
    border-radius: 999px;
    background: rgba($color-main, .12);
    color: $color-main-1;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    opacity: 0;
    transition: opacity .2s;
  }
}

/* ---------- 年度歌手 ---------- */
.an-singer {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  padding-left: 4px;

  .an-singer-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .5px;
    color: $font-black-2;
  }

  .an-singer-cover {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    object-fit: cover;
    background: $color-theme-sec;
  }

  .an-singer-name {
    font-size: 13px;
    color: $font-black-1;
  }

  .an-singer-badge {
    padding: 1px 7px;
    border-radius: 999px;
    background: rgba($color-ornament, .2);
    color: #3f8f70;
    font-size: 11px;
  }

  &.is-missing .an-singer-name {
    color: $font-black-2;
    font-style: italic;
  }
}

.an-missing {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 14px 16px;
  border: 1px dashed rgba(0, 0, 0, .09);
  border-radius: 16px;
  font-size: 13px;
  color: $font-black-2;

  .an-agg-btn {
    padding: 4px 12px;
    border: 1px solid rgba($color-main, .35);
    border-radius: 999px;
    background: transparent;
    color: $color-main-1;
    font-size: 12px;
    cursor: pointer;
    transition: background .2s;

    &:hover { background: rgba($color-main, .08); }
  }

  .an-agg-progress {
    font-size: 12px;
    color: $color-main-1;
    font-variant-numeric: tabular-nums;
  }

  .an-agg-error {
    flex-basis: 100%;
    font-size: 12px;
    color: #c04a45;
  }
}

/* 月报聚合的近似值标记，避免与官方年报混淆 */
.an-approx {
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba($color-ornament, .18);
  color: #3f8f70;
  font-size: 10px;
  font-weight: 500;
  vertical-align: middle;
  white-space: nowrap;
}

/* ---------- 状态位 ---------- */
.an-state {
  padding: 56px 24px;
  text-align: center;
  background: rgba(255, 255, 255, .5);
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, .05);

  .an-state-title {
    margin: 0 0 8px;
    font-size: 17px;
    font-weight: 600;
    color: $font-black;
  }

  .an-state-desc {
    margin: 0;
    font-size: 13px;
    color: $font-black-2;
  }

  &.is-error .an-state-title { color: #c04a45; }

  .an-retry {
    margin-top: 18px;
    padding: 7px 20px;
    border: 1px solid rgba($color-main, .35);
    border-radius: 999px;
    background: transparent;
    color: $color-main-1;
    font-size: 13px;
    cursor: pointer;

    &:hover { background: rgba($color-main, .08); }
  }
}

/* ---------- 骨架 ---------- */
.an-loading { padding-top: 8px; }

.an-skel {
  display: grid;
  grid-template-columns: 92px 24px 1fr;
  gap: 0;
  margin-bottom: 16px;

  .an-skel-year,
  .an-skel-card {
    border-radius: 12px;
    background: linear-gradient(90deg, rgba(0, 0, 0, .045) 25%, rgba(0, 0, 0, .07) 37%, rgba(0, 0, 0, .045) 63%);
    background-size: 400% 100%;
    animation: an-shimmer 1.4s ease infinite;
  }

  .an-skel-year { height: 26px; margin-top: 12px; margin-right: 16px; }
  .an-skel-card { height: 80px; }
}

@keyframes an-shimmer {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}

.an-loading-tip {
  margin: 8px 0 0;
  font-size: 12px;
  color: $font-black-2;
  text-align: center;
}

/* ---------- 脚注 ---------- */
.an-note {
  margin: 12px 0 0;
  padding: 10px 14px;
  border-radius: 10px;
  background: rgba(0, 0, 0, .03);
  font-size: 12px;
  color: $font-black-2;
}

.an-foot {
  margin: 28px 0 0;
  padding-top: 18px;
  border-top: 1px solid rgba(0, 0, 0, .05);
  font-size: 12px;
  line-height: 1.8;
  color: $font-black-2;

  code {
    padding: 1px 5px;
    border-radius: 4px;
    background: rgba(0, 0, 0, .05);
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 11px;
  }
}

/* ---------- 窄屏 ---------- */
@media (max-width: 640px) {
  .an-hero .an-title { font-size: 26px; }
  .an-stats { grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .an-stat { padding: 14px 12px; .an-stat-num { font-size: 22px; } }
  .an-item { grid-template-columns: 66px 18px 1fr; }
  .an-year .an-year-num { font-size: 18px; }
  .an-song { padding: 10px 12px; gap: 10px; }
  .an-song .an-cover { width: 44px; height: 44px; flex-basis: 44px; }
  .an-play { display: none; }
  .an-skel { grid-template-columns: 66px 18px 1fr; }
}
</style>
