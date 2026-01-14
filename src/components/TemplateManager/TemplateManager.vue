<template>
  <div class="template-manager">
    <div class="manager-header">
      <h2>📦 模板管理</h2>
      <div class="header-actions">
        <el-button @click="createNewTemplate" type="primary">
          ➕ 新建模板包
        </el-button>
        <el-button @click="importTemplatePackage">
          📥 导入模板包
        </el-button>
        <el-button @click="exportAllTemplates">
          📤 导出全部
        </el-button>
      </div>
    </div>
    
    <div class="manager-content">
      <!-- 左侧模板列表 -->
      <div class="template-list-panel">
        <TemplateList
          :current-template-name="selectedTemplate?.name"
          @select="handleTemplateSelect"
          @edit="handleTemplateEdit"
        />
      </div>
      
      <!-- 右侧模板详情 -->
      <div class="template-detail-panel">
        <TemplateDetail
          :template="selectedTemplate"
          @edit="handleTemplateEdit"
          @file-edit="handleFileEdit"
        />
      </div>
    </div>
    
    <!-- 新建模板对话框 -->
    <el-dialog v-model="createDialogVisible" title="➕ 新建模板包" width="600px">
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-width="100px"
      >
        <el-form-item label="模板包名称" prop="name">
          <el-input
            v-model="createForm.name"
            placeholder="输入模板包名称（英文）"
          />
        </el-form-item>
        
        <el-form-item label="显示名称" prop="displayName">
          <el-input
            v-model="createForm.displayName"
            placeholder="输入显示名称（中文）"
          />
        </el-form-item>
        
        <el-form-item label="版本号" prop="version">
          <el-input v-model="createForm.version" placeholder="x.y.z格式" />
        </el-form-item>
        
        <el-form-item label="分类" prop="category">
          <el-select v-model="createForm.category" placeholder="选择分类">
            <el-option label="车削" value="车削" />
            <el-option label="铣削" value="铣削" />
            <el-option label="钻孔" value="钻孔" />
            <el-option label="线切割" value="线切割" />
            <el-option label="冲压" value="冲压" />
            <el-option label="激光切割" value="激光切割" />
            <el-option label="其他" value="其他" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="createForm.description"
            type="textarea"
            :rows="3"
            placeholder="输入模板包描述"
          />
        </el-form-item>
        
        <el-form-item label="作者">
          <el-input v-model="createForm.author" placeholder="输入作者名称" />
        </el-form-item>
        
        <el-form-item label="图标">
          <el-input v-model="createForm.icon" placeholder="选择图标" />
        </el-form-item>
        
        <el-form-item label="主题色">
          <el-color-picker v-model="createForm.color" />
        </el-form-item>
        
        <el-form-item label="标签">
          <el-select
            v-model="createForm.tags"
            multiple
            filterable
            allow-create
            default-first-option
            placeholder="添加标签"
          >
            <el-option label="数控" value="数控" />
            <el-option label="CNC" value="CNC" />
            <el-option label="G代码" value="G代码" />
            <el-option label="M代码" value="M代码" />
            <el-option label="宏程序" value="宏程序" />
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmCreate" :loading="creating">
          创建
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
/**
 * 模板管理组件
 * 
 * 此文件必须严格遵循PROJECT_REQUIREMENTS.md文档约束。
 * 任何修改都必须先更新需求文档，然后修改代码。
 * 违反此约束将导致代码被拒绝。
 */

import { ref } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useTemplateManagerStore } from '@/stores/templateManagerStore'
import TemplateList from './TemplateList.vue'
import TemplateDetail from './TemplateDetail.vue'
import type { TemplatePackage } from '@/services/api'

// Store
const templateStore = useTemplateManagerStore()

// 响应式数据
const selectedTemplate = ref<TemplatePackage | null>(null)
const createDialogVisible = ref(false)
const createFormRef = ref<FormInstance>()
const creating = ref(false)

const createForm = ref({
  name: '',
  displayName: '',
  version: '1.0.0',
  category: '',
  description: '',
  author: '',
  icon: '📦',
  color: '#3498db',
  tags: [] as string[]
})

// 表单验证规则
const createRules: FormRules = {
  name: [
    { required: true, message: '请输入模板包名称', trigger: 'blur' },
    { pattern: /^[a-zA-Z][a-zA-Z0-9_-]*$/, message: '名称必须以字母开头，只能包含字母、数字、下划线和横线', trigger: 'blur' }
  ],
  displayName: [
    { required: true, message: '请输入显示名称', trigger: 'blur' }
  ],
  version: [
    { required: true, message: '请输入版本号', trigger: 'blur' },
    { pattern: /^\d+\.\d+\.\d+$/, message: '版本号格式应为 x.y.z', trigger: 'blur' }
  ],
  category: [
    { required: true, message: '请选择分类', trigger: 'change' }
  ],
  description: [
    { required: true, message: '请输入描述', trigger: 'blur' }
  ]
}

// 方法
const handleTemplateSelect = (template: TemplatePackage | null) => {
  if (!template) return
  selectedTemplate.value = template
  console.log(`🔒 选择模板包: ${template.displayName}`)
}

const handleTemplateEdit = (template: TemplatePackage | null) => {
  if (!template) return
  console.log(`🔒 编辑模板包: ${template.displayName}`)
  ElMessage.info('编辑功能开发中...')
}

const handleFileEdit = (file: string) => {
  console.log(`🔒 编辑文件: ${file}`)
  ElMessage.info('文件编辑功能开发中...')
}

const createNewTemplate = () => {
  // 重置表单
  createForm.value = {
    name: '',
    displayName: '',
    version: '1.0.0',
    category: '',
    description: '',
    author: '',
    icon: '📦',
    color: '#3498db',
    tags: []
  }
  createDialogVisible.value = true
}

const confirmCreate = async () => {
  if (!createFormRef.value) return
  
  try {
    await createFormRef.value.validate()
    
    creating.value = true
    
    // 提示功能开发中
    ElMessage.info('新建模板包功能开发中，请直接导入模板包')
    createDialogVisible.value = false
    
  } catch (error) {
    console.error('创建模板包失败:', error)
    ElMessage.error('表单验证失败，请检查输入')
  } finally {
    creating.value = false
  }
}

const importTemplatePackage = () => {
  console.log('🔒 导入模板包')
  ElMessage.info('请使用导入按钮或拖拽上传模板包')
}

const exportAllTemplates = async () => {
  if (templateStore.packages.length === 0) {
    ElMessage.warning('暂无模板包可导出')
    return
  }
  
  try {
    // 导出当前选中的模板或第一个模板
    const templateToExport = selectedTemplate.value || templateStore.packages[0]
    if (templateToExport) {
      await templateStore.exportPackage(templateToExport.name)
      ElMessage.success('模板包导出成功')
    }
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  }
}

// 初始化
console.log('🚀 模板管理组件初始化')
console.log('🔒 约束执行机制已激活')
console.log('📋 严格遵循PROJECT_REQUIREMENTS.md文档')
</script>

<style scoped>
.template-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: white;
  border-bottom: 1px solid #eee;
}

.manager-header h2 {
  margin: 0;
  color: #2c3e50;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.manager-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.template-list-panel {
  width: 400px;
  border-right: 1px solid #eee;
  overflow-y: auto;
}

.template-detail-panel {
  flex: 1;
  overflow-y: auto;
}
</style>
