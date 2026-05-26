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
  result: ContrastResult;
  previewUrl: string | null;
}

export const SingleContrastResult: React.FC<SingleContrastResultProps> = ({
  result,
  previewUrl
}) => {
  const {
    isGraphic,
    contrastRatio,
    aa,
    aaa,
    aaLarge,
    textColor,
    bgColor
  } = result;

  const getComplianceLevel = (
    isLarge: boolean,
    checkGraphic: boolean = false
  ) => {
    let level = "Falhou";
    let isPassing = false;

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

  const ratioBgColor =
    contrastRatio >= 4.5
      ? "#E8F5E9"
      : contrastRatio >= 3
      ? "#FFF9C4"
      : "#FFEBEE";

  return (
    <div
      style={{ marginTop: "16px", padding: "0 16px", boxSizing: "border-box" }}
    >
      {/* Colors Inputs row */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
        <div style={{ flex: 1 }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "400",
              color: "white",
              fontSize: "12px"
            }}
          >
            Primeiro plano
          </label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              readOnly
              value={textColor}
              style={{
                padding: "8px 36px 8px 12px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "4px",
                width: "100%",
                boxSizing: "border-box",
                backgroundColor: "rgba(0, 0, 0, 0.2)",
                color: "white",
                height: "36px"
              }}
            />
            <div
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "20px",
                height: "20px",
                backgroundColor: textColor,
                border: "1px solid rgba(255, 255, 255, 0.3)",
                borderRadius: "4px",
                overflow: "hidden"
              }}
            />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontWeight: "400",
              color: "white",
              fontSize: "12px"
            }}
          >
            Fundo
          </label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              readOnly
              value={bgColor}
              style={{
                padding: "8px 36px 8px 12px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "4px",
                width: "100%",
                boxSizing: "border-box",
                backgroundColor: "rgba(0, 0, 0, 0.2)",
                color: "white",
                height: "36px"
              }}
            />
            <div
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "20px",
                height: "20px",
                backgroundColor: bgColor,
                border: "1px solid rgba(255, 255, 255, 0.3)",
                borderRadius: "4px",
                overflow: "hidden"
              }}
            />
          </div>
        </div>
      </div>

      {/* Large Contrast Ratio Box */}
      <div
        style={{
          backgroundColor: ratioBgColor,
          borderRadius: "8px",
          padding: "20px 12px",
          marginBottom: "20px",
          marginTop: "20px",
          textAlign: "center",
          height: "120px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <div
          style={{
            fontSize: "48px",
            fontWeight: "bold",
            color: textColor,
            lineHeight: 1,
            textShadow: "0 1px 2px rgba(0,0,0,0.1)"
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
          marginTop: "16px",
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
              backgroundColor: item.isPassing
                ? "rgba(76, 175, 80, 0.1)"
                : "rgba(244, 67, 54, 0.1)",
              borderRadius: "8px",
              border: `1px solid ${item.isPassing ? "#4CAF50" : "#F44336"}`,
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
                color: "white",
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
                const isActive = isCurrentLevel || isHigherLevel;

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
                      color: "white",
                      fontWeight: "bold",
                      fontSize: "11px",
                      opacity: showLevel ? 1 : 0.4,
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
                color: "rgba(255, 255, 255, 0.7)",
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
