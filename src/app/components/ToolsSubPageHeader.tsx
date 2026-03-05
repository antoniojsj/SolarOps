import * as React from "react";
import { motion } from "framer-motion/dist/framer-motion";

interface ToolsSubPageHeaderProps {
  title: string;
  onBack: () => void;
}

const ToolsSubPageHeader: React.FC<ToolsSubPageHeaderProps> = ({
  title,
  onBack
}) => {
  return (
    <div className="navigation-wrapper">
      <nav className="nav">
        <motion.button
          className="icon icon--button info-panel-icon back-button"
          onClick={onBack}
          whileTap={{ scale: 0.9, opacity: 0.8 }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "none",
            padding: 0,
            marginRight: 8
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M13 4L7 10L13 16"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.button>
        <motion.div
          style={{
            cursor: "default",
            flex: 1,
            textAlign: "left",
            fontSize: "14px",
            fontWeight: "500",
            color: "#fff",
            paddingLeft: "8px"
          }}
        >
          {title}
        </motion.div>

        <div className="nav-icon-wrapper" style={{ paddingRight: 16 }}>
          {/* Espaço reservado para manter o layout balanceado */}
          <div style={{ width: 20, height: 20 }} />
        </div>
      </nav>
    </div>
  );
};

export default ToolsSubPageHeader;
