# SolarOps - Plugin para Figma

O SolarOps é uma iniciativa do Studio de UX na AI/R Company pela Compass UOL, que oferece aos clientes parceiros diversas ações para aprimorar seus processos e potencializar os ganhos operacionais em design.

Este plugin tem o objetivo de facilitar e escalar o trabalho de qualidade em projetos de design. Ele funciona como um assistente multifuncional, permitindo realizar auditorias de conformidade, verificar a acessibilidade e fornecer ferramentas que agilizam o handoff para o desenvolvimento.

## ✨ Funcionalidades

O plugin é organizado em três abas principais: **Auditoria**, **Acessibilidade** e **Ferramentas**.

---

### 1. Auditoria de Conformidade

A principal funcionalidade do SolarOps. Realize uma varredura completa em seus frames para garantir a consistência com o Design System.

**Funcionalidades principais:**
- **Verificação de Tokens**: Audita o uso de estilos de cores, tipografia, efeitos, bordas, sombras e espaçamentos, comparando-os com as bibliotecas de tokens configuradas.
- **Análise Detalhada por Categoria**:
  - Cores e preenchimentos
  - Estilos de texto e tipografia
  - Efeitos (sombras, desfoque)
  - Bordas e contornos
  - Espaçamentos (padding, margin, gap)
  - Instâncias quebradas de componentes
- **Relatórios Visuais**: Gera um relatório com score de conformidade, gráficos por categoria e lista detalhada de erros.
- **Correções Inteligentes**: Oferece sugestões de correção automática para a maioria dos erros encontrados.
- **Score de Conformidade**: Indicador visual (percentual) do nível de conformidade do design com o sistema de tokens.
- **Gerenciamento de Bibliotecas**:
  - Importar e ativar bibliotecas de tokens
  - Gerenciar múltiplas fontes de tokens
  - Atualizar tokens salvos no local storage

---

### 2. Acessibilidade

Um conjunto de ferramentas para ajudar a criar projetos mais inclusivos e acessíveis.

#### 2.1 Verificador de Contraste

Analisa o contraste de cor entre texto e fundo seguindo os critérios WCAG 2.2.

- **Modo Automático**: Analisa automaticamente o contraste de todos os elementos de texto no frame selecionado
  - Detecta pares de cores (texto vs fundo) usando captura de imagem real do frame
  - Valida contra normas WCAG (AA, AAA, AA Large)
  - Preview screenshot do frame analisado
  - **Análise em Profundidade** *(switch na parte inferior)*: Quando ativado, verifica todos os elementos internos do objeto de forma individual, gerando uma listagem completa com cada texto, suas cores, razão de contraste e conformidade. Quando desativado, verifica o objeto como um único elemento.
  - Clique no ícone de mira (⊕) em qualquer item da listagem para focar o elemento no canvas — a listagem permanece ativa e o item focado recebe um ✓ azul de confirmação.
- **Modo Manual**: Permite testar contrastes customizados
  - Seletor de cores visual com campo HEX
  - Cálculo em tempo real da razão de contraste
  - Visualização lado a lado das cores testadas
  - Indicação clara de conformidade com WCAG AA/AAA

**Requisitos WCAG:**
| Nível | Texto Normal | Texto Grande (≥18px bold / ≥24px) |
|-------|-------------|-----------------------------------|
| AA    | 4.5:1       | 3:1                               |
| AAA   | 7:1         | 4.5:1                             |

#### 2.2 Simulador de Visão *(novo)*

Simula como pessoas com diferentes tipos de deficiência visual percebem o seu design, diretamente no canvas do Figma.

**Tipos de simulação disponíveis:**
- **Deuteranopia** — Dificuldade de distinguir vermelho e verde (ausência de cones verdes)
- **Protanopia** — Dificuldade de distinguir vermelho (ausência de cones vermelhos)
- **Tritanopia** — Dificuldade de distinguir azul e amarelo (ausência de cones azuis)
- **Acromatopsia** — Visão em escala de cinza (ausência total de percepção de cores)
- **Baixa Acuidade Visual** — Simula visão turva/desfocada com redução de nitidez
- **Cegueira** — Representação extrema de ausência de visão

