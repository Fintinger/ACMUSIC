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

/**
 * 专门用于处理更新时间，创建时间的函数
 * @param{Number} ms
 */
export function fromNow(ms) {
    return dayjs(ms).fromNow()
}