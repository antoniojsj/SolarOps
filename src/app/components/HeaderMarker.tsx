import React, { useState, useEffect } from "react";

interface HeadingData {
  id: string;
  title: string;
  type: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface HeaderMarkerProps {
  isVisible: boolean;
  selectedNode: any;
  onBack: () => void;
}

const HeaderMarker: React.FC<HeaderMarkerProps> = ({
  isVisible,
  selectedNode,
  onBack
}) => {
  const [headings, setHeadings] = useState<HeadingData[]>([]);
  const [hoveredLevel, setHoveredLevel] = useState<string | null>(null);

  const headingTypes = [
    { id: "h1", label: "Heading level 1", color: "#9333ea", size: 32 }, // Roxo
    { id: "h2", label: "Heading level 2", color: "#ea580c", size: 28 },
    { id: "h3", label: "Heading level 3", color: "#ec4899", size: 24 }, // Rosa
    { id: "h4", label: "Heading level 4", color: "#65a30d", size: 20 },
    { id: "h5", label: "Heading level 5", color: "#16a34a", size: 18 },
    { id: "h6", label: "Heading level 6", color: "#0891b2", size: 16 }
  ];

  // Aplicar heading ao texto selecionado
  const applyHeading = (
    headingType: "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
  ) => {
    // Enviar mensagem para o plugin aplicar heading ao texto selecionado
    parent.postMessage(
      {
        pluginMessage: {
          type: "add-heading",
          headingType: headingType
        }
      },
      "*"
    );
  };

  // Remover heading
  const removeHeading = (id: string) => {
    const headingToRemove = headings.find(h => h.id === id);
    if (!headingToRemove) return;

    // Enviar mensagem para o plugin remover o heading
    parent.postMessage(
      {
        pluginMessage: {
          type: "remove-heading",
          heading: headingToRemove
        }
      },
      "*"
    );

    // Remover da lista local
    setHeadings(headings.filter(h => h.id !== id));
  };

  if (!isVisible) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        margin: "8px 0 0 0",
        backgroundColor: "transparent",
        color: "#e0e0e0"
      }}
    >
      {/* Lista de headings existentes */}
      {headings.length > 0 && (
        <div style={{ marginBottom: "24px" }}>
          <h3
            style={{
              fontSize: "14px",
              fontWeight: 600,
              margin: "0 0 12px 0",
              color: "#fff"
            }}
          >
            Headings Marcados ({headings.length})
          </h3>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }}
          >
            {headings.map(heading => (
              <div
                key={heading.id}
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
                      backgroundColor:
                        headingTypes.find(h => h.id === heading.type)?.color ||
                        "#666"
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
                      {heading.title}
                    </div>
                    <div
                      style={{
                        fontSize: "11px",
                        color: "rgba(255, 255, 255, 0.6)"
                      }}
                    >
                      {heading.type.toUpperCase()}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => removeHeading(heading.id)}
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

      {/* Botões de heading - sem título */}
      <div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px"
          }}
        >
          {headingTypes.map(type => (
            <button
              key={type.id}
              onClick={() => applyHeading(type.id as any)}
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
                color: type.color,
                fontSize: "14px", // Fonte fixa 14px para todos os Hs
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
              <div style={{ fontSize: "12px", fontWeight: 400 }}>
                {type.label}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HeaderMarker;
