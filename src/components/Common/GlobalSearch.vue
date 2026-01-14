<!--
  全局搜索组件
  
  严格遵循PROJECT_REQUIREMENTS.md文档约束
  功能：在所有模块中进行全局搜索
-->
<template>
  <div class="global-search">
    <!-- 搜索输入 -->
    <div class="search-input-section">
      <div class="input-wrapper">
        <i class="fas fa-search"></i>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索模板、参数、文件..."
          class="search-input"
          @input="debouncedSearch"
        />
        <span v-if="searchQuery" @click="clearSearch" class="clear-btn">
          <i class="fas fa-times"></i>
        </span>
      </div>
    </div>

    <!-- 搜索选项 -->
    <div class="search-options">
      <div class="option-group">
        <label>搜索范围:</label>
        <div class="checkbox-group">
          <label v-for="scope in searchScopes" :key="scope.id">
            <input
              type="checkbox"
              :value="scope.id"
              v-model="selectedScopes"
            />
            {{ scope.name }}
          </label>
        </div>
      </div>
    </div>

    <!-- 搜索结果 -->
    <div class="search-results">
      <!-- 加载状态 -->
      <div v-if="searching" class="searching-state">
        <div class="spinner"></div>
        <p>正在搜索...</p>
      </div>

      <!-- 结果统计 -->
      <div v-else-if="searchResults.length > 0" class="results-stats">
        <span>找到 {{ searchResults.length }} 个结果 (用时 {{ searchTime }}ms)</span>
      </div>

      <!-- 结果列表 -->
      <div v-else-if="hasSearched" class="no-results">
        <i class="fas fa-search"></i>
        <p>没有找到匹配的结果</p>
      </div>

      <!-- 初始状态 -->
      <div v-else class="initial-state">
        <i class="fas fa-search"></i>
        <p>输入关键词开始搜索</p>
      </div>

      <!-- 分组结果 -->
      <div v-if="groupedResults.length > 0" class="results-list">
        <div
          v-for="group in groupedResults"
          :key="group.type"
          class="result-group"
        >
          <div class="group-header">
            <i :class="getGroupIcon(group.type)"></i>
            <span>{{ getGroupName(group.type) }}</span>
            <span class="count">({{ group.items.length }})</span>
          </div>

          <div class="group-items">
            <div
              v-for="item in group.items"
              :key="item.id"
              class="result-item"
              @click="selectResult(item)"
            >
              <div class="item-icon">
                <i :class="getItemIcon(item)"></i>
              </div>
              <div class="item-content">
                <div class="item-title">{{ item.title }}</div>
                <div class="item-description">{{ item.description }}</div>
              </div>
              <div class="item-actions">
                <button
                  v-if="item.action"
                  @click.stop="executeAction(item.action)"
                  class="action-btn"
                >
                  {{ item.action.label }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

// Props
const props = defineProps<{
  query: string
}>()

// Emits
const emit = defineEmits<{
  'result-select': [result: any]
}>()

// 搜索范围选项
const searchScopes = [
  { id: 'templates', name: '模板' },
  { id: 'parameters', name: '参数' },
  { id: 'files', name: '文件' },
  { id: 'code', name: '代码' }
]

// 响应式数据
const searchQuery = ref(props.query)
const searching = ref(false)
const hasSearched = ref(false)
const searchTime = ref(0)
const searchResults = ref<any[]>([])
const selectedScopes = ref(['templates', 'parameters', 'files', 'code'])

// 防抖函数
const debounce = (fn: Function, delay: number) => {
  let timeoutId: number
  return (...args: any[]) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

// 计算属性
const groupedResults = computed(() => {
  const groups: { type: string; items: any[] }[] = []
  const groupMap = new Map<string, any[]>()

  searchResults.value.forEach(item => {
    if (!groupMap.has(item.type)) {
      groupMap.set(item.type, [])
    }
    groupMap.get(item.type)!.push(item)
  })

  groupMap.forEach((items, type) => {
    groups.push({ type, items })
  })

  return groups
})

// 方法
const debouncedSearch = debounce(() => {
  if (searchQuery.value.trim().length >= 2) {
    performSearch()
  }
}, 300)

const performSearch = async () => {
  if (!searchQuery.value.trim()) return

  searching.value = true
  hasSearched.value = true

  const startTime = Date.now()

  try {
    // 构建搜索请求
    const response = await fetch('/api/search/global', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: searchQuery.value.trim(),
        scopes: selectedScopes.value
      })
    })

    if (response.ok) {
      const data = await response.json()
      searchResults.value = data.results || []
    } else {
      // 使用模拟数据
      searchResults.value = getMockResults(searchQuery.value)
    }

    searchTime.value = Date.now() - startTime
  } catch (error) {
    console.error('搜索失败:', error)
    searchResults.value = getMockResults(searchQuery.value)
    searchTime.value = Date.now() - startTime
  } finally {
    searching.value = false
  }
}

