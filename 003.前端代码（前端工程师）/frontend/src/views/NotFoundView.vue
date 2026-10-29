<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>

<template>
  <div class="page">
    <div class="card" style="max-width: 520px; margin: 60px auto">
      <div class="card-body" style="text-align: center; padding: 46px 30px">
        <div class="code">404</div>
        <h2>页面不存在</h2>
        <p class="desc">你访问的地址可能已被移动或删除。</p>
        <RouterLink class="btn primary" :to="{ name: 'dashboard' }">返回首页</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.code {
  font-size: 46px;
  font-weight: 700;
  color: var(--ink-3);
  letter-spacing: -0.03em;
  line-height: 1;
  margin-bottom: 12px;
}
h2 {
  font-size: 18px;
  margin-bottom: 8px;
}
.desc {
  color: var(--ink-3);
  font-size: 13.5px;
  margin: 0 0 22px;
}
</style>
