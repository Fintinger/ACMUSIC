/**
 * ACMUSIC Icon Registry
 * 统一图标映射表：业务 name -> 具体图标实现
 * type: 'font' 使用 ac-font 字体图标
 * type: 'svg'  使用内联 SVG（24x24，stroke 风格）
 * type: 'fallback' 图标暂缺, 由 BaseIcon 渲染占位
 */
export default {
    // ---- 播放器核心 ----
    play: { type: 'font', class: 'ac-play1' },
    pause: {
        type: 'svg',
        fill: 'currentColor', stroke: 'none',
        path: 'M7 5h4v14H7zM13 5h4v14h-4z',
    },
    prev: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 2,
        path: 'M6 6v12M20 6l-8.5 6L20 18V6z',
    },
    next: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 2,
        path: 'M18 6v12M4 6l8.5 6L4 18V6z',
    },
    volume: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 2,
        path: 'M11 5L6 9H3v6h3l5 4V5z M15.5 8.5a5 5 0 0 1 0 7 M18.5 6a9 9 0 0 1 0 12',
    },
    loop: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 2,
        path: 'M17 2l4 4-4 4 M3 11V9a4 4 0 0 1 4-4h14 M7 22l-4-4 4-4 M21 13v2a4 4 0 0 1-4 4H3',
    },
    loopList: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 2,
        path: 'M17 3l3 3-3 3 M4 9V7a3 3 0 0 1 3-3h13 M7 21l-3-3 3-3 M20 15v2a3 3 0 0 1-3 3H4',
    },
    loopOne: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 2,
        path: 'M17 2l4 4-4 4 M3 11V9a4 4 0 0 1 4-4h14 M7 22l-4-4 4-4 M21 13v2a4 4 0 0 1-4 4H3 M12 8v8 M9 10l3-2 3 2',
    },
    shuffle: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 2,
        path: 'M16 3h5v5 M4 20l17-17 M21 16v5h-5 M15 15l6 6 M4 4l5 5',
    },
    close: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 2,
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
        stroke: 'currentColor', strokeWidth: 2,
        path: 'M12 19V5M5 12l7-7 7 7',
    },
    arrowDown: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 2,
        path: 'M12 5v14M5 12l7 7 7-7',
    },
    arrowLeft: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 2,
        path: 'M19 12H5M12 19l-7-7 7-7',
    },
    arrowRight: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 2,
        path: 'M5 12h14M12 5l7 7-7 7',
    },

    // ---- 操作 ----
    like: { type: 'font', class: 'ac-like' },
    likeFill: { type: 'font', class: 'ac-likefill' },
    comment: { type: 'font', class: 'ac-comment' },
    search: { type: 'font', class: 'ac-Search' },
    share: { type: 'font', class: 'ac-jia' },
    radio: { type: 'font', class: 'ac-diantai' },

    // ---- 导航 ----
    home: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 2,
        path: 'M3 10.5L12 3l9 7.5V21h-5.5v-6.5h-7V21H3V10.5z',
    },
    explore: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 2,
        path: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 0l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3z',
    },
    user: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 2,
        path: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    },
    logout: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 2,
        path: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
    },

    // ---- 通用 ----
    delete: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 2,
        path: 'M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6',
    },
    edit: {
        type: 'svg',
        stroke: 'currentColor', strokeWidth: 2,
        path: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
    },
}
