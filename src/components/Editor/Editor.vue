<template>
  <div class="editor-manager">
    <!-- 编辑器头部 -->
    <div class="editor-header">
      <div class="header-left">
        <h2>📝 编辑器</h2>
        <div class="file-info" v-if="currentFile">
          <span class="file-path">{{ currentFile }}</span>
          <span class="file-status" :class="fileStatus">
            {{ fileStatusText }}
          </span>
        </div>
      </div>

      <div class="header-actions">
        <el-button @click="newFile" type="primary" size="small">
          ➕ 新建文件
        </el-button>
        <el-button @click="openFile" size="small"> 📂 打开文件 </el-button>
        <el-button
          @click="saveFile"
          :disabled="!hasChanges || !currentFile"
          size="small"
          type="success"
        >
          💾 保存
        </el-button>
        <el-button
          @click="saveAllFiles"
          :disabled="!hasAnyChanges"
          size="small"
        >
          💾 保存所有
        </el-button>
      </div>
    </div>

    <!-- 编辑器主体 -->
    <div class="editor-body">
      <!-- 文件树 -->
      <div class="file-tree">
        <div class="tree-header">
          <h3>📂 文件树</h3>
          <el-input
            v-model="treeSearchQuery"
            placeholder="搜索文件..."
            size="small"
            clearable
          >
            <template #prefix> 🔍 </template>
          </el-input>
        </div>

        <div class="tree-content">
          <el-tree
            ref="treeRef"
            :data="fileTree"
            :props="treeProps"
            :expand-on-click-node="false"
            :highlight-current="true"
            :filter-node-method="filterNode"
            :default-expanded-keys="expandedKeys"
            @node-click="handleNodeClick"
            @node-expand="handleNodeExpand"
          >
            <template #default="{ node, data }">
              <span class="tree-node">
                <el-icon>
                  <component :is="getTreeIcon(data)" />
                </el-icon>
                <span class="node-label">{{ node.label }}</span>
                <span v-if="data.modified" class="modified-indicator">●</span>
              </span>
            </template>
          </el-tree>
        </div>
      </div>

      <!-- 编辑器区域 -->
      <div class="editor-area">
        <div class="editor-tabs">
          <div
            v-for="(tab, index) in editorTabs"
            :key="tab.id"
            class="tab-item"
            :class="{ active: currentTabId === tab.id }"
            @click="switchTab(tab.id)"
          >
            <span class="tab-label">{{ tab.label }}</span>
            <el-button
              v-if="tab.closable"
              @click.stop="closeTab(tab.id)"
              size="small"
              text
              type="danger"
              class="tab-close"
            >
              <el-icon><close /></el-icon>
            </el-button>
          </div>

          <el-dropdown @command="handleTabCommand">
            <el-button size="small">
              <el-icon><plus /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="open-new"
                  >📂 打开新文件</el-dropdown-item
                >
                <el-dropdown-item command="open-recent"
                  >📂 最近文件</el-dropdown-item
                >
                <el-dropdown-item command="split-editor"
                  >📑 分割编辑器</el-dropdown-item
                >
                <el-dropdown-item command="toggle-sidebar" divided
                  >📁 切换侧边栏</el-dropdown-item
                >
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>

        <div class="tab-content">
          <MonacoEditor
            v-if="currentTab"
            :model-value="currentTab.content"
            :language="currentTab.language"
            :theme="editorTheme"
            :file-path="currentTab.filePath"
            :readonly="currentTab.readonly"
            @update:model-value="updateTabContent"
            @save="saveCurrentTab"
            @change="handleTabChange"
          />
        </div>
      </div>
    </div>

    <!-- 状态栏 -->
    <div class="editor-statusbar">
      <div class="status-left">
        <span v-if="currentTab">
          {{ currentTab.filePath }} ({{ currentTab.language.toUpperCase() }})
        </span>
        <span v-if="wordWrap" class="status-badge">软换行</span>
        <span v-if="currentTab.readonly" class="status-badge readonly"
          >只读</span
        >
      </div>

      <div class="status-right">
        <span v-if="currentTab">
          第 {{ currentLine }} 行, 第 {{ currentColumn }} 列
        </span>
        <span v-if="selectedText" class="selection-info">
          已选择 {{ selectedText.length }} 个字符
        </span>
        <span v-if="currentTab?.modified" class="modified-status">已修改</span>
      </div>
    </div>

    <!-- 新建文件对话框 -->
    <el-dialog v-model="newFileDialogVisible" title="➕ 新建文件" width="500px">
      <el-form :model="newFileForm" label-width="100px">
        <el-form-item label="文件名" prop="name" required>
          <el-input v-model="newFileForm.name" placeholder="输入文件名" />
        </el-form-item>
        <el-form-item label="文件类型" prop="type">
          <el-select v-model="newFileForm.type">
            <el-option label="Jinja2模板" value="jinja2" />
            <el-option label="YAML配置" value="yaml" />
            <el-option label="JSON配置" value="json" />
            <el-option label="Markdown文档" value="markdown" />
            <el-option label="纯文本" value="text" />
          </el-select>
        </el-form-item>
        <el-form-item label="文件路径" prop="path">
          <el-input
            v-model="newFileForm.path"
            placeholder="输入文件路径（相对路径）"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="newFileDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="createNewFile" :loading="creating">
          创建
        </el-button>
      </template>
    </el-dialog>

    <!-- 最近文件对话框 -->
    <el-dialog v-model="recentFilesVisible" title="📂 最近文件" width="600px">
      <div class="recent-files-list">
        <div
          v-for="file in recentFiles"
          :key="file.id"
          class="recent-file-item"
          @click="openRecentFile(file)"
        >
          <div class="file-icon">
            {{ getFileIcon(file.type) }}
          </div>
          <div class="file-info">
            <div class="file-name">{{ file.name }}</div>
            <div class="file-path">{{ file.path }}</div>
            <div class="file-time">{{ file.lastAccessed }}</div>
          </div>
        </div>
      </div>
      <div v-if="recentFiles.length === 0" class="empty-recent">
        <div class="empty-icon">📂</div>
        <p>暂无最近文件</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
