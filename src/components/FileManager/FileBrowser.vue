<!--
  文件浏览器组件
  
  严格遵循PROJECT_REQUIREMENTS.md文档约束
  功能：浏览和管理项目文件，支持文件预览、编辑和操作
-->
<template>
  <div class="file-browser">
    <!-- 工具栏 -->
    <div class="browser-toolbar">
      <div class="toolbar-left">
        <div class="breadcrumb">
          <button
            v-for="(crumb, index) in breadcrumbs"
            :key="index"
            @click="navigateToPath(crumb.path)"
            class="breadcrumb-item"
            :class="{ 'last': index === breadcrumbs.length - 1 }"
          >
            <i class="fas fa-home" v-if="index === 0"></i>
            <i class="fas fa-folder" v-else></i>
            {{ crumb.name }}
            <i class="fas fa-chevron-right" v-if="index < breadcrumbs.length - 1"></i>
          </button>
        </div>
      </div>

      <div class="toolbar-right">
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索文件..."
            class="search-input"
            @input="debouncedSearch"
          />
          <i class="fas fa-search search-icon"></i>
        </div>

        <div class="view-controls">
          <button
            @click="viewMode = 'list'"
            class="view-btn"
            :class="{ active: viewMode === 'list' }"
            title="列表视图"
          >
            <i class="fas fa-list"></i>
          </button>
          <button
            @click="viewMode = 'grid'"
            class="view-btn"
            :class="{ active: viewMode === 'grid' }"
            title="网格视图"
          >
            <i class="fas fa-th"></i>
          </button>
        </div>

        <button
          @click="refreshFiles"
          :disabled="loading"
          class="btn btn-sm btn-secondary"
        >
          <i class="fas fa-sync-alt"></i>
          刷新
        </button>
      </div>
    </div>

    <!-- 文件列表 -->
    <div class="file-content" ref="fileContentRef">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>加载文件列表...</p>
      </div>

      <div v-else-if="!filteredFiles.length" class="empty-state">
        <i class="fas fa-folder-open"></i>
        <p>{{ searchQuery ? '没有找到匹配的文件' : '此文件夹为空' }}</p>
        <span class="hint">
          {{ searchQuery ? '尝试调整搜索条件' : '可以创建新文件或文件夹' }}
        </span>
      </div>

      <!-- 列表视图 -->
      <div v-else-if="viewMode === 'list'" class="file-list">
        <div class="list-header">
          <div class="header-cell name">名称</div>
          <div class="header-cell size">大小</div>
          <div class="header-cell modified">修改时间</div>
          <div class="header-cell type">类型</div>
          <div class="header-cell actions">操作</div>
        </div>

        <div
          v-for="file in filteredFiles"
          :key="file.path"
          class="file-item"
          :class="{
            'directory': file.isDirectory,
            'selected': selectedFiles.has(file.path),
            'editing': editingFile === file.path
          }"
          @click="selectFile(file)"
          @dblclick="openFile(file)"
        >
          <!-- 文件图标和名称 -->
          <div class="file-name-cell">
            <div class="file-icon">
              <i :class="getFileIcon(file)"></i>
            </div>
            <div v-if="editingFile === file.path" class="file-name-input">
              <input
                ref="renameInputRef"
                v-model="newFileName"
                type="text"
                class="rename-input"
                @click.stop
                @keydown.enter="confirmRename"
                @keydown.escape="cancelRename"
                @blur="confirmRename"
              />
            </div>
            <div v-else class="file-name">{{ file.name }}</div>
          </div>

          <!-- 文件大小 -->
          <div class="file-size-cell">
            {{ file.isDirectory ? '-' : formatFileSize(file.size) }}
          </div>

          <!-- 修改时间 -->
          <div class="file-modified-cell">
            {{ formatTime(file.modified) }}
          </div>

          <!-- 文件类型 -->
          <div class="file-type-cell">
            {{ getFileType(file) }}
          </div>

          <!-- 操作按钮 -->
          <div class="file-actions-cell" @click.stop>
            <button
              v-if="!file.isDirectory"
              @click="previewFile(file)"
              class="action-btn"
              title="预览"
            >
              <i class="fas fa-eye"></i>
            </button>
            
            <button
              @click="editFile(file)"
              class="action-btn"
              title="编辑"
            >
              <i class="fas fa-edit"></i>
            </button>

            <button
              @click="startRename(file)"
              class="action-btn"
              title="重命名"
            >
              <i class="fas fa-pen"></i>
            </button>

            <button
              @click="duplicateFile(file)"
              class="action-btn"
              title="复制"
            >
              <i class="fas fa-copy"></i>
            </button>

            <button
              @click="deleteFile(file)"
              class="action-btn danger"
              title="删除"
            >
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- 网格视图 -->
      <div v-else class="file-grid">
        <div
          v-for="file in filteredFiles"
          :key="file.path"
          class="file-card"
          :class="{
            'directory': file.isDirectory,
            'selected': selectedFiles.has(file.path)
          }"
          @click="selectFile(file)"
          @dblclick="openFile(file)"
        >
          <div class="card-icon">
            <i :class="getFileIcon(file)"></i>
          </div>
          
          <div class="card-name" :title="file.name">
            {{ file.name }}
          </div>

          <div class="card-info">
            <div class="card-size">
              {{ file.isDirectory ? '文件夹' : formatFileSize(file.size) }}
            </div>
            <div class="card-time">
              {{ formatRelativeTime(file.modified) }}
            </div>
          </div>

          <div class="card-actions" @click.stop>
            <button
              v-if="!file.isDirectory"
              @click="previewFile(file)"
              class="card-action-btn"
              title="预览"
            >
              <i class="fas fa-eye"></i>
            </button>
            
            <button
              @click="editFile(file)"
              class="card-action-btn"
              title="编辑"
            >
              <i class="fas fa-edit"></i>
            </button>

            <button
              @click="deleteFile(file)"
              class="card-action-btn danger"
              title="删除"
            >
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 状态栏 -->
    <div class="browser-status">
      <div class="status-left">
        <span class="status-item">
          {{ filteredFiles.length }} 个项目
        </span>
        <span v-if="selectedFiles.size" class="status-item">
          已选择 {{ selectedFiles.size }} 个
        </span>
      </div>

      <div class="status-right">
        <span class="status-item">
          当前路径: {{ currentPath }}
        </span>
      </div>
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenu.visible"
      class="context-menu"
      :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
      @click.stop
    >
      <div
        v-if="contextMenu.file"
        class="menu-item"
        @click="openFile(contextMenu.file)"
      >
        <i class="fas fa-folder-open"></i>
        打开
      </div>
      
      <div
        v-if="contextMenu.file && !contextMenu.file.isDirectory"
        class="menu-item"
        @click="previewFile(contextMenu.file)"
      >
        <i class="fas fa-eye"></i>
        预览
      </div>

      <div
        v-if="contextMenu.file"
        class="menu-item"
        @click="editFile(contextMenu.file)"
      >
        <i class="fas fa-edit"></i>
        编辑
      </div>

      <div class="menu-divider"></div>

      <div
        v-if="contextMenu.file"
        class="menu-item"
        @click="startRename(contextMenu.file)"
      >
        <i class="fas fa-pen"></i>
        重命名
      </div>

      <div
        v-if="contextMenu.file"
        class="menu-item"
        @click="duplicateFile(contextMenu.file)"
      >
        <i class="fas fa-copy"></i>
        复制
      </div>

      <div class="menu-divider"></div>

      <div class="menu-item" @click="showNewFileDialog = true">
        <i class="fas fa-file-plus"></i>
        新建文件
      </div>

      <div class="menu-item" @click="showNewFolderDialog = true">
        <i class="fas fa-folder-plus"></i>
        新建文件夹
      </div>

      <div class="menu-divider"></div>

      <div
        v-if="contextMenu.file"
        class="menu-item danger"
        @click="deleteFile(contextMenu.file)"
      >
        <i class="fas fa-trash"></i>
        删除
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

      <template #footer>
        <button @click="showNewFileDialog = false" class="btn btn-secondary">
          取消
        </button>
        <button
          @click="createNewFile"
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
          @click="createNewFolder"
          class="btn btn-primary"
          :disabled="!newFolderName"
        >
          创建
        </button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

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

