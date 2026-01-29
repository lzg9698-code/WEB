/**
 * 模板驱动的数控程序生成器 - 主入口文件
 *
 * 此文件必须严格遵循PROJECT_REQUIREMENTS.md文档约束。
 * 任何修改都必须先更新需求文档，然后修改代码。
 * 违反此约束将导致代码被拒绝。
 */

import { createApp } from "vue";
import { createPinia } from "pinia";
import ElementPlus from "element-plus";
import "element-plus/dist/index.css";

// 导入应用组件
import App from "./components/Layout/AppLayout.vue";

// Monaco Editor Worker 配置 (必须在导入 monaco-editor 之前)
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === "json") {
      return new jsonWorker();
    }
    if (label === "css" || label === "scss" || label === "less") {
      return new cssWorker();
    }
    if (label === "html" || label === "handlebars" || label === "razor") {
      return new htmlWorker();
    }
    if (label === "typescript" || label === "javascript") {
      return new tsWorker();
    }
    return new editorWorker();
  },
};

// 导入Font Awesome图标
import { library } from "@fortawesome/fontawesome-svg-core";
import {
  faCogs,
  faFolderOpen,
  faSlidersH,
  faCode,
  faPlay,
  faFile,
  faEye,
  faEdit,
  faTrash,
  faCopy,
  faSave,
  faSearch,
  faSyncAlt,
  faPlus,
  faMinus,
  faTimes,
  faCheck,
  faExclamationTriangle,
  faInfoCircle,
  faCog,
  faMoon,
  faSun,
  faHistory,
  faClock,
  faDownload,
  faUpload,
  faFolder,
  faHome,
  faRedo,
  faPause,
  faPlay as faPlaySolid,
  faStop,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";

// 添加图标到库
library.add(
  faCogs,
  faFolderOpen,
  faSlidersH,
  faCode,
  faPlay,
  faFile,
  faEye,
  faEdit,
  faTrash,
  faCopy,
  faSave,
  faSearch,
  faSyncAlt,
  faPlus,
  faMinus,
  faTimes,
  faCheck,
  faExclamationTriangle,
  faInfoCircle,
  faCog,
  faMoon,
  faSun,
  faHistory,
  faClock,
  faDownload,
  faUpload,
  faFolder,
  faHome,
  faRedo,
  faPause,
  faPlaySolid,
  faStop,
);

// 创建Vue应用实例
const app = createApp(App);

// 安装Pinia状态管理
app.use(createPinia());

// 安装Element Plus UI框架
app.use(ElementPlus);

// 注册Font Awesome组件
app.component("font-awesome-icon", FontAwesomeIcon);

// 全局错误处理
app.config.errorHandler = (err, vm, info) => {
  console.error("应用错误:", err);
  console.error("组件:", vm);
  console.error("错误信息:", info);
};

// 挂载应用
app.mount("#app");

// 启动日志
console.log("===================================");
console.log("模板驱动的数控程序生成器");
console.log("版本: 1.0.0");
console.log("技术栈: Vue.js 3 + Flask + Jinja2");
console.log("约束状态: 激活");
console.log("===================================");