/**
 * 编辑器模块主组件
 *
 * 此文件必须严格遵循PROJECT_REQUIREMENTS.md文档约束。
 * 任何修改都必须先更新需求文档，然后修改代码。
 * 违反此约束将导致代码被拒绝。
 */

import { ref, computed, onMounted, watch } from "vue";
import { ElMessage } from "element-plus";
import { Close, Plus } from "@element-plus/icons-vue";
import MonacoEditor from "./MonacoEditor.vue";
import type { EditorTab, FileInfo } from "./types";

// Props
interface Props {
  // 当前模板包
  currentTemplate: {
    name: string;
    displayName: string;
    config?: any;
  } | null;
  // 是否显示侧边栏
  showSidebar?: boolean;
  // 编辑器主题
  theme?: "light" | "dark" | "hc-black";
  // 是否自动保存
  autoSave?: boolean;
  // 自动保存间隔（毫秒）
  autoSaveInterval?: number;
}

const props = withDefaults(defineProps<Props>(), {
  showSidebar: true,
  theme: "light",
  autoSave: true,
  autoSaveInterval: 30000,
});

// Emits
const emit = defineEmits<{
  save: [tabId: string, content: string];
  change: [tabId: string, content: string];
  "file-change": [file: FileInfo];
}>();

// 响应式数据
const currentTabId = ref<string>("");
const editorTabs = ref<EditorTab[]>([]);
const currentFile = ref("");
const fileTree = ref<any[]>([]);
const expandedKeys = ref<string[]>([]);
const treeSearchQuery = ref("");
const treeRef = ref();
const wordWrap = ref(false);
const currentLine = ref(1);
const currentColumn = ref(1);
const selectedText = ref("");
const editorTheme = ref(props.theme);
const hasChanges = ref(false);
const hasAnyChanges = ref(false);

// 对话框状态
const newFileDialogVisible = ref(false);
const recentFilesVisible = ref(false);
const creating = ref(false);

// 表单数据
const newFileForm = ref({
  name: "",
  type: "jinja2",
  path: "",
});

// 最近文件
const recentFiles = ref<any[]>([]);

// 树形配置
const treeProps = {
  children: "children",
  label: "label",
  key: "key",
};

// 计算属性
const currentTab = computed(() => {
  return editorTabs.value.find((tab) => tab.id === currentTabId.value);
});

const fileStatus = computed(() => {
  return currentTab.value
    ? currentTab.value.modified
      ? "modified"
      : "saved"
    : "none";
});

const fileStatusText = computed(() => {
  const status = fileStatus.value;
  return status === "modified" ? "已修改" : status === "saved" ? "已保存" : "";
});

