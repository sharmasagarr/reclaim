import React from 'react';
import Svg, { Path, SvgProps } from 'react-native-svg';

export const FocusIcon: React.FC<SvgProps> = ({ color = '#22C55E', width = 24, height = 24, ...props }) => (
  <Svg width={width} height={height} viewBox="0 0 24 24" fill="none" {...props}>
    <Path
      d="M5 3H19C19.5523 3 20 3.44772 20 4V7C20 8.85652 19.2625 10.637 17.9497 11.9497L15 14.8995C14.4375 15.462 14.1213 16.2251 14.1213 17.0208V19H19C19.5523 19 20 19.4477 20 20C20 20.5523 19.5523 21 19 21H5C4.44772 21 4 20.5523 4 20C4 19.4477 4.44772 19 5 19H9.87868V17.0208C9.87868 16.2251 9.5625 15.462 9 14.8995L6.05025 11.9497C4.7375 10.637 4 8.85652 4 7V4C4 3.44772 4.44772 3 5 3Z"
      fill={color}
    />
  </Svg>
);

export const CalendarIcon: React.FC<SvgProps> = ({ color = '#9CA3AF', width = 24, height = 24, ...props }) => (
  <Svg width={width} height={height} viewBox="0 0 24 24" fill="none" {...props}>
    <Path
      d="M19 4H18V2H16V4H8V2H6V4H5C3.89 4 3.01 4.9 3.01 6L3 20C3 21.1 3.89 22 5 22H19C20.1 22 21 21.1 21 20V6C21 4.9 20.1 4 19 4ZM19 20H5V9H19V20ZM7 11H12V16H7V11Z"
      fill={color}
    />
  </Svg>
);

export const BlockIcon: React.FC<SvgProps> = ({ color = '#9CA3AF', width = 24, height = 24, ...props }) => (
  <Svg width={width} height={height} viewBox="0 0 24 24" fill="none" {...props}>
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM4 12C4 7.58 7.58 4 12 4C13.85 4 15.55 4.63 16.9 5.69L5.69 16.9C4.63 15.55 4 13.85 4 12ZM12 20C10.15 20 8.45 19.37 7.1 18.31L18.31 7.1C19.37 8.45 20 10.15 20 12C20 16.42 16.42 20 12 20Z"
      fill={color}
    />
  </Svg>
);

export const Icons = {
  Focus: FocusIcon,
  Calendar: CalendarIcon,
  Schedule: CalendarIcon,
  Block: BlockIcon,
  Blocks: BlockIcon,
};

export type IconName = keyof typeof Icons;
