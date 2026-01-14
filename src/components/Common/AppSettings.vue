<!--
  应用设置组件
  
  严格遵循PROJECT_REQUIREMENTS.md文档约束
  功能：管理应用全局设置
-->
<template>
  <div class="app-settings">
    <!-- 通用设置 -->
    <div class="settings-section">
      <h4>通用设置</h4>
      
      <div class="setting-item">
        <div class="setting-info">
          <label>主题</label>
          <p>选择应用界面主题</p>
        </div>
        <select v-model="settings.theme" class="setting-control">
          <option value="light">浅色</option>
          <option value="dark">深色</option>
          <option value="system">跟随系统</option>
        </select>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <label>语言</label>
          <p>选择界面语言</p>
        </div>
        <select v-model="settings.language" class="setting-control">
          <option value="zh-CN">中文（简体）</option>
          <option value="en-US">English</option>
        </select>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <label>自动保存</label>
          <p>自动保存编辑内容</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" v-model="settings.autoSave" />
          <span class="slider"></span>
        </label>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <label>自动保存间隔</label>
          <p>自动保存的间隔时间（秒）</p>
        </div>
        <input
          v-model.number="settings.autoSaveInterval"
          type="number"
          min="10"
          max="300"
          class="setting-control small"
        />
      </div>
    </div>

    <!-- 编辑器设置 -->
    <div class="settings-section">
      <h4>编辑器设置</h4>
      
      <div class="setting-item">
        <div class="setting-info">
          <label>字体大小</label>
          <p>编辑器字体大小</p>
        </div>
        <select v-model="settings.fontSize" class="setting-control">
          <option value="12">12px</option>
          <option value="13">13px</option>
          <option value="14">14px</option>
          <option value="15">15px</option>
          <option value="16">16px</option>
        </select>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <label>字体族</label>
          <p>编辑器字体</p>
        </div>
        <select v-model="settings.fontFamily" class="setting-control">
          <option value="Consolas">Consolas</option>
          <option value="Monaco">Monaco</option>
          <option value="'Courier New'">Courier New</option>
          <option value="Menlo">Menlo</option>
        </select>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <label>行号显示</label>
          <p>显示行号</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" v-model="settings.showLineNumbers" />
          <span class="slider"></span>
        </label>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <label>自动换行</label>
          <p>自动换行长行</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" v-model="settings.wordWrap" />
          <span class="slider"></span>
        </label>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <label>语法高亮</label>
          <p>启用语法高亮</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" v-model="settings.syntaxHighlight" />
          <span class="slider"></span>
        </label>
      </div>
    </div>

    <!-- 模板设置 -->
    <div class="settings-section">
      <h4>模板设置</h4>
      
      <div class="setting-item">
        <div class="setting-info">
          <label>默认模板目录</label>
          <p>模板文件的默认存储位置</p>
        </div>
        <input
          v-model="settings.templatePath"
          type="text"
          class="setting-control"
        />
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <label>自动扫描</label>
          <p>启动时自动扫描模板目录</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" v-model="settings.autoScanTemplates" />
          <span class="slider"></span>
        </label>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <label>模板缓存</label>
          <p>缓存模板文件以提高加载速度</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" v-model="settings.cacheTemplates" />
          <span class="slider"></span>
        </label>
      </div>
    </div>

    <!-- 渲染设置 -->
    <div class="settings-section">
      <h4>渲染设置</h4>
      
      <div class="setting-item">
        <div class="setting-info">
          <label>默认渲染模式</label>
          <p>模板渲染的默认模式</p>
        </div>
        <select v-model="settings.defaultRenderMode" class="setting-control">
          <option value="preview">预览模式</option>
          <option value="development">开发模式</option>
          <option value="production">生产模式</option>
        </select>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <label>输出编码</label>
          <p>渲染输出的默认编码</p>
        </div>
        <select v-model="settings.outputEncoding" class="setting-control">
          <option value="utf-8">UTF-8</option>
          <option value="gbk">GBK</option>
          <option value="ascii">ASCII</option>
        </select>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <label>错误处理</label>
          <p>渲染遇到错误时的处理方式</p>
        </div>
        <select v-model="settings.errorHandling" class="setting-control">
          <option value="strict">严格模式（停止）</option>
          <option value="lenient">宽松模式（跳过）</option>
          <option value="warning">警告模式（标记）</option>
        </select>
      </div>
    </div>

    <!-- 高级设置 -->
    <div class="settings-section">
      <h4>高级设置</h4>
      
      <div class="setting-item">
        <div class="setting-info">
          <label>调试模式</label>
          <p>启用调试功能（可能影响性能）</p>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" v-model="settings.debugMode" />
          <span class="slider"></span>
        </label>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <label>日志级别</label>
          <p>控制台日志输出级别</p>
        </div>
        <select v-model="settings.logLevel" class="setting-control">
          <option value="error">错误</option>
          <option value="warn">警告</option>
          <option value="info">信息</option>
          <option value="debug">调试</option>
        </select>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <label>清除缓存</label>
          <p>清除应用缓存数据</p>
        </div>
        <button @click="clearCache" class="btn btn-outline">
          清除缓存
        </button>
      </div>

      <div class="setting-item">
        <div class="setting-info">
          <label>重置设置</label>
          <p>将所有设置恢复到默认值</p>
        </div>
        <button @click="resetSettings" class="btn btn-danger">
          重置设置
        </button>
      </div>
    </div>

    <!-- 设置操作 -->
    <div class="settings-actions">
      <button @click="exportSettings" class="btn btn-secondary">
        <i class="fas fa-download"></i>
        导出设置
      </button>
      <button @click="importSettings" class="btn btn-secondary">
        <i class="fas fa-upload"></i>
        导入设置
      </button>
      <button @click="saveSettings" class="btn btn-primary">
        <i class="fas fa-save"></i>
        保存设置
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 定义事件
const emit = defineEmits<{
  'settings-change': [settings: any]
}>()