**Como funciona:**
1. Selecione um frame ou elemento no canvas
2. Abra **Acessibilidade** → **Simulador de Visão**
3. Escolha o tipo de deficiência visual a simular
4. Clique em **Simular** — o plugin cria uma versão processada do frame ao lado do original
5. Compare lado a lado para validar a acessibilidade cromática do seu design
6. Remova a simulação a qualquer momento clicando em **Remover Simulação**

**Benefícios:**
- Identifica problemas de contraste e distinção de cores antes da implementação
- Valida se o design é legível para diferentes perfis de usuários
- Auxilia no atendimento às diretrizes WCAG 1.4 (Distinguível)
- Não modifica o frame original — cria uma cópia de visualização

#### 2.3 Header Marker

Ferramenta para aplicar marcações hierárquicas de headings (H1–H6) em textos do Figma, garantindo estrutura semântica correta.

**Funcionalidades principais:**
- **Marcação Visual**: Aplica marcadores visuais aos textos selecionados com cores distintas por nível
- **Hierarquia Correta**: Cores diferenciadas para cada nível (H1 roxo, H2 laranja, H3 rosa, etc.)
- **Contorno Inteligente**: Marcadores com contorno de 3px e bordas arredondadas (8px) envolvendo o texto
- **Etiquetas Informativas**: Cada marcador exibe o nível (H1, H2, etc.) acima do texto
- **Guia de Hierarquia**: Referência integrada sobre uso correto de headings
- **Remoção Simples**: Remova marcadores individualmente quando necessário

**Como Usar:**
1. Abra a aba **Acessibilidade** → **Header Marker**
2. Selecione um texto no canvas do Figma
3. Clique no botão do heading desejado (H1–H6)
4. O marcador será aplicado automaticamente ao texto

**Guia de Hierarquia:**
- **H1**: Título principal da página. Use apenas um por página.
- **H2**: Seções principais. Divida o conteúdo em tópicos principais.
- **H3**: Subseções. Detalhe tópicos dentro das seções H2.
- **H4-H6**: Níveis adicionais de hierarquia quando necessário.

#### 2.4 Landmarks

Ferramenta para marcar regiões semânticas do layout (header, nav, main, footer, etc.) ajudando leitores de tela a navegar pelo conteúdo.

#### 2.5 Guia WCAG 2.2

- Documentação completa dos critérios WCAG traduzida para português
- **Funcionalidades**:
  - Busca por palavras-chave
  - Filtragem por categoria (Perceptível, Operável, Compreensível, Robusto)
  - Filtragem por nível (A, AA, AAA)
  - Visualização detalhada de cada critério com exemplos

---

### 3. Ferramentas para Desenvolvedores e Designers

Recursos para acelerar o fluxo de trabalho e a comunicação entre design e desenvolvimento.

#### 3.1 Inspeção de Elementos

Selecione qualquer elemento no canvas para gerar automaticamente snippets de código em múltiplos formatos:

- **HTML**: Código estruturado (incluindo SVG embutido para vetores)
- **CSS**: Estilos completos (flexbox, grid, cores, tipografia, bordas, sombras, blur)
- **TypeScript**: Definições de tipos baseadas nas propriedades do nó
- **JSON**: Dados estruturados do nó Figma (IDs, dimensões, propriedades)

#### 3.2 Importar Design

Cole código HTML e CSS para convertê-lo em um design no Figma.

**Como Usar:**
1. Na aba **Ferramentas**, selecione **Importar Design**
2. Cole seu código HTML na caixa de entrada
3. Cole o CSS necessário (opcional)
4. Ajuste o tamanho do viewport (largura × altura em pixels)
5. Clique em **Importar** para criar a interface no Figma

