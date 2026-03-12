# SolarOps - Plugin para Figma

O SolarOps é uma iniciativa do Studio de UX na AI/R Company pela Compass UOL, que oferece aos clientes parceiros diversas ações para aprimorar seus processos e potencializar os ganhos operacionais em design.

Este plugin tem o objetivo de facilitar e escalar o trabalho de qualidade em projetos de design. Ele funciona como um assistente multifuncional, permitindo realizar auditorias de conformidade, verificar a acessibilidade e fornecer ferramentas que agilizam o handoff para o desenvolvimento.

## ✨ Funcionalidades

O plugin é organizado em três abas principais: **Auditoria**, **Acessibilidade** e **Ferramentas**.

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
  - Atualizar tokenssalvos no local storage

### 2. Acessibilidade

Um conjunto de ferramentas para ajudar a criar projetos mais inclusivos e acessíveis.

#### 2.1 Verificador de Contraste
- **Modo Automático**: Analisa automaticamente o contraste de todos os elementos de texto no frame selecionado
  - Detecta pares de cores (texto vs fundo)
  - Valida contra normas WCAG (AA, AAA, AAA para texto grande)
  - Gera relatório detalhado com preview screenshot
  - Filtra resultados por nível de conformidade
- **Modo Manual**: Permite testar contrastes customizados
  - Seletor de cores visual
  - Cálculo em tempo real da razão de contraste
  - Visualização lado a lado das cores testadas
  - Indicação clara de conformidade com WCAG AA/AAA
- **Requisitos WCAG**:
  - AA: 4.5:1 (texto normal), 3:1 (texto grande)
  - AAA: 7:1 (texto normal), 4.5:1 (texto grande)

#### 2.2 Guia WCAG 2.2
- Documentação completa dos critérios WCAG traduzida para português
- **Funcionalidades**:
  - Busca por palavras-chave
  - Filtragem por categoria (Perceptível, Operável, Compreensível, Robusto)
  - Filtragem por nível (A, AA, AAA)
  - Visualização detalhada de cada critério com exemplos
  - Acesso rápido a critérios relevantes

### 3. Ferramentas para Desenvolvedores e Designers

Recursos para acelerar o fluxo de trabalho e a comunicação entre design e desenvolvimento.

#### 3.1 Inspeção de Elementos
Selecione qualquer elemento no canvas para gerar automaticamente snippets de código em múltiplos formatos:
- **HTML**: Código estruturado que precisa (incluindo SVG embutido para vetores)
- **CSS**: Estilos completos (flexbox, grid, cores, tipografia, bordas, sombras, blur)
- **TypeScript**: Definições de tipos baseadas nas propriedades do nó
- **JSON**: Dados estruturados do nó Figma (IDs, dimensões, propriedades)

**Recursos suportados:**
- Elementos com posicionamento absoluto
- Layouts flexbox e grid
- Estilos de preenchimento e bordas
- Sombras e efeitos de blur
- Elementos vetoriais (SVG embutido)
- Imagens e ícones
- Cópia com um clique

#### 3.2 Importar Design
Cole código HTML e CSS para convertê-lo em um design no Figma. Converta protótipos web rapidamente em designs de alta fidelidade.

**Como Usar:**
1. Na aba **Ferramentas**, selecione a sub-aba **Importar Design**
2. Cole seu código HTML na caixa de entrada
3. Cole o CSS necessário (opcional, mas recomendado)
4. Ajuste o tamanho do viewport (largura × altura em pixels)
5. Clique em **Importar** para criar a interface no Figma

**Recursos Suportados:**
- Elementos HTML semânticos (div, span, p, h1-h6, button, input, label, etc.)
- Estilos CSS completos:
  - Display (block, inline, flex, grid)
  - Flexbox (justify-content, align-items, gap, etc.)
  - Grid layout
  - Margins, padding, borders
  - Cores, gradientes, backgrounds
  - Tipografia (font-size, font-weight, line-height, etc.)
  - Sombras (box-shadow, text-shadow)
  - Efeitos de blur (backdrop-filter, filter)
  - Opacity e transformações
