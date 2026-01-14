<!--
  文件操作管理器组件
  
  严格遵循PROJECT_REQUIREMENTS.md文档约束
  功能：管理文件的各种操作，包括复制、移动、重命名、删除等
-->
<template>
  <div class="file-operation-manager">
    <!-- 操作面板 -->
    <div class="operation-panel">
      <div class="panel-header">
        <h4>文件操作</h4>
        <div class="panel-actions">
          <button
            @click="clearOperations"
            :disabled="!operations.length"
            class="btn btn-sm btn-outline"
          >
            清空历史
          </button>
        </div>
      </div>

      <!-- 当前操作状态 -->
      <div v-if="currentOperation" class="current-operation">
        <div class="operation-header">
          <div class="operation-icon">
            <i :class="getOperationIcon(currentOperation.type)"></i>
          </div>
          <div class="operation-info">
            <div class="operation-title">{{ getOperationTitle(currentOperation.type) }}</div>
            <div class="operation-description">{{ currentOperation.description }}</div>
          </div>
          <div class="operation-status">
            <span class="status-badge" :class="currentOperation.status">
              {{ getStatusText(currentOperation.status) }}
            </span>
          </div>
        </div>

        <!-- 进度条 -->
        <div v-if="currentOperation.showProgress" class="operation-progress">
          <div class="progress-info">
            <span>{{ currentOperation.progress }}%</span>
            <span v-if="currentOperation.currentItem">
              {{ currentOperation.currentItem }}
            </span>
          </div>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: currentOperation.progress + '%' }"
            ></div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="operation-controls">
          <button
            v-if="currentOperation.status === 'running'"
            @click="pauseOperation"
            class="btn btn-sm btn-warning"
          >
            <i class="fas fa-pause"></i>
            暂停
          </button>

          <button
            v-if="currentOperation.status === 'paused'"
            @click="resumeOperation"
            class="btn btn-sm btn-primary"
          >
            <i class="fas fa-play"></i>
            继续
          </button>

          <button
            v-if="['running', 'paused'].includes(currentOperation.status)"
            @click="cancelOperation"
            class="btn btn-sm btn-danger"
          >
            <i class="fas fa-stop"></i>
            取消
          </button>

          <button
            v-if="currentOperation.status === 'completed'"
            @click="viewOperationResult"
            class="btn btn-sm btn-primary"
          >
            <i class="fas fa-eye"></i>
            查看结果
          </button>
        </div>
      </div>

      <!-- 操作历史 -->
      <div class="operation-history">
        <div class="history-header">
          <h5>操作历史</h5>
          <div class="history-filters">
            <select v-model="historyFilter" class="filter-select">
              <option value="all">所有操作</option>
              <option value="copy">复制</option>
              <option value="move">移动</option>
              <option value="rename">重命名</option>
              <option value="delete">删除</option>
              <option value="create">创建</option>
            </select>
          </div>
        </div>

        <div class="history-list">
          <div
            v-for="operation in filteredHistory"
            :key="operation.id"
            class="history-item"
            :class="operation.status"
            @click="selectOperation(operation)"
          >
            <div class="item-left">
              <div class="item-icon">
                <i :class="getOperationIcon(operation.type)"></i>
              </div>
              <div class="item-info">
                <div class="item-title">{{ getOperationTitle(operation.type) }}</div>
                <div class="item-description">{{ operation.description }}</div>
                <div class="item-time">{{ formatTime(operation.startTime) }}</div>
              </div>
            </div>

            <div class="item-right">
              <div class="item-status">
                <span class="status-badge" :class="operation.status">
                  {{ getStatusText(operation.status) }}
                </span>
              </div>

              <div class="item-actions">
                <button
                  v-if="operation.status === 'completed'"
                  @click.stop="viewOperationResult"
                  class="action-btn"
                  title="查看结果"
                >
                  <i class="fas fa-eye"></i>
                </button>

                <button
                  v-if="operation.status === 'failed'"
                  @click.stop="retryOperation"
                  class="action-btn"
                  title="重试"
                >
                  <i class="fas fa-redo"></i>
                </button>

                <button
                  @click.stop="removeOperation(operation.id)"
                  class="action-btn danger"
                  title="移除"
                >
                  <i class="fas fa-times"></i>
                </button>
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="!filteredHistory.length" class="empty-history">
            <i class="fas fa-history"></i>
            <p>暂无操作历史</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 批量操作面板 -->
    <div class="batch-operations">
      <div class="batch-header">
        <h5>批量操作</h5>
        <button
          @click="showBatchDialog = true"
          class="btn btn-sm btn-primary"
        >
          <i class="fas fa-plus"></i>
          新建批量操作
        </button>
      </div>

      <div class="batch-list">
        <div
          v-for="batch in batchOperations"
          :key="batch.id"
          class="batch-item"
          :class="{ active: selectedBatch === batch.id }"
          @click="selectBatch(batch.id)"
        >
          <div class="batch-info">
            <div class="batch-name">{{ batch.name }}</div>
            <div class="batch-description">{{ batch.description }}</div>
            <div class="batch-stats">
              <span>{{ batch.files.length }} 个文件</span>
              <span>{{ batch.completedFiles }} / {{ batch.files.length }} 已完成</span>
            </div>
          </div>

          <div class="batch-progress">
            <div class="progress-bar">
              <div
                class="progress-fill"
                :style="{ width: (batch.completedFiles / batch.files.length * 100) + '%' }"
              ></div>
            </div>
          </div>

          <div class="batch-actions">
            <button
              @click.stop="executeBatch(batch.id)"
              :disabled="batch.status === 'running'"
              class="action-btn"
              title="执行"
            >
              <i class="fas fa-play"></i>
            </button>

            <button
              @click.stop="editBatch(batch.id)"
              class="action-btn"
              title="编辑"
            >
              <i class="fas fa-edit"></i>
            </button>

            <button
              @click.stop="deleteBatch(batch.id)"
              class="action-btn danger"
              title="删除"
            >
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="!batchOperations.length" class="empty-batch">
          <i class="fas fa-layer-group"></i>
          <p>暂无批量操作</p>
        </div>
      </div>
    </div>

    <!-- 批量操作对话框 -->
    <el-dialog
      v-model="showBatchDialog"
      title="创建批量操作"
      width="600px"
    >
      <div class="form-group">
        <label class="form-label">操作名称</label>
        <input
          v-model="batchForm.name"
          type="text"
          placeholder="输入操作名称"
          class="form-control"
        />
      </div>

      <div class="form-group">
        <label class="form-label">操作类型</label>
        <select v-model="batchForm.type" class="form-control">
          <option value="copy">复制</option>
          <option value="move">移动</option>
          <option value="delete">删除</option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">目标路径</label>
        <input
          v-model="batchForm.targetPath"
          type="text"
          placeholder="输入目标路径"
          class="form-control"
        />
      </div>

      <div class="form-group">
        <label class="form-label">描述</label>
        <textarea
          v-model="batchForm.description"
          placeholder="操作描述"
          class="form-control"
          rows="3"
        ></textarea>
      </div>

      <div class="form-group">
        <label class="form-label">选择文件</label>
        <div class="file-selector">
          <div class="selected-files">
            <div
              v-for="file in batchForm.files"
              :key="file.path"
              class="selected-file"
            >
              <i :class="getFileIcon(file)"></i>
              <span>{{ file.name }}</span>
              <button
                @click="removeFileFromBatch(file.path)"
                class="remove-btn"
              >
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
          <button
            @click="showFileSelector = true"
            class="btn btn-outline btn-sm"
          >
            <i class="fas fa-folder-open"></i>
            选择文件
          </button>
        </div>
      </div>

      <template #footer>
        <button @click="showBatchDialog = false" class="btn btn-secondary">
          取消
        </button>
        <button
          @click="createBatchOperation"
          class="btn btn-primary"
          :disabled="!batchForm.name || !batchForm.files.length"
        >
          创建
        </button>
      </template>
    </el-dialog>

    <!-- 文件选择器对话框 -->
    <el-dialog
      v-model="showFileSelector"
      title="选择文件"
      width="500px"
    >
      <FileBrowser
        :initial-path="'/'"
        @file-select="onFileSelect"
        @close="showFileSelector = false"
      />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import FileBrowser from './FileBrowser.vue'

