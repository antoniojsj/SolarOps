import * as React from "react";

interface ConformityItemChartProps {
  type: {
    key: string;
    label: string;
    icon: string;
  };
  conform: number;
  nonConform: number;
}

const ConformityItemChart: React.FC<ConformityItemChartProps> = ({
  type,
  conform,
  nonConform
}) => {
  const total = conform + nonConform;
  const conformPercentage = total > 0 ? Math.round((conform / total) * 100) : 0;
  const nonConformPercentage = 100 - conformPercentage;

  // Cores baseadas no percentual de conformidade
  const getStatusColor = (conformPercentage: number) => {
    if (conformPercentage >= 80) return "#27AE60"; // Verde
    if (conformPercentage >= 50) return "#F2C94C"; // Amarelo
    return "#EB5757"; // Vermelho
  };

  const statusColor = getStatusColor(conformPercentage);

  return (
    <div
      className="system-card"
      style={{
        marginBottom: 16,
        padding: "16px",
        border: `1px solid ${statusColor}33`, // 20% de opacidade
        background: `${statusColor}0D` // 5% de opacidade
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px"
        }}
      >
        <span
          style={{
            fontWeight: 600,
            fontSize: "14px",
            color: "#FFFFFF"
          }}
        >
          {type.label}
        </span>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#B3B3B3"
            }}
          >
            <span style={{ color: "#27AE60" }}>{conform}</span> /
            <span style={{ color: "#EB5757" }}> {nonConform}</span>
          </div>

          <div
            style={{
              backgroundColor: `${statusColor}33`,
              color: statusColor,
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: 600,
              minWidth: "48px",
              textAlign: "center"
            }}
          >
            {conformPercentage}%
          </div>
        </div>
      </div>

      {/* Barra de progresso */}
      <div
        style={{
          width: "100%",
          height: "6px",
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          borderRadius: "3px",
          overflow: "hidden",
          marginTop: "8px"
        }}
      >
        <div
          style={{
            width: `${conformPercentage}%`,
            height: "100%",
            backgroundColor: statusColor,
            borderRadius: "3px",
            transition: "width 0.5s ease-in-out"
          }}
        />
      </div>

      {/* Legenda */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "8px"
        }}
      >
        <span
          style={{
            fontSize: "10px",
            color: "#B3B3B3"
          }}
        >
          {conform} conforme
        </span>
        <span
          style={{
            fontSize: "10px",
            color: "#B3B3B3"
          }}
        >
          {nonConform} não conforme
        </span>
      </div>
    </div>
  );
};

export default ConformityItemChart;
