import { importShared } from './__federation_fn_import.js';
import { _ as _export_sfc } from './_plugin-vue_export-helper.js';

const {createElementVNode:_createElementVNode,toDisplayString:_toDisplayString,createTextVNode:_createTextVNode,resolveComponent:_resolveComponent,withCtx:_withCtx,createVNode:_createVNode,openBlock:_openBlock,createBlock:_createBlock,createCommentVNode:_createCommentVNode,renderList:_renderList,Fragment:_Fragment,createElementBlock:_createElementBlock,withModifiers:_withModifiers,normalizeClass:_normalizeClass} = await importShared('vue');


const _hoisted_1 = { class: "page-header d-flex align-start align-sm-center justify-space-between mb-8 flex-column flex-sm-row pr-12 gap-3" };
const _hoisted_2 = { class: "text-body-2 text-medium-emphasis" };
const _hoisted_3 = { class: "d-flex gap-2 w-100 w-sm-auto flex-column flex-sm-row" };
const _hoisted_4 = {
  key: 2,
  class: "mb-6"
};
const _hoisted_5 = ["onClick"];
const _hoisted_6 = { class: "text-no-wrap align-top" };
const _hoisted_7 = { class: "align-top" };
const _hoisted_8 = { class: "text-body-2 font-weight-medium wrap-anywhere" };
const _hoisted_9 = { class: "text-caption text-medium-emphasis mt-1" };
const _hoisted_10 = { class: "text-caption text-medium-emphasis mt-1 wrap-anywhere task-path" };
const _hoisted_11 = { class: "align-top" };
const _hoisted_12 = { class: "text-center align-top" };
const _hoisted_13 = { class: "align-top error-cell" };
const _hoisted_14 = { class: "text-caption text-medium-emphasis wrap-anywhere" };
const _hoisted_15 = { class: "text-right align-top" };
const _hoisted_16 = {
  key: 0,
  class: "d-flex justify-center mt-4"
};
const _hoisted_17 = {
  key: 0,
  class: "mt-4"
};
const _hoisted_18 = { class: "d-flex align-center justify-space-between px-4 pt-4 pb-2 flex-wrap gap-2 border rounded-t bg-surface" };
const _hoisted_19 = { class: "detail-header" };
const _hoisted_20 = { class: "text-subtitle-1 font-weight-medium" };
const _hoisted_21 = { class: "text-caption text-medium-emphasis mt-1" };
const _hoisted_22 = { class: "text-caption text-medium-emphasis mt-1 wrap-anywhere" };
const _hoisted_23 = { class: "d-flex align-center flex-wrap gap-2" };
const _hoisted_24 = { class: "path-cell align-top" };
const _hoisted_25 = ["title"];
const _hoisted_26 = { class: "path-cell align-top" };
const _hoisted_27 = ["title"];
const _hoisted_28 = { class: "align-top" };
const _hoisted_29 = { class: "message-cell align-top" };
const _hoisted_30 = ["title"];

const {computed,onMounted,ref} = await importShared('vue');


const TASKS_PAGE_SIZE = 10;


