/**
 * API服务模块
 *
 * 此文件必须严格遵循PROJECT_REQUIREMENTS.md文档约束。
 * 任何修改都必须先更新需求文档，然后修改代码。
 * 违反此约束将导致代码被拒绝。
 */

import axios from "axios";

// 创建axios实例
const api = axios.create({
  baseURL: "/api",
  timeout: 60000, // 增加超时时间，支持大文件上传
  headers: {
    "Content-Type": "application/json",
  },
});

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    console.log("🔒 API请求 - 约束机制已激活");
    console.log(`📋 严格遵循PROJECT_REQUIREMENTS.md文档`);
    console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error("API请求错误:", error);
    return Promise.reject(error);
  },
);

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    console.log("✅ API响应成功:", response.config.url);
    return response;
  },
  (error) => {
    console.error("API响应错误:", error.response?.data || error.message);
    return Promise.reject(error);
  },
);

// 模板管理API
export const templateApi = {
  // 获取所有模板包
  getTemplates: () => {
    return api.get("/templates/");
  },

  // 获取指定模板包详情
  getTemplate: (packageName: string) => {
    return api.get(`/templates/${packageName}`);
  },

  // 扫描模板包
  scanTemplates: () => {
    return api.post("/templates/scan");
  },

  // 创建模板包
  createTemplate: (data: {
    name: string;
    displayName: string;
    version: string;
    category: string;
    description: string;
    tags?: string[];
    author?: string;
    icon?: string;
    color?: string;
    language?: string;
  }) => {
    return api.post("/templates/create", data);
  },

  // 复制模板包
  duplicateTemplate: (
    packageName: string,
    data: {
      newName?: string;
      newDisplayName?: string;
    },
  ) => {
    return api.post(`/templates/${packageName}/duplicate`, data);
  },

  // 获取模板预览
  getTemplatePreview: (packageName: string) => {
    return api.get(`/templates/${packageName}/preview`);
  },

  // 获取模板版本历史
  getTemplateVersions: (packageName: string) => {
    return api.get(`/templates/${packageName}/versions`);
  },

  // 导入模板包（上传zip文件）
  importTemplate: (file: File, onProgress?: (progress: number) => void) => {
    const formData = new FormData();
    formData.append("file", file);

    return api.post("/templates/", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onProgress(progress);
        }
      },
    });
  },

  // 删除模板包
  deleteTemplate: (packageName: string) => {
    return api.delete(`/templates/${packageName}`);
  },

  // 导出模板包
  exportTemplate: (packageName: string): Promise<Blob> => {
    return api.get(`/templates/${packageName}/export`, {
      responseType: "blob",
    });
  },
};

// 参数管理API
export const parameterApi = {
  // 获取参数配置
  getParameterConfig: (packageName: string) => {
    return api.get(`/parameters/${packageName}/config`);
  },

  // 验证参数值
  validateParameters: (
    packageName: string,
    parameters: Record<string, any>,
  ) => {
    return api.post(`/parameters/${packageName}/validate`, { parameters });
  },

  // 计算派生参数
  calculateParameters: (
    packageName: string,
    parameters: Record<string, any>,
  ) => {
    return api.post(`/parameters/${packageName}/calculate`, { parameters });
  },

  // 获取参数预设列表
  getPresets: (packageName: string) => {
    return api.get(`/parameters/${packageName}/presets`);
  },

  // 保存参数预设
  savePreset: (
    packageName: string,
    data: {
      name: string;
      parameters: Record<string, any>;
      description?: string;
    },
  ) => {
    return api.post(`/parameters/${packageName}/presets`, data);
  },

  // 加载参数预设
  loadPreset: (packageName: string, presetName: string) => {
    return api.get(`/parameters/${packageName}/presets/${presetName}/load`);
  },

  // 删除参数预设
  deletePreset: (packageName: string, presetName: string) => {
    return api.delete(`/parameters/${packageName}/presets/${presetName}`);
  },
};

// 渲染API
export const renderApi = {
  // 渲染模板包
  render: (packageName: string, parameters: Record<string, any>) => {
    return api.post(`/render/templates/${packageName}/render`, { parameters });
  },

  // 验证模板
  validate: (packageName: string, data: Record<string, any>) => {
    return api.post(`/render/templates/${packageName}/validate`, data);
  },

  // 导出渲染结果为ZIP
  export: async (
    packageName: string,
    parameters: Record<string, any>,
  ): Promise<Blob> => {
    const response = await api.post(
      `/render/templates/${packageName}/export`,
      { parameters },
      { responseType: "blob" },
    );
    return response.data;
  },

  // 预览模板
  preview: (
    packageName: string,
    parameters: Record<string, any>,
    templateName?: string,
  ) => {
    return api.post(`/render/preview/${packageName}`, {
      parameters,
      template_name: templateName,
    });
  },

  // 自动预览模板
  autoPreview: (
    packageName: string,
    templateContent: string,
    parameters: Record<string, any>,
  ) => {
    return api.post(`/render/preview/${packageName}/auto`, {
      template_content: templateContent,
      parameters,
    });
  },

  // 验证模板语法
  validateSyntax: (packageName: string, templateContent: string) => {
    return api.post(`/render/preview/${packageName}/validate`, {
      template_content: templateContent,
    });
  },

  // 获取模板包输出文件列表
  getOutputs: (packageName: string) => {
    return api.get(`/render/templates/${packageName}/outputs`);
  },
};

