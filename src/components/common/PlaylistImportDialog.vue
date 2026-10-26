<template>
  <el-dialog
      title="导入外部歌单"
      :visible.sync="open"
      width="540px"
      append-to-body
      :close-on-click-modal="false"
      @closed="$emit('close')">
    <div class="imp">
      <!-- ---------- 第一步：填链接 ---------- -->
      <template v-if="stage === 'form'">
        <label class="imp-label">歌单链接</label>
        <el-input
            v-model="linkText"
            type="textarea"
            :rows="5"
            resize="none"
            placeholder="粘贴外部歌单链接，一行一个，例如：
https://i.y.qq.com/n2/m/share/details/taoge.html?id=7716341988"/>
        <p class="imp-tip">
          支持直接复制的歌单 / 专辑 / 个人主页链接，以及分享到微信、微博、QQ 后复制的链接。
          多个链接会合并到同一个新歌单里。
        </p>
        <p class="imp-count" v-if="links.length">已识别 {{ links.length }} 个链接</p>
        <p class="imp-warn" v-else-if="linkText.trim()">未识别到有效链接（需以 http:// 或 https:// 开头）</p>

        <label class="imp-label">歌单名</label>
        <el-input v-model="playlistName" maxlength="40" show-word-limit placeholder="留空则用「导入音乐 + 导入时间」"/>

        <el-checkbox v-model="importStar" class="imp-check">
          同时导入「我喜欢的音乐」
          <span class="imp-check-tip">勾选后并入红心歌单，不新建歌单</span>
        </el-checkbox>
      </template>

      <!-- ---------- 第二步：任务状态 ---------- -->
      <template v-else>
        <div class="imp-status" :class="stateClass">
          <span class="imp-status-dot"></span>
          <span>{{ stateText }}</span>
        </div>
        <p class="imp-tip" v-if="taskId">任务 id：{{ taskId }}</p>

        <div v-if="tasks.length" class="imp-tasks">
          <div v-for="(t, i) in tasks" :key="i" class="imp-task">
            <span class="imp-task-name">{{ t.name || t.playlistName || ('任务 ' + (i + 1)) }}</span>
            <span class="imp-task-state">{{ taskStateText(t) }}</span>
          </div>
        </div>

        <p class="imp-tip" v-if="!tasks.length && polling">正在查询导入进度…</p>
        <p class="imp-warn" v-if="errMsg">{{ errMsg }}</p>

        <details class="imp-raw" v-if="raw">
          <summary>查看原始返回（状态字段未文档化，用来看进度）</summary>
          <pre>{{ raw }}</pre>
        </details>
      </template>
    </div>

    <span slot="footer">
      <template v-if="stage === 'form'">
        <el-button size="small" @click="open = false">取消</el-button>
        <el-button size="small" type="primary" :loading="submitting" :disabled="!links.length" @click="submit">
          开始导入
        </el-button>
      </template>
      <template v-else>
        <el-button size="small" @click="open = false">关闭</el-button>
        <el-button size="small" type="primary" :disabled="polling" @click="finish">刷新我的歌单</el-button>
      </template>
    </span>
  </el-dialog>
</template>

<script>
import * as playlistApi from "@/api/Playlist";

// 轮询间隔与上限：外部歌单要在服务端抓取 + 匹配，快则几秒，慢则半分钟以上
const POLL_INTERVAL = 2000;
const POLL_MAX = 25;

