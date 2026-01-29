<template>
  <div class="file-tree-container">
    <!-- 头部 -->
    <div class="tree-header">
      <div class="header-left">
        <el-dropdown trigger="click" @command="handleNavigate">
          <span class="folder-selector">
            <span class="folder-icon">{{ getRootIcon() }}</span>
            <span class="folder-name">{{ rootDisplayName }}</span>
            <el-icon class="dropdown-icon"><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="packages">
                <span>📦</span> packages
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      <div class="header-actions">
        <el-tooltip
          :content="allExpanded ? '折叠全部' : '展开全部'"
          placement="top"
        >
          <el-button
            text
            size="small"
            @click="toggleExpandAll"
            :loading="loading"
          >
            <el-icon>
              <Fold v-if="!allExpanded" />
              <Expand v-else />
            </el-icon>
          </el-button>
        </el-tooltip>
        <el-tooltip content="刷新" placement="top">
          <el-button text size="small" @click="refresh" :loading="loading">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </div>

    <!-- 搜索框 -->
    <div class="search-box">
      <el-input
        v-model="searchQuery"
        placeholder="搜索文件..."
        size="small"
        clearable
        @input="handleSearch"
        @clear="handleClearSearch"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>

    <!-- 搜索结果 -->
    <div v-if="searchQuery && searchResults.length > 0" class="search-results">
      <div class="search-header">
        <span>找到 {{ searchResults.length }} 个文件</span>
        <el-button text size="small" @click="handleClearSearch">
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
      <div
        v-for="result in searchResults"
        :key="result.path"
        class="search-result-item"
        @click="handleSearchResultClick(result)"
      >
        <span class="result-icon">{{ getFileIcon(result.name) }}</span>
        <span class="result-name">{{ result.name }}</span>
        <span class="result-path">{{ getRelativePath(result.path) }}</span>
      </div>
    </div>

    <!-- 树状文件结构 -->
    <div class="tree-content" ref="treeContainer" v-show="!searchQuery">
      <!-- 加载状态 -->
      <div v-if="loading && !treeData.length" class="loading-state">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>加载中...</span>
      </div>

      <!-- 空状态 -->
      <div v-else-if="!treeData.length" class="empty-state">
        <el-icon size="48" color="#666"><FolderOpened /></el-icon>
        <p>空文件夹</p>
      </div>

      <!-- 树节点 -->
      <div v-else class="tree-root">
        <TreeNodeItem
          v-for="node in treeData"
          :key="node.path"
          :node="node"
          :depth="0"
          :selected-path="selectedPath"
          @select="handleSelect"
          @toggle="handleToggle"
          @open="handleOpen"
        />
      </div>
    </div>

    <!-- 统计信息 -->
    <div class="tree-stats" v-if="!searchQuery && treeData.length > 0">
      <span>{{ totalDirectories }} 目录, {{ totalFiles }} 文件</span>
    </div>

    <!-- 右键菜单 -->
    <Teleport to="body">
      <div
        v-if="contextMenuVisible"
        class="context-menu"
        :style="{ top: contextMenuY + 'px', left: contextMenuX + 'px' }"
        @click.stop
      >
        <div class="context-menu-item" @click="handleMenuAction('open')">
          <el-icon><Document /></el-icon>
          <span>打开</span>
        </div>
        <div class="context-menu-item" @click="handleMenuAction('edit')">
          <el-icon><Edit /></el-icon>
          <span>编辑</span>
        </div>
        <div class="context-menu-divider"></div>
        <div
          v-if="contextMenuNode?.isDirectory"
          class="context-menu-item"
          @click="handleMenuAction('newFile')"
        >
          <el-icon><DocumentAdd /></el-icon>
          <span>新建文件</span>
        </div>
        <div
          v-if="contextMenuNode?.isDirectory"
          class="context-menu-item"
          @click="handleMenuAction('newFolder')"
        >
          <el-icon><FolderAdd /></el-icon>
          <span>新建文件夹</span>
        </div>
        <div class="context-menu-divider"></div>
        <div class="context-menu-item" @click="handleMenuAction('copyPath')">
          <el-icon><CopyDocument /></el-icon>
          <span>复制路径</span>
        </div>
        <div
          class="context-menu-item danger"
          @click="handleMenuAction('delete')"
        >
          <el-icon><Delete /></el-icon>
          <span>删除</span>
        </div>
      </div>
    </Teleport>

    <!-- 新建文件/文件夹对话框 -->
    <el-dialog
      v-model="newItemDialogVisible"
      :title="newItemType === 'file' ? '新建文件' : '新建文件夹'"
      width="360px"
      append-to-body
    >
      <el-input
        v-model="newItemName"
        :placeholder="newItemType === 'file' ? '文件名.j2' : '文件夹名'"
        @keyup.enter="handleCreateItem"
      />
      <template #footer>
        <el-button @click="newItemDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreateItem">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Loading,
  Refresh,
  Fold,
  Expand,
  Search,
  Close,
  FolderOpened,
  ArrowDown,
  Document,
  Edit,
  DocumentAdd,
  FolderAdd,
  CopyDocument,
  Delete,
} from "@element-plus/icons-vue";
import TreeNodeItem from "./TreeNodeItem.vue";
import { fileApi, type FileItem } from "@/services/api";

