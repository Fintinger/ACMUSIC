import VueRouter from "vue-router";
import HomePage from "@/pages/HomePage";
import CategoryPage from "@/pages/CategoryPage";
import UserPage from "@/pages/UserPage";

import cpRecommendedPlaylist from "@/pages/cpRecommendedPlaylist";
import cpBoutiquePlaylist from "@/pages/cpBoutiquePlaylist";
import cpLatestMV from "@/pages/cpLatestMV";
import cpAllList from "@/pages/cpAllList";

export default new VueRouter({
    routes: [
        {path: '/home', component: HomePage},
        {
            path: '/category',
            component: CategoryPage,
            children: [
                {name: "recommendedPlaylist", path: 'recommendedPlaylist', component: cpRecommendedPlaylist},
                {name: "boutiquePlaylist", path: 'boutiquePlaylist', component: cpBoutiquePlaylist},
                {name: "latestMV", path: 'latestMV', component: cpLatestMV},
                {name: "allList", path: 'allList', component: cpAllList}
            ]
        },
        {path: '/user', component: UserPage},
    ]
})