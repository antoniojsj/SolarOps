import React from "react";

// Define StrokeCap type locally
export type StrokeCap = "ARROW_LINES" | "ARROW_EQUILATERAL" | "STANDARD";

interface StrokeCapOption {
  value: StrokeCap;
  label: string;
  icon: string;
}

interface LineChooserProps {
  strokeCap: StrokeCap;
  strokeOffset: number;
  onStrokeCapChange: (value: StrokeCap) => void;
  onStrokeOffsetChange: (value: number) => void;
}

// Styles
const containerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  padding: "12px",
  backgroundColor: "rgba(255, 255, 255, 0.05)",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: 500,
  justifyContent: "center",
  marginBottom: "16px"
};

const buttonGroupStyle: React.CSSProperties = {
  display: "flex",
  gap: "6px",
  alignItems: "center"
};

const buttonStyle = (isActive: boolean): React.CSSProperties => ({
  background: isActive
    ? "rgba(255, 255, 255, 0.9)"
    : "rgba(255, 255, 255, 0.1)",
  color: isActive ? "#000000" : "rgba(255, 255, 255, 0.9)",
  border: "1px solid rgba(255, 255, 255, 0.3)",
  borderRadius: "6px",
  padding: "6px 12px",
  cursor: "pointer",
  fontWeight: 500,
  minWidth: "36px",
  textAlign: "center",
  transition: "all 0.2s ease",
  fontSize: "14px"
});

const inputContainerStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  alignItems: "center",
  marginLeft: "12px"
};

const inputStyle: React.CSSProperties = {
  width: "70px",
  padding: "6px 10px",
  borderRadius: "6px",
  border: "1px solid rgba(255, 255, 255, 0.2)",
  backgroundColor: "rgba(0, 0, 0, 0.3)",
  color: "#ffffff",
  textAlign: "center",
  fontSize: "14px"
};

const labelStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "rgba(255, 255, 255, 0.8)",
  whiteSpace: "nowrap"
};

const LineChooser: React.FC<LineChooserProps> = ({
  strokeCap,
  strokeOffset,
  onStrokeCapChange,
  onStrokeOffsetChange
}) => {
  const strokeCapOptions: StrokeCapOption[] = [
    { value: "ARROW_LINES", label: "Seta", icon: "→" },
    { value: "ARROW_EQUILATERAL", label: "Seta Equilátera", icon: "⟶" },
    { value: "STANDARD", label: "Padrão", icon: "|" }
  ];

  const handleOffsetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10) || 0;
    onStrokeOffsetChange(value);
  };

  return (
    <div style={containerStyle}>
      <div style={buttonGroupStyle}>
        <span style={labelStyle}>Estilo da linha:</span>
        <div style={{ display: "flex", gap: "4px" }}>
          {strokeCapOptions.map(option => (
            <button
              key={option.value}
              onClick={() => onStrokeCapChange(option.value)}
              style={buttonStyle(strokeCap === option.value)}
              title={option.label}
            >
              {option.icon}
            </button>
          ))}
        </div>
      </div>

      <div style={inputContainerStyle}>
        <span style={labelStyle}>Offset:</span>
        <input
          type="number"
          value={strokeOffset}
          onChange={handleOffsetChange}
          min="0"
          max="100"
          step="1"
          style={inputStyle}
        />
      </div>
    </div>
  );
};

export default LineChooser;
