// Teste simples para verificar se os tokens estão sendo salvos
// Execute este código no console do Figma para testar

async function testTokenSaving() {
  console.log("=== TESTE DE SALVAMENTO DE TOKENS ===");
  
  // 1. Verificar se há dados salvos
  try {
    const dataFile = await figma.clientStorage.getAsync("data.json");
    console.log("1. Arquivo data.json encontrado:", !!dataFile);
    if (dataFile) {
      const parsed = JSON.parse(dataFile);
      console.log("   - Estrutura:", Object.keys(parsed));
      console.log("   - Tokens:", parsed.tokens ? Object.keys(parsed.tokens) : "nenhum");
    }
  } catch (e) {
    console.log("1. Erro ao carregar data.json:", e.message);
  }
  
  // 2. Verificar todas as chaves no clientStorage
  try {
    const allKeys = await figma.clientStorage.keysAsync();
    console.log("2. Todas as chaves no clientStorage:", allKeys);
  } catch (e) {
    console.log("2. Erro ao listar chaves:", e.message);
  }
  
  // 3. Testar salvamento de tokens simples
  const testTokens = {
    fills: [
      {
        id: "test-fill-1",
        name: "Test Color",
        value: { r: 1, g: 0, b: 0, a: 1 }
      }
    ],
    text: [
      {
        id: "test-text-1", 
        name: "Test Text",
        fontSize: 16
      }
    ]
  };
  
  const fileData = {
    metadata: {
      savedAt: new Date().toISOString(),
      version: "1.0",
      totalTokens: 2
    },
    tokens: testTokens,
    timestamp: new Date().toISOString(),
    filename: "data.json"
  };
  
  try {
    await figma.clientStorage.setAsync("data.json", JSON.stringify(fileData));
    console.log("3. Tokens de teste salvos com sucesso");
    
    // Verificar se foi salvo
    const saved = await figma.clientStorage.getAsync("data.json");
    const parsedSaved = JSON.parse(saved);
    console.log("   - Verificação: tokens salvos =", Object.keys(parsedSaved.tokens));
  } catch (e) {
    console.log("3. Erro ao salvar tokens de teste:", e.message);
  }
  
  console.log("=== FIM DO TESTE ===");
}

// Execute a função
testTokenSaving();