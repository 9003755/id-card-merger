import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import type { IDCardImage, PDFConfig } from '../types';
import { DEFAULT_PDF_CONFIG } from '../types';

/**
 * 将图片文件转换为Canvas元素
 */
export const imageToCanvas = (file: File): Promise<HTMLCanvasElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('无法创建Canvas上下文'));
      return;
    }

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      resolve(canvas);
    };

    img.onerror = () => {
      reject(new Error('图片加载失败'));
    };

    img.src = URL.createObjectURL(file);
  });
};

/**
 * 计算图片在PDF中的尺寸和位置
 * 新规范要求：
 * 1. 两张照片大小必须一致
 * 2. 两张照片之间留有缝隙
 * 3. 自动调整图片大小确保不超出PDF范围
 * 4. 两张照片都处于PDF中间位置
 */
export const calculateImageLayout = (
  frontImage: HTMLCanvasElement,
  backImage: HTMLCanvasElement,
  config: PDFConfig = DEFAULT_PDF_CONFIG
) => {
  const { width: pdfWidth, height: pdfHeight, margin, imageGap } = config;
  
  // PDF可用区域
  const availableWidth = pdfWidth - 2 * margin;  // 170mm
  const availableHeight = pdfHeight - 2 * margin - imageGap; // 267mm
  
  // 每张图片的可用高度（减去中间间隙后平分）
  const maxImageHeight = availableHeight / 2; // 133.5mm
  
  // 计算两张图片的宽高比
  const frontAspectRatio = frontImage.width / frontImage.height;
  const backAspectRatio = backImage.width / backImage.height;
  
  // 为了确保两张图片大小一致，我们需要找到一个统一的尺寸
  // 这个尺寸要能同时适应两张图片，且不超出PDF范围
  
  // 方案1：基于可用宽度计算高度
  const widthBasedHeight1 = availableWidth / frontAspectRatio;
  const widthBasedHeight2 = availableWidth / backAspectRatio;
  const maxWidthBasedHeight = Math.max(widthBasedHeight1, widthBasedHeight2);
  
  // 方案2：基于可用高度计算宽度  
  const heightBasedWidth1 = maxImageHeight * frontAspectRatio;
  const heightBasedWidth2 = maxImageHeight * backAspectRatio;
  const maxHeightBasedWidth = Math.max(heightBasedWidth1, heightBasedWidth2);
  
  // 选择不会超出边界的方案
  let finalWidth, finalHeight;
  
  if (maxWidthBasedHeight <= maxImageHeight) {
    // 如果基于宽度的高度不超限，优先使用最大宽度
    finalWidth = availableWidth;
    finalHeight = maxWidthBasedHeight;
  } else if (maxHeightBasedWidth <= availableWidth) {
    // 如果基于高度的宽度不超限，使用最大高度
    finalWidth = maxHeightBasedWidth;
    finalHeight = maxImageHeight;
  } else {
    // 两个方案都超限，选择更保守的方案
    // 比较两种缩放比例，选择较小的
    const widthScale = availableWidth / maxHeightBasedWidth;
    const heightScale = maxImageHeight / maxWidthBasedHeight;
    
    if (widthScale < heightScale) {
      finalWidth = availableWidth;
      finalHeight = maxWidthBasedHeight * widthScale;
    } else {
      finalWidth = maxHeightBasedWidth * heightScale;
      finalHeight = maxImageHeight;
    }
  }
  
  // 确保两张图片使用完全相同的尺寸
  const imageWidth = finalWidth;
  const imageHeight = finalHeight;
  
  // 计算居中位置
  // 水平居中
  const imageX = margin + (availableWidth - imageWidth) / 2;
  
  // 垂直位置：第一张图片在上半部分居中，第二张在下半部分居中
  const frontY = margin + (maxImageHeight - imageHeight) / 2;
  const backY = margin + maxImageHeight + imageGap + (maxImageHeight - imageHeight) / 2;
  
  return {
    front: { 
      x: imageX, 
      y: frontY, 
      width: imageWidth, 
      height: imageHeight 
    },
    back: { 
      x: imageX, 
      y: backY, 
      width: imageWidth, 
      height: imageHeight 
    },
    unified: {
      width: imageWidth,
      height: imageHeight,
      aspectRatio: imageWidth / imageHeight
    },
    debug: {
      availableWidth,
      availableHeight,
      maxImageHeight,
      frontAspectRatio,
      backAspectRatio,
      finalWidth,
      finalHeight,
      positions: {
        front: { x: imageX, y: frontY },
        back: { x: imageX, y: backY }
      }
    }
  };
};