- Ícones Material Symbols (detectados automaticamente e rasterizados com cores)
- Imagens e SVG embutidos (data URLs)
- Responsive design com ajuste de viewport
- Estados hover/active via comentários CSS

**Dicas para Melhor Resultado:**
- Use viewport de ~375px para mobile, ~1440px para desktop
- Normalize o CSS e remova !important quando possível
- Certifique-se de que ícones possuem classes `material-symbols-*` ou `material-icons`
- Imagens devem ser via data URL ou URLs públicas
- CSS inline é suportado mas CSS externo (em `<style>`) é preferível
- O plugin tentará manter cores, tamanhos e estilos exatos do código

**Informações Técnicas:**
- Renderiza HTML em um iframe
- Converte para estrutura de designs no Figma
- Suporta Tailwind CSS (via CDN)
- Preserva layout flexbox e grid

#### 3.3 Ferramenta de Medição
Adicione anotações e medidas visuais diretamente no canvas para documentar especificações de design.

**Funcionalidades:**
- **Anotações de Texto**: Crie balões/frames com comentários e especificações
- **Medidas de Distância**: 
  - Linhas de cota com dimensões precisas
  - Indicadores visuais de espaçamentos
  - Rótulos customizáveis
- **Criação Rápida**: Interface intuitiva para adicionar medidas
- **Organização**: Agrupe anotações e medidas por área do design

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

## 🧭 Como Usar o Plugin

### Auditoria de Conformidade

1. **Preparar o Setup**:
   - Abra a aba **Auditoria**
   - Acesse **Configurações** (ícone de engrenagem)
   - Importe suas bibliotecas de tokens JSON
   - Configure quais bibliotecas devem ser ativas para a auditoria

2. **Executar a Auditoria**:
   - Selecione um ou mais frames no canvas
   - Clique em **Realizar Auditoria**
   - Aguarde a análise ser processada

3. **Analisar Resultados**:
   - Visualize o score de conformidade geral (percentual)
   - Consulte os gráficos por categoria de error
   - Navegue pela lista de erros encontrados
   - Clique em um erro para destacá-lo no canvas

4. **Aplicar Correções**:
   - Revise as sugestões de correção oferecidas
   - Clique em uma sugestão para aplicar automaticamente
   - Ou corija manualmente no painel direito do Figma
   - Re-execute a auditoria para validar as mudanças

5. **Exportar Relatório**:
   - Ao final da análise, clique em **Exportar Relatório**
   - Baixe um arquivo detalhado em formato JSON ou PDF

### Acessibilidade

#### Verificação de Contraste - Modo Automático

1. Selecione um frame no canvas
2. Abra a aba **Acessibilidade** → **Contraste** → **Automático**
3. Clique em **Analisar Contraste**
4. O plugin analisará todos os textos do frame e gerará um relatório
5. Visualize o preview (screenshot) do frame analisado
6. Filtre resultados por conformidade:
   - ✅ **Passou**: Conformes com WCAG AA/AAA
   - ⚠️ **Aviso**: Parcialmente conforme
   - ❌ **Falho**: Não conformes
7. Clique em um resultado para visuazá-lo no preview

#### Verificação de Contraste - Modo Manual

1. Abra a aba **Acessibilidade** → **Contraste** → **Manual**
2. Use os seletores de cor para escolher:
   - Cor de texto
   - Cor de fundo
3. O contraste será calculado em tempo real
4. Visualize se atende aos critérios:
   - **Normal**: AA (4.5:1) | AAA (7:1)
   - **Grande**: AA (3:1) | AAA (4.5:1)
5. A tabela WCAG abaixo mostra detalhes técnicos

#### Consultando Critérios WCAG

1. Abra a aba **Acessibilidade** → **Documentações**
2. **Busque** por palavra-chave (ex: "contraste", "cor", "texto")
3. **Filtre** por:
   - Categoria (Perceptível, Operável, Compreensível, Robusto)
   - Nível (A, AA, AAA)
4. Clique em um critério para visualizar detalhes completos
5. Leia exemplos e recomendações

### Ferramentas

#### Inspecionar Elemento