const _sfc_main = {
  __name: 'Page',
  props: {
  api: { type: [Object, Function], default: null },
  pluginId: { type: String, default: '' },
  page: { type: [Object, Array], default: () => ({}) },
  config: { type: [Object, Array], default: () => [] },
},
  emits: ['action', 'switch', 'close'],
  setup(__props, { emit: __emit }) {

const props = __props;

const emit = __emit;

const loading = ref(false);
const actionLoading = ref('');
const errorMessage = ref('');
const tasks = ref([]);
const selectedTask = ref(null);
const currentPage = ref(1);
const totalTasks = ref(0);
const failedTasks = ref(0);
const pageSize = ref(TASKS_PAGE_SIZE);

const taskTotal = computed(() => totalTasks.value || tasks.value.length);
const failedTotal = computed(() => failedTasks.value || tasks.value.filter((task) => task.status === 'failed').length);
const pageCount = computed(() => Math.max(1, Math.ceil(taskTotal.value / pageSize.value)));
const effectivePluginId = computed(() => props.pluginId || 'MediaOpenListUpload');

const statusMap = {
  pending: { text: '等待中', color: 'grey' },
  running: { text: '上传中', color: 'primary' },
  success: { text: '成功', color: 'success' },
  failed: { text: '失败', color: 'error' },
  skipped: { text: '已跳过', color: 'warning' },
  cancelled: { text: '已取消', color: 'grey' },
};

const statusInfo = (status) => statusMap[status] || { text: status || '未知', color: 'grey' };

const taskDisplayName = (task) => {
  if (task?.display_name) return task.display_name
  const sourceDir = String(task?.source_dir || '');
  if (!sourceDir) return task?.id || '-'
  const normalized = sourceDir.replace(/\\/g, '/').replace(/\/+$/, '');
  const parts = normalized.split('/').filter(Boolean);
  if (!parts.length) return task?.id || '-'
  const last = parts[parts.length - 1];
  if (/^season\s+\d+/i.test(last) && parts.length > 1) return parts[parts.length - 2]
  return last
};

const callApi = async (method, path, body) => {
  if (!props.api) return null
  const clientMethod = props.api[method];
  if (typeof clientMethod === 'function') return clientMethod(path, body)
  if (typeof props.api === 'function') return props.api(method, path, body)
  return null
};

const apiPath = (path) => `plugin/${effectivePluginId.value}${path}`;

const normalizePage = (page) => {
  const parsed = Number(page);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : currentPage.value
};

const loadTasks = async (page = currentPage.value) => {
  const targetPage = normalizePage(page);
  loading.value = true;
  errorMessage.value = '';
  try {
    const result = await callApi('get', apiPath(`/tasks?page=${targetPage}&page_size=${pageSize.value}`));
    const payload = result?.data || result || {};
    const items = payload?.items || [];
    tasks.value = Array.isArray(items) ? items : [];
    totalTasks.value = Number(payload?.total) || tasks.value.length;
    failedTasks.value = Number(payload?.failed_total) || tasks.value.filter((task) => task.status === 'failed').length;
    currentPage.value = Number(payload?.page) || targetPage;

    if (tasks.value.length === 0) {
      let fallbackTasks = [];
      if (Array.isArray(props.page?.tasks)) {
        fallbackTasks = props.page.tasks;
      } else if (Array.isArray(props.config) && props.config[0]?.props?.items) {
        fallbackTasks = props.config[0].props.items;
      } else if (props.config?.tasks?.length) {
        fallbackTasks = props.config.tasks;
      }

      if (fallbackTasks.length > 0) {
        tasks.value = fallbackTasks;
        totalTasks.value = fallbackTasks.length;
        failedTasks.value = fallbackTasks.filter((task) => task.status === 'failed').length;
        currentPage.value = 1;
      }
    }

    if (taskTotal.value > 0 && currentPage.value > pageCount.value) {
      await loadTasks(pageCount.value);
      return
    }

    if (selectedTask.value) {
      const freshTask = tasks.value.find((task) => task.id === selectedTask.value.id);
      if (freshTask) {
        selectedTask.value = freshTask;
      } else if (selectedTask.value.id) {
        const detailResult = await callApi('get', apiPath(`/tasks/${selectedTask.value.id}`));
        selectedTask.value = detailResult?.task || detailResult?.data?.task || selectedTask.value;
      }
    }
    emit('action');
  } catch (error) {
    errorMessage.value = error?.message || '加载上传任务失败';
  } finally {
    loading.value = false;
  }
};

const selectTask = async (task) => {
  selectedTask.value = task;
  if (!task?.id) return
  try {
    const result = await callApi('get', apiPath(`/tasks/${task.id}`));
    selectedTask.value = result?.task || result?.data?.task || task;
  } catch (error) {
    errorMessage.value = error?.message || '加载任务详情失败';
  }
};

const retryTask = async (task) => {
  if (!task?.id || task.status !== 'failed') return
  actionLoading.value = task.id;
  errorMessage.value = '';
  try {
    const result = await callApi('post', apiPath(`/tasks/${task.id}/retry`));
    const success = result?.success ?? result?.data?.success;
    if (success === false) {
      errorMessage.value = result?.message || result?.data?.message || '重试任务提交失败';
      return
    }
    await loadTasks();
  } catch (error) {
    errorMessage.value = error?.message || '重试任务提交失败';
  } finally {
    actionLoading.value = '';
  }
};

const rescanTask = async (task) => {
  if (!task?.id) return
  actionLoading.value = `rescan:${task.id}`;
  errorMessage.value = '';
  try {
    const result = await callApi('post', apiPath(`/tasks/${task.id}/rescan`));
    const success = result?.success ?? result?.data?.success;
    if (success === false) {
      errorMessage.value = result?.message || result?.data?.message || '扫描并同步目录失败';
      return
    }
    const newTaskId = result?.task_id || result?.data?.task_id;
    await loadTasks();
    if (newTaskId) {
      const freshTask = tasks.value.find((item) => item.id === newTaskId);
      if (freshTask) {
        await selectTask(freshTask);
      }
    }
  } catch (error) {
    errorMessage.value = error?.message || '扫描并同步目录失败';
  } finally {
    actionLoading.value = '';
  }
};

const clearTasks = async () => {
  actionLoading.value = 'clear';
  errorMessage.value = '';
  try {
    const result = await callApi('post', apiPath('/tasks/clear'));
    const success = result?.success ?? result?.data?.success;
    if (success === false) {
      errorMessage.value = result?.message || result?.data?.message || '清理历史失败';
      return
    }
    selectedTask.value = null;
    currentPage.value = 1;
    await loadTasks();
  } catch (error) {
    errorMessage.value = error?.message || '清理历史失败';
  } finally {
    actionLoading.value = '';
  }
};

const changePage = async (page) => {
  if (page === currentPage.value || loading.value) return
  await loadTasks(page);
};

onMounted(loadTasks);

return (_ctx, _cache) => {
  const _component_v_btn = _resolveComponent("v-btn");
  const _component_VDialogCloseBtn = _resolveComponent("VDialogCloseBtn");
  const _component_v_alert = _resolveComponent("v-alert");
  const _component_v_chip = _resolveComponent("v-chip");
  const _component_v_table = _resolveComponent("v-table");
  const _component_v_pagination = _resolveComponent("v-pagination");
  const _component_v_expand_transition = _resolveComponent("v-expand-transition");
  const _component_v_sheet = _resolveComponent("v-sheet");

  return (_openBlock(), _createBlock(_component_v_sheet, {
    class: "pa-4 pa-sm-6 mx-auto media-openlist-upload-page",
    color: "surface",
    "max-width": "1120",
    "min-height": "100%"
  }, {
    default: _withCtx(() => [
      _createElementVNode("div", _hoisted_1, [
        _createElementVNode("div", null, [
          _cache[4] || (_cache[4] = _createElementVNode("div", { class: "text-subtitle-1 font-weight-medium" }, "上传结果", -1)),
          _createElementVNode("div", _hoisted_2, " 最近 " + _toDisplayString(taskTotal.value) + " 个任务，" + _toDisplayString(failedTotal.value) + " 个失败 ", 1)
        ]),
        _createElementVNode("div", _hoisted_3, [
          _createVNode(_component_v_btn, {
            loading: actionLoading.value === 'clear',
            color: "error",
            "prepend-icon": "mdi-delete-sweep",
            variant: "tonal",
            onClick: clearTasks
          }, {
            default: _withCtx(() => [...(_cache[5] || (_cache[5] = [
              _createTextVNode(" 清空 ", -1)
            ]))]),
            _: 1
          }, 8, ["loading"]),
          _createVNode(_component_v_btn, {
            loading: loading.value,
            color: "primary",
            "prepend-icon": "mdi-refresh",
            variant: "tonal",
            onClick: _cache[0] || (_cache[0] = $event => (loadTasks()))
          }, {
            default: _withCtx(() => [...(_cache[6] || (_cache[6] = [
              _createTextVNode(" 刷新 ", -1)
            ]))]),
            _: 1
          }, 8, ["loading"]),
          _createVNode(_component_v_btn, {
            "prepend-icon": "mdi-cog",
            variant: "tonal",
            onClick: _cache[1] || (_cache[1] = $event => (emit('switch')))
          }, {
            default: _withCtx(() => [...(_cache[7] || (_cache[7] = [
              _createTextVNode("配置", -1)
            ]))]),
            _: 1
          })
        ])
      ]),
      _createVNode(_component_VDialogCloseBtn, {
        onClick: _cache[2] || (_cache[2] = $event => (emit('close')))
      }),
      (errorMessage.value)
        ? (_openBlock(), _createBlock(_component_v_alert, {
            key: 0,
            class: "mb-6",
            density: "comfortable",
            type: "error",
            variant: "tonal"
          }, {
            default: _withCtx(() => [
              _createTextVNode(_toDisplayString(errorMessage.value), 1)
            ]),
            _: 1
          }))
        : _createCommentVNode("", true),
      (!loading.value && !tasks.value.length)
        ? (_openBlock(), _createBlock(_component_v_alert, {
            key: 1,
            class: "mb-6",
            density: "comfortable",
            type: "info",
            variant: "tonal"
          }, {
            default: _withCtx(() => [...(_cache[8] || (_cache[8] = [
              _createTextVNode(" 暂无上传任务。命中启用规则后，整理完成事件会生成上传记录。 ", -1)
            ]))]),
            _: 1
          }))
        : (_openBlock(), _createElementBlock("div", _hoisted_4, [
            _createVNode(_component_v_table, {
              class: "task-table border rounded",
              density: "comfortable",
              hover: ""
            }, {
              default: _withCtx(() => [
                _cache[10] || (_cache[10] = _createElementVNode("thead", null, [
                  _createElementVNode("tr", null, [
                    _createElementVNode("th", { class: "text-no-wrap" }, "时间"),
                    _createElementVNode("th", null, "任务"),
                    _createElementVNode("th", { class: "text-no-wrap" }, "状态"),
                    _createElementVNode("th", { class: "text-center text-no-wrap" }, "文件"),
                    _createElementVNode("th", null, "错误"),
                    _createElementVNode("th", { class: "text-right text-no-wrap" }, "操作")
                  ])
                ], -1)),
                _createElementVNode("tbody", null, [
                  (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(tasks.value, (task) => {
                    return (_openBlock(), _createElementBlock("tr", {
                      key: task.id,
                      class: _normalizeClass({ 'bg-primary-lighten-1': selectedTask.value?.id === task.id }),
                      onClick: $event => (selectTask(task))
                    }, [
                      _createElementVNode("td", _hoisted_6, _toDisplayString(task.created_at || '-'), 1),
                      _createElementVNode("td", _hoisted_7, [
                        _createElementVNode("div", _hoisted_8, _toDisplayString(taskDisplayName(task)), 1),
                        _createElementVNode("div", _hoisted_9, _toDisplayString(task.rule_name || '-'), 1),
                        _createElementVNode("div", _hoisted_10, _toDisplayString(task.source_dir || task.id), 1)
                      ]),
                      _createElementVNode("td", _hoisted_11, [
                        _createVNode(_component_v_chip, {
                          color: statusInfo(task.status).color,
                          size: "small",
                          variant: "tonal"
                        }, {
                          default: _withCtx(() => [
                            _createTextVNode(_toDisplayString(statusInfo(task.status).text), 1)
                          ]),
                          _: 2
                        }, 1032, ["color"])
                      ]),
                      _createElementVNode("td", _hoisted_12, _toDisplayString(task.file_count ?? task.files?.length ?? 0), 1),
                      _createElementVNode("td", _hoisted_13, [
                        _createElementVNode("div", _hoisted_14, _toDisplayString(task.error || '-'), 1)
                      ]),
                      _createElementVNode("td", _hoisted_15, [
                        _createVNode(_component_v_btn, {
                          disabled: task.status !== 'failed',
                          loading: actionLoading.value === task.id,
                          color: "primary",
                          size: "small",
                          variant: "text",
                          onClick: _withModifiers($event => (retryTask(task)), ["stop"])
                        }, {
                          default: _withCtx(() => [...(_cache[9] || (_cache[9] = [
                            _createTextVNode(" 重试 ", -1)
                          ]))]),
                          _: 1
                        }, 8, ["disabled", "loading", "onClick"])
                      ])
                    ], 10, _hoisted_5))
                  }), 128))
                ])
              ]),
              _: 1
            }),
            (pageCount.value > 1)
              ? (_openBlock(), _createElementBlock("div", _hoisted_16, [
                  _createVNode(_component_v_pagination, {
                    length: pageCount.value,
                    "model-value": currentPage.value,
                    density: "comfortable",
                    rounded: "circle",
                    "total-visible": "7",
                    "onUpdate:modelValue": changePage
                  }, null, 8, ["length", "model-value"])
                ]))
              : _createCommentVNode("", true)
          ])),
      _createVNode(_component_v_expand_transition, null, {
        default: _withCtx(() => [
          (selectedTask.value)
            ? (_openBlock(), _createElementBlock("div", _hoisted_17, [
                _createElementVNode("div", _hoisted_18, [
                  _createElementVNode("div", _hoisted_19, [
                    _createElementVNode("div", _hoisted_20, _toDisplayString(taskDisplayName(selectedTask.value)), 1),
                    _createElementVNode("div", _hoisted_21, _toDisplayString(selectedTask.value.rule_name || '-'), 1),
                    _createElementVNode("div", _hoisted_22, _toDisplayString(selectedTask.value.source_dir || selectedTask.value.id), 1)
                  ]),
                  _createElementVNode("div", _hoisted_23, [
                    _createVNode(_component_v_btn, {
                      loading: actionLoading.value === `rescan:${selectedTask.value.id}`,
                      color: "primary",
                      "prepend-icon": "mdi-folder-sync",
                      size: "small",
                      variant: "tonal",
                      onClick: _cache[3] || (_cache[3] = $event => (rescanTask(selectedTask.value)))
                    }, {
                      default: _withCtx(() => [...(_cache[11] || (_cache[11] = [
                        _createTextVNode(" 扫描并同步目录文件 ", -1)
                      ]))]),
                      _: 1
                    }, 8, ["loading"]),
                    _createVNode(_component_v_chip, {
                      color: statusInfo(selectedTask.value.status).color,
                      size: "small",
                      variant: "tonal"
                    }, {
                      default: _withCtx(() => [
                        _createTextVNode(_toDisplayString(statusInfo(selectedTask.value.status).text), 1)
                      ]),
                      _: 1
                    }, 8, ["color"])
                  ])
                ]),
                _createVNode(_component_v_table, {
                  class: "file-table border-s border-e border-b rounded-b",
                  density: "compact"
                }, {
                  default: _withCtx(() => [
                    _cache[12] || (_cache[12] = _createElementVNode("thead", null, [
                      _createElementVNode("tr", null, [
                        _createElementVNode("th", null, "本地路径"),
                        _createElementVNode("th", null, "OpenList 路径"),
                        _createElementVNode("th", { class: "text-no-wrap" }, "状态"),
                        _createElementVNode("th", null, "消息")
                      ])
                    ], -1)),
                    _createElementVNode("tbody", null, [
                      (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(selectedTask.value.files || [], (file) => {
                        return (_openBlock(), _createElementBlock("tr", {
                          key: `${file.local_path}-${file.remote_path}`
                        }, [
                          _createElementVNode("td", _hoisted_24, [
                            _createElementVNode("div", {
                              class: "path-text",
                              title: file.local_path
                            }, _toDisplayString(file.local_path), 9, _hoisted_25)
                          ]),
                          _createElementVNode("td", _hoisted_26, [
                            _createElementVNode("div", {
                              class: "path-text",
                              title: file.remote_path
                            }, _toDisplayString(file.remote_path), 9, _hoisted_27)
                          ]),
                          _createElementVNode("td", _hoisted_28, [
                            _createVNode(_component_v_chip, {
                              color: statusInfo(file.status).color,
                              size: "x-small",
                              variant: "tonal"
                            }, {
                              default: _withCtx(() => [
                                _createTextVNode(_toDisplayString(statusInfo(file.status).text), 1)
                              ]),
                              _: 2
                            }, 1032, ["color"])
                          ]),
                          _createElementVNode("td", _hoisted_29, [
                            _createElementVNode("div", {
                              class: "message-text",
                              title: file.message || '-'
                            }, _toDisplayString(file.message || '-'), 9, _hoisted_30)
                          ])
                        ]))
                      }), 128))
                    ])
                  ]),
                  _: 1
                })
              ]))
            : _createCommentVNode("", true)
        ]),
        _: 1
      })
    ]),
    _: 1
  }))
}
}

};
const Page = /*#__PURE__*/_export_sfc(_sfc_main, [['__scopeId',"data-v-eb2b6508"]]);

export { Page as default };
