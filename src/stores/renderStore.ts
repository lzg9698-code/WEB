/**
 * 渲染模块状态管理
 *
 * 严格遵循PROJECT_REQUIREMENTS.md文档约束
 * 功能：管理模板渲染状态、设置和历史记录
 */

import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { ElMessage } from "element-plus";
import {
  renderApi,
  type RenderResult,
  type RenderFile,
  type ApiResponse,
} from "@/services/api";

// 接口定义
export interface RenderHistoryItem {
  id: string;
  template_name: string;
  render_time: string;
  status: "success" | "error" | "warning";
  files: RenderFile[];
  parameters?: Record<string, any>;
  parameters_count?: number;
  error_count?: number;
  errors?: string[];
  logs?: Array<{
    timestamp: string;
    level: string;
    message: string;
  }>;
}

export interface RenderSettings {
  renderMode: "preview" | "development" | "production";
  outputEncoding: string;
  lineEnding: string;
  indentType: "spaces" | "tabs";
  indentSize: number;
  errorHandling: "strict" | "lenient" | "warning";
  undefinedVariable: "error" | "empty" | "placeholder";
  maxRenderTime: number;
  maxOutputSize: number;
  enableDebug: boolean;
  preserveWhitespace: boolean;
  enableSafeMode: boolean;
  filenamePrefix: string;
  filenameSuffix: string;
  addTimestamp: boolean;
  timestampFormat: string;
  outputDirectory: string;
}