// 接口定义
interface FileOperation {
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

interface BatchOperation {
  id: string
  name: string
  type: 'copy' | 'move' | 'delete'
  description: string
  targetPath?: string
  files: Array<{
    path: string
    name: string
    status: 'pending' | 'completed' | 'failed'
  }>
  status: 'pending' | 'running' | 'completed' | 'failed'
  completedFiles: number
  startTime?: string
  endTime?: string
}

// 响应式数据
const operations = ref<FileOperation[]>([])
const currentOperation = ref<FileOperation | null>(null)
const historyFilter = ref('all')
const batchOperations = ref<BatchOperation[]>([])
const selectedBatch = ref<string | null>(null)

// 批量操作表单
const showBatchDialog = ref(false)
const showFileSelector = ref(false)
const batchForm = ref({
  name: '',
  type: 'copy' as 'copy' | 'move' | 'delete',
  targetPath: '',
  description: '',
  files: Array<{ path: string; name: string }>()
})

// 计算属性
const filteredHistory = computed(() => {
  if (historyFilter.value === 'all') {
    return operations.value
  }
  return operations.value.filter(op => op.type === historyFilter.value)
})

// 方法
const getOperationIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    'copy': 'fas fa-copy',
    'move': 'fas fa-arrows-alt',
    'rename': 'fas fa-pen',
    'delete': 'fas fa-trash',
    'create': 'fas fa-plus'
  }
  return iconMap[type] || 'fas fa-cog'
}

