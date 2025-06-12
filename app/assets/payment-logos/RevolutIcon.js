import * as React from "react";
import Svg, { Path } from "react-native-svg";

const RevolutIcon = (props) => (
  <Svg width={props.width || 48} height={props.height || 32} viewBox="0 0 48 32" fill="none" {...props}>
    <Path d="M10 26V6h8c5 0 8 3 8 8s-3 8-8 8h-4v4h-4zm8-12c-2.2 0-4 1.8-4 4s1.8 4 4 4 4-1.8 4-4-1.8-4-4-4z" fill="#0053F5"/>
  </Svg>
);

export default RevolutIcon;
