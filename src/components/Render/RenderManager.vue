<!--
  模板渲染管理器主组件
  
  严格遵循PROJECT_REQUIREMENTS.md文档约束
  功能：集成所有渲染子组件，提供完整的模板渲染工作流
-->
<template>
  <div class="render-manager">
    <!-- 渲染工作区 -->
    <div class="render-workspace">
      <!-- 左侧：渲染控制和设置 -->
      <div class="render-sidebar">
        <el-tabs v-model="activeSidebarTab" class="sidebar-tabs">
          <!-- 渲染控制 -->
          <el-tab-pane label="渲染控制" name="control">
            <div class="control-panel">
              <!-- 模板选择 -->
              <div class="form-section">
                <label class="form-label">选择模板</label>
                <select v-model="selectedTemplate" class="form-control">
                  <option value="">请选择模板</option>
                  <option
                    v-for="template in availableTemplates"
                    :key="template.name"
                    :value="template.name"
                  >
                    {{ template.name }} 
                    <span v-if="template.description">- {{ template.description }}</span>
                  </option>
                </select>
                
                <button
                  @click="validateSelectedTemplate"
                  :disabled="!selectedTemplate || validating"
                  class="btn btn-sm btn-outline mt-2"
                >
                  <i class="fas fa-check-circle"></i>
                  {{ validating ? '验证中...' : '验证模板' }}
                </button>
              </div>

              <!-- 参数输入 -->
              <div class="form-section">
                <div class="section-header">
                  <label class="form-label">渲染参数</label>
                  <div class="section-actions">
                    <button
                      @click="loadParameterPreset"
                      :disabled="!selectedTemplate"
                      class="btn btn-sm btn-outline"
                    >
                      <i class="fas fa-folder-open"></i>
                      加载预设
                    </button>
                    <button
                      @click="saveAsPreset"
                      :disabled="!hasParameters"
                      class="btn btn-sm btn-outline"
                    >
                      <i class="fas fa-save"></i>
                      保存预设
                    </button>
                  </div>
                </div>

                <!-- 这里应该集成参数管理组件 -->
                <div class="parameter-inputs">
                  <div
                    v-for="(value, key) in renderParameters"
                    :key="key"
                    class="param-input-group"
                  >
                    <label class="param-label">{{ key }}</label>
                    <input
                      v-model="renderParameters[key]"
                      type="text"
                      class="form-control param-input"
                      @input="onParameterChange(key, $event.target.value)"
                    />
                  </div>
                  
                  <!-- 添加参数按钮 -->
                  <button
                    @click="addParameter"
                    class="btn btn-sm btn-outline add-param-btn"
                  >
                    <i class="fas fa-plus"></i>
                    添加参数
                  </button>
                </div>
              </div>

              <!-- 渲染操作 -->
              <div class="render-actions">
                <button
                  @click="startPreview"
                  :disabled="!canPreview || previewing"
                  class="btn btn-secondary btn-block"
                >
                  <i class="fas fa-eye" v-if="!previewing"></i>
                  <i class="fas fa-spinner fa-spin" v-else></i>
                  {{ previewing ? '预览中...' : '预览渲染' }}
                </button>

                <button
                  @click="startRender"
                  :disabled="!canRender || renderStore.isRendering"
                  class="btn btn-primary btn-block"
                >
                  <i class="fas fa-play" v-if="!renderStore.isRendering"></i>
                  <i class="fas fa-spinner fa-spin" v-else></i>
                  {{ renderStore.isRendering ? '渲染中...' : '开始渲染' }}
                </button>

                <button
                  v-if="renderStore.isRendering"
                  @click="renderStore.cancelRender"
                  class="btn btn-outline btn-block"
                >
                  <i class="fas fa-stop"></i>
                  取消渲染
                </button>
              </div>

              <!-- 渲染进度 -->
              <div v-if="renderStore.isRendering || previewing" class="render-progress">
                <div class="progress-info">
                  <span>渲染进度</span>
                  <span>{{ renderStore.renderProgress }}%</span>
                </div>
                <div class="progress-bar">
                  <div
                    class="progress-fill"
                    :style="{ width: renderStore.renderProgress + '%' }"
                  ></div>
                </div>
                <div v-if="renderStore.currentTemplate" class="current-operation">
                  正在渲染: {{ renderStore.currentTemplate }}
                </div>
              </div>
            </div>
          </el-tab-pane>

          <!-- 渲染设置 -->
          <el-tab-pane label="渲染设置" name="settings">
            <RenderSettings
              v-model="renderStore.settings"
              @settings-change="onSettingsChange"
            />
          </el-tab-pane>

          <!-- 批量导出 -->
          <el-tab-pane label="批量导出" name="export">
            <BatchExport
              ref="batchExportRef"
              @export-start="onExportStart"
              @export-complete="onExportComplete"
              @file-download="onFileDownload"
            />
          </el-tab-pane>
        </el-tabs>
      </div>

      <!-- 右侧：预览和结果 -->
      <div class="render-content">
        <el-tabs v-model="activeContentTab" class="content-tabs">
          <!-- 渲染预览 -->
          <el-tab-pane name="preview">
            <template #label>
              <span>
                <i class="fas fa-eye"></i>
                渲染预览
                <el-badge
                  v-if="renderStore.totalRenderErrors > 0"
                  :value="renderStore.totalRenderErrors"
                  type="danger"
                />
              </span>
            </template>
            
            <RenderPreview
              :render-result="renderStore.renderResult"
              :loading="renderStore.isRendering || previewing"
              @copy-content="onCopyContent"
              @download-file="onDownloadFile"
            />
          </el-tab-pane>

          <!-- 渲染历史 -->
          <el-tab-pane name="history">
            <template #label>
              <span>
                <i class="fas fa-history"></i>
                渲染历史
                <el-badge :value="renderStore.totalRenders" type="info" />
              </span>
            </template>
            
            <RenderHistory
              ref="renderHistoryRef"
              @rerender="onRerender"
              @preview-file="onPreviewFile"
              @download-file="onDownloadFile"
            />
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <!-- 状态栏 -->
    <div class="render-status-bar">
      <div class="status-left">
        <span class="status-item">
          <i class="fas fa-file-code"></i>
          模板: {{ selectedTemplate || '未选择' }}
        </span>
        <span class="status-item">
          <i class="fas fa-sliders-h"></i>
          参数: {{ Object.keys(renderParameters).length }} 个
        </span>
        <span class="status-item" v-if="renderStore.renderResult">
          <i class="fas fa-files"></i>
          生成: {{ renderStore.totalRenderFiles }} 个文件
        </span>
      </div>

      <div class="status-right">
        <span class="status-item" :class="renderStore.isRendering ? 'status-rendering' : 'status-idle'">
          <i class="fas fa-circle"></i>
          {{ renderStore.isRendering ? '渲染中' : '就绪' }}
        </span>
        <span class="status-item">
          成功率: {{ renderStore.successRate }}%
        </span>
      </div>
    </div>

    <!-- 添加参数对话框 -->
    <el-dialog
      v-model="showAddParamDialog"
      title="添加参数"
      width="400px"
    >
      <div class="form-group">
        <label class="form-label">参数名称</label>
        <input
          v-model="newParamKey"
          type="text"
          placeholder="输入参数名称"
          class="form-control"
        />
      </div>

      <div class="form-group">
        <label class="form-label">参数值</label>
        <input
          v-model="newParamValue"
          type="text"
          placeholder="输入参数值"
          class="form-control"
        />
      </div>

      <template #footer>
        <button @click="showAddParamDialog = false" class="btn btn-secondary">
          取消
        </button>
        <button
          @click="confirmAddParameter"
          class="btn btn-primary"
          :disabled="!newParamKey"
        >
          添加
        </button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRenderStore } from '@/stores/renderStore'
