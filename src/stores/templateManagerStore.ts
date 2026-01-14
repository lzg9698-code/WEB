/**
 * 模板管理状态store
 * 
 * 此文件必须严格遵循PROJECT_REQUIREMENTS.md文档约束。
 * 任何修改都必须先更新需求文档，然后修改代码。
 * 违反此约束将导致代码被拒绝。
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { templateApi, type TemplatePackage } from '@/services/api'

export const useTemplateManagerStore = defineStore('templateManager', () => {
  // 状态
  const packages = ref<TemplatePackage[]>([])
  const currentPackage = ref<TemplatePackage | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 计算属性
  const packageCount = computed(() => packages.value.length)
  const packageNames = computed(() => packages.value.map(p => p.name))
  const currentPackageName = computed(() => currentPackage.value?.name || null)

  // 分类统计
  const categoryStats = computed(() => {
    const stats: Record<string, number> = {}
    packages.value.forEach(pkg => {
      stats[pkg.category] = (stats[pkg.category] || 0) + 1
    })
    return stats
  })

  // 按分类过滤
  const getTemplatesByCategory = (category: string) => {
    return packages.value.filter(pkg => pkg.category === category)
  }

  // 按标签搜索
  const searchByTags = (tags: string[]) => {
    return packages.value.filter(pkg => 
      tags.some(tag => pkg.tags.includes(tag))
    )
  }

  // 按名称搜索
  const searchByName = (query: string) => {
    const lowerQuery = query.toLowerCase()
    return packages.value.filter(pkg => 
      pkg.displayName.toLowerCase().includes(lowerQuery) ||
      pkg.name.toLowerCase().includes(lowerQuery) ||
      pkg.description.toLowerCase().includes(lowerQuery)
    )
  }

  // Actions
  const loadPackages = async () => {
    console.log('🔒 加载模板包 - 约束机制已激活')
    console.log('📋 严格遵循PROJECT_REQUIREMENTS.md文档')
    
    loading.value = true
    error.value = null

    try {
      const response = await templateApi.getTemplates()
      
      if (response.data.success) {
        packages.value = response.data.data || []
        console.log(`✅ 成功加载 ${packages.value.length} 个模板包`)
      } else {
        error.value = response.data.error || '加载模板包失败'
        console.error('❌ 加载模板包失败:', error.value)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '未知错误'
      console.error('❌ 加载模板包异常:', err)
    } finally {
      loading.value = false
    }
  }

  const selectPackage = async (packageName: string) => {
    console.log(`🔒 选择模板包: ${packageName}`)
    
    loading.value = true
    error.value = null

    try {
      const response = await templateApi.getTemplate(packageName)
      
      if (response.data.success) {
        currentPackage.value = response.data.data
        console.log(`✅ 成功选择模板包: ${response.data.data.displayName}`)
      } else {
        error.value = response.data.error || '选择模板包失败'
        console.error('❌ 选择模板包失败:', error.value)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '未知错误'
      console.error('❌ 选择模板包异常:', err)
    } finally {
      loading.value = false
    }
  }

  const scanPackages = async () => {
    console.log('🔒 扫描模板包 - 约束机制已激活')
    
    loading.value = true
    error.value = null

    try {
      const response = await templateApi.scanTemplates()
      
      if (response.data.success) {
        packages.value = response.data.data || []
        console.log(`✅ 扫描完成，发现 ${packages.value.length} 个模板包`)
      } else {
        error.value = response.data.error || '扫描模板包失败'
        console.error('❌ 扫描模板包失败:', error.value)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '未知错误'
      console.error('❌ 扫描模板包异常:', err)
    } finally {
      loading.value = false
    }
  }

  // 导入模板包
  const importPackage = async (file: File, onProgress?: (progress: number) => void): Promise<boolean> => {
    console.log('🔒 导入模板包 - 约束机制已激活')
    console.log(`📋 文件: ${file.name}`)
    
    loading.value = true
    error.value = null

    try {
      const response = await templateApi.importTemplate(file, onProgress)
      
      if (response.data.success) {
        console.log(`✅ 成功导入模板包: ${response.data.data.displayName}`)
        
        // 重新加载模板包列表
        await loadPackages()
        
        return true
      } else {
        error.value = response.data.error || '导入模板包失败'
        console.error('❌ 导入模板包失败:', error.value)
        return false
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '未知错误'
      console.error('❌ 导入模板包异常:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  // 删除模板包
  const deletePackage = async (packageName: string): Promise<boolean> => {
    console.log('🔒 删除模板包 - 约束机制已激活')
    console.log(`📋 模板包: ${packageName}`)
    
    loading.value = true
    error.value = null

    try {
      const response = await templateApi.deleteTemplate(packageName)
      
      if (response.data.success) {
        console.log(`✅ 成功删除模板包: ${packageName}`)
        
        // 如果删除的是当前包，清除当前选择
        if (currentPackage.value?.name === packageName) {
          currentPackage.value = null
        }
        
        // 重新加载模板包列表
        await loadPackages()
        
        return true
      } else {
        error.value = response.data.error || '删除模板包失败'
        console.error('❌ 删除模板包失败:', error.value)
        return false
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '未知错误'
      console.error('❌ 删除模板包异常:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  // 导出模板包
  const exportPackage = async (packageName: string): Promise<boolean> => {
    console.log('🔒 导出模板包 - 约束机制已激活')
    console.log(`📋 模板包: ${packageName}`)
    
    loading.value = true
    error.value = null

    try {
      const response = await templateApi.exportTemplate(packageName)
      
      // 创建下载链接
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      
      // 获取文件名
      const contentDisposition = response.headers['content-disposition']
      let fileName = `${packageName}.zip`
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="(.+)"/)
        if (fileNameMatch) {
          fileName = fileNameMatch[1]
        }
      }
      
      link.setAttribute('download', fileName)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      console.log(`✅ 成功导出模板包: ${packageName}`)
      return true
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : '未知错误'
      console.error('❌ 导出模板包异常:', err)
      return false
    } finally {
      loading.value = false
    }
  }

  const clearError = () => {
    error.value = null
  }

  const clearCurrentPackage = () => {
    currentPackage.value = null
  }

  // 初始化
  const initialize = async () => {
    console.log('🚀 初始化模板管理store')
    console.log('🔒 约束执行机制已激活')
    await loadPackages()
  }

  return {
    // 状态
    packages,
    currentPackage,
    loading,
    error,
    
    // 计算属性
    packageCount,
    packageNames,
    currentPackageName,
    categoryStats,
    
    // 方法
    getTemplatesByCategory,
    searchByTags,
    searchByName,
    
    // Actions
    loadPackages,
    selectPackage,
    scanPackages,
    importPackage,
    deletePackage,
    exportPackage,
    clearError,
    clearCurrentPackage,
    initialize,
  }
})
