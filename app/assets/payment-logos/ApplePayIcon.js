import * as React from "react";
import Svg, { Rect, Path, G } from "react-native-svg";

const ApplePayIcon = (props) => (
  <Svg width={props.width || 48} height={props.height || 32} viewBox="0 0 48 32" fill="none" {...props}>
    <Rect width="48" height="32" rx="8" fill="#000" />
    {/* Apple logo (white) */}
    <G>
      <Path d="M18.5 13.2c.6-.8 1.5-1.4 2.5-1.4.1 1.1-.4 2.3-1 3-.6.7-1.5 1.4-2.5 1.2-.1-1.1.4-2.2 1-2.8zm2.2-1.6c.6-.7 1.7-1.2 2.7-1.2.1 1.1-.4 2.2-1 2.9-.6.7-1.7 1.2-2.7 1.1-.1-1.1.4-2.2 1-2.8z" fill="#fff"/>
    </G>
    {/* Pay text (white, bold) */}
    <Path d="M27 21v-7h2.2c2 0 3.2 1.2 3.2 3.5 0 2.2-1.2 3.5-3.2 3.5H28v2h-1zm1-3h1.1c.9 0 1.4-.6 1.4-1.5 0-.9-.5-1.5-1.4-1.5H28v3zm5.5-2.5c0-1.7 1.2-2.9 2.9-2.9 1.7 0 2.9 1.2 2.9 2.9s-1.2 2.9-2.9 2.9c-1.7 0-2.9-1.2-2.9-2.9zm1.1 0c0 1.1.7 1.8 1.8 1.8s1.8-.7 1.8-1.8-.7-1.8-1.8-1.8-1.8.7-1.8 1.8zm5.7-2.4h1.1l-2.4 6.2h-1.1l2.4-6.2zm-2.3 2.2c.4-.9 1.2-1.5 2.2-1.5s1.8.6 2.2 1.5l-1.1 2.8c-.3.7-.8 1.1-1.1 1.1-.3 0-.8-.4-1.1-1.1l-1.1-2.8z" fill="#fff"/>
  </Svg>
);

export default ApplePayIcon;