import RenderPreview from './RenderPreview.vue'
import RenderSettings from './RenderSettings.vue'
import BatchExport from './BatchExport.vue'
import RenderHistory from './RenderHistory.vue'

// Store
const renderStore = useRenderStore()

// 组件引用
const batchExportRef = ref<InstanceType<typeof BatchExport>>()
const renderHistoryRef = ref<InstanceType<typeof RenderHistory>>()

// 响应式数据
const activeSidebarTab = ref('control')
const activeContentTab = ref('preview')
const selectedTemplate = ref('')
const renderParameters = ref<Record<string, any>>({})
const validating = ref(false)
const previewing = ref(false)
const availableTemplates = ref<Array<{
  name: string
  description?: string
  render_count: number
  status: string
}>>([])

// 添加参数对话框
const showAddParamDialog = ref(false)
const newParamKey = ref('')
const newParamValue = ref('')

// 计算属性
const hasParameters = computed(() => Object.keys(renderParameters.value).length > 0)
const canPreview = computed(() => selectedTemplate.value && hasParameters.value)
const canRender = computed(() => selectedTemplate.value && hasParameters.value && !validating.value)

// 方法
const loadAvailableTemplates = async () => {
  try {
    const response = await fetch('/api/renderable-templates')
    if (response.ok) {
      availableTemplates.value = await response.json()
    }
  } catch (error) {
    console.warn('加载可用模板失败:', error)
  }
}

