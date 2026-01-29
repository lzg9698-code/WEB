<template>
  <div class="editor-tabs-container">
    <!-- 标签栏 -->
    <div class="tabs-bar">
      <div class="tabs-scroll">
        <div
          v-for="tab in tabs"
          :key="tab.path"
          class="tab"
          :class="{
            active: activeTabPath === tab.path,
            modified: tab.modified,
          }"
          @click="activateTab(tab.path)"
        >
          <span class="tab-icon">{{ getFileIcon(tab.path) }}</span>
          <span class="tab-name">{{ tab.name }}</span>
          <span v-if="tab.modified" class="modified-dot">●</span>
          <span
            class="tab-close"
            @click.stop="closeTab(tab.path)"
            @mousedown.stop
          >
            ×
          </span>
        </div>
      </div>

      <div class="tabs-actions">
        <el-dropdown @command="handleTabAction" trigger="click">
          <el-button size="small" text>
            <el-icon><MoreFilled /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item
                command="closeAll"
                :disabled="tabs.length === 0"
              >
                关闭全部
              </el-dropdown-item>
              <el-dropdown-item
                command="closeOthers"
                :disabled="tabs.length <= 1"
              >
                关闭其他
              </el-dropdown-item>
              <el-dropdown-item
                command="closeSaved"
                :disabled="!tabs.some((t) => t.modified)"
              >
                关闭已保存
              </el-dropdown-item>
              <el-dropdown-item divided command="saveAll">
                保存全部
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 编辑器区域 -->
    <div class="editor-area" v-if="activeTab">
      <MonacoEditor
        :model-value="activeTab.content"
        :file-path="activeTab.path"
        :language="detectLanguage(activeTab.path)"
        theme="dark"
        :show-toolbar="true"
        :show-status-bar="true"
        :show-format-button="true"
        :height="editorHeight"
        @update:model-value="updateActiveTabContent($event)"
        @save="saveActiveTab"
      />
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <div class="empty-icon">📝</div>
      <h3>选择一个文件开始编辑</h3>
      <p>从文件树中选择一个模板文件或配置文件</p>
      <el-button type="primary" @click="$emit('openFileTree')">
        打开文件树
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { MoreFilled } from "@element-plus/icons-vue";
import MonacoEditor from "./MonacoEditor.vue";
import { fileApi } from "@/services/api";

interface Tab {
  path: string;
  name: string;
  content: string;
  modified: boolean;
  encoding: string;
}

const props = defineProps<{
  packageName?: string;
  initialPath?: string;
  editorHeight?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [tabs: Tab[]];
  save: [path: string, content: string];
  "file-changed": [path: string];
  openFileTree: [];
}>();

// 状态
const tabs = ref<Tab[]>([]);
const activeTabPath = ref<string | null>(null);
const loading = ref(false);

// 计算属性
const activeTab = computed(() => {
  return tabs.value.find((t) => t.path === activeTabPath.value) || null;
});

// 根据文件路径获取图标
const getFileIcon = (path: string): string => {
  const ext = path.split(".").pop()?.toLowerCase();
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

// 检测语言
const detectLanguage = (path: string): string => {
  const ext = path.split(".").pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    j2: "jinja2",
    jinja2: "jinja2",
    yaml: "yaml",
    yml: "yaml",
    json: "json",
    md: "markdown",
    txt: "text",
  };
  return languageMap[ext || ""] || "jinja2";
};

// 打开文件
const openFile = async (path: string) => {
  // 检查是否已打开
  const existingTab = tabs.value.find((t) => t.path === path);
  if (existingTab) {
    activateTab(path);
    return;
  }

  // 加载文件
  loading.value = true;
  try {
    const response = await fileApi.readFile(path);
    if (response.data.success) {
      const tab: Tab = {
        path: path,
        name: path.split("/").pop() || path,
        content: response.data.data.content,
        modified: false,
        encoding: response.data.data.encoding || "utf-8",
      };

      tabs.value.push(tab);
      activateTab(path);
      ElMessage.success(`已打开: ${tab.name}`);
    } else {
      throw new Error(response.data.error || "无法读取文件");
    }
  } catch (error) {
    console.error("打开文件失败:", error);
    ElMessage.error("打开文件失败");
  } finally {
    loading.value = false;
  }
};

// 激活标签
const activateTab = (path: string) => {
  // 保存当前标签内容
  if (activeTabPath.value && activeTab.value) {
    const currentTab = tabs.value.find((t) => t.path === activeTabPath.value);
    if (currentTab && currentTab.modified) {
      // 可以在这里提示保存
    }
  }

  activeTabPath.value = path;
  emit("file-changed", path);
};

