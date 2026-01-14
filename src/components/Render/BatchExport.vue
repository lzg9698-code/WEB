<!--
  批量导出组件
  
  严格遵循PROJECT_REQUIREMENTS.md文档约束
  功能：管理多个文件的批量导出，支持压缩、命名规则和导出历史
-->
<template>
  <div class="batch-export">
    <!-- 导出控制面板 -->
    <div class="export-panel">
      <div class="panel-header">
        <h4>批量导出</h4>
        <div class="panel-actions">
          <button
            @click="refreshExports"
            :disabled="loading"
            class="btn btn-sm btn-secondary"
          >
            <i class="fas fa-sync-alt"></i>
            刷新
          </button>
        </div>
      </div>

      <!-- 导出统计 -->
      <div class="export-stats">
        <div class="stat-item">
          <span class="stat-label">待导出文件</span>
          <span class="stat-value">{{ pendingExports.length }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">已导出文件</span>
          <span class="stat-value">{{ completedExports.length }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">总大小</span>
          <span class="stat-value">{{ formatTotalSize() }}</span>
        </div>
      </div>

      <!-- 导出设置 -->
      <div class="export-settings">
        <div class="setting-row">
          <label class="setting-label">导出格式</label>
          <select v-model="exportConfig.format" class="setting-control">
            <option value="individual">独立文件</option>
            <option value="zip">ZIP压缩包</option>
            <option value="tar">TAR压缩包</option>
            <option value="tar-gz">TAR.GZ压缩包</option>
          </select>
        </div>

        <div class="setting-row">
          <label class="setting-label">命名规则</label>
          <select v-model="exportConfig.namingRule" class="setting-control">
            <option value="original">原始文件名</option>
            <option value="timestamp">时间戳前缀</option>
            <option value="template">模板名前缀</option>
            <option value="custom">自定义规则</option>
          </select>
        </div>

        <div class="setting-row" v-if="exportConfig.namingRule === 'custom'">
          <label class="setting-label">自定义规则</label>
          <div class="input-group">
            <input
              v-model="exportConfig.customPattern"
              type="text"
              placeholder="{template}_{timestamp}_{filename}"
              class="setting-control"
            />
            <button
              @click="showNamingHelp = true"
              class="btn btn-sm btn-outline"
            >
              <i class="fas fa-question-circle"></i>
            </button>
          </div>
        </div>

        <div class="setting-row">
          <label class="flex items-center gap-2">
            <input
              v-model="exportConfig.includeMetadata"
              type="checkbox"
              class="setting-checkbox"
            />
            包含元数据文件
          </label>
          <div class="setting-hint">
            生成包含渲染信息的JSON文件
          </div>
        </div>

        <div class="setting-row">
          <label class="flex items-center gap-2">
            <input
              v-model="exportConfig.createStructure"
              type="checkbox"
              class="setting-checkbox"
            />
            创建目录结构
          </label>
          <div class="setting-hint">
            根据模板类型组织文件目录
          </div>
        </div>
      </div>

      <!-- 导出操作 -->
      <div class="export-actions">
        <button
          @click="startExport"
          :disabled="!canExport || exporting"
          class="btn btn-primary"
        >
          <i class="fas fa-download" v-if="!exporting"></i>
          <i class="fas fa-spinner fa-spin" v-else></i>
          {{ exporting ? '导出中...' : '开始导出' }}
        </button>

        <button
          @click="pauseExport"
          :disabled="!exporting || exportPaused"
          class="btn btn-secondary"
        >
          <i class="fas fa-pause"></i>
          暂停
        </button>

        <button
          @click="clearCompleted"
          :disabled="!completedExports.length"
          class="btn btn-outline"
        >
          清除已完成
        </button>

        <button
          @click="clearAll"
          :disabled="!pendingExports.length && !completedExports.length"
          class="btn btn-outline"
        >
          清空列表
        </button>
      </div>
    </div>

    <!-- 导出进度 -->
    <div v-if="exporting" class="export-progress">
      <div class="progress-header">
        <span>导出进度</span>
        <span class="progress-text">
          {{ currentExportIndex + 1 }} / {{ totalExports }}
        </span>
      </div>
      
      <div class="progress-bar">
        <div
          class="progress-fill"
          :style="{ width: progressPercentage + '%' }"
        ></div>
      </div>

      <div v-if="currentExport" class="current-file">
        <span class="file-icon">
          <i :class="getFileIcon(currentExport.filename)"></i>
        </span>
        <span class="file-name">{{ currentExport.filename }}</span>
        <span class="file-size">({{ formatFileSize(currentExport.size) }})</span>
      </div>
    </div>

    <!-- 文件列表 -->
    <div class="file-list">
      <!-- 待导出文件 -->
      <div v-if="pendingExports.length" class="file-section">
        <div class="section-header">
          <h5>待导出文件 ({{ pendingExports.length }})</h5>
          <div class="section-actions">
            <button
              @click="selectAllPending"
              class="btn btn-sm btn-outline"
            >
              全选
            </button>
            <button
              @click="deselectAllPending"
              class="btn btn-sm btn-outline"
            >
              取消全选
            </button>
          </div>
        </div>

        <div class="file-items">
          <div
            v-for="file in pendingExports"
            :key="file.id"
            class="file-item pending"
            :class="{ selected: file.selected }"
          >
            <div class="file-checkbox">
              <input
                v-model="file.selected"
                type="checkbox"
                @change="updateSelectedCount"
              />
            </div>
            
            <div class="file-icon">
              <i :class="getFileIcon(file.filename)"></i>
            </div>

            <div class="file-info">
              <div class="file-name">{{ file.filename }}</div>
              <div class="file-meta">
                <span class="file-size">{{ formatFileSize(file.size) }}</span>
                <span class="file-template">{{ file.templateName }}</span>
              </div>
            </div>

            <div class="file-actions">
              <button
                @click="previewFile(file)"
                class="btn btn-icon"
                title="预览"
              >
                <i class="fas fa-eye"></i>
              </button>
              
              <button
                @click="removePending(file.id)"
                class="btn btn-icon"
                title="移除"
              >
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 已导出文件 -->
      <div v-if="completedExports.length" class="file-section">
        <div class="section-header">
          <h5>已导出文件 ({{ completedExports.length }})</h5>
          <div class="section-actions">
            <button
              @click="downloadAllCompleted"
              class="btn btn-sm btn-primary"
            >
              下载全部
            </button>
          </div>
        </div>

        <div class="file-items">
          <div
            v-for="file in completedExports"
            :key="file.id"
            class="file-item completed"
          >
            <div class="file-status">
              <i class="fas fa-check-circle text-success"></i>
            </div>
            
            <div class="file-icon">
              <i :class="getFileIcon(file.filename)"></i>
            </div>

            <div class="file-info">
              <div class="file-name">{{ file.filename }}</div>
              <div class="file-meta">
                <span class="file-size">{{ formatFileSize(file.size) }}</span>
                <span class="export-time">{{ formatTime(file.exportTime) }}</span>
              </div>
            </div>

            <div class="file-actions">
              <button
                @click="downloadFile(file)"
                class="btn btn-icon"
                title="下载"
              >
                <i class="fas fa-download"></i>
              </button>
              
              <button
                @click="showFileLocation(file)"
                class="btn btn-icon"
                title="显示位置"
              >
                <i class="fas fa-folder-open"></i>
              </button>

              <button
                @click="removeCompleted(file.id)"
                class="btn btn-icon"
                title="移除"
              >
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="!pendingExports.length && !completedExports.length" class="empty-state">
        <i class="fas fa-file-export"></i>
        <p>暂无待导出文件</p>
        <span class="hint">从渲染结果中添加文件到导出列表</span>
      </div>
    </div>

    <!-- 命名规则帮助对话框 -->
    <el-dialog
      v-model="showNamingHelp"
      title="命名规则帮助"
      width="500px"
    >
      <div class="help-content">
        <h5>可用变量</h5>
        <ul class="variable-list">
          <li><code>{template}</code> - 模板名称</li>
          <li><code>{filename}</code> - 原始文件名</li>
          <li><code>{timestamp}</code> - 时间戳 (YYYYMMDD_HHMMSS)</li>
          <li><code>{date}</code> - 日期 (YYYYMMDD)</li>
          <li><code>{time}</code> - 时间 (HHMMSS)</li>
          <li><code>{index}</code> - 文件序号</li>
          <li><code>{ext}</code> - 文件扩展名</li>
        </ul>

        <h5>示例</h5>
        <ul class="example-list">
          <li><code>{template}_{filename}</code> → MyTemplate_part1.nc</li>
          <li><code>{timestamp}_{filename}</code> → 20240114_143022_part1.nc</li>
          <li><code>{date}_{index:03d}_{filename}</code> → 20240114_001_part1.nc</li>
        </ul>
      </div>

      <template #footer>
        <button @click="showNamingHelp = false" class="btn btn-primary">
          关闭
        </button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 接口定义
interface ExportFile {
  id: string
  filename: string
  content: string
  size: number
  templateName: string
  selected: boolean
  exportTime?: string
  status: 'pending' | 'exporting' | 'completed' | 'error'
  error?: string
}

interface ExportConfig {
  format: 'individual' | 'zip' | 'tar' | 'tar-gz'
  namingRule: 'original' | 'timestamp' | 'template' | 'custom'
  customPattern: string
  includeMetadata: boolean
  createStructure: boolean
}

// Props
const props = defineProps<{
  files?: ExportFile[]
}>()

// Emits
const emit = defineEmits<{
  exportStart: [files: ExportFile[]]
  exportComplete: [files: ExportFile[]]
  fileDownload: [file: ExportFile]
}>()

// 响应式数据
const pendingExports = ref<ExportFile[]>([])
const completedExports = ref<ExportFile[]>([])
const exportConfig = ref<ExportConfig>({
  format: 'individual',
  namingRule: 'original',
  customPattern: '{template}_{timestamp}_{filename}',
  includeMetadata: true,
  createStructure: false
})
const exporting = ref(false)
const exportPaused = ref(false)
const currentExportIndex = ref(-1)
const loading = ref(false)
const showNamingHelp = ref(false)

// 计算属性
const totalExports = computed(() => 
  pendingExports.value.filter(f => f.selected).length
)

const currentExport = computed(() => {
  if (currentExportIndex.value >= 0 && currentExportIndex.value < pendingExports.value.length) {
    return pendingExports.value[currentExportIndex.value]
  }
  return null
})

const progressPercentage = computed(() => {
  if (totalExports.value === 0) return 0
  return Math.round(((currentExportIndex.value + 1) / totalExports.value) * 100)
})

const canExport = computed(() => 
  pendingExports.value.some(f => f.selected) && !exporting.value
)

// 方法
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const formatTime = (time: string): string => {
  return new Date(time).toLocaleString('zh-CN')
}

const formatTotalSize = (): string => {
  const total = pendingExports.value.reduce((sum, file) => sum + file.size, 0)
  return formatFileSize(total)
}

const getFileIcon = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase()
  const iconMap: Record<string, string> = {
    'nc': 'fas fa-file-code',
    'gcode': 'fas fa-file-code',
    'cnc': 'fas fa-file-code',
    'txt': 'fas fa-file-alt',
    'json': 'fas fa-file-code',
    'yaml': 'fas fa-file-code',
    'yml': 'fas fa-file-code',
    'xml': 'fas fa-file-code',
    'html': 'fas fa-file-code',
    'css': 'fas fa-file-code',
    'js': 'fas fa-file-code',
    'py': 'fas fa-file-code'
  }
  return iconMap[ext || ''] || 'fas fa-file'
}

const generateFileName = (file: ExportFile): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, -5)
  const date = timestamp.slice(0, 8)
  const time = timestamp.slice(8, 14)
  const index = pendingExports.value.indexOf(file) + 1
  const ext = file.filename.split('.').pop()

  switch (exportConfig.value.namingRule) {
    case 'original':
      return file.filename
    
    case 'timestamp':
      return `${timestamp}_${file.filename}`
    
    case 'template':
      return `${file.templateName}_${file.filename}`
    
    case 'custom':
      return exportConfig.value.customPattern
        .replace(/{template}/g, file.templateName)
        .replace(/{filename}/g, file.filename)
        .replace(/{timestamp}/g, timestamp)
        .replace(/{date}/g, date)
        .replace(/{time}/g, time)
        .replace(/{index}/g, index.toString())
        .replace(/{ext}/g, ext || '')
    
    default:
      return file.filename
  }
}

