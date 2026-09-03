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
            console.log(config);
            return this.$axios.get('/cloudsearch', {
                params: {...config, ...params}
            })
        },
        initLoad() {
            this.getList().then(res => {
                //初始化渲染列表
                this.list = res.data.result[this.resultIn] || []
                //统计歌曲数量
                this.totalCount = res.data.result[this.countIn]
                console.log(res.data);

            })
        },
        load() {
            this.page++;
            this.loading = true;
            this.getList().then(res => {
                res.data.result[this.resultIn].forEach(val => {
                    if (this.list.findIndex(item => item[this.id] === val[this.id]) === -1) {
                        this.list.push(val)
                        this.loading = false
                    }
                })
            })
        },
    }
}