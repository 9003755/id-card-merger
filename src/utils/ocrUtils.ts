import type { OCRResult, BaiduOCRConfig } from '../types';

/**
 * 百度OCR API服务类
 */
class BaiduOCRService {
  private config: BaiduOCRConfig;
  private accessToken: string | null = null;
  private tokenExpireTime: number = 0;

  constructor(config: BaiduOCRConfig) {
    this.config = config;
  }

  /**
   * 获取访问令牌
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpireTime) {
      return this.accessToken;
    }

    if (!this.config.apiKey || !this.config.secretKey) {
      throw new Error('API Key 或 Secret Key 为空，请检查配置');
    }

    console.log('开始获取百度OCR访问令牌...');

    try {
      const response = await fetch('https://aip.baidubce.com/oauth/2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.config.apiKey,
          client_secret: this.config.secretKey,
        }),
      });

      if (!response.ok) {
        throw new Error(`获取访问令牌失败: HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(`API错误: ${data.error_description || data.error}`);
      }

      this.accessToken = data.access_token;
      this.tokenExpireTime = Date.now() + (data.expires_in - 300) * 1000;
      
      if (!this.accessToken) {
        throw new Error('获取到空的访问令牌');
      }
      
      return this.accessToken;
    } catch (error) {
      console.error('获取百度OCR访问令牌失败:', error);
      if (error instanceof Error && error.message.includes('fetch')) {
        throw new Error('网络连接失败，请检查：\n1. 网络连接是否正常\n2. 防火墙设置是否允许访问\n3. 是否使用了代理服务器');
      }
      throw error;
    }
  }

  /**
   * 检查网络连通性
   */
  private async checkNetworkConnectivity(): Promise<boolean> {
    try {
      await fetch('https://www.baidu.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 测试API连接
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const isNetworkAvailable = await this.checkNetworkConnectivity();
      
      if (!isNetworkAvailable) {
        return {
          success: false,
          message: '网络连接不可用，请检查：\n1. 网络连接是否正常\n2. 防火墙或代理设置\n3. DNS解析是否正常'
        };
      }
      
      await this.getAccessToken();
      
      return {
        success: true,
        message: 'API连接成功，可以正常使用OCR功能'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'API连接失败'
      };
    }
  }

  /**
   * 将图片文件转换为Base64
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('文件读取失败'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * 识别身份证信息
   */
  async recognizeIDCard(imageFile: File, idCardSide: 'front' | 'back' = 'front'): Promise<OCRResult> {
    try {
      const accessToken = await this.getAccessToken();
      const base64Image = await this.fileToBase64(imageFile);

      const response = await fetch(
        `https://aip.baidubce.com/rest/2.0/ocr/v1/idcard?access_token=${accessToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            image: base64Image,
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

      const result = data.words_result;
      
      if (!result) {
        throw new Error('未识别到身份证信息');
      }

      let name = '';
      let idNumber = '';
      let confidence = 0;

      if (idCardSide === 'front') {
        name = result.姓名?.words || '';
        idNumber = result.公民身份号码?.words || '';
        
        const confidences = [
          result.姓名?.probability?.average || 0,
          result.公民身份号码?.probability?.average || 0
        ].filter(c => c > 0);
        
        confidence = confidences.length > 0 
          ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length 
          : 0;
      } else {
        confidence = 0.5;
      }

      if (!name && idCardSide === 'front') {
        throw new Error('未能识别到姓名信息');
      }

      return {
        name,
        idNumber,
        confidence,
        success: true,
      };

    } catch (error) {
      console.error('身份证OCR识别失败:', error);
      return {
        name: '',
        idNumber: '',
        confidence: 0,
        success: false,
        error: error instanceof Error ? error.message : '识别失败',
      };
    }
  }
}

/**
 * 创建OCR服务实例
 */
export const createOCRService = (config: BaiduOCRConfig): BaiduOCRService => {
  return new BaiduOCRService(config);
};

/**
 * 验证OCR配置
 */
export const validateOCRConfig = (config: Partial<BaiduOCRConfig>): boolean => {
  return !!(config.apiKey && config.secretKey && 
    config.apiKey.trim() && config.secretKey.trim());
};

/**
 * 生成基于OCR结果的文件名
 */
export const generateOCRFileName = (ocrResult: OCRResult, fallbackName: string = '身份证'): string => {
  if (ocrResult.success && ocrResult.name) {
    const cleanName = ocrResult.name.replace(/[<>:"/\\|?*]/g, '');
    return `${cleanName}_身份证`;
  }
  return fallbackName;
};

/**
 * 默认OCR配置（预配置的百度API密钥）
 */
export const DEFAULT_OCR_CONFIG: BaiduOCRConfig = {
  apiKey: 'WYCtNFVBM4dh4eYvrI29Wsos',
  secretKey: 'qWwWkr8uU59TwSHQO0NpafeiqRtN8lTG',
};