# 浏览器控制台诊断指南

请按以下步骤诊断按钮不显示的问题：

## 步骤 1: 打开开发者工具
1. 按 `F12` 打开 Chrome 开发者工具
2. 切换到 `Console` (控制台) 标签
3. 刷新页面 (按 `Ctrl+Shift+R` 或 `Cmd+Shift+R`)

## 步骤 2: 检查 Vue 实例
在控制台中执行以下代码，复制粘贴后按回车：

```javascript
// 检查 Vue 是否加载
console.log("Vue 版本:", typeof Vue);

// 检查组件实例
const app = document.querySelector('#app');
if (app && app.__vue_app__) {
  const vueApp = app.__vue_app__;
  console.log("Vue 应用实例:", vueApp);
}

// 检查当前状态
const activeModule = window.activeModule || 
  document.querySelector('[class*="nav-item active"]')?.textContent?.trim();
console.log("当前模块:", activeModule);

// 查找所有按钮
document.querySelectorAll('.parameter-actions button, .el-button').forEach((btn, i) => {
  console.log(`按钮 ${i}:`, btn.textContent.trim());
});
```

## 步骤 3: 检查常见错误

查看控制台中是否有以下错误：

### 错误 1: "updateParameter has already been declared"
**解决**: 强制刷新浏览器 (Ctrl+Shift+R)

### 错误 2: "useRenderStore is not defined"
**解决**: 检查网络请求是否加载了 renderStore.ts

### 错误 3: "renderApi is not defined"  
**解决**: 检查 api.ts 是否正确加载

## 步骤 4: 检查网络请求

在开发者工具中切换到 `Network` 标签：

1. 刷新页面
2. 检查以下文件是否都加载成功 (状态 200):
   - `App.vue`
   - `renderStore.ts`
   - `api.ts`
   - `renderStore.ts`

3. 如果有文件显示红色 (404/500)，说明文件路径有问题

## 步骤 5: 检查 Vue DevTools

如果安装了 Vue DevTools：
1. 打开 Vue 面板
2. 检查 Root 组件的 data
3. 确认 `activeModule` 的值是 `"parameter"`
4. 确认 `selectedTemplateForParameter` 不为 null
5. 展开 `renderStore` 检查 `isRendering` 和 `renderResult`

## 步骤 6: 手动测试按钮渲染

在控制台执行：

```javascript
// 模拟选择模板
if (typeof selectedTemplateForParameter !== 'undefined') {
  selectedTemplateForParameter.value = 'example';
  console.log("已设置模板为: example");
} else {
  console.log("变量未定义，可能是 Vue 还没加载");
}

// 强制更新视图
document.querySelectorAll('.parameter-content').forEach(el => {
  console.log("找到参数内容区域:", el);
});
```

## 步骤 7: 检查 CSS 样式

在开发者工具的 `Elements` 标签：
1. 找到 `<div class="parameter-actions">`
2. 检查是否设置了 `display: none` 或 `visibility: hidden`
3. 检查父元素是否有 overflow: hidden 导致按钮不可见

## 常见问题汇总

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 按钮完全不显示 | 编译错误阻止渲染 | 检查控制台错误，强制刷新 |
| 按钮存在但看不见 | CSS 样式问题 | 检查 display/visibility 属性 |
| 按钮点击没反应 | JavaScript 错误 | 检查控制台错误日志 |
| 只看到部分按钮 | v-if 条件不满足 | 检查 selectedTemplateForParameter |

## 重启服务命令

如果以上都不行，尝试完全重启：

```bash
# 1. 停止所有服务
pkill -f "node.*vite"
pkill -f "python3 app.py"

# 2. 清除缓存
rm -rf /home/lzg9698/my_project/mytool/node_modules/.vite

# 3. 重启服务
cd /home/lzg9698/my_project/mytool
python3 app.py > /tmp/flask.log 2>&1 &
npm run dev > /tmp/vite.log 2>&1 &

# 4. 等待 15 秒后刷新浏览器
```

## 获取帮助

如果问题仍然存在：
1. 截图控制台中的错误信息
2. 截图 Network 标签中的状态
3. 截图 Elements 标签中按钮的 HTML 结构
4. 发送截图给我诊断
