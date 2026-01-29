<template>
  <div class="monaco-editor-container">
    <!-- 编辑器工具栏 -->
    <div class="editor-toolbar" v-if="showToolbar">
      <div class="toolbar-left">
        <el-select
          v-model="localLanguage"
          @change="handleLanguageChange"
          size="small"
        >
          <el-option label="Jinja2" value="jinja2" />
          <el-option label="YAML" value="yaml" />
          <el-option label="JSON" value="json" />
          <el-option label="Markdown" value="markdown" />
          <el-option label="Text" value="text" />
        </el-select>

        <el-select
          v-model="localTheme"
          @change="handleThemeChange"
          size="small"
        >
          <el-option label="Light" value="light" />
          <el-option label="Dark" value="dark" />
          <el-option label="High Contrast" value="hc-black" />
        </el-select>

        <el-button
          @click="formatCode"
          size="small"
          type="info"
          v-if="showFormatButton"
        >
          🎨 格式化
        </el-button>

        <el-button @click="toggleMinimap" size="small">
          {{ minimap ? "隐藏小地图" : "显示小地图" }}
        </el-button>
      </div>

      <div class="toolbar-right">
        <el-button
          @click="saveContent"
          size="small"
          type="primary"
          :loading="saving"
        >
          💾 保存
        </el-button>

        <el-button
          @click="revertContent"
          size="small"
          type="warning"
          :disabled="!hasChanges"
        >
          ↶ 撤销
        </el-button>

        <el-button @click="searchContent" size="small"> 🔍 搜索 </el-button>

        <el-dropdown @command="handleMoreActions">
          <el-button size="small">
            更多 <el-icon class="el-icon--right"><arrow-down /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="copy">📋 复制内容</el-dropdown-item>
              <el-dropdown-item command="paste">📥 粘贴内容</el-dropdown-item>
              <el-dropdown-item command="clear">🗑️ 清空内容</el-dropdown-item>
              <el-dropdown-item command="find">🔍 查找和替换</el-dropdown-item>
              <el-dropdown-item command="goto" divided
                >📍 跳转到行</el-dropdown-item
              >
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 编辑器主体 -->
    <div class="editor-main" :style="{ height: containerHeight }">
      <div ref="editorContainer" class="monaco-editor"></div>
    </div>

    <!-- 状态栏 -->
    <div class="editor-statusbar" v-if="showStatusBar">
      <div class="status-left">
        <span v-if="filePath" class="file-path">📄 {{ filePath }}</span>
        <span
          v-if="language"
          class="language-badge"
          :style="{ backgroundColor: getLanguageColor(language) }"
        >
          {{ getLanguageLabel(language) }}
        </span>
        <span v-if="encoding" class="encoding">({{ encoding }})</span>
      </div>

      <div class="status-right">
        <span class="line-info">
          行 {{ currentLine }}, 列 {{ currentColumn }}
        </span>
        <span v-if="totalLines" class="lines-info">
          / {{ totalLines }} 行
        </span>
        <span v-if="hasChanges" class="changes-indicator"> ● 未保存 </span>
      </div>
    </div>

    <!-- 搜索替换对话框 -->
    <el-dialog v-model="searchVisible" title="🔍 查找和替换" width="600px">
      <div class="search-dialog">
        <div class="search-row">
          <el-input
            v-model="searchText"
            placeholder="查找内容"
            @keyup.enter="findNext"
            style="margin-right: 1rem"
          >
            <template #append>
              <el-button @click="findNext" size="small">下一个</el-button>
              <el-button @click="findPrevious" size="small">上一个</el-button>
            </template>
          </el-input>

          <el-checkbox v-model="caseSensitive">区分大小写</el-checkbox>
          <el-checkbox v-model="useRegex">使用正则</el-checkbox>
        </div>

        <div class="replace-row">
          <el-input
            v-model="replaceText"
            placeholder="替换内容"
            style="margin-right: 1rem"
          />
          <el-button @click="replaceOnce" size="small">替换</el-button>
          <el-button @click="replaceAll" size="small" type="primary"
            >全部替换</el-button
          >
        </div>

        <div class="search-stats">
          <span v-if="searchResults.length > 0">
            找到 {{ searchResults.length }} 个结果
          </span>
        </div>
      </div>
    </el-dialog>

    <!-- 转到行对话框 -->
    <el-dialog v-model="gotoVisible" title="📍 转转到行" width="400px">
      <div class="goto-dialog">
        <el-input-number
          v-model="gotoLine"
          placeholder="行号"
          :min="1"
          :max="totalLines"
        />
        <div style="margin-top: 1rem">
          <el-button type="primary" @click="performGoto">转到</el-button>
          <el-button @click="gotoVisible = false">取消</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
