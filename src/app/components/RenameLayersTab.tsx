import React, {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef
} from "react";
import styled from "styled-components";

interface RenameLayersTabProps {
  hideButton?: boolean;
  onStateChange?: (canRename: boolean, isLoading: boolean) => void;
  onRenameClick?: () => void;
}

export interface RenameLayersTabRef {
  triggerRename: () => void;
}

interface RenameLayersTabProps {
  hideButton?: boolean;
  onStateChange?: (canRename: boolean, isLoading: boolean) => void;
  onRenameClick?: () => void;
  selectedNode?: any; // <-- NOVA PROP
}
interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  fontSize?: number;
  layoutMode?: string;
  fills?: any[];
  locked?: boolean;
}

// Função principal de renomeação - envia mensagem ao plugin
const renameLayersWithHtmlSemantics = async (): Promise<void> => {
  try {
    console.log("[RenameLayers] Iniciando renomeação semântica...");

    // Enviar mensagem no formato correto para Figma controller
    parent.postMessage(
      {
        pluginMessage: {
          type: "rename-layers-with-html-semantics"
        }
      },
      "*"
    );
    console.log("[RenameLayers] Mensagem enviada com sucesso");
  } catch (error) {
    console.error("[RenameLayers] Erro na função principal:", error);
    parent.postMessage(
      {
        pluginMessage: {
          type: "notify",
          message: "❌ Erro ao renomear layers. Tente novamente."
        }
      },
      "*"
    );
  }
};

const RenameContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
`;

const MessageContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: 32px 16px;
  min-height: 0;
`;

const IconContainer = styled.div`
  width: 64px;
  height: 64px;
  background: rgba(255, 165, 0, 0.1);
  border: 2px dashed rgba(255, 165, 0, 0.3);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
`;

const TitleText = styled.h3`
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: #fff;
  text-align: center;
`;

const SubtitleText = styled.p`
  font-size: 14px;
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
  max-width: 280px;
  text-align: center;
`;

const Divider = styled.div`
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0;
  flex-shrink: 0;
`;

const ButtonContainer = styled.div`
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.1);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
  width: 100%;
  box-sizing: border-box;
  pointer-events: auto;
`;

const CreateButton = styled.button`
  background: #18a0fb;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-family: "Inter", sans-serif;
  font-size: 14px !important;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  box-sizing: border-box;
  pointer-events: auto;

  &:hover:not(:disabled) {
    background: #0f86d9;
    transform: translateY(-1px);
  }

  &:active:not(:disabled) {
    background: #0c74c2;
    transform: translateY(0);
  }

  &:disabled {
    background: #888;
    cursor: not-allowed;
    opacity: 0.7;
    pointer-events: none;
  }
`;