const getOperationTitle = (type: string): string => {
  const titleMap: Record<string, string> = {
    'copy': '复制文件',
    'move': '移动文件',
    'rename': '重命名文件',
    'delete': '删除文件',
    'create': '创建文件'
  }
  return titleMap[type] || '文件操作'
}

const getStatusText = (status: string): string => {
  const statusMap: Record<string, string> = {
    'pending': '等待中',
    'running': '执行中',
    'paused': '已暂停',
    'completed': '已完成',
    'failed': '失败',
    'cancelled': '已取消'
  }
  return statusMap[status] || status
}

const formatTime = (time: string): string => {
  return new Date(time).toLocaleString('zh-CN')
}

const getFileIcon = (file: { name: string; extension?: string }): string => {
  const ext = file.extension || file.name.split('.').pop()?.toLowerCase()
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
    'py': 'fas fa-file-code',
    'html': 'fas fa-file-code',
    'css': 'fas fa-file-code',
    'pdf': 'fas fa-file-pdf',
    'png': 'fas fa-file-image',
    'jpg': 'fas fa-file-image',
    'jpeg': 'fas fa-file-image',
    'gif': 'fas fa-file-image'
  }
  return iconMap[ext || ''] || 'fas fa-file'
}

const createOperation = (
  type: FileOperation['type'],
  description: string,
  files: string[],
  options?: Partial<FileOperation>
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

  operations.value.unshift(operation)
  return operation
}

const executeOperation = async (operation: FileOperation) => {
  operation.status = 'running'
  currentOperation.value = operation

  try {
    switch (operation.type) {
      case 'copy':
        await executeCopyOperation(operation)
        break
      case 'move':
        await executeMoveOperation(operation)
        break
      case 'rename':
        await executeRenameOperation(operation)
        break
      case 'delete':
        await executeDeleteOperation(operation)
        break
      case 'create':
        await executeCreateOperation(operation)
        break
    }

    operation.status = 'completed'
    operation.endTime = new Date().toISOString()
    operation.progress = 100

    ElMessage.success(`${getOperationTitle(operation.type)}完成`)
  } catch (error) {
    operation.status = 'failed'
    operation.endTime = new Date().toISOString()
    operation.error = error instanceof Error ? error.message : '操作失败'

    ElMessage.error(`${getOperationTitle(operation.type)}失败`)
  } finally {
    currentOperation.value = null
  }
}

