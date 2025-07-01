import * as React from "react";
import Svg, { Rect, Path } from "react-native-svg";

const KlarnaIcon = (props) => (
  <Svg width={props.width || 48} height={props.height || 32} viewBox="0 0 48 32" fill="none" {...props}>
    <Rect width="48" height="32" rx="4" fill="#FFB3C7" />
    <Path d="M14 16c0-2.21 1.79-4 4-4s4 1.79 4 4-1.79 4-4 4-4-1.79-4-4z" fill="#0A0B09" />
    <Path d="M24 12h4v8h-4v-8z" fill="#0A0B09" />
    <Path d="M30 12v8h4c2.21 0 4-1.79 4-4s-1.79-4-4-4h-4z" fill="#0A0B09" />
  </Svg>
);

export default KlarnaIcon;
