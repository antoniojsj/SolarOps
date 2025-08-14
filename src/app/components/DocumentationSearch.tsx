import * as React from "react";
import { useState, KeyboardEvent } from "react";

declare function require(path: string): any;

interface DocumentationSearchProps {
  onSearch: (query: string) => void;
  onDocumentSelect: (docId: string) => void;
}

const DocumentationSearch: React.FC<DocumentationSearchProps> = ({
  onSearch,
  onDocumentSelect
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocument, setSelectedDocument] = useState("");

  // Lista de documentos de exemplo - substituir pela lista real posteriormente
  const documents = [
    { id: "doc1", name: "Guia de Acessibilidade" },
    { id: "doc2", name: "Padrões de Cores" },
    { id: "doc3", name: "Tipografia" },
    { id: "doc4", name: "Componentes" }
  ];

  const handleSearch = (e: React.MouseEvent | KeyboardEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch(e);
    }
  };

  const handleDocumentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const docId = e.target.value;
    setSelectedDocument(docId);
    onDocumentSelect(docId);
  };

  return (
    <div
      className="documentation-search"
      style={{
        display: "flex",
        gap: "12px",
        width: "100%",
        margin: 0,
        padding: 0,
        boxSizing: "border-box"
      }}
    >
      <div
        style={{
          position: "relative",
          flex: "1 1 auto",
          minWidth: "200px",
          margin: 0,
          padding: 0
        }}
      >
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar na documentação..."
          style={{
            width: "100%",
            padding: "8px 36px 8px 12px",
            borderRadius: "4px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            background: "rgba(0, 0, 0, 0.2)",
            color: "#fff",
            fontSize: "14px",
            height: "36px",
            boxSizing: "border-box"
          }}
        />
        <button
          onClick={handleSearch}
          style={{
            position: "absolute",
            right: "8px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            color: "rgba(255, 255, 255, 0.6)",
            cursor: "pointer",
            padding: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          aria-label="Buscar"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M21 21L16.65 16.65"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div
        style={{
          position: "relative",
          flex: "0 0 200px",
          minWidth: "180px",
          margin: 0,
          padding: 0
        }}
      >
        <select
          value={selectedDocument}
          onChange={handleDocumentChange}
          style={{
            width: "100%",
            padding: "8px 32px 8px 12px",
            borderRadius: "4px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            background: "rgba(0, 0, 0, 0.2)",
            color: "#fff",
            fontSize: "14px",
            height: "36px",
            appearance: "none",
            boxSizing: "border-box"
          }}
        >
          <option value="">Selecione um documento...</option>
          {documents.map(doc => (
            <option key={doc.id} value={doc.id}>
              {doc.name}
            </option>
          ))}
        </select>
        <div
          style={{
            position: "absolute",
            right: "8px",
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            color: "rgba(255, 255, 255, 0.6)"
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 9L12 15L18 9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default DocumentationSearch;
