import React, { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import styled from "styled-components";

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
const AnnotationsContainer = styled.div`
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

const PresetButton = styled.button`
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

// Componente principal de anotações
const AnnotationsTool: React.FC = observer(() => {
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
          type: "init-annotations-tool",
          payload: {}
        }
      },
      "*"
    );

    // Configura os listeners
    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data.pluginMessage || {};

      switch (type) {
        case "note-created":
          console.log("Nota criada:", payload);
          break;
        case "note-error":
          console.error("Erro na nota:", payload.message);
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

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

  return (
    <AnnotationsContainer>
      <PanelSection>
        <PanelTitle>Inserir anotações</PanelTitle>
        <PresetGrid>
          <PresetButton onClick={() => createBalloon("left")}>
            left
          </PresetButton>
          <PresetButton onClick={() => createBalloon("top")}>top</PresetButton>
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
          Selecione um ou mais objetos e escolha a posição do balão de anotação.
        </InstructionText>
      </PanelSection>

      {/* Seção de Adicionar Notas */}
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
    </AnnotationsContainer>
  );
});

export default AnnotationsTool;
