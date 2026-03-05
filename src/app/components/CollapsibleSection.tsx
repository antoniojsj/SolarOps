import React, { useState } from "react";

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  maxHeight?: string;
  noPadding?: boolean; // Nova prop para controlar padding
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  children,
  defaultOpen = false,
  maxHeight = "300px",
  noPadding = false
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        background: "#252526",
        borderRadius: "6px",
        border: "1px solid #333",
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        marginBottom: "16px"
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "8px 12px",
          borderBottom: isOpen ? "1px solid #333" : "none",
          backgroundColor: "#2D2D2D",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          userSelect: "none"
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "11px",
            fontWeight: 600,
            color: "#9CDCFE",
            textTransform: "uppercase",
            letterSpacing: "0.5px"
          }}
        >
          {icon}
          {title}
        </div>

        {/* Toggle Icon */}
        <div
          style={{
            color: "#9CDCFE",
            transition: "transform 0.2s ease",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)"
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          maxHeight: isOpen ? maxHeight : "0",
          overflow: "hidden",
          transition: "max-height 0.3s ease",
          fontSize: "12px"
        }}
      >
        <div style={{ padding: noPadding ? "0" : "12px" }}>{children}</div>
      </div>
    </div>
  );
};

export default CollapsibleSection;