const executeCopyOperation = async (operation: FileOperation) => {
  for (let i = 0; i < operation.files.length; i++) {
    const filePath = operation.files[i]
    operation.currentItem = filePath
    operation.progress = Math.round((i / operation.files.length) * 100)

    const response = await fetch('/api/files/copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourcePath: filePath,
        targetPath: operation.targetPath
      })
    })

    if (!response.ok) {
      throw new Error(`复制 ${filePath} 失败`)
    }

    // 添加延迟以显示进度
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

const executeMoveOperation = async (operation: FileOperation) => {
  for (let i = 0; i < operation.files.length; i++) {
    const filePath = operation.files[i]
    operation.currentItem = filePath
    operation.progress = Math.round((i / operation.files.length) * 100)

    const response = await fetch('/api/files/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourcePath: filePath,
        targetPath: operation.targetPath
      })
    })

    if (!response.ok) {
      throw new Error(`移动 ${filePath} 失败`)
    }

    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

const executeRenameOperation = async (operation: FileOperation) => {
  const response = await fetch('/api/files/rename', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      oldPath: operation.sourcePath,
      newPath: operation.targetPath
    })
  })

  if (!response.ok) {
    throw new Error('重命名失败')
  }
}

const executeDeleteOperation = async (operation: FileOperation) => {
  for (let i = 0; i < operation.files.length; i++) {
    const filePath = operation.files[i]
    operation.currentItem = filePath
    operation.progress = Math.round((i / operation.files.length) * 100)

    const response = await fetch('/api/files/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath })
    })

    if (!response.ok) {
      throw new Error(`删除 ${filePath} 失败`)
    }

    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

const executeCreateOperation = async (operation: FileOperation) => {
  for (let i = 0; i < operation.files.length; i++) {
    const filePath = operation.files[i]
    operation.currentItem = filePath
    operation.progress = Math.round((i / operation.files.length) * 100)

    const response = await fetch('/api/files/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: filePath,
        type: 'file'
      })
    })

    if (!response.ok) {
      throw new Error(`创建 ${filePath} 失败`)
    }

    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

const pauseOperation = () => {
  if (currentOperation.value) {
    currentOperation.value.status = 'paused'
  }
}

const resumeOperation = () => {
  if (currentOperation.value) {
    currentOperation.value.status = 'running'
  }
}

const cancelOperation = async () => {
  if (!currentOperation.value) return

  try {
    await ElMessageBox.confirm('确定要取消当前操作吗？', '确认取消', {
      type: 'warning'
    })

    currentOperation.value.status = 'cancelled'
    currentOperation.value.endTime = new Date().toISOString()
    currentOperation.value = null

    ElMessage.info('操作已取消')
  } catch {
    // 用户取消
  }
}

const viewOperationResult = (operation?: FileOperation) => {
  const op = operation || currentOperation.value
  if (op) {
    ElMessage.info(`查看 ${getOperationTitle(op.type)} 结果`)
  }
}

const retryOperation = (operation: FileOperation) => {
  // 重置操作状态
  operation.status = 'pending'
  operation.progress = 0
  operation.error = undefined
  operation.endTime = undefined

  // 重新执行
  executeOperation(operation)
}

const selectOperation = (operation: FileOperation) => {
  currentOperation.value = operation
}

const removeOperation = (id: string) => {
  const index = operations.value.findIndex(op => op.id === id)
  if (index > -1) {
    operations.value.splice(index, 1)
    if (currentOperation.value?.id === id) {
      currentOperation.value = null
    }
  }
}

const clearOperations = async () => {
  try {
    await ElMessageBox.confirm('确定要清空所有操作历史吗？', '确认清空', {
      type: 'warning'
    })

    operations.value = []
    currentOperation.value = null
    ElMessage.success('操作历史已清空')
  } catch {
    // 用户取消
  }
}

