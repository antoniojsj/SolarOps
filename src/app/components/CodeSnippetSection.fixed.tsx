import React, { useState, useEffect, FC, ReactElement } from "react";

interface CodeSnippet {
  language: string;
  code: string;
  title: string;
}

// Inline styles
const styles = {
  section: {
    marginTop: "24px",
    borderTop: "1px solid #333",
    paddingTop: "16px"
  },
  sectionHeader: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#e0e0e0",
    margin: "0 0 12px 0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  button: {
    background: "#3b82f6",
    color: "white",
    border: "none",
    borderRadius: "4px",
    padding: "6px 12px",
    fontSize: "12px",
    fontWeight: 500,
    cursor: "pointer",
    transition: "background 0.2s",
    display: "flex",
    alignItems: "center",
    gap: "6px"
  },
  buttonHover: {
    background: "#2563eb"
  },
  buttonDisabled: {
    background: "#4b5563",
    cursor: "not-allowed"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "12px"
  },
  th: {
    textAlign: "left" as const,
    padding: "8px",
    borderBottom: "1px solid #333",
    color: "#e0e0e0",
    fontSize: "12px",
    fontWeight: 600
  },
  td: {
    padding: "8px",
    borderBottom: "1px solid #333",
    fontSize: "12px",
    color: "#e0e0e0"
  },
  code: {
    fontFamily: "monospace",
    backgroundColor: "#2d2d2d",
    padding: "2px 4px",
    borderRadius: "3px",
    fontSize: "12px"
  },
  select: {
    padding: "4px 8px",
    borderRadius: "4px",
    backgroundColor: "#2d2d2d",
    color: "#e0e0e0",
    border: "1px solid #444",
    fontSize: "12px"
  }
} as const;

interface CodeSnippetSectionProps {
  selectedNode: any;
}

