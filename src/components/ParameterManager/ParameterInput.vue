<template>
  <div class="parameter-input">
    <div class="parameter-header">
      <label class="parameter-label">
        {{ parameter.label }}
        <span v-if="parameter.required" class="required">*</span>
        <span v-if="parameter.unit" class="unit">({{ parameter.unit }})</span>
      </label>
      
      <div class="parameter-actions">
        <el-tooltip
          v-if="parameter.description"
          :content="parameter.description"
          placement="top"
        >
          <el-icon class="help-icon"><InfoFilled /></el-icon>
        </el-tooltip>
        
        <el-button
          v-if="hasDefaultValue"
          size="small"
          @click="resetToDefault"
          type="info"
          text
        >
          ↺ 重置
        </el-button>
      </div>
    </div>
    
    <div class="parameter-control">
      <!-- 字符串输入 -->
      <el-input
        v-if="parameter.type === 'string'"
        :model-value="modelValue"
        :placeholder="parameter.description || `请输入${parameter.label}`"
        :disabled="disabled"
        @update:model-value="updateValue"
        clearable
      />
      
      <!-- 数字输入 -->
      <el-input-number
        v-else-if="['number', 'length', 'angle', 'speed'].includes(parameter.type)"
        :model-value="modelValue"
        :min="parameter.range?.[0]"
        :max="parameter.range?.[1]"
        :precision="getPrecision(parameter.type)"
        :disabled="disabled"
        @change="updateValue"
        :step="getStep(parameter.type)"
      />
      
      <!-- 布尔值开关 -->
      <el-switch
        v-else-if="parameter.type === 'boolean'"
        :model-value="modelValue"
        :disabled="disabled"
        @change="updateValue"
        :active-text="parameter.options?.[0] || '是'"
        :inactive-text="parameter.options?.[1] || '否'"
      />
      
      <!-- 选择框 -->
      <el-select
        v-else-if="parameter.type === 'select'"
        :model-value="modelValue"
        :placeholder="`请选择${parameter.label}`"
        :disabled="disabled"
        @change="updateValue"
        clearable
      >
        <el-option
          v-for="option in parameter.options"
          :key="option"
          :label="option"
          :value="option"
        />
      </el-select>
      
      <!-- 数组输入 -->
      <div v-else-if="parameter.type === 'array'" class="array-input">
        <div
          v-for="(item, index) in arrayValue"
          :key="index"
          class="array-item"
        >
          <el-input
            :model-value="item"
            @update:model-value="updateArrayItem(index, $event)"
            :placeholder="`项目 ${index + 1}`"
          />
          <el-button
            @click="removeArrayItem(index)"
            type="danger"
            :icon="Delete"
            circle
            size="small"
          />
        </div>
        <el-button @click="addArrayItem" type="primary" :icon="Plus" size="small">
          添加项目
        </el-button>
      </div>
      
      <!-- 对象输入 -->
      <div v-else-if="parameter.type === 'object'" class="object-input">
        <div
          v-for="(key, value) in objectValue"
          :key="key"
          class="object-item"
        >
          <el-input
            :model-value="key"
            @update:model-value="updateObjectKey(key, $event)"
            placeholder="键名"
            class="object-key"
          />
          <el-input
            :model-value="value"
            @update:model-value="updateObjectValue(key, $event)"
            placeholder="值"
            class="object-value"
          />
          <el-button
            @click="removeObjectItem(key)"
            type="danger"
            :icon="Delete"
            circle
            size="small"
          />
        </div>
        <el-button @click="addObjectItem" type="primary" :icon="Plus" size="small">
          添加键值对
        </el-button>
      </div>
      
      <!-- 工具类型输入 -->
      <div v-else-if="parameter.type === 'tool'" class="tool-input">
        <el-input
          :model-value="toolValue.name"
          @update:model-value="updateToolName"
          placeholder="工具名称"
        />
        <el-input-number
          :model-value="toolValue.diameter"
          @change="updateToolDiameter"
          placeholder="直径"
          :min="0.1"
          :precision="2"
          style="margin-top: 0.5rem;"
        />
        <el-input-number
          :model-value="toolValue.length"
          @change="updateToolLength"
          placeholder="长度"
          :min="0"
          style="margin-top: 0.5rem;"
        />
      </div>
      
      <!-- 材料类型输入 -->
      <div v-else-if="parameter.type === 'material'" class="material-input">
        <el-select
          :model-value="modelValue"
          @change="updateValue"
          placeholder="请选择材料"
          filterable
          allow-create
        >
          <el-option
            v-for="material in commonMaterials"
            :key="material"
            :label="material"
            :value="material"
          />
        </el-select>
      </div>
    </div>
    
    <!-- 错误和警告信息 -->
    <div v-if="errorMessage" class="error-message">
      ❌ {{ errorMessage }}
    </div>
    <div v-if="warningMessage" class="warning-message">
      ⚠️ {{ warningMessage }}
    </div>
    
    <!-- 范围提示 -->
    <div v-if="parameter.range" class="range-hint">
      📊 范围: {{ parameter.range[0] }} ~ {{ parameter.range[1] }}
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 参数输入组件
 * 
 * 此文件必须严格遵循PROJECT_REQUIREMENTS.md文档约束。
 * 任何修改都必须先更新需求文档，然后修改代码。
 * 违反此约束将导致代码被拒绝。
 */

