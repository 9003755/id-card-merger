import React from 'react';
import type { IDCardImage } from '../types';
import './ImagePreview.css';

interface ImagePreviewProps {
  image: IDCardImage | null;
  label: string;
  onRemove?: () => void;
  className?: string;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({
  image,
  label,
  onRemove,
  className = ''
}) => {
  if (!image) {
    return (
      <div className={`image-preview empty ${className}`}>
        <div className="preview-placeholder">
          <div className="placeholder-icon">📄</div>
          <div className="placeholder-text">{label}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`image-preview ${className}`}>
      <div className="preview-header">
        <span className="preview-label">{label}</span>
        {onRemove && (
          <button 
            className="remove-button" 
            onClick={onRemove}
            title="移除图片"
          >
            ✕
          </button>
        )}
      </div>
      <div className="preview-image-container">
        <img 
          src={image.url} 
          alt={label}
          className="preview-image"
        />
      </div>
      <div className="preview-info">
        <span className="file-name">{image.file.name}</span>
        <span className="file-size">
          {(image.file.size / 1024 / 1024).toFixed(2)} MB
        </span>
      </div>
    </div>
  );
};

export default ImagePreview;