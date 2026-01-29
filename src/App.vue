<template>
  <div id="app">
    <!-- 顶部工具栏 -->
    <div class="app-header">
      <div class="header-left">
        <h1>🔒 模板驱动的数控程序生成器</h1>
        <div class="constraint-info">
          <span class="badge constraint-active">约束机制已激活</span>
          <span class="version">v1.0.0</span>
          <span class="status" :class="{ 'status-healthy': systemHealthy }">
            {{ systemHealthy ? "✅ 系统正常" : "❌ 系统异常" }}
          </span>
        </div>
      </div>
      <div class="header-right">
        <el-button @click="refreshApp" :loading="loading">
          🔄 刷新系统
        </el-button>
        <el-button @click="showSystemInfo" type="info"> ℹ️ 系统信息 </el-button>
        <el-button @click="showConstraintInfo" type="warning">
          🔒 约束信息
        </el-button>
      </div>
    </div>

    <!-- 主布局 -->
    <div class="main-layout">
      <!-- 左侧导航 -->
      <div class="sidebar">
        <div class="nav-section">
          <h3>🛠️ 功能模块</h3>
          <div class="nav-menu">
            <div
              class="nav-item"
              :class="{ active: activeModule === 'template' }"
              @click="switchModule('template')"
            >
              <span class="nav-icon">📦</span>
              <span class="nav-text">模板管理</span>
              <el-badge
                :value="templateStore.packageCount"
                :max="99"
                class="nav-badge"
              />
            </div>

            <div
              class="nav-item"
              :class="{ active: activeModule === 'parameter' }"
              @click="switchModule('parameter')"
            >
              <span class="nav-icon">⚙️</span>
              <span class="nav-text">参数管理</span>
              <el-badge
                v-if="parameterStore.hasErrors"
                value="!"
                type="danger"
                class="nav-badge"
              />
            </div>

            <div
              class="nav-item"
              :class="{ active: activeModule === 'editor' }"
              @click="switchModule('editor')"
            >
              <span class="nav-icon">📝</span>
              <span class="nav-text">编辑器</span>
            </div>

            <div
              class="nav-item"
              :class="{ active: activeModule === 'render' }"
              @click="switchModule('render')"
            >
              <span class="nav-icon">🎨</span>
              <span class="nav-text">渲染引擎</span>
            </div>

            <div
              class="nav-item"
              :class="{ active: activeModule === 'file' }"
              @click="switchModule('file')"
            >
              <span class="nav-icon">📁</span>
              <span class="nav-text">文件管理</span>
            </div>
          </div>
        </div>

        <!-- 系统状态 -->
        <div class="system-status">
          <h4>📊 系统状态</h4>
          <div class="status-item">
            <span>约束机制:</span>
            <span class="status-active">🔒 激活</span>
          </div>
          <div class="status-item">
            <span>技术栈:</span>
            <span>Vue.js 3 + Flask</span>
          </div>
          <div class="status-item">
            <span>模板引擎:</span>
            <span>Jinja2</span>
          </div>
          <div class="status-item">
            <span>配置格式:</span>
            <span>YAML</span>
          </div>
        </div>
      </div>

      <!-- 主要内容区 -->
      <div class="content">
        <!-- 模板管理模块 -->
        <div v-if="activeModule === 'template'" class="module-content">
          <TemplateManager />
        </div>

        <!-- 参数管理模块 -->
        <div v-if="activeModule === 'parameter'" class="module-content">
          <!-- 模板选择器 -->
          <div class="parameter-header">
            <div class="template-selector">
              <span class="selector-label">📦 选择模板:</span>
              <el-select
                v-model="selectedTemplateForParameter"
                placeholder="请选择模板"
                class="template-select"
                @change="onTemplateSelectForParameter"
              >
                <el-option
                  v-for="pkg in templateStore.packages"
                  :key="pkg.name"
                  :value="pkg.name"
                >
                  <span style="display: flex; align-items: center; gap: 8px">
                    <span>{{ pkg.icon }}</span>
                    <span>{{ pkg.displayName }}</span>
                    <el-tag size="small" :color="pkg.color" effect="dark">
                      {{ pkg.category }}
                    </el-tag>
                  </span>
                </el-option>
              </el-select>
              <el-button
                @click="refreshParameters"
                :loading="parameterStore.loading"
              >
                🔄 刷新
              </el-button>
            </div>

            <!-- 当前模板信息 -->
            <div v-if="currentParameterTemplate" class="current-template-info">
              <span
                class="template-icon"
                :style="{ color: currentParameterTemplate.color }"
              >
                {{ currentParameterTemplate.icon }}
              </span>
              <div class="template-details">
                <span class="template-name">{{
                  currentParameterTemplate.displayName
                }}</span>
                <span class="template-meta">
                  v{{ currentParameterTemplate.version }} ·
                  {{ currentParameterTemplate.category }}
                </span>
              </div>
            </div>
          </div>

          <!-- 模板为空时的提示 -->
          <div v-if="!selectedTemplateForParameter" class="empty-state">
            <div class="empty-icon">⚙️</div>
            <h3>请选择一个模板</h3>
            <p>从上方下拉菜单选择一个模板来配置参数</p>
          </div>

          <!-- 参数内容（选中模板后显示） -->
          <div v-else class="parameter-content">
            <!-- 操作按钮 -->
            <div class="parameter-actions">
              <el-button
                @click="resetParameters"
                :loading="parameterStore.loading"
              >
                🔄 重置参数
              </el-button>
              <el-button
                @click="validateParameters"
                type="primary"
                :loading="parameterStore.loading"
              >
                🧪 验证参数
              </el-button>
              <el-button
                @click="calculateParameters"
                :loading="parameterStore.loading"
              >
                🧮 计算参数
              </el-button>
              <el-button
                @click="generatePreview"
                :type="showPreview ? 'primary' : 'default'"
                :loading="renderStore.isRendering"
              >
                👁️ 预览
              </el-button>
              <el-button
                @click="exportRender"
                :disabled="!renderStore.renderResult"
              >
                📦 导出
              </el-button>
            </div>

            <!-- 实时预览面板 -->
            <div v-if="showPreview" class="preview-panel">
              <div class="preview-header">
                <h3>👁️ 实时预览</h3>
                <el-button size="small" @click="showPreview = false">
                  关闭
                </el-button>
              </div>
              <div class="preview-content">
                <RenderPreview
                  v-if="renderStore.renderResult"
                  :render-result="{
                    template_name:
                      renderStore.renderResult.package_path ||
                      selectedTemplateForParameter,
                    render_time: renderStore.renderResult.render_time,
                    files: Object.values(
                      renderStore.renderResult.results || {},
                    ),
                    errors: renderStore.renderResult.errors,
                    logs: renderStore.renderResult.logs,
                  }"
                />
                <div v-else class="preview-empty">
                  <p>点击"预览"按钮生成渲染结果</p>
                </div>
              </div>
            </div>

            <!-- 参数完成度 -->
            <div class="progress-section">
              <h3>参数完成度</h3>
              <el-progress
                :percentage="parameterStore.completionPercentage"
                :status="parameterStore.isValid ? 'success' : 'exception'"
                :stroke-width="20"
              />
              <div class="progress-info">
                <span>完成度: {{ parameterStore.completionPercentage }}%</span>
                <span v-if="parameterStore.hasErrors" class="error-text">
                  ({{ parameterStore.errorCount }} 个错误)
                </span>
                <span v-if="parameterStore.hasWarnings" class="warning-text">
                  ({{ parameterStore.warningCount }} 个警告)
                </span>
              </div>
            </div>

            <!-- 参数组 -->
            <div class="parameter-groups">
              <div
                v-for="group in parameterStore.parameterGroups"
                :key="group.key"
                class="parameter-group"
              >
                <h4>{{ group.icon }} {{ group.name }}</h4>
                <div class="parameter-list">
                  <div
                    v-for="param in group.parameters"
                    :key="param.key"
                    class="parameter-item"
                  >
                    <div class="parameter-label">
                      {{ param.label }}
                      <span v-if="param.required" class="required">*</span>
                      <span v-if="param.unit" class="unit"
                        >({{ param.unit }})</span
                      >
                    </div>
                    <div class="parameter-control">
                      <el-input
                        v-if="param.type === 'string'"
                        v-model="parameters[param.key]"
                        :placeholder="param.description"
                        @input="updateParameter(param.key, $event)"
                      />
                      <el-input-number
                        v-else-if="
                          ['number', 'length', 'angle', 'speed'].includes(
                            param.type,
                          )
                        "
                        v-model="parameters[param.key]"
                        :min="param.range?.[0]"
                        :max="param.range?.[1]"
                        @change="updateParameter(param.key, $event)"
                      />
                      <el-switch
                        v-else-if="param.type === 'boolean'"
                        v-model="parameters[param.key]"
                        @change="updateParameter(param.key, $event)"
                      />
                      <el-select
                        v-else-if="param.type === 'select'"
                        v-model="parameters[param.key]"
                        @change="updateParameter(param.key, $event)"
                      >
                        <el-option
                          v-for="option in param.options"
                          :key="option"
                          :label="option"
                          :value="option"
                        />
                      </el-select>
                    </div>
                    <div
                      v-if="validation.errors[param.key]"
                      class="error-message"
                    >
                      {{ validation.errors[param.key] }}
                    </div>
                    <div
                      v-if="validation.warnings[param.key]"
                      class="warning-message"
                    >
                      {{ validation.warnings[param.key] }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 编辑器模块 -->
        <div v-if="activeModule === 'editor'" class="module-content">
          <EditorModule
            @file-open="handleEditorFileOpen"
            @save="handleEditorSave"
          />
        </div>

        <!-- 渲染引擎模块 -->
        <div v-if="activeModule === 'render'" class="module-content">
          <div class="module-header">
            <h2>🎨 渲染引擎</h2>
          </div>
          <div class="empty-state">
            <div class="empty-icon">🎨</div>
            <h3>渲染引擎开发中...</h3>
            <p>即将支持Jinja2模板渲染和实时预览</p>
          </div>
        </div>

        <!-- 文件管理模块 -->
        <div v-if="activeModule === 'file'" class="module-content">
          <div class="module-header">
            <h2>📁 文件管理</h2>
          </div>
          <div class="empty-state">
            <div class="empty-icon">📁</div>
            <h3>文件管理模块开发中...</h3>
            <p>即将支持文件存储、组织和备份功能</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 系统信息对话框 -->
    <el-dialog v-model="systemInfoVisible" title="ℹ️ 系统信息" width="600px">
      <div class="system-info-content">
        <div class="info-section">
          <h4>基本信息</h4>
          <div class="info-grid">
            <div class="info-item">
              <span>应用名称:</span>
              <span>模板驱动的数控程序生成器</span>
            </div>
            <div class="info-item">
              <span>版本:</span>
              <span>1.0.0</span>
            </div>
            <div class="info-item">
              <span>约束状态:</span>
              <span class="status-active">🔒 已激活</span>
            </div>
            <div class="info-item">
              <span>模板包数量:</span>
              <span>{{ templateStore.packageCount }}</span>
            </div>
          </div>
        </div>

        <div class="info-section">
          <h4>技术栈</h4>
          <div class="tech-stack">
            <el-tag>Vue.js 3</el-tag>
            <el-tag type="success">TypeScript</el-tag>
            <el-tag type="warning">Pinia</el-tag>
            <el-tag type="info">Element Plus</el-tag>
            <el-tag>Python Flask</el-tag>
            <el-tag type="danger">Jinja2</el-tag>
            <el-tag>PyYAML</el-tag>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 约束信息对话框 -->
    <el-dialog
      v-model="constraintInfoVisible"
      title="🔒 约束信息"
      width="600px"
    >
      <div class="constraint-info-content">
        <div class="constraint-status">
          <div class="status-item">
            <span>文档约束:</span>
            <span class="status-active">📋 PROJECT_REQUIREMENTS.md</span>
          </div>
          <div class="status-item">
            <span>约束状态:</span>
            <span class="status-active">🔒 已激活</span>
          </div>
          <div class="status-item">
            <span>强制执行:</span>
            <span class="status-active">🛡️ 是</span>
          </div>
          <div class="status-item">
            <span>违规处理:</span>
            <span class="status-active">⚠️ 自动阻止</span>
          </div>
        </div>

        <div class="constraint-rules">
          <h4>约束规则</h4>
          <ul>
            <li>✅ 技术栈严格遵循文档定义</li>
            <li>✅ 文件格式必须符合规范</li>
            <li>✅ 功能范围不得超出定义</li>
            <li>✅ API接口必须使用RESTful</li>
            <li>✅ 数据格式必须使用JSON</li>
            <li>✅ 任何需求变更必须先更新文档</li>
          </ul>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
/**
 * 根组件 - 严格遵循PROJECT_REQUIREMENTS.md文档约束
 */

import { ref, computed, onMounted, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useTemplateManagerStore } from "@/stores/templateManagerStore";
import { useParameterManagerStore } from "@/stores/parameterManagerStore";
import { useRenderStore } from "@/stores/renderStore";
import TemplateManager from "@/components/TemplateManager/TemplateManager.vue";
import EditorModule from "@/components/Editor/EditorModule.vue";
import { RenderPreview } from "@/components/Render";
import { renderApi } from "@/services/api";

// Stores
const templateStore = useTemplateManagerStore();
const parameterStore = useParameterManagerStore();
const renderStore = useRenderStore();

// 响应式数据
const activeModule = ref("template");
const systemHealthy = ref(true);
const loading = ref(false);
const systemInfoVisible = ref(false);
const constraintInfoVisible = ref(false);
const selectedTemplateForParameter = ref<string | null>(null);
const showPreview = ref(false);

// 计算属性
const parameters = computed(() => parameterStore.parameters);
const validation = computed(() => parameterStore.validation);

// 当前参数管理的模板信息
const currentParameterTemplate = computed(() => {
  if (!selectedTemplateForParameter.value) return null;
  return (
    templateStore.packages.find(
      (p) => p.name === selectedTemplateForParameter.value,
    ) || null
  );
});

// 初始化
onMounted(async () => {
  console.log("🚀 应用初始化");
  console.log("🔒 约束执行机制已激活");
  console.log("📋 严格遵循PROJECT_REQUIREMENTS.md文档");

  await initializeApp();
});

// 监听参数变化，自动生成预览
watch(
  () => parameterStore.parameters,
  () => {
    if (showPreview.value) {
      autoGeneratePreview();
    }
  },
  { deep: true },
);

// 初始化应用
const initializeApp = async () => {
  try {
    await templateStore.initialize();
    systemHealthy.value = true;
    console.log("✅ 应用初始化完成");
  } catch (error) {
    systemHealthy.value = false;
    console.error("❌ 应用初始化失败:", error);
    ElMessage.error("应用初始化失败");
  }
};

// 切换模块
const switchModule = async (module: string) => {
  activeModule.value = module;
  console.log(`🔒 切换到模块: ${module}`);
};

// 选择参数管理的模板
const onTemplateSelectForParameter = async (packageName: string | null) => {
  if (!packageName) {
    selectedTemplateForParameter.value = null;
    return;
  }

  console.log(`🔒 参数管理选择模板: ${packageName}`);

  // 加载参数配置
  try {
    await parameterStore.loadParameters(packageName);
    console.log(`✅ 已加载模板 "${packageName}" 的参数配置`);
  } catch (error) {
    console.error("❌ 加载参数配置失败:", error);
    ElMessage.error("加载参数配置失败");
  }
};

// 刷新参数
const refreshParameters = async () => {
  if (!selectedTemplateForParameter.value) {
    ElMessage.warning("请先选择一个模板");
    return;
  }

  try {
    await parameterStore.loadParameters(selectedTemplateForParameter.value);
    ElMessage.success("参数已刷新");
  } catch (error) {
    ElMessage.error("刷新参数失败");
  }
};

// 更新参数
const updateParameter = (paramKey: string, value: any) => {
  parameterStore.updateParameter(paramKey, value);
};

// 重置参数
const resetParameters = () => {
  if (!selectedTemplateForParameter.value) {
    ElMessage.warning("请先选择一个模板");
    return;
  }

  parameterStore.resetParameters();
  ElMessage.success("参数已重置");
};

// 验证参数
const validateParameters = async () => {
  if (!selectedTemplateForParameter.value) {
    ElMessage.warning("请先选择一个模板");
    return;
  }

  try {
    await parameterStore.validateParameters(selectedTemplateForParameter.value);

    if (parameterStore.isValid) {
      ElMessage.success("参数验证通过");
    } else {
      ElMessage.warning(`参数验证失败: ${parameterStore.errorCount} 个错误`);
    }
  } catch (error) {
    ElMessage.error("参数验证异常");
  }
};

// 计算参数
const calculateParameters = async () => {
  if (!selectedTemplateForParameter.value) {
    ElMessage.warning("请先选择一个模板");
    return;
  }

  try {
    await parameterStore.calculateParameters(
      selectedTemplateForParameter.value,
    );
    ElMessage.success("派生参数计算完成");
  } catch (error) {
    ElMessage.error("参数计算异常");
  }
};

// 生成预览
const generatePreview = async () => {
  if (!selectedTemplateForParameter.value) {
    ElMessage.warning("请先选择一个模板");
    return;
  }

  showPreview.value = true;
  try {
    await renderStore.startRender(
      selectedTemplateForParameter.value,
      parameterStore.parameters,
    );
  } catch (error) {
    ElMessage.error("预览生成失败");
  }
};

// 防抖定时器
let previewDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// 自动生成预览（防抖）
const autoGeneratePreview = () => {
  if (!showPreview.value || !selectedTemplateForParameter.value) return;

  if (previewDebounceTimer) {
    clearTimeout(previewDebounceTimer);
  }

  previewDebounceTimer = setTimeout(async () => {
    try {
      await renderStore.startRender(
        selectedTemplateForParameter.value!,
        parameterStore.parameters,
      );
    } catch (error) {
      // 静默失败，不显示错误提示
      console.log("自动预览失败:", error);
    }
  }, 1500); // 1.5秒防抖
};

// 导出渲染结果
const exportRender = async () => {
  if (!renderStore.renderResult || !selectedTemplateForParameter.value) {
    ElMessage.warning("没有可导出的渲染结果");
    return;
  }

  try {
    const blob = await renderApi.export(
      selectedTemplateForParameter.value,
      parameterStore.parameters,
    );

    // 下载文件
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedTemplateForParameter.value}_${new Date().toISOString().slice(0, 19).replace(/[:-]/g, "")}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    ElMessage.success("导出成功");
  } catch (error) {
    ElMessage.error("导出失败");
  }
};

