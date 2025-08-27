import type { Context } from "@netlify/functions";

interface OCRRequest {
  image: string; // base64 encoded image
  id_card_side: 'front' | 'back';
}

interface OCRResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// 百度OCR API配置
const BAIDU_CONFIG = {
  apiKey: 'WYCtNFVBM4dh4eYvrI29Wsos',
  secretKey: 'qWwWkr8uU59TwSHQO0NpafeiqRtN8lTG',
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
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`OCR识别请求失败: ${response.status}`);
  }

  const data = await response.json();

  if (data.error_code) {
    throw new Error(`OCR识别失败: ${data.error_msg}`);
  }

  return data;
}

/**
 * Netlify Function 处理函数
 */
export default async (request: Request, context: Context) => {
  // 设置CORS头
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // 处理预检请求
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  // 只允许POST请求
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: '只支持POST请求' }),
      { status: 405, headers }
    );
  }

  try {
    const body: OCRRequest = await request.json();
    
    if (!body.image || !body.id_card_side) {
      return new Response(
        JSON.stringify({ success: false, error: '缺少必要参数' }),
        { status: 400, headers }
      );
    }

    // 调用百度OCR API
    const result = await recognizeIDCard(body.image, body.id_card_side);

    const response: OCRResponse = {
      success: true,
      data: result,
    };

    return new Response(JSON.stringify(response), { status: 200, headers });

  } catch (error) {
    console.error('OCR识别失败:', error);
    
    const response: OCRResponse = {
      success: false,
      error: error instanceof Error ? error.message : '识别失败',
    };

    return new Response(JSON.stringify(response), { status: 500, headers });
  }
};