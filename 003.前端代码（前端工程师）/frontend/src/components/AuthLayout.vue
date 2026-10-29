<script setup lang="ts">
/** 认证页布局：左侧品牌区 + 右侧表单区 */
withDefaults(
  defineProps<{
    title: string;
    lead?: string;
    /** 左侧品牌区的卖点说明 */
    features?: string[];
  }>(),
  { lead: '', features: () => [] },
);
</script>

<template>
  <div class="auth">
    <section class="auth-brand">
      <div class="bmark">资</div>
      <h1>物资系统</h1>
      <p class="lead">
        轻量的物资出入库台账。用<b>拼音码</b>定位物资，录入数量与订单号，一笔记录 5 秒完成。
      </p>
      <div class="auth-feats">
        <div v-for="feature in features" :key="feature" class="auth-feat">
          <span class="ck">✓</span><span>{{ feature }}</span>
        </div>
      </div>
    </section>

    <section class="auth-panel">
      <div class="auth-form">
        <h2>{{ title }}</h2>
        <p v-if="lead" class="lead">{{ lead }}</p>
        <slot />
      </div>
    </section>
  </div>
</template>

<style scoped>
.auth {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  background: var(--surface);
}
.auth-brand {
  background:
    radial-gradient(1000px 520px at 12% 8%, rgba(16, 135, 92, 0.45), transparent 60%),
    radial-gradient(900px 620px at 88% 92%, rgba(217, 89, 38, 0.38), transparent 60%),
    linear-gradient(150deg, #10345f 0%, #1c5cab 52%, #10875c 100%);
  color: #fff;
  padding: 52px 56px;
  display: flex;
  flex-direction: column;
}
.auth-brand .bmark {
  width: 44px;
  height: 44px;
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.18);
  display: grid;
  place-items: center;
  font-size: 20px;
  font-weight: 700;
  border: 1px solid rgba(255, 255, 255, 0.28);
  backdrop-filter: blur(4px);
}
.auth-brand h1 {
  font-size: 30px;
  margin-top: 26px;
  letter-spacing: -0.02em;
}
.auth-brand .lead {
  font-size: 15px;
  opacity: 0.92;
  margin-top: 10px;
  max-width: 30em;
  line-height: 1.7;
}
.auth-feats {
  margin-top: auto;
  display: grid;
  gap: 12px;
}
.auth-feat {
  display: flex;
  gap: 11px;
  align-items: flex-start;
  font-size: 13.5px;
}
.auth-feat .ck {
  width: 19px;
  height: 19px;
  border-radius: 50%;
  flex: 0 0 19px;
  background: rgba(255, 255, 255, 0.2);
  display: grid;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.auth-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 32px;
}
.auth-form {
  width: 100%;
  max-width: 372px;
}
.auth-form h2 {
  font-size: 23px;
}
.auth-form > .lead {
  color: var(--ink-3);
  font-size: 13.5px;
  margin: 7px 0 24px;
}
/* .auth-row / .auth-alt / .auth-steps 等辅助类在 base.css 中定义，
   因为它们由插槽内容传入，scoped 样式无法覆盖 */

@media (max-width: 900px) {
  .auth {
    grid-template-columns: 1fr;
  }
  .auth-brand {
    display: none;
  }
}
</style>
