import React from "react";

interface AnalysisResultsCardProps {
  projectName?: string; // Nome do projeto ou biblioteca
  analysisDate?: string; // Data da análise ou total de tokens
  isAuditReport?: boolean; // Indica se é o relatório de auditoria
}

const AnalysisResultsCard: React.FC<AnalysisResultsCardProps> = ({
  projectName = "-",
  analysisDate = "-",
  isAuditReport = false // Por padrão, não é um relatório de auditoria
}) => {
  return (
    <div
      className="analysis-results-card project-card"
      style={{ width: "100%", margin: 0, boxSizing: "border-box" }}
    >
      <div className="analysis-results-content" style={{ padding: 0 }}>
        <div className="analysis-results-item">
          <span className="analysis-results-label">
            {isAuditReport ? "Projeto:" : "Biblioteca de tokens:"}
          </span>
          <span className="analysis-results-value">{projectName}</span>
        </div>
        <div className="analysis-results-item">
          <span className="analysis-results-label">
            {isAuditReport ? "Auditado em:" : "Total de tokens:"}
          </span>
          <span className="analysis-results-value">{analysisDate}</span>
        </div>
      </div>
    </div>
  );
};

export default AnalysisResultsCard;
