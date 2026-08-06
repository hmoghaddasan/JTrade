// frontend/src/components/ImageZoom.js

import React, { useState } from 'react';
import './ImageZoom.css';

const ImageZoom = ({ src, alt, className }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!src) return null;

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => setIsOpen(false);

  return (
    <>
      <div className={`image-zoom-thumbnail ${className || ''}`} onClick={handleOpen}>
        <img src={src} alt={alt || 'تصویر چارت'} />
        <div className="zoom-overlay">
          <span className="zoom-icon">🔍</span>
        </div>
      </div>

      {isOpen && (
        <div className="image-zoom-modal" onClick={handleClose}>
          <div className="image-zoom-content" onClick={(e) => e.stopPropagation()}>
            <button className="zoom-close" onClick={handleClose}>✕</button>
            <img src={src} alt={alt || 'تصویر چارت'} />
          </div>
        </div>
      )}
    </>
  );
};

export default ImageZoom;