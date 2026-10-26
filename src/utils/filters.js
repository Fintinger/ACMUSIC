import * as dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime"
import duration from "dayjs/plugin/duration"
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.extend(duration)
dayjs.locale('zh-cn') // 使用本地化语言
/**
 * 处理较大数字
 * @param num
 * @returns {string|*}
 */
export function formatCount(num) {
    num = Number(num) || 0
    let res = "";
    if (num < 10000) {
        res = num
    } else if ((num / 10000) > 10000) {
        res = ((num / 10000) / 10000).toFixed(1) + '亿'
    } else {
        res = (num / 10000).toFixed(1) + '万'
    }
    return res
}

/**
 * 专门用于处理更新时间，创建时间的函数
 * @param{Number} ms
 * @param rule
 */
export function formatMs(ms, rule = 'YYYY.MM.DD') {
    return dayjs(ms).format(rule)
}

/**
 * 评论时间：今年的只给「月日」，往年的补上年份。
 *
 * 原来评论区固定 `MM月DD日 HH:mm`，几年前的老评论和今天的长得一模一样，
 * 分不清是"3月15日"还是"2019年3月15日"。按当前年份判断：
 *   今年 → 03月15日 20:11
 *   往年 → 2019年03月15日 20:11
 * 时间缺失 / 非法返回空串，避免模板里渲染出 Invalid Date。
 * 注意不能只靠 isValid()：`dayjs(undefined)` 等于"此刻"且有效，缺字段会被渲染成当前时间。
 * @param{Number} ms
 */
export function formatCommentTime(ms) {
    if (ms === undefined || ms === null || ms === '') return ''
    const d = dayjs(ms)
    if (!d.isValid()) return ''
    const rule = d.year() === dayjs().year() ? 'MM月DD日 HH:mm' : 'YYYY年MM月DD日 HH:mm'
    return d.format(rule)
}

/**
 * 专门用于处理更新时间，创建时间的函数
 * @param{Number} ms
 * @param rule
 */
export function format_s(s, rule = 'mm:ss') {
    return dayjs.duration({
        seconds: dayjs.duration(s).seconds(),
        minutes:dayjs.duration(s).minutes(),
        // hours:dayjs.duration(s).hours(),
    }).format(rule);
}

export function formatDurationMs(ms) {
    const totalSeconds = Math.floor((Number(ms) || 0) / 1000)
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    return m + ':' + String(s).padStart(2, '0')
}

/**
 * 专门用于处理更新时间，创建时间的函数
 * @param{Number} ms
 */
export function fromNow(ms) {
    return dayjs(ms).fromNow()
}

/**
 * 把图片 URL 的 http 协议升级为 https。
 * 背景：网易云接口有不少字段原样返回 http://p1.music.126.net/...（如 toplist/detail、
 * playlist/detail 的 coverImgUrl），页面部署在 https 时浏览器会判定为 Mixed Content，
 * 地址栏出现"不安全 / 此站点并非完全安全，攻击者可能修改图像"。
 * 实测这些 CDN 域名 https 可用，因此按域名白名单升级；其他域名原样返回避免坏图。
 * @param {String} url
 * @returns {String}
 */
export function toHttpsUrl(url) {
    if (!url || typeof url !== 'string') return url
    if (url.indexOf('http://') !== 0) return url
    // kuwo.cn 是解灰兜底源（/song/url/match），实测 https 可用（Range 206）
    if (!/music\.126\.net|\.netease\.com|kuwo\.cn/.test(url)) return url
    return 'https://' + url.slice('http://'.length)
}

/**
 * 网易云图片缩略: 附加 ?param=宽y高, 减小体积提升加载速度
 * 例: imgParam('https://p1.music.126.net/xxx.jpg', '300y300')
 * 非网易 CDN 原样返回
 * 同步把 http 升级为 https（避免页面部署在 https 时控制台 Mixed Content 警告）
 * @param {String} url
 * @param {String} size 如 '300y300'
 * @returns {String}
 */
export function imgParam(url, size = '300y300') {
    if (!url) return url
    // 仅对网易云 CDN 域名生效（其他域名可能不支持 https，盲目升级会坏图）
    if (!/music\.126\.net|\.netease\.com/.test(url)) return url
    // 先升级协议（http → https）
    const httpsUrl = toHttpsUrl(url)
    // 已带参数不再加（避免重复）
    if (httpsUrl.indexOf('?') > -1) return httpsUrl
    return httpsUrl + `?param=${size}`
}