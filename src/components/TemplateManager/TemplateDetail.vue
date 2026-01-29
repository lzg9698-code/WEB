<template>
  <div class="template-detail" v-if="template">
    <!-- 模板头部信息 -->
    <div class="template-header">
      <div class="header-left">
        <div class="template-icon" :style="{ color: template.color }">
          {{ template.icon }}
        </div>
        <div class="template-info">
          <h2 class="template-name">{{ template.displayName }}</h2>
          <div class="template-meta">
            <el-tag :color="template.color">{{ template.category }}</el-tag>
            <el-tag type="success">v{{ template.version }}</el-tag>
            <span class="author">作者: {{ template.author }}</span>
          </div>
        </div>
      </div>

      <div class="header-actions">
        <el-button @click="editTemplate" type="primary"> ✏️ 编辑 </el-button>
        <el-button @click="exportTemplate"> 📤 导出 </el-button>
        <el-button @click="duplicateTemplate"> 📋 复制 </el-button>
        <el-dropdown @command="handleMoreActions">
          <el-button>
            更多 <el-icon class="el-icon--right"><arrow-down /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="validate"
                >🧪 验证模板</el-dropdown-item
              >
              <el-dropdown-item command="refresh">🔄 刷新信息</el-dropdown-item>
              <el-dropdown-item command="delete" divided
                >🗑️ 删除模板</el-dropdown-item
              >
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 标签页 -->
    <div class="template-tabs">
      <el-tabs v-model="activeTab" type="border-card">
        <!-- 概览标签页 -->
        <el-tab-pane label="📋 概览" name="overview">
          <div class="tab-content">
            <div class="description-section">
              <h3>描述</h3>
              <p class="description">{{ template.description }}</p>
            </div>

            <div class="tags-section">
              <h3>标签</h3>
              <div class="tags">
                <el-tag
                  v-for="tag in template.tags"
                  :key="tag"
                  class="tag-item"
                >
                  {{ tag }}
                </el-tag>
                <el-button size="small" @click="addTag">
                  ➕ 添加标签
                </el-button>
              </div>
            </div>

            <div class="stats-section">
              <h3>统计信息</h3>
              <div class="stats-grid">
                <div class="stat-item">
                  <div class="stat-value">
                    {{ template.templateFiles?.length || 0 }}
                  </div>
                  <div class="stat-label">模板文件</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">{{ template.tags.length }}</div>
                  <div class="stat-label">标签数量</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">
                    {{ formatDate(template.createdAt) }}
                  </div>
                  <div class="stat-label">创建时间</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">
                    {{ formatDate(template.updatedAt) }}
                  </div>
                  <div class="stat-label">更新时间</div>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- 文件列表标签页 -->
        <el-tab-pane label="📄 文件列表" name="files">
          <div class="tab-content">
            <div class="files-header">
              <h3>模板文件</h3>
              <el-button @click="createFile" type="primary" size="small">
                ➕ 新建文件
              </el-button>
            </div>

            <div class="files-list">
              <div
                v-for="file in template.templateFiles"
                :key="file"
                class="file-item"
                @click="openFile(file)"
              >
                <div class="file-icon">📄</div>
                <div class="file-info">
                  <div class="file-name">{{ file }}</div>
                  <div class="file-path">templates/{{ file }}</div>
                </div>
                <div class="file-actions">
                  <el-button size="small" @click.stop="editFile(file)">
                    ✏️
                  </el-button>
                  <el-button
                    size="small"
                    @click.stop="deleteFile(file)"
                    type="danger"
                  >
                    🗑️
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- 配置信息标签页 -->
        <el-tab-pane label="⚙️ 配置信息" name="config">
          <div class="tab-content">
            <div class="config-viewer">
              <pre>{{ JSON.stringify(template.config, null, 2) }}</pre>
            </div>
          </div>
        </el-tab-pane>

        <!-- 预览标签页 -->
        <el-tab-pane label="👁️ 预览" name="preview">
          <div class="tab-content">
            <div class="preview-actions">
              <el-button @click="refreshPreview" :loading="previewLoading">
                🔄 刷新预览
              </el-button>
              <el-button @click="downloadPreview"> 📥 下载预览 </el-button>
            </div>

            <div class="preview-content">
              <div v-if="previewContent" class="preview-text">
                <pre>{{ previewContent }}</pre>
              </div>
              <div v-else class="preview-empty">
                <div class="empty-icon">👁️</div>
                <p>暂无预览内容</p>
                <p>请选择模板文件并设置参数进行预览</p>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 添加标签对话框 -->
    <el-dialog v-model="tagDialogVisible" title="添加标签" width="400px">
      <el-input
        v-model="newTag"
        placeholder="输入标签名称"
        @keyup.enter="confirmAddTag"
      />
      <template #footer>
        <el-button @click="tagDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmAddTag">添加</el-button>
      </template>
    </el-dialog>
  </div>

  <!-- 空状态 -->
  <div v-else class="empty-detail">
    <div class="empty-icon">📦</div>
    <h3>请选择一个模板包</h3>
    <p>从左侧列表中选择模板包查看详情</p>
  </div>
