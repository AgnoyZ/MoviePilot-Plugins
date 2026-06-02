<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  config: { type: Object, default: () => ({}) },
  initialConfig: { type: Object, default: () => ({}) },
  api: { type: [Object, Function], default: null },
  pluginId: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'update:config', 'change', 'save', 'switch', 'close'])

const overwriteOptions = [
  { title: '跳过已存在文件', value: 'skip' },
  { title: '覆盖已存在文件', value: 'overwrite' },
  { title: '自动重命名', value: 'rename' },
]

const newId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `${Date.now()}-${Math.random()}`
}

const sourceConfig = () => {
  if (Object.keys(props.modelValue || {}).length) return props.modelValue
  if (Object.keys(props.config || {}).length) return props.config
  return props.initialConfig || {}
}

const normalizeRule = (rule = {}, index = 0) => ({
  id: rule.id || `${index + 1}`,
  enabled: rule.enabled ?? false,
  name: rule.name || `规则${index + 1}`,
  media_dir: rule.media_dir || '',
  target_dir: rule.target_dir || '',
  api_interval: Number(rule.api_interval ?? 0),
  overwrite: rule.overwrite || 'skip',
  exclude_exts: rule.exclude_exts || '',
  include_scraping: rule.include_scraping ?? true,
})

const normalize = () => {
  const source = sourceConfig()
  return {
    enabled: source.enabled ?? false,
    openlist_id: source.openlist_id || 'default',
    merge_delay: Number(source.merge_delay ?? 60),
    max_retries: Number(source.max_retries ?? 3),
    retry_interval: Number(source.retry_interval ?? 30),
    rules: Array.isArray(source.rules) ? source.rules.map(normalizeRule) : [],
    openlist_items: Array.isArray(source.openlist_items) ? source.openlist_items : [],
  }
}

const form = reactive(normalize())
const openlistItems = ref(form.openlist_items)
const expandedRules = ref([])

const selectedOpenListItems = computed(() => {
  if (openlistItems.value.length) return openlistItems.value
  return [{ title: '自动使用 MoviePilot 内置 Alist/OpenList 配置', value: 'default' }]
})

const effectivePluginId = computed(() => props.pluginId || 'MediaOpenListUpload')

const ruleSummary = computed(() => {
  const enabledCount = form.rules.filter((rule) => rule.enabled).length
  return `${enabledCount}/${form.rules.length} 条规则启用`
})

const payload = computed(() => ({
  enabled: !!form.enabled,
  openlist_id: form.openlist_id || 'default',
  merge_delay: Number(form.merge_delay || 0),
  max_retries: Number(form.max_retries || 0),
  retry_interval: Number(form.retry_interval || 0),
  rules: form.rules.map((rule, index) => ({
    id: rule.id || `${index + 1}`,
    enabled: !!rule.enabled,
    name: rule.name || `规则${index + 1}`,
    media_dir: rule.media_dir || '',
    target_dir: rule.target_dir || '',
    api_interval: Number(rule.api_interval || 0),
    overwrite: rule.overwrite || 'skip',
    exclude_exts: rule.exclude_exts || '',
    include_scraping: !!rule.include_scraping,
  })),
}))

watch(payload, (value) => {
  emit('update:modelValue', value)
  emit('update:config', value)
  emit('change', value)
}, { deep: true, immediate: true })

const addRule = () => {
  const index = form.rules.length
  const rule = normalizeRule({
    id: newId(),
    enabled: true,
    name: `规则${index + 1}`,
    include_scraping: form.default_include_scraping,
  }, index)
  form.rules.push(rule)
  expandedRules.value = [rule.id]
}

const removeRule = (index) => {
  form.rules.splice(index, 1)
}

const cloneRule = (rule) => {
  const clonedRule = {
    ...rule,
    id: newId(),
    name: `${rule.name || '规则'} 副本`,
  }
  form.rules.push(clonedRule)
  expandedRules.value = [clonedRule.id]
}

const callApiGet = async (path) => {
  if (!props.api) return null
  if (typeof props.api.get === 'function') return props.api.get(path)
  if (typeof props.api === 'function') return props.api('get', path)
  return null
}

