import * as React from "react";

interface ConformityScoreBarProps {
  totalElements: number;
  nonConformElements: number;
}

function getScoreColor(score: number) {
  if (score <= 30) return { bg: "rgba(255, 71, 87, 0.24)", color: "#FF4757" }; // vermelho
  if (score <= 50) return { bg: "rgba(255, 159, 67, 0.24)", color: "#FF9F43" }; // laranja
  if (score <= 70) return { bg: "rgba(24, 160, 251, 0.24)", color: "#18A0FB" }; // azul
  if (score < 100) return { bg: "rgba(39, 174, 96, 0.24)", color: "#27AE60" }; // verde bom
  return { bg: "rgba(39, 174, 96, 0.24)", color: "#27AE60" }; // verde mestre
}

function getScoreStatus(score: number) {
  if (score <= 30) return "Ruim";
  if (score <= 50) return "Regular";
  if (score <= 70) return "Bom";
  if (score < 100) return "Muito bom";
  return "Excelente";
}

const ConformityScoreBar: React.FC<ConformityScoreBarProps> = ({
  totalElements,
  nonConformElements
}) => {
  // Denominador é o total de elementos escaneados (alinha com os cards)
  const effectiveTotal = Math.max(totalElements, 1);
  // Elementos conformes: total - nós não conformes (nunca negativo)
  const conformElements = Math.max(totalElements - nonConformElements, 0);
  // Porcentagem de conformidade baseada no total de elementos
  const score = Math.round((conformElements / effectiveTotal) * 100);
  const { bg, color } = getScoreColor(score);
  const status = getScoreStatus(score);

  console.log("[ConformityScoreBar] Dados recebidos:", {
    totalElements,
    nonConformElements
  });
  console.log("[ConformityScoreBar] Cálculo:", {
    effectiveTotal,
    conformElements,
    score
  });

  return (
    <div className="system-card conformity-score-card">
      <div className="conformity-score-content">
        <div className="conformity-score-info">
          <div className="conformity-score-title" style={{ fontSize: 14 }}>
            Score de Conformidade
          </div>
          <div className="conformity-score-desc" style={{ fontSize: 12 }}>
            {conformElements} de {effectiveTotal} elementos
          </div>
        </div>
        <div
          className="conformity-score-badge"
          style={{ background: bg, color }}
        >
          {score}%
        </div>
      </div>
      <div
        className="conformity-score-row"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginTop: 8
        }}
      >
        <div
          className="conformity-score-progress-bg"
          style={{
            flex: 1,
            background: bg,
            height: 8,
            borderRadius: 999,
            overflow: "hidden"
          }}
        >
          <div
            className="conformity-score-progress-fill"
            style={{ width: `${score}%`, background: color, height: "100%" }}
          />
        </div>
        <div
          className="conformity-score-status"
          style={{
            color,
            marginLeft: 4,
            textAlign: "right",
            whiteSpace: "nowrap"
          }}
        >
          {status}
        </div>
      </div>
    </div>
  );
};

export default ConformityScoreBar;
