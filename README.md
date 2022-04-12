## Vue-router

vue2x对应Vue-router3x

## axios

```js
import axios from "axios";

Vue.prototype.$axios = axios
axios.defaults.baseURL = 'https://netease-cloud-music-api-nu-rosy.vercel.app'
```

## Timeline

- 初始化项目，写好基本路由结构以及用elementUI布置基本框架 <2022年4月7日>
- 部署API到vercel，引入并配置axios，引入sass，配置好banner部分 <2022年4月8日>
- 首页HomePage结构优化，采用grid布局，不会发生结构混乱问题，定义全局class样式(`gridLayout`)，加上之后自动采用grid布局；对于CategoryPage，是采用**点击按钮更新当前组件数据并重新渲染**还是**利用编程式路由导航直接跳转组件**，最终选择了后者。<2022年4月9日>
- 体验到用跳转组件的好处了，因为数据上CategoryPage中不同的页面有不同的数据结构，因此并没有办法做到用通用的模板进行渲染；elementUI的[InfiniteScroll 无限滚动](https://element.eleme.cn/#/zh-CN/component/infiniteScroll#infinitescroll-wu-xian-gun-dong)感觉不太好用，存在自动调用`load()`的BUG，除非给container设置固定的宽高，但实际上一般不会那么做的。<2022年4月11日>

 
