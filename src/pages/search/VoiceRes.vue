<template>
  <div class="VoiceRes">
    <h2>单曲</h2>
    <TracksLayout :list="list"/>
    <el-row>
      <LoadMore :load="load" :loading="loading" :noMore="noMore"/>
    </el-row>
  </div>
</template>

<script>
import LoadMore from "@/components/LoadMore";
import TracksLayout from "@/components/layout/TracksLayout";
import {searchMixin} from "@/assets/mixin";

export default {
  name: "VoiceRes",
  props: ["keyword"],
  components: {LoadMore, TracksLayout},
  mixins: [searchMixin],
  data() {
    return {
      type: 2000,
      limit: 50,
      // resultIn: 'songs',
      // countIn: 'songCount'
    }
  },
  computed: {},
  methods: {
    dataProcessing(data) {
      //改名并删除多余
      data.al = data.album
      data.ar = data.artists
      delete data.album
      delete data.artists
      //添加声音标识，不打开详情页！
      data.isVoice = true
    },
    getList(params) {
      const config = {keywords: this.keyword, limit: this.limit, offset: this.offset, type: this.type}
      console.log(config);
      return this.$axios.get('/search', {
        params: {...config, ...params}
      })
    },
    initLoad() {
      this.getList().then(res => {
        // console.log(res.data);
        this.list = []
        //初始化渲染列表
        res.data.data.resources.forEach(val => {
          //先处理数据
          this.dataProcessing(val.baseInfo.mainSong)
          this.list.push(val.baseInfo.mainSong)
        })
        //统计歌曲数量
        this.totalCount = res.data.data.totalCount
      })
    },
    load() {
      this.page++;
      this.loading = true;
      this.getList().then(res => {
        res.data.data.resources.forEach(val => {
          //先处理数据
          this.dataProcessing(val.baseInfo.mainSong)
          //去重处理
          if (this.list.findIndex(item => item.id === val.baseInfo.mainSong.id === -1)) {
            this.list.push(val.baseInfo.mainSong)
            this.loading = false
          }else{
            console.log(val.baseInfo.mainSong.id )
          }
        })
      })
    },
    mvClk(id) {
      this.$bus.$emit('mvClk', id)
    },
    songClk(song) {
      this.$bus.$emit('songClk', song);
    },
  },
  activated() {
    this.initLoad()
  }
}
</script>

<style scoped>

</style>