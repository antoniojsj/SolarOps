# Sherlock - Plugin para Figma

O SolarOps é uma iniciativa do Studio de Design da Compass UOL, que oferece aos clientes parceiros diversas ações para aprimorar seus processos e potencializar os ganhos operacionais em design.

Este plugin tem o objetivo de facilitar o trabalho de qualidade nos projetos de design, permitindo realizar uma auditoria de conformidade visual ao comparar o uso dos tokens e componentes do design system da companhia com o projeto analisado.

Além da auditoria de conformidade, o plugin possibilita identificar falhas e corrigi-las rapidamente ainda na fase de projeto. Ele disponibiliza uma ferramenta de análise de contraste para verificar a aplicação de acessibilidade por meio da checagem de contrastes. Também oferece consulta simplificada às documentações de acessibilidade da WCAG, facilitando sua aplicabilidade nos projetos. Além disso, conta com um recurso de inspeção de elementos, que auxilia os desenvolvedores ao fornecer as propriedades necessárias para implementação.

## ✨ Funcionalidades

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
   git clone https://github.com/antoniojsj/sherlock.git
   cd sherlock
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

## 📦 Instalação no Figma

1. Abra o aplicativo Figma Desktop
2. Vá em `Plugins` > `Development` > `Import plugin from manifest...`
3. Selecione o arquivo `manifest.json` na raiz do projeto


## 📄 Licença

Este projeto está licenciado sob a licença ISC - veja o arquivo [LICENSE](LICENSE) para mais detalhes.

