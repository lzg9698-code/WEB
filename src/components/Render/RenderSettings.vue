<!--
  模板渲染设置组件
  
  严格遵循PROJECT_REQUIREMENTS.md文档约束
  功能：配置模板渲染选项、输出设置和高级参数
-->
<template>
  <div class="render-settings">
    <!-- 基础设置 -->
    <div class="settings-section">
      <div class="section-header">
        <h4>基础设置</h4>
        <div class="section-actions">
          <button
            @click="resetToDefaults"
            class="btn btn-sm btn-secondary"
          >
            重置默认
          </button>
        </div>
      </div>

      <div class="form-grid">
        <!-- 渲染模式 -->
        <div class="form-group">
          <label class="form-label">渲染模式</label>
          <select v-model="settings.renderMode" class="form-control">
            <option value="preview">预览模式</option>
            <option value="development">开发模式</option>
            <option value="production">生产模式</option>
          </select>
          <div class="form-hint">
            预览模式：快速生成，适合调试
            开发模式：包含调试信息
            生产模式：优化输出，去除注释
          </div>
        </div>

        <!-- 输出编码 -->
        <div class="form-group">
          <label class="form-label">输出编码</label>
          <select v-model="settings.outputEncoding" class="form-control">
            <option value="utf-8">UTF-8</option>
            <option value="gbk">GBK</option>
            <option value="ascii">ASCII</option>
            <option value="utf-16">UTF-16</option>
          </select>
        </div>

        <!-- 行结束符 -->
        <div class="form-group">
          <label class="form-label">行结束符</label>
          <select v-model="settings.lineEnding" class="form-control">
            <option value="\n">LF (Unix/Linux)</option>
            <option value="\r\n">CRLF (Windows)</option>
            <option value="\r">CR (Mac)</option>
          </select>
        </div>

        <!-- 缩进设置 -->
        <div class="form-group">
          <label class="form-label">缩进方式</label>
          <select v-model="settings.indentType" class="form-control">
            <option value="spaces">空格</option>
            <option value="tabs">制表符</option>
          </select>
        </div>

        <!-- 缩进大小 -->
        <div class="form-group" v-if="settings.indentType === 'spaces'">
          <label class="form-label">缩进大小</label>
          <input
            v-model.number="settings.indentSize"
            type="number"
            min="1"
            max="8"
            class="form-control"
          />
        </div>
      </div>
    </div>

    <!-- 高级设置 -->
    <div class="settings-section">
      <div class="section-header">
        <h4>高级设置</h4>
        <button
          @click="toggleAdvanced"
          class="btn btn-sm"
          :class="showAdvanced ? 'btn-primary' : 'btn-outline'"
        >
          {{ showAdvanced ? '收起' : '展开' }}
        </button>
      </div>

      <div v-show="showAdvanced" class="form-grid">
        <!-- 错误处理 -->
        <div class="form-group">
          <label class="form-label">错误处理</label>
          <select v-model="settings.errorHandling" class="form-control">
            <option value="strict">严格模式（遇到错误停止）</option>
            <option value="lenient">宽松模式（跳过错误继续）</option>
            <option value="warning">警告模式（标记错误但继续）</option>
          </select>
        </div>

        <!-- 变量未定义处理 -->
        <div class="form-group">
          <label class="form-label">未定义变量</label>
          <select v-model="settings.undefinedVariable" class="form-control">
            <option value="error">报错</option>
            <option value="empty">输出空字符串</option>
            <option value="placeholder">输出占位符</option>
          </select>
        </div>

        <!-- 最大渲染时间 -->
        <div class="form-group">
          <label class="form-label">最大渲染时间（秒）</label>
          <input
            v-model.number="settings.maxRenderTime"
            type="number"
            min="1"
            max="300"
            class="form-control"
          />
          <div class="form-hint">
            防止模板无限循环或渲染时间过长
          </div>
        </div>

        <!-- 最大输出大小 -->
        <div class="form-group">
          <label class="form-label">最大输出大小（MB）</label>
          <input
            v-model.number="settings.maxOutputSize"
            type="number"
            min="1"
            max="100"
            step="0.1"
            class="form-control"
          />
        </div>

        <!-- 启用调试信息 -->
        <div class="form-group">
          <label class="flex items-center gap-2">
            <input
              v-model="settings.enableDebug"
              type="checkbox"
              class="form-checkbox"
            />
            启用调试信息
          </label>
          <div class="form-hint">
            在输出中包含调试信息和变量值
          </div>
        </div>

        <!-- 保留空白字符 -->
        <div class="form-group">
          <label class="flex items-center gap-2">
            <input
              v-model="settings.preserveWhitespace"
              type="checkbox"
              class="form-checkbox"
            />
            保留空白字符
          </label>
          <div class="form-hint">
            保持模板中的原始空白字符格式
          </div>
        </div>

        <!-- 启用安全模式 -->
        <div class="form-group">
          <label class="flex items-center gap-2">
            <input
              v-model="settings.enableSafeMode"
              type="checkbox"
              class="form-checkbox"
            />
            启用安全模式
          </label>
          <div class="form-hint">
            禁用危险的模板函数和过滤器
          </div>
        </div>
      </div>
    </div>

    <!-- 输出设置 -->
    <div class="settings-section">
      <div class="section-header">
        <h4>输出设置</h4>
      </div>

      <div class="form-grid">
        <!-- 文件名前缀 -->
        <div class="form-group">
          <label class="form-label">文件名前缀</label>
          <input
            v-model="settings.filenamePrefix"
            type="text"
            placeholder="可选的文件名前缀"
            class="form-control"
          />
        </div>

        <!-- 文件名后缀 -->
        <div class="form-group">
          <label class="form-label">文件名后缀</label>
          <input
            v-model="settings.filenameSuffix"
            type="text"
            placeholder="可选的文件名后缀"
            class="form-control"
          />
        </div>

        <!-- 添加时间戳 -->
        <div class="form-group">
          <label class="flex items-center gap-2">
            <input
              v-model="settings.addTimestamp"
              type="checkbox"
              class="form-checkbox"
            />
            添加时间戳到文件名
          </label>
        </div>

        <!-- 时间戳格式 -->
        <div class="form-group" v-if="settings.addTimestamp">
          <label class="form-label">时间戳格式</label>
          <select v-model="settings.timestampFormat" class="form-control">
            <option value="YYYYMMDD_HHMMSS">年月日_时分秒</option>
            <option value="YYYY-MM-DD_HH-MM-SS">年-月-日_时-分-秒</option>
            <option value="YYYYMMDD">年月日</option>
            <option value="HHMMSS">时分秒</option>
            <option value="unix">Unix时间戳</option>
          </select>
        </div>

        <!-- 输出目录 -->
        <div class="form-group full-width">
          <label class="form-label">输出目录</label>
          <div class="input-group">
            <input
              v-model="settings.outputDirectory"
              type="text"
              placeholder="留空使用默认目录"
              class="form-control"
            />
            <button
              @click="browseDirectory"
              class="btn btn-secondary"
            >
              浏览
            </button>
          </div>
          <div class="form-hint">
            指定渲染文件的输出目录
          </div>
        </div>
      </div>
    </div>

    <!-- 预设配置 -->
    <div class="settings-section">
      <div class="section-header">
        <h4>预设配置</h4>
        <button
          @click="showSavePresetDialog = true"
          class="btn btn-sm btn-primary"
        >
          保存当前配置
        </button>
      </div>

      <div class="presets-grid">
        <div
          v-for="preset in renderPresets"
          :key="preset.id"
          class="preset-card"
          :class="{ active: isCurrentPreset(preset) }"
          @click="applyPreset(preset)"
        >
          <div class="preset-header">
            <h5>{{ preset.name }}</h5>
            <div class="preset-actions">
              <button
                v-if="!isBuiltinPreset(preset)"
                @click.stop="deletePreset(preset.id)"
                class="btn btn-icon btn-sm"
                title="删除预设"
              >
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
          <p class="preset-description">{{ preset.description }}</p>
          <div class="preset-tags">
            <span
              v-for="tag in preset.tags"
              :key="tag"
              class="preset-tag"
            >
              {{ tag }}
            </span>
          </div>
        </div>

        <!-- 创建新预设卡片 -->
        <div
          class="preset-card create-preset"
          @click="showSavePresetDialog = true"
        >
          <div class="create-preset-content">
            <i class="fas fa-plus"></i>
            <span>创建新预设</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 保存预设对话框 -->
    <el-dialog
      v-model="showSavePresetDialog"
      title="保存渲染预设"
      width="500px"
    >
      <div class="form-group">
        <label class="form-label">预设名称</label>
        <input
          v-model="newPresetName"
          type="text"
          placeholder="输入预设名称"
          class="form-control"
        />
      </div>

      <div class="form-group">
        <label class="form-label">描述</label>
        <textarea
          v-model="newPresetDescription"
          placeholder="描述此预设的用途"
          class="form-control"
          rows="3"
        ></textarea>
      </div>

      <div class="form-group">
        <label class="form-label">标签</label>
        <input
          v-model="newPresetTags"
          type="text"
          placeholder="用逗号分隔，如：开发,调试,快速"
          class="form-control"
        />
      </div>

      <template #footer>
        <button @click="showSavePresetDialog = false" class="btn btn-secondary">
          取消
        </button>
        <button @click="savePreset" class="btn btn-primary" :disabled="!newPresetName">
          保存
        </button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 接口定义
