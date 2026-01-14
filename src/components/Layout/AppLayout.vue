<template>
  <div id="app">
    <!-- 顶部工具栏 -->
    <div class="app-header">
      <div class="header-left">
        <h1>🔒 模板驱动的数控程序生成器</h1>
        <div class="constraint-info">
          <span class="badge constraint-active">约束机制已激活</span>
          <span class="version">v1.0.0</span>
          <span class="status" :class="{ 'status-healthy': systemHealthy }">
            {{ systemHealthy ? '✅ 系统正常' : '❌ 系统异常' }}
          </span>
        </div>
      </div>
      <div class="header-right">
        <el-button @click="refreshApp" :loading="loading">
          🔄 刷新系统
        </el-button>
        <el-button @click="showSystemInfo" type="info">
          ℹ️ 系统信息
        </el-button>
        <el-button @click="showConstraintInfo" type="warning">
          🔒 约束信息
        </el-button>
      </div>
    </div>
    
    <!-- 主布局 -->
    <div class="main-layout">
      <!-- 左侧导航 -->
      <div class="sidebar">
        <div class="nav-section">
          <h3>🛠️ 功能模块</h3>
          <div class="nav-menu">
            <div
              class="nav-item"
              :class="{ active: activeModule === 'templates' }"
              @click="switchModule('templates')"
            >
              <span class="nav-icon">📦</span>
              <span class="nav-text">模板管理</span>
              <el-badge :value="templateStore.packageCount" :max="99" class="nav-badge" />
            </div>
            
            <div
              class="nav-item"
              :class="{ active: activeModule === 'parameters' }"
              @click="switchModule('parameters')"
            >
              <span class="nav-icon">⚙️</span>
              <span class="nav-text">参数管理</span>
              <el-badge v-if="parameterStore.hasErrors" value="!" type="danger" class="nav-badge" />
            </div>
            
            <div
              class="nav-item"
              :class="{ active: activeModule === 'editor' }"
              @click="switchModule('editor')"
            >
              <span class="nav-icon">📝</span>
              <span class="nav-text">编辑器</span>
            </div>
            
            <div
              class="nav-item"
              :class="{ active: activeModule === 'render' }"
              @click="switchModule('render')"
            >
              <span class="nav-icon">🎨</span>
              <span class="nav-text">渲染引擎</span>
            </div>
            
            <div
              class="nav-item"
              :class="{ active: activeModule === 'files' }"
              @click="switchModule('files')"
            >
              <span class="nav-icon">📁</span>
              <span class="nav-text">文件管理</span>
            </div>
          </div>
        </div>
        
        <!-- 系统状态 -->
        <div class="system-status">
          <h4>📊 系统状态</h4>
          <div class="status-item">
            <span>约束机制:</span>
            <span class="status-active">🔒 激活</span>
          </div>
          <div class="status-item">
            <span>技术栈:</span>
            <span>Vue.js 3 + Flask</span>
          </div>
          <div class="status-item">
            <span>模板引擎:</span>
            <span>Jinja2</span>
          </div>
          <div class="status-item">
            <span>配置格式:</span>
            <span>YAML</span>
          </div>
        </div>
      </div>
      
      <!-- 主要内容区 -->
      <div class="content">
        <!-- 模板管理模块 -->
        <div v-if="activeModule === 'templates'" class="module-content">
          <TemplateManager />
        </div>
        
        <!-- 参数管理模块 -->
        <div v-if="activeModule === 'parameters'" class="module-content">
          <div class="module-header">
            <h2>⚙️ 参数管理</h2>
            <div class="module-actions">
              <el-button @click="resetParameters" :disabled="!templateStore.currentPackage">
                🔄 重置参数
              </el-button>
              <el-button @click="validateParameters" type="primary" :disabled="!templateStore.currentPackageName">
                🧪 验证参数
              </el-button>
              <el-button @click="calculateParameters" :disabled="!templateStore.currentPackageName">
                🧮 计算参数
              </el-button>
            </div>
          </div>
          
          <div v-if="templateStore.currentPackage" class="parameter-content">
            <!-- 参数完成度 -->
            <div class="progress-section">
              <h3>参数完成度</h3>
              <el-progress 
                :percentage="parameterStore.completionPercentage || 0"
                :status="parameterStore.isValid ? 'success' : 'exception'"
                :stroke-width="20"
              />
              <div class="progress-info">
                <span>完成度: {{ parameterStore.completionPercentage || 0 }}%</span>
                <span v-if="parameterStore.hasErrors" class="error-text">
                  ({{ parameterStore.errorCount || 0 }} 个错误)
                </span>
                <span v-if="parameterStore.hasWarnings" class="warning-text">
                  ({{ parameterStore.warningCount || 0 }} 个警告)
                </span>
              </div>
            </div>
          </div>
          
          <div v-else class="empty-state">
            <div class="empty-icon">⚙️</div>
            <h3>请先选择一个模板包</h3>
            <p>从模板管理模块中选择一个模板包来配置参数</p>
          </div>
        </div>
        
        <!-- 编辑器模块 -->
        <div v-if="activeModule === 'editor'" class="module-content">
          <div class="module-header">
            <h2>📝 编辑器</h2>
          </div>
          <div class="empty-state">
            <div class="empty-icon">📝</div>
            <h3>编辑器模块开发中...</h3>
            <p>即将支持模板文件和YAML配置文件编辑</p>
          </div>
        </div>
        
        <!-- 渲染引擎模块 -->
        <div v-if="activeModule === 'render'" class="module-content">
          <div class="module-header">
            <h2>🎨 渲染引擎</h2>
          </div>
          <div class="empty-state">
            <div class="empty-icon">🎨</div>
            <h3>渲染引擎模块开发中...</h3>
            <p>即将支持Jinja2模板渲染和实时预览</p>
          </div>
        </div>
        
        <!-- 文件管理模块 -->
        <div v-if="activeModule === 'files'" class="module-content">
          <div class="module-header">
            <h2>📁 文件管理</h2>
          </div>
          <div class="empty-state">
            <div class="empty-icon">📁</div>
            <h3>文件管理模块开发中...</h3>
            <p>即将支持文件存储、组织和备份功能</p>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 系统信息对话框 -->
    <el-dialog v-model="systemInfoVisible" title="ℹ️ 系统信息" width="600px">
      <div class="system-info-content">
        <div class="info-section">
          <h4>基本信息</h4>
          <div class="info-grid">
            <div class="info-item">
              <span>应用名称:</span>
              <span>模板驱动的数控程序生成器</span>
            </div>
            <div class="info-item">
              <span>版本:</span>
              <span>1.0.0</span>
            </div>
            <div class="info-item">
              <span>约束状态:</span>
              <span class="status-active">🔒 已激活</span>
            </div>
            <div class="info-item">
              <span>模板包数量:</span>
              <span>{{ templateStore.packageCount }}</span>
            </div>
          </div>
        </div>
        
        <div class="info-section">
          <h4>技术栈</h4>
          <div class="tech-stack">
            <el-tag>Vue.js 3</el-tag>
            <el-tag type="success">TypeScript</el-tag>
            <el-tag type="warning">Pinia</el-tag>
            <el-tag type="info">Element Plus</el-tag>
            <el-tag>Python Flask</el-tag>
            <el-tag type="danger">Jinja2</el-tag>
            <el-tag>PyYAML</el-tag>
          </div>
        </div>
      </div>
    </el-dialog>
    
    <!-- 约束信息对话框 -->
    <el-dialog v-model="constraintInfoVisible" title="🔒 约束信息" width="600px">
      <div class="constraint-info-content">
        <div class="constraint-status">
          <div class="status-item">
            <span>文档约束:</span>
            <span class="status-active">📋 PROJECT_REQUIREMENTS.md</span>
          </div>
          <div class="status-item">
            <span>约束状态:</span>
            <span class="status-active">🔒 已激活</span>
          </div>
          <div class="status-item">
            <span>强制执行:</span>
            <span class="status-active">🛡️ 是</span>
          </div>
          <div class="status-item">
            <span>违规处理:</span>
            <span class="status-active">⚠️ 自动阻止</span>
          </div>
        </div>
        
        <div class="constraint-rules">
          <h4>约束规则</h4>
          <ul>
            <li>✅ 技术栈严格遵循文档定义</li>
            <li>✅ 文件格式必须符合规范</li>
            <li>✅ 功能范围不得超出定义</li>
            <li>✅ API接口必须使用RESTful</li>
            <li>✅ 数据格式必须使用JSON</li>
            <li>✅ 任何需求变更必须先更新文档</li>
          </ul>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
