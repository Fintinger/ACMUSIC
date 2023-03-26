import VueRouter from "vue-router";
import HomePage from "@/pages/HomePage";
import ExplorePage from "@/pages/ExplorePage";
import UserPage from "@/pages/UserPage";
import Playlist from "@/pages/Playlist";
import ListDetail from "@/pages/ListDetail";
import AlbumDetail from "@/pages/AlbumDetail";
import ArtistDetail from "@/pages/artist/ArtistDetail";
import ArtistAllSongs from "@/pages/artist/ArtistAllSongs";
import mvPlay from "@/pages/mvPlay";
import VideoPlay from "@/pages/VideoPlay";
import SearchResult from "@/pages/SearchResult";
import DailySongs from "@/pages/DailySongs";

import AllList from "@/pages/explorePage/playlist/AllList";
import BoutiqueList from "@/pages/explorePage/playlist/BoutiqueList";
import MvList from "@/pages/explorePage/MvList";
import LeaderBoard from "@/pages/explorePage/LeaderBoard/LeaderBoard";
import ArtistList from "@/pages/explorePage/LeaderBoard/ArtistList";
import VideoList from "@/pages/explorePage/VideoList";

import AlbumRes from "@/pages/search/AlbumRes";
import ArtistRes from "@/pages/search/ArtistRes";
import LyricRes from "@/pages/search/LyricRes";
import MvRes from "@/pages/search/MvRes";
import PlaylistRes from "@/pages/search/PlaylistRes";
import TrackRes from "@/pages/search/TrackRes";
import UserRes from "@/pages/search/UserRes";
import VoiceRes from "@/pages/search/VoiceRes";
import VideoRes from "@/pages/search/VideoRes";
import UserDetail from "@/pages/UserDetail";

const originalPush = VueRouter.prototype.push
VueRouter.prototype.push = function push(location) {
    return originalPush.call(this, location).catch(err => err)
}

export default new VueRouter({
    routes: [
        {path: '/', component: HomePage},
        {
            path: '/explore',
            component: ExplorePage,
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
        {path: '/user', component: UserPage},
        {
            path: '/listDetail',
            name: 'listDetail',
            component: ListDetail,
            props($route) {
                return {id: $route.query.id}
            }
        },
        {
            path: '/albumDetail',
            name: 'albumDetail',
            component: AlbumDetail,
            props($route) {
                return {id: $route.query.id}
            }
        },
        {
            path: '/artistDetail',
            name: 'artistDetail',
            component: ArtistDetail,
            props($route) {
                return {id: $route.query.id}
            }
        },
        {
            path: '/artistAllSongs',
            name: 'artistAllSongs',
            component: ArtistAllSongs,
            props($route) {
                return {id: $route.query.id}
            }
        },
        {
            path: '/mv',
            name: 'mvPlay',
            component: mvPlay,
            props($route) {
                return {id: $route.query.id}
            }
        },
        {
            path: '/video',
            name: 'videoPlay',
            component: VideoPlay,
            props($route) {
                return {id: $route.query.id}
            }
        },
        {
            path: '/search/',
            name: 'search',
            component: SearchResult,
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
            path: '/user-detail', name: "userDetail", component: UserDetail, props($route) {
                return {uid: $route.query.uid}
            },
        },
        {path: '/daily-songs', name: "dailySongs", component: DailySongs, props: true},
    ]
})