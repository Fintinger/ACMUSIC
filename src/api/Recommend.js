import request from "./request";

/**
 * 每日推荐「风格」相关接口（api-enhanced v4.41.1 新增）。
 *
 * 三个接口是一条完整链路：
 *   configs  取分类与标签（曲风 / 情绪 / 场景 / 语种 / 主题，共 51 个标签）
 *   set      保存所选标签（**会写入账号**，官方客户端里是"我喜欢的曲风"）
 *   songs    按已保存的风格取当天的 30 首
 *
 * 实测：未配置过的账号也有默认值（曲风 · 华语流行），所以 songs 可以直接调。
 */

/** 风格推荐的场景配置：分类 + 每个分类下的标签 */
export function categoryConfigs() {
    return request('/recommend/category/configs')
}

/**
 * 保存所选风格
 * @param category 分类 id（曲风 1000 / 情绪 3000 / 场景 5000 / 语种 2000 / 主题 4000）
 * @param tags 标签 id，单个或数组
 */
export function categorySet(category, tags) {
    const ids = Array.isArray(tags) ? tags.join(',') : tags
    return request('/recommend/category/set', {
        params: { category, tags: ids }
    })
}

/** 按已保存的风格取当天推荐（返回体同样是 data.dailySongs，另带当前生效的 tags） */
export function categorySongs() {
    return request('/recommend/category/songs')
}
