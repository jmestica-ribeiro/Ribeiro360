import React from 'react';
import './CommonComponents.css';

export function LoadingSpinner({ size = 18 }) {
  return (
    <div
      className="loading-spinner"
      style={{ width: size, height: size, borderWidth: size > 24 ? 3 : 2 }}
    />
  );
}

export function PageLoader() {
  return (
    <div className="page-loader">
      <LoadingSpinner size={18} />
    </div>
  );
}
