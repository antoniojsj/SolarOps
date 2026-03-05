import * as React from "react";
import AIRlogoSvg from "../assets/AIRlogo.svg";

function AIRlogo() {
  return (
    <div style={{ textAlign: "center", padding: "12px 0" }}>
      <AIRlogoSvg />
    </div>
  );
}

export default React.memo(AIRlogo);
