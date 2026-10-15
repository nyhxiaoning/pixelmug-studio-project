<script setup>
import { ref, computed, onMounted } from 'vue';
import { t, serviceMessage } from '../i18n.js';

const props = defineProps({ project: String, botEntry: String, api: Function });
const emit = defineEmits(['inspection']);

const inspection = ref(null), busy = ref(false), error = ref('');

const ok = computed(() => inspection.value?.ok === true);
const errors = computed(() => inspection.value?.errors || []);
const warnings = computed(() => inspection.value?.warnings || []);
const dependencyCount = computed(() => Object.keys(inspection.value?.manifest?.dependencies || {}).length);
const fileCount = computed(() => (inspection.value?.files || []).length);
const totalBytes = computed(() => inspection.value?.totalBytes || 0);

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes, unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
  return (unit === 0 ? String(Math.round(value)) : value.toFixed(value >= 100 ? 0 : 1)) + ' ' + units[unit];
}

async function check() {
  if (busy.value) return;
  busy.value = true; error.value = '';
  try {
    const result = await props.api('deploy/inspect');
    inspection.value = result;
    emit('inspection', result);
  } catch (e) {
    error.value = e.message;
    inspection.value = null;
    emit('inspection', null);
  } finally { busy.value = false; }
}
onMounted(check);
</script>

<template>
  <section class="card deploy-panel">
    <div class="section-heading">
      <div><span class="eyebrow">CHECK</span><h2>{{ t('部署检查') }}</h2></div>
      <div class="actions">
        <span v-if="inspection" class="badge" :class="ok ? 'badge-ok' : 'badge-error'">{{ ok ? t('部署检查通过') : t('部署检查未通过') }}</span>
        <button :disabled="busy" @click="check">{{ busy ? t('检查中…') : t('重新检查') }}</button>
      </div>
    </div>

    <p v-if="error" class="deploy-error" role="alert">{{ serviceMessage(error) }}</p>
    <p v-if="!inspection && !busy && !error" class="empty">{{ t('尚未检查') }}</p>
    <p v-if="busy && !inspection" class="empty">{{ t('正在获取检查结果…') }}</p>

    <div v-if="inspection" class="deploy-facts">
      <div><span>{{ t('Bot 入口') }}</span><strong class="path">{{ inspection.botEntry || botEntry || '—' }}</strong></div>
      <div><span>WebApp</span><strong>{{ inspection.hasWebApp ? t('包含 WebApp') : t('不含 WebApp') }}</strong></div>
      <div><span>{{ t('依赖数量') }}</span><strong>{{ dependencyCount }}</strong></div>
      <div><span>{{ t('包含文件') }}</span><strong>{{ fileCount }}</strong></div>
      <div><span>{{ t('总大小') }}</span><strong>{{ formatBytes(totalBytes) }}</strong></div>
    </div>

    <div v-if="inspection && (errors.length || warnings.length)" class="deploy-results">
      <div v-if="errors.length" class="deploy-issue-list errors">
        <strong>{{ t('错误') }}</strong>
        <ul><li v-for="item in errors" :key="item.code + (item.path || '')"><code>{{ item.code }}</code><span>{{ serviceMessage(item.message) }}</span></li></ul>
        <p class="subtle">{{ t('请修复以下问题后重新检查。') }}</p>
      </div>
      <div v-if="warnings.length" class="deploy-issue-list warnings">
        <strong>{{ t('警告') }}</strong>
        <ul><li v-for="item in warnings" :key="item.code + (item.path || '')"><code>{{ item.code }}</code><span>{{ serviceMessage(item.message) }}</span></li></ul>
      </div>
    </div>
    <p v-else-if="inspection" class="subtle">{{ t('未发现问题，可以继续生成部署包。') }}</p>
  </section>
</template>