/**
 * Monaco编辑器组件
 *
 * 此文件必须严格遵循PROJECT_REQUIREMENTS.md文档约束。
 * 任何修改都必须先更新需求文档，然后修改代码。
 * 违反此约束将导致代码被拒绝。
 */

import { ref, onMounted, watch, nextTick, computed } from "vue";
import * as monaco from "monaco-editor";
import { ElMessage } from "element-plus";
import { ArrowDown } from "@element-plus/icons-vue";

// Props
interface Props {
  // 编辑器内容
  modelValue: string;
  // 编辑器语言
  language?: string;
  // 编辑器主题
  theme?: string;
  // 文件路径
  filePath?: string;
  // 文件编码
  encoding?: string;
  // 是否显示工具栏
  showToolbar?: boolean;
  // 是否显示状态栏
  showStatusBar?: boolean;
  // 是否显示格式化按钮
  showFormatButton?: boolean;
  // 编辑器高度
  height?: string;
  // 是否只读
  readonly?: boolean;
  // 是否启用语法检查
  enableSyntaxValidation?: boolean;
  // 是否启用自动完成
  enableAutoComplete?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  language: "jinja2",
  theme: "light",
  encoding: "utf-8",
  showToolbar: true,
  showStatusBar: true,
  showFormatButton: true,
  height: "400px",
  readonly: false,
  enableSyntaxValidation: true,
  enableAutoComplete: true,
});

// Emits
const emit = defineEmits<{
  "update:modelValue": [value: string];
  save: [content: string];
  change: [content: string];
  languageChange: [language: string];
  themeChange: [theme: string];
}>();

// 响应式数据
const editorContainer = ref<HTMLElement>();
const editor = ref<monaco.editor.IStandaloneCodeEditor>();
const saving = ref(false);
const minimap = ref(false);
const caseSensitive = ref(false);
const useRegex = ref(false);
const searchVisible = ref(false);
const gotoVisible = ref(false);
const searchText = ref("");
const replaceText = ref("");
const gotoLine = ref(1);
const currentLine = ref(1);
const currentColumn = ref(1);
const totalLines = ref(0);
const searchResults = ref<any[]>([]);
const localLanguage = ref(props.language);
const localTheme = ref(props.theme);

// 计算属性
const containerHeight = computed(() => props.height);
const hasChanges = computed(() => {
  if (!editor.value) return false;
  return props.modelValue !== editor.value.getValue();
});

// Monaco编辑器配置
const setupMonacoEditor = () => {
  if (!editorContainer.value) return;

  // 注册Jinja2语言（必须在创建编辑器之前）
  registerJinja2Language();

  // 创建编辑器
  monaco.editor.create(
    editorContainer.value,
    {
      value: props.modelValue,
      language: "jinja2",
      theme: getMonacoTheme(props.theme),
      minimap: {
        enabled: minimap.value,
      },
      scrollBeyondLastLine: true,
      wordWrap: "on",
      lineNumbers: "on",
      folding: true,
      fontSize: 14,
      fontFamily: '"Monaco", "Menlo", "Consolas", "Courier New", monospace',
      automaticLayout: true,
      readOnly: props.readonly,
      // 启用Jinja2特定功能
      acceptSuggestionOnEnter: "on",
      quickSuggestions: {
        other: true,
        comments: false,
        strings: false,
      },
    },
    (editorInstance) => {
      editor.value = editorInstance;

      // 设置编辑器事件
      setupEditorEvents();

      // 更新编辑器内容
      editorInstance.setValue(props.modelValue);
    },
  );
};