const validateSelectedTemplate = async () => {
  if (!selectedTemplate.value) return

  validating.value = true
  try {
    const response = await fetch(`/api/templates/${selectedTemplate.value}/validate`, {
      method: 'POST'
    })

    if (response.ok) {
      const result = await response.json()
      if (result.valid) {
        ElMessage.success('模板验证通过')
      } else {
        ElMessage.warning(`模板验证失败: ${result.errors?.join(', ')}`)
      }
    } else {
      throw new Error('验证请求失败')
    }
  } catch (error) {
    ElMessage.error('模板验证失败')
    console.error('模板验证错误:', error)
  } finally {
    validating.value = false
  }
}

const loadParameterPreset = () => {
  // 加载参数预设的逻辑
  ElMessage.info('参数预设加载功能开发中...')
}

const saveAsPreset = () => {
  // 保存参数预设的逻辑
  ElMessage.info('参数预设保存功能开发中...')
}

const addParameter = () => {
  newParamKey.value = ''
  newParamValue.value = ''
  showAddParamDialog.value = true
}

const confirmAddParameter = () => {
  if (newParamKey.value.trim()) {
    renderParameters.value[newParamKey.value.trim()] = newParamValue.value
    showAddParamDialog.value = false
    ElMessage.success('参数已添加')
  }
}

const onParameterChange = (key: string, value: string) => {
  // 参数变化处理
  renderParameters.value[key] = value
}

const startPreview = async () => {
  if (!canPreview.value) return

  previewing.value = true
  try {
    await renderStore.previewRender(selectedTemplate.value, renderParameters.value)
    activeContentTab.value = 'preview'
  } catch (error) {
    console.error('预览失败:', error)
  } finally {
    previewing.value = false
  }
}

const startRender = async () => {
  if (!canRender.value) return

  try {
    await renderStore.startRender(selectedTemplate.value, renderParameters.value)
    activeContentTab.value = 'preview'
    
    // 将渲染结果添加到批量导出
    if (batchExportRef.value && renderStore.renderResult) {
      const files = renderStore.renderResult.files.map(file => ({
        id: `file_${Date.now()}_${Math.random()}`,
        filename: file.filename,
        content: file.content,
        size: file.content.length,
        templateName: selectedTemplate.value,
        selected: true,
        status: 'completed' as const,
        exportTime: new Date().toISOString()
      }))
      
      batchExportRef.value.addFiles(files)
    }
  } catch (error) {
    console.error('渲染失败:', error)
  }
}

const onSettingsChange = (settings: any) => {
  // 设置变化处理
  console.log('设置已更新:', settings)
}

const onExportStart = (files: any[]) => {
  console.log('开始导出:', files)
}

const onExportComplete = (files: any[]) => {
  ElMessage.success(`成功导出 ${files.length} 个文件`)
}

const onCopyContent = (content: string) => {
  console.log('复制内容:', content.substring(0, 100) + '...')
}

const onDownloadFile = (file: any) => {
  console.log('下载文件:', file.filename)
}

const onRerender = (historyItem: any) => {
  selectedTemplate.value = historyItem.template_name
  renderParameters.value = { ...historyItem.parameters }
  startRender()
}

const onPreviewFile = (file: any) => {
  console.log('预览文件:', file.filename)
}

// 监听模板选择变化
watch(selectedTemplate, (newTemplate) => {
  if (newTemplate) {
    // 加载模板的默认参数
    loadTemplateParameters(newTemplate)
  } else {
    renderParameters.value = {}
  }
})