interface TreeNodeData {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: TreeNodeData[];
  expanded?: boolean;
  loaded?: boolean;
}

const props = withDefaults(
  defineProps<{
    rootPath?: string;
    height?: string;
    showFiles?: boolean;
    extensions?: string[];
  }>(),
  {
    rootPath: "packages",
    height: "100%",
    showFiles: true,
    extensions: () => [".j2", ".jinja2", ".yaml", ".yml", ".json", ".md"],
  },
);

const emit = defineEmits<{
  "node-click": [node: FileItem];
  "file-open": [path: string];
  "path-change": [path: string];
}>();

// 状态
const loading = ref(false);
const currentPath = ref(props.rootPath);
const treeData = ref<TreeNodeData[]>([]);
const selectedPath = ref<string | null>(null);
const allExpanded = ref(true);
const searchQuery = ref("");
const searchResults = ref<FileItem[]>([]);
const treeContainer = ref<HTMLElement>();

// 右键菜单状态
const contextMenuVisible = ref(false);
const contextMenuX = ref(0);
const contextMenuY = ref(0);
const contextMenuNode = ref<TreeNodeData | null>(null);

// 新建项对话框状态
const newItemDialogVisible = ref(false);
const newItemType = ref<"file" | "folder">("file");
const newItemName = ref("");

// 统计信息
const totalDirectories = computed(() => countDirectories(treeData.value));
const totalFiles = computed(() => countFiles(treeData.value));

// 计算属性
const rootDisplayName = computed(() => {
  const parts = currentPath.value.split("/").filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : "根目录";
});

// 统计目录数量
const countDirectories = (nodes: TreeNodeData[]): number => {
  let count = 0;
  for (const node of nodes) {
    if (node.isDirectory) {
      count++;
      if (node.children) {
        count += countDirectories(node.children);
      }
    }
  }
  return count;
};

// 统计文件数量
const countFiles = (nodes: TreeNodeData[]): number => {
  let count = 0;
  for (const node of nodes) {
    if (!node.isDirectory) {
      count++;
    }
    if (node.isDirectory && node.children) {
      count += countFiles(node.children);
    }
  }
  return count;
};

