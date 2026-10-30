<template>
  <ul class="mixedGrid" :class="{ 'is-dense': dense }">
    <li v-for="r in list" :key="itemKey(r)" class="mixedItem" :class="{ 'is-dense': dense }">
      <!-- type === 1 用户 -->
      <div v-if="r.type === 1" class="hitArea" @click="uClk(r.userProfile)">
        <div class="avatar">
          <cover-image :src="(r.userProfile && r.userProfile.avatarUrl) || ''"
                       :alt="((r.userProfile && r.userProfile.nickname) || '用户') + '的头像'"/>
        </div>
        <div class="info">
          <p class="name" :title="userName(r)">
            {{ userNick(r) }}
            <i v-if="userGender(r)===1" class="el-icon-male"></i>
            <i v-if="userGender(r)===2" class="el-icon-female"></i>
          </p>
          <p class="sign" v-if="userSign(r)" :title="userSign(r)">{{ userSign(r) }}</p>
          <p class="meta">
            <span v-if="r.followDay" class="since" :title="tip(r.followTime, '关注')">关注 {{ r.followDay }}</span>
            <span v-if="r.mutualFollowDay" class="mutual" :title="tip(r.mutualFollowTime, '互相关注')">互关 {{ r.mutualFollowDay }}</span>
          </p>
        </div>
      </div>

      <!-- type === 2 歌手 -->
      <div v-else class="hitArea" @click="arClk(r.artistInfo)">
        <div class="avatar avatar--artist">
          <cover-image :src="(r.artistInfo && (r.artistInfo.picUrl || r.artistInfo.img1v1Url)) || ''"
                       :alt="((r.artistInfo && r.artistInfo.name) || '歌手') + '的头像'"/>
        </div>
        <div class="info">
          <p class="name" :title="artistName(r)">
            {{ artistName(r) }}
            <span class="tagArtist">歌手</span>
          </p>
          <p class="sign" v-if="artistAlias(r)" :title="artistAlias(r)">{{ artistAlias(r) }}</p>
          <p class="meta">
            <span v-if="r.followDay" class="since" :title="tip(r.followTime, '关注')">关注 {{ r.followDay }}</span>
            <span v-if="fansSegment(r)" class="mutual">{{ fansSegment(r) }}</span>
          </p>
        </div>
      </div>
    </li>
  </ul>
</template>

<script>
/**
 * FollowMixedLayout
 *
 * 渲染 `/user/follow/mixed` 的 records（当前账号的关注，用户 + 歌手混排）。
 * 该接口结构（v4.39.0 实测，2026-10-26）：
 *   record.type        1 = 用户（信息在 userProfile）、2 = 歌手（信息在 artistInfo）
 *   record.followId    用户 id 或歌手 id
 *   record.followTime  我关注它的时间（毫秒）
 *   record.followDay   官方算好的时长文案，如 "303天" / "2年77天"
 *   record.mutualFollowTime / mutualFollowDay  互相关注的同款字段（未互关为 null）
 *   data.page.cursor / data.page.more          游标分页
 *
 * 时长文案直接用官方的 followDay，不自己算：口径与 App 一致（"2年77天" 这种）。
 */
import CoverImage from "@/components/common/CoverImage";
import { formatMs } from "@/utils/filters";