// 设置数据
const settings = ref({
  theme: 'dark',
  language: 'zh-CN',
  autoSave: true,
  autoSaveInterval: 30,
  fontSize: '14',
  fontFamily: 'Consolas',
  showLineNumbers: true,
  wordWrap: true,
  syntaxHighlight: true,
  templatePath: './templates',
  autoScanTemplates: true,
  cacheTemplates: true,
  defaultRenderMode: 'preview',
  outputEncoding: 'utf-8',
  errorHandling: 'warning',
  debugMode: false,
  logLevel: 'info'
})

// 加载设置
const loadSettings = () => {
  try {
    const stored = localStorage.getItem('app-settings')
    if (stored) {
      const parsedSettings = JSON.parse(stored)
      settings.value = { ...settings.value, ...parsedSettings }
    }
  } catch (error) {
    console.warn('加载设置失败:', error)
  }
}

// 保存设置
const saveSettings = () => {
  try {
    localStorage.setItem('app-settings', JSON.stringify(settings.value))
    emit('settings-change', settings.value)
    ElMessage.success('设置已保存')
  } catch (error) {
    ElMessage.error('保存设置失败')
  }
}

// 重置设置
const resetSettings = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要将所有设置恢复为默认值吗？',
      '确认重置',
      { type: 'warning' }
    )
    
    settings.value = {
      theme: 'dark',
      language: 'zh-CN',
      autoSave: true,
      autoSaveInterval: 30,
      fontSize: '14',
      fontFamily: 'Consolas',
      showLineNumbers: true,
      wordWrap: true,
      syntaxHighlight: true,
      templatePath: './templates',
      autoScanTemplates: true,
      cacheTemplates: true,
      defaultRenderMode: 'preview',
      outputEncoding: 'utf-8',
      errorHandling: 'warning',
      debugMode: false,
      logLevel: 'info'
    }
    
    saveSettings()
    ElMessage.success('设置已重置')
  } catch {
    // 用户取消
  }
}

// 清除缓存
const clearCache = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清除应用缓存吗？此操作不会删除用户数据。',
      '确认清除',
      { type: 'warning' }
    )
    
    // 清除localStorage中的缓存数据
    const cacheKeys = [
      'template-cache',
      'parameter-cache',
      'render-cache',
      'file-cache'
    ]
    
    cacheKeys.forEach(key => {
      localStorage.removeItem(key)
    })
    
    ElMessage.success('缓存已清除')
  } catch {
    // 用户取消
  }
}

// 导出设置
const exportSettings = () => {
  const dataStr = JSON.stringify(settings.value, null, 2)
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
  
  const exportFileDefaultName = `app-settings-${new Date().toISOString().slice(0, 10)}.json`
  
  const linkElement = document.createElement('a')
  linkElement.setAttribute('href', dataUri)
  linkElement.setAttribute('download', exportFileDefaultName)
  linkElement.click()
  
  ElMessage.success('设置已导出')
}

// 导入设置
const importSettings = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  
  input.onchange = async (event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    
    if (file) {
      try {
        const text = await file.text()
        const importedSettings = JSON.parse(text)
        
        await ElMessageBox.confirm(
          '确定要导入这些设置吗？这将覆盖当前设置。',
          '确认导入',
          { type: 'warning' }
        )
        
        settings.value = { ...settings.value, ...importedSettings }
        saveSettings()
        ElMessage.success('设置已导入')
      } catch (error) {
        ElMessage.error('导入失败')
      }
    }
  }
  
  input.click()
}

// 监听设置变化
watch(settings, () => {
  // 自动保存（可选）
}, { deep: true })

// 初始化
loadSettings()
</script>

<style scoped>
.app-settings {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-height: 60vh;
  overflow-y: auto;
  padding-right: 8px;
}

.settings-section {
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  overflow: hidden;
}

.settings-section h4 {
  margin: 0;
  padding: 12px 16px;
  background: var(--vscode-panel-background);
  border-bottom: 1px solid var(--vscode-panel-border);
  font-size: 14px;
  font-weight: 600;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-info {
  flex: 1;
}

.setting-info label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 4px;
}

.setting-info p {
  margin: 0;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.setting-control {
  min-width: 150px;
  padding: 6px 8px;
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  font-size: 13px;
}

.setting-control.small {
  width: 80px;
}

.toggle-switch {
  position: relative;
  width: 44px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--vscode-button-secondaryBackground);
  border-radius: 24px;
  transition: 0.3s;
}

.slider::before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: 0.3s;
}

.toggle-switch input:checked + .slider {
  background: var(--vscode-button-background);
}

.toggle-switch input:checked + .slider::before {
  transform: translateX(20px);
}

.settings-actions {
  display: flex;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid var(--vscode-panel-border);
}

.btn {
  padding: 8px 16px;
  border: 1px solid var(--vscode-button-border);
  border-radius: 4px;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn:hover {
  background: var(--vscode-button-hoverBackground);
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

.btn-outline {
  background: transparent;
  border-color: var(--vscode-button-border);
}

.btn-danger {
  background: var(--vscode-errorForeground);
  border-color: var(--vscode-errorForeground);
  color: white;
}

.btn-danger:hover {
  opacity: 0.9;
}
</style>