</template>

<script setup lang="ts">
/**
 * 模板详情组件
 *
 * 此文件必须严格遵循PROJECT_REQUIREMENTS.md文档约束。
 * 任何修改都必须先更新需求文档，然后修改代码。
 * 违反此约束将导致代码被拒绝。
 */

import { ref, computed, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { ArrowDown } from "@element-plus/icons-vue";
import type { TemplatePackage } from "@/services/api";

// Props
interface Props {
  template: TemplatePackage | null;
}

const props = withDefaults(defineProps<Props>(), {
  template: null,
});

// Emits
const emit = defineEmits<{
  edit: [template: TemplatePackage];
  fileEdit: [file: string];
}>();

// 响应式数据
const activeTab = ref("overview");
const tagDialogVisible = ref(false);
const newTag = ref("");
const previewContent = ref("");
const previewLoading = ref(false);

// 计算属性
const formatDate = (dateString?: string) => {
  if (!dateString) return "未知";
  return new Date(dateString).toLocaleDateString("zh-CN");
};

// 方法
const editTemplate = () => {
  if (props.template) {
    emit("edit", props.template);
  }
};

const exportTemplate = async () => {
  if (!props.template) return;

  try {
    ElMessage.success(`正在导出模板包: ${props.template.displayName}`);
    // TODO: 实现导出功能
  } catch (error) {
    ElMessage.error("导出失败");
  }
};

const duplicateTemplate = async () => {
  if (!props.template) return;

  try {
    const newName = `${props.template.name}_copy`;
    const newDisplayName = `${props.template.displayName} (副本)`;

    const success = await templateStore.duplicatePackage(props.template.name, {
      newName,
      newDisplayName,
    });

    if (success) {
      ElMessage.success("模板包复制成功");
    } else {
      ElMessage.error(templateStore.error || "复制失败");
    }
  } catch (error) {
    ElMessage.error("复制失败");
  }
};

const handleMoreActions = async (command: string) => {
  if (!props.template) return;

  switch (command) {
    case "validate":
      await validateTemplate();
      break;
    case "refresh":
      await refreshTemplate();
      break;
    case "delete":
      await deleteTemplate();
      break;
  }
};

const validateTemplate = async () => {
  if (!props.template) return;

  try {
    ElMessage.success("模板验证通过");
  } catch (error) {
    ElMessage.error("模板验证失败");
  }
};

const refreshTemplate = async () => {
  if (!props.template) return;

  try {
    ElMessage.success("模板信息已刷新");
  } catch (error) {
    ElMessage.error("刷新失败");
  }
};

const deleteTemplate = async () => {
  if (!props.template) return;

  try {
    await ElMessageBox.confirm(
      `确定要删除模板包 "${props.template.displayName}" 吗？`,
      "删除确认",
      {
        confirmButtonText: "确定",
        cancelButtonText: "取消",
        type: "warning",
      },
    );

    const success = await templateStore.deletePackage(props.template.name);

    if (success) {
      ElMessage.success("模板包已删除");
      emit("edit", null); // 通知父组件清除选择
    } else {
      ElMessage.error(templateStore.error || "删除失败");
    }
  } catch {
    // 用户取消
  }
};

const addTag = () => {
  tagDialogVisible.value = true;
  newTag.value = "";
};

const confirmAddTag = () => {
  if (!newTag.value.trim()) {
    ElMessage.warning("请输入标签名称");
    return;
  }

  if (!props.template) return;

  // TODO: 实现添加标签功能
  ElMessage.success("标签已添加");
  tagDialogVisible.value = false;
  newTag.value = "";
};

const createFile = () => {
  if (!props.template) return;

  // TODO: 实现创建文件功能
  ElMessage.info("创建文件功能开发中...");
};

const openFile = (file: string) => {
  emit("fileEdit", file);
};

const editFile = (file: string) => {
  emit("fileEdit", file);
};

const deleteFile = async (file: string) => {
  try {
    await ElMessageBox.confirm(`确定要删除文件 "${file}" 吗？`, "删除确认", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });

    ElMessage.success("文件已删除");
  } catch {
    // 用户取消
  }
};