// 模板选择事件处理
const onTemplateSelected = async (template: any) => {
  console.log(`🔒 App.vue 收到模板选择事件: ${template.displayName}`);

  // 如果当前在参数管理模块，自动加载参数
  if (activeModule.value === "parameter") {
    try {
      await parameterStore.loadParameters(template.name);
      console.log(`✅ 已加载模板 "${template.name}" 的参数配置`);
    } catch (error) {
      console.error("❌ 加载参数配置失败:", error);
    }
  }
};

// 刷新应用
const refreshApp = async () => {
  loading.value = true;
  try {
    await templateStore.initialize();
    ElMessage.success("系统刷新完成");
  } catch (error) {
    ElMessage.error("系统刷新失败");
  } finally {
    loading.value = false;
  }
};

// 显示系统信息
const showSystemInfo = () => {
  systemInfoVisible.value = true;
};

// 显示约束信息
const showConstraintInfo = () => {
  constraintInfoVisible.value = true;
};

// 编辑器事件处理
const handleEditorFileOpen = (path: string) => {
  console.log(`📝 编辑器打开文件: ${path}`);
};

const handleEditorSave = (path: string, content: string) => {
  console.log(`📝 编辑器保存文件: ${path}`);
};
</script>

<style scoped>
#app {
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  min-height: 100vh;
  background: #f5f5f5;
}