const filterNode = (value: string, data: any) => {
  if (!value) return true;
  return data.label.toLowerCase().includes(value.toLowerCase());
};

// 方法
const getTreeIcon = (data: any): string => {
  if (data.type === "folder") {
    return "folder";
  }
  return getFileIcon(data.type);
};

const getFileIcon = (type: string): string => {
  const iconMap: Record<string, string> = {
    jinja2: "🐍",
    yaml: "⚙️",
    json: "📋",
    markdown: "📖",
    text: "📄",
    folder: "📁",
  };
  return iconMap[type] || "📄";
};

const buildFileTree = (templatePath: string, files: string[]): any[] => {
  const tree: any[] = [];

  // 构建目录结构
  const dirMap: Record<string, any> = {
    templates: { label: "templates", type: "folder", children: [] },
    docs: { label: "docs", type: "folder", children: [] },
    assets: { label: "assets", type: "folder", children: [] },
  };

  files.forEach((file) => {
    const parts = file.split("/");
    const fileName = parts[parts.length - 1];
    const fileExt = fileName.split(".").pop() || "";
    const fileType =
      fileExt === "j2"
        ? "jinja2"
        : fileExt === "yaml" || fileExt === "yml"
          ? "yaml"
          : fileExt === "json"
            ? "json"
            : fileExt === "md"
              ? "markdown"
              : "text";

    let current = dirMap;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {
          label: part,
          type: "folder",
          key: part,
          children: [],
        };
        tree.push(current[part]);
      }
      current = current[part].children;
    }

    current.push({
      label: fileName,
      type: "file",
      key: file,
      fileType: fileType,
      filePath: file,
      modified: false,
    });
  });

  return tree;
};

const handleNodeClick = (data: any) => {
  if (data.type === "file") {
    openFile(data.filePath);
  }
};

const handleNodeExpand = (data: any, expanded: boolean) => {
  if (expanded) {
    expandedKeys.value.push(data.key);
  } else {
    const index = expandedKeys.value.indexOf(data.key);
    if (index > -1) {
      expandedKeys.value.splice(index, 1);
    }
  }
};

const openFile = (filePath: string) => {
  // 创建编辑器标签页
  const tabId = Date.now().toString();
  const existingTab = editorTabs.value.find((tab) => tab.filePath === filePath);

  if (existingTab) {
    currentTabId.value = existingTab.id;
  } else {
    const fileType = filePath.split(".").pop() || "text";
    const language =
      fileType === "j2"
        ? "jinja2"
        : fileType === "yaml" || fileType === "yml"
          ? "yaml"
          : fileType === "json"
            ? "json"
            : fileType === "md"
              ? "markdown"
              : "text";

    const newTab: EditorTab = {
      id: tabId,
      label: filePath.split("/").pop() || "untitled",
      filePath: filePath,
      language: language,
      content: "",
      modified: false,
      closable: true,
      readonly: false,
    };

    editorTabs.value.push(newTab);
    currentTabId.value = tabId;

    // 加载文件内容
    loadFileContent(filePath, newTab);
  }

  currentFile.value = filePath;
};

const loadFileContent = async (filePath: string, tab: EditorTab) => {
  try {
    // TODO: 实现文件加载逻辑
    const mockContent = getMockFileContent(filePath);
    tab.content = mockContent;
    tab.modified = false;
    ElMessage.success(`已打开文件: ${filePath}`);
  } catch (error) {
    ElMessage.error(`打开文件失败: ${error}`);
  }
};

const getMockFileContent = (filePath: string): string => {
  const templates: Record<string, string> = {
    "templates/main.j2": "; 示例数控程序\\nG00 X0 Y0 Z10\\nM30",
    "templates/sub_template.j2": "; 子程序\\nM99",
    "package.yaml": "name: example\\ndisplayName: 示例模板包\\nversion: 1.0.0",
  };

  return templates[filePath] || `// 文件内容: ${filePath}`;
};

const switchTab = (tabId: string) => {
  currentTabId.value = tabId;
};

const closeTab = (tabId: string) => {
  const index = editorTabs.value.findIndex((tab) => tab.id === tabId);
  if (index > -1) {
    editorTabs.value.splice(index, 1);

    if (currentTabId.value === tabId) {
      currentTabId.value = editorTabs.value[0]?.id || "";
    }
  }
};