// 加载目录数据
const loadDirectory = async (path: string, recursive: boolean = true) => {
  loading.value = true;
  try {
    const response = await fileApi.listFiles(path);
    if (response.data.success) {
      let files = response.data.data as FileItem[];

      // 过滤配置
      const hiddenDirs = [
        "__pycache__",
        ".git",
        "node_modules",
        "logs",
        "backups",
        "config",
        "backend",
        "dist",
        ".vscode",
        "public",
      ];

      const hiddenFiles = [
        "requirements.txt",
        "README.md",
        "LICENSE",
        ".gitignore",
        "editorconfig",
        "tsconfig.json",
        "package-lock.json",
        "yarn.lock",
        "pnpm-lock.yaml",
        "AGENTS.md",
      ];

      const packageExtensions = [
        ".j2",
        ".jinja2",
        ".yaml",
        ".yml",
        ".json",
        ".md",
      ];

      files = files.filter((f) => {
        if (f.isDirectory && hiddenDirs.includes(f.name)) {
          return false;
        }
        if (!f.isDirectory && hiddenFiles.includes(f.name)) {
          return false;
        }
        if (path.startsWith("packages") || path.startsWith("/packages")) {
          if (!f.isDirectory) {
            const ext = f.name.split(".").pop()?.toLowerCase();
            return packageExtensions.includes(`.${ext}`);
          }
        }
        return true;
      });

      const nodes: TreeNodeData[] = [];

      const directories = files
        .filter((f) => f.isDirectory)
        .sort((a, b) => a.name.localeCompare(b.name));

      const fileItems = files
        .filter((f) => !f.isDirectory)
        .sort((a, b) => a.name.localeCompare(b.name));

      // 构建目录节点
      for (const file of directories) {
        const node: TreeNodeData = {
          name: file.name,
          path: file.path,
          isDirectory: true,
          children: [],
          expanded: allExpanded.value,
          loaded: !recursive,
        };
        nodes.push(node);

        if (recursive) {
          node.children = await loadDirectoryRecursive(file.path);
        }
      }

      // 构建文件节点
      for (const file of fileItems) {
        nodes.push({
          name: file.name,
          path: file.path,
          isDirectory: false,
        });
      }

      return nodes;
    } else {
      throw new Error(response.data.error || "无法加载目录");
    }
  } catch (error) {
    console.error("加载目录失败:", error);
    ElMessage.error("加载目录失败");
    return [];
  } finally {
    loading.value = false;
  }
};

// 递归加载子目录
const loadDirectoryRecursive = async (
  path: string,
): Promise<TreeNodeData[]> => {
  const response = await fileApi.listFiles(path);
  if (!response.data.success) {
    return [];
  }

  let files = response.data.data as FileItem[];

  const hiddenDirs = [
    "__pycache__",
    ".git",
    "node_modules",
    "logs",
    "backups",
    "config",
    "backend",
    "dist",
    ".vscode",
    "public",
  ];

  const hiddenFiles = [
    "requirements.txt",
    "README.md",
    "LICENSE",
    ".gitignore",
    "editorconfig",
    "tsconfig.json",
    "package-lock.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "AGENTS.md",
  ];

  const packageExtensions = [".j2", ".jinja2", ".yaml", ".yml", ".json", ".md"];

  files = files.filter((f) => {
    if (f.isDirectory && hiddenDirs.includes(f.name)) {
      return false;
    }
    if (!f.isDirectory && hiddenFiles.includes(f.name)) {
      return false;
    }
    if (path.startsWith("packages") || path.startsWith("/packages")) {
      if (!f.isDirectory) {
        const ext = f.name.split(".").pop()?.toLowerCase();
        return packageExtensions.includes(`.${ext}`);
      }
    }
    return true;
  });

  const nodes: TreeNodeData[] = [];

  const directories = files
    .filter((f) => f.isDirectory)
    .sort((a, b) => a.name.localeCompare(b.name));

  const fileItems = files
    .filter((f) => !f.isDirectory)
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const file of directories) {
    const node: TreeNodeData = {
      name: file.name,
      path: file.path,
      isDirectory: true,
      children: await loadDirectoryRecursive(file.path),
      expanded: allExpanded.value,
      loaded: true,
    };
    nodes.push(node);
  }

  for (const file of fileItems) {
    nodes.push({
      name: file.name,
      path: file.path,
      isDirectory: false,
    });
  }

  return nodes;
};

// 刷新
const refresh = async () => {
  treeData.value = [];
  allExpanded.value = true;
  await loadAll();
  ElMessage.success("已刷新");
};

// 加载全部
const loadAll = async () => {
  loading.value = true;
  treeData.value = await loadDirectory(props.rootPath, true);
  loading.value = false;
};

// 切换展开/折叠
const toggleExpandAll = () => {
  allExpanded.value = !allExpanded.value;
  toggleExpandAllRecursive(treeData.value, allExpanded.value);
};

const toggleExpandAllRecursive = (nodes: TreeNodeData[], expanded: boolean) => {
  for (const node of nodes) {
    node.expanded = expanded;
    if (node.children) {
      toggleExpandAllRecursive(node.children, expanded);
    }
  }
};

