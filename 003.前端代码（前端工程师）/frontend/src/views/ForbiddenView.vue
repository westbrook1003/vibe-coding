<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>

<template>
  <div class="page">
    <div class="card" style="max-width: 520px; margin: 60px auto">
      <div class="card-body" style="text-align: center; padding: 46px 30px">
        <div class="icon">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <rect x="3" y="11" width="18" height="10" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h2>无权限访问该功能</h2>
        <p class="desc">「人员信息」模块仅管理员可访问。如需权限，请联系管理员。</p>
        <RouterLink class="btn primary" :to="{ name: 'dashboard' }">返回首页</RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.icon {
  width: 58px;
  height: 58px;
  margin: 0 auto 16px;
  border-radius: 17px;
  background: rgba(250, 178, 25, 0.14);
  color: var(--warning-text);
  display: grid;
  place-items: center;
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
