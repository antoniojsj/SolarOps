import React, { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import styled from "styled-components";

// Tipos para o estado do plugin
type MeasurementMode = "distance" | "area" | "angle";

interface PluginState {
  isMeasuring: boolean;
  showGuides: boolean;
  mode: MeasurementMode;
  selectionCount: number;
}

// Cores padrão
const COLORS = {
  primary: "#3b82f6",
  background: "rgba(30, 30, 30, 0.9)",
  text: "#e0e0e0",
  border: "#444",
  highlight: "rgba(59, 130, 246, 0.2)"
};

// Styled components
const MeasurementContainer = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: ${COLORS.background};
  color: ${COLORS.text};
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  font-size: 12px;
  line-height: 1.5;
  padding: 16px;
  box-sizing: border-box;
`;

const PresetGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
`;

const PresetButton = styled.button<{ active?: boolean }>`
  background: rgba(255, 255, 255, 0.06);
  color: ${COLORS.text};
  border: 1px dashed ${COLORS.border};
  border-radius: 6px;
  padding: 10px 8px;
  font-size: 12px;
  cursor: pointer;
  text-align: center;
  transition: all 0.15s ease;
  &:hover {
    background: rgba(255, 255, 255, 0.12);
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

const ToolButton = styled.button<{ active?: boolean }>`
  background: ${props =>
    props.active ? COLORS.primary : "rgba(30, 30, 30, 0.8)"};
  color: ${props => (props.active ? "#fff" : COLORS.text)};
  border: 1px solid ${props => (props.active ? COLORS.primary : COLORS.border)};
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
      props.active ? COLORS.primary : "rgba(255, 255, 255, 0.1)"};
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
  font-size: 13px;
  margin: 0 0 12px 0;
  color: ${COLORS.text};
  font-weight: 500;
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
  const [measurementMode, setMeasurementMode] = useState<MeasurementMode>(
    "distance"
  );

  // Inicializa o plugin
  useEffect(() => {
    // Envia mensagem para o Figma informando que o plugin está pronto
    parent.postMessage(
      {
        pluginMessage: {
          type: "init-measurement-tool",
          payload: {
            isMeasuring: false,
            showGuides: true,
            mode: "distance"
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
            mode: measurementMode
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

  // Altera o modo de medição
  const setMode = (mode: MeasurementMode) => {
    setMeasurementMode(mode);

    if (isMeasuring) {
      parent.postMessage(
        {
          pluginMessage: {
            type: "set-measurement-mode",
            payload: { mode }
          }
        },
        "*"
      );
    }
  };

  // Medidas rápidas em posições pré-definidas (como no mock)
  const createPreset = (
    position: "top" | "bottom" | "left" | "right" | "h-center" | "v-center"
  ) => {
    parent.postMessage(
      {
        pluginMessage: {
          type: "create-preset-measurement",
          payload: { position }
        }
      },
      "*"
    );
  };

  const createAnglePreset = (
    corner: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "all"
  ) => {
    parent.postMessage(
      {
        pluginMessage: {
          type: "create-angle-preset",
          payload: { corner }
        }
      },
      "*"
    );
  };

  return (
    <MeasurementContainer>
      <PanelSection>
        <PanelTitle>Modo de Medição</PanelTitle>
        <Toolbar>
          <ToolButton
            active={measurementMode === "distance"}
            onClick={() => setMode("distance")}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Distância
          </ToolButton>
          <ToolButton
            active={measurementMode === "area"}
            onClick={() => setMode("area")}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            </svg>
            Área
          </ToolButton>
          <ToolButton
            active={measurementMode === "angle"}
            onClick={() => setMode("angle")}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M16.2 7.8l2.1-2.1M7.8 16.2l-2.1 2.1M16.2 16.2l2.1 2.1M7.8 7.8L5.7 5.7" />
            </svg>
            Ângulo
          </ToolButton>
        </Toolbar>
      </PanelSection>

      <PanelSection>
        <PanelTitle>Medidas Rápidas</PanelTitle>
        {measurementMode === "distance" && (
          <>
            <PresetGrid>
              <PresetButton onClick={() => createPreset("top")}>
                Topo
              </PresetButton>
              <PresetButton onClick={() => createPreset("h-center")}>
                Centro Horizontal
              </PresetButton>
              <PresetButton onClick={() => createPreset("bottom")}>
                Base
              </PresetButton>
              <PresetButton onClick={() => createPreset("left")}>
                Esquerda
              </PresetButton>
              <PresetButton onClick={() => createPreset("v-center")}>
                Centro Vertical
              </PresetButton>
              <PresetButton onClick={() => createPreset("right")}>
                Direita
              </PresetButton>
            </PresetGrid>
            <InstructionText style={{ marginTop: 8 }}>
              Selecione um ou mais objetos e clique em uma posição para inserir
              a medida de distância.
            </InstructionText>
          </>
        )}
        {measurementMode === "angle" && (
          <>
            <PresetGrid>
              <PresetButton onClick={() => createAnglePreset("top-left")}>
                Top Left
              </PresetButton>
              <div />
              <PresetButton onClick={() => createAnglePreset("top-right")}>
                Top Right
              </PresetButton>
              <div />
              <PresetButton onClick={() => createAnglePreset("all")}>
                Total
              </PresetButton>
              <div />
              <PresetButton onClick={() => createAnglePreset("bottom-left")}>
                Bottom Left
              </PresetButton>
              <div />
              <PresetButton onClick={() => createAnglePreset("bottom-right")}>
                Bottom Right
              </PresetButton>
            </PresetGrid>
            <InstructionText style={{ marginTop: 8 }}>
              Selecione um ou mais objetos e escolha um canto para inserir o
              ângulo, ou "Total" (centro) para inserir em todos os cantos.
            </InstructionText>
          </>
        )}
        {measurementMode === "area" && (
          <>
            <InstructionText>
              Com o modo Área, ao selecionar objetos a label é inserida
              automaticamente no centro.
            </InstructionText>
          </>
        )}
      </PanelSection>

      <PanelSection>
        <PanelTitle>Controles</PanelTitle>
        <Toolbar>
          <ToolButton onClick={toggleGuides} active={showGuides}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 3h18v18H3z" />
              <path d="M3 9h18M9 3v18M3 15h18M15 3v18" />
            </svg>
            {showGuides ? "Ocultar Guias" : "Mostrar Guias"}
          </ToolButton>

          <ToolButton onClick={clearMeasurements}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Limpar
          </ToolButton>
        </Toolbar>
      </PanelSection>

      <PanelSection>
        <PanelTitle>Instruções</PanelTitle>
        <InstructionText>
          <strong>Selecionado:</strong> {selectionCount}{" "}
          {selectionCount === 1 ? "item" : "itens"}
        </InstructionText>
        <InstructionText>
          Use os botões de posições para inserir medidas rápidas junto ao objeto
          selecionado.
        </InstructionText>
        <InstructionText>
          Utilize "{showGuides ? "Ocultar Guias" : "Mostrar Guias"}" para
          esconder/mostrar todas as medidas no canvas. "Limpar" remove todas as
          medidas criadas.
        </InstructionText>
      </PanelSection>
    </MeasurementContainer>
  );
});

export default MeasurementTool;
