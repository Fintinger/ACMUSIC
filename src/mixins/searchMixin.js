import { searchV2 } from "@/api/Search"

export const searchMixin = {
    data() {
        return {
            list: [],
            totalCount: 0,
            limit: 0,
            page: 0,
            type: 0,
            loading: false,
            resultIn: '',
            countIn: '',
            id: "id"
        }
    },
    computed: {
        noMore() {
            return this.list ? this.list.length === this.totalCount : true
        },
        offset() {
            return this.page * this.limit
        }
    },
    methods: {
        getList(params) {
            const config = {keywords: this.keyword, limit: this.limit, offset: this.offset, type: this.type}
            return searchV2({...config, ...params})
        },
        initLoad() {
            // 关键词/激活重新拉取时重置分页, 避免沿用上次的 offset
            this.page = 0
            return this.getList().then(res => {
                //初始化渲染列表
                this.list = (res.data.result[this.resultIn]) || []
                //统计歌曲数量
                this.totalCount = res.data.result[this.countIn]
            }).catch(() => {
                // 失败时保持"空列表"而不是 undefined, 避免模板报错
                this.list = []
                this.totalCount = 0
            })
        },
        load() {
            if (this.loading || this.noMore) return
            this.page++;
            this.loading = true;
            return this.getList().then(res => {
                const items = res.data.result[this.resultIn] || []
                // 索引一次已存在 id, 避免每条都做 O(n) findIndex
                const exists = new Set(this.list.map(item => item[this.id]))
                items.forEach(val => {
                    const key = val[this.id]
                    if (!exists.has(key)) {
                        exists.add(key)
                        this.list.push(val)
                    }
                })
            }).catch(() => {
                // 请求失败: 回退页码, 允许用户重新点击加载更多
                this.page--
            }).finally(() => {
                // 关键: 无论成功/失败/空数据都要恢复 loading, 否则按钮永久转圈
                this.loading = false
            })
        },
    }
}