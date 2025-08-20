# Sherlock - Plugin para Figma

O Sherlock é um poderoso plugin para o Figma projetado para aprimorar o fluxo de trabalho de design com recursos avançados e utilitários. Construído com tecnologias web modernas, o Sherlock oferece uma experiência fluida para designers e desenvolvedores.


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