/**
 * 生成身份证PDF
 */
export const generateIDCardPDF = async (
  frontImage: IDCardImage,
  backImage: IDCardImage,
  fileName: string,
  config: PDFConfig = DEFAULT_PDF_CONFIG
): Promise<void> => {
  try {
    // 转换图片为Canvas
    const frontCanvas = await imageToCanvas(frontImage.file);
    const backCanvas = await imageToCanvas(backImage.file);
    
    // 计算布局
    const layout = calculateImageLayout(frontCanvas, backCanvas, config);
    
    // 调试信息输出
    console.log('PDF生成调试信息:', {
      fileName,
      frontFile: frontImage.file.name,
      backFile: backImage.file.name,
      layout,
      frontCanvas: { width: frontCanvas.width, height: frontCanvas.height },
      backCanvas: { width: backCanvas.width, height: backCanvas.height }
    });
    
    // 创建PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // 添加正面图片
    const frontImageData = frontCanvas.toDataURL('image/jpeg', 0.8);
    pdf.addImage(
      frontImageData,
      'JPEG',
      layout.front.x,
      layout.front.y,
      layout.front.width,
      layout.front.height
    );
    
    // 添加反面图片
    const backImageData = backCanvas.toDataURL('image/jpeg', 0.8);
    pdf.addImage(
      backImageData,
      'JPEG',
      layout.back.x,
      layout.back.y,
      layout.back.width,
      layout.back.height
    );
    
    // 下载PDF
    pdf.save(`${fileName}.pdf`);
  } catch (error) {
    console.error('PDF生成失败:', error);
    throw new Error('PDF生成失败');
  }
};

/**
 * 批量生成PDF并打包为ZIP（支持OCR命名）
 * 使用与单个任务模式相同的PDF合并逻辑
 */
export const generateOCRBatchPDFs = async (
  ocrItems: Array<{
    frontImage: IDCardImage;
    backImage: IDCardImage; // 现在要求必须有反面图片
    fileName: string;
  }>,
  zipFileName: string,
  config: PDFConfig = DEFAULT_PDF_CONFIG
): Promise<{ success: number; failed: number; results: Array<{ success: boolean; fileName: string; error?: string }> }> => {
  const zip = new JSZip();
  const results: Array<{ success: boolean; fileName: string; error?: string }> = [];
  let success = 0;
  let failed = 0;

  for (const item of ocrItems) {
    try {
      // 使用与单个任务模式完全相同的PDF生成逻辑
      // 转换图片为Canvas
      const frontCanvas = await imageToCanvas(item.frontImage.file);
      const backCanvas = await imageToCanvas(item.backImage.file);
      
      // 计算布局（与generateIDCardPDF使用相同的算法）
      const layout = calculateImageLayout(frontCanvas, backCanvas, config);
      
      // 调试信息输出
      console.log('OCR批处理PDF生成调试信息:', {
        fileName: item.fileName,
        frontFile: item.frontImage.file.name,
        backFile: item.backImage.file.name,
        layout,
        frontCanvas: { width: frontCanvas.width, height: frontCanvas.height },
        backCanvas: { width: backCanvas.width, height: backCanvas.height }
      });
      
      // 创建PDF（与generateIDCardPDF使用相同的配置）
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // 添加正面图片（与generateIDCardPDF使用相同的方法）
      const frontImageData = frontCanvas.toDataURL('image/jpeg', 0.8);
      pdf.addImage(
        frontImageData,
        'JPEG',
        layout.front.x,
        layout.front.y,
        layout.front.width,
        layout.front.height
      );
      
      // 添加反面图片（与generateIDCardPDF使用相同的方法）
      const backImageData = backCanvas.toDataURL('image/jpeg', 0.8);
      pdf.addImage(
        backImageData,
        'JPEG',
        layout.back.x,
        layout.back.y,
        layout.back.width,
        layout.back.height
      );
      
      // 获取PDF数据
      const pdfBlob = pdf.output('blob');
      zip.file(`${item.fileName}.pdf`, pdfBlob);
      
      results.push({ success: true, fileName: item.fileName });
      success++;
    } catch (error) {
      console.error(`生成 ${item.fileName}.pdf 失败:`, error);
      results.push({ 
        success: false, 
        fileName: item.fileName, 
        error: error instanceof Error ? error.message : '未知错误'
      });
      failed++;
    }
  }

  // 生成ZIP文件并下载
  try {
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `${zipFileName}.zip`);
  } catch (error) {
    console.error('ZIP文件生成失败:', error);
    throw new Error('ZIP文件生成失败');
  }

  return { success, failed, results };
};

