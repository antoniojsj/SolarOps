import React from "react";

interface AnalysisResultsCardProps {
  projectName?: string; // Aqui será o nome da biblioteca
  analysisDate?: string; // Aqui será o total de tokens
}

const AnalysisResultsCard: React.FC<AnalysisResultsCardProps> = ({
  projectName = "-",
  analysisDate = "-"
}) => {
  return (
    <div
      className="analysis-results-card project-card"
      style={{ width: "100%", margin: 0, boxSizing: "border-box" }}
    >
      <div className="analysis-results-content" style={{ padding: 0 }}>
        <div className="analysis-results-item">
          <span className="analysis-results-label">Biblioteca de tokens:</span>
          <span className="analysis-results-value">{projectName}</span>
        </div>
        <div className="analysis-results-item">
          <span className="analysis-results-label">Total de tokens:</span>
          <span className="analysis-results-value">{analysisDate}</span>
        </div>
      </div>
    </div>
  );
};

export default AnalysisResultsCard;