**Recursos Suportados:**
- Elementos HTML semânticos
- Estilos CSS completos (flexbox, grid, gradientes, sombras, etc.)
- Ícones Material Symbols
- Tailwind CSS (via CDN)
- Imagens em data URL

#### 3.3 Ferramenta de Medição

Adicione anotações e medidas visuais diretamente no canvas para documentar especificações de design.

- **Anotações de Texto**: Balões com comentários e especificações
- **Medidas de Distância**: Linhas de cota com dimensões precisas
- **Medidas de Área**: Medição de elementos individuais

#### 3.4 Renomear Layers

Renomeie automaticamente layers e componentes com nomenclatura semântica HTML baseada no tipo e conteúdo do elemento.

**Tags HTML suportadas:** `section`, `div`, `header`, `footer`, `nav`, `main`, `h1`–`h6`, `p`, `span`, `button`, `a`, `input`, `img`, `component`

---

## 🛠 Tecnologias Utilizadas

- **Frontend**: React 17, TypeScript
- **Ferramentas de Build**: Webpack 4, Babel
- **Estilização**: CSS
- **Animações**: Framer Motion

---

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

```bash
yarn build
# ou
npm run build
```

Os arquivos de build serão armazenados no diretório `dist/`.

---

## 📦 Instalação no Figma

1. Abra o aplicativo Figma Desktop
2. Vá em `Plugins` > `Development` > `Import plugin from manifest...`
3. Selecione o arquivo `manifest.json` na raiz do projeto

---

## ⚙️ Configuração de Bibliotecas de Tokens

O SolarOps suporta bibliotecas de tokens JSON para a auditoria de design.

**Passos para importar:**
1. Acesse a aba **Auditoria** → ícone de **Configurações**
2. Clique em **Importar Biblioteca**
3. Selecione seu arquivo JSON de tokens
4. Ative/desative bibliotecas conforme necessário

**Formato esperado:**
```json
{
  "tokenSet": {
    "colors": {
      "primary": { "value": "#18A0FB", "type": "color" }
    },
    "typography": {
      "heading": { "fontSize": "24px", "fontWeight": "bold" }
    }
  }
}
```

**Tipos de tokens suportados:** `color`, `typography`, `sizing`, `spacing`, `shadow`, `border`, `opacity`

---

## 🐛 Troubleshooting

| Problema | Solução |
|----------|---------|
| Auditoria não detecta erros | Verifique se as bibliotecas estão importadas e ativas |
| Plugin não carrega | Reimporte o `manifest.json`, reinicie o Figma |
| Importar Design não funciona | Verifique HTML bem-formatado; CSS externo por URL não é suportado |
| Contraste automático não analisa | Selecione um **frame** (não elementos soltos); o frame deve conter textos |
| Simulador de Visão lento | Frames muito grandes aumentam o tempo de processamento |
| Listagem de contraste piscando | Certifique-se de estar usando a versão mais recente do build |

---

## ⚠️ Limitações Conhecidas

- **Animações**: Não são importadas pelo Importar Design
- **Interatividade**: Prototipagem não é mantida
- **Variáveis dinâmicas**: CSS com `calc()` pode ter comportamento limitado
- **Fontes personalizadas**: Devem estar disponíveis no Figma
- **Simulador de Visão**: Processa somente frames/componentes (não layers soltos)
- **Contraste em profundidade**: Frames muito grandes aumentam o tempo de análise

---

## 🤝 Contribuindo

1. Crie um branch a partir de `main`: `git checkout -b feature/nome-da-feature`
2. Faça seus commits seguindo boas mensagens: `docs:`, `feat:`, `fix:`, etc.
3. Abra um Pull Request descrevendo claramente as mudanças e passos de teste

---

## 📞 Suporte e Feedback

- Reporte bugs abrindo uma issue no repositório
- Sugestões de features são bem-vindas

## 📄 Licença

Este projeto está sob licença MIT. Veja o arquivo `LICENSE` para mais detalhes.
