import pubsub from "pubsub-js";

export default {
    namespaced: true,//开启命名空间
    actions: {
        playAllTracks(context, list) {
            /*//普通类型，先更新私人FM状态
            context.state.isPersonalFM = false*/
            context.commit("REPLACE_PLAYLIST", list)

        /*    if (context.state.isPersonalFM) {
                context.commit("REPLACE_PLAYLIST", list)
            } else {
                //先添加
                context.commit("PUSH_PLAYLIST", list)
            }*/
            //播放所有歌曲
            //subscribe in PlayCore.vue
            pubsub.publish('playAll')
            // Vue.$bus.$emit("playAllSong", "random")
        },
        pushAllTracks(context, list) {
            //仅添加
            context.commit("PUSH_PLAYLIST", list)
        }
    },
    mutations: {
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
                state.currentPlaylist.push(val)
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
        isPersonalFM: false,
    },
}