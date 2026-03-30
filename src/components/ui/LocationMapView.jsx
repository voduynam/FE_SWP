import React from 'react';
import LocationMapPicker from './LocationMapPicker';

const LocationMapView = ({ latitude, longitude, height = '200px', className = '' }) => {
  if (!latitude || !longitude) {
    return (
      <div 
        className={`flex items-center justify-center bg-slate-100 rounded-md border border-slate-200 text-slate-500 text-sm ${className}`} 
        style={{ height, width: '100%' }}
      >
        Không có dữ liệu tọa độ bản đồ
      </div>
    );
  }

  return (
    <LocationMapPicker
      latitude={latitude}
      longitude={longitude}
      readOnly={true}
      height={height}
      className={className}
    />
  );
};

export default LocationMapView;
