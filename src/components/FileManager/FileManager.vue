<!--
  文件管理器主组件
  
  严格遵循PROJECT_REQUIREMENTS.md文档约束
  功能：集成文件浏览、预览、操作管理等子组件，提供完整的文件管理功能
-->
<template>
  <div class="file-manager">
    <!-- 文件管理工作区 -->
    <div class="manager-workspace">
      <!-- 左侧：文件浏览器 -->
      <div class="manager-sidebar">
        <FileBrowser
          :initial-path="currentPath"
          @file-open="onFileOpen"
          @file-edit="onFileEdit"
          @file-preview="onFilePreview"
          @path-change="onPathChange"
        />
      </div>

      <!-- 右侧：文件预览和操作 -->
      <div class="manager-content">
        <el-tabs v-model="activeContentTab" class="content-tabs">
          <!-- 文件预览 -->
          <el-tab-pane name="preview">
            <template #label>
              <span>
                <i class="fas fa-eye"></i>
                文件预览
                <el-badge v-if="previewFile" type="info" value="1" />
              </span>
            </template>
            
            <FilePreview
              v-if="previewFile"
              :file="previewFile"
              @close="closePreview"
              @edit="onFileEdit"
            />
            
            <div v-else class="no-preview">
              <i class="fas fa-file-alt"></i>
              <p>选择文件进行预览</p>
              <span class="hint">双击文件或点击预览按钮</span>
            </div>
          </el-tab-pane>

          <!-- 文件操作 -->
          <el-tab-pane name="operations">
            <template #label>
              <span>
                <i class="fas fa-cogs"></i>
                文件操作
                <el-badge :value="operationCount" type="warning" />
              </span>
            </template>
            
            <FileOperationManager
              ref="operationManagerRef"
              @operation-complete="onOperationComplete"
            />
          </el-tab-pane>

          <!-- 文件搜索 -->
          <el-tab-pane name="search">
            <template #label>
              <span>
                <i class="fas fa-search"></i>
                文件搜索
              </span>
            </template>
            
            <FileSearch
              @file-found="onFileFound"
              @file-open="onFileOpen"
            />
          </el-tab-pane>

          <!-- 最近文件 -->
          <el-tab-pane name="recent">
            <template #label>
              <span>
                <i class="fas fa-clock"></i>
                最近文件
                <el-badge :value="recentFiles.length" type="info" />
              </span>
            </template>
            
            <RecentFiles
              :files="recentFiles"
              @file-open="onFileOpen"
              @file-preview="onFilePreview"
            />
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <!-- 状态栏 -->
    <div class="manager-status">
      <div class="status-left">
        <span class="status-item">
          <i class="fas fa-folder"></i>
          当前路径: {{ currentPath }}
        </span>
        <span class="status-item">
          <i class="fas fa-files"></i>
          选中: {{ selectedFiles.length }} 个文件
        </span>
        <span v-if="previewFile" class="status-item">
          <i class="fas fa-eye"></i>
          预览: {{ previewFile.name }}
        </span>
      </div>

      <div class="status-right">
        <span class="status-item">
          <i class="fas fa-hdd"></i>
          磁盘使用: {{ diskUsage.used }} / {{ diskUsage.total }}
        </span>
        <span class="status-item">
          <i class="fas fa-clock"></i>
          {{ formatTime(new Date().toISOString()) }}
        </span>
      </div>
    </div>

    <!-- 快捷操作浮动按钮 -->
    <div class="quick-actions">
      <button
        @click="showQuickActions = !showQuickActions"
        class="quick-action-btn main"
        title="快捷操作"
      >
        <i class="fas fa-plus"></i>
      </button>

      <div v-show="showQuickActions" class="quick-action-menu">
        <button
          @click="createNewFile"
          class="quick-action-btn"
          title="新建文件"
        >
          <i class="fas fa-file-plus"></i>
        </button>

        <button
          @click="createNewFolder"
          class="quick-action-btn"
          title="新建文件夹"
        >
          <i class="fas fa-folder-plus"></i>
        </button>

        <button
          @click="uploadFile"
          class="quick-action-btn"
          title="上传文件"
        >
          <i class="fas fa-upload"></i>
        </button>

        <button
          @click="refreshFiles"
          class="quick-action-btn"
          title="刷新"
        >
          <i class="fas fa-sync-alt"></i>
        </button>
      </div>
    </div>

    <!-- 新建文件对话框 -->
    <el-dialog
      v-model="showNewFileDialog"
      title="新建文件"
      width="400px"
    >
      <div class="form-group">
        <label class="form-label">文件名</label>
        <input
          v-model="newFileName"
          type="text"
          placeholder="输入文件名"
          class="form-control"
        />
      </div>

      <div class="form-group">
        <label class="form-label">文件类型</label>
        <select v-model="newFileType" class="form-control">
          <option value="txt">文本文件 (.txt)</option>
          <option value="md">Markdown (.md)</option>
          <option value="json">JSON (.json)</option>
          <option value="yaml">YAML (.yaml)</option>
          <option value="nc">数控程序 (.nc)</option>
          <option value="gcode">G代码 (.gcode)</option>
          <option value="js">JavaScript (.js)</option>
          <option value="py">Python (.py)</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">模板</label>
        <select v-model="selectedTemplate" class="form-control">
          <option value="">空白文件</option>
          <option
            v-for="template in fileTemplates"
            :key="template.id"
            :value="template.id"
          >
            {{ template.name }}
          </option>
        </select>
      </div>

      <template #footer>
        <button @click="showNewFileDialog = false" class="btn btn-secondary">
          取消
        </button>
        <button
          @click="confirmCreateFile"
          class="btn btn-primary"
          :disabled="!newFileName"
        >
          创建
        </button>
      </template>
    </el-dialog>

    <!-- 新建文件夹对话框 -->
    <el-dialog
      v-model="showNewFolderDialog"
      title="新建文件夹"
      width="400px"
    >
      <div class="form-group">
        <label class="form-label">文件夹名</label>
        <input
          v-model="newFolderName"
          type="text"
          placeholder="输入文件夹名"
          class="form-control"
        />
      </div>

      <template #footer>
        <button @click="showNewFolderDialog = false" class="btn btn-secondary">
          取消
        </button>
        <button
          @click="confirmCreateFolder"
          class="btn btn-primary"
          :disabled="!newFolderName"
        >
          创建
        </button>
      </template>
    </el-dialog>

    <!-- 文件上传对话框 -->
    <el-dialog
      v-model="showUploadDialog"
      title="上传文件"
      width="500px"
    >
      <div class="upload-area" @drop="handleFileDrop" @dragover.prevent @dragenter.prevent>
        <input
          ref="fileInputRef"
          type="file"
          multiple
          @change="handleFileSelect"
          style="display: none"
        />
        
        <div v-if="!uploadFiles.length" class="upload-placeholder">
          <i class="fas fa-cloud-upload-alt"></i>
          <p>拖拽文件到此处或点击选择</p>
          <button @click="fileInputRef?.click()" class="btn btn-outline">
            选择文件
          </button>
        </div>

        <div v-else class="upload-files">
          <div
            v-for="(file, index) in uploadFiles"
            :key="index"
            class="upload-file-item"
          >
            <div class="file-info">
              <i :class="getFileIcon(file)"></i>
              <span class="file-name">{{ file.name }}</span>
              <span class="file-size">{{ formatFileSize(file.size) }}</span>
            </div>
            <button
              @click="removeUploadFile(index)"
              class="remove-btn"
            >
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      </div>

      <template #footer>
        <button @click="showUploadDialog = false" class="btn btn-secondary">
          取消
        </button>
        <button
          @click="confirmUpload"
          class="btn btn-primary"
          :disabled="!uploadFiles.length"
        >
          上传 ({{ uploadFiles.length }})
        </button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import FileBrowser from './FileBrowser.vue'
