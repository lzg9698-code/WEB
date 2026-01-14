<!--
  模板渲染预览组件
  
  严格遵循PROJECT_REQUIREMENTS.md文档约束
  功能：显示模板渲染结果，支持多文件预览和代码高亮
-->
<template>
  <div class="render-preview">
    <!-- 预览头部 -->
    <div class="preview-header">
      <div class="header-left">
        <h3>渲染预览</h3>
        <div class="template-info" v-if="renderResult">
          <span class="template-name">{{ renderResult.template_name }}</span>
          <span class="render-time">
            {{ formatTime(renderResult.render_time) }}
          </span>
        </div>
      </div>
      
      <div class="header-right">
        <button
          @click="copyAllContent"
          :disabled="!renderResult || !renderResult.files.length"
          class="btn btn-secondary btn-sm"
        >
          <i class="fas fa-copy"></i>
          复制全部
        </button>
        
        <button
          @click="downloadAll"
          :disabled="!renderResult || !renderResult.files.length"
          class="btn btn-primary btn-sm"
        >
          <i class="fas fa-download"></i>
          下载全部
        </button>
      </div>
    </div>

    <!-- 文件标签页 -->
    <div class="file-tabs" v-if="renderResult && renderResult.files.length">
      <div
        v-for="(file, index) in renderResult.files"
        :key="file.filename"
        class="tab-item"
        :class="{ active: activeTabIndex === index }"
        @click="setActiveTab(index)"
      >
        <i class="fas fa-file-code"></i>
        {{ file.filename }}
        <span
          v-if="file.errors && file.errors.length"
          class="error-badge"
          :title="`${file.errors.length} 个错误`"
        >
          {{ file.errors.length }}
        </span>
      </div>
    </div>

    <!-- 预览内容区 -->
    <div class="preview-content" v-if="renderResult">
      <!-- 无文件提示 -->
      <div v-if="!renderResult.files.length" class="empty-state">
        <i class="fas fa-file-alt"></i>
        <p>没有生成的文件</p>
        <span class="hint">
          {{ renderResult.errors?.length ? '渲染过程中出现错误' : '检查模板配置和参数设置' }}
        </span>
      </div>

      <!-- 文件内容显示 -->
      <div
        v-else-if="activeFile"
        class="file-content"
      >
        <!-- 文件信息栏 -->
        <div class="file-info">
          <div class="file-meta">
            <span class="filename">{{ activeFile.filename }}</span>
            <span class="filesize">({{ formatFileSize(activeFile.content.length) }})</span>
            <span v-if="activeFile.encoding" class="encoding">{{ activeFile.encoding }}</span>
          </div>
          
          <div class="file-actions">
            <button
              @click="copyFileContent(activeFile)"
              class="btn btn-icon"
              title="复制内容"
            >
              <i class="fas fa-copy"></i>
            </button>
            
            <button
              @click="downloadFile(activeFile)"
              class="btn btn-icon"
              title="下载文件"
            >
              <i class="fas fa-download"></i>
            </button>
            
            <button
              @click="toggleLineNumbers"
              class="btn btn-icon"
              :class="{ active: showLineNumbers }"
              title="显示行号"
            >
              <i class="fas fa-list-ol"></i>
            </button>
          </div>
        </div>

        <!-- 错误信息 -->
        <div v-if="activeFile.errors && activeFile.errors.length" class="file-errors">
          <div class="error-header">
            <i class="fas fa-exclamation-triangle"></i>
            渲染错误 ({{ activeFile.errors.length }})
          </div>
          <ul class="error-list">
            <li v-for="error in activeFile.errors" :key="error" class="error-item">
              {{ error }}
            </li>
          </ul>
        </div>

        <!-- 代码内容 -->
        <div class="code-container">
          <pre
            class="code-content"
            :class="{
              'with-line-numbers': showLineNumbers,
              'has-errors': activeFile.errors && activeFile.errors.length
            }"
          ><code
            v-html="highlightCode(activeFile.content, getFileType(activeFile.filename))"
          ></code></pre>
        </div>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-else-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>正在渲染模板...</p>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <i class="fas fa-eye"></i>
      <p>暂无预览内容</p>
      <span class="hint">选择模板和参数后点击渲染按钮</span>
    </div>

    <!-- 渲染日志 -->
    <div v-if="renderResult && renderResult.logs" class="render-logs">
      <div class="logs-header" @click="toggleLogs">
        <i class="fas fa-terminal" :class="{ expanded: showLogs }"></i>
        渲染日志
        <span v-if="renderResult.logs.length" class="log-count">
          ({{ renderResult.logs.length }})
        </span>
      </div>
      
      <div v-show="showLogs" class="logs-content">
        <div
          v-for="log in renderResult.logs"
          :key="log.timestamp"
          class="log-entry"
          :class="log.level.toLowerCase()"
        >
          <span class="log-time">{{ formatLogTime(log.timestamp) }}</span>
          <span class="log-level">{{ log.level }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import hljs from 'highlight.js'
import 'highlight.js/styles/vs.css'

// Props
interface RenderResult {
  template_name: string
  render_time: string
  files: Array<{
    filename: string
    content: string
    encoding?: string
    errors?: string[]
  }>
  errors?: string[]
  logs?: Array<{
    timestamp: string
    level: string
    message: string
  }>
}

const props = defineProps<{
  renderResult?: RenderResult | null
  loading?: boolean
}>()

// Emits
const emit = defineEmits<{
  copyContent: [content: string]
  downloadFile: [file: { filename: string; content: string }]
}>()

// 响应式数据
const activeTabIndex = ref(0)
const showLineNumbers = ref(true)
const showLogs = ref(false)
const codeHighlightCache = new Map<string, string>()

// 计算属性
const activeFile = computed(() => {
  if (!props.renderResult || !props.renderResult.files.length) return null
  return props.renderResult.files[activeTabIndex.value]
})

// 方法
const setActiveTab = (index: number) => {
  activeTabIndex.value = index
}

const formatTime = (time: string) => {
  return new Date(time).toLocaleString('zh-CN')
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const formatLogTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString('zh-CN')
}

const getFileType = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase()
  const typeMap: Record<string, string> = {
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
    'txt': 'text',
    'nc': 'gcode', // 数控程序
    'gcode': 'gcode',
    'cnc': 'gcode'
  }
  return typeMap[ext || ''] || 'text'
}

