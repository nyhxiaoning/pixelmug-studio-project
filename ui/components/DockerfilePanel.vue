<script setup>
import { ref, watch, nextTick, onBeforeUnmount } from 'vue';
import { t, serviceMessage } from '../i18n.js';
import { EditorView, minimalSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';

const props = defineProps({ project: String, api: Function, styleNonce: String, enabled: Boolean });

const dockerfile = ref(null), launcher = ref(null), busy = ref(false), error = ref(''), dirty = ref(false);
const editor = ref(null);
let view;

function canLeave() {
  if (busy.value) return false;
  return !dirty.value || window.confirm(t('Dockerfile 尚未保存，是否放弃修改？'));
}
defineExpose({ canLeave });

async function operation(fn) {
  if (busy.value) return;
  busy.value = true; error.value = '';
  try { await fn(); } catch (e) { error.value = e.message; } finally { busy.value = false; }
}

async function renderEditor(content) {
  await nextTick();
  view?.destroy();
  if (!editor.value) return;
  view = new EditorView({
    parent: editor.value,
    state: EditorState.create({
      doc: content,
      extensions: [
        minimalSetup, lineNumbers(), highlightActiveLine(),
        EditorView.cspNonce.of(props.styleNonce),
        keymap.of([{ key: 'Mod-s', run: () => { void save(); return true; } }]),
        EditorView.updateListener.of(update => {
          if (update.docChanged && dockerfile.value) {
            dirty.value = update.state.doc.toString() !== dockerfile.value.content.replaceAll('\r\n', '\n');
          }
        }),
        EditorView.theme({
          '&': { height: '100%', fontSize: '14px' },
          '.cm-scroller': { overflow: 'auto', fontFamily: 'Consolas, "Microsoft YaHei", monospace' },
          '.cm-content': { minHeight: '260px' },
        }),
      ],
    }),
  });
}

async function load() {
  const data = await props.api('deploy/files/read');
  dockerfile.value = data.dockerfile;
  launcher.value = data.launcher;
  dirty.value = false;
  await renderEditor(data.dockerfile?.content || '');
}

async function generate(force = false) {
  if (force && !window.confirm(t('恢复默认会覆盖当前修改，是否继续？'))) return;
  await operation(async () => {
    await props.api('deploy/files/generate', { force });
    await load();
  });
}

async function save() {
  if (!dockerfile.value || !view) return;
  await operation(async () => {
    const text = view.state.doc.toString();
    const content = dockerfile.value.content.includes('\r\n') ? text.replaceAll('\n', '\r\n') : text;
    dockerfile.value = await props.api('deploy/files/save', { content, revision: dockerfile.value.revision });
    dirty.value = view.state.doc.toString() !== dockerfile.value.content.replaceAll('\r\n', '\n');
  });
}

async function reload() { await operation(load); }

watch(() => props.enabled, enabled => { if (enabled) void load(); });
watch(() => props.project, () => { view?.destroy(); view = null; dockerfile.value = null; launcher.value = null; dirty.value = false; error.value = ''; });

function unload(event) { if (dirty.value) { event.preventDefault(); event.returnValue = ''; } }
window.addEventListener('beforeunload', unload);
onBeforeUnmount(() => { view?.destroy(); window.removeEventListener('beforeunload', unload); });
</script>

<template>
  <section class="card deploy-panel">
    <div class="section-heading">
      <div><span class="eyebrow">DOCKERFILE</span><h2>{{ t('Dockerfile 管理') }}</h2></div>
      <div class="actions">
        <button v-if="!dockerfile" :disabled="!enabled || busy" @click="generate(false)">{{ t('生成默认 Dockerfile') }}</button>
        <template v-else>
          <button :disabled="busy" @click="generate(true)">{{ t('恢复默认') }}</button>
          <button :disabled="busy" @click="reload">{{ t('重新加载') }}</button>
          <button class="primary" :disabled="busy || !dirty" @click="save">{{ t('保存') }}</button>
        </template>
      </div>
    </div>

    <p v-if="error" class="deploy-error" role="alert">{{ serviceMessage(error) }}</p>
    <p v-if="!enabled" class="empty">{{ t('请先通过部署检查。') }}</p>
    <template v-else>
      <p v-if="!dockerfile" class="empty">{{ t('尚未生成 Dockerfile，请先通过部署检查并生成默认文件。') }}</p>
      <template v-else>
        <p class="subtle">{{ t('编辑 Dockerfile 可自定义镜像构建行为，修改后请保存。') }}<span v-if="dirty" class="dirty-hint">{{ t(' · 未保存') }}</span></p>
        <div ref="editor" class="dockerfile-editor"></div>
        <details class="deploy-launcher">
          <summary>{{ t('启动脚本（只读）') }}</summary>
          <p class="subtle">{{ t('此脚本由 Studio 管理，用于在容器内启动 Bot 并托管 WebApp。') }}</p>
          <pre class="deploy-launcher-code">{{ launcher?.content || '' }}</pre>
        </details>
      </template>
    </template>
  </section>
</template>
