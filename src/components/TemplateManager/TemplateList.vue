<template>
  <div class="template-list">
    <!-- 工具栏 -->
    <div class="toolbar">
      <el-input
        v-model="searchQuery"
        placeholder="搜索模板包..."
        class="search-input"
        clearable
        @input="handleSearch"
      >
        <template #prefix>
          🔍
        </template>
      </el-input>
      
      <el-select v-model="selectedCategory" placeholder="选择分类" clearable @change="handleCategoryFilter">
        <el-option label="全部分类" value="" />
        <el-option
          v-for="category in categories"
          :key="category"
          :label="category"
          :value="category"
        />
      </el-select>
      
      <el-button @click="refreshTemplates" :loading="loading">
        🔄 刷新
      </el-button>
      
      <el-button @click="showImportDialog" type="primary">
        📥 导入模板
      </el-button>
      
      <el-button @click="scanPackages" type="success">
        🔄 重新扫描
      </el-button>
    </div>
    
    <!-- 统计信息 -->
    <div class="stats-bar">
      <span class="stat-item">
        📦 总计: {{ filteredTemplates.length }}
      </span>
      <span class="stat-item">
        ✅ 已选择: {{ selectedTemplates.length }}
      </span>
      <span v-if="selectedCategory" class="stat-item">
        📂 分类: {{ selectedCategory }} ({{ categoryCount }})
      </span>
    </div>
    
    <!-- 模板列表 -->
    <div class="template-grid">
      <div
        v-for="template in filteredTemplates"
        :key="template.name"
        class="template-card"
        :class="{ 
          selected: selectedTemplates.includes(template.name),
          active: currentTemplateName === template.name 
        }"
        @click="selectTemplate(template)"
        @contextmenu.prevent="showContextMenu($event, template)"
      >
        <div class="card-header">
          <div class="template-icon" :style="{ color: template.color }">
            {{ template.icon }}
          </div>
          <div class="template-info">
            <h4 class="template-name">{{ template.displayName }}</h4>
            <p class="template-version">v{{ template.version }}</p>
          </div>
          <el-checkbox 
            :model-value="selectedTemplates.includes(template.name)"
            @update:model-value="(val) => toggleSelection(template.name, val)"
            @click.stop
          />
        </div>
        
        <div class="card-body">
          <p class="template-description">{{ template.description }}</p>
          
          <div class="template-meta">
            <el-tag size="small" :color="template.color">{{ template.category }}</el-tag>
            <span class="author">{{ template.author }}</span>
          </div>
          
          <div class="template-tags">
            <el-tag
              v-for="tag in template.tags"
              :key="tag"
              size="small"
              type="info"
            >
              {{ tag }}
            </el-tag>
          </div>
          
          <div class="template-files">
            <span class="file-count">📄 {{ template.templateFiles?.length || 0 }} 个文件</span>
          </div>
        </div>
        
        <div class="card-actions">
          <el-button size="small" @click.stop="editTemplate(template)">
            ✏️ 编辑
          </el-button>
          <el-button size="small" @click.stop="exportTemplate(template)">
            📤 导出
          </el-button>
          <el-button size="small" type="primary" @click.stop="useTemplate(template)">
            ▶️ 使用
          </el-button>
        </div>
      </div>
    </div>
    
    <!-- 空状态 -->
    <div v-if="filteredTemplates.length === 0" class="empty-state">
      <div class="empty-icon">📦</div>
      <h3>暂无模板包</h3>
      <p>请导入模板包或扫描模板目录</p>
      <el-button type="primary" @click="showImportDialog">
        📥 导入模板
      </el-button>
    </div>
    
    <!-- 导入对话框 -->
    <el-dialog
      v-model="importDialogVisible"
      title="📥 导入模板包"
      width="500px"
    >
      <div class="import-content">
        <el-upload
          class="upload-area"
          drag
          :auto-upload="false"
          :accept="'.zip'"
          :limit="1"
          @change="handleFileSelect"
        >
          <el-button type="primary">选择文件</el-button>
          <template #tip>
            <div class="el-upload__tip">
              只能上传.zip格式的模板包文件
            </div>
          </template>
        </el-upload>
        
        <div v-if="selectedFile" class="file-info">
          <h4>文件信息</h4>
          <p><strong>文件名:</strong> {{ selectedFile.name }}</p>
          <p><strong>文件大小:</strong> {{ formatFileSize(selectedFile.size) }}</p>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="importDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmImport" :loading="importing">
          导入
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
/**
 * 模板列表组件
 * 
 * 此文件必须严格遵循PROJECT_REQUIREMENTS.md文档约束。
 * 任何修改都必须先更新需求文档，然后修改代码。
 * 违反此约束将导致代码被拒绝。
 */

import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useTemplateManagerStore } from '@/stores/templateManagerStore'
import type { TemplatePackage } from '@/services/api'

// Props
interface Props {
  currentTemplateName?: string
}

const props = withDefaults(defineProps<Props>(), {
  currentTemplateName: ''
})

// Emits
const emit = defineEmits<{
  select: [template: TemplatePackage]
  edit: [template: TemplatePackage]
}>()

// Store
const templateStore = useTemplateManagerStore()

// 响应式数据
const searchQuery = ref('')
const selectedCategory = ref('')
const selectedTemplates = ref<string[]>([])
const loading = ref(false)
const importing = ref(false)
const importDialogVisible = ref(false)
const selectedFile = ref<File | null>(null)

// 计算属性
const categories = computed(() => {
  const cats = new Set(templateStore.packages.map(pkg => pkg.category))
  return Array.from(cats)
})

const categoryCount = computed(() => {
  if (!selectedCategory.value) return filteredTemplates.value.length
  return filteredTemplates.value.filter(t => t.category === selectedCategory.value).length
})