.app-header {
  background: #2c3e50;
  color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-left h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.constraint-info {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
  font-size: 0.875rem;
}

.badge {
  background: #27ae60;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
}

.constraint-active {
  background: #e74c3c;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
  100% {
    opacity: 1;
  }
}

.version {
  background: #3498db;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.status {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.status-healthy {
  background: #27ae60;
}

.main-layout {
  display: flex;
  height: calc(100vh - 80px);
}

.sidebar {
  width: 280px;
  background: white;
  border-right: 1px solid #ddd;
  overflow-y: auto;
}

.nav-section {
  padding: 1.5rem 1rem;
  border-bottom: 1px solid #eee;
}

.nav-section h3 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.nav-item:hover {
  background: #f8f9fa;
}

.nav-item.active {
  background: #3498db;
  color: white;
}

.nav-icon {
  font-size: 1.25rem;
  margin-right: 0.75rem;
  width: 1.5rem;
  text-align: center;
}

.nav-text {
  flex: 1;
  font-weight: 500;
}

.nav-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
}

.system-status {
  padding: 1.5rem 1rem;
}

.system-status h4 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
}

.status-item span:first-child {
  color: #666;
}

.status-active {
  color: #e74c3c;
  font-weight: 500;
}

.content {
  flex: 1;
  overflow-y: auto;
  background: #f8f9fa;
}

