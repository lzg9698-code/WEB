<!--
  实时预览组件
  
  严格遵循PROJECT_REQUIREMENTS.md文档约束
  功能：在编辑器旁边实时显示模板渲染结果，支持自动刷新
-->
<template>
  <div class="realtime-preview" :class="{ collapsed: isCollapsed }">
    <!-- 预览头部 -->
    <div class="preview-header">
      <div class="header-left">
        <h4>实时预览</h4>
        <div class="preview-status" :class="previewStatus">
          <div class="status-indicator"></div>
          <span>{{ statusText }}</span>
        </div>
      </div>

      <div class="header-right">
        <button
          @click="toggleAutoRefresh"
          class="btn btn-icon"
          :class="{ active: autoRefresh }"
          title="自动刷新"
        >
          <i class="fas fa-sync-alt" :class="{ spinning: isRefreshing }"></i>
        </button>

        <button
          @click="toggleCollapse"
          class="btn btn-icon"
          :class="{ active: isCollapsed }"
          title="折叠预览"
        >
          <i
            class="fas fa-chevron-right"
            :class="{ rotated: !isCollapsed }"
          ></i>
        </button>
      </div>
    </div>

    <!-- 预览内容 -->
    <div v-show="!isCollapsed" class="preview-content">
      <!-- 错误信息 -->
      <div v-if="previewError" class="preview-error">
        <div class="error-header">
          <i class="fas fa-exclamation-triangle"></i>
          预览错误
        </div>
        <div class="error-message">{{ previewError }}</div>
        <div v-if="errorDetails" class="error-details">
          <div class="error-line" v-if="errorDetails.line">
            行号: {{ errorDetails.line }}
          </div>
          <div class="error-column" v-if="errorDetails.column">
            列号: {{ errorDetails.column }}
          </div>
        </div>
      </div>

      <!-- 预览结果 -->
      <div v-else-if="previewContent" class="preview-result">
        <!-- 结果信息 -->
        <div class="result-info">
          <span class="template-name">{{ currentTemplate }}</span>
          <span class="render-time">{{ formatTime(renderTime) }}</span>
          <span class="content-length">{{ previewContent.length }} 字符</span>
        </div>

        <!-- 代码显示 -->
        <div class="code-preview">
          <pre
            class="code-content"
            :class="{ 'with-line-numbers': showLineNumbers }"
          ><code v-html="highlightedCode"></code></pre>
        </div>

        <!-- 操作按钮 -->
        <div class="preview-actions">
          <button @click="copyPreviewContent" class="btn btn-sm">
            <i class="fas fa-copy"></i>
            复制
          </button>

          <button @click="downloadPreviewContent" class="btn btn-sm">
            <i class="fas fa-download"></i>
            下载
          </button>

          <button
            @click="toggleLineNumbers"
            class="btn btn-icon"
            :class="{ active: showLineNumbers }"
            title="显示行号"
          >
            <i class="fas fa-list-ol"></i>
          </button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-else class="empty-preview">
        <i class="fas fa-eye"></i>
        <p>暂无预览内容</p>
        <span class="hint">开始编辑模板后将显示预览</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import { ElMessage } from "element-plus";
import hljs from "highlight.js";
import "highlight.js/styles/vs.css";

// Props
const props = defineProps<{
  templateName?: string;
  templateContent?: string;
  parameters?: Record<string, any>;
  autoRefresh?: boolean;
}>();

// Emits
const emit = defineEmits<{
  refresh: [];
  error: [error: string];
}>();

// 响应式数据
const isCollapsed = ref(false);
const autoRefresh = ref(props.autoRefresh !== false);
const isRefreshing = ref(false);
const showLineNumbers = ref(true);
const previewContent = ref("");
const previewError = ref("");
const renderTime = ref("");
const currentTemplate = ref("");
const errorDetails = ref<{ line?: number; column?: number } | null>(null);
const refreshTimer = ref<NodeJS.Timeout | null>(null);
const lastContent = ref("");

// 计算属性
const previewStatus = computed(() => {
  if (previewError.value) return "error";
  if (isRefreshing.value) return "loading";
  if (previewContent.value) return "success";
  return "idle";
});

