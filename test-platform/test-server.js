// 百度OCR API测试专用服务器
// 根据项目记忆中的API配置和错误处理规范设计

import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3002; // 使用不同端口避免冲突

// 百度OCR API配置（从项目记忆中获取）
const BAIDU_CONFIG = {
  apiKey: 'WYCtNFVBM4dh4eYvrI29Wsos',
  secretKey: 'qWwWkr8uU59TwSHQO0NpafeiqRtN8lTG',
  appId: '119868043'
};

let accessToken = null;
let tokenExpireTime = 0;

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(__dirname)); // 提供静态文件服务

/**
 * 获取百度OCR访问令牌
 * 根据第三方API调用规范实现，增加详细诊断
 */
async function getAccessToken() {
  // 令牌缓存机制
  if (accessToken && Date.now() < tokenExpireTime) {
    console.log('使用缓存的访问令牌');
    return accessToken;
  }

  console.log('开始获取新的访问令牌...');
  
  try {
    // 步骤1：网络连通性检查
    console.log('步骤1：检查百度API服务器连通性...');
    
    try {
      const pingResponse = await fetch('https://aip.baidubce.com', {
        method: 'HEAD',
        timeout: 5000
      });
      console.log('✅ 百度API服务器可达');
    } catch (pingError) {
      console.log('⚠️ 百度API服务器连接测试失败:', pingError.message);
      console.log('尝试继续执行令牌请求...');
    }
    
    // 步骤2：构建请求参数
    console.log('步骤2：构建令牌请求参数...');
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', BAIDU_CONFIG.apiKey);
    params.append('client_secret', BAIDU_CONFIG.secretKey);
    
    console.log('请求参数:', {
      grant_type: 'client_credentials',
      client_id: BAIDU_CONFIG.apiKey.substring(0, 8) + '...',
      client_secret: BAIDU_CONFIG.secretKey.substring(0, 8) + '...'
    });
    
    // 步骤3：发送令牌请求（增加更详细的错误处理）
    console.log('步骤3：发送令牌请求...');
    
    const requestOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: params.toString(),
      timeout: 15000 // 增加超时时间到15秒
    };
    
    console.log('请求详情:', {
      url: 'https://aip.baidubce.com/oauth/2.0/token',
      method: requestOptions.method,
      headers: requestOptions.headers,
      bodyLength: requestOptions.body.length
    });
    
    const response = await fetch('https://aip.baidubce.com/oauth/2.0/token', requestOptions);

    console.log('令牌请求响应状态:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('令牌请求失败响应体:', errorText);
      throw new Error(`获取访问令牌失败: HTTP ${response.status} - ${response.statusText}\n响应内容: ${errorText}`);
    }

    const data = await response.json();
    console.log('令牌响应数据:', {
      success: !data.error,
      error: data.error,
      error_description: data.error_description,
      expires_in: data.expires_in,
      access_token_length: data.access_token ? data.access_token.length : 0
    });
    
    if (data.error) {
      throw new Error(`百度API错误: [${data.error}] ${data.error_description || '未知错误'}`);
    }

    if (!data.access_token) {
      throw new Error('响应中没有access_token字段');
    }

    accessToken = data.access_token;
    tokenExpireTime = Date.now() + (data.expires_in - 300) * 1000; // 提前5分钟过期
    
    console.log('✅ 成功获取访问令牌');
    console.log(`令牌长度: ${accessToken.length}`);
    console.log(`有效期至: ${new Date(tokenExpireTime).toLocaleString()}`);
    
    return accessToken;
    
  } catch (error) {
    console.error('❌ 获取百度OCR访问令牌失败:', error);
    
    // 详细错误分析
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.error('🔍 错误分析: 网络请求被阻止');
      console.error('可能原因:');
      console.error('  1. 企业防火墙阻止外部API访问');
      console.error('  2. 网络代理设置问题');
      console.error('  3. DNS解析失败');
      console.error('  4. ISP网络策略限制');
      
      console.error('建议解决方案:');
      console.error('  1. 检查网络代理设置');
      console.error('  2. 尝试使用VPN或其他网络环境');
      console.error('  3. 联系网络管理员调整防火墙设置');
      console.error('  4. 考虑使用本地模拟数据进行开发');
    } else if (error.message.includes('timeout')) {
      console.error('🔍 错误分析: 请求超时');
      console.error('可能原因: 网络连接不稳定或百度服务器响应慢');
    } else if (error.message.includes('HTTP')) {
      console.error('🔍 错误分析: HTTP响应错误');
      console.error('可能原因: API密钥配置问题或服务器端错误');
    }
    
    // 清除可能的无效token
    accessToken = null;
    tokenExpireTime = 0;
    
    throw new Error(`获取访问令牌失败: ${error.message}`);
  }
}

