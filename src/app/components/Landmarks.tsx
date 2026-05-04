import React, { useState } from "react";

interface LandmarkData {
  id: string;
  title: string;
  type: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface LandmarksProps {
  isVisible: boolean;
  selectedNode: any;
  onBack: () => void;
}

const Landmarks: React.FC<LandmarksProps> = ({
  isVisible,
  selectedNode,
  onBack
}) => {
  const [landmarks, setLandmarks] = useState<LandmarkData[]>([]);
  const [hoveredLevel, setHoveredLevel] = useState<string | null>(null);

  const landmarkTypes = [
    { id: "header", label: "Cabeçalho da página ou seção", color: "#9333ea" },
    { id: "nav", label: "Navegação principal ou secundária", color: "#9333ea" },
    { id: "main", label: "Conteúdo principal (único)", color: "#9333ea" },
    { id: "section", label: "Seções temáticas", color: "#9333ea" },
    { id: "article", label: "Conteúdo independente", color: "#9333ea" },
    { id: "aside", label: "Conteúdo complementar", color: "#9333ea" },
    { id: "footer", label: "Rodapé da página ou seção", color: "#9333ea" }
  ];

  const applyLandmark = (landmarkType: string) => {
    parent.postMessage(
      {
        pluginMessage: {
          type: "add-landmark",
          landmarkType: landmarkType
        }
      },
      "*"
    );
  };

  const removeLandmark = (id: string) => {
    const landmarkToRemove = landmarks.find(h => h.id === id);
    if (!landmarkToRemove) return;

    parent.postMessage(
      {
        pluginMessage: {
          type: "remove-landmark",
          landmark: landmarkToRemove
        }
      },
      "*"
    );

    setLandmarks(landmarks.filter(h => h.id !== id));
  };

  if (!isVisible) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "8px 0 0 0",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        color: "#e0e0e0"
      }}
    >
      {landmarks.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <h3
            style={{
              fontSize: "14px",
              fontWeight: 600,
              margin: "0 0 12px 0",
              color: "#fff"
            }}
          >
            Landmarks Marcados ({landmarks.length})
          </h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }}
          >
            {landmarks.map(landmark => (
              <div
                key={landmark.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px",
                  background: "rgba(255, 255, 255, 0.05)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "6px"
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#9333ea"
                    }}
                  />
                  <div>
                    <div
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        color: "#fff"
                      }}
                    >
                      {landmark.title}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "rgba(255, 255, 255, 0.6)"
                      }}
                    >
                      {landmark.type.toUpperCase()}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeLandmark(landmark.id)}
                  style={{
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    color: "#ef4444",
                    borderRadius: "4px",
                    padding: "4px 8px",
                    fontSize: "11px",
                    cursor: "pointer"
                  }}
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginBottom: "20px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "16px"
          }}
        >
          {landmarkTypes.map(type => (
            <button
              key={type.id}
              onClick={() => applyLandmark(type.id)}
              onMouseEnter={() => setHoveredLevel(type.id)}
              onMouseLeave={() => setHoveredLevel(null)}
              style={{
                padding: "16px 12px",
                background:
                  hoveredLevel === type.id
                    ? `${type.color}20`
                    : "rgba(255, 255, 255, 0.05)",
                border:
                  hoveredLevel === type.id
                    ? `1px solid ${type.color}40`
                    : "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                color: hoveredLevel === type.id ? type.color : "#fff",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <div>{type.id.toUpperCase()}</div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: 400,
                  color: "inherit",
                  textAlign: "center"
                }}
              >
                {type.label}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          background: "rgba(147, 51, 234, 0.08)",
          border: "1px solid rgba(147, 51, 234, 0.2)",
          borderRadius: "8px",
          padding: "12px",
          marginBottom: "16px"
        }}
      >
        <h4
          style={{
            fontSize: "14px",
            fontWeight: 600,
            margin: "0 0 8px 0",
            color: "#fff"
          }}
        >
          📋 Guia de Landmarks
        </h4>
        <div
          style={{
            fontSize: "12px",
            lineHeight: "1.4",
            color: "rgba(255, 255, 255, 0.9)"
          }}
        >
          <div style={{ marginBottom: "6px" }}>
            <strong style={{ color: "#fff" }}>header</strong> - Cabeçalho da
            página ou seção.
          </div>
          <div style={{ marginBottom: "6px" }}>
            <strong style={{ color: "#fff" }}>nav</strong> - Navegação principal
            ou secundária.
          </div>
          <div style={{ marginBottom: "6px" }}>
            <strong style={{ color: "#fff" }}>main</strong> - Conteúdo principal
            (único por página).
          </div>
          <div style={{ marginBottom: "6px" }}>
            <strong style={{ color: "#fff" }}>section</strong> - Seções
            temáticas do conteúdo.
          </div>
          <div style={{ marginBottom: "6px" }}>
            <strong style={{ color: "#fff" }}>article</strong> - Conteúdo
            independente (post, card).
          </div>
          <div style={{ marginBottom: "6px" }}>
            <strong style={{ color: "#fff" }}>aside</strong> - Conteúdo
            complementar (sidebar).
          </div>
          <div>
            <strong style={{ color: "#fff" }}>footer</strong> - Rodapé da página
            ou seção.
          </div>
        </div>
      </div>

      <div
        style={{
          fontSize: "12px",
          lineHeight: "1.4",
          color: "rgba(255, 255, 255, 0.7)",
          textAlign: "center",
          padding: "4px 8px"
        }}
      >
        💡 <strong>Como usar:</strong> Selecione um elemento no Figma e clique
        no landmark desejado para aplicar a marcação semântica correta.
      </div>
    </div>
  );
};

export default Landmarks;