1. Abra a aba **Ferramentas** → **Inspecionar**
2. Selecione um elemento no canvas
3. O painel mostrará automaticamente:
   - **HTML**: Estrutura e conteúdo
   - **CSS**: Estilos aplicados
   - **TypeScript**: Tipos de dados
   - **JSON**: Propriedades do nó Figma
4. Clique em qualquer aba para visualizar o código
5. Use o botão **Copiar** para levar o código para sua clipboard
6. Desselecione ou selecione outro elemento para atualizar

#### Importar Design

1. Abra a aba **Ferramentas** → **Importar Design**
2. **Prepare seu código**:
   - Copie o HTML estruturado
   - Certifique-se de que o CSS está disponível (em `<style>` ou em classes)
3. **Cole o código**:
   - Caixa **HTML**: Estrutura da página/componente
   - Caixa **CSS**: Estilos associados (opcional mas recomendado)
4. **Configure o viewport**:
   - Largura: Defina para mobile (~375px) ou desktop (~1440px)
   - Altura: Ajuste conforme a altura do seu conteúdo
5. **Clique em "Importar"**
6. Aguarde o processamento
7. O design será criado como um frame no Figma com:
   - Estrutura de componentes organizados
   - Estilos precisos preservados
   - Cores, tipografia, espaçamentos corretos
   - Imagens e ícones rasterizados

#### Mensuração

1. Abra a aba **Ferramentas** → **Mensurar**
2. **Adicionar Anotação**:
   - Clique em "Adicionar Anotação"
   - Escolha a localização no canvas
   - Escreva o comentário ou especificação
3. **Adicionar Medida**:
   - Clique em "Adicionar Medida"
   - Defina o ponto inicial e final
   - O plugin calculará a distância automaticamente
   - Personalize o rótulo (ex: "padding", "gap")
4. **Gerenciar Medidas**:
   - Visualize lista de anotações
   - Clique para focar no canvas
   - Edite ou remova conforme necessário

#### Renomear Layers

Renomeie camadas automaticamente com nomenclatura semântica baseada em HTML/CSS.

1. Abra a aba **Ferramentas** → **Rename Layers**
2. Selecione um ou mais elementos no canvas
3. Clique em **Renomear Layers**
4. Os elementos serão renomeados seguindo o padrão `tag.classe`

**Regras de renomeação:**
- **Componentes**: `component.button`, `component.input`, `component.card`
  - Detecta automaticamente o tipo (button, input, icon, card, etc.)
  - Ignora nomes genéricos como "Component 01", "Frame 2"
- **Textos**: `h1`, `h2`, `h3`, `p`, `span` (baseado no tamanho da fonte)
- **Containers**: `section` (layout vertical), `div` (layout horizontal ou automático)
- **Imagens**: `img`
- **Botões/Links**: `button`, `a` (detectado pelo nome)

**Exemplos:**
| Nome Original | Nome Renomeado |
|--------------|----------------|
| `Button` | `component.button` |
| `PrimaryButton` | `component.button` |
| `Frame 1` | `div` |
| `Header Section` | `section.header` |
| `Text 24px` | `h2` |

## ⚙️ Configuração

### Configurar Bibliotecas de Tokens

O SolarOps suporta bibliotecas de tokens JSON para a auditoria de design.

**Passos para importar:**
1. Acesse a aba **Auditoria**
2. Clique no ícone de **Configurações** (engrenagem)
3. Clique em **Importar Biblioteca**
4. Selecione seu arquivo JSON de tokens
5. O plugin carregará automaticamente os tokens
6. Ative/desative bibliotecas conforme necessário usando os checkboxes

**Formato esperado de token:**
```json
{
  "tokenSet": {
    "colors": {
      "primary": {
        "value": "#18A0FB",
        "type": "color"
      }
    },
    "typography": {
      "heading": {
        "fontSize": "24px",
        "fontWeight": "bold",
        "lineHeight": "1.2"
      }
    }
  }
}
```

**Tipos de tokens suportados:**
- `color`: Cores em HEX, RGB, HSL
- `typography`: Estilos de fonte (size, weight, line-height, etc.)
- `sizing`: Dimensões e tamanhos
- `spacing`: Espaçamentos (margin, padding, gap)
- `shadow`: Efeitos de sombra
- `border`: Estilos de borda
- `opacity`: Valores de transparência