/**
 * 调用百度OCR身份证识别API
 * 根据第三方API调用规范实现完整错误处理
 */
async function recognizeIDCard(imageBase64, idCardSide) {
  console.log('开始OCR识别，卡片类型:', idCardSide);
  
  try {
    const token = await getAccessToken();
    
    // 验证图片base64格式
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      throw new Error('无效的图片数据');
    }
    
    // 构建请求参数
    const params = new URLSearchParams();
    params.append('image', imageBase64);
    params.append('id_card_side', idCardSide);
    params.append('detect_direction', 'true'); // 检测方向
    params.append('detect_risk', 'false'); // 不检测风险
    
    console.log('OCR请求参数:', {
      image_length: imageBase64.length,
      id_card_side: idCardSide,
      detect_direction: 'true'
    });
    
    const url = `https://aip.baidubce.com/rest/2.0/ocr/v1/idcard?access_token=${token}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: params.toString(),
      timeout: 30000 // 30秒超时
    });

    console.log('OCR请求响应状态:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OCR请求失败响应:', errorText);
      throw new Error(`OCR识别请求失败: HTTP ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    console.log('OCR响应数据:', {
      error_code: data.error_code,
      error_msg: data.error_msg,
      words_result_num: data.words_result_num,
      has_words_result: !!data.words_result
    });

    if (data.error_code) {
      throw new Error(`百度OCR错误 [${data.error_code}]: ${data.error_msg}`);
    }
    
    if (!data.words_result) {
      throw new Error('OCR响应中没有识别结果');
    }

    console.log('OCR识别成功，识别到', data.words_result_num, '个字段');
    return data;
    
  } catch (error) {
    console.error('OCR识别过程失败:', error);
    throw new Error(`OCR识别失败: ${error.message}`);
  }
}

// 首页 - 提供测试平台
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 网络诊断端点
app.get('/api/network-diagnosis', async (req, res) => {
  const diagnosticResults = {
    timestamp: new Date().toISOString(),
    tests: [],
    summary: {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      recommendations: []
    }
  };
  
  try {
    console.log('开始网络诊断...');
    
    // 测试1：本地网络连接
    diagnosticResults.tests.push(await testLocalNetwork());
    
    // 测试2：百度主站连通性
    diagnosticResults.tests.push(await testBaiduMainSite());
    
    // 测试3：百度API服务器连通性
    diagnosticResults.tests.push(await testBaiduAPIServer());
    
    // 测试4：具体API路径
    diagnosticResults.tests.push(await testBaiduAPIEndpoint());
    
    // 测试5：DNS解析
    diagnosticResults.tests.push(await testDNSResolution());
    
    // 统计结果
    diagnosticResults.summary.totalTests = diagnosticResults.tests.length;
    diagnosticResults.summary.passedTests = diagnosticResults.tests.filter(t => t.success).length;
    diagnosticResults.summary.failedTests = diagnosticResults.tests.filter(t => !t.success).length;
    
    // 生成建议
    generateNetworkRecommendations(diagnosticResults);
    
    res.json({
      success: true,
      data: diagnosticResults
    });
    
  } catch (error) {
    console.error('网络诊断失败:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      data: diagnosticResults
    });
  }
});

