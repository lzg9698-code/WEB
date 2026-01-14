<template>
  <div class="parameter-manager">
    <!-- 参数管理头部 -->
    <div class="manager-header">
      <div class="header-left">
        <h2>⚙️ 参数管理</h2>
        <div class="template-info" v-if="currentTemplate">
          <span class="template-name">{{ currentTemplate.displayName }}</span>
          <el-tag size="small" :color="currentTemplate.color">
            {{ currentTemplate.category }}
          </el-tag>
        </div>
      </div>
      
      <div class="header-actions">
        <el-button @click="resetAllParameters" :disabled="!currentTemplate">
          🔄 重置全部
        </el-button>
        <el-button @click="validateAllParameters" :disabled="!currentTemplate" type="warning">
          🧪 验证全部
        </el-button>
        <el-button @click="calculateAllParameters" :disabled="!currentTemplate" type="primary">
          🧮 计算全部
        </el-button>
        <el-button @click="exportParameters" :disabled="!currentTemplate">
          📤 导出参数
        </el-button>
        <el-button @click="importParameters" :disabled="!currentTemplate">
          📥 导入参数
        </el-button>
        <el-dropdown @command="handleMoreActions">
          <el-button>
            更多 <el-icon class="el-icon--right"><arrow-down /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="save-preset">💾 保存为预设</el-dropdown-item>
              <el-dropdown-item command="load-preset">📂 加载预设</el-dropdown-item>
              <el-dropdown-item command="clear-all" divided>🗑️ 清空所有</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
    
    <!-- 参数概览 -->
    <div class="parameter-overview" v-if="currentTemplate">
      <div class="overview-cards">
        <div class="overview-card">
          <div class="card-icon">📊</div>
          <div class="card-content">
            <div class="card-value">{{ parameterStore.flatParameters.length }}</div>
            <div class="card-label">总参数</div>
          </div>
        </div>
        
        <div class="overview-card">
          <div class="card-icon">✅</div>
          <div class="card-content">
            <div class="card-value">{{ parameterStore.filledParameters.length }}</div>
            <div class="card-label">已填写</div>
          </div>
        </div>
        
        <div class="overview-card">
          <div class="card-icon">⚠️</div>
          <div class="card-content">
            <div class="card-value">{{ parameterStore.requiredParameters.length }}</div>
            <div class="card-label">必填参数</div>
          </div>
        </div>
        
        <div class="overview-card">
          <div class="card-icon">📈</div>
          <div class="card-content">
            <div class="card-value">{{ parameterStore.completionPercentage }}%</div>
            <div class="card-label">完成度</div>
          </div>
        </div>
      </div>
      
      <!-- 进度条 -->
      <div class="progress-section">
        <div class="progress-header">
          <span>参数填写进度</span>
          <span class="progress-stats">
            完成度: {{ parameterStore.completionPercentage }}%
            <span v-if="parameterStore.hasErrors" class="error-text">
              ({{ parameterStore.errorCount }} 个错误)
            </span>
            <span v-if="parameterStore.hasWarnings" class="warning-text">
              ({{ parameterStore.warningCount }} 个警告)
            </span>
          </span>
        </div>
        <el-progress 
          :percentage="parameterStore.completionPercentage"
          :status="parameterStore.isValid ? 'success' : 'exception'"
          :stroke-width="12"
          :show-text="false"
        />
      </div>
    </div>
    
    <!-- 参数分组 -->
    <div class="parameter-groups" v-if="currentTemplate && parameterStore.parameterGroups.length > 0">
      <div class="groups-header">
        <h3>📋 参数分组</h3>
        <div class="group-controls">
          <el-button @click="expandAllGroups" size="small">
            ▼ 展开全部
          </el-button>
          <el-button @click="collapseAllGroups" size="small">
            ▲ 折叠全部
          </el-button>
        </div>
      </div>
      
      <div class="groups-container">
        <ParameterGroup
          v-for="group in parameterStore.parameterGroups"
          :key="group.key"
          :group="group"
          :model-value="parameterStore.parameters"
          :validation="parameterStore.validation"
          :disabled="loading"
          @update:model-value="handleGroupUpdate"
          @change="handleGroupChange"
        />
      </div>
    </div>
    
    <!-- 空状态 -->
    <div v-else class="empty-state">
      <div class="empty-icon">⚙️</div>
      <h3>请先选择一个模板包</h3>
      <p>从模板管理模块中选择一个模板包来配置参数</p>
      <el-button @click="$emit('select-template')" type="primary">
        去选择模板包
      </el-button>
    </div>
    
    <!-- 快速操作浮窗 -->
    <div v-if="currentTemplate && !isValid" class="floating-actions">
      <div class="floating-card">
        <h4>⚠️ 参数验证失败</h4>
        <p>请修正以下问题：</p>
        <ul>
          <li v-for="(error, key) in parameterStore.validation.errors" :key="key">
            {{ getParameterLabel(key) }}: {{ error }}
          </li>
        </ul>
        <el-button @click="validateAllParameters" type="primary" size="small">
          重新验证
        </el-button>
      </div>
    </div>
    
    <!-- 预设管理对话框 -->
    <el-dialog v-model="presetDialogVisible" title="💾 参数预设管理" width="600px">
      <div class="preset-dialog">
        <div class="preset-section">
          <h4>保存当前参数</h4>
          <el-input
            v-model="newPresetName"
            placeholder="输入预设名称"
            style="margin-bottom: 1rem;"
          />
          <el-button @click="savePreset" type="primary" :disabled="!newPresetName">
            保存预设
          </el-button>
        </div>
        
        <div class="preset-section">
          <h4>已保存的预设</h4>
          <div class="preset-list">
            <div
              v-for="preset in presets"
              :key="preset.name"
              class="preset-item"
            >
              <div class="preset-info">
                <div class="preset-name">{{ preset.name }}</div>
                <div class="preset-meta">{{ preset.createdAt }}</div>
              </div>
              <div class="preset-actions">
                <el-button size="small" @click="loadPreset(preset)">
                  📂 加载
                </el-button>
                <el-button size="small" @click="deletePreset(preset)" type="danger">
                  🗑️ 删除
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
    
    <!-- 导入参数对话框 -->
    <el-dialog v-model="importDialogVisible" title="📥 导入参数" width="500px">
      <div class="import-dialog">
        <el-upload
          ref="uploadRef"
          :auto-upload="false"
          :show-file-list="false"
          :accept="'.json'"
          :limit="1"
          @change="handleFileSelect"
        >
          <el-button type="primary">选择文件</el-button>
          <template #tip>
            <div class="el-upload__tip">
              只能上传.json格式的参数文件
            </div>
          </template>
        </el-upload>
        
        <div v-if="selectedFile" class="file-info">
          <h4>文件信息</h4>
          <p><strong>文件名:</strong> {{ selectedFile.name }}</p>
          <p><strong>文件大小:</strong> {{ formatFileSize(selectedFile.size) }}</p>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmImport" :loading="importing">
          导入
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
/**
 * 参数管理主组件
 * 
 * 此文件必须严格遵循PROJECT_REQUIREMENTS.md文档约束。
 * 任何修改都必须先更新需求文档，然后修改代码。
 * 违反此约束将导致代码被拒绝。
 */