const statusText = computed(() => {
  switch (previewStatus.value) {
    case "loading":
      return "渲染中...";
    case "success":
      return "预览就绪";
    case "error":
      return "预览失败";
    default:
      return "等待中";
  }
});

const highlightedCode = computed(() => {
  if (!previewContent.value) return "";

  try {
    // 检测文件类型
    const language = detectLanguage(props.templateName || "");

    if (language === "gcode") {
      // G代码特殊高亮
      return highlightGCode(previewContent.value);
    }

    return hljs.highlight(previewContent.value, { language }).value;
  } catch (error) {
    console.warn("代码高亮失败:", error);
    return previewContent.value;
  }
});

// 方法
const detectLanguage = (filename: string): string => {
  const ext = filename.split(".").pop()?.toLowerCase();
  const typeMap: Record<string, string> = {
    j2: "jinja",
    nc: "gcode",
    gcode: "gcode",
    cnc: "gcode",
    py: "python",
    js: "javascript",
    ts: "typescript",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    html: "html",
    xml: "xml",
    css: "css",
  };
  return typeMap[ext || ""] || "text";
};

const highlightGCode = (code: string): string => {
  return code
    .replace(/([G|M|T|S|F]\d+)/g, '<span class="hljs-keyword">$1</span>')
    .replace(
      /([X|Y|Z|I|J|K|R]-?\d+\.?\d*)/g,
      '<span class="hljs-number">$1</span>',
    )
    .replace(/(;.*)$/gm, '<span class="hljs-comment">$1</span>')
    .replace(/([N]\d+)/g, '<span class="hljs-built_in">$1</span>');
};

const refreshPreview = async () => {
  if (!props.templateContent || !props.templateName) {
    previewContent.value = "";
    previewError.value = "";
    return;
  }

  isRefreshing.value = true;
  previewError.value = "";
  errorDetails.value = null;

  try {
    const response = await fetch(
      `/api/render/preview/${encodeURIComponent(props.templateName)}/auto`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          template_content: props.templateContent,
          parameters: props.parameters || {},
        }),
      },
    );

    const result = await response.json();

    if (result.success) {
      previewContent.value = result.data.content;
      renderTime.value = result.data.preview_time;
      currentTemplate.value = props.templateName;
      lastContent.value = props.templateContent;
    } else {
      previewError.value = result.data?.error || result.error || "预览失败";
      if (result.data?.line) {
        errorDetails.value = {
          line: result.data.line,
          column: result.data.column,
        };
      }
    }
  } catch (error) {
    previewError.value = error instanceof Error ? error.message : "网络错误";
  } finally {
    isRefreshing.value = false;
  }
};

const scheduleRefresh = () => {
  if (refreshTimer.value) {
    clearTimeout(refreshTimer.value);
  }

  refreshTimer.value = setTimeout(() => {
    if (autoRefresh.value && props.templateContent !== lastContent.value) {
      refreshPreview();
    }
  }, 500); // 500ms 防抖
};

const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value;
  if (autoRefresh.value) {
    refreshPreview();
  }
};

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
};

const toggleLineNumbers = () => {
  showLineNumbers.value = !showLineNumbers.value;
};

const formatTime = (time: string) => {
  return new Date(time).toLocaleTimeString("zh-CN");
};

const copyPreviewContent = async () => {
  if (!previewContent.value) return;

  try {
    await navigator.clipboard.writeText(previewContent.value);
    ElMessage.success("预览内容已复制");
  } catch (error) {
    ElMessage.error("复制失败");
  }
};

