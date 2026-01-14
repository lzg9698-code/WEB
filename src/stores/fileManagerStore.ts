/**
 * 文件管理模块状态管理
 * 
 * 严格遵循PROJECT_REQUIREMENTS.md文档约束
 * 功能：管理文件浏览、操作、历史记录等状态
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'

// 接口定义
export interface FileItem {
  path: string
  name: string
  isDirectory: boolean
  size: number
  modified: string
  created: string
  extension?: string
  accessTime?: string
  accessCount?: number
  parentPath?: string
  children?: FileItem[]
}

export interface FileOperation {
  id: string
  type: 'copy' | 'move' | 'rename' | 'delete' | 'create'
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
  description: string
  sourcePath?: string
  targetPath?: string
  files: string[]
  progress: number
  currentItem?: string
  showProgress: boolean
  startTime: string
  endTime?: string
  error?: string
  result?: any
}

export interface FileSearchResult {
  id: string
  file: FileItem
  matches: Array<{
    lineNumber: number
    content: string
    match: string
    startIndex: number
    endIndex: number
  }>
  relevanceScore: number
}

export const useFileManagerStore = defineStore('fileManager', () => {
  // 状态
  const currentPath = ref('/')
  const files = ref<FileItem[]>([])
  const selectedFiles = ref<string[]>([])
  const clipboard = ref<{
    files: FileItem[]
    operation: 'copy' | 'cut'
    sourcePath: string
  } | null>(null)
  const recentFiles = ref<FileItem[]>([])
  const fileOperations = ref<FileOperation[]>([])
  const searchResults = ref<FileSearchResult[]>([])
  const loading = ref(false)
  const viewMode = ref<'list' | 'grid'>('list')

  // 文件操作
  const isOperating = ref(false)
  const currentOperation = ref<FileOperation | null>(null)

  // 计算属性
  const selectedFileItems = computed(() => {
    return files.value.filter(file => selectedFiles.value.includes(file.path))
  })

  const directoryTree = computed((): FileItem[] => {
    const buildTree = (items: FileItem[], parentPath: string = '/'): FileItem[] => {
      return items
        .filter(item => item.parentPath === parentPath)
        .map(item => ({
          ...item,
          children: item.isDirectory ? buildTree(items, item.path) : undefined
        }))
        .sort((a, b) => {
          // 文件夹优先，然后按名称排序
          if (a.isDirectory && !b.isDirectory) return -1
          if (!a.isDirectory && b.isDirectory) return 1
          return a.name.localeCompare(b.name)
        })
    }

    return buildTree(files.value)
  })

  const pathSegments = computed(() => {
    const segments = currentPath.value.split('/').filter(Boolean)
    const result = [{ name: '根目录', path: '/' }]
    
    let path = ''
    segments.forEach(segment => {
      path += '/' + segment
      result.push({ name: segment, path })
    })
    
    return result
  })

  const hasClipboard = computed(() => clipboard.value !== null)

  // 方法
  const navigateToPath = async (path: string) => {
    if (path === currentPath.value) return

    loading.value = true
    try {
      const response = await fetch(`/api/files?path=${encodeURIComponent(path)}`)
      if (response.ok) {
        const data = await response.json()
        files.value = data.files.map((file: any) => ({
          ...file,
          extension: file.name.split('.').pop(),
          parentPath: path,
          accessTime: file.accessTime || file.modified,
          accessCount: file.accessCount || 0
        }))
        currentPath.value = path
        selectedFiles.value = []
      } else {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('加载文件列表失败:', error)
      ElMessage.error('无法访问指定路径')
    } finally {
      loading.value = false
    }
  }

  const refreshFiles = async () => {
    await navigateToPath(currentPath.value)
  }

  const selectFile = (filePath: string, multiSelect = false) => {
    if (multiSelect) {
      if (selectedFiles.value.includes(filePath)) {
        selectedFiles.value = selectedFiles.value.filter(path => path !== filePath)
      } else {
        selectedFiles.value.push(filePath)
      }
    } else {
      selectedFiles.value = [filePath]
    }
  }

  const selectAllFiles = () => {
    selectedFiles.value = files.value.map(file => file.path)
  }

  const clearSelection = () => {
    selectedFiles.value = []
  }

  const copyFiles = (files: FileItem[]) => {
    clipboard.value = {
      files,
      operation: 'copy',
      sourcePath: currentPath.value
    }
    ElMessage.success(`已复制 ${files.length} 个文件到剪贴板`)
  }

  const cutFiles = (files: FileItem[]) => {
    clipboard.value = {
      files,
      operation: 'cut',
      sourcePath: currentPath.value
    }
    ElMessage.success(`已剪切 ${files.length} 个文件到剪贴板`)
  }

  const pasteFiles = async () => {
    if (!clipboard.value) return

    isOperating.value = true
    try {
      const operation = createFileOperation(
        clipboard.value.operation === 'copy' ? 'copy' : 'move',
        `${clipboard.value.operation === 'copy' ? '复制' : '移动'} ${clipboard.value.files.length} 个文件`,
        clipboard.value.files.map(file => file.path),
        {
          targetPath: currentPath.value
        }
      )

      await executeFileOperation(operation)
      
      clipboard.value = null
      await refreshFiles()
    } catch (error) {
      ElMessage.error(`${clipboard.value.operation === 'copy' ? '复制' : '移动'}失败`)
    } finally {
      isOperating.value = false
    }
  }

  const deleteFiles = async (files: FileItem[]) => {
    isOperating.value = true
    try {
      const operation = createFileOperation(
        'delete',
        `删除 ${files.length} 个文件`,
        files.map(file => file.path)
      )

      await executeFileOperation(operation)
      await refreshFiles()
      clearSelection()
    } catch (error) {
      ElMessage.error('删除失败')
    } finally {
      isOperating.value = false
    }
  }

  const createFile = async (name: string, type: 'file' | 'directory' = 'file') => {
    isOperating.value = true
    try {
      const response = await fetch('/api/files/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: currentPath.value,
          name,
          type
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      ElMessage.success(`${type === 'directory' ? '文件夹' : '文件'}创建成功`)
      await refreshFiles()
    } catch (error) {
      ElMessage.error('创建失败')
    } finally {
      isOperating.value = false
    }
  }

  const renameFile = async (file: FileItem, newName: string) => {
    isOperating.value = true
    try {
      const operation = createFileOperation(
        'rename',
        `重命名 ${file.name}`,
        [file.path],
        { targetPath: `${file.parentPath}/${newName}` }
      )

      await executeFileOperation(operation)
      await refreshFiles()
    } catch (error) {
      ElMessage.error('重命名失败')
    } finally {
      isOperating.value = false
    }
  }

  const uploadFiles = async (files: File[]) => {
    isOperating.value = true
    try {
      const formData = new FormData()
      formData.append('path', currentPath.value)
      
      files.forEach(file => {
        formData.append('files', file)
      })

      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      ElMessage.success(`成功上传 ${files.length} 个文件`)
      await refreshFiles()
    } catch (error) {
      ElMessage.error('上传失败')
    } finally {
      isOperating.value = false
    }
  }

  const searchFiles = async (query: string, options: any = {}) => {
    loading.value = true
    try {
      const response = await fetch('/api/files/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          path: currentPath.value,
          ...options
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      searchResults.value = data.results
    } catch (error) {
      ElMessage.error('搜索失败')
    } finally {
      loading.value = false
    }
  }

  const addToRecentFiles = (file: FileItem) => {
    const existingIndex = recentFiles.value.findIndex(f => f.path === file.path)
    if (existingIndex > -1) {
      recentFiles.value.splice(existingIndex, 1)
    }

    recentFiles.value.unshift({
      ...file,
      accessTime: new Date().toISOString(),
      accessCount: (file.accessCount || 0) + 1
    })

    // 限制最近文件数量
    if (recentFiles.value.length > 50) {
      recentFiles.value = recentFiles.value.slice(0, 50)
    }

    saveRecentFiles()
  }

  const removeFromRecentFiles = (filePath: string) => {
    const index = recentFiles.value.findIndex(f => f.path === filePath)
    if (index > -1) {
      recentFiles.value.splice(index, 1)
      saveRecentFiles()
    }
  }

  const clearRecentFiles = () => {
    recentFiles.value = []
    saveRecentFiles()
  }

  const createFileOperation = (
    type: FileOperation['type'],
    description: string,
    files: string[],
    options: Partial<FileOperation> = {}
  ): FileOperation => {
    const operation: FileOperation = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      status: 'pending',
      description,
      files,
      progress: 0,
      showProgress: files.length > 1,
      startTime: new Date().toISOString(),
      ...options
    }

    fileOperations.value.unshift(operation)
    return operation
  }

  const executeFileOperation = async (operation: FileOperation) => {
    operation.status = 'running'
    currentOperation.value = operation

    try {
      // 根据操作类型执行相应的API调用
      const endpoint = `/api/files/${operation.type}`
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: operation.files,
          targetPath: operation.targetPath
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      operation.status = 'completed'
      operation.endTime = new Date().toISOString()
      operation.progress = 100

      // 更新相关文件的访问记录
      operation.files.forEach(filePath => {
        const file = files.value.find(f => f.path === filePath)
        if (file && !file.isDirectory) {
          addToRecentFiles(file)
        }
      })

    } catch (error) {
      operation.status = 'failed'
      operation.endTime = new Date().toISOString()
      operation.error = error instanceof Error ? error.message : '操作失败'
      throw error
    } finally {
      currentOperation.value = null
    }
  }

  const cancelOperation = (operationId: string) => {
    const operation = fileOperations.value.find(op => op.id === operationId)
    if (operation && ['pending', 'running'].includes(operation.status)) {
      operation.status = 'cancelled'
      operation.endTime = new Date().toISOString()
    }
  }

  const clearOperations = () => {
    fileOperations.value = []
  }

  const clearSearchResults = () => {
    searchResults.value = []
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

  const loadFileOperations = () => {
    try {
      const stored = localStorage.getItem('file-operations')
      if (stored) {
        fileOperations.value = JSON.parse(stored)
      }
    } catch (error) {
      console.warn('加载文件操作历史失败:', error)
    }
  }

  const saveFileOperations = () => {
    try {
      localStorage.setItem('file-operations', JSON.stringify(fileOperations.value))
    } catch (error) {
      console.warn('保存文件操作历史失败:', error)
    }
  }

  // 初始化
  const initialize = async () => {
    loadRecentFiles()
    loadFileOperations()
    await navigateToPath(currentPath.value)
  }

  return {
    // 状态
    currentPath,
    files,
    selectedFiles,
    clipboard,
    recentFiles,
    fileOperations,
    searchResults,
    loading,
    viewMode,
    isOperating,
    currentOperation,

    // 计算属性
    selectedFileItems,
    directoryTree,
    pathSegments,
    hasClipboard,

    // 方法
    navigateToPath,
    refreshFiles,
    selectFile,
    selectAllFiles,
    clearSelection,
    copyFiles,
    cutFiles,
    pasteFiles,
    deleteFiles,
    createFile,
    renameFile,
    uploadFiles,
    searchFiles,
    addToRecentFiles,
    removeFromRecentFiles,
    clearRecentFiles,
    cancelOperation,
    clearOperations,
    clearSearchResults,
    initialize
  }
})