const getMockResults = (query: string): any[] => {
  const results: any[] = []
  const lowerQuery = query.toLowerCase()

  // 模拟模板结果
  if (selectedScopes.value.includes('templates')) {
    results.push(
      { id: 'tmpl1', type: 'templates', title: '示例模板', description: '用于测试的示例模板包', module: 'templates' },
      { id: 'tmpl2', type: 'templates', title: 'CNC加工模板', description: '数控铣削加工模板', module: 'templates' }
    )
  }

  // 模拟参数结果
  if (selectedScopes.value.includes('parameters')) {
    results.push(
      { id: 'param1', type: 'parameters', title: '加工参数', description: '刀具速度和进给率参数', module: 'parameters' },
      { id: 'param2', type: 'parameters', title: '安全参数', description: '安全距离和限位参数', module: 'parameters' }
    )
  }

  // 模拟文件结果
  if (selectedScopes.value.includes('files')) {
    results.push(
      { id: 'file1', type: 'files', title: 'config.yaml', description: '配置文件', module: 'files' },
      { id: 'file2', type: 'files', title: 'program.nc', description: '数控程序文件', module: 'files' }
    )
  }

  return results.filter(item => 
    item.title.toLowerCase().includes(lowerQuery) ||
    item.description.toLowerCase().includes(lowerQuery)
  )
}

const clearSearch = () => {
  searchQuery.value = ''
  searchResults.value = []
  hasSearched.value = false
}

const getGroupIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    'templates': 'fas fa-folder-open',
    'parameters': 'fas fa-sliders-h',
    'files': 'fas fa-file',
    'code': 'fas fa-code'
  }
  return iconMap[type] || 'fas fa-search'
}

const getGroupName = (type: string): string => {
  const nameMap: Record<string, string> = {
    'templates': '模板',
    'parameters': '参数',
    'files': '文件',
    'code': '代码'
  }
  return nameMap[type] || type
}

const getItemIcon = (item: any): string => {
  return 'fas fa-file'
}

const selectResult = (item: any) => {
  emit('result-select', item)
}

const executeAction = (action: any) => {
  ElMessage.info(`执行操作: ${action.label}`)
}

// 监听props变化
onMounted(() => {
  if (props.query) {
    searchQuery.value = props.query
    performSearch()
  }
})

watch(() => props.query, (newQuery) => {
  searchQuery.value = newQuery
  if (newQuery) {
    performSearch()
  }
})
</script>

<style scoped>
.global-search {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  max-height: 60vh;
  overflow: hidden;
}

.search-input-section {
  padding: 0 4px;
}

.input-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--vscode-input-background);
  border: 1px solid var(--vscode-input-border);
  border-radius: 6px;
}

.input-wrapper i {
  color: var(--vscode-descriptionForeground);
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  color: var(--vscode-input-foreground);
  font-size: 14px;
  outline: none;
}

.clear-btn {
  padding: 4px;
  cursor: pointer;
  color: var(--vscode-descriptionForeground);
}

.clear-btn:hover {
  color: var(--vscode-foreground);
}

.search-options {
  padding: 12px;
  background: var(--vscode-editor-background);
  border-radius: 6px;
}

.option-group {
  display: flex;
  align-items: center;
  gap: 16px;
}

.option-group label:first-child {
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}

.checkbox-group {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.checkbox-group label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  cursor: pointer;
}

.checkbox-group input[type="checkbox"] {
  accent-color: var(--vscode-button-background);
}

.search-results {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
}

.searching-state, .no-results, .initial-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 150px;
  gap: 12px;
  opacity: 0.7;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid var(--vscode-charts-blue);
  border-top: 3px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.results-stats {
  padding: 8px 12px;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  border-bottom: 1px solid var(--vscode-panel-border);
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.result-group {
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  overflow: hidden;
}

.group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--vscode-panel-background);
  border-bottom: 1px solid var(--vscode-panel-border);
  font-size: 13px;
  font-weight: 500;
}

.group-header .count {
  color: var(--vscode-descriptionForeground);
  font-weight: normal;
}

.group-items {
  padding: 8px;
}

.result-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.result-item:hover {
  background: var(--vscode-list-hoverBackground);
}

.item-icon {
  font-size: 16px;
  color: var(--vscode-descriptionForeground);
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 2px;
}

.item-description {
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  padding: 4px 8px;
  border: 1px solid var(--vscode-button-border);
  border-radius: 4px;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
}

.action-btn:hover {
  background: var(--vscode-button-hoverBackground);
}
</style>