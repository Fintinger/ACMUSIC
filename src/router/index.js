import VueRouter from "vue-router";
import { setRouteTitle, BASE } from "@/utils/title";

/**
 * 路由级代码分割：页面组件改为动态 import，首屏只加载首页那一个 chunk。
 *
 * - 统一用 `webpackChunkName` 命名，产物里能看到 page-home / page-list-detail 这类可读文件名
 * - 与 keep-alive 的关系：异步只影响首次进入时的解析，缓存的是解析后的组件实例；
 *   App.vue 里 reapEvictedPages() 依赖的 `vnode.data.keepAlive` / `keepAlive.keys` 不受影响
 * - NotFound 保持动态也能用，但兜底页要立刻可见，所以和首页一样不额外加依赖
 */
const HomePage = () => import(/* webpackChunkName: "page-home" */ "@/pages/HomePage");
const ExplorePage = () => import(/* webpackChunkName: "page-explore" */ "@/pages/ExplorePage");
const UserPage = () => import(/* webpackChunkName: "page-user" */ "@/pages/UserPage");
const Playlist = () => import(/* webpackChunkName: "page-playlist" */ "@/pages/Playlist");
const ListDetail = () => import(/* webpackChunkName: "page-list-detail" */ "@/pages/ListDetail");
const AlbumDetail = () => import(/* webpackChunkName: "page-album-detail" */ "@/pages/AlbumDetail");
const ArtistDetail = () => import(/* webpackChunkName: "page-artist-detail" */ "@/pages/artist/ArtistDetail");
const ArtistAllSongs = () => import(/* webpackChunkName: "page-artist-songs" */ "@/pages/artist/ArtistAllSongs");
const mvPlay = () => import(/* webpackChunkName: "page-mv" */ "@/pages/mvPlay");
const VideoPlay = () => import(/* webpackChunkName: "page-video" */ "@/pages/VideoPlay");
const SearchResult = () => import(/* webpackChunkName: "page-search" */ "@/pages/SearchResult");
const DailySongs = () => import(/* webpackChunkName: "page-daily-songs" */ "@/pages/DailySongs");
const UserDetail = () => import(/* webpackChunkName: "page-user-detail" */ "@/pages/UserDetail");
const NotFound = () => import(/* webpackChunkName: "page-not-found" */ "@/pages/NotFound");

// 发现页子路由：合并成一个 chunk，进「发现」时一次取回，切 tab 不再等
const AllList = () => import(/* webpackChunkName: "page-explore-subs" */ "@/pages/explorePage/playlist/AllList");
const BoutiqueList = () => import(/* webpackChunkName: "page-explore-subs" */ "@/pages/explorePage/playlist/BoutiqueList");
const MvList = () => import(/* webpackChunkName: "page-explore-subs" */ "@/pages/explorePage/MvList");
const LeaderBoard = () => import(/* webpackChunkName: "page-explore-subs" */ "@/pages/explorePage/LeaderBoard/LeaderBoard");
const ArtistList = () => import(/* webpackChunkName: "page-explore-subs" */ "@/pages/explorePage/LeaderBoard/ArtistList");
const VideoList = () => import(/* webpackChunkName: "page-explore-subs" */ "@/pages/explorePage/VideoList");

// 搜索结果 9 个子视图：同一 chunk，搜索一次全取回
const AlbumRes = () => import(/* webpackChunkName: "page-search-subs" */ "@/pages/search/AlbumRes");
const ArtistRes = () => import(/* webpackChunkName: "page-search-subs" */ "@/pages/search/ArtistRes");
const LyricRes = () => import(/* webpackChunkName: "page-search-subs" */ "@/pages/search/LyricRes");
const MvRes = () => import(/* webpackChunkName: "page-search-subs" */ "@/pages/search/MvRes");
const PlaylistRes = () => import(/* webpackChunkName: "page-search-subs" */ "@/pages/search/PlaylistRes");
const TrackRes = () => import(/* webpackChunkName: "page-search-subs" */ "@/pages/search/TrackRes");
const UserRes = () => import(/* webpackChunkName: "page-search-subs" */ "@/pages/search/UserRes");
const VideoRes = () => import(/* webpackChunkName: "page-search-subs" */ "@/pages/search/VideoRes");
const VoiceRes = () => import(/* webpackChunkName: "page-search-subs" */ "@/pages/search/VoiceRes");

const originalPush = VueRouter.prototype.push
VueRouter.prototype.push = function push(location) {
    return originalPush.call(this, location).catch(err => err)
}