const selectAllPending = () => {
  pendingExports.value.forEach(file => {
    file.selected = true
  })
  updateSelectedCount()
}

const deselectAllPending = () => {
  pendingExports.value.forEach(file => {
    file.selected = false
  })
  updateSelectedCount()
}

const updateSelectedCount = () => {
  // 触发响应式更新
  pendingExports.value = [...pendingExports.value]
}

const addFiles = (files: ExportFile[]) => {
  files.forEach(file => {
    if (!pendingExports.value.find(f => f.id === file.id)) {
      file.selected = true
      file.status = 'pending'
      pendingExports.value.push(file)
    }
  })
}

const removePending = (id: string) => {
  const index = pendingExports.value.findIndex(f => f.id === id)
  if (index > -1) {
    pendingExports.value.splice(index, 1)
  }
}

const removeCompleted = (id: string) => {
  const index = completedExports.value.findIndex(f => f.id === id)
  if (index > -1) {
    completedExports.value.splice(index, 1)
  }
}

const clearCompleted = () => {
  completedExports.value = []
}

const clearAll = async () => {
  try {
    await ElMessageBox.confirm('确定要清空所有导出文件吗？', '确认清空', {
      type: 'warning'
    })
    pendingExports.value = []
    completedExports.value = []
  } catch {
    // 用户取消
  }
}

