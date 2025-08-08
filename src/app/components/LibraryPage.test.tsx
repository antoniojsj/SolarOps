import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import LibraryPage from "./LibraryPage";

describe("LibraryPage", () => {
  const mockLibs = [
    { key: "a1", name: "Design System", description: "Lib oficial", count: 5 },
    { key: "b2", name: "UI Kit", description: "Componentes UI", count: 2 },
    { key: "c3", name: "Design System", description: "Lib oficial", count: 3 },
    { key: "d4", name: "Outros", description: "Sem descrição", count: 1 }
  ];

  it("renderiza bibliotecas agrupadas e ordenadas, mostrando detalhes", () => {
    render(
      <LibraryPage
        libraries={[]}
        onUpdateLibraries={() => {}}
        localStyles={{ styles: [] }}
        activeComponentLibraries={mockLibs}
      />
    );
    // Deve mostrar grupos por nome
    expect(screen.getByText("Design System")).toBeInTheDocument();
    expect(screen.getByText("UI Kit")).toBeInTheDocument();
    expect(screen.getByText("Outros")).toBeInTheDocument();
    // Deve mostrar descrições
    expect(screen.getAllByText("Lib oficial").length).toBeGreaterThan(0);
    expect(screen.getByText("Componentes UI")).toBeInTheDocument();
    // Deve mostrar quantidade de instâncias
    expect(screen.getByText("5 instâncias")).toBeInTheDocument();
    expect(screen.getByText("3 instâncias")).toBeInTheDocument();
    expect(screen.getByText("2 instâncias")).toBeInTheDocument();
    expect(screen.getByText("1 instâncias")).toBeInTheDocument();
    // Deve mostrar botão de copiar
    expect(screen.getAllByText("Copiar").length).toBeGreaterThan(0);
  });

  it("mostra placeholder visual se não houver bibliotecas", () => {
    render(
      <LibraryPage
        libraries={[]}
        onUpdateLibraries={() => {}}
        localStyles={{ styles: [] }}
        activeComponentLibraries={[]}
      />
    );
    expect(
      screen.getByText(
        /Nenhuma biblioteca de componentes remotos detectada neste arquivo/i
      )
    ).toBeInTheDocument();
  });

  it("copia o key da biblioteca ao clicar no botão", () => {
    render(
      <LibraryPage
        libraries={[]}
        onUpdateLibraries={() => {}}
        localStyles={{ styles: [] }}
        activeComponentLibraries={mockLibs}
      />
    );
    const copyButtons = screen.getAllByText("Copiar");
    fireEvent.click(copyButtons[0]);
    expect(screen.getByText("Copiado!")).toBeInTheDocument();
  });
});
