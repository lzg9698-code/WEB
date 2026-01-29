<template>
  <div class="parameter-group" :data-group="group.key">
    <div class="group-header">
      <h3 class="group-title">
        {{ group.icon }} {{ group.name }}
        <el-badge
          :value="getRequiredCount(group.parameters)"
          :type="hasErrors ? 'danger' : 'primary'"
          class="required-badge"
        >
          <span>必填</span>
        </el-badge>
      </h3>

      <div class="group-actions">
        <el-button v-if="hasValues" size="small" @click="clearGroup" text>
          🗑️ 清空
        </el-button>
        <el-button
          v-if="hasDefaults"
          size="small"
          @click="resetGroup"
          type="info"
        >
          ↺ 重置
        </el-button>
        <el-button v-if="isCollapsible" size="small" @click="toggleCollapse">
          {{ isCollapsed ? "▼" : "▲" }}
        </el-button>
      </div>
    </div>

    <div v-show="!isCollapsed" class="group-content">
      <div
        v-for="parameter in group.parameters"
        :key="parameter.key"
        class="parameter-item"
        :class="{
          'has-error': hasParameterError(parameter.key),
          'has-warning': hasParameterWarning(parameter.key),
          'is-required': parameter.required,
        }"
      >
        <ParameterInput
          :parameter="parameter"
          :model-value="getParameterValue(parameter.key)"
          :error="getParameterError(parameter.key)"
          :warning="getParameterWarning(parameter.key)"
          :disabled="disabled"
          @update:model-value="updateParameter(parameter.key, $event)"
          @change="handleParameterChange(parameter.key, $event, parameter)"
          @error="handleParameterError(parameter.key, $event, parameter)"
        />
      </div>

      <!-- 组级统计信息 -->
      <div class="group-stats">
        <span class="stat-item"> 📝 总计: {{ group.parameters.length }} </span>
        <span class="stat-item">
          ✅ 已填: {{ getFilledCount(group.parameters) }}
        </span>
        <span class="stat-item">
          ⚠️ 警告: {{ getWarningCount(group.parameters) }}
        </span>
        <span class="stat-item">
          ❌ 错误: {{ getErrorCount(group.parameters) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 参数组组件
 *
 * 此文件必须严格遵循PROJECT_REQUIREMENTS.md文档约束。
 * 任何修改都必须先更新需求文档，然后修改代码。
 * 违反此约束将导致代码被拒绝。
 */

import { ref, computed } from "vue";
import { ElMessage } from "element-plus";
import ParameterInput from "./ParameterInput.vue";
import type { ParameterConfig } from "@/services/api";

// Props
interface Props {
  // 参数组配置
  group: {
    key: string;
    name: string;
    icon?: string;
    description?: string;
    parameters: Record<
      string,
      {
        key: string;
        groupKey: string;
        paramKey: string;
        type: string;
        label: string;
        description?: string;
        default?: any;
        required?: boolean;
        unit?: string;
        range?: [any, any];
        options?: any[];
      }
    >;
  };
  // 参数值
  modelValue: Record<string, any>;
  // 验证结果
  validation?: {
    valid: boolean;
    errors: Record<string, string>;
    warnings: Record<string, string>;
  };
  // 是否禁用
  disabled?: boolean;
  // 是否可折叠
  collapsible?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  collapsible: true,
});

// Emits
const emit = defineEmits<{
  "update:modelValue": [value: Record<string, any>];
  change: [groupKey: string, value: any, validation?: any];
  error: [groupKey: string, errors: Record<string, string>];
}>();

// 响应式数据
const isCollapsed = ref(false);
const localValidation = computed(
  () => props.validation || { valid: true, errors: {}, warnings: {} },
);

// 计算属性
const hasValues = computed(() => {
  return Object.keys(props.modelValue).some((key) => {
    const value = props.modelValue[key];
    return value !== undefined && value !== null && value !== "";
  });
});

const hasDefaults = computed(() => {
  return Object.values(props.group.parameters).some(
    (param) => param.default !== undefined,
  );
});

const hasErrors = computed(() => {
  return Object.keys(localValidation.value.errors).some((key) =>
    key.startsWith(`${props.group.key}.`),
  );
});

// 方法
const getRequiredCount = (parameters: any[]) => {
  return parameters.filter((param) => param.required).length;
};

const getFilledCount = (parameters: any[]) => {
  return parameters.filter((param) => {
    const value = props.modelValue[param.key];
    return value !== undefined && value !== null && value !== "";
  }).length;
};

const getWarningCount = (parameters: any[]) => {
  return parameters.filter((param) => localValidation.value.warnings[param.key])
    .length;
};

const getErrorCount = (parameters: any[]) => {
  return parameters.filter((param) => localValidation.value.errors[param.key])
    .length;
};

const getParameterValue = (key: string) => {
  return props.modelValue[key];
};

const getParameterError = (key: string) => {
  return localValidation.value.errors[key] || "";
};

const getParameterWarning = (key: string) => {
  return localValidation.value.warnings[key] || "";
};

const hasParameterError = (key: string) => {
  return !!localValidation.value.errors[key];
};

const hasParameterWarning = (key: string) => {
  return !!localValidation.value.warnings[key];
};

const updateParameter = (key: string, value: any) => {
  const newValue = { ...props.modelValue, [key]: value };
  emit("update:modelValue", newValue);
};

const handleParameterChange = (key: string, value: any, parameter: any) => {
  console.log(`🔒 参数变更: ${key} = ${value}`);
  emit(
    "change",
    props.group.key,
    { ...props.modelValue, [key]: value },
    localValidation.value,
  );
};

const handleParameterError = (key: string, error: string, parameter: any) => {
  console.warn(`⚠️ 参数错误: ${key} - ${error}`);
  // 可以在这里收集组级错误
};

const clearGroup = () => {
  const clearedValues = { ...props.modelValue };
  Object.keys(props.group.parameters).forEach((key) => {
    delete clearedValues[key];
  });
  emit("update:modelValue", clearedValues);
  emit("change", props.group.key, clearedValues);
  ElMessage.success(`参数组 "${props.group.name}" 已清空`);
};

const resetGroup = () => {
  const resetValues = { ...props.modelValue };
  Object.entries(props.group.parameters).forEach(([key, param]) => {
    if (param.default !== undefined) {
      resetValues[key] = param.default;
    }
  });
  emit("update:modelValue", resetValues);
  emit("change", props.group.key, resetValues);
  ElMessage.success(`参数组 "${props.group.name}" 已重置为默认值`);
};

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value;
};