import { ref, computed, watch } from 'vue'
import { InfoFilled, Delete, Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// Props
interface Props {
  // 参数配置
  parameter: {
    key: string
    type: string
    label: string
    description?: string
    default?: any
    required?: boolean
    unit?: string
    range?: [any, any]
    options?: any[]
  }
  // 参数值
  modelValue: any
  // 是否禁用
  disabled?: boolean
  // 错误信息
  error?: string
  // 警告信息
  warning?: string
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  error: '',
  warning: ''
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: any]
  'change': [value: any, parameter: any]
  'error': [error: string, parameter: any]
}>()

// 响应式数据
const arrayValue = ref<any[]>([])
const objectValue = ref<Record<string, any>>({})
const toolValue = ref({ name: '', diameter: 0, length: 0 })

// 常用材料列表
const commonMaterials = [
  '45钢', '不锈钢', '铝合金', '铜合金', '钛合金',
  '铸铁', '碳钢', '合金钢', '塑料', '复合材料'
]

// 计算属性
const hasDefaultValue = computed(() => props.parameter.default !== undefined)
const errorMessage = computed(() => props.error)
const warningMessage = computed(() => props.warning)

// 方法
const getPrecision = (type: string): number => {
  switch (type) {
    case 'length':
      return 2
    case 'angle':
      return 2
    case 'speed':
      return 0
    default:
      return 2
  }
}

const getStep = (type: string): number => {
  switch (type) {
    case 'length':
      return 0.01
    case 'angle':
      return 0.1
    case 'speed':
      return 1
    default:
      return 0.1
  }
}

const updateValue = (value: any) => {
  emit('update:modelValue', value)
  emit('change', value, props.parameter)
}

const resetToDefault = () => {
  updateValue(props.parameter.default)
  ElMessage.success(`参数 ${props.parameter.label} 已重置为默认值`)
}

// 数组类型处理
const initArrayValue = () => {
  if (Array.isArray(props.modelValue)) {
    arrayValue.value = [...props.modelValue]
  } else {
    arrayValue.value = []
  }
}

const updateArrayItem = (index: number, value: any) => {
  arrayValue.value[index] = value
  updateValue([...arrayValue.value])
}

const addArrayItem = () => {
  arrayValue.value.push('')
  updateValue([...arrayValue.value])
}

const removeArrayItem = (index: number) => {
  arrayValue.value.splice(index, 1)
  updateValue([...arrayValue.value])
}

// 对象类型处理
const initObjectValue = () => {
  if (typeof props.modelValue === 'object' && props.modelValue !== null) {
    objectValue.value = { ...props.modelValue }
  } else {
    objectValue.value = {}
  }
}

