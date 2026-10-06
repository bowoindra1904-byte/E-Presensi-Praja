import React, { useState } from 'react';
import satpolLogoTransparent from '../assets/images/satpol_pp_logo_transparent.png';
import satpolLogoImage from '../assets/images/satpol_pp_logo_1791104048215.jpg';
import { SatpolPPLogo } from './SatpolPPLogo';

interface SatpolPPWatermarkBackgroundProps {
  className?: string;
  opacity?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  theme?: 'light' | 'dark';
  showCornerWatermark?: boolean;
}

export const SatpolPPWatermarkBackground: React.FC<SatpolPPWatermarkBackgroundProps> = ({
  className = "",
  opacity,
  size = "xl",
  theme = "light",
  showCornerWatermark = true,
}) => {
  const [imageErrorIndex, setImageErrorIndex] = useState(0);

  // Fallback sources chain ensuring assets load in preview iframe, dev, and production
  const candidateImages = [
    satpolLogoTransparent,
    "/satpol_pp_logo_transparent.png",
    "/satpol_pp_logo.png",
    satpolLogoImage,
    "/satpol_pp_logo.jpg"
  ];

  const currentSrc = candidateImages[imageErrorIndex] || candidateImages[0];

  const handleImgError = () => {
    if (imageErrorIndex < candidateImages.length - 1) {
      setImageErrorIndex(prev => prev + 1);
    }
  };

  const sizeClasses = {
    sm: "w-64 h-64",
    md: "w-80 h-80 sm:w-96 sm:h-96",
    lg: "w-[320px] h-[320px] sm:w-[480px] sm:h-[480px] lg:w-[600px] lg:h-[600px]",
    xl: "w-[360px] h-[360px] sm:w-[540px] sm:h-[540px] lg:w-[720px] lg:h-[720px] xl:w-[840px] xl:h-[840px]",
    '2xl': "w-[420px] h-[420px] sm:w-[640px] sm:h-[640px] lg:w-[860px] lg:h-[860px] xl:w-[980px] xl:h-[980px]",
    full: "w-[90vw] h-[90vw] max-w-[900px] max-h-[900px]"
  }[size];

  // Default calibrated opacity: visible enough to recognize, soft enough to guarantee 100% text readability
  const effectiveOpacity = opacity || (theme === 'dark' ? 'opacity-20 sm:opacity-25' : 'opacity-[0.14] sm:opacity-[0.18]');

  return (
    <div 
      className={`fixed inset-0 pointer-events-none select-none z-0 overflow-hidden flex items-center justify-center ${className}`}
      aria-hidden="true"
    >
      {/* 1. Grand Center Watermark (Uploaded Satpol PP Praja Wibawa Emblem) */}
      <div 
        className={`relative ${sizeClasses} ${effectiveOpacity} transition-opacity duration-300 flex items-center justify-center`}
        style={{
          maskImage: 'radial-gradient(circle at center, black 60%, rgba(0,0,0,0.8) 75%, transparent 95%)',
          WebkitMaskImage: 'radial-gradient(circle at center, black 60%, rgba(0,0,0,0.8) 75%, transparent 95%)'
        }}
      >
        {/* Soft Golden Ambiance Glow behind the crest */}
        <div 
          className={`absolute inset-0 m-auto w-3/4 h-3/4 rounded-full blur-3xl pointer-events-none -z-10 ${
            theme === 'dark' ? 'bg-amber-500/20' : 'bg-amber-500/15'
          }`} 
        />
        
        {imageErrorIndex < candidateImages.length ? (
          <img
            src={currentSrc}
            alt="Watermark Lambang Resmi Satpol PP"
            referrerPolicy="no-referrer"
            onError={handleImgError}
            className={`w-full h-full object-contain filter drop-shadow-md transform scale-100 ${
              theme === 'light' ? 'contrast-105' : 'contrast-110 brightness-105'
            }`}
          />
        ) : (
          <SatpolPPLogo className="w-full h-full object-contain drop-shadow-md" />
        )}
      </div>

      {/* 2. Ambient Top-Right Corner Watermark (ensures visibility when content scrolls) */}
      {showCornerWatermark && (
        <div 
          className={`absolute -top-16 -right-16 w-80 h-80 sm:w-96 sm:h-96 pointer-events-none -z-10 ${
            theme === 'dark' ? 'opacity-[0.08]' : 'opacity-[0.06] sm:opacity-[0.08]'
          }`}
          style={{
            maskImage: 'radial-gradient(circle at center, black 40%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 80%)'
          }}
        >
          <img
            src={candidateImages[0] || "/satpol_pp_logo_transparent.png"}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => {}}
            className="w-full h-full object-contain"
          />
        </div>
      )}

      {/* 3. Ambient Bottom-Left Subtle Watermark */}
      {showCornerWatermark && (
        <div 
          className={`absolute -bottom-24 -left-20 w-80 h-80 sm:w-96 sm:h-96 pointer-events-none -z-10 ${
            theme === 'dark' ? 'opacity-[0.06]' : 'opacity-[0.05] sm:opacity-[0.07]'
          }`}
          style={{
            maskImage: 'radial-gradient(circle at center, black 40%, transparent 80%)',
            WebkitMaskImage: 'radial-gradient(circle at center, black 40%, transparent 80%)'
          }}
        >
          <img
            src={candidateImages[0] || "/satpol_pp_logo_transparent.png"}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => {}}
            className="w-full h-full object-contain"
          />
        </div>
      )}
    </div>
  );
};

