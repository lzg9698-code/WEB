<template>
  <div class="EditorModuleContainer">
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
        @save="handleSave"
        @open-file-tree="$emit('openFileTree')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import FileTree from "./FileTree.vue";
import EditorTabs from "./EditorTabs.vue";

const emit = defineEmits<{
  "file-open": [path: string];
  openFileTree: [];
  save: [path: string, content: string];
}>();

const editorTabsRef = ref<InstanceType<typeof EditorTabs> | null>(null);

// 处理文件打开
const handleFileOpen = (path: string) => {
  console.log("📝 打开文件:", path);
  emit("file-open", path);
  editorTabsRef.value?.openFile(path);
};

// 处理路径变化
const handlePathChange = (path: string) => {
  console.log("📁 导航到:", path);
};

// 处理保存
const handleSave = (path: string, content: string) => {
  emit("save", path, content);
};

// 暴露方法给父组件
defineExpose({
  openFile: (path: string) => {
    editorTabsRef.value?.openFile(path);
  },
});
</script>

<style scoped>
.EditorModuleContainer {
  display: flex;
  height: 100%;
  background: #1e1e1e;
  border-radius: 8px;
  overflow: hidden;
}

.editor-sidebar {
  width: 280px;
  min-width: 200px;
  max-width: 400px;
  border-right: 1px solid #3c3c3c;
  overflow: hidden;
}

.editor-main {
  flex: 1;
  overflow: hidden;
}
</style>