### Preferências de Auditoria

**Categorias verificadas:**
- Preenched colores
- Tipografia (font-family, size, weight, lineHeight)
- Efeitos (sombras, blur)
- Bordas (stroke, radius)
- Espaçamentos (padding, margin, gap, itemSpacing)

**Níveis de conformidade:**
- ✅ Totalmente conforme
- ⚠️ Parcialmente conforme (similar ao token)
- ❌ Não conforme

## 🔍 Recursos Avançados

### Análise em Lote
- Selecione múltiplos frames para auditar conjuntamente
- O plugin gerará um relatório consolidado com estatísticas gerais
- Identifique padrões de erro entre múltiplos designs

### Histórico de Sessões
- O plugin mantém histórico local das últimas auditorias
- Acesse sessões anteriores para comparar melhorias
- Exporte histórico para acompanhamento

### Filtros e Busca
- **Auditoria**: Filtre erros por tipo, severidade ou frame
- **Acessibilidade**: Filtre critérios WCAG por categoria ou nível
- **Ferramentas**: Busque elementos por nome ou propriedade

## 🐛 Troubleshooting

### Problema: Auditoria não detecta erros
**Solução:**
- Verifique se as bibliotecas foram importadas e ativadas
- Certifique-se de que os elementos possuem estilos aplicados
- Componentes sem estilos diretos podem não ser analisados (use overrides)

### Problema: Plugin não carrega
**Solução:**
- Reinicie o Figma
- Reimporte o manifest.json
- Verifique se há conflito com outros plugins
- Limpar cache local: Abra DevTools (Cmd+Alt+J) e execute `localStorage.clear()`

### Problema: Importar Design não funciona
**Solução:**
- Verifique se o HTML está bem formatado (sem erro de sintaxe)
- CSS externo (via URL) não é suportado, use `<style>` ou estilos inline
- Tamanho do viewport muito grande pode causar travamento
- Imagens precisam estar em data URL ou URLs públicas acessíveis

### Problema: Contraste automático não analisa
**Solução:**
- Selecione um frame (não apenas elementos soltos)
- Certifique-se que o frame contém elementos de texto
- Textos muito pequenos ou transparentes podem ser ignorados
- Tente modo manual para testar cores específicas

### Problema: Código gerado está incompleto
**Solução:**
- Selecione elementos com estilos aplicados
- Componentes com apenas design visual (sem CSS) podem gerar código limitado
- Vetores complexos podem ter SVG expandido muito grande
- Instâncias de componentes podem ter comportamento diferente

## ⚠️ Limitações Conhecidas

- **Animações**: Não são importadas (Importar Design)
- **Interatividade**: Prototipagem não é mantida
- **Variáveis dinâmicas**: CSS com calc() pode ter comportamento limitado
- **Fontes personalizadas**: Devem estar disponíveis no Figma
- **Tamanho máximo**: Frames muito grandes pode causar lentidão
- **Multi-layer**: Elementos muito aninhados podem não ser importados perfeitamente

## 📋 Padrões de Nomenclatura Recomendados

Para melhor funcionamento do plugin:

**Tokens:**
```
colors/primary
colors/secondary
typography/heading-lg
spacing/md
shadow/default
```

**Elementos no Figma:**
```
Frame/CardProduct
Button/Primary
Text/Label
Icon/ChevronRight
```

## 📞 Suporte e Feedback

- Reporte bugs abrindo uma issue no repositório
- Sugestões de features são bem-vindas
- Documentação completa disponível em nossa wiki

## 📄 Licença

Este projeto está sob licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📦 Instalação no Figma

1. Abra o aplicativo Figma Desktop
2. Vá em `Plugins` > `Development` > `Import plugin from manifest...`
3. Selecione o arquivo `manifest.json` na raiz do projeto

## 🤝 Contribuindo

Sinta-se à vontade para abrir issues e PRs. Para contribuições:

1. Crie um branch a partir de `main`: `git checkout -b feature/nome-da-feature`
2. Faça seus commits seguindo boas mensagens: `docs:`, `feat:`, `fix:`, etc.
3. Abra um Pull Request descrevendo claramente as mudanças e passos de teste