const CodeSnippetSection: FC<CodeSnippetSectionProps> = ({
  selectedNode
}): ReactElement => {
  const [snippets, setSnippets] = useState<CodeSnippet[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Get unique languages from snippets
  const languages = Array.from(new Set(snippets.map(s => s.language)));
  const filteredSnippets = selectedLanguage
    ? snippets.filter(s => s.language === selectedLanguage)
    : snippets;

  const loadSnippets = async (): Promise<void> => {
    console.log("Carregando snippets para o nó:", selectedNode);
    if (!selectedNode) {
      console.log("Nenhum nó selecionado");
      return;
    }

    try {
      console.log("Buscando dados do plugin...");
      const snippetData = await selectedNode.getPluginData("codeSnippets");
      console.log("Dados brutos do plugin:", snippetData);

      if (snippetData) {
        const parsed = JSON.parse(snippetData);
        console.log("Dados parseados:", parsed);

        // Garante que os dados são um array e tem a estrutura correta
        const validSnippets = Array.isArray(parsed)
          ? parsed.filter((s: any) => s && s.language && s.code)
          : [];

        console.log("Snippets válidos:", validSnippets);
        setSnippets(validSnippets);

        // Define a primeira linguagem como selecionada por padrão
        if (validSnippets.length > 0) {
          const firstLanguage = validSnippets[0].language;
          console.log("Definindo linguagem padrão:", firstLanguage);
          setSelectedLanguage(firstLanguage);
        } else {
          console.log("Nenhum snippet válido encontrado");
          setSelectedLanguage("");
        }
      } else {
        console.log("Nenhum dado de snippet encontrado");
        setSnippets([]);
        setSelectedLanguage("");
      }
    } catch (error) {
      console.error("Erro ao carregar snippets:", error);
      setSnippets([]);
      setSelectedLanguage("");
    }
  };

  const handleOpenEditor = async (): Promise<void> => {
    console.log("Abrindo editor de snippets...");
    if (!selectedNode) {
      console.error("Nenhum nó selecionado para editar snippets");
      return;
    }

    try {
      setIsLoading(true);

      // Primeiro, carrega os snippets atuais para garantir que temos os dados mais recentes
      await loadSnippets();

      console.log("Snippets atuais:", snippets);

      // Função para processar mensagens do editor
      const handleEditorMessage = async (message: any): Promise<void> => {
        console.log("Mensagem recebida do editor:", message);

        if (message && message.type === "EDITOR_SAVE") {
          try {
            console.log("Recebendo dados para salvar:", message.data);

            // Garante que temos um array de snippets
            const snippetsToSave = Array.isArray(message.data)
              ? message.data
              : [];

            console.log("Snippets para salvar:", snippetsToSave);

            // Formata os snippets para garantir que tenham a estrutura correta
            const formattedSnippets = snippetsToSave.map(
              (snippet: any, index: number) => ({
                language: snippet.language || "TEXT",
                code: snippet.code || "",
                title: snippet.title || `Snippet ${index + 1}`
              })
            );

            console.log("Snippets formatados:", formattedSnippets);

            // Salva os dados no nó
            await selectedNode.setPluginData(
              "codeSnippets",
              JSON.stringify(formattedSnippets)
            );

            // Atualiza o estado local
            setSnippets(formattedSnippets);

            // Se houver snippets, define a primeira linguagem como selecionada
            if (formattedSnippets.length > 0) {
              setSelectedLanguage(formattedSnippets[0].language);
            }

            console.log("Snippets salvos com sucesso!");

            // Fecha o editor
            figma.ui.close();
            setIsEditorOpen(false);
          } catch (error) {
            console.error("Erro ao processar mensagem do editor:", error);
          }
        }
      };

      // Configura o manipulador de mensagens
      figma.ui.on("message", handleEditorMessage);

      // Cria o HTML para o editor
      const editorHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Editor de Snippets</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
                margin: 0;
                padding: 0;
                background: #1e1e1e;
                color: #e0e0e0;
              }
              .container {
                padding: 20px;
                max-width: 800px;
                margin: 0 auto;
              }
              h1 {
                color: #fff;
                margin-top: 0;
              }
              .snippet {
                background: #252526;
                border-radius: 4px;
                padding: 16px;
                margin-bottom: 16px;
              }
              .snippet-header {
                display: flex;
                justify-content: space-between;
                margin-bottom: 12px;
              }
              .snippet-title {
                font-weight: 600;
                margin: 0;
                background: #1e1e1e;
                border: 1px solid #444;
                color: #e0e0e0;
                padding: 4px 8px;
                border-radius: 4px;
                width: 200px;
              }
              .snippet-language {
                background: #0e639c;
                color: white;
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 12px;
                border: none;
              }
              .snippet-code {
                background: #1e1e1e;
                border: 1px solid #444;
                border-radius: 4px;
                padding: 12px;
                font-family: 'Courier New', monospace;
                white-space: pre-wrap;
                color: #9cdcfe;
                margin: 8px 0;
                min-height: 60px;
                outline: none;
              }
              .add-button {
                background: #0e639c;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 8px 16px;
                cursor: pointer;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 16px;
              }
              .add-button:hover {
                background: #1177bb;
              }
              .save-button {
                background: #388a34;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 12px 24px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                margin-top: 16px;
                width: 100%;
              }
              .save-button:hover {
                background: #43a047;
              }
              .save-button:disabled {
                background: #555;
                cursor: not-allowed;
              }
              .remove-snippet {
                background: #e74c3c;
                color: white;
                border: none;
                border-radius: 4px;
                padding: 4px 8px;
                cursor: pointer;
                font-size: 12px;
              }
              .remove-snippet:hover {
                background: #c0392b;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Editor de Snippets</h1>
              
              <div id="snippets-container">
                <!-- Os snippets serão adicionados aqui dinamicamente -->
              </div>
              
              <button id="add-snippet" class="add-button">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 4V20M4 12H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Adicionar Snippet
              </button>
              
              <button id="save-button" class="save-button" disabled>
                Salvar Alterações
              </button>
            </div>
            
            <script>
              let snippets = [];
              
              // Função para criar um novo snippet
              function createSnippet(snippet = { language: 'HTML', code: '', title: 'Novo Snippet' }) {
                const container = document.createElement('div');
                container.className = 'snippet';
                
                // Cria elementos manualmente para evitar problemas com template literals
                const snippetHeader = document.createElement('div');
                snippetHeader.className = 'snippet-header';
                
                const titleInput = document.createElement('input');
                titleInput.type = 'text';
                titleInput.className = 'snippet-title';
                titleInput.value = snippet.title || '';
                titleInput.placeholder = 'Título do Snippet';
                
                const languageSelect = document.createElement('select');
                languageSelect.className = 'snippet-language';
                
                const languages = [
                  { value: 'HTML', label: 'HTML' },
                  { value: 'CSS', label: 'CSS' },
                  { value: 'JavaScript', label: 'JavaScript' },
                  { value: 'TypeScript', label: 'TypeScript' },
                  { value: 'JSON', label: 'JSON' },
                  { value: 'JSX', label: 'JSX' },
                  { value: 'TSX', label: 'TSX' },
                  { value: 'TEXT', label: 'Texto' }
                ];
                
                languages.forEach(lang => {
                  const option = document.createElement('option');
                  option.value = lang.value;
                  option.textContent = lang.label;
                  if (snippet.language === lang.value || (!snippet.language && lang.value === 'TEXT')) {
                    option.selected = true;
                  }
                  languageSelect.appendChild(option);
                });
                
                const snippetCode = document.createElement('div');
                snippetCode.className = 'snippet-code';
                snippetCode.contentEditable = 'true';
                snippetCode.textContent = snippet.code || '';
                
                const removeButton = document.createElement('button');
                removeButton.className = 'remove-snippet';
                removeButton.textContent = 'Remover';
                
                // Monta a estrutura do snippet
                snippetHeader.appendChild(titleInput);
                snippetHeader.appendChild(languageSelect);
                
                container.appendChild(snippetHeader);
                container.appendChild(snippetCode);
                container.appendChild(removeButton);
                
                // Adiciona o event listener para o botão de remover
                removeButton.addEventListener('click', () => {
                  container.remove();
                  updateSaveButton();
                });
                
                return container;
              }
              
              // Função para atualizar o estado do botão de salvar
              function updateSaveButton() {
                const saveButton = document.getElementById('save-button');
                const snippets = document.querySelectorAll('.snippet');
                saveButton.disabled = snippets.length === 0;
              }
              
              // Adiciona um novo snippet quando o botão é clicado
              document.getElementById('add-snippet').addEventListener('click', () => {
                const container = document.getElementById('snippets-container');
                container.appendChild(createSnippet());
                updateSaveButton();
              });
              
              // Salva os snippets quando o botão de salvar é clicado
              document.getElementById('save-button').addEventListener('click', () => {
                const snippetElements = document.querySelectorAll('.snippet');
                const snippets = Array.from(snippetElements).map(snippet => ({
                  title: snippet.querySelector('.snippet-title').value || 'Sem Título',
                  language: snippet.querySelector('.snippet-language').value,
                  code: snippet.querySelector('.snippet-code').textContent
                }));
                
                // Envia os dados de volta para o plugin
                parent.postMessage({
                  pluginMessage: {
                    type: 'EDITOR_SAVE',
                    data: snippets
                  }
                }, '*');
              });
              
              // Inicializa o editor com os dados iniciais
              window.onmessage = (event) => {
                const message = event.data.pluginMessage;
                if (message && message.type === 'INITIALIZE' && message.data) {
                  const container = document.getElementById('snippets-container');
                  container.innerHTML = '';
                  
                  if (message.data.length > 0) {
                    message.data.forEach(snippet => {
                      container.appendChild(createSnippet(snippet));
                    });
                    updateSaveButton();
                  }
                }
              };
              
              // Adiciona um snippet vazio inicial
              document.addEventListener('DOMContentLoaded', () => {
                const container = document.getElementById('snippets-container');
                container.appendChild(createSnippet());
                updateSaveButton();
              });
            </script>
          </body>
        </html>
      `;

      // Abre o editor
      figma.showUI(editorHTML, {
        themeColors: true,
        width: 800,
        height: 600
      });

      console.log("UI do editor aberta com sucesso");

      // Envia os dados iniciais para o editor
      figma.ui.postMessage({
        type: "INITIALIZE",
        data: snippets
      });

      setIsEditorOpen(true);
    } catch (error) {
      console.error("Erro no editor de snippets:", error);
      // Mostra uma mensagem de erro para o usuário
      figma.notify(
        "Erro ao abrir o editor de snippets. Verifique o console para mais detalhes.",
        { error: true }
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Carrega os snippets quando o nó selecionado mudar
  useEffect(() => {
    console.log("Nó selecionado mudou:", selectedNode);
    loadSnippets();
  }, [selectedNode]);

  // Loga as mudanças nos snippets
  useEffect(() => {
    console.log("Snippets atualizados:", snippets);
    console.log("Linguagens disponíveis:", languages);
    console.log("Linguagem selecionada:", selectedLanguage);
  }, [snippets, languages, selectedLanguage]);

  return (
    <div style={styles.section}>
      <div style={styles.sectionHeader}>
        <span>Code Snippets</span>
        <button
          onClick={handleOpenEditor}
          disabled={!selectedNode || isLoading}
          style={{
            ...styles.button,
            ...(!selectedNode || isLoading ? styles.buttonDisabled : {})
          }}
        >
          {isLoading ? "Abrindo..." : "Editar Snippets"}
        </button>
      </div>

      {languages.length > 0 && (
        <div style={{ marginBottom: "12px" }}>
          <label htmlFor="language-select" style={{ marginRight: "8px" }}>
            Filtrar por linguagem:
          </label>
          <select
            id="language-select"
            value={selectedLanguage}
            onChange={e => setSelectedLanguage(e.target.value)}
            style={styles.select}
          >
            <option value="">Todas as linguagens</option>
            {languages.map(lang => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>
      )}

      {filteredSnippets.length > 0 ? (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Título</th>
              <th style={styles.th}>Linguagem</th>
              <th style={styles.th}>Código</th>
            </tr>
          </thead>
          <tbody>
            {filteredSnippets.map((snippet, index) => (
              <tr key={index}>
                <td style={styles.td}>{snippet.title}</td>
                <td style={styles.td}>
                  <span
                    style={{
                      ...styles.code,
                      backgroundColor: "transparent",
                      padding: "2px 6px",
                      color: "#e0e0e0"
                    }}
                  >
                    {snippet.language}
                  </span>
                </td>
                <td style={styles.td}>
                  <code style={styles.code}>
                    {snippet.code && snippet.code.length > 100
                      ? `${snippet.code.substring(0, 100)}...`
                      : snippet.code || "Sem código"}
                  </code>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{ color: "#999", fontStyle: "italic" }}>
          {selectedNode
            ? 'Nenhum snippet encontrado. Clique em "Editar Snippets" para adicionar um novo.'
            : "Selecione um nó para visualizar ou editar os snippets."}
        </div>
      )}
    </div>
  );
};

export default CodeSnippetSection;