// 关闭标签
const closeTab = async (path: string) => {
  const tab = tabs.value.find((t) => t.path === path);
  if (!tab) return;

  if (tab.modified) {
    // 提示保存
    try {
      const confirmed = await ElMessageBox.confirm(
        `"${tab.name}" 已修改，是否保存？`,
        "未保存的更改",
        {
          confirmButtonText: "保存",
          cancelButtonText: "不保存",
          type: "warning",
        },
      );
      if (confirmed) {
        await saveTab(tab);
      }
    } catch {
      // 用户取消
    }
  }

  // 移除标签
  const index = tabs.value.findIndex((t) => t.path === path);
  tabs.value.splice(index, 1);

  // 如果关闭的是活动标签，切换到相邻标签
  if (activeTabPath.value === path) {
    if (tabs.value.length > 0) {
      activateTab(tabs.value[Math.max(0, index - 1)].path);
    } else {
      activeTabPath.value = null;
    }
  }
};

// 更新活动标签内容
const updateActiveTabContent = (content: string) => {
  if (!activeTabPath.value) return;

  const tab = tabs.value.find((t) => t.path === activeTabPath.value);
  if (tab) {
    tab.content = content;
    tab.modified = true;
    emit("update:modelValue", tabs.value);
  }
};

// 保存活动标签
const saveActiveTab = async () => {
  if (!activeTabPath.value || !activeTab.value) return;
  await saveTab(activeTab.value);
};

// 保存指定标签
const saveTab = async (tab: Tab) => {
  try {
    await fileApi.writeFile(tab.path, tab.content, false);
    tab.modified = false;
    ElMessage.success(`已保存: ${tab.name}`);
    emit("save", tab.path, tab.content);
  } catch (error) {
    console.error("保存文件失败:", error);
    ElMessage.error("保存文件失败");
  }
};

// 保存全部
const saveAll = async () => {
  const modifiedTabs = tabs.value.filter((t) => t.modified);
  for (const tab of modifiedTabs) {
    await saveTab(tab);
  }
  if (modifiedTabs.length === 0) {
    ElMessage.info("没有需要保存的文件");
  }
};

// 标签操作
const handleTabAction = async (command: string) => {
  switch (command) {
    case "closeAll":
      while (tabs.value.length > 0) {
        await closeTab(tabs.value[0].path);
      }
      break;
    case "closeOthers":
      const activePath = activeTabPath.value;
      const tabsToClose = tabs.value.filter((t) => t.path !== activePath);
      for (const tab of [...tabsToClose]) {
        await closeTab(tab.path);
      }
      break;
    case "closeSaved":
      const savedTabs = tabs.value.filter((t) => !t.modified);
      for (const tab of [...savedTabs]) {
        await closeTab(tab.path);
      }
      break;
    case "saveAll":
      await saveAll();
      break;
  }
};

// 初始化时打开指定文件
onMounted(async () => {
  if (props.initialPath) {
    await openFile(props.initialPath);
  }
});

// 监听包名变化，加载 package.yaml
watch(
  () => props.packageName,
  async (newPackage) => {
    if (newPackage) {
      await openFile(`packages/${newPackage}/package.yaml`);
    }
  },
  { immediate: false },
);

// 暴露方法给父组件
defineExpose({
  openFile,
  closeTab,
  saveAll,
});
</script>

<style scoped>
.editor-tabs-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
}

.tabs-bar {
  display: flex;
  align-items: center;
  background: #252526;
  border-bottom: 1px solid #3c3c3c;
  height: 40px;
}

.tabs-scroll {
  display: flex;
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
}

.tabs-scroll::-webkit-scrollbar {
  height: 3px;
}

.tabs-scroll::-webkit-scrollbar-thumb {
  background: #424242;
  border-radius: 3px;
}

.tab {
  display: flex;
  align-items: center;
  padding: 0 12px;
  height: 36px;
  background: #2d2d2d;
  color: #969696;
  font-size: 13px;
  cursor: pointer;
  border-right: 1px solid #1e1e1e;
  transition: all 0.2s;
  white-space: nowrap;
  min-width: 100px;
  max-width: 200px;
}

.tab:hover {
  background: #383838;
  color: #cccccc;
}

.tab.active {
  background: #1e1e1e;
  color: #ffffff;
  border-top: 2px solid #409eff;
}

.tab.modified {
  color: #e6a23c;
}

.tab-icon {
  margin-right: 6px;
  font-size: 14px;
}

.tab-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.modified-dot {
  color: #409eff;
  margin-right: 4px;
  font-size: 10px;
}

.tab-close {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  margin-left: 4px;
  font-size: 16px;
  opacity: 0;
  transition: all 0.2s;
}

.tab:hover .tab-close {
  opacity: 1;
}

.tab-close:hover {
  background: #4c4c4c;
  color: #ffffff;
}

.tabs-actions {
  padding: 0 8px;
  display: flex;
  align-items: center;
}

.editor-area {
  flex: 1;
  overflow: hidden;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
  text-align: center;
  padding: 2rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
  color: #999;
}

.empty-state p {
  margin: 0 0 1.5rem 0;
  color: #666;
}
</style>