const RenameLayersTab = forwardRef<RenameLayersTabRef, RenameLayersTabProps>(
  (
    {
      hideButton = false,
      onStateChange,
      onRenameClick,
      selectedNode: propSelectedNode // <-- RECEBE DO PAI
    },
    ref
  ) => {
    console.log(
      "[RenameLayersTab] Componente renderizado! propSelectedNode:",
      propSelectedNode?.name || "null"
    );

    const [selectedNode, setSelectedNode] = useState<any>(
      propSelectedNode || null
    );
    const [isLoading, setIsLoading] = useState(false);

    // Sincronizar com prop quando mudar
    useEffect(() => {
      if (propSelectedNode !== undefined) {
        console.log(
          "[RenameLayersTab] Sincronizando selectedNode da prop:",
          propSelectedNode?.name || "null"
        );
        setSelectedNode(propSelectedNode);
      }
    }, [propSelectedNode]);

    // Expor handleRename para ser chamado de componentes pais
    useImperativeHandle(
      ref,
      () => ({
        triggerRename: () => {
          if (selectedNode) {
            handleRename();
          }
        }
      }),
      [selectedNode]
    );

    // Notificar quando o estado muda
    useEffect(() => {
      onStateChange?.(!!selectedNode, isLoading);
    }, [selectedNode, isLoading, onStateChange]);

    // Escutar mensagens do Figma sobre seleção de elementos e renomeação
    useEffect(() => {
      const handleMessage = (event: MessageEvent) => {
        if (!event.data || !event.data.pluginMessage) return;

        const { type, payload, selection } = event.data.pluginMessage;

        if (type === "selection-changed") {
          console.log("[RenameLayersTab] Seleção mudou:", selection);
          if (selection && selection.length > 0) {
            setSelectedNode(selection[0]);
          } else {
            console.log("[RenameLayersTab] Nenhum nó selecionado");
            setSelectedNode(null);
          }
        } else if (type === "no-selection") {
          setSelectedNode(null);
        } else if (type === "rename-complete") {
          // Processar resultado da renomeação - ESTE É O HANDLER CORRETO
          console.log("[RenameLayersTab] Renomeação concluída:", payload);
          setIsLoading(false);

          if (payload.success) {
            parent.postMessage(
              {
                pluginMessage: {
                  type: "notify",
                  message: `✅ ${payload.renamedCount} layers renomeadas com sucesso!`
                }
              },
              "*"
            );
          } else {
            parent.postMessage(
              {
                pluginMessage: {
                  type: "notify",
                  message: `❌ Erro ao renomear layers: ${payload.error ||
                    "erro desconhecido"}`
                }
              },
              "*"
            );
          }
        }
      };

      window.addEventListener("message", handleMessage);

      return () => {
        window.removeEventListener("message", handleMessage);
      };
    }, []);

    const handleRename = (event?: React.MouseEvent<HTMLButtonElement>) => {
      console.log("✅ [PURO] HandleRename chamado!");
      if (event) {
        console.log("✅ [PURO] Event type:", event.type);
        event.preventDefault();
        event.stopPropagation();
      }
      console.log("✅ [PURO] selectedNode:", selectedNode?.name);

      if (!selectedNode) {
        console.error("❌ [PURO] Nenhum nó selecionado");
        parent.postMessage(
          {
            pluginMessage: {
              type: "notify",
              message: "⚠️ Por favor, selecione um elemento para renomear"
            }
          },
          "*"
        );
        return;
      }

      console.log("✅ [PURO] Iniciando renomeação para:", selectedNode.name);
      setIsLoading(true);
      renameLayersWithHtmlSemantics();

      // Notify parent if callback provided
      onRenameClick?.();
    };

    return (
      <RenameContainer>
        {!selectedNode ? (
          <MessageContainer>
            <SubtitleText>
              Selecione um objeto ou grupo no canvas para renomear
              automaticamente com base em tags HTML semânticas.
            </SubtitleText>
          </MessageContainer>
        ) : (
          <>
            <MessageContainer>
              <TitleText>Elemento Selecionado</TitleText>
              <SubtitleText style={{ marginTop: "8px", color: "#fff" }}>
                {selectedNode.name || "Elemento sem nome"}
              </SubtitleText>
              <SubtitleText style={{ marginTop: "12px", fontSize: "12px" }}>
                Clique em "Renomear Layers" para aplicar nomenclatura semântica
                HTML a este elemento e seus filhos.
              </SubtitleText>
            </MessageContainer>

            {!hideButton && (
              <>
                <Divider />

                <div
                  style={{
                    padding: "12px 16px",
                    background: "rgba(0, 0, 0, 0.1)",
                    borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                    flexShrink: 0,
                    width: "100%",
                    boxSizing: "border-box",
                    pointerEvents: "auto"
                  }}
                >
                  <input
                    type="button"
                    onClick={handleRename}
                    disabled={isLoading}
                    value={
                      isLoading ? "⏳ Processando..." : "🏷️ Renomear Layers"
                    }
                    style={{
                      background: isLoading ? "#888" : "#18a0fb",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      padding: "12px 24px",
                      fontFamily: '"Inter", sans-serif',
                      fontSize: "14px",
                      fontWeight: 500,
                      cursor: isLoading ? "not-allowed" : "pointer",
                      height: "40px",
                      display: "block",
                      width: "100%",
                      boxSizing: "border-box",
                      opacity: isLoading ? 0.7 : 1,
                      pointerEvents: "auto"
                    }}
                  />
                </div>
              </>
            )}
          </>
        )}
      </RenameContainer>
    );
  }
);

RenameLayersTab.displayName = "RenameLayersTab";

export default RenameLayersTab;