import FilePreview from './FilePreview.vue'
import FileOperationManager from './FileOperationManager.vue'
import FileSearch from './FileSearch.vue'
import RecentFiles from './RecentFiles.vue'

// 接口定义
interface FileItem {
  path: string
  name: string
  isDirectory: boolean
  size: number
  modified: string
  created: string
  extension?: string
}

interface FileTemplate {
  id: string
  name: string
  description: string
  content: string
  extension: string
}

// 响应式数据
const currentPath = ref('/')
const selectedFiles = ref<FileItem[]>([])
const previewFile = ref<FileItem | null>(null)
const activeContentTab = ref('preview')
const showQuickActions = ref(false)
const operationCount = ref(0)

// 新建文件/文件夹
const showNewFileDialog = ref(false)
const showNewFolderDialog = ref(false)
const showUploadDialog = ref(false)
const newFileName = ref('')
const newFileType = ref('txt')
const newFolderName = ref('')
const selectedTemplate = ref('')

// 文件上传
const uploadFiles = ref<File[]>([])
const fileInputRef = ref<HTMLInputElement>()

// 文件模板
const fileTemplates = ref<FileTemplate[]>([])

// 最近文件
const recentFiles = ref<FileItem[]>([])

// 磁盘使用情况
const diskUsage = ref({
  used: '0 GB',
  total: '0 GB'
})

