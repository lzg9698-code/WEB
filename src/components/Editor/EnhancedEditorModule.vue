<!--
  增强编辑器模块 - 集成实时预览功能
  
  严格遵循PROJECT_REQUIREMENTS.md文档约束
  功能：文件树编辑器，支持实时预览渲染结果
-->
<template>
  <div class="EnhancedEditorContainer">
    <!-- 左侧面板：文件树和编辑器 -->
    <div class="editor-section" :class="{ collapsed: previewVisible }">
      <div class="editor-sidebar">
        <FileTree
          root-path="packages"
          :height="'100%'"
          :show-files="true"
          :extensions="['.j2', '.jinja2', '.yaml', '.yml', '.json', '.md']"
          @file-open="handleFileOpen"
          @path-change="handlePathChange"
        />
      </div>
      <div class="editor-main">
        <EditorTabs
          ref="editorTabsRef"
          :parameters="currentParameters"
          @save="handleSave"
          @content-change="handleContentChange"
          @open-file-tree="$emit('openFileTree')"
          @template-detected="handleTemplateDetected"
        />
      </div>
    </div>

    <!-- 右侧面板：实时预览 -->
    <div class="preview-section" v-show="previewVisible">
      <div class="preview-header">
        <div class="preview-title">
          <i class="fas fa-eye"></i>
          实时预览
        </div>
        <div class="preview-controls">
          <button
            @click="toggleAutoRefresh"
            class="btn btn-icon"
            :class="{ active: autoRefresh }"
            title="自动刷新"
          >
            <i class="fas fa-sync-alt"></i>
          </button>

          <button @click="togglePreview" class="btn btn-icon" title="隐藏预览">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>

      <div class="preview-content">
        <RealtimePreview
          v-if="currentTemplate && currentContent"
          :template-name="currentTemplate"
          :template-content="currentContent"
          :parameters="currentParameters"
          :auto-refresh="autoRefresh"
          @refresh="handlePreviewRefresh"
          @error="handlePreviewError"
        />

        <div v-else class="no-preview">
          <i class="fas fa-file-alt"></i>
          <p>选择模板文件后显示预览</p>
        </div>
      </div>
    </div>

    <!-- 浮动预览切换按钮 -->
    <div class="preview-toggle" v-show="!previewVisible">
      <button @click="togglePreview" class="btn btn-primary" title="显示预览">
        <i class="fas fa-eye"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { ElMessage } from "element-plus";
import FileTree from "./FileTree.vue";
import EditorTabs from "./EditorTabs.vue";
import RealtimePreview from "../Render/RealtimePreview.vue";
import { useParameterManagerStore } from "@/stores/parameterManagerStore";
import { useTemplateManagerStore } from "@/stores/templateManagerStore";

// Props
const props = defineProps<{
  currentPackage?: string;
}>();

// Emits
const emit = defineEmits<{
  "file-open": [path: string];
  openFileTree: [];
  save: [path: string, content: string];
  "template-change": [template: string, content: string];
}>();

// Stores
const parameterStore = useParameterManagerStore();
const templateStore = useTemplateManagerStore();

// 响应式数据
const editorTabsRef = ref<InstanceType<typeof EditorTabs> | null>(null);
const previewVisible = ref(false);
const autoRefresh = ref(true);
const currentTemplate = ref("");
const currentContent = ref("");
const currentParameters = ref<Record<string, any>>({});

// 计算属性
const hasActiveFile = computed(() => {
  return currentTemplate.value && currentContent.value;
});

// 方法
const handleFileOpen = (path: string) => {
  console.log("📝 打开文件:", path);
  emit("file-open", path);
  editorTabsRef.value?.openFile(path);

  // 如果是模板文件，自动显示预览
  if (path.endsWith(".j2") || path.endsWith(".jinja2")) {
    const filename = path.split("/").pop() || "";
    currentTemplate.value = filename;
  }
};

const handlePathChange = (path: string) => {
  console.log("📁 导航到:", path);
};

const handleSave = (path: string, content: string) => {
  emit("save", path, content);
  console.log("💾 保存文件:", path);
};

