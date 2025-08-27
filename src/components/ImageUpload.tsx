import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { validateImageFile } from '../utils/pdfUtils';
import './ImageUpload.css';

interface ImageUploadProps {
  onUpload: (files: File[]) => void;
  multiple?: boolean;
  maxFiles?: number;
  placeholder?: string;
  className?: string;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onUpload,
  multiple = false,
  maxFiles = 1,
  placeholder = '点击选择或拖拽图片到此区域',
  className = ''
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    // 验证文件
    const validFiles = acceptedFiles.filter(file => {
      if (!validateImageFile(file)) {
        alert(`文件 ${file.name} 不是有效的图片文件或文件过大（最大10MB）`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      onUpload(validFiles);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    multiple,
    maxFiles
  });

  return (
    <div
      {...getRootProps()}
      className={`image-upload ${isDragActive ? 'drag-active' : ''} ${className}`}
    >
      <input {...getInputProps()} />
      <div className="upload-content">
        <div className="upload-icon">📷</div>
        <p className="upload-text">{placeholder}</p>
        <p className="upload-hint">
          支持 JPG、PNG、WEBP 格式，单个文件最大 10MB
        </p>
      </div>
    </div>
  );
};

export default ImageUpload;