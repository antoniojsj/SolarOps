import React, { useState, useEffect } from "react";

interface VisionSimulatorTabProps {
  selectedNode: any | null;
}

export const VisionSimulatorTab: React.FC<VisionSimulatorTabProps> = ({
  selectedNode
}) => {
  const [types, setTypes] = useState({
    protanopia: false,
    deuteranopia: false,
    tritanopia: false,
    achromatopsia: false,
    catarata: false,
    baixa_visao: false
  });

  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);

  const handleSelectAll = (checked: boolean) => {
    setTypes({
      protanopia: checked,
      deuteranopia: checked,
      tritanopia: checked,
      achromatopsia: checked,
      catarata: checked,
      baixa_visao: checked
    });
  };

  const handleTypeChange = (type: keyof typeof types) => {
    setTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const allSelected = Object.values(types).every(Boolean);
  const noneSelected = Object.values(types).every(val => !val);

  const CustomSwitch = ({
    active,
    onClick
  }: {
    active: boolean;
    onClick: () => void;
  }) => (
    <div
      onClick={onClick}
      style={{
        width: 32,
        height: 18,
        background: active ? "#18a0fb" : "rgba(255, 255, 255, 0.2)",
        borderRadius: 9,
        position: "relative",
        cursor: "pointer",
        transition: "background 0.2s",
        flexShrink: 0
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 2,
          left: active ? 16 : 2,
          width: 14,
          height: 14,
          background: "#fff",
          borderRadius: "50%",
          transition: "left 0.2s"
        }}
      />
    </div>
  );

  const performSimulation = () => {
    if (!selectedNode || noneSelected) return;

    setIsSimulating(true);
    setSimulationError(null);

    const selectedTypes = Object.entries(types)
      .filter(([_, isChecked]) => isChecked)
      .map(([type]) => type);

    parent.postMessage(
      {
        pluginMessage: {
          type: "simulate-color-blindness",
          types: selectedTypes
        }
      },
      "*"
    );

    setTimeout(() => setIsSimulating(false), 500);
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: 0
      }}
    >
      <div
        className="scrollable-content"
        style={{
          flex: 1,
          minHeight: 0,
          margin: 0,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          paddingBottom: "80px"
        }}
      >
        <div style={{ marginBottom: "24px" }}>
          <h3
            style={{
              fontSize: "14px",
              fontWeight: 600,
              color: "#fff",
              margin: "0 0 8px 0"
            }}
          >
            Tipos de Daltonismo
          </h3>
          <p
            style={{
              fontSize: "13px",
              color: "rgba(255, 255, 255, 0.7)",
              marginBottom: "16px",
              lineHeight: 1.4
            }}
          >
            Selecione os tipos de deficiência visual que deseja simular. O
            plugin duplicará o frame selecionado e aplicará os filtros
            correspondentes.
          </p>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              padding: "8px 0",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              marginBottom: "8px"
            }}
          >
            <span style={{ fontSize: "13px", color: "#fff", fontWeight: 500 }}>
              Selecionar Todos
            </span>
            <CustomSwitch
              active={allSelected}
              onClick={() => handleSelectAll(!allSelected)}
            />
          </label>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              {
                id: "protanopia",
                label: "Protanopia",
                desc: "Dificuldade com vermelho"
              },
              {
                id: "deuteranopia",
                label: "Deuteranopia",
                desc: "Dificuldade com verde"
              },
              {
                id: "tritanopia",
                label: "Tritanopia",
                desc: "Dificuldade com azul/amarelo"
              },
              {
                id: "achromatopsia",
                label: "Acromatopsia",
                desc: "Visão monocromática (sem cores)"
              },
              {
                id: "catarata",
                label: "Catarata",
                desc:
                  "Visão turva que reduz o contraste — dificulta a distinção entre cores ou tons semelhantes."
              },
              {
                id: "baixa_visao",
                label: "Baixa visão",
                desc:
                  "Visão borrada e reduzida — dificulta enxergar elementos pequenos, textos ou tons de cores semelhantes."
              }
            ].map(type => (
              <label
                key={type.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  padding: "6px 0"
                }}
              >
                <div style={{ paddingRight: "16px" }}>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#fff",
                      marginBottom: "2px"
                    }}
                  >
                    {type.label}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: "rgba(255, 255, 255, 0.5)",
                      lineHeight: 1.3
                    }}
                  >
                    {type.desc}
                  </div>
                </div>
                <CustomSwitch
                  active={types[type.id as keyof typeof types]}
                  onClick={() =>
                    handleTypeChange(type.id as keyof typeof types)
                  }
                />
              </label>
            ))}
          </div>
        </div>

        {simulationError && (
          <div
            style={{
              padding: 12,
              borderRadius: 6,
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              marginBottom: 16
            }}
          >
            <p style={{ margin: 0, color: "#ef4444", fontSize: 12 }}>
              {simulationError}
            </p>
          </div>
        )}
      </div>

      <footer
        className="initial-content-footer"
        style={{
          padding: "16px",
          background: "#2A2A2A",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          display: "flex",
          justifyContent: "center",
          flexShrink: 0
        }}
      >
        <button
          className="button button--primary"
          onClick={performSimulation}
          disabled={isSimulating || !selectedNode || noneSelected}
          style={{
            background:
              isSimulating || !selectedNode || noneSelected
                ? "#4A4A4A"
                : "#18A0FB",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            padding: "12px 16px",
            fontSize: "14px",
            fontWeight: 500,
            cursor:
              isSimulating || !selectedNode || noneSelected
                ? "not-allowed"
                : "pointer",
            width: "100%",
            transition: "background 0.2s ease"
          }}
        >
          {!selectedNode
            ? "Selecione um frame"
            : noneSelected
            ? "Selecione um tipo"
            : isSimulating
            ? "Gerando simulação..."
            : "Criar simulação"}
        </button>
      </footer>
    </div>
  );
};