/**
 * 批量生成PDF并打包为ZIP（原有函数）
 */
export const generateBatchPDFs = async (
  idCardPairs: Array<{
    front: IDCardImage;
    back: IDCardImage;
    fileName: string;
  }>,
  zipFileName: string,
  config: PDFConfig = DEFAULT_PDF_CONFIG
): Promise<{ success: number; failed: number; results: Array<{ success: boolean; fileName: string; error?: string }> }> => {
  const zip = new JSZip();
  const results: Array<{ success: boolean; fileName: string; error?: string }> = [];
  let success = 0;
  let failed = 0;

  for (const pair of idCardPairs) {
    try {
      // 转换图片为Canvas
      const frontCanvas = await imageToCanvas(pair.front.file);
      const backCanvas = await imageToCanvas(pair.back.file);
      
      // 计算布局
      const layout = calculateImageLayout(frontCanvas, backCanvas, config);
      
      // 创建PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      // 添加正面图片
      const frontImageData = frontCanvas.toDataURL('image/jpeg', 0.8);
      pdf.addImage(
        frontImageData,
        'JPEG',
        layout.front.x,
        layout.front.y,
        layout.front.width,
        layout.front.height
      );
      
      // 添加反面图片
      const backImageData = backCanvas.toDataURL('image/jpeg', 0.8);
      pdf.addImage(
        backImageData,
        'JPEG',
        layout.back.x,
        layout.back.y,
        layout.back.width,
        layout.back.height
      );
      
      // 获取PDF数据
      const pdfBlob = pdf.output('blob');
      zip.file(`${pair.fileName}.pdf`, pdfBlob);
      
      results.push({ success: true, fileName: pair.fileName });
      success++;
    } catch (error) {
      console.error(`生成 ${pair.fileName}.pdf 失败:`, error);
      results.push({ 
        success: false, 
        fileName: pair.fileName, 
        error: error instanceof Error ? error.message : '未知错误'
      });
      failed++;
    }
  }

  // 生成ZIP文件并下载
  try {
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    saveAs(zipBlob, `${zipFileName}.zip`);
  } catch (error) {
    console.error('ZIP文件生成失败:', error);
    throw new Error('ZIP文件生成失败');
  }

  return { success, failed, results };
};

/**
 * 验证图片文件
 */
export const validateImageFile = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!validTypes.includes(file.type)) {
    return false;
  }

  if (file.size > maxSize) {
    return false;
  }

  return true;
};

/**
 * 生成唯一ID
 */
export const generateUniqueId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};