const downloadPreviewContent = () => {
  if (!previewContent.value || !props.templateName) return;

  const filename = props.templateName.replace(/\.[^.]+$/, "_preview.txt");
  const blob = new Blob([previewContent.value], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  ElMessage.success(`已下载 ${filename}`);
};

// 监听器
watch(
  () => props.templateContent,
  () => {
    if (autoRefresh.value) {
      scheduleRefresh();
    }
  },
);

watch(
  () => props.parameters,
  () => {
    if (autoRefresh.value) {
      scheduleRefresh();
    }
  },
  { deep: true },
);

watch(
  () => props.templateName,
  () => {
    if (autoRefresh.value) {
      refreshPreview();
    }
  },
);

// 生命周期
onMounted(() => {
  if (autoRefresh.value && props.templateContent) {
    refreshPreview();
  }
});

onUnmounted(() => {
  if (refreshTimer.value) {
    clearTimeout(refreshTimer.value);
  }
});
</script>

<style scoped>
.realtime-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--vscode-editor-background);
  border-left: 1px solid var(--vscode-panel-border);
  transition: width 0.3s ease;
  width: 400px;
  min-width: 300px;
}

.realtime-preview.collapsed {
  width: 40px;
  min-width: 40px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--vscode-panel-border);
  background: var(--vscode-panel-background);
}

.header-left h4 {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
}

.preview-status {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  font-size: 11px;
  opacity: 0.8;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--vscode-descriptionForeground);
}

.preview-status.loading .status-indicator {
  background: var(--vscode-charts-orange);
  animation: pulse 1.5s infinite;
}

.preview-status.success .status-indicator {
  background: var(--vscode-testing-iconPassed);
}

.preview-status.error .status-indicator {
  background: var(--vscode-errorForeground);
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.header-right {
  display: flex;
  gap: 4px;
}

.btn {
  padding: 4px 8px;
  border: 1px solid var(--vscode-button-border);
  border-radius: 4px;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
}

.btn:hover {
  background: var(--vscode-button-hoverBackground);
}

.btn-icon {
  padding: 4px;
  background: transparent;
  border: 1px solid transparent;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: var(--vscode-toolbar-hoverBackground);
}

.btn-icon.active {
  background: var(--vscode-button-background);
}

.btn-icon i.spinning {
  animation: spin 1s linear infinite;
}

.btn-icon i.rotated {
  transform: rotate(90deg);
  transition: transform 0.2s;
}

.btn-sm {
  padding: 2px 6px;
  font-size: 10px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.preview-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.preview-error {
  background: var(--vscode-inputValidation-errorBackground);
  border-bottom: 1px solid var(--vscode-inputValidation-errorBorder);
}

.error-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 500;
  color: var(--vscode-errorForeground);
}

.error-message {
  padding: 0 12px 8px;
  font-size: 11px;
  color: var(--vscode-errorForeground);
}

.error-details {
  display: flex;
  gap: 12px;
  padding: 8px 12px;
  background: var(--vscode-editor-lineHighlightBackground);
  font-size: 10px;
}

.preview-result {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.result-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: var(--vscode-editor-lineHighlightBackground);
  border-bottom: 1px solid var(--vscode-panel-border);
  font-size: 11px;
}

.template-name {
  font-weight: 500;
}

.render-time,
.content-length {
  opacity: 0.7;
}

.code-preview {
  flex: 1;
  overflow: auto;
}

.code-content {
  margin: 0;
  padding: 12px;
  font-family: "Consolas", "Monaco", "Courier New", monospace;
  font-size: 11px;
  line-height: 1.4;
  background: var(--vscode-editor-background);
  white-space: pre-wrap;
  word-wrap: break-word;
}

.code-content.with-line-numbers {
  padding-left: 50px;
  position: relative;
}

.empty-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 150px;
  gap: 8px;
  opacity: 0.6;
}

.empty-preview i {
  font-size: 24px;
  color: var(--vscode-descriptionForeground);
}

.empty-preview p {
  margin: 0;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.empty-preview .hint {
  font-size: 10px;
  opacity: 0.7;
}

.preview-actions {
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  border-top: 1px solid var(--vscode-panel-border);
  background: var(--vscode-panel-background);
}

/* G代码高亮样式 */
:deep(.hljs-keyword) {
  color: var(--vscode-keyword-color, #569cd6);
}

:deep(.hljs-number) {
  color: var(--vscode-number-color, #b5cea8);
}

:deep(.hljs-comment) {
  color: var(--vscode-comment-color, #6a9955);
}

:deep(.hljs-built_in) {
  color: var(--vscode-identifier-color, #9cdcfe);
}
</style>