const handleContentChange = (filename: string, content: string) => {
  if (filename.endsWith(".j2") || filename.endsWith(".jinja2")) {
    currentContent.value = content;
    currentTemplate.value = filename.split("/").pop() || "";

    emit("template-change", currentTemplate.value, content);
  }
};

const handleTemplateDetected = (templateInfo: {
  name: string;
  content: string;
}) => {
  currentTemplate.value = templateInfo.name;
  currentContent.value = templateInfo.content;
};

const togglePreview = () => {
  previewVisible.value = !previewVisible.value;
};

const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value;
};

const handlePreviewRefresh = () => {
  console.log("🔄 预览刷新");
};

const handlePreviewError = (error: string) => {
  console.error("❌ 预览错误:", error);
  ElMessage.error(`预览错误: ${error}`);
};

// 监听器
watch(
  () => props.currentPackage,
  (newPackage) => {
    if (newPackage) {
      // 加载模板包参数
      loadTemplateParameters(newPackage);
    }
  },
);

watch(
  () => parameterStore.parameters,
  (newParameters) => {
    currentParameters.value = { ...newParameters };
  },
  { deep: true },
);

const loadTemplateParameters = async (packageName: string) => {
  try {
    // 从参数管理器获取当前模板的参数
    const packageParameters = parameterStore.getPackageParameters(packageName);
    if (packageParameters) {
      currentParameters.value = { ...packageParameters };
    }
  } catch (error) {
    console.error("加载模板参数失败:", error);
  }
};

// 暴露方法给父组件
defineExpose({
  openFile: (path: string) => {
    editorTabsRef.value?.openFile(path);
  },
  showPreview: () => {
    previewVisible.value = true;
  },
  hidePreview: () => {
    previewVisible.value = false;
  },
  getCurrentTemplate: () => currentTemplate.value,
  getCurrentContent: () => currentContent.value,
});

// 生命周期
onMounted(() => {
  // 初始化参数
  if (props.currentPackage) {
    loadTemplateParameters(props.currentPackage);
  }
});
</script>

<style scoped>
.EnhancedEditorContainer {
  display: flex;
  height: 100%;
  background: var(--vscode-editor-background);
  position: relative;
}

.editor-section {
  display: flex;
  height: 100%;
  flex: 1;
  transition: flex 0.3s ease;
}

.editor-section.collapsed {
  flex: 0.6;
}

.editor-sidebar {
  width: 280px;
  min-width: 200px;
  max-width: 400px;
  border-right: 1px solid var(--vscode-panel-border);
  overflow: hidden;
  flex-shrink: 0;
}

.editor-main {
  flex: 1;
  overflow: hidden;
}

.preview-section {
  width: 400px;
  min-width: 300px;
  border-left: 1px solid var(--vscode-panel-border);
  display: flex;
  flex-direction: column;
  background: var(--vscode-editor-background);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid var(--vscode-panel-border);
  background: var(--vscode-panel-background);
}

.preview-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--vscode-foreground);
}

.preview-controls {
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
  border-color: var(--vscode-button-border);
}

.btn-primary {
  background: var(--vscode-button-background);
  border-color: var(--vscode-button-border);
  color: var(--vscode-button-foreground);
}

.preview-content {
  flex: 1;
  overflow: hidden;
}

.no-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  gap: 12px;
  opacity: 0.6;
}

.no-preview i {
  font-size: 32px;
  color: var(--vscode-descriptionForeground);
}

.no-preview p {
  margin: 0;
  font-size: 13px;
  color: var(--vscode-descriptionForeground);
}

.preview-toggle {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 100;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .preview-section {
    width: 350px;
    min-width: 250px;
  }
}

@media (max-width: 1000px) {
  .EnhancedEditorContainer {
    flex-direction: column;
  }

  .editor-section {
    border-right: none;
    border-bottom: 1px solid var(--vscode-panel-border);
  }

  .preview-section {
    width: 100%;
    height: 300px;
    border-left: none;
    border-top: 1px solid var(--vscode-panel-border);
  }

  .preview-toggle {
    top: auto;
    bottom: 12px;
  }
}
</style>