export default {
  name: "FollowMixedLayout",
  components: { CoverImage },
  props: {
    list: {
      type: Array,
      required: true,
    },
    // 紧凑模式：只留头像 + 名字，排成多列头像墙（用户主页默认形态）
    dense: {
      type: Boolean,
      default: false,
    },
  },
  methods: {
    // 用户 id 和歌手 id 可能是同一个数字，key 必须带 type
    itemKey(r) {
      return r.type + '-' + r.followId
    },
    uClk(profile) {
      if (profile && profile.userId) this.$bus.$emit('uClk', profile.userId)
    },
    arClk(artist) {
      if (artist && artist.id) this.$bus.$emit('arClk', artist.id)
    },
    userNick(r) {
      return (r.userProfile && r.userProfile.nickname) || '未知用户'
    },
    userName(r) {
      return this.userNick(r)
    },
    userSign(r) {
      return (r.userProfile && r.userProfile.signature) || ''
    },
    userGender(r) {
      return (r.userProfile && r.userProfile.gender) || 0
    },
    artistName(r) {
      return (r.artistInfo && r.artistInfo.name) || '未知歌手'
    },
    artistAlias(r) {
      const a = (r.artistInfo && r.artistInfo.alias) || []
      return a.length ? a.join(' / ') : ''
    },
    // 歌手有乐迷等级（fansGroupInfo.segment + level），用户没有
    fansSegment(r) {
      const g = r.fansGroupInfo
      if (!g || !g.segment) return ''
      return g.level ? `${g.segment} Lv.${g.level}` : g.segment
    },
    tip(ms, label) {
      if (!ms) return ''
      return formatMs(ms, 'YYYY.MM.DD') + ' ' + label
    },
  }
}
</script>

<style lang="scss" scoped>
@import "src/assets/scss/base/variables";

.mixedGrid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;

  @media (max-width: 900px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 600px) { grid-template-columns: 1fr; }
}

// 紧凑模式：6 列头像墙（同 UserListLayout 的 is-dense）
.mixedGrid.is-dense {
  grid-template-columns: repeat(6, 1fr);
  gap: 4px;

  @media (max-width: 1100px) { grid-template-columns: repeat(5, 1fr); }
  @media (max-width: 900px) { grid-template-columns: repeat(4, 1fr); }
  @media (max-width: 600px) { grid-template-columns: repeat(3, 1fr); }
}

.mixedItem {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 14px 16px;
  border-radius: 16px;
  background: rgba(255,255,255,.72);
  border: 1px solid rgba(0,0,0,.05);
  transition: transform .25s, box-shadow .25s, border-color .25s;

  &:hover {
    transform: translateY(-3px);
    border-color: rgba($color-main, .35);
    box-shadow: 0 8px 24px rgba(0,0,0,.08);
  }
}

// 头像墙单元：去掉卡片外观，只保留 hover 反馈
.mixedItem.is-dense {
  display: block;
  padding: 10px 4px 9px;
  border-radius: 12px;
  background: transparent;
  border-color: transparent;

  &:hover {
    transform: none;
    background: rgba(255,255,255,.8);
    border-color: rgba(0,0,0,.05);
    box-shadow: none;
  }

  .hitArea { flex-direction: column; gap: 7px; }
  .avatar { width: 44px; height: 44px; }
  .info { flex: none; width: 100%; }
  .name { justify-content: center; font-size: 12px; font-weight: 500; }
  .sign, .meta, .tagArtist { display: none; }
}

.hitArea {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  min-width: 0;
  cursor: pointer;

  &:active { transform: scale(.98); }
}

.avatar {
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  overflow: hidden;
  background: $color-theme-sec;

  img { width: 100%; height: 100%; object-fit: cover; display: block; }
}

.info { flex: 1; min-width: 0; }

.name {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: $font-black;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  i { flex-shrink: 0; font-size: 14px; line-height: 1; }
  i.el-icon-male { color: #47a1ce; }
  i.el-icon-female { color: #ff86b6; }
}

.tagArtist {
  flex-shrink: 0;
  margin-left: 4px;
  padding: 0 5px;
  font-size: 10px;
  font-weight: 400;
  line-height: 15px;
  border-radius: 4px;
  color: $color-main;
  background: rgba($color-main, .12);
}

.sign {
  margin: 4px 0 0;
  font-size: 12px;
  color: $font-black-2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin: 4px 0 0;
  font-size: 12px;
  color: $font-black-2;
}

.since { color: $color-main; white-space: nowrap; }
.mutual { color: $font-black-2; white-space: nowrap; }
</style>
