<template>
  <div
    ref="playerPanel"
    class="playerPanel"
    :class="{ expanded: showBar, paused: !isPlay, hasSong: currentSong.id }"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @mousemove="onMouseMove"
  >
    <div class="miniBar" @click="onProgressClick">
      <div class="miniTrack" ref="miniTrack">
        <div class="miniFill" :style="{ width: progress + '%' }"></div>
        <div v-if="chorusStyle" class="miniChorus" :class="{ on: effectiveForm === 'chorus' }" :style="chorusStyle"></div>
      </div>
    </div>
    <div class="fullBar" v-show="showBar" :style="miniBgStyle ? { background: miniBgStyle } : null">
      <div class="barLeft">
        <div class="barCover" @click="showSongDetail">
          <transition name="cover-fade" mode="out-in">
            <img v-if="coverUrl" :key="coverUrl" :src="coverUrl | imgParam('200y200')" alt="" />
            <div v-else key="placeholder" class="coverPlaceholder"><BaseIcon name="play"/></div>
          </transition>
        </div>
        <div class="barInfo" @click="showSongDetail">
          <div class="barInfoInner">
            <transition name="slide-up" mode="out-in">
              <p class="barTitle" :key="currentSong.id">{{ songName }}</p>
            </transition>
            <transition name="slide-up" mode="out-in">
              <p class="barArtist" :key="currentSong.id">{{ artistNames }}</p>
            </transition>
          </div>
        </div>
        <i :class="['likeBtn', { liked: isLiked }]" :title="isLiked?'取消收藏':'收藏'" @click.stop="toggleLike">
          <BaseIcon v-if="isLiked" name="likeFill"/>
          <BaseIcon v-else name="like"/>
        </i>
      </div>
      <div class="barCenter">
        <div class="barControls">
          <div class="modeWrap" ref="modeWrap">
            <span
                class="modeBtn"
                :class="['mode-' + playMode, { 'is-chorus': effectiveForm !== 'full' }]"
                :title="modeBtnTitle"
                @click="onModeClick"
                @contextmenu.prevent="openModeMenu"
                @mousedown="onModePress"
                @mouseup="onModeRelease"
                @mouseleave="onModeRelease"
            >
              <BaseIcon v-if="playMode === 'order'" name="loopList" :size="18"/>
              <BaseIcon v-else-if="playMode === 'random'" name="shuffle" :size="18"/>
              <BaseIcon v-else-if="playMode === 'sequence'" name="sequence" :size="18"/>
              <BaseIcon v-else name="loopOne" :size="18"/>
              <i v-if="effectiveForm === 'chorus'" class="chorusDot"></i>
            </span>
            <ModeMenu
                :visible="showModeMenu"
                :policy="playMode"
                :fm="isPersonalFM"
                @select-policy="setPlayMode"
            />
          </div>
          <span class="miniTrackBtn" @click="preSong"><BaseIcon name="prev" :size="18"/></span>
          <div class="barPlay" @click="togglePlay">
            <i v-if="isLoading" class="player-loading-spinner"></i>
            <transition v-else name="btn-swap" mode="out-in">
              <BaseIcon v-if="!isPlay" key="play" name="play"/>
              <BaseIcon v-else key="pause" name="pause"/>
            </transition>
          </div>
          <span class="miniTrackBtn" @click="nextSong"><BaseIcon name="next" :size="18"/></span>
        </div>
        <div class="barProgress">
          <span class="barTime">{{ formatTime(timeNow) }}</span>
          <div class="barTrack" ref="barTrack" :class="{ 'is-arming': abSetting }" @click="onProgressClick">
            <div class="barFill" :style="{ width: progress + '%' }">
              <div class="barThumb" ref="barThumb" @mousedown.stop="startDrag"></div>
            </div>
            <div
                v-if="chorusStyle"
                class="chorusBand"
                :class="{ on: effectiveForm === 'chorus' }"
                :style="chorusStyle"
            ></div>
            <div
                v-if="abStyle"
                class="abBand"
                :class="{ on: effectiveForm === 'ab' }"
                :style="abStyle"
            ></div>
            <!-- A 点已选、等 B 点时的临时标记 -->
            <div v-if="abStartStyle" class="abMark" :style="abStartStyle"></div>
          </div>
          <span class="barTime">{{ formatTime(timeDuration) }}</span>
        </div>
      </div>
      <div class="barRight">
        <div class="barItem volumeWrap">
          <BaseIcon ref="volumeBtn" name="volume" @click="showVolume = !showVolume"/>
          <transition name="volume-pop">
            <div v-if="showVolume" ref="volumeSlider" class="volumeSlider" @click.stop>
              <span class="volumeValue">{{ volume }}</span>
              <input v-model="volume" type="range" min="0" max="100" @input="onInteract" />
            </div>
          </transition>
        </div>
        <div class="barItem qualityWrap">
          <button ref="qualityBtn" class="qualityBtn" :class="{ 'is-unblock': currentQuality.isUnblock }" :title="qualityTitle" @click.stop="showQualityMenu = !showQualityMenu">
            {{ currentQualityShort }}
          </button>
          <QualityMenu ref="qualityMenu" :visible="showQualityMenu" :selected="config.player.level" :vip-type="vipType" @select="onQualitySelect" @need-vip="onNeedVip"/>
        </div>
        <div class="barItem chorusWrap">
          <el-dropdown trigger="click" placement="top" @command="setTrackForm" @visible-change="onChorusDropdown">
            <span
                class="chorusTrigger"
                :class="{ on: effectiveForm !== 'full', 'is-arming': abSetting }"
                :title="formTriggerTitle"
            >
              <BaseIcon :name="formIcon" :size="13"/>
              <span class="chorusLabel">{{ formLabel }}</span>
            </span>
            <el-dropdown-menu slot="dropdown" class="chorusDropdown">
              <el-dropdown-item command="full" :class="{ 'is-active': trackForm === 'full' }">完整播放</el-dropdown-item>
              <el-dropdown-item command="chorus" :class="{ 'is-active': trackForm === 'chorus' }">
                只播副歌
                <span v-if="!chorusRange" class="opt-hint">本曲无数据</span>
              </el-dropdown-item>
              <el-dropdown-item command="ab" :class="{ 'is-active': trackForm === 'ab' }">
                A-B 循环
                <span class="opt-hint">{{ abHint }}</span>
              </el-dropdown-item>
              <el-dropdown-item command="ab-here">
                {{ abStart === null ? '把当前位置设为 A' : '把当前位置设为 B' }}
              </el-dropdown-item>
              <el-dropdown-item v-if="abRangeValid" command="ab-clear">清除 A-B 区间</el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
        </div>
        <div class="barItem sleepWrap">
          <el-dropdown trigger="click" placement="top" @command="onSleepCommand" @visible-change="onChorusDropdown">
            <span class="sleepTrigger" :class="{ on: sleepActive }" :title="sleepTitle">
              <BaseIcon name="timer" :size="13"/>
              <span class="sleepLabel">{{ sleepLabel }}</span>
            </span>
            <el-dropdown-menu slot="dropdown" class="sleepDropdown">
              <el-dropdown-item command="off" :class="{ 'is-active': sleepMode === 'off' }">不定时</el-dropdown-item>
              <el-dropdown-item command="song" :class="{ 'is-active': sleepMode === 'song' }">播完本首停止</el-dropdown-item>

              <!-- 两档可调节：−/+ 步进，数字框里也能直接敲；改动即时生效 -->
              <div class="sdRow" :class="{ 'is-active': sleepMode === 'count' }" title="从现在起重新计数">
                <span class="sdLabel">再播</span>
                <span
                    class="sdStep"
                    :class="{ disabled: countValue <= 1 }"
                    @click.stop="stepSleep('count', -1)"
                >−</span>
                <input
                    class="sdNum"
                    type="text"
                    inputmode="numeric"
                    :value="countValue"
                    @click.stop
                    @change="onSleepNumInput('count', $event)"
                />
                <span
                    class="sdStep"
                    :class="{ disabled: countValue >= 99 }"
                    @click.stop="stepSleep('count', 1)"
                >+</span>
                <span class="sdUnit">首</span>
              </div>
              <div class="sdRow" :class="{ 'is-active': sleepMode === 'time' }" title="从现在起重新计时">
                <span class="sdLabel">播放</span>
                <span
                    class="sdStep"
                    :class="{ disabled: timeValue <= 1 }"
                    @click.stop="stepSleep('time', -1)"
                >−</span>
                <input
                    class="sdNum"
                    type="text"
                    inputmode="numeric"
                    :value="timeValue"
                    @click.stop
                    @change="onSleepNumInput('time', $event)"
                />
                <span
                    class="sdStep"
                    :class="{ disabled: timeValue >= 180 }"
                    @click.stop="stepSleep('time', 1)"
                >+</span>
                <span class="sdUnit">分钟</span>
              </div>

              <div class="sdFade" @click.stop="toggleSleepFade">
                <span>最后 {{ fadeSec }} 秒渐弱淡出</span>
                <i class="sdSwitch" :class="{ on: sleepFade }"></i>
              </div>
            </el-dropdown-menu>
          </el-dropdown>
        </div>
        <div class="barItem playlistWrap">
          <el-dropdown v-if="currentPlaylist.length" trigger="click" placement="top" @command="handleCommand" @visible-change="onDropdownToggle">
            <span class="playlistTrigger">
              <BaseIcon name="play"/>
              <span class="plCount">{{ currentPlaylist.length }}</span>
            </span>
            <el-dropdown-menu slot="dropdown" class="playlistDropdown">
              <div class="plHeader">
                <span>播放列表</span>
                <span class="plTotal">{{ currentPlaylist.length }} 首</span>
              </div>
              <div class="plActions">
                <el-button size="mini" type="text" @click="clearPlaylist">清空列表</el-button>
              </div>
              <div class="plItems">
                <el-dropdown-item v-for="s in currentPlaylist" :key="s.id" :class="{ active: s.curSong }" :command="s">
                  <span class="plSongName">{{ s.name }}</span>
                  <span class="plSongArtist">{{ getArtistStr(s) }}</span>
                  <span class="plOps">
                    <span class="plOp" title="下一首播放" @click.stop="playNext(s)"><BaseIcon name="next" :size="12"/></span>
                    <span class="plOp" title="从队列移除" @click.stop="removeFromQueue(s)"><BaseIcon name="close" :size="12"/></span>
                  </span>
                </el-dropdown-item>
              </div>
              <div v-if="!currentPlaylist.length" class="plEmpty">
                <div class="plEmptyIcon">♪</div>
                <p>播放列表为空</p>
                <p class="plEmptyHint">播放歌曲后会自动添加</p>
              </div>
            </el-dropdown-menu>
          </el-dropdown>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import pubsub from "pubsub-js";
import { mapState } from "vuex"
import { normalizeTrack } from "@/utils/normalize"
import config from "@/config"
import { buildBackground } from "@/utils/colorExtractor"
import QualityMenu from "@/components/musicPlayer/QualityMenu"
import ModeMenu from "@/components/musicPlayer/ModeMenu"
import { setAudioCache, getAudioCache, getAudioUrl, removeAudioCache } from "@/utils/audioCache"
import { getChorus } from "@/utils/chorusCache"
import { setSongTitle, clearSongTitle, BASE } from "@/utils/title";
import * as tracks from "@/api/Tracks";
import * as userApi from "@/api/User";
import * as authApi from "@/api/auth";
import { toHttpsUrl, imgParam } from "@/utils/filters";