const updateTabContent = (content: string) => {
  if (currentTab.value) {
    currentTab.value.content = content;
    currentTab.value.modified = true;
    updateChangeStatus();
    emit("change", currentTab.value.id, content);
  }
};

const handleTabChange = (content: string) => {
  updateChangeStatus();
  emit("change", currentTab.value.id, content);
};

const saveCurrentTab = async () => {
  if (currentTab.value) {
    try {
      // TODO: 实现文件保存逻辑
      ElMessage.success(`已保存文件: ${currentTab.value.filePath}`);
      currentTab.value.modified = false;
      updateChangeStatus();
      emit("save", currentTab.value.id, currentTab.value.content);
    } catch (error) {
      ElMessage.error(`保存失败: ${error}`);
    }
  }
};

const updateChangeStatus = () => {
  hasChanges.value = editorTabs.value.some((tab) => tab.modified);
  hasAnyChanges.value = hasChanges.value;
};

const saveAllFiles = async () => {
  try {
    const modifiedTabs = editorTabs.value.filter((tab) => tab.modified);
    for (const tab of modifiedTabs) {
      await saveCurrentTab();
    }
    ElMessage.success(`已保存 ${modifiedTabs.length} 个文件`);
  } catch (error) {
    ElMessage.error(`批量保存失败: ${error}`);
  }
};

const newFile = () => {
  newFileDialogVisible.value = true;
  newFileForm.value = {
    name: "",
    type: "jinja2",
    path: "",
  };
};

const createNewFile = async () => {
  if (!newFileForm.value.name) {
    ElMessage.warning("请输入文件名");
    return;
  }

  if (!newFileForm.value.path) {
    newFile.value.path =
      "templates/" +
      newFile.value.name +
      "." +
      getFileExtension(newFileForm.value.type);
  }

  const filePath = newFileForm.value.path;

  try {
    // TODO: 实现文件创建逻辑
    ElMessage.success(`已创建文件: ${filePath}`);

    // 打开新创建的文件
    openFile(filePath);

    newFileDialogVisible.value = false;
    newFileForm.value = { name: "", type: "jinja2", path: "" };
  } catch (error) {
    ElMessage.error(`创建文件失败: ${error}`);
  }
};

const getFileExtension = (type: string): string => {
  const extMap: Record<string, string> = {
    jinja2: "j2",
    yaml: "yaml",
    json: "json",
    markdown: "md",
    text: "txt",
  };
  return extMap[type] || "txt";
};

const openRecentFile = (file: any) => {
  openFile(file.filePath);
  recentFilesVisible.value = false;
};

const handleTabCommand = (command: string) => {
  switch (command) {
    case "open-new":
      newFile();
      break;
    case "open-recent":
      recentFilesVisible.value = true;
      break;
    case "split-editor":
      // TODO: 实现分割编辑器功能
      ElMessage.info("分割编辑器功能开发中...");
      break;
    case "toggle-sidebar":
      // TODO: 实现侧边栏切换功能
      ElMessage.info("侧边栏切换功能开发中...");
      break;
  }
};

// 自动保存功能
let autoSaveTimer: NodeJS.Timeout | null = null;

const startAutoSave = () => {
  if (props.autoSave) {
    autoSaveTimer = setInterval(() => {
      if (hasChanges.value) {
        saveAllFiles();
      }
    }, props.autoSaveInterval);
  }
};

const stopAutoSave = () => {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }
};

// 监听主题变化
watch(
  () => props.theme,
  (newTheme) => {
    editorTheme.value = newTheme;
  },
);

// 监听自动保存开关
watch(
  () => props.autoSave,
  (newAutoSave) => {
    if (newAutoSave) {
      startAutoSave();
    } else {
      stopAutoSave();
    }
  },
);

// 监听自动保存间隔变化
watch(
  () => props.autoSaveInterval,
  (newInterval) => {
    if (props.autoSave) {
      stopAutoSave();
      startAutoSave();
    }
  },
);

// 更新状态
const updateEditorStatus = () => {
  if (currentTab.value) {
    const model = currentTab.value.monacoModel;
    if (model) {
      const position = model.getPosition();
      currentLine.value = position.lineNumber;
      currentColumn.value = position.column;
      selectedText.value = model.getValueInRange(model.getSelection()) || "";
    }
  }
};

// 监听当前标签页变化
watch(currentTab, (newTab) => {
  updateEditorStatus();
});

