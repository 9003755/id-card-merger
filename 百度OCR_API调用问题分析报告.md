# 百度OCR API调用失败问题分析报告

**项目**：身份证合并工具OCR功能模块  
**技术栈**：React + TypeScript + Vite + Express.js + 百度OCR API  
**日期**：2025年8月26日  
**状态**：已解决 ✅  

---

## 1. 问题概述

### 问题表现
- ❌ "网络连接失败，请检查网络连接"错误
- ❌ CORS跨域错误
- ❌ 获取访问令牌失败
- ❌ OCR识别功能完全无法使用

### 影响范围
- 阻塞OCR模块开发进度
- 用户无法使用自动命名功能
- 影响项目按期交付

---

## 2. 失败原因分析

### 2.1 架构问题
**原始架构（有问题）**：
```
前端 → 直接调用百度API → 返回结果
```

**问题**：
- 浏览器CORS跨域限制
- API密钥暴露在前端
- 网络防火墙阻止

### 2.2 技术细节
- **CORS问题**：百度API服务器未设置跨域访问头
- **请求格式错误**：使用了错误的Content-Type
- **安全风险**：API密钥直接写在前端代码中

---

## 3. 解决方案

### 3.1 架构重构
**新架构（正确）**：
```
前端 → 本地后端API → 百度API → 返回结果
```

**优势**：
- ✅ 避免CORS问题
- ✅ API密钥安全存储
- ✅ 统一错误处理

### 3.2 技术实现

**后端Express服务器**：
```javascript
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
const PORT = 3001;

// 百度OCR API配置
const BAIDU_CONFIG = {
  apiKey: 'WYCtNFVBM4dh4eYvrI29Wsos',
  secretKey: 'qWwWkr8uU59TwSHQO0NpafeiqRtN8lTG',
  appId: '119868043'
};

app.use(cors());
app.use(express.json({ limit: '10mb' }));
```

**正确的API调用格式**：
```javascript
const response = await fetch('https://aip.baidubce.com/oauth/2.0/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': 'application/json'
  },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: BAIDU_CONFIG.apiKey,
    client_secret: BAIDU_CONFIG.secretKey
  }).toString()
});
```

### 3.3 错误处理
**分类错误处理**：
```javascript
let errorCode = 'UNKNOWN_ERROR';
if (error.message.includes('访问令牌')) {
  errorCode = 'TOKEN_ERROR';
} else if (error.message.includes('网络')) {
  errorCode = 'NETWORK_ERROR';
} else if (error.message.includes('百度OCR错误')) {
  errorCode = 'BAIDU_API_ERROR';
}
```

---

## 4. 部署配置

### 4.1 本地环境
- OCR API服务器：`http://localhost:3001`
- 前端开发服务器：`http://localhost:5173`

**启动命令**：
```bash
# 后端
node server.js

# 前端
npm run dev
```

### 4.2 生产环境
**推荐方案**：Netlify Functions
- 前端：Netlify静态部署
- 后端：Netlify Functions (Serverless)
- 优势：无服务器维护，自动扩缩容

---

## 5. 测试验证

### 5.1 API测试
```bash
# 健康检查
curl http://localhost:3001/api/health

# API连接测试
curl http://localhost:3001/api/test

# OCR功能测试
curl -X POST http://localhost:3001/api/ocr \
  -H "Content-Type: application/json" \
  -d '{"image":"base64_data","id_card_side":"front"}'
```

### 5.2 功能验证
- ✅ 文件上传正常
- ✅ OCR识别成功
- ✅ 错误处理正确
- ✅ PDF生成命名正确

---

## 6. 经验总结

### 6.1 最佳实践
1. **避免前端直接调用第三方API**
2. **使用正确的Content-Type**: `application/x-www-form-urlencoded`
3. **API密钥服务器端安全存储**
4. **实现分类错误处理**
5. **添加详细日志记录**

### 6.2 常见陷阱
- ❌ 直接前端调用第三方API
- ❌ 错误的请求格式
- ❌ API密钥硬编码
- ❌ 缺乏错误分类
- ❌ 忽略网络环境差异

### 6.3 性能优化
```javascript
// 访问令牌缓存
let accessToken = null;
let tokenExpireTime = 0;

if (accessToken && Date.now() < tokenExpireTime) {
  return accessToken; // 使用缓存
}
```

---

## 7. 结论

### 7.1 解决效果
- ✅ 消除CORS跨域限制
- ✅ 绕过网络防火墙
- ✅ 提高API密钥安全性
- ✅ 增强错误处理能力
- ✅ 改善用户体验

### 7.2 技术债务
- 当前使用本地Express，生产需Netlify Functions
- 缺乏API调用监控
- 需要添加结果缓存

### 7.3 未来改进
1. **短期**：迁移到Netlify Functions
2. **中期**：添加监控和缓存
3. **长期**：支持多OCR服务商

---

**技术要点记录**：
- 百度OCR API配置：API Key: `WYCtNFVBM4dh4eYvrI29Wsos`
- 项目技术栈：React + TypeScript + Vite
- 关键解决方案：后端代理架构
- 部署偏好：Netlify (国内访问良好)

---
*报告完成时间：2025年8月26日*