import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown } from '@element-plus/icons-vue'
import { useTemplateStore } from '@/stores/templateStore'
import { useParameterStore } from '@/stores/parameterStore'
import ParameterGroup from './ParameterGroup.vue'
import type { TemplatePackage } from '@/services/api'

// Props
interface Props {
  currentTemplate: TemplatePackage | null
}

const props = withDefaults(defineProps<Props>(), {
  currentTemplate: null
})

// Emits
const emit = defineEmits<{
  'select-template': []
}>()

// Stores
const templateStore = useTemplateStore()
const parameterStore = useParameterStore()

// 响应式数据
const loading = ref(false)
const importing = ref(false)
const presetDialogVisible = ref(false)
const importDialogVisible = ref(false)
const newPresetName = ref('')
const selectedFile = ref<File | null>(null)
const presets = ref<any[]>([])

// 计算属性
const isValid = computed(() => parameterStore.isValid)

// 方法
const resetAllParameters = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要重置所有参数吗？此操作不可撤销。',
      '重置确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    parameterStore.resetParameters()
    ElMessage.success('所有参数已重置')
  } catch {
    // 用户取消
  }
}

const validateAllParameters = async () => {
  if (!props.currentTemplate) return
  
  loading.value = true
  try {
    await parameterStore.validateParameters(props.currentTemplate.name)
    
    if (parameterStore.isValid) {
      ElMessage.success('参数验证通过')
    } else {
      ElMessage.warning(`参数验证失败: ${parameterStore.errorCount} 个错误`)
    }
  } catch (error) {
    ElMessage.error('参数验证异常')
  } finally {
    loading.value = false
  }
}