.module-content {
  padding: 2rem;
  min-height: 100%;
}

.module-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.module-header h2 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.5rem;
}

.module-actions {
  display: flex;
  gap: 0.75rem;
}

.parameter-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.progress-section {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.progress-section h3 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
}

.progress-info {
  display: flex;
  gap: 1rem;
  margin-top: 0.75rem;
  font-size: 0.875rem;
}

.error-text {
  color: #e74c3c;
}

.warning-text {
  color: #f39c12;
}

.parameter-groups {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.parameter-group {
  border-bottom: 1px solid #eee;
}

.parameter-group:last-child {
  border-bottom: none;
}

.parameter-group h4 {
  margin: 0;
  padding: 1.25rem 1.5rem 1rem 1.5rem;
  background: #f8f9fa;
  border-bottom: 1px solid #eee;
  color: #2c3e50;
}

.parameter-list {
  padding: 1.5rem;
}

.parameter-item {
  margin-bottom: 1.5rem;
}

.parameter-item:last-child {
  margin-bottom: 0;
}

.parameter-label {
  font-weight: 500;
  margin-bottom: 0.5rem;
  color: #2c3e50;
}

.required {
  color: #e74c3c;
  margin-left: 0.25rem;
}

.unit {
  color: #666;
  font-size: 0.875rem;
  margin-left: 0.25rem;
}

.error-message {
  color: #e74c3c;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.warning-message {
  color: #f39c12;
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  color: #666;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.system-info-content,
.constraint-info-content {
  padding: 1rem 0;
}

.info-section {
  margin-bottom: 2rem;
}

.info-section h4 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #eee;
}

.info-item span:first-child {
  color: #666;
  font-weight: 500;
}

.tech-stack {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.constraint-status {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 2rem;
}

.constraint-rules h4 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
}

.constraint-rules ul {
  margin: 0;
  padding-left: 1.5rem;
}

.constraint-rules li {
  margin-bottom: 0.5rem;
  color: #666;
}

/* 参数管理模块样式 */
.parameter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: white;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  flex-wrap: wrap;
  gap: 1rem;
}

.template-selector {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.selector-label {
  font-weight: 500;
  color: #2c3e50;
  white-space: nowrap;
}

.template-select {
  width: 280px;
}

.current-template-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.current-template-info .template-icon {
  font-size: 1.5rem;
}

.current-template-info .template-details {
  display: flex;
  flex-direction: column;
}

.current-template-info .template-name {
  font-weight: 600;
  color: #2c3e50;
  font-size: 0.875rem;
}

.current-template-info .template-meta {
  font-size: 0.75rem;
  color: #666;
}

.parameter-actions {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

/* 预览面板样式 */
.preview-panel {
  margin-top: 1rem;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e4e7ed;
}

.preview-panel .preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e4e7ed;
}

.preview-panel .preview-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.125rem;
}

.preview-panel .preview-content {
  padding: 1rem;
  max-height: 500px;
  overflow: auto;
}

.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
  color: #666;
}

.preview-empty p {
  margin-bottom: 1rem;
}

@media (max-width: 768px) {
  .parameter-header {
    flex-direction: column;
    align-items: stretch;
  }

  .template-selector {
    flex-direction: column;
    align-items: stretch;
  }

  .template-select {
    width: 100%;
  }
}
</style>
