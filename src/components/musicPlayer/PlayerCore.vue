<template>
  <div
    ref="playerPanel"
    class="playerPanel"
    :class="{ expanded: showBar, paused: !isPlay, hasSong: currentSong.id }"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
    @mousemove="onMouseMove"
  >
    <!-- 播放条上方的浮动播报区：整体水平居中，吊在播放按钮正上方。
         内联提示在上、音源状态在下（更贴近播放条），两者同时出现时自动堆叠，不互相盖住 -->
    <div class="floatStack" :class="{ 'is-collapsed': !showBar }">
      <transition name="hint-pop">
        <div v-if="hintText" class="playerHint">
          <BaseIcon v-if="hintIcon" :name="hintIcon" :size="14" class="hintIcon" />
          <span class="hintText">{{ hintText }}</span>
        </div>
      </transition>
      <transition name="source-pop">
        <div v-if="sourceStatus.text" class="sourceHint" :class="'is-' + sourceStatus.tone" :title="sourceStatus.text" role="status">
          <i class="statusDot"></i>
          <span class="hintText">{{ sourceStatus.text }}</span>
        </div>
      </transition>
    </div>
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
        <!-- 有官方 MV 时挨着红心放一盏小灯：只有 4~6 成歌曲有，所以不做灰态，直接不出现 -->
        <button
            v-if="currentMvId && !isMvDead(currentMvId)"
            type="button"
            class="mvBtn"
            :title="'播放《' + songName + '》的 MV'"
            @click.stop="openMv"
        >MV</button>
      </div>
      <div class="barCenter">
        <!-- 四层播放模式的当前组合。绝对定位在左端：不参与 barControls 的居中计算，
             所以文案变长变短都不会把中间那排控件推得左右晃 -->
        <div ref="stackWrap" class="stackWrap">
          <button
              class="stackPill"
              :class="{ 'is-stacked': stacked }"
              :title="stackTitle"
              @click="openModeMenu"
          ><span class="stackText">{{ stackSummary }}</span></button>
          <ModeMenu
              :visible="showModeMenu"
              :layers="modeLayers"
              @select-policy="setPlayMode"
              @toggle-heart="toggleHeartMode"
              @select-form="setTrackForm"
              @sleep-command="onSleepCommand"
              @sleep-step="onSleepStep"
              @sleep-input="onSleepInput"
              @toggle-fade="toggleSleepFade"
              @reset="resetModeStack"
          />
        </div>
        <div class="barControls">
          <div class="modeWrap" ref="modeWrap">
            <span
                class="modeBtn"
                :class="{ 'is-chorus': effectiveForm !== 'full', 'is-locked': policyLocked && playMode !== 'loop' }"
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
              <i v-if="effectiveForm !== 'full'" class="chorusDot"></i>
              <i v-else-if="heartMode" class="heartDot"></i>
            </span>
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
          <!-- 当前歌曲加入歌单：跟着下一首走，和传输控件同一档视觉 -->
          <span
              class="miniTrackBtn addPlBtn"
              title="添加到歌单"
              aria-label="添加到歌单"
              @click.stop="addCurrentToPlaylist"
          ><BaseIcon name="playlistPlus" :size="16"/></span>
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
          <QualityMenu ref="qualityMenu" :visible="showQualityMenu" :selected="qualityMenuSelected" :levels="songLevels" :unblock="currentQuality.isUnblock && !currentQuality.byChoice" :unblock-detail="unblockDetailText" :unblock-note="unblockNoteText" @select="onQualitySelect"/>
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
          <el-dropdown ref="queueDropdown" v-if="currentPlaylist.length" trigger="click" placement="top" @command="handleCommand" @visible-change="onDropdownToggle">
            <span class="playlistTrigger">
              <!-- 播放三角语义是"播放"，这里其实是"打开队列"，换成列表图标 -->
              <BaseIcon name="list"/>
              <span class="plCount">{{ currentPlaylist.length }}</span>
            </span>
            <!-- 和定时/副歌一致：带一个指向触发按钮的倒三角（popper 默认把箭头对准参考元素中心） -->
            <el-dropdown-menu slot="dropdown" class="playlistDropdown">
              <!-- 顶部操作条：固定在列表上方，列表滚动时不动 -->
              <div class="plHead">
                <span class="plTitle">播放列表<em class="plTotal">{{ currentPlaylist.length }}</em></span>
                <span class="plHeadOps">
                  <button
                      type="button"
                      class="plHeadBtn"
                      title="把当前播放列表全部加入某个歌单"
                      @click.stop="addQueueToPlaylist"
                  ><BaseIcon name="playlistPlus" :size="13"/>收藏全部</button>
                  <button
                      type="button"
                      class="plHeadBtn is-danger"
                      title="清空播放列表"
                      @click.stop="clearPlaylist"
                  ><BaseIcon name="delete" :size="13"/>清空</button>
                </span>
              </div>
              <div class="plItems">
                <el-dropdown-item v-for="s in currentPlaylist" :key="s.id" :class="{ active: s.curSong, 'is-blocked': isBlocked(s) }" :command="s">
                  <span class="plSongName">{{ s.name }}</span>
                  <span class="plSongArtist">{{ getArtistStr(s) }}</span>
                  <span class="plOps">
                    <span v-if="mvOf(s)" class="plOp" title="播放 MV" @click.stop="openTrackMv(s)"><BaseIcon name="mv" :size="12"/></span>
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
        <!--
          更多：屏蔽歌曲 / 歌手。
          放在迷你条而不是展开播放器——展开态是"沉浸听歌"，不该塞低频管理动作；
          迷你条才是"听到不想听的随手处理"的地方。
        -->
        <div class="barItem moreWrap">
          <el-dropdown trigger="click" placement="top" @command="onBlockCommand">
            <span class="moreTrigger" title="更多" aria-label="更多操作">
              <BaseIcon name="more" :size="16"/>
            </span>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item command="blockSong" :disabled="!currentSong.id">屏蔽这首歌</el-dropdown-item>
              <el-dropdown-item command="blockArtist" :disabled="!primaryArtist">屏蔽这位歌手</el-dropdown-item>
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
import { fetchHeartBatch, resetHeartPlaylistId } from "@/utils/heartMode"
// FM 取流：首页 PersonalFM 在时走事件协作，不在时（刷新后停在别的页面）本组件兜底
import { fetchFmBatch, isFmUiMounted, currentFmFetchOptions } from "@/utils/personalFm"
// 直接用 isLoggedIn() 而不是 UserAbout/isLogin getter：后者没有响应式依赖，
// Vue 会永久缓存（见 CHANGELOG 2026-10 关于该 getter 的修复记录）
import { isLoggedIn } from "@/utils/auth"
import { setSongTitle, clearSongTitle, BASE } from "@/utils/title";
import * as tracks from "@/api/Tracks";
import * as userApi from "@/api/User";
import * as authApi from "@/api/auth";
import { toHttpsUrl, imgParam } from "@/utils/filters";
import { mvIdOf, isMvDead } from "@/utils/songMv";
import { unblockBrief, unblockDetail, qualityTierShort } from "@/utils/audioSource";
import { songMvMixin } from "@/mixins/songMvMixin";

// 打卡门槛：播满 30 秒或过半（先到者）。
// 太短的「点一下就切」报了也不会被网易云计入，只会白打一次接口。
const SCROBBLE_MIN_SECONDS = 30;
const SCROBBLE_MIN_RATIO = 0.5;