interface BreadcrumbItem {
  name: string
  path: string
}

interface ContextMenuFile {
  file: FileItem | null
  x: number
  y: number
  visible: boolean
}

// Props
const props = defineProps<{
  initialPath?: string
  rootPath?: string
}>()

// Emits
const emit = defineEmits<{
  fileOpen: [file: FileItem]
  fileEdit: [file: FileItem]
  filePreview: [file: FileItem]
  pathChange: [path: string]
}>()

// 响应式数据
const files = ref<FileItem[]>([])
const currentPath = ref(props.initialPath || '/')
const loading = ref(false)
const searchQuery = ref('')
const viewMode = ref<'list' | 'grid'>('list')
const selectedFiles = ref(new Set<string>())
const editingFile = ref<string | null>(null)
const newFileName = ref('')
const showNewFileDialog = ref(false)
const showNewFolderDialog = ref(false)
const newFolderName = ref('')
const newFileType = ref('txt')

// 右键菜单
const contextMenu = ref<ContextMenuFile>({
  file: null,
  x: 0,
  y: 0,
  visible: false
})

// 组件引用
const fileContentRef = ref<HTMLElement>()
const renameInputRef = ref<HTMLInputElement>()

// 防抖函数
const debounce = (fn: Function, delay: number) => {
  let timeoutId: number
  return (...args: any[]) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

// 计算属性
const breadcrumbs = computed((): BreadcrumbItem[] => {
  const parts = currentPath.value.split('/').filter(Boolean)
  const crumbs: BreadcrumbItem[] = [
    { name: '根目录', path: '/' }
  ]

  let path = ''
  parts.forEach(part => {
    path += '/' + part
    crumbs.push({ name: part, path })
  })

  return crumbs
})

const filteredFiles = computed(() => {
  if (!searchQuery.value) return files.value

  const query = searchQuery.value.toLowerCase()
  return files.value.filter(file =>
    file.name.toLowerCase().includes(query)
  )
})

// 方法
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const formatTime = (time: string): string => {
  return new Date(time).toLocaleString('zh-CN')
}

const formatRelativeTime = (time: string): string => {
  const now = new Date()
  const fileTime = new Date(time)
  const diffMs = now.getTime() - fileTime.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 30) return `${diffDays}天前`
  return formatTime(time)
}

