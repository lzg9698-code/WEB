<!--
  渲染历史组件
  
  严格遵循PROJECT_REQUIREMENTS.md文档约束
  功能：记录和管理模板渲染历史，支持搜索、过滤和比较
-->
<template>
  <div class="render-history">
    <!-- 搜索和过滤栏 -->
    <div class="history-toolbar">
      <div class="search-box">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索模板名称、文件名或参数..."
          class="search-input"
          @input="debouncedSearch"
        />
        <i class="fas fa-search search-icon"></i>
      </div>

      <div class="filter-controls">
        <select
          v-model="dateFilter"
          class="filter-select"
          @change="applyFilters"
        >
          <option value="all">所有时间</option>
          <option value="today">今天</option>
          <option value="week">本周</option>
          <option value="month">本月</option>
          <option value="year">今年</option>
        </select>

        <select
          v-model="statusFilter"
          class="filter-select"
          @change="applyFilters"
        >
          <option value="all">所有状态</option>
          <option value="success">成功</option>
          <option value="error">失败</option>
          <option value="warning">警告</option>
        </select>

        <select
          v-model="templateFilter"
          class="filter-select"
          @change="applyFilters"
        >
          <option value="all">所有模板</option>
          <option
            v-for="template in uniqueTemplates"
            :key="template"
            :value="template"
          >
            {{ template }}
          </option>
        </select>
      </div>

      <div class="toolbar-actions">
        <button
          @click="refreshHistory"
          :disabled="loading"
          class="btn btn-sm btn-secondary"
        >
          <i class="fas fa-sync-alt"></i>
          刷新
        </button>

        <button
          @click="exportHistory"
          :disabled="!filteredHistory.length"
          class="btn btn-sm btn-primary"
        >
          <i class="fas fa-download"></i>
          导出历史
        </button>

        <button
          @click="clearHistory"
          :disabled="!filteredHistory.length"
          class="btn btn-sm btn-outline"
        >
          <i class="fas fa-trash"></i>
          清空历史
        </button>
      </div>
    </div>

    <!-- 历史统计 -->
    <div class="history-stats">
      <div class="stat-card">
        <div class="stat-value">{{ totalRenders }}</div>
        <div class="stat-label">总渲染次数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ successfulRenders }}</div>
        <div class="stat-label">成功次数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ failedRenders }}</div>
        <div class="stat-label">失败次数</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ successRate }}%</div>
        <div class="stat-label">成功率</div>
      </div>
    </div>

    <!-- 历史列表 -->
    <div class="history-list">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>加载渲染历史...</p>
      </div>

      <div v-else-if="!filteredHistory.length" class="empty-state">
        <i class="fas fa-history"></i>
        <p>{{ searchQuery ? "没有找到匹配的记录" : "暂无渲染历史" }}</p>
        <span class="hint">
          {{
            searchQuery
              ? "尝试调整搜索条件"
              : "开始渲染模板后，历史记录将显示在这里"
          }}
        </span>
      </div>

      <div v-else class="history-items">
        <div
          v-for="item in paginatedHistory"
          :key="item.id"
          class="history-item"
          :class="{
            expanded: expandedItems.has(item.id),
            selected: selectedItems.has(item.id),
          }"
        >
          <!-- 历史记录头部 -->
          <div class="item-header" @click="toggleItem(item.id)">
            <div class="item-icon">
              <i
                :class="[
                  getStatusIcon(item.status),
                  getStatusClass(item.status),
                ]"
              ></i>
            </div>

            <div class="item-info">
              <div class="item-title">
                <span class="template-name">{{ item.template_name }}</span>
                <span class="render-time">{{
                  formatTime(item.render_time)
                }}</span>
              </div>

              <div class="item-meta">
                <span class="file-count"> {{ item.files.length }} 个文件 </span>
                <span class="file-size">
                  {{ formatFileSize(getTotalSize(item.files)) }}
                </span>
                <span v-if="item.parameters_count" class="param-count">
                  {{ item.parameters_count }} 个参数
                </span>
              </div>

              <div v-if="item.error_count" class="error-summary">
                {{ item.error_count }} 个错误
              </div>
            </div>

            <div class="item-actions">
              <button
                @click.stop="selectForComparison(item.id)"
                class="btn btn-icon"
                :class="{ active: selectedItems.has(item.id) }"
                title="选择用于比较"
              >
                <i class="fas fa-balance-scale"></i>
              </button>

              <button
                @click.stop="showItemDetails(item)"
                class="btn btn-icon"
                title="查看详情"
              >
                <i class="fas fa-info-circle"></i>
              </button>

              <button
                @click.stop="rerenderItem(item)"
                class="btn btn-icon"
                title="重新渲染"
              >
                <i class="fas fa-redo"></i>
              </button>

              <button
                @click.stop="deleteItem(item.id)"
                class="btn btn-icon"
                title="删除记录"
              >
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>

          <!-- 展开的详细信息 -->
          <div v-show="expandedItems.has(item.id)" class="item-details">
            <!-- 参数信息 -->
            <div v-if="item.parameters" class="detail-section">
              <h6>渲染参数</h6>
              <div class="param-grid">
                <div
                  v-for="(value, key) in item.parameters"
                  :key="key"
                  class="param-item"
                >
                  <span class="param-key">{{ key }}</span>
                  <span class="param-value">{{ formatParamValue(value) }}</span>
                </div>
              </div>
            </div>

            <!-- 文件列表 -->
            <div class="detail-section">
              <h6>生成文件</h6>
              <div class="file-list">
                <div
                  v-for="file in item.files"
                  :key="file.filename"
                  class="file-item"
                >
                  <div class="file-icon">
                    <i :class="getFileIcon(file.filename)"></i>
                  </div>
                  <div class="file-info">
                    <span class="file-name">{{ file.filename }}</span>
                    <span class="file-size"
                      >({{ formatFileSize(file.content?.length || 0) }})</span
                    >
                  </div>
                  <div class="file-actions">
                    <button
                      @click="previewFile(file)"
                      class="btn btn-sm btn-outline"
                    >
                      预览
                    </button>
                    <button
                      @click="downloadFile(file)"
                      class="btn btn-sm btn-primary"
                    >
                      下载
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- 错误信息 -->
            <div
              v-if="item.errors && item.errors.length"
              class="detail-section"
            >
              <h6>错误信息</h6>
              <div class="error-list">
                <div
                  v-for="error in item.errors"
                  :key="error"
                  class="error-item"
                >
                  {{ error }}
                </div>
              </div>
            </div>

            <!-- 日志信息 -->
            <div v-if="item.logs && item.logs.length" class="detail-section">
              <h6>渲染日志</h6>
              <div class="log-list">
                <div
                  v-for="log in item.logs"
                  :key="log.timestamp"
                  class="log-item"
                  :class="log.level.toLowerCase()"
                >
                  <span class="log-time">{{
                    formatLogTime(log.timestamp)
                  }}</span>
                  <span class="log-level">{{ log.level }}</span>
                  <span class="log-message">{{ log.message }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 分页控制 -->
    <div v-if="totalPages > 1" class="pagination">
      <button
        @click="goToPage(currentPage - 1)"
        :disabled="currentPage === 1"
        class="btn btn-sm btn-outline"
      >
        上一页
      </button>

      <div class="page-numbers">
        <button
          v-for="page in visiblePages"
          :key="page"
          @click="goToPage(page)"
          class="btn btn-sm"
          :class="page === currentPage ? 'btn-primary' : 'btn-outline'"
        >
          {{ page }}
        </button>
      </div>

      <button
        @click="goToPage(currentPage + 1)"
        :disabled="currentPage === totalPages"
        class="btn btn-sm btn-outline"
      >
        下一页
      </button>
    </div>

    <!-- 比较面板 -->
    <div v-if="selectedItems.size >= 2" class="comparison-panel">
      <div class="comparison-header">
        <h5>比较渲染结果 ({{ selectedItems.size }} 项)</h5>
        <button @click="showComparisonDetails" class="btn btn-primary btn-sm">
          详细比较
        </button>
        <button @click="clearSelection" class="btn btn-outline btn-sm">
          清除选择
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";

// 接口定义
interface RenderHistoryItem {
  id: string;
  template_name: string;
  render_time: string;
  status: "success" | "error" | "warning";
  files: Array<{
    filename: string;
    content?: string;
    size?: number;
    errors?: string[];
  }>;
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

// Emits
const emit = defineEmits<{
  rerender: [historyItem: RenderHistoryItem];
  previewFile: [file: any];
  downloadFile: [file: any];
}>();

// 响应式数据
const history = ref<RenderHistoryItem[]>([]);
const loading = ref(false);
const searchQuery = ref("");
const dateFilter = ref("all");
const statusFilter = ref("all");
const templateFilter = ref("all");
const expandedItems = ref(new Set<string>());
const selectedItems = ref(new Set<string>());
const currentPage = ref(1);
const pageSize = ref(10);

// 防抖函数
const debounce = (fn: Function, delay: number) => {
  let timeoutId: number;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

// 计算属性
const filteredHistory = computed(() => {
  let filtered = history.value;

  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.template_name.toLowerCase().includes(query) ||
        item.files.some((file) =>
          file.filename.toLowerCase().includes(query),
        ) ||
        (item.parameters &&
          Object.keys(item.parameters).some((key) =>
            key.toLowerCase().includes(query),
          )),
    );
  }

  // 日期过滤
  if (dateFilter.value !== "all") {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    filtered = filtered.filter((item) => {
      const itemDate = new Date(item.render_time);

      switch (dateFilter.value) {
        case "today":
          return itemDate >= today;
        case "week":
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
          return itemDate >= weekAgo;
        case "month":
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
          return itemDate >= monthAgo;
        case "year":
          return itemDate.getFullYear() === now.getFullYear();
        default:
          return true;
      }
    });
  }

  // 状态过滤
  if (statusFilter.value !== "all") {
    filtered = filtered.filter((item) => item.status === statusFilter.value);
  }

  // 模板过滤
  if (templateFilter.value !== "all") {
    filtered = filtered.filter(
      (item) => item.template_name === templateFilter.value,
    );
  }

  return filtered;
});

const uniqueTemplates = computed(() => {
  const templates = new Set(history.value.map((item) => item.template_name));
  return Array.from(templates).sort();
});

const totalRenders = computed(() => history.value.length);
const successfulRenders = computed(
  () => history.value.filter((item) => item.status === "success").length,
);
const failedRenders = computed(
  () => history.value.filter((item) => item.status === "error").length,
);
const successRate = computed(() => {
  if (totalRenders.value === 0) return 0;
  return Math.round((successfulRenders.value / totalRenders.value) * 100);
});

const totalPages = computed(() =>
  Math.ceil(filteredHistory.value.length / pageSize.value),
);

const paginatedHistory = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredHistory.value.slice(start, end);
});