interface RenderSettings {
  renderMode: 'preview' | 'development' | 'production'
  outputEncoding: string
  lineEnding: string
  indentType: 'spaces' | 'tabs'
  indentSize: number
  errorHandling: 'strict' | 'lenient' | 'warning'
  undefinedVariable: 'error' | 'empty' | 'placeholder'
  maxRenderTime: number
  maxOutputSize: number
  enableDebug: boolean
  preserveWhitespace: boolean
  enableSafeMode: boolean
  filenamePrefix: string
  filenameSuffix: string
  addTimestamp: boolean
  timestampFormat: string
  outputDirectory: string
}

interface RenderPreset {
  id: string
  name: string
  description: string
  tags: string[]
  settings: RenderSettings
  builtin?: boolean
}

// Props
const props = defineProps<{
  modelValue: RenderSettings
}>()

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: RenderSettings]
  'settings-change': [settings: RenderSettings]
}>()

// 响应式数据
const settings = ref<RenderSettings>({ ...props.modelValue })
const showAdvanced = ref(false)
const showSavePresetDialog = ref(false)
const newPresetName = ref('')
const newPresetDescription = ref('')
const newPresetTags = ref('')

// 内置预设
const builtinPresets: RenderPreset[] = [
  {
    id: 'development',
    name: '开发调试',
    description: '适合开发阶段的快速预览和调试',
    tags: ['开发', '调试', '快速'],
    settings: {
      renderMode: 'development',
      outputEncoding: 'utf-8',
      lineEnding: '\n',
      indentType: 'spaces',
      indentSize: 2,
      errorHandling: 'warning',
      undefinedVariable: 'placeholder',
      maxRenderTime: 10,
      maxOutputSize: 10,
      enableDebug: true,
      preserveWhitespace: true,
      enableSafeMode: false,
      filenamePrefix: 'dev_',
      filenameSuffix: '',
      addTimestamp: false,
      timestampFormat: 'YYYYMMDD_HHMMSS',
      outputDirectory: ''
    },
    builtin: true
  },
  {
    id: 'production',
    name: '生产输出',
    description: '生产环境的优化输出，去除调试信息',
    tags: ['生产', '优化', '发布'],
    settings: {
      renderMode: 'production',
      outputEncoding: 'utf-8',
      lineEnding: '\n',
      indentType: 'spaces',
      indentSize: 4,
      errorHandling: 'strict',
      undefinedVariable: 'error',
      maxRenderTime: 30,
      maxOutputSize: 50,
      enableDebug: false,
      preserveWhitespace: false,
      enableSafeMode: true,
      filenamePrefix: '',
      filenameSuffix: '',
      addTimestamp: true,
      timestampFormat: 'YYYYMMDD_HHMMSS',
      outputDirectory: './output'
    },
    builtin: true
  },
  {
    id: 'preview',
    name: '快速预览',
    description: '快速预览模式，最小化设置',
    tags: ['预览', '快速', '轻量'],
    settings: {
      renderMode: 'preview',
      outputEncoding: 'utf-8',
      lineEnding: '\n',
      indentType: 'spaces',
      indentSize: 2,
      errorHandling: 'lenient',
      undefinedVariable: 'empty',
      maxRenderTime: 5,
      maxOutputSize: 5,
      enableDebug: false,
      preserveWhitespace: false,
      enableSafeMode: true,
      filenamePrefix: 'preview_',
      filenameSuffix: '',
      addTimestamp: false,
      timestampFormat: 'YYYYMMDD_HHMMSS',
      outputDirectory: ''
    },
    builtin: true
  }
]

