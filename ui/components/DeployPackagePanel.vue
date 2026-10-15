<script setup>
import { ref } from 'vue';
import { t, serviceMessage } from '../i18n.js';

const props = defineProps({ project: String, api: Function, styleNonce: String, enabled: Boolean, inspection: Object });

const result = ref(null), busy = ref(false), error = ref(''), downloaded = ref(false);

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes, unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
  return (unit === 0 ? String(Math.round(value)) : value.toFixed(value >= 100 ? 0 : 1)) + ' ' + units[unit];
}

async function generate() {
  if (busy.value) return;
  busy.value = true; error.value = ''; downloaded.value = false;
  try {
    result.value = await props.api('deploy/package', {});
  } catch (e) {
    result.value = null;
    error.value = e.message;
  } finally { busy.value = false; }
}

async function download() {
  if (!result.value?.id || busy.value) return;
  busy.value = true; error.value = '';
  try {
    const response = await fetch('/api/deploy/package/' + result.value.id, { headers: { Authorization: 'Bearer ' + props.styleNonce } });
    if (!response.ok) throw new Error(t('下载已失效'));
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = result.value.filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
    downloaded.value = true;
  } catch (e) {
    error.value = e.message;
  } finally { busy.value = false; }
}
</script>

<template>
  <section class="card deploy-panel">
    <div class="section-heading">
      <div><span class="eyebrow">PACKAGE</span><h2>{{ t('生成部署包') }}</h2></div>
      <button class="primary" :disabled="!enabled || busy" @click="generate">{{ busy ? t('生成中…') : (result ? t('重新生成') : t('生成部署包')) }}</button>
    </div>

    <p v-if="error" class="deploy-error" role="alert">{{ serviceMessage(error) }}</p>
    <p v-if="!enabled" class="empty">{{ t('请先通过部署检查。') }}</p>

    <template v-else>
      <p v-if="!result && !busy" class="subtle">{{ t('部署包内容包含 Bot、生产 WebApp 构建与容器运行文件。') }}</p>

      <div v-if="result" class="deploy-package-result">
        <p class="deploy-package-status">{{ downloaded ? t('已下载') : t('部署包已生成。') }}</p>
        <div class="deploy-facts">
          <div><span>{{ t('文件名') }}</span><strong class="path">{{ result.filename }}</strong></div>
          <div><span>{{ t('大小') }}</span><strong>{{ formatBytes(result.size) }}</strong></div>
          <div><span>{{ t('有效期至') }}</span><strong>{{ new Date(result.expiresAt).toLocaleString() }}</strong></div>
        </div>
        <p class="subtle">{{ t('部署包只能下载一次，请妥善保存。') }}</p>
        <button class="primary" :disabled="busy || downloaded" @click="download">{{ downloaded ? t('已下载') : t('下载部署包') }}</button>
      </div>
    </template>
  </section>
</template>