/**
 * 根组件 - 严格遵循PROJECT_REQUIREMENTS.md文档约束
 */

import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useTemplateManagerStore } from '@/stores/templateManagerStore'
import { useParameterManagerStore } from '@/stores/parameterManagerStore'
import { useRenderStore } from '@/stores/renderStore'
import { useFileManagerStore } from '@/stores/fileManagerStore'
import TemplateManager from '@/components/TemplateManager/TemplateManager.vue'

// Stores
const templateStore = useTemplateManagerStore()
const parameterStore = useParameterManagerStore()
const renderStore = useRenderStore()
const fileManagerStore = useFileManagerStore()

// 响应式数据
const activeModule = ref('templates')
const systemHealthy = ref(true)
const loading = ref(false)
const systemInfoVisible = ref(false)
const constraintInfoVisible = ref(false)

// 初始化
onMounted(async () => {
  console.log('🚀 应用初始化')
  console.log('🔒 约束执行机制已激活')
  console.log('📋 严格遵循PROJECT_REQUIREMENTS.md文档约束')
  
  await initializeApp()
})

// 初始化应用
const initializeApp = async () => {
  try {
    await templateStore.loadPackages()
    systemHealthy.value = true
    console.log('✅ 应用初始化完成')
  } catch (error) {
    systemHealthy.value = false
    console.error('❌ 应用初始化失败:', error)
    ElMessage.error('应用初始化失败')
  }
}

