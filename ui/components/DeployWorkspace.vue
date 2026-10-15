<script setup>
import { ref, computed } from 'vue';
import { t } from '../i18n.js';
import DeployCheckPanel from './DeployCheckPanel.vue';
import DockerfilePanel from './DockerfilePanel.vue';
import DeployPackagePanel from './DeployPackagePanel.vue';

const props = defineProps({
  project: String,
  botEntry: String,
  api: Function,
  styleNonce: String,
});

const inspection = ref(null);
const dockerfilePanel = ref(null);

const ok = computed(() => inspection.value?.ok === true);

function onInspection(value) { inspection.value = value; }

// Project switching and logout honor unsaved Dockerfile edits through this guard.
function canLeave() { return dockerfilePanel.value?.canLeave() !== false; }
defineExpose({ canLeave });
</script>

<template>
  <div id="deploy-workspace" class="deploy-workspace">
    <div class="section-intro">
      <div><span class="eyebrow">DOCKER DEPLOY</span><h2>{{ t('Docker 部署') }}</h2><p>{{ t('校验当前应用，管理 Dockerfile，并生成可移植的部署包。') }}</p></div>
    </div>

    <nav class="deploy-steps" :aria-label="t('部署检查')">
      <div class="deploy-step" :class="{ active: !ok, done: ok }">
        <strong id="deploy-step-check">{{ t('部署检查') }}</strong><small>{{ t('校验项目与 Bot 入口') }}</small>
      </div>
      <div class="deploy-step" :class="{ active: ok, locked: !ok }">
        <strong id="deploy-step-dockerfile">{{ t('Dockerfile 管理') }}</strong><small>{{ t('管理容器构建文件') }}</small>
      </div>
      <div class="deploy-step" :class="{ active: ok, locked: !ok }">
        <strong id="deploy-step-package">{{ t('生成部署包') }}</strong><small>{{ t('构建并下载部署包') }}</small>
      </div>
    </nav>

    <DeployCheckPanel :project="project" :bot-entry="botEntry" :api="api" @inspection="onInspection" />
    <DockerfilePanel ref="dockerfilePanel" :project="project" :api="api" :style-nonce="styleNonce" :enabled="ok" />
    <DeployPackagePanel :project="project" :api="api" :style-nonce="styleNonce" :enabled="ok" :inspection="inspection" />
  </div>
</template>