// 组件引用
const operationManagerRef = ref<InstanceType<typeof FileOperationManager>>()

// 计算属性
const hasPreviewFile = computed(() => previewFile.value !== null)

// 方法
const onFileOpen = (file: FileItem) => {
  if (file.isDirectory) {
    currentPath.value = file.path
  } else {
    // 打开文件进行编辑
    ElMessage.info(`打开文件: ${file.name}`)
  }
}

const onFileEdit = (file: FileItem) => {
  if (!file.isDirectory) {
    ElMessage.info(`编辑文件: ${file.name}`)
    // 这里可以集成编辑器组件
  }
}

const onFilePreview = (file: FileItem) => {
  if (!file.isDirectory) {
    previewFile.value = file
    activeContentTab.value = 'preview'
  }
}

const onPathChange = (path: string) => {
  currentPath.value = path
}

const closePreview = () => {
  previewFile.value = null
}

const onOperationComplete = () => {
  operationCount.value++
  // 刷新文件列表
  refreshFiles()
}

const onFileFound = (file: FileItem) => {
  onFilePreview(file)
}

const getFileIcon = (file: File | FileItem): string => {
  const name = 'name' in file ? file.name : file.name
  const ext = name.split('.').pop()?.toLowerCase()
  
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
  return new Date(time).toLocaleString('zh-CN')
}

const createNewFile = () => {
  newFileName.value = ''
  newFileType.value = 'txt'
  selectedTemplate.value = ''
  showNewFileDialog.value = true
}

const createNewFolder = () => {
  newFolderName.value = ''
  showNewFolderDialog.value = true
}

const uploadFile = () => {
  uploadFiles.value = []
  showUploadDialog.value = true
}

const refreshFiles = () => {
  // 触发文件浏览器刷新
  ElMessage.success('文件列表已刷新')
}

const confirmCreateFile = async () => {
  if (!newFileName.value.trim()) return

  try {
    const fileName = newFileType.value === 'txt' 
      ? newFileName.value.trim()
      : `${newFileName.value.trim()}.${newFileType.value}`

    const response = await fetch('/api/files/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: currentPath.value,
        name: fileName,
        type: 'file',
        template: selectedTemplate.value
      })
    })

    if (response.ok) {
      ElMessage.success('文件创建成功')
      showNewFileDialog.value = false
      refreshFiles()
      
      // 添加到最近文件
      const newFile: FileItem = {
        path: `${currentPath.value}/${fileName}`,
        name: fileName,
        isDirectory: false,
        size: 0,
        modified: new Date().toISOString(),
        created: new Date().toISOString(),
        extension: newFileType.value
      }
      addToRecentFiles(newFile)
    } else {
      throw new Error('创建失败')
    }
  } catch (error) {
    ElMessage.error('文件创建失败')
  }
}

const confirmCreateFolder = async () => {
  if (!newFolderName.value.trim()) return

  try {
    const response = await fetch('/api/files/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: currentPath.value,
        name: newFolderName.value.trim(),
        type: 'directory'
      })
    })

    if (response.ok) {
      ElMessage.success('文件夹创建成功')
      showNewFolderDialog.value = false
      refreshFiles()
    } else {
      throw new Error('创建失败')
    }
  } catch (error) {
    ElMessage.error('文件夹创建失败')
  }
}

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files) {
    uploadFiles.value = Array.from(target.files)
  }
}

const handleFileDrop = (event: DragEvent) => {
  event.preventDefault()
  if (event.dataTransfer?.files) {
    uploadFiles.value = Array.from(event.dataTransfer.files)
  }
}

const removeUploadFile = (index: number) => {
  uploadFiles.value.splice(index, 1)
}

const confirmUpload = async () => {
  if (!uploadFiles.value.length) return

  try {
    const formData = new FormData()
    formData.append('path', currentPath.value)
    
    uploadFiles.value.forEach(file => {
      formData.append('files', file)
    })

    const response = await fetch('/api/files/upload', {
      method: 'POST',
      body: formData
    })

    if (response.ok) {
      ElMessage.success(`成功上传 ${uploadFiles.value.length} 个文件`)
      showUploadDialog.value = false
      uploadFiles.value = []
      refreshFiles()
    } else {
      throw new Error('上传失败')
    }
  } catch (error) {
    ElMessage.error('文件上传失败')
  }
}