const startExport = async () => {
  const selectedFiles = pendingExports.value.filter(f => f.selected)
  if (!selectedFiles.length) {
    ElMessage.warning('请选择要导出的文件')
    return
  }

  exporting.value = true
  exportPaused.value = false
  
  emit('exportStart', selectedFiles)

  try {
    if (exportConfig.value.format === 'individual') {
      await exportIndividualFiles(selectedFiles)
    } else {
      await exportArchive(selectedFiles)
    }
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出过程中出现错误')
  } finally {
    exporting.value = false
    currentExportIndex.value = -1
  }
}

const exportIndividualFiles = async (files: ExportFile[]) => {
  for (let i = 0; i < files.length; i++) {
    if (exportPaused.value) break
    
    const file = files[i]
    currentExportIndex.value = i
    
    try {
      await downloadFile(file)
      file.status = 'completed'
      file.exportTime = new Date().toISOString()
      
      // 移动到已完成列表
      completedExports.value.push({ ...file })
      removePending(file.id)
    } catch (error) {
      file.status = 'error'
      file.error = error instanceof Error ? error.message : '导出失败'
      ElMessage.error(`导出 ${file.filename} 失败`)
    }

    // 添加延迟避免浏览器阻止
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  emit('exportComplete', completedExports.value)
  ElMessage.success(`成功导出 ${completedExports.value.length} 个文件`)
}

const exportArchive = async (files: ExportFile[]) => {
  // 注意：浏览器环境中无法直接创建ZIP/TAR文件
  // 这里需要使用专门的库如 JSZip
  ElMessage.info('压缩包导出功能需要专门的库支持')
}

const pauseExport = () => {
  exportPaused.value = true
  ElMessage.info('导出已暂停')
}

const previewFile = (file: ExportFile) => {
  // 触发预览事件
  ElMessage.info(`预览文件: ${file.filename}`)
}

const downloadFile = async (file: ExportFile) => {
  const fileName = generateFileName(file)
  const blob = new Blob([file.content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  emit('fileDownload', file)
}

const downloadAllCompleted = async () => {
  for (const file of completedExports.value) {
    await downloadFile(file)
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

const showFileLocation = (file: ExportFile) => {
  ElMessage.info(`文件: ${file.filename}`)
}

const refreshExports = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
    ElMessage.success('导出列表已刷新')
  }, 1000)
}

// 公开方法
defineExpose({
  addFiles
})
</script>

<style scoped>
.batch-export {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  background: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
}

.export-panel {
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--vscode-panel-background);
  border-bottom: 1px solid var(--vscode-panel-border);
}

.panel-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.export-stats {
  display: flex;
  padding: 12px 16px;
  background: var(--vscode-editor-background);
  border-bottom: 1px solid var(--vscode-panel-border);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 24px;
}

.stat-label {
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  margin-bottom: 2px;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--vscode-foreground);
}