// 注册Jinja2语言
const registerJinja2Language = () => {
  // 注册语言
  monaco.languages.register({ id: "jinja2" });

  // 设置语法高亮
  monaco.languages.setMonarchTokensProvider("jinja2", {
    tokenizer: {
      root: [
        // Jinja2 变量: {{ variable }}
        [/\{\{.*?\}\}/, "variable"],

        // Jinja2 控制语句: {% if/for/set/block %}
        [/\{%.*?%\}/, "keyword"],

        // Jinja2 注释: {# comment #}
        [/\{#.*?#\}/, "comment"],

        // G代码: G00, G01, G02, G03, G17, G18, G19, G20, G21, G28, G40, G41, G42, G43, G54, G90, G91, G94, G95
        [/\bG[0-9]{2}\b/, "type"],

        // M代码: M00, M01, M02, M03, M04, M05, M06, M08, M09, M30
        [/\bM[0-9]{2}\b/, "type"],

        // 坐标值: X, Y, Z, I, J, K 加上可选的正负号和小数点
        [/\b[XYZIJKS][+-]?\d*\.?\d+\b/, "number"],

        // 进给速度: F 值
        [/\bF[+]?\d*\.?\d+\b/, "number"],

        // 主轴转速: S 值
        [/\bS[+]?\d*\.?\d+\b/, "number"],

        // 刀具号: T 值
        [/\bT\d+\b/, "number"],

        // 程序号: O 后面跟数字
        [/\bO\d+\b/, "string.key"],

        // NC程序注释: (注释内容)
        [/\([^)]*\)/, "comment"],

        // 行首 % (文件结束标记)
        [/^%$/, "meta.delimiter"],

        // HTML标签（在Jinja2中可能用到）
        [/<[^>]+>/, "tag"],
      ],
      comment: [
        [/\{#/, "comment", "@pop"],
        [/#\}/, "comment", "@pop"],
        [/./, "comment"],
      ],
      string: [
        [/'[^']*'/, "string"],
        [/[^']+/, "string"],
      ],
    },
  });

  // 设置自动补全
  monaco.languages.registerCompletionItemProvider("jinja2", {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      return {
        suggestions: [
          // Jinja2 过滤器
          {
            label: "upper",
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: "upper",
            detail: "将文本转换为大写",
            range: range,
          },
          {
            label: "lower",
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: "lower",
            detail: "将文本转换为小写",
            range: range,
          },
          {
            label: "round",
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: "round(${1:2})",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "四舍五入到指定小数位",
            range: range,
          },
          {
            label: "format",
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: "format(${1:value})",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "格式化输出",
            range: range,
          },
          {
            label: "abs",
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: "abs",
            detail: "绝对值",
            range: range,
          },
          {
            label: "min",
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: "min(${1:a}, ${2:b})",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "最小值",
            range: range,
          },
          {
            label: "max",
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: "max(${1:a}, ${2:b})",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "最大值",
            range: range,
          },
          {
            label: "length",
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: "length",
            detail: "返回序列长度",
            range: range,
          },
          {
            label: "default",
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: "default(${1:value}, ${2:default})",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "设置默认值",
            range: range,
          },
          {
            label: "safe",
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: "safe",
            detail: "标记为安全的HTML",
            range: range,
          },
          // Jinja2 标签
          {
            label: "if",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "{% if ${1:condition} %}\n\t$0\n{% endif %}",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "条件语句",
            range: range,
          },
          {
            label: "for",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "{% for ${1:item} in ${2:items} %}\n\t$0\n{% endfor %}",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "循环语句",
            range: range,
          },
          {
            label: "set",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "{% set ${1:var} = ${2:value} %}",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "变量赋值",
            range: range,
          },
          {
            label: "block",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: "{% block ${1:name} %}$0{% endblock %}",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "模板块",
            range: range,
          },
          {
            label: "extends",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '{% extends "${1:template}" %}',
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "继承模板",
            range: range,
          },
          {
            label: "include",
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: '{% include "${1:template}" %}',
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "包含模板",
            range: range,
          },
          // 数控程序代码片段
          {
            label: "g00",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "G00 X${1:0} Y${2:0}",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "快速定位 G00",
            range: range,
          },
          {
            label: "g01",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "G01 X${1:0} Y${2:0} F${3:100}",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "直线插补 G01",
            range: range,
          },
          {
            label: "g02",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "G02 X${1:0} Y${2:0} I${3:0} J${4:0} F${5:100}",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "顺时针圆弧 G02",
            range: range,
          },
          {
            label: "g03",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "G03 X${1:0} Y${2:0} I${3:0} J${4:0} F${5:100}",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "逆时针圆弧 G03",
            range: range,
          },
          {
            label: "m03",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "M03 S${1:1000}",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "主轴正转 M03",
            range: range,
          },
          {
            label: "m05",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "M05",
            detail: "主轴停止 M05",
            range: range,
          },
          {
            label: "m06",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "M06 T${1:1}",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "换刀 M06",
            range: range,
          },
          {
            label: "m30",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "M30\n%",
            detail: "程序结束 M30",
            range: range,
          },
          {
            label: "g54",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "G54",
            detail: "工件坐标系 G54",
            range: range,
          },
          {
            label: "g90",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "G90",
            detail: "绝对坐标 G90",
            range: range,
          },
          {
            label: "g91",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "G91",
            detail: "相对坐标 G91",
            range: range,
          },
          {
            label: "g43",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "G43 Z${1:10} H${2:1}",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "刀具长度补偿 G43",
            range: range,
          },
          {
            label: "g40",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "G40",
            detail: "取消刀具半径补偿 G40",
            range: range,
          },
          {
            label: "template-header",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText:
              "O${1:0001} (${2:Program Name})\n\n(Description: ${3:Description})\n\nG90 G54 G17\nM06 T${4:1}\nM03 S${5:1000}\nG00 X${6:0} Y${7:0}\nG43 Z${8:10} H${9:1}\n$0\n\nM05\nM30\n%",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: "NC程序头部模板",
            range: range,
          },
        ],
      };
    },
  });

  // 注册主题颜色（用于语法高亮）
  monaco.editor.defineTheme("jinja2-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "variable", foreground: "0070C0" },
      { token: "keyword", foreground: "FF7800", fontStyle: "bold" },
      { token: "comment", foreground: "008000", fontStyle: "italic" },
      { token: "type", foreground: "0000FF" },
      { token: "number", foreground: "FF0000" },
      { token: "string.key", foreground: "660066" },
      { token: "tag", foreground: "800000" },
    ],
    colors: {},
  });

  monaco.editor.defineTheme("jinja2-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "variable", foreground: "4FC1FF" },
      { token: "keyword", foreground: "FF8C00", fontStyle: "bold" },
      { token: "comment", foreground: "6A9955", fontStyle: "italic" },
      { token: "type", foreground: "569CD6" },
      { token: "number", foreground: "CE9178" },
      { token: "string.key", foreground: "D4D4D4" },
      { token: "tag", foreground: "569CD6" },
    ],
    colors: {},
  });
};

const setupEditorEvents = () => {
  if (!editor.value) return;

  // 内容变更事件
  editor.value.onDidChangeModel(() => {
    const value = editor.value.getValue();
    emit("update:modelValue", value);
    emit("change", value);
  });

  // 光标位置变更事件
  editor.value.onDidChangeCursorPosition((e) => {
    currentLine.value = e.position.lineNumber;
    currentColumn.value = e.position.column;
    totalLines.value = editor.value.getModel().getLineCount();
  });
};

// 语言转换
const getMonacoLanguage = (language: string): string => {
  const languageMap: Record<string, string> = {
    jinja2: "jinja2",
    yaml: "yaml",
    json: "json",
    markdown: "markdown",
    text: "plaintext",
  };
  return languageMap[language] || "plaintext";
};

// 根据文件扩展名自动检测语言
const detectLanguage = (filePath: string): string => {
  if (!filePath) return "jinja2";
  const ext = filePath.split(".").pop()?.toLowerCase();
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

// 主题转换
const getMonacoTheme = (theme: string): string => {
  const themeMap: Record<string, string> = {
    light: "jinja2-light",
    dark: "jinja2-dark",
    "hc-black": "hc-black",
  };
  return themeMap[theme] || "jinja2-light";
};

// 方法
const handleLanguageChange = (newLanguage: string) => {
  if (editor.value) {
    const monacoLanguage = getMonacoLanguage(newLanguage);
    monaco.editor.setModel(
      editor.value.getModel()!,
      monaco.editor.createModel(monacoLanguage),
    );
    emit("languageChange", newLanguage);
  }
};

const handleThemeChange = (newTheme: string) => {
  if (editor.value) {
    const monacoTheme = getMonacoTheme(newTheme);
    monaco.editor.setTheme(monacoTheme);
    emit("themeChange", newTheme);
  }
};

const formatCode = () => {
  if (editor.value && props.language === "json") {
    try {
      const formatted = JSON.stringify(
        JSON.parse(editor.value.getValue()),
        null,
        2,
      );
      editor.value.setValue(formatted);
      ElMessage.success("代码格式化成功");
    } catch (error) {
      ElMessage.error("代码格式化失败：" + error.message);
    }
  } else if (editor.value) {
    // 简单的格式化（可以扩展）
    editor.value.getAction("editor.action.formatDocument")?.run();
  }
};

const toggleMinimap = () => {
  minimap.value = !minimap.value;
  if (editor.value) {
    editor.value.updateOptions({
      minimap: {
        enabled: minimap.value,
      },
    });
  }
};

const saveContent = async () => {
  if (!editor.value) return;

  saving.value = true;
  try {
    const content = editor.value.getValue();
    emit("save", content);
    ElMessage.success("保存成功");
  } catch (error) {
    ElMessage.error("保存失败：" + error.message);
  } finally {
    saving.value = false;
  }
};

const revertContent = () => {
  if (editor.value) {
    editor.value.setValue(props.modelValue);
    ElMessage.success("已撤销到上次保存");
  }
};

const searchContent = () => {
  searchVisible.value = true;
  searchText.value = "";
  replaceText.value = "";
};

const findNext = () => {
  if (editor.value && searchText.value) {
    // 实现查找下一个功能
    const model = editor.value.getModel();
    const matches = model.findMatches(searchText.value, {
      regex: useRegex.value,
      caseSensitive: caseSensitive.value,
      wholeWord: false,
    });

    searchResults.value = matches;
    if (matches.length > 0) {
      editor.value.setSelection(matches[0].range);
      editor.value.revealPositionInCenter(matches[0].range.getStartPosition());
    }
  }
};

const findPrevious = () => {
  // 实现查找上一个功能
  // 类似于findNext的实现
};

const replaceOnce = () => {
  if (editor.value && searchText.value && replaceText.value) {
    const selection = editor.value.getSelection();
    const model = editor.value.getModel();
    editor.value.pushEdits([
      {
        range: selection,
        text: replaceText.value,
      },
    ]);
  }
};

const replaceAll = () => {
  if (editor.value && searchText.value && replaceText.value) {
    const model = editor.value.getModel();
    const matches = model.findMatches(searchText.value, {
      regex: useRegex.value,
      caseSensitive: caseSensitive.value,
      wholeWord: false,
    });

    if (matches.length > 0) {
      const edits = matches.map((match) => ({
        range: match.range,
        text: replaceText.value,
      }));
      editor.value.pushEdits(edits);
      ElMessage.success(`已替换 ${matches.length} 处`);
    }
  }
};

const performGoto = () => {
  if (editor.value && gotoLine.value) {
    const model = editor.value.getModel();
    const lineCount = model.getLineCount();
    const targetLine = Math.max(1, Math.min(gotoLine.value, lineCount));

    editor.value.setPosition({ lineNumber: targetLine, column: 1 });
    editor.value.revealLineInCenterIfOutsideViewport(targetLine);
    gotoVisible.value = false;
  }
};

const handleMoreActions = (command: string) => {
  switch (command) {
    case "copy":
      if (editor.value) {
        navigator.clipboard.writeText(editor.value.getValue());
        ElMessage.success("内容已复制到剪贴板");
      }
      break;
    case "paste":
      navigator.clipboard.readText().then((text) => {
        if (editor.value && text) {
          editor.value.setValue(text);
        }
      });
      break;
    case "clear":
      if (editor.value) {
        editor.value.setValue("");
      }
      break;
    case "find":
      searchContent();
      break;
    case "goto":
      gotoLine.value = currentLine.value;
      gotoVisible.value = true;
      break;
  }
};

const getLanguageColor = (language: string): string => {
  const colorMap: Record<string, string> = {
    jinja2: "#2f74c0",
    yaml: "#cb171e",
    json: "#f59e0b",
    markdown: "#08c4dd",
    text: "#586069",
  };
  return colorMap[language] || "#586069";
};

const getLanguageLabel = (language: string): string => {
  const labelMap: Record<string, string> = {
    jinja2: "Jinja2",
    yaml: "YAML",
    json: "JSON",
    markdown: "Markdown",
    text: "Text",
  };
  return labelMap[language] || "Text";
};

// 监听属性变化
watch(
  () => props.modelValue,
  (newValue) => {
    if (editor.value && editor.value.getValue() !== newValue) {
      editor.value.setValue(newValue);
    }
  },
);

watch(
  () => props.language,
  (newLanguage) => {
    if (newLanguage) {
      handleLanguageChange(newLanguage);
    }
  },
);

watch(
  () => props.theme,
  (newTheme) => {
    if (newTheme) {
      handleThemeChange(newTheme);
    }
  },
);

// 初始化
onMounted(() => {
  nextTick(() => {
    setupMonacoEditor();
  });
});
</script>

<style scoped>
.monaco-editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e4e7ed;
  font-size: 0.875rem;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.editor-main {
  flex: 1;
  overflow: hidden;
}

.monaco-editor {
  height: 100%;
}

.editor-statusbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 1rem;
  background: #f8f9fa;
  border-top: 1px solid #e4e7ed;
  font-size: 0.75rem;
  color: #666;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.file-path {
  color: #2c3e50;
  font-weight: 500;
}

.language-badge {
  color: white;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-weight: 500;
  font-size: 0.625rem;
  text-transform: uppercase;
}

.encoding {
  color: #7f8c8d;
  font-family: monospace;
}

.status-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.line-info {
  font-family: monospace;
}

.lines-info {
  color: #7f8c8d;
}

.changes-indicator {
  color: #f56c6c;
  font-weight: bold;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
  100% {
    opacity: 1;
  }
}

.search-dialog {
  padding: 1rem 0;
}

.search-row,
.replace-row {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}

.search-stats {
  color: #666;
  font-size: 0.875rem;
  text-align: center;
  padding: 0.5rem 0;
}

.goto-dialog {
  text-align: center;
  padding: 1rem 0;
}

/* 深色主题适配 */
:deep(.monaco-editor .vs-dark) {
  background: #1e1e1e;
}

:deep(.monaco-editor .vs-hc-black) {
  background: #000000;
}
</style>