// 系统API
export const systemApi = {
  // 健康检查
  healthCheck: () => {
    return api.get("/health");
  },

  // 应用信息
  getAppInfo: () => {
    return api.get("/info");
  },
};

// 文件管理API
export const fileApi = {
  // 获取文件列表
  listFiles: (path: string = "/") => {
    return api.get("/files", {
      params: { path },
    });
  },

  // 获取文件信息
  getFileInfo: (path: string) => {
    return api.get("/files/info", {
      params: { path },
    });
  },

  // 读取文件内容
  readFile: (path: string) => {
    // 确保路径以 / 开头
    const normalizedPath = path.startsWith("/") ? path : "/" + path;
    return api.get(`/files${normalizedPath}`);
  },

  // 写入文件内容
  writeFile: (path: string, content: string, createDirs: boolean = true) => {
    // 确保路径以 / 开头
    const normalizedPath = path.startsWith("/") ? path : "/" + path;
    return api.put(`/files${normalizedPath}`, {
      content,
      create_dirs: createDirs,
    });
  },

  // 创建文件或目录
  createPath: (
    path: string,
    isDirectory: boolean = false,
    content: string = "",
  ) => {
    return api.post("/files", {
      path,
      is_directory: isDirectory,
      content,
    });
  },

  // 删除文件或目录
  deleteFile: (path: string, recursive: boolean = false) => {
    // 确保路径以 / 开头
    const normalizedPath = path.startsWith("/") ? path : "/" + path;
    return api.delete(`/files${normalizedPath}`, {
      params: { recursive },
    });
  },

  // 复制文件
  copyFile: (
    source: string,
    destination: string,
    overwrite: boolean = false,
  ) => {
    return api.post("/files/copy", {
      source,
      destination,
      overwrite,
    });
  },

  // 移动/重命名文件
  moveFile: (
    source: string,
    destination: string,
    overwrite: boolean = false,
  ) => {
    return api.post("/files/move", {
      source,
      destination,
      overwrite,
    });
  },

  // 搜索文件
  searchFiles: (
    path: string = "/",
    pattern: string,
    recursive: boolean = true,
  ) => {
    return api.post("/files/search", {
      path,
      pattern,
      recursive,
    });
  },

  // 下载文件
  downloadFile: async (path: string): Promise<Blob> => {
    // 确保路径以 / 开头
    const normalizedPath = path.startsWith("/") ? path : "/" + path;
    const response = await api.get(`/files/download${normalizedPath}`, {
      responseType: "blob",
    });
    return response.data;
  },

  // 上传文件
  uploadFile: (
    path: string,
    file: File,
    overwrite: boolean = false,
    onProgress?: (progress: number) => void,
  ) => {
    const formData = new FormData();
    formData.append("path", path);
    formData.append("file", file);
    formData.append("overwrite", String(overwrite));

    return api.post("/files/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          onProgress(progress);
        }
      },
    });
  },
};

// 类型定义
export interface TemplatePackage {
  name: string;
  displayName: string;
  version: string;
  description: string;
  category: string;
  tags: string[];
  author: string;
  icon: string;
  color: string;
  templateFiles: string[];
}

export interface ParameterConfig {
  groups: Record<
    string,
    {
      name: string;
      icon?: string;
      parameters: Record<
        string,
        {
          type: string;
          label: string;
          description?: string;
          default?: any;
          required?: boolean;
          unit?: string;
          range?: [any, any];
          options?: any[];
        }
      >;
    }
  >;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

/**
 * 渲染相关类型
 */

// 单个渲染文件
export interface RenderFile {
  filename: string;
  content: string;
  encoding?: string;
  errors?: string[];
}

// 渲染结果（后端返回的完整响应）
export interface RenderResult {
  success: boolean;
  package_path?: string;
  results?: Record<string, RenderFile>;
  total?: number;
  render_time: string;
  errors?: string[];
  logs?: Array<{
    timestamp: string;
    level: string;
    message: string;
  }>;
}

// 渲染API响应包装
export interface RenderApiResponse {
  success: boolean;
  data?: RenderResult;
  error?: string;
  message?: string;
  timestamp: string;
}

// 模板参数验证结果
export interface ParameterValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  warnings: Record<string, string>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: string;
  created: string;
  extension?: string;
}

export default api;
