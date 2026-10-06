import React, { useState } from 'react';
import satpolLogoTransparent from '../assets/images/satpol_pp_logo_transparent.png';
import satpolLogoImage from '../assets/images/satpol_pp_logo_1791104048215.jpg';

interface SatpolPPLogoProps {
  className?: string;
  size?: number | string;
  variant?: 'color' | 'monochrome';
  alt?: string;
}

export const SatpolPPLogo: React.FC<SatpolPPLogoProps> = ({
  className = "w-10 h-10",
  size,
  variant = 'color',
  alt = "Lambang Resmi Satpol PP Praja Wibawa",
}) => {
  // Prioritize transparent PNG, then imported assets, then public assets, then SVG fallback
  const imageSources = [
    satpolLogoTransparent,
    "/satpol_pp_logo_transparent.png",
    "/satpol_pp_logo.png",
    satpolLogoImage,
    "/satpol_pp_logo.jpg",
    "/icon.svg"
  ];

  const [sourceIndex, setSourceIndex] = useState(0);
  const [allImagesFailed, setAllImagesFailed] = useState(false);

  const styleObj: React.CSSProperties = size
    ? { 
        width: typeof size === 'number' ? `${size}px` : size, 
        height: typeof size === 'number' ? `${size}px` : size 
      }
    : {};

  const handleImageError = () => {
    if (sourceIndex < imageSources.length - 1) {
      setSourceIndex(prev => prev + 1);
    } else {
      setAllImagesFailed(true);
    }
  };

  if (!allImagesFailed) {
    return (
      <img
        src={imageSources[sourceIndex]}
        alt={alt}
        referrerPolicy="no-referrer"
        style={styleObj}
        onError={handleImageError}
        className={`object-contain select-none ${variant === 'monochrome' ? 'grayscale contrast-125' : ''} ${className}`}
      />
    );
  }

  // Official Satpol PP Emblem SVG (Praja Wibawa) Fallback
  return (
    <svg
      viewBox="0 0 512 512"
      style={styleObj}
      className={`select-none ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={alt}
    >
      <defs>
        <linearGradient id="fallbackGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="40%" stopColor="#F59E0B" />
          <stop offset="80%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>
        <linearGradient id="fallbackNavy" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#1E3A8A" />
          <stop offset="60%" stopColor="#172554" />
          <stop offset="100%" stopColor="#0B132B" />
        </linearGradient>
        <linearGradient id="fallbackRed" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#B91C1C" />
        </linearGradient>
      </defs>

      {/* Main Pentagonal Shield */}
      <polygon
        points="256,42 448,114 398,420 256,472 114,420 64,114"
        fill="url(#fallbackGold)"
        stroke="#FEF3C7"
        strokeWidth="5"
      />

      {/* Inner Navy Field */}
      <polygon
        points="256,66 422,130 380,396 256,444 132,396 90,130"
        fill={variant === 'monochrome' ? '#FFFFFF' : 'url(#fallbackNavy)'}
        stroke="#F59E0B"
        strokeWidth="3"
      />

      {/* 1950 Founding Year */}
      <text
        x="256"
        y="104"
        textAnchor="middle"
        fill="#FDE68A"
        fontSize="20"
        fontWeight="900"
        fontFamily="sans-serif"
        letterSpacing="3"
      >
        1950
      </text>

      {/* Padi (Rice Grains Left) */}
      <g fill="#F59E0B" stroke="#78350F" strokeWidth="0.8">
        <path d="M 172 140 C 145 200, 140 280, 168 340 C 158 320, 155 240, 172 140 Z" fill="#D97706"/>
        <ellipse cx="152" cy="170" rx="8" ry="4.5" transform="rotate(-30 152 170)"/>
        <ellipse cx="144" cy="195" rx="8" ry="4.5" transform="rotate(-20 144 195)"/>
        <ellipse cx="140" cy="222" rx="8" ry="4.5" transform="rotate(-10 140 222)"/>
        <ellipse cx="138" cy="250" rx="8" ry="4.5" transform="rotate(0 138 250)"/>
        <ellipse cx="142" cy="278" rx="8" ry="4.5" transform="rotate(15 142 278)"/>
        <ellipse cx="150" cy="305" rx="8" ry="4.5" transform="rotate(30 150 305)"/>
      </g>

      {/* Kapas (Cotton Flowers Right) */}
      <g stroke="#15803D" strokeWidth="1.5">
        <path d="M 340 140 C 367 200, 372 280, 344 340 C 354 320, 357 240, 340 140 Z" fill="#15803D" opacity="0.6"/>
        <g fill="#FFFFFF" stroke="#047857" strokeWidth="1.5">
          <circle cx="360" cy="175" r="8"/>
          <circle cx="368" cy="205" r="8"/>
          <circle cx="372" cy="236" r="8"/>
          <circle cx="370" cy="268" r="8"/>
          <circle cx="362" cy="298" r="8"/>
        </g>
      </g>

      {/* Kemudi Kapal (Ship's Wheel Helm) */}
      <g stroke="url(#fallbackGold)" strokeWidth="10" strokeLinecap="round">
        <line x1="256" y1="150" x2="256" y2="310"/>
        <line x1="176" y1="230" x2="336" y2="230"/>
        <line x1="200" y1="174" x2="312" y2="286"/>
        <line x1="312" y1="174" x2="200" y2="286"/>
      </g>

      {/* Helm Peg Knobs */}
      <g fill="#FDE68A" stroke="#92400E" strokeWidth="2">
        <circle cx="256" cy="144" r="6"/>
        <circle cx="256" cy="316" r="6"/>
        <circle cx="170" cy="230" r="6"/>
        <circle cx="342" cy="230" r="6"/>
        <circle cx="194" cy="168" r="6"/>
        <circle cx="318" cy="292" r="6"/>
        <circle cx="318" cy="168" r="6"/>
        <circle cx="194" cy="292" r="6"/>
      </g>

      {/* Wheel Rims */}
      <circle cx="256" cy="230" r="62" fill="none" stroke="url(#fallbackGold)" strokeWidth="12"/>
      <circle cx="256" cy="230" r="42" fill="url(#fallbackRed)" stroke="#FEF3C7" strokeWidth="3"/>
      <circle cx="256" cy="230" r="30" fill="#FFFFFF" stroke="#D97706" strokeWidth="2"/>

      {/* Melati Kuning Kusuma Bangsa */}
      <g fill="#F59E0B" stroke="#92400E" strokeWidth="1.2">
        <circle cx="256" cy="218" r="7"/>
        <circle cx="267" cy="226" r="7"/>
        <circle cx="263" cy="240" r="7"/>
        <circle cx="249" cy="240" r="7"/>
        <circle cx="245" cy="226" r="7"/>
        <circle cx="256" cy="230" r="4" fill="#FEF3C7" stroke="#B45309" strokeWidth="1"/>
      </g>

      {/* Curved Golden Ribbon PRAJA WIBAWA */}
      <polygon points="98,390 76,418 126,428 126,396" fill="#C2410C" />
      <polygon points="414,390 436,418 386,428 386,396" fill="#C2410C" />
      
      <path
        d="M 104,390 Q 256,425 408,390 L 396,432 Q 256,468 116,432 Z"
        fill="#FFD200"
        stroke="#DC2626"
        strokeWidth="3.5"
      />
      <text
        x="256"
        y="423"
        textAnchor="middle"
        fill="#DC2626"
        fontSize="21"
        fontWeight="900"
        letterSpacing="2.5"
        fontFamily="sans-serif"
      >
        PRAJA WIBAWA
      </text>

      {/* 1950 Founding Year Below Ribbon */}
      <text
        x="256"
        y="472"
        textAnchor="middle"
        fill="#DC2626"
        fontSize="34"
        fontWeight="900"
        letterSpacing="2"
        fontFamily="sans-serif"
      >
        1950
      </text>
    </svg>
  );
};