// 模拟OCR数据端点（用于网络受限环境）
app.post('/api/mock-ocr', (req, res) => {
  const { id_card_side } = req.body;
  
  console.log('📋 使用模拟OCR数据，卡片类型:', id_card_side);
  
  // 模拟身份证正面数据
  const mockFrontData = {
    "direction": 0,
    "image_status": "normal",
    "risk_type": "normal",
    "edit_tool": "normal",
    "log_id": Date.now(),
    "words_result_num": 5,
    "words_result": {
      "姓名": { "location": { "left": 142, "top": 72, "width": 94, "height": 32 }, "words": "张三" },
      "民族": { "location": { "left": 142, "top": 114, "width": 30, "height": 32 }, "words": "汉" },
      "住址": { "location": { "left": 142, "top": 156, "width": 224, "height": 84 }, "words": "北京市朝阳区某某街道123号" },
      "公民身份号码": { "location": { "left": 197, "top": 270, "width": 169, "height": 32 }, "words": "110101199001011234" },
      "出生": { "location": { "left": 142, "top": 198, "width": 94, "height": 32 }, "words": "1990年1月1日" },
      "性别": { "location": { "left": 256, "top": 114, "width": 30, "height": 32 }, "words": "男" }
    }
  };
  
  // 模拟身份证背面数据
  const mockBackData = {
    "direction": 0,
    "image_status": "normal",
    "risk_type": "normal",
    "edit_tool": "normal",
    "log_id": Date.now(),
    "words_result_num": 4,
    "words_result": {
      "签发机关": { "location": { "left": 125, "top": 101, "width": 155, "height": 32 }, "words": "北京市公安局朝阳分局" },
      "签发日期": { "location": { "left": 125, "top": 143, "width": 94, "height": 32 }, "words": "2010.01.01" },
      "失效日期": { "location": { "left": 234, "top": 143, "width": 94, "height": 32 }, "words": "2030.01.01" }
    }
  };
  
  const mockData = id_card_side === 'front' ? mockFrontData : mockBackData;
  
  // 模拟网络延迟
  setTimeout(() => {
    res.json({
      success: true,
      data: mockData,
      meta: {
        mock: true,
        message: '使用模拟数据（网络受限环境）',
        processingTime: 1500 + Math.random() * 1000,
        timestamp: new Date().toISOString()
      }
    });
  }, 1000 + Math.random() * 500);
});

// 首页路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 健康检查端点
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'OCR API测试服务器正常运行',
    version: '1.1.0',
    features: [
      '网络诊断',
      '模拟OCR数据',
      '增强错误分析'
    ],
    timestamp: new Date().toISOString()
  });
});

// 网络诊断辅助函数
async function testLocalNetwork() {
  try {
    const start = Date.now();
    // 测试本地网络（访问本地服务器）
    const response = await fetch('http://localhost:3002/api/health', {
      timeout: 3000
    });
    const duration = Date.now() - start;
    
    return {
      test: '本地网络连接',
      success: response.ok,
      duration: duration,
      details: `状态: ${response.status}`,
      recommendation: response.ok ? null : '检查本地网络设置'
    };
  } catch (error) {
    return {
      test: '本地网络连接',
      success: false,
      duration: 3000,
      details: error.message,
      recommendation: '检查网络适配器和防火墙设置'
    };
  }
}

async function testBaiduMainSite() {
  try {
    const start = Date.now();
    const response = await fetch('https://www.baidu.com/', {
      method: 'HEAD',
      timeout: 5000
    });
    const duration = Date.now() - start;
    
    return {
      test: '百度主站访问',
      success: response.ok,
      duration: duration,
      details: `状态: ${response.status}`,
      recommendation: response.ok ? null : '检查基础网络连接'
    };
  } catch (error) {
    return {
      test: '百度主站访问',
      success: false,
      duration: 5000,
      details: error.message,
      recommendation: '检查网络连接或使用VPN'
    };
  }
}