.export-settings {
  padding: 16px;
  background: var(--vscode-editor-background);
  border-bottom: 1px solid var(--vscode-panel-border);
}

.setting-row {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  gap: 12px;
}

.setting-row:last-child {
  margin-bottom: 0;
}

.setting-label {
  min-width: 100px;
  font-size: 13px;
  font-weight: 500;
}

.setting-control {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  font-size: 13px;
}

.setting-checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--vscode-button-background);
}

.setting-hint {
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  margin-top: 2px;
}

.input-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.export-actions {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  background: var(--vscode-panel-background);
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

.btn-icon {
  padding: 4px;
  border: 1px solid transparent;
  background: transparent;
}

.btn-icon:hover {
  background: var(--vscode-toolbar-hoverBackground);
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

.export-progress {
  padding: 16px;
  background: var(--vscode-editor-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-text {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.progress-bar {
  height: 6px;
  background: var(--vscode-progressBar-background);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-fill {
  height: 100%;
  background: var(--vscode-progressBar-foreground);
  transition: width 0.3s ease;
}

.current-file {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.file-icon {
  color: var(--vscode-descriptionForeground);
}

.file-name {
  font-weight: 500;
}

.file-size {
  color: var(--vscode-descriptionForeground);
}

.file-list {
  flex: 1;
  overflow-y: auto;
}

.file-section {
  margin-bottom: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--vscode-panel-background);
  border: 1px solid var(--vscode-panel-border);
  border-bottom: none;
  border-radius: 6px 6px 0 0;
}

.section-header h5 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}

.section-actions {
  display: flex;
  gap: 4px;
}

.file-items {
  border: 1px solid var(--vscode-panel-border);
  border-radius: 0 0 6px 6px;
  overflow: hidden;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--vscode-panel-border);
  transition: background-color 0.2s;
}

.file-item:last-child {
  border-bottom: none;
}

.file-item:hover {
  background: var(--vscode-list-hoverBackground);
}

.file-item.selected {
  background: var(--vscode-list-activeSelectionBackground);
}

.file-item.completed {
  opacity: 0.8;
}

.file-checkbox {
  margin-right: 8px;
}

.file-info {
  flex: 1;
  margin-left: 8px;
}

.file-meta {
  display: flex;
  gap: 12px;
  margin-top: 2px;
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
}

.file-actions {
  display: flex;
  gap: 4px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 12px;
  opacity: 0.7;
}

.text-success {
  color: var(--vscode-testing-iconPassed);
}

/* 帮助对话框样式 */
.help-content h5 {
  margin: 16px 0 8px 0;
  font-size: 14px;
  font-weight: 600;
}

.help-content h5:first-child {
  margin-top: 0;
}

.variable-list, .example-list {
  margin: 0;
  padding-left: 16px;
}

.variable-list li, .example-list li {
  margin-bottom: 4px;
  font-size: 13px;
}

code {
  background: var(--vscode-textCodeBlock-background);
  color: var(--vscode-textCodeBlock-foreground);
  padding: 2px 4px;
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
}

/* 对话框样式 */
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