export const useRenderStore = defineStore("render", () => {
  // 状态
  const isRendering = ref(false);
  const renderResult = ref<RenderResult | null>(null);
  const renderError = ref<string | null>(null);
  const renderProgress = ref(0);
  const currentTemplate = ref<string | null>(null);
  const currentParameters = ref<Record<string, any>>({});

  // 设置
  const settings = ref<RenderSettings>({
    renderMode: "preview",
    outputEncoding: "utf-8",
    lineEnding: "\n",
    indentType: "spaces",
    indentSize: 2,
    errorHandling: "warning",
    undefinedVariable: "placeholder",
    maxRenderTime: 10,
    maxOutputSize: 10,
    enableDebug: false,
    preserveWhitespace: false,
    enableSafeMode: true,
    filenamePrefix: "",
    filenameSuffix: "",
    addTimestamp: false,
    timestampFormat: "YYYYMMDD_HHMMSS",
    outputDirectory: "",
  });

  // 历史记录
  const renderHistory = ref<RenderHistoryItem[]>([]);
  const selectedHistoryItems = ref<Set<string>>(new Set());

  // 计算属性
  const hasRenderResult = computed(() => renderResult.value !== null);
  const renderFiles = computed(() => {
    const results = renderResult.value?.results || {};
    return Object.values(results);
  });
  const renderErrors = computed(() => renderResult.value?.errors || []);
  const renderLogs = computed(() => renderResult.value?.logs || []);
  const totalRenderFiles = computed(() => renderFiles.value.length);
  const totalRenderErrors = computed(() => renderErrors.value.length);

  const successfulRenders = computed(
    () =>
      renderHistory.value.filter((item) => item.status === "success").length,
  );
  const failedRenders = computed(
    () => renderHistory.value.filter((item) => item.status === "error").length,
  );
  const totalRenders = computed(() => renderHistory.value.length);
  const successRate = computed(() => {
    if (totalRenders.value === 0) return 0;
    return Math.round((successfulRenders.value / totalRenders.value) * 100);
  });

  // 添加到历史记录
  const addToHistory = (item: Omit<RenderHistoryItem, "id">) => {
    const historyItem: RenderHistoryItem = {
      ...item,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    };
    renderHistory.value.unshift(historyItem);

    // 限制历史记录数量
    if (renderHistory.value.length > 100) {
      renderHistory.value = renderHistory.value.slice(0, 100);
    }
  };

  // 方法
  const startRender = async (
    templateName: string,
    parameters: Record<string, any>,
  ): Promise<RenderResult | null> => {
    try {
      // 重置状态
      isRendering.value = true;
      renderError.value = null;
      renderProgress.value = 0;
      currentTemplate.value = templateName;
      currentParameters.value = { ...parameters };

      console.log("🔒 开始渲染模板 - 约束机制已激活");
      console.log(`📋 模板: ${templateName}`);
      console.log(`📊 参数数量: ${Object.keys(parameters).length}`);

      // 发送渲染请求
      const response = await renderApi.render(templateName, parameters);

      if (response.data.success) {
        const result = response.data.data;

        // 更新状态
        renderResult.value = result;
        renderProgress.value = 100;

        // 转换results为数组用于历史记录
        const filesArray = Object.values(result.results || {}) as RenderFile[];

        // 添加到历史记录
        addToHistory({
          template_name: templateName,
          render_time: result.render_time || new Date().toISOString(),
          status:
            result.errors && result.errors.length > 0 ? "error" : "success",
          files: filesArray,
          parameters,
          parameters_count: Object.keys(parameters).length,
          error_count: result.errors?.length || 0,
          errors: result.errors,
        });

        console.log(
          `✅ 渲染成功: ${Object.keys(result.results || {}).length} 个文件`,
        );
        ElMessage.success("模板渲染完成");

        return result;
      } else {
        throw new Error(response.data.error || "渲染失败");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "渲染失败";
      renderError.value = errorMessage;

      // 添加失败记录到历史
      addToHistory({
        template_name: templateName,
        render_time: new Date().toISOString(),
        status: "error",
        files: [],
        parameters,
        parameters_count: Object.keys(parameters).length,
        error_count: 1,
        errors: [errorMessage],
      });

      console.error("❌ 渲染失败:", errorMessage);
      ElMessage.error(`渲染失败: ${errorMessage}`);
      return null;
    } finally {
      isRendering.value = false;
    }
  };

  const previewRender = async (
    templateName: string,
    parameters: Record<string, any>,
  ): Promise<RenderResult | null> => {
    try {
      console.log("🔒 预览渲染 - 约束机制已激活");
      console.log(`📋 模板: ${templateName}`);

      // 使用预览模式
      const response = await renderApi.render(templateName, {
        ...parameters,
        _preview: true,
      });

      if (response.data.success) {
        console.log("✅ 预览渲染成功");
        return response.data.data;
      } else {
        throw new Error(response.data.error || "预览失败");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "预览失败";
      console.error("❌ 预览失败:", errorMessage);
      ElMessage.error(`预览失败: ${errorMessage}`);
      return null;
    }
  };

  const validateTemplate = async (templateName: string): Promise<boolean> => {
    try {
      console.log("🔒 验证模板 - 约束机制已激活");
      console.log(`📋 模板: ${templateName}`);

      const response = await renderApi.validate(templateName, {});

      if (response.data.success) {
        console.log("✅ 模板验证通过");
        return true;
      } else {
        console.warn("⚠️ 模板验证失败:", response.data.errors);
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "验证失败";
      console.error("❌ 模板验证异常:", errorMessage);
      ElMessage.error(`模板验证失败: ${errorMessage}`);
      return false;
    }
  };

  const cancelRender = () => {
    isRendering.value = false;
    renderProgress.value = 0;
    renderError.value = "渲染已取消";
    console.log("⚠️ 渲染已取消");
    ElMessage.info("渲染已取消");
  };

  const clearResult = () => {
    renderResult.value = null;
    renderError.value = null;
    renderProgress.value = 0;
    currentTemplate.value = null;
    currentParameters.value = {};
  };

  const updateSettings = (newSettings: Partial<RenderSettings>) => {
    settings.value = { ...settings.value, ...newSettings };
    console.log("🔒 渲染设置已更新");
  };

  const resetSettings = () => {
    settings.value = {
      renderMode: "preview",
      outputEncoding: "utf-8",
      lineEnding: "\n",
      indentType: "spaces",
      indentSize: 2,
      errorHandling: "warning",
      undefinedVariable: "placeholder",
      maxRenderTime: 10,
      maxOutputSize: 10,
      enableDebug: false,
      preserveWhitespace: false,
      enableSafeMode: true,
      filenamePrefix: "",
      filenameSuffix: "",
      addTimestamp: false,
      timestampFormat: "YYYYMMDD_HHMMSS",
      outputDirectory: "",
    };
    console.log("🔒 渲染设置已重置");
    ElMessage.success("设置已重置为默认值");
  };

  const clearHistory = () => {
    renderHistory.value = [];
    selectedHistoryItems.value.clear();
    console.log("🔒 渲染历史已清空");
    ElMessage.success("渲染历史已清空");
  };

  return {
    // 状态
    isRendering,
    renderResult,
    renderError,
    renderProgress,
    currentTemplate,
    currentParameters,
    settings,
    renderHistory,

    // 计算属性
    hasRenderResult,
    renderFiles,
    renderErrors,
    renderLogs,
    totalRenderFiles,
    totalRenderErrors,
    successfulRenders,
    failedRenders,
    totalRenders,
    successRate,

    // 方法
    startRender,
    previewRender,
    validateTemplate,
    cancelRender,
    clearResult,
    updateSettings,
    resetSettings,
    clearHistory,
  };
});
