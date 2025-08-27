# 百度OCR API测试平台使用说明

## 📖 概述

这是一个专门用于测试百度OCR API调用方法的独立测试平台，旨在找到可靠的API调用方案，然后将最佳实践应用到主项目中。

## 🎯 目标

1. **验证不同调用方法的可行性**
2. **识别最佳实践方案**
3. **性能基准测试**
4. **错误处理验证**
5. **为主项目集成提供指导**

## 🏗️ 平台架构

```
测试平台/
├── index.html          # 测试界面
├── test-platform.js    # 前端测试逻辑
├── test-server.js      # 后端测试服务器
└── README.md          # 使用说明
```

## 🚀 快速开始

### 1. 启动测试服务器

```bash
# 进入测试平台目录
cd test-platform

# 启动测试服务器
node test-server.js
```

**预期输出**：
```
🧪 OCR API测试服务器已启动: http://localhost:3002
📋 可用端点:
  🏠 GET  /                - 测试平台首页
  📍 GET  /api/health      - 健康检查
  🧪 GET  /api/test        - API连接测试
  🔍 POST /api/ocr         - OCR识别
  🚀 POST /api/batch-test  - 批量测试
```

### 2. 打开测试界面

在浏览器中访问：`http://localhost:3002`

### 3. 执行测试

按照界面上的测试流程依次执行：

1. **网络连通性测试** - 验证基础网络环境
2. **访问令牌测试** - 对比前端直接调用vs后端代理
3. **OCR识别测试** - 上传身份证图片进行识别
4. **性能测试** - 测试API响应时间和稳定性

## 🧪 测试项目详解

### 测试1：网络连通性检查

**目的**：验证网络环境是否支持API调用

**检查项**：
- 基础网络连接
- 百度API服务器可达性
- CORS策略检测

**预期结果**：
- ✅ 基础网络正常
- ✅ 百度API服务器可达
- ❌ CORS预检失败（正常，说明需要后端代理）

### 测试2：访问令牌获取

**方法1：前端直接调用**
- 直接从浏览器调用百度OAuth API
- 验证CORS限制影响
- 检查API密钥暴露风险

**方法2：后端代理调用**
- 通过测试服务器代理调用
- 验证CORS问题解决
- 确认API密钥安全性

**关键配置**：
```javascript
// 正确的请求格式
const params = new URLSearchParams();
params.append('grant_type', 'client_credentials');
params.append('client_id', BAIDU_CONFIG.apiKey);
params.append('client_secret', BAIDU_CONFIG.secretKey);

const response = await fetch('https://aip.baidubce.com/oauth/2.0/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': 'application/json'
  },
  body: params.toString()
});
```

### 测试3：OCR识别功能

**测试流程**：
1. 上传身份证图片（支持JPG、PNG等格式）
2. 转换为Base64编码
3. 调用OCR识别API
4. 解析识别结果

**对比方案**：
- **前端直接调用**：验证是否受CORS影响
- **后端代理调用**：验证稳定性和安全性

**关键参数**：
```javascript
const ocrParams = new URLSearchParams();
ocrParams.append('image', base64Image);
ocrParams.append('id_card_side', 'front');
ocrParams.append('detect_direction', 'true');
ocrParams.append('detect_risk', 'false');
```

### 测试4：性能测试

**测试指标**：
- 响应时间统计
- 成功率统计
- 并发处理能力
- 稳定性评估

**测试参数**：
- 测试次数：5次
- 请求间隔：1秒
- 超时时间：30秒

## 📊 预期测试结果

### 成功场景

**后端代理方案（推荐）**：
```
1. 网络连通性测试: ✅ 通过
2. 访问令牌获取测试:
   前端直接调用: ❌ CORS限制
   后端代理调用: ✅ 成功
3. OCR识别测试:
   前端直接调用: ❌ CORS限制  
   后端代理调用: ✅ 成功
4. 性能测试: ✅ 平均响应时间 < 3000ms
```

### 常见问题及解决方案

**问题1：CORS错误**
```
错误：Access to fetch at 'https://aip.baidubce.com/...' has been blocked by CORS policy
解决：使用后端代理方案
```

**问题2：访问令牌获取失败**
```
错误：API错误: invalid_client
解决：检查API Key和Secret Key配置
```

**问题3：OCR识别失败**
```
错误：[216201] image format error
解决：确保图片格式正确，Base64编码无误
```

**问题4：网络连接超时**
```
错误：fetch timeout
解决：检查网络环境，调整超时时间
```

## 🔧 配置说明

### API配置（test-server.js）

```javascript
const BAIDU_CONFIG = {
  apiKey: 'WYCtNFVBM4dh4eYvrI29Wsos',      // 来自项目记忆
  secretKey: 'qWwWkr8uU59TwSHQO0NpafeiqRtN8lTG', // 来自项目记忆
  appId: '119868043'                        // 来自项目记忆
};
```

### 端口配置

- 测试服务器：`http://localhost:3002`
- 主项目服务器：`http://localhost:3001`（避免冲突）

## 📈 集成到主项目

### 成功验证后的集成步骤

1. **确认最佳方案**：根据测试结果选择后端代理方案
2. **更新主项目配置**：将测试验证的配置应用到主项目
3. **集成错误处理**：基于测试中发现的错误类型完善处理
4. **性能优化**：根据性能测试结果优化响应时间

### 推荐的主项目集成代码

**后端OCR服务（server.js）**：
```javascript
// 基于测试验证的最佳实践
async function getAccessToken() {
  // ... 基于测试验证的令牌获取逻辑
}

async function recognizeIDCard(imageBase64, idCardSide) {
  // ... 基于测试验证的OCR识别逻辑
}
```

**前端OCR服务（backendOcrUtils.ts）**：
```typescript
// 基于测试验证的前端调用方式
class BackendOCRService {
  async recognizeIDCard(imageFile: File, idCardSide: 'front' | 'back') {
    // ... 调用后端代理API
  }
}
```

## 🚀 下一步行动

1. **运行完整测试流程**
2. **分析测试结果报告**
3. **确认推荐方案**
4. **集成到主项目**
5. **验证主项目功能**

## 📝 测试报告

测试完成后，平台会自动生成详细的测试报告，包括：
- 各测试项的成功/失败状态
- 性能统计数据
- 推荐的实施方案
- 问题排查建议

---

**开始测试**：启动测试服务器后访问 http://localhost:3002

**问题反馈**：如有问题请检查控制台日志和网络连接状态