/** 从一段文本里抽出所有 http(s) 链接（去重、去尾部标点） */
function parseLinks(text) {
    const raw = String(text || '').match(/https?:\/\/[^\s"'<>，。；、）)]+/g) || [];
    const seen = {};
    return raw
        .map(u => u.replace(/[.,;:!?]+$/, ''))
        .filter(u => {
            if (seen[u]) return false;
            seen[u] = 1;
            return true;
        });
}

/**
 * 任务状态字段没有文档：上游 /task/status/v2 只保证返回 {tasks, taskProcess}。
 * 这里既做常见字段的语义映射，也保留原始值，避免瞎猜出一个"已成功"。
 */
function normalizeTaskState(t) {
    const v = t.status !== undefined ? t.status : (t.state !== undefined ? t.state : t.taskStatus);
    if (v === undefined || v === null) return {text: '—', done: false};
    const s = String(v);
    if (/success|finish|complete|done|成功|完成/i.test(s)) return {text: '已完成', done: true};
    if (/fail|error|失败/i.test(s)) return {text: '失败', done: true};
    if (/process|running|doing|处理中/i.test(s)) return {text: '处理中', done: false};
    return {text: `状态 ${s}`, done: false};
}

export default {
    name: "PlaylistImportDialog",
    data() {
        return {
            open: true,
            // form: 填链接 / progress: 查任务
            stage: 'form',
            linkText: '',
            playlistName: '',
            importStar: false,
            submitting: false,
            taskId: '',
            tasks: [],
            taskProcess: null,
            raw: '',
            polling: false,
            timer: null,
            pollCount: 0,
            pollFailed: false,
            errMsg: '',
        }
    },
    computed: {
        links() {
            return parseLinks(this.linkText);
        },
        stateText() {
            if (this.errMsg) return '导入失败';
            if (this.polling) return '正在导入…';
            if (this.pollFailed) return '任务仍在处理中';
            if (!this.taskId) return '已提交，稍后刷新歌单查看';
            return '导入结束，可刷新歌单查看';
        },
        stateClass() {
            if (this.errMsg) return 'is-error';
            if (this.polling) return 'is-running';
            return 'is-done';
        }
    },
    methods: {
        taskStateText(t) {
            return normalizeTaskState(t).text;
        },
        async submit() {
            if (!this.links.length || this.submitting) return;
            this.submitting = true;
            this.errMsg = '';
            try {
                // 走「链接导入」：link 必须是 JSON 数组字符串，由 api 层负责 stringify
                const res = await playlistApi.importTaskCreate({
                    link: this.links,
                    playlistName: this.playlistName.trim() || undefined,
                    importStarPlaylist: this.importStar,
                });
                const body = res.data || {};
                if (body.code !== 200) {
                    this.errMsg = body.message || body.msg || `导入接口返回 ${body.code}`;
                    this.stage = 'progress';
                    return;
                }
                this.stage = 'progress';
                this.raw = JSON.stringify(body, null, 2);
                this.taskId = this.pickTaskId(body);
                if (this.taskId) this.poll();
            } catch (e) {
                this.errMsg = '请求失败：' + (e && e.message ? e.message : '未知错误');
                this.stage = 'progress';
            } finally {
                this.submitting = false;
            }
        },
        /** 任务 id 在返回里的位置未文档化，按常见形态逐个兜底 */
        pickTaskId(body) {
            const d = body.data || {};
            const fromTasks = Array.isArray(d.tasks) && d.tasks[0] ? (d.tasks[0].id || d.tasks[0].taskId) : '';
            return d.taskId || d.id || fromTasks || body.taskId || '';
        },
        async poll() {
            if (!this.taskId) return;
            this.polling = true;
            this.pollCount += 1;
            try {
                const res = await playlistApi.importTaskStatus(this.taskId);
                const body = res.data || {};
                this.raw = JSON.stringify(body, null, 2);
                const d = body.data || body || {};
                this.tasks = Array.isArray(d.tasks) ? d.tasks : [];
                this.taskProcess = d.taskProcess || null;
                if (this.tasks.length && this.tasks.every(t => normalizeTaskState(t).done)) {
                    this.polling = false;
                    return;
                }
            } catch (e) {
                // 单次失败不终止轮询，状态接口偶发 460/超时属正常
            }
            if (this.pollCount >= POLL_MAX) {
                this.polling = false;
                this.pollFailed = true;
                return;
            }
            this.timer = setTimeout(() => { this.poll() }, POLL_INTERVAL);
        },
        finish() {
            this.$emit('done');
            this.open = false;
        }
    },
    beforeDestroy() {
        if (this.timer) clearTimeout(this.timer);
    }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/base/variables";
@import "src/assets/scss/base/motion";

.imp {
    .imp-label {
        display: block;
        font-size: 13px;
        font-weight: 600;
        color: $font-black-1;
        margin: 18px 0 8px;
        &:first-child { margin-top: 0; }
    }
    .imp-tip {
        font-size: 12px;
        line-height: 1.6;
        color: $font-black-2;
        margin: 8px 0 0;
        white-space: pre-line;
    }
    .imp-count {
        font-size: 12px;
        color: $color-ornament;
        margin: 8px 0 0;
    }
    .imp-warn {
        font-size: 12px;
        color: #e6a23c;
        margin: 8px 0 0;
    }
    .imp-check {
        display: block;
        margin-top: 20px;
        .imp-check-tip { font-size: 12px; color: $font-black-2; margin-left: 4px; }
    }

    /* 任务状态条 */
    .imp-status {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 600;
        color: $font-black-1;
        padding: 14px 16px;
        border-radius: 12px;
        background: $color-theme-sec;

        .imp-status-dot {
            width: 8px; height: 8px;
            border-radius: 50%;
            background: $font-black-2;
            flex-shrink: 0;
        }
        &.is-running .imp-status-dot {
            background: $color-main;
            animation: imp-pulse 1.2s $ease-standard infinite;
        }
        &.is-done .imp-status-dot { background: $color-ornament; }
        &.is-error .imp-status-dot { background: #f56c6c; }
    }

    .imp-tasks {
        margin-top: 14px;
        border: 1px solid rgba(0, 0, 0, .06);
        border-radius: 12px;
        overflow: hidden;
    }
    .imp-task {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        padding: 10px 14px;
        font-size: 13px;
        color: $font-black-1;
        & + .imp-task { border-top: 1px solid rgba(0, 0, 0, .06); }
        .imp-task-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .imp-task-state { color: $font-black-2; flex-shrink: 0; }
    }

    .imp-raw {
        margin-top: 16px;
        font-size: 12px;
        color: $font-black-2;
        summary { cursor: pointer; }
        pre {
            margin: 8px 0 0;
            max-height: 180px;
            overflow: auto;
            padding: 10px 12px;
            border-radius: 8px;
            background: $color-theme-sec;
            font-size: 11px;
            line-height: 1.5;
            white-space: pre-wrap;
            word-break: break-all;
        }
    }
}

@keyframes imp-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: .35; transform: scale(.8); }
}
</style>