const visiblePages = computed(() => {
  const pages = [];
  const start = Math.max(1, currentPage.value - 2);
  const end = Math.min(totalPages.value, start + 4);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
});

// 方法
const formatTime = (time: string): string => {
  return new Date(time).toLocaleString("zh-CN");
};

const formatLogTime = (timestamp: string): string => {
  return new Date(timestamp).toLocaleTimeString("zh-CN");
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatParamValue = (value: any): string => {
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
};

const getStatusIcon = (status: string): string => {
  switch (status) {
    case "success":
      return "fas fa-check-circle";
    case "error":
      return "fas fa-times-circle";
    case "warning":
      return "fas fa-exclamation-triangle";
    default:
      return "fas fa-question-circle";
  }
};

const getStatusClass = (status: string): string => {
  switch (status) {
    case "success":
      return "text-success";
    case "error":
      return "text-error";
    case "warning":
      return "text-warning";
    default:
      return "text-muted";
  }
};

const getFileIcon = (filename: string): string => {
  const ext = filename.split(".").pop()?.toLowerCase();
  const iconMap: Record<string, string> = {
    nc: "fas fa-file-code",
    gcode: "fas fa-file-code",
    cnc: "fas fa-file-code",
    txt: "fas fa-file-alt",
    json: "fas fa-file-code",
    yaml: "fas fa-file-code",
    yml: "fas fa-file-code",
  };
  return iconMap[ext || ""] || "fas fa-file";
};

const getTotalSize = (files: any[]): number => {
  return files.reduce(
    (sum, file) => sum + (file.content?.length || file.size || 0),
    0,
  );
};

const toggleItem = (id: string) => {
  if (expandedItems.value.has(id)) {
    expandedItems.value.delete(id);
  } else {
    expandedItems.value.add(id);
  }
};

const selectForComparison = (id: string) => {
  if (selectedItems.value.has(id)) {
    selectedItems.value.delete(id);
  } else {
    selectedItems.value.add(id);
  }
};

const showItemDetails = (item: RenderHistoryItem) => {
  // 显示详细信息对话框
  ElMessage.info(`查看 ${item.template_name} 的详细渲染信息`);
};

const rerenderItem = (item: RenderHistoryItem) => {
  emit("rerender", item);
};

const deleteItem = async (id: string) => {
  try {
    await ElMessageBox.confirm("确定要删除此渲染记录吗？", "确认删除", {
      type: "warning",
    });

    const index = history.value.findIndex((item) => item.id === id);
    if (index > -1) {
      history.value.splice(index, 1);
      saveHistory();
      ElMessage.success("记录已删除");
    }
  } catch {
    // 用户取消
  }
};

const previewFile = (file: any) => {
  emit("previewFile", file);
};

const downloadFile = (file: any) => {
  emit("downloadFile", file);
};

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

const applyFilters = () => {
  currentPage.value = 1;
};

const clearSelection = () => {
  selectedItems.value.clear();
};

const showComparisonDetails = () => {
  ElMessage.info("详细比较功能开发中...");
};

const loadHistory = () => {
  try {
    const stored = localStorage.getItem("render-history");
    if (stored) {
      history.value = JSON.parse(stored);
    }
  } catch (error) {
    console.warn("加载渲染历史失败:", error);
  }
};

const saveHistory = () => {
  try {
    localStorage.setItem("render-history", JSON.stringify(history.value));
  } catch (error) {
    console.warn("保存渲染历史失败:", error);
  }
};

const refreshHistory = () => {
  loading.value = true;
  setTimeout(() => {
    loadHistory();
    loading.value = false;
    ElMessage.success("渲染历史已刷新");
  }, 1000);
};

const exportHistory = () => {
  const dataStr = JSON.stringify(history.value, null, 2);
  const dataUri =
    "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

  const exportFileDefaultName = `render-history-${new Date().toISOString().slice(0, 10)}.json`;

  const linkElement = document.createElement("a");
  linkElement.setAttribute("href", dataUri);
  linkElement.setAttribute("download", exportFileDefaultName);
  linkElement.click();

  ElMessage.success("渲染历史已导出");
};

const clearHistory = async () => {
  try {
    await ElMessageBox.confirm(
      "确定要清空所有渲染历史吗？此操作不可恢复。",
      "确认清空",
      { type: "warning" },
    );

    history.value = [];
    saveHistory();
    ElMessage.success("渲染历史已清空");
  } catch {
    // 用户取消
  }
};

// 添加历史记录
const addHistoryItem = (item: Omit<RenderHistoryItem, "id">) => {
  const historyItem: RenderHistoryItem = {
    ...item,
    id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };

  history.value.unshift(historyItem);

  // 限制历史记录数量
  if (history.value.length > 1000) {
    history.value = history.value.slice(0, 1000);
  }

  saveHistory();
};

// 防抖搜索
const debouncedSearch = debounce(() => {
  currentPage.value = 1;
}, 300);

// 监听搜索查询
watch(searchQuery, debouncedSearch);

// 公开方法
defineExpose({
  addHistoryItem,
});

// 初始化
onMounted(() => {
  loadHistory();
});
</script>

<style scoped>
.render-history {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  background: var(--vscode-editor-background);
  color: var(--vscode-editor-foreground);
}

.history-toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px;
  background: var(--vscode-panel-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 400px;
}

.search-input {
  width: 100%;
  padding: 6px 12px 6px 32px;
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  font-size: 13px;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--vscode-descriptionForeground);
}