const loadTemplateParameters = async (templateName: string) => {
  try {
    const response = await fetch(`/api/templates/${templateName}/parameters`)
    if (response.ok) {
      const parameters = await response.json()
      renderParameters.value = parameters.reduce((acc: any, param: any) => {
        acc[param.name] = param.default || ''
        return acc
      }, {})
    }
  } catch (error) {
    console.warn('加载模板参数失败:', error)
  }
}

// 初始化
onMounted(() => {
  renderStore.initialize()
  loadAvailableTemplates()
})
</script>

<style scoped>
.render-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
}

.render-workspace {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.render-sidebar {
  width: 400px;
  border-right: 1px solid var(--vscode-panel-border);
  display: flex;
  flex-direction: column;
}

.render-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-tabs, .content-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.control-panel {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.form-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--vscode-foreground);
}

.form-control {
  padding: 6px 8px;
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  font-size: 13px;
}

.form-control:focus {
  outline: none;
  border-color: var(--vscode-focusBorder);
  box-shadow: 0 0 0 1px var(--vscode-focusBorder);
}

.section-actions {
  display: flex;
  gap: 4px;
}

.btn {
  padding: 6px 12px;
  border: 1px solid var(--vscode-button-border);
  border-radius: 4px;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn:hover {
  background: var(--vscode-button-hoverBackground);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 11px;
}

.btn-block {
  width: 100%;
  justify-content: center;
}

.btn-outline {
  background: transparent;
  border-color: var(--vscode-button-border);
}

.btn-primary {
  background: var(--vscode-button-background);
  border-color: var(--vscode-button-border);
  color: var(--vscode-button-foreground);
}

.btn-secondary {
  background: var(--vscode-button-secondaryBackground);
  border-color: var(--vscode-button-secondaryBorder);
  color: var(--vscode-button-secondaryForeground);
}

.mt-2 {
  margin-top: 8px;
}

.parameter-inputs {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.param-input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.param-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--vscode-descriptionForeground);
}

.param-input {
  font-size: 12px;
}

.add-param-btn {
  border-style: dashed;
  margin-top: 8px;
}

.render-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.render-progress {
  padding: 12px;
  background: var(--vscode-textCodeBlock-background);
  border-radius: 4px;
  border: 1px solid var(--vscode-panel-border);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
}

.progress-bar {
  height: 4px;
  background: var(--vscode-progressBar-background);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: var(--vscode-progressBar-foreground);
  transition: width 0.3s ease;
}

.current-operation {
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  text-align: center;
}

.render-status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: var(--vscode-panel-background);
  border-top: 1px solid var(--vscode-panel-border);
  font-size: 12px;
}

.status-left, .status-right {
  display: flex;
  gap: 16px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--vscode-descriptionForeground);
}

.status-rendering {
  color: var(--vscode-charts-orange);
}

.status-idle {
  color: var(--vscode-charts-green);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Element Plus 主题适配 */
:deep(.el-tabs) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

:deep(.el-tabs__content) {
  flex: 1;
  overflow: hidden;
}

:deep(.el-tab-pane) {
  height: 100%;
  overflow: hidden;
}

:deep(.el-tabs__header) {
  margin: 0;
  background: var(--vscode-panel-background);
  border-bottom: 1px solid var(--vscode-panel-border);
}

:deep(.el-tabs__nav-wrap) {
  padding: 0 16px;
}

:deep(.el-tabs__item) {
  color: var(--vscode-foreground);
  border-bottom-color: transparent;
}

:deep(.el-tabs__item.is-active) {
  color: var(--vscode-foreground);
  border-bottom-color: var(--vscode-tabs-activeForeground);
}

:deep(.el-tabs__item:hover) {
  color: var(--vscode-foreground);
}

:deep(.el-dialog) {
  background: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
  border: 1px solid var(--vscode-panel-border);
}

:deep(.el-dialog__header) {
  border-bottom: 1px solid var(--vscode-panel-border);
}

:deep(.el-dialog__title) {
  color: var(--vscode-foreground);
}

:deep(.el-dialog__body) {
  padding: 20px;
}

:deep(.el-dialog__footer) {
  border-top: 1px solid var(--vscode-panel-border);
  padding: 16px 20px;
}
</style>