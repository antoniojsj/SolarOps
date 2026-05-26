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

  const Pill = ({ active, label }: { active: boolean; label: string }) => {
    return (
      <div
        style={{
          width: 52,
          height: 24,
          borderRadius: 12,
          background: active ? "#519C4A" : "rgba(255, 255, 255, 0.05)",
          color: active ? "#FFFFFF" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 600,
          fontFamily: "Inter, sans-serif"
        }}
      >
        {active ? label : ""}
      </div>
    );
  };

  const isGraphicAA = isGraphic ? aa : contrastRatio >= 3;
  const isNormalAA = isGraphic ? false : aa;
  const isNormalAAA = isGraphic ? false : aaa;
  const isLargeAA = isGraphic ? false : aaLarge;
  const isLargeAAA = isGraphic ? false : aaa; // Large text requires 4.5 for AAA, same as Normal AA, wait...
  // Wait, aaa for large text is >= 4.5. If the original aaa is for normal text (>=7), we can just check contrastRatio >= 4.5
  const largeAAA = isGraphic ? false : contrastRatio >= 4.5;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        fontFamily: "Inter, sans-serif"
      }}
    >
      {/* Preview Box */}
      <div
        style={{
          background: "#F5F5F5",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 120,
          position: "relative"
        }}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Preview"
            style={{
              maxWidth: "100%",
              maxHeight: 180,
              objectFit: "contain",
              display: "block"
            }}
          />
        ) : (
          <span style={{ color: "#999", fontSize: 12 }}>
            Preview não disponível
          </span>
        )}
      </div>

      {/* Colors Row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          background: "#1E1E1E"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 2,
              background: textColor,
              border: "1px solid rgba(255,255,255,0.2)"
            }}
          />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#FFF" }}>
            {textColor}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#FFF" }}>
            {bgColor}
          </span>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 2,
              background: bgColor,
              border: "1px solid rgba(255,255,255,0.2)"
            }}
          />
        </div>
      </div>

      {/* Results Container */}
      <div style={{ padding: "16px", background: "#222" }}>
        {/* Contrast Ratio */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 500, color: "#E0E0E0" }}>
            Contrast Ratio
          </span>
          <span style={{ fontSize: 13, fontWeight: 500, color: "#E0E0E0" }}>
            {contrastRatio.toFixed(2)} : 1
          </span>
        </div>

        {/* Normal Text */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 500, color: "#E0E0E0" }}>
            Normal Text
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <Pill active={isNormalAA} label="AA" />
            <Pill active={isNormalAAA} label="AAA" />
          </div>
        </div>

        {/* Large Text */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 500, color: "#E0E0E0" }}>
            Large Text
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <Pill active={isLargeAA} label="AA" />
            <Pill active={largeAAA} label="AAA" />
          </div>
        </div>

        {/* Graphics */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 500, color: "#E0E0E0" }}>
            Graphics
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <Pill active={isGraphicAA} label="AA" />
            <Pill active={false} label="" />
          </div>
        </div>
      </div>
    </div>
  );
};
