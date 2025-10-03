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
          Animação
        </div>

        {languages.length > 1 && (
          <select
            value={selectedLanguage}
            onChange={e => setSelectedLanguage(e.target.value)}
            style={{
              padding: "6px 32px 6px 12px",
              borderRadius: "4px",
              backgroundColor: "#3c3c3c",
              color: "#e0e0e0",
              border: "1px solid #555",
              fontSize: "13px",
              cursor: "pointer",
              outline: "none",
              minWidth: "120px",
              marginLeft: "8px"
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
        <div
          style={{
            width: "100%",
            color: "#D4D4D4"
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
    </div>
  );
};

export default AnimationSnippetSection;
