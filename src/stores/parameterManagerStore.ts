/**
 * 参数管理状态store
 * 
 * 此文件必须严格遵循PROJECT_REQUIREMENTS.md文档约束。
 * 任何修改都必须先更新需求文档，然后修改代码。
 * 违反此约束将导致代码被拒绝。
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { parameterApi, type ParameterConfig, type ValidationResult } from '@/services/api'

// 参数预设类型
export interface ParameterPreset {
  name: string
  packageName: string
  parameters: Record<string, any>
  createdAt: string
  description?: string
}

// 预设存储键
const PRESETS_STORAGE_KEY = 'nc_program_parameter_presets'

export const useParameterManagerStore = defineStore('parameterManager', () => {
  // 状态
  const parameters = ref<Record<string, any>>({})
  const parameterConfig = ref<ParameterConfig | null>(null)
  const validation = ref<ValidationResult>({
    valid: true,
    errors: {},
    warnings: {}
  })
  const calculatedParams = ref<Record<string, any>>({})
  const loading = ref(false)
  const error = ref<string | null>(null)
  const currentPackageName = ref<string>('')
  
  // 预设列表
  const presets = ref<ParameterPreset[]>([])

  // 计算属性
  const hasErrors = computed(() => Object.keys(validation.value.errors).length > 0)
  const hasWarnings = computed(() => Object.keys(validation.value.warnings).length > 0)
  const isValid = computed(() => validation.value.valid)
  const errorCount = computed(() => Object.keys(validation.value.errors).length)
  const warningCount = computed(() => Object.keys(validation.value.warnings).length)
  
  // 参数组列表
  const parameterGroups = computed(() => {
    if (!parameterConfig.value) return []
    return Object.entries(parameterConfig.value.groups).map(([key, group]) => ({
      key,
      name: group.name,
      icon: group.icon || '🔧',
      parameters: Object.entries(group.parameters).map(([paramKey, param]) => ({
        key: `${key}.${paramKey}`,
        groupKey: key,
        paramKey,
        ...param
      }))
    }))
  })

  // 所有参数列表（扁平化）
  const flatParameters = computed(() => {
    return parameterGroups.value.flatMap(group => group.parameters)
  })

  // 必填参数列表
  const requiredParameters = computed(() => {
    return flatParameters.value.filter(param => param.required)
  })

  // 有值的参数列表
  const filledParameters = computed(() => {
    return flatParameters.value.filter(param => {
      const value = parameters.value[param.key]
      return value !== undefined && value !== null && value !== ''
    })
  })

  // 完成度百分比
  const completionPercentage = computed(() => {
    if (requiredParameters.value.length === 0) return 100
    return Math.round((filledParameters.value.filter(p => p.required).length / requiredParameters.value.length) * 100)
  })

  // 从localStorage加载预设
  const loadPresets = () => {
    try {
      const stored = localStorage.getItem(PRESETS_STORAGE_KEY)
      if (stored) {
        presets.value = JSON.parse(stored)
        console.log(`✅ 加载了 ${presets.value.length} 个参数预设`)
      }
    } catch (e) {
      console.error('❌ 加载预设失败:', e)
      presets.value = []
    }
  }

  // 保存预设到localStorage
  const savePresets = () => {
    try {
      localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets.value))
      console.log(`✅ 保存了 ${presets.value.length} 个参数预设`)
    } catch (e) {
      console.error('❌ 保存预设失败:', e)
    }
  }

  // 获取指定模板包的预设
  const getPresetsForPackage = (packageName: string) => {
    return presets.value.filter(p => p.packageName === packageName)
  }

  // 保存参数预设
  const savePreset = (name: string, description?: string): boolean => {
    if (!currentPackageName.value) {
      ElMessage.warning('请先加载参数配置')
      return false
    }

    if (!name.trim()) {
      ElMessage.warning('请输入预设名称')
      return false
    }

    // 检查是否已存在同名预设
    const existingIndex = presets.value.findIndex(
      p => p.packageName === currentPackageName.value && p.name === name
    )

    const newPreset: ParameterPreset = {
      name: name.trim(),
      packageName: currentPackageName.value,
      parameters: { ...parameters.value },
      createdAt: new Date().toISOString(),
      description
    }

    if (existingIndex >= 0) {
      // 更新现有预设
      presets.value[existingIndex] = newPreset
      console.log(`✅ 更新预设: ${name}`)
    } else {
      // 添加新预设
      presets.value.push(newPreset)
      console.log(`✅ 保存新预设: ${name}`)
    }

    savePresets()
    ElMessage.success(`预设 "${name}" 已保存`)
    return true
  }

  // 加载参数预设
  const loadPreset = (presetName: string): boolean => {
    const preset = presets.value.find(
      p => p.packageName === currentPackageName.value && p.name === presetName
    )

    if (!preset) {
      ElMessage.warning(`未找到预设: ${presetName}`)
      return false
    }

    console.log(`🔒 加载参数预设: ${presetName}`)
    updateParameters(preset.parameters)
    ElMessage.success(`已加载预设 "${presetName}"`)
    return true
  }

  // 删除参数预设
  const deletePreset = (presetName: string): boolean => {
    const index = presets.value.findIndex(
      p => p.packageName === currentPackageName.value && p.name === presetName
    )

    if (index < 0) {
      ElMessage.warning(`未找到预设: ${presetName}`)
      return false
    }

    presets.value.splice(index, 1)
    savePresets()
    console.log(`✅ 删除预设: ${presetName}`)
    ElMessage.success(`预设 "${presetName}" 已删除`)
    return true
  }

  // Actions
  const loadParameters = async (packageName: string) => {
    console.log(`🔒 加载参数配置: ${packageName}`)
    
    loading.value = true
    error.value = null
    currentPackageName.value = packageName

    try {
      const response = await parameterApi.getParameterConfig(packageName)
      
      if (response.data.success) {
        parameterConfig.value = response.data.data
        
        // 设置默认值
        const defaultParams: Record<string, any> = {}
        parameterGroups.value.forEach(group => {
          group.parameters.forEach(param => {
            if (param.default !== undefined) {
              defaultParams[param.key] = param.default
            }
          })
        })
        parameters.value = defaultParams
        
        // 加载该模板包的预设
        loadPresets()
        
        console.log(`✅ 成功加载参数配置，共 ${flatParameters.value.length} 个参数`)
      } else {
        error.value = response.data.error || '加载参数配置失败'
        console.error('❌ 加载参数配置失败:', error.value)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '未知错误'
      console.error('❌ 加载参数配置异常:', err)
    } finally {
      loading.value = false
    }
  }

  const updateParameter = (paramKey: string, value: any) => {
    console.log(`🔒 更新参数: ${paramKey} = ${value}`)
    parameters.value[paramKey] = value
    
    // 触发验证
    if (currentPackageName.value) {
      validateParameters(currentPackageName.value)
    }
  }

  const updateParameters = (params: Record<string, any>) => {
    console.log('🔒 批量更新参数')
    Object.assign(parameters.value, params)
    
    // 触发验证
    if (currentPackageName.value) {
      validateParameters(currentPackageName.value)
    }
  }

  const validateParameters = async (packageName: string) => {
    console.log(`🔒 验证参数: ${packageName}`)
    
    try {
      const response = await parameterApi.validateParameters(packageName, parameters.value)
      
      if (response.data.success) {
        validation.value = response.data.data
        
        if (validation.value.valid) {
          console.log('✅ 参数验证通过')
        } else {
          console.warn(`⚠️ 参数验证失败: ${errorCount.value} 个错误, ${warningCount.value} 个警告`)
        }
      } else {
        console.error('❌ 参数验证请求失败:', response.data.error)
      }
    } catch (err) {
      console.error('❌ 参数验证异常:', err)
    }
  }

  const calculateParameters = async (packageName: string) => {
    console.log(`🔒 计算派生参数: ${packageName}`)
    
    loading.value = true
    error.value = null

    try {
      const response = await parameterApi.calculateParameters(packageName, parameters.value)
      
      if (response.data.success) {
        calculatedParams.value = response.data.calculated || {}
        
        // 合并派生参数到主参数
        updateParameters(calculatedParams.value)
        
        console.log(`✅ 成功计算派生参数: ${Object.keys(calculatedParams.value).length} 个`)
        ElMessage.success('派生参数计算完成')
      } else {
        error.value = response.data.error || '计算派生参数失败'
        console.error('❌ 计算派生参数失败:', error.value)
        ElMessage.error('计算派生参数失败')
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '未知错误'
      console.error('❌ 计算派生参数异常:', err)
      ElMessage.error('计算派生参数异常')
    } finally {
      loading.value = false
    }
  }

  const resetParameters = () => {
    console.log('🔒 重置参数')
    parameters.value = {}
    validation.value = { valid: true, errors: {}, warnings: {} }
    calculatedParams.value = {}
    error.value = null
  }

  const applyPreset = (preset: Record<string, any>) => {
    console.log('🔒 应用参数预设')
    updateParameters(preset)
  }

  const getParameter = (paramKey: string) => {
    return parameters.value[paramKey]
  }

  const clearError = () => {
    error.value = null
  }

  // 初始化
  const initialize = (packageName: string) => {
    console.log('🚀 初始化参数管理store')
    console.log('🔒 约束执行机制已激活')
    loadPresets()  // 加载预设
    return loadParameters(packageName)
  }

  return {
    // 状态
    parameters,
    parameterConfig,
    validation,
    calculatedParams,
    loading,
    error,
    currentPackageName,
    presets,
    
    // 计算属性
    hasErrors,
    hasWarnings,
    isValid,
    errorCount,
    warningCount,
    parameterGroups,
    flatParameters,
    requiredParameters,
    filledParameters,
    completionPercentage,
    
    // 方法
    getPresetsForPackage,
    savePreset,
    loadPreset,
    deletePreset,
    loadParameters,
    updateParameter,
    updateParameters,
    validateParameters,
    calculateParameters,
    resetParameters,
    applyPreset,
    getParameter,
    clearError,
    initialize,
  }
})