export default {
  name: "PlayCore",
  props: ["song", "isExpand"],
  components: { QualityMenu, ModeMenu },
  data() {
    return {
      currentSong: {},
      isPlay: false,
      sel: {},
      timeNow: "",
      timeDuration: "",
      volume: 20,
      curIndex: 0,
      isPending: false,
      promiseList: [],
      showBar: true,
      showVolume: false,
      isLiked: false,
      hideTimer: null,
      isDropdownOpen: false,
      miniBgStyle: '',
      playRequestId: 0,
      pendingUrlRequests: new Map(),
      urlCache: new Map(),
      // 实际播放音质：requested=用户所选, actual=真正拿到（可能是降级档或 match 解灰源）
      currentQuality: { requested: '', actual: '', isUnblock: false },
      showQualityMenu: false,
      currentLevel: config.player.level,
      currentSongSource: 'unknown',
      isLoading: false,
      showPlayerPending: false,
      hasRestoreProgress: false,
      resumeTime: 0,
      restoreSongId: null,
      lastSaveTime: 0,
      // 系统媒体面板进度同步节流时间戳
      lastPositionSync: 0,
      isRestoring: false,
      bufferedTime: 0,
      playContextId: 0,
      playlistContextId: 0,
      playIntentId: 0,
      currentPlaySourceLocked: false,
      audioRetryCount: 0,
      audioLastSrc: '',
      audioUseProxy: false,
      // 重试定时器句柄（集中管理，便于切档时取消）
      audioRetryTimer: null,
      // 主动清空 src 期间抑制 error 重试（否则会把新加载的音频 load() 回 0）
      suppressAudioError: false,
      playMode: 'order',
      shuffleOrder: [],
      // ---- 单曲形态（与 playMode 正交，见 ModeMenu.vue 注释）----
      // full=完整播放 / chorus=只播副歌
      trackForm: 'full',
      // 副歌区间（秒）：{start,end} | null。null=本曲无可用标注
      chorusRange: null,
      // chorusRange 属于哪首歌：与 currentSong.id 不一致时一律视为"还没有数据"，
      // 防止换歌瞬间拿上一首的区间去 seek（见 _loadChorus 的竞态注释）
      chorusRangeSongId: null,
      // 当前已加载副歌数据的歌曲 id（避免同一首歌重复请求/重复 seek）
      chorusSongId: null,
      // 已经为哪首歌做过「起播跳到副歌」的 seek，防重复触发把进度拉回开头
      chorusSeekSongId: null,
      // 首次开启副歌模式的一次性提示
      chorusHinted: false,
      // ---- A-B 区间循环（C 层：手选区间，与副歌互斥）----
      // 已确认的区间 {start,end}（秒）。按歌临时设定，不跨会话恢复
      abRange: null,
      // abRange 属于哪首歌（换歌瞬间的残影不算）
      abRangeSongId: null,
      // 选点过程中已确定的 A 点（秒），null=还没选
      abStart: null,
      // 选点状态：true 时点进度条是"选点"而不是"定位"
      abSetting: false,
      // 选点属于哪首歌
      abSongId: null,
      // A-B 回跳的瞬时锁：timeupdate 可能在 seek 之后又带旧值回来
      abSeekLock: false,
      // 已为哪首歌+哪种形态做过「起播定位」，避免重复 seek 把进度拉回起点
      chorusSeekForm: '',
      // ---- 定时停止（D 层：环境约束，与队列策略/单曲形态正交）----
      // off=不定时 / song=播完本首 / count=再播 N 首 / time=N 分钟后
      sleepMode: 'off',
      sleepValue: 0,
      // 未开启时两档各自记住的上次取值，避免每次打开菜单都从默认值开始调
      countDraft: 5,
      timeDraft: 30,
      // count 模式剩余首数；time 模式截止时间戳
      songsLeft: 0,
      sleepDeadline: 0,
      // 每秒刷新一次的"现在"，用来驱动倒计时文案重算
      sleepNow: 0,
      sleepTimerId: null,
      // 渐弱淡出：最后 fadeSec 秒把音量线性降到 0
      sleepFade: true,
      fadeSec: 20,
      fadeStarted: false,
      fadeBase: 20,
      showModeMenu: false,
      longPressTimer: null,
      longPressed: false,
      // FM 模式标志（从 Vuex 下沉到 PlayerCore 内部，PersonalFM/HomePage/App 通过 $bus 切换）
      isPersonalFM: false,
      shufflePos: -1,
      // _autoNext 锁：防止 song end 期间 timeNow watcher 多次触发 _autoNext
      // （音频暂停前 timeupdate 事件持续触发，会让 _autoNext 被多次调用）
      // 第一次 _autoNext 触发过渡后，$nextTick 期间锁住，避免后续误触发 curIndex++
      autoNextLocked: false,
      // 用户的喜欢歌曲 ID 集合（登录后通过 /likelist 填充）
      // 用于歌曲切换时同步 isLiked 初始状态，避免每次切换都查接口
      likedSongIds: new Set(),
      // 当前歌曲的喜欢请求锁定，防止快速连点
      likePending: false,
      // 会员权益：0=确认无会员, 1=仅音乐包, 2=黑胶VIP, -1=未知（拉取失败，不做门控）
      vipType: 0,
      vipChecked: false,
    }
  },
  computed: {
    ...mapState('TracksAbout', ['currentPlaylist']),
    isLogin() { return this.$store.getters["UserAbout/isLogin"] },
    progress() { return (this.timeNow / this.timeDuration) * 100 || 0 },
    /**
     * FM 模式预加载信号：在 FM 模式下进入最后一首时变 true
     * watcher 监听到此变化会主动 publish 'getPersonalFM' 触发预加载
     * 这样歌曲结束前新批次已就绪，避免听感上的"静音空白"
     */
    fmShouldPrefetch() {
      if (!this.isPersonalFM) return false
      const len = this.currentPlaylist.length
      return len > 0 && this.curIndex === len - 1
    },
    coverUrl() {
      const s = this.currentSong
      return (s.al && s.al.picUrl) || (s.album && s.album.picUrl) || ''
    },
    songName() { return this.currentSong.name || '未选择歌曲' },
    artistNames() {
      const s = this.currentSong
      const ar = s.ar || s.artists
      if (!ar) return ''
      if (typeof ar === 'string') return ar
      if (Array.isArray(ar)) return ar.map(a => a.name || a).join(' / ')
      return ''
    },
    config() { return config },
    modeBtnTitle() {
      const policy = this.modeLabel
      const form = this.effectiveForm === 'chorus' ? '只播副歌' : (this.effectiveForm === 'ab' ? 'A-B 循环' : '')
      return form
        ? `${policy} · ${form}（右键切换）`
        : `${policy}（右键切换播放模式）`
    },
    modeLabel() {
      const map = { order: '列表循环', sequence: '顺序播放', loop: '单曲循环', random: '随机播放' }
      return map[this.playMode] || '列表循环'
    },
    /**
     * 副歌形态是否真正生效。
     * trackForm 是用户意图，本曲没有副歌数据时回落到完整播放——
     * 宁可"开了但这次按全曲播"，也不要让用户等一个永远不会到来的跳转。
     */
    effectiveForm() {
      if (this.trackForm === 'chorus' && this.chorusRangeValid) return 'chorus'
      if (this.trackForm === 'ab' && this.abRangeValid) return 'ab'
      return 'full'
    },
    /** 区间存在且确实属于当前这首歌（换歌瞬间的残影不算） */
    chorusRangeValid() {
      return !!this.chorusRange && this.chorusRangeSongId === String(this.currentSong.id || '')
    },
    /** A-B 区间有效：已设定，且属于当前这首歌 */
    abRangeValid() {
      return !!this.abRange && this.abRangeSongId === String(this.currentSong.id || '')
    },
    /**
     * 副歌区间在进度条上的几何位置（百分比）。
     * 时长优先取实际音频 duration（可能与歌曲元信息有两三秒差异），拿不到再退回 dt。
     */
    chorusStyle() {
      return this.rangePct(this.chorusRangeValid ? this.chorusRange : null)
    },
    /** A-B 区间在进度条上的几何位置 */
    abStyle() {
      return this.rangePct(this.abRangeValid ? this.abRange : null)
    },
    /** 只选了 A 点时的竖线标记 */
    abStartStyle() {
      if (this.abStart === null) return null
      if (this.abSongId !== String(this.currentSong.id || '')) return null
      const pct = this.rangePct({ start: this.abStart, end: this.abStart })
      return pct ? { left: pct.left } : null
    },
    /** 右侧形态切换器的图标：A-B 用专用图标，其余沿用波形 */
    formIcon() { return this.trackForm === 'ab' ? 'abLoop' : 'chorus' },
    /**
     * 右侧形态切换器的文案。
     * 选点过程中文案要变成「设A / 设B」——否则用户点开菜单选了 A-B 之后
     * 没有任何反馈，不知道下一步该干嘛。
     */
    formLabel() {
      if (this.abSetting) return this.abStart === null ? '设A' : '设B'
      if (this.trackForm === 'chorus') return '副歌'
      if (this.trackForm === 'ab') return this.abRangeValid ? 'A-B' : 'A-B?'
      return '完整'
    },
    /** A-B 菜单项右侧的小注：告诉用户现在是"没设"还是"设到哪了" */
    abHint() {
      if (!this.abRangeValid) return '需手动选点'
      return `${this.formatTime(this.abRange.start)}-${this.formatTime(this.abRange.end)}`
    },
    /** 右侧形态切换器的提示：说明当前状态，并区分「本曲无副歌数据」的情况 */
    formTriggerTitle() {
      if (this.abSetting) {
        return this.abStart === null
          ? '正在设定 A-B：点击进度条选择起点 A'
          : `起点 A 已设为 ${this.formatTime(this.abStart)}，再点一次设定终点 B`
      }
      if (this.trackForm === 'ab') {
        return this.abRangeValid
          ? `当前：A-B 循环 ${this.formatTime(this.abRange.start)} - ${this.formatTime(this.abRange.end)}（点击切换）`
          : '当前：A-B 循环 · 本曲还没选点（点击切换）'
      }
      if (this.trackForm === 'chorus') {
        return this.chorusRange
          ? '当前：只播副歌（点击切换）'
          : '当前：只播副歌 · 本曲无副歌数据，按完整播放（点击切换）'
      }
      return this.chorusRange
        ? '当前：完整播放（点击切换为只播副歌）'
        : '当前：完整播放 · 本曲无副歌数据（点击切换）'
    },
    sleepActive() { return this.sleepMode !== 'off' },
    /** 菜单里的「再播 N 首」当前取值：该档已启用时显示生效值，否则显示草稿 */
    countValue() { return this.sleepMode === 'count' ? this.sleepValue : this.countDraft },
    /** 菜单里的「N 分钟后」当前取值：同理 */
    timeValue() { return this.sleepMode === 'time' ? this.sleepValue : this.timeDraft },
    /** 剩余秒数（仅 time 模式有意义） */
    sleepRemainSec() {
      if (this.sleepMode !== 'time' || !this.sleepDeadline) return 0
      return Math.max(0, Math.ceil((this.sleepDeadline - this.sleepNow) / 1000))
    },
    /**
     * 定时按钮文案：激活时显示"还剩多少"，而不是"设了多久"。
     * 用户关心的是还要多久停，不是自己刚才点了哪个档。
     */
    sleepLabel() {
      if (this.sleepMode === 'time') return this.formatTime(this.sleepRemainSec)
      if (this.sleepMode === 'count') return `${this.songsLeft}首`
      if (this.sleepMode === 'song') return '本首后'
      return '定时'
    },
    sleepTitle() {
      const map = {
        off: '定时停止：未开启（点击选择）',
        song: '定时停止：播完当前这首后停止',
        count: `定时停止：再播 ${this.songsLeft} 首后停止`,
        time: `定时停止：${this.formatTime(this.sleepRemainSec)} 后停止`
      }
      const base = map[this.sleepMode] || map.off
      return this.sleepFade ? `${base}（最后 ${this.fadeSec} 秒渐弱）` : base
    },
    isVip() { return this.vipType !== 0 },
    /**
     * 显示"实际拿到的音质"，而不是用户选的档位。
     * 上游会把超权限的请求压级（非会员选 lossless 实际给 exhigh），
     * 解灰源则质量不可控，单独标'解灰'。
     */
    currentQualityShort() {
      const actual = this.currentQuality && this.currentQuality.actual
      if (actual === 'match') return '解灰'
      const opts = config.player.qualityOptions || []
      const key = actual || this.currentLevel
      const f = opts.find(o => o.key === key)
      return f ? f.short : '标'
    },
    qualityTitle() {
      const q = this.currentQuality || {}
      if (q.isUnblock) return '当前为解灰源（第三方音源，音质与版本不可控）'
      const opts = config.player.qualityOptions || []
      const f = opts.find(o => o.key === (q.actual || this.currentLevel))
      if (!f) return '音质选择'
      const reqLabel = (opts.find(o => o.key === q.requested) || {}).label
      if (reqLabel && q.actual && q.actual !== q.requested) {
        return `已选「${reqLabel}」，当前实际为「${f.label}」（${f.bitrate || ''}）`
      }
      return `当前音质：${f.label}`
    },
  },
  watch: {
    isLogin(val) {
      // 登录后拉取一次 /likelist，填充 likedSongIds Set
      // 之后所有歌曲切换都从 Set 判断 liked 状态，免调接口
      if (val) this._initLikedSet()
      // 会员权益随登录态变化，登出要清掉，否则菜单会对未登录用户解锁无损
      if (val) this._loadVipInfo()
      else { this.vipType = 0; this.vipChecked = false }
    },
    song(val) {
      console.trace('[CurrentSongSet] song_watch', val && val.id)
      console.log('[SongState]', { action: 'song_watch', currentSongId: this.currentSong.id || null, playlistFirstId: this.currentPlaylist[0] && this.currentPlaylist[0].id || null, requestId: this.playRequestId })
      this.playIntentId++
      this.playContextId++
      this.currentSongSource = 'unknown'
      this.currentPlaySourceLocked = true
      console.log('[SourceChange]', { to: 'unknown', songId: val && val.id, trigger: 'song_watch' })
      this.currentSong = normalizeTrack(val)
      this.updateMiniBackground()
    },
    currentSong(val) {
      if (val.id) {
        this._loadChorus()
        console.log('[PlayIntent]', { songId: val.id, source: this.currentSongSource, playIntentId: this.playIntentId, playContextId: this.playContextId, requestId: this.playRequestId, action: 'start' })
        console.log('[PlayContext]', { songId: val.id, source: this.currentSongSource, contextId: this.playContextId, playlistContextId: this.playlistContextId, requestId: this.playRequestId })
        normalizeTrack(val)
        this.updateMiniBackground()
        // 歌曲切换 → 同步服务端真实 liked 状态（从 /likelist 缓存读取）
        const nextLiked = this.likedSongIds.has(String(val.id))
        if (nextLiked !== this.isLiked) {
          this.isLiked = nextLiked
          // 通知 MusicPlayer 等镜像组件同步 liked 状态（避免切歌时大播放器红心样式不更新）
          this.$emit('likeChange', { id: val.id, liked: nextLiked })
        }
        if (this.isRestoring) {
          this.isRestoring = false
          this.isPlay = false
        } else {
          this.pauseSong()
          this.playRequestId++
          this.pushPromise(this.checkSong(this.currentSong.id, this.playRequestId))
        }
        const inPlaylist = this.currentPlaylist.findIndex(item => item.id === val.id)
        if (this.currentSongSource !== 'playlist' && this.currentSongSource !== 'restore' && inPlaylist) {
          console.log('[SourceGuard]', { songId: val.id, source: this.currentSongSource, playlistContains: true, action: 'keep_source' })
        }
        if (this.currentSongSource === 'playlist') {
          this.curIndex = inPlaylist
          if (this.curIndex === -1) this.curIndex = 0
          if (inPlaylist === -1) {
            this.$store.commit("TracksAbout/PUSH_PLAYLIST", val)
          }
          this.currentPlaylist.forEach(el => { el.curSong = el.id === val.id })
        } else {
          if (inPlaylist !== -1) {
            this.curIndex = inPlaylist
            console.log('[PlaylistSync]', { action: 'exist', songId: val.id, index: inPlaylist, source: this.currentSongSource })
          } else if (this.currentSongSource !== 'restore') {
            this.$store.commit("TracksAbout/PUSH_PLAYLIST", val)
            this.curIndex = this.currentPlaylist.length - 1
            console.log('[PlaylistSync]', { action: 'append', songId: val.id, index: this.curIndex, source: this.currentSongSource })
          }
          this.currentPlaylist.forEach(el => { el.curSong = el.id === val.id })
        }
        this.$emit('songChange', val)
        this.$emit('getLyric', val.id)
        this.$emit('getSimi', val.id)
        this.$nextTick(() => this.scheduleHide())
        this._saveState()
      }
    },
    promiseList() {
      if (this.promiseList.length) {
        const reqId = this.playRequestId
        this.promiseList[0].then(() => {
          if (reqId !== this.playRequestId) {
            console.log('[PlayRace]', { requestId: reqId, currentRequestId: this.playRequestId, action: 'ignore_stale_play' })
            return
          }
          console.log('%c[PlayReady] %creq=%s src=%s readyState=%s', 'background:#16a34a;color:#fff;padding:2px 6px', '', reqId, this.sel.src ? 'SET' : 'EMPTY', this.sel.readyState)
          this.isPending = false
          console.trace('[PlaySongCall] promiseList')
          this.playSong()
        })
      }
    },
    curIndex(ind) {
      // 仅 playlist / restore（恢复后的播放列表）允许同步切歌；search/fm 等跳过
      if (this.currentSongSource !== 'playlist' && this.currentSongSource !== 'restore') {
        console.log('[PlaylistGuard]', { action: 'skip_curIndex', source: this.currentSongSource, playlistSyncLock: this.playlistSyncLock, songId: this.currentSong.id, contextId: this.playContextId })
        return
      }
      // 【关键修复】恢复期间不执行切歌逻辑：恢复状态由 _restoreState() 控制，
      // curIndex watcher 的切歌行为会覆盖正确恢复的 currentSong，导致切到错误歌曲
      if (this.isRestoring) {
        console.log('[RestoreGuard] skip curIndex_watch during isRestoring', { ind })
        return
      }
      if (this.playContextId !== this.playlistContextId) {
        console.warn('[PlaylistSync]', { action: 'skip_non_playlist_song', source: this.currentSongSource, songId: this.currentSong.id, curIndex: ind, playContextId: this.playContextId, playlistContextId: this.playlistContextId })
        return
      }
      // 【修复】目标歌曲与当前歌曲相同（如恢复后 curIndex 对齐）时跳过，
      // 避免重新赋值 currentSong（对象引用变化）再次触发播放链路，
      // 导致刷新后自动播放（被浏览器拦截成 isPlay=true 但无声）、点击从头播放
      const target = this.currentPlaylist[ind]
      if (target && target.id === this.currentSong.id) {
        console.log('[CurIndexGuard]', { action: 'skip_same_song', songId: target.id })
        return
      }
      console.trace('[CurrentSongSet] curIndex_watch', this.currentPlaylist[ind] && this.currentPlaylist[ind].id)
      console.log('[SongState]', { action: 'curIndex_watch', currentSongId: this.currentSong.id, nextId: this.currentPlaylist[ind] && this.currentPlaylist[ind].id, requestId: this.playRequestId })
      this.playIntentId++
      this.playContextId++
      this.currentSongSource = 'playlist'
      this.currentPlaySourceLocked = true
      this.playlistContextId = this.playContextId
      console.log('[SourceChange]', { to: 'playlist', songId: this.currentPlaylist[ind] && this.currentPlaylist[ind].id, trigger: 'curIndex' })
      this.currentSong = this.currentPlaylist[ind]
      if (this.isDropdownOpen) this._scrollActiveSong('change')
    },
    timeNow(n) {
      this.isExpand && this.$emit('tUpdate', n)
      // 副歌形态优先：到副歌终点就切歌，别等整曲自然播完
      if (this._onRangeTick(n)) return
      if (this.sel.currentTime === this.timeDuration) this._autoNext()
      if ((this.timeDuration - n) < 0.5 && this.sel.currentTime !== this.timeDuration) {
        this._autoNext()
      }
    },
    volume(val) { this.sel.volume = val / 100 },
    /**
     * 退出 FM 模式时（如 App.vue 跳到非 FM 歌单）清空播放列表，只留当前歌曲
     * currentPlaylist 仍在 Vuex，所以走 commit
     */
    isPersonalFM(val) {
      if (!val) this.$store.commit('TracksAbout/REPLACE_PLAYLIST', [this.currentSong])
    },
    /**
     * FM 预加载：进入最后一首时主动 publish 'fmPrefetch'（**只拉数据，不应用**）
     * PersonalFM 收到后 fetch /personal_fm 并 SET_FM_STAGED_BATCH（暂存，不 REPLACE）
     * 真正的切换由 reactive 流程在歌曲自然结束 / 用户点 next 时触发
     */
    fmShouldPrefetch(needed) {
      if (needed) pubsub.publish('fmPrefetch', Date.now())
    },
    'currentSong.id'(id, oldId) {
      // A-B 是按歌设定的：换歌就整块丢弃（区间 + 选点中间态）
      if (id !== oldId) this._resetAb()
      this._syncTitle()
      this._syncMediaSession()
    },
    isPlay() {
      this._syncTitle()
      this._syncMediaSession()
    }
  },
  methods: {
    /**
     * 系统媒体控制（SMTC / 锁屏 / 耳机按键）
     * 只在浏览器支持时生效；不支持则整体跳过，不影响播放链路。
     */
    _initMediaSession() {
      if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
      const ms = navigator.mediaSession
      // 各浏览器支持的动作不同，逐个注册并吞掉异常（Safari 对某些 action 抛错）
      const handlers = {
        play: () => { if (!this.isPlay) this.playSong() },
        pause: () => { if (this.isPlay) this.pauseSong() },
        previoustrack: () => this.preSong(),
        nexttrack: () => this.nextSong(),
        stop: () => this.pauseSong(),
        seekbackward: (d) => this._seekBy(-((d && d.seekOffset) || 10)),
        seekforward: (d) => this._seekBy((d && d.seekOffset) || 10),
        seekto: (d) => this._seekTo(d && d.seekTime, d && d.fastSeek),
      }
      Object.keys(handlers).forEach(action => {
        try { ms.setActionHandler(action, handlers[action]) } catch (e) { /* 该动作不支持 */ }
      })
      this._syncMediaSession()
    },
    _teardownMediaSession() {
      if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
      const actions = ['play', 'pause', 'previoustrack', 'nexttrack', 'stop', 'seekbackward', 'seekforward', 'seekto']
      actions.forEach(action => {
        try { navigator.mediaSession.setActionHandler(action, null) } catch (e) { /* ignore */ }
      })
      try { navigator.mediaSession.metadata = null } catch (e) { /* ignore */ }
      try { navigator.mediaSession.playbackState = 'none' } catch (e) { /* ignore */ }
    },
    _syncMediaSession() {
      if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
      const ms = navigator.mediaSession
      const s = this.currentSong
      if (!s || !s.id) {
        try { ms.metadata = null } catch (e) { /* ignore */ }
        try { ms.playbackState = 'none' } catch (e) { /* ignore */ }
        return
      }
      // MediaMetadata 在部分浏览器不存在，存在性检查后再构造
      if (typeof window !== 'undefined' && typeof window.MediaMetadata === 'function') {
        const cover = imgParam(this.coverUrl, '384y384')
        const artwork = []
        ;[96, 192, 384].forEach(size => {
          const u = imgParam(this.coverUrl, size + 'y' + size)
          if (u) artwork.push({ src: u, sizes: size + 'x' + size, type: 'image/jpeg' })
        })
        try {
          ms.metadata = new window.MediaMetadata({
            title: s.name || '未知歌曲',
            artist: this.artistNames || '未知歌手',
            album: (s.al && s.al.name) || (s.album && s.album.name) || '',
            artwork: artwork.length ? artwork : (cover ? [{ src: cover, sizes: '384x384', type: 'image/jpeg' }] : []),
          })
        } catch (e) { /* ignore */ }
      }
      try { ms.playbackState = this.isPlay ? 'playing' : 'paused' } catch (e) { /* ignore */ }
    },
    /**
     * 同步进度到系统媒体面板（Windows 媒体浮层 / 锁屏进度条）
     * setPositionState 对参数很挑：duration 必须有限且 > 0，position 必须 <= duration。
     */
    _updatePositionState() {
      if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
      if (typeof navigator.mediaSession.setPositionState !== 'function') return
      const duration = this.sel && this.sel.duration
      if (!duration || !isFinite(duration) || duration <= 0) return
      const position = Math.min(Math.max(this.sel.currentTime || 0, 0), duration)
      try {
        navigator.mediaSession.setPositionState({ duration, playbackRate: this.sel.playbackRate || 1, position })
      } catch (e) { /* ignore */ }
    },
    _seekTo(time, fastSeek) {
      const duration = this.sel && this.sel.duration
      if (time === undefined || time === null || !duration || !isFinite(duration)) return
      const target = Math.min(Math.max(time, 0), duration)
      // fastSeek 是媒体面板给出"近似跳转"信号（Firefox 实现），不可用时退回精确跳转
      if (fastSeek && typeof this.sel.fastSeek === 'function') {
        try { this.sel.fastSeek(target) } catch (e) { this.sel.currentTime = target }
      } else {
        this.sel.currentTime = target
      }
      this.timeNow = this.sel.currentTime
      this._updatePositionState()
    },
    _seekBy(offset) {
      const duration = this.sel && this.sel.duration
      if (!duration || !isFinite(duration)) return
      this._seekTo((this.sel.currentTime || 0) + offset)
    },
    /**
     * 全局键盘快捷键：空格播放/暂停、←→ 快退快进 5s、Shift+←→ 切歌
     * 输入框 / 文本域 / 可编辑区域 / 滑块聚焦时不拦截，避免影响搜索、评论和拖动进度。
     */
    _onGlobalKeydown(e) {
      if (e.defaultPrevented) return
      // 组合键留给浏览器（Ctrl+←→ 等）
      if (e.ctrlKey || e.metaKey || e.altKey) return
      const t = e.target
      if (t) {
        const tag = (t.tagName || '').toLowerCase()
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || t.isContentEditable) return
        const role = t.getAttribute && t.getAttribute('role')
        if (role === 'slider' || role === 'textbox') return
        // Element UI 的编辑类组件（回复框等）
        if (t.closest && t.closest('.el-textarea, .el-input, [contenteditable="true"]')) return
      }
      if (e.key === ' ' || e.code === 'Space') {
        if (e.repeat) return
        e.preventDefault()
        this.togglePlay()
        return
      }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        const dir = e.key === 'ArrowRight' ? 1 : -1
        if (e.shiftKey) {
          e.preventDefault()
          dir > 0 ? this.nextSong() : this.preSong()
        } else {
          e.preventDefault()
          this._seekBy(dir * 5)
        }
      }
    },
    _syncTitle() {
      const s = this.currentSong
      if (s && s.id) {
        const name = s.name || '未知歌曲'
        const ar = this.artistNames
        const prefix = this.isPlay ? '♪' : '❚❚'
        setSongTitle(`${prefix} ${name}${ar ? ' - ' + ar : ''} · ${BASE}`)
      } else {
        clearSongTitle()
      }
    },
    getArtistStr(s) {
      const ar = s.ar || s.artists
      if (!ar) return ''
      if (typeof ar === 'string') return ar
      if (Array.isArray(ar)) return ar.map(a => a.name || a).join(' / ')
      return ''
    },
    updateMiniBackground() {
      const s = this.currentSong
      const cover = (s.al && s.al.picUrl) || (s.album && s.album.picUrl) || s.coverImgUrl || ''
      if (!cover) {
        // 无封面保持默认深色
        this.miniBgStyle = ''
        return
      }
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        this.miniBgStyle = buildBackground(img)
      }
      img.onerror = () => {
        this.miniBgStyle = ''
      }
      img.src = cover
    },
    init() { this.promiseList = []; this.isPlay = false; this.timeDuration = 0; this.timeNow = 0 },
    pushPromise(promise) { this.promiseList.unshift(promise) },
    async checkSong(id, requestId) {
      const key = id + '_' + this.playIntentId
      const pending = this.pendingUrlRequests.get(key)
      if (pending) {
        await pending
        return
      }
      const self = this
      const promise = new Promise(resolve => {
        if (self.isLogin) self.checkSongLoggedIn(id, requestId).then(res => resolve(res))
        else self.checkSongDntLogin(id, requestId).then(res => resolve(res))
      })
      this.pendingUrlRequests.set(key, promise)
      try {
        await promise
      } finally {
        this.pendingUrlRequests.delete(key)
      }
    },
    checkSongDntLogin(id, requestId) {
      const self = this
      this.isLoading = true
      console.log('[PlayerLoading]', { action: 'start', songId: id, requestId })
      return new Promise(resolve => {
        // 未登录用户也走完整 fallback 链 (v1 → /song/url → /song/url/match)
        self.getSongUrl(id, requestId).then(res => {
          if (res && res.cancelled) { self.isLoading = false; self.showPlayerPending = false; resolve({ cancelled: true }); return }
          if (requestId !== self.playRequestId) { self.isLoading = false; self.showPlayerPending = false; resolve({ cancelled: true }); return }
          const data = res && res.data && res.data.data
          // 网易云 CDN 的音频地址是 http://m*.music.126.net/...，https 页面直接使用会被判 Mixed Content
          const url = toHttpsUrl(data && data[0] && data[0].url)
          if (url) {
            self.sel.src = url
            self.audioLastSrc = url
            self.audioRetryCount = 0
            self.audioUseProxy = false
            self.suppressAudioError = false
            // 新 src 会把播放进度归零：之前那次「跳到副歌起点」的 seek 已经作废，
            // 清掉标记，让 canplay 时重新定位（否则副歌模式看起来像失效）
            self.chorusSeekSongId = null
            self.sel.load()
            resolve()
            return
          }
          // 所有 fallback 均失败 → 问清原因（/check/music 会直接给"暂无版权"），然后自动切下一首
          self._explainNoSource(id).then(msg => {
            if (requestId !== self.playRequestId) { resolve({ cancelled: true }); return }
            self.$message.warning(msg)
            self.isLoading = false
            console.warn('[PlayerLoading]', { action: 'no_source', songId: id, requestId, reason: msg })
            resolve("no_url")
            if (self._inPlaylist()) self.nextSong()
          })
        }).catch(err => {
          if (err && err.message === 'REQUEST_CANCELLED') { self.isLoading = false; resolve({ cancelled: true }); return }
          console.error('[PlayError]', { songId: id, stage: 'DNT_LOGIN_FAIL', error: err && err.message || String(err) })
          self.isLoading = false
          // 官方音源 + 解灰都拿不到 → 用 /check/music 给准确原因，而不是笼统的"暂无可用音源"
          self._explainNoSource(id).then(msg => {
            if (requestId === self.playRequestId) self.$message.warning(msg)
            resolve("dnt_fail")
            if (self._inPlaylist()) self.nextSong()
          })
        })
      })
    },
    checkSongLoggedIn(id, requestId) {
      const self = this
      this.isLoading = true
      console.log('[PlayerLoading]', { action: 'start', songId: id, requestId })
      return new Promise(resolve => {
        self.getSongUrl(id, requestId).then(res => {
          if (res && res.cancelled) { self.isLoading = false; resolve({ cancelled: true }); return }
          if (requestId !== self.playRequestId) { self.isLoading = false; resolve({ cancelled: true }); return }
          const data = res && res.data && res.data.data
          const item = data && data[0]
          // 同上：CDN 返回的是 http 音频地址，先升级到 https 再塞给 <audio>
          const newUrl = toHttpsUrl(item && item.url)
          if (newUrl) {
            console.log('%c✅ 播放就绪 %cid=%s', 'background:#059669;color:#fff;padding:2px 6px', '', id)
            self.sel.src = newUrl
            self.audioLastSrc = newUrl
            self.audioRetryCount = 0
            self.audioUseProxy = false
            self.suppressAudioError = false
            // 新 src 会把播放进度归零：之前那次「跳到副歌起点」的 seek 已经作废，
            // 清掉标记，让 canplay 时重新定位（否则副歌模式看起来像失效）
            self.chorusSeekSongId = null
            self.sel.load()
            resolve()
            return
          }
          // 所有 fallback 均失败 → 问清原因（/check/music 会直接给"暂无版权"），然后自动切下一首
          self._explainNoSource(id).then(msg => {
            if (requestId !== self.playRequestId) { resolve({ cancelled: true }); return }
            self.$message.warning(msg)
            self.isLoading = false
            console.warn('[PlayerLoading]', { action: 'no_source', songId: id, requestId, reason: msg })
            resolve("no_url")
            if (self._inPlaylist()) self.nextSong()
          })
        }).catch(err => {
          if (err && err.message === 'REQUEST_CANCELLED') { self.isLoading = false; resolve({ cancelled: true }); return }
          const isNoResource = err && err.message === 'NO_RESOURCE' || (err && err.message === 'NO_SOURCE')
          self.isLoading = false
          console.error('[PlayError]', { songId: id, stage: isNoResource ? 'NO_RESOURCE' : 'NETWORK_ERROR', requestId, error: err && err.message || String(err) })
          // 注意这里是 ===：旧代码写成 !==，导致提示只在请求已过期时才弹（反了）
          if (requestId === self.playRequestId) {
            if (isNoResource) self._explainNoSource(id).then(msg => self.$message.warning(msg))
            else self.$message.warning('播放失败，请稍后重试')
          }
          resolve("url_fail")
        })
      })
    },

    /**
     * 取音源。顺序（见 docs/AUDIO_PIPELINE_PLAN.md）：
     *   0. audioCache(id_level) 命中
     *   1. /song/url/v1?level=<用户选择>，失败逐级下移（exhigh→higher→standard）
     *   2. /song/url/match 解灰兜底（第三方源，音质不可控，UI 会标"解灰"）
     *   3. /song/url?br= 老接口保底（实测 br 被忽略，默认关闭）
     * 注意：**不再传 unblock=true**。上游注释写明 unblock 会让 level 完全失效，
     * 直接把最高档 flac 塞回来（实测 128k 481KB vs flac 32.5MB）。
     */
    getSongUrl(id, requestId, br = 0) {
      if (requestId !== this.playRequestId) return Promise.resolve({ cancelled: true })

      const preferred = config.player.level
      // 命中同档位缓存才复用，切档后天然不命中
      const cachedUrl = getAudioCache(id, preferred)
      if (cachedUrl) {
        if (requestId !== this.playRequestId) return Promise.resolve({ cancelled: true })
        this.currentQuality = { requested: preferred, actual: preferred, isUnblock: false }
        return Promise.resolve({ data: { data: [{ url: cachedUrl }] } })
      }

      const startIdx = config.player.qualityLevels.indexOf(preferred)
      const levels = config.player.fallbackLevels
        ? config.player.qualityLevels.slice(startIdx === -1 ? 0 : startIdx)
        : [preferred]

      console.log('%c▶ 获取音源 %c/song/url/v1?id=%s&level=%s', 'background:#059669;color:#fff;padding:2px 6px', '', id, preferred)

      // fallback br 根据 level 映射 (仅 /song/url 兜底时使用)
      const BR_MAP = { hires: 999000, lossless: 999000, exhigh: 320000, higher: 192000, standard: 128000 }
      const fallbackBr = br || BR_MAP[preferred] || 320000

      const self = this
      const CACHE_TTL = 10 * 60 * 1000

      const tryLevel = (index) => {
        if (requestId !== self.playRequestId) return Promise.resolve({ cancelled: true })
        if (index >= levels.length) {
          // 官方音源全档位都没货 → 解灰兜底；解灰也失败再看是否启用老接口
          return self.requestMatchSongUrl(id, requestId).catch(() => {
            if (!config.player.legacyBrFallback) throw new Error('NO_SOURCE')
            return self.requestFallbackUrl(id, fallbackBr, requestId)
          })
        }

        const lv = levels[index]
        const ck = id + '_' + lv
        const cached = self.urlCache.get(ck)
        if (cached && Date.now() < cached.expire) {
          if (requestId !== self.playRequestId) return Promise.resolve({ cancelled: true })
          self.currentQuality = { requested: preferred, actual: lv, isUnblock: false }
          return Promise.resolve({ data: { data: [{ url: cached.url }] } })
        }

        return self.$axios('/song/url/v1', {
          params: { id, level: lv, timestamp: Date.now() }
        }).then(res => {
          if (requestId !== self.playRequestId) return Promise.resolve({ cancelled: true })
          const d = res.data && res.data.data && res.data.data[0]
          const url = d && d.url
          if (!url) {
            console.log('%c↓ 降级 %s→%s', 'background:#d97706;color:#fff;padding:2px 6px', lv, levels[index + 1] || '解灰')
            return tryLevel(index + 1)
          }
          self.urlCache.set(ck, { url, level: lv, br: d && d.br, size: d && d.size, expire: Date.now() + CACHE_TTL })
          setAudioCache(id, url, lv)
          // d.level 是上游如实返回的实际档位（非会员请求无损会被压成 exhigh）
          self.currentQuality = { requested: preferred, actual: (d && d.level) || lv, isUnblock: false }
          return res
        }).catch(err => {
          if (requestId !== self.playRequestId) return Promise.resolve({ cancelled: true })
          console.error('[PlayError]', { songId: id, stage: 'TRY_LEVEL_FAIL', level: lv, requestId, error: err && err.message || String(err) })
          return tryLevel(index + 1)
        })
      }

      return tryLevel(0)

    },
    requestFallbackUrl(id, br, requestId) {
      if (requestId !== this.playRequestId) return Promise.resolve({ cancelled: true })
      const ck = id + '_fallback'
      console.log('%c▶ 旧接口兜底 %c/song/url?id=%s&br=%s', 'background:#ea580c;color:#fff;padding:2px 6px', '', id, br)
      return tracks.songUrl(id, br).then(r => {
        if (requestId !== this.playRequestId) return Promise.resolve({ cancelled: true })
        const fbUrl = r.data && r.data.data && r.data.data[0] && r.data.data[0].url
        console.log('%c  %s %s', '', fbUrl ? '✅成功' : '❌失败', fbUrl ? '' : '→尝试match')
        if (!fbUrl) return Promise.reject(new Error('FALLBACK_EMPTY'))
        this.urlCache.set(ck, { url: fbUrl, level: 'fallback', expire: Date.now() + 10 * 60 * 1000 })
        return r
      }).catch(err => {
        console.error('[PlayError]', { songId: id, stage: 'FALLBACK_FAIL', requestId: this.playRequestId, reason: err && err.message || String(err) })
        throw err
      })
    },
    /**
     * 解灰兜底（第三方源：酷我/酷狗/QQ 等）。
     * 该接口返回的是 { code, data: "<url 字符串>", proxyUrl }，
     * data 不是数组 —— 历史实现按 data[0].url 取值，导致这层一直是死的。
     * 解灰源音质/版本不可控，成功后把 isUnblock 置 true，播放器上会标"解灰"。
     */
    requestMatchSongUrl(id, requestId) {
      if (requestId !== this.playRequestId) return Promise.resolve({ cancelled: true })
      const ck = id + '_match'
      console.log('%c▶ 解灰兜底 %c/song/url/match?id=%s', 'background:#dc2626;color:#fff;padding:2px 6px', '', id)
      const cached = this.urlCache.get(ck)
      if (cached && Date.now() < cached.expire) {
        this.currentQuality = { requested: config.player.level, actual: 'match', isUnblock: true }
        return Promise.resolve({ data: { data: [{ url: cached.url }] }, source: 'match' })
      }
      return tracks.songUrlMatch(id).then(r => {
        if (requestId !== this.playRequestId) return Promise.resolve({ cancelled: true })
        const payload = r.data || {}
        const raw = typeof payload.data === 'string'
          ? payload.data
          : (payload.data && payload.data.url)
        const matchUrl = toHttpsUrl(raw)
        if (!matchUrl) return Promise.reject(new Error('NO_RESOURCE'))
        this.urlCache.set(ck, { url: matchUrl, level: 'match', source: 'match', expire: Date.now() + 10 * 60 * 1000 })
        this.currentQuality = { requested: config.player.level, actual: 'match', isUnblock: true }
        console.log('%c  ✳ 解灰成功 %c%s', 'color:#dc2626', '', matchUrl.slice(0, 70))
        return { data: { data: [{ url: matchUrl }] }, source: 'match' }
      }).catch(err => {
        console.error('[PlayError]', { songId: id, stage: 'MATCH_FAIL', reason: err && err.message || String(err) })
        throw err
      })
    },
    initAudioByOuterUrl(id, requestId) {
      if (requestId !== this.playRequestId) return
      this.sel.src = location.origin + "/api/song/media/outer/url?id=" + id
      this.audioLastSrc = this.sel.src
      this.audioRetryCount = 0
      this.suppressAudioError = false
      this.chorusSeekSongId = null
      this.sel.load()
    },
    playSong() {
      const isCurrentEmpty = JSON.stringify(this.currentSong) === '{}'
      const playlistFirst = this.currentPlaylist[0]
      console.log('[SongState]', { action: 'playSong', isCurrentEmpty, currentSongId: this.currentSong.id || null, playlistFirstId: playlistFirst && playlistFirst.id || null, requestId: this.playRequestId })
      if (isCurrentEmpty && this.currentPlaylist.length) { console.trace('[CurrentSongSet] playSong_fallback'); this.currentSongSource = 'playlist'; this.currentSong = this.currentPlaylist[0] }
      if (!this.sel.src && this.currentSong.id) {
        this.isLoading = true
        this.playRequestId++
        this.pushPromise(this.checkSong(this.currentSong.id, this.playRequestId))
        return
      }
      this.isPlay = true
      console.log('%c[PlayCall] %csrc=%s ready=%s currentTime=%s', 'background:#2563eb;color:#fff;padding:2px 6px', '', this.sel.src ? 'SET' : 'EMPTY', this.sel.readyState, this.sel.currentTime)
      const playPromise = this.sel.play()
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.log('%c[AudioPlayError] %c%s', 'background:#dc2626;color:#fff;padding:2px 6px', '', err.name + ': ' + err.message)
          // 【修复】autoplay 拦截时回滚 isPlay，避免 UI 显示播放状态但实际未播
          if (err.name === 'NotAllowedError') {
            this.isPlay = false
            console.log('[AutoPlayBlocked] isPlay rolled back to false')
          }
        })
      }
    },
    pauseSong() { this.isPlay = false; this.sel.pause() },
    togglePlay() { this.onInteract(); console.trace('[PlaySongCall] togglePlay'); this.isPlay ? this.pauseSong() : this.playSong() },
    preSong() {
      this.onInteract()
      if (!this._inPlaylist()) return
      this.curIndex = this.getPrevIndex()
    },
    nextSong() {
      this.onInteract()
      // 手动下一首也要消耗"再播 N 首"的额度，否则计数会卡住不动
      if (this._consumeSleep(true)) return
      if (this.isPersonalFM) {
        // FM 模式：未到末尾时顺序切，到末尾才触发 reactive 流程
        if (this.curIndex < this.currentPlaylist.length - 1) {
          this.curIndex = this.curIndex + 1
        } else {
          // 末尾：通知 PersonalFM 应用 staged batch（数据应已 prefetch 完毕）
          // curIndex 由 playFmNewBatch 在 staged 应用后推进
          pubsub.publish('getPersonalFM', new Date().getTime())
        }
        return
      }
      if (!this._inPlaylist()) return
      const next = this.getNextIndex()
      if (next < 0) { this._onQueueEnd(); return }
      this.curIndex = next
    },
    // 当前歌曲是否在播放列表中（用于切歌判断，不依赖 source）
    _inPlaylist() {
      const id = this.currentSong && this.currentSong.id
      return id && this.currentPlaylist.findIndex(s => s.id === id) !== -1
    },
    // 自动播放到结尾触发：loop 模式重播当前曲
    // opts.skipLoop=true 时忽略单曲循环分支（副歌模式到点切歌要走这里，
    // 否则「单曲循环 × 只播副歌」会变成整曲重播）
    _autoNext(opts) {
      // 防止 song end 触发多次：timeNow watcher + audio 'ended' 事件都可能触发 _autoNext
      // 第一次触发后：
      // 1) 同步暂停 audio（阻止后续 timeupdate）
      // 2) setTimeout 锁 1s（比 $nextTick 更长，覆盖所有残留事件）
      // 双保险：$nextTick 在 microtask 释放，但 audio 事件在 macrotask，可能仍在锁释放后触发
      if (this.autoNextLocked) return
      this.autoNextLocked = true
      if (this.sel && !this.sel.paused) this.sel.pause()
      setTimeout(() => {
        this.autoNextLocked = false
      }, 1000)
      // 定时停止：本曲已消耗掉，到点就停，不再往下切
      if (this._consumeSleep()) return
      if (this.playMode === 'loop' && !(opts && opts.skipLoop)) { this._restartCurrent(); return }
      if (this.isPersonalFM) {
        // FM 模式：未到末尾时顺序切，到末尾才触发 reactive 流程
        if (this.curIndex < this.currentPlaylist.length - 1) {
          this.curIndex = this.curIndex + 1
        } else {
          // 末尾：通知 PersonalFM 应用 staged batch（proactive prefetch 应已就绪）
          // 若是首次 FM session（无 staged），PersonalFM 会同步 fetch + apply（有 ~200ms 静音）
          pubsub.publish('getPersonalFM', new Date().getTime())
        }
        return
      }
      if (!this._inPlaylist()) return
      const nextIdx = this.getNextIndex()
      if (nextIdx < 0) { this._onQueueEnd(); return }
      this.curIndex = nextIdx
    },
    /**
     * 顺序播放走到队尾：停下并说明原因。
     * 不把 currentTime 归零，保留最后一首的进度，用户再点播放能接着听。
     */
    _onQueueEnd() {
      this.pauseSong()
      this.$message.info('队列已播完（顺序播放）')
      console.log('[PlayMode]', { action: 'queue_end', mode: this.playMode })
    },
    getNextIndex() {
      // FM 模式：保持推荐算法给出的顺序，不走 shuffle（shuffle 会破坏 NetEase /personal_fm 的推荐排序）
      if (this.isPersonalFM) {
        return this.curIndex + 1 > this.currentPlaylist.length - 1 ? 0 : this.curIndex + 1
      }
      if (this.playMode === 'random') return this._nextShuffleIndex()
      // 顺序播放：走到底返回 -1，由调用方负责停播（区别于列表循环的回绕）
      if (this.playMode === 'sequence' && this.curIndex >= this.currentPlaylist.length - 1) return -1
      return this.curIndex + 1 > this.currentPlaylist.length - 1 ? 0 : this.curIndex + 1
    },
    getPrevIndex() {
      // FM 模式：同上，不走 shuffle
      if (this.isPersonalFM) {
        return this.curIndex - 1 < 0 ? this.currentPlaylist.length - 1 : this.curIndex - 1
      }
      if (this.playMode === 'random') return this._prevShuffleIndex()
      return this.curIndex - 1 < 0 ? this.currentPlaylist.length - 1 : this.curIndex - 1
    },
    // 随机播放洗牌序列：Fisher-Yates 打乱，当前曲放首位，保证一轮内每首只播一次
    _initShuffle() {
      const len = this.currentPlaylist.length
      if (!len) { this.shuffleOrder = []; this.shufflePos = -1; return }
      const order = Array.from({ length: len }, (_, i) => i)
      for (let i = len - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const t = order[i]; order[i] = order[j]; order[j] = t
      }
      const curIdx = order.indexOf(this.curIndex)
      if (curIdx > 0) {
        order.splice(curIdx, 1)
        order.unshift(this.curIndex)
      }
      this.shuffleOrder = order
      this.shufflePos = 0
      console.log('[Shuffle]', { action: 'init', cur: this.curIndex, len, order: this.shuffleOrder.join(',') })
    },
    _nextShuffleIndex() {
      if (this.shuffleOrder.length !== this.currentPlaylist.length || this.shufflePos === -1) this._initShuffle()
      this.shufflePos = (this.shufflePos + 1) % this.shuffleOrder.length
      return this.shuffleOrder[this.shufflePos]
    },
    _prevShuffleIndex() {
      if (this.shuffleOrder.length !== this.currentPlaylist.length || this.shufflePos === -1) this._initShuffle()
      this.shufflePos = (this.shufflePos - 1 + this.shuffleOrder.length) % this.shuffleOrder.length
      return this.shuffleOrder[this.shufflePos]
    },
    _restartCurrent() {
      this.onInteract()
      if (!this.sel) return
      try {
        this.sel.currentTime = 0
        // 必须无条件 play()：autoNext 里只是原生 pause()，并没有改 isPlay，
        // 靠 `if (!this.isPlay)` 判断会让「单曲循环 / FM 同批重播」停在 0:00 不出声
        const p = this.sel.play()
        if (p && p.catch) p.catch(() => {})
        this.isPlay = true
      } catch (e) { /* ignore */ }
    },
    togglePlayMode() {
      const order = ['order', 'sequence', 'loop', 'random']
      const idx = order.indexOf(this.playMode)
      this.setPlayMode(order[(idx + 1) % order.length])
    },
    /** 直达选择（菜单用）：不再依赖三态滚动 */
    setPlayMode(mode) {
      if (['order', 'sequence', 'random', 'loop'].indexOf(mode) === -1) return
      this.showModeMenu = false
      this.playMode = mode
      if (mode === 'random') {
        this._initShuffle()
      } else {
        this.shuffleOrder = []
        this.shufflePos = -1
      }
      try { localStorage.setItem('acmusic_play_mode', mode) } catch (e) { /* ignore */ }
      console.log('[PlayMode]', { mode })
    },
    /**
     * 拉取当前歌曲的副歌区间。
     * 与取流链路完全解耦：失败/无数据只是没有区间，不影响播放。
     */
    _loadChorus() {
      const id = this.currentSong && this.currentSong.id
      if (!id) {
        this.chorusSongId = null
        this.chorusRange = null
        this.chorusRangeSongId = null
        this.chorusSeekSongId = null
        return
      }
      const reqId = String(id)
      if (reqId === this.chorusSongId) return
      this.chorusSongId = reqId
      this.chorusRange = null
      this.chorusRangeSongId = null
      this.chorusSeekSongId = null
      getChorus(id).then(r => {
        // 【竞态修复】必须拿"发起请求时的 id"做校验，不能只比 currentSong 与 chorusSongId：
        // 上一首歌的响应晚到时，后者两者都已经是新歌 id，校验会通过，
        // 于是把上一首的区间写进当前歌 → seek 到错误的秒数、切歌点也永远不触发
        //（表现为"换了模式之后只播副歌不生效"）。
        if (reqId !== this.chorusSongId) return
        if (String(this.currentSong.id) !== reqId) return
        this.chorusRange = r
        this.chorusRangeSongId = r ? reqId : null
        console.log('[Chorus]', { songId: id, hasRange: !!r, start: r && r.start, end: r && r.end })
        if (this.trackForm === 'chorus' && !r) {
          console.warn('[Chorus] 无副歌数据，本曲按完整播放', { songId: id })
        }
        if (this.effectiveForm === 'chorus') this._applyRangeSeek()
      })
    },
    /**
     * 把秒级区间换算成进度条上的百分比几何。
     * 时长优先取实际音频 duration（可能与歌曲元信息有两三秒差异），拿不到再退回 dt。
     */
    rangePct(r) {
      const dur = Number(this.timeDuration) || (this.currentSong.dt ? this.currentSong.dt / 1000 : 0)
      if (!r || !dur || r.start >= dur) return null
      const end = Math.min(r.end === undefined ? r.start : r.end, dur)
      const left = Math.max(0, (r.start / dur) * 100)
      const width = Math.max(1.2, ((end - r.start) / dur) * 100)
      return { left: left + '%', width: Math.min(width, 100 - left) + '%' }
    },
    /**
     * 把播放位置跳到当前生效区间的起点（幂等）
     *
     * 三条守卫都是踩过坑的：
     *  1. readyState < 1 时浏览器会丢弃 seek（元数据没加载出来，时长未知）；
     *  2. 已经在区间内就不动，否则用户手动点进区间会被拽回起点；
     *  3. 同时清掉 hasRestoreProgress，避免恢复进度逻辑把位置改回去。
     *
     * 「形态」也要参与幂等判断：同一首歌从副歌切到 A-B，起点不同，必须重新定位。
     */
    _applyRangeSeek(force) {
      const form = this.effectiveForm
      const r = form === 'chorus' ? this.chorusRange : (form === 'ab' ? this.abRange : null)
      const id = this.currentSong && this.currentSong.id
      if (!r || !id || form === 'full') return
      if (this.sel.readyState < 1) return
      if (!force && this.chorusSeekSongId === String(id) && this.chorusSeekForm === form) return
      const cur = this.sel.currentTime || 0
      if (cur >= r.start - 1 && cur < r.end) {
        this.chorusSeekSongId = String(id)
        this.chorusSeekForm = form
        return
      }
      this.chorusSeekSongId = String(id)
      this.chorusSeekForm = form
      this.hasRestoreProgress = false
      try {
        this.sel.currentTime = r.start
        this.timeNow = r.start
      } catch (e) { /* ignore */ }
      console.log('[Range]', { action: 'seek_start', form, songId: id, start: r.start })
    },
    /**
     * 区间形态的「到点」处理，由 timeNow watcher 每帧调用。
     * @returns {boolean} true 表示本次已消费（调用方应停止后续的整曲结束判定）
     */
    _onRangeTick(n) {
      const t = Number(n)
      if (!t) return false
      // A-B 优先且"不切歌"：命中 B 点就跳回 A，即便单曲循环也如此
      //（单曲循环 × A-B 的语义就是"反复听这一小段"）
      if (this.effectiveForm === 'ab' && this.abRangeValid) {
        const r = this.abRange
        if (t < r.end - 0.05) return false
        if (this.abSeekLock) return true
        this.abSeekLock = true
        setTimeout(() => { this.abSeekLock = false }, 300)
        try {
          this.sel.currentTime = r.start
          this.timeNow = r.start
        } catch (e) { /* ignore */ }
        return true
      }
      const r = this.chorusRangeValid ? this.chorusRange : null
      if (!r || this.effectiveForm !== 'chorus') return false
      if (t < r.end - 0.35) return false
      if (this.autoNextLocked) return true
      if (this.playMode === 'loop') {
        // 单曲循环 × 只播副歌 = 副歌段循环
        this.autoNextLocked = true
        setTimeout(() => { this.autoNextLocked = false }, 600)
        try {
          this.sel.currentTime = r.start
          this.timeNow = r.start
        } catch (e) { /* ignore */ }
        return true
      }
      console.log('[Chorus]', { action: 'end_next', songId: this.currentSong.id, end: r.end })
      this._autoNext({ skipLoop: true })
      return true
    },
    /**
     * 单曲形态切换（控制条右侧下拉用）
     * @param {string} form 'full' | 'chorus' | 'ab' | 'ab-here' | 'ab-clear'
     */
    setTrackForm(form) {
      this.showModeMenu = false
      if (form === 'ab-clear') { this._abClear(); return }
      if (form === 'ab-here') { this._abPickHere(); return }
      const next = form === 'chorus' ? 'chorus' : (form === 'ab' ? 'ab' : 'full')
      // 切到别的形态时取消 A-B 选点，否则进度条会一直"点不动"
      if (next !== 'ab') { this.abSetting = false; this.abStart = null }
      this.trackForm = next
      // A-B 是按歌临时设的，不写进 localStorage（刷新后区间没了，留个 'ab' 只会让人困惑）
      try { localStorage.setItem('acmusic_track_form', next === 'ab' ? 'full' : next) } catch (e) { /* ignore */ }
      if (next === 'chorus') {
        if (this.chorusRange) {
          this._applyRangeSeek(true)
        } else {
          this.$message.info('这首歌没有副歌数据，本次按完整播放')
        }
        if (!this.chorusHinted) {
          this.chorusHinted = true
          this.$message.success('已开启副歌模式：每首只播副歌段，到点自动切下一首')
        }
      }
      if (next === 'ab') {
        if (this.abRangeValid) {
          this.abSetting = false
          this._applyRangeSeek(true)
        } else {
          this._abEnsureSong()
          this.abSetting = true
          this.$message.info('点击进度条设定起点 A')
        }
      }
      console.log('[TrackForm]', { form: next, hasChorus: !!this.chorusRange, ab: !!this.abRangeValid })
    },
    /** A-B 选点前确保状态属于当前这首歌 */
    _abEnsureSong() {
      const id = String(this.currentSong.id || '')
      if (this.abSongId === id) return
      this.abSongId = id
      this.abStart = null
      this.abRange = null
      this.abRangeSongId = null
    },
    /**
     * 选一个点（秒）。第一次定 A，第二次定 B。
     * 这是"点进度条"和"用当前播放位置"两条选点路径的公共落地逻辑。
     */
    _abPickPoint(t) {
      const dur = Number(this.timeDuration) || 0
      if (!dur) return
      this._abEnsureSong()
      const time = Math.max(0, Math.min(Number(t) || 0, dur))
      if (this.abStart === null) {
        this.abStart = time
        this.$message.info(`起点 A：${this.formatTime(time)}，再点一次设定终点 B`)
        return
      }
      const start = this.abStart
      if (time - start < 1) {
        this.$message.warning('终点 B 至少要晚于起点 A 1 秒')
        return
      }
      this.abRange = { start, end: time }
      this.abRangeSongId = String(this.currentSong.id || '')
      this.abStart = null
      this.abSetting = false
      this.trackForm = 'ab'
      this.$message.success(`A-B 已设定：${this.formatTime(start)} - ${this.formatTime(time)}`)
      this._applyRangeSeek(true)
      console.log('[AB]', { action: 'set', songId: this.abRangeSongId, start, end: time })
    },
    /** 用"当前播放位置"选点：比点进度条精确，适合卡某个乐句 */
    _abPickHere() {
      if (!this.currentSong.id) return
      this._abEnsureSong()
      this.abSetting = true
      this._abPickPoint(Number(this.timeNow) || 0)
    },
    _abClear() {
      this.abRange = null
      this.abRangeSongId = null
      this.abStart = null
      this.abSetting = false
      if (this.trackForm === 'ab') {
        this.trackForm = 'full'
        try { localStorage.setItem('acmusic_track_form', 'full') } catch (e) { /* ignore */ }
      }
      this.$message.info('已清除 A-B 区间')
    },
    /** 换歌：A-B 是按歌设定的，旧区间必须整块丢弃 */
    _resetAb() {
      this.abRange = null
      this.abRangeSongId = null
      this.abStart = null
      this.abSetting = false
      this.abSongId = null
      if (this.trackForm === 'ab') {
        this.trackForm = 'full'
        try { localStorage.setItem('acmusic_track_form', 'full') } catch (e) { /* ignore */ }
      }
    },
    // ---------------- 定时停止（D 层） ----------------
    onSleepCommand(cmd) {
      const [kind, val] = String(cmd).split(':')
      if (kind === 'off') { this._clearSleep(); return }
      if (kind === 'song') { this._applySleep('song', 0); return }
      if (kind === 'count') { this._applySleep('count', Number(val) || this.countDraft); return }
      if (kind === 'time') { this._applySleep('time', Number(val) || this.timeDraft); return }
    },
    /** 两档的取值范围与步进：首数按 1 走，分钟按 5 走（分钟没必要 1 分钟粒度的加减） */
    _sleepSpec(kind) {
      return kind === 'count'
        ? { min: 1, max: 99, step: 1 }
        : { min: 1, max: 180, step: 5 }
    },
    /**
     * −/+ 步进。改动即时生效，并且是"从现在起重算"：
     * 正在倒计时 12:30 时按 + ，得到的是 35 分钟后，而不是 12:35——
     * 用户按 + 的意图是"再加一段"，不是"给当前剩余补 5 分钟"。
     */
    stepSleep(kind, dir) {
      const spec = this._sleepSpec(kind)
      const cur = kind === 'count' ? this.countValue : this.timeValue
      const next = Math.min(spec.max, Math.max(spec.min, cur + dir * spec.step))
      // 已在边界：按钮同时置灰，静默忽略（再弹提示连点会刷屏）
      if (next === cur) return
      // 静默生效：数字本身已经在变，再叠 toast 连点会刷屏
      this._applySleep(kind, next, true)
    },
    /** 数字框直接输入：失焦/回车时提交，越界自动夹到边界 */
    onSleepNumInput(kind, e) {
      const spec = this._sleepSpec(kind)
      const cur = kind === 'count' ? this.countValue : this.timeValue
      const raw = parseInt(e.target.value, 10)
      if (!raw || isNaN(raw)) { e.target.value = cur; return }
      const next = Math.min(spec.max, Math.max(spec.min, raw))
      e.target.value = next
      if (next === cur && this.sleepMode === kind) return
      this._applySleep(kind, next)
      console.log('[Sleep]', { action: 'input', kind, value: next })
    },
    toggleSleepFade() {
      this.sleepFade = !this.sleepFade
      try { localStorage.setItem('acmusic_sleep_fade', this.sleepFade ? '1' : '0') } catch (e) { /* ignore */ }
      if (!this.sleepFade) this._cancelFade()
      console.log('[Sleep]', { action: 'fade_toggle', on: this.sleepFade })
    },
    _applySleep(mode, value, quiet) {
      this._clearSleepClock()
      this._cancelFade()
      this.sleepMode = mode
      this.sleepValue = value
      // 记住取值，下次打开菜单从这里接着调
      if (mode === 'count') this.countDraft = value
      if (mode === 'time') this.timeDraft = value
      this.songsLeft = mode === 'count' ? value : 0
      this.sleepDeadline = mode === 'time' ? Date.now() + value * 60000 : 0
      this.sleepNow = Date.now()
      this._startSleepClock()
      if (!quiet) {
        const label = mode === 'song'
          ? '播完当前这首后停止'
          : (mode === 'count' ? `再播 ${value} 首后停止` : `${value} 分钟后停止`)
        this.$message.success(`定时停止：${label}${this.sleepFade ? `（最后 ${this.fadeSec} 秒渐弱）` : ''}`)
      }
      console.log('[Sleep]', { action: 'set', mode, value, quiet: !!quiet })
    },
    _clearSleep() {
      this._clearSleepClock()
      this._cancelFade()
      this.sleepMode = 'off'
      this.sleepValue = 0
      this.songsLeft = 0
      this.sleepDeadline = 0
      this.$message.info('已取消定时停止')
    },
    _startSleepClock() {
      this._clearSleepClock()
      // 1s 粒度：倒计时只要精确到秒，但必须真的每秒变一次，否则文案会"卡住"
      this.sleepTimerId = setInterval(() => {
        this.sleepNow = Date.now()
        this._maybeFade()
        if (this.sleepMode === 'time' && this.sleepRemainSec <= 0) {
          this._sleepStop('定时已到，停止播放')
        }
      }, 1000)
    },
    _clearSleepClock() {
      if (this.sleepTimerId) { clearInterval(this.sleepTimerId); this.sleepTimerId = null }
    },
    /**
     * 每首歌结束（自然播完 / 副歌唱完 / 手动切下一首）时调用一次。
     * @param {boolean} manual 是否是用户手动点的下一首
     * @returns {boolean} true=已经到点，调用方不要再走切歌逻辑
     */
    _consumeSleep(manual) {
      if (this.sleepMode === 'off') return false
      if (this.sleepMode === 'song') {
        // "播完本首"的语义是让它自然播完，手动切歌不该触发停止
        if (manual) return false
        this._sleepStop('已播完当前歌曲，停止播放')
        return true
      }
      if (this.sleepMode === 'count') {
        this.songsLeft -= 1
        if (this.songsLeft <= 0) { this._sleepStop(`已播完 ${this.sleepValue} 首，停止播放`); return true }
        console.log('[Sleep]', { action: 'song_left', songsLeft: this.songsLeft })
      }
      return false
    },
    _sleepStop(msg) {
      this._cancelFade()
      this.pauseSong()
      this._clearSleepClock()
      this.sleepMode = 'off'
      this.sleepValue = 0
      this.songsLeft = 0
      this.sleepDeadline = 0
      this.$message.info(msg)
      console.log('[Sleep]', { action: 'stop', msg })
    },
    /**
     * 渐弱淡出：把"距离停止还有多少秒"映射成音量比例。
     * 只对"最后一首/最后一段"生效——中间几首突然变小声反而吓人。
     */
    _fadeRemainSec() {
      if (this.sleepMode === 'time') return (this.sleepDeadline - this.sleepNow) / 1000
      const isLastSong = this.sleepMode === 'song' || (this.sleepMode === 'count' && this.songsLeft <= 1)
      if (!isLastSong) return null
      const dur = Number(this.timeDuration) || 0
      if (!dur) return null
      return Math.max(0, dur - (Number(this.timeNow) || 0))
    },
    _maybeFade() {
      if (!this.sleepFade || this.sleepMode === 'off') { this._cancelFade(); return }
      const rem = this._fadeRemainSec()
      if (rem === null || rem > this.fadeSec) { this._cancelFade(); return }
      if (!this.fadeStarted) {
        this.fadeStarted = true
        this.fadeBase = this.volume
      }
      const f = Math.max(0, Math.min(1, rem / this.fadeSec))
      const v = Math.round(this.fadeBase * f)
      if (v !== this.volume) this.volume = v
    },
    _cancelFade() {
      if (!this.fadeStarted) return
      this.fadeStarted = false
      this.volume = this.fadeBase
    },
    openModeMenu() {
      this.onInteract()
      this.showModeMenu = true
    },
    closeModeMenu() { this.showModeMenu = false },
    /** 下拉展开时空闲隐藏要让路，否则菜单还开着 bar 先收起来了 */
    onChorusDropdown(visible) {
      this.isDropdownOpen = visible
      if (visible) this.clearHideTimer()
      else this.scheduleHide()
    },
    /** 长按 400ms 出菜单；长按后紧随的 click 要被吞掉，不能顺手把模式又切一档 */
    onModePress() {
      this.longPressed = false
      this.clearLongPress()
      this.longPressTimer = setTimeout(() => {
        this.longPressed = true
        this.showModeMenu = true
      }, 400)
    },
    onModeRelease() { this.clearLongPress() },
    clearLongPress() {
      if (this.longPressTimer) {
        clearTimeout(this.longPressTimer)
        this.longPressTimer = null
      }
    },
    onModeClick() {
      if (this.longPressed) { this.longPressed = false; return }
      this.togglePlayMode()
    },
    /**
     * 喜欢 / 取消喜欢当前歌曲
     * 流程：
     *   1. 登录检查 → 未登录不调 API
     *   2. 并发保护：likePending 锁
     *   3. 乐观更新：立即翻转 isLiked（UI 立刻响应）
     *   4. 调 /like API
     *   5. 服务端成功 → 同步 likedSongIds Set + emit likeChange
     *   6. 失败 /网络错误 → 回滚 isLiked + 错误提示
     */
    toggleLike() {
      if (!this.isLogin) {
        this.$message.warning('请先登录')
        return
      }
      const songId = this.currentSong && this.currentSong.id
      if (!songId) return
      if (this.likePending) return

      const wasLiked = !!this.isLiked
      const newLiked = !wasLiked

      this.onInteract()
      this.likePending = true
      // 乐观更新：UI 立即翻转
      this.isLiked = newLiked

      tracks.like(songId, newLiked)
        .then(res => {
          if (res && res.data && res.data.code === 200) {
            // 服务端成功 → 同步 likedSongIds Set（保持持久一致）
            if (newLiked) this.likedSongIds.add(String(songId))
            else this.likedSongIds.delete(String(songId))
            this.$bus.$emit('likeChange', { id: songId, liked: newLiked })
            this.$message.success(newLiked ? '已添加到我的喜欢' : '已取消喜欢')
          } else {
            // 业务失败 → 回滚
            this.isLiked = wasLiked
            this.$message.error('操作失败，请稍后重试')
          }
        })
        .catch(err => {
          console.error('[SongLike] failed', err)
          this.isLiked = wasLiked
          this.$message.error('网络错误，点赞失败')
        })
        .finally(() => {
          this.likePending = false
        })
    },
    /**
     * 拉取用户喜欢歌曲 ID 列表填充 Set
     * 调用 /likelist（需要登录）
     * Set 中以 string 形式存储 songId（兼容 Number/String 类型）
     */
    _initLikedSet() {
      if (!this.isLogin) return
      tracks.likelist()
        .then(res => {
          if (res && res.data && Array.isArray(res.data.ids)) {
            this.likedSongIds = new Set(res.data.ids.map(id => String(id)))
            // 同步当前歌曲的 liked 状态
            if (this.currentSong && this.currentSong.id) {
              this.isLiked = this.likedSongIds.has(String(this.currentSong.id))
            }
            console.log('[SongLike] init liked set:', this.likedSongIds.size)
          }
        })
        .catch(err => {
          console.error('[SongLike] init liked set failed', err)
        })
    },
    showSongDetail() { if (!this.currentSong.isVoice) this.$emit('SDClk', this.currentSong) },
    onMouseEnter() { this.clearHideTimer(); this.showBar = true },
    onMouseLeave() { this.scheduleHide() },
    onMouseMove() { this.clearHideTimer(); if (!this.showBar) this.showBar = true },
    onInteract() { this.clearHideTimer() },
    /**
     * 取流全失败后解释原因。
     * 先问 /check/music（上游直接给"亲爱的,暂无版权"这类结论，准确）；
     * 拿不到结论再退回 song detail 的 fee 字段推断；都没有就给通用文案。
     * @returns {Promise<string>} 给用户看的一句话
     */
    _explainNoSource(id) {
      // 走到这里说明本次取源失败，切档时挂起的抑制标记必须解除，
      // 否则后续正常播放的 error 重试会被永久跳过
      this.suppressAudioError = false
      return tracks.checkMusic(id).then(res => {
        const d = (res && res.data) || {}
        if (d.success === false && d.message) return d.message
        return null
      }).catch(() => null).then(msg => {
        if (msg) return msg
        return tracks.detail(id).then(r => {
          const song = r.data && r.data.songs && r.data.songs[0]
          const fee = song && song.fee
          if (fee === 1) return 'VIP歌曲，尝试解锁失败'
          if (fee === 4) return '专辑歌曲，暂无资源'
          return '暂无可用音源'
        }).catch(() => '暂无可用音源')
      })
    },
    /**
     * 拉取会员权益，用于音质门控。
     * associator = 黑胶VIP（vipCode>0 才有无损/臻音），musicPackage = 音乐包。
     *
     * ⚠️ /vip/info 有两个坑，只看 vipCode 一定会误伤会员（均已实测）：
     *    a) 完全没带登录态 → 返回 code 200 且 vipCode 全 0，看起来就像"非会员"
     *    b) 带了 MUSIC_U 但网易不认（过期/换设备）→ 返回 code 301 且**没有 data 字段**，
     *       body.data 为 undefined → vipCode 读成 undefined → 同样被判成"非会员"
     *    所以要先用 /login/status 确认网关侧认不认这份登录态，再校验 vipInfo 的响应结构；
     *    任何不确定的情况都置 -1 放行，宁可让用户点了去降级，也不要把会员拦在无损、臻音之外。
     */
    _loadVipInfo() {
      return authApi.loginStatus().then(statusRes => {
        const sd = (statusRes && statusRes.data && statusRes.data.data) || {}
        const profile = sd.profile || null
        if (!profile && !sd.account) {
          this.vipType = -1
          this.vipChecked = true
          console.warn('[VipInfo] 网关侧未识别登录态（透传失败或已掉登录），音质门控放行', sd.code)
          return
        }
        return userApi.vipInfo().then(res => {
          const body = (res && res.data) || {}
          // ⚠️ 浏览器带了 MUSIC_U 但网易不认（过期/换设备）时，网关返回
          //    {"message":"用户未登录","code":301} —— **没有 data 字段**（实测）。
          //    此时 body.data 为 undefined，会被读成 vipCode=0 → 误判"确认非会员"把会员锁在外面。
          //    这里显式识别：不是 200 或没有 data，一律按"未知"放行。
          if (!body.data || (Number(body.code) !== 200 && body.code !== undefined)) {
            this.vipType = -1
            this.vipChecked = true
            console.warn('[VipInfo] 网关返回未登录/异常，音质门控放行', body.code, body.message)
            return
          }
          const d = body.data
          const assoc = d.associator || {}
          const pkg = d.musicPackage || {}
          const redCode = Number(assoc.vipCode)
          const pkgCode = Number(pkg.vipCode)
          // vipCode 必须是明确数字才有资格判"非会员"，NaN/undefined 不该锁人
          if (!isFinite(redCode) || !isFinite(pkgCode)) {
            this.vipType = -1
          } else {
            this.vipType = redCode > 0 ? 2 : (pkgCode > 0 ? 1 : 0)
          }
          this.vipChecked = true
          console.log('[VipInfo]', {
            userId: (profile && profile.userId) || (sd.account && sd.account.id),
            associatorCode: assoc.vipCode,
            packageCode: pkg.vipCode,
            vipType: this.vipType
          })
        })
      }).catch(err => {
        // 拉取失败 → 标记未知（-1），菜单不做门控，避免把真会员误拦
        this.vipType = -1
        this.vipChecked = true
        console.warn('[VipInfo] 获取失败，音质门控跳过', err && err.message)
      })
    },
    onNeedVip(opt) {
      this.showQualityMenu = false
      const label = (opt && opt.label) || '该音质'
      this.$message.warning(`「${label}」需要黑胶VIP，已保持当前音质`)
    },
    onQualitySelect(key) {
      const vipOnly = (config.player.vipOnlyLevels || []).indexOf(key) !== -1
      // 只在"确认非会员"时拦截；vipType=-1(未知) 放行，宁可多一次降级也不要误伤真会员
      if (vipOnly && this.vipType === 0) {
        this.onNeedVip((config.player.qualityOptions || []).find(o => o.key === key))
        return
      }
      const oldLevel = this.currentLevel
      const oldSrc = this.sel.src
      console.log('[QualitySwitch]', { action: 'select', oldLevel, newLevel: key, songId: this.currentSong.id, oldSrc: oldSrc ? oldSrc.slice(0, 80) : '', playRequestId: this.playRequestId })
      config.player.level = key
      this.currentLevel = key
      localStorage.setItem('acmusic_player_quality', JSON.stringify({ level: key }))
      this.showQualityMenu = false
      if (this.currentSong.id) {
        const sid = this.currentSong.id
        // 切档要重建 audio.src，而赋值 src 会把 currentTime 归零 → 表现为"从头开始播"。
        // 这里记下当前位置，交给 _durationTime 里已有的 seek_restore 分支跳回去
        // （和刷新恢复共用 resumeTime / restoreSongId / hasRestoreProgress 这套字段）。
        // 必须在清 src 之前读，否则拿到的是 0。
        const resumeAt = (this.sel && this.sel.currentTime) || Number(this.timeNow) || 0
        this.pauseSong()
        // 清 src 会触发一次 error → 必须先掐掉重试，否则 400ms 后的 load() 会把新音频重置到 0
        this._cancelAudioRetry()
        this.suppressAudioError = true
        this.sel.src = ''
        this.pendingUrlRequests.clear()
        for (const lv of config.player.qualityLevels) {
          this.urlCache.delete(sid + '_' + lv)
        }
        this.urlCache.delete(sid + '_fallback')
        this.urlCache.delete(sid + '_match')
        // audioCache 也按档位缓存，切档必须清掉，否则会命中旧音质的地址
        removeAudioCache(sid)
        this.currentQuality = { requested: key, actual: '', isUnblock: false }
        // 0.5s 以内不折腾：本来就是开头，seek 反而多一次跳转
        if (resumeAt > 0.5) {
          this.resumeTime = resumeAt
          this.restoreSongId = sid
          this.hasRestoreProgress = true
          console.log('[QualitySwitch]', { action: 'keep_progress', songId: sid, resumeAt })
        }
        this.playRequestId++
        this.pushPromise(this.checkSong(this.currentSong.id, this.playRequestId))
      }
    },
    /**
     * 底部浮层（音质菜单 / 音量滑杆）的"点外部关闭"，对齐播放列表（el-dropdown）的交互习惯。
     * 捕获阶段监听：浮层内部、以及触发它的按钮本身都不算外部。
     * 触发按钮交给它自己的 @click 处理（再点一次即关闭），否则 mousedown 先关、click 再开，会出现"点不关"。
     */
    _onDocMouseDown(e) {
      const t = e.target
      if (this.showQualityMenu && this._isOutside(['qualityBtn', 'qualityMenu'], t)) {
        this.showQualityMenu = false
      }
      if (this.showVolume && this._isOutside(['volumeBtn', 'volumeSlider'], t)) {
        this.showVolume = false
      }
      // 模式菜单挂在 .modeWrap 里（含菜单本身），点外面任意处关闭
      if (this.showModeMenu && this._isOutside(['modeWrap'], t)) {
        this.showModeMenu = false
      }
    },
    /** 目标是否落在若干 ref（组件或元素）之外 */
    _isOutside(refNames, target) {
      if (!target) return true
      return !refNames.some(name => {
        const r = this.$refs[name]
        if (!r) return false
        const el = r.$el || r
        return el === target || (typeof el.contains === 'function' && el.contains(target))
      })
    },
    onDropdownToggle(visible) {
      this.isDropdownOpen = visible
      if (visible) {
        this.clearHideTimer()
        this.$nextTick(() => this._scrollActiveSong('open'))
      } else {
        this.scheduleHide()
      }
    },
    _scrollActiveSong(reason) {
      setTimeout(() => {
        const container = document.querySelector('.plItems')
        const active = container && container.querySelector('.el-dropdown-menu__item.active')
        if (!active) {
          console.log('[PlaylistScroll]', { action: 'missing', songId: this.currentSong.id })
          return
        }
        const idx = this.currentPlaylist.findIndex(s => s.id === this.currentSong.id)
        console.log('[PlaylistScroll]', { action: reason || 'change', songId: this.currentSong.id, index: idx })
        container.scrollTop = active.offsetTop - container.clientHeight / 2 + active.clientHeight / 2
      }, 100)
    },
    scheduleHide() {
      // A-B 选点中不能自动收起：一收起用户就看不见自己在选什么了
      if (this.isDropdownOpen || this.abSetting) return
      this.clearHideTimer()
      this.hideTimer = setTimeout(() => { this.showBar = false; this.showVolume = false }, this.isPlay ? 10000 : 10000)
    },
    clearHideTimer() { if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null } },
    formatTime(s) {
      s = s * 1; if (!s || isNaN(s) || !isFinite(s)) return '00:00'
      return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(Math.floor(s % 60)).padStart(2, '0')
    },
    onProgressClick(evt) {
      this.onInteract()
      const el = this.$refs.barTrack || this.$refs.miniTrack
      if (!el || !this.timeDuration) return
      const rect = el.getBoundingClientRect()
      const t = Math.max(0, Math.min(1, (evt.clientX - rect.left) / rect.width)) * this.timeDuration
      // A-B 选点中：这一下是"选点"，不是"定位"——必须吃掉，否则选完 A 播放位置也跑了
      if (this.abSetting) { this._abPickPoint(t); return }
      this.sel.currentTime = t
    },
    startDrag(evt) {
      this.onInteract()
      if (!this.timeDuration) return
      // 选点期间禁用拖动：拖动会连续改 currentTime，选点语义会乱
      if (this.abSetting) return
      const onMove = (e) => {
        const el = this.$refs.barTrack; if (!el) return
        const rect = el.getBoundingClientRect()
        this.sel.currentTime = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * this.timeDuration
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', () => { document.removeEventListener('mousemove', onMove); this.scheduleHide() }, { once: true })
      evt.preventDefault()
    },
    handleCommand(s) { this.onInteract(); this.showPlayerPending = true; this.isLoading = true; console.trace('[HandleCommandCall]'); console.log('[SongState]', { action: 'handleCommand', songId: s && s.id, requestId: this.playRequestId }); this.playIntentId++; this.playContextId++; this.currentSongSource = 'playlist'; this.currentPlaySourceLocked = true; this.playlistContextId = this.playContextId; console.log('[SourceChange]', { to: 'playlist', songId: s && s.id, trigger: 'handleCommand' }); console.trace('[CurrentSongSet] handleCommand', s && s.id); this.currentSong = s },
    playAllSong(msgName, mode = "order") {
      this.showPlayerPending = true
      this.isLoading = true
      this.playIntentId++
      this.playContextId++
      if (mode === "random") { console.trace('[CurrentSongSet] playAllSong_random'); this.currentSong = this.currentPlaylist[Math.ceil(Math.random() * (this.currentPlaylist.length - 1))] }
      else { console.trace('[CurrentSongSet] playAllSong'); this.currentSong = this.currentPlaylist[0] }
      this.currentPlaySourceLocked = true
      this.playlistContextId = this.playContextId
      this.currentSongSource = 'playlist'
      console.log('[SongState]', { action: 'playAllSong', currentSongId: this.currentSong.id, mode, requestId: this.playRequestId })
    },
    /**
     * FM 续播：PersonalFM 拉取新批次成功后，publish 'fmNewBatch' 并附带 startIndex
     * 这里把 curIndex 推进到 startIndex，让 watch 链路自动加载并播放新曲
     */
    /**
     * FM 续播：PersonalFM 在 reactive 路径下完成 REPLACE_PLAYLIST 后 publish 'fmNewBatch'
     * 此时把 curIndex 推进到 startIndex（替换模式下永远传 0），让 watch 链路加载并播放新曲
     * proactive 路径不调用此方法（PersonalFM 只 SET_FM_STAGED_BATCH，不 publish fmNewBatch）
     */
    playFmNewBatch(msgName, startIndex) {
      if (!this.isPersonalFM) return
      if (typeof startIndex !== 'number' || startIndex < 0) return
      if (startIndex >= this.currentPlaylist.length) return
      const target = this.currentPlaylist[startIndex]
      if (!target) return
      const sameIndex = this.curIndex === startIndex
      const sameSong = target.id === this.currentSong.id
      /**
       * curIndex 赋值只有在"值变了"的时候才会触发 watcher。
       * 而模式接口单次常只回 1 首、或换批后新歌正好落在同一位置（index 0），
       * 这时直接 `this.curIndex = 0` 是个空操作 → 声音一直停在旧歌上，
       * 表现为"换不了歌/永远是这三首"。所以这里必须显式区分三种情况。
       */
      if (sameIndex && !sameSong) {
        console.log('[FM]', { action: 'switch_same_index', from: this.currentSong.id, to: target.id })
        this.currentSongSource = 'playlist'
        this.playlistContextId = this.playContextId
        this.currentSong = target
        return
      }
      if (sameIndex && sameSong) {
        this.chorusSeekSongId = null
        this._restartCurrent()
        if (this.effectiveForm !== 'full') this._applyRangeSeek(true)
        console.log('[FM]', { action: 'replay_same_batch', songId: target.id })
        return
      }
      this.curIndex = startIndex
    },
    /**
     * 队列就地改写：统一走 REPLACE_PLAYLIST，改完把 curIndex 对齐回当前曲
     * （watcher 里有"目标与当前同 id 就跳过"的守卫，所以对齐不会触发重新播放）
     */
    _commitQueue(list) {
      this.$store.commit('TracksAbout/REPLACE_PLAYLIST', list)
      this.$nextTick(() => {
        const i = list.findIndex(t => t.id === this.currentSong.id)
        if (i !== -1 && i !== this.curIndex) this.curIndex = i
      })
    },
    /** 下一首播放：把歌曲挪到当前曲之后（拖拽排序的轻量替代） */
    playNext(s) {
      if (!s || !s.id) return
      const list = this.currentPlaylist.slice()
      const from = list.findIndex(t => t.id === s.id)
      if (from === -1) return
      const [item] = list.splice(from, 1)
      const cur = list.findIndex(t => t.id === this.currentSong.id)
      const target = cur === -1 ? 0 : cur + 1
      if (from === target) return
      list.splice(target, 0, item)
      this._commitQueue(list)
      this.$message.success(`已设为下一首：${s.name || ''}`)
      console.log('[Queue]', { action: 'play_next', songId: s.id, from, target })
    },
    /** 从队列移除单曲；移除的是当前曲则顺延播下一首 */
    removeFromQueue(s) {
      if (!s || !s.id) return
      const list = this.currentPlaylist.slice()
      const idx = list.findIndex(t => t.id === s.id)
      if (idx === -1) return
      const isCurrent = this.currentSong.id === s.id
      list.splice(idx, 1)
      if (!list.length) {
        this.$store.commit('TracksAbout/REPLACE_PLAYLIST', [])
        this.pauseSong()
        this.$message.info('播放列表已清空')
        return
      }
      this._commitQueue(list)
      if (isCurrent) {
        // 顺延到原位置（此时该位置已经是原来的下一首）
        this.currentSongSource = 'playlist'
        this.playlistContextId = this.playContextId
        this.curIndex = Math.min(idx, list.length - 1)
      }
      console.log('[Queue]', { action: 'remove', songId: s.id, index: idx, isCurrent })
    },
    clearPlaylist() {
      this.$confirm('确定清空全部播放歌曲？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.pauseSong()
        this.$bus.$emit("clearPlaylist")
        // 同步清除 localStorage 持久化数据
        // （_saveState 的守卫 if (!s || !s.id) return 会跳过 song 为空时的保存，
        //   但旧数据仍残留会导致刷新后 _restoreState 把列表"复活"）
        try { localStorage.removeItem('acmusic_player_state') } catch (e) { /* ignore */ }
        this.$message.success('播放列表已清空')
      }).catch(() => {})
    },
    addEventListeners() {
      this.sel.addEventListener('timeupdate', this._currentTime)
      this.sel.addEventListener('canplay', this._durationTime)
      this.sel.addEventListener('pause', this._onPause)
      this.sel.addEventListener('progress', this._onProgress)
      this.sel.addEventListener('error', this._onAudioError)
      this.sel.addEventListener('ended', this._onAudioEnded)
    },
    removeEventListeners() {
      this.sel.removeEventListener('timeupdate', this._currentTime)
      this.sel.removeEventListener('canplay', this._durationTime)
      this.sel.removeEventListener('pause', this._onPause)
      this.sel.removeEventListener('progress', this._onProgress)
      this.sel.removeEventListener('error', this._onAudioError)
      this.sel.removeEventListener('ended', this._onAudioEnded)
    },
    _currentTime() {
      if (this.sel) {
        this.timeNow = (this.sel.currentTime).toFixed(4)
        // 系统媒体面板进度：timeupdate 约 4 次/秒，节流到 1 秒一次即可
        const nowMs = Date.now()
        if (nowMs - this.lastPositionSync > 1000) {
          this.lastPositionSync = nowMs
          this._updatePositionState()
        }
        // 定时淡出要跟着播放进度走（"播完本首"类的剩余时间来自 timeNow）
        this._maybeFade()
        if (this.currentSong && this.currentSong.id) {
          const now = Date.now()
          if (now - this.lastSaveTime > 5000) {
            this.lastSaveTime = now
            this._saveState()
          }
        }
      }
    },
    _durationTime() {
      if (this.sel) {
        this.audioRetryCount = 0
        this.isLoading = false
        this.showPlayerPending = false
        console.log('[PlayerLoading]', { action: 'ready', songId: this.currentSong.id, requestId: this.playRequestId })
        console.log('%c[AudioReady] %cduration=%s', 'background:#7c3aed;color:#fff;padding:2px 6px', '', this.sel.duration)
        this.timeDuration = this.sel.duration
        // 区间形态（副歌 / A-B）要在 restore 之前定位：恢复进度可能落在歌曲前奏，
        // 而这两种形态期望的是"一开口就在区间起点"
        if (this.effectiveForm !== 'full') this._applyRangeSeek()
        if (this.hasRestoreProgress && this.currentSong.id && this.currentSong.id === this.restoreSongId && this.resumeTime > 0) {
          console.log('[PlayerState] seek_restore', { songId: this.currentSong.id, currentTime: this.resumeTime })
          this.sel.currentTime = this.resumeTime
          this.timeNow = this.resumeTime
          this.hasRestoreProgress = false
          this.resumeTime = 0
          this.restoreSongId = null
        }
        this._preloadNext()
        // 拿到时长后立刻同步一次，否则系统面板进度条要等下一次 timeupdate 才出现
        this._updatePositionState()
      }
    },
    _onPause() {
      if (this.currentSong.id) this._saveState()
    },
    _onProgress() {
      try {
        const b = this.sel.buffered
        if (b && b.length) {
          this.bufferedTime = b.end(b.length - 1)
        }
      } catch (e) { /* ignore */ }
    },
    /**
     * audio 'ended' 事件：audio 播放到结尾时触发
     * 这是 _autoNext 的主触发器（timeNow watcher 是兜底，处理 audio 异常未触发 ended 的场景）
     */
    _onAudioEnded() {
      this._autoNext()
    },
    _onAudioError() {
      const curSrc = this.sel.src || this.audioLastSrc
      if (!curSrc) return
      // 主动清空 src（切音质）会触发一次 error，这不是网络故障：
      // 若放行，下面的重试定时器会在新音频就绪后 load() 一次，把进度重置回 0。
      if (this.suppressAudioError) {
        console.log('[AudioRetry]', { action: 'skip_suppressed', songId: this.currentSong.id })
        return
      }
      // 直连模式: 重试3次后降级到代理
      if (!this.audioUseProxy && this.audioRetryCount >= 3) {
        this.audioUseProxy = true
        this.audioRetryCount = 0
        const proxySrc = this._toProxyUrl(curSrc)
        console.log('[AudioRetry]', { action: 'downgrade_to_proxy', songId: this.currentSong.id, src: proxySrc.slice(0, 60) })
        this.sel.src = proxySrc
        this.audioLastSrc = proxySrc
        this._scheduleAudioRetry()
        return
      }
      // 代理模式: 重试3次后放弃
      if (this.audioUseProxy && this.audioRetryCount >= 3) {
        this.audioRetryCount = 0
        this.audioUseProxy = false
        console.log('[AudioRetry]', { action: 'giveup', songId: this.currentSong.id })
        return
      }
      this.audioRetryCount++
      console.log('[AudioRetry]', { action: 'retry', attempt: this.audioRetryCount, mode: this.audioUseProxy ? 'proxy' : 'direct', songId: this.currentSong.id })
      this._scheduleAudioRetry()
    },
    /** 重试定时器集中管理：同一时刻只留一个，切换音质等场景要能主动取消 */
    _scheduleAudioRetry() {
      this._cancelAudioRetry()
      this.audioRetryTimer = setTimeout(() => {
        this.audioRetryTimer = null
        try { this.sel.load(); if (this.isPlay) { const p = this.sel.play(); if (p && p.catch) p.catch(() => {}) } } catch (e) { /* ignore */ }
      }, 400)
    },
    _cancelAudioRetry() {
      if (this.audioRetryTimer) { clearTimeout(this.audioRetryTimer); this.audioRetryTimer = null }
    },
    _toProxyUrl(src) {
      if (src && src.indexOf('/api/audio-proxy') !== -1) return src
      return location.origin + '/api/audio-proxy?url=' + encodeURIComponent(src)
    },
    _saveState() {
      const s = this.currentSong
      if (!s || !s.id) return
      try {
        const playlist = this.currentPlaylist.slice(0, 200).map(t => ({
          id: t.id,
          name: t.name || '',
          artists: (t.ar || t.artists || []).map(a => a.name).join(' / '),
          album: (t.al && t.al.name) || (t.album && t.album.name) || '',
          picUrl: (t.al && t.al.picUrl) || (t.album && t.album.picUrl) || '',
          duration: t.dt || t.duration || 0,
          source: t.source || ''
        }))
        localStorage.setItem('acmusic_player_state', JSON.stringify({
          song: {
            id: s.id,
            name: s.name || '',
            cover: (s.al && s.al.picUrl) || (s.album && s.album.picUrl) || '',
            artists: (s.ar || s.artists || []).map(a => a.name).join(' / ')
          },
          playlist,
          currentIndex: this.curIndex,
          currentTime: (this.timeNow * 1) || this.sel.currentTime || 0,
          duration: this.sel.duration || 0,
          quality: this.currentQuality,
          source: this.currentSongSource,
          playMode: this.playMode,
          timestamp: Date.now()
        }))
        console.log('[PlaylistPersist]', { action: 'save', count: playlist.length })
      } catch (e) { /* ignore */ }
    },
    _preloadNext() {
      if (this.currentSongSource !== 'playlist') return
      if (this.playMode === 'random') return
      const nextIdx = this.curIndex + 1
      if (nextIdx >= this.currentPlaylist.length) return
      const nextSong = this.currentPlaylist[nextIdx]
      if (!nextSong || !nextSong.id) return
      console.log('[AudioPreload]', { action: 'start', songId: nextSong.id })
      const level = config.player.level
      // 直接请求，不调 getSongUrl：后者会写 currentQuality，预加载不该产生 UI 副作用。
      // 结果按 id_level 缓存，下一首真正播放时 getSongUrl 直接命中。
      getAudioUrl(nextSong.id, () => {
        return this.$axios('/song/url/v1', { params: { id: nextSong.id, level, timestamp: Date.now() } })
          .then(res => {
            const d = res && res.data && res.data.data && res.data.data[0]
            return d && d.url ? toHttpsUrl(d.url) : null
          })
      }, level).catch(() => { /* silent */ })
    },
    _restoreState() {
      try {
        const raw = localStorage.getItem('acmusic_player_state')
        if (!raw) return
        const data = JSON.parse(raw)
        if (Date.now() - data.timestamp > 7 * 24 * 60 * 60 * 1000) {
          localStorage.removeItem('acmusic_player_state')
          return
        }
        if (data.playlist && data.playlist.length) {
          const deduped = []
          const seen = new Set()
          for (const t of data.playlist) {
            if (seen.has(t.id)) continue
            seen.add(t.id)
            // 补全为 PlayerCore 期望的完整结构
            deduped.push({
              id: t.id,
              name: t.name || '',
              artists: t.artists || '',
              ar: t.artists ? [{ name: t.artists }] : [],
              album: t.album || '',
              al: { name: t.album || '', picUrl: t.picUrl || '' },
              picUrl: t.picUrl || '',
              dt: t.duration || 0,
              duration: t.duration || 0,
              source: t.source || ''
            })
          }
          this.$store.commit('TracksAbout/REPLACE_PLAYLIST', deduped)
          console.log('[PlaylistPersist]', { action: 'restore', count: deduped.length })
        }
        if (data.playMode && ['order', 'sequence', 'random', 'loop'].indexOf(data.playMode) !== -1) {
          this.playMode = data.playMode
        }
        if (data.song && data.song.id) {
          this.isRestoring = true
          this.playContextId++
          this.playlistContextId = this.playContextId
          this.currentSongSource = 'restore'
          this.currentPlaySourceLocked = true
          if (data.currentIndex !== undefined) this.curIndex = data.currentIndex
          console.log('[PlaylistRestore]', { currentSongId: data.song.id, currentIndex: data.currentIndex })
          console.trace('[CurrentSongSet] restore', data.song.id)
          this.currentSong = {
            id: data.song.id,
            name: data.song.name,
            al: { picUrl: data.song.cover },
            ar: [{ name: data.song.artists }]
          }
          this.showBar = true
        }
        if (data.currentTime > 0) {
          this.resumeTime = data.currentTime
          this.hasRestoreProgress = true
          this.restoreSongId = data.song ? data.song.id : null
          this.timeNow = data.currentTime
          console.log('[PlayerState] restore', { songId: this.restoreSongId, resumeTime: this.resumeTime })
        }
        if (data.duration) this.timeDuration = data.duration
        if (data.quality) this.currentQuality = { requested: data.quality.requested || '', actual: data.quality.actual || '', isUnblock: data.quality.actual === 'match' }

        // 【关键修复】恢复完成后，同步 curIndex 到正确歌曲位置，再解除守卫
        // 原因：恢复时直接赋值 currentSong（不触发 watcher），但 curIndex 默认为 0，
        // 如果恢复的歌曲不在 index=0，curIndex watcher 会把它错误覆盖成 playlist[0]。
        // 此处用 $nextTick 在 curIndex watcher 之后执行，确保 curIndex 与 currentSong 一致。
        this.$nextTick(() => {
          if (data.song && data.song.id) {
            const savedIdx = this.currentPlaylist.findIndex(s => s.id === data.song.id)
            if (savedIdx !== -1) {
              this.curIndex = savedIdx
              console.log('[RestoreSync] curIndex aligned to', savedIdx)
            }
          }
          this.isRestoring = false
          this.currentSongSource = 'playlist'
          if (this.playMode === 'random') this._initShuffle()
        })
      } catch (e) { /* ignore */ }
    },
  },
  beforeMount() { this.sel = new Audio() },
