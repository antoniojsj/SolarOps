import React from "react";
import { motion } from "framer-motion/dist/framer-motion";
import PanelHeader from "./PanelHeader";
import BulkErrorListItem from "./BulkErrorListItem";
import "../styles/panel.css";

interface FrameErrorsPanelProps {
  frameName: string;
  onBack: () => void;
  frameErrors: any[];
  isVisible: boolean;
  handleIgnoreChange: (error: any) => void;
  handleSelectAll: (error: any) => void;
  handleCreateStyle: (error: any) => void;
  handleSelect: (error: any) => void;
  handleIgnoreAll: (error: any) => void;
  handleFixAll: (error: any) => void;
  handleSuggestion: (error: any, index: number) => void;
  handleBorderRadiusUpdate: (value: any) => void;
  handlePanelVisible: (boolean: boolean, error?: any, index?: number) => void;
  handleUpdatePanelError: (error: any) => void;
  handleUpdatePanelSuggestion: (index: number) => void;
}

const FrameErrorsPanel: React.FC<FrameErrorsPanelProps> = ({
  frameName,
  onBack,
  frameErrors,
  isVisible,
  ...handlers
}) => {
  const variants = {
    open: { opacity: 1, x: 0 },
    closed: { opacity: 0, x: "100%" }
  };

  return (
    <motion.div
      className="panel info-panel-root"
      initial={{ opacity: 0, x: "100%" }}
      animate={isVisible ? "open" : "closed"}
      transition={{ duration: 0.3, type: "tween" }}
      variants={variants}
      key="frame-errors-panel"
    >
      <PanelHeader title={frameName} handleHide={onBack} />
      <div className="info-panel-content">
        {frameErrors.length === 0 ? (
          <div
            style={{
              color: "rgba(255, 255, 255, 0.7)",
              textAlign: "center",
              padding: "24px 0",
              fontSize: "14px"
            }}
          >
            Nenhum erro encontrado neste frame.
          </div>
        ) : (
          <ul className="errors-list" style={{ padding: 0 }}>
            {frameErrors.map((error, index) => (
              <BulkErrorListItem
                error={error}
                index={index}
                key={`${error.nodeId}-${error.type}-${index}`}
                {...handlers}
              />
            ))}
          </ul>
        )}
      </div>
    </motion.div>
  );
};

export default FrameErrorsPanel;
