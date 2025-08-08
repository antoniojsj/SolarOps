import * as React from "react";

interface ConformityScoreBarProps {
  total: number;
  errors: number;
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
  total,
  errors
}) => {
  const correct = Math.max(total - errors, 0);
  const score = total > 0 ? Math.round((correct / total) * 100) : 0;
  const { bg, color } = getScoreColor(score);
  const status = getScoreStatus(score);

  return (
    <div className="system-card conformity-score-card">
      <div className="conformity-score-content">
        <div className="conformity-score-info">
          <div className="conformity-score-title" style={{ fontSize: 14 }}>
            Score de Conformidade
          </div>
          <div className="conformity-score-desc" style={{ fontSize: 12 }}>
            {correct} de {total} elementos
          </div>
        </div>
        <div
          className="conformity-score-badge"
          style={{ background: bg, color }}
        >
          {score}%
        </div>
      </div>
      <div className="conformity-score-progress-bg">
        <div
          className="conformity-score-progress-fill"
          style={{ width: `${score}%` }}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 8
        }}
      >
        <span className="analysis-results-label">Status</span>
        <span style={{ fontSize: 12, fontWeight: 600, color }}>{status}</span>
      </div>
    </div>
  );
};

export default ConformityScoreBar;
