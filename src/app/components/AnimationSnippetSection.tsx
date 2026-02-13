import React, { useState, FC, ReactElement } from "react";

interface AnimationSnippet {
  language: string;
  code: string;
}

interface AnimationSnippetSectionProps {
  animationData: any;
}

const AnimationSnippetSection: FC<AnimationSnippetSectionProps> = ({
  animationData
}): ReactElement => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>("json");

  if (!animationData || animationData.length === 0) {
    return null;
  }

  const snippets: AnimationSnippet[] = [
    {
      language: "json",
      code: JSON.stringify(animationData, null, 2)
    }
  ];

  const languages = Array.from(new Set(snippets.map(s => s.language)));
  const filteredSnippets = snippets.filter(
    s => s.language === selectedLanguage
  );

  return (
    <div
      style={{
        background: "#252526",
        borderRadius: "6px",
        border: "1px solid #333",
        overflow: "hidden",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
      }}
    >
      <div
        style={{
          maxHeight: "300px",
          overflowY: "auto",
          fontSize: "12px"
        }}
      >
        {filteredSnippets.length > 0 ? (
          filteredSnippets.map((snippet, index) => (
            <div
              key={index}
              style={{
                borderBottom: "1px solid #333",
                backgroundColor: index % 2 === 0 ? "#252526" : "#2A2D2E",
                padding: "12px",
                position: "relative"
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "4px",
                  right: "8px",
                  fontSize: "10px",
                  color: "#6b6b6b",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px"
                }}
              >
                {snippet.language}
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: "8px",
                  fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  color: "#d4d4d4",
                  fontSize: "11px",
                  lineHeight: "1.4",
                  backgroundColor: "transparent",
                  borderRadius: "4px",
                  overflowX: "auto"
                }}
              >
                <code>{snippet.code}</code>
              </pre>
            </div>
          ))
        ) : (
          <div
            style={{
              padding: "16px",
              textAlign: "center",
              color: "#9e9e9e",
              fontStyle: "italic"
            }}
          >
            Nenhum snippet de animação encontrado.
          </div>
        )}
      </div>
    </div>
  );
};

export default AnimationSnippetSection;
