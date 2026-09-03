import pubsub from "pubsub-js";

export default {
    namespaced: true,//开启命名空间
    actions: {
        playAllTracks(context, list) {
            // isPersonalFM 已下沉到 PlayerCore（data 字段）
            // PersonalFM / HomePage / App 通过 $bus('fm-mode') 通知 PlayerCore
            context.commit("REPLACE_PLAYLIST", list)
            //播放所有歌曲
            //subscribe in PlayCore.vue
            pubsub.publish('playAll')
        },
        pushAllTracks(context, list) {
            //仅添加
            context.commit("PUSH_PLAYLIST", list)
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
        //playList中添加歌曲
        PUSH_PLAYLIST(state, val) {
            //添加多首
            if (Array.isArray(val)) {
                val.forEach(t => {
                    //如果没发现重复
                    if (state.currentPlaylist.findIndex(val => val.id === t.id) === -1) {
                        state.currentPlaylist.push(t)
                    }
                })
            } else {//添加一首
                if (state.currentPlaylist.findIndex(v => v.id === val.id) === -1) {
                    state.currentPlaylist.push(val)
                }
            }
        },
        //替换播放列表
        REPLACE_PLAYLIST(state, val) {
            if (Array.isArray(val)) {
                state.currentPlaylist = val
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
    },
}