mounted() {
    this._restoreState()
    try {
      const savedMode = localStorage.getItem('acmusic_play_mode')
      if (savedMode && ['order', 'sequence', 'random', 'loop'].indexOf(savedMode) !== -1) this.playMode = savedMode
      const savedForm = localStorage.getItem('acmusic_track_form')
      // 'ab' 不会被写入（按歌临时设定），这里防御一下：区间不在了就回落完整播放
      if (savedForm === 'chorus') this.trackForm = 'chorus'
      const savedFade = localStorage.getItem('acmusic_sleep_fade')
      if (savedFade === '0') this.sleepFade = false
    } catch (e) { /* ignore */ }
    this.addEventListeners()
    this._initMediaSession()
    window.addEventListener('keydown', this._onGlobalKeydown)
    // 捕获阶段，早于业务层的 @click.stop，保证点白色区域也能关掉音质菜单
    document.addEventListener('mousedown', this._onDocMouseDown, true)
    this.pubId = pubsub.subscribe('playAll', this.playAllSong)
    this.fmBatchId = pubsub.subscribe('fmNewBatch', this.playFmNewBatch)
    // FM 模式标志（从 Vuex 下沉）：PersonalFM / HomePage / App 通过 $bus 通知
    this._fmModeHandler = (val) => { this.isPersonalFM = !!val }
    this.$bus.$on('fm-mode', this._fmModeHandler)
    this._onBeforeUnload = () => { this._saveState() }
    window.addEventListener('beforeunload', this._onBeforeUnload)
    // 登录态启动后拉取一次 /likelist 填充 likedSongIds
    if (this.isLogin) {
      this._initLikedSet()
      this._loadVipInfo()
    }
  },
  beforeDestroy() {
    // 定时器的 setInterval 不随组件销毁消失，必须显式清
    this._clearSleepClock()
    window.removeEventListener('beforeunload', this._onBeforeUnload)
    window.removeEventListener('keydown', this._onGlobalKeydown)
    document.removeEventListener('mousedown', this._onDocMouseDown, true)
    this._saveState()
    this.removeEventListeners()
    this._teardownMediaSession()
    this.init()
    this.clearHideTimer()
    pubsub.unsubscribe(this.pubId)
    pubsub.unsubscribe(this.fmBatchId)
    this.$bus.$off('fm-mode', this._fmModeHandler)
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/scss/base/motion";
$bar-h: 60px; $mini-h: 4px; $accent: #8685EF;
$bg: #1c1d28; $text: rgba(255,255,255,0.9); $text-sec: rgba(255,255,255,0.44); $text-ter: rgba(255,255,255,0.24);
$border: rgba(255,255,255,0.06); $radius: 12px;

.playerPanel {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
  &.hasSong { display: block; }
  .fullBar {
    display: flex; align-items: center; height: $bar-h;
    background: linear-gradient(180deg, rgba($bg, 0.94) 0%, rgba(darken($bg, 3%), 0.98) 100%);
    border-top: 1px solid $border;
    box-shadow: 0 -4px 24px rgba(0,0,0,0.28);
    padding: 0 20px; gap: 10px;
    backdrop-filter: blur(20px);
    animation: slideUp 260ms cubic-bezier(0.22,0.61,0.36,1);
    transition: background 500ms ease;
  }
}

.miniBar {
  position: fixed; bottom: 0; left: 0; right: 0; height: 28px; z-index: 101; cursor: pointer;
  .miniTrack {
    position: absolute; bottom: 0; left: 0; right: 0; height: $mini-h;
    background: rgba(255,255,255,0.05);
    transition: height 180ms ease;
    .miniFill {
      height: 100%;
      background: linear-gradient(90deg, $accent, lighten($accent, 6%));
      border-radius: 0 2px 2px 0;
      transition: width 0.1s linear;
      box-shadow: 0 0 8px rgba($accent, 0.2);
    }
    // 折叠态也标出副歌位置：这是「发现这个功能」的最低成本入口
    .miniChorus {
      position: absolute; top: 0; bottom: 0;
      background: rgba($accent, 0.42);
      pointer-events: none;
      transition: background 200ms ease;
      &.on { background: rgba($accent, 0.85); }
    }
  }
  &:hover .miniTrack { height: 6px; }
}

.playerPanel.expanded .miniBar { display: none; }

@keyframes slideUp {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

// Cover fade transition (歌曲切换时封面渐隐渐显)
.cover-fade-enter-active,
.cover-fade-leave-active {
  transition: opacity 240ms cubic-bezier(0.22,0.61,0.36,1), transform 240ms cubic-bezier(0.22,0.61,0.36,1);
}
.cover-fade-enter { opacity: 0; transform: scale(.94); }
.cover-fade-leave-to { opacity: 0; transform: scale(.94); }

// Song title/artist slide-up transition
.slide-up-enter-active,
.slide-up-leave-active {
  transition: opacity 220ms cubic-bezier(0.22,0.61,0.36,1), transform 220ms cubic-bezier(0.22,0.61,0.36,1);
}
.slide-up-enter { opacity: 0; transform: translateY(8px); }
.slide-up-leave-to { opacity: 0; transform: translateY(-8px); }

// Play/pause button swap transition
.btn-swap-enter-active,
.btn-swap-leave-active {
  transition: opacity 180ms cubic-bezier(0.22,0.61,0.36,1), transform 180ms cubic-bezier(0.22,0.61,0.36,1);
}
.btn-swap-enter { opacity: 0; transform: scale(.6); }
.btn-swap-leave-to { opacity: 0; transform: scale(.6); }

.barInfoInner { overflow: hidden; }

.barLeft {
  flex: 0 0 230px; width: 230px; display: flex; align-items: center; gap: 12px; min-width: 0;
  .barCover {
    width: 44px; height: 44px; border-radius: 8px; overflow: hidden; flex-shrink: 0; cursor: pointer;
    background: rgba(255,255,255,0.04); box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    img { width: 100%; height: 100%; object-fit: cover; }
    .coverPlaceholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: $text-sec; font-size: 16px; }
  }
  .barInfo {
    flex: 1; min-width: 0; cursor: pointer;
    p { margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .barTitle { font-size: 14px; font-weight: 600; color: $text; line-height: 1.3; }
    .barArtist { font-size: 12px; color: $text-sec; line-height: 1.3; }
  }
  .likeBtn {
    font-size: 18px; color: $text-sec; cursor: pointer; flex-shrink: 0; padding: 5px;
    transition: all 200ms cubic-bezier(0.22,0.61,0.36,1);
    &:hover { color: $text; transform: scale(1.15); }
    &.liked { color: #ef4444; filter: drop-shadow(0 0 4px rgba(239,68,68,0.25)); }
  }
}

.barCenter {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 200px;
  .barControls {
    display: flex; align-items: center; gap: 12px; color: $text;
    .miniTrackBtn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 30px; height: 30px; border-radius: 50%;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.08);
      cursor: pointer;
      transition: all 180ms ease;
      color: rgba(255,255,255,0.6);
      &:hover { background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.9); transform: scale(1.08); }
      &:active { transform: scale(0.92); }
    }
    .modeWrap {
      position: relative;
      display: inline-flex;
      align-items: center;
    }
    // 与前后切歌按钮同尺寸的圆形热区，但不给底色：层级上是"次级控件"，
    // 悬停才浮出背景，避免三个按钮抢视觉
    .modeBtn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 30px; height: 30px; border-radius: 50%;
      border: 1px solid transparent;
      cursor: pointer; color: rgba(255,255,255,0.42);
      transition: all 160ms ease; font-size: 13px; position: relative;
      i { font-style: normal; }
      &.mode-random { color: $accent; }
      &.mode-loop { color: $accent; }
      // 副歌形态生效时补一颗小点，避免"忘了自己开着副歌模式"
      &.is-chorus { color: $accent; }
      .chorusDot {
        position: absolute; right: 2px; bottom: 2px;
        width: 6px; height: 6px; border-radius: 50%;
        background: $accent;
        box-shadow: 0 0 0 2px rgba(28, 29, 40, 0.95);
      }
      &:hover {
        color: rgba(255,255,255,0.9);
        background: rgba(255,255,255,0.07);
        border-color: rgba(255,255,255,0.06);
      }
      &.mode-random:hover, &.mode-loop:hover, &.is-chorus:hover { color: $accent; }
    }
    .barPlay {
      width: 32px; height: 32px; border-radius: 50%; background: $accent; color: #fff;
      display: flex; align-items: center; justify-content: center; cursor: pointer;
      box-shadow: 0 2px 12px rgba($accent, 0.3);
      transition: all 200ms cubic-bezier(0.22,0.61,0.36,1);
      i { font-size: 18px; margin-left: 1px; }
      &:hover { transform: scale(1.1); box-shadow: 0 4px 18px rgba($accent, 0.45); }
      &:active { transform: scale(0.94); }
    }
    .player-loading-spinner {
      display: block;
      width: 14px; height: 14px;
      border: 2px solid rgba(255, 255, 255, .3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: player-loading-spin .8s linear infinite;
    }
    @keyframes player-loading-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  }
  .barProgress {
    width: 100%; max-width: 480px; display: flex; align-items: center; gap: 9px;
    .barTime { font-size: 11px; color: rgba(255,255,255,0.34); font-variant-numeric: tabular-nums; min-width: 34px; letter-spacing: .2px; &:first-child { text-align: right; } }
    .barTrack {
      flex: 1; height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px; cursor: pointer; position: relative;
      transition: height 160ms ease, box-shadow 200ms ease;
      &:hover { height: 6px; border-radius: 3px; }
      // A-B 选点中：整条轨道亮一下，明确"现在点我是在选点"
      &.is-arming {
        height: 6px; border-radius: 3px;
        background: rgba(255,255,255,0.12);
        box-shadow: 0 0 0 1px rgba($accent, 0.55), 0 0 10px rgba($accent, 0.35);
      }
      .barFill {
        height: 100%; background: $accent; border-radius: inherit; position: relative;
        transition: width 0.1s linear; box-shadow: 0 0 6px rgba($accent, 0.18);
        .barThumb {
          position: absolute; right: -8px; top: 50%; transform: translateY(-50%);
          width: 15px; height: 15px; background: #fff; border-radius: 50%;
          box-shadow: 0 1px 6px rgba(0,0,0,0.45); opacity: 0;
          transition: opacity 160ms ease; cursor: pointer;
        }
      }
      &:hover .barFill .barThumb { opacity: 1; }

      // 副歌区间：叠在进度之上，pointer-events 关掉，
      // 否则会把「点进度条定位」的点击吞掉（点带子本身就该等于在那一点定位）
      .chorusBand {
        position: absolute; top: 0; bottom: 0;
        background: rgba($accent, 0.26);
        border-left: 1px solid rgba($accent, 0.7);
        border-right: 1px solid rgba($accent, 0.7);
        border-radius: 2px;
        pointer-events: none;
        transition: background 200ms ease;
        &.on { background: rgba($accent, 0.5); }
      }

      // A-B 区间：与副歌带子同规格，但用琥珀色区分来源
      //（副歌是上游标注，A-B 是用户自己框的，颜色一样会分不清）
      .abBand {
        position: absolute; top: 0; bottom: 0;
        background: rgba(240, 198, 116, 0.22);
        border-left: 1px solid rgba(240, 198, 116, 0.85);
        border-right: 1px solid rgba(240, 198, 116, 0.85);
        border-radius: 2px;
        pointer-events: none;
        transition: background 200ms ease;
        &.on { background: rgba(240, 198, 116, 0.46); }
      }

      // 只选了 A 点时的竖线
      .abMark {
        position: absolute; top: -3px; bottom: -3px;
        width: 2px; margin-left: -1px;
        background: rgba(240, 198, 116, 0.95);
        border-radius: 1px;
        pointer-events: none;
        box-shadow: 0 0 6px rgba(240, 198, 116, 0.6);
      }
    }
  }
}