async function testBaiduAPIServer() {
  try {
    const start = Date.now();
    const response = await fetch('https://aip.baidubce.com/', {
      method: 'HEAD',
      timeout: 8000
    });
    const duration = Date.now() - start;
    
    return {
      test: '百度API服务器',
      success: response.ok,
      duration: duration,
      details: `状态: ${response.status}`,
      recommendation: response.ok ? null : '百度API服务器不可达，可能被防火墙阻止'
    };
  } catch (error) {
    return {
      test: '百度API服务器',
      success: false,
      duration: 8000,
      details: error.message,
      recommendation: '百度API服务器被阻止，考虑使用代理或VPN'
    };
  }
}

async function testBaiduAPIEndpoint() {
  try {
    const start = Date.now();
    // 测试具体的OAuth端点
    const response = await fetch('https://aip.baidubce.com/oauth/2.0/token', {
      method: 'OPTIONS', // 使用OPTIONS避免实际请求
      timeout: 10000
    });
    const duration = Date.now() - start;
    
    return {
      test: '百度OAuth端点',
      success: true, // OPTIONS请求通常都会成功
      duration: duration,
      details: `状态: ${response.status}`,
      recommendation: null
    };
  } catch (error) {
    return {
      test: '百度OAuth端点',
      success: false,
      duration: 10000,
      details: error.message,
      recommendation: 'OAuth端点不可达，请检查网络策略'
    };
  }
}

async function testDNSResolution() {
  try {
    const start = Date.now();
    // 通过不同的端点测试DNS解析
    const response = await fetch('https://aip.baidubce.com/favicon.ico', {
      method: 'HEAD',
      timeout: 5000
    });
    const duration = Date.now() - start;
    
    return {
      test: 'DNS解析测试',
      success: true,
      duration: duration,
      details: 'DNS解析正常',
      recommendation: null
    };
  } catch (error) {
    return {
      test: 'DNS解析测试',
      success: false,
      duration: 5000,
      details: error.message,
      recommendation: '检查DNS设置，尝试使用 8.8.8.8 或 114.114.114.114'
    };
  }
}

function generateNetworkRecommendations(diagnosticResults) {
  const { tests, summary } = diagnosticResults;
  
  if (summary.failedTests === 0) {
    summary.recommendations.push('✅ 网络环境良好，可以直接使用百度OCR API');
    return;
  }
  
  // 根据失败的测试项生成建议
  const failedTests = tests.filter(t => !t.success);
  
  if (failedTests.some(t => t.test.includes('百度API服务器'))) {
    summary.recommendations.push('🚫 百度API服务器被阻止，建议使用代理或VPN');
    summary.recommendations.push('🎭 可以使用模拟数据进行功能测试 (/api/mock-ocr)');
  }
  
  if (failedTests.some(t => t.test.includes('本地网络'))) {
    summary.recommendations.push('🔌 检查本地网络适配器和防火墙设置');
  }
  
  if (failedTests.some(t => t.test.includes('DNS'))) {
    summary.recommendations.push('🌐 更改DNS设置为 8.8.8.8 或 114.114.114.114');
  }
  
  if (failedTests.length === tests.length) {
    summary.recommendations.push('⚠️ 网络环境严重限制，建议在其他网络环境下测试');
  }
}