// 批量操作方法
const createBatchOperation = () => {
  if (!batchForm.value.name || !batchForm.value.files.length) {
    ElMessage.warning('请填写操作名称并选择文件')
    return
  }

  const batch: BatchOperation = {
    id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: batchForm.value.name,
    type: batchForm.value.type,
    description: batchForm.value.description,
    targetPath: batchForm.value.targetPath,
    files: batchForm.value.files.map(file => ({
      ...file,
      status: 'pending'
    })),
    status: 'pending',
    completedFiles: 0
  }

  batchOperations.value.push(batch)
  
  // 重置表单
  batchForm.value = {
    name: '',
    type: 'copy',
    targetPath: '',
    description: '',
    files: []
  }
  showBatchDialog.value = false

  ElMessage.success('批量操作已创建')
}

const executeBatch = async (batchId: string) => {
  const batch = batchOperations.value.find(b => b.id === batchId)
  if (!batch) return

  batch.status = 'running'
  batch.startTime = new Date().toISOString()

  try {
    for (let i = 0; i < batch.files.length; i++) {
      const file = batch.files[i]
      
      // 执行单个文件操作
      const operation = createOperation(
        batch.type,
        `批量${getOperationTitle(batch.type)}: ${file.name}`,
        [file.path],
        {
          targetPath: batch.targetPath
        }
      )

      await executeOperation(operation)

      // 更新文件状态
      file.status = operation.status === 'completed' ? 'completed' : 'failed'
      batch.completedFiles++
    }

    batch.status = 'completed'
    batch.endTime = new Date().toISOString()

    ElMessage.success(`批量操作 "${batch.name}" 完成`)
  } catch (error) {
    batch.status = 'failed'
    batch.endTime = new Date().toISOString()
    ElMessage.error(`批量操作 "${batch.name}" 失败`)
  }
}

const selectBatch = (batchId: string) => {
  selectedBatch.value = batchId
}

const editBatch = (batchId: string) => {
  const batch = batchOperations.value.find(b => b.id === batchId)
  if (batch) {
    // 填充表单
    batchForm.value = {
      name: batch.name,
      type: batch.type,
      targetPath: batch.targetPath || '',
      description: batch.description,
      files: batch.files.map(f => ({
        path: f.path,
        name: f.name
      }))
    }
    showBatchDialog.value = true
  }
}

const deleteBatch = async (batchId: string) => {
  try {
    await ElMessageBox.confirm('确定要删除此批量操作吗？', '确认删除', {
      type: 'warning'
    })

    const index = batchOperations.value.findIndex(b => b.id === batchId)
    if (index > -1) {
      batchOperations.value.splice(index, 1)
    }

    ElMessage.success('批量操作已删除')
  } catch {
    // 用户取消
  }
}

const onFileSelect = (files: Array<{ path: string; name: string }>) => {
  batchForm.value.files = files
  showFileSelector.value = false
}

const removeFileFromBatch = (filePath: string) => {
  const index = batchForm.value.files.findIndex(f => f.path === filePath)
  if (index > -1) {
    batchForm.value.files.splice(index, 1)
  }
}

// 初始化
onMounted(() => {
  // 加载操作历史
  loadOperationHistory()
})

const loadOperationHistory = () => {
  try {
    const stored = localStorage.getItem('file-operations')
    if (stored) {
      operations.value = JSON.parse(stored)
    }
  } catch (error) {
    console.warn('加载操作历史失败:', error)
  }
}

const saveOperationHistory = () => {
  try {
    localStorage.setItem('file-operations', JSON.stringify(operations.value))
  } catch (error) {
    console.warn('保存操作历史失败:', error)
  }
}

// 监听操作变化
watch(operations, saveOperationHistory, { deep: true })
</script>

<style scoped>
.file-operation-manager {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  background: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
}

.operation-panel, .batch-operations {
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  overflow: hidden;
}

