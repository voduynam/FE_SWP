import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet default icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to handle clicks on the map to set a marker
function LocationMarker({ position, setPosition, readOnly }) {
  useMapEvents({
    click(e) {
      if (!readOnly) {
        setPosition(e.latlng);
      }
    },
  });

  return position === null ? null : (
    <Marker position={position} />
  );
}

// Component to recenter map when position changes from outside
function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && center.lat && center.lng) {
      map.setView([center.lat, center.lng], map.getZoom());
    }
  }, [center, map]);
  return null;
}

const LocationMapPicker = ({
  latitude,
  longitude,
  onChange,
  readOnly = false,
  height = '300px',
  className = ''
}) => {
  const [position, setPosition] = useState(
    latitude && longitude ? { lat: parseFloat(latitude), lng: parseFloat(longitude) } : null
  );

  const defaultCenter = { lat: 10.762622, lng: 106.660172 }; // Default to HCMC
  const center = position || defaultCenter;

  useEffect(() => {
    if (latitude && longitude) {
      setPosition({ lat: parseFloat(latitude), lng: parseFloat(longitude) });
    } else {
      setPosition(null);
    }
  }, [latitude, longitude]);

  const handlePositionChange = (latlng) => {
    setPosition(latlng);
    if (onChange) {
      onChange(latlng.lat, latlng.lng);
    }
  };

  return (
    <div className={`rounded-md overflow-hidden border border-slate-300 ${className}`} style={{ height, width: '100%', zIndex: 0 }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={position ? 15 : 12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={position} setPosition={handlePositionChange} readOnly={readOnly} />
        <ChangeView center={center} />
      </MapContainer>
    </div>
  );
};

export default LocationMapPicker;
