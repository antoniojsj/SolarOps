import React from "react";
import { motion } from "framer-motion";

interface FrameErrorsPanelProps {
  frameName: string;
  onBack: () => void;
  frameErrors: any[];
}

const FrameErrorsPanel: React.FC<FrameErrorsPanelProps> = ({
  frameName,
  onBack,
  frameErrors
}) => {
  return (
    <div className="panel">
      <div className="panel-header" style={{ padding: "16px" }}>
        <button
          onClick={onBack}
          className="back-button"
          style={{
            background: "none",
            border: "none",
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 0",
            fontSize: "14px",
            fontFamily: "inherit"
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Voltar
        </button>
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 600,
            color: "#fff",
            margin: "16px 0",
            padding: 0
          }}
        >
          {frameName}
        </h2>
      </div>
      <div className="panel-body" style={{ padding: "0 16px 16px" }}>
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
    </div>
  );
};

export default FrameErrorsPanel;
