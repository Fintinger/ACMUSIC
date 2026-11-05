import { searchV2 } from "@/api/Search"
import EmptyState from '@/components/common/EmptyState'

export const searchMixin = {
    components: {EmptyState},
    data() {
        return {
            list: [],
            searchError: false,
            searchPageError: false,
            searchExhausted: false,
            requestVersion: 0,
            searchLoading: true,
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
            return this.searchExhausted || (this.list ? this.list.length >= this.totalCount : true)
        },
        offset() {
            return this.page * this.limit
        }
    },
    beforeDestroy() { this.requestVersion++ },
    methods: {
        getList(params) {
            const config = {keywords: this.keyword, limit: this.limit, offset: this.offset, type: this.type}
            return searchV2({...config, ...params})
        },
        readResult(res) {
            const body = res && res.data
            if (!body || !body.result || (body.code != null && Number(body.code) !== 200)) throw new Error('Invalid search result')
            const result = body.result
            if (result[this.resultIn] != null && !Array.isArray(result[this.resultIn])) throw new Error('Invalid search rows')
            return result
        },
        async initLoad() {
            const version = ++this.requestVersion
            this.page = 0; this.loading = false; this.searchLoading = true
            this.searchError = false; this.searchPageError = false; this.searchExhausted = false
            try {
                const res = await this.getList()
                if (version !== this.requestVersion) return
                const result = this.readResult(res)
                this.list = result[this.resultIn] || []
                this.totalCount = Number(result[this.countIn]) || this.list.length
                this.searchExhausted = !this.list.length
            } catch (_) {
                if (version === this.requestVersion) { this.list = []; this.totalCount = 0; this.searchError = true }
            } finally { if (version === this.requestVersion) this.searchLoading = false }
        },
        async load() {
            if (this.loading || this.searchLoading || this.noMore) return
            const version = this.requestVersion, nextPage = this.page + 1
            this.loading = true; this.searchPageError = false
            try {
                const res = await this.getList({offset: nextPage * this.limit})
                if (version !== this.requestVersion) return
                const result = this.readResult(res), items = result[this.resultIn] || []
                const exists = new Set(this.list.map(item => item[this.id]))
                items.forEach(item => { if (!exists.has(item[this.id])) { exists.add(item[this.id]); this.list.push(item) } })
                this.page = nextPage; this.searchExhausted = !items.length
            } catch (_) { if (version === this.requestVersion) this.searchPageError = true }
            finally { if (version === this.requestVersion) this.loading = false }
        },
    }
}