export default {
  name: "PlayCore",
  props: ["song", "isExpand"],
  components: { QualityMenu, ModeMenu },
  // currentMvId / resolveSongMv：当前歌曲对应的 MV，见 utils/songMv.js
  mixins: [songMvMixin],
  data() {
    return {
      // 播放器内联状态条：承载「A-B 选点 / 副歌 / 心动模式 / 定时停止」这类持续状态。
      // 这些以前是用 toast 播报的，2 秒就消失，用户根本来不及读。
      hintText: '',
      hintIcon: '',
      hintTimer: null,
      /**
       * 音源解析状态（播放按钮上方那枚浮动胶囊）。
       * 解灰是条有等待代价的链路：官方档位逐个试完没货才轮到第三方源，中间几秒
       * 只有一个转圈的 play 按钮，用户不知道它在干什么。这里把每一步都讲出来。
       * tone 决定配色：pending=进行中 / unblock=解灰中 / ok=成功 / fail=失败
       */
      sourceStatus: { text: '', tone: '' },
      sourceStatusTimer: null,
      sourceStatusDelayTimer: null,
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
      /**
       * 当前歌曲"真的有"哪些音质档位（顺序由高到低），空数组 = 未知 → 菜单不做限制。
       * 来源是 /song/detail 的 hr/sq/h/m/l 字段（某档为 null 即该档不存在），
       * 用来把音质菜单从"固定 5 档"收成"这首歌实际有的几档"。
       */
      songLevels: [],
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
      // ---- 听歌打卡（/scrobble）----
      // 服务端的「听歌记录 / 听歌排行 / 年度报告」全部由打卡日志累积，官方播放器边播边报；
      // 本站不报的话，个人主页「最近一周」恒为空（「所有时间」只是官方客户端的历史累计）。
      // 详见 analysis/user-record-week-empty-analysis.md
      scrobbleKey: '',        // 已上报的 key（歌 id # 第几次播放），用于去重
      scrobbleSeq: 0,         // 播放轮次：换歌 / 重播同一首时自增，让同一首歌能重复计次
      scrobbleSourceId: 0,    // 本次播放的归属 id（歌单/专辑），起播时确定、播完前一直有效
      scrobbleStart: null,    // 本次播放的起点进度：中断恢复可能从 40s 开始，不能把旧进度算成"已听"
      currentPlaySourceLocked: false,
      audioRetryCount: 0,
      audioLastSrc: '',
      // audioLastSrc 属于哪首歌：换歌瞬间 sel.src 可能还是上一首的，下载口子要靠它判断
      audioSrcSongId: null,
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
      // 续批的 in-flight promise：并发调用要复用同一个，否则会重复拉两批
      heartExtendPromise: null,
      // 取批令牌：换台（playAllSong）时自增，在途的心动开启请求回来时凭它作废
      heartRequestToken: 0,
      // 无 UI 时 FM 续播的 in-flight 标记（预取 / 队尾取流各一个）
      fmPrefetching: false,
      fmFetchingSelf: false,
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
    /**
     * 心动模式（B 层内容来源）：接管"下一首从哪来"，与 FM 互斥。
     * 状态放在 Vuex 而不是本地 data —— 首页那张入口卡片要读它显示"播放中"。
     * 用 computed + setter 是为了让下面所有 `this.heartMode = x` 的写法保持原样。
     */
    heartMode: {
      get() { return this.$store.state.TracksAbout.heartMode },
      set(v) { this.$store.commit('TracksAbout/SET_HEART_MODE', v) }
    },
    heartBusy: {
      get() { return this.$store.state.TracksAbout.heartBusy },
      set(v) { this.$store.commit('TracksAbout/SET_HEART_BUSY', v) }
    },
    /**
     * 心动模式的续批信号：比 FM 提前一首（倒数第二首就开始拉）。
     * FM 到最后一首才预取是因为它一次只回 3 首、且 PersonalFM 有自己的暂存机制；
     * 心动模式是"追加到队尾"，提前一首才来得及在切过去之前把队列补上。
     */
    heartShouldPrefetch() {
      // 登录态没就绪时续批必然失败（fetchHeartBatch 拿不到 uid → NO_UID），
      // 刷新恢复心动模式后尤其容易出现这种"flag 已置位、请求还发不出去"的空转
      if (!this.heartMode || !isLoggedIn()) return false
      const len = this.currentPlaylist.length
      return len > 0 && this.curIndex >= len - 2
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
    /**
     * 模式按钮的 title：只报"当前是什么"，不带任何操作说明（不写括号）。
     *  - 普通队列：队列策略名
     *  - 心动 / 私人FM：来源 + 当前那一档（如 `心动模式 · 顺序播放`）——
     *    这两种模式下能生效的只有顺序播放和单曲循环，报出来是准确的
     * 叠加副歌形态时末尾再补一段。
     */
    modeBtnTitle() {
      const form = this.effectiveForm === 'chorus' ? '只播副歌' : (this.effectiveForm === 'ab' ? 'A-B 循环' : '')
      const parts = []
      if (this.policyLocked) {
        // 心动 / 私人FM：来源 + 当前那一档（只可能是顺序播放或单曲循环）
        parts.push(this.heartMode ? '心动模式' : '私人FM')
        parts.push(this.modeLabel)
      } else {
        parts.push(this.modeLabel)
      }
      if (form) parts.push(form)
      return parts.join(' · ')
    },
    modeLabel() {
      const map = { order: '列表循环', sequence: '顺序播放', loop: '单曲循环', random: '随机播放' }
      return map[this.playMode] || '列表循环'
    },
    /**
     * 队列策略是否被"接管"了。
     *
     * 心动模式 / 私人 FM 都是"下一首从哪来"的来源层，它们自己决定下一首，所以
     * 列表循环（首尾相接）和随机（打乱顺序）在这两种模式下不成立，UI 置灰不可切。
     * **顺序播放和单曲循环保留**：前者就是推荐流真实的推进方式（顺着往下走、队尾续批），
     * 后者只决定"这一首放完要不要重播"，与来源无关。
     * 进入这两种模式时会把列表循环 / 随机对齐成顺序播放，见 _heartOn / _fmModeHandler。
     */
    policyLocked() {
      return this.heartMode || this.isPersonalFM
    },
    // ---------------- 四层播放模式的"当前组合" ----------------
    /**
     * 组合标签的文案片段。
     *
     * 四层散落在三处（队列+来源在模式菜单、单曲形态在进度条、定时在右下角），
     * 之前没有任何一处能看到"我现在到底叠了什么"。这个标签把它拼成一句话：
     * 「随机播放 · 心动 · A-B · 12:30后停」。
     *
     * A 层（队列策略）永远显示：它决定基准读法，少了标签就变成"只在叠了东西时才出现"，
     * 用户反而学不到这个标签是干什么的。
     */
    stackSegments() {
      /**
        * 第一段：策略没被接管时是队列策略（列表循环…），被接管时换成来源本身
       * （心动模式 / 私人FM），第二段补上此时真正生效的那一档（顺序播放 / 单曲循环）。
       * 等价关系：!policyLocked ⟺ 心动和 FM 都没开，所以原来那两段 push 可以去掉。
       */
      const seg = this.policyLocked
        ? [this.heartMode ? '心动模式' : '私人FM', this.modeLabel]
        : [this.modeLabel]
      if (this.effectiveForm === 'chorus') seg.push('副歌')
      else if (this.effectiveForm === 'ab') seg.push('A-B')
      if (this.sleepMode === 'song') seg.push('本首后停')
      else if (this.sleepMode === 'count') seg.push(`${this.songsLeft}首后停`)
      else if (this.sleepMode === 'time') seg.push(`${this.formatTime(this.sleepRemainSec)}后停`)
      return seg
    },
    // 注意：stackSegments 是 computed，取的是值不是函数，不能再加 () 调用
    stackSummary() { return this.stackSegments.join(' · ') },
    /** 只有队列策略、其余全是默认值时，标签不该抢视觉（.is-stacked 才上主题色） */
    stacked() { return this.policyLocked || this.stackSegments.length > 1 },
    stackTitle() {
      // 和模式按钮保持一致：只报状态，不写"点击/右键…"这类操作说明
      return `当前播放组合：${this.stackSummary}`
    },
    /**
     * 总览面板要的全部状态，一次传进去（避免十几条 props）。
     * sleepSpec 是两档的取值范围/步进：数字框要在输入框里就地夹边界，所以一起给。
     */
    modeLayers() {
      return {
        policy: this.playMode,
        policyLocked: this.policyLocked,
        fm: this.isPersonalFM,
        heart: this.heartMode,
        heartBusy: this.heartBusy,
        form: this.trackForm,
        chorusAvailable: !!this.chorusRange,
        abHint: this.abHint,
        abValid: this.abRangeValid,
        sleepMode: this.sleepMode,
        countValue: this.countValue,
        timeValue: this.timeValue,
        sleepFade: this.sleepFade,
        fadeSec: this.fadeSec,
        sleepSpec: { count: this._sleepSpec('count'), time: this._sleepSpec('time') }
      }
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
    /** 屏蔽名单版本号：watch 用它（字符串路径 watch 走 $store 不稳，computed 更可靠） */
    blockRev() { return this.$store.state.BlockAbout.rev },
    /** 第一个带 id 的歌手：屏蔽歌手必须用真实 id，恢复队列里的旧存档可能只有名字 */
    primaryArtist() {
      const s = this.currentSong || {}
      const ar = s.ar || s.artists
      if (!Array.isArray(ar)) return null
      return ar.find(a => a && a.id != null) || null
    },
    /**
     * 菜单里该高亮哪一档——以"实际在放的档位"为准。
     *
     * 旧逻辑先看 `config.player.level`，于是非会员选无损被上游压成 320k 时，
     * 菜单高亮"高解析度无损"、播放条按钮显示"HQ"，两边各说各话（用户实测）。
     * 现在顺序反过来：实际档位 → 用户所选（还没起播时）→ 最高可用档。
     * 解灰源的 actual 是 'match'，没有官方档位，直接跳过这一层。
     */
    qualityMenuSelected() {
      const avail = this.songLevels || []
      const q = this.currentQuality || {}
      // 解灰态下没有任何官方档位在生效：一档都不高亮。
      // 以前这里会退回 config.player.level，于是出现"菜单高亮 HD、按钮写着 320k"的自相矛盾。
      if (q.isUnblock) return ''
      const cfg = config.player.level
      const actual = q.actual && q.actual !== 'match' ? q.actual : ''
      if (actual && (!avail.length || avail.indexOf(actual) !== -1)) return actual
      if (!avail.length || avail.indexOf(cfg) !== -1) return cfg
      return avail[0]
    },
    /**
     * 显示"实际拿到的音质"，而不是用户选的档位。
     * 上游会把超权限的请求压级（非会员选 lossless 实际给 exhigh）；
     * 解灰源只有一档固定音质，按返回的 br 反推实际档位（琥珀色另行标识第三方），
     * 取不到码率时才退回"解灰"。
     * 还没起播时用 qualityMenuSelected 兜底：这首歌没有所选档位的话，
     * 别让按钮先亮一个它给不了的标（等播完再改口更奇怪）。
     */
    currentQualityShort() {
      const q = this.currentQuality || {}
      const actual = q.actual
      if (actual === 'match') {
        // 写"解灰"等于没说：用户既不知道听的是什么质量，也没法和官方档位对比。
        // 只有老后端不返回 br 时才退回这个兜底文案。
        return qualityTierShort(q.br) || '解灰'
      }
      const opts = config.player.qualityOptions || []
      const key = actual || this.qualityMenuSelected || this.currentLevel
      const f = opts.find(o => o.key === key)
      return f ? f.short : '标'
    },
    qualityTitle() {
      const q = this.currentQuality || {}
      if (q.isUnblock) {
        // 只留"谁给的、多少码率、多大"，不再堆解释性文案：
        // 解灰这件事在菜单里已经有一行说明，tooltip 再重复一遍又长又吵。
        return unblockDetail(q) || '音质选择'
      }
      const opts = config.player.qualityOptions || []
      const f = opts.find(o => o.key === (q.actual || this.currentLevel))
      if (!f) return '音质选择'
      const reqLabel = (opts.find(o => o.key === q.requested) || {}).label
      if (reqLabel && q.actual && q.actual !== q.requested) {
        return `已选「${reqLabel}」，当前实际为「${f.label}」（${f.bitrate || ''}）`
      }
      return `当前音质：${f.label}`
    },
    /** 音质菜单里那行"解灰源"的副标题：`波点音乐 · 320kbps · 10.3 MB`，取不到时为空串 */
    unblockDetailText() {
      const q = this.currentQuality || {}
      return q.isUnblock ? unblockDetail(q) : ''
    },
    /**
     * 解灰态但官方档位仍可选时（用户主动要会员档、被压级后转去解灰），
     * 菜单下方补一行说明，而不是把档位列表整段隐藏 —— 那样用户就退不回 320k / 标准了。
     */
    unblockNoteText() {
      const q = this.currentQuality || {}
      return q.isUnblock && q.byChoice ? unblockBrief(q) : ''
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
      // 换账号/登出：红心歌单 id 缓存必须失效，否则会拿上一个账号的歌单去要推荐
      resetHeartPlaylistId()
      if (!val && this.heartMode) this.heartMode = false
    },
    song(val) {
      console.trace('[CurrentSongSet] song_watch', val && val.id)
      console.log('[SongState]', { action: 'song_watch', currentSongId: this.currentSong.id || null, playlistFirstId: this.currentPlaylist[0] && this.currentPlaylist[0].id || null, requestId: this.playRequestId })
      /**
       * 外部点歌（App.vue 的 songClk）也是一次"换台"，要做两件事：
       *  ① 心动 / 私人 FM 这两种"队列来源"必须一起退掉（心动也是独立的播放模式），
       *     否则用户从别的歌单点了首歌，队尾还在按红心歌单续批；
       *  ② 队列跟着换：推荐流的队列不能和用户后来点的歌混在一起
       *     （不同播放模式下的歌单不混用）。
       *     FM 那边由 _fmModeHandler 负责收队（App 在塞 song 之前先发了 'fm-mode' false），
       *     心动没有那条信号，在这里补：先把 wasHeart 记下来，退出后再收队。
       *     `val` 没有 id 说明不是点歌（App.clearAll 的 song = {}），既不用收队也不用点歌。
       */
      const wasHeart = this.heartMode
      this._exitStreamModes()
      if (wasHeart && val && val.id) this._collapseQueueToCurrent()
      this.playIntentId++
      this.playContextId++
      this.currentSongSource = 'unknown'
      this.currentPlaySourceLocked = true
      console.log('[SourceChange]', { to: 'unknown', songId: val && val.id, trigger: 'song_watch' })
      this.currentSong = normalizeTrack(val)
      this.updateMiniBackground()
      /**
       * 清空播放列表走的是 App.clearAll → `song = {}`。
       * 这里必须把计时和音源一起归零：audio 里还留着上一首的 src 和进度，
       * 结果就是"未选择歌曲"的播放条上挂着 00:10 / 02:46，点播放还会接着放旧歌。
       */
      if (!val || !val.id) this._resetIdleState()
    },
    currentSong(val, oldVal) {
      if (val.id) {
        // 换歌前先把上一首补报掉：此刻 sel 的 currentTime / duration 还停在旧歌上，
        // 判断「播够门槛没有」才准（本 watcher 之后 pauseSong 会把进度清掉）。
        const sameSong = !!(oldVal && oldVal.id && oldVal.id === val.id)
        if (!sameSong) {
          if (oldVal && oldVal.id) this._reportPlay(oldVal)
          // 新一轮播放：seq 自增，同一首歌重播也能再计一次
          this.scrobbleSeq++
          this.scrobbleSourceId = this._resolveSourceId(val)
          // 新歌的"已听秒数"从 0 起算（起播后由首次 timeupdate 锚定真实起点）
          this.scrobbleStart = null
        }
        this._loadChorus()
        this._loadSongLevels(val.id)
        // 当前歌曲的 MV：自带 mv 就直接出，缺字段（FM / 刷新恢复）才补一次详情
        this.resolveSongMv(val)
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
          // 换歌即清空"上一首拿到什么音质/是不是解灰"的结论：新歌解析出来之前
          // 这些都是未知，留着会让音质按钮先亮一个不属于这首歌的标
          this.currentQuality = { requested: config.player.level, actual: '', isUnblock: false }
          this.playRequestId++
          this.pushPromise(this.checkSong(this.currentSong.id, this.playRequestId))
        }
        const inPlaylist = this.currentPlaylist.findIndex(item => item.id === val.id)
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
        /**
         * 【关键修复】点歌走的是 App.vue 的 songClk → props.song 这条路，
         * 它只会把 source 打成 'unknown'，上面两个分支只负责对齐 curIndex，
         * source 却一直停在 'unknown'。于是之后 preSong / nextSong / _autoNext
         * 改的 curIndex 会被 curIndex watcher 里的 PlaylistGuard 当成"非队列切歌"
         * 整颗丢掉 —— 表现就是：依次点播两首歌（队列只有 2 首）后「上一首」点了没反应，
         * 而且这首播完也不会自动接下一首。
         * 走到这里这首歌必定已在队列里（命中 inPlaylist，或被 PUSH_PLAYLIST 追加），
         * 播放上下文就是队列本身：对齐 contextId 后正式接管为 'playlist'。
         * isRestoring / 'restore' 期间不动，恢复流程在自己的 $nextTick 里收尾。
         */
        if (!this.isRestoring && this.currentSongSource !== 'playlist' && this.currentSongSource !== 'restore') {
          this.playlistContextId = this.playContextId
          this.currentSongSource = 'playlist'
          console.log('[SourceChange]', { to: 'playlist', songId: val.id, trigger: 'currentSong', index: this.currentPlaylist.findIndex(t => t.id === val.id) })
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
    volume(val) {
      if (this.sel && typeof this.sel.volume === 'number') this.sel.volume = val / 100
      // 渐弱淡出会把音量一路压到 0：那不是用户设定，不能记进长期偏好
      // （fadeStarted 期间的所有 volume 变化都跳过，取消淡出时 _cancelFade 会还原 fadeBase）
      if (!this.fadeStarted) this._rememberVolume(val)
    },
    /**
     * 把"FM 是否在放"镜像进 store：首页漫游卡的「播放中」徽标读它。
     * 不镜像的话卡片只能看 fmMode（选了哪个模式），于是心动模式/普通歌单接管队列后
     * 漫游卡仍然亮着"播放中"，和心动卡一起显示两个正在播放。
     *
     * 【为什么不在这里清队】原来这里还有一句 `REPLACE_PLAYLIST([currentSong])`
     * （"退出 FM 只留当前这首"）。但它对**所有**退出 FM 的路径生效，包括
     * "FM 播着的时候点了别的歌单" —— 那时 playAllTracks 已经把队列换成新歌单了，
     * 这一刀会把新歌单清成一首，等于点了播放全部却只剩一首歌。
     * 清队语义只属于"用户从 FM 退到点播某首歌"，所以挪到 _fmModeHandler 里，
     * 由它显式触发（时机仍然是 nextTick，等新歌塞进队列之后再清）。
     */
    isPersonalFM(val) {
      this.$store.commit('TracksAbout/SET_FM_ACTIVE', val)
    },
    /**
     * 面板开着时队列长度变了（移除/追加），面板高度跟着变，
     * 底边要重新贴回 fullBar —— 只靠打开时校正一次会被撑出缝。
     */
    'currentPlaylist.length'() {
      if (!this.isDropdownOpen) return
      this._schedulePanelAlign()
    },
    /**
     * FM 预加载：进入最后一首时主动 publish 'fmPrefetch'（**只拉数据，不应用**）
     * PersonalFM 收到后 fetch /personal_fm 并 SET_FM_STAGED_BATCH（暂存，不 REPLACE）
     * 真正的切换由 reactive 流程在歌曲自然结束 / 用户点 next 时触发
     */
    fmShouldPrefetch(needed) {
      if (!needed) return
      // 有 UI 时由 PersonalFM 拉并暂存（它还要刷那三张卡）；没有 UI 时自己预取
      if (isFmUiMounted()) pubsub.publish('fmPrefetch', Date.now())
      else this._fmPrefetchSelf()
    },
    heartShouldPrefetch(needed) {
      if (needed) this._heartExtend()
    },
    'currentSong.id'(id, oldId) {
      // A-B 是按歌设定的：换歌就整块丢弃（区间 + 选点中间态）
      if (id !== oldId) this._resetAb()
      this._syncTitle()
      this._syncMediaSession()
      this._broadcastNowPlaying()
    },
    isPlay() {
      this._syncTitle()
      this._syncMediaSession()
      this._broadcastNowPlaying()
    },
    isPending() {
      // 加载态推给浮窗：那段时间光环只流动、不呼吸，避免"没声还在喘气"
      this._broadcastNowPlaying()
    },
    /**
     * 屏蔽名单变了：当前这首刚被屏蔽就立刻跳走。
     * 用 rev 计数而不是 deep watch —— Vue.set/Vue.delete 不换对象引用，浅 watch 捕捉不到，
     * deep watch 又要遍历整个名单，性价比低。
     */
    blockRev() {
      this._onBlocklistChanged()
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
        // 长按只认第一次，后续 repeat 事件只负责挡住页面滚动
        if (e.repeat) { e.preventDefault(); return }
        /**
         * 空格是这个播放器的"播放/暂停"键，优先级最高：
         *
         * 1. <button> 自带默认行为（空格 = 点它）。焦点落在「下一首」上的路径有两条：
         *    鼠标点过之后焦点残留，或者用 Tab 移过去 —— 不拦的话"想暂停"会变成"一直切歌"。
         *    这里统一 preventDefault 取消默认激活，回车仍然可以正常激活按钮。
         * 2. 刻意**不**看 e.defaultPrevented：浏览器扩展（平滑滚动、Vim 类按键插件）会在
         *    捕获阶段先把空格 preventDefault 掉去做自己的事，按旧逻辑会直接 return，
         *    表现就是"点了空白处之后按空格没反应"。被抢了也要接管。
         *
         * 唯一的例外是弹窗里的按钮（评论弹窗 / Element UI 确认框）：交还给浏览器（= 确认），
         * 免得写评论或确认弹窗时误触播放控制。输入框 / 滑块在更上面已经直接放行。
         */
        const focused = document.activeElement
        if (focused && focused.tagName === 'BUTTON' &&
            focused.closest('.el-dialog__wrapper, .el-message-box__wrapper, .comment-overlay, [role="dialog"]')) return
        e.preventDefault()
        this.togglePlay()
        return
      }
      // 其余快捷键尊重已处理的事件（比如视频播放器自己吃掉的左右键）
      if (e.defaultPrevented) return
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
    /**
     * 广播「现在在放什么」。
     * currentSong / isPlay 都只存在于本组件，浮窗挂在 App 层拿不到，
     * 所以由这里推出去 —— 换歌、播放/暂停各推一次。
     * 只传浮窗要用的三个字段，别把整个歌曲对象丢过去。
     */
    _broadcastNowPlaying() {
      const s = this.currentSong || {}
      const ar = (s.ar && s.ar[0]) || (s.artists && s.artists[0]) || null
      this.$bus.$emit('nowPlaying', {
        id: s.id || 0,
        name: s.name || '',
        artist: (ar && ar.name) || '',
        playing: !!this.isPlay,
        pending: !!this.isPending
      })
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
    /**
     * 回到"没有当前歌曲"的空闲态。
     *
     * 触发场景：清空播放列表、把队里最后一首移除。
     * 只 pause 是不够的——timeNow / timeDuration 还是上一首的值，进度条会停在
     * 00:10 / 02:46；与此同时 audio 里还留着上一首的 src，点播放会把它放出来。
     * 所以这里把计时、加载态、音源一起清掉，让播放条真正回到"未选择歌曲"。
     */
    _resetIdleState() {
      this.timeNow = 0
      this.timeDuration = 0
      this.bufferedTime = 0
      this.isPlay = false
      this.isLoading = false
      this.showPlayerPending = false
      this.currentQuality = { requested: config.player.level, actual: '', isUnblock: false }
      this.songLevels = []
      if (!this.sel) return
      // 摘掉 src 会触发一次 error 事件（无媒体源），临时压掉，避免弹"音源加载失败"
      this.suppressAudioError = true
      try {
        this.sel.pause()
        this.sel.removeAttribute('src')
        this.sel.load()
      } catch (e) { /* 浏览器差异，忽略 */ }
      setTimeout(() => { this.suppressAudioError = false }, 1000)
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
            self.audioSrcSongId = String(id)
            self.audioRetryCount = 0
            self.audioUseProxy = false
            self.suppressAudioError = false
            // 新 src 会把播放进度归零：之前那次「跳到副歌起点」的 seek 已经作废，
            // 清掉标记，让 canplay 时重新定位（否则副歌模式看起来像失效）
            self.chorusSeekSongId = null
            self.sel.load()
            // 音源到位 → 进行中的「正在获取/解灰」收掉（成功结论有自己的定时器）
            self.settleSourceStatus()
            resolve()
            return
          }
          // 所有 fallback 均失败 → 问清原因（/check/music 会直接给"暂无版权"），然后自动切下一首
          self._explainNoSource(id).then(msg => {
            if (requestId !== self.playRequestId) { resolve({ cancelled: true }); return }
            self.$toast.warning(msg)
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
            if (requestId === self.playRequestId) self.$toast.warning(msg)
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
            self.audioSrcSongId = String(id)
            self.audioRetryCount = 0
            self.audioUseProxy = false
            self.suppressAudioError = false
            // 新 src 会把播放进度归零：之前那次「跳到副歌起点」的 seek 已经作废，
            // 清掉标记，让 canplay 时重新定位（否则副歌模式看起来像失效）
            self.chorusSeekSongId = null
            self.sel.load()
            // 音源到位 → 进行中的「正在获取/解灰」收掉（成功结论有自己的定时器）
            self.settleSourceStatus()
            resolve()
            return
          }
          // 所有 fallback 均失败 → 问清原因（/check/music 会直接给"暂无版权"），然后自动切下一首
          self._explainNoSource(id).then(msg => {
            if (requestId !== self.playRequestId) { resolve({ cancelled: true }); return }
            self.$toast.warning(msg)
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
            if (isNoResource) self._explainNoSource(id).then(msg => self.$toast.warning(msg))
            else self.$toast.warning('播放失败，请稍后重试')
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
        /**
         * 缓存里躺着的可能是解灰地址（预取或上一轮解灰留下的），
         * 直接当官方档位返回会让按钮显示成默认音质、实际放的却是第三方文件。
         * 同一个 url 在 match 缓存里也有记录时，按解灰源还原状态。
         */
        const matchHit = this.urlCache.get(id + '_match')
        const fromMatch = !!(matchHit && matchHit.url === cachedUrl)
        this.currentQuality = fromMatch
          ? {
            requested: preferred, actual: 'match', isUnblock: true,
            source: matchHit.provider || '', br: matchHit.br || 0, size: matchHit.size || 0
          }
          : { requested: preferred, actual: preferred, isUnblock: false }
        // 缓存命中是瞬时的，上一首残留的状态行顺手清掉
        this.clearSourceStatusSoon()
        return Promise.resolve({ data: { data: [{ url: cachedUrl }] } })
      }

      const startIdx = config.player.qualityLevels.indexOf(preferred)
      const levels = config.player.fallbackLevels
        ? config.player.qualityLevels.slice(startIdx === -1 ? 0 : startIdx)
        : [preferred]

      console.log('%c▶ 获取音源 %c/song/url/v1?id=%s&level=%s', 'background:#059669;color:#fff;padding:2px 6px', '', id, preferred)
      // 灰色歌没有任何前置信号，只能靠"等太久"来判断：先挂个延时播报，正常音源会把它清掉
      this.armSourceStatus(requestId)

      // fallback br 根据 level 映射 (仅 /song/url 兜底时使用)
      const BR_MAP = { hires: 999000, lossless: 999000, exhigh: 320000, higher: 192000, standard: 128000 }
      const fallbackBr = br || BR_MAP[preferred] || 320000

      const self = this
      const CACHE_TTL = 10 * 60 * 1000
      // 本次取源是否见过"试听片段"：决定进解灰时的文案（试听 ≠ 无版权）
      let sawTrial = false

      const tryLevel = (index) => {
        if (requestId !== self.playRequestId) return Promise.resolve({ cancelled: true })
        if (index >= levels.length) {
          // 官方音源全档位都没货 → 解灰兜底；解灰也失败再看是否启用老接口
          self._matchByChoice = false
          self.setSourceStatus(sawTrial ? '仅试听片段，正在解灰…' : '无版权，正在解灰…', 'unblock')
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

        // 这首歌根本没有这一档（/song/detail 的 hr/sq/h/m/l 已写明），跳过注定空手的请求
        if (self.songLevels.length && self.songLevels.indexOf(lv) === -1) {
          console.log('%c↓ 跳过 %s：本曲无此档位', 'color:#64748b;padding:2px 6px', lv)
          return tryLevel(index + 1)
        }

        return self.$axios('/song/url/v1', {
          params: { id, level: lv, timestamp: Date.now() }
        }).then(res => {
          if (requestId !== self.playRequestId) return Promise.resolve({ cancelled: true })
          const d = res.data && res.data.data && res.data.data[0]
          const url = d && d.url
          /**
           * 试听片段识别（免费/VIP 版权分层的关键）。
           * VIP 独占曲目（fee=1）对未登录或非会员会返回 30-35 秒的片段：
           * url 有值、也能播，但 freeTrialInfo 非空。旧逻辑只看 url，
           * 于是把这半首歌当正常音源播了 —— 音质档位怎么选都是那 35 秒。
           *
           * 处理：直接判定该档位不可用，跳过剩下的档位去解灰兜底
           * （试听是版权侧策略，换低档位依旧是试听，没必要多打三次请求）。
           * 正常歌曲 freeTrialInfo 恒为 null，音质选择逻辑完全不受影响。
           */
          const trial = !!(d && d.freeTrialInfo)
          if (!url || trial) {
            if (trial) {
              const span = Math.max(0, (d.freeTrialInfo.end || 0) - (d.freeTrialInfo.start || 0))
              console.log('%c↓ 试听片段 %s（约 %ss）→ 跳过其余档位，直接解灰', 'background:#b45309;color:#fff;padding:2px 6px', lv, span || '?')
              sawTrial = true
              return tryLevel(levels.length)
            }
            console.log('%c↓ 降级 %s→%s', 'background:#d97706;color:#fff;padding:2px 6px', lv, levels[index + 1] || '解灰')
            // 下一档还存在就是降级换档，否则紧接着会进解灰（那里的文案更准确）
            if (levels[index + 1]) self.setSourceStatusLater('官方无货，换源中…', 'pending')
            return tryLevel(index + 1)
          }
          const actualLevel = (d && d.level) || lv
          const vipTier = (config.player.vipOnlyLevels || []).indexOf(lv) !== -1
          // 这首歌真的有这一档吗（songLevels 为空=未知，按"有"处理）
          const songHasIt = !self.songLevels.length || self.songLevels.indexOf(lv) !== -1
          /**
           * 非会员点"无损/臻音"：上游会如实压级（lossless → exhigh，实测）。
           * 这里不将就 —— 先用解灰源要这一档的真文件（通常直接给 .flac），
           * 拿不到再退回刚拿到的压级文件，保证"点了就有的听"、也不会静音。
           *
           * 只在"这首确实有这档"时才绕道：如果曲库本身最高只有 320k，
           * 上游给 exhigh 就正常接受，没必要为同一个文件去喷"解灰"标签。
           */
          if (vipTier && actualLevel !== lv && songHasIt) {
            console.log('%c↑ %s 被压成 %s（无此档权限）→ 试解灰', 'background:#7c3aed;color:#fff;padding:2px 6px', lv, actualLevel)
            // 用户要的是这一档，别用"无版权"糊弄：这是账号权限，走解灰拿真文件
            self._matchByChoice = true
            self.setSourceStatus('会员音质，正在解灰…', 'unblock')
            return self.requestMatchSongUrl(id, requestId).catch(() => {
              // 解灰没戏：退回压级文件（顺手撤掉"解灰失败"的播报，避免自相矛盾）
              self.clearSourceStatusSoon()
              self.urlCache.set(id + '_' + actualLevel, { url, level: actualLevel, br: d && d.br, size: d && d.size, expire: Date.now() + CACHE_TTL })
              setAudioCache(id, url, actualLevel)
              self.currentQuality = { requested: preferred, actual: actualLevel, isUnblock: false }
              const fallbackLabel = ((config.player.qualityOptions || []).find(o => o.key === actualLevel) || {}).label || actualLevel
              self.$toast.warning(`解灰源不可用，已用「${fallbackLabel}」播放`)
              return res
            })
          }
          self.urlCache.set(ck, { url, level: lv, br: d && d.br, size: d && d.size, expire: Date.now() + CACHE_TTL })
          setAudioCache(id, url, lv)
          // d.level 是上游如实返回的实际档位（非会员请求无损会被压成 exhigh）
          self.currentQuality = { requested: preferred, actual: actualLevel, isUnblock: false }
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
        const fbItem = r.data && r.data.data && r.data.data[0]
        const fbUrl = fbItem && fbItem.url
        // 老接口同样会给 VIP 曲目发试听片段，一并拒掉
        const fbTrial = !!(fbItem && fbItem.freeTrialInfo)
        console.log('%c  %s %s', '', fbUrl && !fbTrial ? '✅成功' : '❌失败', fbUrl && !fbTrial ? '' : (fbTrial ? '（仅试听）' : '→尝试match'))
        if (!fbUrl || fbTrial) return Promise.reject(new Error('FALLBACK_EMPTY'))
        this.urlCache.set(ck, { url: fbUrl, level: 'fallback', expire: Date.now() + 10 * 60 * 1000 })
        // 老接口捞回来了：前面「解灰失败」的播报得撤掉，否则与实际播放状态矛盾
        this.clearSourceStatusSoon()
        return r
      }).catch(err => {
        console.error('[PlayError]', { songId: id, stage: 'FALLBACK_FAIL', requestId: this.playRequestId, reason: err && err.message || String(err) })
        throw err
      })
    },
    /**
     * 解灰兜底（第三方源：酷我/酷狗/QQ 等）。
     * 该接口返回的是 { code, data: "<url 字符串>", proxyUrl, source, br, size }，
     * data 不是数组 —— 历史实现按 data[0].url 取值，导致这层一直是死的。
     * 解灰源音质/版本不可控，成功后把 isUnblock 置 true，播放器上会标"解灰"。
     *
     * source/br/size 是后端新增的字段（旧后端不返回，取值会得到空，文案自动退回"第三方源"），
     * 有了它们界面上才能写清"从哪个源拿的、多大码率"，而不是笼统的"第三方源"。
     */
    requestMatchSongUrl(id, requestId) {
      if (requestId !== this.playRequestId) return Promise.resolve({ cancelled: true })
      const ck = id + '_match'
      console.log('%c▶ 解灰兜底 %c/song/url/match?id=%s', 'background:#dc2626;color:#fff;padding:2px 6px', '', id)
      const cached = this.urlCache.get(ck)
      if (cached && Date.now() < cached.expire) {
        this.currentQuality = {
          requested: config.player.level, actual: 'match', isUnblock: true,
          byChoice: !!this._matchByChoice,
          source: cached.provider || '', br: cached.br || 0, size: cached.size || 0
        }
        this.setSourceStatus(`解灰完成 · ${unblockBrief(this.currentQuality)}`, 'ok')
        this.clearSourceStatusSoon(4000)
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
        // provider 存平台名（bodian/qq…），与 source:'match'（表示"这是解灰档"）不是一回事
        const provider = payload.source || ''
        const br = Number(payload.br) || 0
        const size = Number(payload.size) || 0
        this.urlCache.set(ck, {
          url: matchUrl, level: 'match', source: 'match', provider, br, size,
          expire: Date.now() + 10 * 60 * 1000
        })
        this.currentQuality = {
          requested: config.player.level, actual: 'match', isUnblock: true,
          byChoice: !!this._matchByChoice, source: provider, br, size
        }
        console.log('%c  ✳ 解灰成功 %c%s ← %s', 'color:#dc2626', '', matchUrl.slice(0, 70), unblockBrief(this.currentQuality))
        // 结论留 6 秒：够用户看清"这首是从哪个源来的"，之后让位给封面/歌名
        this.setSourceStatus(`解灰完成 · ${unblockBrief(this.currentQuality)}`, 'ok')
        this.clearSourceStatusSoon(6000)
        return { data: { data: [{ url: matchUrl }] }, source: 'match' }
      }).catch(err => {
        console.error('[PlayError]', { songId: id, stage: 'MATCH_FAIL', reason: err && err.message || String(err) })
        this.setSourceStatus('解灰失败 · 暂无音源', 'fail')
        this.clearSourceStatusSoon(5000)
        throw err
      })
    },
    /**
     * 给「下载」按钮用：这首歌手上真正有的完整文件地址。
     *
     * 两个场景都需要它：
     *  1) 解灰曲目 —— VIP / 版权受限曲目走 `/song/download/url/v1` 一定拿不到链接
     *     （-105/-110），但既然能播，靠的就是 match 解灰源，用户耳朵里放的就是完整曲目。
     *  2) 未登录 —— 版权下载接口同样必然失败，直接存当前正在播的那个文件即可。
     * 只返回"属于当前这首"的地址（audioSrcSongId 校验），走 /api/audio-proxy 的地址不返回
     * （没有代理头解不开）。
     */
    playableDownloadSource() {
      const id = this.currentSong && this.currentSong.id
      if (!id) return null
      const isUnblock = !!(this.currentQuality && this.currentQuality.isUnblock)
      let url = ''
      if (isUnblock) {
        const hit = this.urlCache.get(id + '_match')
        if (hit && hit.url) url = hit.url
      }
      if (!url && String(this.audioSrcSongId || '') === String(id)) {
        const last = this.audioLastSrc || ''
        if (last && last.indexOf('/api/audio-proxy') === -1) url = last
      }
      if (!url) return null
      return {
        id,
        url,
        type: this._guessAudioType(url),
        level: isUnblock ? 'match' : ((this.currentQuality && this.currentQuality.actual) || ''),
        unblock: isUnblock
      }
    },
    /** 从 URL 后缀猜容器格式，猜不到按 mp3（只影响存盘文件名） */
    _guessAudioType(url) {
      const m = String(url || '').split('?')[0].match(/\.(flac|mp3|m4a|aac|ogg|wav)$/i)
      return m ? m[1].toLowerCase() : 'mp3'
    },
    initAudioByOuterUrl(id, requestId) {
      if (requestId !== this.playRequestId) return
      this.sel.src = location.origin + "/api/song/media/outer/url?id=" + id
      this.audioLastSrc = this.sel.src
      this.audioSrcSongId = String(id)
      this.audioRetryCount = 0
      this.suppressAudioError = false
      this.chorusSeekSongId = null
      this.sel.load()
    },
    playSong() {
      const isCurrentEmpty = JSON.stringify(this.currentSong) === '{}'
      /**
       * 队列空 + 没有当前曲：audio 里可能还留着上一首的 src，
       * 直接 play() 会把上一首放出来（UI 却写着"未选择歌曲"）。这里直接拦下。
       */
      if (isCurrentEmpty && !this.currentPlaylist.length) {
        this.isPlay = false
        this.showHint('播放列表为空', 'sequence', 2500)
        return
      }
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
      const prev = this.getPrevIndex()
      /**
       * 心动 / 私人FM 的队列是"现生成的推荐流"，不是用户排好的歌单：
       * 第一首之前没有上一首，getPrevIndex 会返回 -1。原地不动 + 一条提示，
       * 不再像以前那样走列表循环回绕到队尾（那等于凭空跳到一首没听过的推荐）。
       * 普通队列的 -1 不会出现（那边是首尾相接的回绕）。
       */
      if (prev < 0) {
        if (this.heartMode || this.isPersonalFM) {
          const stream = this.heartMode ? 'heart' : 'fm'
          console.log('[PrevGuard]', { action: 'skip_stream_head', stream, curIndex: this.curIndex, count: this.currentPlaylist.length })
          this.showHint(stream === 'heart' ? '已经是心动推荐的第一首' : '已经是本批 FM 的第一首', stream === 'heart' ? 'likeFill' : 'radio', 2500)
        }
        return
      }
      this.curIndex = prev
    },
    nextSong() {
      this.onInteract()
      // 手动下一首也要消耗"再播 N 首"的额度，否则计数会卡住不动
      if (this._consumeSleep(true)) return
      if (this.heartMode) { this._heartAdvance(); return }
      if (this.isPersonalFM) {
        // FM 模式：顺序切，跳过被屏蔽的；到末尾（或剩下的全被屏蔽）才触发取流（见 _fmAdvance）
        const next = this._findPlayable(this.curIndex, 1, false)
        if (next >= 0) this.curIndex = next
        else this._fmAdvance()
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
    // ---------------- 屏蔽（音乐黑名单） ----------------
    /**
     * 队列里第 i 项是否被屏蔽。
     * 判定口径与官方客户端一致：歌 id 命中 songIds，或任一歌手 id 命中 artistIds
     * （见 store/modules/Block.js 的 isTrackBlocked）。
     */
    _isBlockedAt(i) {
      const t = this.currentPlaylist[i]
      if (!t) return false
      return !!this.$store.getters['BlockAbout/isTrackBlocked'](t)
    },
    /** 一首歌是否被屏蔽（模板里给队列项打灰标用） */
    isBlocked(t) {
      if (!t) return false
      return !!this.$store.getters['BlockAbout/isTrackBlocked'](t)
    },
    /**
     * 从 start 出发按 step 找下一个没被屏蔽的索引。
     * 找满一圈都没有就返回 -1 —— "全部被屏蔽"和"队尾"要由调用方区分，
     * 这里只回答"有没有下一首能播的"。
     * @param {number} start 起始索引（不含）
     * @param {number} step +1 / -1
     * @param {boolean} wrap 越界是否回绕
     */
    _findPlayable(start, step = 1, wrap = true) {
      const len = this.currentPlaylist.length
      if (!len) return -1
      let idx = start
      for (let n = 0; n < len; n++) {
        idx += step
        if (idx < 0) {
          if (!wrap) return -1
          idx = len - 1
        } else if (idx >= len) {
          if (!wrap) return -1
          idx = 0
        }
        if (!this._isBlockedAt(idx)) return idx
      }
      return -1
    },
    /** 队列里还有没有能播的（给"全被屏蔽"的提示文案用） */
    _hasPlayable() {
      return this.currentPlaylist.some(t => t && !this.$store.getters['BlockAbout/isTrackBlocked'](t))
    },
    /** 当前这首是否已被屏蔽 */
    _currentBlocked() {
      const cur = this.currentSong
      return !!(cur && cur.id != null && this.$store.getters['BlockAbout/isTrackBlocked'](cur))
    },
    /**
     * 名单变化后的收尾：当前这首刚被屏蔽就立刻跳走，不要停在上面。
     * 别的歌被屏蔽不用管 —— 切歌时会自动跳过。
     */
    _onBlocklistChanged() {
      if (!this._currentBlocked()) return
      const next = this.getNextIndex()
      if (next >= 0 && next !== this.curIndex) {
        this.showHint('这首已被屏蔽，已跳到下一首', 'block', 3000)
        this.curIndex = next
      } else {
        this.pauseSong()
        this.showHint('当前歌曲已被屏蔽', 'block', 3000)
      }
    },
    /** 迷你条「更多」菜单：屏蔽歌曲 / 歌手 */
    onBlockCommand(cmd) {
      if (cmd === 'blockSong') this.confirmBlockSong()
      else if (cmd === 'blockArtist') this.confirmBlockArtist()
    },
    confirmBlockSong() {
      const s = this.currentSong || {}
      if (!s.id) return
      this.$confirmBox({
        title: '屏蔽这首歌',
        message: `《${s.name || '未知'}》将从所有列表隐藏，播放时自动跳过，官方客户端同样生效。可在「音乐黑名单」中恢复。`,
        confirmText: '屏蔽',
        cancelText: '取消'
      }).then(() => {
        this.$store.dispatch('BlockAbout/blockSong', s)
            .then(() => this.$toast.success('已屏蔽，可在「音乐黑名单」中恢复'))
            .catch(() => this.$toast.error('屏蔽失败，请稍后重试'))
      }).catch(() => { /* 取消 */ })
    },
    confirmBlockArtist() {
      const ar = this.primaryArtist
      if (!ar) return
      this.$confirmBox({
        title: '屏蔽这位歌手',
        message: `「${ar.name}」的所有歌曲（含合唱）都将隐藏，播放时自动跳过。可在「音乐黑名单」中恢复。`,
        confirmText: '屏蔽',
        cancelText: '取消'
      }).then(() => {
        this.$store.dispatch('BlockAbout/blockArtist', ar)
            .then(() => this.$toast.success('已屏蔽该歌手'))
            .catch(() => this.$toast.error('屏蔽失败，请稍后重试'))
      }).catch(() => { /* 取消 */ })
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
      // 切歌前补一次打卡：走到这里说明本首已播完（或副歌区间结束），
      // timeupdate 未必来得及在最后一帧触发，不补就可能整首漏报
      this._reportPlay()
      if (this.sel && !this.sel.paused) this.sel.pause()
      setTimeout(() => {
        this.autoNextLocked = false
      }, 1000)
      // 定时停止：本曲已消耗掉，到点就停，不再往下切
      if (this._consumeSleep()) return
      // 单曲循环在心动 / 私人FM 下照常生效（这是推荐流里唯一保留的队列策略）：
      // 开了就是"把当前这首循环听"，不再往推荐流里推进
      if (this.playMode === 'loop' && !(opts && opts.skipLoop)) { this._restartCurrent(); return }
      if (this.heartMode) { this._heartAdvance(); return }
      if (this.isPersonalFM) {
        // FM 模式：顺序切，跳过被屏蔽的；到末尾才触发取流
        // 末尾：有 UI 时由 PersonalFM 应用预取批次，没有 UI 时本组件自己拉
        const next = this._findPlayable(this.curIndex, 1, false)
        if (next >= 0) this.curIndex = next
        else this._fmAdvance()
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
      // 全部被屏蔽时不能说"队列已播完"——用户会以为队列真的空了
      const playable = this._hasPlayable()
      this.showHint(playable ? '队列已播完（顺序播放）' : '队列里的歌都被屏蔽了', 'sequence')
      console.log('[PlayMode]', { action: 'queue_end', mode: this.playMode, playable })
    },
    /**
     * 播放器内联状态条。
     * 用于播报「持续状态 / 操作引导」——这类信息以前走 toast，一闪就没了。
     * @param {string} text
     * @param {string} icon BaseIcon 名称
     * @param {number} duration 毫秒；传 0 表示常驻，直到被下一条覆盖或主动清除
     */
    showHint(text, icon = '', duration = 4000) {
      this.hintText = text
      this.hintIcon = icon
      if (this.hintTimer) { clearTimeout(this.hintTimer); this.hintTimer = null }
      if (duration > 0) {
        this.hintTimer = setTimeout(() => {
          this.hintText = ''
          this.hintIcon = ''
          this.hintTimer = null
        }, duration)
      }
    },
    clearHint() {
      if (this.hintTimer) { clearTimeout(this.hintTimer); this.hintTimer = null }
      this.hintText = ''
      this.hintIcon = ''
    },
    // ---------------- 音源状态行（歌曲信息下方） ----------------
    /**
     * 播报当前取源进度。
     * @param {string} text
     * @param {string} tone pending / unblock / ok / fail
     */
    setSourceStatus(text, tone = 'pending') {
      this._clearSourceStatusTimers()
      this.sourceStatus = { text, tone }
    },
    /**
     * 延迟清除（成功/失败这类结论要留几秒给人看清）；
     * 不传 ms 就是立即清除。
     */
    clearSourceStatusSoon(ms = 0) {
      this._clearSourceStatusTimers()
      if (!ms) { this.sourceStatus = { text: '', tone: '' }; return }
      this.sourceStatusTimer = setTimeout(() => {
        this.sourceStatus = { text: '', tone: '' }
        this.sourceStatusTimer = null
      }, ms)
    },
    _clearSourceStatusTimers() {
      if (this.sourceStatusTimer) { clearTimeout(this.sourceStatusTimer); this.sourceStatusTimer = null }
      if (this.sourceStatusDelayTimer) { clearTimeout(this.sourceStatusDelayTimer); this.sourceStatusDelayTimer = null }
    },
    /**
     * 慢请求才播报：正常音源 200-500ms 就回来了，这时候闪一条「正在获取音源」
     * 反而像出故障。超过阈值还没结果，才把状态行亮出来。
     */
    armSourceStatus(requestId, delay = 500) {
      this._clearSourceStatusTimers()
      this.sourceStatus = { text: '', tone: '' }
      this.sourceStatusDelayTimer = setTimeout(() => {
        this.sourceStatusDelayTimer = null
        if (requestId !== this.playRequestId) return
        // 已经拿到音源或已经放弃的，不要补一条过期播报
        if (!this.isLoading) return
        this.sourceStatus = { text: '正在获取音源…', tone: 'pending' }
        // 兜底：极端情况下（settle 没跑到）也不该让这句话常驻，8 秒后自动收
        this.clearSourceStatusSoon(8000)
      }, delay)
    },
    /**
     * 延迟播报：换档这种"可能几十毫秒就过去了"的中间态，先排一条，
     * 期间拿到音源就撤掉 —— 避免状态行闪一下又消失，看着像故障。
     * 已经有状态行在显示时立即改口，不重复延迟。
     */
    setSourceStatusLater(text, tone = 'pending', delay = 400) {
      if (this.sourceStatus.text) { this.setSourceStatus(text, tone); return }
      if (this.sourceStatusDelayTimer) { clearTimeout(this.sourceStatusDelayTimer); this.sourceStatusDelayTimer = null }
      this.sourceStatusDelayTimer = setTimeout(() => {
        this.sourceStatusDelayTimer = null
        if (!this.isLoading) return
        this.sourceStatus = { text, tone }
      }, delay)
    },
    /**
     * 音源已就位：把"进行中"的播报收掉。
     *
     * ⚠️ 必须连 sourceStatusDelayTimer 一起取消：音源 300ms 就回来时，文本还没显示
     * （tone 为空），旧写法只看 tone 就直接返回，500ms 的延时播报照样触发；
     * 那会儿 isLoading 往往还没被 canplay 置 false，于是"正在获取音源…"挂上去，
     * 之后再没人负责清它 —— 表现就是歌都在放了，状态条还杵着不动。
     * ok / fail 是结论，归它们自己的定时器管，别在这里提前抹掉。
     */
    settleSourceStatus() {
      if (this.sourceStatusDelayTimer) {
        clearTimeout(this.sourceStatusDelayTimer)
        this.sourceStatusDelayTimer = null
      }
      const tone = this.sourceStatus.tone
      if (tone === 'pending' || tone === 'unblock') this.clearSourceStatusSoon()
    },
    // ---------------- 心动模式（B 层：内容来源） ----------------
    toggleHeartMode() {
      if (this.heartBusy) return
      this.heartMode ? this._heartOff() : this._heartOn()
    },
    _heartOff() {
      this.heartMode = false
      this.heartExtendPromise = null
      this.showHint('已关闭心动模式，队列保持当前内容', 'likeFill')
    },
    /**
     * 开启：以当前在播的这首为种子，从红心歌单拉一批，**整队替换**并从第一首开始播。
     *
     * 为什么是"清空重来"而不是"接在当前歌后面"：心动模式是一次明确的换台动作——
     * 用户点它是想"换个口味听一路"，不是想给当前队列续命。保留旧队列会让
     * 「列表循环」把用户绕回原来的歌，语义就糊了。
     *
     * 两个坑：
     *  1. `isPersonalFM = false` 要在异步取流之前就做——FM 的退出清队（见 _fmModeHandler）
     *     是 nextTick 跑的，取流回来时早跑完了，不会把新队列覆盖掉。
     *  2. `curIndex = 0` 很可能是**空操作**（Vue 对同值赋值不触发 watcher），
     *     这正是之前 FM 换不了歌的老毛病。所以必须显式判断：目标下标与当前下标
     *     相同时直接改 currentSong，不走 curIndex。
     */
    _heartOn() {
      const seed = (this.currentSong && this.currentSong.id) || (this.currentPlaylist[0] && this.currentPlaylist[0].id)
      if (!seed) { this.$toast.warning('先播放一首歌，心动模式需要一首歌作为起点'); return }
      if (!this.isLogin) { this.$toast.warning('心动模式基于你的红心歌单，请先登录'); return }
      if (this.isPersonalFM) this.isPersonalFM = false
      const token = ++this.heartRequestToken
      this.heartBusy = true
      fetchHeartBatch(seed, 20).then(list => {
        // 取流期间用户换了台（playAllSong → _exitStreamModes）：这批属于旧队，丢掉
        if (token !== this.heartRequestToken) return
        this.heartBusy = false
        if (!list.length) { this.$toast.info('这次没拿到心动推荐，稍后再试'); return }
        this.heartMode = true
        /**
         * 心动模式默认按顺序播放：它本来就是"顺着推荐流往下走"，队尾续批而不是绕回第一首。
         * 列表循环 / 随机在这条流里没有意义，所以只把这两档对齐成 sequence；
         * 用户本来开着单曲循环的话保留（那是明确的"这首多听几遍"意图）。
         */
        if (this.playMode === 'order' || this.playMode === 'random') this.setPlayMode('sequence', true)
        this.playContextId++
        this.playlistContextId = this.playContextId
        this.currentSongSource = 'playlist'
        this.currentPlaySourceLocked = true
        this.$store.commit('TracksAbout/REPLACE_PLAYLIST', list)
        const target = list[0]
        if (this.curIndex === 0) {
          // 同下标：必须直接换 currentSong，否则 watcher 不触发、声音还停在上首歌
          if (target.id === this.currentSong.id) {
            this.chorusSeekSongId = null
            this._restartCurrent()
            if (this.effectiveForm !== 'full') this._applyRangeSeek(true)
          } else {
            this.currentSong = target
          }
        } else {
          this.curIndex = 0
        }
        this.$nextTick(() => {
          this.currentPlaylist.forEach(el => { el.curSong = el.id === target.id })
        })
        this.showHint(`心动模式：已换上 ${list.length} 首，从第 1 首开始播`, 'likeFill', 5000)
        console.log('[Heart]', { action: 'on', seed, got: list.length, first: target.id })
      }).catch(err => {
        if (token !== this.heartRequestToken) return
        this.heartBusy = false
        const map = {
          NO_UID: '心动模式需要登录',
          NO_HEART_PLAYLIST: '没找到你的红心歌单',
          // 400 绝大多数是"红心歌单里还没有收藏"，得说明白，否则用户只会觉得功能坏了
          BAD_PLAYLIST: '心动模式需要先有几首收藏歌曲（它基于红心歌单推荐）'
        }
        this.$toast.warning((err && map[err.reason]) || '心动模式拉取失败，请稍后重试')
        console.warn('[Heart] failed', err && err.reason, err && err.message)
      })
    },
    /**
     * 续批：把新一批追加到队尾（不去重到当前歌之前，避免队列重排打断播放）。
     * 并发调用复用同一个 promise —— 否则 prefetch 和 _autoNext 兜底会各拉一批，
     * 队列里出现两组内容相近的推荐。
     */
    _heartExtend() {
      if (!this.heartMode) return Promise.resolve(false)
      if (this.heartExtendPromise) return this.heartExtendPromise
      const seed = this.currentSong && this.currentSong.id
      if (!seed) return Promise.resolve(false)
      this.heartExtendPromise = fetchHeartBatch(seed, 20).then(list => {
        this.heartExtendPromise = null
        // 在途期间已经换台/关了心动：这批属于旧队列，绝不能 concat 到新歌单尾巴上
        if (!this.heartMode) return false
        if (!list.length) return false
        const seen = new Set(this.currentPlaylist.map(t => String(t.id)))
        const fresh = list.filter(t => !seen.has(String(t.id)))
        if (!fresh.length) return false
        this.$store.commit('TracksAbout/REPLACE_PLAYLIST', this.currentPlaylist.concat(fresh))
        console.log('[Heart]', { action: 'extend', seed, added: fresh.length })
        return true
      }).catch(err => {
        this.heartExtendPromise = null
        console.warn('[Heart] extend failed', err && err.reason, err && err.message)
        // uid 都拿不到就别硬撑着了：留着开关只会让首页卡片亮着"播放中"却永远不续歌
        if (err && err.reason === 'NO_UID' && this.heartMode) {
          this.heartMode = false
          this.showHint('登录态异常，已退出心动模式', 'warning')
        }
        return false
      })
      return this.heartExtendPromise
    },
    /** 心动模式下推进到下一首：队尾时先续批再走（正常情况 prefetch 已经补好了） */
    _heartAdvance() {
      if (this.curIndex < this.currentPlaylist.length - 1) {
        this.currentSongSource = 'playlist'
        this.playlistContextId = this.playContextId
        this.curIndex = this.curIndex + 1
        return
      }
      this._heartExtend().then(ok => {
        if (!this.heartMode) return
        if (this.curIndex < this.currentPlaylist.length - 1) {
          this.currentSongSource = 'playlist'
          this.playlistContextId = this.playContextId
          this.curIndex = this.curIndex + 1
          return
        }
        // 续批失败 / 拿到的都被去重光了：不要留一个"静音卡在最后一首"的黑箱
        if (!ok) this.showHint('心动推荐暂时取不到，已停在最后一首', 'warning')
      })
    },
    getNextIndex() {
      // FM 模式：保持推荐算法给出的顺序，不走 shuffle（shuffle 会破坏 NetEase /personal_fm 的推荐排序）
      if (this.isPersonalFM) {
        return this.curIndex + 1 > this.currentPlaylist.length - 1 ? 0 : this.curIndex + 1
      }
      if (this.playMode === 'random') return this._nextShuffleIndex()
      // 顺序播放：走到底返回 -1，由调用方负责停播（区别于列表循环的回绕）
      if (this.playMode === 'sequence' && this.curIndex >= this.currentPlaylist.length - 1) return -1
      // 跳过被屏蔽的；一整圈都不可播返回 -1，由调用方停播并给出提示
      return this._findPlayable(this.curIndex, 1, this.playMode !== 'sequence')
    },
    getPrevIndex() {
      /**
       * 心动 / 私人FM：队列是推荐流，队列策略（随机 / 循环）不参与，一律线性后退；
       * 队首返回 -1 表示"没有上一首"，由 preSong 决定原地不动并给出提示。
       * 被屏蔽的曲目同样跳过。
       */
      if (this.heartMode || this.isPersonalFM) {
        return this._findPlayable(this.curIndex, -1, false)
      }
      if (this.playMode === 'random') return this._prevShuffleIndex()
      return this._findPlayable(this.curIndex, -1, true)
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
      const len = this.shuffleOrder.length
      // 沿洗牌序列往前找，跳过被屏蔽的；一轮都不行返回 -1（全被屏蔽）
      for (let n = 0; n < len; n++) {
        this.shufflePos = (this.shufflePos + 1) % len
        const idx = this.shuffleOrder[this.shufflePos]
        if (!this._isBlockedAt(idx)) return idx
      }
      return -1
    },
    _prevShuffleIndex() {
      if (this.shuffleOrder.length !== this.currentPlaylist.length || this.shufflePos === -1) this._initShuffle()
      const len = this.shuffleOrder.length
      for (let n = 0; n < len; n++) {
        this.shufflePos = (this.shufflePos - 1 + len) % len
        const idx = this.shuffleOrder[this.shufflePos]
        if (!this._isBlockedAt(idx)) return idx
      }
      return -1
    },
    _restartCurrent() {
      this.onInteract()
      if (!this.sel) return
      // 重播前先把这一轮报掉（单曲循环 / FM 同批重播都会走到这里），
      // 然后 seq 自增：同一首歌的下一轮才能重新计一次打卡
      this._reportPlay()
      this.scrobbleSeq++
      this.scrobbleStart = 0
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
      /**
       * 心动 / 私人FM 接管队列来源时，列表循环 / 顺序 / 随机都不生效，
       * 但单曲循环仍然有意义（就是想把当前这首循环听）。所以这里不做"点了没反应"，
       * 而是变成"开 / 关单曲循环"：关掉时还回上一条策略（它不生效，但退出推荐流后接着用）。
       */
      if (this.policyLocked) {
        if (this.playMode === 'loop') {
          this.setPlayMode(this._policyBeforeLoop || 'sequence', true)
          return
        }
        this.setPlayMode('loop')
        return
      }
      const order = ['order', 'sequence', 'loop', 'random']
      const idx = order.indexOf(this.playMode)
      this.setPlayMode(order[(idx + 1) % order.length])
    },
    /**
     * 直达选择（菜单用）：不再依赖三态滚动
     * @param {string} mode order / sequence / loop / random
     * @param {boolean} forceRestore 内部用：跳过"推荐流锁"，把模式还原成上一条策略
     */
    setPlayMode(mode, forceRestore) {
      if (['order', 'sequence', 'random', 'loop'].indexOf(mode) === -1) return
      /**
       * 兜底：菜单项已经置灰，这里再挡一次（键盘 / 脚本调用也不该改到不生效的策略）。
       * 心动 / 私人FM 下允许"顺序播放"和"单曲循环"——前者就是这两种模式真实的推进方式，
       * 后者是用户想把当前这首循环听；列表循环 / 随机才是不生效的两档。
       */
      if (!forceRestore && this._policyBlocked(mode)) {
        // 静默挡掉（不弹提示文字）：置灰本身已经说明了，再弹一条只是噪音
        console.log('[PlayMode]', { action: 'skip_locked', mode, heart: this.heartMode, fm: this.isPersonalFM })
        return
      }
      // 在推荐流里开单曲循环：记住上一条策略，关掉循环时能还回去
      if (!forceRestore && this.policyLocked && mode === 'loop' && this.playMode !== 'loop') {
        this._policyBeforeLoop = this.playMode
      }
      // 不关总览面板：面板是"四层一起调"的地方，选完队列策略还要能接着改别的层
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
     * 心动 / 私人FM 下哪些队列策略不可选。
     *
     * 这两种模式的推进方式是"顺着推荐流往下走"，等价于顺序播放 —— 所以 sequence
     * 不只是可用，还是它们的默认档（见 _heartOn）。单曲循环只决定"这一首放完要不要
     * 重播"，也不影响来源，照样可用。真正不生效的是：
     *  - 列表循环：推荐流没有"首尾相接"这回事，队尾是续批；
     *  - 随机：shuffle 会打乱推荐顺序，和"顺着流走"冲突。
     */
    _policyBlocked(mode) {
      if (!this.policyLocked) return false
      return mode !== 'sequence' && mode !== 'loop'
    },
    /**
     * 拉取当前歌曲实际可用的音质档位。
     * /song/detail 的 hr/sq/h/m/l 就是"这首歌有没有这一档"的权威答案（null = 没有），
     * 拿它把音质菜单收窄；同时顺手让取源链路跳过这首歌根本没有的档位，省掉无效请求。
     * 结果按 id 缓存，来回切歌不重复打接口。
     */
    _loadSongLevels(id) {
      if (!id) { this.songLevels = []; return }
      if (!this._levelCache) this._levelCache = new Map()
      if (this._levelCache.has(id)) { this.songLevels = this._levelCache.get(id); return }
      // 没缓存的歌先清空：宁可短暂显示全部档位，也不能拿上一首的档位去判断
      this.songLevels = []
      const reqId = String(id)
      tracks.detail(id).then(r => {
        // 竞态：响应回来时可能已经换歌了，别把上一首的档位写到当前歌上
        if (String(this.currentSong.id) !== reqId) return
        const s = (r.data && r.data.songs && r.data.songs[0]) || {}
        const picked = []
        if (s.hr) picked.push('hires')
        if (s.sq) picked.push('lossless')
        if (s.h) picked.push('exhigh')
        if (s.m) picked.push('higher')
        if (s.l) picked.push('standard')
        this._levelCache.set(reqId, picked)
        this.songLevels = picked
        console.log('[SongLevels]', { songId: reqId, levels: picked })
      }).catch(err => {
        // 拿不到就维持"不限制"，菜单回落到完整列表，取源链路也不做跳过
        if (String(this.currentSong.id) === reqId) this.songLevels = []
        console.warn('[SongLevels]', { songId: reqId, error: err && err.message || String(err) })
      })
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
      // 只有进入 A-B 才必须收起面板：下一步是"点击进度条选点"，
      // 面板还浮在上面就挡着进度条了。其余形态留在原地，方便接着调别的层。
      if (form === 'ab') this.showModeMenu = false
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
          this.showHint('这首歌没有副歌数据，本次按完整播放', 'chorus')
        }
        if (!this.chorusHinted) {
          this.chorusHinted = true
          this.showHint('已开启副歌模式：每首只播副歌段，到点自动切下一首', 'chorus', 5000)
        }
      }
      if (next === 'ab') {
        if (this.abRangeValid) {
          this.abSetting = false
          this._applyRangeSeek(true)
        } else {
          this._abEnsureSong()
          this.abSetting = true
          // 选点引导常驻（duration 0），否则用户还没点进度条提示就没了
          this.showHint('点击进度条设定起点 A', 'abLoop', 0)
        }
      }
      // 离开 A-B 形态时收掉常驻引导（进副歌模式时上面刚设过提示，不能清）
      if (next !== 'ab' && next !== 'chorus') this.clearHint()
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
        // 常驻：等用户点第二个点
        this.showHint(`起点 A：${this.formatTime(time)}，再点一次设定终点 B`, 'abLoop', 0)
        return
      }
      const start = this.abStart
      if (time - start < 1) {
        this.showHint('终点 B 至少要晚于起点 A 1 秒', 'abLoop', 3000)
        return
      }
      this.abRange = { start, end: time }
      this.abRangeSongId = String(this.currentSong.id || '')
      this.abStart = null
      this.abSetting = false
      this.trackForm = 'ab'
      this.showHint(`A-B 已设定：${this.formatTime(start)} - ${this.formatTime(time)}`, 'abLoop', 4000)
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
      this.showHint('已清除 A-B 区间', 'abLoop')
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
    /** 总览面板的 −/+ 步进（面板里只发 {kind, dir}，夹边界的活仍在 stepSleep 里） */
    onSleepStep({ kind, dir }) {
      this.stepSleep(kind, dir)
    },
    /** 总览面板的数字框：值已在面板里夹过边界，这里只管生效 */
    onSleepInput({ kind, value }) {
      this._applySleep(kind, value)
    },
    /**
     * 总览面板的「复位」：清掉临时叠上去的三层，保留队列策略。
     *
     * 队列策略（列表循环/随机…）是长期偏好，跟"这次听歌想怎么听"不是一回事，
     * 顺手一起抹掉会很烦——所以只关心动、回到完整播放、取消定时。
     */
    resetModeStack() {
      if (this.heartMode) this._heartOff()
      if (this.trackForm !== 'full') this.setTrackForm('full')
      if (this.sleepMode !== 'off') this._clearSleep()
      this.showHint('已复位：完整播放 · 不定时 · 已关心动（队列策略保留）', 'sequence')
      console.log('[ModeStack]', { action: 'reset', policy: this.playMode })
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
        this.showHint(`定时停止：${label}${this.sleepFade ? `（最后 ${this.fadeSec} 秒渐弱）` : ''}`, 'timer', 5000)
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
      this.showHint('已取消定时停止', 'timer')
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
      this.showHint(msg, 'timer', 5000)
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
        this.$toast.warning('收藏需要先登录，登录后重试')
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
            this.$toast.success(newLiked ? '已添加到我的喜欢' : '已取消喜欢')
          } else {
            // 业务失败 → 回滚
            this.isLiked = wasLiked
            this.$toast.error('收藏失败，请稍后重试')
          }
        })
        .catch(err => {
          console.error('[SongLike] failed', err)
          this.isLiked = wasLiked
          this.$toast.error('网络异常，收藏失败，请检查网络后重试')
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
    /** 封面角标 / 队列里的 MV：统一交给 App 的全局 mvClk 通道 */
    openMv() {
      if (!this.currentMvId || isMvDead(this.currentMvId)) return
      this.$bus.$emit('mvClk', this.currentMvId)
    },
    mvOf(track) {
      const id = mvIdOf(track)
      return id && !isMvDead(id) ? id : 0
    },
    openTrackMv(track) {
      const id = this.mvOf(track)
      if (id) this.$bus.$emit('mvClk', id)
    },
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
    /**
     * 切换音质。
     * 会员专属档位（无损/臻音）不再拦截 —— 非会员选了就走解灰源拿这一档的真文件，
     * 取源链路自己会在"上游压级 → 解灰 → 退回压级文件"之间兜底，不需要在入口劝退。
     */
    onQualitySelect(key) {
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
      // 总览面板挂在 .stackWrap 里（含面板本身）；.modeWrap 是模式按钮，
      // 它也列进来是因为右键/长按按钮同样会打开这个面板，点按钮本身不算"点外面"
      if (this.showModeMenu && this._isOutside(['stackWrap', 'modeWrap'], t)) {
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
        this._schedulePanelAlign()
      } else {
        this.scheduleHide()
      }
    },
    /**
     * 排一次底边校正：第一枪 120ms（早，用户看不到跳），300ms 后再补一枪。
     * 补枪是必要的——popper 把内联 top 写进来的时机晚于第一枪时，第一次会直接放弃；
     * 校正本身幂等，已经贴边时第二次是空操作。
     */
    _schedulePanelAlign() {
      clearTimeout(this.alignPanelTimer)
      this.alignPanelTimer = setTimeout(() => {
        this._alignQueuePanel()
        this.alignPanelTimer = setTimeout(() => this._alignQueuePanel(), 300)
      }, 120)
    },
    /**
     * 让队列面板底边正好压在 fullBar 上沿。
     *
     * 为什么不能只靠 CSS：面板是 Element popper 定位的，列表出现滚动（面板变高）时
     * 它会把 top 多算 5px，短面板贴边、长面板留 5px 缝，margin-bottom 调不准。
     *
     * 坐标系必须对齐：菜单挂在 body 上、播放条是 `position: fixed`。
     * popper 检测到参考元素在 fixed 容器里时，会把菜单也设成 fixed（offsetTop 即视口坐标）；
     * 万一是 absolute，offsetTop 就是文档坐标，需要减 scrollY。混用会把面板推出视口
     *（滚 800px 后打开面板会直接飞出屏，表现为"展开瞬间消失"）。
     *
     * 用 offsetTop/offsetHeight 而不是 rect：rect 会被展开动画的 scaleY 影响
     *（popper 把 transform-origin 设成 center bottom），offsetTop 不受影响。
     */
    _alignQueuePanel() {
      const panel = document.querySelector('.playlistDropdown')
      const bar = document.querySelector('.fullBar')
      if (!panel || !bar) return
      const cur = parseFloat(panel.style.top)
      if (!isFinite(cur)) return
      const fixed = getComputedStyle(panel).position === 'fixed'
      const panelBottom = panel.offsetTop + panel.offsetHeight - (fixed ? 0 : window.scrollY)
      const delta = bar.getBoundingClientRect().top - panelBottom
      if (Math.abs(delta) < 1.5) return
      const next = cur + delta
      if (next < 0) return
      panel.style.top = next + 'px'
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
      // A-B 选点中不能自动收起：一收起用户就看不见自己在选什么了。
      // 四层总览同理——面板就挂在底条里，条一收面板跟着消失，正在逐层调整时被打断
      if (this.isDropdownOpen || this.abSetting || this.showModeMenu) return
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
      this.timeNow = t
      // 定位后立刻落盘：否则要等 timeupdate 的 5 秒节流或一次暂停，
      // 这期间刷新就退回旧位置（用户刚拖到副歌，一刷新又回开头）
      this._saveState()
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
      document.addEventListener('mouseup', () => {
        document.removeEventListener('mousemove', onMove)
        this.scheduleHide()
        // 拖动结束再落一次盘：拖动过程是逐帧改 currentTime，不适合每次都写
        this._saveState()
      }, { once: true })
      evt.preventDefault()
    },
    handleCommand(s) {
      // 队列里点已屏蔽的歌：不播，给一条能走下去的提示
      if (this.isBlocked(s)) {
        this.$toast.info('这首歌已被屏蔽，可在「音乐黑名单」中解除')
        return
      }
      this.onInteract(); this.showPlayerPending = true; this.isLoading = true; console.trace('[HandleCommandCall]'); console.log('[SongState]', { action: 'handleCommand', songId: s && s.id, requestId: this.playRequestId }); this.playIntentId++; this.playContextId++; this.currentSongSource = 'playlist'; this.currentPlaySourceLocked = true; this.playlistContextId = this.playContextId; console.log('[SourceChange]', { to: 'playlist', songId: s && s.id, trigger: 'handleCommand' }); console.trace('[CurrentSongSet] handleCommand', s && s.id); this.currentSong = s },
    /**
     * 把队列收成"只在播的这一首"。
     *
     * 触发场景：心动 / 私人 FM 播着，用户从别的歌单点了某一首。两种模式的队列是
     * 现生成的推荐流，不该和用户点的歌混在一起（不同播放模式下的歌单不混用）。
     *
     * 必须等 nextTick：song / currentSong watcher 先把新歌塞进队列、对齐 curIndex，
     * 这时候收才不会又被 append 回来。
     */
    _collapseQueueToCurrent() {
      this.$nextTick(() => {
        // 同一帧内又被重新打开（PersonalFM 卡片点播就是这么干的），别收
        if (this.isPersonalFM) return
        this.$store.commit('TracksAbout/REPLACE_PLAYLIST', [this.currentSong])
        /**
         * 队列只剩这一首，下标必须归零。不归零的话 curIndex 会停在
         * "推荐流批次下标 + 新歌追加位置"这种越界值上（比如 3 对长度 1），
         * 下一次按上一首会取到 currentPlaylist[2] === undefined，
         * 直接把 currentSong 写成 undefined。
         */
        this.curIndex = 0
        // 队列刚被整体改写：立刻落盘，否则 5 秒内刷新会把旧的推荐流队列恢复回来
        this._saveState()
      })
    },
    /**
     * 换台前退掉"会接管队列来源"的两种模式（心动 / 私人 FM）。
     *
     * 用户点了别的歌单/专辑的「播放全部」，语义就是"换个台"：队列整块换成那份歌单，
     * 来源也必须一起换。退不掉的话队列虽然换了，来源还在 —— 心动会在队尾把红心推荐
     * concat 到新歌单尾巴上，FM 会在队尾直接 REPLACE 掉整份歌单，等于用户点的那份
     * 歌单被"抢"走了（用户反馈：FM / 心动播着的时候点别的歌单，模式没切走）。
     *
     * 两处细节：
     *  - 心动还要作废在途的取批（heartRequestToken）：否则 0.5 秒后那批回来，
     *    会把红心推荐 REPLACE 到刚换上的歌单上；
     *  - FM 这里只关标志，不清队 —— "只留当前歌曲"的清队属于用户主动退出 FM 的场景，
     *    见 _fmModeHandler。且 PersonalFM 自己的卡片点播会紧接着把 FM 重新打开
     *    （同一个 tick 内值没变，watcher 根本不会跑），不会打断它。
     */
    _exitStreamModes() {
      const wasHeart = this.heartMode
      const wasFm = this.isPersonalFM
      if (wasHeart || this.heartBusy) {
        this.heartRequestToken++
        this.heartBusy = false
        this.heartExtendPromise = null
        this.heartMode = false
      }
      if (wasFm) this.isPersonalFM = false
      if (wasHeart || wasFm) {
        console.log('[StreamMode]', { action: 'exit_on_switch', heart: wasHeart, fm: wasFm })
      }
    },
    playAllSong(msgName, payload) {
      /**
       * payload 由 TracksAbout/playAllTracks 组装：`{ keepStream, mode }`。
       * keepStream=true 表示"这批歌就是私人 FM 自己的流"——换队后来源不能退，
       * 否则 FM 在第 1 首上就会丢失续批依据（表现为到了队尾不再取新歌）。
       */
      const keepStream = !!(payload && payload.keepStream)
      const mode = (payload && payload.mode) || 'order'
      // 换台先退模式：晚了的话 currentSong 已经换新歌，模式还开着就会继续按老来源续批
      if (!keepStream) this._exitStreamModes()
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
      if (!this.isPersonalFM) {
        // 队列已被换成新批次，但模式标志是关的 → 不会有声音，只留在控制台里
        console.warn('[FmGate]', { action: 'skip_apply', reason: 'fm_off', startIndex, songId: this.currentSong.id, count: this.currentPlaylist.length })
        return
      }
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
     * FM 队尾续播总入口（nextSong 与 _autoNext 共用）。
     *
     * 两套协作方式：
     *  - 首页 PersonalFM 在（isFmUiMounted）→ 沿用原设计 publish 事件，
     *    由它应用预取批次并同步那三张卡片；
     *  - 不在（刷新后停在别的页面 / 首页被 keep-alive 回收）→ 没有任何订阅者，
     *    publish 出去等于石沉大海，播放器会停在最后一首。这时本组件自己兜底：
     *    先用预取批次，没有就现拉一批。
     */
    _fmAdvance() {
      console.log('[FmGate]', { action: 'advance', ui: isFmUiMounted(), curIndex: this.curIndex, count: this.currentPlaylist.length, source: this.currentSongSource })
      if (isFmUiMounted()) { pubsub.publish('getPersonalFM', new Date().getTime()); return }
      const staged = this.$store.state.TracksAbout.fmStagedBatch
      if (staged && staged.length) { this._applyFmBatch(staged); return }
      this._fmFetchAndApply()
    },
    /** 无 UI 时的预取：拉一批放进 fmStagedBatch，等队尾直接应用，减少空档 */
    _fmPrefetchSelf() {
      if (this.fmPrefetching) return
      const staged = this.$store.state.TracksAbout.fmStagedBatch
      if (staged && staged.length) return
      this.fmPrefetching = true
      fetchFmBatch(3, 4, [], currentFmFetchOptions(this.$store.state.TracksAbout))
        .then(list => {
          if (Array.isArray(list) && list.length) {
            this.$store.commit('TracksAbout/SET_FM_STAGED_BATCH', list)
            console.log('[FM]', { action: 'self_prefetch', count: list.length })
          }
        })
        .catch(() => { /* 预取失败不打扰用户，队尾会再试一次 */ })
        .finally(() => { this.fmPrefetching = false })
    },
    /** 无 UI 时的队尾取流：拉一批直接换队播放 */
    _fmFetchAndApply() {
      if (this.fmFetchingSelf) return
      this.fmFetchingSelf = true
      const exclude = this.currentPlaylist.map(t => t.id)
      fetchFmBatch(3, 4, exclude, currentFmFetchOptions(this.$store.state.TracksAbout))
        .then(list => {
          if (!this.isPersonalFM) return
          if (!Array.isArray(list) || !list.length) {
            this.showHint('私人 FM 暂时取不到新歌，已停在最后一首', 'radio')
            return
          }
          this._applyFmBatch(list)
        })
        .catch(err => {
          console.warn('[FM] self_fetch_failed', err && err.message)
          this.showHint('私人 FM 续播失败，请稍后再试', 'warning')
        })
        .finally(() => { this.fmFetchingSelf = false })
    },
    /**
     * 应用一批 FM 歌曲：整队替换 + 从第 0 首开播。
     * 下标相同/同曲的情况交给 playFmNewBatch 处理（Vue 对同值赋值不触发 watcher，
     * 直接写 curIndex 会变成空操作，声音还停在旧歌上）。
     */
    _applyFmBatch(batch) {
      if (!Array.isArray(batch) || !batch.length) return
      this.$store.commit('TracksAbout/CLEAR_FM_STAGED_BATCH')
      this.$store.commit('TracksAbout/REPLACE_PLAYLIST', batch)
      this.playFmNewBatch(null, 0)
      console.log('[FM]', { action: 'self_apply', count: batch.length })
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
      this.$toast.success(`已设为下一首：${s.name || ''}`)
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
        // 队列空了，来源模式（心动 / 私人FM）也跟着退出，别留一个假的"播放中"
        this._exitStreamModes()
        // 最后一首被移除 = 播放器正式空闲：当前曲与进度都要一起清掉
        this.currentSong = {}
        this.updateMiniBackground()
        this._resetIdleState()
        this.showHint('播放列表已清空', 'sequence')
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
    /**
     * 当前歌曲加入歌单（入口在播放条控制行、下一首右边）。
     * 和队列无关：FM / 心动下同样可用，加歌单只关心这首歌本身。
     */
    addCurrentToPlaylist() {
      const s = this.currentSong
      if (!s || !s.id) {
        this.$toast.warning('还没有正在播放的歌曲')
        return
      }
      this.$bus.$emit('open-add-to-playlist', { songs: [s], source: 'player' })
    },
    /**
     * 当前播放列表整批加入歌单（队列面板头部入口）。
     * 这里刻意不做任何过滤：登录校验、查重、分片都在全局弹窗里，
     * 保证"从队列加"和"从列表加"走完全相同的链路。
     */
    addQueueToPlaylist() {
      this.onInteract()
      if (!this.currentPlaylist.length) return
      if (!isLoggedIn()) {
        this.$toast.warning('添加到歌单需要先登录')
        return
      }
      this.$bus.$emit('open-add-to-playlist', {
        songs: this.currentPlaylist.slice(),
        source: 'queue'
      })
      // 弹窗盖在面板上，把面板收起来，免得关掉弹窗后它还挂在半空
      const dd = this.$refs.queueDropdown
      if (dd && typeof dd.hide === 'function') dd.hide()
    },
    clearPlaylist() {
      this.$confirmBox({
        title: '清空播放列表',
        message: '当前队列里的所有歌曲都会被移除，正在播放的会停止。',
        confirmText: '清空',
        cancelText: '取消'
      }).then(() => {
        this.pauseSong()
        // 队列都没了，"心动 / 私人FM 播放中"不该还亮着：先把来源模式退掉再清队
        this._exitStreamModes()
        this.$bus.$emit("clearPlaylist")
        // 同步清除 localStorage 持久化数据
        // （_saveState 的守卫 if (!s || !s.id) return 会跳过 song 为空时的保存，
        //   但旧数据仍残留会导致刷新后 _restoreState 把列表"复活"）
        try { localStorage.removeItem('acmusic_player_state') } catch (e) { /* ignore */ }
        this.showHint('播放列表已清空', 'sequence')
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
    /**
     * 打卡归属 id：网易云的 weblog 需要知道这次播放来自哪个歌单/专辑。
     * 优先取当前路由的歌单/专辑详情 id（用户多半就是从那儿点的播放），
     * 其次退回歌曲自身的专辑 id，都没有才用 0（不阻塞打卡）。
     * 只在起播时算一次，之后路由变了也不影响这首的归属。
     */
    _resolveSourceId(song) {
      try {
        const r = this.$route
        if (r && (r.name === 'listDetail' || r.name === 'albumDetail')) {
          const id = Number(r.query && r.query.id)
          if (id) return id
        }
      } catch (e) { /* 无 router 时忽略 */ }
      const al = song && song.al
      return (al && al.id) ? Number(al.id) : 0
    },
    /**
     * 上报一次播放（/scrobble → 上游 POST /api/feedback/weblog）。
     *
     * 为什么必须自己报：服务端的听歌记录、听歌排行、年度报告全部由这条 weblog 累积，
     * 官方播放器是边播边打卡的。本项目此前只声明了 updateListenedRanks 却从未调用，
     * 于是「最近一周」永远是空数组（「所有时间」显示的只是官方客户端的历史累计）。
     *
     * 门槛 30 秒 / 过半（先到者）；每次播放只报一条（key = 歌 id # 轮次）；
     * 失败静默——打卡是旁路，不能影响播放链路。
     */
    _reportPlay(song) {
      const s = song || this.currentSong
      const el = this.sel
      if (!s || !s.id || !el) return
      // 语音/电台节目走另一套记录，不参与听歌排行
      if (s.isVoice) return
      const key = s.id + '#' + this.scrobbleSeq
      // 去重放在鉴权之前：timeupdate 每秒会调 4 次，报过之后要尽早返回
      if (this.scrobbleKey === key) return
      // 未登录没有 cookie，接口会直接 400（code -2），不必发
      if (!isLoggedIn()) return
      const played = Number(el.currentTime) || 0
      const duration = Number(el.duration) || Number(this.timeDuration) || 0
      // 真正的"已听"是相对起播点的增量：中断恢复可能一上来就在 40s，
      // 那 40 秒属于上一次会话，算进去会变成"刚开播就打卡"。
      // 进度回退（重播 / 换源回到 0）时重新锚定，避免锚点残留在旧进度上。
      if (this.scrobbleStart === null || played < this.scrobbleStart) this.scrobbleStart = played
      const listened = Math.max(0, played - this.scrobbleStart)
      const enough = listened >= SCROBBLE_MIN_SECONDS || (duration > 0 && listened / duration >= SCROBBLE_MIN_RATIO)
      if (!enough) return
      this.scrobbleKey = key
      try {
        const p = tracks.updateListenedRanks(s.id, this.scrobbleSourceId || 0, Math.round(listened))
        if (p && p.catch) p.catch(() => {})
      } catch (e) { /* 打卡失败不影响播放 */ }
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
        // 播够门槛就打卡：内部按「歌 id # 轮次」去重，重复调用只是一次廉价判断
        this._reportPlay()
      }
    },
    _durationTime() {
      if (this.sel) {
        this.audioRetryCount = 0
        this.isLoading = false
        this.showPlayerPending = false
        // 音频真的能放了，任何"正在获取/解灰"的播报都不该再挂着（第二道保险，见 settleSourceStatus）
        this.settleSourceStatus()
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
    /**
     * 曲目歌手文案。
     * ar / artists 在这套数据里可能是数组、空数组、也可能是字符串（本地恢复出来的
     * 条目就是字符串），直接 `.map` 会在"字符串 + 无 ar"的组合上抛 TypeError，
     * 而 _saveState 是被 timeupdate 每 5 秒调一次的，抛一次就等于持久化整体失效。
     */
    _artistText(track) {
      const pick = v => {
        if (!v) return ''
        if (typeof v === 'string') return v
        if (Array.isArray(v)) {
          return v.map(a => (a && a.name) || (typeof a === 'string' ? a : '')).filter(Boolean).join(' / ')
        }
        return ''
      }
      if (!track) return ''
      return pick(track.ar) || pick(track.artists) || ''
    },
    /**
     * 队列持久化：围绕当前曲取窗口，最多 800 首。
     *
     * 原来写死 `slice(0, 200)` 且 currentIndex 原样保存，队列一长就出两个毛病：
     *   1) 第 200 首之后的队列刷新后凭空消失（"下一首"放到第 200 首就断了）
     *   2) 当前曲在 200 名之外时，恢复出来的 currentIndex 指向队列以外的下标，
     *      当前曲不在队列里 → 列表高亮丢失、`currentPlaylist[ind]` 为 undefined
     * 现在改为以 curIndex 为中心取窗口，并把窗口偏移从 currentIndex 里扣掉。
     */
    /**
     * 只保留「id + 名字」的歌手数组，供持久化用。
     * 早期版本只存了歌手名文本（artists 字符串），刷新后 currentSong.ar 里没有 id，
     * 点歌手名就只能 emit 一个 undefined —— 于是详情页拿不到 id、跳转失效。
     * 这里把 id 一并带上；名字也留着，万一老数据没 id 还能按名字反查。
     */
    _artistLite(track) {
      const raw = track && (track.ar || track.artists)
      if (!raw) return []
      const list = Array.isArray(raw) ? raw : [raw]
      return list
        .map(a => (typeof a === 'string'
          ? { id: 0, name: a }
          : { id: Number(a && a.id) || 0, name: (a && a.name) || '' }))
        .filter(a => a.id || a.name)
    },
    /** 专辑同理：详情页的专辑行点击也依赖 id */
    _albumLite(track) {
      const al = (track && (track.al || track.album)) || {}
      return {
        id: Number(al.id) || 0,
        name: al.name || '',
        picUrl: al.picUrl || ''
      }
    },
    _saveState() {
      const s = this.currentSong
      /**
       * 队列可以独立于"当前歌曲"存在：用户先把歌加进播放列表、还没点播放时，
       * currentSong 还是 {}。原来这里直接 return，于是这批歌在刷新后整批消失
       * （currentPlaylist 只在内存 + player_state 里，这里是唯一的持久化入口）。
       */
      if ((!s || !s.id) && !this.currentPlaylist.length) return
      const MAX_TRACKS = 800
      const lite = t => ({
        id: t.id,
        name: t.name || '',
        artists: this._artistText(t),
        ar: this._artistLite(t),
        alId: this._albumLite(t).id,
        album: (t.al && t.al.name) || (t.album && t.album.name) || '',
        picUrl: (t.al && t.al.picUrl) || (t.album && t.album.picUrl) || '',
        duration: t.dt || t.duration || 0,
        // MV id 一起存：否则刷新后播放条角标和队列里的 MV 入口要等一次补拉才出现
        mv: Number(t.mv) || 0,
        source: t.source || ''
      })
      // filter(Boolean)：队列里理论上不该有空元素，但一个 null 就能让整次保存抛错
      let playlist = this.currentPlaylist.filter(Boolean).map(lite)
      let offset = 0
      if (playlist.length > MAX_TRACKS) {
        offset = Math.max(0, Math.min(this.curIndex - Math.floor(MAX_TRACKS / 2), playlist.length - MAX_TRACKS))
        playlist = playlist.slice(offset, offset + MAX_TRACKS)
      }
      const payload = {
        song: (s && s.id) ? {
          id: s.id,
          name: s.name || '',
          // 专辑名要一起存：否则刷新后大播放器的专辑行是空的（原来只存了封面）
          album: (s.al && s.al.name) || (s.album && s.album.name) || '',
          cover: (s.al && s.al.picUrl) || (s.album && s.album.picUrl) || '',
          artists: this._artistText(s),
          // 歌手/专辑的 id 必须单独存：详情页那两行文案点了要跳详情
          ar: this._artistLite(s),
          alId: this._albumLite(s).id,
          mv: Number(s.mv) || 0
        } : null,
        playlist,
        playlistOffset: offset,
        currentIndex: Math.max(0, this.curIndex - offset),
        currentTime: (this.timeNow * 1) || this.sel.currentTime || 0,
        duration: this.sel.duration || 0,
        quality: this.currentQuality,
        source: this.currentSongSource,
        playMode: this.playMode,
        // 心动模式是"队列来源"而不是单纯开关：不存的话刷新后队列虽在，但播到队尾
        // 不会再向红心歌单续批（见 _autoNext → _heartAdvance 分支）
        heartMode: !!this.heartMode,
        // 私人 FM 同理：不存的话刷新后 isPersonalFM 回到 false，
        // 队尾会掉进普通队列逻辑（列表循环绕回第一首 / 顺序播放直接停），
        // 既不再取 FM 新歌，也不再显示"私人FM"来源标
        fm: !!this.isPersonalFM,
        // 定时停止：time 档存绝对截止时间戳，刷新后能接着倒计时（见 _restoreSleep）
        sleepMode: this.sleepMode,
        sleepValue: this.sleepValue,
        songsLeft: this.songsLeft,
        sleepDeadline: this.sleepDeadline,
        timestamp: Date.now()
      }
      if (this._writePlayerState(payload)) {
        console.log('[PlaylistPersist]', { action: 'save', count: playlist.length, offset })
      }
    },
    /**
     * 写 player_state，QuotaExceededError 时把队列对半砍再试一次。
     * localStorage 被别的 key 占满时，宁可丢队列尾巴也不能整条保存失败——
     * 失败会把进度、模式、定时一起丢掉。
     */
    _writePlayerState(payload) {
      try {
        localStorage.setItem('acmusic_player_state', JSON.stringify(payload))
        return true
      } catch (e) {
        const list = payload.playlist
        if (!Array.isArray(list) || list.length <= 50) return false
        const half = list.slice(0, Math.max(50, Math.floor(list.length / 2)))
        try {
          localStorage.setItem('acmusic_player_state', JSON.stringify(Object.assign({}, payload, {
            playlist: half,
            playlistOffset: 0,
            currentIndex: Math.min(payload.currentIndex, half.length - 1)
          })))
          return true
        } catch (e2) {
          console.warn('[PlaylistPersist]', { action: 'quota_fail', message: e2 && e2.message })
          return false
        }
      }
    },
    /**
     * 音量写盘（400ms 防抖：拖 slider 时 @input 是逐像素触发的）。
     * 单独一个 key 而不是塞进 player_state —— 清空播放列表会删掉 player_state，
     * 但音量是长期偏好，不该被这次操作带走。
     */
    _rememberVolume(v) {
      if (this._volumeTimer) clearTimeout(this._volumeTimer)
      this._volumeTimer = setTimeout(() => {
        this._volumeTimer = null
        try { localStorage.setItem('acmusic_volume', String(v)) } catch (e) { /* ignore */ }
      }, 400)
    },
    _restoreVolume() {
      try {
        const raw = localStorage.getItem('acmusic_volume')
        if (raw === null) return
        const v = Number(raw)
        if (!isFinite(v) || v < 0 || v > 100) return
        this.volume = v
        // 淡出结束要还原到"用户设的那个音量"，基线必须一起改
        this.fadeBase = v
        console.log('[PlayerState] restore_volume', { volume: v })
      } catch (e) { /* ignore */ }
    },
    /**
     * 恢复定时停止。
     * 只认 12 小时内设的（player_state 的 7 天 TTL 对"定时"太长了）。
     * time 档按绝对截止时间戳重建，已过期的直接丢弃 —— 刷新完立刻"已停止播放"
     * 比丢一个定时更让人困惑。
     */
    _restoreSleep(data) {
      const age = Date.now() - (Number(data.timestamp) || 0)
      if (!data.sleepMode || data.sleepMode === 'off' || age > 12 * 60 * 60 * 1000) return
      const mode = data.sleepMode
      if (mode === 'time') {
        const deadline = Number(data.sleepDeadline) || 0
        if (deadline - Date.now() < 5000) return
        this.sleepMode = 'time'
        this.sleepValue = Number(data.sleepValue) || 0
        this.timeDraft = this.sleepValue
        this.sleepDeadline = deadline
      } else if (mode === 'count') {
        const left = Number(data.songsLeft) || 0
        if (left <= 0) return
        this.sleepMode = 'count'
        this.sleepValue = Number(data.sleepValue) || left
        this.countDraft = this.sleepValue
        this.songsLeft = left
        this.sleepDeadline = 0
      } else if (mode === 'song') {
        this.sleepMode = 'song'
        this.sleepValue = 0
        this.sleepDeadline = 0
      } else {
        return
      }
      this.sleepNow = Date.now()
      this._startSleepClock()
      console.log('[Sleep]', { action: 'restore', mode: this.sleepMode, remain: this.sleepRemainSec })
    },
    _preloadNext() {
      if (this.currentSongSource !== 'playlist') return
      // random：下一首是随机的，预取大概率白打一次请求
      // loop：单曲循环会重播当前这首，根本没有"下一首"
      if (this.playMode === 'random' || this.playMode === 'loop') return
      let nextIdx = this.curIndex + 1
      if (nextIdx >= this.currentPlaylist.length) {
        // 列表循环（order）播完最后一首会回到第一首；顺序播放（sequence）则停在这里
        if (this.playMode !== 'order') return
        nextIdx = 0
      }
      if (nextIdx === this.curIndex) return
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
            if (!d || !d.url) return null
            /**
             * 试听片段不能当正常音源缓存。
             * VIP 独占用未登录/非会员身份请求时，url 有值、能播，但只有 30 秒左右
             * （freeTrialInfo 非空）。一旦被写进 audioCache，下一首真正播放时
             * getSongUrl 第一行就命中缓存直接返回：既不会进解灰链路，音质按钮还会
             * 显示成默认档位（currentQuality 被置成 actual=preferred），
             * 要等用户手动切一次音质（会先 removeAudioCache）才恢复正常。
             */
            if (d.freeTrialInfo) {
              console.log('[AudioPreload]', { action: 'skip_trial', songId: nextSong.id })
              return null
            }
            return toHttpsUrl(d.url)
          })
      }, level)
          .then(url => {
            // 官方一档都没取到 → 这首多半是灰的（版权/会员），顺手把解灰地址也预取掉，
            // 切歌时就不用再等那零点几秒（解灰链路本身约 0.4~0.6s）。
            if (!url) return this._preloadMatch(nextSong.id)
            return null
          })
          .catch(() => { /* silent */ })
    },
    /**
     * 预解灰：只写 urlCache，不碰 currentQuality 和状态条。
     *
     * 真正播放时由 requestMatchSongUrl 命中缓存，UI 那边照常显示"解灰完成 · 波点音乐 320k"。
     * 缓存 key 与 requestMatchSongUrl 保持一致（id + '_match'），TTL 也用 10 分钟：
     * 第三方直链本身有时效，放太久反而会把过期地址塞给播放器。
     */
    _preloadMatch(id) {
      const cacheKey = id + '_match'
      const hit = this.urlCache.get(cacheKey)
      if (hit && Date.now() < hit.expire) return Promise.resolve(null)
      return this.$axios('/song/url/match', { params: { id } })
          .then(res => {
            const payload = (res && res.data) || {}
            const raw = typeof payload.data === 'string'
              ? payload.data
              : (payload.data && payload.data.url)
            const url = toHttpsUrl(raw)
            if (!url) return null
            this.urlCache.set(cacheKey, {
              url, level: 'match', source: 'match',
              provider: payload.source || '',
              br: Number(payload.br) || 0,
              size: Number(payload.size) || 0,
              expire: Date.now() + 10 * 60 * 1000
            })
            console.log('[AudioPreload]', { action: 'match_ready', songId: id, source: payload.source || '-' })
            return url
          })
          .catch(() => null)
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
              // 新数据带 ar（含 id）；老存档只有 artists 字符串，退化成「只有名字」，
              // 点歌手名时由 App 按名字反查 id（utils/artistLink.js）
              ar: Array.isArray(t.ar) && t.ar.length ? t.ar : (t.artists ? [{ name: t.artists }] : []),
              album: t.album || '',
              al: { id: Number(t.alId) || 0, name: t.album || '', picUrl: t.picUrl || '' },
              picUrl: t.picUrl || '',
              dt: t.duration || 0,
              duration: t.duration || 0,
              mv: Number(t.mv) || 0,
              source: t.source || ''
            })
          }
          this.$store.commit('TracksAbout/REPLACE_PLAYLIST', deduped)
          console.log('[PlaylistPersist]', { action: 'restore', count: deduped.length })
        }
        if (data.playMode && ['order', 'sequence', 'random', 'loop'].indexOf(data.playMode) !== -1) {
          this.playMode = data.playMode
          // 标记"已从 player_state 恢复"，mounted 里就不再读 acmusic_play_mode，
          // 避免两个来源谁后跑谁说了算（原来 mounted 无条件覆盖）
          this._playModeRestored = true
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
            al: {
              id: Number(data.song.alId) || 0,
              name: data.song.album || '',
              picUrl: data.song.cover || ''
            },
            ar: Array.isArray(data.song.ar) && data.song.ar.length
              ? data.song.ar
              : [{ name: data.song.artists }],
            // 老存档没有 mv 字段（默认 0），播放条角标随后由 resolveSongMv 补拉
            mv: Number(data.song.mv) || 0
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
        // 定时停止：不恢复的话刷新等于静默取消，用户以为到点会停、结果整晚在放
        this._restoreSleep(data)

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
            } else if (this.currentPlaylist.length) {
              // 队列窗口裁剪 / 去重后当前曲可能不在列表里：夹回合法区间，
              // 否则 curIndex 越界会让 currentPlaylist[ind] 变成 undefined
              this.curIndex = Math.max(0, Math.min(this.curIndex, this.currentPlaylist.length - 1))
              console.warn('[RestoreSync]', { action: 'clamp_index', curIndex: this.curIndex, count: this.currentPlaylist.length })
            }
          }
          this.isRestoring = false
          this.currentSongSource = 'playlist'
          if (this.playMode === 'random') this._initShuffle()
          /**
           * 心动模式：必须在 isRestoring 解除之后恢复。
           * 这里是"接着从红心歌单续批"的唯一入口 —— 队列本身能从 localStorage 恢复，
           * 但"谁来续批"这个来源信息只在 heartMode 里，丢了就退化成普通歌单
           * （播到队尾绕回第一首，见 _autoNext → _heartAdvance）。
           *
           * 门控两层：
           *  1) isLoggedIn() —— fetchHeartBatch 拿不到 uid 必失败，未登录恢复只会空转
           *  2) user-profile.userId —— 游客登录同样会写 MUSIC_U（main.js 的 anonymousLogin），
           *     所以只看登录态会让"没登录的人"刷新后也点亮心动卡和"播放中"，
           *     而点进去必然报 NO_UID。
           */
          let profile = {}
          try { profile = this.$store.getters['UserAbout/userProfile'] || {} } catch (e) { profile = {} }
          /**
           * 私人 FM：只认存档里的 fm 标记。它与心动互斥，两个都为真时以心动为准
           * （正常写入不会同时为真，防的是中途切模式的存档）。
           */
          if (data.fm && !data.heartMode) {
            this.isPersonalFM = true
            console.log('[FM]', { action: 'restore', songId: this.currentSong && this.currentSong.id })
          }
          /**
           * 心动模式的门控原来还要求 user-profile.userId —— 太严了：
           * setLogin() 只写 cookie 不写 profile（phoneLogin / qrcodeLogin 都没传），
           * profile 要等用户进过「我的」页才落盘。于是"登录后没去过我的页"的用户
           * 刷新一次就悄悄丢了心动模式，队尾再也不续批。
           * 现在只看登录态：真拿不到 uid 时 fetchHeartBatch 会报 NO_UID，
           * 由 _heartExtend 收尾并给出提示，不会再无声失败。
           */
          if (data.heartMode && isLoggedIn() && this.currentSong && this.currentSong.id) {
            this.heartMode = true
            console.log('[Heart]', { action: 'restore', songId: this.currentSong.id, hasUid: !!profile.userId })
          }
        })
      } catch (e) { /* ignore */ }
    },
  },
  beforeMount() { this.sel = new Audio() },
mounted() {
    this._restoreState()
    this._restoreVolume()
    // 恢复出来的歌曲是 lite 结构（_saveState 没存 mv），这里补一次
    if (this.currentSong && this.currentSong.id) this.resolveSongMv(this.currentSong)
    try {
      // playMode 已经由 _restoreState 从 player_state 恢复时，不再读第二个来源
      if (!this._playModeRestored) {
        const savedMode = localStorage.getItem('acmusic_play_mode')
        if (savedMode && ['order', 'sequence', 'random', 'loop'].indexOf(savedMode) !== -1) this.playMode = savedMode
      }
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
    // 心动模式与 FM 互斥（两者都要接管队列来源），开 FM 就关心动
    this._fmModeHandler = (val) => {
      const wasFm = this.isPersonalFM
      this.isPersonalFM = !!val
      if (val && this.heartMode) this.heartMode = false
      /**
       * 私人FM 和心动一样，都是"顺着流往下走"：列表循环（首尾相接）和随机（洗牌）
       * 在这条流里没有意义。进来时把这两档对齐成顺序播放，单曲循环保留。
       */
      if (val && (this.playMode === 'order' || this.playMode === 'random')) this.setPlayMode('sequence', true)
      /**
       * 从 FM 退到"点播某首歌"（App.vue 的 songClk 先发这个信号，再塞 props.song）：
       * 队列只留最后在播的这首。必须等 nextTick —— 那时 song / currentSong watcher
       * 才把用户点的那首追加进队列，currentSong 也才是"要留下的那首"。
       * 换台（playAllSong）不经过这里，所以新歌单不会被清成一首。
       */
      if (!val && wasFm) {
        // 从 FM 退到"点播某首歌"：队列只留最后在播的这首（下一帧等新歌入队后再收）
        this._collapseQueueToCurrent()
      }
    }
    this.$bus.$on('fm-mode', this._fmModeHandler)
    // 首页「心动模式」入口卡片：只发信号，真正的开关逻辑（登录校验/取流/换队列）在这里
    this._heartToggleHandler = () => this.toggleHeartMode()
    this.$bus.$on('heart-toggle', this._heartToggleHandler)
    /**
     * 进入 MV / 视频页时请求停歌。
     * 播放器是全局常驻的，路由切走不会自己停；MV 有自己的音轨，
     * 不暂停就是「歌曲 + 视频」两个声音同时响。
     */
    this._pauseForVideoHandler = () => { if (this.isPlay) this.pauseSong() }
    this.$bus.$on('pause-song', this._pauseForVideoHandler)
    /**
     * 队列在别处被改写（列表行内的「加入播放列表」/「全部加入」）时立刻落盘。
     * 不通知的话要等下一次切歌或 5 秒后的 timeupdate 才保存，
     * 「队列里还没有在播歌曲」这一档更是永远不保存。
     *
     * 顺带处理「空队列加歌」：清空播放列表之后（或本次会话第一次加歌），
     * 用户期望加完就能听到，这里挑刚加的那首直接开播。
     * `wasEmpty` 保证只有"加之前队列是空的"才抢播放——往已有队列里加歌不打断当前播放。
     */
    this._queueChangedHandler = (payload) => {
      this._saveState()
      const playId = payload && payload.playId
      if (!playId || !payload.wasEmpty) return
      if (this.currentSong && this.currentSong.id) return
      const target = this.currentPlaylist.find(t => t && String(t.id) === String(playId))
      if (target) this.handleCommand(target)
    }
    this.$bus.$on('queue-changed', this._queueChangedHandler)
    this._onBeforeUnload = () => { this._saveState() }
    window.addEventListener('beforeunload', this._onBeforeUnload)
    /**
     * beforeunload 并不可靠：移动端 Safari 切后台 / 被系统回收时不触发，
     * 桌面端也有"关闭标签页直接杀进程"的情况。visibilitychange 是其中
     * 唯一在移动端稳定触发的时机，pagehide 兜 iOS 的老版本。
     */
    this._onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') this._saveState()
    }
    this._onPageHide = () => { this._saveState() }
    document.addEventListener('visibilitychange', this._onVisibilityChange)
    window.addEventListener('pagehide', this._onPageHide)
    // 播放器重建时 isPersonalFM 会回到 false，但 store 里的镜像值可能还是上次的 true，
    // 挂载时对齐一次，避免漫游卡凭空显示"播放中"
    this.$store.commit('TracksAbout/SET_FM_ACTIVE', this.isPersonalFM)
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
    document.removeEventListener('visibilitychange', this._onVisibilityChange)
    window.removeEventListener('pagehide', this._onPageHide)
    if (this._volumeTimer) { clearTimeout(this._volumeTimer); this._volumeTimer = null }
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
    this.$bus.$off('heart-toggle', this._heartToggleHandler)
    this.$bus.$off('pause-song', this._pauseForVideoHandler)
    this.$bus.$off('queue-changed', this._queueChangedHandler)
    if (this.hintTimer) { clearTimeout(this.hintTimer); this.hintTimer = null }
    if (this.alignPanelTimer) { clearTimeout(this.alignPanelTimer); this.alignPanelTimer = null }
    this._clearSourceStatusTimers()
  }
}
</script>

<style lang="scss" scoped>
@import "../../assets/scss/base/motion";
$bar-h: 60px; $mini-h: 4px; $accent: var(--c-accent);
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
      background: linear-gradient(90deg, $accent, var(--c-accent-hover));
      border-radius: 0 2px 2px 0;
      transition: width 0.1s linear;
      box-shadow: 0 0 8px rgba(var(--theme-accent-rgb), 0.2);
    }
    // 折叠态也标出副歌位置：这是「发现这个功能」的最低成本入口
    .miniChorus {
      position: absolute; top: 0; bottom: 0;
      background: rgba(var(--theme-accent-rgb), 0.42);
      pointer-events: none;
      transition: background 200ms ease;
      &.on { background: rgba(var(--theme-accent-rgb), 0.85); }
    }
  }
  &:hover .miniTrack { height: 6px; }
}

.playerPanel.expanded .miniBar { display: none; }

/**
 * 播放条上方的浮动播报区：整体水平居中，吊在播放按钮正上方。
 * 以前只有 playerHint 一个，绝对定位各自为战；加了音源状态行后要能共存，
 * 所以收进一个纵向 flex 容器——两者同时出现时自动堆叠，不会互相盖住。
 */
.floatStack {
  position: absolute; bottom: calc(100% + 12px); left: 50%;
  transform: translateX(-50%);
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  max-width: min(560px, 88vw);
  pointer-events: none;
  z-index: 6;

  // 收起态只剩 28px 的迷你进度条（高度不参与面板布局），播报要相应下移，
  // 否则会飘到屏幕最下沿、压在页面内容上
  &.is-collapsed { bottom: 40px; }
}

// 播放器内联状态条：A-B 选点 / 副歌 / 心动模式 / 定时停止 的持续状态播报
.playerHint {
  display: flex; align-items: center; gap: 8px;
  max-width: 100%;
  padding: 9px 18px;
  background: rgba(28, 29, 40, .94);
  border: 1px solid rgba(255, 255, 255, .10);
  border-radius: 999px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, .35);
  backdrop-filter: blur(18px);
  color: rgba(255, 255, 255, .92);
  font-size: 13px; line-height: 1.45;

  .hintIcon { flex: none; color: $accent; }
  .hintText { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
}

// 音源状态胶囊：解灰这类"要等一会儿"的链路才出现，比 playerHint 小一号，不抢戏
.sourceHint {
  display: flex; align-items: center; gap: 6px;
  max-width: 100%;
  padding: 7px 14px;
  background: rgba(28, 29, 40, .94);
  border: 1px solid rgba(255, 255, 255, .10);
  border-radius: 999px;
  box-shadow: 0 10px 26px rgba(0, 0, 0, .32);
  backdrop-filter: blur(18px);
  color: rgba(255, 255, 255, .66);
  font-size: 12px; line-height: 1.45; letter-spacing: .1px;

  .hintText { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .statusDot {
    flex: none; width: 7px; height: 7px; border-radius: 50%;
    background: currentColor; opacity: .8;
  }

  &.is-pending { color: rgba(255, 255, 255, .66); }
  // 解灰＝第三方源，跟音质按钮上的「解灰」用同一支琥珀色
  &.is-unblock {
    color: #f0c674;
    border-color: rgba(240, 198, 116, .30);
    background: rgba(46, 39, 27, .94);
  }
  &.is-ok { color: #6ee7a8; }
  &.is-fail { color: #f87171; }

  // 进行中：转圈表达"还在等"，静态圆点看着像"卡住了"
  &.is-pending .statusDot,
  &.is-unblock .statusDot {
    width: 9px; height: 9px;
    background: transparent;
    border: 1.5px solid currentColor;
    border-top-color: transparent;
    opacity: 1;
    animation: sourceStatusSpin .7s linear infinite;
  }
  &.is-ok .statusDot, &.is-fail .statusDot { opacity: .9; }
}

.hint-pop-enter-active, .hint-pop-leave-active {
  transition: opacity $motion-normal $ease-standard, transform $motion-normal $ease-standard;
}
.hint-pop-enter, .hint-pop-leave-to {
  opacity: 0; transform: translateY(10px);
}
.hint-pop-enter-to, .hint-pop-leave {
  opacity: 1; transform: translateY(0);
}

// 音源状态：从下方 8px 浮上来，跟播放按钮同一个视觉落点
.source-pop-enter-active, .source-pop-leave-active {
  transition: opacity 200ms $ease-standard, transform 200ms $ease-standard;
}
.source-pop-enter, .source-pop-leave-to { opacity: 0; transform: translateY(8px); }

@keyframes sourceStatusSpin { to { transform: rotate(360deg); } }

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
    font-size: 18px; color: $text-sec; cursor: pointer; flex-shrink: 0; padding: 4px;
    transition: all 200ms cubic-bezier(0.22,0.61,0.36,1);
    &:hover { color: $text; transform: scale(1.15); }
    &.liked { color: #ef4444; filter: drop-shadow(0 0 4px rgba(239,68,68,0.25)); }
  }
  // MV 入口：紧跟红心。用文字标签而不是图标——「MV」两个字母在这里比任何
  // 播放/影片图标都更容易一眼认出，且和右侧「完整 / 定时」的胶囊是同一种语言
  .mvBtn {
    flex-shrink: 0;
    height: 18px;
    padding: 0 4px;
    margin-left: -4px;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 5px;
    background: rgba(255,255,255,0.04);
    color: $text-sec;
    font-family: inherit;
    font-size: 10px; font-weight: 600; line-height: 1; letter-spacing: .5px;
    cursor: pointer;
    transition: all 160ms $ease-standard;

    &:hover {
      color: $accent;
      background: rgba(var(--theme-accent-rgb), 0.1);
      border-color: rgba(var(--theme-accent-rgb), 0.45);
    }
    &:focus-visible { outline: 1px solid $accent; outline-offset: 2px; }
  }
}

.barCenter {
  // 组合标签是绝对定位的，这里就是它的定位父级
  position: relative;
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; min-width: 200px;
  // 组合标签：贴在这一列的左端，上下垂直居中。
  // 用绝对定位是为了不参与 barControls 的居中计算——否则标签文案一变长，
  // 中间那排播放控件就会整体左移，看着像抽了一下。
  // top/bottom 都给 0：让它撑满 barCenter 的高度，再靠 align-items 居中，
  // 而不是写死 32px 去对齐上面那排控件（那样标签会偏高、贴着控件行）。
  .stackWrap {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    display: flex;
    align-items: center;
  }

  .stackPill {
    display: inline-flex;
    align-items: center;
    max-width: 150px;
    height: 22px;
    padding: 0 9px;
    border-radius: 11px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.05);
    font-size: 11px;
    font-family: inherit;
    color: rgba(255, 255, 255, 0.55);
    letter-spacing: .2px;
    cursor: pointer;
    transition: background 180ms ease, color 180ms ease, border-color 180ms ease;

    &:hover { background: rgba(255, 255, 255, 0.12); color: rgba(255, 255, 255, 0.92); }
    &:active { transform: scale(0.96); }

    // 真的叠了东西才上主题色，全默认时不该抢视觉
    &.is-stacked {
      border-color: rgba(var(--theme-accent-rgb), 0.45);
      background: rgba(var(--theme-accent-rgb), 0.14);
      color: var(--theme-ink-dark);
    }
  }

  // 省略号必须落在内层 span 上：button 是 inline-flex 容器，
  // 直接给 button 加 text-overflow 对 flex 子项不起作用
  .stackText { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .barControls {
    display: flex; align-items: center; gap: 12px; color: $text;
    // 「添加到歌单」用绝对定位挂在控制组右侧：它不参与 flex 排布，
    // 否则多出来的一颗按钮会把整组（含正中间的播放键）整体推左
    position: relative;
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
    // 「添加到歌单」：跟在下一首右边，比传输控件小一号、颜色更轻，
    // 避免看起来像第四个播放控制
    .addPlBtn {
      position: absolute;
      left: calc(100% + 12px);
      top: 50%;
      margin-top: -13px;
      width: 26px; height: 26px;
      color: rgba(255,255,255,0.42);

      &:hover { color: rgba(255,255,255,0.9); }
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
      /**
       * 四档队列策略一律同色（0.42 白）。
       * 历史：2026-08 只有 order / random / loop 三档时，random 和 loop 被上了主色
       * （"非默认模式高亮"），后来加第四档 sequence 时漏改，于是变成"随机/单曲紫、
       * 列表/顺序浅"这种没有规律的样子。模式本身已经由图标形状区分，颜色不该再兼职，
       * 主色只留给"叠加形态"（副歌 / A-B）和激活态。
       */
      // 副歌形态生效时补一颗小点，避免"忘了自己开着副歌模式"
      &.is-chorus { color: $accent; }
      // 心动 / 私人FM 接管队列来源时，非单曲循环的策略图标压暗
      // （图标仍显示用户原来的策略，退出这两种模式后立刻恢复生效；
      //  不换"禁用"光标 —— 按钮本身可点，点一下是开单曲循环）
      &.is-locked {
        opacity: .45;
        &.is-chorus { color: rgba(255,255,255,0.42); }
      }
      .chorusDot {
        position: absolute; right: 2px; bottom: 2px;
        width: 6px; height: 6px; border-radius: 50%;
        background: $accent;
        box-shadow: 0 0 0 2px rgba(28, 29, 40, 0.95);
      }
      // 心动模式指示点：琥珀色，和"区间形态"的点区分开
      .heartDot {
        position: absolute; right: 2px; bottom: 2px;
        width: 6px; height: 6px; border-radius: 50%;
        background: #f0c674;
        box-shadow: 0 0 0 2px rgba(28, 29, 40, 0.95);
      }
      &:hover {
        color: rgba(255,255,255,0.9);
        background: rgba(255,255,255,0.07);
        border-color: rgba(255,255,255,0.06);
      }
      &.is-chorus:hover { color: $accent; }
    }
    .barPlay {
      width: 32px; height: 32px; border-radius: 50%; background: $accent; color: #fff;
      display: flex; align-items: center; justify-content: center; cursor: pointer;
      box-shadow: 0 2px 12px rgba(var(--theme-accent-rgb), 0.3);
      transition: all 200ms cubic-bezier(0.22,0.61,0.36,1);
      i { font-size: 18px; margin-left: 1px; }
      &:hover { transform: scale(1.1); box-shadow: 0 4px 18px rgba(var(--theme-accent-rgb), 0.45); }
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
        box-shadow: 0 0 0 1px rgba(var(--theme-accent-rgb), 0.55), 0 0 10px rgba(var(--theme-accent-rgb), 0.35);
      }
      .barFill {
        height: 100%; background: $accent; border-radius: inherit; position: relative;
        transition: width 0.1s linear; box-shadow: 0 0 6px rgba(var(--theme-accent-rgb), 0.18);
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
        background: rgba(var(--theme-accent-rgb), 0.26);
        border-left: 1px solid rgba(var(--theme-accent-rgb), 0.7);
        border-right: 1px solid rgba(var(--theme-accent-rgb), 0.7);
        border-radius: 2px;
        pointer-events: none;
        transition: background 200ms ease;
        &.on { background: rgba(var(--theme-accent-rgb), 0.5); }
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
  // 不再写死 236px。音质按钮的文案会随状态变长（解灰源显示 320k / SQ，
  // 官方档位是 HQ / SQ / 192），固定宽度下多出几像素就会把"完整""定时"
  // 挤成两行竖排。改成由内容决定宽度，让中间进度列（flex:1，min-width:200）让位。
  flex: 0 0 auto; width: auto; min-width: 236px;
  display: flex; align-items: center; justify-content: flex-end; gap: 7px;
  .barItem {
    position: relative; cursor: pointer; color: $text-sec; display: flex; align-items: center;
    // 子项一律不参与压缩：否则任何一处文案变长都会挤压邻居，而不是撑开容器
    flex: 0 0 auto;
    transition: color 160ms cubic-bezier(0.22,0.61,0.36,1);
    i { font-size: 16px; }
    &:hover { color: $text; }
  }
  // 三枚 chip 的文案长度都是动态的（完整/副歌、定时、320k/SQ），统一禁止折行
  .qualityBtn, .chorusTrigger, .sleepTrigger { white-space: nowrap; }
  .volumeWrap .volumeSlider {
    position: absolute; bottom: calc(100% + 12px); left: 50%; transform: translateX(-50%);
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
    // 与播放列表/音质/定时同一套弹层配色（浅色主题下自动变白底深字）
    background: var(--player-pop-bg); border: 1px solid var(--player-pop-border);
    color: var(--player-pop-text);
    border-radius: 12px; padding: 10px 10px 12px; box-shadow: 0 16px 48px var(--player-pop-shadow); z-index: 10;
    .volumeValue {
      font-size: 11px; font-weight: 600; line-height: 1; color: var(--player-pop-secondary);
      font-variant-numeric: tabular-nums; min-width: 18px; text-align: center;
    }
    &::after {
      content: ''; position: absolute; top: 100%; left: 50%; margin-left: -6px;
      border-width: 6px 6px 0; border-style: solid;
      border-color: var(--player-pop-bg) transparent transparent;
    }
    input[type="range"] {
      writing-mode: vertical-lr; direction: rtl;
      width: 4px; height: 88px;
      -webkit-appearance: none; appearance: none;
      background: var(--player-pop-chip); border-radius: 2px; outline: none; cursor: pointer;
      &::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; border-radius: 50%; background: var(--player-pop-text); cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.3); }
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
  // 更多（屏蔽入口）：跟着队列按钮走，尺寸对齐，不额外抢空间
  .moreWrap .moreTrigger {
    display: inline-flex; align-items: center; justify-content: center;
    width: 22px; height: 22px;
    border-radius: 6px;
    color: $text-sec;
    transition: color 160ms ease, background 160ms ease;
    &:hover { color: $text; background: rgba(255, 255, 255, 0.08); }
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
      background: rgba(var(--theme-accent-rgb), 0.1);
      border-color: rgba(var(--theme-accent-rgb), 0.3);
      &:hover { background: rgba(var(--theme-accent-rgb), 0.16); border-color: rgba(var(--theme-accent-rgb), 0.45); }
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
      background: rgba(var(--theme-accent-rgb), 0.1);
      border-color: rgba(var(--theme-accent-rgb), 0.3);
      .sleepLabel { font-variant-numeric: tabular-nums; }
      &:hover { background: rgba(var(--theme-accent-rgb), 0.16); border-color: rgba(var(--theme-accent-rgb), 0.45); }
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
  // 180px 里再放一颗 MV 胶囊，歌名只剩三四个字，不如不给（列表页/大播放器仍有入口）
  .barLeft .mvBtn { display: none; }
  .barRight { flex: 0 0 auto; width: auto; min-width: 188px; }
  // 窄屏只留图标+箭头，避免右侧挤出可用区
  .barRight .chorusWrap .chorusTrigger .chorusLabel { display: none; }
  .barRight .sleepWrap .sleepTrigger:not(.on) .sleepLabel { display: none; }
  // 组合标签让出一半宽度，剩下的靠省略号收尾（完整读法在 title 里）
  .barCenter .stackPill { max-width: 78px; }
  // barCenter 变窄后，进度行（max-width 480）两侧的留白就没了，
  // 垂直居中的标签会压到进度行左端的时间——这时收回成控件行高度、顶部对齐
  .barCenter .stackWrap { bottom: auto; height: 32px; }
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
  background: var(--player-pop-bg) !important;
  border: 1px solid var(--player-pop-border) !important;
  box-shadow: 0 16px 48px var(--player-pop-shadow) !important;
  border-radius: 14px !important;
  padding: 0 !important;
  box-sizing: border-box !important;
  width: 250px !important;
  min-width: 250px !important;
  max-width: 250px;
  max-height: 420px;
  // 不能 overflow:hidden：popper 的倒三角挂在盒子外侧（bottom:-6px），会被裁掉。
  // 圆角靠 .plItems 自己的 border-radius 收口。
  overflow: visible;
  /**
   * 面板是 placement="top"、锚在播放条里的队列图标上，默认留白只有 5px，
   * 面板底部会压进播放条顶部（实测重叠 16px，盖住控制区）。
   * Popper 会把这个 margin 算进定位：28px 让面板底边正好贴在 fullBar 上沿。
   */
  margin-bottom: 23px !important;

  // 顶部操作条：面板里唯一不随列表滚动的一块（列表在 .plItems 内独立滚动）
  .plHead {
    display: flex; align-items: center; justify-content: space-between;
    gap: 8px;
    padding: 10px 10px 8px 14px;
    border-bottom: 1px solid var(--player-pop-border);
  }

  .plTitle {
    display: inline-flex; align-items: baseline; gap: 4px;
    font-size: 13px; font-weight: 700; color: var(--player-pop-text);

    .plTotal {
      font-size: 10px; font-weight: 500; color: var(--player-pop-muted);
      font-variant-numeric: tabular-nums;
    }
  }

  .plHeadOps { display: flex; align-items: center; gap: 0; }

  // 250px 宽下面板左右都很紧：按钮压到 11px / 24px 高，
  // 保证「收藏全部 + 清空」和标题能排在同一行不换行
  .plHeadBtn {
    display: inline-flex; align-items: center; gap: 3px;
    height: 24px; padding: 0 6px;
    border: 0; border-radius: 6px;
    background: transparent;
    color: var(--player-pop-muted);
    font: inherit; font-size: 11px;
    white-space: nowrap;
    cursor: pointer;
    transition: background 150ms ease, color 150ms ease;

    &:hover { background: var(--player-pop-hover); color: var(--player-pop-text); }
    &.is-danger:hover { background: rgba(229,68,77,0.14); color: var(--c-danger); }
  }

  .plItems {
    // overflow-x 必须显式关掉：行 hover 时原来有 translateX(3px)，
    // 溢出会让 `overflow-y: auto` 顺带算出横向滚动条 —— 多出一条 15px 的条，
    // 整个面板瞬间变高，看起来就是"鼠标一进去列表就往下长、盖住播放条"
    max-height: 340px; overflow-y: auto; overflow-x: hidden;
    // 容器不再 overflow:hidden（要给箭头留位置），底部圆角由列表自己收口，
    // 否则 hover 底色会顶穿面板下方两个圆角
    border-radius: 0 0 13px 13px;

    &::-webkit-scrollbar { width: 3px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb { background: var(--player-pop-border); border-radius: 2px; }

    .el-dropdown-menu__item {
      display: flex; flex-direction: column; gap: 2px;
      position: relative;
      padding: 9px 82px 9px 14px; color: var(--player-pop-secondary); font-size: 13px;
      transition: background-color 180ms ease, color 180ms ease; line-height: 1.3;
      overflow: hidden; min-width: 0;

      .plSongName { font-size: 13px; color: inherit; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .plSongArtist { font-size: 11px; color: var(--player-pop-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

      &:hover {
        background: var(--player-pop-hover); color: var(--player-pop-text);
        .plSongArtist { color: var(--player-pop-secondary); }
      }

      &.active {
        background: var(--player-pop-soft);
        color: var(--player-pop-accent); font-weight: 600;
        border-left: 2px solid var(--player-pop-accent);
        .plSongArtist { color: var(--player-pop-secondary); }
      }

      // 已被屏蔽：压暗 + 删除线。仍然显示（用户要能看到队列里有哪些），但点了不播
      &.is-blocked {
        opacity: .45;
        .plSongName { text-decoration: line-through; }
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
      color: var(--player-pop-secondary);
      transition: background 140ms ease, color 140ms ease;
      &:hover { background: var(--player-pop-chip); color: var(--player-pop-text); }
    }
  }

  .plEmpty {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 40px 18px; text-align: center; color: var(--player-pop-muted); font-size: 13px;
    .plEmptyIcon { font-size: 32px; margin-bottom: 12px; opacity: .5; }
    p { margin: 0; line-height: 1.6; }
    .plEmptyHint { font-size: 11px; color: var(--player-pop-muted); opacity: .65; margin-top: 4px; }
  }
}

/* global: 单曲形态下拉（teleported to body，scoped 样式管不到） */
.chorusDropdown {
  background: var(--player-pop-bg) !important;
  border: 1px solid var(--player-pop-border) !important;
  box-shadow: 0 16px 48px var(--player-pop-shadow) !important;
  border-radius: 12px !important;
  padding: 6px !important;
  min-width: 156px !important;

  .el-dropdown-menu__item {
    display: flex; align-items: center; gap: 6px;
    padding: 8px 10px; border-radius: 8px;
    font-size: 13px; color: var(--player-pop-secondary);
    line-height: 1.4;
    transition: background 160ms ease, color 160ms ease;

    &:hover { background: var(--player-pop-hover); color: var(--player-pop-text); }
    &.is-active {
      color: var(--player-pop-accent);
      background: var(--player-pop-soft);
      font-weight: 600;
    }

    .opt-hint {
      font-size: 10px; font-weight: 400;
      color: var(--player-pop-muted);
      background: var(--player-pop-chip);
      border-radius: 4px; padding: 1px 5px;
    }
  }
}

/* global: 定时停止下拉（teleported to body，scoped 样式管不到） */
.sleepDropdown {
  background: var(--player-pop-bg) !important;
  border: 1px solid var(--player-pop-border) !important;
  box-shadow: 0 16px 48px var(--player-pop-shadow) !important;
  border-radius: 12px !important;
  padding: 6px !important;
  min-width: 186px !important;
  max-width: 220px;

  .el-dropdown-menu__item {
    display: flex; align-items: center; justify-content: space-between; gap: 6px;
    padding: 8px 10px; border-radius: 8px;
    font-size: 13px; color: var(--player-pop-secondary);
    line-height: 1.4;
    transition: background 160ms ease, color 160ms ease;

    &:hover { background: var(--player-pop-hover); color: var(--player-pop-text); }
    &.is-active {
      color: var(--player-pop-accent);
      background: var(--player-pop-soft);
      font-weight: 600;
    }
  }

  // 可调节档位行：「再播 [−] N [+] 首后停止」/「播放 [−] N [+] 分钟后停止」
  // 不用 el-dropdown-item：行内要放按钮和输入框，而 item 是一次性命令
  .sdRow {
    display: flex; align-items: center; gap: 5px;
    padding: 7px 10px; border-radius: 8px;
    font-size: 13px; color: var(--player-pop-secondary);
    transition: background 160ms ease, color 160ms ease;

    &:hover { background: var(--player-pop-hover); }
    &.is-active { color: var(--player-pop-accent); background: var(--player-pop-soft); font-weight: 600; }

    .sdLabel { flex-shrink: 0; }
    .sdUnit { flex-shrink: 0; font-weight: 400; }

    .sdStep {
      flex-shrink: 0;
      display: inline-flex; align-items: center; justify-content: center;
      width: 20px; height: 20px; border-radius: 6px;
      font-size: 14px; line-height: 1;
      background: var(--player-pop-chip);
      color: var(--player-pop-text);
      cursor: pointer; user-select: none;
      transition: background 140ms ease, color 140ms ease;
      &:hover { background: var(--player-pop-hover); }
      &:active { transform: scale(0.92); }
      // 到边界置灰但仍占位，避免按钮消失导致行宽跳动
      &.disabled { opacity: 0.3; cursor: not-allowed; &:hover { background: var(--player-pop-chip); } }
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
      background: var(--player-pop-input);
      border: 1px solid var(--player-pop-border);
      border-radius: 6px;
      outline: none;
      transition: border-color 140ms ease, background 140ms ease;
      &:focus { border-color: var(--player-pop-accent); background: var(--player-pop-input); }
    }
  }

  // 淡出开关：不是"菜单项"，所以不用 el-dropdown-item，
  // 自己画一个小 switch，避免选完就关菜单
  .sdFade {
    display: flex; align-items: center; justify-content: space-between; gap: 10px;
    margin-top: 4px; padding: 9px 10px 7px;
    border-top: 1px solid var(--player-pop-border);
    font-size: 12px; color: var(--player-pop-muted);
    cursor: pointer;
    transition: color 160ms ease;
    &:hover { color: var(--player-pop-text); }
  }

  .sdSwitch {
    position: relative; flex-shrink: 0;
    width: 26px; height: 14px; border-radius: 7px;
    background: var(--player-pop-chip);
    transition: background 180ms ease;

    &::after {
      content: '';
      position: absolute; top: 2px; left: 2px;
      width: 10px; height: 10px; border-radius: 50%;
      background: var(--player-pop-text);
      transition: transform 180ms ease, background 180ms ease;
    }

    &.on {
      background: rgba(var(--theme-accent-rgb), 0.55);
      &::after { transform: translateX(12px); background: var(--theme-on-accent); }
    }
  }
}

/* override element ui dropdown item hover */
.el-dropdown-menu__item:focus, .el-dropdown-menu__item:not(.is-disabled):hover {
  background-color: transparent !important;
}
</style>
