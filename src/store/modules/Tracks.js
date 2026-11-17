import pubsub from "pubsub-js";

export default {
    namespaced: true,//开启命名空间
    actions: {
        /**
         * 播放一整批歌（"播放全部" / 私人 FM 换批）。
         *
         * payload 支持两种形态：
         *  - 数组（历史写法，占绝大多数）：普通"播放全部"，PlayerCore 会顺手退出
         *    心动模式 / 私人 FM —— 用户点了别的歌单就等于换台；
         *  - `{ list, keepStream, mode }`：`keepStream: true` 表示这批歌**本身就是那条流**
         *    （私人 FM 的卡片点播 / 播放全部 / 切漫游模式）。不给这个标记的话，
         *    换队那一刻 isPersonalFM 会被短暂置 false，FM 的预取与续批判断正好在
         *    边界上看到"FM 已经关了"，从而不再取新歌。
         *
         * isPersonalFM 已下沉到 PlayerCore（data 字段），这里只负责转交意图；
         * PersonalFM / HomePage / App 的 `$bus('fm-mode')` 通知保持原样。
         */
        playAllTracks(context, payload) {
            const isObj = !!payload && !Array.isArray(payload) && typeof payload === 'object'
            const list = Array.isArray(payload) ? payload : ((isObj && payload.list) || [])
            const keepStream = !!(isObj && payload.keepStream)
            context.commit("REPLACE_PLAYLIST", list)
            //播放所有歌曲
            //subscribe in PlayCore.vue
            pubsub.publish('playAll', { keepStream, mode: (isObj && payload.mode) || 'order' })
        },
        pushAllTracks(context, list) {
            //仅添加
            context.commit("PUSH_PLAYLIST", list)
        },
        /**
         * 单曲加入队列（列表行内按钮的入口）。
         *
         * 返回 Promise<boolean>：true = 真的加进去了，false = 队列里已经有这首歌。
         * 原实现只能靠 commit，调用方拿不到结果，于是重复点击时"没反应"——
         * 用户会以为按钮坏了，而不是"这首歌已经在列表里"。
         *
         * 这里传的是浅拷贝：队列项会被 PlayerCore 打上 curSong 标记
         *（`currentPlaylist.forEach(el => el.curSong = ...)`），直接存调用方
         *（页面列表）的对象会把标记写回页面数据。
         */
        pushTrack(context, track) {
            if (!track || track.id == null) return false
            const key = String(track.id)
            const exists = context.state.currentPlaylist.some(t => t && String(t.id) === key)
            if (exists) return false
            context.commit('PUSH_PLAYLIST', Object.assign({}, track))
            return true
        }
    },
    mutations: {
        // FM 预加载的暂存批次：proactive 拉到的下一批 3 首歌暂存于此，
        // 等歌曲自然结束 / 用户点 next 时由 reactive 流程应用（REPLACE_PLAYLIST + curIndex=0）
        SET_FM_STAGED_BATCH(state, batch) {
            state.fmStagedBatch = Array.isArray(batch) ? batch.slice(0, 3) : null
        },
        CLEAR_FM_STAGED_BATCH(state) {
            state.fmStagedBatch = null
        },
        /** 私人漫游模式切换（mode 是互斥枚举，submode 只在 SCENE_RCMD 下有意义） */
        SET_FM_MODE(state, { mode, submode }) {
            if (mode) state.fmMode = mode
            if (submode !== undefined) state.fmSubmode = submode
        },
        SET_HEART_MODE(state, val) { state.heartMode = !!val },
        SET_HEART_BUSY(state, val) { state.heartBusy = !!val },
        /**
         * FM 是否**真的**在接管队列（由 PlayerCore 的 isPersonalFM 镜像过来）。
         * 和 fmMode 是两件事：fmMode 是"选了哪个模式"（长期偏好，持久化），
         * fmActive 是"这个模式现在是否在放"（会话态）。
         * 首页卡片用它们区分「选中」和「播放中」，否则换到心动/普通歌单后
         * 漫游卡还挂着"播放中"，会和心动卡同时亮。
         */
        SET_FM_ACTIVE(state, val) { state.fmActive = !!val },
        //playList中添加歌曲
        PUSH_PLAYLIST(state, val) {
            const list = Array.isArray(val) ? val : [val]
            /**
             * 去重口径统一为 String(id)：
             *  - 接口有的给 number（搜索/歌单），有的给 string（云盘、部分推荐流），
             *    原来用 `id ===` 严格比较，同一首歌会进队列两次；
             *  - 批量加入原来是 findIndex 套 forEach（O(n×m)），整张 1000 首的歌单
             *    加进 1000 首的队列要百万级比较。这里先用 Set 建索引，O(n+m)。
             */
            const seen = new Set()
            state.currentPlaylist.forEach(t => {
                if (t && t.id != null) seen.add(String(t.id))
            })
            list.forEach(t => {
                if (!t || t.id == null) return
                const key = String(t.id)
                if (seen.has(key)) return
                seen.add(key)
                state.currentPlaylist.push(t)
            })
        },
        //替换播放列表
        REPLACE_PLAYLIST(state, val) {
            if (Array.isArray(val)) {
                /**
                 * 必须拷贝：调用方经常把页面自己的数组直接传进来（歌单详情「播放全部」
                 * 传的就是 ListDetail.songs）。共享引用时，页面后续 push / splice
                 * 会连带改掉队列——实测「播放全部后继续下滑加载第二页」会让队列
                 * 静默多出 50 首，「管理模式里移出一首歌」会把它从队列里一起删掉。
                 */
                state.currentPlaylist = val.slice()
            } else {//添加一首
                state.currentPlaylist = [val]
            }
        }
    },
    state: {
        //正在播放的歌曲列表
        currentPlaylist: [],
        // FM 暂存批次（详见 SET_FM_STAGED_BATCH）
        fmStagedBatch: null,
        // 私人漫游模式：DEFAULT / FAMILIAR / EXPLORE / SCENE_RCMD
        // 供 PersonalFM 拉批时读取、由 FmRoamRow 写入（两者解耦，靠这个字段通信）
        fmMode: 'DEFAULT',
        // SCENE_RCMD 时生效的场景键（运动/专注/助眠…）
        fmSubmode: 'EXERCISE',
        // FM 当前是否在放：由 PlayerCore 的 isPersonalFM 单向镜像（见 SET_FM_ACTIVE）
        fmActive: false,
        // 心动模式是否接管队列来源（与私人 FM 互斥，两者都要决定"下一首从哪来"）
        // 放在 store 而不是 PlayerCore 的 data：首页的入口卡片要读它显示状态
        heartMode: false,
        // 取流中：入口卡片要置灰并给文字反馈，避免连点
        heartBusy: false,
    },
}