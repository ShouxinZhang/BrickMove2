# HTML Display - Proof Template Editor

一个用于编辑和预览数学证明模板的可视化工具，支持 JSON 格式的结构化输入和 Markdown 预览。

## 功能特性

- ✅ **结构化证明编辑**：支持步骤（steps）和子步骤（substeps）的层级组织
- ✅ **直接输入 JSON**：支持从文件加载或直接粘贴 JSON 内容
- ✅ **实时预览**：使用 Marked.js 和 KaTeX 实时渲染 Markdown 和数学公式
- ✅ **API 统计**：自动统计和显示所有使用的 API 及其出现次数
- ✅ **拖放支持**：支持拖放文件到界面
- ✅ **导出功能**：保存为标准 JSON 格式

## 快速开始

`bash scripts/start_server.sh`

## 使用说明

### 1. 加载证明模板

有三种方式加载证明模板：
- **选择文件**：点击 "Choose JSON File" 按钮选择 JSON 文件
- **直接输入**：点击 "从文本加载JSON" 按钮，粘贴 JSON 内容
- **拖放**：直接将 JSON 文件拖放到文件选择区域

### 2. 编辑证明步骤

每个步骤可以有：
- 标题（可选）
- 总体描述（可选）  
- 多个子步骤，每个子步骤包含描述和 API 列表

### 3. API 统计

底部显示：
- 总 API 数量（包含重复）
- 唯一 API 数量
- 所有唯一 API 列表及出现次数

### 4. 保存工作

点击 "下载保存" 按钮，保存为标准 JSON 格式。

## JSON 格式

支持 substeps 格式：
```json
{
  "theorem_id": "theorem_name",
  "statement": "定理陈述",
  "steps": [
    {
      "title": "步骤标题",
      "description": "总体描述",
      "substeps": [
        {
          "description": "子步骤描述",
          "apis": ["API1", "API2"]
        }
      ]
    }
  ]
}
```

## 示例文件

- `data/proof_templates/default.json` - 模板示例
- `data/proof_templates/100.json` - 完整证明示例
