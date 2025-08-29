import React, { useState, useEffect } from "react";
import { motion } from "framer-motion/dist/framer-motion";

function DevMode() {
  const [selectedElement, setSelectedElement] = useState<any>(null);
  const [isInspecting, setIsInspecting] = useState(false);

  // Handle messages from the plugin
  useEffect(() => {
    const messageListener = (event: MessageEvent) => {
      const pm = event?.data?.pluginMessage ?? event?.data;
      if (pm && pm.type === "selected-node" && isInspecting) {
        setSelectedElement(pm.node);
      } else if (pm && pm.type === "no-selection" && isInspecting) {
        setSelectedElement(null);
      }
    };

    window.addEventListener("message", messageListener);
    return () => window.removeEventListener("message", messageListener);
  }, [isInspecting]);

  const toggleInspect = () => {
    const newInspectState = !isInspecting;
    setIsInspecting(newInspectState);

    // Notify the plugin to start/stop inspection
    parent.postMessage(
      {
        pluginMessage: {
          type: "toggle-inspect-mode",
          isInspecting: newInspectState
        }
      },
      "*"
    );

    if (!newInspectState) {
      setSelectedElement(null);
    }
  };

  // Function to render color swatch
  const renderColorSwatch = (color: any) => {
    if (!color) return null;

    let colorValue = null;

    if (typeof color === "string") {
      colorValue = color;
    } else if (color.r !== undefined) {
      colorValue = `rgb(${Math.round(color.r * 255)}, ${Math.round(
        color.g * 255
      )}, ${Math.round(color.b * 255)})`;
    } else if (color.value && color.value.r !== undefined) {
      colorValue = `rgb(${Math.round(color.value.r * 255)}, ${Math.round(
        color.value.g * 255
      )}, ${Math.round(color.value.b * 255)})`;
    }

    if (!colorValue) return null;

    return (
      <div className="color-swatch" style={{ backgroundColor: colorValue }}>
        <span className="color-value">{colorValue}</span>
      </div>
    );
  };

  // Function to render spacing value
  const renderSpacing = (value: any) => {
    if (typeof value === "object" && value.top !== undefined) {
      // Padding object
      return (
        <div className="spacing-value">
          <div className="spacing-item">
            <span className="spacing-label">Top:</span>
            <span className="spacing-number">{value.top}px</span>
            <div
              className="spacing-visual"
              style={{ width: `${Math.min(value.top, 50)}px`, height: "6px" }}
            ></div>
          </div>
          <div className="spacing-item">
            <span className="spacing-label">Right:</span>
            <span className="spacing-number">{value.right}px</span>
            <div
              className="spacing-visual"
              style={{ width: `${Math.min(value.right, 50)}px`, height: "6px" }}
            ></div>
          </div>
          <div className="spacing-item">
            <span className="spacing-label">Bottom:</span>
            <span className="spacing-number">{value.bottom}px</span>
            <div
              className="spacing-visual"
              style={{
                width: `${Math.min(value.bottom, 50)}px`,
                height: "6px"
              }}
            ></div>
          </div>
          <div className="spacing-item">
            <span className="spacing-label">Left:</span>
            <span className="spacing-number">{value.left}px</span>
            <div
              className="spacing-visual"
              style={{ width: `${Math.min(value.left, 50)}px`, height: "6px" }}
            ></div>
          </div>
        </div>
      );
    } else {
      // Single value
      return (
        <div className="spacing-value">
          <span className="spacing-number">{value}px</span>
          <div
            className="spacing-visual"
            style={{ width: `${Math.min(value, 100)}px`, height: "8px" }}
          ></div>
        </div>
      );
    }
  };

  // Function to format the element information for display
  const renderElementInfo = () => {
    if (!selectedElement) return null;

    return (
      <div className="element-info">
        {/* Header com nome do elemento */}
        <div className="element-header">
          <h2>{selectedElement.name || selectedElement.type}</h2>
          <span className="element-type">{selectedElement.type}</span>
        </div>

        {/* Informações básicas */}
        <div className="info-section">
          <h3>Informações Básicas</h3>
          <div className="property">
            <span className="property-name">ID:</span>
            <span className="property-value">
              {selectedElement.id || "N/A"}
            </span>
          </div>
          {selectedElement.bounds && (
            <div className="property">
              <span className="property-name">Dimensões:</span>
              <span className="property-value">
                {Math.round(selectedElement.bounds.width)} ×{" "}
                {Math.round(selectedElement.bounds.height)} px
              </span>
            </div>
          )}
          {selectedElement.position && (
            <div className="property">
              <span className="property-name">Posição:</span>
              <span className="property-value">
                X: {Math.round(selectedElement.position.x)}px, Y:{" "}
                {Math.round(selectedElement.position.y)}px
              </span>
            </div>
          )}
        </div>

        {/* Layout e Espaçamento */}
        {(selectedElement.padding ||
          selectedElement.gap ||
          selectedElement.layoutMode) && (
          <div className="info-section">
            <h3>Layout & Espaçamento</h3>
            {selectedElement.layoutMode && (
              <div className="property">
                <span className="property-name">Layout:</span>
                <span className="property-value">
                  {selectedElement.layoutMode}
                </span>
              </div>
            )}
            {selectedElement.padding && (
              <div className="property">
                <span className="property-name">Padding:</span>
                <div className="property-value">
                  {renderSpacing(selectedElement.padding)}
                </div>
              </div>
            )}
            {selectedElement.gap && (
              <div className="property">
                <span className="property-name">Gap:</span>
                <div className="property-value">
                  {renderSpacing(selectedElement.gap)}
                </div>
              </div>
            )}
            {selectedElement.cornerRadius && (
              <div className="property">
                <span className="property-name">Border Radius:</span>
                <span className="property-value">
                  {selectedElement.cornerRadius}px
                </span>
              </div>
            )}
          </div>
        )}

        {/* Cores */}
        {(selectedElement.fills ||
          selectedElement.strokes ||
          selectedElement.textColor) && (
          <div className="info-section">
            <h3>Cores</h3>
            {selectedElement.fills && selectedElement.fills.length > 0 && (
              <div className="property">
                <span className="property-name">Preenchimento:</span>
                <div className="property-value">
                  {selectedElement.fills.map((fill: any, index: number) => (
                    <div key={index} className="color-item">
                      {renderColorSwatch(fill)}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selectedElement.strokes && selectedElement.strokes.length > 0 && (
              <div className="property">
                <span className="property-name">Borda:</span>
                <div className="property-value">
                  {selectedElement.strokes.map((stroke: any, index: number) => (
                    <div key={index} className="color-item">
                      {renderColorSwatch(stroke)}
                      <span className="stroke-width">
                        {stroke.strokeWeight || stroke.width}px
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selectedElement.textColor && (
              <div className="property">
                <span className="property-name">Cor do Texto:</span>
                <div className="property-value">
                  {renderColorSwatch(selectedElement.textColor)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tipografia */}
        {(selectedElement.fontSize ||
          selectedElement.fontName ||
          selectedElement.fontWeight) && (
          <div className="info-section">
            <h3>Tipografia</h3>
            {selectedElement.fontName && (
              <div className="property">
                <span className="property-name">Fonte:</span>
                <span className="property-value">
                  {selectedElement.fontName.family}{" "}
                  {selectedElement.fontName.style}
                </span>
              </div>
            )}
            {selectedElement.fontSize && (
              <div className="property">
                <span className="property-name">Tamanho:</span>
                <span className="property-value">
                  {selectedElement.fontSize}px
                </span>
              </div>
            )}
            {selectedElement.fontWeight && (
              <div className="property">
                <span className="property-name">Peso:</span>
                <span className="property-value">
                  {selectedElement.fontWeight}
                </span>
              </div>
            )}
            {selectedElement.lineHeight && (
              <div className="property">
                <span className="property-name">Altura da Linha:</span>
                <span className="property-value">
                  {typeof selectedElement.lineHeight === "object"
                    ? `${selectedElement.lineHeight.value}${selectedElement.lineHeight.unit}`
                    : selectedElement.lineHeight}
                </span>
              </div>
            )}
            {selectedElement.letterSpacing && (
              <div className="property">
                <span className="property-name">Espaçamento:</span>
                <span className="property-value">
                  {typeof selectedElement.letterSpacing === "object"
                    ? `${selectedElement.letterSpacing.value}${selectedElement.letterSpacing.unit}`
                    : selectedElement.letterSpacing}
                  px
                </span>
              </div>
            )}
            {selectedElement.textAlignHorizontal && (
              <div className="property">
                <span className="property-name">Alinhamento:</span>
                <span className="property-value">
                  {selectedElement.textAlignHorizontal}
                </span>
              </div>
            )}
            {selectedElement.characters && (
              <div className="property">
                <span className="property-name">Texto:</span>
                <span className="property-value">
                  {selectedElement.characters}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Efeitos */}
        {selectedElement.effects && selectedElement.effects.length > 0 && (
          <div className="info-section">
            <h3>Efeitos</h3>
            {selectedElement.effects.map((effect: any, index: number) => (
              <div key={index} className="property">
                <span className="property-name">{effect.type}:</span>
                <div className="property-value">
                  <div>
                    Offset: {effect.offset?.x || 0}px, {effect.offset?.y || 0}px
                  </div>
                  <div>Radius: {effect.radius || 0}px</div>
                  {effect.color && renderColorSwatch(effect.color)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Componentes e Ícones */}
        {(selectedElement.componentProperties ||
          selectedElement.children ||
          selectedElement.icon) && (
          <div className="info-section">
            <h3>Componentes & Ícones</h3>
            {selectedElement.componentProperties && (
              <div className="property">
                <span className="property-name">Componente:</span>
                <span className="property-value">
                  {selectedElement.componentProperties.name}
                </span>
              </div>
            )}
            {selectedElement.icon && (
              <div className="property">
                <span className="property-name">Ícone:</span>
                <div className="property-value">
                  <div className="icon-preview">
                    <img
                      src={selectedElement.icon.url}
                      alt={selectedElement.icon.name}
                    />
                    <span>{selectedElement.icon.name}</span>
                  </div>
                </div>
              </div>
            )}
            {selectedElement.children && selectedElement.children.length > 0 && (
              <div className="property">
                <span className="property-name">Elementos Filhos:</span>
                <div className="property-value">
                  {selectedElement.children.map((child: any, index: number) => (
                    <div key={index} className="child-item">
                      <span className="child-type">{child.type}</span>
                      {child.name && (
                        <span className="child-name">{child.name}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tokens */}
        {(selectedElement.tokens || selectedElement.styleTokens) && (
          <div className="info-section">
            <h3>Tokens</h3>
            {selectedElement.tokens &&
              Object.entries(selectedElement.tokens).map(
                ([key, value]: [string, any]) => (
                  <div key={key} className="property">
                    <span className="property-name">{key}:</span>
                    <span className="property-value">{String(value)}</span>
                  </div>
                )
              )}
            {selectedElement.styleTokens &&
              Object.entries(selectedElement.styleTokens).map(
                ([key, value]: [string, any]) => (
                  <div key={key} className="property">
                    <span className="property-name">{key}:</span>
                    <span className="property-value">{String(value)}</span>
                  </div>
                )
              )}
          </div>
        )}

        {/* Estilos CSS */}
        {selectedElement.styles &&
          Object.keys(selectedElement.styles).length > 0 && (
            <div className="info-section">
              <h3>Estilos CSS</h3>
              {Object.entries(selectedElement.styles).map(([key, value]) => (
                <div key={key} className="property">
                  <span className="property-name">{key}:</span>
                  <span className="property-value">{String(value)}</span>
                </div>
              ))}
            </div>
          )}
      </div>
    );
  };

  return (
    <div className="dev-mode-container">
      <div className="dev-mode-content">
        {!selectedElement && !isInspecting && (
          <div className="empty-state">
            <p>Selecione um elemento para inspecionar.</p>
          </div>
        )}

        {isInspecting && !selectedElement && (
          <div className="inspecting-state">
            <div className="loader"></div>
            <p>Selecionando um elemento...</p>
          </div>
        )}

        {selectedElement && renderElementInfo()}
      </div>

      <footer className="dev-mode-footer">
        <motion.button
          className={`inspect-button ${isInspecting ? "active" : ""}`}
          onClick={toggleInspect}
          whileTap={{ scale: 0.98 }}
        >
          {isInspecting ? "Cancelar" : "Inspecionar"}
        </motion.button>
      </footer>
    </div>
  );
}

export default DevMode;
