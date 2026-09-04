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
    const httpsUrl = url.replace(/^http:\/\//, 'https://')
    // 已带参数不再加（避免重复）
    if (httpsUrl.indexOf('?') > -1) return httpsUrl
    return httpsUrl + `?param=${size}`
}