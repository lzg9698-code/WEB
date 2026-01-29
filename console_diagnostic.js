// ==========================================
// 浏览器控制台诊断脚本
// ==========================================
// 复制以下所有代码，在浏览器控制台中按回车执行
// ==========================================

console.log("%c=== Vue 应用诊断 ===", "font-size: 16px; font-weight: bold; color: blue;");

// 1. 检查 Vue 是否加载
console.log("\n1. Vue 加载状态:");
console.log("   Vue 全局对象:", typeof Vue !== 'undefined' ? '✅' : '❌');

// 2. 检查应用容器
console.log("\n2. 应用容器:");
const app = document.querySelector('#app');
console.log("   #app 存在:", app ? '✅' : '❌');
if (app) {
  console.log("   #app 子元素数量:", app.children.length);
}

// 3. 查找导航菜单
console.log("\n3. 导航菜单:");
const navItems = document.querySelectorAll('.nav-item');
console.log("   导航项数量:", navItems.length);
navItems.forEach((item, i) => {
  console.log(`   [${i}] ${item.textContent.trim().substring(0, 30)}...`);
});

// 4. 查找参数管理模块
console.log("\n4. 参数管理模块:");
const paramContent = document.querySelector('[class*="module-content"]');
if (paramContent) {
  console.log("   ✅ 模块内容区域存在");
  
  // 5. 查找模板选择器
  const templateSelect = paramContent.querySelector('.template-select, .el-select');
  console.log("   模板选择器:", templateSelect ? '✅' : '❌');
  
  // 6. 查找操作按钮区域
  const actions = paramContent.querySelector('.parameter-actions, [class*="actions"]');
  console.log("   操作按钮区域:", actions ? '✅' : '❌');
  
  if (actions) {
    const buttons = actions.querySelectorAll('button, .el-button');
    console.log("   按钮数量:", buttons.length);
    buttons.forEach((btn, i) => {
      console.log(`   按钮 ${i+1}: ${btn.textContent.trim().substring(0, 20)}`);
    });
  }
  
  // 7. 查找所有按钮
  const allButtons = paramContent.querySelectorAll('button');
  console.log("   所有按钮:", allButtons.length);
} else {
  console.log("   ❌ 模块内容区域不存在");
}

// 8. 检查是否有隐藏的元素
console.log("\n5. 隐藏元素检查:");
const hiddenElements = paramContent?.querySelectorAll('[style*="display: none"], [style*="visibility: hidden"]');
console.log("   隐藏元素数量:", hiddenElements?.length || 0);

// 9. 检查空状态
console.log("\n6. 空状态检查:");
const emptyState = paramContent?.querySelector('.empty-state');
console.log("   空状态提示:", emptyState ? '✅ 存在' : '❌ 不存在');
if (emptyState) {
  console.log("   空状态内容:", emptyState.textContent.trim().substring(0, 50));
}

// 10. 查找 Vue 组件实例
console.log("\n7. Vue 组件实例:");
if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__) {
  console.log("   Vue DevTools: ✅");
} else {
  console.log("   Vue DevTools: ❌ (可能未安装)");
}

console.log("\n%c=== 诊断完成 ===", "font-size: 16px; font-weight: bold; color: blue;");
console.log("请截图以上输出发送给开发者进行进一步诊断。");

// 11. 查找 select 元素中的选项
console.log("\n额外信息 - Select 元素:");
const selectEl = document.querySelector('select');
if (selectEl) {
  const options = selectEl.querySelectorAll('option');
  console.log("   Select 选项数量:", options.length);
  options.forEach((opt, i) => {
    console.log(`   [${i}] ${opt.textContent.trim().substring(0, 30)}`);
  });
} else {
  console.log("   未找到 select 元素");
}