// 网络诊断端点
app.get('/api/network-diagnosis', async (req, res) => {
  const diagnosis = {
    timestamp: new Date().toISOString(),
    tests: [],
    summary: {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      success: false,
      recommendations: []
    }
  };

  try {
    console.log('🔍 开始网络诊断...');
    
    // 测试1：本地网络连接
    try {
      const localTest = await testLocalNetwork();
      diagnosis.tests.push({
        name: '本地网络连接',
        success: localTest.success,
        duration: localTest.duration,
        details: localTest.details,
        recommendation: localTest.recommendation
      });
    } catch (error) {
      diagnosis.tests.push({
        name: '本地网络连接',
        success: false,
        duration: 0,
        details: `测试失败: ${error.message}`,
        recommendation: '检查本地网络设置'
      });
    }
    
    // 测试2：百度主站访问
    try {
      const baiduTest = await testBaiduMainSite();
      diagnosis.tests.push({
        name: '百度主站访问',
        success: baiduTest.success,
        duration: baiduTest.duration,
        details: baiduTest.details,
        recommendation: baiduTest.recommendation
      });
    } catch (error) {
      diagnosis.tests.push({
        name: '百度主站访问',
        success: false,
        duration: 0,
        details: `测试失败: ${error.message}`,
        recommendation: '检查基础网络连接'
      });
    }
    
    // 测试3：百度API服务器
    try {
      const apiServerTest = await testBaiduAPIServer();
      diagnosis.tests.push({
        name: '百度API服务器',
        success: apiServerTest.success,
        duration: apiServerTest.duration,
        details: apiServerTest.details,
        recommendation: apiServerTest.recommendation
      });
    } catch (error) {
      diagnosis.tests.push({
        name: '百度API服务器',
        success: false,
        duration: 0,
        details: `测试失败: ${error.message}`,
        recommendation: '百度API服务器不可达'
      });
    }
    
    // 测试4：DNS解析测试
    try {
      const dnsTest = await testDNSResolution();
      diagnosis.tests.push({
        name: 'DNS解析测试',
        success: dnsTest.success,
        duration: dnsTest.duration,
        details: dnsTest.details,
        recommendation: dnsTest.recommendation
      });
    } catch (error) {
      diagnosis.tests.push({
        name: 'DNS解析测试',
        success: false,
        duration: 0,
        details: `测试失败: ${error.message}`,
        recommendation: '检查DNS设置'
      });
    }
    
    // 测试5：百度API访问
    try {
      const token = await getAccessToken();
      diagnosis.tests.push({
        name: '百度API访问测试',
        success: true,
        duration: 1000, // 估计值
        details: `成功获取访问令牌，长度: ${token.length}`,
        recommendation: null
      });
      diagnosis.summary.success = true;
    } catch (apiError) {
      diagnosis.tests.push({
        name: '百度API访问测试',
        success: false,
        duration: 1000,
        details: `API访问失败: ${apiError.message}`,
        recommendation: '检查API密钥配置或网络连接'
      });
    }
    
    // 统计结果
    diagnosis.summary.totalTests = diagnosis.tests.length;
    diagnosis.summary.passedTests = diagnosis.tests.filter(t => t.success).length;
    diagnosis.summary.failedTests = diagnosis.tests.filter(t => !t.success).length;
    
    // 生成建议
    generateNetworkRecommendations(diagnosis);
    
    console.log(`网络诊断完成: ${diagnosis.summary.passedTests}/${diagnosis.summary.totalTests} 项测试通过`);
    
    res.json({
      success: true,
      data: diagnosis
    });
    
  } catch (error) {
    console.error('网络诊断失败:', error);
    
    diagnosis.tests.push({
      name: '诊断过程',
      success: false,
      duration: 0,
      details: `诊断过程异常: ${error.message}`,
      recommendation: '请检查服务器状态'
    });
    
    res.status(500).json({
      success: false,
      error: error.message,
      data: diagnosis
    });
  }
});

// 测试连接端点（增强版）
app.get('/api/test', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('🧪 开始百度OCR API连接测试...');
    
    // 测试获取访问令牌
    const token = await getAccessToken();
    const duration = Date.now() - startTime;
    
    res.json({
      success: true,
      message: 'API连接正常',
      data: {
        hasToken: !!token,
        tokenLength: token ? token.length : 0,
        responseTime: duration,
        timestamp: new Date().toISOString(),
        environment: {
          node_version: process.version,
          platform: process.platform
        }
      }
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ API连接测试失败:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      responseTime: duration,
      timestamp: new Date().toISOString(),
      troubleshooting: {
        suggestions: [
          '检查网络连接状态',
          '验证API密钥配置',
          '尝试运行网络诊断: GET /api/network-diagnosis',
          '考虑使用模拟数据: POST /api/mock-ocr'
        ]
      }
    });
  }
});

