# SolarOps - Plugin para Figma

O SolarOps é uma iniciativa do Studio de UX na AI/R Company pela Compass UOL, que oferece aos clientes parceiros diversas ações para aprimorar seus processos e potencializar os ganhos operacionais em design.

Este plugin tem o objetivo de facilitar e escalar o trabalho de qualidade em projetos de design. Ele funciona como um assistente multifuncional, permitindo realizar auditorias de conformidade, verificar a acessibilidade e fornecer ferramentas que agilizam o handoff para o desenvolvimento.

## ✨ Funcionalidades

O plugin é organizado em três abas principais: Auditoria, Acessibilidade e Ferramentas.

### 1. Auditoria de Conformidade

A principal funcionalidade do SolarOps. Realize uma varredura completa em seus frames para garantir a consistência com o Design System.

- **Verificação de Tokens**: Audita o uso de estilos de cores, tipografia, efeitos, bordas e espaçamentos, comparando-os com as bibliotecas de tokens configuradas.
- **Relatórios Detalhados**: Gera um relatório visual com um score de conformidade, gráficos detalhados por categoria (cores, texto, etc.) e uma lista de todos os elementos não conformes.
- **Correções Inteligentes**: Oferece sugestões e, em muitos casos, correções automáticas para os erros encontrados, agilizando o processo de ajuste.
- **Gerenciamento de Bibliotecas**: Permite importar e gerenciar as bibliotecas de tokens que servem como base para a auditoria.

### 2. Ferramentas de Acessibilidade

Um conjunto de recursos para ajudar a criar projetos mais inclusivos.

- **Verificador de Contraste**: Uma ferramenta manual para analisar e validar o contraste entre duas cores, garantindo a conformidade com os níveis AA e AAA da WCAG.
- **Guia WCAG 2.2**: Uma documentação completa e integrada dos critérios da WCAG, traduzida para o português. Permite busca e filtragem por categoria (Perceptível, Operável, Compreensível, Robusto) para facilitar a consulta.

### 3. Ferramentas para Desenvolvedores e Designers

Recursos para acelerar o fluxo de trabalho e a comunicação entre design e desenvolvimento.

- **Inspeção de Elementos**: Selecione qualquer elemento no canvas para gerar automaticamente snippets de código em **HTML**, **CSS**, **TypeScript (tipos)** e **JSON (dados do nó)**. A geração de código foi aprimorada para fornecer um snippet de HTML e CSS que representa fielmente o design do Figma. O código gerado inclui posicionamento absoluto, layout flexbox, estilos de preenchimento, bordas, sombras, e blurs. Para elementos vetoriais, o código SVG é exportado e embutido diretamente no HTML.
- **Importar Design**: Cole código HTML e CSS para convertê-lo em um design no Figma. Esta funcionalidade permite que você traga designs de páginas da web existentes ou protótipos de código para o Figma, acelerando o processo de design e garantindo a consistência entre o código e o design.
- **Ferramenta de Medição**: Adicione anotações visuais diretamente no canvas.
  - **Anotações**: Crie balões de texto para deixar comentários e especificações.
  - **Medidas de Distância**: Adicione linhas de cota para indicar espaçamentos e dimensões.

## 🛠 Tecnologias Utilizadas

- **Frontend**: React 17, TypeScript
- **Ferramentas de Build**: Webpack 4, Babel
- **Estilização**: CSS
- **Animações**: Framer Motion

## 🚀 Começando

### Pré-requisitos

- Node.js (versão 14 ou superior)
- npm ou yarn
- Aplicativo Figma Desktop instalado

### Instalação

1. Clone o repositório:
   ```bash
   git clone https://github.com/antoniojsj/SolarOps.git
   cd SolarOps
   ```

2. Instale as dependências:
   ```bash
   yarn install
   # ou
   npm install
   ```

### Desenvolvimento

Para iniciar o servidor de desenvolvimento com hot-reload:

```bash
yarn build:watch
# ou
npm run build:watch
```

### Construção para Produção

Para criar uma versão de produção:

```bash
yarn build
# ou
npm run build
```

Os arquivos de build serão armazenados no diretório `dist/`.

## 🧭 Como Usar

1.  **Auditoria**:
    - Selecione um ou mais frames no canvas.
    - Na aba **Auditoria**, clique em "Iniciar auditoria".
    - Navegue pelo relatório gerado para visualizar os erros e aplicar correções.

2.  **Acessibilidade**:
    - Abra a aba **Acessibilidade**.
    - Use a sub-aba **Contraste** para verificar manualmente a relação de contraste entre cores.
    - Use a sub-aba **Documentações** para pesquisar e consultar os critérios da WCAG.

3.  **Ferramentas**:
    - Abra a aba **Tools**.
    - **Inspecionar**: Selecione um elemento no canvas para ver seus snippets de código gerados automaticamente.
    - **Mensurar**: Use os controles para adicionar anotações e medidas de distância no seu design.

## 📦 Instalação no Figma

1. Abra o aplicativo Figma Desktop
2. Vá em `Plugins` > `Development` > `Import plugin from manifest...`
3. Selecione o arquivo `manifest.json` na raiz do projeto

## 🤝 Contribuindo

Sinta-se à vontade para abrir issues e PRs. Para contribuições:

1. Crie um branch a partir de `main`: `git checkout -b feature/nome-da-feature`
2. Faça seus commits seguindo boas mensagens: `docs:`, `feat:`, `fix:`, etc.
3. Abra um Pull Request descrevendo claramente as mudanças e passos de teste
