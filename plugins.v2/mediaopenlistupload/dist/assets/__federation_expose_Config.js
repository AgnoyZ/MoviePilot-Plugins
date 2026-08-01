import { importShared } from './__federation_fn_import.js';
import { _ as _export_sfc } from './_plugin-vue_export-helper.js';

const {createElementVNode:_createElementVNode,resolveComponent:_resolveComponent,createVNode:_createVNode,withCtx:_withCtx,toDisplayString:_toDisplayString,createTextVNode:_createTextVNode,openBlock:_openBlock,createBlock:_createBlock,createCommentVNode:_createCommentVNode,renderList:_renderList,Fragment:_Fragment,createElementBlock:_createElementBlock,withModifiers:_withModifiers} = await importShared('vue');


const _hoisted_1 = { class: "mb-8" };
const _hoisted_2 = { class: "mb-6" };
const _hoisted_3 = { class: "mb-6" };
const _hoisted_4 = { class: "mb-5" };
const _hoisted_5 = { class: "d-flex align-center justify-space-between mb-6 flex-column flex-sm-row gap-2" };
const _hoisted_6 = { class: "w-100 min-w-0" };
const _hoisted_7 = { class: "text-caption text-medium-emphasis" };
const _hoisted_8 = { class: "d-flex align-center justify-space-between w-100 min-w-0 pr-6" };
const _hoisted_9 = { class: "d-flex align-center gap-3 min-w-0" };
const _hoisted_10 = { class: "min-w-0 flex-grow-1" };
const _hoisted_11 = { class: "text-body-2 font-weight-medium text-truncate" };
const _hoisted_12 = { class: "d-flex gap-2" };
const _hoisted_13 = { class: "pt-0 px-2 pb-2" };
const _hoisted_14 = {
  class: "d-flex align-center flex-wrap gap-2 pt-4 mt-5 position-sticky bottom-0 bg-surface border-t-sm",
  style: {"z-index":"1"}
};

const {computed,onMounted,reactive,ref,watch} = await importShared('vue');



const _sfc_main = {
  __name: 'Config',
  props: {
  modelValue: { type: Object, default: () => ({}) },
  config: { type: Object, default: () => ({}) },
  initialConfig: { type: Object, default: () => ({}) },
  api: { type: [Object, Function], default: null },
  pluginId: { type: String, default: '' },
},
  emits: ['update:modelValue', 'update:config', 'change', 'save', 'switch', 'close'],
  setup(__props, { emit: __emit }) {

const props = __props;

const emit = __emit;

const overwriteOptions = [
  { title: '跳过已存在文件', value: 'skip' },
  { title: '覆盖已存在文件', value: 'overwrite' },
  { title: '自动重命名', value: 'rename' },
];

const newId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  return `${Date.now()}-${Math.random()}`
};

const sourceConfig = () => {
  if (Object.keys(props.modelValue || {}).length) return props.modelValue
  if (Object.keys(props.config || {}).length) return props.config
  return props.initialConfig || {}
};

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
});

const normalize = () => {
  const source = sourceConfig();
  return {
    enabled: source.enabled ?? false,
    openlist_id: source.openlist_id || 'default',
    merge_delay: Number(source.merge_delay ?? 60),
    max_retries: Number(source.max_retries ?? 3),
    retry_interval: Number(source.retry_interval ?? 30),
    rules: Array.isArray(source.rules) ? source.rules.map(normalizeRule) : [],
    source_tag: source.source_tag ?? 'OpenList',
    openlist_items: Array.isArray(source.openlist_items) ? source.openlist_items : [],
  }
};

const form = reactive(normalize());
const openlistItems = ref(form.openlist_items);
const expandedRules = ref([]);

const selectedOpenListItems = computed(() => {
  if (openlistItems.value.length) return openlistItems.value
  return [{ title: '自动使用 MoviePilot 内置 Alist/OpenList 配置', value: 'default' }]
});

const effectivePluginId = computed(() => props.pluginId || 'MediaOpenListUpload');

