<template>
  <div class="recommendPlaylist">
    <!--分类-->
    <div class="MvCategories">
      <el-row v-for="m in mvMenu" :key="m.id">
        <el-col :span="2">
          <h2>{{ m.title }}</h2>
        </el-col>
        <el-col v-for="(i,ind) in m.children" :key="ind" :span="2">
          <el-button class="itemBtn" size="small" type="success" @click="handleClick(m.title,i)"> {{ i }}</el-button>
        </el-col>
      </el-row>
    </div>

    <ul class="mvList gridLayout">
      <li v-for="mv in renderedList" :key="mv.id" class="list-item mv">
        <el-card :body-style="{ padding: 0} " shadow="hover">
          <div class="imgContainer">
            <img :src="mv.cover" class="image">
          </div>
          <div class="moreInfo">
            <p class="mvName">{{ mv.name }}</p>
            <p class="mvArtist">{{ mv.artistName }}</p>
            <p class="duration">{{ mv.duration }}</p>
            <p class="playCount">{{ mv.playCount | Div1w(mv.playCount) }}</p>
          </div>
        </el-card>
      </li>
    </ul>

    <button v-if="!loading&&hasMore" @click="load()">加载更多</button>
    <p v-if="loading">加载中...</p>
    <p v-if="!hasMore">没有更多了</p>
  </div>
</template>

<script>
export default {
  name: "cpLatestMV",
  data() {
    return {
      renderedList: [],
      loading: false,
      title: "",
      item: '',
      page: 1,
      hasMore: true,
      params: {
        area: '',
        type: '',
        order: '',
        limit: 12,
      },
      mvMenu: [
        {title: '地区', id: 'diqu', children: ['全部', '内地', '港台', '欧美', '日本', '韩国']},
        {title: '类型', id: 'leixing', children: ['全部', '官方版', '原生', '现场版', "网易出品"]},
        {title: '排序', id: 'paixu', children: ['最新', '上升最快', '最热']},
      ]
    }
  },
  computed: {
    noMore() {
      return false
    }
  },
  methods: {
    handleClick(title, i, evt) {
      //更新监听的值
      this.title = title
      this.item = i
      this.params.page = 1
      //按钮样式变更
      // evt.target.classList.add('selected')
      console.log(evt);
    },
    //GET请求数据触发页面更新
    refreshTheRenderList() {
      this.$axios.get('/mv/all', {
        params: {
          area: this.params.area,
          order: this.params.order,
          type: this.params.type,
          limit: this.params.limit,
        }
      }).then(res => {
        this.hasMore = res.data.hasMore
        this.renderedList = res.data.data
      })
    },
    load() {
      this.loading = true
      this.page++

      this.$axios.get('/mv/all', {
        params: {
          area: this.params.area,
          order: this.params.order,
          type: this.params.type,
          limit: this.params.limit,
          offset: this.params.limit * this.page
        }
      }).then(res => {
        this.hasMore = res.data.hasMore
        this.renderedList.push(...res.data.data)
        this.loading = false
      })
    }
  },
  watch: {
    title(val) {
      switch (val) {
        case "地区":
          this.params.area = this.item
          break;
        case "类型":
          this.params.type = this.item
          break;
        case "排序":
          this.params.order = this.item
          break;
      }
    },
    item(val) {
      switch (this.title) {
        case "地区":
          this.params.area = val
          break;
        case "类型":
          this.params.type = val
          break;
        case "排序":
          this.params.order = val
          break;
      }
      this.refreshTheRenderList();
    }
  },
  beforeMount() {
    //请求最新MV并存入(先设定获取100个)
    this.$axios.get('/mv/first', {params: {limit: 100}}).then(res => {
      this.renderedList = res.data.data
    })
  },
  updated() {
    console.log("update")
  }

}
</script>

<style lang="scss" scoped>
.recommendPlaylist {
  .MvCategories {
    .el-row {
      margin-bottom: 10px;

      .el-col {
        .itemBtn.selected {
          background: #454545;
        }
      }
    }
  }
}

</style>