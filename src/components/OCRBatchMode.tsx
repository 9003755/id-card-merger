import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import type { OCRBatchItem, IDCardImage } from '../types';
import { createBackendOCRService, generateOCRFileName } from '../utils/backendOcrUtils';
import { generateOCRBatchPDFs, validateImageFile, generateUniqueId } from '../utils/pdfUtils';
import './OCRBatchMode.css';

interface ProcessingStatus {
  isProcessing: boolean;
  currentStep: string;
  progress: number;
  total: number;
}

const OCRBatchMode: React.FC = () => {
  const [batchItems, setBatchItems] = useState<OCRBatchItem[]>([]);
  const [zipFileName, setZipFileName] = useState('身份证OCR批处理');
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    isProcessing: false,
    currentStep: '',
    progress: 0,
    total: 0,
  });

  // 手动编辑姓名功能
  const editItemName = (itemId: string, newName: string) => {
    setBatchItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updatedFileName = newName.trim() ? `${newName.trim()}_身份证` : item.fileName;
        return {
          ...item,
          fileName: updatedFileName,
          ocrResult: item.ocrResult ? {
            ...item.ocrResult,
            name: newName.trim(),
            manuallyEdited: true // 标记为手动编辑
          } : item.ocrResult
        };
      }
      return item;
    }));
  };

  // 处理文件上传
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter(validateImageFile);
    
    if (validFiles.length === 0) {
      alert('请选择有效的图片文件（JPG、PNG、WebP，大小不超过10MB）');
      return;
    }

    // OCR批处理模式：每两张图片组成一对（正面+反面）
    const newItems: OCRBatchItem[] = [];
    
    for (let i = 0; i < validFiles.length; i += 2) {
      const frontFile = validFiles[i];
      const backFile = validFiles[i + 1]; // 可能为undefined
      
      if (frontFile) {
        const item: OCRBatchItem = {
          id: generateUniqueId(),
          front: {
            file: frontFile,
            url: URL.createObjectURL(frontFile),
            type: 'front',
          },
          back: backFile ? {
            file: backFile,
            url: URL.createObjectURL(backFile),
            type: 'back',
          } : null,
          status: 'waiting',
        };
        
        newItems.push(item);
      }
    }
    
    if (validFiles.length % 2 !== 0) {
      alert(`上传了${validFiles.length}张图片。OCR批处理模式建议每次上传偶数张图片（每2张为一组身份证正反面）。\n最后一张图片将作为单独的身份证处理。`);
    }

    setBatchItems(prev => [...prev, ...newItems]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp'],
    },
    multiple: true,
  });

  // 删除批处理项
  const removeBatchItem = (id: string) => {
    setBatchItems(prev => {
      return prev.filter(item => {
        if (item.id === id) {
          if (item.front?.url) URL.revokeObjectURL(item.front.url);
          if (item.back?.url) URL.revokeObjectURL(item.back.url);
          return false;
        }
        return true;
      });
    });
  };

  // 清空所有项
  const clearAllItems = () => {
    batchItems.forEach(item => {
      if (item.front?.url) URL.revokeObjectURL(item.front.url);
      if (item.back?.url) URL.revokeObjectURL(item.back.url);
    });
    setBatchItems([]);
  };

  // 执行OCR识别
  const performOCR = async () => {
    if (batchItems.length === 0) {
      alert('请先上传身份证图片');
      return;
    }

    setProcessingStatus({
      isProcessing: true,
      currentStep: '开始OCR识别...',
      progress: 0,
      total: batchItems.length,
    });

    const ocrService = createBackendOCRService();

    try {
      for (let i = 0; i < batchItems.length; i++) {
        const item = batchItems[i];
        
        if (!item.front) continue;

        setProcessingStatus(prev => ({
          ...prev,
          currentStep: `正在识别第 ${i + 1} 张身份证...`,
          progress: i,
        }));

        setBatchItems(prev => prev.map(prevItem => 
          prevItem.id === item.id 
            ? { ...prevItem, status: 'processing' as const }
            : prevItem
        ));

        try {
          const ocrResult = await ocrService.recognizeIDCard(item.front.file, 'front');
          const fileName = generateOCRFileName(ocrResult, `身份证_${i + 1}`);

          setBatchItems(prev => prev.map(prevItem => 
            prevItem.id === item.id 
              ? { 
                  ...prevItem, 
                  ocrResult,
                  fileName,
                  status: ocrResult.success ? 'completed' as const : 'error' as const,
                }
              : prevItem
          ));

        } catch (error) {
          console.error(`OCR识别失败 (项目 ${i + 1}):`, error);
          
          setBatchItems(prev => prev.map(prevItem => 
            prevItem.id === item.id 
              ? { 
                  ...prevItem, 
                  status: 'error' as const,
                  ocrResult: {
                    name: '',
                    idNumber: '',
                    confidence: 0,
                    success: false,
                    error: error instanceof Error ? error.message : '识别失败',
                  },
                }
              : prevItem
          ));
        }
      }

      setProcessingStatus(prev => ({
        ...prev,
        currentStep: 'OCR识别完成',
        progress: batchItems.length,
      }));

    } catch (error) {
      console.error('批量OCR识别失败:', error);
      alert('批量OCR识别失败，请重试');
    } finally {
      setTimeout(() => {
        setProcessingStatus({
          isProcessing: false,
          currentStep: '',
          progress: 0,
          total: 0,
        });
      }, 2000);
    }
  };

  // 生成PDF并下载
  const generatePDFs = async () => {
    const completedItems = batchItems.filter(item => 
      item.status === 'completed' && item.front && item.ocrResult?.success
    );

    if (completedItems.length === 0) {
      alert('没有可用的已识别身份证，请先执行OCR识别');
      return;
    }

    setProcessingStatus({
      isProcessing: true,
      currentStep: '开始生成PDF...',
      progress: 0,
      total: completedItems.length,
    });

    try {
      // 使用与单个任务模式一致的PDF生成逻辑
      const pdfItems = completedItems.map(item => {
        if (!item.back) {
          // 如果没有反面图片，跳过这个项目或使用正面图片作为反面
          console.warn(`身份证 ${item.fileName} 缺少反面图片，将跳过`);
          return null;
        }
        return {
          frontImage: item.front!,
          backImage: item.back, // 必须有反面图片才能生成合并PDF
          fileName: item.fileName || '身份证',
        };
      }).filter(item => item !== null) as Array<{
        frontImage: IDCardImage;
        backImage: IDCardImage;
        fileName: string;
      }>;

      if (pdfItems.length === 0) {
        alert('没有完整的身份证正反面配对，无法生成PDF');
        return;
      }

      const result = await generateOCRBatchPDFs(pdfItems, zipFileName);
      
      alert(`PDF生成完成！成功：${result.success}个，失败：${result.failed}个`);
      
    } catch (error) {
      console.error('PDF生成失败:', error);
      alert('PDF生成失败，请重试');
    } finally {
      setProcessingStatus({
        isProcessing: false,
        currentStep: '',
        progress: 0,
        total: 0,
      });
    }
  };

  const getStatusText = (status: OCRBatchItem['status']) => {
    switch (status) {
      case 'waiting': return '🔄 等待处理';
      case 'processing': return '🔍 识别中...';
      case 'completed': return '✅ 识别成功';
      case 'error': return '⚠️ 将使用备用方案';
      default: return '❓ 未知状态';
    }
  };

  const getStatusColor = (status: OCRBatchItem['status']) => {
    switch (status) {
      case 'waiting': return '#666';
      case 'processing': return '#1890ff';
      case 'completed': return '#52c41a';
      case 'error': return '#ff4d4f';
      default: return '#666';
    }
  };

  return (
    <div className="ocr-batch-mode">
      <div className="mode-header">
        <h2>OCR批处理模式</h2>
        <div className="mode-description">
          <p className="feature-highlight">
            🤖 <strong>智能功能</strong>：自动用身份证名字给PDF文件命名，无需手动输入PDF文件名
          </p>
          <p className="mode-intro">
            上传多张身份证图片，系统将自动识别姓名并生成对应的PDF文件。支持批量处理，提高工作效率。
          </p>
        </div>
      </div>

      <div className="upload-section">
        <h3>上传身份证图片</h3>
        <div
          {...getRootProps()}
          className={`upload-zone ${isDragActive ? 'drag-active' : ''}`}
        >
          <input {...getInputProps()} />
          <div className="upload-content">
            <div className="upload-icon">📄</div>
            <p className="upload-text">
              {isDragActive
                ? '放下文件开始上传'
                : '拖拽身份证图片到此处，或点击选择文件'
              }
            </p>
            <p className="upload-hint">
              支持 JPG、PNG、WebP 格式，单个文件不超过 10MB<br />
              <strong>💡 每2张图片为一组：第1张作为正面，第2张作为反面</strong><br />
              <strong>⚠️ 只有具备正反面配对的身份证才能生成合并PDF</strong>
            </p>
          </div>
        </div>
      </div>

      {batchItems.length > 0 && (
        <div className="batch-list-section">
          <div className="section-header">
            <h3>待处理列表 ({batchItems.length}组身份证)</h3>
            <div className="batch-actions">
              <button 
                onClick={clearAllItems}
                className="action-button clear-button"
                disabled={processingStatus.isProcessing}
              >
                清空列表
              </button>
              <button 
                onClick={performOCR}
                className="action-button ocr-button"
                disabled={processingStatus.isProcessing}
              >
                {processingStatus.isProcessing ? '🔄 识别中...' : '🎯 开始OCR识别'}
              </button>
            </div>
          </div>

          {processingStatus.isProcessing && (
            <div className="processing-status">
              <div className="status-text">{processingStatus.currentStep}</div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ 
                    width: `${(processingStatus.progress / processingStatus.total) * 100}%` 
                  }}
                />
              </div>
              <div className="progress-text">
                {processingStatus.progress} / {processingStatus.total}
              </div>
            </div>
          )}

          <div className="batch-list">
            {batchItems.map((item) => (
              <div key={item.id} className="batch-item">
                <div className="item-images">
                  {/* 正面图片 */}
                  <div className="image-pair">
                    <div className="image-label">正面</div>
                    <div className="image-container">
                      {item.front && (
                        <img 
                          src={item.front.url} 
                          alt="身份证正面"
                          className="preview-image"
                        />
                      )}
                    </div>
                  </div>
                  
                  {/* 反面图片 */}
                  <div className="image-pair">
                    <div className="image-label">反面</div>
                    <div className="image-container">
                      {item.back ? (
                        <img 
                          src={item.back.url} 
                          alt="身份证反面"
                          className="preview-image"
                        />
                      ) : (
                        <div className="no-image-placeholder">
                          <span>📄</span>
                          <small>仅正面</small>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="item-info">
                  <div className="file-names">
                    <div className="file-name">
                      <strong>正面:</strong> {item.front?.file.name || '未知文件'}
                    </div>
                    {item.back && (
                      <div className="file-name">
                        <strong>反面:</strong> {item.back.file.name}
                      </div>
                    )}
                  </div>
                  
                  <div 
                    className="status-badge"
                    style={{ color: getStatusColor(item.status) }}
                  >
                    {getStatusText(item.status)}
                  </div>
                  
                  {item.ocrResult && (
                    <div className="ocr-result">
                      {item.ocrResult.success ? (
                        <>
                          <div className="result-item editable-name">
                            <strong>姓名:</strong> 
                            <input
                              type="text"
                              value={item.ocrResult.name}
                              onChange={(e) => editItemName(item.id, e.target.value)}
                              className="name-edit-input"
                              placeholder="请输入正确的姓名"
                            />
                            {(item.ocrResult as any).isMockData && (
                              <span className="mock-indicator"> 🎭</span>
                            )}
                            {(item.ocrResult as any).manuallyEdited && (
                              <span className="manual-edited-indicator"> ✏️</span>
                            )}
                          </div>
                          <div className="result-item">
                            <strong>身份证号:</strong> {item.ocrResult.idNumber}
                          </div>
                          <div className="result-item">
                            <strong>置信度:</strong> {(item.ocrResult.confidence * 100).toFixed(1)}%
                            {(item.ocrResult as any).isMockData && (
                              <span className="mock-note"> (模拟数据)</span>
                            )}
                          </div>
                          <div className="result-item">
                            <strong>PDF文件名:</strong> {item.fileName}
                          </div>
                          {(item.ocrResult as any).isMockData && (
                            <div className="mock-warning">
                              🎭 此结果使用了模拟数据，仅用于功能测试
                            </div>
                          )}
                          <div className="edit-hint">
                            📝 可以手动修改姓名，系统将自动更新PDF文件名
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="error-message">
                            识别失败: {item.ocrResult.error}
                          </div>
                          <div className="manual-input">
                            <label>手动输入姓名:</label>
                            <input
                              type="text"
                              placeholder="请输入姓名用于PDF命名"
                              className="name-edit-input"
                              onChange={(e) => editItemName(item.id, e.target.value)}
                            />
                          </div>
                          <div className="retry-hint">
                            📝 请手动输入姓名作为PDF文件名
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="item-actions">
                  <button 
                    onClick={() => removeBatchItem(item.id)}
                    className="remove-button"
                    disabled={processingStatus.isProcessing}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {batchItems.some(item => item.status === 'completed') && (
        <div className="generate-section">
          <div className="form-group">
            <label htmlFor="zipFileName">压缩包文件名:</label>
            <input
              id="zipFileName"
              type="text"
              value={zipFileName}
              onChange={(e) => setZipFileName(e.target.value)}
              className="zip-name-input"
              placeholder="请输入压缩包文件名"
            />
          </div>
          <button 
            onClick={generatePDFs}
            className="action-button generate-button"
            disabled={processingStatus.isProcessing}
          >
            {processingStatus.isProcessing ? '📦 生成中...' : '📦 生成PDF并打包下载'}
          </button>
        </div>
      )}
    </div>
  );
};

export default OCRBatchMode;