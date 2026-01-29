<template>
  <div class="tree-node">
    <!-- 节点行 -->
    <div
      class="node-row"
      :class="{ selected: isSelected }"
      :style="{ paddingLeft: paddingLeft }"
      @click="handleClick"
      @dblclick="handleDoubleClick"
      @contextmenu.prevent="handleContextMenu"
    >
      <!-- 展开/折叠图标 -->
      <span
        v-if="node.isDirectory"
        class="expand-icon"
        :class="{ expanded: node.expanded }"
        @click.stop="handleToggle"
      >
        <Expand />
      </span>
      <span v-else class="expand-icon-placeholder"></span>

      <!-- 文件图标 -->
      <span class="node-icon">
        <FolderOpened v-if="node.isDirectory" color="#ffc107" />
        <span v-else class="file-icon">{{ getFileIcon(node.name) }}</span>
      </span>

      <!-- 文件名 -->
      <span class="node-name">{{ node.name }}</span>
    </div>

    <!-- 子节点 (递归) -->
    <div
      v-if="node.isDirectory && node.expanded && node.children"
      class="children"
    >
      <TreeNodeItem
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :depth="depth + 1"
        :selected-path="selectedPath"
        @select="handleChildSelect"
        @toggle="handleChildToggle"
        @open="handleChildOpen"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Expand, FolderOpened } from "@element-plus/icons-vue";

interface TreeNodeData {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: TreeNodeData[];
  expanded?: boolean;
}

const props = defineProps<{
  node: TreeNodeData;
  depth: number;
  selectedPath: string | null;
}>();

const emit = defineEmits<{
  select: [node: { name: string; path: string; isDirectory: boolean }];
  toggle: [node: TreeNodeData];
  open: [node: TreeNodeData];
}>();

// 计算属性
const isSelected = computed(() => props.selectedPath === props.node.path);

const paddingLeft = computed(() => `${props.depth * 16 + 8}px`);

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

// 处理点击
const handleClick = () => {
  emit("select", props.node);
};

// 处理双击
const handleDoubleClick = () => {
  if (props.node.isDirectory) {
    handleToggle();
  } else {
    emit("open", props.node);
  }
};

// 处理展开/折叠
const handleToggle = () => {
  emit("toggle", props.node);
};

// 处理右键菜单
const handleContextMenu = (event: MouseEvent) => {
  emit("select", props.node);
};

// 子节点事件处理
const handleChildSelect = (node: {
  name: string;
  path: string;
  isDirectory: boolean;
}) => {
  emit("select", node);
};

const handleChildToggle = (node: TreeNodeData) => {
  emit("toggle", node);
};

const handleChildOpen = (node: TreeNodeData) => {
  emit("open", node);
};
</script>

<style scoped>
.tree-node {
  user-select: none;
}

.node-row {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  cursor: pointer;
  transition: background-color 0.1s;
  border-radius: 4px;
  margin: 1px 4px;
}

.node-row:hover {
  background-color: #37373d;
}

.node-row.selected {
  background-color: #094771;
}

.expand-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-right: 4px;
  color: #969696;
  cursor: pointer;
  transition: transform 0.2s;
  flex-shrink: 0;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.expand-icon-placeholder {
  width: 16px;
  margin-right: 4px;
  flex-shrink: 0;
}

.node-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 6px;
  flex-shrink: 0;
}

.file-icon {
  font-size: 14px;
}

.node-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: #cccccc;
}

.children {
  /* 子节点自动缩进 */
}
</style>
