import React from "react";

interface ContrastResult {
  nodeName: string;
  nodeType?: string;
  isGraphic?: boolean;
  text: string;
  textColor: string;
  bgColor: string;
  contrastRatio: number;
  aa: boolean;
  aaa: boolean;
  aaLarge: boolean;
}

interface SingleContrastResultProps {
  result?: ContrastResult;
  previewUrl?: string | null;
  emptyMessage?: string;
}

export const SingleContrastResult: React.FC<SingleContrastResultProps> = ({
  result,
  previewUrl,
  emptyMessage = "Selecione um objeto no canvas para verificar o contraste automaticamente."
}) => {
  // Configurações padrão quando não há resultado selecionado
  const isGraphic = result?.isGraphic ?? false;
  const contrastRatio = result?.contrastRatio ?? 0.0;
  const textColor = result?.textColor ?? "#000000";
  const bgColor = result?.bgColor ?? "#FFFFFF";

  // Quando não tem resultado, todos os níveis falham visualmente
  const hasResult = !!result;

  const getComplianceLevel = (
    isLarge: boolean,
    checkGraphic: boolean = false
  ) => {
    let level = "Falhou";
    let isPassing = false;

    if (!hasResult) {
      return { level, isPassing };
    }

    if (checkGraphic) {
      if (contrastRatio >= 3) {
        level = "AA";
        isPassing = true;
      }
    } else {
      if (isLarge) {
        if (contrastRatio >= 4.5) {
          level = "AAA";
          isPassing = true;
        } else if (contrastRatio >= 3) {
          level = "AA";
          isPassing = true;
        }
      } else {
        if (contrastRatio >= 7) {
          level = "AAA";
          isPassing = true;
        } else if (contrastRatio >= 4.5) {
          level = "AA";
          isPassing = true;
        }
      }
    }

    return { level, isPassing };
  };

  const normalTextLevel = getComplianceLevel(false);
  const largeTextLevel = getComplianceLevel(true);
  const uiLevel = getComplianceLevel(false, true);

  const items = [
    {
      title: "Texto normal",
      level: normalTextLevel.level,
      required:
        normalTextLevel.level === "AAA"
          ? "7:1+"
          : normalTextLevel.level === "AA"
          ? "4.5:1+"
          : "3:1+",
      isPassing: normalTextLevel.isPassing
    },
    {
      title: "Texto grande",
      level: largeTextLevel.level,
      required:
        largeTextLevel.level === "AAA"
          ? "4.5:1+"
          : largeTextLevel.level === "AA"
          ? "3:1+"
          : "3:1+",
      isPassing: largeTextLevel.isPassing
    },
    {
      title: "Elementos gráficos",
      level: uiLevel.level,
      required: "3:1+",
      isPassing: uiLevel.isPassing
    }
  ];

  const ratioBgColor = !hasResult
    ? "rgba(255, 255, 255, 0.05)"
    : contrastRatio >= 4.5
    ? "#E8F5E9"
    : contrastRatio >= 3
    ? "#FFF9C4"
    : "#FFEBEE";

  return (
    <div
      style={{
        padding: "0",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: "16px"
      }}
    >
      {/* Preview Box - Now at the Top! */}
      <div
        style={{
          background: "rgba(0, 0, 0, 0.2)",
          borderRadius: 8,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 120,
          border: "1px solid rgba(255, 255, 255, 0.1)",
          overflow: "hidden"
        }}
      >
        {previewUrl && hasResult ? (
          <img
            src={previewUrl}
            alt="Preview do elemento"
            style={{
              maxWidth: "100%",
              maxHeight: 180,
              objectFit: "contain",
              display: "block"
            }}
          />
        ) : (
          <p
            style={{
              margin: 0,
              color: "rgba(255, 255, 255, 0.7)",
              fontSize: 13,
              textAlign: "center",
              lineHeight: 1.5,
              maxWidth: "80%"
            }}
          >
            {emptyMessage}
          </p>
        )}
        {/* Colors Row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0 8px"
          }}
        >
          {/* Foreground */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              <rect
                x="3"
                y="3"
                width="14"
                height="14"
                rx="2"
                ry="2"
                fill="currentColor"
              ></rect>
              <rect
                x="7"
                y="7"
                width="14"
                height="14"
                rx="2"
                ry="2"
                fill="none"
                stroke="black"
              ></rect>
            </svg>
            <div
              style={{
                width: "12px",
                height: "12px",
                backgroundColor: hasResult ? textColor : "transparent",
                borderRadius: "2px",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                flexShrink: 0
              }}
            />
            <span
              style={{
                color: hasResult ? "white" : "rgba(255,255,255,0.3)",
                fontSize: "12px",
                fontFamily: "monospace",
                fontWeight: 600
              }}
            >
              {hasResult ? textColor : "#------"}
            </span>
          </div>

          {/* Background */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                color: hasResult ? "white" : "rgba(255,255,255,0.3)",
                fontSize: "12px",
                fontFamily: "monospace",
                fontWeight: 600
              }}
            >
              {hasResult ? bgColor : "#------"}
            </span>
            <div
              style={{
                width: "12px",
                height: "12px",
                backgroundColor: hasResult ? bgColor : "transparent",
                borderRadius: "2px",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                flexShrink: 0
              }}
            />
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: "rgba(255,255,255,0.7)" }}
            >
              <rect
                x="7"
                y="7"
                width="14"
                height="14"
                rx="2"
                ry="2"
                fill="currentColor"
              ></rect>
              <rect
                x="3"
                y="3"
                width="14"
                height="14"
                rx="2"
                ry="2"
                fill="none"
                stroke="black"
              ></rect>
            </svg>
          </div>
        </div>{" "}
      </div>

      {/* Large Contrast Ratio Box */}
      <div
        style={{
          backgroundColor: ratioBgColor,
          borderRadius: "8px",
          padding: "20px 12px",
          textAlign: "center",
          height: "120px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: hasResult ? "none" : "1px solid rgba(255,255,255,0.1)"
        }}
      >
        <div
          style={{
            fontSize: "48px",
            fontWeight: "bold",
            color: hasResult ? textColor : "rgba(255,255,255,0.2)",
            lineHeight: 1,
            textShadow: hasResult ? "0 1px 2px rgba(0,0,0,0.1)" : "none"
          }}
        >
          {contrastRatio.toFixed(2)}
        </div>
      </div>

      {/* Cards Row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          marginBottom: "32px"
        }}
      >
        {items.map((item, index) => (
          <div
            key={index}
            style={{
              flex: 1,
              padding: "8px 8px",
              backgroundColor: hasResult
                ? item.isPassing
                  ? "rgba(76, 175, 80, 0.1)"
                  : "rgba(244, 67, 54, 0.1)"
                : "rgba(255, 255, 255, 0.05)",
              borderRadius: "8px",
              border: hasResult
                ? `1px solid ${item.isPassing ? "#4CAF50" : "#F44336"}`
                : "1px solid rgba(255, 255, 255, 0.1)",
              textAlign: "center",
              minHeight: "100px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxSizing: "border-box"
            }}
          >
            <div
              style={{
                fontSize: "11px",
                color: hasResult ? "white" : "rgba(255, 255, 255, 0.4)",
                fontWeight: "500",
                lineHeight: "1.1",
                marginBottom: "4px"
              }}
            >
              {item.title}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "6px",
                margin: "8px 0",
                flexWrap: "wrap"
              }}
            >
              {["AA", "AAA"].map(level => {
                const isLargeTextItem = item.title === "Texto grande";
                const isActiveForLargeText =
                  isLargeTextItem && level === "A" && contrastRatio >= 3;

                const isCurrentLevel = item.level === level;
                const isHigherLevel = level === "AA" && item.level === "AAA";

                const showLevel = isCurrentLevel || isHigherLevel;
                const isActive = hasResult && (isCurrentLevel || isHigherLevel);

                const isAFailure = !item.isPassing && item.level === level;

                const cardBgColor = isActive
                  ? isAFailure
                    ? "#F44336"
                    : "#4CAF50"
                  : "rgba(255, 255, 255, 0.1)";

                return (
                  <div
                    key={level}
                    style={{
                      minWidth: "32px",
                      padding: "4px 8px",
                      borderRadius: "12px",
                      backgroundColor: isActive
                        ? cardBgColor
                        : "rgba(255, 255, 255, 0.1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: hasResult ? "white" : "rgba(255, 255, 255, 0.3)",
                      fontWeight: "bold",
                      fontSize: "11px",
                      opacity: hasResult && showLevel ? 1 : 0.4,
                      height: "24px",
                      boxSizing: "border-box"
                    }}
                  >
                    {level}
                  </div>
                );
              })}
            </div>

            <div
              style={{
                fontSize: "12px",
                color: "rgba(255, 255, 255, 0.4)",
                lineHeight: "1.1",
                marginTop: "4px"
              }}
            >
              Mínimo: {item.required}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