const updateObjectKey = (oldKey: string, newKey: string) => {
  if (oldKey === newKey) return
  
  const value = objectValue.value[oldKey]
  delete objectValue.value[oldKey]
  objectValue.value[newKey] = value
  updateValue({ ...objectValue.value })
}

const updateObjectValue = (key: string, value: any) => {
  objectValue.value[key] = value
  updateValue({ ...objectValue.value })
}

const addObjectItem = () => {
  const newKey = `key${Object.keys(objectValue.value).length + 1}`
  objectValue.value[newKey] = ''
  updateValue({ ...objectValue.value })
}

const removeObjectItem = (key: string) => {
  delete objectValue.value[key]
  updateValue({ ...objectValue.value })
}

// 工具类型处理
const initToolValue = () => {
  if (typeof props.modelValue === 'object' && props.modelValue !== null) {
    toolValue.value = { ...toolValue.value, ...props.modelValue }
  }
}

const updateToolName = (name: string) => {
  toolValue.value.name = name
  updateValue({ ...toolValue.value })
}

const updateToolDiameter = (diameter: number) => {
  toolValue.value.diameter = diameter
  updateValue({ ...toolValue.value })
}

const updateToolLength = (length: number) => {
  toolValue.value.length = length
  updateValue({ ...toolValue.value })
}

// 监听值变化，初始化特殊类型
watch(() => props.modelValue, (newValue) => {
  switch (props.parameter.type) {
    case 'array':
      if (JSON.stringify(newValue) !== JSON.stringify(arrayValue.value)) {
        initArrayValue()
      }
      break
    case 'object':
      if (JSON.stringify(newValue) !== JSON.stringify(objectValue.value)) {
        initObjectValue()
      }
      break
    case 'tool':
      if (JSON.stringify(newValue) !== JSON.stringify(toolValue.value)) {
        initToolValue()
      }
      break
  }
}, { immediate: true })

// 监听参数变化，初始化值
watch(() => props.parameter, () => {
  switch (props.parameter.type) {
    case 'array':
      initArrayValue()
      break
    case 'object':
      initObjectValue()
      break
    case 'tool':
      initToolValue()
      break
  }
}, { immediate: true })
</script>

<style scoped>
.parameter-input {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: white;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  transition: all 0.3s ease;
}

.parameter-input:hover {
  border-color: #3498db;
}

.parameter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.parameter-label {
  font-weight: 500;
  color: #2c3e50;
  font-size: 0.95rem;
}

.required {
  color: #e74c3c;
  margin-left: 0.25rem;
}

.unit {
  color: #7f8c8d;
  font-size: 0.875rem;
  margin-left: 0.25rem;
}

.parameter-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.help-icon {
  color: #95a5a6;
  cursor: help;
  font-size: 1rem;
}

.help-icon:hover {
  color: #3498db;
}

.parameter-control {
  width: 100%;
}

.array-input,
.object-input {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.array-item,
.object-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.object-key {
  width: 150px;
}

.object-value {
  flex: 1;
}

.tool-input {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.error-message {
  color: #e74c3c;
  font-size: 0.875rem;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #fdf2f2;
  border-radius: 4px;
  border-left: 3px solid #e74c3c;
}

.warning-message {
  color: #f39c12;
  font-size: 0.875rem;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #fef9e7;
  border-radius: 4px;
  border-left: 3px solid #f39c12;
}

.range-hint {
  font-size: 0.75rem;
  color: #7f8c8d;
  margin-top: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: #f8f9fa;
  border-radius: 4px;
  display: inline-block;
}

/* 输入框样式调整 */
:deep(.el-input__wrapper) {
  border-radius: 6px;
}

:deep(.el-input-number .el-input__wrapper) {
  width: 100%;
}

:deep(.el-select .el-input__wrapper) {
  border-radius: 6px;
}

:deep(.el-switch) {
  height: 24px;
}

:deep(.el-button--small.is-circle) {
  width: 24px;
  height: 24px;
  padding: 0;
}
</style>
