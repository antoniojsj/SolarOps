import React, { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import styled from "styled-components";
import LineChooser, { StrokeCap } from "./LineChooser";

// Tipos para o estado do plugin
type MeasurementMode = "distance" | "notes";

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
  const [measurementMode, setMeasurementMode] = useState<MeasurementMode>(
    "notes"
  );
  const [strokeCap, setStrokeCap] = useState<StrokeCap>("NONE");
  const [strokeOffset, setStrokeOffset] = useState(0);
  const [noteText, setNoteText] = useState("");
  const [noteType, setNoteType] = useState("comportamento");

  // Cores para cada tipo de nota
  const noteTypeColors = {
    comportamento: "#3b82f6", // Azul
    acessibilidade: "#10b981", // Verde
    interacao: "#f59e0b", // Amarelo
    navegacao: "#8b5cf6", // Roxo
    responsividade: "#ec4899" // Rosa
  };

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
    parent.postMessage(
      {
        pluginMessage: {
          type: "set-measurement-mode",
          payload: { mode }
        }
      },
      "*"
    );
  };

  // Criar balão de propriedades na posição desejada
  const createBalloon = (position: "left" | "top" | "right" | "bottom") => {
    parent.postMessage(
      {
        pluginMessage: {
          type: "create-balloon",
          payload: { position }
        }
      },
      "*"
    );
  };

  // Adicionar uma nova nota
  const addNote = () => {
    if (!noteText.trim()) return;

    parent.postMessage(
      {
        pluginMessage: {
          type: "add-note",
          payload: {
            text: noteText,
            type: noteType,
            color: noteTypeColors[noteType as keyof typeof noteTypeColors]
          }
        }
      },
      "*"
    );

    // Limpar o campo de texto após adicionar a nota
    setNoteText("");
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
        <PanelTitle>Recursos</PanelTitle>
        <Toolbar>
          <ToolButton
            $active={measurementMode === "notes"}
            onClick={() => setMode("notes")}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H7l-4 3V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8" />
            </svg>
            Anotações
          </ToolButton>
          <ToolButton
            $active={measurementMode === "distance"}
            onClick={() => setMode("distance")}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 -960 960 960"
              fill="currentColor"
              style={{
                verticalAlign: "middle"
              }}
            >
              <path d="m352-522 86-87-56-57-44 44-56-56 43-44-45-45-87 87 159 158Zm328 329 87-87-45-45-44 43-56-56 43-44-57-56-86 86 158 159Zm24-567 57 57-57-57ZM290-120H120v-170l175-175L80-680l200-200 216 216 151-152q12-12 27-18t31-6q16 0 31 6t27 18l53 54q12 12 18 27t6 31q0 16-6 30.5T816-647L665-495l215 215L680-80 465-295 290-120Zm-90-80h56l392-391-57-57-391 392v56Zm420-419-29-29 57 57-28-28Z" />
            </svg>
            Medidas
          </ToolButton>
        </Toolbar>
      </PanelSection>

      <PanelSection>
        <PanelTitle>
          {measurementMode === "distance"
            ? "Inserir medidas"
            : "Inserir anotações"}
        </PanelTitle>
        {measurementMode === "distance" && (
          <>
            <PresetGrid>
              <PresetButton onClick={() => createPreset("top")}>
                Top
              </PresetButton>
              <PresetButton onClick={() => createPreset("h-center")}>
                Center Horizontal
              </PresetButton>
              <PresetButton onClick={() => createPreset("bottom")}>
                Bottom
              </PresetButton>
              <PresetButton onClick={() => createPreset("left")}>
                Left
              </PresetButton>
              <PresetButton onClick={() => createPreset("v-center")}>
                Center Vertical
              </PresetButton>
              <PresetButton onClick={() => createPreset("right")}>
                Right
              </PresetButton>
            </PresetGrid>
            <InstructionText style={{ marginTop: 8 }}>
              Selecione um ou mais objetos e clique em uma posição para inserir
              a medida de distância.
            </InstructionText>
          </>
        )}
        {measurementMode === "notes" && (
          <>
            <PresetGrid>
              <PresetButton onClick={() => createBalloon("left")}>
                left
              </PresetButton>
              <PresetButton onClick={() => createBalloon("top")}>
                top
              </PresetButton>
              <PresetButton onClick={() => createBalloon("right")}>
                right
              </PresetButton>
              <div />
              <PresetButton onClick={() => createBalloon("bottom")}>
                bottom
              </PresetButton>
              <div />
            </PresetGrid>
            <InstructionText style={{ marginTop: 8 }}>
              Selecione um ou mais objetos e escolha a posição do balão de
              anotação.
            </InstructionText>
          </>
        )}
      </PanelSection>

      {/* Seção de Adicionar Notas - Apenas no modo de anotações */}
      {measurementMode === "notes" && (
        <PanelSection>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px"
            }}
          >
            <PanelTitle style={{ margin: 0 }}>Adicionar notas</PanelTitle>
            <select
              value={noteType}
              onChange={e => setNoteType(e.target.value)}
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                border: `1px solid ${COLORS.border}`,
                color: COLORS.text,
                borderRadius: "4px",
                padding: "4px 8px",
                fontSize: "12px",
                height: "28px",
                minWidth: "120px",
                outline: "none",
                cursor: "pointer"
              }}
            >
              <option value="comportamento">Comportamento</option>
              <option value="acessibilidade">Acessibilidade</option>
              <option value="interacao">Interação</option>
              <option value="navegacao">Navegação</option>
              <option value="responsividade">Responsividade</option>
            </select>
          </div>
          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              borderRadius: "6px",
              padding: "12px",
              minHeight: "160px",
              border: `1px solid ${COLORS.border}`,
              marginTop: "8px"
            }}
          >
            <textarea
              id="notes-textarea"
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Digite suas notas aqui..."
              style={{
                width: "100%",
                minHeight: "120px",
                backgroundColor: "transparent",
                border: "none",
                color: COLORS.text,
                fontSize: "12px",
                lineHeight: "1.5",
                resize: "none",
                outline: "none",
                fontFamily: "Inter, sans-serif",
                padding: "8px 0"
              }}
              onKeyDown={e => {
                // Adiciona atalhos de teclado
                if (e.ctrlKey || e.metaKey) {
                  const textarea = e.target as HTMLTextAreaElement;
                  const start = textarea.selectionStart || 0;
                  const end = textarea.selectionEnd || 0;
                  const text = textarea.value;
                  const selectedText = text.substring(start, end);
                  const beforeText = text.substring(0, start);
                  const afterText = text.substring(end);

                  if (e.key === "b") {
                    e.preventDefault();
                    const newText = `${beforeText}**${selectedText}**${afterText}`;
                    setNoteText(newText);
                    // Atualiza a seleção após a atualização do estado
                    setTimeout(() => {
                      textarea.setSelectionRange(start + 2, end + 2);
                    }, 0);
                  } else if (e.key === "i") {
                    e.preventDefault();
                    const newText = `${beforeText}*${selectedText}*${afterText}`;
                    setNoteText(newText);
                    // Atualiza a seleção após a atualização do estado
                    setTimeout(() => {
                      textarea.setSelectionRange(start + 1, end + 1);
                    }, 0);
                  }
                } else if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  addNote();
                }
              }}
            />
            <button
              onClick={addNote}
              disabled={!noteText.trim()}
              style={
                {
                  backgroundColor: noteText.trim() ? COLORS.primary : "#4b5563",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  padding: "8px 16px",
                  fontSize: "12px",
                  cursor: noteText.trim() ? "pointer" : "not-allowed",
                  width: "100%",
                  marginTop: "8px",
                  transition: "background-color 0.2s",
                  opacity: noteText.trim() ? 1 : 0.7,
                  ":hover": noteText.trim()
                    ? {
                        backgroundColor: "#2563eb"
                      }
                    : {}
                } as React.CSSProperties
              }
            >
              Inserir nota
            </button>
          </div>
        </PanelSection>
      )}

      {measurementMode === "distance" && (
        <PanelSection>
          <PanelTitle>Estilo da Linha</PanelTitle>
          <LineChooser
            strokeCap={strokeCap}
            strokeOffset={strokeOffset}
            onStrokeCapChange={setStrokeCap}
            onStrokeOffsetChange={setStrokeOffset}
          />
        </PanelSection>
      )}

      {measurementMode === "distance" && (
        <PanelSection>
          <PanelTitle>Controles</PanelTitle>
          <Toolbar>
            <ToolButton onClick={toggleGuides} $active={showGuides}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 3v18h18" />
                <path d="M3 12h18" />
                <path d="M3 6h18" />
                <path d="M3 18h18" />
              </svg>
              Mostrar guias
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
                <path d="M3 6h18" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Limpar
            </ToolButton>
          </Toolbar>
        </PanelSection>
      )}

      {null}
    </MeasurementContainer>
  );
});

export default MeasurementTool;
