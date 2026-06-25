import React from 'react'
import Svg, { Path } from 'react-native-svg'

export type IconoirName =
  | 'headset'
  | 'sea-waves'
  | 'cloud-rain'
  | 'sparkles'
  | 'wind'
  | 'log-out'
  | 'sound-high'
  | 'sound-off'
  | 'leaf'

interface IconoirProps {
  name: IconoirName
  size?: number
  color?: string
}

export default function Iconoir({ name, size = 24, color = 'rgba(255, 255, 255, 0.8)' }: IconoirProps) {
  let paths: React.ReactNode = null

  switch (name) {
    case 'headset':
      paths = (
        <>
          <Path
            d="M21 14H19V20H21C21.5523 20 22 19.5523 22 19V15C22 14.4477 21.5523 14 21 14Z"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M2 15C2 14.4477 2.44772 14 3 14H5V20H3C2.44772 20 2 19.5523 2 19V15Z"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M19 14V12C19 8.13401 15.866 5 12 5C8.13401 5 5 8.13401 5 12V14"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M12 5V2"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )
      break
    case 'sea-waves':
      paths = (
        <>
          <Path
            d="M2 13C2 13 4 11 6.5 11C9 11 10 13 12 13C14 13 15 11 17.5 11C20 11 22 13 22 13"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M2 17C2 17 4 15 6.5 15C9 15 10 17 12 17C14 17 15 15 17.5 15C20 15 22 17 22 17"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M2 9C2 9 4 7 6.5 7C9 7 10 9 12 9C14 9 15 7 17.5 7C20 7 22 9 22 9"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )
      break
    case 'cloud-rain':
      paths = (
        <>
          <Path
            d="M20 12.5C20 15.5385 17.5385 18 14.5 18C13.5 18 12 17.5 11 16.5C10 17.5 8.5 18 7.5 18C4.46154 18 2 15.5385 2 12.5C2 9.53762 4.41738 7.12658 7.37 7.01C8.163 4.148 10.825 2 14 2C17.7 2 20.672 5.097 20 8.76C20 8.76 20 12.5 20 12.5Z"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M10 20V22"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <Path
            d="M14 20V22"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <Path
            d="M6 19.5V21"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </>
      )
      break
    case 'sparkles':
      paths = (
        <>
          <Path
            d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )
      break
    case 'wind':
      paths = (
        <>
          <Path
            d="M2 8H17C18.6569 8 20 9.34315 20 11C20 12.6569 18.6569 14 17 14H15"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M2 12H13C14.6569 12 16 13.3431 16 15C16 16.6569 14.6569 18 13 18H11"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M2 4H9C10.6569 4 12 5.34315 12 7C12 8.65685 10.6569 10 9 10"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )
      break
    case 'log-out':
      paths = (
        <>
          <Path
            d="M12 15L15 12M15 12L12 9M15 12H4M9 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4H9"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )
      break
    case 'sound-high':
      paths = (
        <>
          <Path
            d="M2 15V9H6L11 4V20L6 15H2Z"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M15 8C16.5 9.5 16.5 14.5 15 16"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M18 5C20.5 7.5 20.5 16.5 18 19"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )
      break
    case 'sound-off':
      paths = (
        <>
          <Path
            d="M2 15V9H6L11 4V20L6 15H2Z"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M16 10L20 14M20 10L16 14"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )
      break
    case 'leaf':
      paths = (
        <>
          <Path
            d="M12 21C12 21 12 17.5 10.5 14.5C9 11.5 6 9.5 6 9.5M12 21C12 21 12.5 15 15 11C17.5 7 21 5.5 21 5.5C21 5.5 18.5 7 15 11C11.5 15 12 21 12 21ZM12 21V12"
            stroke={color}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )
      break
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {paths}
    </Svg>
  )
}
