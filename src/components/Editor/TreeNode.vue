<template>
  <div class="tree-node">
    <!-- 节点行 -->
    <div
      class="node-row"
      :class="{
        selected: isSelected,
        folder: node.isDirectory,
      }"
      :style="{ paddingLeft: `${depth * 16 + 12}px` }"
      @click="handleClick"
      @dblclick="handleDoubleClick"
      @contextmenu.prevent="handleContextMenu"
    >
      <!-- 展开/折叠图标 -->
      <span
        class="expand-icon"
        :class="{ expanded: isExpanded }"
        @click.stop="handleToggle"
      >
        <el-icon v-if="node.isDirectory">
          <ArrowRight v-if="!isExpanded" />
          <ArrowDown v-else />
        </el-icon>
      </span>

      <!-- 文件图标 -->
      <span class="node-icon">
        <template v-if="node.isDirectory">
          <el-icon v-if="isExpanded" color="#ffc107"><FolderOpened /></el-icon>
          <el-icon v-else color="#ffc107"><Folder /></el-icon>
        </template>
        <template v-else>
          <span>{{ getFileIcon(node.name) }}</span>
        </template>
      </span>

      <!-- 文件名 -->
      <span class="node-name">{{ node.name }}</span>

      <!-- 搜索匹配高亮 -->
      <span
        v-if="searchQuery && isMatch"
        class="match-indicator"
        title="匹配搜索结果"
      >
        🔍
      </span>
    </div>

    <!-- 子节点 -->
    <div v-if="node.isDirectory && isExpanded" class="children">
      <TreeNode
        v-for="child in node.children"
        :key="child.path"
        :node="child"
        :depth="depth + 1"
        :selected-path="selectedPath"
        :expanded-paths="expandedPaths"
        :search-query="searchQuery"
        @select="$emit('select', $event)"
        @toggle="$emit('toggle', $event)"
        @open="$emit('open', $event)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  ArrowRight,
  ArrowDown,
  Folder,
  FolderOpened,
} from "@element-plus/icons-vue";

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
  expandedPaths: Set<string>;
  searchQuery: string;
}>();

const emit = defineEmits<{
  select: [node: { name: string; path: string; isDirectory: boolean }];
  toggle: [node: { name: string; path: string; isDirectory: boolean }];
  open: [node: { name: string; path: string; isDirectory: boolean }];
}>();

// 计算属性
const isSelected = computed(() => props.selectedPath === props.node.path);

const isExpanded = computed(
  () => props.node.expanded || props.expandedPaths.has(props.node.path),
);

const isMatch = computed(() => {
  if (!props.searchQuery) return false;
  return props.node.name
    .toLowerCase()
    .includes(props.searchQuery.toLowerCase());
});

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
const handleContextMenu = () => {
  // 可以在这里添加自定义右键菜单
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

.node-row.folder {
  font-weight: 500;
}

.expand-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  margin-right: 4px;
  color: #969696;
}

.expand-icon.expanded {
  transform: rotate(90deg);
}

.node-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 6px;
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