// 自动折叠逻辑
const shouldCollapse = computed(() => {
  if (!props.collapsible) return false;

  // 如果没有错误且所有必填项都已填写，可以折叠
  const requiredParams = Object.values(props.group.parameters).filter(
    (p) => p.required,
  );
  const allRequiredFilled = requiredParams.every((param) => {
    const value = props.modelValue[param.key];
    return value !== undefined && value !== null && value !== "";
  });

  const hasNoErrors = !hasErrors.value;

  return allRequiredFilled && hasNoErrors;
});

// 监听是否应该折叠
watch(
  () => shouldCollapse.value,
  (should) => {
    if (should && !isCollapsed.value) {
      // 自动折叠（可选）
      // isCollapsed.value = true
    }
  },
);
</script>

<style scoped>
.parameter-group {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  border: 1px solid #e4e7ed;
  transition: all 0.3s ease;
}

.parameter-group:hover {
  border-color: #3498db;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e4e7ed;
}

.group-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.required-badge {
  font-size: 0.75rem;
}

.group-actions {
  display: flex;
  gap: 0.5rem;
}

.group-content {
  padding: 1.5rem;
}

.parameter-item {
  margin-bottom: 1.5rem;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}

.parameter-item:hover {
  border-color: #e4e7ed;
  background: #fafbfc;
}

.parameter-item.has-error {
  border-color: #f56c6c;
  background: #fef0f0;
}

.parameter-item.has-warning {
  border-color: #e6a23c;
  background: #fdf6ec;
}

.parameter-item.is-required {
  border-left: 3px solid #409eff;
}

.parameter-item:last-child {
  margin-bottom: 0;
}

.group-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  background: #f8f9fa;
  border-top: 1px solid #e4e7ed;
  font-size: 0.875rem;
  color: #666;
  border-radius: 0 0 12px 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .group-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .group-title {
    font-size: 1rem;
  }

  .group-stats {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .stat-item {
    font-size: 0.75rem;
  }
}
</style>
