import React, { useEffect, useState } from "react";
import styled from "styled-components";

const Container = styled.div`
  padding: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const EditorContainer = styled.div`
  flex: 1;
  background: #1e1e1e;
  border-radius: 4px;
  border: 1px solid #333;
  overflow: hidden;
`;

const Toolbar = styled.div`
  display: flex;
  gap: 8px;
  padding: 8px;
  background: #252526;
  border-bottom: 1px solid #333;
`;

const Button = styled.button`
  padding: 6px 12px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: background 0.2s;

  &:hover {
    background: #2563eb;
  }

  &:disabled {
    background: #4b5563;
    cursor: not-allowed;
  }
`;

interface CodeSnippetEditorProps {
  selectedNode: any;
}

const CodeSnippetEditor: React.FC<CodeSnippetEditorProps> = ({
  selectedNode
}) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [snippets, setSnippets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenEditor = async () => {
    try {
      setIsLoading(true);

      // Check if we're in codegen mode (required for the code snippet editor)
      if (figma.mode === "codegen") {
        // Set up a message handler for the plugin UI
        figma.ui.on("message", (message: any) => {
          if (message.type === "EDITOR_SAVE") {
            // Handle saved snippets
            setSnippets(message.data || []);
          }
        });

        // Open the editor UI
        figma.showUI(__html__, { visible: true });
        figma.ui.resize(400, 500);

        // Request the current snippets for the selected node
        const snippets = await selectedNode.getPluginData("codeSnippets");
        figma.ui.postMessage({
          type: "INITIALIZE",
          data: snippets ? JSON.parse(snippets) : []
        });

        setIsEditorOpen(true);
      } else {
        console.warn("Code snippet editor requires codegen mode");
      }
    } catch (error) {
      console.error("Error opening code snippet editor:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Load snippets when the component mounts or selectedNode changes
    const loadSnippets = async () => {
      if (!selectedNode) return;

      try {
        setIsLoading(true);
        // Get snippets from the plugin data
        const pluginData = await selectedNode.getPluginData("codeSnippets");
        if (pluginData) {
          setSnippets(JSON.parse(pluginData));
        } else {
          setSnippets([]);
        }
      } catch (error) {
        console.error("Error loading snippets:", error);
        setSnippets([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadSnippets();
  }, [selectedNode]);

  if (!selectedNode) {
    return (
      <Container>
        <p>Select a node to edit its code snippets</p>
      </Container>
    );
  }

  return (
    <Container>
      <Toolbar>
        <Button onClick={handleOpenEditor} disabled={isLoading || isEditorOpen}>
          {isEditorOpen ? "Editor Open" : "Open Snippet Editor"}
        </Button>
      </Toolbar>

      <EditorContainer>
        {snippets.length > 0 ? (
          <div>
            {snippets.map((snippet, index) => (
              <div key={index}>
                <h4>{snippet.name || `Snippet ${index + 1}`}</h4>
                <pre>
                  <code>{snippet.code}</code>
                </pre>
              </div>
            ))}
          </div>
        ) : (
          <p>No snippets available. Open the editor to create some.</p>
        )}
      </EditorContainer>
    </Container>
  );
};

export default CodeSnippetEditor;