// OCR识别端点
app.post('/api/ocr', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { image, id_card_side } = req.body;
    
    console.log('收到OCR请求:', { 
      timestamp: new Date().toISOString(),
      image_length: image ? image.length : 0,
      id_card_side,
      has_image: !!image
    });
    
    // 参数验证
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: '缺少图片数据或格式不正确',
        code: 'INVALID_IMAGE'
      });
    }
    
    if (!id_card_side || !['front', 'back'].includes(id_card_side)) {
      return res.status(400).json({ 
        success: false, 
        error: '身份证面参数无效，必须是front或back',
        code: 'INVALID_SIDE'
      });
    }

    // 调用百度OCR API
    const result = await recognizeIDCard(image, id_card_side);
    
    const processingTime = Date.now() - startTime;
    console.log(`OCR识别成功，耗时: ${processingTime}ms`);

    res.json({
      success: true,
      data: result,
      meta: {
        processingTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`OCR识别失败 (耗时: ${processingTime}ms):`, error);
    
    // 分类错误类型
    let errorCode = 'UNKNOWN_ERROR';
    let statusCode = 500;
    
    if (error.message.includes('访问令牌')) {
      errorCode = 'TOKEN_ERROR';
      statusCode = 401;
    } else if (error.message.includes('网络') || error.message.includes('timeout')) {
      errorCode = 'NETWORK_ERROR';
      statusCode = 503;
    } else if (error.message.includes('百度OCR错误')) {
      errorCode = 'BAIDU_API_ERROR';
      statusCode = 422;
    }
    
    res.status(statusCode).json({
      success: false,
      error: error.message || '识别失败',
      code: errorCode,
      meta: {
        processingTime,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// 批量测试端点（用于性能测试）
app.post('/api/batch-test', async (req, res) => {
  const { count = 5 } = req.body;
  const results = [];
  
  try {
    console.log(`开始批量测试，执行 ${count} 次请求...`);
    
    for (let i = 0; i < count; i++) {
      const startTime = Date.now();
      
      try {
        await getAccessToken();
        const duration = Date.now() - startTime;
        
        results.push({
          test: i + 1,
          success: true,
          duration: duration
        });
        
        console.log(`批量测试 ${i + 1}/${count} 成功，耗时: ${duration}ms`);
        
      } catch (error) {
        const duration = Date.now() - startTime;
        
        results.push({
          test: i + 1,
          success: false,
          duration: duration,
          error: error.message
        });
        
        console.log(`批量测试 ${i + 1}/${count} 失败，耗时: ${duration}ms`);
      }
      
      // 避免请求过频繁
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
    
    res.json({
      success: true,
      data: {
        total: count,
        successCount: successCount,
        failCount: count - successCount,
        avgDuration: avgDuration,
        results: results
      }
    });
    
  } catch (error) {
    console.error('批量测试失败:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      results: results
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`\n🧪 OCR API测试服务器已启动: http://localhost:${PORT}`);
  console.log('📋 可用端点:');
  console.log('  🏠 GET  /                    - 测试平台首页');
  console.log('  📍 GET  /api/health          - 健康检查');
  console.log('  🧪 GET  /api/test            - API连接测试');
  console.log('  🔍 POST /api/ocr             - OCR识别');
  console.log('  🚀 POST /api/batch-test      - 批量测试');
  console.log('  🔍 GET  /api/network-diagnosis - 网络诊断');
  console.log('  📋 POST /api/mock-ocr        - 模拟OCR数据');
  console.log('\n🔧 配置信息:');
  console.log(`  📱 App ID: ${BAIDU_CONFIG.appId}`);
  console.log(`  🔑 API Key: ${BAIDU_CONFIG.apiKey.substring(0, 8)}...`);
  console.log(`  🔐 Secret Key: ${BAIDU_CONFIG.secretKey.substring(0, 8)}...`);
  console.log('\n🆕 新功能:');
  console.log('  📊 详细的网络诊断功能');
  console.log('  🔧 增强的错误分析');
  console.log('  📋 模拟数据支持（网络受限环境）');
  console.log('\n💡 故障排除建议:');
  console.log('  1️⃣ 如遇到网络问题，访问: /api/network-diagnosis');
  console.log('  2️⃣ 测试功能可使用模拟数据: /api/mock-ocr');
  console.log('  3️⃣ 查看详细日志了解具体错误原因');
  console.log('\n✅ 服务器就绪，等待请求...\n');
});