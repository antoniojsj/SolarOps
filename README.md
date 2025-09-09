# SolarOps - Plugin para Figma

O SolarOps é uma iniciativa do Studio de Design da Compass UOL, que oferece aos clientes parceiros diversas ações para aprimorar seus processos e potencializar os ganhos operacionais em design.

Este plugin tem o objetivo de facilitar o trabalho de qualidade nos projetos de design, permitindo realizar uma auditoria de conformidade visual ao comparar o uso dos tokens e componentes do design system da companhia com o projeto analisado.

Além da auditoria de conformidade, o plugin possibilita identificar falhas e corrigi-las rapidamente ainda na fase de projeto. Ele disponibiliza uma ferramenta de análise de contraste para verificar a aplicação de acessibilidade por meio da checagem de contrastes. Também oferece consulta simplificada às documentações de acessibilidade da WCAG, facilitando sua aplicabilidade nos projetos. Além disso, conta com um recurso de inspeção de elementos, que auxilia os desenvolvedores ao fornecer as propriedades necessárias para implementação.

## ✨ Funcionalidades

- **Medição no Canvas (Novo)**:
  - Distância: linha dividida em 2 com gap central e rótulo centralizado (texto acima do fundo)
  - Área: label "L × A = X px²" centralizada no objeto
  - Ângulo: arcos nos cantos (fora do objeto, offset 8px, raio 24, stroke 2) com rótulo do corner radius em px
- **Presets de Medida Rápida**:
  - Distância: Topo, Base, Esquerda, Direita, Centro Horizontal, Centro Vertical
  - Ângulo: Top Left, Top Right, Bottom Left, Bottom Right e Total (insere os 4 cantos)
- **Mostrar/Ocultar Guias**: Alterna a visibilidade de todas as medições do canvas sem removê-las
- **Limpar**: Remove todas as medições criadas
- **Verificador de Contraste**: Analise e valide o contraste entre cores de acordo com as diretrizes WCAG
- **Guia WCAG**: Consulte critérios de acessibilidade WCAG com descrições detalhadas em português
- **Filtragem por Categorias**: Navegue pelos critérios WCAG usando filtros por categorias
- **Documentação Integrada**: Acesse documentação completa sobre acessibilidade e boas práticas


## 🛠 Tecnologias Utilizadas

- **Frontend**: React 17, TypeScript
- **Ferramentas de Build**: Webpack 4, Babel
- **Estilização**: CSS Modules
- **Animações**: Framer Motion
- **Formatação**: Prettier, TSLint

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

## 🧭 Como usar (Medições)

### 1) Presets de Distância
- Selecione um ou mais objetos no canvas
- Na UI do plugin, selecione o modo "Distância" e clique em um preset (Topo, Base, Esquerda, Direita, Centro H/V)
- Uma linha azul é inserida junto ao objeto, dividida em duas com gap central e a label centralizada acima do fundo

### 2) Presets de Ângulo
- Selecione um ou mais objetos
- Selecione o modo "Ângulo" e clique em um canto (Top Left/Right, Bottom Left/Right) ou em "Total" para inserir os 4 cantos
- O arco fica FORA do objeto, a 8px do canto, com raio 24 e stroke 2. A label mostra o valor do corner radius (0px quando não houver)

### 3) Área
- Selecione objetos no modo "Área" para inserir automaticamente a label "L × A = X px²" centralizada

### 4) Mostrar/Ocultar Guias e Limpar
- "Mostrar/Ocultar Guias": alterna a visibilidade de todas as medições sem apagar
- "Limpar": remove todas as medições criadas no canvas

## 📦 Instalação no Figma

1. Abra o aplicativo Figma Desktop
2. Vá em `Plugins` > `Development` > `Import plugin from manifest...`
3. Selecione o arquivo `manifest.json` na raiz do projeto


## 📄 Licença

Este projeto está licenciado sob a licença ISC - veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🤝 Contribuindo

Sinta-se à vontade para abrir issues e PRs. Para contribuições:

1. Crie um branch a partir de `main`: `git checkout -b feature/nome-da-feature`
2. Faça seus commits seguindo boas mensagens: `docs:`, `feat:`, `fix:`, etc.
3. Abra um Pull Request descrevendo claramente as mudanças e passos de teste