.filter-controls {
  display: flex;
  gap: 8px;
}

.filter-select {
  padding: 4px 8px;
  border: 1px solid var(--vscode-input-border);
  border-radius: 4px;
  background: var(--vscode-input-background);
  color: var(--vscode-input-foreground);
  font-size: 13px;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.btn {
  padding: 6px 12px;
  border: 1px solid var(--vscode-button-border);
  border-radius: 4px;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.btn:hover {
  background: var(--vscode-button-hoverBackground);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-sm {
  padding: 4px 8px;
  font-size: 11px;
}

.btn-icon {
  padding: 4px;
  border: 1px solid transparent;
  background: transparent;
  min-width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: var(--vscode-toolbar-hoverBackground);
}

.btn-icon.active {
  background: var(--vscode-button-background);
  border-color: var(--vscode-button-border);
}

.btn-outline {
  background: transparent;
  border-color: var(--vscode-button-border);
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

.history-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  padding: 12px;
  background: var(--vscode-panel-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
}

.stat-card {
  text-align: center;
  padding: 12px;
  border-radius: 4px;
  background: var(--vscode-editor-background);
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: var(--vscode-foreground);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.history-list {
  flex: 1;
  overflow-y: auto;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 12px;
  opacity: 0.7;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--vscode-charts-blue);
  border-top: 3px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.history-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.history-item {
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
  overflow: hidden;
  transition: all 0.2s;
}

.history-item:hover {
  border-color: var(--vscode-focusBorder);
}

.history-item.expanded {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.history-item.selected {
  border-color: var(--vscode-button-background);
  background: var(--vscode-list-activeSelectionBackground);
}

.item-header {
  display: flex;
  align-items: center;
  padding: 12px;
  cursor: pointer;
  background: var(--vscode-editor-background);
}

.item-header:hover {
  background: var(--vscode-list-hoverBackground);
}

.item-icon {
  margin-right: 12px;
  font-size: 16px;
}

.item-info {
  flex: 1;
}

.item-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
}

.template-name {
  font-weight: 500;
  font-size: 14px;
}

.render-time {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.item-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.error-summary {
  color: var(--vscode-errorForeground);
  font-size: 12px;
  margin-top: 4px;
}

.item-actions {
  display: flex;
  gap: 4px;
}

.item-details {
  border-top: 1px solid var(--vscode-panel-border);
  background: var(--vscode-editor-background);
}

.detail-section {
  padding: 16px;
  border-bottom: 1px solid var(--vscode-panel-border);
}

.detail-section:last-child {
  border-bottom: none;
}

.detail-section h6 {
  margin: 0 0 12px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--vscode-foreground);
}

.param-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
}

.param-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px;
  background: var(--vscode-textCodeBlock-background);
  border-radius: 4px;
}

.param-key {
  font-size: 11px;
  font-weight: 500;
  color: var(--vscode-descriptionForeground);
}

.param-value {
  font-size: 12px;
  color: var(--vscode-foreground);
  word-break: break-all;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 8px;
  background: var(--vscode-textCodeBlock-background);
  border-radius: 4px;
}

.file-icon {
  margin-right: 8px;
  color: var(--vscode-descriptionForeground);
}

.file-info {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-name {
  font-size: 13px;
  font-weight: 500;
}

.file-size {
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
}

.file-actions {
  display: flex;
  gap: 6px;
}

.error-list,
.log-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.error-item,
.log-item {
  padding: 8px;
  border-radius: 4px;
  font-size: 12px;
}

.error-item {
  background: var(--vscode-inputValidation-errorBackground);
  color: var(--vscode-errorForeground);
  border-left: 3px solid var(--vscode-errorForeground);
}

.log-item {
  background: var(--vscode-terminal-background);
  border-left: 3px solid var(--vscode-terminal-border);
}

.log-time {
  color: var(--vscode-descriptionForeground);
  margin-right: 8px;
  min-width: 80px;
}

.log-level {
  font-weight: 500;
  margin-right: 8px;
  min-width: 50px;
}

.log-item.error .log-level {
  color: var(--vscode-errorForeground);
}

.log-item.warning .log-level {
  color: var(--vscode-warningForeground);
}

.log-item.info .log-level {
  color: var(--vscode-infoForeground);
}

.log-message {
  color: var(--vscode-terminal-foreground);
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 16px;
}

.page-numbers {
  display: flex;
  gap: 4px;
}

.comparison-panel {
  padding: 12px;
  background: var(--vscode-panel-background);
  border: 1px solid var(--vscode-panel-border);
  border-radius: 6px;
}

.comparison-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.comparison-header h5 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}

.text-success {
  color: var(--vscode-testing-iconPassed);
}

.text-error {
  color: var(--vscode-errorForeground);
}

.text-warning {
  color: var(--vscode-warningForeground);
}

.text-muted {
  color: var(--vscode-descriptionForeground);
}
</style>