// 从localStorage加载用户预设
const userPresets = ref<RenderPreset[]>([])

// 计算属性
const renderPresets = computed(() => [
  ...builtinPresets,
  ...userPresets.value
])

// 方法
const loadUserPresets = () => {
  try {
    const stored = localStorage.getItem('render-presets')
    if (stored) {
      userPresets.value = JSON.parse(stored)
    }
  } catch (error) {
    console.warn('加载用户预设失败:', error)
  }
}

const saveUserPresets = () => {
  try {
    localStorage.setItem('render-presets', JSON.stringify(userPresets.value))
  } catch (error) {
    console.warn('保存用户预设失败:', error)
  }
}

const isCurrentPreset = (preset: RenderPreset): boolean => {
  return JSON.stringify(preset.settings) === JSON.stringify(settings.value)
}

const isBuiltinPreset = (preset: RenderPreset): boolean => {
  return preset.builtin === true
}

const applyPreset = (preset: RenderPreset) => {
  settings.value = { ...preset.settings }
  emit('update:modelValue', settings.value)
  emit('settings-change', settings.value)
  ElMessage.success(`已应用预设: ${preset.name}`)
}

const savePreset = () => {
  if (!newPresetName.value.trim()) {
    ElMessage.warning('请输入预设名称')
    return
  }

  const preset: RenderPreset = {
    id: `user_${Date.now()}`,
    name: newPresetName.value.trim(),
    description: newPresetDescription.value.trim(),
    tags: newPresetTags.value
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag),
    settings: { ...settings.value }
  }

  userPresets.value.push(preset)
  saveUserPresets()

  // 重置表单
  newPresetName.value = ''
  newPresetDescription.value = ''
  newPresetTags.value = ''
  showSavePresetDialog.value = false

  ElMessage.success('预设保存成功')
}