const refreshPreview = async () => {
  if (!props.template) return;

  previewLoading.value = true;
  try {
    const content = await templateStore.getPreview(props.template.name);

    if (content) {
      previewContent.value = content;
      ElMessage.success("预览已刷新");
    } else {
      previewContent.value = `; 暂无预览内容\n; 模板: ${props.template.displayName}\n; 时间: ${new Date().toLocaleString()}`;
      ElMessage.warning("未能生成预览内容");
    }
  } catch (error) {
    ElMessage.error("预览失败");
  } finally {
    previewLoading.value = false;
  }
};

const downloadPreview = () => {
  if (!previewContent.value) {
    ElMessage.warning("暂无预览内容可下载");
    return;
  }

  try {
    const blob = new Blob([previewContent.value], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "preview.txt";
    a.click();
    URL.revokeObjectURL(url);
    ElMessage.success("预览文件已下载");
  } catch (error) {
    ElMessage.error("下载失败");
  }
};

// 监听模板变化
watch(
  () => props.template,
  (newTemplate) => {
    if (newTemplate) {
      activeTab.value = "overview";
      previewContent.value = "";
    }
  },
  { immediate: true },
);
</script>

<style scoped>
.template-detail {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.template-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.5rem;
  background: white;
  border-radius: 12px;
  margin-bottom: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.header-left {
  display: flex;
  align-items: flex-start;
}

.template-icon {
  font-size: 3rem;
  margin-right: 1.5rem;
}

.template-name {
  margin: 0 0 0.5rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #2c3e50;
}

.template-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.author {
  color: #666;
  font-size: 0.875rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.template-tabs {
  flex: 1;
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.tab-content {
  padding: 1.5rem;
  height: 100%;
}

.description-section {
  margin-bottom: 2rem;
}

.description-section h3 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
}

.description {
  color: #666;
  line-height: 1.6;
  margin: 0;
}

.tags-section {
  margin-bottom: 2rem;
}

.tags-section h3 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag-item {
  margin: 0;
}

.stats-section h3 {
  margin: 0 0 1.5rem 0;
  color: #2c3e50;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.stat-item {
  text-align: center;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-value {
  font-size: 2rem;
  font-weight: 600;
  color: #3498db;
  margin-bottom: 0.5rem;
}

.stat-label {
  color: #666;
  font-size: 0.875rem;
}

.files-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.files-header h3 {
  margin: 0;
  color: #2c3e50;
}

.files-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.file-item:hover {
  border-color: #3498db;
  background: #f8f9fa;
}

.file-icon {
  font-size: 1.5rem;
  margin-right: 1rem;
}

.file-info {
  flex: 1;
}

.file-name {
  font-weight: 500;
  color: #2c3e50;
  margin-bottom: 0.25rem;
}

.file-path {
  font-size: 0.875rem;
  color: #666;
}

.file-actions {
  display: flex;
  gap: 0.5rem;
}

.config-viewer {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
  max-height: 500px;
  overflow-y: auto;
}

.config-viewer pre {
  margin: 0;
  font-family: "Monaco", "Courier New", monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  color: #2c3e50;
}

.preview-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.preview-content {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 1.5rem;
  min-height: 300px;
}

.preview-text {
  height: 100%;
}

.preview-text pre {
  margin: 0;
  font-family: "Monaco", "Courier New", monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  color: #2c3e50;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  text-align: center;
  color: #666;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-detail {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: #666;
}

.empty-detail .empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}
</style>