const highlightCode = (code: string, language: string): string => {
  // 使用缓存提高性能
  const cacheKey = `${code.substring(0, 100)}_${language}`
  if (codeHighlightCache.has(cacheKey)) {
    return codeHighlightCache.get(cacheKey)!
  }

  try {
    if (language === 'gcode') {
      // G代码特殊高亮处理
      const highlighted = code
        .replace(/([G|M|T|S|F]\d+)/g, '<span class="hljs-keyword">$1</span>')
        .replace(/([X|Y|Z|I|J|K|R]-?\d+\.?\d*)/g, '<span class="hljs-number">$1</span>')
        .replace(/(;.*)$/gm, '<span class="hljs-comment">$1</span>')
      codeHighlightCache.set(cacheKey, highlighted)
      return highlighted
    }

    const result = hljs.highlight(code, { language }).value
    codeHighlightCache.set(cacheKey, result)
    return result
  } catch (error) {
    console.warn('代码高亮失败:', error)
    return code
  }
}

const copyFileContent = async (file: { filename: string; content: string }) => {
  try {
    await navigator.clipboard.writeText(file.content)
    ElMessage.success(`已复制 ${file.filename} 的内容`)
    emit('copyContent', file.content)
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

const copyAllContent = async () => {
  if (!props.renderResult) return

  const allContent = props.renderResult.files
    .map(file => `// ${file.filename}\n${file.content}`)
    .join('\n\n')

  try {
    await navigator.clipboard.writeText(allContent)
    ElMessage.success('已复制所有文件内容')
    emit('copyContent', allContent)
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

const downloadFile = (file: { filename: string; content: string }) => {
  const blob = new Blob([file.content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = file.filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  emit('downloadFile', file)
}

const downloadAll = async () => {
  if (!props.renderResult) return

  for (const file of props.renderResult.files) {
    downloadFile(file)
    // 添加小延迟避免浏览器阻止多个下载
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

const toggleLineNumbers = () => {
  showLineNumbers.value = !showLineNumbers.value
}

const toggleLogs = () => {
  showLogs.value = !showLogs.value
}

// 键盘快捷键
const handleKeydown = (event: KeyboardEvent) => {
  if (event.ctrlKey || event.metaKey) {
    switch (event.key) {
      case 'c':
        if (activeFile.value) {
          event.preventDefault()
          copyFileContent(activeFile.value)
        }
        break
      case 's':
        if (activeFile.value) {
          event.preventDefault()
          downloadFile(activeFile.value)
        }
        break
    }
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.render-preview {
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
  border-bottom: 1px solid var(--vscode-panel-border);
  background: var(--vscode-panel-background);
}

.header-left h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.template-info {
  display: flex;
  gap: 12px;
  margin-top: 4px;
  font-size: 12px;
  opacity: 0.8;
}

.template-name {
  font-weight: 500;
}

.header-right {
  display: flex;
  gap: 8px;
}

.file-tabs {
  display: flex;
  background: var(--vscode-editorGroupHeader-tabsBackground);
  border-bottom: 1px solid var(--vscode-panel-border);
  overflow-x: auto;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  cursor: pointer;
  border-right: 1px solid var(--vscode-panel-border);
  font-size: 13px;
  white-space: nowrap;
  transition: background-color 0.2s;
}

.tab-item:hover {
  background: var(--vscode-editorGroupHeader-tabsBackground);
}

.tab-item.active {
  background: var(--vscode-editor-background);
  border-bottom: 2px solid var(--vscode-tabs-activeForeground);
}

.error-badge {
  background: var(--vscode-errorForeground);
  color: white;
  border-radius: 10px;
  padding: 2px 6px;
  font-size: 10px;
  font-weight: bold;
  min-width: 16px;
  text-align: center;
}

.preview-content {
  flex: 1;
  overflow: hidden;
}

.empty-state, .loading-state {
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

.file-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.file-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: var(--vscode-editor-lineHighlightBackground);
  border-bottom: 1px solid var(--vscode-panel-border);
}

.file-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.filename {
  font-weight: 500;
}

.filesize, .encoding {
  opacity: 0.7;
  font-size: 12px;
}

.file-actions {
  display: flex;
  gap: 4px;
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

.btn-icon {
  padding: 4px;
  background: transparent;
  border: 1px solid transparent;
}

.btn-icon:hover {
  background: var(--vscode-toolbar-hoverBackground);
}

.btn-icon.active {
  background: var(--vscode-button-background);
}

.btn-sm {
  padding: 4px 8px;
  font-size: 11px;
}

.file-errors {
  background: var(--vscode-inputValidation-errorBackground);
  border-bottom: 1px solid var(--vscode-inputValidation-errorBorder);
}

.error-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  font-weight: 500;
  color: var(--vscode-errorForeground);
}

.error-list {
  margin: 0;
  padding: 0 16px 8px;
}

.error-item {
  color: var(--vscode-errorForeground);
  font-size: 12px;
  margin-bottom: 4px;
}

.code-container {
  flex: 1;
  overflow: auto;
  position: relative;
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

.code-content.has-errors {
  border-left: 4px solid var(--vscode-errorForeground);
}

.render-logs {
  border-top: 1px solid var(--vscode-panel-border);
}

.logs-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  cursor: pointer;
  background: var(--vscode-panel-background);
  font-size: 13px;
  font-weight: 500;
}

.logs-header i {
  transition: transform 0.2s;
}

.logs-header i.expanded {
  transform: rotate(90deg);
}

.log-count {
  opacity: 0.7;
  font-size: 12px;
}

.logs-content {
  max-height: 200px;
  overflow-y: auto;
  background: var(--vscode-terminal-background);
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
}

.log-entry {
  display: flex;
  gap: 12px;
  padding: 4px 16px;
  border-bottom: 1px solid var(--vscode-terminal-border);
}

.log-time {
  color: var(--vscode-descriptionForeground);
  min-width: 80px;
}

.log-level {
  min-width: 50px;
  font-weight: 500;
}

.log-entry.error .log-level {
  color: var(--vscode-errorForeground);
}

.log-entry.warning .log-level {
  color: var(--vscode-warningForeground);
}

.log-entry.info .log-level {
  color: var(--vscode-infoForeground);
}

.log-message {
  flex: 1;
  color: var(--vscode-terminal-foreground);
}

/* G代码特殊样式 */
:deep(.hljs-keyword) {
  color: var(--vscode-keyword-color, #569CD6);
}

:deep(.hljs-number) {
  color: var(--vscode-number-color, #B5CEA8);
}

:deep(.hljs-comment) {
  color: var(--vscode-comment-color, #6A9955);
}
</style>