const deletePreset = async (presetId: string) => {
  try {
    await ElMessageBox.confirm('确定要删除此预设吗？', '确认删除', {
      type: 'warning'
    })

    const index = userPresets.value.findIndex(p => p.id === presetId)
    if (index > -1) {
      userPresets.value.splice(index, 1)
      saveUserPresets()
      ElMessage.success('预设已删除')
    }
  } catch {
    // 用户取消删除
  }
}

const resetToDefaults = () => {
  settings.value = {
    renderMode: 'preview',
    outputEncoding: 'utf-8',
    lineEnding: '\n',
    indentType: 'spaces',
    indentSize: 2,
    errorHandling: 'warning',
    undefinedVariable: 'placeholder',
    maxRenderTime: 10,
    maxOutputSize: 10,
    enableDebug: false,
    preserveWhitespace: false,
    enableSafeMode: true,
    filenamePrefix: '',
    filenameSuffix: '',
    addTimestamp: false,
    timestampFormat: 'YYYYMMDD_HHMMSS',
    outputDirectory: ''
  }
  emit('update:modelValue', settings.value)
  emit('settings-change', settings.value)
  ElMessage.success('已重置为默认设置')
}

const toggleAdvanced = () => {
  showAdvanced.value = !showAdvanced.value
}

const browseDirectory = async () => {
  // 注意：浏览器环境中无法直接浏览文件系统
  // 这里只是示例，实际需要根据环境调整
  ElMessage.info('请在设置中手动输入目录路径')
}

// 监听设置变化
watch(
  settings,
  (newSettings) => {
    emit('update:modelValue', newSettings)
    emit('settings-change', newSettings)
  },
  { deep: true }
)

// 监听props变化
watch(
  () => props.modelValue,
  (newValue) => {
    settings.value = { ...newValue }
  },
  { deep: true }
)

// 初始化
loadUserPresets()
</script>

<style scoped>
.render-settings {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 16px;
  background: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
}

.settings-section {
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  overflow: hidden;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--vscode-panel-background);
  border-bottom: 1px solid var(--vscode-panel-border);
}

.section-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
  padding: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group.full-width {
  grid-column: 1 / -1;
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

.form-checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--vscode-button-background);
}

.form-hint {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  line-height: 1.4;
}

.input-group {
  display: flex;
  gap: 8px;
}

.input-group .form-control {
  flex: 1;
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

.presets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  padding: 16px;
}

.preset-card {
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--vscode-editor-background);
}

.preset-card:hover {
  border-color: var(--vscode-focusBorder);
  transform: translateY(-1px);
}

.preset-card.active {
  border-color: var(--vscode-button-background);
  background: var(--vscode-list-activeSelectionBackground);
}

.preset-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.preset-header h5 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.preset-actions {
  opacity: 0;
  transition: opacity 0.2s;
}

.preset-card:hover .preset-actions {
  opacity: 1;
}

.preset-description {
  margin: 0 0 12px 0;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  line-height: 1.4;
}

.preset-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.preset-tag {
  padding: 2px 6px;
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
  border-radius: 10px;
  font-size: 10px;
  font-weight: 500;
}

.create-preset {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
  border: 2px dashed var(--vscode-panel-border);
  background: transparent;
}

.create-preset:hover {
  border-color: var(--vscode-focusBorder);
  background: var(--vscode-list-hoverBackground);
}

.create-preset-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: var(--vscode-descriptionForeground);
  font-size: 13px;
}

.create-preset-content i {
  font-size: 24px;
  opacity: 0.6;
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

:deep(.el-form-item__label) {
  color: var(--vscode-foreground);
}
</style>