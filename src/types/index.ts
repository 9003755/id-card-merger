// 身份证图片接口
export interface IDCardImage {
  file: File;
  url: string;
  type: 'front' | 'back';
}

// 身份证对接口
export interface IDCardPair {
  id: string;
  front: IDCardImage | null;
  back: IDCardImage | null;
  pdfName?: string;
}

// 处理结果接口
export interface ProcessResult {
  success: boolean;
  fileName?: string;
  error?: string;
}

// 批处理结果接口
export interface BatchProcessResult {
  total: number;
  success: number;
  failed: number;
  results: ProcessResult[];
  zipFileName?: string;
}

// OCR识别结果接口
export interface OCRResult {
  name: string;
  idNumber: string;
  confidence: number;
  success: boolean;
  error?: string;
  isMockData?: boolean;
  mockType?: string;
  manuallyEdited?: boolean;
}

// OCR批处理项接口
export interface OCRBatchItem {
  id: string;
  front: IDCardImage | null;
  back: IDCardImage | null;
  ocrResult?: OCRResult;
  status: 'waiting' | 'processing' | 'completed' | 'error';
  fileName?: string;
}

// 百度OCR API配置接口
export interface BaiduOCRConfig {
  apiKey: string;
  secretKey: string;
  accessToken?: string;
}

// 应用模式常量
export const AppMode = {
  SINGLE: 'single',
  BATCH: 'batch',
  OCR_BATCH: 'ocr_batch'
} as const;

export type AppMode = typeof AppMode[keyof typeof AppMode];

// PDF配置接口
export interface PDFConfig {
  width: number;
  height: number;
  margin: number;
  imageGap: number;
}

// 默认PDF配置（A4纸）
export const DEFAULT_PDF_CONFIG: PDFConfig = {
  width: 210, // A4宽度（毫米）
  height: 297, // A4高度（毫米）
  margin: 20, // 边距（毫米）
  imageGap: 10 // 图片间距（毫米）
};