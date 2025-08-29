import * as React from "react";
import { useState, useEffect } from "react";
import PanelHeader from "./PanelHeader";
import { motion } from "framer-motion/dist/framer-motion";

// Definição dos tipos para os critérios WCAG
interface WCAGCriterion {
  id: string;
  name: string;
  description: string;
  level: "A" | "AA" | "AAA";
  category: "perceivable" | "operable" | "understandable" | "robust";
  details: string;
}

// Dados dos critérios WCAG em português
const wcagCriteria: WCAGCriterion[] = [
  // Critérios de Percepção (Perceivable)
  {
    id: "1.1.1",
    name: "Conteúdo Não Textual",
    description:
      "Todo conteúdo não textual apresentado ao usuário tem uma alternativa textual que serve a um propósito equivalente.",
    level: "A",
    category: "perceivable",
    details:
      "Todo conteúdo não textual (como imagens, botões com imagem, campos de formulário, elementos multimídia) deve ter uma alternativa textual que apresente informação equivalente. Isso permite que pessoas que não podem ver imagens ou ouvir áudio possam acessar o mesmo conteúdo através de tecnologias assistivas."
  },
  {
    id: "1.2.1",
    name: "Apenas Áudio e Apenas Vídeo (Pré-gravado)",
    description:
      "Para mídia somente áudio ou somente vídeo pré-gravada, é fornecida uma alternativa equivalente.",
    level: "A",
    category: "perceivable",
    details:
      "Para conteúdo apenas de áudio pré-gravado, é fornecida uma transcrição textual. Para conteúdo apenas de vídeo pré-gravado, é fornecida uma faixa de áudio ou transcrição textual. Isso garante que pessoas com deficiências visuais ou auditivas possam acessar o conteúdo multimídia."
  },
  {
    id: "1.2.2",
    name: "Legendas (Pré-gravado)",
    description:
      "Legendas são fornecidas para todo conteúdo de áudio pré-gravado em mídia sincronizada.",
    level: "A",
    category: "perceivable",
    details:
      "Legendas são fornecidas para todo conteúdo de áudio pré-gravado em mídia sincronizada, exceto quando a mídia é uma alternativa para texto e está claramente identificada como tal. Isso permite que pessoas surdas ou com deficiência auditiva acessem o conteúdo de áudio."
  },
  {
    id: "1.2.3",
    name: "Audiodescrição ou Mídia Alternativa (Pré-gravado)",
    description:
      "Uma audiodescrição ou mídia alternativa é fornecida para conteúdo de vídeo pré-gravado em mídia sincronizada.",
    level: "A",
    category: "perceivable",
    details:
      "Uma audiodescrição ou mídia alternativa para o conteúdo de vídeo pré-gravado é fornecida para mídia sincronizada, exceto quando a mídia é uma alternativa para texto e está claramente identificada como tal. Isso permite que pessoas cegas ou com baixa visão compreendam o conteúdo visual importante."
  },
  {
    id: "1.3.1",
    name: "Informações e Relações",
    description:
      "A organização estrutural de uma tela deve ser construída de forma que sua arquitetura de informação faça sentido tanto para quem vê, quanto para quem ouve o conteúdo.",
    level: "A",
    category: "perceivable",
    details:
      "As informações, a estrutura e as relações transmitidas através da apresentação podem ser determinadas por meio de código ou estão disponíveis no texto. Quando o conteúdo é estruturado semanticamente com HTML apropriado, os leitores de tela e outras tecnologias assistivas podem fornecer contexto significativo e melhorar a navegação. Isso beneficia pessoas com deficiências visuais, cognitivas e de aprendizagem."
  },
  {
    id: "1.3.2",
    name: "Sequência com Significado",
    description:
      "A sequência de navegação e leitura deve ser lógica e intuitiva, preservando o significado do conteúdo.",
    level: "A",
    category: "perceivable",
    details:
      "Quando a sequência na qual o conteúdo é apresentado afeta seu significado, uma sequência de leitura correta pode ser determinada programaticamente. Isso garante que os usuários de tecnologias assistivas recebam o conteúdo em uma ordem que preserve seu significado, mesmo quando a apresentação visual sugere uma ordem diferente."
  },
  {
    id: "1.3.3",
    name: "Características Sensoriais",
    description:
      "As instruções não devem depender apenas de características sensoriais como forma, cor, tamanho ou localização visual.",
    level: "A",
    category: "perceivable",
    details:
      "As instruções fornecidas para compreender e operar o conteúdo não dependem apenas de características sensoriais dos componentes, como forma, cor, tamanho, localização visual, orientação ou som. Isso garante que pessoas com deficiências visuais ou auditivas possam entender todas as instruções necessárias para usar o conteúdo."
  },
  {
    id: "1.3.4",
    name: "Orientação",
    description:
      "O conteúdo não restringe sua visualização e operação a uma única orientação de tela.",
    level: "AA",
    category: "perceivable",
    details:
      "O conteúdo não restringe sua visualização e operação a uma única orientação de tela, como retrato ou paisagem, a menos que uma orientação específica seja essencial. Isso permite que usuários com dispositivos móveis ou tablets possam acessar o conteúdo independentemente da orientação do dispositivo."
  },
  {
    id: "1.3.5",
    name: "Identificar o Propósito de Entrada",
    description:
      "O propósito de cada campo de entrada que coleta informações sobre o usuário pode ser determinado programaticamente.",
    level: "AA",
    category: "perceivable",
    details:
      "O propósito de cada campo de entrada que coleta informações sobre o usuário pode ser determinado programaticamente quando o campo serve a um propósito identificado nas categorias de propósitos de entrada do usuário. Isso permite que navegadores e tecnologias assistivas apresentem personalizações que ajudem o usuário a preencher formulários."
  },
  {
    id: "1.3.6",
    name: "Identificar o Propósito",
    description:
      "Em conteúdo implementado usando linguagens de marcação, o propósito dos componentes da interface, ícones e regiões pode ser determinado programaticamente.",
    level: "AAA",
    category: "perceivable",
    details:
      "O propósito de componentes da interface do usuário, ícones e regiões pode ser determinado programaticamente. Isso permite que tecnologias assistivas apresentem e ajudem os usuários a entender o propósito de elementos na página web."
  },
  {
    id: "1.4.1",
    name: "Uso da Cor",
    description:
      "A cor não deve ser o único meio visual de transmitir informações, indicar ações, solicitar respostas ou distinguir elementos visuais.",
    level: "A",
    category: "perceivable",
    details:
      "A cor não é usada como o único meio visual de transmitir informações, indicar uma ação, solicitar uma resposta ou distinguir um elemento visual. Isso garante que pessoas com daltonismo ou que não conseguem perceber cores possam acessar as mesmas informações que são transmitidas através de cores."
  },
  {
    id: "1.4.2",
    name: "Controle de Áudio",
    description:
      "Se qualquer áudio em uma página web tocar automaticamente por mais de 3 segundos, deve haver um mecanismo para pausar ou parar o áudio.",
    level: "A",
    category: "perceivable",
    details:
      "Se qualquer áudio em uma página web tocar automaticamente por mais de 3 segundos, deve haver um mecanismo para pausar ou parar o áudio, ou um mecanismo para controlar o volume do áudio independentemente do nível de volume do sistema. Isso evita interferências com tecnologias assistivas e permite que usuários controlem experiências auditivas inesperadas."
  },
  {
    id: "2.1.1",
    name: "Teclado",
    description:
      "Toda funcionalidade deve estar disponível a partir de um teclado, sem requisitos de tempo específicos para pressionamentos de teclas.",
    level: "A",
    category: "operable",
    details:
      "Toda a funcionalidade do conteúdo é operável por meio de uma interface de teclado sem exigir tempos específicos para pressionamentos de teclas individuais, exceto quando a função subjacente requer entrada que depende do caminho do movimento do usuário e não apenas dos pontos finais. Isso beneficia pessoas que não podem usar um mouse ou outros dispositivos apontadores."
  },
  {
    id: "2.1.2",
    name: "Sem Bloqueio de Teclado",
    description:
      "Se o foco do teclado pode ser movido para um componente usando uma interface de teclado, então o foco pode ser movido para fora desse componente usando apenas a interface de teclado.",
    level: "A",
    category: "operable",
    details:
      "Se o foco do teclado pode ser movido para um componente da página usando uma interface de teclado, então o foco pode ser movido para fora desse componente usando apenas uma interface de teclado e, se for necessário mais do que as teclas de seta ou tabulação, o usuário é informado sobre o método para mover o foco para fora. Isso evita que usuários de teclado fiquem presos em partes do conteúdo."
  },
  {
    id: "2.2.1",
    name: "Tempo Ajustável",
    description:
      "Para cada limite de tempo definido pelo conteúdo, pelo menos uma das seguintes opções é verdadeira.",
    level: "A",
    category: "operable",
    details:
      "Para cada limite de tempo definido pelo conteúdo, pelo menos uma das seguintes opções é verdadeira: o usuário pode desligar o limite de tempo, o usuário pode ajustar o limite de tempo, ou o usuário é avisado antes do tempo expirar e tem pelo menos 20 segundos para estender o limite de tempo. Isso garante que usuários com deficiências tenham tempo suficiente para interagir com o conteúdo web."
  },
  {
    id: "2.2.2",
    name: "Pausar, Parar, Ocultar",
    description:
      "Para informações em movimento, em modo intermitente, em deslocamento ou em atualização automática, todas as seguintes opções são verdadeiras.",
    level: "A",
    category: "operable",
    details:
      "Para qualquer informação em movimento, em modo intermitente, em deslocamento ou em atualização automática que (1) seja iniciada automaticamente, (2) dure mais de cinco segundos, e (3) seja apresentada em paralelo com outro conteúdo, existe um mecanismo para o usuário pausar, parar, ou ocultar a informação, a menos que o movimento, o modo intermitente ou o deslocamento faça parte de uma atividade em que seja essencial."
  },
  {
    id: "2.3.1",
    name: "Três Flashes ou Abaixo do Limite",
    description:
      "As páginas web não contêm nada que pisque mais de três vezes em um segundo, ou o flash está abaixo dos limites de flash universal e flash vermelho.",
    level: "A",
    category: "operable",
    details:
      "As páginas web não contêm nada que pisque mais de três vezes em um segundo, ou o flash está abaixo dos limites de flash universal e flash vermelho. Isso protege usuários com epilepsia fotossensível de ter convulsões desencadeadas por conteúdo que pisca."
  },
  {
    id: "2.4.1",
    name: "Ignorar Blocos",
    description:
      "Deve existir um mecanismo para ignorar blocos de conteúdo que se repetem em múltiplas páginas.",
    level: "A",
    category: "operable",
    details:
      "Um mecanismo está disponível para ignorar blocos de conteúdo que são repetidos em várias páginas da web. Isso permite que usuários de tecnologias assistivas naveguem diretamente para o conteúdo principal da página, sem ter que passar por menus de navegação e outros elementos repetitivos em cada página."
  },
  {
    id: "2.4.2",
    name: "Página com Título",
    description:
      "As páginas web têm títulos que descrevem o tópico ou a finalidade.",
    level: "A",
    category: "operable",
    details:
      "As páginas web têm títulos que descrevem o tópico ou a finalidade. Isso ajuda os usuários a identificar rapidamente se o conteúdo da página web é relevante para suas necessidades, especialmente útil para usuários de tecnologias assistivas que podem ter a página web lida para eles pelo título."
  },
  {
    id: "2.4.3",
    name: "Ordem de Foco",
    description:
      "Se uma página web pode ser navegada sequencialmente e as sequências de navegação afetam o significado ou a operação, os componentes que podem receber foco o recebem em uma ordem que preserva o significado e a operabilidade.",
    level: "A",
    category: "operable",
    details:
      "Se uma página web pode ser navegada sequencialmente e as sequências de navegação afetam o significado ou a operação, os componentes que podem receber foco o recebem em uma ordem que preserva o significado e a operabilidade. Isso garante que usuários de teclado possam navegar pelo conteúdo de forma lógica e previsível."
  },
  {
    id: "2.4.4",
    name: "Finalidade do Link (Em Contexto)",
    description:
      "A finalidade de cada link pode ser determinada a partir do texto do link sozinho ou do texto do link juntamente com seu contexto determinado programaticamente.",
    level: "A",
    category: "operable",
    details:
      "A finalidade de cada link pode ser determinada a partir do texto do link sozinho ou do texto do link juntamente com seu contexto determinado programaticamente, exceto quando a finalidade do link for ambígua para os usuários em geral. Isso ajuda todos os usuários a entender para onde um link os levará antes de ativá-lo."
  },
  {
    id: "3.1.1",
    name: "Idioma da Página",
    description:
      "O idioma padrão de cada página deve ser determinado programaticamente.",
    level: "A",
    category: "understandable",
    details:
      "O idioma humano padrão de cada página da web pode ser determinado programaticamente. Isso permite que tecnologias assistivas como leitores de tela apresentem o conteúdo no idioma correto, com a pronúncia e entonação adequadas."
  },
  {
    id: "3.1.2",
    name: "Idioma de Partes",
    description:
      "O idioma de cada passagem ou frase no conteúdo pode ser determinado programaticamente.",
    level: "AA",
    category: "understandable",
    details:
      "O idioma humano de cada passagem ou frase no conteúdo pode ser determinado programaticamente, exceto para nomes próprios, termos técnicos, palavras de idioma indeterminado e palavras ou frases que se tornaram parte do vernáculo do texto imediatamente circundante. Isso permite que tecnologias assistivas alternem entre idiomas quando apresentam conteúdo multilíngue."
  },
  {
    id: "3.2.1",
    name: "Em Foco",
    description:
      "Quando qualquer componente recebe foco, não deve iniciar uma mudança de contexto.",
    level: "A",
    category: "understandable",
    details:
      "Quando qualquer componente da interface do usuário recebe foco, isso não provoca uma mudança de contexto. Isso evita confusão para usuários que navegam com teclado ou tecnologias assistivas, garantindo que o foco em um elemento não cause alterações inesperadas na página."
  },
  {
    id: "3.2.2",
    name: "Em Entrada",
    description:
      "Alterar a configuração de qualquer componente de interface de usuário não provoca automaticamente uma mudança de contexto.",
    level: "A",
    category: "understandable",
    details:
      "Alterar a configuração de qualquer componente da interface do usuário não provoca automaticamente uma mudança de contexto, a menos que o usuário tenha sido avisado sobre o comportamento antes de usar o componente. Isso garante que os usuários não sejam surpreendidos por mudanças inesperadas ao interagir com elementos da página."
  },
  {
    id: "3.2.3",
    name: "Navegação Consistente",
    description:
      "Os mecanismos de navegação que se repetem em múltiplas páginas devem ocorrer na mesma ordem relativa cada vez que são repetidos.",
    level: "AA",
    category: "understandable",
    details:
      "Os mecanismos de navegação que são repetidos em várias páginas da web dentro de um conjunto de páginas da web ocorrem na mesma ordem relativa cada vez que são repetidos, a menos que uma alteração seja iniciada pelo usuário. Isso ajuda os usuários a prever onde encontrarão os mecanismos de navegação em cada página."
  },
  {
    id: "3.2.4",
    name: "Identificação Consistente",
    description:
      "Componentes que têm a mesma funcionalidade dentro de um conjunto de páginas web são identificados de forma consistente.",
    level: "AA",
    category: "understandable",
    details:
      "Componentes que têm a mesma funcionalidade dentro de um conjunto de páginas web são identificados de forma consistente. Isso ajuda os usuários a reconhecer e entender a funcionalidade recorrente em diferentes páginas do site."
  },
  {
    id: "3.2.6",
    name: "Ajuda Consistente",
    description:
      "As informações de ajuda são apresentadas de maneira consistente.",
    level: "A",
    category: "understandable",
    details:
      "Se uma página web contém qualquer uma das seguintes formas de ajuda, elas são apresentadas na mesma ordem relativa em relação a outros conteúdos da página, a menos que uma alteração seja iniciada pelo usuário: ajuda sensível ao contexto, contato humano, formulário de contato, número de telefone, documentação de ajuda, ou chat automatizado. Isso ajuda os usuários a encontrar facilmente ajuda quando necessário."
  },
  {
    id: "3.3.1",
    name: "Identificação de Erro",
    description:
      "Se um erro de entrada for detectado automaticamente, o item que está com erro é identificado e o erro é descrito para o usuário em texto.",
    level: "A",
    category: "understandable",
    details:
      "Se um erro de entrada for detectado automaticamente, o item que está com erro é identificado e o erro é descrito para o usuário em texto. Isso ajuda os usuários a entender quais campos precisam ser corrigidos e como corrigi-los."
  },
  {
    id: "3.3.2",
    name: "Etiquetas ou Instruções",
    description:
      "Etiquetas ou instruções são fornecidas quando o conteúdo exigir entrada de dados por parte do usuário.",
    level: "A",
    category: "understandable",
    details:
      "Etiquetas ou instruções são fornecidas quando o conteúdo exigir entrada de dados por parte do usuário. Isso ajuda os usuários a entender quais dados são esperados em campos de formulário e como formatá-los corretamente."
  },
  {
    id: "3.3.3",
    name: "Sugestão de Erro",
    description:
      "Se um erro de entrada for detectado automaticamente e sugestões para correção forem conhecidas, então as sugestões são fornecidas ao usuário.",
    level: "AA",
    category: "understandable",
    details:
      "Se um erro de entrada for detectado automaticamente e sugestões para correção forem conhecidas, então as sugestões são fornecidas ao usuário, a menos que isso prejudique a segurança ou o propósito do conteúdo. Isso ajuda os usuários a corrigir erros de entrada sem ter que adivinhar o que está errado."
  },
  {
    id: "3.3.4",
    name: "Prevenção de Erros (Legal, Financeiro, Dados)",
    description:
      "Para páginas web que causem compromissos legais ou transações financeiras, que modificam ou excluem dados controlados pelo usuário, ou que enviam respostas de teste do usuário, pelo menos uma das seguintes afirmações é verdadeira.",
    level: "AA",
    category: "understandable",
    details:
      "Para páginas web que causem compromissos legais ou transações financeiras, que modificam ou excluem dados controlados pelo usuário, ou que enviam respostas de teste do usuário, pelo menos uma das seguintes afirmações é verdadeira: as ações são reversíveis, os dados são verificados quanto a erros de entrada e o usuário tem a oportunidade de corrigi-los, ou está disponível um mecanismo para revisar, confirmar e corrigir as informações antes de finalizar o envio."
  },
  {
    id: "3.3.7",
    name: "Entrada Redundante",
    description:
      "As informações previamente inseridas pelo usuário são preenchidas automaticamente ou disponibilizadas para seleção.",
    level: "A",
    category: "understandable",
    details:
      "As informações previamente inseridas pelo usuário em relação a um propósito identificado são preenchidas automaticamente ou disponibilizadas para o usuário selecionar, exceto quando: o preenchimento automático pode prejudicar a segurança, a informação é solicitada novamente para confirmar a entrada anterior, ou a informação não é mais válida. Isso reduz a carga cognitiva e o esforço de entrada repetitiva para todos os usuários."
  },
  {
    id: "3.3.8",
    name: "Autenticação Acessível (Mínimo)",
    description:
      "Para cada etapa de autenticação que depende de um teste cognitivo, pelo menos um método de autenticação alternativo está disponível que não depende de um teste cognitivo.",
    level: "AA",
    category: "understandable",
    details:
      "Para cada etapa de autenticação que depende de um teste cognitivo (como lembrar uma senha ou resolver um quebra-cabeça), pelo menos um método de autenticação alternativo está disponível que não depende de um teste cognitivo. Isso garante que pessoas com deficiências cognitivas possam acessar conteúdo protegido por autenticação."
  },
  {
    id: "4.1.1",
    name: "Análise",
    description:
      "No conteúdo implementado usando linguagens de marcação, os elementos devem ter tags completas de início e fim, e estar aninhados corretamente.",
    level: "A",
    category: "robust",
    details:
      "No conteúdo implementado usando linguagens de marcação, os elementos têm tags completas de início e fim, os elementos são aninhados de acordo com suas especificações, os elementos não contêm atributos duplicados, e quaisquer IDs são exclusivos, exceto onde as especificações permitem essas características. Isso garante que as tecnologias assistivas possam interpretar e analisar o conteúdo de forma confiável."
  },
  {
    id: "4.1.2",
    name: "Nome, Função, Valor",
    description:
      "Para todos os componentes da interface do usuário, o nome e a função podem ser determinados programaticamente; estados, propriedades e valores que podem ser definidos pelo usuário podem ser definidos programaticamente; e a notificação de alterações nesses itens está disponível para agentes de usuário, incluindo tecnologias assistivas.",
    level: "A",
    category: "robust",
    details:
      "Para todos os componentes da interface do usuário, o nome e a função podem ser determinados programaticamente; estados, propriedades e valores que podem ser definidos pelo usuário podem ser definidos programaticamente; e a notificação de alterações nesses itens está disponível para agentes de usuário, incluindo tecnologias assistivas. Isso garante que tecnologias assistivas possam coletar informações sobre, ativar e atualizar componentes da interface do usuário."
  },
  {
    id: "1.4.3",
    name: "Contraste (Mínimo)",
    description:
      "A apresentação visual de texto e imagens de texto tem uma relação de contraste de pelo menos 4.5:1.",
    level: "AA",
    category: "perceivable",
    details:
      "A apresentação visual de texto e imagens de texto tem uma relação de contraste de pelo menos 4,5:1, exceto para texto grande, texto incidental e logotipos. Isso garante que pessoas com baixa visão possam ler o texto apresentado na tela."
  },
  {
    id: "2.4.5",
    name: "Múltiplas Formas",
    description:
      "Mais de um caminho deve estar disponível para localizar uma página dentro de um conjunto de páginas.",
    level: "AA",
    category: "operable",
    details:
      "Mais de um caminho está disponível para localizar uma página da web dentro de um conjunto de páginas da web, exceto quando a página é o resultado de, ou uma etapa em, um processo. Isso permite que os usuários escolham o método de navegação que melhor atenda às suas necessidades e preferências."
  },
  {
    id: "3.2.3",
    name: "Navegação Consistente",
    description:
      "Os mecanismos de navegação que se repetem em múltiplas páginas devem ocorrer na mesma ordem relativa cada vez que são repetidos.",
    level: "AA",
    category: "understandable",
    details:
      "Os mecanismos de navegação que são repetidos em várias páginas da web dentro de um conjunto de páginas da web ocorrem na mesma ordem relativa cada vez que são repetidos, a menos que uma alteração seja iniciada pelo usuário. Isso ajuda os usuários a prever onde encontrarão os mecanismos de navegação em cada página."
  },
  {
    id: "1.4.6",
    name: "Contraste (Melhorado)",
    description:
      "A apresentação visual de texto e imagens de texto tem uma relação de contraste de pelo menos 7:1.",
    level: "AAA",
    category: "perceivable",
    details:
      "A apresentação visual de texto e imagens de texto tem uma relação de contraste de pelo menos 7:1, exceto para texto grande, texto incidental e logotipos. Isso fornece um contraste ainda maior para pessoas com baixa visão severa."
  },
  {
    id: "2.1.3",
    name: "Teclado (Sem Exceção)",
    description:
      "Toda funcionalidade do conteúdo é operável através de uma interface de teclado sem exceções.",
    level: "AAA",
    category: "operable",
    details:
      "Toda a funcionalidade do conteúdo é operável por meio de uma interface de teclado sem exigir tempos específicos para pressionamentos de teclas individuais. Diferente do critério 2.1.1, este critério não permite exceções, garantindo acessibilidade total via teclado."
  },
  {
    id: "3.1.5",
    name: "Nível de Leitura",
    description:
      "Quando o texto exige capacidade de leitura mais avançada, está disponível conteúdo suplementar ou uma versão que não exige capacidade de leitura além do nível fundamental de educação.",
    level: "AAA",
    category: "understandable",
    details:
      "Quando o texto exige capacidade de leitura mais avançada do que o nível fundamental de educação, está disponível conteúdo suplementar ou uma versão que não exige capacidade de leitura além do nível fundamental de educação. Isso ajuda pessoas com dificuldades de leitura ou compreensão a entender o conteúdo."
  },
  {
    id: "2.4.11",
    name: "Foco Não Obscurecido (Mínimo)",
    description:
      "Quando um componente da interface do usuário recebe foco do teclado, o componente não é completamente obscurecido por conteúdo gerado pelo autor.",
    level: "AA",
    category: "operable",
    details:
      "Quando um componente da interface do usuário recebe foco do teclado, o componente não é completamente obscurecido por conteúdo gerado pelo autor. Isso garante que os usuários que navegam com teclado possam sempre ver o elemento que está atualmente em foco."
  },
  {
    id: "2.4.12",
    name: "Aparência do Foco",
    description:
      "Quando um componente da interface do usuário recebe foco do teclado, a indicação de foco é suficientemente forte e contrastante.",
    level: "AAA",
    category: "operable",
    details:
      "Quando um componente da interface do usuário recebe foco do teclado, toda a área do componente que indica o foco tem um contraste de pelo menos 3:1 entre os estados focado e não focado, e a indicação de foco tem uma espessura de pelo menos 2 pixels CSS. Isso garante que os usuários que navegam com teclado possam facilmente identificar qual elemento está atualmente em foco."
  },
  {
    id: "2.5.5",
    name: "Tamanho do Alvo",
    description:
      "O tamanho do alvo para entradas de ponteiro é de pelo menos 44 por 44 pixels CSS.",
    level: "AAA",
    category: "operable",
    details:
      "O tamanho do alvo para entradas de ponteiro é de pelo menos 44 por 44 pixels CSS, exceto quando: equivalente, o alvo está disponível através de um link ou controle equivalente na mesma página que é pelo menos 44 por 44 pixels CSS; inline, o alvo está em uma sentença ou bloco de texto; controle do agente do usuário, o tamanho do alvo é determinado pelo agente do usuário e não é modificado pelo autor; essencial, uma apresentação particular do alvo é essencial para a informação sendo transmitida. Isso facilita o uso para pessoas com limitações motoras."
  },
  {
    id: "2.5.7",
    name: "Movimentos de Arrastar",
    description:
      "Todas as funcionalidades que usam uma ação de arrastar para operação podem ser realizadas por um único ponteiro sem arrastar.",
    level: "AA",
    category: "operable",
    details:
      "Todas as funcionalidades que usam uma ação de arrastar para operação podem ser realizadas por um único ponteiro sem arrastar, a menos que arrastar seja essencial ou a funcionalidade seja determinada pelo agente do usuário e não modificada pelo autor. Isso garante que usuários que não podem realizar ações de arrastar ainda possam acessar todas as funcionalidades."
  },
  {
    id: "3.2.6",
    name: "Ajuda Consistente",
    description:
      "As informações de ajuda são apresentadas de maneira consistente.",
    level: "A",
    category: "understandable",
    details:
      "Se uma página web contém qualquer uma das seguintes formas de ajuda, elas são apresentadas na mesma ordem relativa em relação a outros conteúdos da página, a menos que uma alteração seja iniciada pelo usuário: ajuda sensível ao contexto, contato humano, formulário de contato, número de telefone, documentação de ajuda, ou chat automatizado. Isso ajuda os usuários a encontrar facilmente ajuda quando necessário."
  },
  {
    id: "3.3.7",
    name: "Entrada Redundante",
    description:
      "As informações previamente inseridas pelo usuário são preenchidas automaticamente ou disponibilizadas para seleção.",
    level: "A",
    category: "understandable",
    details:
      "As informações previamente inseridas pelo usuário em relação a um propósito identificado são preenchidas automaticamente ou disponibilizadas para o usuário selecionar, exceto quando: o preenchimento automático pode prejudicar a segurança, a informação é solicitada novamente para confirmar a entrada anterior, ou a informação não é mais válida. Isso reduz a carga cognitiva e o esforço de entrada repetitiva para todos os usuários."
  },
  {
    id: "3.3.8",
    name: "Autenticação Acessível (Mínimo)",
    description:
      "Para cada etapa de autenticação que depende de um teste cognitivo, pelo menos um método de autenticação alternativo está disponível que não depende de um teste cognitivo.",
    level: "AA",
    category: "understandable",
    details:
      "Para cada etapa de autenticação que depende de um teste cognitivo (como lembrar uma senha ou resolver um quebra-cabeça), pelo menos um método de autenticação alternativo está disponível que não depende de um teste cognitivo. Isso garante que pessoas com deficiências cognitivas possam acessar conteúdo protegido por autenticação."
  },
  {
    id: "3.3.9",
    name: "Autenticação Acessível (Aprimorado)",
    description:
      "Para cada etapa de autenticação, um método de autenticação está disponível que não depende de um teste cognitivo ou de memória.",
    level: "AAA",
    category: "understandable",
    details:
      "Para cada etapa de autenticação, um método de autenticação está disponível que não depende de um teste cognitivo ou de memória, a menos que isso prejudique a segurança. Isso fornece um nível ainda mais alto de acessibilidade para pessoas com deficiências cognitivas."
  },
  {
    id: "4.1.3",
    name: "Mensagens de Status",
    description:
      "Em conteúdo implementado usando linguagens de marcação, mensagens de status podem ser determinadas programaticamente através de função ou propriedades.",
    level: "AA",
    category: "robust",
    details:
      "Em conteúdo implementado usando linguagens de marcação, mensagens de status podem ser determinadas programaticamente através de função ou propriedades, de modo que possam ser apresentadas ao usuário por tecnologias assistivas sem receber foco. Isso garante que usuários de tecnologias assistivas sejam informados sobre atualizações importantes sem interrupção da sua tarefa atual."
  },
  {
    id: "2.5.8",
    name: "Tempo de Espera do Ponteiro",
    description:
      "Para cada função que pode ser operada usando um único ponteiro, pelo menos uma das seguintes é verdadeira: sem tempo de espera, a função pode ser completada com um único toque no ponteiro; tempo de espera ajustável, o tempo de espera pode ser ajustado pelo usuário antes de ocorrer; essencial, o tempo de espera é essencial para a função.",
    level: "AAA",
    category: "operable",
    details:
      "Para cada função que pode ser operada usando um único ponteiro, pelo menos uma das seguintes é verdadeira: sem tempo de espera, a função pode ser completada com um único toque no ponteiro; tempo de espera ajustável, o tempo de espera pode ser ajustado pelo usuário antes de ocorrer; essencial, o tempo de espera é essencial para a função. Isso ajuda usuários que podem ter dificuldade em manter um ponteiro parado por períodos prolongados."
  },
  {
    id: "2.4.13",
    name: "Foco Não Obscurecido (Aprimorado)",
    description:
      "Quando um componente da interface do usuário recebe foco do teclado, o componente não é obscurecido por nenhum conteúdo gerado pelo autor.",
    level: "AAA",
    category: "operable",
    details:
      "Quando um componente da interface do usuário recebe foco do teclado, o componente não é obscurecido por nenhum conteúdo gerado pelo autor. Isso garante que os usuários que navegam com teclado possam sempre ver completamente o elemento que está atualmente em foco, sem nenhuma parte dele sendo coberta."
  },
  {
    id: "1.3.6",
    name: "Identificar Propósito",
    description:
      "Em conteúdo implementado usando linguagens de marcação, o propósito dos componentes da interface do usuário, ícones e regiões pode ser determinado programaticamente.",
    level: "AA",
    category: "perceivable",
    details:
      "Em conteúdo implementado usando linguagens de marcação, o propósito dos componentes da interface do usuário, ícones e regiões pode ser determinado programaticamente. Isso permite que tecnologias assistivas apresentem e ajudem os usuários a entender a finalidade dos elementos na interface."
  },
  {
    id: "1.4.13",
    name: "Conteúdo em Hover ou Foco",
    description:
      "Quando o foco do ponteiro ou do teclado aciona conteúdo adicional que se torna visível e depois oculto, o conteúdo pode ser dispensado, apontado e persistente.",
    level: "AA",
    category: "perceivable",
    details:
      "Quando o foco do ponteiro ou do teclado aciona conteúdo adicional que se torna visível e depois oculto, o conteúdo pode ser dispensado sem mover o ponteiro ou o foco, pode ser apontado sem desaparecer, e permanece visível até que o usuário o remova, o ponteiro ou foco seja movido, ou a informação não seja mais válida. Isso garante que usuários possam acessar conteúdo adicional sem perder acesso a ele acidentalmente."
  },
  {
    id: "4.1.3",
    name: "Mensagens de Status",
    description:
      "As mensagens de status podem ser determinadas programaticamente através de função ou propriedades, de modo que possam ser apresentadas ao usuário por tecnologias assistivas sem receber foco.",
    level: "AA",
    category: "robust",
    details:
      "Em conteúdo implementado usando linguagens de marcação, as mensagens de status podem ser determinadas programaticamente por meio de função ou propriedades, de modo que possam ser apresentadas ao usuário por tecnologias assistivas sem receber foco. Isso garante que atualizações importantes sejam comunicadas aos usuários de tecnologias assistivas sem interromper seu trabalho atual."
  },
  {
    id: "2.4.11",
    name: "Foco Não Obscurecido (Mínimo)",
    description:
      "Quando um componente da interface do usuário recebe foco do teclado, o componente não é completamente obscurecido por conteúdo gerado pelo autor.",
    level: "AA",
    category: "operable",
    details:
      "Quando um componente da interface do usuário recebe foco do teclado, o componente não é completamente obscurecido por conteúdo gerado pelo autor. Isso garante que os usuários que navegam com teclado possam sempre ver o elemento que está atualmente em foco."
  },
  {
    id: "2.4.12",
    name: "Foco Não Obscurecido (Aprimorado)",
    description:
      "Quando um componente da interface do usuário recebe foco do teclado, o componente não é obscurecido por nenhum conteúdo gerado pelo autor.",
    level: "AAA",
    category: "operable",
    details:
      "Quando um componente da interface do usuário recebe foco do teclado, o componente não é obscurecido por nenhum conteúdo gerado pelo autor. Isso garante que os usuários que navegam com teclado possam sempre ver completamente o elemento que está atualmente em foco, sem nenhuma parte dele sendo coberta."
  },
  {
    id: "2.5.8",
    name: "Tamanho do Alvo (Mínimo)",
    description:
      "O tamanho do alvo para entradas de ponteiro é de pelo menos 24 por 24 pixels CSS.",
    level: "AA",
    category: "operable",
    details:
      "O tamanho do alvo para entradas de ponteiro é de pelo menos 24 por 24 pixels CSS, exceto quando: equivalente, o alvo está disponível através de um link ou controle equivalente na mesma página que é pelo menos 24 por 24 pixels CSS; inline, o alvo está em uma sentença ou bloco de texto; controle do agente do usuário, o tamanho do alvo é determinado pelo agente do usuário e não é modificado pelo autor; essencial, uma apresentação particular do alvo é essencial para a informação sendo transmitida. Isso facilita o uso para pessoas com limitações motoras."
  },
  {
    id: "2.4.13",
    name: "Aparência do Foco",
    description:
      "Quando um componente da interface do usuário recebe foco do teclado, a indicação de foco é suficientemente forte e contrastante.",
    level: "AAA",
    category: "operable",
    details:
      "Quando um componente da interface do usuário recebe foco do teclado, toda a área do componente que indica o foco tem um contraste de pelo menos 3:1 entre os estados focado e não focado, e a indicação de foco tem uma espessura de pelo menos 2 pixels CSS. Isso garante que os usuários que navegam com teclado possam facilmente identificar qual elemento está atualmente em foco."
  },
  {
    id: "2.5.7",
    name: "Movimentos de Arrastar",
    description:
      "Todas as funcionalidades que usam uma ação de arrastar para operação podem ser realizadas por um único ponteiro sem arrastar.",
    level: "AA",
    category: "operable",
    details:
      "Todas as funcionalidades que usam uma ação de arrastar para operação podem ser realizadas por um único ponteiro sem arrastar, a menos que arrastar seja essencial ou a funcionalidade seja determinada pelo agente do usuário e não modificada pelo autor. Isso garante que usuários que não podem realizar ações de arrastar ainda possam acessar todas as funcionalidades."
  },
  {
    id: "3.3.9",
    name: "Autenticação Acessível (Aprimorado)",
    description:
      "Para cada etapa de autenticação, um método de autenticação está disponível que não depende de um teste cognitivo ou de memória.",
    level: "AAA",
    category: "understandable",
    details:
      "Para cada etapa de autenticação, um método de autenticação está disponível que não depende de um teste cognitivo ou de memória, a menos que isso prejudique a segurança. Isso fornece um nível ainda mais alto de acessibilidade para pessoas com deficiências cognitivas."
  }
];