.barRight {
  flex: 0 0 236px; width: 236px; display: flex; align-items: center; justify-content: flex-end; gap: 7px;
  .barItem {
    position: relative; cursor: pointer; color: $text-sec; display: flex; align-items: center;
    transition: color 160ms cubic-bezier(0.22,0.61,0.36,1);
    i { font-size: 16px; }
    &:hover { color: $text; }
  }
  .volumeWrap .volumeSlider {
    position: absolute; bottom: calc(100% + 12px); left: 50%; transform: translateX(-50%);
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
    background: #1f202b; border: 1px solid rgba(255,255,255,0.05);
    border-radius: 10px; padding: 10px 10px 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.45); z-index: 10;
    .volumeValue {
      font-size: 11px; font-weight: 600; line-height: 1; color: rgba(255,255,255,0.75);
      font-variant-numeric: tabular-nums; min-width: 18px; text-align: center;
    }
    &::after {
      content: ''; position: absolute; top: 100%; left: 50%; margin-left: -6px;
      border-width: 6px 6px 0; border-style: solid;
      border-color: #1f202b transparent transparent;
    }
    input[type="range"] {
      writing-mode: vertical-lr; direction: rtl;
      width: 4px; height: 88px;
      -webkit-appearance: none; appearance: none;
      background: rgba(255,255,255,0.1); border-radius: 2px; outline: none; cursor: pointer;
      &::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: #fff; cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.3); }
    }
  }
  .volume-pop-enter-active, .volume-pop-leave-active {
    transition: opacity 180ms ease, transform 180ms ease;
  }
  .volume-pop-enter, .volume-pop-leave-to {
    opacity: 0;
    transform: translateX(-50%) translateY(6px);
  }
  .playlistWrap .playlistTrigger {
    display: flex; align-items: center; gap: 3px;
    i { font-size: 16px; }
    .plCount { font-size: 10px; background: rgba(255,255,255,0.1); color: $text; border-radius: 8px; padding: 1px 5px; min-width: 14px; text-align: center; }
  }
  .qualityWrap .qualityBtn {
    display: inline-flex; align-items: center; justify-content: center;
    height: 22px; padding: 0 7px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.04);
    color: $text-sec;
    font-size: 11px; font-weight: 600;
    border-radius: 6px;
    cursor: pointer;
    line-height: 1;
    font-family: inherit;
    transition: all 180ms $ease-standard;
    &:hover { background: rgba(255, 255, 255, 0.1); color: $text; border-color: rgba(255, 255, 255, 0.18); }
    // 解灰源：第三方音源，音质与版本不可控，用琥珀色提示
    &.is-unblock {
      color: #f0c674;
      border-color: rgba(240, 198, 116, 0.35);
      background: rgba(240, 198, 116, 0.12);
    }
  }

  // 单曲形态切换（完整 / 只播副歌）：与音质按钮同一套 chip 规格，
  // 只是多了个图标；两种状态都保持同尺寸，切换时不跳位
  .chorusWrap .chorusTrigger {
    display: inline-flex; align-items: center; justify-content: center; gap: 4px;
    height: 22px; padding: 0 7px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.04);
    border-radius: 6px;
    color: $text-sec;
    font-size: 11px; font-weight: 600; line-height: 1;
    cursor: pointer;
    transition: all 180ms $ease-standard;
    &:hover { background: rgba(255, 255, 255, 0.1); color: $text; border-color: rgba(255, 255, 255, 0.18); }
    &.on {
      color: $accent;
      background: rgba($accent, 0.1);
      border-color: rgba($accent, 0.3);
      &:hover { background: rgba($accent, 0.16); border-color: rgba($accent, 0.45); }
    }
    // 选点中：呼吸一下，提示"还差一步"
    &.is-arming {
      color: #f0c674;
      border-color: rgba(240, 198, 116, 0.45);
      background: rgba(240, 198, 116, 0.12);
      animation: ab-arming 1.4s ease-in-out infinite;
    }
  }

  // 定时停止：与形态切换器同规格 chip，激活时用主题色并显示倒计时
  .sleepWrap .sleepTrigger {
    display: inline-flex; align-items: center; justify-content: center; gap: 4px;
    height: 22px; padding: 0 7px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.04);
    border-radius: 6px;
    color: $text-sec;
    font-size: 11px; font-weight: 600; line-height: 1;
    cursor: pointer;
    transition: all 180ms $ease-standard;
    &:hover { background: rgba(255, 255, 255, 0.1); color: $text; border-color: rgba(255, 255, 255, 0.18); }
    &.on {
      color: $accent;
      background: rgba($accent, 0.1);
      border-color: rgba($accent, 0.3);
      .sleepLabel { font-variant-numeric: tabular-nums; }
      &:hover { background: rgba($accent, 0.16); border-color: rgba($accent, 0.45); }
    }
  }
}

