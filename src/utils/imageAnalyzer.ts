// 图片分析工具 - 诊断PDF中图片大小不一致问题

/**
 * 分析图片尺寸和比例
 */
export const analyzeImageSizes = (files: File[]) => {
  console.log('=== 图片尺寸分析 ===');
  
  files.forEach((file, index) => {
    const img = new Image();
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      const megapixels = (img.width * img.height) / 1000000;
      
      console.log(`图片 ${index + 1} (${file.name}):`);
      console.log(`  尺寸: ${img.width} × ${img.height} 像素`);
      console.log(`  文件大小: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  宽高比: ${aspectRatio.toFixed(3)}`);
      console.log(`  像素总数: ${megapixels.toFixed(2)} MP`);
      console.log(`  建议最大显示宽度(72dpi): ${(img.width * 25.4 / 72).toFixed(1)} mm`);
      console.log(`  建议最大显示高度(72dpi): ${(img.height * 25.4 / 72).toFixed(1)} mm`);
      console.log('---');
      
      URL.revokeObjectURL(img.src);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

/**
 * 模拟PDF布局计算 - 匹配新的统一尺寸算法
 */
export const simulatePDFLayout = async (frontFile: File, backFile: File) => {
  console.log('=== PDF布局模拟（统一尺寸算法）===');
  
  // 创建临时canvas来获取图片尺寸
  const createCanvas = (file: File): Promise<{ width: number; height: number; aspectRatio: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.width,
          height: img.height,
          aspectRatio: img.width / img.height
        });
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(file);
    });
  };
  
  const frontInfo = await createCanvas(frontFile);
  const backInfo = await createCanvas(backFile);
  
  console.log('正面图片:', frontInfo);
  console.log('反面图片:', backInfo);
  
  // PDF配置 (A4纸)
  const pdfConfig = {
    width: 210,  // mm
    height: 297, // mm
    margin: 20,  // mm
    imageGap: 10 // mm
  };
  
  const availableWidth = pdfConfig.width - 2 * pdfConfig.margin; // 170mm
  const availableHeight = pdfConfig.height - 2 * pdfConfig.margin - pdfConfig.imageGap; // 267mm
  const maxImageHeight = availableHeight / 2; // 133.5mm
  
  console.log('PDF可用区域:', {
    availableWidth: availableWidth + 'mm',
    maxImageHeight: maxImageHeight + 'mm',
    totalAvailableHeight: availableHeight + 'mm'
  });
  
  // 计算统一尺寸（新算法）
  const frontAspectRatio = frontInfo.aspectRatio;
  const backAspectRatio = backInfo.aspectRatio;
  
  // 方案1：基于可用宽度计算高度
  const widthBasedHeight1 = availableWidth / frontAspectRatio;
  const widthBasedHeight2 = availableWidth / backAspectRatio;
  const maxWidthBasedHeight = Math.max(widthBasedHeight1, widthBasedHeight2);
  
  // 方案2：基于可用高度计算宽度  
  const heightBasedWidth1 = maxImageHeight * frontAspectRatio;
  const heightBasedWidth2 = maxImageHeight * backAspectRatio;
  const maxHeightBasedWidth = Math.max(heightBasedWidth1, heightBasedWidth2);
  
  console.log('尺寸计算分析:');
  console.log(`方案1 - 基于宽度: 需要高度 ${maxWidthBasedHeight.toFixed(1)}mm (限制: ${maxImageHeight}mm)`);
  console.log(`方案2 - 基于高度: 需要宽度 ${maxHeightBasedWidth.toFixed(1)}mm (限制: ${availableWidth}mm)`);
  
  // 选择不会超出边界的方案
  let finalWidth, finalHeight;
  
  if (maxWidthBasedHeight <= maxImageHeight) {
    // 如果基于宽度的高度不超限，优先使用最大宽度
    finalWidth = availableWidth;
    finalHeight = maxWidthBasedHeight;
    console.log('✅ 选择方案1：使用最大宽度，高度适应');
  } else if (maxHeightBasedWidth <= availableWidth) {
    // 如果基于高度的宽度不超限，使用最大高度
    finalWidth = maxHeightBasedWidth;
    finalHeight = maxImageHeight;
    console.log('✅ 选择方案2：使用最大高度，宽度适应');
  } else {
    // 两个方案都超限，选择更保守的方案
    const widthScale = availableWidth / maxHeightBasedWidth;
    const heightScale = maxImageHeight / maxWidthBasedHeight;
    
    if (widthScale < heightScale) {
      finalWidth = availableWidth;
      finalHeight = maxWidthBasedHeight * widthScale;
      console.log('⚠️ 两方案都超限，选择宽度优先缩放');
    } else {
      finalWidth = maxHeightBasedWidth * heightScale;
      finalHeight = maxImageHeight;
      console.log('⚠️ 两方案都超限，选择高度优先缩放');
    }
  }
  
  // 计算居中位置
  const imageX = pdfConfig.margin + (availableWidth - finalWidth) / 2;
  const frontY = pdfConfig.margin + (maxImageHeight - finalHeight) / 2;
  const backY = pdfConfig.margin + maxImageHeight + pdfConfig.imageGap + (maxImageHeight - finalHeight) / 2;
  
  console.log('\n📐 最终布局结果:');
  console.log(`统一图片尺寸: ${finalWidth.toFixed(1)}mm × ${finalHeight.toFixed(1)}mm`);
  console.log(`图片宽高比: ${(finalWidth / finalHeight).toFixed(3)}`);
  console.log(`正面图片位置: (${imageX.toFixed(1)}, ${frontY.toFixed(1)})`);
  console.log(`反面图片位置: (${imageX.toFixed(1)}, ${backY.toFixed(1)})`);
  console.log(`图片间距: ${pdfConfig.imageGap}mm`);
  
  // 验证是否在边界内
  const withinBounds = (
    finalWidth <= availableWidth && 
    finalHeight <= maxImageHeight
  );
  
  if (withinBounds) {
    console.log('✅ 布局验证：所有图片都在PDF边界内');
  } else {
    console.warn('⚠️ 布局验证：图片可能超出PDF边界');
  }
  
  // 检查两张图片是否完全相同
  console.log('\n🔍 一致性检查:');
  console.log('两张图片尺寸: 完全一致 ✅');
  console.log('两张图片位置: X坐标相同，Y坐标垂直分布 ✅');
  console.log(`垂直间距: ${backY - frontY - finalHeight}mm ✅`);
  
  return {
    frontInfo,
    backInfo,
    finalSize: {
      width: finalWidth,
      height: finalHeight
    },
    positions: {
      front: { x: imageX, y: frontY },
      back: { x: imageX, y: backY }
    },
    verification: {
      withinBounds,
      sizesEqual: true, // 新算法确保尺寸一致
      gapBetweenImages: backY - frontY - finalHeight
    }
  };
};