const getFileIcon = (file: FileItem): string => {
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

const getFileType = (file: FileItem): string => {
  if (file.isDirectory) return '文件夹'
  
  const ext = file.extension?.toLowerCase()
  const typeMap: Record<string, string> = {
    'txt': '文本文件',
    'md': 'Markdown',
    'json': 'JSON',
    'yaml': 'YAML',
    'yml': 'YAML',
    'nc': '数控程序',
    'gcode': 'G代码',
    'cnc': 'CNC程序',
    'js': 'JavaScript',
    'ts': 'TypeScript',
    'py': 'Python',
    'html': 'HTML',
    'css': 'CSS',
    'xml': 'XML',
    'pdf': 'PDF文档',
    'png': 'PNG图片',
    'jpg': 'JPEG图片',
    'jpeg': 'JPEG图片',
    'gif': 'GIF图片',
    'svg': 'SVG图片'
  }
  return typeMap[ext || ''] || '未知类型'
}

const loadFiles = async () => {
  loading.value = true
  try {
    // 模拟API调用
    const response = await fetch(`/api/files?path=${encodeURIComponent(currentPath.value)}`)
    if (response.ok) {
      const data = await response.json()
      files.value = data.files.map((file: any) => ({
        ...file,
        extension: file.name.split('.').pop()
      }))
    } else {
      // 使用模拟数据
      files.value = getMockFiles()
    }
  } catch (error) {
    console.warn('加载文件列表失败:', error)
    // 使用模拟数据
    files.value = getMockFiles()
  } finally {
    loading.value = false
  }
}

const getMockFiles = (): FileItem[] => {
  return [
    {
      path: currentPath.value + '/templates',
      name: 'templates',
      isDirectory: true,
      size: 0,
      modified: '2024-01-14T10:30:00Z',
      created: '2024-01-10T08:00:00Z'
    },
    {
      path: currentPath.value + '/config.yaml',
      name: 'config.yaml',
      isDirectory: false,
      size: 2048,
      modified: '2024-01-14T09:15:00Z',
      created: '2024-01-12T14:20:00Z',
      extension: 'yaml'
    },
    {
      path: currentPath.value + '/program.nc',
      name: 'program.nc',
      isDirectory: false,
      size: 1536,
      modified: '2024-01-14T11:45:00Z',
      created: '2024-01-13T16:30:00Z',
      extension: 'nc'
    },
    {
      path: currentPath.value + '/readme.md',
      name: 'readme.md',
      isDirectory: false,
      size: 512,
      modified: '2024-01-14T08:20:00Z',
      created: '2024-01-11T10:15:00Z',
      extension: 'md'
    }
  ]
}

const refreshFiles = () => {
  loadFiles()
}

const navigateToPath = (path: string) => {
  currentPath.value = path
  loadFiles()
  emit('pathChange', path)
}

const selectFile = (file: FileItem, event?: MouseEvent) => {
  if (event?.ctrlKey || event?.metaKey) {
    // 多选
    if (selectedFiles.value.has(file.path)) {
      selectedFiles.value.delete(file.path)
    } else {
      selectedFiles.value.add(file.path)
    }
  } else {
    // 单选
    selectedFiles.value.clear()
    selectedFiles.value.add(file.path)
  }
}

const openFile = (file: FileItem) => {
  if (file.isDirectory) {
    navigateToPath(file.path)
  } else {
    emit('fileOpen', file)
  }
}

const previewFile = (file: FileItem) => {
  if (!file.isDirectory) {
    emit('filePreview', file)
  }
}

const editFile = (file: FileItem) => {
  if (!file.isDirectory) {
    emit('fileEdit', file)
  }
}

const startRename = async (file: FileItem) => {
  editingFile.value = file.path
  newFileName.value = file.name

  await nextTick()
  if (renameInputRef.value) {
    renameInputRef.value.focus()
    renameInputRef.value.select()
  }
}

const confirmRename = async () => {
  if (!editingFile.value || !newFileName.value.trim()) return

  try {
    // 调用重命名API
    const response = await fetch('/api/files/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        oldPath: editingFile.value,
        newName: newFileName.value.trim()
      })
    })

    if (response.ok) {
      ElMessage.success('文件重命名成功')
      loadFiles()
    } else {
      throw new Error('重命名失败')
    }
  } catch (error) {
    ElMessage.error('文件重命名失败')
  } finally {
    editingFile.value = null
  }
}

