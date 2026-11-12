/**
 * 「当前歌曲 → MV」状态混入
 *
 * 播放条（PlayerCore）和全屏播放页（MusicPlayer）都要回答同一个问题：
 * 现在这首歌唱的有没有 MV、id 是多少。逻辑一样，抽出来避免两处不同步。
 *
 * 用法：在组件的 currentSong watcher 里调 `this.resolveSongMv(song)`，
 * 模板里用 `currentMvId`（0 = 没有/失效），跳转统一走 $bus 的 'mvClk'。
 */

import { ensureMvId, mvIdOf, isMvDead as checkMvDead } from "@/utils/songMv"

export const songMvMixin = {
    data() {
        return {
            // 当前歌曲可播的 MV id，0 表示没有（或已确认失效）
            currentMvId: 0
        }
    },
    beforeDestroy() {
        // 让在途请求的回包失效，避免销毁后 setData
        this._mvSeq = (this._mvSeq || 0) + 1
    },
    methods: {
        /**
         * 解析某首歌的 MV。歌曲自带 mv 就同步出结果，缺字段才发一次 /song/detail。
         * 切歌很快时旧响应可能后到，用序号守卫丢弃。
         * @param {Object} song
         */
        resolveSongMv(song) {
            const seq = (this._mvSeq = (this._mvSeq || 0) + 1)
            this.currentMvId = 0
            if (!song || !song.id) return

            const direct = mvIdOf(song)
            if (direct) {
                this.currentMvId = checkMvDead(direct) ? 0 : direct
                return
            }

            ensureMvId(song).then(id => {
                if (seq !== this._mvSeq || !id) return
                this.currentMvId = checkMvDead(id) ? 0 : id
            })
        },
        /** 模板里判断失效：读到的是响应式集合，MV 页报 404 后这里会立刻变 false */
        isMvDead(id) {
            return checkMvDead(id)
        }
    }
}

export default songMvMixin