const calculateAllParameters = async () => {
  if (!props.currentTemplate) return
  
  loading.value = true
  try {
    await parameterStore.calculateParameters(props.currentTemplate.name)
    ElMessage.success('派生参数计算完成')
  } catch (error) {
    ElMessage.error('参数计算异常')
  } finally {
    loading.value = false
  }
}

const exportParameters = () => {
  if (!props.currentTemplate) return
  
  try {
    const data = {
      template: props.currentTemplate.name,
      parameters: parameterStore.parameters,
      timestamp: new Date().toISOString()
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${props.currentTemplate.name}_parameters.json`
    a.click()
    URL.revokeObjectURL(url)
    
    ElMessage.success('参数已导出')
  } catch (error) {
    ElMessage.error('导出失败')
  }
}

const importParameters = () => {
  importDialogVisible.value = true
  selectedFile.value = null
}

const handleFileSelect = (file: any) => {
  selectedFile.value = file.raw
}

const confirmImport = async () => {
  if (!selectedFile.value) {
    ElMessage.warning('请选择要导入的文件')
    return
  }

  importing.value = true
  try {
    const text = await selectedFile.value.text()
    const data = JSON.parse(text)
    
    if (data.parameters) {
      parameterStore.updateParameters(data.parameters)
      ElMessage.success('参数导入成功')
      importDialogVisible.value = false
    } else {
      ElMessage.error('文件格式错误')
    }
  } catch (error) {
    ElMessage.error('导入失败')
  } finally {
    importing.value = false
    selectedFile.value = null
  }
}

const handleMoreActions = async (command: string) => {
  switch (command) {
    case 'save-preset':
      presetDialogVisible.value = true
      break
    case 'load-preset':
      presetDialogVisible.value = true
      break
    case 'clear-all':
      await resetAllParameters()
      break
  }
}

const savePreset = () => {
  if (!newPresetName.value) {
    ElMessage.warning('请输入预设名称')
    return
  }

  const preset = {
    name: newPresetName.value,
    parameters: parameterStore.parameters,
    template: props.currentTemplate?.name,
    createdAt: new Date().toLocaleString()
  }

  presets.value.push(preset)
  localStorage.setItem('parameter_presets', JSON.stringify(presets.value))
  
  ElMessage.success('预设保存成功')
  newPresetName.value = ''
}

const loadPreset = (preset: any) => {
  parameterStore.updateParameters(preset.parameters)
  ElMessage.success(`预设 "${preset.name}" 已加载`)
}

const deletePreset = async (preset: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除预设 "${preset.name}" 吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    const index = presets.value.findIndex(p => p.name === preset.name)
    if (index > -1) {
      presets.value.splice(index, 1)
      localStorage.setItem('parameter_presets', JSON.stringify(presets.value))
      ElMessage.success('预设已删除')
    }
  } catch {
    // 用户取消
  }
}

const expandAllGroups = () => {
  // TODO: 实现展开所有参数组
  ElMessage.info('展开所有组功能开发中...')
}

const collapseAllGroups = () => {
  // TODO: 实现折叠所有参数组
  ElMessage.info('折叠所有组功能开发中...')
}

const handleGroupUpdate = (value: Record<string, any>) => {
  parameterStore.updateParameters(value)
}

const handleGroupChange = (groupKey: string, value: any, validation: any) => {
  console.log(`参数组变更: ${groupKey}`, value, validation)
}

const getParameterLabel = (key: string): string => {
  const param = parameterStore.flatParameters.find(p => p.key === key)
  return param ? param.label : key
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 初始化
onMounted(() => {
  // 加载保存的预设
  const savedPresets = localStorage.getItem('parameter_presets')
  if (savedPresets) {
    try {
      presets.value = JSON.parse(savedPresets)
    } catch (error) {
      console.error('加载预设失败:', error)
    }
  }
})

// 监听模板变化
watch(() => props.currentTemplate, (newTemplate) => {
  if (newTemplate) {
    parameterStore.initialize(newTemplate.name)
  }
}, { immediate: true })
</script>

<style scoped>
.parameter-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.5rem;
  background: white;
  border-radius: 12px;
  margin-bottom: 1rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.header-left h2 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
  font-size: 1.5rem;
}

.template-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.template-name {
  font-weight: 500;
  color: #666;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.parameter-overview {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.overview-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.overview-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  transition: all 0.2s;
}

.overview-card:hover {
  border-color: #3498db;
  transform: translateY(-1px);
}

.card-icon {
  font-size: 2rem;
  opacity: 0.8;
}

.card-content {
  display: flex;
  flex-direction: column;
}

.card-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: #3498db;
  line-height: 1;
}

.card-label {
  font-size: 0.875rem;
  color: #666;
  margin-top: 0.25rem;
}

.progress-section {
  margin-top: 1rem;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
}

.progress-stats {
  color: #666;
}

.error-text {
  color: #f56c6c;
  margin-left: 0.5rem;
}

.warning-text {
  color: #e6a23c;
  margin-left: 0.5rem;
}

.parameter-groups {
  flex: 1;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.groups-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e4e7ed;
}

.groups-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.125rem;
}

.group-controls {
  display: flex;
  gap: 0.5rem;
}

.groups-container {
  padding: 1rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 4rem 2rem;
  text-align: center;
  color: #666;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.floating-actions {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  z-index: 1000;
}

.floating-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  max-width: 300px;
  border-left: 4px solid #f56c6c;
}

.floating-card h4 {
  margin: 0 0 0.75rem 0;
  color: #f56c6c;
}

.floating-card ul {
  margin: 0.75rem 0;
  padding-left: 1.5rem;
}

.floating-card li {
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: #666;
}

.preset-dialog {
  padding: 1rem 0;
}

.preset-section {
  margin-bottom: 2rem;
}

.preset-section h4 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
}

.preset-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
}

.preset-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f0f0f0;
}

.preset-item:last-child {
  border-bottom: none;
}

.preset-info {
  flex: 1;
}

.preset-name {
  font-weight: 500;
  color: #2c3e50;
}

.preset-meta {
  font-size: 0.75rem;
  color: #999;
}

.preset-actions {
  display: flex;
  gap: 0.5rem;
}

.import-dialog {
  padding: 1rem 0;
}

.file-info {
  margin-top: 1.5rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 6px;
}

.file-info h4 {
  margin: 0 0 0.75rem 0;
  color: #2c3e50;
}

.file-info p {
  margin: 0.25rem 0;
  font-size: 0.875rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .manager-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .overview-cards {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .groups-header {
    flex-direction: column;
    gap: 0.75rem;
    align-items: stretch;
  }
  
  .floating-actions {
    right: 1rem;
    bottom: 1rem;
  }
}
</style>
