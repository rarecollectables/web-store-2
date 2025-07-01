import * as React from "react";
import Svg, { Rect, Path, Circle } from "react-native-svg";

const RevolutIcon = (props) => (
  <Svg width={props.width || 48} height={props.height || 32} viewBox="0 0 48 32" fill="none" {...props}>
    <Rect width="48" height="32" rx="4" fill="#FFFFFF" />
    <Circle cx="24" cy="16" r="10" fill="#191C1F" />
    <Path d="M20 16c0-2.21 1.79-4 4-4 1.66 0 3.08 1.01 3.68 2.45l-2.07 1.2C25.33 15.25 24.71 15 24 15c-0.55 0-1 0.45-1 1s0.45 1 1 1c0.71 0 1.33-0.25 1.61-0.65l2.07 1.2C27.08 18.99 25.66 20 24 20c-2.21 0-4-1.79-4-4z" fill="#2962FF" />
  </Svg>
);

export default RevolutIcon;
