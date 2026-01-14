<!--
  文件搜索组件
  
  严格遵循PROJECT_REQUIREMENTS.md文档约束
  功能：搜索文件内容，支持全文搜索、正则表达式和高级过滤
-->
<template>
  <div class="file-search">
    <!-- 搜索控制面板 -->
    <div class="search-panel">
      <div class="search-header">
        <h4>文件搜索</h4>
        <div class="search-actions">
          <button
            @click="clearResults"
            :disabled="!searchResults.length"
            class="btn btn-sm btn-outline"
          >
            清空结果
          </button>
        </div>
      </div>

      <!-- 搜索输入 -->
      <div class="search-input-group">
        <div class="input-wrapper">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="输入搜索内容..."
            class="search-input"
            @keydown.enter="startSearch"
          />
          <button
            @click="startSearch"
            :disabled="!searchQuery.trim() || searching"
            class="search-btn"
          >
            <i class="fas fa-search" v-if="!searching"></i>
            <i class="fas fa-spinner fa-spin" v-else></i>
          </button>
        </div>
      </div>

      <!-- 高级搜索选项 -->
      <div class="advanced-options">
        <div class="options-header" @click="showAdvanced = !showAdvanced">
          <i class="fas fa-cog" :class="{ expanded: showAdvanced }"></i>
          <span>高级选项</span>
        </div>

        <div v-show="showAdvanced" class="options-content">
          <div class="option-row">
            <label class="option-label">搜索范围</label>
            <select v-model="searchScope" class="option-control">
              <option value="current">当前文件夹</option>
              <option value="subfolders">包含子文件夹</option>
              <option value="project">整个项目</option>
              <option value="custom">自定义路径</option>
            </select>
          </div>

          <div class="option-row" v-if="searchScope === 'custom'">
            <label class="option-label">自定义路径</label>
            <input
              v-model="customPath"
              type="text"
              placeholder="输入搜索路径"
              class="option-control"
            />
          </div>

          <div class="option-row">
            <label class="option-label">文件类型</label>
            <select v-model="fileType" class="option-control">
              <option value="all">所有文件</option>
              <option value="text">文本文件</option>
              <option value="code">代码文件</option>
              <option value="config">配置文件</option>
              <option value="custom">自定义扩展名</option>
            </select>
          </div>

          <div class="option-row" v-if="fileType === 'custom'">
            <label class="option-label">文件扩展名</label>
            <input
              v-model="customExtensions"
              type="text"
              placeholder="用逗号分隔，如: .js,.py,.txt"
              class="option-control"
            />
          </div>

          <div class="option-row">
            <label class="option-label">搜索模式</label>
            <select v-model="searchMode" class="option-control">
              <option value="plain">普通文本</option>
              <option value="regex">正则表达式</option>
              <option value="case-sensitive">区分大小写</option>
              <option value="whole-word">全词匹配</option>
            </select>
          </div>

          <div class="option-row">
            <label class="flex items-center gap-2">
              <input
                v-model="includeContent"
                type="checkbox"
                class="option-checkbox"
              />
              搜索文件内容
            </label>
          </div>

          <div class="option-row">
            <label class="flex items-center gap-2">
              <input
                v-model="excludeHidden"
                type="checkbox"
                class="option-checkbox"
              />
              排除隐藏文件
            </label>
          </div>

          <div class="option-row">
            <label class="flex items-center gap-2">
              <input
                v-model="excludeBinary"
                type="checkbox"
                class="option-checkbox"
              />
              排除二进制文件
            </label>
          </div>

          <div class="option-row">
            <label class="option-label">最大结果数</label>
            <input
              v-model.number="maxResults"
              type="number"
              min="10"
              max="1000"
              class="option-control"
            />
          </div>
        </div>
      </div>

      <!-- 搜索历史 -->
      <div class="search-history">
        <div class="history-header">
          <span>搜索历史</span>
          <button
            @click="clearHistory"
            class="btn btn-xs btn-outline"
          >
            清空
          </button>
        </div>
        <div class="history-list">
          <button
            v-for="(query, index) in searchHistory"
            :key="index"
            @click="useHistoryQuery(query)"
            class="history-item"
          >
            {{ query }}
          </button>
        </div>
      </div>
    </div>

    <!-- 搜索结果 -->
    <div class="search-results">
      <div class="results-header">
        <h5>搜索结果</h5>
        <div class="results-info">
          <span v-if="searchResults.length">
            找到 {{ searchResults.length }} 个结果
            <span v-if="searchTime">(用时 {{ searchTime }}ms)</span>
          </span>
          <span v-else-if="searched">
            没有找到匹配的结果
          </span>
        </div>
      </div>

      <div class="results-list" ref="resultsListRef">
        <!-- 搜索中状态 -->
        <div v-if="searching" class="searching-state">
          <div class="spinner"></div>
          <p>正在搜索...</p>
          <span class="searching-path">{{ currentSearchPath }}</span>
        </div>

        <!-- 结果列表 -->
        <div v-else-if="searchResults.length" class="result-items">
          <div
            v-for="result in searchResults"
            :key="result.id"
            class="result-item"
            @click="openResult(result)"
          >
            <div class="result-header">
              <div class="result-icon">
                <i :class="getFileIcon(result.file)"></i>
              </div>
              
              <div class="result-info">
                <div class="result-file">{{ result.file.name }}</div>
                <div class="result-path">{{ result.file.path }}</div>
              </div>

              <div class="result-meta">
                <span class="result-line">第 {{ result.lineNumber }} 行</span>
                <span class="result-matches">{{ result.matches.length }} 处匹配</span>
              </div>
            </div>

            <!-- 匹配内容预览 -->
            <div class="result-content">
              <div
                v-for="(match, index) in result.matches.slice(0, 3)"
                :key="index"
                class="match-line"
              >
                <span class="line-number">{{ match.lineNumber }}:</span>
                <span class="line-content" v-html="highlightMatch(match.content, match.match)"></span>
              </div>
              
              <div v-if="result.matches.length > 3" class="more-matches">
                还有 {{ result.matches.length - 3 }} 处匹配...
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-else-if="searched" class="empty-results">
          <i class="fas fa-search"></i>
          <p>没有找到匹配的结果</p>
          <span class="hint">
            尝试调整搜索条件或使用不同的关键词
          </span>
        </div>

        <!-- 初始状态 -->
        <div v-else class="initial-state">
          <i class="fas fa-search"></i>
          <p>输入关键词开始搜索</p>
          <span class="hint">
            支持文件名和文件内容搜索
          </span>
        </div>
      </div>
    </div>

    <!-- 搜索统计 -->
    <div v-if="searchStats" class="search-stats">
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-label">搜索文件</span>
          <span class="stat-value">{{ searchStats.filesSearched }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">匹配文件</span>
          <span class="stat-value">{{ searchStats.matchedFiles }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">总匹配数</span>
          <span class="stat-value">{{ searchStats.totalMatches }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">搜索时间</span>
          <span class="stat-value">{{ searchStats.duration }}ms</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'

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

interface SearchResult {
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

interface SearchStats {
  filesSearched: number
  matchedFiles: number
  totalMatches: number
  duration: number
}

// Props
const props = defineProps<{
  initialPath?: string
}>()

// Emits
const emit = defineEmits<{
  fileFound: [file: FileItem]
  fileOpen: [file: FileItem, line?: number]
}>()

// 响应式数据
const searchQuery = ref('')
const searching = ref(false)
const searched = ref(false)
const searchResults = ref<SearchResult[]>([])
const searchTime = ref(0)
const searchStats = ref<SearchStats | null>(null)
const currentSearchPath = ref('')

// 高级选项
const showAdvanced = ref(false)
const searchScope = ref('current')
const customPath = ref('')
const fileType = ref('all')
const customExtensions = ref('')
const searchMode = ref('plain')
const includeContent = ref(true)
const excludeHidden = ref(true)
const excludeBinary = ref(true)
const maxResults = ref(100)

// 搜索历史
const searchHistory = ref<string[]>([])

// 组件引用
const resultsListRef = ref<HTMLElement>()

// 计算属性
const hasResults = computed(() => searchResults.value.length > 0)

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

const startSearch = async () => {
  if (!searchQuery.value.trim()) return

  searching.value = true
  searched.value = false
  searchResults.value = []
  searchStats.value = null

  const startTime = Date.now()

  try {
    // 构建搜索请求
    const searchRequest = {
      query: searchQuery.value.trim(),
      scope: searchScope.value,
      path: searchScope.value === 'custom' ? customPath.value : props.initialPath || '/',
      fileType: fileType.value,
      extensions: fileType.value === 'custom' ? customExtensions.value.split(',').map(ext => ext.trim()) : undefined,
      mode: searchMode.value,
      includeContent: includeContent.value,
      excludeHidden: excludeHidden.value,
      excludeBinary: excludeBinary.value,
      maxResults: maxResults.value
    }

    currentSearchPath.value = searchRequest.path

    const response = await fetch('/api/files/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(searchRequest)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    searchResults.value = data.results || []
    searchStats.value = data.stats
    searchTime.value = Date.now() - startTime

    // 添加到搜索历史
    addToHistory(searchQuery.value.trim())

    // 滚动到第一个结果
    if (searchResults.value.length > 0) {
      await nextTick()
      scrollToFirstResult()
    }

    ElMessage.success(`找到 ${searchResults.value.length} 个结果`)

  } catch (error) {
    console.error('搜索失败:', error)
    ElMessage.error('搜索失败，请重试')
  } finally {
    searching.value = false
    searched.value = true
  }
}

const clearResults = () => {
  searchResults.value = []
  searchStats.value = null
  searched.value = false
  searchTime.value = 0
}

const openResult = (result: SearchResult) => {
  emit('fileOpen', result.file, result.matches[0]?.lineNumber)
}

const highlightMatch = (content: string, match: string): string => {
  if (!match) return escapeHtml(content)

  const escapedMatch = match.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${escapedMatch})`, 'gi')
  
  return content.replace(regex, '<mark>$1</mark>')
}

const escapeHtml = (text: string): string => {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

const scrollToFirstResult = () => {
  if (resultsListRef.value) {
    const firstResult = resultsListRef.value.querySelector('.result-item')
    if (firstResult) {
      firstResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }
}

const addToHistory = (query: string) => {
  // 移除已存在的相同查询
  searchHistory.value = searchHistory.value.filter(item => item !== query)
  
  // 添加到开头
  searchHistory.value.unshift(query)
  
  // 限制历史记录数量
  if (searchHistory.value.length > 20) {
    searchHistory.value = searchHistory.value.slice(0, 20)
  }
  
  saveHistory()
}

const useHistoryQuery = (query: string) => {
  searchQuery.value = query
  startSearch()
}

const clearHistory = () => {
  searchHistory.value = []
  saveHistory()
}

const saveHistory = () => {
  try {
    localStorage.setItem('search-history', JSON.stringify(searchHistory.value))
  } catch (error) {
    console.warn('保存搜索历史失败:', error)
  }
}

const loadHistory = () => {
  try {
    const stored = localStorage.getItem('search-history')
    if (stored) {
      searchHistory.value = JSON.parse(stored)
    }
  } catch (error) {
    console.warn('加载搜索历史失败:', error)
  }
}

// 键盘快捷键
const handleKeydown = (event: KeyboardEvent) => {
  if (event.ctrlKey || event.metaKey) {
    switch (event.key) {
      case 'f':
        event.preventDefault()
        // 聚焦到搜索输入框
        const searchInput = document.querySelector('.search-input') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        }
        break
    }
  }

  if (event.key === 'Escape') {
    clearResults()
  }
}

// 生命周期
onMounted(() => {
  loadHistory()
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.file-search {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
}

.search-panel {
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 16px;
}

.search-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--vscode-panel-background);
  border-bottom: 1px solid var(--vscode-panel-border);
}

.search-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.search-actions {
  display: flex;
  gap: 4px;
}

.search-input-group {
  padding: 16px;
  background: var(--vscode-editor-background);
}

.input-wrapper {
  display: flex;
  gap: 8px;
}

.search-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  border-color: var(--vscode-focusBorder);
  box-shadow: 0 0 0 1px var(--vscode-focusBorder);
}

.search-btn {
  padding: 8px 16px;
  border: 1px solid var(--vscode-button-border);
  border-radius: 4px;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.search-btn:hover {
  background: var(--vscode-button-hoverBackground);
}

.search-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.advanced-options {
  border-top: 1px solid var(--vscode-panel-border);
}

.options-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  cursor: pointer;
  background: var(--vscode-panel-background);
  font-size: 13px;
  font-weight: 500;
}

.options-header i {
  transition: transform 0.2s;
}

.options-header i.expanded {
  transform: rotate(90deg);
}

.options-content {
  padding: 16px;
  background: var(--vscode-editor-background);
  border-top: 1px solid var(--vscode-panel-border);
}

.option-row {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  gap: 12px;
}

.option-row:last-child {
  margin-bottom: 0;
}

.option-label {
  min-width: 120px;
  font-size: 13px;
  font-weight: 500;
}

.option-control {
  flex: 1;
  padding: 4px 8px;
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  font-size: 13px;
}

.option-checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--vscode-button-background);
}

.search-history {
  border-top: 1px solid var(--vscode-panel-border);
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: var(--vscode-panel-background);
  font-size: 12px;
  font-weight: 500;
}

.history-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px 16px;
  background: var(--vscode-editor-background);
}

.history-item {
  padding: 4px 8px;
  border: 1px solid var(--vscode-button-border);
  border-radius: 12px;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
}

.history-item:hover {
  background: var(--vscode-button-hoverBackground);
}

.btn {
  padding: 4px 8px;
  border: 1px solid var(--vscode-button-border);
  border-radius: 4px;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
}

.btn:hover {
  background: var(--vscode-button-hoverBackground);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-xs {
  padding: 2px 6px;
  font-size: 10px;
}

.btn-outline {
  background: transparent;
  border-color: var(--vscode-button-border);
}

/* 搜索结果 */
.search-results {
  flex: 1;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  overflow: hidden;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--vscode-panel-background);
  border-bottom: 1px solid var(--vscode-panel-border);
}

.results-header h5 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}

.results-info {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.results-list {
  flex: 1;
  overflow-y: auto;
}

.searching-state, .empty-results, .initial-state {
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

.searching-path {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.result-items {
  display: flex;
  flex-direction: column;
}

.result-item {
  padding: 12px 16px;
  border-bottom: 1px solid var(--vscode-panel-border);
  cursor: pointer;
  transition: background-color 0.2s;
}

.result-item:hover {
  background: var(--vscode-list-hoverBackground);
}

.result-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.result-icon {
  font-size: 16px;
  color: var(--vscode-descriptionForeground);
}

.result-info {
  flex: 1;
}

.result-file {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 2px;
}

.result-path {
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
}

.result-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
}

.result-content {
  background: var(--vscode-textCodeBlock-background);
  border-radius: 4px;
  padding: 8px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
}

.match-line {
  display: flex;
  margin-bottom: 4px;
}

.match-line:last-child {
  margin-bottom: 0;
}

.line-number {
  color: var(--vscode-descriptionForeground);
  margin-right: 8px;
  min-width: 40px;
  text-align: right;
}

.line-content {
  flex: 1;
  white-space: pre-wrap;
  word-break: break-all;
}

.more-matches {
  color: var(--vscode-descriptionForeground);
  font-style: italic;
  margin-top: 4px;
}

/* 搜索统计 */
.search-stats {
  padding: 12px 16px;
  background: var(--vscode-panel-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  margin-top: 16px;
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

/* 高亮样式 */
:deep(mark) {
  background: var(--vscode-editor-findMatchHighlightBackground);
  color: var(--vscode-editor-foreground);
  padding: 1px 2px;
  border-radius: 2px;
}
</style>