@keyframes ab-arming {
  0%, 100% { box-shadow: 0 0 0 0 rgba(240, 198, 116, 0); }
  50% { box-shadow: 0 0 0 3px rgba(240, 198, 116, 0.14); }
}

@media (max-width: 1280px) {
  // 未开启定时任务时省掉「定时」两个字，图标本身够表意
  .barRight .sleepWrap .sleepTrigger:not(.on) .sleepLabel { display: none; }
}
@media (max-width: 1024px) {
  .barLeft { flex: 0 0 180px; width: 180px; }
  .barRight { flex: 0 0 188px; width: 188px; }
  // 窄屏只留图标+箭头，避免右侧挤出可用区
  .barRight .chorusWrap .chorusTrigger .chorusLabel { display: none; }
  .barRight .sleepWrap .sleepTrigger:not(.on) .sleepLabel { display: none; }
}
@media (max-width: 768px) {
  .fullBar { padding: 0 10px; gap: 6px; }
  .barLeft { flex: 0 0 130px; width: 130px; .likeBtn { display: none; } }
  .barRight { flex: 0 0 auto; width: auto; .volumeWrap { display: none; } }
  .barCenter .barProgress { max-width: 280px; .barTime { display: none; } }
}
</style>

<style lang="scss">
/* global: playlist dropdown (teleported to body) */
.playlistDropdown {
  background: #1c1d29 !important;
  border: 1px solid rgba(255,255,255,0.05) !important;
  box-shadow: 0 16px 48px rgba(0,0,0,0.55) !important;
  border-radius: 14px !important;
  padding: 0 !important;
  min-width: 280px !important;
  max-width: 380px;
  max-height: 420px;
  overflow: hidden;

  .plHeader {
    display: flex; justify-content: space-between; align-items: center;
    padding: 14px 18px 8px;
    font-size: 14px; font-weight: 700; color: rgba(255,255,255,0.85);

    .plTotal { font-size: 12px; font-weight: 400; color: rgba(255,255,255,0.3); }
  }

  .plActions {
    padding: 0 18px 8px;
    .el-button--text { color: rgba(255,255,255,0.3); font-size: 11px; padding: 3px 10px; border-radius: 10px;
      &:hover { color: #ef4444; background: rgba(239,68,68,0.08); }
    }
  }

  .plItems {
    max-height: 340px; overflow-y: auto;

    &::-webkit-scrollbar { width: 3px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 2px; }

    .el-dropdown-menu__item {
      display: flex; flex-direction: column; gap: 2px;
      position: relative;
      padding: 10px 64px 10px 18px; color: rgba(255,255,255,0.55); font-size: 13px;
      transition: all 180ms ease; line-height: 1.3;
      overflow: hidden; min-width: 0;

      .plSongName { font-size: 13px; color: inherit; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .plSongArtist { font-size: 11px; color: rgba(255,255,255,0.25); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

      &:hover {
        background: rgba(255,255,255,.08); color: rgba(255,255,255,.96);
        .plSongArtist { color: rgba(255,255,255,.70); }
        transform: translateX(3px);
      }

      &.active {
        background: rgba(134,133,239,0.1);
        color: #8685EF; font-weight: 600;
        border-left: 2px solid #8685EF;
        .plSongArtist { color: rgba(134,133,239,0.5); }
      }
    }

    // 每行的快捷操作：默认隐形，悬停浮出，避免列表看起来很吵
    .plOps {
      position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
      display: flex; align-items: center; gap: 2px;
      opacity: 0; transition: opacity 140ms ease;
    }
    .el-dropdown-menu__item:hover .plOps { opacity: 1; }
    .plOp {
      display: inline-flex; align-items: center; justify-content: center;
      width: 22px; height: 22px; border-radius: 6px;
      color: rgba(255,255,255,0.42);
      transition: background 140ms ease, color 140ms ease;
      &:hover { background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.92); }
    }
  }

  .plEmpty {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 40px 18px; text-align: center; color: rgba(255,255,255,0.2); font-size: 13px;
    .plEmptyIcon { font-size: 32px; margin-bottom: 12px; opacity: .5; }
    p { margin: 0; line-height: 1.6; }
    .plEmptyHint { font-size: 11px; color: rgba(255,255,255,0.1); margin-top: 4px; }
  }
}

/* global: 单曲形态下拉（teleported to body，scoped 样式管不到） */
.chorusDropdown {
  background: #1c1d29 !important;
  border: 1px solid rgba(255,255,255,0.06) !important;
  box-shadow: 0 16px 48px rgba(0,0,0,0.55) !important;
  border-radius: 12px !important;
  padding: 6px !important;
  min-width: 156px !important;

  .el-dropdown-menu__item {
    display: flex; align-items: center; gap: 6px;
    padding: 8px 10px; border-radius: 8px;
    font-size: 13px; color: rgba(255,255,255,0.62);
    line-height: 1.4;
    transition: background 160ms ease, color 160ms ease;

    &:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.95); }
    &.is-active {
      color: #8685EF;
      background: rgba(134,133,239,0.12);
      font-weight: 600;
    }

    .opt-hint {
      font-size: 10px; font-weight: 400;
      color: rgba(255,255,255,0.28);
      background: rgba(255,255,255,0.05);
      border-radius: 4px; padding: 1px 5px;
    }
  }
}

