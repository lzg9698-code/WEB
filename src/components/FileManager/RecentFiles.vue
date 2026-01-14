<!--
  最近文件组件
  
  严格遵循PROJECT_REQUIREMENTS.md文档约束
  功能：显示和管理最近访问的文件，支持快速访问和操作
-->
<template>
  <div class="recent-files">
    <!-- 头部控制 -->
    <div class="recent-header">
      <div class="header-left">
        <h4>最近文件</h4>
        <span class="file-count">{{ files.length }} 个文件</span>
      </div>
      
      <div class="header-right">
        <select v-model="timeFilter" class="filter-select" @change="applyFilter">
          <option value="all">所有时间</option>
          <option value="today">今天</option>
          <option value="week">本周</option>
          <option value="month">本月</option>
        </select>

        <select v-model="typeFilter" class="filter-select" @change="applyFilter">
          <option value="all">所有类型</option>
          <option value="text">文本文件</option>
          <option value="code">代码文件</option>
          <option value="config">配置文件</option>
          <option value="nc">数控程序</option>
        </select>

        <button
          @click="refreshFiles"
          class="btn btn-sm btn-secondary"
        >
          <i class="fas fa-sync-alt"></i>
        </button>

        <button
          @click="clearHistory"
          class="btn btn-sm btn-outline"
        >
          <i class="fas fa-trash"></i>
        </button>
      </div>
    </div>

    <!-- 文件列表 -->
    <div class="recent-list">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>加载最近文件...</p>
      </div>

      <div v-else-if="!filteredFiles.length" class="empty-state">
        <i class="fas fa-clock"></i>
        <p>暂无最近文件</p>
        <span class="hint">打开文件后，这里会显示最近访问的文件</span>
      </div>

      <!-- 分组显示 -->
      <div v-else class="file-groups">
        <div
          v-for="group in fileGroups"
          :key="group.title"
          class="file-group"
        >
          <div class="group-header">
            <h5>{{ group.title }}</h5>
            <span class="group-count">{{ group.files.length }} 个</span>
          </div>

          <div class="group-files">
            <div
              v-for="file in group.files"
              :key="file.path"
              class="recent-file"
              @click="openFile(file)"
            >
              <div class="file-icon">
                <i :class="getFileIcon(file)"></i>
              </div>

              <div class="file-info">
                <div class="file-name" :title="file.name">
                  {{ file.name }}
                </div>
                <div class="file-details">
                  <span class="file-path">{{ formatPath(file.path) }}</span>
                  <span class="file-time">{{ formatTime(file.accessTime) }}</span>
                  <span class="file-size">{{ formatFileSize(file.size) }}</span>
                </div>
              </div>

              <div class="file-actions">
                <button
                  @click.stop="previewFile(file)"
                  class="action-btn"
                  title="预览"
                >
                  <i class="fas fa-eye"></i>
                </button>

                <button
                  @click.stop="editFile(file)"
                  class="action-btn"
                  title="编辑"
                >
                  <i class="fas fa-edit"></i>
                </button>

                <button
                  @click.stop="openInExplorer(file)"
                  class="action-btn"
                  title="在文件管理器中显示"
                >
                  <i class="fas fa-folder-open"></i>
                </button>

                <button
                  @click.stop="removeFromHistory(file.path)"
                  class="action-btn danger"
                  title="从历史中移除"
                >
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部统计 -->
    <div v-if="filteredFiles.length" class="recent-stats">
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">总访问</span>
          <span class="stat-value">{{ totalAccessCount }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">文件类型</span>
          <span class="stat-value">{{ uniqueFileTypes }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">总大小</span>
          <span class="stat-value">{{ formatTotalSize() }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">最常使用</span>
          <span class="stat-value">{{ mostUsedFile?.name || '-' }}</span>
        </div>
      </div>
    </div>

    <!-- 确认对话框 -->
    <el-dialog
      v-model="showConfirmDialog"
      :title="confirmTitle"
      width="400px"
    >
      <p>{{ confirmMessage }}</p>
      <template #footer>
        <button @click="showConfirmDialog = false" class="btn btn-secondary">
          取消
        </button>
        <button @click="confirmAction" class="btn btn-primary">
          确认
        </button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 接口定义
interface RecentFile {
  path: string
  name: string
  isDirectory: boolean
  size: number
  modified: string
  created: string
  accessTime: string
  accessCount: number
  extension?: string
}

interface FileGroup {
  title: string
  files: RecentFile[]
}

interface ConfirmAction {
  title: string
  message: string
  action: () => void
}

// Props
const props = defineProps<{
  files: RecentFile[]
}>()

// Emits
const emit = defineEmits<{
  fileOpen: [file: RecentFile]
  fileEdit: [file: RecentFile]
  filePreview: [file: RecentFile]
}>()

// 响应式数据
const loading = ref(false)
const timeFilter = ref('all')
const typeFilter = ref('all')
const showConfirmDialog = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
const pendingAction = ref<(() => void) | null>(null)

// 计算属性
const filteredFiles = computed(() => {
  let filtered = [...props.files]

  // 时间过滤
  if (timeFilter.value !== 'all') {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    filtered = filtered.filter(file => {
      const accessTime = new Date(file.accessTime)
      
      switch (timeFilter.value) {
        case 'today':
          return accessTime >= today
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
          return accessTime >= weekAgo
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
          return accessTime >= monthAgo
        default:
          return true
      }
    })
  }

  // 类型过滤
  if (typeFilter.value !== 'all') {
    filtered = filtered.filter(file => {
      const ext = file.extension?.toLowerCase()
      
      switch (typeFilter.value) {
        case 'text':
          return ['txt', 'md', 'log', 'readme'].includes(ext || '')
        case 'code':
          return ['js', 'ts', 'py', 'java', 'cpp', 'c', 'h', 'html', 'css', 'xml'].includes(ext || '')
        case 'config':
          return ['json', 'yaml', 'yml', 'ini', 'conf', 'config'].includes(ext || '')
        case 'nc':
          return ['nc', 'gcode', 'cnc'].includes(ext || '')
        default:
          return true
      }
    })
  }

  return filtered.sort((a, b) => 
    new Date(b.accessTime).getTime() - new Date(a.accessTime).getTime()
  )
})

const fileGroups = computed((): FileGroup[] => {
  const groups: FileGroup[] = []
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thisMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  const todayFiles = filteredFiles.value.filter(file => 
    new Date(file.accessTime) >= today
  )
  
  const yesterdayFiles = filteredFiles.value.filter(file => {
    const accessTime = new Date(file.accessTime)
    return accessTime >= yesterday && accessTime < today
  })
  
  const thisWeekFiles = filteredFiles.value.filter(file => {
    const accessTime = new Date(file.accessTime)
    return accessTime >= thisWeek && accessTime < yesterday
  })
  
  const thisMonthFiles = filteredFiles.value.filter(file => {
    const accessTime = new Date(file.accessTime)
    return accessTime >= thisMonth && accessTime < thisWeek
  })
  
  const olderFiles = filteredFiles.value.filter(file => {
    const accessTime = new Date(file.accessTime)
    return accessTime < thisMonth
  })

  if (todayFiles.length > 0) {
    groups.push({ title: '今天', files: todayFiles })
  }
  
  if (yesterdayFiles.length > 0) {
    groups.push({ title: '昨天', files: yesterdayFiles })
  }
  
  if (thisWeekFiles.length > 0) {
    groups.push({ title: '本周', files: thisWeekFiles })
  }
  
  if (thisMonthFiles.length > 0) {
    groups.push({ title: '本月', files: thisMonthFiles })
  }
  
  if (olderFiles.length > 0) {
    groups.push({ title: '更早', files: olderFiles })
  }

  return groups
})

const totalAccessCount = computed(() => 
  filteredFiles.value.reduce((sum, file) => sum + file.accessCount, 0)
)

const uniqueFileTypes = computed(() => {
  const types = new Set(
    filteredFiles.value.map(file => file.extension?.toLowerCase()).filter(Boolean)
  )
  return types.size
})

const mostUsedFile = computed(() => {
  if (!filteredFiles.value.length) return null
  return filteredFiles.value.reduce((most, file) => 
    file.accessCount > most.accessCount ? file : most
  )
})

// 方法
const getFileIcon = (file: RecentFile): string => {
  if (file.isDirectory) {
    return 'fas fa-folder'
  }

  const ext = file.extension?.toLowerCase()
  const iconMap: Record<string, string> = {
    'txt': 'fas fa-file-alt',
    'md': 'fas fa-file-alt',
    'json': 'fas fa-file-code',
    'yaml': 'fas fa-file-code',
    'yml': 'fas fa-file-code',
    'nc': 'fas fa-file-code',
    'gcode': 'fas fa-file-code',
    'cnc': 'fas fa-file-code',
    'js': 'fas fa-file-code',
    'ts': 'fas fa-file-code',
    'py': 'fas fa-file-code',
    'html': 'fas fa-file-code',
    'css': 'fas fa-file-code',
    'xml': 'fas fa-file-code',
    'pdf': 'fas fa-file-pdf',
    'png': 'fas fa-file-image',
    'jpg': 'fas fa-file-image',
    'jpeg': 'fas fa-file-image',
    'gif': 'fas fa-file-image',
    'svg': 'fas fa-file-image'
  }
  return iconMap[ext || ''] || 'fas fa-file'
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const formatTime = (time: string): string => {
  const now = new Date()
  const fileTime = new Date(time)
  const diffMs = now.getTime() - fileTime.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}个月前`
  return `${Math.floor(diffDays / 365)}年前`
}

const formatPath = (path: string): string => {
  const maxLength = 50
  if (path.length <= maxLength) return path
  
  const parts = path.split('/')
  if (parts.length <= 2) return path
  
  return `.../${parts.slice(-2).join('/')}`
}

const formatTotalSize = (): string => {
  const total = filteredFiles.value.reduce((sum, file) => sum + file.size, 0)
  return formatFileSize(total)
}

const openFile = (file: RecentFile) => {
  // 更新访问次数和时间
  updateFileAccess(file.path)
  emit('fileOpen', file)
}

const previewFile = (file: RecentFile) => {
  updateFileAccess(file.path)
  emit('filePreview', file)
}

const editFile = (file: RecentFile) => {
  updateFileAccess(file.path)
  emit('fileEdit', file)
}

const openInExplorer = async (file: RecentFile) => {
  try {
    // 调用系统API在文件管理器中显示文件
    const response = await fetch('/api/files/show-in-explorer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: file.path })
    })

    if (response.ok) {
      ElMessage.success('已在文件管理器中显示')
    } else {
      throw new Error('显示失败')
    }
  } catch (error) {
    ElMessage.error('无法在文件管理器中显示')
  }
}

const updateFileAccess = (filePath: string) => {
  const fileIndex = props.files.findIndex(f => f.path === filePath)
  if (fileIndex > -1) {
    props.files[fileIndex].accessTime = new Date().toISOString()
    props.files[fileIndex].accessCount++
    saveRecentFiles()
  }
}

const removeFromHistory = (filePath: string) => {
  showConfirm(
    '移除文件',
    `确定要将此文件从历史记录中移除吗？`,
    () => {
      const fileIndex = props.files.findIndex(f => f.path === filePath)
      if (fileIndex > -1) {
        props.files.splice(fileIndex, 1)
        saveRecentFiles()
        ElMessage.success('已从历史记录中移除')
      }
    }
  )
}

const clearHistory = () => {
  showConfirm(
    '清空历史',
    '确定要清空所有最近文件记录吗？此操作不可恢复。',
    () => {
      props.files.length = 0
      saveRecentFiles()
      ElMessage.success('最近文件历史已清空')
    }
  )
}

const refreshFiles = () => {
  loading.value = true
  setTimeout(() => {
    loading.value = false
    ElMessage.success('最近文件已刷新')
  }, 1000)
}

const applyFilter = () => {
  // 过滤逻辑已在计算属性中处理
}

const showConfirm = (title: string, message: string, action: () => void) => {
  confirmTitle.value = title
  confirmMessage.value = message
  pendingAction.value = action
  showConfirmDialog.value = true
}

const confirmAction = () => {
  if (pendingAction.value) {
    pendingAction.value()
    pendingAction.value = null
  }
  showConfirmDialog.value = false
}

const saveRecentFiles = () => {
  try {
    localStorage.setItem('recent-files', JSON.stringify(props.files))
  } catch (error) {
    console.warn('保存最近文件失败:', error)
  }
}

const loadRecentFiles = () => {
  try {
    const stored = localStorage.getItem('recent-files')
    if (stored) {
      const files = JSON.parse(stored)
      props.files.splice(0, props.files.length, ...files)
    }
  } catch (error) {
    console.warn('加载最近文件失败:', error)
  }
}

// 监听变化
watch(() => props.files, saveRecentFiles, { deep: true })

// 生命周期
onMounted(() => {
  loadRecentFiles()
})
</script>

<style scoped>
.recent-files {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
}

.recent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--vscode-panel-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px 6px 0 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-left h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.file-count {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-select {
  padding: 4px 8px;
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  font-size: 12px;
}

.btn {
  padding: 4px 8px;
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
  padding: 3px 6px;
  font-size: 11px;
}

.btn-secondary {
  background: var(--vscode-button-secondaryBackground);
  border-color: var(--vscode-button-secondaryBorder);
  color: var(--vscode-button-secondaryForeground);
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

.recent-list {
  flex: 1;
  overflow: hidden;
  border: 1px solid var(--vscode-panel-border);
  border-top: none;
  border-radius: 0 0 6px 6px;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 12px;
  opacity: 0.7;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--vscode-charts-blue);
  border-top: 3px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.file-groups {
  height: 100%;
  overflow-y: auto;
}

.file-group {
  margin-bottom: 16px;
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: var(--vscode-panel-background);
  border-bottom: 1px solid var(--vscode-panel-border);
  position: sticky;
  top: 0;
  z-index: 1;
}

.group-header h5 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}

.group-count {
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
}

.group-files {
  background: var(--vscode-editor-background);
}

.recent-file {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--vscode-panel-border);
  cursor: pointer;
  transition: background-color 0.2s;
}

.recent-file:hover {
  background: var(--vscode-list-hoverBackground);
}

.file-icon {
  margin-right: 12px;
  color: var(--vscode-descriptionForeground);
  font-size: 16px;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-details {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.file-path {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.file-time, .file-size {
  white-space: nowrap;
}

.file-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.recent-file:hover .file-actions {
  opacity: 1;
}

.action-btn {
  padding: 4px 6px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--vscode-descriptionForeground);
  cursor: pointer;
  border-radius: 3px;
  font-size: 11px;
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--vscode-toolbar-hoverBackground);
  color: var(--vscode-foreground);
}

.action-btn.danger:hover {
  background: var(--vscode-errorForeground);
  color: white;
}

.recent-stats {
  margin-top: 16px;
  padding: 16px;
  background: var(--vscode-panel-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 16px;
}

.stat-item {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  margin-bottom: 4px;
}

.stat-value {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: var(--vscode-foreground);
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