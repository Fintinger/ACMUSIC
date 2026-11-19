import Vue from 'vue'
import * as blockApi from '@/api/Block'

const CACHE_KEY = 'acmusic_blocklist_cache_v1'

/**
 * 屏蔽名单（音乐黑名单）
 *
 * 数据源是账号级的官方接口，本地只做两件事：
 *  1. localStorage 缓存，冷启动先按缓存过滤，避免列表先渲染出来再消失；
 *  2. 写操作乐观更新，接口失败再回滚。
 *
 * 判定口径与官方客户端一致：歌曲 id 命中 songIds，或该歌任一歌手 id 命中 artistIds。
 * 接口只返回 id，name/at 是本地补的元数据（用于管理页在详情还没拉回来时先显示个大概）。
 */
function readCache() {
    try {
        const raw = localStorage.getItem(CACHE_KEY)
        if (!raw) return null
        const d = JSON.parse(raw)
        if (!d || typeof d !== 'object') return null
        return {
            songIds: d.songIds && typeof d.songIds === 'object' ? d.songIds : {},
            artistIds: d.artistIds && typeof d.artistIds === 'object' ? d.artistIds : {},
        }
    } catch (e) {
        return null
    }
}

function writeCache(state) {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            songIds: state.songIds,
            artistIds: state.artistIds,
            ts: Date.now(),
        }))
    } catch (e) { /* 隐私模式 / 超额，忽略 */ }
}