// 获取根目录图标
const getRootIcon = (): string => {
  return "📦";
};

// 获取文件图标
const getFileIcon = (name: string): string => {
  const ext = name.split(".").pop()?.toLowerCase();
  const iconMap: Record<string, string> = {
    j2: "📄",
    jinja2: "📄",
    yaml: "⚙️",
    yml: "⚙️",
    json: "{ }",
    md: "📝",
    txt: "📃",
  };
  return iconMap[ext || ""] || "📄";
};

// 获取相对路径
const getRelativePath = (path: string): string => {
  if (path.startsWith("packages/")) {
    return path.replace("packages/", "");
  }
  return path;
};

// 处理选择
const handleSelect = (node: FileItem) => {
  selectedPath.value = node.path;
  emit("node-click", node);
};

// 处理展开/折叠
const handleToggle = (node: TreeNodeData) => {
  node.expanded = !node.expanded;
};

// 处理打开文件
const handleOpen = (node: TreeNodeData) => {
  if (!node.isDirectory) {
    selectedPath.value = node.path;
    emit("file-open", node.path);
  }
};

// 导航到路径
const handleNavigate = async (command: string) => {
  currentPath.value = command;
  allExpanded.value = true;
  emit("path-change", command);
  await loadAll();
};

// 搜索
const handleSearch = async () => {
  if (!searchQuery.value.trim()) {
    searchResults.value = [];
    return;
  }

  try {
    const response = await fileApi.searchFiles(
      props.rootPath,
      searchQuery.value,
      true,
    );
    if (response.data.success) {
      searchResults.value = response.data.data.filter((f: FileItem) => {
        const ext = f.name.split(".").pop()?.toLowerCase();
        return [".j2", ".jinja2", ".yaml", ".yml", ".json", ".md"].includes(
          `.${ext}`,
        );
      });
    }
  } catch (error) {
    console.error("搜索失败:", error);
  }
};

// 清除搜索
const handleClearSearch = () => {
  searchQuery.value = "";
  searchResults.value = [];
};

// 点击搜索结果
const handleSearchResultClick = async (result: FileItem) => {
  allExpanded.value = true;
  await loadAll();
  selectedPath.value = result.path;
  emit("file-open", result.path);
  handleClearSearch();
};

// 右键菜单
const handleContextMenu = (event: MouseEvent, node: TreeNodeData | null) => {
  contextMenuX.value = event.clientX;
  contextMenuY.value = event.clientY;
  contextMenuNode.value = node;
  contextMenuVisible.value = true;
};

// 点击其他地方关闭菜单
const handleClickOutside = () => {
  contextMenuVisible.value = false;
};

// 菜单操作
const handleMenuAction = async (action: string) => {
  contextMenuVisible.value = false;

  if (!contextMenuNode.value) return;

  const node = contextMenuNode.value;

  switch (action) {
    case "open":
    case "edit":
      if (!node.isDirectory) {
        emit("file-open", node.path);
      }
      break;

    case "newFile":
      newItemType.value = "file";
      newItemName.value = "";
      newItemDialogVisible.value = true;
      break;

    case "newFolder":
      newItemType.value = "folder";
      newItemName.value = "";
      newItemDialogVisible.value = true;
      break;

    case "copyPath":
      await navigator.clipboard.writeText(node.path);
      ElMessage.success("路径已复制到剪贴板");
      break;

    case "delete":
      try {
        await ElMessageBox.confirm(
          `确定要删除 "${node.name}" 吗？`,
          "删除确认",
          {
            confirmButtonText: "删除",
            cancelButtonText: "取消",
            type: "warning",
          },
        );
        await fileApi.deleteFile(node.path, node.isDirectory);
        ElMessage.success("删除成功");
        await loadAll();
      } catch {
        // 用户取消
      }
      break;
  }
};

