import React, { useState } from 'react';
import type { IDCardImage } from '../types';
import { generateIDCardPDF } from '../utils/pdfUtils';
import { simulatePDFLayout } from '../utils/imageAnalyzer';
import ImageUpload from './ImageUpload';
import ImagePreview from './ImagePreview';
import './SingleMode.css';

const SingleMode: React.FC = () => {
  const [frontImage, setFrontImage] = useState<IDCardImage | null>(null);
  const [backImage, setBackImage] = useState<IDCardImage | null>(null);
  const [pdfName, setPdfName] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handleImagesUpload = async (files: File[]) => {
    if (files.length >= 2) {
      // 自动将第一张设为正面，第二张设为反面
      const frontFile = files[0];
      const backFile = files[1];
      
      // 分析图片尺寸和布局
      console.log('开始分析上传的图片...');
      try {
        await simulatePDFLayout(frontFile, backFile);
      } catch (error) {
        console.error('图片分析失败:', error);
      }
      
      const frontUrl = URL.createObjectURL(frontFile);
      const backUrl = URL.createObjectURL(backFile);
      
      setFrontImage({
        file: frontFile,
        url: frontUrl,
        type: 'front'
      });
      
      setBackImage({
        file: backFile,
        url: backUrl,
        type: 'back'
      });
    } else if (files.length === 1) {
      alert('请选择两张图片：身份证正面和反面');
    }
  };

  const handleSingleImageUpload = (files: File[], type: 'front' | 'back') => {
    if (files.length > 0) {
      const file = files[0];
      const url = URL.createObjectURL(file);
      
      if (type === 'front') {
        if (frontImage) {
          URL.revokeObjectURL(frontImage.url);
        }
        setFrontImage({ file, url, type: 'front' });
      } else {
        if (backImage) {
          URL.revokeObjectURL(backImage.url);
        }
        setBackImage({ file, url, type: 'back' });
      }
    }
  };

  const handleRemoveFront = () => {
    if (frontImage) {
      URL.revokeObjectURL(frontImage.url);
      setFrontImage(null);
    }
  };

  const handleRemoveBack = () => {
    if (backImage) {
      URL.revokeObjectURL(backImage.url);
      setBackImage(null);
    }
  };

  const handleGeneratePDF = async () => {
    if (!frontImage || !backImage) {
      alert('请先上传身份证正反面图片');
      return;
    }

    if (!pdfName.trim()) {
      alert('请输入PDF文件名');
      return;
    }

    setIsGenerating(true);
    try {
      await generateIDCardPDF(frontImage, backImage, pdfName.trim());
      alert('PDF生成成功！');
    } catch (error) {
      console.error('PDF生成失败:', error);
      alert('PDF生成失败，请重试');
    } finally {
      setIsGenerating(false);
    }
  };

  const isReadyToGenerate = frontImage && backImage && pdfName.trim();

  return (
    <div className="single-mode">
      <div className="mode-header">
        <h2>单个任务模式</h2>
        <p>上传身份证正反面图片，生成PDF文件</p>
      </div>

      <div className="upload-section">
        {!frontImage || !backImage ? (
          <div className="batch-upload-area">
            <h3>上传身份证图片</h3>
            <ImageUpload
              onUpload={handleImagesUpload}
              placeholder="点击或拖拽同时选择两张图片（正面和反面）"
              multiple={true}
              maxFiles={2}
            />
            <p className="upload-tip">
              💡 请同时选择两张图片：第一张将作为正面，第二张将作为反面
            </p>
          </div>
        ) : (
          <div className="images-preview-section">
            <div className="upload-row">
              <div className="upload-column">
                <h3>身份证正面</h3>
                <ImagePreview
                  image={frontImage}
                  label="身份证正面"
                  onRemove={handleRemoveFront}
                />
                <div className="single-upload-area">
                  <ImageUpload
                    onUpload={(files) => handleSingleImageUpload(files, 'front')}
                    placeholder="重新选择正面"
                    className="small replace-upload"
                  />
                </div>
              </div>

              <div className="upload-column">
                <h3>身份证反面</h3>
                <ImagePreview
                  image={backImage}
                  label="身份证反面"
                  onRemove={handleRemoveBack}
                />
                <div className="single-upload-area">
                  <ImageUpload
                    onUpload={(files) => handleSingleImageUpload(files, 'back')}
                    placeholder="重新选择反面"
                    className="small replace-upload"
                  />
                </div>
              </div>
            </div>
            
            <div className="reset-all-area">
              <button 
                onClick={() => {
                  if (frontImage) URL.revokeObjectURL(frontImage.url);
                  if (backImage) URL.revokeObjectURL(backImage.url);
                  setFrontImage(null);
                  setBackImage(null);
                }}
                className="reset-button"
              >
                🔄 重新选择所有图片
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="pdf-settings">
        <div className="setting-group">
          <label htmlFor="pdfName">PDF文件名</label>
          <input
            type="text"
            id="pdfName"
            value={pdfName}
            onChange={(e) => setPdfName(e.target.value)}
            placeholder="请输入PDF文件名（不需要包含.pdf后缀）"
            className="pdf-name-input"
          />
        </div>
        
        {frontImage && backImage && (
          <div className="debug-section">
            <button
              onClick={async () => {
                console.log('=== 调试分析当前图片 ===');
                try {
                  await simulatePDFLayout(frontImage.file, backImage.file);
                } catch (error) {
                  console.error('分析失败:', error);
                }
              }}
              className="debug-button"
              type="button"
            >
              🔍 分析图片尺寸（查看控制台）
            </button>
          </div>
        )}
      </div>

      <div className="action-section">
        <button
          onClick={handleGeneratePDF}
          disabled={!isReadyToGenerate || isGenerating}
          className={`generate-button ${isReadyToGenerate ? 'ready' : ''}`}
        >
          {isGenerating ? '生成中...' : '生成PDF'}
        </button>
      </div>

      {isReadyToGenerate && (
        <div className="preview-section">
          <h3>预览</h3>
          <div className="pdf-preview">
            <div className="preview-page">
              <div className="preview-content">
                <div className="preview-image-slot front">
                  {frontImage && (
                    <img src={frontImage.url} alt="身份证正面预览" />
                  )}
                </div>
                <div className="preview-gap"></div>
                <div className="preview-image-slot back">
                  {backImage && (
                    <img src={backImage.url} alt="身份证反面预览" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SingleMode;