export default {
    namespaced: true,
    state: {
        // { "123": { name: '', at: 0 } }
        songIds: {},
        artistIds: {},
        // 是否已经成功从接口同步过一次（决定管理页要不要提示"未同步"）
        loaded: false,
        loading: false,
        // 写操作进行中的 key（`song:123`），用于禁按钮防连点
        pending: {},
        /**
         * 名单版本号：每次增删自增。
         * Vue 2 对 `Vue.set` 不会替换对象引用，浅 watch 捕捉不到，
         * PlayerCore 靠这个数字知道"名单变了，检查一下当前这首还在不在"。
         */
        rev: 0,
    },
    getters: {
        songCount: state => Object.keys(state.songIds).length,
        artistCount: state => Object.keys(state.artistIds).length,
        total: (state, getters) => getters.songCount + getters.artistCount,
        isSongBlocked: state => id => id != null && !!state.songIds[String(id)],
        isArtistBlocked: state => id => id != null && !!state.artistIds[String(id)],
        /**
         * 一首歌是否被屏蔽。
         * 字段口径不统一（ar / artists / artist），这里全部兼容；恢复播放时老存档的 ar
         * 可能只有 name 没有 id，那种情况判断不出来，按"未屏蔽"处理（宁可不拦，不要误伤）。
         */
        isTrackBlocked: (state) => (track) => {
            if (!track || track.id == null) return false
            if (state.songIds[String(track.id)]) return true
            let artists = track.ar || track.artists || track.artist || []
            if (!Array.isArray(artists)) artists = artists ? [artists] : []
            return artists.some(a => a && a.id != null && !!state.artistIds[String(a.id)])
        },
    },
    mutations: {
        SET_LOADING(state, v) { state.loading = !!v },
        SET_LOADED(state, v) { state.loaded = !!v },
        /** 用接口返回的 id 列表整体替换；已有的 name/at 元数据保留 */
        REPLACE_LIST(state, { songIdList, artistIdList }) {
            const merge = (ids, prev) => {
                const next = {}
                ;(ids || []).forEach(id => {
                    const key = String(id)
                    next[key] = prev[key] || { name: '', at: 0 }
                })
                return next
            }
            state.songIds = merge(songIdList, state.songIds)
            state.artistIds = merge(artistIdList, state.artistIds)
            state.rev++
        },
        ADD_ITEMS(state, { type, items }) {
            const bucket = type === 'artist' ? 'artistIds' : 'songIds'
            items.forEach(it => {
                Vue.set(state[bucket], String(it.id), { name: it.name || '', at: Date.now() })
            })
            state.rev++
        },
        REMOVE_ITEMS(state, { type, ids }) {
            const bucket = type === 'artist' ? 'artistIds' : 'songIds'
            ids.forEach(id => { Vue.delete(state[bucket], String(id)) })
            state.rev++
        },
        REPLACE_ALL(state, { songIds, artistIds }) {
            state.songIds = songIds || {}
            state.artistIds = artistIds || {}
            state.rev++
        },
        SET_PENDING(state, { key, v }) {
            if (v) Vue.set(state.pending, key, true)
            else Vue.delete(state.pending, key)
        },
    },
    actions: {
        /**
         * 冷启动入口：先用缓存垫上（列表不闪），再拉接口校正。
         * 未登录时接口返回 301，request 层会派发 api:unauthorized，但 main.js 里
         * 第一个判断就是"没登录直接 return"，不会弹失效提示，可以放心调。
         */
        init({ state, commit, dispatch }) {
            if (state.loaded || state.loading) return Promise.resolve()
            const cached = readCache()
            if (cached) commit('REPLACE_LIST', cached)
            return dispatch('fetch')
        },
        fetch({ state, commit }) {
            if (state.loading) return Promise.resolve()
            commit('SET_LOADING', true)
            return blockApi.fetchList()
                .then(res => {
                    const d = (res && res.data && res.data.data) || {}
                    if (res && res.data && res.data.code === 200) {
                        commit('REPLACE_LIST', {
                            songIdList: d.songIdList || [],
                            artistIdList: d.artistIdList || [],
                        })
                        commit('SET_LOADED', true)
                        writeCache(state)
                    }
                })
                .catch(() => { /* 网络/未登录：保持缓存内容，不阻塞页面 */ })
                .finally(() => commit('SET_LOADING', false))
        },
        /** 屏蔽歌曲。命中缓存则直接返回 false，不重复提交 */
        blockSong({ state, commit }, track) {
            if (!track || track.id == null) return Promise.resolve(false)
            const id = String(track.id)
            if (state.songIds[id]) return Promise.resolve(false)
            const key = 'song:' + id
            commit('ADD_ITEMS', { type: 'song', items: [{ id, name: track.name || '' }] })
            writeCache(state)
            commit('SET_PENDING', { key, v: true })
            return blockApi.add('song', id)
                .then(res => {
                    if (res && res.data && res.data.code === 200) return true
                    throw new Error((res && res.data && res.data.message) || '屏蔽失败')
                })
                .catch(err => {
                    commit('REMOVE_ITEMS', { type: 'song', ids: [id] })
                    writeCache(state)
                    throw err
                })
                .finally(() => commit('SET_PENDING', { key, v: false }))
        },
        /** 屏蔽歌手。该歌手的所有歌曲（含合唱）都会被播放层跳过 */
        blockArtist({ state, commit }, artist) {
            if (!artist || artist.id == null) return Promise.resolve(false)
            const id = String(artist.id)
            if (state.artistIds[id]) return Promise.resolve(false)
            const key = 'artist:' + id
            commit('ADD_ITEMS', { type: 'artist', items: [{ id, name: artist.name || '' }] })
            writeCache(state)
            commit('SET_PENDING', { key, v: true })
            return blockApi.add('artist', id)
                .then(res => {
                    if (res && res.data && res.data.code === 200) return true
                    throw new Error((res && res.data && res.data.message) || '屏蔽失败')
                })
                .catch(err => {
                    commit('REMOVE_ITEMS', { type: 'artist', ids: [id] })
                    writeCache(state)
                    throw err
                })
                .finally(() => commit('SET_PENDING', { key, v: false }))
        },
        /** 解除歌曲屏蔽 */
        unblockSong({ state, commit }, id) {
            const key = String(id)
            const item = state.songIds[key]
            if (!item) return Promise.resolve(false)
            const backup = { [key]: item }
            commit('REMOVE_ITEMS', { type: 'song', ids: [key] })
            writeCache(state)
            return blockApi.remove('song', key)
                .then(res => {
                    if (res && res.data && res.data.code === 200) return true
                    throw new Error('解除失败')
                })
                .catch(err => {
                    commit('ADD_ITEMS', {
                        type: 'song',
                        items: [{ id: key, name: (backup[key] && backup[key].name) || '' }],
                    })
                    writeCache(state)
                    throw err
                })
        },
        /** 解除歌手屏蔽 */
        unblockArtist({ state, commit }, id) {
            const key = String(id)
            const item = state.artistIds[key]
            if (!item) return Promise.resolve(false)
            const backup = { [key]: item }
            commit('REMOVE_ITEMS', { type: 'artist', ids: [key] })
            writeCache(state)
            return blockApi.remove('artist', key)
                .then(res => {
                    if (res && res.data && res.data.code === 200) return true
                    throw new Error('解除失败')
                })
                .catch(err => {
                    commit('ADD_ITEMS', {
                        type: 'artist',
                        items: [{ id: key, name: (backup[key] && backup[key].name) || '' }],
                    })
                    writeCache(state)
                    throw err
                })
        },
        /** 清空全部：先备份，任一请求失败整体回滚，避免本地和服务端不一致 */
        clearAll({ state, commit }) {
            const songIds = Object.keys(state.songIds)
            const artistIds = Object.keys(state.artistIds)
            if (!songIds.length && !artistIds.length) return Promise.resolve(0)
            const backup = {
                songIds: Object.assign({}, state.songIds),
                artistIds: Object.assign({}, state.artistIds),
            }
            const count = songIds.length + artistIds.length
            commit('REPLACE_ALL', {})
            writeCache(state)
            const jobs = []
            if (songIds.length) jobs.push(blockApi.remove('song', songIds))
            if (artistIds.length) jobs.push(blockApi.remove('artist', artistIds))
            return Promise.all(jobs)
                .then(resList => {
                    const bad = resList.find(r => !(r && r.data && r.data.code === 200))
                    if (bad) throw new Error('清空失败')
                    return count
                })
                .catch(err => {
                    commit('REPLACE_ALL', backup)
                    writeCache(state)
                    throw err
                })
        },
        /**
         * 退出登录时清空：名单是账号级的，留着会把上一个账号的屏蔽带到下一个账号。
         * 只清本地，不调接口（此时 cookie 已经失效了）。
         */
        reset({ commit }) {
            commit('REPLACE_ALL', {})
            commit('SET_LOADED', false)
            try { localStorage.removeItem(CACHE_KEY) } catch (e) { /* ignore */ }
        },
    },
}
