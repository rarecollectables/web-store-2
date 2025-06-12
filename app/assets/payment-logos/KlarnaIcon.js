import * as React from "react";
import Svg, { Rect, Text } from "react-native-svg";

const KlarnaIcon = (props) => (
  <Svg width={props.width || 48} height={props.height || 32} viewBox="0 0 48 32" fill="none" {...props}>
    <Rect width="48" height="32" rx="8" fill="#ffb3c7"/>
    <Text x="12" y="22" fontSize="16" fill="#111">Klarna</Text>
  </Svg>
);

export default KlarnaIcon;
