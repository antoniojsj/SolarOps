import React from "react";

interface AnalysisResultsCardProps {
  projectName?: string;
  analysisDate: string;
}

const AnalysisResultsCard: React.FC<AnalysisResultsCardProps> = ({
  projectName = "Documento sem título",
  analysisDate
}) => {
  return (
    <div className="analysis-results-card project-card">
      <div className="analysis-results-content">
        <div className="analysis-results-item">
          <span className="analysis-results-label">Projeto:</span>
          <span className="analysis-results-value">{projectName}</span>
        </div>
        <div className="analysis-results-item">
          <span className="analysis-results-label">Análise em:</span>
          <span className="analysis-results-value">{analysisDate}</span>
        </div>
      </div>
    </div>
  );
};

export default AnalysisResultsCard;
