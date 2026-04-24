import React, { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import styled from "styled-components";
import LineChooser, { StrokeCap } from "./LineChooser";

// Tipos para o estado do plugin
interface PluginState {
  isMeasuring: boolean;
  showGuides: boolean;
  selectionCount: number;
}

// Cores padrão
const COLORS = {
  primary: "#3b82f6",
  background: "rgba(30, 30, 30, 0.9)",
  text: "#e0e0e0",
  textMuted: "#a0a0a0",
  border: "#444",
  highlight: "rgba(59, 130, 246, 0.2)"
};

// Styled components
const MeasurementContainer = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: transparent;
  color: ${COLORS.text};
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  font-size: 12px;
  line-height: 1.5;
  padding: 0;
  box-sizing: border-box;
`;

const PresetGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
`;

const PresetButton = styled.button<{ $active?: boolean }>`
  background: ${props =>
    props.$active ? "rgba(59, 130, 246, 0.2)" : "rgba(255, 255, 255, 0.06)"};
  color: ${COLORS.text};
  border: 1px ${props => (props.$active ? "solid" : "dashed")}
    ${props => (props.$active ? COLORS.primary : COLORS.border)};
  border-radius: 6px;
  padding: 10px 8px;
  font-size: 12px;
  cursor: pointer;
  text-align: center;
  transition: all 0.15s ease;

  &:hover {
    background: ${({ $active }) =>
      $active ? "rgba(59, 130, 246, 0.3)" : "rgba(255, 255, 255, 0.12)"};
  }
`;

const ViewerContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
`;

const Toolbar = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const ToolButton = styled.button<{ $active?: boolean }>`
  background: ${props =>
    props.$active ? COLORS.primary : "rgba(30, 30, 30, 0.8)"};
  color: ${props => (props.$active ? "#fff" : COLORS.text)};
  border: 1px solid ${props => (props.$active ? COLORS.primary : COLORS.border)};
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;

  &:hover {
    background: ${props =>
      props.$active ? COLORS.primary : "rgba(255, 255, 255, 0.1)"};
  }

  &:active {
    transform: translateY(1px);
  }
`;

const PanelSection = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 16px;
`;

const PanelTitle = styled.h3`
  font-size: 14px;
  margin: 0 0 12px 0;
  font-weight: 500;
  color: ${COLORS.text};
`;

const InstructionText = styled.p`
  margin: 0 0 8px 0;
  font-size: 12px;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.7);
`;

const ShortcutKey = styled.span`
  display: inline-block;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  padding: 2px 6px;
  font-family: monospace;
  font-size: 11px;
  margin: 0 2px;
`;

// Componente principal de medição
const MeasurementTool: React.FC = observer(() => {
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [showGuides, setShowGuides] = useState(true);
  const [selectionCount, setSelectionCount] = useState(0);
  const [strokeCap, setStrokeCap] = useState<StrokeCap>("NONE");
  const [strokeOffset, setStrokeOffset] = useState(0);

  // Inicializa o plugin
  useEffect(() => {
    // Envia mensagem para o Figma informando que o plugin está pronto
    parent.postMessage(
      {
        pluginMessage: {
          type: "init-measurement-tool",
          payload: {
            isMeasuring: false,
            showGuides: true
          }
        }
      },
      "*"
    );

    // Atualiza a contagem de seleção inicial
    updateSelectionCount();

    // Configura os listeners
    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data.pluginMessage || {};

      switch (type) {
        case "selection-updated":
          setSelectionCount(payload.count);
          break;
        case "measurement-created":
          console.log("Medição criada:", payload);
          break;
        case "measurement-error":
          console.error("Erro na medição:", payload.message);
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Atualiza a contagem de seleção
  const updateSelectionCount = () => {
    parent.postMessage(
      {
        pluginMessage: {
          type: "get-selection-count"
        }
      },
      "*"
    );
  };

  // Inicia o modo de medição
  const startMeasurement = () => {
    const newState = !isMeasuring;
    setIsMeasuring(newState);

    parent.postMessage(
      {
        pluginMessage: {
          type: "set-measurement-mode",
          payload: {
            isMeasuring: newState,
            mode: "distance"
          }
        }
      },
      "*"
    );
  };

  // Alterna as guias de medição
  const toggleGuides = () => {
    const newState = !showGuides;
    setShowGuides(newState);

    parent.postMessage(
      {
        pluginMessage: {
          type: "toggle-guides",
          payload: { showGuides: newState }
        }
      },
      "*"
    );
  };

  // Limpa todas as medições
  const clearMeasurements = () => {
    parent.postMessage(
      {
        pluginMessage: {
          type: "clear-measurements"
        }
      },
      "*"
    );
  };

  // Distância: presets no canvas
  const createPreset = (
    position: "top" | "bottom" | "left" | "right" | "h-center" | "v-center"
  ) => {
    parent.postMessage(
      {
        pluginMessage: {
          type: "create-preset-measurement",
          payload: { position, strokeCap, offset: strokeOffset }
        }
      },
      "*"
    );
  };

  return (
    <MeasurementContainer>
      <PanelSection>
        <PanelTitle>Inserir medidas</PanelTitle>
        <PresetGrid>
          <PresetButton onClick={() => createPreset("top")}>Top</PresetButton>
          <PresetButton onClick={() => createPreset("h-center")}>
            Center Horizontal
          </PresetButton>
          <PresetButton onClick={() => createPreset("bottom")}>
            Bottom
          </PresetButton>
          <PresetButton onClick={() => createPreset("left")}>Left</PresetButton>
          <PresetButton onClick={() => createPreset("v-center")}>
            Center Vertical
          </PresetButton>
          <PresetButton onClick={() => createPreset("right")}>
            Right
          </PresetButton>
        </PresetGrid>
        <InstructionText style={{ marginTop: 8 }}>
          Selecione um ou mais objetos e clique em uma posição para inserir a
          medida de distância.
        </InstructionText>
      </PanelSection>

      <PanelSection>
        <PanelTitle>Estilo da Linha</PanelTitle>
        <LineChooser
          strokeCap={strokeCap}
          strokeOffset={strokeOffset}
          onStrokeCapChange={setStrokeCap}
          onStrokeOffsetChange={setStrokeOffset}
        />
      </PanelSection>

      <PanelSection>
        <PanelTitle>Controles</PanelTitle>
        <Toolbar>
          <ToolButton onClick={clearMeasurements}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Limpar
          </ToolButton>
        </Toolbar>
      </PanelSection>
    </MeasurementContainer>
  );
});

export default MeasurementTool;
