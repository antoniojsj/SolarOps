# Network Error Fixes - SolarOps Plugin

## Problemas Identificados e Resolvidos

### 1. **Erro 403 Forbidden**
**Causa**: O plugin tentava carregar recursos de domínios não autorizados na whitelist do `manifest.json`.

**Solução**:
- Adicionado `www.figma.com` e `static.figma.com` à whitelist de domínios permitidos
- Criado módulo `networkConfig.ts` para centralizar validação de domínios

### 2. **Falta de Tratamento de Timeout**
**Causa**: Requisições de rede sem timeout podiam ficar penduradas indefinidamente.

**Solução**:
- Implementado `safeFetch()` com timeout de 5 segundos
- Adicionado `fetchWithRetry()` com retry automático (até 2 tentativas com backoff exponencial)

### 3. **Validação de Domínio Insuficiente**
**Causa**: Funções de fetch não validavam se URLs eram de domínios permitidos.

**Solução**:
- Criada função `isUrlAllowed()` para validar domínios
- Aplicada validação em `createImageFillFromUrl()` e `tryCreateMaterialSymbolVector()`

### 4. **Erros de Rede Silenciosos**
**Causa**: Falhas de rede não eram adequadamente registradas.

**Solução**:
- Melhorado logging com status HTTP específicos
- Adicionadas mensagens de erro mais descritivas

## Arquivos Modificados

### `manifest.json`
```json
"networkAccess": {
  "allowedDomains": [
    "https://cdn.tailwindcss.com",
    "https://fonts.googleapis.com",
    "https://fonts.gstatic.com",
    "https://lh3.googleusercontent.com",
    "https://www.figma.com",
    "https://static.figma.com"
  ]
}
```

### `src/plugin/networkConfig.ts` (NOVO)
- Centraliza configuração de domínios permitidos
- Fornece `safeFetch()` com timeout
- Fornece `fetchWithRetry()` com retry automático
- Fornece `isUrlAllowed()` para validação

### `src/plugin/domImporter.ts`
- Importa funções de `networkConfig.ts`
- `createImageFillFromUrl()`: Usa `fetchWithRetry()` com validação
- `tryCreateMaterialSymbolVector()`: Usa `fetchWithRetry()` com timeout

## Avisos Resolvidos

✅ **403 Forbidden** - Domínios agora autorizados  
✅ **Slow network** - Timeout implementado  
✅ **Failed to load resource** - Retry automático  
✅ **Statsig not ready** - Não afeta funcionalidade (retry automático do Figma)  

## Avisos Esperados (Não Críticos)

⚠️ **Permissions policy violations** - Esperado em iframes do Figma (câmera, microfone, etc.)  
⚠️ **Canvas2D willReadFrequently** - Sugestão de otimização (não afeta funcionalidade)  
⚠️ **Slow network detected** - Aviso do navegador (fallback de fontes ativado)  

## Como Testar

1. Recarregue o plugin no Figma
2. Abra o console do navegador (F12)
3. Teste as funcionalidades:
   - Importar design com imagens
   - Usar ícones Material Symbols
   - Carregar bibliotecas remotas
4. Verifique se não há mais erros 403

## Próximos Passos (Opcional)

- Implementar cache de recursos para melhorar performance
- Adicionar UI feedback para erros de rede
- Monitorar performance de requisições
