import React from "react";
import { motion } from "framer-motion/dist/framer-motion";
import PanelHeader from "./PanelHeader";
import "../styles/panel.css";

interface FrameErrorsPanelProps {
  frameName: string;
  onBack: () => void;
  frameErrors: any[];
  isVisible: boolean;
}

const FrameErrorsPanel: React.FC<FrameErrorsPanelProps> = ({
  frameName,
  onBack,
  frameErrors,
  isVisible
}) => {
  const variants = {
    open: { opacity: 1, x: 0 },
    closed: { opacity: 0, x: "100%" }
  };

  return (
    <motion.div
      className="panel info-panel-root"
      initial={{ opacity: 0, x: "100%" }}
      animate={isVisible ? "open" : "closed"}
      transition={{ duration: 0.3, type: "tween" }}
      variants={variants}
      key="frame-errors-panel"
    >
      <PanelHeader title={frameName} handleHide={onBack} />
      <div className="info-panel-content">
        {frameErrors.length === 0 ? (
          <div
            style={{
              color: "rgba(255, 255, 255, 0.7)",
              textAlign: "center",
              padding: "24px 0",
              fontSize: "14px"
            }}
          >
            Nenhum erro encontrado neste frame.
          </div>
        ) : (
          <div style={{ color: "#fff" }}>
            <div
              style={{
                fontSize: "14px",
                color: "rgba(255, 255, 255, 0.7)",
                marginBottom: "16px"
              }}
            >
              {frameErrors.length}{" "}
              {frameErrors.length === 1
                ? "erro encontrado"
                : "erros encontrados"}
            </div>
            <div
              style={{
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                overflow: "hidden"
              }}
            >
              {frameErrors.map((error, index) => (
                <div
                  key={index}
                  style={{
                    padding: "12px 16px",
                    borderBottom:
                      index < frameErrors.length - 1
                        ? "1px solid rgba(255, 255, 255, 0.05)"
                        : "none",
                    backgroundColor:
                      index % 2 === 0
                        ? "rgba(255, 255, 255, 0.02)"
                        : "transparent",
                    fontSize: "13px",
                    lineHeight: "1.5"
                  }}
                >
                  <div style={{ fontWeight: 500, marginBottom: "4px" }}>
                    {error.message || "Erro de validação"}
                  </div>
                  {error.type && (
                    <div
                      style={{
                        color: "rgba(255, 255, 255, 0.6)",
                        fontSize: "12px",
                        fontFamily: "monospace",
                        marginTop: "4px"
                      }}
                    >
                      {error.type}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default FrameErrorsPanel;
