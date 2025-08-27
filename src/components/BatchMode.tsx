import React, { useState, useRef } from 'react';
import type { IDCardPair, IDCardImage } from '../types';
import { generateBatchPDFs, generateUniqueId } from '../utils/pdfUtils';
import ImageUpload from './ImageUpload';
import ImagePreview from './ImagePreview';
import './BatchMode.css';

const BatchMode: React.FC = () => {
  const [idCardPairs, setIdCardPairs] = useState<IDCardPair[]>([]);
  const [zipFileName, setZipFileName] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [lastResult, setLastResult] = useState<{
    success: number;
    failed: number;
    results: Array<{ success: boolean; fileName: string; error?: string }>;
  } | null>(null);
  
  // 创建隐藏的文件输入引用
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addNewPair = () => {
    // 直接触发文件选择对话框
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // 处理文件选择
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length >= 2) {
      const frontFile = files[0];
      const backFile = files[1];
      
      const frontUrl = URL.createObjectURL(frontFile);
      const backUrl = URL.createObjectURL(backFile);
      
      const frontImage: IDCardImage = { file: frontFile, url: frontUrl, type: 'front' };
      const backImage: IDCardImage = { file: backFile, url: backUrl, type: 'back' };
      
      const newPair: IDCardPair = {
        id: generateUniqueId(),
        front: frontImage,
        back: backImage,
        pdfName: `身份证_${idCardPairs.length + 1}`
      };
      
      setIdCardPairs([...idCardPairs, newPair]);
    } else if (files && files.length === 1) {
      alert('请选择两张图片：身份证正面和反面');
    }
    
    // 重置input值，以便可以重复选择相同文件
    if (event.target) {
      event.target.value = '';
    }
  };

  const removePair = (id: string) => {
    setIdCardPairs(prev => {
      const updatedPairs = prev.filter(pair => pair.id !== id);
      // 清理URL对象
      const pairToRemove = prev.find(pair => pair.id === id);
      if (pairToRemove) {
        if (pairToRemove.front) URL.revokeObjectURL(pairToRemove.front.url);
        if (pairToRemove.back) URL.revokeObjectURL(pairToRemove.back.url);
      }
      return updatedPairs;
    });
  };

  const updatePairImages = (pairId: string, files: File[]) => {
    if (files.length >= 2) {
      // 同时上传两张图片
      const frontFile = files[0];
      const backFile = files[1];
      
      const frontUrl = URL.createObjectURL(frontFile);
      const backUrl = URL.createObjectURL(backFile);
      
      const frontImage: IDCardImage = { file: frontFile, url: frontUrl, type: 'front' };
      const backImage: IDCardImage = { file: backFile, url: backUrl, type: 'back' };

      setIdCardPairs(prev =>
        prev.map(pair => {
          if (pair.id === pairId) {
            // 清理旧的URL
            if (pair.front) URL.revokeObjectURL(pair.front.url);
            if (pair.back) URL.revokeObjectURL(pair.back.url);
            return { ...pair, front: frontImage, back: backImage };
          }
          return pair;
        })
      );
    } else if (files.length === 1) {
      alert('请选择两张图片：身份证正面和反面');
    }
  };

  const updatePairImage = (pairId: string, type: 'front' | 'back', files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];
    const url = URL.createObjectURL(file);
    const image: IDCardImage = { file, url, type };

    setIdCardPairs(prev =>
      prev.map(pair => {
        if (pair.id === pairId) {
          // 清理旧的URL
          const oldImage = pair[type];
          if (oldImage) {
            URL.revokeObjectURL(oldImage.url);
          }
          return { ...pair, [type]: image };
        }
        return pair;
      })
    );
  };

  const removePairImage = (pairId: string, type: 'front' | 'back') => {
    setIdCardPairs(prev =>
      prev.map(pair => {
        if (pair.id === pairId) {
          const oldImage = pair[type];
          if (oldImage) {
            URL.revokeObjectURL(oldImage.url);
          }
          return { ...pair, [type]: null };
        }
        return pair;
      })
    );
  };

  const updatePairName = (pairId: string, name: string) => {
    setIdCardPairs(prev =>
      prev.map(pair =>
        pair.id === pairId ? { ...pair, pdfName: name } : pair
      )
    );
  };

  const handleBatchGenerate = async () => {
    // 验证数据
    const validPairs = idCardPairs.filter(pair => 
      pair.front && pair.back && pair.pdfName?.trim()
    );

    if (validPairs.length === 0) {
      alert('请至少添加一组完整的身份证图片');
      return;
    }

    if (!zipFileName.trim()) {
      alert('请输入压缩包文件名');
      return;
    }

    setIsGenerating(true);
    setLastResult(null);

    try {
      const batchData = validPairs.map(pair => ({
        front: pair.front!,
        back: pair.back!,
        fileName: pair.pdfName!.trim()
      }));

      const result = await generateBatchPDFs(batchData, zipFileName.trim());
      setLastResult(result);
      
      alert(`批处理完成！\n成功: ${result.success} 个\n失败: ${result.failed} 个`);
    } catch (error) {
      console.error('批量生成失败:', error);
      alert('批量生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const isReadyToGenerate = idCardPairs.some(pair => 
    pair.front && pair.back && pair.pdfName?.trim()
  ) && zipFileName.trim();

  return (
    <div className="batch-mode">
      {/* 隐藏的文件输入元素 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      
      <div className="mode-header">
        <h2>批处理模式</h2>
        <p>批量处理多组身份证图片，生成ZIP压缩包</p>
      </div>

      <div className="batch-controls">
        <button onClick={addNewPair} className="add-pair-button">
          📁 添加身份证正反面图片
        </button>
        <p className="add-button-hint">
          💡 点击后请同时选择两张图片（正面+反面）
        </p>
      </div>

      <div className="pairs-list">
        {idCardPairs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <p>暂无身份证对，点击上方按钮添加</p>
          </div>
        ) : (
          idCardPairs.map((pair, index) => (
            <div key={pair.id} className="id-card-pair">
              <div className="pair-header">
                <h3>身份证对 {index + 1}</h3>
                <button
                  onClick={() => removePair(pair.id)}
                  className="remove-pair-button"
                  title="删除此组"
                >
                  🗑️
                </button>
              </div>

              <div className="pair-content">
                <div className="pair-images">
                  {!pair.front && !pair.back ? (
                    <div className="batch-upload-container">
                      <h4>上传身份证图片</h4>
                      <ImageUpload
                        onUpload={(files) => updatePairImages(pair.id, files)}
                        placeholder="点击或拖拽同时选择两张图片（正面和反面）"
                        multiple={true}
                        maxFiles={2}
                        className="small"
                      />
                      <p className="batch-upload-tip">
                        💡 第一张图片作为正面，第二张图片作为反面
                      </p>
                    </div>
                  ) : (
                    <div className="pair-images-grid">
                      <div className="pair-image-column">
                        <h4>正面</h4>
                        {!pair.front ? (
                          <ImageUpload
                            onUpload={(files) => updatePairImage(pair.id, 'front', files)}
                            placeholder="上传正面"
                            className="small"
                          />
                        ) : (
                          <ImagePreview
                            image={pair.front}
                            label="正面"
                            onRemove={() => removePairImage(pair.id, 'front')}
                          />
                        )}
                      </div>

                      <div className="pair-image-column">
                        <h4>反面</h4>
                        {!pair.back ? (
                          <ImageUpload
                            onUpload={(files) => updatePairImage(pair.id, 'back', files)}
                            placeholder="上传反面"
                            className="small"
                          />
                        ) : (
                          <ImagePreview
                            image={pair.back}
                            label="反面"
                            onRemove={() => removePairImage(pair.id, 'back')}
                          />
                        )}
                      </div>
                      
                      <div className="reselect-all-container">
                        <button
                          onClick={() => {
                            if (pair.front) URL.revokeObjectURL(pair.front.url);
                            if (pair.back) URL.revokeObjectURL(pair.back.url);
                            setIdCardPairs(prev =>
                              prev.map(p => p.id === pair.id ? { ...p, front: null, back: null } : p)
                            );
                          }}
                          className="reselect-button"
                        >
                          🔄 重新选择两张图片
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pair-settings">
                  <label>PDF文件名</label>
                  <input
                    type="text"
                    value={pair.pdfName || ''}
                    onChange={(e) => updatePairName(pair.id, e.target.value)}
                    placeholder="PDF文件名"
                    className="pair-name-input"
                  />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {idCardPairs.length > 0 && (
        <div className="batch-action">
          <div className="zip-settings-bottom">
            <label htmlFor="zipFileName">压缩包文件名</label>
            <input
              type="text"
              id="zipFileName"
              value={zipFileName}
              onChange={(e) => setZipFileName(e.target.value)}
              placeholder="请输入压缩包文件名（不需要包含.zip后缀）"
              className="zip-name-input"
            />
          </div>
          
          <button
            onClick={handleBatchGenerate}
            disabled={!isReadyToGenerate || isGenerating}
            className={`batch-generate-button ${isReadyToGenerate ? 'ready' : ''}`}
          >
            {isGenerating ? '批量生成中...' : `批量生成 (${idCardPairs.filter(pair => pair.front && pair.back && pair.pdfName?.trim()).length} 个PDF)`}
          </button>
        </div>
      )}

      {lastResult && (
        <div className="result-summary">
          <h3>处理结果</h3>
          <div className="result-stats">
            <div className="stat success">
              <span className="stat-label">成功</span>
              <span className="stat-value">{lastResult.success}</span>
            </div>
            <div className="stat failed">
              <span className="stat-label">失败</span>
              <span className="stat-value">{lastResult.failed}</span>
            </div>
          </div>
          
          {lastResult.results.some(r => !r.success) && (
            <div className="error-details">
              <h4>失败详情</h4>
              {lastResult.results
                .filter(r => !r.success)
                .map((result, index) => (
                  <div key={index} className="error-item">
                    <strong>{result.fileName}:</strong> {result.error}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BatchMode;