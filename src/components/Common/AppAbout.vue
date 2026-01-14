<!--
  关于组件
  
  严格遵循PROJECT_REQUIREMENTS.md文档约束
  功能：显示应用信息和版本信息
-->
<template>
  <div class="app-about">
    <div class="about-header">
      <div class="app-icon">
        <i class="fas fa-cogs"></i>
      </div>
      <h2>模板驱动的数控程序生成器</h2>
      <p class="version">版本 {{ appVersion }}</p>
    </div>

    <div class="about-content">
      <div class="description">
        <p>
          这是一个基于模板驱动的数控程序生成系统，支持Jinja2模板引擎，
          提供完整的模板管理、参数配置、代码编辑和渲染输出功能。
        </p>
      </div>

      <div class="tech-stack">
        <h4>技术栈</h4>
        <div class="tech-list">
          <div class="tech-item">
            <span class="tech-name">前端</span>
            <span class="tech-value">Vue.js 3 + TypeScript + Pinia</span>
          </div>
          <div class="tech-item">
            <span class="tech-name">后端</span>
            <span class="tech-value">Python Flask + Jinja2</span>
          </div>
          <div class="tech-item">
            <span class="tech-name">编辑器</span>
            <span class="tech-value">Monaco Editor</span>
          </div>
          <div class="tech-item">
            <span class="tech-name">配置格式</span>
            <span class="tech-value">YAML</span>
          </div>
          <div class="tech-item">
            <span class="tech-name">模板引擎</span>
            <span class="tech-value">Jinja2</span>
          </div>
        </div>
      </div>

      <div class="features">
        <h4>主要功能</h4>
        <ul>
          <li><i class="fas fa-check"></i> 模板包管理（导入、导出、扫描、验证）</li>
          <li><i class="fas fa-check"></i> 参数管理（输入、验证、计算、预设）</li>
          <li><i class="fas fa-check"></i> 代码编辑（语法高亮、自动完成、格式化）</li>
          <li><i class="fas fa-check"></i> 模板渲染（批量渲染、预览、错误处理）</li>
          <li><i class="fas fa-check"></i> 文件管理（浏览、搜索、操作、历史）</li>
        </ul>
      </div>

      <div class="constraint-notice">
        <div class="notice-header">
          <i class="fas fa-shield-alt"></i>
          <span>约束声明</span>
        </div>
        <p>
          本项目严格遵循 PROJECT_REQUIREMENTS.md 文档约束。
          所有代码修改必须符合文档定义，不得实现超出范围的功能。
        </p>
      </div>

      <div class="links">
        <a href="#" @click.prevent="openDocumentation">
          <i class="fas fa-book"></i>
          文档
        </a>
        <a href="#" @click.prevent="openRepository">
          <i class="fab fa-github"></i>
          源码
        </a>
        <a href="#" @click.prevent="reportIssue">
          <i class="fas fa-bug"></i>
          反馈
        </a>
      </div>
    </div>

    <div class="about-footer">
      <p>© 2024 模板驱动的数控程序生成器</p>
      <p class="constraint-status">
        <i class="fas fa-shield-alt"></i>
        约束执行状态: <span class="status-active">激活中</span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from 'element-plus'

const appVersion = '1.0.0'

const openDocumentation = () => {
  ElMessage.info('打开文档')
}

const openRepository = () => {
  ElMessage.info('打开源码仓库')
}

const reportIssue = () => {
  ElMessage.info('报告问题')
}
</script>

<style scoped>
.app-about {
  text-align: center;
}

.about-header {
  margin-bottom: 24px;
}

.app-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--vscode-button-background);
  border-radius: 20px;
  font-size: 40px;
  color: white;
}

.about-header h2 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
}

.version {
  margin: 0;
  color: var(--vscode-descriptionForeground);
  font-size: 14px;
}

.about-content {
  text-align: left;
  margin-bottom: 24px;
}

.description {
  margin-bottom: 24px;
  padding: 16px;
  background: var(--vscode-textCodeBlock-background);
  border-radius: 6px;
}

.description p {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
}

.tech-stack, .features {
  margin-bottom: 20px;
}

.tech-stack h4, .features h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
}

.tech-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tech-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--vscode-editor-background);
  border-radius: 4px;
}

.tech-name {
  font-weight: 500;
  color: var(--vscode-foreground);
}

.tech-value {
  color: var(--vscode-descriptionForeground);
  font-size: 13px;
}

.features ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.features li {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  font-size: 13px;
}

.features li i {
  color: var(--vscode-testing-iconPassed);
}

.constraint-notice {
  padding: 16px;
  background: var(--vscode-inputValidation-infoBackground);
  border: 1px solid var(--vscode-inputValidation-infoBorder);
  border-radius: 6px;
  margin-bottom: 20px;
}

.notice-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-weight: 600;
  color: var(--vscode-textLink-foreground);
}

.constraint-notice p {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--vscode-descriptionForeground);
}

.links {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-bottom: 20px;
}

.links a {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--vscode-textLink-foreground);
  text-decoration: none;
  font-size: 13px;
  transition: opacity 0.2s;
}

.links a:hover {
  opacity: 0.8;
}

.about-footer {
  border-top: 1px solid var(--vscode-panel-border);
  padding-top: 16px;
}

.about-footer p {
  margin: 0 0 4px 0;
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
}

.constraint-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.status-active {
  color: var(--vscode-testing-iconPassed);
  font-weight: 500;
}
</style>