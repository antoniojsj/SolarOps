import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion/dist/framer-motion";
import StyleContent from "./StyleContent";
import "../styles/modal.css";

const DEBUG = true;

function useOnClickOutside(ref, handler) {
  useEffect(() => {
    const listener = event => {
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler(event);
    };
    document.addEventListener("mousedown", listener);
    // Mark touchstart as passive to avoid scroll blocking
    document.addEventListener("touchstart", listener, { passive: true } as any);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener as any);
    };
  }, [ref, handler]);
}

function truncate(string) {
  if (!string) return "";
  return string.length > 35 ? string.substring(0, 35) + "..." : string;
}

function BulkErrorListItem(props) {
  const { error, libraries = [] } = props;
  const [isSelectIconHovered, setIsSelectIconHovered] = useState(false);

  function handleSelect(error) {
    props.handleSelect(error);
  }

  const variants = {
    initial: { opacity: 0, y: -12, scale: 1 },
    enter: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 12, scale: 1 }
  };

  const nodeId =
    error.nodeId || (error.node && error.node.id) || `error-${props.index}`;
  const clipPathId = `clip_bulk_select_all_${props.index}`;

  return (
    <motion.li
      className="error-list-item"
      positionTransition
      key={nodeId + props.index}
      variants={variants}
      initial="initial"
      animate="enter"
      exit="exit"
      style={{
        display: "block",
        backgroundColor: "rgba(255, 255, 255, 0.05)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "8px",
        color: "white",
        marginBottom: "8px",
        boxShadow: "none",
        padding: "12px"
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%"
        }}
      >
        <div
          className="error-description__message"
          style={{ fontWeight: 400, color: "white", textAlign: "left" }}
        >
          {error.message}
        </div>
        <button
          onClick={() => handleSelect(error)}
          onMouseEnter={() => setIsSelectIconHovered(true)}
          onMouseLeave={() => setIsSelectIconHovered(false)}
          style={{
            background: isSelectIconHovered
              ? "rgba(255, 255, 255, 0.1)"
              : "none",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            padding: "4px",
            display: "flex",
            alignItems: "center",
            flexShrink: 0
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <g clip-path={`url(#${clipPathId})`}>
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M7.5 6V3.025C5.138 3.259 3.26 5.138 3.025 7.5H6V8.5H3.025C3.259 10.862 5.138 12.74 7.5 12.975V10H8.5V12.975C10.862 12.741 12.74 10.862 12.975 8.5H10V7.5H12.975C12.741 5.138 10.862 3.26 8.5 3.025V6H7.5ZM13.98 7.5C13.739 4.585 11.415 2.261 8.5 2.02V0H7.5V2.02C4.585 2.261 2.261 4.585 2.02 7.5H0V8.5H2.02C2.261 11.415 4.585 13.739 7.5 13.98V16H8.5V13.98C11.415 13.739 13.739 11.415 13.98 8.5H16V7.5H13.98Z"
                fill="white"
              />
            </g>
            <defs>
              <clipPath id={clipPathId}>
                <rect width="16" height="16" fill="white" />
              </clipPath>
            </defs>
          </svg>
        </button>
      </div>

      <div style={{ display: "block", width: "100%" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px",
            border: "1px solid #444",
            borderRadius: "4px",
            height: "32px",
            backgroundColor: "rgba(255, 255, 255, 0.02)"
          }}
        >
          <span className="style-name" style={{ color: "#9ca3af" }}>
            {error.value || "Valor inválido"}
          </span>
        </div>
      </div>
    </motion.li>
  );
}

export default React.memo(BulkErrorListItem);
