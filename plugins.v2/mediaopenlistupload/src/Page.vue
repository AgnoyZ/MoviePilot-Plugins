<script setup>
import { computed, onMounted, ref } from 'vue'

const props = defineProps({
  api: { type: [Object, Function], default: null },
  pluginId: { type: String, default: '' },
})

const emit = defineEmits(['action', 'switch', 'close'])

const loading = ref(false)
const actionLoading = ref('')
const errorMessage = ref('')
const tasks = ref([])
const selectedTask = ref(null)

const taskTotal = computed(() => tasks.value.length)
const failedTotal = computed(() => tasks.value.filter((task) => task.status === 'failed').length)
const effectivePluginId = computed(() => props.pluginId || 'MediaOpenListUpload')

const statusMap = {
  pending: { text: '等待中', color: 'grey' },
  running: { text: '上传中', color: 'primary' },
  success: { text: '成功', color: 'success' },
  failed: { text: '失败', color: 'error' },
  skipped: { text: '已跳过', color: 'warning' },
  cancelled: { text: '已取消', color: 'grey' },
}

const statusInfo = (status) => statusMap[status] || { text: status || '未知', color: 'grey' }

const taskDisplayName = (task) => {
  if (task?.display_name) return task.display_name
  const sourceDir = String(task?.source_dir || '')
  if (!sourceDir) return task?.id || '-'
  const normalized = sourceDir.replace(/\\/g, '/').replace(/\/+$/, '')
  const parts = normalized.split('/').filter(Boolean)
  if (!parts.length) return task?.id || '-'
  const last = parts[parts.length - 1]
  if (/^season\s+\d+/i.test(last) && parts.length > 1) return parts[parts.length - 2]
  return last
}

const callApi = async (method, path, body) => {
  if (!props.api) return null
  const clientMethod = props.api[method]
  if (typeof clientMethod === 'function') return clientMethod(path, body)
  if (typeof props.api === 'function') return props.api(method, path, body)
  return null
}

const apiPath = (path) => `plugin/${effectivePluginId.value}${path}`

const loadTasks = async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    const result = await callApi('get', apiPath('/tasks?page_size=50'))
    const items = result?.items || result?.data?.items || []
    tasks.value = Array.isArray(items) ? items : []
    if (selectedTask.value) {
      const freshTask = tasks.value.find((task) => task.id === selectedTask.value.id)
      selectedTask.value = freshTask || null
    }
    emit('action')
  } catch (error) {
    errorMessage.value = error?.message || '加载上传任务失败'
  } finally {
    loading.value = false
  }
}

const selectTask = async (task) => {
  selectedTask.value = task
  if (!task?.id) return
  try {
    const result = await callApi('get', apiPath(`/tasks/${task.id}`))
    selectedTask.value = result?.task || result?.data?.task || task
  } catch (error) {
    errorMessage.value = error?.message || '加载任务详情失败'
  }
}

const retryTask = async (task) => {
  if (!task?.id || task.status !== 'failed') return
  actionLoading.value = task.id
  errorMessage.value = ''
  try {
    const result = await callApi('post', apiPath(`/tasks/${task.id}/retry`))
    const success = result?.success ?? result?.data?.success
    if (success === false) {
      errorMessage.value = result?.message || result?.data?.message || '重试任务提交失败'
      return
    }
    await loadTasks()
  } catch (error) {
    errorMessage.value = error?.message || '重试任务提交失败'
  } finally {
    actionLoading.value = ''
  }
}

const clearTasks = async () => {
  actionLoading.value = 'clear'
  errorMessage.value = ''
  try {
    const result = await callApi('post', apiPath('/tasks/clear'))
    const success = result?.success ?? result?.data?.success
    if (success === false) {
      errorMessage.value = result?.message || result?.data?.message || '清理历史失败'
      return
    }
    selectedTask.value = null
    await loadTasks()
  } catch (error) {
    errorMessage.value = error?.message || '清理历史失败'
  } finally {
    actionLoading.value = ''
  }
}

onMounted(loadTasks)
</script>