/* global: 定时停止下拉（teleported to body，scoped 样式管不到） */
.sleepDropdown {
  background: #1c1d29 !important;
  border: 1px solid rgba(255,255,255,0.06) !important;
  box-shadow: 0 16px 48px rgba(0,0,0,0.55) !important;
  border-radius: 12px !important;
  padding: 6px !important;
  min-width: 186px !important;
  max-width: 220px;

  .el-dropdown-menu__item {
    display: flex; align-items: center; justify-content: space-between; gap: 6px;
    padding: 8px 10px; border-radius: 8px;
    font-size: 13px; color: rgba(255,255,255,0.62);
    line-height: 1.4;
    transition: background 160ms ease, color 160ms ease;

    &:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.95); }
    &.is-active {
      color: #8685EF;
      background: rgba(134,133,239,0.12);
      font-weight: 600;
    }
  }

  // 可调节档位行：「再播 [−] N [+] 首后停止」/「播放 [−] N [+] 分钟后停止」
  // 不用 el-dropdown-item：行内要放按钮和输入框，而 item 是一次性命令
  .sdRow {
    display: flex; align-items: center; gap: 5px;
    padding: 7px 10px; border-radius: 8px;
    font-size: 13px; color: rgba(255,255,255,0.62);
    transition: background 160ms ease, color 160ms ease;

    &:hover { background: rgba(255,255,255,0.06); }
    &.is-active { color: #8685EF; background: rgba(134,133,239,0.1); font-weight: 600; }

    .sdLabel { flex-shrink: 0; }
    .sdUnit { flex-shrink: 0; font-weight: 400; }

    .sdStep {
      flex-shrink: 0;
      display: inline-flex; align-items: center; justify-content: center;
      width: 20px; height: 20px; border-radius: 6px;
      font-size: 14px; line-height: 1;
      background: rgba(255,255,255,0.08);
      color: rgba(255,255,255,0.8);
      cursor: pointer; user-select: none;
      transition: background 140ms ease, color 140ms ease;
      &:hover { background: rgba(255,255,255,0.18); color: #fff; }
      &:active { transform: scale(0.92); }
      // 到边界置灰但仍占位，避免按钮消失导致行宽跳动
      &.disabled { opacity: 0.3; cursor: not-allowed; &:hover { background: rgba(255,255,255,0.08); } }
    }

    // 定宽而不是 flex:1 —— 撑满会让整个弹窗被拉宽，而这里只需要放下两三位数字
    .sdNum {
      flex: 0 0 34px; width: 34px;
      height: 20px; padding: 0 2px;
      text-align: center;
      font-size: 13px; font-weight: 600;
      font-variant-numeric: tabular-nums;
      font-family: inherit;
      color: inherit;
      background: rgba(0,0,0,0.22);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 6px;
      outline: none;
      transition: border-color 140ms ease, background 140ms ease;
      &:focus { border-color: rgba(134,133,239,0.6); background: rgba(0,0,0,0.34); }
    }
  }

  // 淡出开关：不是"菜单项"，所以不用 el-dropdown-item，
  // 自己画一个小 switch，避免选完就关菜单
  .sdFade {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    margin-top: 4px; padding: 9px 10px 7px;
    border-top: 1px solid rgba(255,255,255,0.06);
    font-size: 12px; color: rgba(255,255,255,0.45);
    cursor: pointer;
    transition: color 160ms ease;
    &:hover { color: rgba(255,255,255,0.8); }
  }

  .sdSwitch {
    position: relative; flex-shrink: 0;
    width: 26px; height: 14px; border-radius: 7px;
    background: rgba(255,255,255,0.14);
    transition: background 180ms ease;

    &::after {
      content: '';
      position: absolute; top: 2px; left: 2px;
      width: 10px; height: 10px; border-radius: 50%;
      background: rgba(255,255,255,0.75);
      transition: transform 180ms ease, background 180ms ease;
    }

    &.on {
      background: rgba(134,133,239,0.55);
      &::after { transform: translateX(12px); background: #fff; }
    }
  }
}

/* override element ui dropdown item hover */
.el-dropdown-menu__item:focus, .el-dropdown-menu__item:not(.is-disabled):hover {
  background-color: transparent !important;
}
</style>