const ruleSummary = computed(() => {
  const enabledCount = form.rules.filter((rule) => rule.enabled).length;
  return `${enabledCount}/${form.rules.length} 条规则启用`
});

const payload = computed(() => ({
  enabled: !!form.enabled,
  openlist_id: form.openlist_id || 'default',
  merge_delay: Number(form.merge_delay || 0),
  max_retries: Number(form.max_retries || 0),
  retry_interval: Number(form.retry_interval || 0),
  source_tag: form.source_tag || '',
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
}));

watch(payload, (value) => {
  emit('update:modelValue', value);
  emit('update:config', value);
  emit('change', value);
}, { deep: true, immediate: true });

const addRule = () => {
  const index = form.rules.length;
  const rule = normalizeRule({
    id: newId(),
    enabled: true,
    name: `规则${index + 1}`,
    include_scraping: form.default_include_scraping,
  }, index);
  form.rules.push(rule);
  expandedRules.value = [rule.id];
};

const removeRule = (index) => {
  form.rules.splice(index, 1);
};

const cloneRule = (rule) => {
  const clonedRule = {
    ...rule,
    id: newId(),
    name: `${rule.name || '规则'} 副本`,
  };
  form.rules.push(clonedRule);
  expandedRules.value = [clonedRule.id];
};

const callApiGet = async (path) => {
  if (!props.api) return null
  if (typeof props.api.get === 'function') return props.api.get(path)
  if (typeof props.api === 'function') return props.api('get', path)
  return null
};

const saveConfig = () => {
  emit('save', payload.value);
};

onMounted(async () => {
  try {
    const result = await callApiGet(`plugin/${effectivePluginId.value}/openlists`);
    const items = result?.items || result?.data?.items || [];
    if (Array.isArray(items) && items.length) {
      openlistItems.value = items.map((item) => ({
        title: item.name || item.id,
        value: item.id,
      }));
    }
  } catch (error) {
    console.warn('加载 OpenList 配置列表失败', error);
  }
});