const saveConfig = () => {
  emit('save', payload.value)
}

onMounted(async () => {
  try {
    const result = await callApiGet(`plugin/${effectivePluginId.value}/openlists`)
    const items = result?.items || result?.data?.items || []
    if (Array.isArray(items) && items.length) {
      openlistItems.value = items.map((item) => ({
        title: item.name || item.id,
        value: item.id,
      }))
    }
  } catch (error) {
    console.warn('加载 OpenList 配置列表失败', error)
  }
})
</script>

<template>
  <v-sheet class="pa-4 pa-sm-6 mx-auto media-openlist-upload-config" color="surface" max-width="1120" min-height="100%">
    <div class="d-flex align-start align-sm-center justify-space-between mb-8 flex-column flex-sm-row pr-12 pr-sm-0">
      <div>
        <div class="text-subtitle-1 font-weight-medium">媒体整理 OpenList 上传</div>
        <div class="text-body-2 text-medium-emphasis">
          整理完成后按启用规则上传命中的媒体库文件
        </div>
      </div>
    </div>
    <VDialogCloseBtn @click="emit('close')" />

    <div class="mb-8">
      <div class="mb-6">
        <v-row dense>
          <v-col cols="12">
            <v-switch
              v-model="form.enabled"
              color="primary"
              density="comfortable"
              hide-details
              label="启用插件"
            />
          </v-col>
        </v-row>
      </div>

      <div class="mb-6">
        <v-row dense>
          <v-col cols="12" sm="6" lg="3">
            <v-select
              v-model="form.openlist_id"
              :items="selectedOpenListItems"
              density="comfortable"
              hide-details="auto"
              item-title="title"
              item-value="value"
              label="OpenList 配置"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" sm="6" lg="3">
            <v-text-field
              v-model.number="form.merge_delay"
              density="comfortable"
              hide-details="auto"
              label="合并等待"
              min="0"
              suffix="秒"
              type="number"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" sm="6" lg="3">
            <v-text-field
              v-model.number="form.max_retries"
              density="comfortable"
              hide-details="auto"
              label="失败重试"
              min="0"
              suffix="次"
              type="number"
              variant="outlined"
            />
          </v-col>
          <v-col cols="12" sm="6" lg="3">
            <v-text-field
              v-model.number="form.retry_interval"
              density="comfortable"
              hide-details="auto"
              label="重试间隔"
              min="0"
              suffix="秒"
              type="number"
              variant="outlined"
            />
          </v-col>
        </v-row>
      </div>
    </div>

    <div class="mb-5">
      <div class="d-flex align-center justify-space-between mb-6 flex-column flex-sm-row gap-2">
        <div class="w-100 min-w-0">
          <div class="text-subtitle-1 font-weight-medium">上传规则</div>
          <div class="text-caption text-medium-emphasis">{{ ruleSummary }}</div>
        </div>
        <v-btn class="w-100 w-sm-auto" color="primary" prepend-icon="mdi-plus" variant="tonal" @click="addRule">新增规则</v-btn>
      </div>

      <v-alert
        v-if="!form.rules.length"
        density="comfortable"
        type="warning"
        variant="tonal"
      >
        当前没有上传规则，插件启用后也不会执行上传。
      </v-alert>

      <v-expansion-panels
        v-else
        v-model="expandedRules"
        multiple
        variant="accordion"
      >
        <v-expansion-panel
          v-for="(rule, index) in form.rules"
          :key="rule.id || index"
          :value="rule.id || index"
          class="mb-4 border rounded"
          elevation="0"
        >
          <v-expansion-panel-title class="px-4 py-2">
            <div class="d-flex align-center justify-space-between w-100 min-w-0 pr-6">
              <div class="d-flex align-center gap-3 min-w-0">
                <v-chip
                  :color="rule.enabled ? 'success' : 'grey'"
                  size="small"
                  variant="tonal"
                >
                  {{ rule.enabled ? '启用' : '停用' }}
                </v-chip>
                <div class="min-w-0 flex-grow-1">
                  <div class="text-body-2 font-weight-medium text-truncate">
                    {{ rule.name || `规则${index + 1}` }}
                  </div>
                </div>
              </div>
              
              <div class="d-flex gap-2">
                <v-btn
                  icon="mdi-content-copy"
                  size="small"
                  variant="text"
                  color="medium-emphasis"
                  title="复制规则"
                  @click.stop="cloneRule(rule)"
                ></v-btn>
                <v-btn
                  icon="mdi-delete"
                  size="small"
                  variant="text"
                  color="error"
                  title="删除规则"
                  @click.stop="removeRule(index)"
                ></v-btn>
              </div>
            </div>
          </v-expansion-panel-title>

          <v-expansion-panel-text class="px-0">
            <div class="pt-0 px-2 pb-2">
              <v-row dense>
                <v-col cols="12" sm="6">
                  <v-switch
                    v-model="rule.enabled"
                    color="primary"
                    density="comfortable"
                    hide-details
                    label="启用规则"
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-switch
                    v-model="rule.include_scraping"
                    color="primary"
                    density="comfortable"
                    hide-details
                    label="同步刮削文件"
                  />
                </v-col>
              </v-row>

              <v-row dense class="mt-4">
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="rule.name"
                    :placeholder="`规则${index + 1}`"
                    density="comfortable"
                    hide-details="auto"
                    label="规则名称"
                    variant="outlined"
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-select
                    v-model="rule.overwrite"
                    :items="overwriteOptions"
                    density="comfortable"
                    hide-details="auto"
                    label="覆盖方式"
                    variant="outlined"
                  />
                </v-col>
              </v-row>

              <v-row dense class="mt-4">
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="rule.media_dir"
                    density="comfortable"
                    hide-details="auto"
                    label="媒体库目录"
                    placeholder="/media/movies"
                    variant="outlined"
                  />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="rule.target_dir"
                    density="comfortable"
                    hide-details="auto"
                    label="OpenList 目标目录"
                    placeholder="/MoviePilot/Movies"
                    variant="outlined"
                  />
                </v-col>
              </v-row>

              <v-row dense class="mt-4">
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model.number="rule.api_interval"
                    density="comfortable"
                    hide-details="auto"
                    label="操作间隔"
                    min="0"
                    suffix="秒"
                    type="number"
                    variant="outlined"
                  />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field
                    v-model="rule.exclude_exts"
                    density="comfortable"
                    hide-details="auto"
                    label="排除后缀"
                    placeholder=".tmp,.part"
                    variant="outlined"
                  />
                </v-col>
              </v-row>
            </div>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <v-alert class="mb-5 text-body-2" density="comfortable" type="info" variant="tonal">
      <div class="mb-1"><strong>合并等待：</strong>接收到整理事件后等待的时间，用于将短时间内同一媒体的多个文件合并为一次任务。</div>
      <div class="mb-1"><strong>目录填写：</strong>【媒体库目录】为映射到MoviePilot内的路径（如 <code>/media/anime</code>），【OpenList 目标目录】为OpenList目录路径（如 <code>/115/Media</code>）。未匹配规则的事件将被忽略。</div>
      <div><strong>排除后缀：</strong>多个后缀使用英文逗号分隔（如 <code>.tmp,.part</code>）。</div>
    </v-alert>

    <div class="d-flex align-center flex-wrap gap-2 pt-4 mt-5 position-sticky bottom-0 bg-surface border-t-sm" style="z-index: 1;">
      <v-btn class="flex-grow-1 flex-sm-grow-0" variant="tonal" @click="emit('switch')">查看结果</v-btn>
      <v-spacer class="d-none d-sm-block"></v-spacer>
      <v-btn class="flex-grow-1 flex-sm-grow-0" color="primary" prepend-icon="mdi-content-save" variant="text" @click="saveConfig">保存</v-btn>
    </div>
  </v-sheet>
</template>

<style scoped>
.media-openlist-upload-config {
  width: 100%;
  overflow-x: hidden;
}

.gap-2 {
  gap: 8px;
}
.gap-3 {
  gap: 12px;
}
.min-w-0 {
  min-width: 0;
}
.border-t-sm {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}
.bg-surface {
  background: rgb(var(--v-theme-surface));
}

@media (min-width: 600px) {
  .w-sm-auto {
    width: auto !important;
  }
}
</style>