<template>
  <v-sheet class="pa-4 pa-sm-6 mx-auto media-openlist-upload-page" color="surface" max-width="1120" min-height="100%">
    <div class="page-header d-flex align-start align-sm-center justify-space-between mb-8 flex-column flex-sm-row pr-12 gap-3">
      <div>
        <div class="text-subtitle-1 font-weight-medium">上传结果</div>
        <div class="text-body-2 text-medium-emphasis">
          最近 {{ taskTotal }} 个任务，{{ failedTotal }} 个失败
        </div>
      </div>
      <div class="d-flex gap-2 w-100 w-sm-auto flex-column flex-sm-row">
        <v-btn
          :loading="actionLoading === 'clear'"
          color="error"
          prepend-icon="mdi-delete-sweep"
          variant="tonal"
          @click="clearTasks"
        >
          清空
        </v-btn>
        <v-btn
          :loading="loading"
          color="primary"
          prepend-icon="mdi-refresh"
          variant="tonal"
          @click="loadTasks"
        >
          刷新
        </v-btn>
        <v-btn prepend-icon="mdi-cog" variant="tonal" @click="emit('switch')">配置</v-btn>
      </div>
    </div>
    <VDialogCloseBtn @click="emit('close')" />

    <v-alert
      v-if="errorMessage"
      class="mb-6"
      density="comfortable"
      type="error"
      variant="tonal"
    >
      {{ errorMessage }}
    </v-alert>

    <v-alert
      v-if="!loading && !tasks.length"
      class="mb-6"
      density="comfortable"
      type="info"
      variant="tonal"
    >
      暂无上传任务。命中启用规则后，整理完成事件会生成上传记录。
    </v-alert>

    <div v-else class="mb-6">
      <v-table class="task-table border rounded" density="comfortable" hover>
        <thead>
          <tr>
            <th class="text-no-wrap">时间</th>
            <th>任务</th>
            <th class="text-no-wrap">状态</th>
            <th class="text-center text-no-wrap">文件</th>
            <th>错误</th>
            <th class="text-right text-no-wrap">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="task in tasks"
            :key="task.id"
            :class="{ 'bg-primary-lighten-1': selectedTask?.id === task.id }"
            @click="selectTask(task)"
          >
            <td class="text-no-wrap align-top">{{ task.created_at || '-' }}</td>
            <td class="align-top">
              <div class="text-body-2 font-weight-medium wrap-anywhere">{{ taskDisplayName(task) }}</div>
              <div class="text-caption text-medium-emphasis mt-1">{{ task.rule_name || '-' }}</div>
              <div class="text-caption text-medium-emphasis mt-1 wrap-anywhere task-path">{{ task.source_dir || task.id }}</div>
            </td>
            <td class="align-top">
              <v-chip :color="statusInfo(task.status).color" size="small" variant="tonal">
                {{ statusInfo(task.status).text }}
              </v-chip>
            </td>
            <td class="text-center align-top">{{ task.file_count ?? task.files?.length ?? 0 }}</td>
            <td class="align-top error-cell">
              <div class="text-caption text-medium-emphasis wrap-anywhere">{{ task.error || '-' }}</div>
            </td>
            <td class="text-right align-top">
              <v-btn
                :disabled="task.status !== 'failed'"
                :loading="actionLoading === task.id"
                color="primary"
                size="small"
                variant="text"
                @click.stop="retryTask(task)"
              >
                重试
              </v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </div>

    <v-expand-transition>
      <div v-if="selectedTask" class="mt-4">
        <div class="d-flex align-center justify-space-between px-4 pt-4 pb-2 flex-wrap gap-2 border rounded-t bg-surface">
          <div class="detail-header">
            <div class="text-subtitle-1 font-weight-medium">{{ taskDisplayName(selectedTask) }}</div>
            <div class="text-caption text-medium-emphasis mt-1">{{ selectedTask.rule_name || '-' }}</div>
            <div class="text-caption text-medium-emphasis mt-1 wrap-anywhere">{{ selectedTask.source_dir || selectedTask.id }}</div>
          </div>
          <v-chip :color="statusInfo(selectedTask.status).color" size="small" variant="tonal">
            {{ statusInfo(selectedTask.status).text }}
          </v-chip>
        </div>

        <v-table class="file-table border-s border-e border-b rounded-b" density="compact">
          <thead>
            <tr>
              <th>本地路径</th>
              <th>OpenList 路径</th>
              <th class="text-no-wrap">状态</th>
              <th>消息</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="file in selectedTask.files || []" :key="`${file.local_path}-${file.remote_path}`">
              <td class="path-cell align-top">
                <div class="path-text" :title="file.local_path">{{ file.local_path }}</div>
              </td>
              <td class="path-cell align-top">
                <div class="path-text" :title="file.remote_path">{{ file.remote_path }}</div>
              </td>
              <td class="align-top">
                <v-chip :color="statusInfo(file.status).color" size="x-small" variant="tonal">
                  {{ statusInfo(file.status).text }}
                </v-chip>
              </td>
              <td class="message-cell align-top">
                <div class="message-text" :title="file.message || '-'">{{ file.message || '-' }}</div>
              </td>
            </tr>
          </tbody>
        </v-table>
      </div>
    </v-expand-transition>
  </v-sheet>
</template>

<style>
.v-overlay__content:has(.media-openlist-upload-page) {
  width: min(60rem, calc(100vw - 48px)) !important;
  max-width: min(60rem, calc(100vw - 48px)) !important;
}

.v-overlay__content:has(.media-openlist-upload-page) > .v-card {
  width: 100%;
}
</style>

<style scoped>
.media-openlist-upload-page {
  width: 100%;
  overflow-x: hidden;
}

.page-header {
  padding-right: 48px;
}

.gap-2 {
  gap: 8px;
}

.gap-3 {
  gap: 12px;
}

.task-table :deep(.v-table__wrapper),
.file-table :deep(.v-table__wrapper) {
  overflow-x: auto;
}

.task-table tbody tr {
  cursor: pointer;
}

.task-table td,
.file-table td {
  vertical-align: top;
}

.bg-primary-lighten-1 {
  background: rgba(var(--v-theme-primary), 0.08) !important;
}

.task-path {
  max-width: 320px;
}

.error-cell {
  min-width: 180px;
  max-width: 240px;
}

.message-cell {
  min-width: 180px;
  max-width: 260px;
}

.path-cell {
  min-width: 260px;
  max-width: 420px;
}

.path-text,
.message-text,
.wrap-anywhere {
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
  line-height: 1.45;
}

.detail-header {
  min-width: 0;
  flex: 1 1 420px;
}

@media (max-width: 599px) {
  .page-header {
    padding-top: 28px;
  }

  .task-path,
  .error-cell,
  .message-cell,
  .path-cell {
    max-width: none;
  }
}

@media (min-width: 600px) {
  .w-sm-auto {
    width: auto !important;
  }
}
</style>