return (_ctx, _cache) => {
  const _component_VDialogCloseBtn = _resolveComponent("VDialogCloseBtn");
  const _component_v_switch = _resolveComponent("v-switch");
  const _component_v_col = _resolveComponent("v-col");
  const _component_v_row = _resolveComponent("v-row");
  const _component_v_select = _resolveComponent("v-select");
  const _component_v_text_field = _resolveComponent("v-text-field");
  const _component_v_btn = _resolveComponent("v-btn");
  const _component_v_alert = _resolveComponent("v-alert");
  const _component_v_chip = _resolveComponent("v-chip");
  const _component_v_expansion_panel_title = _resolveComponent("v-expansion-panel-title");
  const _component_v_expansion_panel_text = _resolveComponent("v-expansion-panel-text");
  const _component_v_expansion_panel = _resolveComponent("v-expansion-panel");
  const _component_v_expansion_panels = _resolveComponent("v-expansion-panels");
  const _component_v_spacer = _resolveComponent("v-spacer");
  const _component_v_sheet = _resolveComponent("v-sheet");

  return (_openBlock(), _createBlock(_component_v_sheet, {
    class: "pa-4 pa-sm-6 mx-auto media-openlist-upload-config",
    color: "surface",
    "max-width": "1120",
    "min-height": "100%"
  }, {
    default: _withCtx(() => [
      _cache[15] || (_cache[15] = _createElementVNode("div", { class: "d-flex align-start align-sm-center justify-space-between mb-8 flex-column flex-sm-row pr-12 pr-sm-0" }, [
        _createElementVNode("div", null, [
          _createElementVNode("div", { class: "text-subtitle-1 font-weight-medium" }, "媒体整理 OpenList 上传"),
          _createElementVNode("div", { class: "text-body-2 text-medium-emphasis" }, " 整理完成后按启用规则上传命中的媒体库文件 ")
        ])
      ], -1)),
      _createVNode(_component_VDialogCloseBtn, {
        onClick: _cache[0] || (_cache[0] = $event => (emit('close')))
      }),
      _createElementVNode("div", _hoisted_1, [
        _createElementVNode("div", _hoisted_2, [
          _createVNode(_component_v_row, { dense: "" }, {
            default: _withCtx(() => [
              _createVNode(_component_v_col, { cols: "12" }, {
                default: _withCtx(() => [
                  _createVNode(_component_v_switch, {
                    modelValue: form.enabled,
                    "onUpdate:modelValue": _cache[1] || (_cache[1] = $event => ((form.enabled) = $event)),
                    color: "primary",
                    density: "comfortable",
                    "hide-details": "",
                    label: "启用插件"
                  }, null, 8, ["modelValue"])
                ]),
                _: 1
              })
            ]),
            _: 1
          })
        ]),
        _createElementVNode("div", _hoisted_3, [
          _createVNode(_component_v_row, { dense: "" }, {
            default: _withCtx(() => [
              _createVNode(_component_v_col, {
                cols: "12",
                sm: "6",
                lg: "3"
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_v_select, {
                    modelValue: form.openlist_id,
                    "onUpdate:modelValue": _cache[2] || (_cache[2] = $event => ((form.openlist_id) = $event)),
                    items: selectedOpenListItems.value,
                    density: "comfortable",
                    "hide-details": "auto",
                    "item-title": "title",
                    "item-value": "value",
                    label: "OpenList 配置",
                    variant: "outlined"
                  }, null, 8, ["modelValue", "items"])
                ]),
                _: 1
              }),
              _createVNode(_component_v_col, {
                cols: "12",
                sm: "6",
                lg: "3"
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_v_text_field, {
                    modelValue: form.source_tag,
                    "onUpdate:modelValue": _cache[3] || (_cache[3] = $event => ((form.source_tag) = $event)),
                    density: "comfortable",
                    "hide-details": "auto",
                    label: "上传来源标记",
                    placeholder: "OpenList；留空不添加",
                    variant: "outlined"
                  }, null, 8, ["modelValue"])
                ]),
                _: 1
              }),
              _createVNode(_component_v_col, {
                cols: "12",
                sm: "6",
                lg: "3"
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_v_text_field, {
                    modelValue: form.merge_delay,
                    "onUpdate:modelValue": _cache[4] || (_cache[4] = $event => ((form.merge_delay) = $event)),
                    modelModifiers: { number: true },
                    density: "comfortable",
                    "hide-details": "auto",
                    label: "合并等待",
                    min: "0",
                    suffix: "秒",
                    type: "number",
                    variant: "outlined"
                  }, null, 8, ["modelValue"])
                ]),
                _: 1
              }),
              _createVNode(_component_v_col, {
                cols: "12",
                sm: "6",
                lg: "3"
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_v_text_field, {
                    modelValue: form.max_retries,
                    "onUpdate:modelValue": _cache[5] || (_cache[5] = $event => ((form.max_retries) = $event)),
                    modelModifiers: { number: true },
                    density: "comfortable",
                    "hide-details": "auto",
                    label: "失败重试",
                    min: "0",
                    suffix: "次",
                    type: "number",
                    variant: "outlined"
                  }, null, 8, ["modelValue"])
                ]),
                _: 1
              }),
              _createVNode(_component_v_col, {
                cols: "12",
                sm: "6",
                lg: "3"
              }, {
                default: _withCtx(() => [
                  _createVNode(_component_v_text_field, {
                    modelValue: form.retry_interval,
                    "onUpdate:modelValue": _cache[6] || (_cache[6] = $event => ((form.retry_interval) = $event)),
                    modelModifiers: { number: true },
                    density: "comfortable",
                    "hide-details": "auto",
                    label: "重试间隔",
                    min: "0",
                    suffix: "秒",
                    type: "number",
                    variant: "outlined"
                  }, null, 8, ["modelValue"])
                ]),
                _: 1
              })
            ]),
            _: 1
          })
        ])
      ]),
      _createElementVNode("div", _hoisted_4, [
        _createElementVNode("div", _hoisted_5, [
          _createElementVNode("div", _hoisted_6, [
            _cache[9] || (_cache[9] = _createElementVNode("div", { class: "text-subtitle-1 font-weight-medium" }, "上传规则", -1)),
            _createElementVNode("div", _hoisted_7, _toDisplayString(ruleSummary.value), 1)
          ]),
          _createVNode(_component_v_btn, {
            class: "w-100 w-sm-auto",
            color: "primary",
            "prepend-icon": "mdi-plus",
            variant: "tonal",
            onClick: addRule
          }, {
            default: _withCtx(() => [...(_cache[10] || (_cache[10] = [
              _createTextVNode("新增规则", -1)
            ]))]),
            _: 1
          })
        ]),
        (!form.rules.length)
          ? (_openBlock(), _createBlock(_component_v_alert, {
              key: 0,
              density: "comfortable",
              type: "warning",
              variant: "tonal"
            }, {
              default: _withCtx(() => [...(_cache[11] || (_cache[11] = [
                _createTextVNode(" 当前没有上传规则，插件启用后也不会执行上传。 ", -1)
              ]))]),
              _: 1
            }))
          : (_openBlock(), _createBlock(_component_v_expansion_panels, {
              key: 1,
              modelValue: expandedRules.value,
              "onUpdate:modelValue": _cache[7] || (_cache[7] = $event => ((expandedRules).value = $event)),
              multiple: "",
              variant: "accordion"
            }, {
              default: _withCtx(() => [
                (_openBlock(true), _createElementBlock(_Fragment, null, _renderList(form.rules, (rule, index) => {
                  return (_openBlock(), _createBlock(_component_v_expansion_panel, {
                    key: rule.id || index,
                    value: rule.id || index,
                    class: "mb-4 border rounded",
                    elevation: "0"
                  }, {
                    default: _withCtx(() => [
                      _createVNode(_component_v_expansion_panel_title, { class: "px-4 py-2" }, {
                        default: _withCtx(() => [
                          _createElementVNode("div", _hoisted_8, [
                            _createElementVNode("div", _hoisted_9, [
                              _createVNode(_component_v_chip, {
                                color: rule.enabled ? 'success' : 'grey',
                                size: "small",
                                variant: "tonal"
                              }, {
                                default: _withCtx(() => [
                                  _createTextVNode(_toDisplayString(rule.enabled ? '启用' : '停用'), 1)
                                ]),
                                _: 2
                              }, 1032, ["color"]),
                              _createElementVNode("div", _hoisted_10, [
                                _createElementVNode("div", _hoisted_11, _toDisplayString(rule.name || `规则${index + 1}`), 1)
                              ])
                            ]),
                            _createElementVNode("div", _hoisted_12, [
                              _createVNode(_component_v_btn, {
                                icon: "mdi-content-copy",
                                size: "small",
                                variant: "text",
                                color: "medium-emphasis",
                                title: "复制规则",
                                onClick: _withModifiers($event => (cloneRule(rule)), ["stop"])
                              }, null, 8, ["onClick"]),
                              _createVNode(_component_v_btn, {
                                icon: "mdi-delete",
                                size: "small",
                                variant: "text",
                                color: "error",
                                title: "删除规则",
                                onClick: _withModifiers($event => (removeRule(index)), ["stop"])
                              }, null, 8, ["onClick"])
                            ])
                          ])
                        ]),
                        _: 2
                      }, 1024),
                      _createVNode(_component_v_expansion_panel_text, { class: "px-0" }, {
                        default: _withCtx(() => [
                          _createElementVNode("div", _hoisted_13, [
                            _createVNode(_component_v_row, { dense: "" }, {
                              default: _withCtx(() => [
                                _createVNode(_component_v_col, {
                                  cols: "12",
                                  sm: "6"
                                }, {
                                  default: _withCtx(() => [
                                    _createVNode(_component_v_switch, {
                                      modelValue: rule.enabled,
                                      "onUpdate:modelValue": $event => ((rule.enabled) = $event),
                                      color: "primary",
                                      density: "comfortable",
                                      "hide-details": "",
                                      label: "启用规则"
                                    }, null, 8, ["modelValue", "onUpdate:modelValue"])
                                  ]),
                                  _: 2
                                }, 1024),
                                _createVNode(_component_v_col, {
                                  cols: "12",
                                  sm: "6"
                                }, {
                                  default: _withCtx(() => [
                                    _createVNode(_component_v_switch, {
                                      modelValue: rule.include_scraping,
                                      "onUpdate:modelValue": $event => ((rule.include_scraping) = $event),
                                      color: "primary",
                                      density: "comfortable",
                                      "hide-details": "",
                                      label: "同步刮削文件"
                                    }, null, 8, ["modelValue", "onUpdate:modelValue"])
                                  ]),
                                  _: 2
                                }, 1024)
                              ]),
                              _: 2
                            }, 1024),
                            _createVNode(_component_v_row, {
                              dense: "",
                              class: "mt-4"
                            }, {
                              default: _withCtx(() => [
                                _createVNode(_component_v_col, {
                                  cols: "12",
                                  sm: "6"
                                }, {
                                  default: _withCtx(() => [
                                    _createVNode(_component_v_text_field, {
                                      modelValue: rule.name,
                                      "onUpdate:modelValue": $event => ((rule.name) = $event),
                                      placeholder: `规则${index + 1}`,
                                      density: "comfortable",
                                      "hide-details": "auto",
                                      label: "规则名称",
                                      variant: "outlined"
                                    }, null, 8, ["modelValue", "onUpdate:modelValue", "placeholder"])
                                  ]),
                                  _: 2
                                }, 1024),
                                _createVNode(_component_v_col, {
                                  cols: "12",
                                  sm: "6"
                                }, {
                                  default: _withCtx(() => [
                                    _createVNode(_component_v_select, {
                                      modelValue: rule.overwrite,
                                      "onUpdate:modelValue": $event => ((rule.overwrite) = $event),
                                      items: overwriteOptions,
                                      density: "comfortable",
                                      "hide-details": "auto",
                                      label: "覆盖方式",
                                      variant: "outlined"
                                    }, null, 8, ["modelValue", "onUpdate:modelValue"])
                                  ]),
                                  _: 2
                                }, 1024)
                              ]),
                              _: 2
                            }, 1024),
                            _createVNode(_component_v_row, {
                              dense: "",
                              class: "mt-4"
                            }, {
                              default: _withCtx(() => [
                                _createVNode(_component_v_col, {
                                  cols: "12",
                                  md: "6"
                                }, {
                                  default: _withCtx(() => [
                                    _createVNode(_component_v_text_field, {
                                      modelValue: rule.media_dir,
                                      "onUpdate:modelValue": $event => ((rule.media_dir) = $event),
                                      density: "comfortable",
                                      "hide-details": "auto",
                                      label: "媒体库目录",
                                      placeholder: "/media/movies",
                                      variant: "outlined"
                                    }, null, 8, ["modelValue", "onUpdate:modelValue"])
                                  ]),
                                  _: 2
                                }, 1024),
                                _createVNode(_component_v_col, {
                                  cols: "12",
                                  md: "6"
                                }, {
                                  default: _withCtx(() => [
                                    _createVNode(_component_v_text_field, {
                                      modelValue: rule.target_dir,
                                      "onUpdate:modelValue": $event => ((rule.target_dir) = $event),
                                      density: "comfortable",
                                      "hide-details": "auto",
                                      label: "OpenList 目标目录",
                                      placeholder: "/MoviePilot/Movies",
                                      variant: "outlined"
                                    }, null, 8, ["modelValue", "onUpdate:modelValue"])
                                  ]),
                                  _: 2
                                }, 1024)
                              ]),
                              _: 2
                            }, 1024),
                            _createVNode(_component_v_row, {
                              dense: "",
                              class: "mt-4"
                            }, {
                              default: _withCtx(() => [
                                _createVNode(_component_v_col, {
                                  cols: "12",
                                  sm: "6"
                                }, {
                                  default: _withCtx(() => [
                                    _createVNode(_component_v_text_field, {
                                      modelValue: rule.api_interval,
                                      "onUpdate:modelValue": $event => ((rule.api_interval) = $event),
                                      modelModifiers: { number: true },
                                      density: "comfortable",
                                      "hide-details": "auto",
                                      label: "操作间隔",
                                      min: "0",
                                      suffix: "秒",
                                      type: "number",
                                      variant: "outlined"
                                    }, null, 8, ["modelValue", "onUpdate:modelValue"])
                                  ]),
                                  _: 2
                                }, 1024),
                                _createVNode(_component_v_col, {
                                  cols: "12",
                                  sm: "6"
                                }, {
                                  default: _withCtx(() => [
                                    _createVNode(_component_v_text_field, {
                                      modelValue: rule.exclude_exts,
                                      "onUpdate:modelValue": $event => ((rule.exclude_exts) = $event),
                                      density: "comfortable",
                                      "hide-details": "auto",
                                      label: "排除后缀",
                                      placeholder: ".tmp,.part",
                                      variant: "outlined"
                                    }, null, 8, ["modelValue", "onUpdate:modelValue"])
                                  ]),
                                  _: 2
                                }, 1024)
                              ]),
                              _: 2
                            }, 1024)
                          ])
                        ]),
                        _: 2
                      }, 1024)
                    ]),
                    _: 2
                  }, 1032, ["value"]))
                }), 128))
              ]),
              _: 1
            }, 8, ["modelValue"]))
      ]),
      _createVNode(_component_v_alert, {
        class: "mb-5 text-body-2",
        density: "comfortable",
        type: "info",
        variant: "tonal"
      }, {
        default: _withCtx(() => [...(_cache[12] || (_cache[12] = [
          _createElementVNode("div", { class: "mb-1" }, [
            _createElementVNode("strong", null, "合并等待："),
            _createTextVNode("接收到整理事件后等待的时间，用于将短时间内同一媒体的多个文件合并为一次任务。")
          ], -1),
          _createElementVNode("div", { class: "mb-1" }, [
            _createElementVNode("strong", null, "目录填写："),
            _createTextVNode("【媒体库目录】为映射到MoviePilot内的路径（如 "),
            _createElementVNode("code", null, "/media/anime"),
            _createTextVNode("），【OpenList 目标目录】为OpenList目录路径（如 "),
            _createElementVNode("code", null, "/115/Media"),
            _createTextVNode("）。未匹配规则的事件将被忽略。")
          ], -1),
          _createElementVNode("div", { class: "mb-1" }, [
            _createElementVNode("strong", null, "排除后缀："),
            _createTextVNode("多个后缀使用英文逗号分隔（如 "),
            _createElementVNode("code", null, ".tmp,.part"),
            _createTextVNode("）。")
          ], -1),
          _createElementVNode("div", null, [
            _createElementVNode("strong", null, "上传来源标记："),
            _createTextVNode("仅对视频文件名追加来源信息，如 "),
            _createElementVNode("code", null, "流浪地球 (2019) [OpenList].mkv"),
            _createTextVNode("；留空则保持原文件名。")
          ], -1)
        ]))]),
        _: 1
      }),
      _createElementVNode("div", _hoisted_14, [
        _createVNode(_component_v_btn, {
          class: "flex-grow-1 flex-sm-grow-0",
          variant: "tonal",
          onClick: _cache[8] || (_cache[8] = $event => (emit('switch')))
        }, {
          default: _withCtx(() => [...(_cache[13] || (_cache[13] = [
            _createTextVNode("查看结果", -1)
          ]))]),
          _: 1
        }),
        _createVNode(_component_v_spacer, { class: "d-none d-sm-block" }),
        _createVNode(_component_v_btn, {
          class: "flex-grow-1 flex-sm-grow-0",
          color: "primary",
          "prepend-icon": "mdi-content-save",
          variant: "text",
          onClick: saveConfig
        }, {
          default: _withCtx(() => [...(_cache[14] || (_cache[14] = [
            _createTextVNode("保存", -1)
          ]))]),
          _: 1
        })
      ])
    ]),
    _: 1
  }))
}
}

};
const Config = /*#__PURE__*/_export_sfc(_sfc_main, [['__scopeId',"data-v-82fb937a"]]);

export { Config as default };