.panel-header, .batch-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--vscode-panel-background);
  border-bottom: 1px solid var(--vscode-panel-border);
}

.panel-header h4, .batch-header h5 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.current-operation {
  padding: 16px;
  background: var(--vscode-editor-background);
  border-bottom: 1px solid var(--vscode-panel-border);
}

.operation-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.operation-icon {
  font-size: 24px;
  color: var(--vscode-descriptionForeground);
}

.operation-info {
  flex: 1;
}

.operation-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
}

.operation-description {
  font-size: 13px;
  color: var(--vscode-descriptionForeground);
}

.operation-status {
  display: flex;
  align-items: center;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
}

.status-badge.pending {
  background: var(--vscode-charts-gray);
  color: white;
}

.status-badge.running {
  background: var(--vscode-charts-blue);
  color: white;
}

.status-badge.paused {
  background: var(--vscode-charts-orange);
  color: white;
}

.status-badge.completed {
  background: var(--vscode-charts-green);
  color: white;
}

.status-badge.failed {
  background: var(--vscode-charts-red);
  color: white;
}

.status-badge.cancelled {
  background: var(--vscode-charts-gray);
  color: white;
}

.operation-progress {
  margin-bottom: 12px;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.progress-bar {
  height: 4px;
  background: var(--vscode-progressBar-background);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--vscode-progressBar-foreground);
  transition: width 0.3s ease;
}

.operation-controls {
  display: flex;
  gap: 8px;
}

.operation-history {
  flex: 1;
  overflow: hidden;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--vscode-panel-background);
  border-bottom: 1px solid var(--vscode-panel-border);
}

.history-header h5 {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}

.filter-select {
  padding: 4px 8px;
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  font-size: 12px;
}

.history-list {
  max-height: 300px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--vscode-panel-border);
  cursor: pointer;
  transition: background-color 0.2s;
}

.history-item:hover {
  background: var(--vscode-list-hoverBackground);
}

.history-item.completed {
  border-left: 3px solid var(--vscode-testing-iconPassed);
}

.history-item.failed {
  border-left: 3px solid var(--vscode-errorForeground);
}

.item-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.item-icon {
  font-size: 16px;
  color: var(--vscode-descriptionForeground);
}

.item-info {
  flex: 1;
}

.item-title {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 2px;
}

.item-description {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  margin-bottom: 2px;
}

.item-time {
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
}

.item-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.history-item:hover .item-actions {
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
}

.action-btn:hover {
  background: var(--vscode-toolbar-hoverBackground);
  color: var(--vscode-foreground);
}

.action-btn.danger:hover {
  background: var(--vscode-errorForeground);
  color: white;
}

.empty-history, .empty-batch {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100px;
  gap: 8px;
  opacity: 0.7;
}

.batch-list {
  max-height: 200px;
  overflow-y: auto;
}

.batch-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--vscode-panel-border);
  cursor: pointer;
  transition: background-color 0.2s;
}

.batch-item:hover {
  background: var(--vscode-list-hoverBackground);
}

.batch-item.active {
  background: var(--vscode-list-activeSelectionBackground);
}

.batch-info {
  flex: 1;
}

.batch-name {
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 2px;
}

.batch-description {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  margin-bottom: 4px;
}

.batch-stats {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
}

.batch-progress {
  width: 60px;
  margin: 0 12px;
}

.batch-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.batch-item:hover .batch-actions {
  opacity: 1;
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

.btn-warning {
  background: var(--vscode-charts-orange);
  border-color: var(--vscode-charts-orange);
  color: white;
}

.btn-danger {
  background: var(--vscode-charts-red);
  border-color: var(--vscode-charts-red);
  color: white;
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

.file-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.selected-files {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 100px;
  overflow-y: auto;
  padding: 8px;
  background: var(--vscode-textCodeBlock-background);
  border-radius: 4px;
}

.selected-file {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: var(--vscode-button-background);
  border-radius: 12px;
  font-size: 11px;
}

.remove-btn {
  padding: 2px;
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