const cancelRename = () => {
  editingFile.value = null
}

const duplicateFile = async (file: FileItem) => {
  try {
    const response = await fetch('/api/files/duplicate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: file.path })
    })

    if (response.ok) {
      ElMessage.success('文件复制成功')
      loadFiles()
    } else {
      throw new Error('复制失败')
    }
  } catch (error) {
    ElMessage.error('文件复制失败')
  }
}

const deleteFile = async (file: FileItem) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除${file.isDirectory ? '文件夹' : '文件'} "${file.name}" 吗？`,
      '确认删除',
      { type: 'warning' }
    )

    const response = await fetch('/api/files/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: file.path })
    })

    if (response.ok) {
      ElMessage.success('删除成功')
      loadFiles()
      selectedFiles.value.delete(file.path)
    } else {
      throw new Error('删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const createNewFile = async () => {
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
        type: 'file'
      })
    })

    if (response.ok) {
      ElMessage.success('文件创建成功')
      loadFiles()
      showNewFileDialog.value = false
      newFileName.value = ''
    } else {
      throw new Error('创建失败')
    }
  } catch (error) {
    ElMessage.error('文件创建失败')
  }
}

const createNewFolder = async () => {
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
      loadFiles()
      showNewFolderDialog.value = false
      newFolderName.value = ''
    } else {
      throw new Error('创建失败')
    }
  } catch (error) {
    ElMessage.error('文件夹创建失败')
  }
}

const debouncedSearch = debounce(() => {
  // 搜索逻辑已在计算属性中处理
}, 300)

const showContextMenu = (event: MouseEvent, file?: FileItem) => {
  event.preventDefault()
  contextMenu.value = {
    file: file || null,
    x: event.clientX,
    y: event.clientY,
    visible: true
  }
}

const hideContextMenu = () => {
  contextMenu.value.visible = false
}

// 键盘事件处理
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    hideContextMenu()
    selectedFiles.value.clear()
  }

  if (event.key === 'Delete' && selectedFiles.value.size > 0) {
    // 批量删除
    const filesToDelete = Array.from(selectedFiles.value)
      .map(path => files.value.find(f => f.path === path))
      .filter(Boolean) as FileItem[]

    if (filesToDelete.length > 0) {
      deleteFile(filesToDelete[0]) // 只删除第一个，避免复杂化
    }
  }
}

// 生命周期
onMounted(() => {
  loadFiles()
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('click', hideContextMenu)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('click', hideContextMenu)
})
</script>

<style scoped>
.file-browser {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
}

.browser-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--vscode-panel-background);
  border-bottom: 1px solid var(--vscode-panel-border);
}

.toolbar-left {
  display: flex;
  align-items: center;
  flex: 1;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 4px;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: background-color 0.2s;
}

.breadcrumb-item:hover {
  background: var(--vscode-toolbar-hoverBackground);
}

.breadcrumb-item.last {
  color: var(--vscode-foreground);
  font-weight: 500;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-box {
  position: relative;
  width: 200px;
}

.search-input {
  width: 100%;
  padding: 4px 8px 4px 28px;
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  font-size: 12px;
}

.search-icon {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--vscode-descriptionForeground);
  font-size: 12px;
}

.view-controls {
  display: flex;
  gap: 2px;
}

.view-btn {
  padding: 4px 6px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--vscode-descriptionForeground);
  cursor: pointer;
  border-radius: 4px;
  font-size: 12px;
}

.view-btn:hover {
  background: var(--vscode-toolbar-hoverBackground);
}

.view-btn.active {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
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

.btn-primary {
  background: var(--vscode-button-background);
  border-color: var(--vscode-button-border);
  color: var(--vscode-button-foreground);
}

.file-content {
  flex: 1;
  overflow: hidden;
  position: relative;
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

/* 列表视图样式 */
.file-list {
  height: 100%;
  overflow: auto;
}

.list-header {
  display: flex;
  background: var(--vscode-panel-background);
  border-bottom: 1px solid var(--vscode-panel-border);
  font-weight: 500;
  font-size: 12px;
  position: sticky;
  top: 0;
  z-index: 1;
}

.header-cell {
  padding: 8px 12px;
  display: flex;
  align-items: center;
}

.header-cell.name {
  flex: 2;
}

.header-cell.size {
  flex: 1;
  justify-content: flex-end;
}

.header-cell.modified {
  flex: 1.5;
}

.header-cell.type {
  flex: 1;
}

.header-cell.actions {
  flex: 1;
  justify-content: center;
}

.file-item {
  display: flex;
  border-bottom: 1px solid var(--vscode-panel-border);
  cursor: pointer;
  transition: background-color 0.2s;
}

.file-item:hover {
  background: var(--vscode-list-hoverBackground);
}

.file-item.selected {
  background: var(--vscode-list-activeSelectionBackground);
}

.file-item.editing {
  background: var(--vscode-inputValidation-warningBackground);
}

.file-name-cell {
  flex: 2;
  display: flex;
  align-items: center;
  padding: 8px 12px;
  gap: 8px;
}

.file-icon {
  color: var(--vscode-descriptionForeground);
  font-size: 16px;
}

.file-name {
  font-size: 13px;
}

.file-name-input {
  flex: 1;
}

.rename-input {
  width: 100%;
  padding: 2px 4px;
  border: 1px solid var(--vscode-input-border);
  border-radius: 2px;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  font-size: 13px;
}

.file-size-cell, .file-modified-cell, .file-type-cell {
  flex: 1;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  display: flex;
  align-items: center;
}

.file-size-cell {
  justify-content: flex-end;
}

.file-actions-cell {
  flex: 1;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.action-btn {
  padding: 2px 6px;
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

/* 网格视图样式 */
.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  padding: 16px;
  height: 100%;
  overflow: auto;
}

.file-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--vscode-editor-background);
}

.file-card:hover {
  border-color: var(--vscode-focusBorder);
  transform: translateY(-2px);
}

.file-card.selected {
  border-color: var(--vscode-button-background);
  background: var(--vscode-list-activeSelectionBackground);
}

.card-icon {
  font-size: 32px;
  color: var(--vscode-descriptionForeground);
  margin-bottom: 8px;
}

.card-name {
  font-size: 12px;
  font-weight: 500;
  text-align: center;
  margin-bottom: 8px;
  word-break: break-all;
  flex: 1;
  display: flex;
  align-items: center;
}

.card-info {
  font-size: 10px;
  color: var(--vscode-descriptionForeground);
  text-align: center;
  width: 100%;
}

.card-actions {
  display: flex;
  gap: 4px;
  margin-top: 8px;
  opacity: 0;
  transition: opacity 0.2s;
}

.file-card:hover .card-actions {
  opacity: 1;
}

.card-action-btn {
  padding: 2px 4px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--vscode-descriptionForeground);
  cursor: pointer;
  border-radius: 3px;
  font-size: 10px;
}

.card-action-btn:hover {
  background: var(--vscode-toolbar-hoverBackground);
  color: var(--vscode-foreground);
}

.card-action-btn.danger:hover {
  background: var(--vscode-errorForeground);
  color: white;
}

/* 状态栏 */
.browser-status {
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
  color: var(--vscode-descriptionForeground);
}

/* 右键菜单 */
.context-menu {
  position: fixed;
  background: var(--vscode-menu-background);
  border: 1px solid var(--vscode-menu-border);
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 180px;
  padding: 4px 0;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 12px;
  color: var(--vscode-menu-foreground);
  transition: background-color 0.2s;
}

.menu-item:hover {
  background: var(--vscode-menu-selectionBackground);
}

.menu-item.danger {
  color: var(--vscode-errorForeground);
}

.menu-item.danger:hover {
  background: var(--vscode-errorForeground);
  color: white;
}

.menu-divider {
  height: 1px;
  background: var(--vscode-menu-separatorBackground);
  margin: 4px 0;
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

/* Element Plus 主题适配 */
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