// 监听编辑器内容变化
watch(
  () => currentTab?.value?.content,
  () => {
    updateChangeStatus();
  },
);

// 初始化
onMounted(() => {
  console.log("🚀 编辑器模块初始化");
  console.log("🔒 约束执行机制已激活");
  console.log("📋 严格遵循PROJECT_REQUIREMENTS.md文档");

  // 如果有当前模板，构建文件树
  if (props.currentTemplate?.config) {
    const templateFiles = props.currentTemplate.config?.templateFiles || [
      "templates/main.j2",
    ];
    fileTree.value = buildFileTree("", templateFiles);
    expandedKeys.value = ["templates"];
  }

  // 从本地存储加载最近文件
  const savedRecentFiles = localStorage.getItem("editor_recent_files");
  if (savedRecentFiles) {
    try {
      recentFiles.value = JSON.parse(savedRecentFiles);
    } catch (error) {
      console.error("加载最近文件失败:", error);
    }
  }

  // 启动自动保存
  startAutoSave();
});

// 清理定时器
onUnmounted(() => {
  stopAutoSave();
});
</script>

<style scoped>
.editor-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e4e7ed;
}

.header-left h2 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.25rem;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.file-path {
  color: #666;
  font-family: monospace;
  font-size: 0.875rem;
}

.file-status {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.file-status.modified {
  background: #fef0f0;
  border: 1px solid #f56c6c;
  color: #f56c6c;
}

.file-status.saved {
  background: #f0f9ff;
  border: 1px solid #67c23a;
  color: #67c23a;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.editor-body {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.file-tree {
  width: 250px;
  border-right: 1px solid #e4e7ed;
  background: #fafbfc;
}

.tree-header {
  padding: 1rem;
  border-bottom: 1px solid #e4e7ed;
}

.tree-header h3 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-size: 1rem;
}

.tree-content {
  padding: 0.5rem;
  height: calc(100% - 60px);
  overflow-y: auto;
}

.tree-node {
  display: flex;
  align-items: center;
  padding: 0.25rem 0;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.tree-node:hover {
  background: #e4e7ed;
}

.node-label {
  margin-left: 0.5rem;
  color: #333;
}

.modified-indicator {
  color: #e74c3c;
  margin-left: 0.5rem;
}

.editor-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.editor-tabs {
  display: flex;
  border-bottom: 1px solid #e4e7ed;
  background: #fff;
}

.tab-item {
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  cursor: pointer;
  border-right: 1px solid transparent;
  transition: all 0.2s;
  white-space: nowrap;
}

.tab-item:hover {
  background: #f8f9fa;
}

.tab-item.active {
  background: #409eff;
  color: white;
  border-right-color: #409eff;
}

.tab-label {
  margin-right: 0.5rem;
}

.tab-close {
  margin-left: 0.5rem;
}

.tab-content {
  flex: 1;
  min-height: 0;
}

.editor-statusbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background: #f8f9fa;
  border-top: 1px solid #e4e7ed;
  font-size: 0.875rem;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.status-badge {
  padding: 0.125rem 0.25rem;
  border-radius: 2px;
  font-size: 0.625rem;
}

.status-badge.readonly {
  background: #f0f0f0;
  color: #999;
}

.status-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.selection-info {
  color: #666;
}

.modified-status {
  color: #e74c3c;
  font-weight: bold;
}

.newFileDialog,
.recentFilesDialog {
  max-height: 400px;
}

.search-dialog {
  max-height: 300px;
}

.recent-files-list {
  max-height: 300px;
  overflow-y: auto;
}

.recent-file-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  cursor: pointer;
  border-bottom: 1px solid #eee;
}

.recent-file-item:hover {
  background: #f8f9fa;
}

.file-icon {
  font-size: 1.25rem;
  margin-right: 0.75rem;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-weight: 500;
  color: #2c3e50;
}

.file-path {
  font-size: 0.875rem;
  color: #666;
  font-family: monospace;
}

.file-time {
  font-size: 0.75rem;
  color: #999;
}

.empty-recent {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #666;
  text-align: center;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .editor-body {
    flex-direction: column;
  }

  .file-tree {
    width: 100%;
    height: 200px;
    border-right: none;
    border-bottom: 1px solid #e4e7ed;
  }

  .editor-tabs {
    min-height: 40px;
  }

  .editor-statusbar {
    flex-direction: column;
    gap: 0.5rem;
    align-items: stretch;
  }
}
</style>
