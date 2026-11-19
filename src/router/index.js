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
const ListDetail = () => import(/* webpackChunkName: "page-list-detail" */ "@/pages/ListDetail");
const AlbumDetail = () => import(/* webpackChunkName: "page-album-detail" */ "@/pages/AlbumDetail");
const ArtistDetail = () => import(/* webpackChunkName: "page-artist-detail" */ "@/pages/artist/ArtistDetail");
const ArtistAllSongs = () => import(/* webpackChunkName: "page-artist-songs" */ "@/pages/artist/ArtistAllSongs");
const ArtistAllAlbums = () => import(/* webpackChunkName: "page-artist-albums" */ "@/pages/artist/ArtistAllAlbums");
const ArtistAllMvs = () => import(/* webpackChunkName: "page-artist-mvs" */ "@/pages/artist/ArtistAllMvs");
const mvPlay = () => import(/* webpackChunkName: "page-mv" */ "@/pages/mvPlay");
const VideoPlay = () => import(/* webpackChunkName: "page-video" */ "@/pages/VideoPlay");
const SearchResult = () => import(/* webpackChunkName: "page-search" */ "@/pages/SearchResult");
const DailySongs = () => import(/* webpackChunkName: "page-daily-songs" */ "@/pages/DailySongs");
const Blacklist = () => import(/* webpackChunkName: "page-blacklist" */ "@/pages/Blacklist");
const UserDetail = () => import(/* webpackChunkName: "page-user-detail" */ "@/pages/UserDetail");
const AnnualReport = () => import(/* webpackChunkName: "page-annual" */ "@/pages/AnnualReport");
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
    /**
     * 路径命名约定（v1.4.0 起，加路由前先看这里）：
     * 1. path 全小写，多词用 `-` 连接；只写资源名，不带 Detail / All / Res / Play 这类页面角色词
     *    —— `/playlist` `/album` `/artist` `/artist/songs` `/search/albums`
     * 2. 归属关系用嵌套表达（`/artist/songs`），集合用复数（`/explore/playlists`、`/search/mvs`）
     * 3. 参数一律走 query（见 ARCHITECTURE_DECISIONS 决策 4），键名固定 id / uid / keyword
     * 4. 带子路由的父级必须有 redirect 到默认子级，不允许「tab 在、内容区空」的空壳
     * 5. route name 保持 camelCase，可以晚于 path 改名；但不要再往 path 里塞 UI 词
     * 6. 已发布的旧地址放到文件末尾「兼容旧地址」区，用 redirect 兜住，别直接删
     */
    routes: [
        {path: '/', component: HomePage, meta: {level: 1}},
        {
            path: '/explore',
            component: ExplorePage,
            meta: {level: 1, title: '发现'},
            // 父级带子路由时不留空壳：/explore 直接落到「全部歌单」
            redirect: {name: 'allList'},
            children: [
                {name: "allList", path: 'playlists/all', component: AllList},
                {name: "boutique", path: 'playlists/boutique', component: BoutiqueList},
                {name: "leaderBoard", path: 'leaderboard', component: LeaderBoard},
                //歌手榜
                {name: "artistList", path: 'artists', component: ArtistList},

                {name: "mvList", path: 'mvs', component: MvList},
                {name: "videoList", path: 'videos', component: VideoList},
            ]
        },
        // 「我的」独立成 /me：/user 让给用户详情页（老书签 /user 会在末尾兜回这里）
        {path: '/me', name: 'me', component: UserPage, meta: {level: 1, title: '我的'}},
        {
            path: '/playlist',
            name: 'listDetail',
            component: ListDetail,
            meta: {level: 2, title: '歌单详情'},
            props($route) {
                return {id: $route.query.id}
            }
        },
        {
            path: '/album',
            name: 'albumDetail',
            component: AlbumDetail,
            meta: {level: 2, title: '专辑详情'},
            props($route) {
                return {id: $route.query.id}
            }
        },
        {
            path: '/artist',
            name: 'artistDetail',
            component: ArtistDetail,
            meta: {level: 2, title: '歌手详情'},
            props($route) {
                return {id: $route.query.id}
            }
        },
        {
            path: '/artist/songs',
            name: 'artistAllSongs',
            component: ArtistAllSongs,
            meta: {level: 2, title: '全部歌曲'},
            props($route) {
                return {id: $route.query.id}
            }
        },
        {
            path: '/artist/albums',
            name: 'artistAllAlbums',
            component: ArtistAllAlbums,
            meta: {level: 2, title: '全部专辑'},
            props($route) {
                return {id: $route.query.id}
            }
        },
        {
            path: '/artist/mvs',
            name: 'artistAllMvs',
            component: ArtistAllMvs,
            meta: {level: 2, title: '全部MV'},
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
            path: '/search',
            name: 'search',
            component: SearchResult,
            meta: {level: 1, title: '搜索'},
            // 没带分类的 /search 默认落到「歌曲」，别只渲染一排 tab
            redirect: to => ({name: 'trackList', query: to.query}),
            children: [
                {
                    name: "albumRes", path: "albums", component: AlbumRes, props($route) {
                        return {keyword: $route.query.keyword}
                    },
                },
                {
                    name: "artistRes", path: "artists", component: ArtistRes, props($route) {
                        return {keyword: $route.query.keyword}
                    },
                },
                {
                    name: "lyricRes", path: "lyrics", component: LyricRes, props($route) {
                        return {keyword: $route.query.keyword}
                    },
                },
                {
                    name: "mvRes", path: "mvs", component: MvRes, props($route) {
                        return {keyword: $route.query.keyword}
                    },
                },
                {
                    name: "playlistRes", path: "playlists", component: PlaylistRes, props($route) {
                        return {keyword: $route.query.keyword}
                    },
                },
                {
                    name: "trackList", path: "tracks", component: TrackRes, props($route) {
                        return {keyword: $route.query.keyword}
                    },
                },
                {
                    name: "userRes", path: "users", component: UserRes, props($route) {
                        return {keyword: $route.query.keyword}
                    },
                },
                {
                    name: "videoRes", path: "videos", component: VideoRes, props($route) {
                        return {keyword: $route.query.keyword}
                    },
                },
                {
                    name: "voiceRes", path: "voices", component: VoiceRes, props($route) {
                        return {keyword: $route.query.keyword}
                    },
                },
            ],
            props($route) {
                return {keyword: $route.query.keyword}
            },
        },
        {
            path: '/user',
            name: "userDetail",
            component: UserDetail,
            meta: {level: 2, title: '用户详情'},
            props($route) {
                return {uid: $route.query.uid}
            },
            /**
             * /user 原来是「我的」（v1.4.0 挪到 /me）。老书签/老链接里的 /user 没有 uid，
             * 直接退回到 /me，而不是落在一个「用户不存在」的空页上。
             */
            beforeEnter(to, from, next) {
                if (to.query.uid) next()
                else next({path: '/me', replace: true})
            },
        },
        {path: '/daily', name: "dailySongs", component: DailySongs, props: true, meta: {level: 2, title: '每日推荐'}},
        // 音乐黑名单：屏蔽歌曲/歌手的管理页，入口在头像菜单
        {path: '/blacklist', name: "blacklist", component: Blacklist, meta: {level: 2, title: '音乐黑名单'}},
        // 年度听歌报告：本人数据，页面内部自行判断登录态
        {path: '/annual', name: "annualReport", component: AnnualReport, meta: {level: 2, title: '年度听歌报告'}},

        /**
         * ---- 兼容旧地址（v1.4.0 路由改名）----
         * 旧链接/书签/外部引用仍然可用，地址栏会换成新路径。
         * redirect 写成函数是为了把 query 一起带过去（id / uid / keyword / tag）。
         * 等确认没人再用这些地址，整块删掉即可。
         */
        {path: '/listDetail', redirect: to => ({name: 'listDetail', query: to.query})},
        {path: '/albumDetail', redirect: to => ({name: 'albumDetail', query: to.query})},
        {path: '/artistDetail', redirect: to => ({name: 'artistDetail', query: to.query})},
        {path: '/artistAllSongs', redirect: to => ({name: 'artistAllSongs', query: to.query})},
        {path: '/artistAllAlbums', redirect: to => ({name: 'artistAllAlbums', query: to.query})},
        {path: '/user-detail', redirect: to => ({name: 'userDetail', query: to.query})},
        {path: '/daily-songs', redirect: to => ({name: 'dailySongs', query: to.query})},
        {path: '/explore/leaderBoard', redirect: to => ({name: 'leaderBoard', query: to.query})},
        {path: '/explore/mvList', redirect: to => ({name: 'mvList', query: to.query})},
        {path: '/explore/videoList', redirect: to => ({name: 'videoList', query: to.query})},
        // 旧的两级歌单目录（/explore/playlist/*）拍平成 /explore/playlists/*
        {path: '/explore/playlist', redirect: to => ({name: 'allList', query: to.query})},
        {path: '/explore/playlist/all', redirect: to => ({name: 'allList', query: to.query})},
        {path: '/explore/playlist/boutique', redirect: to => ({name: 'boutique', query: to.query})},
        // 搜索九个子视图：旧路径就是路由 name（/search/albumRes → /search/albums）
        ...['albumRes', 'artistRes', 'lyricRes', 'mvRes', 'playlistRes', 'trackList', 'userRes', 'videoRes', 'voiceRes']
            .map(name => ({path: `/search/${name}`, redirect: to => ({name, query: to.query})})),

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
        const sameSearch = to.matched.some(record => record.name === 'search') &&
            from.matched.some(record => record.name === 'search') &&
            to.query.keyword === from.query.keyword
        if (sameSearch) return false
        if (to.path === from.path) return false
        return {x: 0, y: 0}
    }
})

router.beforeEach((to, from, next) => {
    to.meta.hasHistory = !!from.name
    /**
     * 地址规范化：vue-router 默认大小写不敏感、尾斜杠可选，同一个页面会被多种写法命中
     * （/explore/leaderBoard 与 /explore/leaderboard、/search 与 /search/），地址栏却原样保留用户输入，
     * 分享/收藏/统计里于是出现多个 URL。这里按命中的 name 反查规范路径，不一致就 replace 一次。
     * 兜底路由（*）不参与：它的规范路径算不出来，参与会变成死循环。
     */
    if (to.name && to.name !== 'notFound') {
        const canonical = router.resolve({name: to.name, params: to.params, query: to.query, hash: to.hash}).route
        if (canonical.path !== to.path) {
            next({path: canonical.path, query: to.query, hash: to.hash, replace: true})
            return
        }
    }
    next()
})

router.afterEach((to) => {
    const t = to.meta && to.meta.title
    setRouteTitle(t ? `${t} · ${BASE}` : BASE)
})

export default router