// Tradução das categorias para português
const categoryTranslations = {
  perceivable: "Perceptível",
  operable: "Operável",
  understandable: "Compreensível",
  robust: "Robusto"
};

interface WCAGContentProps {
  onSearch: (query: string) => void;
  onDocumentSelect: (docId: string) => void;
}

const WCAGContent: React.FC<WCAGContentProps> = ({
  onSearch,
  onDocumentSelect
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [
    selectedCriterion,
    setSelectedCriterion
  ] = useState<WCAGCriterion | null>(null);
  const [filteredCriteria, setFilteredCriteria] = useState<WCAGCriterion[]>(
    wcagCriteria
  );

  // Filtrar critérios com base na busca e categoria selecionada
  useEffect(() => {
    const filterCriteria = () => {
      // Começar com todos os critérios
      let filtered = [...wcagCriteria];

      // Primeiro aplicar filtro de categoria se houver seleção
      if (selectedCategory) {
        filtered = filtered.filter(
          criterion => criterion.category === selectedCategory
        );
      }

      // Depois aplicar filtro de busca se houver query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(
          criterion =>
            criterion.name.toLowerCase().includes(query) ||
            criterion.description.toLowerCase().includes(query) ||
            criterion.id.toLowerCase().includes(query)
        );
      }

      return filtered;
    };

    // Atualizar os critérios filtrados
    setFilteredCriteria(filterCriteria());

    const sortCriteria = (criteria: WCAGCriterion[]) => {
      return [...criteria].sort((a, b) => {
        // Extrair os números do ID (por exemplo, "1.2.3" -> [1, 2, 3])
        const aNumbers = a.id.split(".").map(Number);
        const bNumbers = b.id.split(".").map(Number);

        // Comparar cada parte do número
        for (let i = 0; i < Math.max(aNumbers.length, bNumbers.length); i++) {
          const aNum = aNumbers[i] || 0;
          const bNum = bNumbers[i] || 0;
          if (aNum !== bNum) {
            return aNum - bNum;
          }
        }
        return 0;
      });
    };

    // Aplicar filtragem e ordenação
    const filtered = filterCriteria();
    const sortedFiltered = sortCriteria(filtered);
    setFilteredCriteria(sortedFiltered);
  }, [searchQuery, selectedCategory]);

  // Manipulador para a busca
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch(query);
  };

  // Manipulador para seleção de categoria
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(prevCategory => {
      // Se a categoria clicada é a mesma que já está selecionada, desseleciona
      if (prevCategory === category) {
        return null;
      }
      // Caso contrário, seleciona a nova categoria
      return category;
    });
    // Limpa a busca ao trocar de categoria para evitar conflitos de filtro
    setSearchQuery("");
  };

  // Manipulador para consultar um critério
  const handleConsultCriterion = (criterion: WCAGCriterion) => {
    setSelectedCriterion(criterion);
  };

  // Manipulador para fechar o painel de detalhes
  const handleClosePanel = () => {
    setSelectedCriterion(null);
  };

  // Variantes para animação do painel
  const variants = {
    open: { opacity: 1, x: 0 },
    closed: { opacity: 0, x: "100%" }
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column"
      }}
    >
      {/* Componente de busca */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          margin: 0,
          padding: 0
        }}
      >
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
              placeholder="Buscar critérios WCAG..."
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
              onClick={() => handleSearch(searchQuery)}
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
              value="wcag"
              onChange={e => onDocumentSelect(e.target.value)}
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
              <option value="wcag">WCAG 2.2</option>
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

        {/* Tags de filtro por categoria */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            margin: 0,
            padding: 0,
            marginBottom: "16px"
          }}
        >
          {Object.entries(categoryTranslations).map(([key, value]) => (
            <button
              key={key}
              onClick={() => handleCategorySelect(key)}
              style={{
                background:
                  selectedCategory === key
                    ? "#3b82f6"
                    : "rgba(255, 255, 255, 0.08)",
                border: "none",
                borderRadius: "16px",
                padding: "6px 12px",
                fontSize: "12px",
                color: "#fff",
                cursor: "pointer",
                transition: "background 0.2s",
                height: "28px"
              }}
              onMouseOver={e => {
                if (selectedCategory !== key) {
                  e.currentTarget.style.background = "rgba(59, 130, 246, 0.08)";
                }
              }}
              onMouseOut={e => {
                if (selectedCategory !== key) {
                  e.currentTarget.style.background =
                    "rgba(255, 255, 255, 0.08)";
                }
              }}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de critérios */}
      <div
        style={{
          margin: 0,
          padding: 0,
          paddingBottom: "24px",
          overflowY: "auto",
          flex: 1
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "16px"
          }}
        >
          {filteredCriteria.map((criterion, index) => (
            <div
              key={`${criterion.id}-${index}`}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "8px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                height: "100%"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center"
                  }}
                >
                  <h3
                    style={{
                      margin: 0,
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "#fff"
                    }}
                  >
                    {criterion.id} - {criterion.name}
                  </h3>
                </div>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: "14px",
                  color: "#ffffff",
                  lineHeight: "1.4",
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}
              >
                {criterion.description}
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "auto"
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px"
                  }}
                >
                  <div
                    style={{
                      background:
                        criterion.category === "perceivable"
                          ? "rgba(236, 72, 153, 0.2)"
                          : criterion.category === "operable"
                          ? "rgba(34, 197, 94, 0.2)"
                          : criterion.category === "understandable"
                          ? "rgba(59, 130, 246, 0.2)"
                          : "rgba(249, 115, 22, 0.2)",
                      borderRadius: "16px",
                      padding: "4px 12px",
                      fontSize: "12px",
                      color: "#ffffff"
                    }}
                  >
                    {categoryTranslations[criterion.category]}
                  </div>
                  <div
                    style={{
                      background:
                        criterion.level === "A"
                          ? "#4caf50"
                          : criterion.level === "AA"
                          ? "#ff9800"
                          : "#f44336",
                      borderRadius: "4px",
                      padding: "2px 6px",
                      fontSize: "12px",
                      fontWeight: "bold"
                    }}
                  >
                    {criterion.level}
                  </div>
                </div>
                <button
                  onClick={() => handleConsultCriterion(criterion)}
                  style={{
                    background: "#3b82f6",
                    border: "none",
                    borderRadius: "4px",
                    padding: "6px 12px",
                    fontSize: "12px",
                    color: "#fff",
                    cursor: "pointer",
                    transition: "background 0.2s"
                  }}
                >
                  Consultar critério
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Painel de detalhes do critério */}
      {selectedCriterion && (
        <React.Fragment>
          <motion.div
            className="panel info-panel-root"
            initial={{ opacity: 0, x: "100%" }}
            animate={selectedCriterion ? "open" : "closed"}
            transition={{ duration: 0.3, type: "tween" }}
            variants={variants}
            key="criterion-panel"
            style={{
              zIndex: 1000,
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "100%",
              maxWidth: "500px",
              background: "#2a2a2a",
              boxShadow: "-4px 0 12px rgba(0, 0, 0, 0.2)",
              display: "flex",
              flexDirection: "column"
            }}
          >
            <PanelHeader
              title={`${selectedCriterion.id} ${selectedCriterion.name}`}
              handleHide={handleClosePanel}
            />
            <div
              className="info-panel-content"
              style={{
                padding: "24px",
                overflowY: "auto"
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                  marginBottom: "16px"
                }}
              >
                <div
                  style={{
                    background:
                      selectedCriterion.level === "A"
                        ? "#4caf50"
                        : selectedCriterion.level === "AA"
                        ? "#ff9800"
                        : "#f44336",
                    borderRadius: "4px",
                    padding: "2px 8px",
                    fontSize: "14px",
                    fontWeight: "bold"
                  }}
                >
                  Nível {selectedCriterion.level}
                </div>
                <div
                  style={{
                    background:
                      selectedCriterion.category === "perceivable"
                        ? "rgba(236, 72, 153, 0.2)"
                        : selectedCriterion.category === "operable"
                        ? "rgba(34, 197, 94, 0.2)"
                        : selectedCriterion.category === "understandable"
                        ? "rgba(59, 130, 246, 0.2)"
                        : "rgba(249, 115, 22, 0.2)",
                    borderRadius: "16px",
                    padding: "4px 12px",
                    fontSize: "12px",
                    color: "#ffffff"
                  }}
                >
                  {categoryTranslations[selectedCriterion.category]}
                </div>
              </div>
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  marginBottom: "16px"
                }}
              >
                Descrição
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  lineHeight: "1.6",
                  color: "#e0e0e0",
                  marginBottom: "24px"
                }}
              >
                {selectedCriterion.description}
              </p>
              <h3
                style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  marginBottom: "16px"
                }}
              >
                Detalhes
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  lineHeight: "1.6",
                  color: "#e0e0e0"
                }}
              >
                {selectedCriterion.details}
              </p>
              <div
                style={{
                  marginTop: "32px",
                  padding: "16px",
                  background: "rgba(255, 255, 255, 0.05)",
                  borderRadius: "8px"
                }}
              >
                <h4
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    marginBottom: "8px"
                  }}
                >
                  Referência
                </h4>
                <a
                  href={`https://www.w3.org/TR/WCAG22/#${selectedCriterion.id.replace(
                    ".",
                    "-"
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "#3b82f6",
                    textDecoration: "none",
                    fontSize: "14px"
                  }}
                >
                  WCAG 2.2: {selectedCriterion.id} {selectedCriterion.name}
                </a>
              </div>
            </div>
          </motion.div>
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.5)",
              zIndex: 999
            }}
            onClick={handleClosePanel}
          />
        </React.Fragment>
      )}
    </div>
  );
};

export default WCAGContent;
