/**
 * ACMUSIC Icon Registry
 * 统一图标映射表：业务 name -> 具体图标实现
 * 全部使用内联 SVG：24x24 网格、1.8px 圆角描边；状态图形显式填充。
 */
export default {
    palette: { type: 'svg', stroke: 'currentColor', strokeWidth: 1.8, path: 'M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1.4-3.4 1.5 1.5 0 0 1 1.1-2.6H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8z M7.5 10h.01 M10 6.5h.01 M14.5 7h.01 M17.5 10.5h.01' },
    sun: { type: 'svg', stroke: 'currentColor', strokeWidth: 1.8, path: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5L19 19 M5 19l1.5-1.5 M17.5 6.5L19 5' },
    moon: { type: 'svg', stroke: 'currentColor', strokeWidth: 1.8, path: 'M20.8 13A8.7 8.7 0 0 1 11 3.2 8.8 8.8 0 1 0 20.8 13z' },
    list: { type: 'svg', stroke: 'currentColor', strokeWidth: 1.8, path: 'M4 6h16 M4 12h16 M4 18h10' },
    listPlus: { type: 'svg', strokeWidth: 1.8, path: 'M4 6h16 M4 12h10 M4 18h10 M19 14v8 M15 18h8' },
    // 「加入歌单」：方框里一个加号。刻意不用「列表+加号」——那和 listPlus 太像，
    // 两个按钮并排时用户分不清哪个是队列、哪个是歌单
    playlistPlus: { type: 'svg', strokeWidth: 1.8, path: 'M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z M12 8.5v7 M8.5 12h7' },
    lyrics: { type: 'svg', strokeWidth: 1.8, path: 'M4 5h16 M4 10h12 M4 15h8 M4 20h8 M19 13v8 M16 16l3-3 3 3' },
    // ---- 播放器核心 ----
    // 播放三角：三个转角用二次贝塞尔收圆（原来是 r=1 的尖角，小尺寸下像锐角）。
    // 顶点仍取 (20,12)(8,4.6)(8,19.4)，控制点落在顶点上、端点沿边内收约 5px，
    // 视觉圆角≈3（24 网格）。做成实心 path 而不是描边，避免缩放时粗细漂移。
    play: { type: 'svg', class: 'ac-play1', fill: 'currentColor', stroke: 'none', path: 'M12.575 7.421 L15.854 9.443 Q20 12 15.854 14.557 L12.575 16.579 Q8 19.4 8 14.024 L8 9.976 Q8 4.6 12.575 7.421 Z' },
    // 暂停双竖条跟着做同样的圆角，避免播放/暂停切换时一个柔软一个刀切
    pause: {
        type: 'svg',
        fill: 'currentColor', stroke: 'none',
        path: 'M8.4 5h1.2a1.4 1.4 0 0 1 1.4 1.4v11.2a1.4 1.4 0 0 1-1.4 1.4H8.4A1.4 1.4 0 0 1 7 17.6V6.4A1.4 1.4 0 0 1 8.4 5zM14.4 5h1.2a1.4 1.4 0 0 1 1.4 1.4v11.2a1.4 1.4 0 0 1-1.4 1.4h-1.2a1.4 1.4 0 0 1-1.4-1.4V6.4A1.4 1.4 0 0 1 14.4 5z',
    },
    prev: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 1.8,
        path: 'M6 6v12M20 6l-8.5 6L20 18V6z',
    },
    next: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 1.8,
        path: 'M18 6v12M4 6l8.5 6L4 18V6z',
    },
    volume: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 1.8,
        path: 'M11 5L6 9H3v6h3l5 4V5z M15.5 8.5a5 5 0 0 1 0 7 M18.5 6a9 9 0 0 1 0 12',
    },
    loop: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 1.8,
        path: 'M17 2l4 4-4 4 M3 11V9a4 4 0 0 1 4-4h14 M7 22l-4-4 4-4 M21 13v2a4 4 0 0 1-4 4H3',
    },
    // ---- 四档队列策略（Lucide 几何：repeat / repeat-1 / shuffle / arrow-right-to-line）----
    // 多段 path 合并成一条 d：每段都以绝对 M 开头（Lucide 原文里的相对 m 已改写），
    // 这样单 <path> 渲染和原来的多元素完全等价。视觉与其余 Lucide 图标同族。
    loopList: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 1.8,
        path: 'M17 2l4 4-4 4 M3 11v-1a4 4 0 0 1 4-4h14 M7 22l-4-4 4-4 M21 13v1a4 4 0 0 1-4 4H3',
    },
    loopOne: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 1.8,
        path: 'M17 2l4 4-4 4 M3 11v-1a4 4 0 0 1 4-4h14 M7 22l-4-4 4-4 M21 13v1a4 4 0 0 1-4 4H3 M11 10h1v4',
    },
    shuffle: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 1.8,
        path: 'M18 14l4 4-4 4 M18 2l4 4-4 4 M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22 M2 6h1.972a4 4 0 0 1 3.6 2.2 M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45',
    },
    // 副歌模式：波形中间一段被高亮，隐喻"只播高潮段"
    chorus: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 1.8,
        path: 'M4 10v4 M8 7v10 M12 4v16 M16 8v8 M20 11v2',
    },
    // 顺序播放：向右走到底线就停（区别于"循环"的闭合箭头）
    // 顺序播放：两支横向右箭头**上下并列** = "一行一行往前推"
    // 行高 7 / 17（上下各留 7），箭头 15 长、头 3 单位（45°），18px 下两行不会粘在一起
    sequence: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 1.8,
        path: 'M4 7h15 M16 4l3 3-3 3 M4 17h15 M16 14l3 3-3 3',
    },
    // A-B 循环：两个端点夹一段，右端回指箭头隐喻"到 B 跳回 A"
    abLoop: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 1.8,
        path: 'M6 6v12 M18 6v12 M7 12h9 M13 9.5l3 2.5-3 2.5',
    },
    // 定时停止：带指针的时钟
    timer: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 1.8,
        path: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7.5V12l3.2 2',
    },
    close: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 1.8,
        path: 'M18 6L6 18M6 6l12 12',
    },
    more: {
        type: 'svg',
        fill: 'currentColor', stroke: 'none',
        path: 'M6 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm6 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm6 0a2 2 0 1 1 0 4 2 2 0 0 1 0-4z',
    },

    // ---- 箭头 ----
    arrowUp: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 1.8,
        path: 'M12 19V5M5 12l7-7 7 7',
    },
    arrowDown: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 1.8,
        path: 'M12 5v14M5 12l7 7 7-7',
    },
    arrowLeft: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 1.8,
        path: 'M19 12H5M12 19l-7-7 7-7',
    },
    arrowRight: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 1.8,
        path: 'M5 12h14M12 5l7 7-7 7',
    },

    // ---- 操作 ----
    like: { type: 'svg', class: 'ac-like', strokeWidth: 1.8, path: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z' },
    likeFill: { type: 'svg', class: 'ac-likefill', fill: 'currentColor', stroke: 'none', path: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z' },
    comment: { type: 'svg', strokeWidth: 1.8, path: 'M21 11.5a8.5 8.5 0 0 1-8.5 8.5H4l-1 1V11.5a9 9 0 0 1 18 0z M7 9h10 M7 13h7' },
    search: { type: 'svg', strokeWidth: 1.8, path: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z M15.5 15.5L21 21' },
    share: { type: 'svg', strokeWidth: 1.8, path: 'M12 15V3 M7.5 7.5L12 3l4.5 4.5 M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8' },
    radio: { type: 'svg', strokeWidth: 1.8, path: 'M12 3v12 M8 7a6 6 0 0 0 0 8 M16 7a6 6 0 0 1 0 8 M5 4a10 10 0 0 0 0 14 M19 4a10 10 0 0 1 0 14 M8 21l4-6 4 6' },
    loader: { type: 'svg', strokeWidth: 1.8, path: 'M21 12a9 9 0 1 1-9-9' },
    male: { type: 'svg', strokeWidth: 1.8, path: 'M10 21a7 7 0 1 0 0-14 7 7 0 0 0 0 14z M15 9l6-6 M15 3h6v6' },
    female: { type: 'svg', strokeWidth: 1.8, path: 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12z M12 15v7 M8 19h8' },
    warning: { type: 'svg', strokeWidth: 1.8, path: 'M10.3 4a2 2 0 0 1 3.4 0l8 14a2 2 0 0 1-1.7 3H4a2 2 0 0 1-1.7-3z M12 9v4 M12 17h.01' },
    star: { type: 'svg', strokeWidth: 1.8, path: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z' },
    // 已收藏态：与 like / likeFill 同一套做法，路径不变、只把描边换成填充
    starFill: { type: 'svg', fill: 'currentColor', stroke: 'none', path: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z' },
    thumb: { type: 'svg', strokeWidth: 1.8, path: 'M7 10H3v11h4z M7 10l5-8a3 3 0 0 1 2 4l-1 4h6a2 2 0 0 1 2 2l-1 7a2 2 0 0 1-2 2H7' },
    download: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 1.8,
        path: 'M12 3v11 M7 10l5 5 5-5 M4 20h16',
    },

    // ---- 导航 ----
    home: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 1.8,
        path: 'M3 10.5L12 3l9 7.5V21h-5.5v-6.5h-7V21H3V10.5z',
    },
    explore: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 1.8,
        path: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M16 8l-2.5 5.5L8 16l2.5-5.5z',
    },
    user: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 1.8,
        path: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    },
    logout: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 1.8,
        path: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
    },

    // ---- 通用 ----
    // 显示器：移动端提示里指代「电脑端」
    monitor: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 1.8,
        path: 'M3 4h18a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z M8 20h8 M12 16v4',
    },
    copy: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 1.8,
        path: 'M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1z M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
    },
    check: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 1.8,
        path: 'M20 6L9 17l-5-5',
    },
    delete: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 1.8,
        path: 'M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6',
    },
    edit: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 1.8,
        path: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
    },

    // ---- 元信息（专辑/用户页的日期、曲目数、地区；替代原先的彩色 emoji）----
    calendar: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 1.8,
        path: 'M4 5h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z M8 3v4 M16 3v4 M3 10h18',
    },
    disc: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 1.8,
        path: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
    },
    // MV：屏幕 + 播放三角，和 disc（唱片）区分开——「看」和「听」是两种动作
    mv: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 1.8,
        path: 'M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z M10 9.2l5 2.8-5 2.8V9.2z',
    },
    location: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 1.8,
        path: 'M12 21.5s7-5.8 7-11.5a7 7 0 1 0-14 0c0 5.7 7 11.5 7 11.5z M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
    },
}