// 创建新文件/文件夹
const handleCreateItem = async () => {
  if (!newItemName.value.trim()) {
    ElMessage.warning("请输入名称");
    return;
  }

  try {
    const parentPath = contextMenuNode.value?.isDirectory
      ? contextMenuNode.value.path
      : currentPath.value;

    const fullPath = `${parentPath}/${newItemName.value}`;

    await fileApi.createPath(
      fullPath,
      newItemType.value === "folder",
      newItemType.value === "file" ? "# 新文件\n" : "",
    );

    ElMessage.success(
      `${newItemType.value === "file" ? "文件" : "文件夹"}创建成功`,
    );
    newItemDialogVisible.value = false;
    await loadAll();
  } catch (error) {
    console.error("创建失败:", error);
    ElMessage.error("创建失败");
  }
};

// 暴露方法
defineExpose({
  refresh,
  collapseAll: () => {
    allExpanded.value = false;
    toggleExpandAllRecursive(treeData.value, false);
  },
  expandAll: () => {
    allExpanded.value = true;
    toggleExpandAllRecursive(treeData.value, true);
  },
  selectFile: (path: string) => {
    selectedPath.value = path;
  },
});

// 生命周期
onMounted(async () => {
  await loadAll();
  document.addEventListener("click", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("click", handleClickOutside);
});
</script>

<style scoped>
.file-tree-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #252526;
  border-radius: 8px;
  overflow: hidden;
}

.tree-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: #2d2d2d;
  border-bottom: 1px solid #3c3c3c;
}

.header-left {
  display: flex;
  align-items: center;
}

.folder-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.folder-selector:hover {
  background: #3c3c3c;
}

.folder-icon {
  font-size: 16px;
}

.folder-name {
  font-weight: 500;
  color: #e0e0e0;
  font-size: 13px;
}

.dropdown-icon {
  font-size: 12px;
  color: #969696;
}

.header-actions {
  display: flex;
  gap: 0.25rem;
}

.header-actions .el-button {
  color: #969696;
}

.header-actions .el-button:hover {
  color: #e0e0e0;
  background: #3c3c3c;
}

.search-box {
  padding: 0.5rem 0.75rem;
  background: #2d2d2d;
  border-bottom: 1px solid #3c3c3c;
}

.search-box :deep(.el-input__wrapper) {
  background: #1e1e1e;
  border: 1px solid #3c3c3c;
  box-shadow: none;
}

.search-box :deep(.el-input__wrapper:hover) {
  border-color: #4a4a4a;
}

.search-box :deep(.el-input__inner) {
  color: #e0e0e0;
}

.search-box :deep(.el-input__prefix) {
  color: #666;
}

.search-results {
  background: #1e1e1e;
  border-bottom: 1px solid #3c3c3c;
  max-height: 200px;
  overflow-y: auto;
}

.search-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: #2d2d2d;
  font-size: 12px;
  color: #969696;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  transition: background-color 0.2s;
}

.search-result-item:hover {
  background: #37373d;
}

.result-icon {
  font-size: 14px;
}

.result-name {
  color: #e0e0e0;
  font-size: 13px;
}

.result-path {
  color: #666;
  font-size: 11px;
  margin-left: auto;
}

.tree-content {
  flex: 1;
  overflow-y: auto;
  padding: 0.25rem 0;
}

.tree-content::-webkit-scrollbar {
  width: 8px;
}

.tree-content::-webkit-scrollbar-track {
  background: #1e1e1e;
}

.tree-content::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 4px;
}

.tree-root {
  padding: 0.25rem 0;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #666;
  gap: 0.5rem;
}

.tree-stats {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: #2d2d2d;
  border-top: 1px solid #3c3c3c;
  font-size: 11px;
  color: #666;
}

/* 右键菜单样式 */
.context-menu {
  position: fixed;
  background: #2d2d2d;
  border: 1px solid #3c3c3c;
  border-radius: 6px;
  padding: 4px 0;
  min-width: 160px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  z-index: 9999;
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  cursor: pointer;
  color: #e0e0e0;
  font-size: 13px;
  transition: background-color 0.2s;
}

.context-menu-item:hover {
  background: #37373d;
}

.context-menu-item.danger {
  color: #f56c6c;
}

.context-menu-item.danger:hover {
  background: rgba(245, 108, 108, 0.1);
}

.context-menu-divider {
  height: 1px;
  background: #3c3c3c;
  margin: 4px 0;
}

.context-menu-item .el-icon {
  font-size: 14px;
  color: #969696;
}

.context-menu-item.danger .el-icon {
  color: #f56c6c;
}
</style>