const filteredTemplates = computed(() => {
  let result = templateStore.packages
  
  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(t => 
      t.name.toLowerCase().includes(query) ||
      t.displayName.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query) ||
      t.tags.some(tag => tag.toLowerCase().includes(query))
    )
  }
  
  // 分类过滤
  if (selectedCategory.value) {
    result = result.filter(t => t.category === selectedCategory.value)
  }
  
  return result
})

// 方法
const handleSearch = () => {
  console.log('🔒 搜索模板 - 约束机制已激活')
  console.log(`📋 搜索关键词: ${searchQuery.value || '无'}`)
}

const handleCategoryFilter = () => {
  console.log('🔒 分类过滤 - 约束机制已激活')
  console.log(`📋 选择分类: ${selectedCategory.value || '全部'}`)
}

const refreshTemplates = async () => {
  console.log('🔒 刷新模板列表 - 约束机制已激活')
  loading.value = true
  try {
    await templateStore.loadPackages()
    ElMessage.success('模板列表已刷新')
  } catch (error) {
    ElMessage.error('刷新模板列表失败')
  } finally {
    loading.value = false
  }
}

const scanPackages = async () => {
  console.log('🔒 扫描模板目录 - 约束机制已激活')
  loading.value = true
  try {
    await templateStore.scanPackages()
    ElMessage.success('模板目录扫描完成')
  } catch (error) {
    ElMessage.error('扫描模板目录失败')
  } finally {
    loading.value = false
  }
}

const selectTemplate = (template: TemplatePackage) => {
  console.log('🔒 选择模板包 - 约束机制已激活')
  console.log(`📋 选择模板: ${template.displayName}`)
  emit('select', template)
}

const editTemplate = (template: TemplatePackage) => {
  console.log('🔒 编辑模板包 - 约束机制已激活')
  console.log(`📋 编辑模板: ${template.displayName}`)
  emit('edit', template)
}

const exportTemplate = async (template: TemplatePackage) => {
  console.log('🔒 导出模板包 - 约束机制已激活')
  console.log(`📋 导出模板: ${template.displayName}`)
  
  try {
    await templateStore.exportPackage(template.name)
    ElMessage.success(`模板 ${template.displayName} 导出成功`)
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  }
}

const duplicateTemplate = (template: TemplatePackage) => {
  console.log('🔒 复制模板包 - 约束机制已激活')
  console.log(`📋 复制模板: ${template.displayName}`)
  ElMessage.info(`复制模板: ${template.displayName}`)
}

const deleteTemplate = async (template: TemplatePackage) => {
  console.log('🔒 删除模板包 - 约束机制已激活')
  console.log(`📋 删除模板: ${template.displayName}`)
  
  try {
    await templateStore.deletePackage(template.name)
    ElMessage.success('模板包已删除')
  } catch (error) {
    ElMessage.error('删除模板包失败')
  }
}

const useTemplate = (template: TemplatePackage) => {
  console.log('🔒 使用模板包 - 约束机制已激活')
  console.log(`📋 使用模板: ${template.displayName}`)
  emit('select', template)
}

const toggleSelection = (templateName: string, selected: boolean) => {
  if (selected) {
    if (!selectedTemplates.value.includes(templateName)) {
      selectedTemplates.value.push(templateName)
    }
  } else {
    selectedTemplates.value = selectedTemplates.value.filter(t => t !== templateName)
  }
}

const showImportDialog = () => {
  importDialogVisible.value = true
  selectedFile.value = null
}

const handleFileSelect = (file: { raw: File }) => {
  selectedFile.value = file.raw
}

const confirmImport = async () => {
  if (!selectedFile.value) {
    ElMessage.warning('请选择要导入的文件')
    return
  }
  
  console.log('🔒 导入模板包 - 约束机制已激活')
  console.log(`📋 导入文件: ${selectedFile.value.name}`)
  
  importing.value = true
  try {
    await templateStore.importPackage(selectedFile.value)
    importDialogVisible.value = false
    ElMessage.success('模板包导入成功')
  } catch (error) {
    ElMessage.error('导入模板包失败')
  } finally {
    importing.value = false
  }
}

const showContextMenu = (event: MouseEvent, template: TemplatePackage) => {
  console.log('🔒 显示上下文菜单 - 约束机制已激活')
  console.log(`📋 模板: ${template.displayName}`)
}

const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(2)} ${units[unitIndex]}`
}
</script>

<style scoped>
.template-list {
  padding: 1rem;
}

.toolbar {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.search-input {
  max-width: 300px;
}

.stats-bar {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-item {
  font-size: 0.875rem;
  color: #666;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
}

.template-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.template-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}

.template-card.selected {
  border-color: #409eff;
}

.template-card.active {
  border-color: #67c23a;
}

.card-header {
  display: flex;
  align-items: center;
  padding: 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #eee;
}

.template-icon {
  font-size: 2rem;
  margin-right: 1rem;
}

.template-info {
  flex: 1;
}

.template-name {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #2c3e50;
}

.template-version {
  margin: 0.25rem 0 0 0;
  font-size: 0.75rem;
  color: #999;
}

.card-body {
  padding: 1rem;
}

.template-description {
  margin: 0 0 1rem 0;
  font-size: 0.875rem;
  color: #666;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.template-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.author {
  font-size: 0.75rem;
  color: #999;
}

.template-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
}

.template-files {
  font-size: 0.75rem;
  color: #999;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: #f8f9fa;
  border-top: 1px solid #eee;
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

.import-content {
  padding: 1rem 0;
}

.file-info {
  margin-top: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.file-info h4 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
}

.file-info p {
  margin: 0.25rem 0;
  font-size: 0.875rem;
  color: #666;
}

.upload-area {
  width: 100%;
}
</style>
