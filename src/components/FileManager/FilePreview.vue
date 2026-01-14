<!--
  文件预览组件
  
  严格遵循PROJECT_REQUIREMENTS.md文档约束
  功能：预览各种类型的文件内容，支持语法高亮和格式化显示
-->
<template>
  <div class="file-preview">
    <!-- 预览头部 -->
    <div class="preview-header">
      <div class="header-left">
        <div class="file-info">
          <div class="file-icon">
            <i :class="getFileIcon(currentFile)"></i>
          </div>
          <div class="file-details">
            <div class="file-name">{{ currentFile?.name }}</div>
            <div class="file-meta">
              <span class="file-size">{{ formatFileSize(currentFile?.size || 0) }}</span>
              <span class="file-type">{{ getFileType(currentFile) }}</span>
              <span class="file-modified">{{ formatTime(currentFile?.modified || '') }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="header-right">
        <div class="preview-controls">
          <button
            @click="toggleLineNumbers"
            class="control-btn"
            :class="{ active: showLineNumbers }"
            title="显示行号"
          >
            <i class="fas fa-list-ol"></i>
          </button>

          <button
            @click="toggleWordWrap"
            class="control-btn"
            :class="{ active: wordWrap }"
            title="自动换行"
          >
            <i class="fas fa-align-left"></i>
          </button>

          <button
            @click="copyContent"
            class="control-btn"
            title="复制内容"
          >
            <i class="fas fa-copy"></i>
          </button>

          <button
            @click="downloadFile"
            class="control-btn"
            title="下载文件"
          >
            <i class="fas fa-download"></i>
          </button>

          <button
            @click="refreshPreview"
            :disabled="loading"
            class="control-btn"
            title="刷新"
          >
            <i class="fas fa-sync-alt"></i>
          </button>
        </div>

        <button
          @click="$emit('close')"
          class="close-btn"
          title="关闭预览"
        >
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>

    <!-- 预览内容 -->
    <div class="preview-content" ref="previewContentRef">
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>加载文件内容...</p>
      </div>

      <!-- 错误状态 -->
      <div v-else-if="error" class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <p>文件加载失败</p>
        <span class="error-message">{{ error }}</span>
        <button @click="loadFileContent" class="btn btn-primary btn-sm">
          重试
        </button>
      </div>

      <!-- 空文件 -->
      <div v-else-if="!fileContent" class="empty-state">
        <i class="fas fa-file-alt"></i>
        <p>文件为空</p>
      </div>

      <!-- 图片预览 -->
      <div v-else-if="isImageFile" class="image-preview">
        <img
          :src="imageDataUrl"
          :alt="currentFile?.name"
          @load="onImageLoad"
          @error="onImageError"
        />
        <div class="image-info">
          <span>{{ imageDimensions.width }} × {{ imageDimensions.height }}</span>
          <span>{{ formatFileSize(currentFile?.size || 0) }}</span>
        </div>
      </div>

      <!-- PDF预览 -->
      <div v-else-if="isPdfFile" class="pdf-preview">
        <iframe
          :src="pdfDataUrl"
          class="pdf-frame"
          title="PDF预览"
        ></iframe>
      </div>

      <!-- 代码/文本预览 -->
      <div v-else class="text-preview">
        <div class="text-content" :class="{ 'word-wrap': wordWrap }">
          <pre
            class="code-content"
            :class="{ 'with-line-numbers': showLineNumbers }"
          ><code
            v-html="highlightedContent"
          ></code></pre>
        </div>

        <!-- 文件信息面板 -->
        <div class="info-panel" v-if="showInfo">
          <div class="info-section">
            <h6>文件信息</h6>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">文件名:</span>
                <span class="info-value">{{ currentFile?.name }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">大小:</span>
                <span class="info-value">{{ formatFileSize(currentFile?.size || 0) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">类型:</span>
                <span class="info-value">{{ getFileType(currentFile) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">修改时间:</span>
                <span class="info-value">{{ formatTime(currentFile?.modified || '') }}</span>
              </div>
            </div>
          </div>

          <div class="info-section">
            <h6>内容统计</h6>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">总行数:</span>
                <span class="info-value">{{ contentStats.lines }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">字符数:</span>
                <span class="info-value">{{ contentStats.characters }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">单词数:</span>
                <span class="info-value">{{ contentStats.words }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">编码:</span>
                <span class="info-value">{{ contentStats.encoding || 'UTF-8' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部状态栏 -->
    <div class="preview-status">
      <div class="status-left">
        <span class="status-item">
          第 {{ currentLine }} 行，第 {{ currentColumn }} 列
        </span>
        <span class="status-item">
          {{ contentStats.lines }} 行
        </span>
      </div>

      <div class="status-right">
        <button
          @click="toggleInfo"
          class="status-btn"
          :class="{ active: showInfo }"
        >
          <i class="fas fa-info-circle"></i>
          信息
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import hljs from 'highlight.js'
import 'highlight.js/styles/vs.css'

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

// Props
const props = defineProps<{
  file: FileItem
}>()

// Emits
const emit = defineEmits<{
  close: []
  edit: [file: FileItem]
}>()

// 响应式数据
const currentFile = ref<FileItem>(props.file)
const fileContent = ref<string>('')
const loading = ref(false)
const error = ref<string>('')
const showLineNumbers = ref(true)
const wordWrap = ref(false)
const showInfo = ref(false)
const currentLine = ref(1)
const currentColumn = ref(1)

// 图片相关
const imageDataUrl = ref('')
const imageDimensions = ref({ width: 0, height: 0 })

// PDF相关
const pdfDataUrl = ref('')

// 组件引用
const previewContentRef = ref<HTMLElement>()

// 计算属性
const isImageFile = computed(() => {
  const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'bmp', 'webp']
  return imageExts.includes(currentFile.value.extension?.toLowerCase() || '')
})

const isPdfFile = computed(() => {
  return currentFile.value.extension?.toLowerCase() === 'pdf'
})

const highlightedContent = computed(() => {
  if (!fileContent.value) return ''

  const language = getLanguageForFile(currentFile.value)
  
  try {
    if (language === 'gcode') {
      // G代码特殊高亮
      return fileContent.value
        .replace(/([G|M|T|S|F]\d+)/g, '<span class="hljs-keyword">$1</span>')
        .replace(/([X|Y|Z|I|J|K|R]-?\d+\.?\d*)/g, '<span class="hljs-number">$1</span>')
        .replace(/(;.*)$/gm, '<span class="hljs-comment">$1</span>')
    }

    const result = hljs.highlight(fileContent.value, { language })
    return result.value
  } catch (highlightError) {
    console.warn('语法高亮失败:', highlightError)
    return escapeHtml(fileContent.value)
  }
})

const contentStats = computed(() => {
  if (!fileContent.value) {
    return { lines: 0, characters: 0, words: 0, encoding: null }
  }

  const lines = fileContent.value.split('\n').length
  const characters = fileContent.value.length
  const words = fileContent.value.trim().split(/\s+/).filter(Boolean).length

  return { lines, characters, words, encoding: 'UTF-8' }
})

// 方法
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

const getLanguageForFile = (file: FileItem): string => {
  const ext = file.extension?.toLowerCase()
  const langMap: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'py': 'python',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'h': 'c',
    'css': 'css',
    'html': 'html',
    'xml': 'xml',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'md': 'markdown',
    'sh': 'bash',
    'bat': 'batch',
    'nc': 'gcode',
    'gcode': 'gcode',
    'cnc': 'gcode'
  }
  return langMap[ext || ''] || 'text'
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const formatTime = (time: string): string => {
  return new Date(time).toLocaleString('zh-CN')
}

const escapeHtml = (text: string): string => {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

const loadFileContent = async () => {
  if (!currentFile.value || currentFile.value.isDirectory) return

  loading.value = true
  error.value = ''

  try {
    if (isImageFile.value) {
      await loadImageFile()
    } else if (isPdfFile.value) {
      await loadPdfFile()
    } else {
      await loadTextFile()
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载失败'
    console.error('文件加载错误:', err)
  } finally {
    loading.value = false
  }
}

const loadTextFile = async () => {
  const response = await fetch(`/api/files/content?path=${encodeURIComponent(currentFile.value.path)}`)
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const content = await response.text()
  fileContent.value = content
}

const loadImageFile = async () => {
  const response = await fetch(`/api/files/content?path=${encodeURIComponent(currentFile.value.path)}`)
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const blob = await response.blob()
  imageDataUrl.value = URL.createObjectURL(blob)
}

const loadPdfFile = async () => {
  const response = await fetch(`/api/files/content?path=${encodeURIComponent(currentFile.value.path)}`)
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }

  const blob = await response.blob()
  pdfDataUrl.value = URL.createObjectURL(blob)
}

const onImageLoad = (event: Event) => {
  const img = event.target as HTMLImageElement
  imageDimensions.value = {
    width: img.naturalWidth,
    height: img.naturalHeight
  }
}

const onImageError = () => {
  error.value = '图片加载失败'
}

const toggleLineNumbers = () => {
  showLineNumbers.value = !showLineNumbers.value
}

const toggleWordWrap = () => {
  wordWrap.value = !wordWrap.value
}

const toggleInfo = () => {
  showInfo.value = !showInfo.value
}

const copyContent = async () => {
  if (!fileContent.value) return

  try {
    await navigator.clipboard.writeText(fileContent.value)
    ElMessage.success('内容已复制到剪贴板')
  } catch (err) {
    ElMessage.error('复制失败')
  }
}

const downloadFile = async () => {
  if (!currentFile.value) return

  try {
    const response = await fetch(`/api/files/download?path=${encodeURIComponent(currentFile.value.path)}`)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = currentFile.value.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    ElMessage.success('文件下载已开始')
  } catch (err) {
    ElMessage.error('下载失败')
  }
}

const refreshPreview = () => {
  loadFileContent()
}

const updateCursorPosition = () => {
  // 更新光标位置显示
  // 这里可以根据实际需要实现
}

// 键盘事件处理
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    emit('close')
  } else if (event.ctrlKey || event.metaKey) {
    switch (event.key) {
      case 'c':
        if (fileContent.value) {
          event.preventDefault()
          copyContent()
        }
        break
      case 's':
        event.preventDefault()
        downloadFile()
        break
      case 'e':
        event.preventDefault()
        emit('edit', currentFile.value)
        break
    }
  }
}

// 监听文件变化
watch(() => props.file, (newFile) => {
  currentFile.value = newFile
  fileContent.value = ''
  error.value = ''
  imageDataUrl.value = ''
  pdfDataUrl.value = ''
  loadFileContent()
}, { immediate: true })

// 生命周期
onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  loadFileContent()
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  
  // 清理URL对象
  if (imageDataUrl.value) {
    URL.revokeObjectURL(imageDataUrl.value)
  }
  if (pdfDataUrl.value) {
    URL.revokeObjectURL(pdfDataUrl.value)
  }
})
</script>

<style scoped>
.file-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--vscode-panel-background);
  border-bottom: 1px solid var(--vscode-panel-border);
}

.header-left {
  display: flex;
  align-items: center;
  flex: 1;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.file-icon {
  font-size: 24px;
  color: var(--vscode-descriptionForeground);
}

.file-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
}

.file-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.preview-controls {
  display: flex;
  gap: 4px;
}

.control-btn {
  padding: 6px 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--vscode-descriptionForeground);
  cursor: pointer;
  border-radius: 4px;
  font-size: 12px;
  transition: all 0.2s;
}

.control-btn:hover {
  background: var(--vscode-toolbar-hoverBackground);
  color: var(--vscode-foreground);
}

.control-btn.active {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

.close-btn {
  padding: 6px 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--vscode-descriptionForeground);
  cursor: pointer;
  border-radius: 4px;
  font-size: 12px;
}

.close-btn:hover {
  background: var(--vscode-errorForeground);
  color: white;
}

.preview-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.loading-state, .error-state, .empty-state {
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

.error-message {
  color: var(--vscode-errorForeground);
  font-size: 12px;
  max-width: 400px;
  text-align: center;
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

.btn-sm {
  padding: 4px 8px;
  font-size: 11px;
}

.btn-primary {
  background: var(--vscode-button-background);
  border-color: var(--vscode-button-border);
  color: var(--vscode-button-foreground);
}

/* 图片预览 */
.image-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 20px;
}

.image-preview img {
  max-width: 100%;
  max-height: 80%;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.image-info {
  display: flex;
  gap: 16px;
  margin-top: 12px;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

/* PDF预览 */
.pdf-preview {
  height: 100%;
  padding: 20px;
}

.pdf-frame {
  width: 100%;
  height: 100%;
  border: none;
  border-radius: 4px;
}

/* 文本预览 */
.text-preview {
  display: flex;
  height: 100%;
  overflow: hidden;
}

.text-content {
  flex: 1;
  overflow: auto;
  position: relative;
}

.text-content.word-wrap {
  white-space: pre-wrap;
  word-wrap: break-word;
}

.code-content {
  margin: 0;
  padding: 16px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  background: var(--vscode-editor-background);
  overflow: auto;
}

.code-content.with-line-numbers {
  padding-left: 60px;
}

/* 信息面板 */
.info-panel {
  width: 300px;
  background: var(--vscode-panel-background);
  border-left: 1px solid var(--vscode-panel-border);
  overflow-y: auto;
}

.info-section {
  padding: 16px;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.info-section:last-child {
  border-bottom: none;
}

.info-section h6 {
  margin: 0 0 12px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--vscode-foreground);
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.info-value {
  font-size: 12px;
  color: var(--vscode-foreground);
  font-weight: 500;
}

/* 状态栏 */
.preview-status {
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

.status-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--vscode-descriptionForeground);
  cursor: pointer;
  border-radius: 3px;
  font-size: 11px;
}

.status-btn:hover {
  background: var(--vscode-toolbar-hoverBackground);
}

.status-btn.active {
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
}

/* 代码高亮样式 */
:deep(.hljs-keyword) {
  color: var(--vscode-keyword-color, #569CD6);
}

:deep(.hljs-number) {
  color: var(--vscode-number-color, #B5CEA8);
}

:deep(.hljs-comment) {
  color: var(--vscode-comment-color, #6A9955);
}

:deep(.hljs-string) {
  color: var(--vscode-string-color, #CE9178);
}

:deep(.hljs-function) {
  color: var(--vscode-function-color, #DCDCAA);
}

:deep(.hljs-variable) {
  color: var(--vscode-variable-color, #9CDCFE);
}

:deep(.hljs-type) {
  color: var(--vscode-type-color, #4EC9B0);
}
</style>