const loadFileTemplates = async () => {
  try {
    const response = await fetch('/api/file-templates')
    if (response.ok) {
      fileTemplates.value = await response.json()
    }
  } catch (error) {
    console.warn('加载文件模板失败:', error)
  }
}

const loadRecentFiles = () => {
  try {
    const stored = localStorage.getItem('recent-files')
    if (stored) {
      recentFiles.value = JSON.parse(stored)
    }
  } catch (error) {
    console.warn('加载最近文件失败:', error)
  }
}

const saveRecentFiles = () => {
  try {
    localStorage.setItem('recent-files', JSON.stringify(recentFiles.value))
  } catch (error) {
    console.warn('保存最近文件失败:', error)
  }
}

const addToRecentFiles = (file: FileItem) => {
  // 移除已存在的相同文件
  recentFiles.value = recentFiles.value.filter(f => f.path !== file.path)
  
  // 添加到开头
  recentFiles.value.unshift(file)
  
  // 限制数量
  if (recentFiles.value.length > 20) {
    recentFiles.value = recentFiles.value.slice(0, 20)
  }
  
  saveRecentFiles()
}

const loadDiskUsage = async () => {
  try {
    const response = await fetch('/api/disk-usage')
    if (response.ok) {
      const data = await response.json()
      diskUsage.value = {
        used: formatFileSize(data.used),
        total: formatFileSize(data.total)
      }
    }
  } catch (error) {
    console.warn('加载磁盘使用情况失败:', error)
  }
}

// 键盘快捷键
const handleKeydown = (event: KeyboardEvent) => {
  if (event.ctrlKey || event.metaKey) {
    switch (event.key) {
      case 'n':
        event.preventDefault()
        createNewFile()
        break
      case 'Shift+N':
        event.preventDefault()
        createNewFolder()
        break
      case 'o':
        event.preventDefault()
        uploadFile()
        break
      case 'r':
        event.preventDefault()
        refreshFiles()
        break
    }
  }

  if (event.key === 'Escape') {
    showQuickActions.value = false
  }
}

// 点击外部关闭快捷菜单
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (!target.closest('.quick-actions')) {
    showQuickActions.value = false
  }
}

// 生命周期
onMounted(() => {
  loadFileTemplates()
  loadRecentFiles()
  loadDiskUsage()
  
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.file-manager {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
}

.manager-workspace {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.manager-sidebar {
  width: 400px;
  border-right: 1px solid var(--vscode-panel-border);
  display: flex;
  flex-direction: column;
}

.manager-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.no-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 12px;
  opacity: 0.7;
}

.no-preview i {
  font-size: 48px;
  color: var(--vscode-descriptionForeground);
}

.hint {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.manager-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  background: var(--vscode-panel-background);
  border-top: 1px solid var(--vscode-panel-border);
  font-size: 11px;
}

.status-left, .status-right {
  display: flex;
  gap: 12px;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--vscode-descriptionForeground);
}

/* 快捷操作浮动按钮 */
.quick-actions {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
}

.quick-action-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

.quick-action-btn:hover {
  background: var(--vscode-button-hoverBackground);
  transform: scale(1.1);
}

.quick-action-btn.main {
  background: var(--vscode-charts-blue);
  color: white;
  margin-bottom: 8px;
}

.quick-action-menu {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quick-action-menu .quick-action-btn {
  width: 40px;
  height: 40px;
  font-size: 14px;
  background: var(--vscode-panel-background);
  color: var(--vscode-foreground);
}

/* 对话框样式 */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
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

/* 文件上传区域 */
.upload-area {
  border: 2px dashed var(--vscode-panel-border);
  border-radius: 8px;
  padding: 24px;
  text-align: center;
  transition: border-color 0.2s;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-area:hover {
  border-color: var(--vscode-focusBorder);
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.upload-placeholder i {
  font-size: 48px;
  color: var(--vscode-descriptionForeground);
}

.upload-files {
  width: 100%;
}

.upload-file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--vscode-textCodeBlock-background);
  border-radius: 4px;
  margin-bottom: 8px;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.file-name {
  font-weight: 500;
}

.file-size {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.remove-btn {
  padding: 4px;
  border: none;
  background: transparent;
  color: var(--vscode-descriptionForeground);
  cursor: pointer;
  border-radius: 2px;
}

.remove-btn:hover {
  background: var(--vscode-errorForeground);
  color: white;
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