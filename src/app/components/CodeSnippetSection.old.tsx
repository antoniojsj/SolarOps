import React, { useState, useEffect, FC, ReactElement } from "react";

interface CodeSnippet {
  language: string;
  code: string;
  title: string;
}

interface CodeSnippetSectionProps {
  selectedNode: any;
}

const CodeSnippetSection: FC<CodeSnippetSectionProps> = ({
  selectedNode
}): ReactElement => {
  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // Get unique languages from snippets
  const languages = Array.from(new Set(snippets.map(s => s.language)));
  const filteredSnippets = selectedLanguage
    ? snippets.filter(s => s.language === selectedLanguage)
    : snippets;

  const loadSnippets = async (): Promise<void> => {
    if (!selectedNode) {
      setSnippets([]);
      return;
    }

    try {
      setIsLoading(true);
      // Simulando carregamento de snippets
      const mockSnippets: CodeSnippet[] = [
        {
          title: "Exemplo de Código",
          language: "typescript",
          code: 'const exemplo = () => {\n  return "Olá, mundo!";\n};'
        },
        {
          title: "Estilo CSS",
          language: "css",
          code:
            ".container {\n  display: flex;\n  justify-content: center;\n  align-items: center;\n}"
        }
      ];

      setSnippets(mockSnippets);
      if (mockSnippets.length > 0) {
        setSelectedLanguage(mockSnippets[0].language);
      }
    } catch (error) {
      console.error("Erro ao carregar snippets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Carrega os snippets quando o nó selecionado mudar
  useEffect(() => {
    loadSnippets();
  }, [selectedNode]);

  if (!selectedNode) {
    return (
      <div
        style={{
          color: "#9e9e9e",
          fontStyle: "italic",
          padding: "16px",
          textAlign: "center",
          backgroundColor: "#252526",
          borderRadius: "4px",
          marginTop: "16px",
          border: "1px dashed #333"
        }}
      >
        Selecione um nó para visualizar ou editar os snippets.
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: "16px",
        background: "#252526",
        borderRadius: "6px",
        border: "1px solid #333",
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
      }}
    >
      <div
        style={{
          padding: "8px 12px",
          borderBottom: "1px solid #333",
          backgroundColor: "#2D2D2D",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "11px",
            fontWeight: 600,
            color: "#9CDCFE",
            textTransform: "uppercase",
            letterSpacing: "0.5px"
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M16 18l6-6-6-6"></path>
            <path d="M8 6l-6 6 6 6"></path>
          </svg>
          Código
        </div>

        {languages.length > 0 && (
          <select
            value={selectedLanguage}
            onChange={e => setSelectedLanguage(e.target.value)}
            style={{
              padding: "4px 8px",
              borderRadius: "4px",
              backgroundColor: "#3c3c3c",
              color: "#e0e0e0",
              border: "1px solid #555",
              fontSize: "11px",
              cursor: "pointer",
              outline: "none"
            }}
          >
            {languages.map(lang => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        )}
      </div>

      <div
        style={{
          maxHeight: "300px",
          overflowY: "auto",
          fontSize: "12px"
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            color: "#D4D4D4"
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: "#2A2D2E",
                fontSize: "11px",
                textAlign: "left",
                color: "#9CDCFE",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}
            >
              <th
                style={{
                  padding: "8px 12px",
                  borderBottom: "1px solid #333",
                  width: "30%"
                }}
              >
                Nome
              </th>
              <th
                style={{
                  padding: "8px 12px",
                  borderBottom: "1px solid #333"
                }}
              >
                Código
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredSnippets.length > 0 ? (
              filteredSnippets.map((snippet, index) => (
                <tr
                  key={index}
                  style={{
                    borderBottom: "1px solid #333",
                    backgroundColor: index % 2 === 0 ? "#252526" : "#2A2D2E"
                  }}
                >
                  <td
                    style={{
                      padding: "8px 12px",
                      verticalAlign: "top",
                      borderRight: "1px solid #333",
                      color: "#9e9e9e"
                    }}
                  >
                    {snippet.title}
                    <div
                      style={{
                        fontSize: "10px",
                        color: "#6b6b6b",
                        marginTop: "4px"
                      }}
                    >
                      {snippet.language}
                    </div>
                  </td>
                  <td
                    style={{
                      padding: "8px 12px",
                      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      color: "#d4d4d4",
                      fontSize: "11px",
                      lineHeight: "1.4"
                    }}
                  >
                    <code>{snippet.code}</code>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={2}
                  style={{
                    padding: "16px",
                    textAlign: "center",
                    color: "#9e9e9e",
                    fontStyle: "italic"
                  }}
                >
                  Nenhum snippet encontrado para esta linguagem.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CodeSnippetSection;
