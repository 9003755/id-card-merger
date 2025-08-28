import type { Context } from "@netlify/functions";

// 百度OCR API配置
const BAIDU_CONFIG = {
  apiKey: process.env.BAIDU_API_KEY || 'WYCtNFVBM4dh4eYvrI29Wsos',
  secretKey: process.env.BAIDU_SECRET_KEY || 'qWwWkr8uU59TwSHQO0NpafeiqRtN8lTG',
  appId: process.env.BAIDU_APP_ID || '119868043'
};

let accessToken: string | null = null;
let tokenExpireTime: number = 0;

/**
 * 获取百度OCR访问令牌
 */
async function getAccessToken(): Promise<string> {
  // 如果token未过期，直接返回
  if (accessToken && Date.now() < tokenExpireTime) {
    return accessToken;
  }

  try {
    const response = await fetch('https://aip.baidubce.com/oauth/2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: BAIDU_CONFIG.apiKey,
        client_secret: BAIDU_CONFIG.secretKey,
      }),
    });

    if (!response.ok) {
      throw new Error(`获取访问令牌失败: HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(`API错误: ${data.error_description || data.error}`);
    }

    accessToken = data.access_token;
    tokenExpireTime = Date.now() + (data.expires_in - 300) * 1000;
    
    if (!accessToken) {
      throw new Error('获取到空的访问令牌');
    }
    
    return accessToken;
  } catch (error) {
    console.error('获取百度OCR访问令牌失败:', error);
    throw error;
  }
}

/**
 * 调用百度OCR身份证识别API
 */
async function recognizeIDCard(imageBase64: string, idCardSide: 'front' | 'back'): Promise<any> {
  const token = await getAccessToken();
  
  const response = await fetch(
    `https://aip.baidubce.com/rest/2.0/ocr/v1/idcard?access_token=${token}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        image: imageBase64,
        id_card_side: idCardSide,
        detect_direction: 'true',
        detect_risk: 'false'
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`OCR识别请求失败: HTTP ${response.status}`);
  }

  const data = await response.json();

  if (data.error_code) {
    throw new Error(`百度OCR错误 [${data.error_code}]: ${data.error_msg}`);
  }

  return data;
}

/**
 * 健康检查处理函数
 */
function handleHealthCheck() {
  return {
    status: 'ok',
    message: 'OCR API服务器正常运行',
    version: '2.0.0',
    features: [
      '百度OCR身份证识别',
      '网络诊断',
      '模拟OCR数据',
      '增强错误分析'
    ],
    timestamp: new Date().toISOString(),
    config: {
      hasApiKey: !!BAIDU_CONFIG.apiKey,
      hasSecretKey: !!BAIDU_CONFIG.secretKey,
      appId: BAIDU_CONFIG.appId
    }
  };
}

/**
 * OCR识别处理函数
 */
async function handleOCR(body: any) {
  const { image, id_card_side } = body;
  
  if (!image || typeof image !== 'string') {
    throw new Error('缺少图片数据或格式不正确');
  }
  
  if (!id_card_side || !['front', 'back'].includes(id_card_side)) {
    throw new Error('身份证面参数无效，必须是front或back');
  }

  const result = await recognizeIDCard(image, id_card_side);
  
  return {
    success: true,
    data: result,
    meta: {
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * 模拟OCR数据处理函数
 */
function handleMockOCR(body: any) {
  const { id_card_side, fileName } = body;
  
  // 基于文件名生成模拟姓名
  let mockName = '张三';
  if (fileName) {
    if (fileName.includes('李')) mockName = '李四';
    else if (fileName.includes('王')) mockName = '王五';
    else if (fileName.includes('陈')) mockName = '陈六';
    else if (fileName.includes('刘')) mockName = '刘七';
  }
  
  // 模拟身份证正面数据
  const mockFrontData = {
    "direction": 0,
    "image_status": "normal",
    "risk_type": "normal",
    "edit_tool": "normal",
    "log_id": Date.now(),
    "words_result_num": 6,
    "words_result": {
      "姓名": { "location": { "left": 142, "top": 72, "width": 94, "height": 32 }, "words": mockName },
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
    "words_result_num": 3,
    "words_result": {
      "签发机关": { "location": { "left": 125, "top": 101, "width": 155, "height": 32 }, "words": "北京市公安局朝阳分局" },
      "签发日期": { "location": { "left": 125, "top": 143, "width": 94, "height": 32 }, "words": "2010.01.01" },
      "失效日期": { "location": { "left": 234, "top": 143, "width": 94, "height": 32 }, "words": "2030.01.01" }
    }
  };
  
  const mockData = id_card_side === 'front' ? mockFrontData : mockBackData;
  
  return {
    success: true,
    data: mockData,
    meta: {
      mock: true,
      message: '使用模拟数据（网络受限环境）',
      timestamp: new Date().toISOString(),
      mockName: mockName
    }
  };
}

/**
 * Netlify Function 主处理函数
 */
export default async (request: Request, context: Context) => {
  // 设置CORS头
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // 处理预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  try {
    const url = new URL(request.url);
    // 处理从 /api/* 重定向过来的请求
    // Netlify 会将 /api/health 重定向到 /.netlify/functions/api/health
    // 我们需要提取最后的路径部分
    let path = url.pathname;
    
    // 如果路径包含 functions/api，提取后面的部分
    const match = path.match(/\/\.netlify\/functions\/api(.*)/);
    if (match) {
      path = match[1] || '/';
    }
    
    // 确保路径以 / 开头
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    
    console.log('API请求路径:', path, '方法:', request.method, '原始URL:', url.pathname);

    // 路由处理
    switch (path) {
      case '/health':
        if (request.method === 'GET') {
          const result = handleHealthCheck();
          return new Response(JSON.stringify(result), { status: 200, headers });
        }
        break;
        
      case '/test':
        if (request.method === 'GET') {
          try {
            const token = await getAccessToken();
            const result = {
              success: true,
              message: 'API连接正常',
              data: {
                hasToken: !!token,
                tokenLength: token ? token.length : 0,
                timestamp: new Date().toISOString()
              }
            };
            return new Response(JSON.stringify(result), { status: 200, headers });
          } catch (error) {
            const result = {
              success: false,
              error: error instanceof Error ? error.message : 'API连接失败',
              timestamp: new Date().toISOString()
            };
            return new Response(JSON.stringify(result), { status: 500, headers });
          }
        }
        break;
        
      case '/ocr':
        if (request.method === 'POST') {
          const body = await request.json();
          const result = await handleOCR(body);
          return new Response(JSON.stringify(result), { status: 200, headers });
        }
        break;
        
      case '/mock-ocr':
        if (request.method === 'POST') {
          const body = await request.json();
          const result = handleMockOCR(body);
          return new Response(JSON.stringify(result), { status: 200, headers });
        }
        break;
        
      default:
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `路径 ${path} 不存在`,
            availablePaths: ['/health', '/test', '/ocr', '/mock-ocr']
          }),
          { status: 404, headers }
        );
    }

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: `方法 ${request.method} 不支持路径 ${path}` 
      }),
      { status: 405, headers }
    );

  } catch (error) {
    console.error('API处理失败:', error);
    
    const response = {
      success: false,
      error: error instanceof Error ? error.message : '服务器内部错误',
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(response), { status: 500, headers });
  }
};