// 切换模块
const switchModule = (module: string) => {
  activeModule.value = module
  console.log(`🔒 切换到模块: ${module}`)
}

// 重置参数
const resetParameters = () => {
  parameterStore.resetParameters()
  ElMessage.success('参数已重置')
}

// 验证参数
const validateParameters = async () => {
  if (!templateStore.currentPackageName) return
  
  try {
    await parameterStore.loadParameters(templateStore.currentPackageName)
    
    if (parameterStore.isValid) {
      ElMessage.success('参数验证通过')
    } else {
      ElMessage.warning(`参数验证失败: ${parameterStore.errorCount || 0} 个错误`)
    }
  } catch (error) {
    ElMessage.error('参数验证异常')
  }
}

// 计算参数
const calculateParameters = async () => {
  if (!templateStore.currentPackageName) return
  
  try {
    await parameterStore.calculateParameters(templateStore.currentPackageName)
    ElMessage.success('派生参数计算完成')
  } catch (error) {
    ElMessage.error('参数计算异常')
  }
}

// 刷新应用
const refreshApp = async () => {
  loading.value = true
  try {
    await templateStore.loadPackages()
    ElMessage.success('系统刷新完成')
  } catch (error) {
    ElMessage.error('系统刷新失败')
  } finally {
    loading.value = false
  }
}

// 显示系统信息
const showSystemInfo = () => {
  systemInfoVisible.value = true
}

// 显示约束信息
const showConstraintInfo = () => {
  constraintInfoVisible.value = true
}
</script>

<style scoped>
#app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  min-height: 100vh;
  background: #f5f5f5;
}

.app-header {
  background: #2c3e50;
  color: white;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.header-left h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.constraint-info {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
  font-size: 0.875rem;
}

.badge {
  background: #27ae60;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
}

.constraint-active {
  background: #e74c3c;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.7; }
  100% { opacity: 1; }
}

.version {
  background: #3498db;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.status {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.status-healthy {
  background: #27ae60;
}

.main-layout {
  display: flex;
  height: calc(100vh - 80px);
}

.sidebar {
  width: 280px;
  background: white;
  border-right: 1px solid #ddd;
  overflow-y: auto;
}

.nav-section {
  padding: 1.5rem 1rem;
  border-bottom: 1px solid #eee;
}

.nav-section h3 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.nav-menu {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.nav-item:hover {
  background: #f8f9fa;
}

.nav-item.active {
  background: #3498db;
  color: white;
}

.nav-icon {
  font-size: 1.25rem;
  margin-right: 0.75rem;
  width: 1.5rem;
  text-align: center;
}

.nav-text {
  flex: 1;
  font-weight: 500;
}

.nav-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
}

.system-status {
  padding: 1.5rem 1rem;
}

.system-status h4 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
}

.status-item span:first-child {
  color: #666;
}

.status-active {
  color: #e74c3c;
  font-weight: 500;
}

.content {
  flex: 1;
  overflow-y: auto;
  background: #f8f9fa;
}

.module-content {
  padding: 2rem;
  min-height: 100%;
}

.module-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.module-header h2 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.5rem;
}

.module-actions {
  display: flex;
  gap: 0.75rem;
}

.parameter-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.progress-section {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
}

.progress-section h3 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
}

.progress-info {
  display: flex;
  gap: 1rem;
  margin-top: 0.75rem;
  font-size: 0.875rem;
}

.error-text {
  color: #e74c3c;
}

.warning-text {
  color: #f39c12;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  color: #666;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.system-info-content,
.constraint-info-content {
  padding: 1rem 0;
}

.info-section {
  margin-bottom: 2rem;
}

.info-section h4 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #eee;
}

.info-item span:first-child {
  color: #666;
  font-weight: 500;
}

.tech-stack {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.constraint-status {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 2rem;
}

.constraint-rules h4 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
}

.constraint-rules ul {
  margin: 0;
  padding-left: 1.5rem;
}

.constraint-rules li {
  margin-bottom: 0.5rem;
  color: #666;
}
</style>