const router = new VueRouter({
    // 切到 history 模式：URL 从 /#/path 变成 /path（更干净、SEO 友好）
    // Vercel 默认对 SPA 项目支持 fallback，无需额外配置
    mode: 'history',
    routes: [
        {path: '/', component: HomePage, meta: {level: 1}},
        {
            path: '/explore',
            component: ExplorePage,
            meta: {level: 1, title: '发现'},
            children: [
                {
                    name: "playlist", path: 'playlist', component: Playlist, children: [
                        {name: "allList", path: 'all', component: AllList},
                        {name: "boutique", path: 'boutique', component: BoutiqueList},
                    ]
                },
                {name: "leaderBoard", path: 'leaderBoard', component: LeaderBoard},
                //歌手榜
                {name: "artistList", path: 'artists', component: ArtistList},

                {name: "mvList", path: 'mvList', component: MvList},
                {name: "videoList", path: 'videoList', component: VideoList},
            ]
        },
        {path: '/user', component: UserPage, meta: {level: 1, title: '我的'}},
        {
            path: '/listDetail',
            name: 'listDetail',
            component: ListDetail,
            meta: {level: 2, title: '歌单详情'},
            props($route) {
                return {id: $route.query.id}
            }
        },
        {
            path: '/albumDetail',
            name: 'albumDetail',
            component: AlbumDetail,
            meta: {level: 2, title: '专辑详情'},
            props($route) {
                return {id: $route.query.id}
            }
        },
        {
            path: '/artistDetail',
            name: 'artistDetail',
            component: ArtistDetail,
            meta: {level: 2, title: '歌手详情'},
            props($route) {
                return {id: $route.query.id}
            }
        },
        {
            path: '/artistAllSongs',
            name: 'artistAllSongs',
            component: ArtistAllSongs,
            meta: {level: 2, title: '全部歌曲'},
            props($route) {
                return {id: $route.query.id}
            }
        },
        {
            path: '/mv',
            name: 'mvPlay',
            component: mvPlay,
            meta: {level: 2, title: 'MV'},
            props($route) {
                return {id: $route.query.id}
            }
        },
        {
            path: '/video',
            name: 'videoPlay',
            component: VideoPlay,
            meta: {level: 2, title: '视频'},
            props($route) {
                return {id: $route.query.id}
            }
        },
        {
            path: '/search/',
            name: 'search',
            component: SearchResult,
            meta: {level: 1, title: '搜索'},
            children: [
                {
                    name: "albumRes", path: "albumRes", component: AlbumRes, props($route) {
                        return {keyword: $route.query.keyword}
                    },
                },
                {
                    name: "artistRes", path: "artistRes", component: ArtistRes, props($route) {
                        return {keyword: $route.query.keyword}
                    },
                },
                {
                    name: "lyricRes", path: "lyricRes", component: LyricRes, props($route) {
                        return {keyword: $route.query.keyword}
                    },
                },
                {
                    name: "mvRes", path: "mvRes", component: MvRes, props($route) {
                        return {keyword: $route.query.keyword}
                    },
                },
                {
                    name: "playlistRes", path: "playlistRes", component: PlaylistRes, props($route) {
                        return {keyword: $route.query.keyword}
                    },
                },
                {
                    name: "trackList", path: "trackList", component: TrackRes, props($route) {
                        return {keyword: $route.query.keyword}
                    },
                },
                {
                    name: "userRes", path: "userRes", component: UserRes, props($route) {
                        return {keyword: $route.query.keyword}
                    },
                },
                {
                    name: "videoRes", path: "videoRes", component: VideoRes, props($route) {
                        return {keyword: $route.query.keyword}
                    },
                },
                {
                    name: "voiceRes", path: "voiceRes", component: VoiceRes, props($route) {
                        return {keyword: $route.query.keyword}
                    },
                },
            ],
            props($route) {
                return {keyword: $route.query.keyword}
            },
        },
        {
            path: '/user-detail', name: "userDetail", component: UserDetail, meta: {level: 2, title: '用户详情'}, props($route) {
                return {uid: $route.query.uid}
            },
        },
        {path: '/daily-songs', name: "dailySongs", component: DailySongs, props: true, meta: {level: 2, title: '每日推荐'}},
        // 兜底：history 模式下任何未匹配的 URL 都落到这里，避免 router-view 空转白屏。
        // 必须放最后 —— vue-router 3 按定义顺序匹配，'*' 会吃掉后面所有路由。
        {path: '*', name: "notFound", component: NotFound, meta: {level: 1, title: '页面不存在'}},
    ],
    /**
     * 滚动位置恢复：
     * - 浏览器前进/后退 → 回到离开时的位置（savedPosition 由 vue-router 提供）
     * - 同 path 仅 query 变化（歌单/专辑/歌手详情切 id）→ 保持不动，避免视觉跳动
     * - 其余新导航 → 回顶部
     */
    scrollBehavior(to, from, savedPosition) {
        if (savedPosition) return savedPosition
        if (to.path === from.path) return false
        return {x: 0, y: 0}
    }
})

router.beforeEach((to, from, next) => {
    to.meta.hasHistory = !!from.name
    next()
})

router.afterEach((to) => {
    const t = to.meta && to.meta.title
    setRouteTitle(t ? `${t} · ${BASE}` : BASE)
})

export default router