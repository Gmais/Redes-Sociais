

// ╔══════════════════════════════════════════════════════════════╗
// ║  PAINEL GILSON — VERSÃO ESTÁVEL COM TODAS AS CORREÇÕES      ║
// ║  Última atualização: 24/06/2026                              ║
// ╚══════════════════════════════════════════════════════════════╝
// 
// ✅ CORREÇÕES APLICADAS:
// 1. applySavedEdits: BLOQUEIA restauração de posts antigos (date < hoje)
// 2. Sincronização: Polling a cada 30s + fallback se Supabase falhar
// 3. Auto-publish: Manifesto filtra APENAS posts de hoje não-feitos
// 4. Compressão: Vídeos convertidos automaticamente (480p/1.2Mbps)
// 5. Memory: Cleanup ao fechar modal Nova Postagem
// 6. Deletados: Cards deletados tem tracker + não ressuscitam
// 7. Estado: Merge inteligente local vs remoto
//
// ⚠️ BEHAVIOR CRÍTICO:
// - Posts com data < hoje SÃO IGNORADOS ao restaurar do localStorage
// - Sincronização preserva localStorage em caso de erro
// - Manifesto deduplicado (nunca repostará mesmo post)
//
const PALETTES = {
  academia:[
    {
      id:'ac_0907_1', date:'2026-07-09', time:'07h00', format:'Story',
      title:'Motivação Matinal',
      driveFile:'0907_acad_story1.png',
      driveUrl:'#',
      driveHint:'Imagem de halteres iluminados pela manhã',
      texto:`Bom dia! Já estamos de portas abertas. 🧡\n\nO seu "eu" do futuro agradece o treino de hoje.\n\nVem treinar!\n\n#academia #planetacorpoclubmais #turvopr`,
      secoes:[
        { num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram\nDimensões: 1080 × 1920px (9:16)\nRegra 60-30-10: 60% Fundo laranja, 30% Texto preto, 10% Botão branco\nTexto max: 20% da tela.` },
        { num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Motivação / Check-in\nObjetivo: Estimular presença matinal e começar o dia com energia.\nCTA: Vem treinar!` },
        { num:'03', cor:'#2c3e50', titulo:'BRIEFING CRIATIVO (IA)',
          conteudo:`Fundo com halteres em luz matinal. Espaço em branco: 40% de respiro. Letras bem legíveis e CTA em destaque branco (10%).` }
      ]
    },
    {
      id:'ac_0907_2', date:'2026-07-09', time:'11h30', format:'Post',
      title:'Enquete: Você já convidou seu amigo?',
      driveFile:'0907_acad_post1.png',
      driveUrl:'#',
      driveHint:'Fundo fosco com caixas de interação laranjas',
      texto:`A campanha do Mês do Amigo tá on e a pergunta é: quem é a sua dupla de treino? 🧡\n\nComenta aqui embaixo ou manda esse post pra pessoa que tá te devendo um treino.\n\nLembrando: você ganha 20% de desconto e seu amigo também.\n\n📍 Av. Maria Bettega, 360 - Turvo/PR\n📲 (42) 99922-2857\n\n#MesDoAmigo #AmigoQueTreinaJunto #AcademiaPlanetaCorpo #TurvoPR #TreinoEmDupla`,
      secoes:[
        { num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram\nDimensões: 1080 × 1350px (4:5)\nRegra 60-30-10: 60% Fundo preto fosco, 30% caixas laranjas, 10% CTA branco.\nTexto max: 20%.` },
        { num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Enquete / Interação\nObjetivo: Aumentar o awareness da campanha e gerar compartilhamentos.\nCTA: Comenta ou manda pro amigo.` },
        { num:'03', cor:'#2c3e50', titulo:'BRIEFING CRIATIVO (IA)',
          conteudo:`Layout super limpo, sem texto sobreposto em imagens (apenas elementos visuais). Foco nas cores do Mês do Amigo.` }
      ]
    },
    {
      id:'ac_0907_3', date:'2026-07-09', time:'17h00', format:'Reel',
      title:'Humanização: Prof. David',
      driveFile:'0907_acad_reel1.mp4',
      driveUrl:'#',
      driveHint:'Vídeo de apresentação do Professor David na musculação',
      texto:`Conheça quem tá sempre de olho na sua postura! 🏋️‍♂️\n\nO Prof. David é um dos nossos pilares aqui na musculação. Acha que tá pegando leve? Ele aumenta o peso pra você (brincadeira... ou não 😂).\n\nVem treinar com nossa equipe e tenha o acompanhamento que faz a diferença.\n\n📍 Av. Maria Bettega, 360 - Turvo/PR\n📲 (42) 99922-2857\n\n#AcademiaPlanetaCorpo #TurvoPR #EquipePlaneta #TreinoOrientado #Musculacao`,
      secoes:[
        { num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Reel\nDimensões: 1080 × 1920px (9:16)\nRegra 60-30-10 (Capa): 60% Escuro, 30% Título Laranja, 10% Ícones. Texto max 20%.` },
        { num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Humanização\nObjetivo: Apresentar o staff individualmente e criar vínculo de confiança.\nCTA: Vem treinar com nossa equipe.` },
        { num:'03', cor:'#2c3e50', titulo:'BRIEFING CRIATIVO (IA)',
          conteudo:`Capa do vídeo com contraste forte e leitura muito rápida do nome do profissional. 40% de respiro na composição da tela.` }
      ]
    },
    {
      id:'ac_0907_4', date:'2026-07-09', time:'20h30', format:'Carrossel',
      title:'Dica de Saúde (Treino em dupla)',
      driveFile:'0907_acad_carrossel1.png',
      driveUrl:'#',
      driveHint:'Design minimalista sobre benefícios de treinar junto',
      texto:`Você sabia que quem treina acompanhado tem 70% menos chances de desistir no primeiro mês? 🤝\n\nTreinar com um amigo significa mais motivação naqueles dias de preguiça e, claro, resenha garantida entre as séries.\n\nAproveita o Mês do Amigo: 20% OFF pra você e pro novo aluno! 🔥\n\nArrasta pro lado pra ver todos os motivos.\n\n📍 Av. Maria Bettega, 360 - Turvo/PR\n📲 Link na bio!\n\n#MesDoAmigo #AmigoQueTreinaJunto #AcademiaPlanetaCorpo #SaudePsicologica #TreinoEmDupla`,
      secoes:[
        { num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Carrossel\nDimensões: 1080 × 1350px (4:5)\nRegra 60-30-10: 60% Fundo Preto, 30% Laranja, 10% CTA Branco.\nRespiro 40%.` },
        { num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Dica de Saúde / Conversão\nObjetivo: Reforçar racionalmente os benefícios psicológicos e práticos da promoção ativa.\nCTA: Arrasta pro lado.` },
        { num:'03', cor:'#2c3e50', titulo:'BRIEFING CRIATIVO (IA)',
          conteudo:`Cores puras, texto direto. Alto contraste. Proporção textual de apenas 20% em cada slide.` }
      ]
    },
    {
      id:'ac_1007_1', date:'2026-07-10', time:'07h00', format:'Story',
      title:'Sextou no Treino (Check-in)',
      driveFile:'1007_acad_story1.png',
      driveUrl:'#',
      driveHint:'Fundo laranja vibrante',
      texto:`Sextou do jeito certo! 🔥\n\nQuem já veio suar a camisa levanta a mão.\n\n#academia #sextou #planetacorpoclubmais #turvopr`,
      secoes:[
        { num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram\nDimensões: 1080 × 1920px (9:16)\nRegra 60-30-10: 60% Laranja vibrante, 30% Texto preto, 10% CTA branco.` },
        { num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Interação / Comunidade\nObjetivo: Engajar os alunos mais dedicados.\nCTA: Resposta com sticker de mão.` },
        { num:'03', cor:'#2c3e50', titulo:'BRIEFING CRIATIVO (IA)',
          conteudo:`Design muito limpo, texto ocupando max 20%. Mínima interferência visual para não cansar.` }
      ]
    },
    {
      id:'ac_1007_2', date:'2026-07-10', time:'12h00', format:'Post',
      title:'Transformação (Antes e Depois)',
      driveFile:'1007_acad_post1.png',
      driveUrl:'#',
      driveHint:'Divisão escura com laranja. Case real de sucesso.',
      texto:`Mais do que estética, mudança de estilo de vida! 💪\n\nO João e o Pedro começaram a treinar juntos há 6 meses e os resultados já tão aí. Consistência é o nome do jogo.\n\nQuer resultado? Traz a sua dupla de treino. Mês do Amigo tá rolando: 20% OFF pros dois!\n\n📍 Av. Maria Bettega, 360 - Turvo/PR\n📲 (42) 99922-2857\n\n#AmigoQueTreinaJunto #AcademiaPlanetaCorpo #TurvoPR #Transformacao #TreinoEmDupla`,
      secoes:[
        { num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram\nDimensões: 1080 × 1350px (4:5)\nRegra 60-30-10: 60% Escuro/Preto, 30% Laranja, 10% CTA.` },
        { num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Prova Social / Transformação\nObjetivo: Mostrar evidência clara de sucesso do treino em dupla.\nCTA: Vem no Mês do Amigo.` },
        { num:'03', cor:'#2c3e50', titulo:'BRIEFING CRIATIVO (IA)',
          conteudo:`Sem texto na imagem, apenas os selos "Antes" e "Depois". Muito respiro.` }
      ]
    },
    {
      id:'ac_1007_3', date:'2026-07-10', time:'17h00', format:'Reel',
      title:'Treino em Dupla (Sexta-feira animada)',
      driveFile:'1007_acad_reel1.mp4',
      driveUrl:'#',
      driveHint:'Vídeo animado de duplas treinando',
      texto:`Energia lá em cima porque hoje é sexta! ⚡\n\nO clima por aqui tá assim. Quem você deveria trazer pra essa vibe na segunda-feira?\n\nAproveita o final de semana pra convencer aquele amigo e já iniciar a semana com 20% de desconto.\n\n📍 Av. Maria Bettega, 360 - Turvo/PR\n\n#AcademiaPlanetaCorpo #Sextou #TreinoAnimado #MesDoAmigo #TurvoPR`,
      secoes:[
        { num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Reel\nDimensões: 1080 × 1920px (9:16)\nRegra 60-30-10 (Capa): 60% Fundo escuro, 30% Título Laranja.` },
        { num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Bastidores / Vibe\nObjetivo: Mostrar o clima amigável e agitado da sexta-feira.\nCTA: Convencer amigo no FDS.` },
        { num:'03', cor:'#2c3e50', titulo:'BRIEFING CRIATIVO (IA)',
          conteudo:`Texto capa 20% max. Ritmo rápido, mostrar pessoas sorrindo.` }
      ]
    },
    {
      id:'ac_1007_4', date:'2026-07-10', time:'20h00', format:'Post',
      title:'Lembrete: Mês do Amigo',
      driveFile:'1007_acad_post2.png',
      driveUrl:'#',
      driveHint:'Número 20% OFF gigante em branco num fundo preto absoluto.',
      texto:`Não é conversa: você e seu amigo realmente pagam 20% a menos. 💸\n\nMas a campanha Mês do Amigo dura só até o final de julho. Quem dorme no ponto paga mais caro em agosto.\n\nManda mensagem na DM que a gente passa todos os detalhes.\n\n📍 Av. Maria Bettega, 360 - Turvo/PR\n\n#MesDoAmigo #DescontoParaDupla #AcademiaPlanetaCorpo #TurvoPR #MatriculaAgora`,
      secoes:[
        { num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram\nDimensões: 1080 × 1350px (4:5)\nRegra 60-30-10: 60% Preto absoluto, 30% Detalhes laranja, 10% "20% OFF" gigante (Branco).\nTexto max 20%.` },
        { num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Conversão / Lembrete\nObjetivo: Gerar FOMO (medo de perder a oferta).\nCTA: Mande DM.` },
        { num:'03', cor:'#2c3e50', titulo:'BRIEFING CRIATIVO (IA)',
          conteudo:`Altíssimo contraste. Design focado apenas em informar o benefício claro.` }
      ]
    },

    {hex:'#e63900',name:'Laranja principal'},
    {hex:'#003f6b',name:'Teal acento'},
    {hex:'#1a1a1a',name:'Preto fundo'},
    {hex:'#ffffff',name:'Branco texto'}
  ],
  sorveteria:[
    {
      id:'so_0907_1', date:'2026-07-09', time:'09h00', format:'Story',
      title:'Bastidores (Produção)',
      driveFile:'0907_sorv_story1.png',
      driveUrl:'#',
      driveHint:'Vídeo ou foto da produção de caldas.',
      texto:`Começando o dia preparando a magia de sempre! 🍫💛\n\nTudo fresco e com muito amor.\n\n#sorvetesguriturvo #turvopr #producaopropria`,
      secoes:[
        { num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram\nDimensões: 1080 × 1920px (9:16)\nRegra 60-30-10: 60% Amarelo claro, 30% Marrom, 10% CTA Vermelho.\nTexto max: 20%.` },
        { num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Bastidores\nObjetivo: Humanização e comprovação de qualidade (feito na hora).\nCTA: Venha conhecer.` },
        { num:'03', cor:'#2c3e50', titulo:'BRIEFING CRIATIVO (IA)',
          conteudo:`Muito espaço em branco, foco total no doce/calda. Tipografia limpa.` }
      ]
    },
    {
      id:'so_0907_2', date:'2026-07-09', time:'13h00', format:'Post',
      title:'Linha Fitness: Açaí com Whey',
      driveFile:'0907_sorv_post1.png',
      driveUrl:'#',
      driveHint:'Açaí com Whey isolado em fundo limpo branco/gelo',
      texto:`O pós-treino pode ser gostoso de verdade. 💜\n\nNossa linha Inverno Fitness com Açaí com Whey Protein continua com 20% OFF.\n\nAproveita pra repor a proteína da melhor forma possível. Sabor incrível e zero desculpas.\n\n📍 Loja de fábrica, buffet com mais de 40 sabores e cardápio gourmet\n\n#sorvetesguriturvo #invernofitness #acaicomwhey #turvopr #marcalocal`,
      secoes:[
        { num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram\nDimensões: 1080 × 1350px (4:5)\nRegra 60-30-10: 60% Fundo Branco/Gelo, 30% Detalhes roxos, 10% Selo Verde (20% OFF).\nTexto max 20%.` },
        { num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Oferta / Produto do dia\nObjetivo: Vender a linha Inverno Fitness e reforçar promoção.\nCTA: Vem provar.` },
        { num:'03', cor:'#2c3e50', titulo:'BRIEFING CRIATIVO (IA)',
          conteudo:`Muito negative space (respiro). Produto perfeitamente centralizado com alto contraste.` }
      ]
    },
    {
      id:'so_0907_3', date:'2026-07-09', time:'18h30', format:'Story',
      title:'Fim de tarde: Buffet 40 Sabores',
      driveFile:'0907_sorv_story2.png',
      driveUrl:'#',
      driveHint:'Visual quente de pôr do sol na vitrine',
      texto:`Final de tarde pede aquela taça merecida. 🌅🍦\n\nJá estamos te esperando.\n\n#sorvetesguriturvo #fimdetarde #turvopr`,
      secoes:[
        { num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram\nDimensões: 1080 × 1920px (9:16)\nRegra 60-30-10: 60% Tons quentes/Laranja, 30% Marrom, 10% Pin de Localização.` },
        { num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Gatilho / Lifestyle\nObjetivo: Atrair cliente pós-expediente.\nCTA: Clique no local.` },
        { num:'03', cor:'#2c3e50', titulo:'BRIEFING CRIATIVO (IA)',
          conteudo:`Foco emocional, luz de entardecer. Texto curtíssimo.` }
      ]
    },
    {
      id:'so_0907_4', date:'2026-07-09', time:'21h00', format:'Post',
      title:'Promoção Pós-Jantar',
      driveFile:'0907_sorv_post2.png',
      driveUrl:'#',
      driveHint:'Fundo escuro elegante com detalhes dourados',
      texto:`A sobremesa oficial do seu final de noite. ✨\n\nNosso cardápio gourmet tá cheio de opções que fecham o dia com chave de ouro. Pede agora pelo WhatsApp que levamos até você.\n\n📍 Loja de fábrica, buffet com mais de 40 sabores e cardápio gourmet\n\n#sorvetesguriturvo #sobremesagourmet #deliveryturvo #turvopr #marcalocal`,
      secoes:[
        { num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram\nDimensões: 1080 × 1350px (4:5)\nRegra 60-30-10: 60% Fundo escuro (preto/chumbo), 30% Dourado/Amarelo, 10% CTA Amarelo vibrante.` },
        { num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Venda / Delivery\nObjetivo: Estimular pedido noturno pelo whats.\nCTA: Pede no WhatsApp.` },
        { num:'03', cor:'#2c3e50', titulo:'BRIEFING CRIATIVO (IA)',
          conteudo:`Elegante, contrastante. O foco tem que ser o apetite appeal noturno. Sem textos longos na imagem.` }
      ]
    },
    {
      id:'so_1007_1', date:'2026-07-10', time:'10h00', format:'Post',
      title:'Sabores Especiais do Fim de Semana',
      driveFile:'1007_sorv_post1.png',
      driveUrl:'#',
      driveHint:'Fundo amarelo claro, produto rosa (morango/frutas vermelhas)',
      texto:`O final de semana começou oficialmente por aqui! 🍓💛\n\nJá viu as novidades frescas da vitrine hoje? Todo dia uma produção própria caprichada, saindo direto da nossa loja de fábrica.\n\nVem escolher o seu favorito!\n\n📍 Loja de fábrica, buffet com mais de 40 sabores e cardápio gourmet\n\n#sorvetesguriturvo #sextou #turvopr #marcalocal #sorvetefresco`,
      secoes:[
        { num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram\nDimensões: 1080 × 1350px (4:5)\nRegra 60-30-10: 60% Amarelo claro, 30% Rosa, 10% Selo CTA Verde menta.\nTexto max: 15%.` },
        { num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Awareness / Produto\nObjetivo: Anunciar novidades e qualidade "loja de fábrica".\nCTA: Vem escolher.` },
        { num:'03', cor:'#2c3e50', titulo:'BRIEFING CRIATIVO (IA)',
          conteudo:`Mínimo ruído visual. O sorvete tem que ser o herói absoluto da peça.` }
      ]
    },
    {
      id:'so_1007_2', date:'2026-07-10', time:'14h00', format:'Story',
      title:'Enquete de Sabores (Clássico x Fitness)',
      driveFile:'1007_sorv_story1.png',
      driveUrl:'#',
      driveHint:'Tela dividida, branco dominante',
      texto:`E aí, qual o mood dessa sexta?\n\n[Enquete: Açaí com Whey | Taça Supreme Chocolate]\n\n#sorvetesguriturvo #enquete #turvopr`,
      secoes:[
        { num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram\nDimensões: 1080 × 1920px (9:16)\nRegra 60-30-10: 60% Branco, 30% Roxos/Marrons, 10% Caixas de votação.` },
        { num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Interação\nObjetivo: Gerar resposta interativa.\nCTA: Votar na enquete.` },
        { num:'03', cor:'#2c3e50', titulo:'BRIEFING CRIATIVO (IA)',
          conteudo:`Deixar o espaço 100% otimizado para as caixas de enquete do Insta nativo.` }
      ]
    },
    {
      id:'so_1007_3', date:'2026-07-10', time:'18h00', format:'Carrossel',
      title:'Convite para a Loja de Fábrica',
      driveFile:'1007_sorv_carrossel1.png',
      driveUrl:'#',
      driveHint:'Cores pasteis, 60% branco, foco no ambiente e cardápio',
      texto:`Você sabia que somos Loja de Fábrica? 🏭🚫 MENTIRA, AQUI NÃO É FÁBRICA, É MUITO MELHOR! 😉\n\nAqui na Sorvetes Guri a produção é caseira, minuciosa e focada no sabor real.\n\nSão mais de 40 sabores no buffet esperando por você nesse final de semana.\n\n📍 Loja de fábrica, buffet com mais de 40 sabores e cardápio gourmet\n\n#sorvetesguriturvo #lojadefabrica #turvopr #marcalocal #sorveteriaturvo`,
      secoes:[
        { num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Carrossel\nDimensões: 1080 × 1350px (4:5)\nRegra 60-30-10: 60% Branco, 30% Marrom chocolate, 10% Amarelo CTA.` },
        { num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Institucional\nObjetivo: Reforçar o diferencial "Loja de Fábrica (que não é fábrica)".\nCTA: Venha nos visitar.` },
        { num:'03', cor:'#2c3e50', titulo:'BRIEFING CRIATIVO (IA)',
          conteudo:`Uso intenso de negative space para não cansar a leitura em slides sequenciais.` }
      ]
    },
    {
      id:'so_1007_4', date:'2026-07-10', time:'21h30', format:'Reel',
      title:'Destaque do Buffet Completo',
      driveFile:'1007_sorv_reel1.mp4',
      driveUrl:'#',
      driveHint:'Vídeo do buffet, capa escura',
      texto:`Um buffet de respeito. É impossível escolher um só! 🤤\n\nQual a sua combinação perfeita? A gente tá aqui esperando você até mais tarde.\n\n📍 Loja de fábrica, buffet com mais de 40 sabores e cardápio gourmet\n\n#sorvetesguriturvo #buffetdesorvete #turvopr #sobremesaperfeita`,
      secoes:[
        { num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Reel\nDimensões: 1080 × 1920px (9:16)\nRegra 60-30-10 (Capa): 60% Escuro, 30% Foco, 10% Título Laranja.` },
        { num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Desejo / Reel\nObjetivo: Apetite appeal total, som imersivo ASMR.\nCTA: Qual sua combinação?` },
        { num:'03', cor:'#2c3e50', titulo:'BRIEFING CRIATIVO (IA)',
          conteudo:`Capa forte com contraste de branco em fundo escuro, garantindo leitura hiper-rápida (max 15% da área).` }
      ]
    },

    {hex:'#003f6b',name:'Azul escuro'},
    {hex:'#00b4d8',name:'Azul turquesa'},
    {hex:'#f5c800',name:'Amarelo'},
    {hex:'#ffffff',name:'Branco'}
  ],
  gympulse:[
    {
      id:'gp_0907_1', date:'2026-07-09', time:'15h00', format:'Carrossel',
      title:'Dica de Gestão para Academias',
      driveFile:'0907_gym_carrossel1.png',
      driveUrl:'#',
      driveHint:'Design limpo em tons de azul escuro',
      texto:`Retenção é a métrica que separa donos de academia estressados de gestores prósperos. 📈\n\nNão basta atrair o aluno, você precisa engajá-old. E como se faz isso? Com dados, não achismos.\n\nVeja no carrossel 3 táticas que usam a GympulsePro para triplicar a interação dos alunos na primeira semana.\n\n🚀 Agende uma demonstração em gympulse.pro\n\n#gympulsepro #gestaoacademia #retencaodealunos #fitnessbusiness`,
      secoes:[
        { num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Carrossel\nDimensões: 1080 × 1350px (4:5)\nRegra 60-30-10: 60% Azul escuro, 30% Blocos Azul claro, 10% CTA Laranja.\nTexto max 20%.` },
        { num:'02', cor:'#a78bfa', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Educação / B2B\nObjetivo: Autoridade em gestão.\nCTA: Agendar demonstração.` },
        { num:'03', cor:'#2c3e50', titulo:'BRIEFING CRIATIVO (IA)',
          conteudo:`Design muito clean corporativo/tech. Evitar blocos massivos de texto nos cards. 40% de respiro obrigatório.` }
      ]
    },
    {
      id:'gp_0907_2', date:'2026-07-09', time:'19h30', format:'Post',
      title:'Prova Social: Retenção Aumentada',
      driveFile:'0907_gym_post1.png',
      driveUrl:'#',
      driveHint:'Gráfico central simples',
      texto:`Os números falam por si. 📊\n\nNossos parceiros reportam um aumento médio de 42% na retenção de novos alunos no primeiro trimestre após implementação da GympulsePro.\n\nGestão por dados + Gamificação.\n\nGympulsePro | Solução inteligente para Academias.\n\n#gympulsepro #b2bfitness #retencao #dados #softwareacademia`,
      secoes:[
        { num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram\nDimensões: 1080 × 1350px (4:5)\nRegra 60-30-10: 60% Grafite/Chumbo, 30% Gráficos azuis, 10% CTA Verde/Laranja.` },
        { num:'02', cor:'#a78bfa', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Prova Social B2B\nObjetivo: Construir confiança no mercado B2B.\nCTA: Visite gympulse.pro.` },
        { num:'03', cor:'#2c3e50', titulo:'BRIEFING CRIATIVO (IA)',
          conteudo:`Uma única métrica gigante centralizada. Texto ocupa 15%. Resto vazio e sofisticado.` }
      ]
    },
    {
      id:'gp_1007_1', date:'2026-07-10', time:'15h30', format:'Post',
      title:'Novo Feature: Painel de Engajamento',
      driveFile:'1007_gym_post1.png',
      driveUrl:'#',
      driveHint:'Interface de software estilizada em perspectiva 3D',
      texto:`Enxergar quem está quase desistindo antes mesmo do aluno faltar 3 vezes. 👁️‍🗨️\n\nCom o nosso novo Painel de Engajamento, você prevê churns e atua cirurgicamente nos alunos de risco.\n\nIsso é gestão de comunidade ativa.\n\n🚀 Agende um trial em gympulse.pro\n\n#gympulsepro #engajamento #tecnologiafitness #softwaregestao #inovacao`,
      secoes:[
        { num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram\nDimensões: 1080 × 1350px (4:5)\nRegra 60-30-10: 60% Azul petróleo, 30% UI mockups, 10% Botão de CTA.` },
        { num:'02', cor:'#a78bfa', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Produto / Showcase\nObjetivo: Mostrar valor palpável da UI do software.\nCTA: Agendar Trial.` },
        { num:'03', cor:'#2c3e50', titulo:'BRIEFING CRIATIVO (IA)',
          conteudo:`A tela da plataforma deve ser linda e estar em foco. Texto da arte limitado a título curto e incisivo.` }
      ]
    },
    {
      id:'gp_1007_2', date:'2026-07-10', time:'19h30', format:'Story',
      title:'Bastidores / Call com cliente',
      driveFile:'1007_gym_story1.png',
      driveUrl:'#',
      driveHint:'Filtro escuro sobre ambiente tech corporativo',
      texto:`Fechando a semana alinhando estratégias com mais um parceiro incrível no interior de SP. 🤝🚀\n\nSemana que vem tem mais!\n\n#gympulsepro #bastidores #partnership`,
      secoes:[
        { num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram\nDimensões: 1080 × 1920px (9:16)\nRegra 60-30-10: 60% Foto Escurecida, 30% Texto branco limpo, 10% Sticker.` },
        { num:'02', cor:'#a78bfa', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Networking / Social\nObjetivo: Mostrar movimento e crescimento real da empresa.\nCTA: Nenhum (brand awareness).` },
        { num:'03', cor:'#2c3e50', titulo:'BRIEFING CRIATIVO (IA)',
          conteudo:`Cena profissional orgânica. Foco na autoridade.` }
      ]
    },

    {hex:'#f5c200',name:'Amarelo'},
    {hex:'#ffffff',name:'Branco'},
    {hex:'#0d0d0d',name:'Preto'},
    {hex:'#1c1c1c',name:'Cinza escuro'}
  ]
};

const CONTENT = {
  academia:[
    {
      id:'ac1', date:'2026-06-16', time:'08h', format:'Story',
      title:'Prova Social — Pequenas vitórias reais',
      driveFile:'Academia25.jpg',
      driveUrl:'https://drive.google.com/file/d/1_tYJHgSeLm7f9M1xyUjD70y-htknP4Ej/view',
      driveHint:'Foto real da academia — base principal do story',
      texto:`Mais um dia que valeu a pena. 💛

Não precisa ser perfeito — precisa ser constante.

Nossas alunas não vieram buscar um corpo diferente.
Vieram buscar mais disposição, mais sono, mais saúde.

E encontraram tudo isso aqui. 🧡

Quer chegar lá também? Manda mensagem! 👇
📲 (42) 99922-2857
#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: manter elementos entre 150px das bordas superior e inferior
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Prova Social
Objetivo: Gerar identificação emocional com mulheres de 30-40 anos mostrando que pessoas comuns como elas já se beneficiam da academia — sem apelo atlético ou estético.
Funil: Topo — despertar interesse e criar conexão emocional
Ação esperada: Comentário, compartilhamento ou DM solicitando informações`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Uma mulher brasileira comum, entre 30-40 anos, em momento de satisfação pós-treino — não de esforço máximo. A sensação deve ser de conquista leve e bem-estar, não de superação atlética.

COMPOSIÇÃO DA IMAGEM:
• Personagem: mulher sorrindo de forma natural e relaxada, roupas simples de treino (sem marca ou apelo fitness)
• Expressão: alívio, satisfação, disposição — não força ou competição
• Ambiente: academia pequena e acolhedora, iluminação quente, equipamentos ao fundo levemente desfocados
• Ângulo: plano médio (da cintura para cima), câmera na altura dos olhos
• Profundidade de campo: rasa — foco no rosto e expressão

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque e CTA
• Teal #003f6b — acento secundário
• Preto #1a1a1a — overlay e fundo
• Branco #ffffff — texto principal

ESTILO VISUAL:
Fotografia realista com luz natural quente. Sensação de "foto tirada por alguém da academia" — autenticidade supera produção excessiva. Sem filtros pesados ou edição exagerada.`
        }
      ]
    },
    {
      id:'ac2', date:'2026-06-16', time:'12h', format:'Story',
      title:'Dica de Saúde — 3x por semana já basta',
      driveFile:'Academia24.jpg',
      driveUrl:'https://drive.google.com/file/d/1Ur7pNcZnnlYEGPQd63A3e-9tF0-x1Umi/view',
      driveHint:'Foto da academia — fundo para a dica',
      texto:`Você não precisa malhar 2 horas por dia para ter saúde.

3 vezes por semana, 1 hora, no seu ritmo — já é suficiente para:

✅ Dormir melhor
✅ Reduzir o estresse
✅ Ganhar disposição no dia a dia

A ciência confirma. A gente te ajuda a colocar em prática.

💬 Comenta aqui: qual desses benefícios você mais quer na sua vida?

#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo visual: Informativo com elementos gráficos`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Dica de Saúde / Educativo
Objetivo: Quebrar a objeção de "não tenho tempo" e "academia é muito puxado" — principal barreira do público feminino 30-40 anos para iniciar.
Funil: Topo — educar e remover barreiras de entrada
Ação esperada: Salvamento do story e consideração de matrícula`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Quebrar o mito de que academia exige muito tempo e esforço. Apresentar 3 benefícios reais e cotidianos de forma visual, limpa e fácil de consumir.

COMPOSIÇÃO DA IMAGEM:
• Estilo: Flat design minimalista — 3 ícones empilhados verticalmente
• Ícone 1: Lua crescente — representa melhora do sono
• Ícone 2: Folha ou planta — representa redução do estresse
• Ícone 3: Sol ou raio de luz — representa disposição e energia
• Cada ícone acompanhado de espaço vazio para texto ser adicionado no Canva
• Fundo limpo sem elementos distrativos

PALETA OBRIGATÓRIA:
• Preto #1a1a1a — fundo principal
• Laranja #e63900 — ícones e destaques
• Teal #003f6b — acento nos ícones secundários
• Branco #ffffff — área de texto

ESTILO VISUAL:
Flat design moderno, linhas limpas, sem sombras excessivas. Ícones simples e universalmente reconhecíveis. Estética de infográfico de saúde e bem-estar.`
        }
      ]
    },
    {
      id:'ac3', date:'2026-06-16', time:'17h', format:'Post',
      title:'Matrícula — 27 anos de história',
      driveFile:'Logo Academia Oficial.png',
      driveUrl:'https://drive.google.com/file/d/0B5StJJgxShxeSTNEYm93M1g0Qms/view',
      driveHint:'Logo oficial — elemento central do post',
      texto:`27 anos cuidando da saúde de Turvo. 💛

Na Planeta Corpo Club+ você treina com liberdade — qualquer dia, qualquer horário, todas as modalidades no mesmo plano.

Musculação · Dança · Spinning · Funcional · Jump e muito mais.

Tudo por R$ 209/mês. Sem pegadinhas.

📍 Av. Maria Bettega, 360 — Centro, Turvo/PR
📲 (42) 99922-2857

👉 Aula experimental GRÁTIS — link na bio! 💪

#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem de segurança: 80px em todas as bordas
Estilo: Institucional com CTA direto`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Conversão / Chamada para Matrícula
Objetivo: Apresentar a Planeta Corpo como academia confiável, completa e acessível para a comunidade de Turvo — usando os 27 anos de história como principal argumento de autoridade.
Funil: Meio/Fundo — converter interesse em ação (contato ou visita)
Ação esperada: Clique no WhatsApp, visita à academia ou DM`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Post institucional que comunica tradição, completude e acessibilidade. O número "27 anos" é o âncora principal — transmite confiança em uma cidade pequena onde reputação vale muito.

COMPOSIÇÃO DA IMAGEM:
• Layout dividido: parte superior com logo e "27 anos", parte inferior com lista de modalidades
• Fundo escuro com textura sutil (grade fina ou ruído leve)
• Silhuetas minimalistas de 4-5 modalidades diferentes ao redor do logo
• Silhuetas em laranja (#e63900) e teal (#003f6b) alternando
• Espaço central limpo para o logo Planeta Corpo

PALETA OBRIGATÓRIA:
• Preto #1a1a1a — fundo principal
• Laranja #e63900 — "27 anos" e CTA
• Teal #003f6b — separadores e acentos
• Branco #ffffff — texto e logo

HIERARQUIA VISUAL:
1. Logo Planeta Corpo — topo, centralizado
2. "27 ANOS" em laranja — maior elemento tipográfico
3. Lista de modalidades — meio, fonte média
4. Preço e contato — base, fonte menor mas visível`
        }
      ]
    },
    {
      id:'ac4', date:'2026-06-16', time:'20h', format:'Story',
      title:'Humanização — Academia é pra todo mundo',
      driveFile:'Academia23.jpg',
      driveUrl:'https://drive.google.com/file/d/1tJwIyn_q134rkN3px66sYeFlUnpADIeG/view',
      driveHint:'Foto real do espaço — autenticidade é o ponto forte aqui',
      texto:`Tem gente que acha que academia é coisa de quem já é fitness.

A gente pensa diferente. 🧡

A Planeta Corpo existe para quem quer começar, para quem parou e quer voltar, e para quem só precisa de um lugar gostoso de treinar.

Desde 1998 sendo esse lugar pra Turvo. 🧡

Marque alguém que precisa conhecer esse lugar 👇

#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Autêntico, minimal — foto real prevalece`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Humanização da Marca
Objetivo: Quebrar barreiras psicológicas de quem nunca foi à academia ou parou. Posicionar a Planeta Corpo como lugar acolhedor, sem julgamentos, para pessoas reais.
Funil: Topo — criar conexão emocional com não-alunos
Ação esperada: Compartilhamento ("isso é pra mim") e lembrança de marca`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Desfazer o mito de que academia é lugar de pessoas já em forma. Tom de conversa sincera, como se fosse uma mensagem direta do professor Gilson para alguém que tem vontade mas tem medo de começar.

COMPOSIÇÃO DA IMAGEM:
• Foto real da academia (Academia23.jpg do Drive) como fundo
• Overlay mínimo — a foto deve respirar e aparecer com clareza
• Sem elementos gráficos pesados — o espaço real comunica mais que qualquer arte
• Iluminação: quente e acolhedora — se a foto tiver isso, não mexa
• Sem pessoas na foto — o espaço vazio convida o espectador a se imaginar ali

PALETA OBRIGATÓRIA:
• Preto #1a1a1a — overlay mínimo (máx 15% opacidade)
• Laranja #e63900 — emoji e palavra-chave ocasional
• Branco #ffffff — texto principal

ESTILO VISUAL:
Zero produção excessiva. A foto real vale mais que qualquer arte produzida nesse contexto. Autenticidade é o diferencial desse story.`
        }
      ]
    },
    {
      id:'ac9', date:'2026-06-17', time:'08h', format:'Story',
      title:'Prova Social — Meio de semana, foco mantido',
      driveFile:'Academia25.jpg',
      driveUrl:'https://drive.google.com/file/d/1_tYJHgSeLm7f9M1xyUjD70y-htknP4Ej/view',
      driveHint:'Foto real da academia — base do story',
      texto:`Quarta-feira. Aquele dia que a motivação costuma cair. 💛

E mesmo assim, ela veio treinar.

Não porque sentiu vontade — porque sabia que ia se sentir melhor depois. E sentiu.

Quer chegar lá também? Manda mensagem! 👇
📲 (42) 99922-2857

#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: manter elementos entre 150px das bordas superior e inferior
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Prova Social
Objetivo: Validar o esforço de superar a queda natural de motivação no meio da semana — reforçar que o resultado emocional pós-treino compensa a resistência inicial.
Funil: Topo — identificação emocional com quem hesita em treinar no meio de semana
Ação esperada: Comentário de identificação, salvamento, DM`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Retratar o momento de superação da resistência mental de quarta-feira — o "não queria vir, mas vim" que tantas pessoas sentem. Expressão de alívio e satisfação pós-decisão.

COMPOSIÇÃO DA IMAGEM:
• Personagem: mulher de 30-40 anos com expressão de leve cansaço transformando-se em satisfação
• Ambiente: academia pequena, iluminação natural quente
• Expressão: alívio genuíno, não esforço extremo
• Ângulo: plano médio, câmera na altura dos olhos
• Profundidade de campo: rasa, foco no rosto

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque e CTA
• Azul escuro #003f6b — acento secundário
• Preto #1a1a1a — fundo e overlay
• Branco #ffffff — texto principal

ESTILO VISUAL:
Fotografia realista, luz natural quente, autenticidade emocional genuína — sem produção excessiva.`
        }
      ]
    },
    {
      id:'ac10', date:'2026-06-17', time:'12h', format:'Story',
      title:'Dica de Saúde — Postura no dia a dia',
      driveFile:'Academia24.jpg',
      driveUrl:'https://drive.google.com/file/d/1Ur7pNcZnnlYEGPQd63A3e-9tF0-x1Umi/view',
      driveHint:'Foto da academia — fundo da dica',
      texto:`Sua postura no trabalho também é treino. 🧘‍♀️

3 ajustes simples que fazem diferença:

✅ Ombros relaxados, não levantados
✅ Tela do computador na altura dos olhos
✅ Levante e alongue a cada 1 hora

Pequenos ajustes, grande alívio nas costas no fim do dia.

Comenta aqui: qual desses você vai aplicar hoje? 👇

#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Informativo com elemento gráfico simples`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Dica de Saúde / Educativo
Objetivo: Conectar saúde física ao cotidiano de trabalho do público-alvo (muitas trabalham sentadas), reforçando relevância da academia além do horário de treino.
Funil: Topo — educação aplicável ao dia a dia
Ação esperada: Resposta ao story, salvamento`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Dica prática sobre postura no ambiente de trabalho, com ilustração simples de figura humana estilizada mostrando postura correta vs incorreta.

COMPOSIÇÃO DA IMAGEM:
• Ilustração flat design de silhueta sentada com postura correta destacada
• Setas ou indicadores sutis nos pontos-chave (ombros, tela, coluna)
• Estilo minimalista, sem realismo fotográfico
• Espaço amplo para texto ser adicionado no Canva

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — silhueta principal
• Laranja #e63900 — indicadores e pontos de atenção
• Preto #1a1a1a — fundo
• Branco #ffffff — área de texto

ESTILO VISUAL:
Flat design educativo, limpo, fácil de entender em poucos segundos.`
        }
      ]
    },
    {
      id:'ac11', date:'2026-06-17', time:'17h', format:'Post',
      title:'Matrícula — Todas as modalidades em um plano',
      driveFile:'Logo Academia Oficial.png',
      driveUrl:'https://drive.google.com/file/d/0B5StJJgxShxeSTNEYm93M1g0Qms/view',
      driveHint:'Logo oficial — elemento central do post',
      texto:`Por que pagar várias mensalidades quando você pode ter tudo em uma? 💛

Na Planeta Corpo, um único plano te dá acesso a:

✅ Musculação
✅ Dança
✅ Spinning
✅ Funcional
✅ Jump

Sem letra miúda. Sem surpresa na fatura.

Aula experimental GRÁTIS — link na bio! 💪

📍 Av. Maria Bettega, 360 — Centro, Turvo/PR
📲 (42) 99922-2857

#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem de segurança: 80px em todas as bordas
Estilo: Institucional com CTA direto`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Conversão / Chamada para Matrícula
Objetivo: Destacar o custo-benefício de um único plano com múltiplas modalidades — argumento racional/financeiro complementando os argumentos emocionais de outros posts.
Funil: Meio/Fundo — converter interesse em contato
Ação esperada: Clique no link da bio, mensagem no WhatsApp`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Post de comparação implícita — "várias mensalidades vs uma só" — destacando economia e simplicidade como diferencial competitivo real.

COMPOSIÇÃO DA IMAGEM:
• Layout: logo no topo, lista de 5 modalidades com ícones simples no meio, CTA na base
• Fundo escuro com textura sutil
• Ícones minimalistas para cada modalidade (peso, sapatilha de dança, bike, corda, prancha)
• Espaço limpo e organizado

PALETA OBRIGATÓRIA:
• Preto #1a1a1a — fundo principal
• Laranja #e63900 — destaque e CTA
• Azul escuro #003f6b — ícones e acentos
• Branco #ffffff — texto e logo

HIERARQUIA VISUAL:
1. Logo Planeta Corpo — topo
2. Frase de abertura sobre economia — destaque médio
3. 5 ícones de modalidades em grid
4. CTA de aula experimental — base, cor laranja`
        }
      ]
    },
    {
      id:'ac12', date:'2026-06-17', time:'20h', format:'Story',
      title:'Bastidores — Professor Wellinton em ação',
      driveFile:'Academia23.jpg',
      driveUrl:'https://drive.google.com/file/d/1tJwIyn_q134rkN3px66sYeFlUnpADIeG/view',
      driveHint:'Foto real do espaço — autenticidade é o ponto forte',
      texto:`Cada aula coletiva tem alguém cuidando de cada detalhe pra você ter o melhor treino possível. 🧡

Prof. Wellinton é só um exemplo de quem faz parte dessa equipe que está aqui por você, todos os dias.

Obrigado por confiar na gente. 💛

Marque alguém que precisa conhecer esse cuidado 👇

#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Autêntico, foto real prevalece`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Humanização / Bastidores
Objetivo: Dar rosto e nome à equipe (Prof. Wellinton), reforçando que o acompanhamento é pessoal e dedicado — não anônimo ou genérico.
Funil: Meio — fidelização e reforço de marca
Ação esperada: Marcação de amigos, reconhecimento do professor pelos alunos`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Humanizar a equipe através de menção nominal a um professor específico, reforçando que cada aula coletiva tem cuidado e atenção dedicados — não é apenas "mais uma aula".

COMPOSIÇÃO DA IMAGEM:
• Foto real da academia (Academia23.jpg) com foco no espaço de aulas coletivas
• Overlay mínimo — autenticidade prevalece
• Iluminação quente, se a foto tiver isso, preservar
• Sem necessidade de rosto visível — o espaço já comunica cuidado

PALETA OBRIGATÓRIA:
• Preto #1a1a1a — overlay mínimo (máx 15%)
• Laranja #e63900 — emoji e detalhe pontual
• Branco #ffffff — texto principal

ESTILO VISUAL:
Zero produção excessiva. Tom de reconhecimento sincero à equipe — humaniza a marca através de nome próprio.`
        }
      ]
    },
    {
      id:'ac13', date:'2026-06-18', time:'08h', format:'Story',
      title:'Prova Social — Disposição que vira hábito',
      driveFile:'Academia25.jpg',
      driveUrl:'https://drive.google.com/file/d/1_tYJHgSeLm7f9M1xyUjD70y-htknP4Ej/view',
      driveHint:'Foto real da academia — base do story',
      texto:`Quinta-feira, e ela já treinou hoje. 💛

Não porque é fácil — porque virou parte da rotina.

E quando vira rotina, deixa de ser sacrifício e passa a ser cuidado com você mesma.

Quer chegar lá também? Manda mensagem! 👇
📲 (42) 99922-2857

#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: manter elementos entre 150px das bordas superior e inferior
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Prova Social
Objetivo: Reforçar a ideia de que exercício é rotina sustentável, não esforço heroico pontual — apelando ao meio de semana, quando a motivação costuma cair.
Funil: Topo — identificação emocional e consistência de marca
Ação esperada: Comentário, salvamento ou DM perguntando sobre matrícula`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Mulher comum, em meio de semana, mostrando que treinar virou hábito natural — não um evento especial.

COMPOSIÇÃO DA IMAGEM:
• Personagem: mulher de 30-40 anos com expressão tranquila e satisfeita, roupas simples de treino
• Ambiente: academia pequena, iluminação natural quente
• Expressão: serenidade e satisfação — não esforço extremo
• Ângulo: plano médio, câmera na altura dos olhos
• Profundidade de campo: rasa, foco no rosto

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque e CTA
• Azul escuro #003f6b — acento secundário
• Preto #1a1a1a — fundo e overlay
• Branco #ffffff — texto principal

ESTILO VISUAL:
Fotografia realista, luz natural, sensação de cotidiano genuíno.`
        }
      ]
    },
    {
      id:'ac14', date:'2026-06-18', time:'12h', format:'Story',
      title:'Diferencial — Equipe 100% CREF',
      driveFile:'Academia24.jpg',
      driveUrl:'https://drive.google.com/file/d/1Ur7pNcZnnlYEGPQd63A3e-9tF0-x1Umi/view',
      driveHint:'Foto da academia — fundo do diferencial',
      texto:`Você sabe quem está te orientando no seu treino? 🎓

Na Planeta Corpo, 100% da nossa equipe tem registro no CREF.

Não é qualquer pessoa de roupa de academia te dando instrução — é profissional formado e registrado, comprometido com a sua segurança e resultado.

Isso faz toda diferença na sua saúde a longo prazo.

Comenta aqui: você sabia que isso é importante? 👇

#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Institucional, autoridade profissional`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Diferencial Competitivo / Autoridade
Objetivo: Destacar o diferencial de equipe 100% CREF de forma educativa, gerando confiança e diferenciação indireta frente a concorrentes que podem não ter essa qualificação completa.
Funil: Meio — construção de confiança e autoridade
Ação esperada: Comentário, salvamento, reconhecimento de valor`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Comunicar o diferencial de equipe profissional registrada de forma educativa e não-agressiva, gerando reflexão sobre a importância da qualificação profissional em academias.

COMPOSIÇÃO DA IMAGEM:
• Elemento central: ícone estilizado de crachá/certificado com símbolo de check
• Fundo: preto (#1a1a1a) com textura sutil
• Elementos secundários: pequenos ícones representando cuidado profissional
• Espaço para texto destacando "100% CREF"

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque do número "100%"
• Azul escuro #003f6b — ícones e elementos secundários
• Preto #1a1a1a — fundo
• Branco #ffffff — texto principal

ESTILO VISUAL:
Institucional e confiável, tom educativo sem soar arrogante ou comparativo direto.`
        }
      ]
    },
    {
      id:'ac15', date:'2026-06-18', time:'17h', format:'Post',
      title:'Diferencial — Estrutura aeróbica completa',
      driveFile:'Logo Academia Oficial.png',
      driveUrl:'https://drive.google.com/file/d/0B5StJJgxShxeSTNEYm93M1g0Qms/view',
      driveHint:'Logo oficial — elemento central do post',
      texto:`Esteiras, elípticos e bikes de qualidade — sempre disponíveis pra você. 🏃‍♀️

Sabemos que treino aeróbico é parte essencial da rotina de quem busca saúde de verdade. Por isso investimos na melhor estrutura da região.

✅ Equipamentos modernos e bem mantidos
✅ Sempre disponíveis, sem fila de espera
✅ Ambiente confortável para seu cardio

Aula experimental GRÁTIS — link na bio! 💪

📍 Av. Maria Bettega, 360 — Centro, Turvo/PR
📲 (42) 99922-2857

#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem de segurança: 80px em todas as bordas
Estilo: Institucional com foco em estrutura`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Diferencial Competitivo / Conversão
Objetivo: Destacar a melhor estrutura aeróbica da região como diferencial tangível e visualmente verificável — argumento racional forte para quem valoriza qualidade de equipamento.
Funil: Meio/Fundo — diferenciação e conversão
Ação esperada: Clique no link da bio, mensagem no WhatsApp`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Apresentar a estrutura aeróbica como diferencial competitivo direto e visualmente comprovável — equipamentos de qualidade são um argumento que fala por si.

COMPOSIÇÃO DA IMAGEM:
• Layout: logo no topo, ícones de equipamentos (esteira, elíptico, bike) em destaque no meio
• Fundo escuro com textura sutil
• Ícones minimalistas e modernos representando cada equipamento
• CTA na base

PALETA OBRIGATÓRIA:
• Preto #1a1a1a — fundo principal
• Laranja #e63900 — destaque e CTA
• Azul escuro #003f6b — ícones dos equipamentos
• Branco #ffffff — texto e logo

HIERARQUIA VISUAL:
1. Logo Planeta Corpo — topo
2. Frase de abertura sobre estrutura — destaque médio
3. 3 ícones de equipamentos em grid
4. CTA de aula experimental — base`
        }
      ]
    },
    {
      id:'ac16', date:'2026-06-18', time:'20h', format:'Story',
      title:'Bastidores — Cuidado com cada detalhe',
      driveFile:'Academia23.jpg',
      driveUrl:'https://drive.google.com/file/d/1tJwIyn_q134rkN3px66sYeFlUnpADIeG/view',
      driveHint:'Foto real do espaço — autenticidade é o ponto forte',
      texto:`Fim de mais um dia de muito trabalho por aqui. 🧡

Cada equipamento organizado, cada espaço cuidado — é assim que a gente recebe você todos os dias.

Obrigado por fazer parte dessa rotina com a gente. 💛

Marque alguém que também faz parte dessa comunidade 👇

#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Autêntico, foto real prevalece`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Humanização / Bastidores
Objetivo: Mostrar o cuidado por trás do espaço físico — reforça percepção de profissionalismo e carinho com os detalhes.
Funil: Meio — fidelização e reforço de marca para alunos atuais
Ação esperada: Marcação de amigos, resposta emocional ao story`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Fechamento do dia mostrando o cuidado da equipe com o espaço — agradecimento sincero à comunidade.

COMPOSIÇÃO DA IMAGEM:
• Foto real da academia (Academia23.jpg) ao fim do expediente
• Overlay mínimo — autenticidade prevalece sobre produção
• Iluminação quente de fim de dia
• Sem pessoas — o espaço cuidado fala por si

PALETA OBRIGATÓRIA:
• Preto #1a1a1a — overlay mínimo (máx 15%)
• Laranja #e63900 — emoji e detalhe pontual
• Branco #ffffff — texto principal

ESTILO VISUAL:
Zero produção excessiva. Tom de gratidão sincera ao fim do dia.`
        }
      ]
    },
    {
      id:'ac17', date:'2026-06-19', time:'08h', format:'Story',
      title:'Prova Social — Sexta-feira de conquista',
      driveFile:'Academia25.jpg',
      driveUrl:'https://drive.google.com/file/d/1_tYJHgSeLm7f9M1xyUjD70y-htknP4Ej/view',
      driveHint:'Foto real da academia — base do story',
      texto:`Sexta-feira. Semana completa de treino. 💪

Ela não faltou nenhum dia — não porque é fácil, mas porque decidiu que merece se cuidar.

Esse é o tipo de compromisso que transforma rotina em resultado de verdade.

Quer começar sua própria semana completa? Manda mensagem! 👇
📲 (42) 99922-2857

#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Prova Social
Objetivo: Celebrar a conquista de completar a semana de treinos, gerando identificação e aspiração em quem ainda não tem essa consistência.
Funil: Topo — identificação emocional com aspiração de consistência
Ação esperada: Comentário, salvamento, DM`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Celebração discreta de fim de semana de treino completo — sensação de orgulho genuíno e merecido, sem exagero ou comemoração espalhafatosa.

COMPOSIÇÃO DA IMAGEM:
• Personagem: mulher de 30-40 anos com expressão de leve orgulho e satisfação
• Ambiente: academia pequena, luz de fim de tarde de sexta-feira
• Expressão: sorriso genuíno, tranquilo
• Ângulo: plano médio, câmera na altura dos olhos

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque e CTA
• Azul escuro #003f6b — acento secundário
• Preto #1a1a1a — fundo e overlay
• Branco #ffffff — texto principal

ESTILO VISUAL:
Fotografia realista, luz quente de fim de tarde, sensação de conquista pessoal genuína.`
        }
      ]
    },
    {
      id:'ac18', date:'2026-06-19', time:'12h', format:'Story',
      title:'Diferencial — Ambiente seguro para mulheres',
      driveFile:'Academia24.jpg',
      driveUrl:'https://drive.google.com/file/d/1Ur7pNcZnnlYEGPQd63A3e-9tF0-x1Umi/view',
      driveHint:'Foto da academia — fundo do diferencial',
      texto:`Você merece treinar em paz. 🛡️

Na Planeta Corpo, não toleramos nenhum tipo de assédio ou desrespeito com nossas alunas. Esse é um compromisso da nossa equipe, todos os dias.

Você vem aqui pra cuidar de você — e a gente cuida pra que isso aconteça em um ambiente seguro e acolhedor.

Comenta aqui: isso faz diferença na sua escolha de academia? 👇

#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Institucional, tom sério e acolhedor`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Diferencial Competitivo / Posicionamento de Valor
Objetivo: Comunicar de forma direta e respeitosa o compromisso com a segurança das mulheres — tema extremamente relevante para o público-alvo de 30-40 anos.
Funil: Topo/Meio — construção de confiança e valores compartilhados
Ação esperada: Comentário, identificação com os valores da marca, compartilhamento`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Comunicar o compromisso com ambiente seguro de forma séria, respeitosa e acolhedora — sem soar como propaganda vazia, mas como valor genuíno da marca.

COMPOSIÇÃO DA IMAGEM:
• Elemento central: ícone estilizado de escudo ou símbolo de proteção, suave e não agressivo
• Fundo: tons quentes e acolhedores, não ameaçadores
• Elementos secundários: detalhes sutis transmitindo cuidado

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — ícone central de proteção
• Laranja #e63900 — pequenos acentos
• Preto #1a1a1a — fundo
• Branco #ffffff — texto principal

ESTILO VISUAL:
Sério mas acolhedor, nunca alarmista — transmite segurança através de tom calmo e confiante.`
        }
      ]
    },
    {
      id:'ac19', date:'2026-06-19', time:'17h', format:'Post',
      title:'Matrícula — Comece o fim de semana decidindo por você',
      driveFile:'Logo Academia Oficial.png',
      driveUrl:'https://drive.google.com/file/d/0B5StJJgxShxeSTNEYm93M1g0Qms/view',
      driveHint:'Logo oficial — elemento central do post',
      texto:`Sexta-feira é um ótimo dia para tomar uma decisão por você. 💛

Que tal aproveitar o fim de semana para conhecer a Planeta Corpo e dar o primeiro passo na sua nova rotina de saúde?

✅ Mais de 27 anos cuidando de Turvo
✅ Equipe 100% CREF
✅ Estrutura completa e moderna

Aula experimental GRÁTIS — link na bio! 💪

📍 Av. Maria Bettega, 360 — Centro, Turvo/PR
📲 (42) 99922-2857

#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem de segurança: 80px em todas as bordas
Estilo: Institucional com CTA de fim de semana`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Conversão / Chamada para Matrícula
Objetivo: Aproveitar o gancho emocional de sexta-feira (início de decisões novas) para gerar contato antes do fim de semana, consolidando 3 diferenciais principais de forma resumida.
Funil: Meio/Fundo — converter interesse em contato
Ação esperada: Clique no link da bio, mensagem no WhatsApp`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Post de fechamento de semana convidando à ação antes do fim de semana, resumindo os 3 principais diferenciais da academia de forma direta e acessível.

COMPOSIÇÃO DA IMAGEM:
• Layout: logo no topo, 3 diferenciais com ícones no meio, CTA na base
• Fundo escuro com textura sutil
• Ícones minimalistas para cada diferencial (anos de história, CREF, estrutura)

PALETA OBRIGATÓRIA:
• Preto #1a1a1a — fundo principal
• Laranja #e63900 — destaque e CTA
• Azul escuro #003f6b — ícones e acentos
• Branco #ffffff — texto e logo

HIERARQUIA VISUAL:
1. Logo Planeta Corpo — topo
2. Frase de convite sexta-feira — destaque médio
3. 3 diferenciais com ícones em lista
4. CTA de aula experimental — base`
        }
      ]
    },
    {
      id:'ac20', date:'2026-06-19', time:'20h', format:'Story',
      title:'Bastidores — Sexta de muito movimento',
      driveFile:'Academia23.jpg',
      driveUrl:'https://drive.google.com/file/d/1tJwIyn_q134rkN3px66sYeFlUnpADIeG/view',
      driveHint:'Foto real do espaço — autenticidade é o ponto forte',
      texto:`Sexta-feira movimentada por aqui! 🧡

Adoramos ver a academia cheia de gente cuidando da própria saúde antes do fim de semana.

Obrigado por fazer parte dessa comunidade. 💛

Bom fim de semana pra você! Marque alguém que precisa começar essa rotina também 👇

#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Autêntico, foto real prevalece`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Humanização / Bastidores
Objetivo: Mostrar movimento e vitalidade da academia em sexta-feira, reforçando senso de comunidade ativa antes do fim de semana.
Funil: Meio — fidelização e prova social indireta de movimento
Ação esperada: Marcação de amigos, desejo de boa semana compartilhado`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Fechamento de semana mostrando vitalidade e movimento da academia, com tom de despedida calorosa para o fim de semana.

COMPOSIÇÃO DA IMAGEM:
• Foto real da academia (Academia23.jpg) com sensação de movimento
• Overlay mínimo — autenticidade prevalece
• Iluminação quente de fim de tarde de sexta

PALETA OBRIGATÓRIA:
• Preto #1a1a1a — overlay mínimo (máx 15%)
• Laranja #e63900 — emoji e detalhe pontual
• Branco #ffffff — texto principal

ESTILO VISUAL:
Zero produção excessiva. Tom caloroso de despedida de semana.`
        }
      ]
    },
    {
      id:'ac20b', date:'2026-06-19', time:'18h30', format:'Story',
      title:'AVISO — Encerramento antecipado (jogo do Brasil)',
      driveFile:'Logo Academia Oficial.png',
      driveUrl:'',
      driveHint:'Usar fundo simples com logo — destaque total no texto do aviso',
      texto:`🟠⚽ ATENÇÃO, GALERA!

Hoje a Planeta Corpo vai encerrar suas atividades às 21h15, mais cedo que o normal — porque hoje é dia de torcer pelo Brasil! 🇧🇷🔥

Treina, mas não esquece de chegar em casa a tempo pro jogo! 💛💚

Nos vemos amanhã no horário normal. Vai, Brasil! 🙌

#planetacorpo #avisoimportante #vaibrasil #copa #academiaturvoPR #turvoPR #guarapuava`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram (postar também no Feed como aviso fixo)
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Aviso direto, alto contraste, texto grande e legível`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Aviso Operacional / Comunicado
Objetivo: Informar o público que a academia encerra às 21h15 hoje devido ao jogo do Brasil, evitando frustração de alunos que cheguem depois do horário.
Funil: Relacionamento — comunicação transparente e bom humor com a torcida
Ação esperada: Visualização e compartilhamento do aviso; nenhuma fricção com quem chegar achando que está aberto`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Comunicado rápido e descontraído sobre o encerramento antecipado, aproveitando o clima de torcida pelo Brasil — tom de comunidade, não de regra fria.

COMPOSIÇÃO DA IMAGEM:
• Fundo simples (cor sólida ou logo da academia) — o texto do aviso é o protagonista
• Ícone ou emoji de bola/bandeira do Brasil em destaque
• Hora de encerramento (21h15) em fonte grande, bem visível
• Sem foto de pessoas — foco total na informação

PALETA OBRIGATÓRIA:
• Preto #1a1a1a — fundo
• Laranja #e63900 — destaque do horário e CTA
• Amarelo/Verde Brasil (uso pontual, só nesse story) — emojis 🇧🇷
• Branco #ffffff — texto principal

ESTILO VISUAL:
Direto e funcional — é um aviso, não uma peça de marca. Prioriza legibilidade e velocidade de leitura (story passa rápido).

RESTRIÇÕES:
• Sem texto pequeno — horário deve ser lido em 1 segundo
• Sem poluição visual — esse story é só para informar`
        }
      ]
    },
    {
      id:'ac21', date:'2026-06-20', time:'10h', format:'Post',
      title:'Sábado — Motivação de fim de semana',
      driveFile:'Academia25.jpg',
      driveUrl:'https://drive.google.com/file/d/1_tYJHgSeLm7f9M1xyUjD70y-htknP4Ej/view',
      driveHint:'Foto real da academia — base do post de sábado',
      texto:`Sábado também é dia de se cuidar. ☀️

Treinar no fim de semana é a prova de que sua saúde não tira folga — porque você decidiu que ela é prioridade todos os dias.

Bom treino, bom sábado! 💛

Comenta aqui: você é do time que treina no fim de semana? 👇

#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem de segurança: 80px em todas as bordas
Estilo: Motivacional leve, tom de fim de semana`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Motivação de Fim de Semana
Objetivo: Manter presença de marca no sábado com volume reduzido, reconhecendo o menor movimento mas mantendo engajamento com quem treina no fim de semana.
Funil: Topo — engajamento leve, manutenção de presença
Ação esperada: Comentário, curtida, identificação com o tema`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Tom leve e descontraído de sábado, celebrando quem mantém a rotina mesmo no fim de semana, sem pressão ou urgência.

COMPOSIÇÃO DA IMAGEM:
• Foto real da academia com luz de sábado, mais tranquila
• Atmosfera relaxada, menos movimento que dias de semana
• Tom visual mais leve e solar

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque e elementos solares
• Azul escuro #003f6b — acento secundário
• Preto #1a1a1a — fundo e overlay
• Branco #ffffff — texto principal

ESTILO VISUAL:
Leve, solar, despreocupado — tom de fim de semana sem perder a identidade da marca.`
        }
      ]
    },
    {
      id:'ac22', date:'2026-06-20', time:'16h', format:'Story',
      title:'Sábado — Comunidade que se cuida junto',
      driveFile:'Academia24.jpg',
      driveUrl:'https://drive.google.com/file/d/1Ur7pNcZnnlYEGPQd63A3e-9tF0-x1Umi/view',
      driveHint:'Foto da academia — fundo do story de sábado',
      texto:`Aproveitando o sábado pra recarregar as energias. ☀️💛

Esse é o tipo de cuidado que faz toda diferença na segunda-feira.

Bom fim de semana, Turvo! 🧡

#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Leve, relaxado, fim de semana`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Relacionamento / Fim de Semana
Objetivo: Encerrar a presença de sábado com tom leve de comunidade e cuidado pessoal, preparando terreno emocional positivo para a segunda-feira.
Funil: Topo — manutenção de vínculo emocional
Ação esperada: Resposta ao story, sensação de pertencimento`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Story de encerramento de sábado com tom de recarga de energia e preparação positiva para a semana que se inicia.

COMPOSIÇÃO DA IMAGEM:
• Foto real da academia com luz suave de tarde de sábado
• Atmosfera tranquila e relaxada
• Sensação de pausa reparadora

PALETA OBRIGATÓRIA:
• Laranja #e63900 — emoji e detalhe pontual
• Azul escuro #003f6b — acento secundário
• Preto #1a1a1a — overlay mínimo
• Branco #ffffff — texto principal

ESTILO VISUAL:
Leve, contemplativo, tom de pausa positiva de fim de semana.`
        }
      ]
    },
    {
      id:'ac23', date:'2026-06-22', time:'08h', format:'Story',
      title:'Prova Social — Segunda-feira começando com energia',
      driveFile:'Academia25.jpg',
      driveUrl:'https://drive.google.com/file/d/1_tYJHgSeLm7f9M1xyUjD70y-htknP4Ej/view',
      driveHint:'Foto real da academia — base principal do story',
      texto:`Começando a semana com o pé direito! 💛

Segunda-feira não precisa ser sinônimo de cansaço — pode ser o dia que você escolhe cuidar de você antes de tudo.

Nossas alunas já sabem: treinar de manhã muda o resto do dia.

Bora começar essa semana com energia? Manda mensagem! 👇
📲 (42) 99922-2857
#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: manter elementos entre 150px das bordas superior e inferior
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Prova Social / Motivação de Início de Semana
Objetivo: Aproveitar o gancho emocional de segunda-feira para reforçar que treinar pela manhã muda a disposição do dia, gerando identificação com quem busca uma rotina mais saudável.
Funil: Topo — despertar interesse e criar conexão emocional
Ação esperada: Comentário, compartilhamento ou DM solicitando informações`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Mulher comum, em momento de disposição matinal — clima de "começo de semana com energia", não de esforço extremo.

COMPOSIÇÃO DA IMAGEM:
• Personagem: mulher sorrindo de forma natural, roupas simples de treino
• Expressão: disposição e energia matinal, leve animação
• Ambiente: academia pequena e acolhedora, luz da manhã entrando
• Ângulo: plano médio, câmera na altura dos olhos

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque e CTA
• Teal #003f6b — acento secundário
• Preto #1a1a1a — overlay e fundo
• Branco #ffffff — texto principal

ESTILO VISUAL:
Fotografia realista com luz natural quente de manhã. Autenticidade acima de produção excessiva.`
        }
      ]
    },
    {
      id:'ac24', date:'2026-06-22', time:'12h', format:'Story',
      title:'Dica de Saúde — Hidratação também é treino',
      driveFile:'Academia24.jpg',
      driveUrl:'https://drive.google.com/file/d/1Ur7pNcZnnlYEGPQd63A3e-9tF0-x1Umi/view',
      driveHint:'Foto da academia — fundo para a dica',
      texto:`Você bebe água o suficiente hoje? 💧

A hidratação correta antes, durante e depois do treino:

✅ Melhora o rendimento muscular
✅ Reduz risco de cãibras e lesões
✅ Acelera a recuperação

Meta simples: 2 litros de água por dia, mais um pouco no dia de treino.

Pequenos hábitos, grandes resultados. 💛
#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Dica de Saúde / Conteúdo Educativo
Objetivo: Entregar valor prático e simples sobre hidratação, posicionando a marca como referência de cuidado completo (não só treino, mas hábitos saudáveis).
Funil: Topo — autoridade e construção de confiança
Ação esperada: Salvamento do story, aplicação prática da dica`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Dica prática e objetiva sobre hidratação, com linguagem simples e meta concreta (2 litros/dia) — fácil de lembrar e aplicar.

COMPOSIÇÃO DA IMAGEM:
• Fundo: foto da academia com overlay translúcido
• Elemento central: ícone estilizado de gota d'água ou garrafa, em destaque
• Lista de 3 benefícios com checkmarks em laranja

PALETA OBRIGATÓRIA:
• Laranja #e63900 — ícone e checkmarks
• Teal #003f6b — acento secundário
• Preto #1a1a1a — overlay
• Branco #ffffff — texto principal

ESTILO VISUAL:
Educativo, limpo, fácil leitura rápida típica de story.`
        }
      ]
    },
    {
      id:'ac25', date:'2026-06-22', time:'17h', format:'Post',
      title:'Matrícula — Comece a semana decidindo por você',
      driveFile:'Logo Academia Oficial.png',
      driveUrl:'https://drive.google.com/file/d/0B5StJJgxShxeSTNEYm93M1g0Qms/view',
      driveHint:'Logo oficial — elemento central do post',
      texto:`Segunda-feira é a véspera perfeita pra começar algo novo. 💛

Que tal aproveitar essa semana pra dar o primeiro passo na sua nova rotina de saúde?

✅ Mais de 27 anos cuidando de Turvo
✅ Equipe 100% CREF
✅ Estrutura completa e moderna

Aula experimental GRÁTIS — link na bio! 💪

📍 Av. Maria Bettega, 360 — Centro, Turvo/PR
📲 (42) 99922-2857

#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem de segurança: 80px em todas as bordas
Estilo: Institucional com CTA de início de semana`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Conversão / Chamada para Matrícula
Objetivo: Aproveitar o gancho emocional de segunda-feira (início de decisões novas) para gerar contato no começo da semana, consolidando os 3 principais diferenciais.
Funil: Meio/Fundo — converter interesse em contato
Ação esperada: Clique no link da bio, mensagem no WhatsApp`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Post de abertura de semana convidando à ação, resumindo os 3 principais diferenciais da academia de forma direta e acessível — gancho de "começar de novo" típico de segunda-feira.

COMPOSIÇÃO DA IMAGEM:
• Layout: logo no topo, 3 diferenciais com ícones no meio, CTA na base
• Fundo escuro com textura sutil
• Ícones minimalistas para cada diferencial

PALETA OBRIGATÓRIA:
• Preto #1a1a1a — fundo principal
• Laranja #e63900 — destaque e CTA
• Azul escuro #003f6b — ícones e acentos
• Branco #ffffff — texto e logo

HIERARQUIA VISUAL:
1. Logo Planeta Corpo — topo
2. Frase de convite de segunda-feira — destaque médio
3. 3 diferenciais com ícones em lista
4. CTA de aula experimental — base`
        }
      ]
    },
    {
      id:'ac26', date:'2026-06-22', time:'20h', format:'Story',
      title:'Bastidores — Segunda de academia cheia',
      driveFile:'Academia23.jpg',
      driveUrl:'https://drive.google.com/file/d/1tJwIyn_q134rkN3px66sYeFlUnpADIeG/view',
      driveHint:'Foto real do espaço — autenticidade é o ponto forte',
      texto:`Segunda-feira começou com tudo por aqui! 🧡

Adoramos ver tanta gente decidindo cuidar de si mesma logo no início da semana.

Se você ainda não começou, ainda dá tempo. A semana é longa! 💛

Boa noite, Turvo!
#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Autêntico, foto real prevalece`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Humanização / Bastidores
Objetivo: Mostrar movimento e vitalidade da academia no início da semana, reforçando senso de comunidade ativa e abrindo espaço para quem ainda não começou.
Funil: Meio — fidelização e prova social indireta de movimento
Ação esperada: Resposta ao story, interesse de quem ainda não é aluno`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Mostrar vitalidade e movimento da academia logo na segunda-feira, com tom convidativo para quem ainda não decidiu começar.

COMPOSIÇÃO DA IMAGEM:
• Foto real da academia (Academia23.jpg) com sensação de movimento
• Overlay mínimo — autenticidade prevalece
• Iluminação quente de fim de tarde

PALETA OBRIGATÓRIA:
• Preto #1a1a1a — overlay mínimo (máx 15%)
• Laranja #e63900 — emoji e detalhe pontual
• Branco #ffffff — texto principal

ESTILO VISUAL:
Zero produção excessiva. Tom caloroso e convidativo de início de semana.`
        }
      ]
    },
    {
      id:'ac27', date:'2026-06-23', time:'08h', format:'Story',
      title:'Prova Social — Resultado vem de quem não falta',
      driveFile:'Academia25.jpg',
      driveUrl:'https://drive.google.com/file/d/1_tYJHgSeLm7f9M1xyUjD70y-htknP4Ej/view',
      driveHint:'Foto real da academia — base principal do story',
      texto:`Consistência vence intensidade. Sempre. 💪

Não é quem treina mais pesado uma vez que ganha — é quem aparece toda semana, mesmo nos dias difíceis.

Nossas alunas são prova disso. Resultado é feito de constância, não de perfeição.

Já decidiu aparecer essa semana? Manda mensagem! 👇
📲 (42) 99922-2857
#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Prova Social / Mentalidade de Constância
Objetivo: Reforçar que resultado vem da consistência e não de esforços pontuais intensos, gerando identificação com quem já é aluno e atraindo quem busca mudança real e sustentável.
Funil: Topo/Meio — construção de confiança e autoridade comportamental
Ação esperada: Comentário, identificação, DM solicitando informações`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Mulher comum em momento de satisfação simples pós-treino, comunicando mentalidade de constância — não de superação atlética pontual.

COMPOSIÇÃO DA IMAGEM:
• Personagem: mulher sorrindo de forma natural e relaxada
• Expressão: satisfação tranquila, sem exagero
• Ambiente: academia pequena e acolhedora
• Ângulo: plano médio, câmera na altura dos olhos

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque e CTA
• Teal #003f6b — acento secundário
• Preto #1a1a1a — overlay e fundo
• Branco #ffffff — texto principal

ESTILO VISUAL:
Fotografia realista com luz natural quente. Autenticidade acima de produção excessiva.`
        }
      ]
    },
    {
      id:'ac28', date:'2026-06-23', time:'12h', format:'Story',
      title:'Dica de Saúde — Sono de qualidade rende mais no treino',
      driveFile:'Academia24.jpg',
      driveUrl:'https://drive.google.com/file/d/1Ur7pNcZnnlYEGPQd63A3e-9tF0-x1Umi/view',
      driveHint:'Foto da academia — fundo para a dica',
      texto:`Treino bom começa na noite anterior. 😴

Dormir mal afeta diretamente:

✅ Força e disposição no treino
✅ Recuperação muscular
✅ Controle de apetite e humor

Meta simples: 7 a 8 horas de sono por noite, sempre que possível.

Cuidar do sono é cuidar do resultado. 💛
#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Dica de Saúde / Conteúdo Educativo
Objetivo: Entregar dica prática sobre sono e recuperação, reforçando que resultados dependem de hábitos além do treino em si.
Funil: Topo — autoridade e construção de confiança
Ação esperada: Salvamento do story, aplicação prática da dica`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Dica prática sobre sono e recuperação muscular, com meta concreta (7-8 horas) — simples de lembrar e aplicar no dia a dia.

COMPOSIÇÃO DA IMAGEM:
• Fundo: foto da academia com overlay translúcido
• Elemento central: ícone estilizado de lua ou zZz, em destaque
• Lista de 3 benefícios com checkmarks em laranja

PALETA OBRIGATÓRIA:
• Laranja #e63900 — ícone e checkmarks
• Teal #003f6b — acento secundário
• Preto #1a1a1a — overlay
• Branco #ffffff — texto principal

ESTILO VISUAL:
Educativo, limpo, fácil leitura rápida típica de story.`
        }
      ]
    },
    {
      id:'ac29', date:'2026-06-23', time:'17h', format:'Post',
      title:'Diferencial — Atendimento que conhece seu nome',
      driveFile:'Logo Academia Oficial.png',
      driveUrl:'https://drive.google.com/file/d/0B5StJJgxShxeSTNEYm93M1g0Qms/view',
      driveHint:'Logo oficial — elemento central do post',
      texto:`Aqui ninguém é só mais um número de matrícula. 💛

Na Planeta Corpo, cada professor acompanha de perto sua evolução — sabe seu nome, sua história, seus objetivos.

Isso faz toda diferença na hora de manter a motivação e ver resultado de verdade.

Quer esse tipo de acompanhamento? Aula experimental GRÁTIS — link na bio! 💪

📍 Av. Maria Bettega, 360 — Centro, Turvo/PR
📲 (42) 99922-2857

#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem de segurança: 80px em todas as bordas
Estilo: Institucional, foco em acolhimento humano`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Diferencial Competitivo / Atendimento Personalizado
Objetivo: Comunicar o diferencial de atendimento próximo e humanizado, contrastando com academias grandes e impessoais — relevante para o público que busca acompanhamento real.
Funil: Meio — diferenciação frente à concorrência
Ação esperada: Clique no link da bio, mensagem no WhatsApp`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Comunicar o atendimento próximo e personalizado como diferencial real, em contraste implícito com academias grandes e impessoais — sem citar concorrentes diretamente.

COMPOSIÇÃO DA IMAGEM:
• Layout: logo centralizado com ícone de "conexão humana" (duas figuras estilizadas conversando)
• Fundo escuro com textura sutil
• Frase de destaque sobre acompanhamento personalizado

PALETA OBRIGATÓRIA:
• Preto #1a1a1a — fundo principal
• Laranja #e63900 — destaque e CTA
• Azul escuro #003f6b — ícones e acentos
• Branco #ffffff — texto e logo

HIERARQUIA VISUAL:
1. Logo Planeta Corpo — topo
2. Frase sobre atendimento personalizado — destaque médio
3. CTA de aula experimental — base`
        }
      ]
    },
    {
      id:'ac30', date:'2026-06-23', time:'20h', format:'Story',
      title:'Bastidores — Cuidando de cada detalhe do espaço',
      driveFile:'Academia23.jpg',
      driveUrl:'https://drive.google.com/file/d/1tJwIyn_q134rkN3px66sYeFlUnpADIeG/view',
      driveHint:'Foto real do espaço — autenticidade é o ponto forte',
      texto:`Equipamento limpo, espaço organizado, ambiente agradável. 🧡

Cuidamos de cada detalhe pra que você só precise se preocupar com o seu treino.

É assim que a gente entende cuidado de verdade — nos pequenos detalhes do dia a dia.

Boa noite, Turvo!
#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Autêntico, foco em organização e cuidado`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Humanização / Bastidores
Objetivo: Mostrar o cuidado com limpeza e organização do espaço como parte do compromisso de qualidade, gerando confiança em quem valoriza ambiente bem cuidado.
Funil: Meio — construção de confiança e diferenciação sutil
Ação esperada: Resposta ao story, percepção de qualidade do espaço`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Mostrar bastidores de organização e limpeza do espaço, comunicando cuidado nos detalhes que muitas vezes passam despercebidos mas fazem diferença na experiência do aluno.

COMPOSIÇÃO DA IMAGEM:
• Foto real da academia (Academia23.jpg) com foco em organização
• Overlay mínimo — autenticidade prevalece
• Iluminação natural do ambiente

PALETA OBRIGATÓRIA:
• Preto #1a1a1a — overlay mínimo (máx 15%)
• Laranja #e63900 — emoji e detalhe pontual
• Branco #ffffff — texto principal

ESTILO VISUAL:
Zero produção excessiva. Tom de cuidado genuíno com os detalhes.`
        }
      ]
    },
    {
      id:'ac31', date:'2026-06-24', time:'08h', format:'Story',
      title:'Prova Social — Metade da semana, motivação em alta',
      driveFile:'Academia25.jpg',
      driveUrl:'https://drive.google.com/file/d/1_tYJHgSeLm7f9M1xyUjD70y-htknP4Ej/view',
      driveHint:'Foto real da academia — base principal do story',
      texto:`Já estamos na metade da semana e o ânimo continua firme! 💛

Esse é o momento em que muita gente desanima — mas não as nossas alunas. Elas sabem que é exatamente na quarta-feira que se prova o compromisso de verdade.

Você também pode fazer parte dessa rotina. Manda mensagem! 👇
📲 (42) 99922-2857
#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Prova Social / Motivação de Meio de Semana
Objetivo: Reconhecer que quarta-feira é o ponto em que muitas pessoas perdem o ânimo, posicionando a manutenção da rotina como prova de compromisso real.
Funil: Topo — despertar interesse e criar conexão emocional
Ação esperada: Comentário, compartilhamento ou DM solicitando informações`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Mulher comum mantendo disposição na metade da semana — reforçando que constância no meio da semana é onde o compromisso real se prova.

COMPOSIÇÃO DA IMAGEM:
• Personagem: mulher sorrindo de forma natural e disposta
• Expressão: energia mantida, sem sinais de cansaço excessivo
• Ambiente: academia pequena e acolhedora
• Ângulo: plano médio, câmera na altura dos olhos

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque e CTA
• Teal #003f6b — acento secundário
• Preto #1a1a1a — overlay e fundo
• Branco #ffffff — texto principal

ESTILO VISUAL:
Fotografia realista com luz natural quente. Autenticidade acima de produção excessiva.`
        }
      ]
    },
    {
      id:'ac32', date:'2026-06-24', time:'12h', format:'Story',
      title:'Dica de Saúde — Alongamento de 5 minutos faz diferença',
      driveFile:'Academia24.jpg',
      driveUrl:'https://drive.google.com/file/d/1Ur7pNcZnnlYEGPQd63A3e-9tF0-x1Umi/view',
      driveHint:'Foto da academia — fundo para a dica',
      texto:`5 minutos podem evitar dias de dor. 🧘‍♀️

Alongar antes e depois do treino:

✅ Reduz risco de lesão
✅ Melhora a flexibilidade
✅ Acelera a recuperação muscular

Não precisa ser complicado — só precisa ser constante.

Pequenos hábitos, grandes resultados. 💛
#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Dica de Saúde / Conteúdo Educativo
Objetivo: Entregar dica prática e rápida sobre alongamento, mostrando que pequenos hábitos consistentes geram grande impacto na prevenção de lesões.
Funil: Topo — autoridade e construção de confiança
Ação esperada: Salvamento do story, aplicação prática da dica`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Dica prática e rápida sobre alongamento, com tom acessível — "5 minutos" como número fácil de lembrar e aplicar.

COMPOSIÇÃO DA IMAGEM:
• Fundo: foto da academia com overlay translúcido
• Elemento central: ícone estilizado de figura alongando, em destaque
• Lista de 3 benefícios com checkmarks em laranja

PALETA OBRIGATÓRIA:
• Laranja #e63900 — ícone e checkmarks
• Teal #003f6b — acento secundário
• Preto #1a1a1a — overlay
• Branco #ffffff — texto principal

ESTILO VISUAL:
Educativo, limpo, fácil leitura rápida típica de story.`
        }
      ]
    },
    {
      id:'ac33', date:'2026-06-24', time:'17h', format:'Post',
      title:'Matrícula — Quarta-feira é dia de decidir por você',
      driveFile:'Logo Academia Oficial.png',
      driveUrl:'https://drive.google.com/file/d/0B5StJJgxShxeSTNEYm93M1g0Qms/view',
      driveHint:'Logo oficial — elemento central do post',
      texto:`Não precisa esperar a segunda-feira que vem pra começar. 💛

Quarta-feira também é um ótimo dia pra decidir cuidar de você. Aliás, qualquer dia é.

✅ Mais de 27 anos cuidando de Turvo
✅ Equipe 100% CREF
✅ Estrutura completa e moderna

Aula experimental GRÁTIS — link na bio! 💪

📍 Av. Maria Bettega, 360 — Centro, Turvo/PR
📲 (42) 99922-2857

#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem de segurança: 80px em todas as bordas
Estilo: Institucional com CTA de meio de semana`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Conversão / Chamada para Matrícula
Objetivo: Quebrar a crença comum de que só dá pra começar "na segunda que vem", reforçando que qualquer dia é o dia certo para tomar a decisão.
Funil: Meio/Fundo — converter interesse em contato
Ação esperada: Clique no link da bio, mensagem no WhatsApp`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Post que quebra a objeção comum de "esperar a próxima segunda" para começar, reforçando os 3 principais diferenciais e convidando à ação imediata no meio da semana.

COMPOSIÇÃO DA IMAGEM:
• Layout: logo no topo, 3 diferenciais com ícones no meio, CTA na base
• Fundo escuro com textura sutil
• Ícones minimalistas para cada diferencial

PALETA OBRIGATÓRIA:
• Preto #1a1a1a — fundo principal
• Laranja #e63900 — destaque e CTA
• Azul escuro #003f6b — ícones e acentos
• Branco #ffffff — texto e logo

HIERARQUIA VISUAL:
1. Logo Planeta Corpo — topo
2. Frase de quebra de objeção ("não precisa esperar segunda") — destaque médio
3. 3 diferenciais com ícones em lista
4. CTA de aula experimental — base`
        }
      ]
    },
    {
      id:'ac34', date:'2026-06-24', time:'20h', format:'Story',
      title:'Bastidores — Quarta-feira de muito suor e dedicação',
      driveFile:'Academia23.jpg',
      driveUrl:'https://drive.google.com/file/d/1tJwIyn_q134rkN3px66sYeFlUnpADIeG/view',
      driveHint:'Foto real do espaço — autenticidade é o ponto forte',
      texto:`Olha esse movimento de quarta-feira! 🧡

Cada treino aqui é um lembrete de que disciplina não tira folga no meio da semana.

Orgulho de ver tanta gente comprometida com a própria saúde.

Boa noite, Turvo! Falta pouco pra sexta! 💛
#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Autêntico, foto real prevalece`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Humanização / Bastidores
Objetivo: Mostrar movimento e vitalidade da academia no meio da semana, reforçando que disciplina é mantida mesmo quando o ânimo geral costuma cair.
Funil: Meio — fidelização e prova social indireta de movimento
Ação esperada: Resposta ao story, identificação com o comprometimento mostrado`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Mostrar vitalidade e movimento da academia na quarta-feira, com tom de orgulho e reconhecimento do comprometimento dos alunos no meio da semana.

COMPOSIÇÃO DA IMAGEM:
• Foto real da academia (Academia23.jpg) com sensação de movimento
• Overlay mínimo — autenticidade prevalece
• Iluminação quente de fim de tarde

PALETA OBRIGATÓRIA:
• Preto #1a1a1a — overlay mínimo (máx 15%)
• Laranja #e63900 — emoji e detalhe pontual
• Branco #ffffff — texto principal

ESTILO VISUAL:
Zero produção excessiva. Tom de orgulho e reconhecimento pelo comprometimento.`
        }
      ]
    },
    {
      id:'ac35', date:'2026-06-25', time:'08h', format:'Story',
      title:'Prova Social — O progresso que ninguém vê de fora',
      driveFile:'Academia25.jpg',
      driveUrl:'https://drive.google.com/file/d/1_tYJHgSeLm7f9M1xyUjD70y-htknP4Ej/view',
      driveHint:'Foto real da academia — base do story de quinta-feira',
      texto:`Tem dia que o espelho não mostra.

Mas o corpo sabe. A disposição sabe. O sono melhor sabe.

Cada treino é um tijolo numa construção que ninguém vê de fora — só quem vive sente.

Você já notou alguma mudança essa semana? Conta pra gente nos comentários 👇
📲 (42) 99922-2857

#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: manter elementos entre 150px das bordas superior e inferior
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Prova Social
Objetivo: Reforçar que os benefícios da constância vão além do estético — sono, disposição, humor — gerando identificação com quem já treina e curiosidade em quem ainda não começou.
Funil: Topo/Meio — manter conexão emocional com a base de seguidores
Ação esperada: Comentário relatando progresso pessoal, engajamento`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Um momento de introspecção pós-treino — não de euforia, mas de satisfação silenciosa. A pessoa olhando para frente, não para o espelho, sugerindo que o progresso real é sentido, não apenas visto.

COMPOSIÇÃO DA IMAGEM:
• Personagem: aluno(a) comum, roupa simples de treino, sentado(a) num banco da academia, respirando fundo após o treino
• Expressão: serenidade, satisfação leve, olhar distante e tranquilo
• Ambiente: academia com iluminação quente, equipamentos desfocados ao fundo
• Ângulo: plano médio, levemente lateral, câmera na altura dos olhos
• Profundidade de campo: rasa — foco total na expressão

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque e CTA
• Teal #003f6b — acento secundário
• Preto #1a1a1a — overlay e fundo
• Branco #ffffff — texto principal

ESTILO VISUAL:
Fotografia realista, luz natural quente, sem filtros pesados. Sensação de autenticidade e calma — o oposto da estética de "esforço máximo" tradicional do nicho fitness.`
        }
      ]
    },
    {
      id:'ac36', date:'2026-06-25', time:'12h', format:'Story',
      title:'Dica de Saúde — Hidratação também é treino',
      driveFile:'Academia24.jpg',
      driveUrl:'https://drive.google.com/file/d/1Ur7pNcZnnlYEGPQd63A3e-9tF0-x1Umi/view',
      driveHint:'Foto da academia — fundo para a dica',
      texto:`Beber água não é detalhe. É parte do treino. 💧

Pouca hidratação = menos força, mais cansaço, recuperação mais lenta.

✅ Beba água antes, durante e depois do treino
✅ Garrafinha sempre por perto
✅ Sede já é sinal de atraso — não espere sentir

Pequenos hábitos, grandes resultados. A gente te ajuda a montar a rotina certa.

#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Dica de Saúde / Conteúdo Educativo
Objetivo: Posicionar a academia como referência em orientação correta, gerando valor mesmo para quem não está na academia naquele momento.
Funil: Topo — autoridade e valor gratuito
Ação esperada: Salvar o story, compartilhar, ou comentar dúvida sobre hidratação`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Card educativo simples e direto sobre a importância da hidratação durante o treino, com checklist visual de fácil leitura.

COMPOSIÇÃO DA IMAGEM:
• Fundo: foto da academia desfocada, com overlay escuro para legibilidade
• Elemento principal: ícone de gota de água grande, estilizado, centralizado no topo
• Checklist: três itens com ✅, tipografia clara e direta
• Hierarquia: título grande no topo, checklist no meio, CTA no rodapé

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque e ícones
• Teal #003f6b — acento secundário
• Preto #1a1a1a — overlay e fundo
• Branco #ffffff — texto principal

ESTILO VISUAL:
Clean, educativo, fácil leitura em poucos segundos — típico de story informativo de alta retenção.`
        }
      ]
    },
    {
      id:'ac37', date:'2026-06-25', time:'17h', format:'Post',
      title:'Diferencial — Equipe que acompanha sua evolução de perto',
      driveFile:'Logo Academia Oficial.png',
      driveUrl:'https://drive.google.com/file/d/0B5StJJgxShxeSTNEYm93M1g0Qms/view',
      driveHint:'Logo oficial — elemento central do post institucional',
      texto:`Aqui você não treina sozinho. 🧡

Nossa equipe 100% formada em Educação Física acompanha cada aluno de perto — ajusta a carga, corrige a postura, comemora cada evolução com você.

Não é academia de "vira e sai". É acompanhamento de verdade.

✅ Equipe 100% CREF
✅ Mais de 27 anos cuidando de Turvo
✅ Acompanhamento individual de evolução

Aula experimental GRÁTIS — link na bio! 💪

📍 Av. Maria Bettega, 360 — Centro, Turvo/PR
📲 (42) 99922-2857

#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem de segurança: 80px em todas as bordas
Estilo: Institucional, foco em diferencial competitivo`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Diferencial Competitivo
Objetivo: Comunicar o acompanhamento próximo da equipe técnica como diferencial frente a academias sem orientação qualificada, sem citar concorrentes diretamente.
Funil: Meio — construção de confiança e justificativa de escolha
Ação esperada: Clique no link da bio, mensagem perguntando sobre aula experimental`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Comunicar que o acompanhamento técnico próximo é parte estrutural da experiência na academia — não um extra, mas o padrão.

COMPOSIÇÃO DA IMAGEM:
• Fundo: laranja (#e63900) sólido ou levemente texturizado
• Logo oficial centralizado na parte superior
• Lista de diferenciais em destaque, com ícones de check
• CTA em faixa inferior com contraste forte

PALETA OBRIGATÓRIA:
• Laranja #e63900 — fundo principal
• Teal #003f6b — acento secundário
• Preto #1a1a1a — textos de apoio
• Branco #ffffff — texto principal e ícones

ESTILO VISUAL:
Institucional, confiável, direto — comunica solidez e profissionalismo sem parecer arrogante.`
        }
      ]
    },
    {
      id:'ac38', date:'2026-06-25', time:'20h', format:'Story',
      title:'Bastidores — Academia cheia até o fim do dia',
      driveFile:'Academia23.jpg',
      driveUrl:'https://drive.google.com/file/d/1tJwIyn_q134rkN3px66sYeFlUnpADIeG/view',
      driveHint:'Foto real do movimento da academia — bastidores noturnos',
      texto:`20h e a energia continua a mesma do início do dia. 🔥

Gente chegando do trabalho, trocando o cansaço por disposição.

É isso que a gente ama ver todos os dias.

Bora pra mais um treino? Te esperamos! 🧡

#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Bastidores / Humanização
Objetivo: Mostrar o movimento real da academia no período noturno, reforçando que há energia e estrutura em qualquer horário do dia.
Funil: Topo — conexão emocional e prova de movimento
Ação esperada: Visualização completa do story, identificação com o horário`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Registro real e despretensioso do movimento da academia no horário noturno — mostrar que o ambiente continua ativo e acolhedor até o fim do dia.

COMPOSIÇÃO DA IMAGEM:
• Cena: ambiente da academia com alunos treinando, iluminação artificial quente
• Enquadramento: plano geral mostrando movimento, sem focar em rostos específicos
• Sensação: energia, acolhimento, rotina viva

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque e CTA
• Teal #003f6b — acento secundário
• Preto #1a1a1a — overlay
• Branco #ffffff — texto principal

ESTILO VISUAL:
Fotografia espontânea, tipo "registro de bastidores" — sem produção excessiva. Tom de orgulho e energia pelo movimento constante.`
        }
      ]
    },
    {
      id:'ac39', date:'2026-06-26', time:'08h', format:'Story',
      title:'Prova Social — Sexta-feira também é dia de se cuidar',
      driveFile:'Academia25.jpg',
      driveUrl:'https://drive.google.com/file/d/1_tYJHgSeLm7f9M1xyUjD70y-htknP4Ej/view',
      driveHint:'Foto real da academia — base do story de sexta-feira',
      texto:`A semana tá quase no fim, mas o cuidado com você não tira folga. 🧡

Quem mantém a rotina até a sexta colhe o fim de semana com mais disposição — pra aproveitar de verdade, sem aquele cansaço acumulado.

Bora fechar a semana com chave de ouro? 💪
📲 (42) 99922-2857

#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Prova Social
Objetivo: Reforçar a constância até o fim da semana, associando o treino de sexta a um fim de semana mais disposto e aproveitado.
Funil: Topo — manter engajamento e motivação de fechamento de semana
Ação esperada: Comparecimento ao treino de sexta, engajamento no story`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Mostrar que a constância até a sexta-feira é o que garante um fim de semana mais leve e disposto — o treino de sexta como "fechamento" positivo da semana.

COMPOSIÇÃO DA IMAGEM:
• Personagem: aluno(a) sorrindo de forma natural, leve sensação de alívio e satisfação
• Expressão: leveza, antecipação positiva do fim de semana
• Ambiente: academia com luz quente de fim de tarde/manhã
• Ângulo: plano médio, câmera na altura dos olhos
• Profundidade de campo: rasa — foco na expressão

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque e CTA
• Teal #003f6b — acento secundário
• Preto #1a1a1a — overlay e fundo
• Branco #ffffff — texto principal

ESTILO VISUAL:
Fotografia realista, leve e descontraída — tom de "sexta-feira boa", sem perder a autenticidade do dia a dia.`
        }
      ]
    },
    {
      id:'ac40', date:'2026-06-26', time:'12h', format:'Story',
      title:'Dica de Saúde — Descansar também é treinar',
      driveFile:'Academia24.jpg',
      driveUrl:'https://drive.google.com/file/d/1Ur7pNcZnnlYEGPQd63A3e-9tF0-x1Umi/view',
      driveHint:'Foto da academia — fundo para a dica de fim de semana',
      texto:`Fim de semana chegando e a dúvida de sempre: "posso descansar?" Pode — e deve. 😌

O músculo cresce no descanso, não só no treino.

✅ 1 a 2 dias de descanso por semana é o ideal
✅ Sono de qualidade acelera a recuperação
✅ Descansar não é fraqueza, é estratégia

Aproveite o fim de semana com consciência — e volte com tudo na próxima semana!

#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Dica de Saúde / Conteúdo Educativo
Objetivo: Validar o descanso de fim de semana como parte do processo de treino, gerando autoridade e tranquilidade no aluno.
Funil: Topo — valor educativo e conexão antes do fim de semana
Ação esperada: Salvar o story, compartilhar, comentar sobre rotina de descanso`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Card educativo validando o descanso como parte estratégica do treino, com checklist visual simples, no tom certo para fechar a semana sem culpa.

COMPOSIÇÃO DA IMAGEM:
• Fundo: foto da academia desfocada, overlay escuro para legibilidade
• Elemento principal: ícone de "zzz" ou lua estilizada, centralizado no topo
• Checklist: três itens com ✅, tipografia clara
• Hierarquia: título no topo, checklist no meio, CTA no rodapé

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque e ícones
• Teal #003f6b — acento secundário
• Preto #1a1a1a — overlay e fundo
• Branco #ffffff — texto principal

ESTILO VISUAL:
Clean, tranquilo, tom de "permissão consciente" para descansar — reforça autoridade técnica da equipe.`
        }
      ]
    },
    {
      id:'ac41', date:'2026-06-26', time:'17h', format:'Post',
      title:'Matrícula — Comece a próxima semana já matriculado',
      driveFile:'Logo Academia Oficial.png',
      driveUrl:'https://drive.google.com/file/d/0B5StJJgxShxeSTNEYm93M1g0Qms/view',
      driveHint:'Logo oficial — elemento central do post de conversão',
      texto:`Que tal já garantir sua vaga e começar a próxima semana com o pé direito? 🧡

Sem mensalidade de fidelidade engessada, sem complicação — só você decidindo cuidar de você.

✅ Mais de 27 anos cuidando de Turvo
✅ Equipe 100% CREF
✅ Estrutura completa e moderna

Aula experimental GRÁTIS — link na bio! 💪

📍 Av. Maria Bettega, 360 — Centro, Turvo/PR
📲 (42) 99922-2857

#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem de segurança: 80px em todas as bordas
Estilo: Institucional com CTA de conversão de fim de semana`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Conversão / Matrícula
Objetivo: Aproveitar o fechamento da semana para gerar decisão de matrícula antes do fim de semana, posicionando a próxima segunda-feira como ponto de partida.
Funil: Fundo — conversão direta
Ação esperada: Clique no link da bio, mensagem solicitando aula experimental ou matrícula`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Usar o fechamento da semana como gatilho de decisão — "comece a próxima semana já matriculado" em vez de deixar para depois.

COMPOSIÇÃO DA IMAGEM:
• Fundo: laranja (#e63900) sólido
• Logo oficial centralizado na parte superior
• Lista de diferenciais em destaque, com ícones de check
• CTA em faixa inferior com contraste forte

PALETA OBRIGATÓRIA:
• Laranja #e63900 — fundo principal
• Teal #003f6b — acento secundário
• Preto #1a1a1a — textos de apoio
• Branco #ffffff — texto principal e ícones

ESTILO VISUAL:
Institucional, direto, com leve senso de oportunidade — sem parecer promoção agressiva.`
        }
      ]
    },
    {
      id:'ac42', date:'2026-06-26', time:'20h', format:'Story',
      title:'Bastidores — Fechando a semana com gratidão',
      driveFile:'Academia23.jpg',
      driveUrl:'https://drive.google.com/file/d/1tJwIyn_q134rkN3px66sYeFlUnpADIeG/view',
      driveHint:'Foto real do movimento da academia — bastidores de sexta-feira',
      texto:`Mais uma semana de treino encerrando por aqui. 🧡

Obrigado a cada um que apareceu, treinou, se desafiou e fez parte disso com a gente.

Bom fim de semana, time! Segunda a gente recomeça com tudo. 💪

#fitness #academia #musculação #saudeebemestar #vidafitness #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Bastidores / Humanização
Objetivo: Encerrar a semana com tom de gratidão e proximidade, fortalecendo o vínculo emocional com a base de alunos antes do fim de semana.
Funil: Topo — conexão emocional e fechamento de ciclo
Ação esperada: Visualização completa do story, resposta com emoji ou mensagem`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Registro de fechamento de semana, tom de gratidão genuína pela presença e dedicação dos alunos ao longo dos dias.

COMPOSIÇÃO DA IMAGEM:
• Cena: ambiente da academia ao fim do dia, iluminação quente e mais baixa
• Enquadramento: plano geral, sem foco em rostos específicos
• Sensação: acolhimento, encerramento positivo, leveza

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque e CTA
• Teal #003f6b — acento secundário
• Preto #1a1a1a — overlay
• Branco #ffffff — texto principal

ESTILO VISUAL:
Fotografia espontânea e calorosa — tom de gratidão e proximidade, fechando a semana de forma humana.`
        }
      ]
    },
    {
      id:'ac43', date:'2026-06-27', time:'10h', format:'Post',
      title:'Diferencial — Sábado também é dia de cuidar de você',
      driveFile:'Academia25.jpg',
      driveUrl:'https://drive.google.com/file/d/1_tYJHgSeLm7f9M1xyUjD70y-htknP4Ej/view',
      driveHint:'Foto real da academia — movimento de sábado de manhã',
      texto:`Sábado de manhã e a gente já tá aqui. 💪

Enquanto muita gente usa o fim de semana pra desacelerar de vez, tem quem aproveite pra cuidar do corpo com calma, sem pressa, sem a correria da semana.

Aqui tem espaço, equipamento e equipe pra isso — no seu ritmo.

Bora começar o fim de semana ativo? 🧡
📍 Av. Maria Bettega, 360 — Centro, Turvo/PR
📲 (42) 99922-2857

#academiaturvoPR #planetacorpoclubmais #treinoturvo #vidaativa #saudeebemestar`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem de segurança: 80px em todas as bordas
Estilo: Institucional com apelo de fim de semana`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Diferencial / Reforço de marca
Objetivo: Posicionar o sábado como dia válido e tranquilo para treinar, reforçando a disponibilidade da estrutura no fim de semana sem citar concorrentes.
Funil: Meio — consideração
Ação esperada: Salvar o post, marcar alguém nos comentários, mensagem solicitando horários de sábado`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
O sábado de manhã como momento tranquilo e prazeroso para treinar, sem a pressa da semana — valorizar o ritmo próprio.

COMPOSIÇÃO DA IMAGEM:
• Cena: ambiente da academia com luz natural de manhã, movimento leve e tranquilo
• Enquadramento: plano geral, mostrando espaço e equipamentos
• Sensação: calma, espaço, bem-estar — sem aglomeração

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque e CTA
• Teal #003f6b — acento secundário
• Preto #1a1a1a — overlay
• Branco #ffffff — texto principal

ESTILO VISUAL:
Fotografia realista com luz natural de manhã. Tom de leveza e respiro — sensação de fim de semana ativo e sem pressa. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'ac44', date:'2026-06-27', time:'17h', format:'Story',
      title:'Bastidores — David na musculação',
      driveFile:'Academia24.jpg',
      driveUrl:'https://drive.google.com/file/d/1Ur7pNcZnnlYEGPQd63A3e-9tF0-x1Umi/view',
      driveHint:'Foto real do David acompanhando treino na área de musculação',
      texto:`Quem treina aqui no sábado já conhece bem esse rosto. 💪

O David tá sempre de olho na execução, ajudando a fazer o movimento certo e a evitar lesão.

Ter alguém que acompanha de perto faz toda a diferença no resultado. 🧡

Vem treinar com a gente!
📲 (42) 99922-2857`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Bastidores / Humanização da equipe
Objetivo: Apresentar o David (musculação) individualmente, humanizando a equipe e reforçando o acompanhamento técnico como diferencial.
Funil: Topo — conexão e confiança
Ação esperada: Resposta ao story, identificação dos alunos que já o conhecem`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Apresentar o David em ação na área de musculação, transmitindo proximidade e competência técnica de forma natural.

COMPOSIÇÃO DA IMAGEM:
• Personagem: David acompanhando ou orientando um treino, postura ativa e atenta
• Expressão: concentração amigável, disponibilidade
• Ambiente: área de musculação, equipamentos ao fundo
• Ângulo: plano médio, câmera na altura dos olhos

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque e CTA
• Teal #003f6b — acento secundário
• Preto #1a1a1a — overlay
• Branco #ffffff — texto principal

ESTILO VISUAL:
Fotografia espontânea, tom de bastidor real — autenticidade acima de produção. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'ac45', date:'2026-06-28', time:'10h', format:'Story',
      title:'Dica de Saúde — Descanso também é treino',
      driveFile:'Academia23.jpg',
      driveUrl:'https://drive.google.com/file/d/1tJwIyn_q134rkN3px66sYeFlUnpADIeG/view',
      driveHint:'Foto real do ambiente da academia em clima tranquilo de domingo',
      texto:`Domingo é dia de recarregar. 🧡

O corpo não cresce durante o treino — ele cresce no descanso. É no dia de folga que o músculo se recupera e fica mais forte.

Então se hoje é seu dia de descanso, aproveita sem culpa. Segunda a gente volta com tudo. 💪`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Dica de Saúde / Educação
Objetivo: Entregar valor educativo sobre a importância do descanso na recuperação muscular, posicionando a academia como fonte de orientação confiável mesmo no dia de folga.
Funil: Topo — autoridade e relacionamento
Ação esperada: Visualização completa, resposta com emoji, salvamento mental da dica`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Domingo como dia legítimo de recuperação — o descanso como parte do processo de evolução, não como preguiça.

COMPOSIÇÃO DA IMAGEM:
• Cena: ambiente tranquilo, iluminação suave de domingo
• Enquadramento: plano geral calmo, sem movimento intenso
• Sensação: leveza, permissão para descansar, bem-estar

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque e CTA
• Teal #003f6b — acento secundário
• Preto #1a1a1a — overlay
• Branco #ffffff — texto principal

ESTILO VISUAL:
Fotografia serena, tom acolhedor — clima de domingo tranquilo. Reforça autoridade técnica sem peso. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'ac46', date:'2026-06-29', time:'08h', format:'Story',
      title:'Dica de Saúde — Segunda não precisa de motivação, precisa de hábito',
      driveFile:'Academia25.jpg',
      driveUrl:'https://drive.google.com/file/d/1_tYJHgSeLm7f9M1xyUjD70y-htknP4Ej/view',
      driveHint:'Foto real do ambiente da academia em movimento leve de início de semana',
      texto:`Motivação vem e vai. Hábito fica. 🧡

Se você só treina nos dias que "está com vontade", a segunda-feira vai continuar sendo a vilã da sua semana.

O segredo de quem é constante não é força de vontade — é transformar o treino em parte do dia, igual escovar os dentes.

Vem treinar com a gente hoje, mesmo sem vontade. Sua versão de quinta-feira agradece. 💪`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Dica de Saúde / Autoridade
Objetivo: Desconstruir a crença de que motivação é pré-requisito pra treinar, reposicionando hábito como o real motor de consistência — gera identificação forte logo na segunda-feira.
Funil: Topo — autoridade e conexão emocional
Ação esperada: Resposta com emoji, envio em DM pra alguém que "também não tem vontade hoje"`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Contraponto entre motivação (instável) e hábito (constante) — a segunda-feira como prova real desse conceito.

COMPOSIÇÃO DA IMAGEM:
• Cena: ambiente da academia em movimento leve de início de semana
• Enquadramento: plano médio, energia tranquila mas ativa
• Sensação: acolhimento, "vem como você está"

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque e CTA
• Teal #00b4b4 — acento secundário
• Preto #1a1a1a — overlay
• Branco #ffffff — texto principal

ESTILO VISUAL:
Fotografia real, tom motivacional sem clichê. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'ac47', date:'2026-06-29', time:'12h', format:'Story',
      title:'Bastidores — Lidiane na musculação',
      driveFile:'Academia24.jpg',
      driveUrl:'https://drive.google.com/file/d/1Ur7pNcZnnlYEGPQd63A3e-9tF0-x1Umi/view',
      driveHint:'Foto real da Lidiane orientando aluno na musculação — substituir pela foto real antes de publicar',
      texto:`Esse rosto você já deve ter visto circulando pela musculação. 🧡

A Lidiane tá sempre por perto pra ajustar a carga, corrigir a postura e dar aquela palavra de incentivo no momento certo.

Não é só "passar a ficha" — é acompanhar de verdade, treino a treino.

Vem conhecer a Lidiane e o resto da equipe! 💪
📲 (42) 99922-2857`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Bastidores / Humanização da equipe
Objetivo: Apresentar a Lidiane individualmente, reforçando que o acompanhamento técnico é nominal e pessoal — fortalece confiança e reduz o receio de ambientes despersonalizados.
Funil: Topo — conexão e confiança
Ação esperada: Resposta ao story, marcação de amigas, identificação com o atendimento`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Apresentar a Lidiane como rosto de confiança da musculação — reforço de que cada aluno é acompanhado por alguém com nome e rosto, não por "um professor qualquer".

COMPOSIÇÃO DA IMAGEM:
• Elemento principal: foto real da Lidiane em ação na área de musculação
• Enquadramento: plano médio, natural, sem produção pesada
• Sensação: proximidade, atenção genuína

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque e CTA
• Teal #00b4b4 — acento secundário
• Preto #1a1a1a — overlay mínimo
• Branco #ffffff — texto principal

ESTILO VISUAL:
Fotografia real e espontânea, autenticidade acima de produção. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'ac48', date:'2026-06-29', time:'17h', format:'Carrossel',
      title:'Diferencial — 5 sinais de que sua academia não cuida de você de verdade',
      driveFile:'Logo Academia Oficial.png',
      driveUrl:'https://drive.google.com/file/d/0B5StJJgxShxeSTNEYm93M1g0Qms/view',
      driveHint:'Logo oficial — elemento de apoio no carrossel educativo',
      texto:`Slide 1: \"5 sinais de que sua academia não cuida de você de verdade\"
Slide 2: \"Sinal 1: ninguém sabe seu nome depois de 3 meses treinando\"
Slide 3: \"Sinal 2: você nunca foi corrigido(a) numa execução errada\"
Slide 4: \"Sinal 3: equipe sem formação em Educação Física, só 'instrutores'\"
Slide 5: \"Sinal 4: ambiente que te faz sentir julgado(a), não bem-vindo(a)\"
Slide 6: \"Sinal 5: ninguém comemora sua evolução com você\"
Slide 7: \"Aqui é o contrário de tudo isso. Equipe 100% CREF, acompanhamento de verdade, 27+ anos cuidando de Turvo.\"

Salva esse carrossel pra comparar com a sua academia atual. 🧡
Aula experimental GRÁTIS — link na bio! 💪
📍 Av. Maria Bettega, 360 — Turvo/PR

#academiaemturvo #planetacorpoclubmais #treinocomacompanhamento #turvopr #saudedeverdade`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Carrossel Instagram (7 slides)
Dimensões: 1080 × 1080px por slide (proporção 1:1)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas
Estilo: Lista comparativa, didático, alto valor de salvamento`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Diferencial Competitivo / Educativo
Objetivo: Usar formato de lista (alto poder de salvamento) pra expor sinais de academia sem cuidado real, posicionando a Planeta Corpo como contraponto — sem citar concorrentes.
Funil: Meio — construção de confiança e justificativa de escolha
Ação esperada: Deslizar o carrossel completo, salvar o post, comentário comparando com experiência própria, clique no link da bio`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Formato de lista numerada que gera identificação imediata ("isso já aconteceu comigo") e termina posicionando a Planeta Corpo como o oposto de cada sinal — gatilho de comparação sem confronto direto.

ESTRUTURA DOS SLIDES:
• Slide 1 — Capa com título de impacto e numeração 1 a 5
• Slides 2-6 — Um sinal por slide, ícone de alerta, frase curta e direta
• Slide 7 — Virada: "Aqui é diferente" + diferenciais reais + CTA

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque e numeração
• Teal #00b4b4 — acento secundário
• Preto #1a1a1a — fundo dos slides de alerta
• Branco #ffffff — texto principal

ESTILO VISUAL:
Visual de lista/checklist, alto contraste, leitura rápida no celular — frases curtas guiando cada slide. Sem reproduzir nomes de concorrentes.`
        }
      ]
    },
    {
      id:'ac49', date:'2026-06-29', time:'20h', format:'Story',
      title:'Matrícula — Comece essa semana, não a próxima',
      driveFile:'Academia23.jpg',
      driveUrl:'https://drive.google.com/file/d/1tJwIyn_q134rkN3px66sYeFlUnpADIeG/view',
      driveHint:'Foto real do ambiente convidativo da academia ao fim do dia',
      texto:`Toda segunda você promete "semana que vem eu começo". E toda semana que vem chega igual. 🧡

Que tal hoje ser diferente? Sua aula experimental é gratuita, sem compromisso — só pra você sentir como é treinar aqui.

Chama no WhatsApp e marca o seu horário agora. 💪
📲 (42) 99922-2857
📍 Av. Maria Bettega, 360 — Turvo/PR`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Convite Direto / Matrícula
Objetivo: Romper o ciclo de procrastinação típico de segunda-feira com CTA direto e de baixo risco (aula experimental grátis), convertendo intenção em ação imediata.
Funil: Fundo — conversão direta
Ação esperada: Mensagem no WhatsApp agendando aula experimental`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Quebrar o padrão "começo segunda que vem" com humor leve e empatia, oferecendo o caminho de menor fricção: aula experimental grátis, hoje.

COMPOSIÇÃO DA IMAGEM:
• Cena: ambiente convidativo da academia, sem intimidação
• Enquadramento: plano aberto e acolhedor
• Sensação: "esse lugar é pra mim"

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque e CTA
• Teal #00b4b4 — acento secundário
• Preto #1a1a1a — overlay
• Branco #ffffff — texto principal

ESTILO VISUAL:
Fotografia real e convidativa. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'ac50', date:'2026-06-30', time:'08h', format:'Story',
      title:'Prova Social — Quem chegou sem acreditar e ficou',
      driveFile:'Academia25.jpg',
      driveUrl:'https://drive.google.com/file/d/1_tYJHgSeLm7f9M1xyUjD70y-htknP4Ej/view',
      driveHint:'Foto real de aluna em treino tranquilo, sorriso genuíno',
      texto:`"Eu jurava que não tinha jeito pra academia." Já ouvimos isso muitas vezes — e quase sempre vira história de quem ficou. 🧡

Não é sobre ter o corpo "perfeito" antes de começar. É sobre ter gente que acredita em você até você acreditar também.

Se você também jura que "não tem jeito", talvez seja só porque ainda não te conheceram aqui dentro. 💪`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Prova Social / Quebra de objeção
Objetivo: Atacar diretamente a objeção mais comum do público-alvo (mulheres 30-40 sem perfil atlético) — o medo de não se encaixar — com narrativa de pertencimento real.
Funil: Topo — quebra de barreira psicológica de entrada
Ação esperada: Comentário se identificando, compartilhamento com amiga que "também jura que não tem jeito"`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Narrativa de superação da crença limitante "não tenho jeito pra isso" — foco emocional, não estético.

COMPOSIÇÃO DA IMAGEM:
• Cena: aluna real em treino tranquilo, sorriso genuíno
• Enquadramento: plano médio, luz natural
• Sensação: pertencimento, acolhimento, superação silenciosa

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque
• Teal #00b4b4 — acento secundário
• Preto #1a1a1a — overlay mínimo
• Branco #ffffff — texto

ESTILO VISUAL:
Fotografia real e emocional, sem estética hiperfitness. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'ac51', date:'2026-06-30', time:'12h', format:'Story',
      title:'Dica de Saúde — A dor nas costas que o trabalho sentado causa',
      driveFile:'Academia24.jpg',
      driveUrl:'https://drive.google.com/file/d/1Ur7pNcZnnlYEGPQd63A3e-9tF0-x1Umi/view',
      driveHint:'Foto real demonstrando exercício de fortalecimento de core/postura',
      texto:`Passou o dia sentado(a) e as costas já estão avisando? Isso não é "coisa da idade" — é falta de fortalecimento muscular de apoio. 🧡

Fortalecer core e postura reduz (e muito) a dor lombar de quem trabalha sentado o dia inteiro.

Aqui a gente monta o treino pensando na sua rotina real, não numa rotina de Instagram. 💪`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Dica de Saúde / Autoridade Técnica
Objetivo: Conectar o treino a um problema físico cotidiano e específico do público (dor nas costas por trabalho sentado), posicionando a equipe como solução técnica real, não genérica.
Funil: Topo — autoridade e relevância para a rotina real do público
Ação esperada: Salvamento da dica, comentário relatando a própria dor, DM perguntando sobre o treino`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Tratar um problema físico específico e relatable (dor lombar por trabalho sentado) como ponte de entrada para o treino — autoridade técnica aplicada à vida real do público.

COMPOSIÇÃO DA IMAGEM:
• Cena: exercício de fortalecimento de core/postura sendo demonstrado
• Enquadramento: plano médio, foco na execução correta
• Sensação: cuidado técnico, atenção aos detalhes

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque
• Teal #00b4b4 — acento secundário
• Preto #1a1a1a — overlay
• Branco #ffffff — texto

ESTILO VISUAL:
Fotografia real, didática, foco na execução. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'ac52', date:'2026-06-30', time:'17h', format:'Post',
      title:'Diferencial — Fechamos junho com a equipe que te conhece pelo nome',
      driveFile:'Logo Academia Oficial.png',
      driveUrl:'https://drive.google.com/file/d/0B5StJJgxShxeSTNEYm93M1g0Qms/view',
      driveHint:'Logo oficial — post institucional de virada de mês',
      texto:`Mais um mês fechado. 🧡

Enquanto isso, tem academia que nem sabe quantos alunos tem matriculados. Aqui a gente sabe o nome, a história e o progresso de cada um.

✅ Equipe 100% CREF
✅ Mais de 27 anos cuidando de Turvo
✅ Acompanhamento individual, não em massa

Julho começa amanhã. Que comece com você matriculado(a). Aula experimental GRÁTIS — link na bio! 💪
📍 Av. Maria Bettega, 360 — Centro, Turvo/PR
📲 (42) 99922-2857

#academiaemturvo #planetacorpoclubmais #treinoturvo #turvopr #qualidadedevida`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem de segurança: 80px em todas as bordas
Estilo: Institucional, virada de mês`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Diferencial Competitivo + Conversão de virada de mês
Objetivo: Usar o fechamento de junho como gatilho simbólico de novo começo, reforçando o diferencial de acompanhamento nominal e individual frente a academias "de massa", sem citar concorrentes.
Funil: Meio/Fundo — confiança + conversão na virada de mês
Ação esperada: Clique no link da bio, mensagem perguntando sobre matrícula para julho`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
A virada de mês como gatilho simbólico universal de "novo começo" — aproveitar esse momento psicológico natural para conversão, ancorado no diferencial de acompanhamento individual.

COMPOSIÇÃO DA IMAGEM:
• Fundo: laranja (#e63900) institucional
• Logo oficial centralizado
• Lista de diferenciais com ícones de check
• Faixa de CTA com contraste forte

PALETA OBRIGATÓRIA:
• Laranja #e63900 — fundo principal
• Teal #00b4b4 — acento secundário
• Preto #1a1a1a — textos de apoio
• Branco #ffffff — texto principal e ícones

ESTILO VISUAL:
Institucional, confiável, tom de virada/novo começo. Sem texto na imagem além dos ícones de check.`
        }
      ]
    },
    {
      id:'ac53', date:'2026-06-30', time:'20h', format:'Story',
      title:'Matrícula — As últimas horas de junho',
      driveFile:'Academia23.jpg',
      driveUrl:'https://drive.google.com/file/d/1tJwIyn_q134rkN3px66sYeFlUnpADIeG/view',
      driveHint:'Foto real do ambiente da academia em clima noturno de fim de dia',
      texto:`Hoje é o último dia de junho. 🧡

Se você passou o mês pensando "mês que vem eu começo" — mês que vem chegou. É agora.

Aula experimental GRÁTIS, sem compromisso. Vem conhecer antes da meia-noite virar a página. 💪
📲 (42) 99922-2857`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Convite Direto / Urgência simbólica de fim de mês
Objetivo: Usar a urgência natural do último dia do mês (não uma promoção inventada, mas o gatilho psicológico da data) para gerar ação imediata via aula experimental gratuita.
Funil: Fundo — conversão direta
Ação esperada: Mensagem no WhatsApp ainda hoje agendando aula experimental`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Urgência genuína de calendário (último dia do mês) como gatilho de ação — sem promoção artificial, só o peso simbólico da data.

COMPOSIÇÃO DA IMAGEM:
• Cena: ambiente da academia em clima noturno de fim de dia
• Enquadramento: plano médio, leve urgência sem pressão agressiva
• Sensação: "ainda dá tempo"

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque e CTA
• Teal #00b4b4 — acento secundário
• Preto #1a1a1a — overlay
• Branco #ffffff — texto principal

ESTILO VISUAL:
Fotografia real, tom de fechamento de mês. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'ac54', date:'2026-07-01', time:'08h', format:'Story',
      title:'Mês do Amigo — Início oficial (teaser)',
      driveFile:'Academia25.jpg',
      driveUrl:'https://drive.google.com/file/d/1_tYJHgSeLm7f9M1xyUjD70y-htknP4Ej/view',
      driveHint:'Foto real do ambiente da academia em tom misterioso/energético',
      texto:`Hoje começa algo novo aqui na Planeta Corpo. 🧡

Ainda não vamos contar tudo... mas se você tem aquele amigo que sempre quis te acompanhar no treino, já pode ir chamando.

Hoje às 17h a gente revela tudo. Fica de olho! 👀`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Emojis da campanha: 🧡💛🌿 (sem fogo, sem músculo)`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Teaser de Campanha / Awareness — Mês do Amigo
Objetivo: Gerar curiosidade e expectativa pro lançamento oficial do Mês do Amigo, sem revelar detalhes ainda, maximizando atenção pro post das 17h.
Funil: Topo — awareness
Ação esperada: Comentário tentando adivinhar, visualização do story, retorno ao perfil às 17h`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Curiosidade controlada — revelar que algo está chegando sem entregar o mecanismo, criando expectativa real pro anúncio do dia.

COMPOSIÇÃO DA IMAGEM:
• Cena: ambiente da academia em tom misterioso/energético
• Enquadramento: plano médio, luz quente
• Sensação: expectativa positiva

PALETA OBRIGATÓRIA (oficial da campanha Mês do Amigo):
• Laranja #e63900 — destaque
• Preto #1a1a1a — fundo/overlay
• Branco #ffffff — texto

ESTILO VISUAL:
Fotografia real, tom de expectativa. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'ac55', date:'2026-07-01', time:'12h', format:'Story',
      title:'Mês do Amigo — Contagem para as 17h',
      driveFile:'Academia24.jpg',
      driveUrl:'https://drive.google.com/file/d/1Ur7pNcZnnlYEGPQd63A3e-9tF0-x1Umi/view',
      driveHint:'Foto real do ambiente da academia — reforço de suspense',
      texto:`Psiu. 🧡

Faltam só algumas horas pro anúncio de hoje. Spoiler: envolve você, seu amigo e seu bolso.

Marca aqui quem você já sabe que vai chamar. 👇`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Emojis da campanha: 🧡💛🌿`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Teaser de Campanha / Engajamento
Objetivo: Manter o engajamento entre o teaser da manhã e o anúncio oficial, usando provocação leve ("envolve seu bolso") pra reter atenção até as 17h.
Funil: Topo — awareness/engajamento
Ação esperada: Marcação de amigos no story, resposta com nome do amigo`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Reforço de suspense com pista concreta (desconto) sem revelar número, sustentando a curiosidade até o anúncio oficial.

COMPOSIÇÃO DA IMAGEM:
• Elemento gráfico de "?" estilizado sobre o ambiente da academia
• Paleta oficial da campanha

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque
• Preto #1a1a1a — fundo/overlay
• Branco #ffffff — texto

ESTILO VISUAL:
Tom de expectativa, energético. Sem texto além do elemento gráfico de pista.`
        }
      ]
    },
    {
      id:'ac56', date:'2026-07-01', time:'17h', format:'Post',
      title:'Mês do Amigo — Anúncio Oficial',
      driveFile:'Logo Academia Oficial.png',
      driveUrl:'https://drive.google.com/file/d/0B5StJJgxShxeSTNEYm93M1g0Qms/view',
      driveHint:'Logo oficial — post institucional de lançamento da campanha',
      texto:`Chegou o Mês do Amigo na Planeta Corpo! 🧡

Durante todo julho: convide um amigo pra se matricular e os dois ganham 20% de desconto. Você que já treina aqui, e ele que vai começar agora.

Treinar com companhia muda tudo — motivação, constância e aquela conversa boa antes da série. Amigo que treina junto, economiza junto. 💪

Traga seu amigo! Chama no WhatsApp ou vem direto na recepção.
📲 (42) 99922-2857
📍 Av. Maria Bettega, 360 — Turvo/PR

#mesdoamigo #amigoquetreinajunto #planetacorpoclubmais #turvopr #matriculaagora`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas
Hierarquia: Slogan → Logo/Visual → Copy → CTA`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Anúncio Oficial de Campanha / Conversão
Objetivo: Revelar oficialmente a campanha Mês do Amigo com mecânica clara (indicação + 20% pra ambos), gerando indicações imediatas.
Funil: Meio/Fundo — consideração e conversão
Ação esperada: Clique no link da bio, indicação de amigo via WhatsApp/recepção, compartilhamento com a pessoa que será convidada`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Revelar a campanha com clareza total da mecânica — sem letra pequena, benefício mútuo evidente desde a primeira leitura.

COMPOSIÇÃO DA IMAGEM:
• Hierarquia: Slogan → logo/visual → copy → CTA (template oficial da campanha)
• Composição centrada, limpa, energética mas acolhedora

PALETA OBRIGATÓRIA (oficial da campanha Mês do Amigo):
• Laranja #e63900 — destaque
• Preto #1a1a1a — fundo
• Branco #ffffff — texto

ESTILO VISUAL:
Institucional e convidativo. Sem texto na imagem — todo copy vai na legenda, conforme regra da campanha.`
        }
      ]
    },
    {
      id:'ac57', date:'2026-07-01', time:'20h', format:'Story',
      title:'Mês do Amigo — Ainda dá tempo hoje',
      driveFile:'Academia23.jpg',
      driveUrl:'https://drive.google.com/file/d/1tJwIyn_q134rkN3px66sYeFlUnpADIeG/view',
      driveHint:'Foto real do ambiente acolhedor de fim de treino',
      texto:`E aí, já chamou o seu amigo? 🧡

20% de desconto pra você e 20% pra ele — só chamar e vir treinar junto durante julho.

Manda esse story pra ele agora. Conta com a gente pra explicar tudo. 💪`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Emojis da campanha: 🧡💛🌿`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Reforço de CTA / Conversão
Objetivo: Fechar o dia de lançamento reforçando a mecânica de forma simples e gerando ação imediata (compartilhamento direto pro amigo-alvo).
Funil: Fundo — conversão direta
Ação esperada: Compartilhamento do story em DM pro amigo, contato via WhatsApp`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Fechar o dia de lançamento com lembrete direto e baixa fricção — o próprio story funciona como "convite" que pode ser reenviado.

COMPOSIÇÃO DA IMAGEM:
• Cena: ambiente acolhedor de fim de treino
• Paleta oficial da campanha

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque
• Preto #1a1a1a — fundo/overlay
• Branco #ffffff — texto

ESTILO VISUAL:
Tom convidativo, energia de fim de dia. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'ac58', date:'2026-07-02', time:'08h', format:'Story',
      title:'Mês do Amigo — Quem você vai chamar?',
      driveFile:'Academia25.jpg',
      driveUrl:'https://drive.google.com/file/d/1_tYJHgSeLm7f9M1xyUjD70y-htknP4Ej/view',
      driveHint:'Foto real do ambiente da academia, tom leve e descontraído',
      texto:`Pergunta de hoje: quem é aquele amigo que SEMPRE diz "vou começar a treinar" e nunca começa? 🧡

Esse é exatamente quem você precisa chamar pro Mês do Amigo. Os dois saem ganhando 20%.

Comenta o nome dele aqui (sem vergonha, ele agradece depois). 😄`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Emojis da campanha: 🧡💛🌿`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Engajamento / Campanha
Objetivo: Gerar comentários e identificação social em torno da campanha, usando humor leve pra reduzir fricção de convite.
Funil: Topo/Meio — engajamento e ativação de indicações
Ação esperada: Comentários nomeando amigos, marcação de amigos, DM perguntando sobre a campanha`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Humor relatable sobre o "amigo que sempre promete treinar" como gatilho de ação social.

COMPOSIÇÃO DA IMAGEM:
• Cena: ambiente leve e descontraído da academia
• Paleta oficial da campanha

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque
• Preto #1a1a1a — fundo/overlay
• Branco #ffffff — texto

ESTILO VISUAL:
Tom bem-humorado, energético. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'ac59', date:'2026-07-02', time:'12h', format:'Story',
      title:'Mês do Amigo — Como funciona?',
      driveFile:'Academia24.jpg',
      driveUrl:'https://drive.google.com/file/d/1Ur7pNcZnnlYEGPQd63A3e-9tF0-x1Umi/view',
      driveHint:'Foto real do ambiente da academia — formato pergunta-resposta',
      texto:`Dúvida que já chegou aqui: "Como funciona o Mês do Amigo?" 🧡

Simples: você convida um amigo pra se matricular durante julho. Quando ele efetiva a matrícula, vocês dois ganham 20% de desconto. Só isso.

Vale pra alunos ativos, alunos novos e até quem já treinou aqui e quer voltar. Ficou com dúvida? Manda no direct. 💬`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Emojis da campanha: 🧡💛🌿`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Esclarecimento / FAQ da campanha
Objetivo: Responder de forma simples e clara a dúvida mais comum sobre a mecânica da campanha, removendo fricção de quem ainda não entendeu como participar.
Funil: Meio — consideração
Ação esperada: DM com dúvidas adicionais, indicação concreta de amigo`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Resposta direta e simplificada da mecânica da campanha, reduzindo a barreira de "não entendi como funciona".

COMPOSIÇÃO DA IMAGEM:
• Visual de pergunta-resposta, simples e direto
• Paleta oficial da campanha

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque
• Preto #1a1a1a — fundo/overlay
• Branco #ffffff — texto

ESTILO VISUAL:
Didático, direto. Sem texto na imagem (pergunta vai na legenda).`
        }
      ]
    },
    {
      id:'ac60', date:'2026-07-02', time:'17h', format:'Post',
      title:'Mês do Amigo — Quem pode participar',
      driveFile:'Logo Academia Oficial.png',
      driveUrl:'https://drive.google.com/file/d/0B5StJJgxShxeSTNEYm93M1g0Qms/view',
      driveHint:'Logo oficial — post de esclarecimento de elegibilidade',
      texto:`Pra ninguém ficar de fora do Mês do Amigo, aqui vai quem pode participar: 🧡

✅ Alunos ativos que indicarem um amigo
✅ Amigos novos que se matricularem
✅ Ex-alunos que voltarem a treinar durante julho

Vale pra todos os planos da academia. 20% de desconto pros dois lados, sem complicação.

Já sabe quem vai chamar? Vem pra recepção ou chama no WhatsApp. 💪
📲 (42) 99922-2857

#mesdoamigo #amigoquetreinajunto #planetacorpoclubmais #turvopr #matriculaagora`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas
Hierarquia: Lista de elegibilidade → Copy → CTA`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Esclarecimento de Elegibilidade / Conversão
Objetivo: Detalhar publicamente quem pode participar (incluindo ex-alunos, detalhe pouco divulgado), ampliando o público elegível e reduzindo dúvidas que travam a indicação.
Funil: Meio/Fundo — consideração e conversão
Ação esperada: Clique no link da bio, contato de ex-alunos interessados em voltar, indicação efetiva`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Tornar público um detalhe importante (ex-alunos também participam) que amplia o alcance da campanha além dos alunos atuais.

COMPOSIÇÃO DA IMAGEM:
• Lista de elegibilidade com ícones de check
• Hierarquia clara, paleta oficial da campanha

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque
• Preto #1a1a1a — fundo
• Branco #ffffff — texto

ESTILO VISUAL:
Institucional, claro, fácil leitura. Sem texto na imagem além dos ícones de check.`
        }
      ]
    },
    {
      id:'ac61', date:'2026-07-02', time:'20h', format:'Story',
      title:'Bastidores — Ana também já chamou a amiga dela',
      driveFile:'Academia23.jpg',
      driveUrl:'https://drive.google.com/file/d/1tJwIyn_q134rkN3px66sYeFlUnpADIeG/view',
      driveHint:'Foto real da Ana orientando aluno na musculação — substituir pela foto real antes de publicar',
      texto:`Adivinha quem já entrou no Mês do Amigo? A própria Ana! 🧡

Ela é quem te acompanha na musculação aqui na Planeta Corpo — e já chamou uma amiga pra treinar junto também.

Se até quem trabalha aqui tá participando, é sinal que vale a pena. Vem com seu amigo! 💪`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Bastidores / Humanização da equipe + Campanha
Objetivo: Apresentar a Ana individualmente e usá-la como prova social interna da campanha (até a equipe participa), reforçando autenticidade e adesão.
Funil: Topo/Meio — conexão e prova social
Ação esperada: Resposta ao story, identificação com a Ana, ativação de indicação`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Combinar humanização de equipe com prova social da campanha — usar a própria colaboradora como exemplo real de adesão ao Mês do Amigo.

COMPOSIÇÃO DA IMAGEM:
• Elemento principal: foto real da Ana em ação na área de musculação
• Enquadramento natural, sem produção pesada

PALETA OBRIGATÓRIA:
• Laranja #e63900 — detalhes
• Preto #1a1a1a — overlay mínimo
• Branco #ffffff — texto
• Emojis 🧡💛 apenas (padrão de humanização)

ESTILO VISUAL:
Fotografia real e espontânea, autenticidade acima de produção. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'ac62', date:'2026-07-03', time:'08h', format:'Story',
      title:'Mês do Amigo — As primeiras duplas já apareceram',
      driveFile:'Academia25.jpg',
      driveUrl:'https://drive.google.com/file/d/1_tYJHgSeLm7f9M1xyUjD70y-htknP4Ej/view',
      driveHint:'Foto real de dupla treinando junto',
      texto:`Olha que legal: já tem aluno trazendo amigo pro Mês do Amigo! 🧡

Treinar em dupla muda o ritmo — tem mais risada, mais incentivo e ninguém falta porque "combinou com o parceiro".

Ainda não chamou o seu? Vem hoje mesmo. 💪`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Emojis da campanha: 🧡💛🌿`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Prova Social / Momentum de Campanha
Objetivo: Mostrar tração inicial real da campanha (sem números inflados) pra estimular mais indicações pelo efeito de prova social.
Funil: Meio — consideração
Ação esperada: Comentário, indicação de amigo, visita à recepção`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Mostrar que a campanha já está em movimento, gerando senso de "todo mundo já tá fazendo isso".

COMPOSIÇÃO DA IMAGEM:
• Cena: ambiente de treino em dupla, energia leve

PALETA OBRIGATÓRIA (oficial da campanha):
• Laranja #e63900 — destaque
• Preto #1a1a1a — fundo/overlay
• Branco #ffffff — texto

ESTILO VISUAL:
Fotografia real, tom de movimento. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'ac63', date:'2026-07-03', time:'12h', format:'Carrossel',
      title:'Seus amigos = sua melhor academia',
      driveFile:'Academia24.jpg',
      driveUrl:'https://drive.google.com/file/d/1Ur7pNcZnnlYEGPQd63A3e-9tF0-x1Umi/view',
      driveHint:'Imagem de apoio — carrossel educativo sobre treino em dupla',
      texto:`Slide 1: \"Por que treinar com amigo funciona tão bem?\"
Slide 2: \"1. Você falta menos — ninguém quer deixar o parceiro esperando\"
Slide 3: \"2. A série pesada fica mais leve com alguém do seu lado\"
Slide 4: \"3. Comparar evolução com quem você gosta motiva mais que comparar com estranho\"
Slide 5: \"No Mês do Amigo, vocês dois ainda ganham 20% de desconto. Bônus que vale muito.\"

Salva esse carrossel e manda pro seu parceiro de treino (ou pro futuro). 🧡

#mesdoamigo #amigoquetreinajunto #planetacorpoclubmais #turvopr #matriculaagora`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Carrossel Instagram (5 slides)
Dimensões: 1080 × 1350px por slide (proporção 4:5, retrato)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas
Estilo: Educativo, alto valor de salvamento`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Educativo / Construção de Marca — Mês do Amigo
Objetivo: Explicar os benefícios psicológicos reais de treinar acompanhado, reforçando a campanha de forma menos comercial e mais educativa.
Funil: Meio — consideração
Ação esperada: Deslizar o carrossel, salvar, compartilhar com o parceiro de treino`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Lista de benefícios comportamentais do treino em dupla, fechando com o gancho da campanha.

ESTRUTURA DOS SLIDES:
• Slide 1 — Capa-pergunta
• Slides 2-4 — Um benefício por slide
• Slide 5 — Fechamento com gancho da campanha + CTA

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque
• Preto #1a1a1a — fundo
• Branco #ffffff — texto

ESTILO VISUAL:
Didático, frases curtas guiando cada slide.`
        }
      ]
    },
    {
      id:'ac64', date:'2026-07-03', time:'17h', format:'Post',
      title:'Seus amigos viram parte da família aqui',
      driveFile:'Logo Academia Oficial.png',
      driveUrl:'https://drive.google.com/file/d/0B5StJJgxShxeSTNEYm93M1g0Qms/view',
      driveHint:'Grupo real de alunos treinando junto, clima caloroso',
      texto:`Tem aluno que entrou sozinho e hoje treina rodeado de gente que conheceu aqui dentro. 🧡

O Mês do Amigo é sobre isso: usar o pretexto do desconto pra trazer quem você gosta pra essa comunidade.

Daqui um tempo, vocês vão lembrar que tudo começou com uma indicação. Traga o seu! 💪
📲 (42) 99922-2857

#mesdoamigo #amigoquetreinajunto #planetacorpoclubmais #turvopr #comunidadequemotiva`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1350px (proporção 4:5, retrato)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas
Estilo: Emocional, comunidade`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Construção de Marca / Campanha
Objetivo: Elevar a campanha de "desconto" para "comunidade", aprofundando a conexão emocional com o motivo real de indicar um amigo.
Funil: Topo/Meio — relacionamento e consideração
Ação esperada: Comentário emocionado, indicação de amigo, clique no link da bio`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Tirar o foco do desconto e colocar no vínculo humano que a campanha cria, com narrativa de pertencimento.

COMPOSIÇÃO DA IMAGEM:
• Grupo real de alunos treinando junto, clima caloroso

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque
• Preto #1a1a1a — fundo
• Branco #ffffff — texto

ESTILO VISUAL:
Fotografia real e calorosa. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'ac65', date:'2026-07-03', time:'20h', format:'Story',
      title:'Bastidores — Thiago e o motivo de treinar acompanhado',
      driveFile:'Academia23.jpg',
      driveUrl:'https://drive.google.com/file/d/1tJwIyn_q134rkN3px66sYeFlUnpADIeG/view',
      driveHint:'Foto real do Thiago orientando aluno na musculação — substituir pela foto real antes de publicar',
      texto:`Pergunta pro Thiago: por que treinar com amigo faz diferença? Resposta dele: "Cobra mais, motiva mais, ninguém desiste sozinho." 🧡

Ele é da musculação aqui e vê isso todo dia na prática.

Tá esperando o quê pra chamar o seu? 💪`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Bastidores / Humanização da equipe + Campanha
Objetivo: Usar a opinião de um colaborador técnico (Thiago) como prova de autoridade sobre o benefício de treinar em dupla, reforçando a campanha com voz interna.
Funil: Topo/Meio — autoridade e prova social
Ação esperada: Resposta ao story, identificação com o Thiago, indicação de amigo`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Apresentar o Thiago dando sua visão profissional sobre o benefício de treinar acompanhado, somando autoridade técnica à campanha.

COMPOSIÇÃO DA IMAGEM:
• Elemento principal: foto real do Thiago em ação na musculação

PALETA OBRIGATÓRIA:
• Preto #1a1a1a — overlay mínimo
• Laranja #e63900 — detalhes
• Branco #ffffff — texto
• Emojis 🧡💛 apenas (padrão de humanização)

ESTILO VISUAL:
Fotografia real e espontânea. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'ac66', date:'2026-07-04', time:'08h', format:'Post',
      title:'Treinar acompanhado muda o jogo',
      driveFile:'Academia25.jpg',
      driveUrl:'https://drive.google.com/file/d/1_tYJHgSeLm7f9M1xyUjD70y-htknP4Ej/view',
      driveHint:'Ambiente vibrante de treino em grupo',
      texto:`Sábado de treino é diferente quando tem companhia. 🧡

Quem treina com amigo aparece mais, ri mais e larga menos. E esse sábado já tem gente aproveitando o Mês do Amigo pra começar assim.

Ainda dá tempo de chamar o seu pra essa virada de fim de semana. 💪
📲 (42) 99922-2857

#mesdoamigo #amigoquetreinajunto #planetacorpoclubmais #turvopr #treinoemdupla`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1350px (proporção 4:5, retrato)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas
Estilo: Energético, fim de semana`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Motivacional / Campanha — Sábado
Objetivo: Aproveitar a energia de sábado pra reforçar o convite da campanha de forma leve, sem ser repetitivo com o anúncio oficial.
Funil: Meio — consideração
Ação esperada: Indicação de amigo, clique no link da bio`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Conectar a energia natural de sábado (mais tempo livre, mais disposição) com o convite de treinar acompanhado.

COMPOSIÇÃO DA IMAGEM:
• Ambiente vibrante de treino em grupo

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque
• Preto #1a1a1a — fundo
• Branco #ffffff — texto

ESTILO VISUAL:
Energético, fotografia real. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'ac67', date:'2026-07-04', time:'20h', format:'Story',
      title:'Já é sábado e o Mês do Amigo continua valendo',
      driveFile:'Academia24.jpg',
      driveUrl:'https://drive.google.com/file/d/1Ur7pNcZnnlYEGPQd63A3e-9tF0-x1Umi/view',
      driveHint:'Ambiente calmo de fim de semana na academia',
      texto:`Pra quem trabalhou a semana toda e só viu esse story agora: o Mês do Amigo continua até dia 31. 🧡

Sábado é dia bom pra decidir junto com o amigo. Chama ele pra conhecer a academia com você.

Bom treino e bom fim de semana! 💪`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Emojis da campanha: 🧡💛🌿`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Lembrete de Campanha / Fim de semana
Objetivo: Garantir que quem não viu os posts da semana fique sabendo da campanha, sem urgência forçada (ainda é semana 1).
Funil: Topo — awareness
Ação esperada: Visualização, indicação de amigo, mensagem no fim de semana`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Lembrete tranquilo de fim de semana, sem pressão, mantendo a campanha presente na rotina de quem perdeu os posts da semana.

COMPOSIÇÃO DA IMAGEM:
• Ambiente calmo de fim de semana na academia

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque
• Preto #1a1a1a — fundo
• Branco #ffffff — texto

ESTILO VISUAL:
Tom tranquilo, fotografia real. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'ac68', date:'2026-07-05', time:'08h', format:'Story',
      title:'Como funciona, na prática',
      driveFile:'Logo Academia Oficial.png',
      driveUrl:'https://drive.google.com/file/d/0B5StJJgxShxeSTNEYm93M1g0Qms/view',
      driveHint:'Dupla treinando junto, clima leve e real',
      texto:`Imagina assim: você chama aquele seu amigo, ele se matricula durante julho, e prontinho — os dois saem com 20% de desconto e um parceiro de treino garantido. 🧡

É basicamente isso que o Mês do Amigo faz: transforma uma indicação em treino de dupla com desconto de dois.

Quem vai ser a sua dupla essa semana? 💪`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Emojis da campanha: 🧡💛🌿`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Exemplo Prático / Prova de Conceito
Objetivo: Tornar a mecânica da campanha tangível e fácil de visualizar através de um exemplo prático ilustrativo, facilitando a decisão de indicar alguém.
Funil: Meio — consideração
Ação esperada: Identificação, indicação de amigo, comentário perguntando como participar`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Transformar a mecânica abstrata da campanha em um exemplo prático fácil de visualizar, aumentando a clareza e o desejo de replicar.

COMPOSIÇÃO DA IMAGEM:
• Dupla treinando junto, clima leve e real

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque
• Preto #1a1a1a — fundo
• Branco #ffffff — texto

ESTILO VISUAL:
Fotografia real, tom genuíno.`
        }
      ]
    },
    {
      id:'ac69', date:'2026-07-06', time:'08h', format:'Story',
      title:'Segunda é dia de recomeço',
      driveFile:'Academia25.jpg',
      driveUrl:'https://drive.google.com/file/d/1_tYJHgSeLm7f9M1xyUjD70y-htknP4Ej/view',
      driveHint:'Ambiente acolhedor da academia, clima de início de semana',
      texto:`Segunda-feira é sempre uma boa chance de recomeçar. 🧡

Se você já treinou aqui antes e parou, essa semana é um ótimo momento de voltar. E se quiser trazer um amigo, o Mês do Amigo ainda vale — 20% de desconto pros dois.

Bora começar a semana em movimento? 💪`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Emojis da campanha: 🧡💛🌿`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Convite à Matrícula / Reativação
Objetivo: Usar o gatilho psicológico de "segunda-feira, recomeço" pra falar com quem já treinou e parou, sem citar dados internos — só o convite direto de volta.
Funil: Meio/Fundo — reativação e consideração
Ação esperada: Mensagem no WhatsApp, visita à recepção, indicação de amigo`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Segunda-feira como gatilho natural de recomeço, direcionado a quem já foi aluno e afastou-se, com a campanha como bônus e não como foco principal.

COMPOSIÇÃO DA IMAGEM:
• Ambiente acolhedor da academia, início de dia

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque
• Preto #1a1a1a — fundo
• Branco #ffffff — texto

ESTILO VISUAL:
Motivacional, tom leve.`
        }
      ]
    },
    {
      id:'ac70', date:'2026-07-06', time:'12h', format:'Story',
      title:'Treino não é sobre estética, é sobre dormir melhor',
      driveFile:'Academia24.jpg',
      driveUrl:'https://drive.google.com/file/d/1Ur7pNcZnnlYEGPQd63A3e-9tF0-x1Umi/view',
      driveHint:'Foto real do ambiente, tom calmo e cotidiano',
      texto:`Sabia que treinar com regularidade melhora a qualidade do sono? 🌙

Aqui na Planeta Corpo a gente não fala de "corpo dos sonhos" — a gente fala de dormir melhor, ter mais energia e menos estresse no dia a dia. Isso sim é resultado que se sente todo dia.

Qual modalidade você quer testar essa semana? 🧡`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Calmo, educativo`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Dica de Saúde
Objetivo: Reforçar o posicionamento de saúde/bem-estar (não estético) através de um benefício concreto e pouco explorado do treino regular — a qualidade do sono.
Funil: Topo/Meio — awareness e consideração
Ação esperada: Comentário com dúvida sobre modalidades, salvar o post`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Conectar treino regular a um benefício tangível do dia a dia (sono) em vez de estética, reforçando o público-alvo de mulheres 30-40 anos que buscam saúde.

COMPOSIÇÃO DA IMAGEM:
• Ambiente calmo e real da academia

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque
• Azul escuro #003f6b — acento
• Preto #1a1a1a — fundo
• Branco #ffffff — texto

ESTILO VISUAL:
Tom calmo, acolhedor.`
        }
      ]
    },
    {
      id:'ac71', date:'2026-07-06', time:'17h', format:'Post',
      title:'Depoimento — Cristina trouxe a amiga e não se arrepende',
      driveFile:'Logo Academia Oficial.png',
      driveUrl:'https://drive.google.com/file/d/0B5StJJgxShxeSTNEYm93M1g0Qms/view',
      driveHint:'Foto real de aluna sorrindo no ambiente da academia — substituir pela foto real antes de publicar',
      texto:`"Eu já treinava sozinha há um tempo, mas chamar minha amiga pro Mês do Amigo mudou minha rotina. Hoje a gente se cobra e não falta mais." — Cristina, aluna da Planeta Corpo. 🧡

Depoimento real de quem já testou. Quer ser a próxima dupla?
📲 (42) 99922-2857

#mesdoamigo #planetacorpoclubmais #turvopr #depoimentoreal`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1350px (proporção 4:5, retrato)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas
Estilo: Depoimento, citação em destaque`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Prova Social / Depoimento
Objetivo: Trazer prova social genuína de uma aluna real que aderiu à campanha, diferente do formato de bastidor da equipe já usado — reforça resultado prático da campanha.
Funil: Meio/Fundo — consideração e conversão
Ação esperada: Comentário se identificando, indicação de amiga, contato via WhatsApp`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Depoimento real de aluna (não colaboradora) como prova social direta do benefício da campanha.

COMPOSIÇÃO DA IMAGEM:
• Foto real da Cristina sorrindo no ambiente da academia
• Citação em destaque tipográfico

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque
• Preto #1a1a1a — fundo
• Branco #ffffff — texto

ESTILO VISUAL:
Autêntico, citação como elemento central.`
        }
      ]
    },
    {
      id:'ac72', date:'2026-07-06', time:'20h', format:'Story',
      title:'Você sabia que pode trocar seus fitcoins por prêmios?',
      driveFile:'Academia23.jpg',
      driveUrl:'https://drive.google.com/file/d/1tJwIyn_q134rkN3px66sYeFlUnpADIeG/view',
      driveHint:'Foto real do ambiente, tom leve — ideal complementar com print do app GympulsePro',
      texto:`Toda aula sua aqui na Planeta Corpo gera fitcoins no seu app. 🪙🧡

E dá pra trocar por Squeeze, Camiseta, Copo Stanley ou até um Açaí com Whey na Guri.

Já foi ver quantos pontos você já tem acumulado? Abre o app e confere! 📱`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Leve, tom de lembrete`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Humanização / Engajamento de Produto
Objetivo: Incentivar o resgate de fitcoins acumulados (hoje 157 ganhos e 0 resgatados), lembrando o aluno de um benefício que ele provavelmente esqueceu que tem.
Funil: Fundo — engajamento e retenção
Ação esperada: Abrir o app GympulsePro, resgatar fitcoins, comentário perguntando como resgatar`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Lembrete leve e direto sobre o sistema de fitcoins, hoje pouco utilizado pelos alunos apesar de acumularem pontos.

COMPOSIÇÃO DA IMAGEM:
• Foto real do ambiente da academia
• Ícones ilustrativos dos prêmios (squeeze, camiseta, copo)

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque
• Amarelo #f5c800 — ícones de prêmio
• Preto #1a1a1a — fundo
• Branco #ffffff — texto

ESTILO VISUAL:
Leve, convite direto à ação.`
        }
      ]
    },
    {
      id:'ac73', date:'2026-07-07', time:'08h', format:'Story',
      title:'Terça é dia de Spinning',
      driveFile:'Academia25.jpg',
      driveUrl:'https://drive.google.com/file/d/1_tYJHgSeLm7f9M1xyUjD70y-htknP4Ej/view',
      driveHint:'Ambiente da aula de Spinning, energia e ritmo',
      texto:`Terça-feira tem Spinning aqui na Planeta Corpo! 🚴‍♀️🧡

Se seu amigo ainda não conhece a aula, hoje é um ótimo dia pra chamar ele — música boa, ritmo contagiante e ainda vale o desconto do Mês do Amigo.

Quem topa pedalar junto hoje? 💪`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Emojis da campanha: 🧡💛🌿`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Convite à Matrícula / Campanha
Objetivo: Divulgar uma modalidade específica (Spinning) como gancho concreto pra convidar um amigo, tornando o convite da campanha mais tangível do que um pedido genérico.
Funil: Meio — consideração
Ação esperada: Indicação de amigo, pergunta sobre horário da aula`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Usar uma modalidade concreta (Spinning) como gancho de convite, tornando a campanha menos abstrata.

COMPOSIÇÃO DA IMAGEM:
• Ambiente real da aula de Spinning, energia e ritmo

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque
• Preto #1a1a1a — fundo
• Branco #ffffff — texto

ESTILO VISUAL:
Energético, dinâmico.`
        }
      ]
    },
    {
      id:'ac74', date:'2026-07-07', time:'12h', format:'Story',
      title:'Bastidores — Prof. Wellinton e a energia da aula',
      driveFile:'Academia24.jpg',
      driveUrl:'https://drive.google.com/file/d/1Ur7pNcZnnlYEGPQd63A3e-9tF0-x1Umi/view',
      driveHint:'Foto real do Prof. Wellinton conduzindo a aula — substituir pela foto real antes de publicar',
      texto:`Quem já treinou com o Prof. Wellinton sabe: a energia da aula dele é diferente. 🔥🧡

Ele comanda as aulas que viram motivo de comentário até fora da academia. Quem ainda não conheceu, tá perdendo.

Vem sentir na prática essa semana! 💪`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Humanização da equipe
Objetivo: Apresentar o Prof. Wellinton (ainda não humanizado nos posts anteriores) como parte da rotação de destaque da equipe, gerando identificação e curiosidade sobre suas aulas.
Funil: Topo/Meio — conexão
Ação esperada: Resposta ao story, pergunta sobre horário das aulas do Wellinton`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Humanização de um membro da equipe ainda não destacado, usando a energia da aula como diferencial.

COMPOSIÇÃO DA IMAGEM:
• Foto real do Prof. Wellinton conduzindo aula, clima energético

PALETA OBRIGATÓRIA:
• Laranja #e63900 — detalhes
• Preto #1a1a1a — overlay mínimo
• Branco #ffffff — texto
• Emojis 🧡💛 apenas (padrão de humanização)

ESTILO VISUAL:
Fotografia real e espontânea, energia visível.`
        }
      ]
    },
    {
      id:'ac75', date:'2026-07-07', time:'17h', format:'Post',
      title:'3 sinais de que seu corpo tá pedindo movimento',
      driveFile:'Logo Academia Oficial.png',
      driveUrl:'https://drive.google.com/file/d/0B5StJJgxShxeSTNEYm93M1g0Qms/view',
      driveHint:'Post educativo — layout com lista numerada',
      texto:`3 sinais de que seu corpo tá pedindo movimento (nada de estética, saúde mesmo): 🧡

1️⃣ Cansaço mesmo dormindo bem
2️⃣ Dor nas costas de ficar muito tempo sentada
3️⃣ Irritação sem motivo aparente

A modalidade não importa — Musculação, Funcional, Dança ou HIIT. O que importa é começar.
📲 (42) 99922-2857

#planetacorpoclubmais #turvopr #saudenaoestetica #dicadesaude`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1350px (proporção 4:5, retrato)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas
Estilo: Lista numerada, educativo`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Dica de Saúde / Educativo
Objetivo: Ajudar a mulher de 30-40 anos a reconhecer sinais cotidianos (não estéticos) de sedentarismo, aumentando a urgência de forma consultiva, não comercial.
Funil: Topo/Meio — awareness e consideração
Ação esperada: Salvar o post, comentário se identificando com algum sinal`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Lista de sinais cotidianos de sedentarismo, sem apelo estético, reforçando que qualquer modalidade serve como ponto de partida.

COMPOSIÇÃO DA IMAGEM:
• Lista numerada com ícones simples

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque
• Preto #1a1a1a — fundo
• Branco #ffffff — texto

ESTILO VISUAL:
Didático, direto, fácil leitura.`
        }
      ]
    },
    {
      id:'ac76', date:'2026-07-07', time:'20h', format:'Story',
      title:'Faltam menos de 4 semanas de Mês do Amigo',
      driveFile:'Academia23.jpg',
      driveUrl:'https://drive.google.com/file/d/1tJwIyn_q134rkN3px66sYeFlUnpADIeG/view',
      driveHint:'Ambiente noturno tranquilo da academia',
      texto:`Só um lembrete: o Mês do Amigo vale até dia 31. 🧡

Se você já pensou em chamar alguém, essa semana é uma boa hora pra decidir — sem correria de última hora.

Bora fechar sua dupla? 💪`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Emojis da campanha: 🧡💛🌿`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Lembrete de Campanha
Objetivo: Criar leve senso de prazo (sem ser agressivo) pra quem já pensa em indicar um amigo mas ainda não agiu, evitando que a indicação fique só na intenção.
Funil: Meio/Fundo — consideração e conversão
Ação esperada: Indicação de amigo, mensagem no WhatsApp`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Lembrete de prazo com tom tranquilo, incentivando quem já cogitou indicar um amigo a agir sem urgência forçada.

COMPOSIÇÃO DA IMAGEM:
• Ambiente noturno tranquilo da academia

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque
• Preto #1a1a1a — fundo
• Branco #ffffff — texto

ESTILO VISUAL:
Tom tranquilo, sem urgência forçada.`
        }
      ]
    },
    {
      id:'ac77', date:'2026-07-08', time:'08h', format:'Story',
      title:'Quarta é dia de HIIT',
      driveFile:'Academia25.jpg',
      driveUrl:'https://drive.google.com/file/d/1_tYJHgSeLm7f9M1xyUjD70y-htknP4Ej/view',
      driveHint:'Ambiente da aula de HIIT, ritmo intenso',
      texto:`Quarta tem HIIT por aqui — 30 minutos, resultado que você sente na hora. 🔥🧡

Chama seu amigo pra experimentar junto. Ainda vale o desconto duplo do Mês do Amigo.

Bora suar a camisa hoje? 💪`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Emojis da campanha: 🧡💛🌿`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Convite à Matrícula / Campanha
Objetivo: Usar uma segunda modalidade (HIIT, após Spinning na terça) como gancho concreto e variado pra manter o convite da campanha fresco ao longo da semana.
Funil: Meio — consideração
Ação esperada: Indicação de amigo, pergunta sobre horário da aula`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Segunda modalidade específica da semana como gancho de convite, mantendo a campanha variada e não repetitiva.

COMPOSIÇÃO DA IMAGEM:
• Ambiente real da aula de HIIT, ritmo intenso

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque
• Preto #1a1a1a — fundo
• Branco #ffffff — texto

ESTILO VISUAL:
Energético, ritmo acelerado.`
        }
      ]
    },
    {
      id:'ac78', date:'2026-07-08', time:'12h', format:'Story',
      title:'Depoimento — Marcos trouxe o colega de trabalho',
      driveFile:'Academia24.jpg',
      driveUrl:'https://drive.google.com/file/d/1Ur7pNcZnnlYEGPQd63A3e-9tF0-x1Umi/view',
      driveHint:'Foto real de aluno sorrindo no ambiente da academia — substituir pela foto real antes de publicar',
      texto:`"Chamei meu colega de trabalho pro Mês do Amigo só de brincadeira, e hoje treinamos juntos toda semana. Vale muito mais que o desconto." — Marcos, aluno da Planeta Corpo. 🧡

Mais um depoimento real de quem topou a ideia. Quem vai ser o seu parceiro?
📲 (42) 99922-2857`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Depoimento, citação em destaque`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Prova Social / Depoimento
Objetivo: Trazer um segundo depoimento real (masculino, colega de trabalho em vez de amiga) pra ampliar a diversidade de quem se identifica com a campanha.
Funil: Meio/Fundo — consideração e conversão
Ação esperada: Comentário se identificando, indicação de colega, contato via WhatsApp`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Segundo depoimento real, com perfil diferente do primeiro (colega de trabalho, não amiga), ampliando a identificação do público.

COMPOSIÇÃO DA IMAGEM:
• Foto real do Marcos sorrindo no ambiente da academia
• Citação em destaque tipográfico

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque
• Preto #1a1a1a — fundo
• Branco #ffffff — texto

ESTILO VISUAL:
Autêntico, citação como elemento central.`
        }
      ]
    },
    {
      id:'ac79', date:'2026-07-08', time:'17h', format:'Post',
      title:'Tudo incluso, sem pegadinha',
      driveFile:'Logo Academia Oficial.png',
      driveUrl:'https://drive.google.com/file/d/0B5StJJgxShxeSTNEYm93M1g0Qms/view',
      driveHint:'Post institucional — logo e informações de matrícula',
      texto:`R$209/mês, todas as modalidades, horário livre. 🧡

Musculação, Dança, Spinning, Funcional, Jump e HIIT — tudo incluso, sem pegadinha e sem mensalidade separada por modalidade.

E se trouxer um amigo esse mês, os dois ainda ganham 20% de desconto no Mês do Amigo. Bora? 💪
📲 (42) 99922-2857

#planetacorpoclubmais #turvopr #matriculaagora #mesdoamigo`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas
Estilo: Institucional, informativo`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Convite à Matrícula / Institucional
Objetivo: Reforçar de forma direta e clara o valor da mensalidade e tudo que está incluso, removendo objeções comuns de preço e complexidade de planos.
Funil: Fundo — conversão
Ação esperada: Contato via WhatsApp, visita à recepção, indicação de amigo`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Comunicação institucional direta sobre preço e modalidades inclusas, com a campanha como reforço final.

COMPOSIÇÃO DA IMAGEM:
• Logo oficial em destaque
• Lista de modalidades inclusas

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque
• Preto #1a1a1a — fundo
• Branco #ffffff — texto

ESTILO VISUAL:
Institucional, claro, fácil leitura.`
        }
      ]
    },
    {
      id:'ac80', date:'2026-07-08', time:'20h', format:'Story',
      title:'Mais um dia de treino se encerrando',
      driveFile:'Academia23.jpg',
      driveUrl:'https://drive.google.com/file/d/1tJwIyn_q134rkN3px66sYeFlUnpADIeG/view',
      driveHint:'Ambiente noturno tranquilo da academia',
      texto:`Mais um dia de treino se encerrando por aqui. 🧡

Se ainda não chamou seu amigo pro Mês do Amigo, amanhã é mais uma chance.

Bom descanso e até a próxima aula! 🌙💪`,
      secoes:[
        {
          num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Humanização / Encerramento
Objetivo: Fechar a semana de conteúdo com tom tranquilo, mantendo a campanha presente sem repetir o mesmo apelo usado nos stories anteriores.
Funil: Topo — relacionamento
Ação esperada: Resposta ao story, indicação de amigo no dia seguinte`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Encerramento tranquilo de fim de dia, com lembrete leve da campanha.

COMPOSIÇÃO DA IMAGEM:
• Ambiente noturno tranquilo da academia

PALETA OBRIGATÓRIA:
• Laranja #e63900 — destaque
• Preto #1a1a1a — fundo
• Branco #ffffff — texto

ESTILO VISUAL:
Tom tranquilo, fotografia real.`
        }
      ]
    },
  ],

  sorveteria:[
    {
      id:'so1', date:'2026-06-16', time:'09h', format:'Story',
      title:'Produto do Dia — Abertura de semana',
      driveFile:'mascote3d_guri_pose01_sorvete_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1Tb4fIXrE5vWurOTlJPjdfg3kxK9W8Olu/view',
      driveHint:'Mascote 3D Guri com sorvete — protagonista do story',
      texto:`🍦 Bom dia, Turvo!

Começa a semana com o sabor que todo mundo ama!

Hoje em destaque: [COLOQUE O SABOR DO DIA] 😍

Peça agora! Link na bio 📱 ou chama no WhatsApp 👇

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Festivo, colorido, energético`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Produto do Dia / Divulgação
Objetivo: Criar hábito diário de acompanhamento do perfil — o público espera saber qual é o sabor do dia. Gera visita à loja no mesmo dia.
Funil: Fundo — conversão imediata (visita física)
Ação esperada: Visita à sorveteria no dia`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Story diário recorrente com identidade visual consistente. O público deve reconhecer esse formato toda manhã. O mascote 3D Guri é o comunicador oficial — transmite alegria e personalidade da marca.

COMPOSIÇÃO DA IMAGEM:
• Fundo: degradê diagonal de azul escuro (#003f6b) para azul turquesa (#00b4d8)
• Elementos decorativos: bolinhas coloridas, confetes e formas geométricas simples em amarelo (#f5c800) e branco
• Mascote Guri (importado do Drive) posicionado à direita, ocupando 60% da altura
• Espaço à esquerda/topo para texto do sabor do dia
• Caixa destacada em amarelo (#f5c800) com borda arredondada para nome do sabor

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo principal
• Azul turquesa #00b4d8 — degradê e acentos
• Amarelo #f5c800 — caixa do sabor e confetes
• Branco #ffffff — texto e logo

ESTILO VISUAL:
Festivo e alegre como a marca Guri. Alta energia visual, cores saturadas mas harmônicas. Mascote 3D é o centro emocional da composição.`
        }
      ]
    },
    {
      id:'so2', date:'2026-06-16', time:'11h30', format:'Post',
      title:'Construção de Marca — Foto produto',
      driveFile:'11.08 - Sabores Guri Mini BomBom de Açaí.png',
      driveUrl:'https://drive.google.com/file/d/1as6g-9NsXdkpm2Yrh-p__w3SCZ73NTNv/view',
      driveHint:'Post de sabores já produzido — pode repostar ou usar como referência',
      texto:`Segunda-feira fica muito melhor com um sorvete na mão! 🍦☀️

Sabores que fazem a sua semana começar com alegria.

Venha nos visitar em Turvo/PR!

Qual sabor você provaria? Comenta aí! 👇

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem: 80px nas bordas
Estilo: Food photography — produto como protagonista`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Construção de Marca / Brand Awareness
Objetivo: Consolidar a identidade visual da Sorveteria Guri no feed — post permanente que comunica qualidade e alegria do produto. Não é promocional, é de posicionamento.
Funil: Topo — reconhecimento e desejo
Ação esperada: Curtida, salvamento e visita futura`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Post de produto limpo e apetitoso. O sorvete deve ser o protagonista absoluto. Menos é mais — design serve ao produto, não compete com ele.

COMPOSIÇÃO DA IMAGEM:
• Ângulo: flat lay (vista de cima 90°) ou 3/4 levemente elevado
• Produto: sorvete ou picolé em destaque central, bem iluminado
• Superfície: azul turquesa (#00b4d8) ou mármore branco com toques azuis
• Elementos decorativos: frutas frescas relacionadas ao sabor, flores simples em amarelo
• Espaço superior/inferior para logo e texto no Canva
• Luz: natural e suave, sem sombras duras

PALETA OBRIGATÓRIA:
• Azul turquesa #00b4d8 — fundo/superfície
• Amarelo #f5c800 — elementos decorativos
• Azul escuro #003f6b — texto e logo
• Branco #ffffff — espaço limpo ao redor do produto

ESTILO VISUAL:
Food photography profissional. Apetitoso, fresco e alegre. A imagem deve dar vontade de comer imediatamente.`
        }
      ]
    },
    {
      id:'so3', date:'2026-06-16', time:'15h', format:'Story',
      title:'Promoção do Dia — Combo da tarde',
      driveFile:'mascote3d_guri_pose02_apresentando_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1saHs8AqxRT27bXp_AMtPw8UjThvDvp7f/view',
      driveHint:'Mascote pose 02 "apresentando" — perfeito para anunciar promoção',
      texto:`☀️ TARDE QUENTE = HORA DO SORVETE!

Combo especial de segunda:
🍦 2 casquinhas por R$ [VALOR]

Só hoje! Corre lá ou chama no WhatsApp! 🏃
Link na bio para pedir online 📱

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Promocional com urgência visual`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Promoção do Dia / Oferta com Urgência
Objetivo: Gerar visita imediata à loja no período da tarde — horário de calor e maior fluxo em sorveterias. O "só hoje" cria urgência real.
Funil: Fundo — conversão imediata
Ação esperada: Visita à loja ainda no mesmo dia`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Story de promoção com alta energia visual. O mascote Guri em pose de "apresentando" é o vendedor da oferta — aponta para o preço e convida a visita. Urgência comunicada visualmente pelo amarelo dominante.

COMPOSIÇÃO DA IMAGEM:
• Fundo: amarelo vibrante (#f5c800) como cor dominante — transmite calor, sol e urgência
• Elementos: raios de sol estilizados, estrelas e formas dinâmicas em azul escuro (#003f6b)
• Mascote Guri pose 02 (Drive) posicionado à esquerda, gesticulando para a direita
• Área direita: caixa de preço em azul escuro (#003f6b) com texto branco
• Topo: banner "SÓ HOJE!" em azul escuro com borda branca

PALETA OBRIGATÓRIA:
• Amarelo #f5c800 — fundo dominante (urgência e calor)
• Azul escuro #003f6b — caixas de texto e "SÓ HOJE"
• Azul turquesa #00b4d8 — acentos e setas
• Branco #ffffff — texto sobre fundo escuro

ESTILO VISUAL:
Alta energia, impacto visual imediato. O olho do espectador deve ser atraído pela sequência: mascote → preço → CTA. Dinâmico como um cartaz de promoção de loja.`
        }
      ]
    },
    {
      id:'so4', date:'2026-06-16', time:'19h', format:'Story',
      title:'Encerramento — Boa noite Turvo',
      driveFile:'LOGO-GURI-V2.png',
      driveUrl:'https://drive.google.com/file/d/1fO9HP4JSSYFfboE_jDGbNUFoRP38xcBk/view',
      driveHint:'Logo Guri V2 — elemento central do encerramento',
      texto:`Que semana boa comece assim — com doçura! 🍦💛

Amanhã tem mais sabores e mais sorrisos esperando por você.

Boa noite, Turvo! 😊

Ta alguém que ama sorvete tanto quanto você! 😍

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Aconchegante, emocional, comunidade`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Relacionamento / Comunidade
Objetivo: Fechar o dia reforçando o vínculo afetivo com a comunidade de Turvo. Não é post de venda — é presença de marca no fim do dia, como um "boa noite" de um amigo.
Funil: Topo — fidelização e lembrança de marca
Ação esperada: Resposta ao story, emoji ou compartilhamento`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Post de encerramento do dia com tom caloroso e afetivo. A marca Guri se posiciona como parte do cotidiano de Turvo — como um vizinho querido que diz boa noite.

COMPOSIÇÃO DA IMAGEM:
• Fundo: degradê noturno de azul escuro (#003f6b) suavizando para azul turquesa (#00b4d8) no topo
• Elementos: lua crescente e estrelinhas em amarelo (#f5c800) delicadas e espalhadas
• Centro: espaço limpo para o logo Guri com efeito de brilho suave ao redor
• Atmosfera: tranquila, fim de dia em cidade do interior, sem agitação

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo principal noturno
• Azul turquesa #00b4d8 — degradê superior
• Amarelo #f5c800 — lua, estrelas e detalhes quentes
• Branco #ffffff — logo e texto

ESTILO VISUAL:
Suave e contemplativo. Contraste com os stories diurnos enérgicos — esse é o momento de descanso da marca. Menos elementos, mais espaço vazio e respiro visual.`
        }
      ]
    },
    {
      id:'so9', date:'2026-06-17', time:'09h', format:'Story',
      title:'Produto do Dia — Quarta-feira de sabor',
      driveFile:'mascote3d_guri_pose01_sorvete_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1Tb4fIXrE5vWurOTlJPjdfg3kxK9W8Olu/view',
      driveHint:'Mascote 3D Guri com sorvete — protagonista do story',
      texto:`🍦 Bom dia, Turvo!

Já é quarta-feira e o Guri trouxe uma novidade gostosa pra você!

Hoje em destaque: [COLOQUE O SABOR DO DIA] 😍

Peça agora! Link na bio 📱 ou chama no WhatsApp 👇

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Festivo, colorido, energético`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Produto do Dia / Divulgação
Objetivo: Manter hábito diário de acompanhamento do perfil, garantindo visita ou pedido no mesmo dia.
Funil: Fundo — conversão imediata
Ação esperada: Pedido pelo link da bio ou visita no mesmo dia`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Story diário recorrente com consistência visual, mantendo o mascote Guri como comunicador oficial e criando reconhecimento de padrão pelo público.

COMPOSIÇÃO DA IMAGEM:
• Fundo: degradê diagonal de azul escuro (#003f6b) para azul turquesa (#00b4d8)
• Elementos decorativos: confetes e formas geométricas em amarelo (#f5c800) e branco
• Mascote Guri posicionado à direita, ocupando 60% da altura
• Espaço à esquerda/topo para texto do sabor do dia
• Caixa destacada em amarelo com borda arredondada para nome do sabor

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo principal
• Azul turquesa #00b4d8 — degradê e acentos
• Amarelo #f5c800 — caixa do sabor e confetes
• Branco #ffffff — texto e logo

ESTILO VISUAL:
Festivo e alegre, consistente com a identidade visual da semana.`
        }
      ]
    },
    {
      id:'so10', date:'2026-06-17', time:'11h30', format:'Post',
      title:'Construção de Marca — Meio de semana',
      driveFile:'11.08 - Sabores Guri Mini BomBom de Açaí.png',
      driveUrl:'https://drive.google.com/file/d/1as6g-9NsXdkpm2Yrh-p__w3SCZ73NTNv/view',
      driveHint:'Post de sabores já produzido — pode repostar ou usar como referência',
      texto:`Quarta-feira é dia de quebrar a rotina com algo gostoso. 🍦☀️

Sabores que transformam qualquer momento comum em especial.

Venha nos visitar em Turvo/PR!

Qual sabor você provaria? Comenta aí! 👇

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem: 80px nas bordas
Estilo: Food photography — produto como protagonista`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Construção de Marca / Brand Awareness
Objetivo: Manter presença consistente no feed associando o produto a uma pausa prazerosa no meio da semana.
Funil: Topo — reconhecimento e desejo
Ação esperada: Curtida, comentário com sabor preferido, salvamento`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Post de produto limpo e apetitoso, associando o sorvete a um momento de pausa e prazer no meio da semana de trabalho.

COMPOSIÇÃO DA IMAGEM:
• Ângulo: flat lay (vista de cima) ou 3/4 levemente elevado
• Produto: sorvete em destaque central, bem iluminado
• Superfície: azul turquesa (#00b4d8) ou mármore branco com toques azuis
• Elementos decorativos: frutas frescas relacionadas ao sabor, detalhes em amarelo
• Luz: natural e suave, sem sombras duras

PALETA OBRIGATÓRIA:
• Azul turquesa #00b4d8 — fundo/superfície
• Amarelo #f5c800 — elementos decorativos
• Azul escuro #003f6b — texto e logo
• Branco #ffffff — espaço limpo ao redor

ESTILO VISUAL:
Food photography profissional, apetitoso e fresco.`
        }
      ]
    },
    {
      id:'so11', date:'2026-06-17', time:'15h', format:'Story',
      title:'Promoção do Dia — Quarta com desconto',
      driveFile:'mascote3d_guri_pose02_apresentando_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1saHs8AqxRT27bXp_AMtPw8UjThvDvp7f/view',
      driveHint:'Mascote pose 02 "apresentando" — ideal para anunciar promoção',
      texto:`☀️ QUARTA-FEIRA TEM PROMOÇÃO ESPECIAL!

Combo do dia:
🍦 2 picolés gourmet por R$ [VALOR]

Só hoje! Corre lá ou chama no WhatsApp 👇
Link na bio para pedir online 📱

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Promocional com urgência visual`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Promoção do Dia / Oferta com Urgência
Objetivo: Gerar pedido ou visita imediata no período da tarde, aproveitando o calor e maior movimento.
Funil: Fundo — conversão imediata
Ação esperada: Pedido online ou visita à loja no mesmo dia`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Story de promoção com alta energia visual, mascote Guri apresentando a oferta do dia com urgência comunicada pelo amarelo dominante.

COMPOSIÇÃO DA IMAGEM:
• Fundo: amarelo vibrante (#f5c800) como cor dominante
• Elementos: raios de sol estilizados e formas dinâmicas em azul escuro (#003f6b)
• Mascote Guri pose 02 posicionado à esquerda, gesticulando para a direita
• Área direita: caixa de preço em azul escuro com texto branco
• Topo: banner "SÓ HOJE!" em azul escuro com borda branca

PALETA OBRIGATÓRIA:
• Amarelo #f5c800 — fundo dominante
• Azul escuro #003f6b — caixas de texto e "SÓ HOJE"
• Azul turquesa #00b4d8 — acentos e setas
• Branco #ffffff — texto sobre fundo escuro

ESTILO VISUAL:
Alta energia, impacto visual imediato seguindo sequência: mascote → preço → CTA.`
        }
      ]
    },
    {
      id:'so12', date:'2026-06-17', time:'19h', format:'Story',
      title:'Encerramento — Boa noite Turvo',
      driveFile:'LOGO-GURI-V2.png',
      driveUrl:'https://drive.google.com/file/d/1fO9HP4JSSYFfboE_jDGbNUFoRP38xcBk/view',
      driveHint:'Logo Guri V2 — elemento central do encerramento',
      texto:`Mais uma quarta-feira chegando ao fim com muito sabor. 🍦💛

Já estamos na metade da semana — e amanhã tem mais novidades esperando por você!

Boa noite, Turvo! 😊

Tag alguém que ama sorvete tanto quanto você! 😍

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Aconchegante, emocional, comunidade`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Relacionamento / Comunidade
Objetivo: Fechar o dia reforçando vínculo afetivo, marcando a passagem da metade da semana como conquista coletiva.
Funil: Topo — fidelização e lembrança de marca
Ação esperada: Resposta ao story, emoji ou compartilhamento`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Encerramento do dia com tom caloroso, marcando a metade da semana como um pequeno marco positivo compartilhado com a comunidade.

COMPOSIÇÃO DA IMAGEM:
• Fundo: degradê noturno de azul escuro (#003f6b) para azul turquesa (#00b4d8) no topo
• Elementos: lua crescente e estrelinhas em amarelo (#f5c800) delicadas
• Centro: espaço limpo para o logo Guri com efeito de brilho suave
• Atmosfera: tranquila, acolhedora

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo principal noturno
• Azul turquesa #00b4d8 — degradê superior
• Amarelo #f5c800 — lua, estrelas e detalhes
• Branco #ffffff — logo e texto

ESTILO VISUAL:
Suave e contemplativo, fim de dia tranquilo.`
        }
      ]
    },
    {
      id:'so13', date:'2026-06-18', time:'09h', format:'Story',
      title:'Produto do Dia — Quinta-feira de sabor',
      driveFile:'mascote3d_guri_pose01_sorvete_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1Tb4fIXrE5vWurOTlJPjdfg3kxK9W8Olu/view',
      driveHint:'Mascote 3D Guri com sorvete — protagonista do story',
      texto:`🍦 Bom dia, Turvo!

Já é quinta-feira e o Guri preparou tudo pra te receber hoje!

Hoje em destaque: [COLOQUE O SABOR DO DIA] 😍

Peça agora! Link na bio 📱 ou chama no WhatsApp 👇

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Festivo, colorido, energético`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Produto do Dia / Divulgação
Objetivo: Manter hábito diário de acompanhamento, reforçar presença constante da marca.
Funil: Fundo — conversão imediata
Ação esperada: Pedido pelo link da bio ou visita à loja no mesmo dia`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Story diário recorrente mantendo consistência visual, com mascote Guri como comunicador oficial.

COMPOSIÇÃO DA IMAGEM:
• Fundo: degradê diagonal de azul escuro (#003f6b) para azul turquesa (#00b4d8)
• Elementos decorativos: confetes e formas geométricas em amarelo (#f5c800) e branco
• Mascote Guri posicionado à direita, ocupando 60% da altura
• Caixa destacada em amarelo com borda arredondada para nome do sabor

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo principal
• Azul turquesa #00b4d8 — degradê e acentos
• Amarelo #f5c800 — caixa do sabor e confetes
• Branco #ffffff — texto e logo

ESTILO VISUAL:
Festivo e alegre, consistente com a identidade visual.`
        }
      ]
    },
    {
      id:'so14', date:'2026-06-18', time:'11h30', format:'Post',
      title:'Construção de Marca — Açaí, o melhor da cidade',
      driveFile:'11.08 - Sabores Guri Mini BomBom de Açaí.png',
      driveUrl:'https://drive.google.com/file/d/1as6g-9NsXdkpm2Yrh-p__w3SCZ73NTNv/view',
      driveHint:'Post de sabores já produzido — pode repostar ou usar como referência',
      texto:`Não é modéstia, é fato: temos o melhor açaí da cidade. 🍇🍦

Cremoso, fresquinho e cheio de sabor — exatamente como um bom açaí precisa ser.

Venha provar e tirar suas próprias conclusões em Turvo/PR!

Qual sabor você provaria? Comenta aí! 👇

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem: 80px nas bordas
Estilo: Food photography — produto como protagonista`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Diferencial Competitivo / Construção de Marca
Objetivo: Afirmar com confiança a liderança em qualidade de açaí na cidade, gerando curiosidade e desejo de comprovar a afirmação.
Funil: Topo — reconhecimento e desejo, posicionamento de liderança
Ação esperada: Curtida, comentário, visita para "comprovar"`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Post de afirmação confiante sobre a qualidade do açaí, posicionando a marca como referência local — convite implícito para "provar e comprovar".

COMPOSIÇÃO DA IMAGEM:
• Ângulo: flat lay ou 3/4 elevado, destacando textura cremosa do açaí
• Produto: açaí em destaque com coberturas visíveis (granola, frutas)
• Superfície: azul turquesa (#00b4d8) ou mármore branco
• Luz: natural e suave, destacando a cremosidade

PALETA OBRIGATÓRIA:
• Azul turquesa #00b4d8 — fundo/superfície
• Amarelo #f5c800 — elementos decorativos
• Azul escuro #003f6b — texto e logo
• Branco #ffffff — espaço limpo ao redor

ESTILO VISUAL:
Food photography profissional, destacando textura e frescor do açaí especificamente.`
        }
      ]
    },
    {
      id:'so15', date:'2026-06-18', time:'15h', format:'Story',
      title:'Promoção do Dia — Quinta com desconto',
      driveFile:'mascote3d_guri_pose02_apresentando_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1saHs8AqxRT27bXp_AMtPw8UjThvDvp7f/view',
      driveHint:'Mascote pose 02 "apresentando" — ideal para anunciar promoção',
      texto:`☀️ QUINTA-FEIRA TEM DESCONTO ESPECIAL!

Combo do dia:
🍦 Pote 500ml por R$ [VALOR]

Só hoje! Corre lá ou chama no WhatsApp 👇
Link na bio para pedir online 📱

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Promocional com urgência visual`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Promoção do Dia / Oferta com Urgência
Objetivo: Gerar pedido ou visita imediata no período da tarde.
Funil: Fundo — conversão imediata
Ação esperada: Pedido online ou visita à loja no mesmo dia`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Story de promoção com alta energia visual, mascote Guri apresentando a oferta do dia.

COMPOSIÇÃO DA IMAGEM:
• Fundo: amarelo vibrante (#f5c800) como cor dominante
• Elementos: raios de sol estilizados em azul escuro (#003f6b)
• Mascote Guri pose 02 posicionado à esquerda, gesticulando para a direita
• Área direita: caixa de preço em azul escuro com texto branco

PALETA OBRIGATÓRIA:
• Amarelo #f5c800 — fundo dominante
• Azul escuro #003f6b — caixas de texto e "SÓ HOJE"
• Azul turquesa #00b4d8 — acentos e setas
• Branco #ffffff — texto sobre fundo escuro

ESTILO VISUAL:
Alta energia, impacto visual imediato.`
        }
      ]
    },
    {
      id:'so16', date:'2026-06-18', time:'19h', format:'Story',
      title:'Encerramento — Boa noite Turvo',
      driveFile:'LOGO-GURI-V2.png',
      driveUrl:'https://drive.google.com/file/d/1fO9HP4JSSYFfboE_jDGbNUFoRP38xcBk/view',
      driveHint:'Logo Guri V2 — elemento central do encerramento',
      texto:`Mais uma quinta-feira chegando ao fim com muito sabor. 🍦💛

Amanhã é sexta — e sexta na Guri é sempre especial!

Boa noite, Turvo! 😊

Tag alguém que ama sorvete tanto quanto você! 😍

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Aconchegante, emocional, comunidade`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Relacionamento / Comunidade
Objetivo: Fechar o dia reforçando vínculo afetivo, antecipando sexta-feira.
Funil: Topo — fidelização e lembrança de marca
Ação esperada: Resposta ao story, emoji ou compartilhamento`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Encerramento do dia com tom caloroso, antecipando a sexta-feira como gancho emocional positivo.

COMPOSIÇÃO DA IMAGEM:
• Fundo: degradê noturno de azul escuro (#003f6b) para azul turquesa (#00b4d8)
• Elementos: lua crescente e estrelinhas em amarelo (#f5c800)
• Centro: espaço limpo para o logo Guri com efeito de brilho suave

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo principal noturno
• Azul turquesa #00b4d8 — degradê superior
• Amarelo #f5c800 — lua, estrelas e detalhes
• Branco #ffffff — logo e texto

ESTILO VISUAL:
Suave e contemplativo, com leve antecipação positiva.`
        }
      ]
    },
    {
      id:'so17', date:'2026-06-19', time:'09h', format:'Story',
      title:'Produto do Dia — Sexta especial',
      driveFile:'mascote3d_guri_pose01_sorvete_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1Tb4fIXrE5vWurOTlJPjdfg3kxK9W8Olu/view',
      driveHint:'Mascote 3D Guri com sorvete — protagonista do story',
      texto:`🍦 Bom dia, Turvo!

SEXTA-FEIRA chegou e com ela o sabor que vai abrir seu fim de semana com o pé direito!

Hoje em destaque: [COLOQUE O SABOR DO DIA] 😍

Peça agora! Link na bio 📱 ou chama no WhatsApp 👇

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Festivo, com energia de sexta-feira`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Produto do Dia / Divulgação
Objetivo: Capitalizar a energia positiva de sexta-feira como gancho emocional de início de fim de semana.
Funil: Fundo — conversão imediata com gancho emocional de sexta
Ação esperada: Pedido pelo link da bio ou visita no mesmo dia`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Story diário com energia elevada por ser sexta-feira, conectando o produto à sensação de "início do fim de semana".

COMPOSIÇÃO DA IMAGEM:
• Fundo: degradê diagonal de azul escuro (#003f6b) para azul turquesa (#00b4d8)
• Elementos decorativos: confetes extras, mais vibrantes que dias normais
• Mascote Guri posicionado à direita, com pose mais animada se possível

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo principal
• Azul turquesa #00b4d8 — degradê e acentos
• Amarelo #f5c800 — caixa do sabor e confetes
• Branco #ffffff — texto e logo

ESTILO VISUAL:
Festivo e alegre, com energia elevada de sexta-feira.`
        }
      ]
    },
    {
      id:'so18', date:'2026-06-19', time:'11h30', format:'Post',
      title:'Construção de Marca — Cardápio Gourmet',
      driveFile:'11.08 - Sabores Guri Mini BomBom de Açaí.png',
      driveUrl:'https://drive.google.com/file/d/1as6g-9NsXdkpm2Yrh-p__w3SCZ73NTNv/view',
      driveHint:'Post de sabores já produzido — pode repostar ou usar como referência',
      texto:`Sexta-feira pede algo especial. Que tal nossas Taças Gourmet? 🍨✨

Combinações incríveis de sabores, coberturas e texturas — feitas pra transformar qualquer sexta em ocasião especial.

Venha conhecer nosso cardápio completo em Turvo/PR!

Qual taça você quer experimentar? Comenta aí! 👇

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem: 80px nas bordas
Estilo: Food photography sofisticada — produto gourmet`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Diferencial Competitivo / Construção de Marca
Objetivo: Destacar o cardápio gourmet (taças e milk shakes) como diferencial de sofisticação, atraindo quem busca uma experiência mais elaborada que sorvete simples.
Funil: Topo — desejo e diferenciação, atração de público gourmet
Ação esperada: Curtida, comentário, visita para experiência completa`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Post de produto sofisticado, destacando a categoria gourmet do cardápio — taças elaboradas com múltiplas camadas e coberturas visíveis.

COMPOSIÇÃO DA IMAGEM:
• Ângulo: 3/4 elevado, destacando altura e camadas da taça gourmet
• Produto: taça com múltiplas camadas, coberturas, calda visível
• Superfície: mármore branco elegante com toques azuis sutis
• Luz: natural e sofisticada, estilo editorial de revista

PALETA OBRIGATÓRIA:
• Azul turquesa #00b4d8 — fundo/superfície
• Amarelo #f5c800 — elementos decorativos pontuais
• Azul escuro #003f6b — texto e logo
• Branco #ffffff — espaço limpo, elegante

ESTILO VISUAL:
Food photography mais sofisticada que o padrão diário — tom editorial e premium.`
        }
      ]
    },
    {
      id:'so19', date:'2026-06-19', time:'15h', format:'Story',
      title:'Promoção do Dia — Sexta com desconto',
      driveFile:'mascote3d_guri_pose02_apresentando_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1saHs8AqxRT27bXp_AMtPw8UjThvDvp7f/view',
      driveHint:'Mascote pose 02 "apresentando" — ideal para anunciar promoção',
      texto:`☀️ SEXTA-FEIRA TEM PROMOÇÃO DE FIM DE SEMANA!

Combo do dia:
🍦 Milk Shake + Taça pequena por R$ [VALOR]

Só hoje! Corre lá ou chama no WhatsApp 👇
Link na bio para pedir online 📱

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Promocional com urgência visual de fim de semana`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Promoção do Dia / Combo Gourmet
Objetivo: Gerar pedido combinando produtos gourmet (milk shake + taça) com gancho de início de fim de semana.
Funil: Fundo — conversão imediata com produtos de maior valor agregado
Ação esperada: Pedido online ou visita à loja no mesmo dia`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Story de promoção combinando produtos gourmet, com energia de início de fim de semana mais elevada que promoções de dias comuns.

COMPOSIÇÃO DA IMAGEM:
• Fundo: amarelo vibrante (#f5c800) como cor dominante
• Elementos: raios de sol e elementos festivos extras de fim de semana
• Mascote Guri pose 02 posicionado à esquerda
• Área direita: caixa de preço destacando o combo

PALETA OBRIGATÓRIA:
• Amarelo #f5c800 — fundo dominante
• Azul escuro #003f6b — caixas de texto e "SÓ HOJE"
• Azul turquesa #00b4d8 — acentos e setas
• Branco #ffffff — texto sobre fundo escuro

ESTILO VISUAL:
Alta energia, com tom especial de início de fim de semana.`
        }
      ]
    },
    {
      id:'so20', date:'2026-06-19', time:'19h', format:'Story',
      title:'Encerramento — Fim de semana chegando',
      driveFile:'LOGO-GURI-V2.png',
      driveUrl:'https://drive.google.com/file/d/1fO9HP4JSSYFfboE_jDGbNUFoRP38xcBk/view',
      driveHint:'Logo Guri V2 — elemento central do encerramento',
      texto:`Semana fechada com muito sabor! 🍦💛

Amanhã é sábado — e sábado pede sorvete em dobro, né? 😄

Boa noite, Turvo! Te esperamos no fim de semana! 😊

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Aconchegante, animado pelo fim de semana`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Relacionamento / Antecipação de Fim de Semana
Objetivo: Fechar a semana com antecipação positiva e bem-humorada do sábado, preparando terreno para maior movimento no fim de semana.
Funil: Topo — fidelização e antecipação de visita no fim de semana
Ação esperada: Resposta ao story, reação positiva, planejamento de visita`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Encerramento de sexta-feira com tom bem-humorado e antecipação do movimento maior esperado no sábado.

COMPOSIÇÃO DA IMAGEM:
• Fundo: degradê noturno de azul escuro (#003f6b) para azul turquesa (#00b4d8)
• Elementos: lua, estrelinhas em amarelo (#f5c800), com toque festivo extra de fim de semana
• Centro: espaço para o logo Guri com efeito de brilho

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo principal noturno
• Azul turquesa #00b4d8 — degradê superior
• Amarelo #f5c800 — lua, estrelas e detalhes
• Branco #ffffff — logo e texto

ESTILO VISUAL:
Suave mas com toque animado, antecipando o fim de semana.`
        }
      ]
    },
    {
      id:'so21', date:'2026-06-20', time:'09h', format:'Story',
      title:'Bom dia de sábado — Abertura especial',
      driveFile:'mascote3d_guri_pose01_sorvete_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1Tb4fIXrE5vWurOTlJPjdfg3kxK9W8Olu/view',
      driveHint:'Mascote 3D Guri com sorvete — protagonista do story',
      texto:`🍦 Bom dia, Turvo! SÁBADO chegou!

O dia perfeito pra reunir a família e vir tomar um sorvetão aqui na Guri! 😍

Hoje em destaque: [COLOQUE O SABOR DO DIA]

Já estamos abertos! Peça agora ou venha nos visitar 📱

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Festivo, energia máxima de sábado`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Produto do Dia / Abertura de Sábado
Objetivo: Capturar o maior movimento de sábado desde a abertura, convidando famílias para visita presencial — dia de pico de vendas.
Funil: Fundo — conversão imediata, maior tráfego do dia
Ação esperada: Visita imediata à loja ou pedido online`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Story de abertura com energia máxima, capitalizando o sábado como dia de maior movimento e foco familiar.

COMPOSIÇÃO DA IMAGEM:
• Fundo: degradê diagonal de azul escuro (#003f6b) para azul turquesa (#00b4d8)
• Elementos decorativos: confetes extras, sensação de festa de fim de semana
• Mascote Guri posicionado à direita, pose animada

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo principal
• Azul turquesa #00b4d8 — degradê e acentos
• Amarelo #f5c800 — caixa do sabor e confetes
• Branco #ffffff — texto e logo

ESTILO VISUAL:
Festivo, energia máxima de sábado, tom familiar.`
        }
      ]
    },
    {
      id:'so22', date:'2026-06-20', time:'11h', format:'Post',
      title:'Construção de Marca — Atacado e varejo',
      driveFile:'11.08 - Sabores Guri Mini BomBom de Açaí.png',
      driveUrl:'https://drive.google.com/file/d/1as6g-9NsXdkpm2Yrh-p__w3SCZ73NTNv/view',
      driveHint:'Post de sabores já produzido — pode repostar ou usar como referência',
      texto:`Você sabia que vendemos tanto no varejo quanto no atacado? 📦🍦

Pra sua festa, evento ou comércio, a Sorvetes Guri tem condições especiais pra compras em quantidade.

Fala com a gente e vamos montar a solução ideal pro seu negócio ou sua festa!

Comenta aqui ou manda mensagem no WhatsApp 👇

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem: 80px nas bordas
Estilo: Institucional B2B, informativo`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Diferencial Competitivo / Divulgação B2B
Objetivo: Divulgar a venda no atacado como diferencial pouco conhecido, atraindo comércios locais e organizadores de eventos/festas — sábado é dia ideal para esse público estar planejando compras.
Funil: Topo/Meio — descoberta de novo serviço e geração de leads B2B
Ação esperada: DM ou comentário perguntando sobre condições de atacado`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Post institucional divulgando o serviço de atacado, pouco conhecido pelo público geral — atrair comércios, organizadores de festas e eventos como novo segmento de clientes.

COMPOSIÇÃO DA IMAGEM:
• Layout: ícones representando varejo (consumidor individual) e atacado (caixas, volume) lado a lado
• Fundo azul turquesa (#00b4d8) com elementos gráficos simples
• Logo Guri em destaque
• Texto "Varejo & Atacado" como conceito central

PALETA OBRIGATÓRIA:
• Azul turquesa #00b4d8 — fundo principal
• Amarelo #f5c800 — ícones e destaques
• Azul escuro #003f6b — texto e logo
• Branco #ffffff — espaço limpo

ESTILO VISUAL:
Institucional e claro, com tom profissional adequado para público B2B.`
        }
      ]
    },
    {
      id:'so23', date:'2026-06-20', time:'13h', format:'Story',
      title:'Sábado — Movimento de fim de semana',
      driveFile:'mascote3d_guri_pose02_apresentando_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1saHs8AqxRT27bXp_AMtPw8UjThvDvp7f/view',
      driveHint:'Mascote pose 02 "apresentando" — bastidores de movimento',
      texto:`Sábado e a loja já tá cheia de gente! 🍦😍

Adoramos receber a família toda aqui na Guri pra esse momento de doçura no fim de semana.

Ainda não veio? Corre que a gente te espera! 🏃

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Movimento e prova social de fluxo`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Prova Social / FOMO (Fear of Missing Out)
Objetivo: Mostrar movimento real da loja gerando senso de urgência e popularidade — quem ainda não foi sente que está perdendo a experiência coletiva.
Funil: Fundo — conversão por urgência social
Ação esperada: Visita imediata à loja`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Story de "bastidores" mostrando movimento real de sábado, gerando senso de popularidade e urgência social para quem ainda não visitou.

COMPOSIÇÃO DA IMAGEM:
• Fundo: tons quentes representando movimento e energia de loja cheia
• Mascote Guri pose 02 com gesto convidativo
• Elementos sugerindo multidão/movimento de forma estilizada (não fotos reais de pessoas)

PALETA OBRIGATÓRIA:
• Amarelo #f5c800 — energia e destaque
• Azul escuro #003f6b — texto e elementos
• Azul turquesa #00b4d8 — acentos
• Branco #ffffff — texto sobre fundo escuro

ESTILO VISUAL:
Energético, sensação de movimento e popularidade, convidativo.`
        }
      ]
    },
    {
      id:'so24', date:'2026-06-20', time:'15h', format:'Story',
      title:'Promoção do Sábado — Combo família',
      driveFile:'mascote3d_guri_pose01_sorvete_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1Tb4fIXrE5vWurOTlJPjdfg3kxK9W8Olu/view',
      driveHint:'Mascote 3D Guri com sorvete — para combo família',
      texto:`👨‍👩‍👧‍👦 COMBO FAMÍLIA DE SÁBADO!

4 casquinhas + 1 pote pequeno por R$ [VALOR]

Perfeito pra tarde toda a família reunida! 🍦

Só hoje! Corre lá ou chama no WhatsApp 👇
Link na bio para pedir online 📱

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Promocional, foco familiar`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Promoção do Dia / Combo Família
Objetivo: Capturar o público familiar característico de sábado com oferta de combo dimensionada para grupos, aumentando ticket médio.
Funil: Fundo — conversão com ticket médio maior
Ação esperada: Pedido online ou visita à loja com a família`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Promoção especificamente dimensionada para o público familiar de sábado, com combo que atende várias pessoas — diferente das promoções individuais de dias de semana.

COMPOSIÇÃO DA IMAGEM:
• Fundo: amarelo vibrante (#f5c800)
• Elementos: ícones representando família (silhuetas estilizadas simples) ao lado de múltiplas casquinhas
• Mascote Guri pose 01 como elemento de destaque

PALETA OBRIGATÓRIA:
• Amarelo #f5c800 — fundo dominante
• Azul escuro #003f6b — caixas de texto e preço
• Azul turquesa #00b4d8 — acentos
• Branco #ffffff — texto sobre fundo escuro

ESTILO VISUAL:
Alta energia, tom familiar e acolhedor, urgência de oferta limitada.`
        }
      ]
    },
    {
      id:'so25', date:'2026-06-20', time:'17h', format:'Post',
      title:'Custo-benefício — Qualidade que vale o preço',
      driveFile:'LOGO-GURI-V2.png',
      driveUrl:'https://drive.google.com/file/d/1fO9HP4JSSYFfboE_jDGbNUFoRP38xcBk/view',
      driveHint:'Logo Guri V2 — elemento institucional do post',
      texto:`Qualidade boa não precisa ser cara. 💰🍦

Na Sorvetes Guri você encontra o melhor custo-benefício da região — sabor premium, preço justo.

Sem economizar na qualidade pra cobrar barato. Sem inflacionar preço pra parecer chique.

Apenas o equilíbrio certo que você merece.

Venha conferir você mesmo em Turvo/PR!

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem: 80px nas bordas
Estilo: Institucional, posicionamento de valor`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Diferencial Competitivo / Posicionamento de Valor
Objetivo: Comunicar o melhor custo-benefício da região de forma confiante e direta, posicionando a marca entre qualidade premium e preço justo — nem barato com baixa qualidade, nem caro sem motivo.
Funil: Topo/Meio — construção de confiança em valor justo
Ação esperada: Curtida, comentário de validação, visita para comprovar`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Post de posicionamento de valor, comunicando equilíbrio entre qualidade e preço de forma confiante sem soar defensivo ou comparativo direto a concorrentes.

COMPOSIÇÃO DA IMAGEM:
• Layout: logo centralizado com elemento visual de "balança" estilizada representando equilíbrio
• Fundo azul turquesa (#00b4d8) com elementos gráficos limpos
• Ícones sutis representando qualidade (estrela) e preço justo (cifrão moderado)

PALETA OBRIGATÓRIA:
• Azul turquesa #00b4d8 — fundo principal
• Amarelo #f5c800 — elemento de equilíbrio/balança
• Azul escuro #003f6b — texto e logo
• Branco #ffffff — espaço limpo

ESTILO VISUAL:
Institucional, confiante, tom de transparência e valor genuíno.`
        }
      ]
    },
    {
      id:'so26', date:'2026-06-20', time:'20h', format:'Story',
      title:'Encerramento de Sábado — Obrigado pela visita',
      driveFile:'LOGO-GURI-V2.png',
      driveUrl:'https://drive.google.com/file/d/1fO9HP4JSSYFfboE_jDGbNUFoRP38xcBk/view',
      driveHint:'Logo Guri V2 — elemento central do encerramento',
      texto:`Que sábado gostoso! 🍦💛

Obrigado a todas as famílias que vieram nos visitar hoje. Vocês são o motivo da gente fazer o que faz com tanto carinho.

Amanhã ainda é domingo de sorvete também! 😄

Boa noite, Turvo! 🌙

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Aconchegante, gratidão, antecipação de domingo`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Relacionamento / Gratidão e Antecipação
Objetivo: Encerrar o dia de maior movimento da semana com gratidão genuína à comunidade, antecipando o domingo como continuidade do fim de semana de sorvete.
Funil: Topo — fidelização profunda, reforço de vínculo emocional
Ação esperada: Resposta ao story, sensação de pertencimento à comunidade Guri`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Encerramento do dia de maior movimento da semana com tom de gratidão genuína, reconhecendo as famílias que visitaram e antecipando continuidade no domingo.

COMPOSIÇÃO DA IMAGEM:
• Fundo: degradê noturno de azul escuro (#003f6b) para azul turquesa (#00b4d8)
• Elementos: lua, estrelinhas em amarelo (#f5c800)
• Centro: logo Guri com efeito de brilho suave, tom mais caloroso que dias normais

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo principal noturno
• Azul turquesa #00b4d8 — degradê superior
• Amarelo #f5c800 — lua, estrelas e detalhes
• Branco #ffffff — logo e texto

ESTILO VISUAL:
Caloroso, grato, com energia residual positiva do dia de movimento.`
        }
      ]
    },
    {
      id:'so27', date:'2026-06-21', time:'09h', format:'Story',
      title:'Bom Domingo — Manhã tranquila de sorvete',
      driveFile:'mascote3d_guri_pose01_sorvete_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1Tb4fIXrE5vWurOTlJPjdfg3kxK9W8Olu/view',
      driveHint:'Mascote 3D Guri com sorvete — clima leve de domingo',
      texto:`☀️ Bom domingo, Turvo!

O Guri já abriu as portas pra receber a família hoje. 🍦

Domingo é dia de relaxar e aproveitar com quem a gente ama — e sorvete combina com qualquer momento.

Te esperamos hoje! Link na bio para pedir online 📱

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Leve, tranquilo, clima de domingo em família`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Abertura do Dia / Convite
Objetivo: Anunciar funcionamento no domingo e convidar para o passeio em família, aproveitando o ritmo mais calmo do dia.
Funil: Topo/Meio — lembrança de marca e geração de visita
Ação esperada: Visita à loja ou pedido pelo link da bio durante o dia`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Abertura de domingo com tom calmo e acolhedor, contrastando com a energia mais intensa de sábado — domingo é sobre desacelerar e curtir em família.

COMPOSIÇÃO DA IMAGEM:
• Fundo: degradê suave de azul turquesa (#00b4d8) para branco
• Elementos: nuvens estilizadas simples, sol suave no canto superior
• Mascote Guri pose 01 centralizado, expressão tranquila e convidativa

PALETA OBRIGATÓRIA:
• Azul turquesa #00b4d8 — fundo principal
• Branco #ffffff — degradê e espaço limpo
• Amarelo #f5c800 — sol e detalhes de destaque
• Azul escuro #003f6b — texto

ESTILO VISUAL:
Calmo, ensolarado, sensação de manhã tranquila de fim de semana.`
        }
      ]
    },
    {
      id:'so28', date:'2026-06-21', time:'11h30', format:'Post',
      title:'Domingo em Família — O passeio que todo mundo gosta',
      driveFile:'mascote3d_guri_pose02_apresentando_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1as6g-9NsXdkpm2Yrh-p__w3SCZ73NTNv/view',
      driveHint:'Mascote pose 02 "apresentando" — clima de passeio em família',
      texto:`Domingo sem sorvete em família é like sem dar. 😄🍦

Reúna todo mundo, escolha os sabores e venha viver esse momento simples que faz toda diferença.

Estamos com tudo pronto para te receber em Turvo/PR!

Marca quem topa um sorvete hoje 👇

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem: 80px nas bordas
Estilo: Caloroso, foco em vínculo familiar`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Engajamento / Construção de Comunidade
Objetivo: Reforçar a marca como parte do ritual de domingo em família, estimulando marcação de amigos e familiares nos comentários.
Funil: Topo/Meio — engajamento orgânico e alcance
Ação esperada: Marcação de pessoas nos comentários, visita combinada em grupo`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Post de engajamento que associa sorvete ao ritual de domingo em família, convidando o público a marcar quem topa participar — geração de alcance orgânico via marcações.

COMPOSIÇÃO DA IMAGEM:
• Layout: mascote Guri pose 02 apresentando, com balões de fala estilizados ao redor representando diferentes pessoas da família
• Fundo: azul turquesa (#00b4d8) com elementos gráficos simples e arredondados
• Texto de apoio em destaque amarelo

PALETA OBRIGATÓRIA:
• Azul turquesa #00b4d8 — fundo principal
• Amarelo #f5c800 — balões de fala e destaques
• Azul escuro #003f6b — texto e contornos
• Branco #ffffff — espaço limpo

ESTILO VISUAL:
Caloroso, ilustrativo, tom de convite genuíno para reunir a família.`
        }
      ]
    },
    {
      id:'so29', date:'2026-06-21', time:'15h', format:'Story',
      title:'Promoção do Domingo — Pote duplo com desconto',
      driveFile:'11.08 - Sabores Guri Mini BomBom de Açaí.png',
      driveUrl:'https://drive.google.com/file/d/1saHs8AqxRT27bXp_AMtPw8UjThvDvp7f/view',
      driveHint:'Post de sabores já produzido — pode repostar como destaque de domingo',
      texto:`🍦 OFERTA DE DOMINGO!

2 potes de 500ml por R$ [VALOR]

Ideal pra dividir com quem você ama essa tarde. 💛

Só hoje! Corre lá ou chama no WhatsApp 👇
Link na bio para pedir online 📱

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Promocional, urgência leve de tarde de domingo`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Promoção do Dia / Oferta para Dividir
Objetivo: Gerar conversão na tarde de domingo com oferta pensada para casais ou duplas, aproveitando o pico de movimento do fim de semana.
Funil: Fundo — conversão imediata
Ação esperada: Pedido online ou visita à loja na mesma tarde`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Promoção de tarde de domingo dimensionada para duplas — reforça o momento de compartilhar, diferente do combo família de sábado que é maior.

COMPOSIÇÃO DA IMAGEM:
• Fundo: amarelo vibrante (#f5c800) como cor dominante
• Elementos: dois potes ilustrados lado a lado com confetes
• Caixa de preço em destaque, azul escuro com texto branco

PALETA OBRIGATÓRIA:
• Amarelo #f5c800 — fundo dominante
• Azul escuro #003f6b — caixa de preço e "SÓ HOJE"
• Azul turquesa #00b4d8 — acentos
• Branco #ffffff — texto sobre fundo escuro

ESTILO VISUAL:
Energético, mas com clima mais leve e afetivo que o combo família de sábado.`
        }
      ]
    },
    {
      id:'so30', date:'2026-06-21', time:'19h', format:'Story',
      title:'Encerramento de Domingo — Boa semana, Turvo',
      driveFile:'LOGO-GURI-V2.png',
      driveUrl:'https://drive.google.com/file/d/1fO9HP4JSSYFfboE_jDGbNUFoRP38xcBk/view',
      driveHint:'Logo Guri V2 — elemento central do encerramento do fim de semana',
      texto:`Mais um fim de semana de sorvete chegando ao fim. 🍦💛

Obrigado por fazer parte desse domingo com a gente, Turvo!

A semana começa amanhã, mas o sorvete tá aqui todo dia esperando por você. 😊

Boa semana pra todo mundo! 🌙

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Aconchegante, fechamento de fim de semana`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Relacionamento / Gratidão e Transição
Objetivo: Encerrar o fim de semana com gratidão à comunidade e transição suave para a semana, reforçando que a marca está presente todos os dias, não só no fim de semana.
Funil: Topo — fidelização e lembrança de marca contínua
Ação esperada: Resposta ao story, sensação de continuidade e pertencimento`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Encerramento do fim de semana com tom de gratidão e transição gentil para a rotina da semana, reforçando presença constante da marca além do fim de semana.

COMPOSIÇÃO DA IMAGEM:
• Fundo: degradê noturno de azul escuro (#003f6b) para azul turquesa (#00b4d8)
• Elementos: lua, estrelinhas em amarelo (#f5c800)
• Centro: logo Guri com efeito de brilho suave

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo principal noturno
• Azul turquesa #00b4d8 — degradê superior
• Amarelo #f5c800 — lua, estrelas e detalhes
• Branco #ffffff — logo e texto

ESTILO VISUAL:
Caloroso e tranquilo, com energia residual positiva do fim de semana.`
        }
      ]
    },
    {
      id:'so31', date:'2026-06-21', time:'13h', format:'Story',
      title:'Dica de Domingo — Por que sorvete é o lanche perfeito',
      driveFile:'mascote3d_guri_pose02_apresentando_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1as6g-9NsXdkpm2Yrh-p__w3SCZ73NTNv/view',
      driveHint:'Mascote pose 02 "apresentando" — ideal para dica/curiosidade',
      texto:`🤔 Você sabia?

Sorvete artesanal de verdade é feito com poucos ingredientes — leite, fruta, açúcar e carinho. 🍦

Sem enrolação, sem química, sem mistério. Só sabor de verdade.

É assim que a gente faz aqui na Guri todos os dias.

Curtiu a dica? Compartilha no seu story! 👇

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Educativo, leve, transparência de processo`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Dica / Curiosidade
Objetivo: Reforçar a qualidade artesanal do produto de forma educativa, gerando confiança e diferenciando de sorvetes industrializados.
Funil: Topo/Meio — construção de confiança e percepção de qualidade
Ação esperada: Compartilhamento do story, reconhecimento de valor do produto`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Conteúdo educativo leve sobre a simplicidade dos ingredientes do sorvete artesanal, posicionando a marca como transparente e de qualidade real — sem comparação direta a concorrentes.

COMPOSIÇÃO DA IMAGEM:
• Fundo: azul turquesa (#00b4d8) com textura sutil de ingredientes ilustrados (leite, fruta) ao fundo
• Mascote Guri pose 02 apresentando, gesticulando para a lista de ingredientes
• Caixa de texto em amarelo com a lista de ingredientes simples

PALETA OBRIGATÓRIA:
• Azul turquesa #00b4d8 — fundo principal
• Amarelo #f5c800 — caixa de ingredientes e destaque
• Azul escuro #003f6b — texto e contornos
• Branco #ffffff — espaço limpo

ESTILO VISUAL:
Educativo e confiável, tom de transparência genuína sobre o processo.`
        }
      ]
    },
    {
      id:'so32', date:'2026-06-21', time:'17h', format:'Post',
      title:'Prova Social — Domingo é dia de voltar',
      driveFile:'LOGO-GURI-V2.png',
      driveUrl:'https://drive.google.com/file/d/1fO9HP4JSSYFfboE_jDGbNUFoRP38xcBk/view',
      driveHint:'Logo Guri V2 — moldura institucional para o depoimento',
      texto:`💬 "A gente vem toda semana, mas no domingo é sagrado."

Isso é o que os nossos clientes mais fiéis dizem — e a gente recebe esse carinho com muita gratidão. 🍦💛

Se você também já faz parte dessa rotina gostosa de domingo, deixa um comentário contando há quanto tempo é cliente Guri!

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem: 80px nas bordas
Estilo: Depoimento, prova social institucional`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Prova Social
Objetivo: Usar a voz de clientes fiéis para reforçar que o domingo na Guri é um hábito consolidado, gerando identificação em quem ainda não criou esse costume.
Funil: Meio/Fundo — validação e conversão de novos clientes habituais
Ação esperada: Comentários de clientes confirmando frequência, novos clientes se sentindo convidados a criar o hábito`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
A citação de um cliente fiel sobre o "ritual de domingo" é a prova social mais convincente para quem ainda não tem esse hábito — depoimento real gera identificação e desejo de pertencimento.

COMPOSIÇÃO DA IMAGEM:
• Fundo: branco limpo com moldura azul turquesa (#00b4d8) sutil
• Elemento principal: balão de citação estilizado com borda amarela (#f5c800) — ocupa 50% superior
• Logo Guri centralizado abaixo do balão, com leve brilho
• Tipografia da citação: itálica, azul escuro, tamanho grande e legível

PALETA OBRIGATÓRIA:
• Branco #ffffff — fundo principal
• Amarelo #f5c800 — borda do balão e destaques
• Azul turquesa #00b4d8 — moldura e acentos
• Azul escuro #003f6b — texto da citação

ESTILO VISUAL:
Caloroso e autêntico, tom de comunidade e pertencimento — sem parecer propaganda forçada.`
        }
      ]
    },
    {
      id:'so33', date:'2026-06-22', time:'09h', format:'Story',
      title:'Produto do Dia — Segunda-feira de sabor',
      driveFile:'mascote3d_guri_pose01_sorvete_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1Tb4fIXrE5vWurOTlJPjdfg3kxK9W8Olu/view',
      driveHint:'Mascote 3D Guri com sorvete — protagonista do story',
      texto:`🍦 Bom dia, Turvo!

Segunda-feira começando e o Guri já preparou tudo pra te receber hoje!

Hoje em destaque: [COLOQUE O SABOR DO DIA] 😍

Peça agora! Link na bio 📱 ou chama no WhatsApp 👇

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Festivo, colorido, energético`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Produto do Dia / Divulgação
Objetivo: Abrir a semana mantendo hábito diário de acompanhamento, reforçar presença constante da marca logo na segunda-feira.
Funil: Fundo — conversão imediata
Ação esperada: Pedido pelo link da bio ou visita à loja no mesmo dia`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Story diário recorrente mantendo consistência visual, com mascote Guri como comunicador oficial — abertura de semana com energia.

COMPOSIÇÃO DA IMAGEM:
• Fundo: degradê diagonal de azul escuro (#003f6b) para azul turquesa (#00b4d8)
• Elementos decorativos: confetes e formas geométricas em amarelo (#f5c800) e branco
• Mascote Guri posicionado à direita, ocupando 60% da altura
• Caixa destacada em amarelo com borda arredondada para nome do sabor

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo principal
• Azul turquesa #00b4d8 — degradê e acentos
• Amarelo #f5c800 — caixa do sabor e confetes
• Branco #ffffff — texto e logo

ESTILO VISUAL:
Festivo e alegre, consistente com a identidade visual.`
        }
      ]
    },
    {
      id:'so34', date:'2026-06-22', time:'11h30', format:'Post',
      title:'Construção de Marca — Segunda é dia de recomeçar com sabor',
      driveFile:'11.08 - Sabores Guri Mini BomBom de Açaí.png',
      driveUrl:'https://drive.google.com/file/d/1as6g-9NsXdkpm2Yrh-p__w3SCZ73NTNv/view',
      driveHint:'Post de sabores já produzido — pode repostar ou usar como referência',
      texto:`Segunda-feira fica muito mais gostosa com um sorvete pra começar bem a semana. 🍦☀️

Sabores frescos, cremosos e cheios de sabor — exatamente o que você precisa pra recarregar a energia.

Venha nos visitar em Turvo/PR!

Qual sabor combina com a sua segunda? Comenta aí! 👇

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem: 80px nas bordas
Estilo: Food photography — produto como protagonista`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Construção de Marca / Engajamento
Objetivo: Associar a marca ao recomeço positivo de segunda-feira, gerando engajamento através da pergunta sobre sabor favorito.
Funil: Topo — reconhecimento e engajamento orgânico
Ação esperada: Comentário com sabor favorito, curtida, visita à loja`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Post de engajamento que associa o sorvete ao "recomeço" positivo de segunda-feira, convidando o público a comentar seu sabor favorito.

COMPOSIÇÃO DA IMAGEM:
• Ângulo: flat lay ou 3/4 elevado, destacando textura cremosa
• Produto: sorvete/açaí em destaque com coberturas visíveis
• Superfície: azul turquesa (#00b4d8) ou mármore branco
• Luz: natural e suave

PALETA OBRIGATÓRIA:
• Azul turquesa #00b4d8 — fundo/superfície
• Amarelo #f5c800 — elementos decorativos
• Azul escuro #003f6b — texto e logo
• Branco #ffffff — espaço limpo ao redor

ESTILO VISUAL:
Food photography profissional, destacando textura e frescor.`
        }
      ]
    },
    {
      id:'so35', date:'2026-06-22', time:'15h', format:'Story',
      title:'Promoção do Dia — Segunda com desconto',
      driveFile:'mascote3d_guri_pose02_apresentando_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1saHs8AqxRT27bXp_AMtPw8UjThvDvp7f/view',
      driveHint:'Mascote pose 02 "apresentando" — ideal para anunciar promoção',
      texto:`☀️ SEGUNDA-FEIRA TEM DESCONTO ESPECIAL!

Combo do dia:
🍦 Pote 500ml por R$ [VALOR]

Só hoje! Corre lá ou chama no WhatsApp 👇
Link na bio para pedir online 📱

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Promocional com urgência visual`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Promoção do Dia / Oferta com Urgência
Objetivo: Gerar pedido ou visita imediata logo no início da semana, criando hábito de acompanhar promoções diárias.
Funil: Fundo — conversão imediata
Ação esperada: Pedido online ou visita à loja no mesmo dia`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Story de promoção com alta energia visual, mascote Guri apresentando a oferta do dia para abrir bem a semana.

COMPOSIÇÃO DA IMAGEM:
• Fundo: amarelo vibrante (#f5c800) como cor dominante
• Elementos: raios de sol estilizados em azul escuro (#003f6b)
• Mascote Guri pose 02 posicionado à esquerda, gesticulando para a direita
• Área direita: caixa de preço em azul escuro com texto branco

PALETA OBRIGATÓRIA:
• Amarelo #f5c800 — fundo dominante
• Azul escuro #003f6b — caixas de texto e "SÓ HOJE"
• Azul turquesa #00b4d8 — acentos e setas
• Branco #ffffff — texto sobre fundo escuro

ESTILO VISUAL:
Alta energia, impacto visual imediato.`
        }
      ]
    },
    {
      id:'so36', date:'2026-06-22', time:'19h', format:'Story',
      title:'Encerramento — Boa noite Turvo',
      driveFile:'LOGO-GURI-V2.png',
      driveUrl:'https://drive.google.com/file/d/1fO9HP4JSSYFfboE_jDGbNUFoRP38xcBk/view',
      driveHint:'Logo Guri V2 — elemento central do encerramento',
      texto:`Mais uma segunda-feira chegando ao fim com muito sabor. 🍦💛

Bom começo de semana pra todo mundo que veio nos visitar hoje!

Amanhã é terça — e a gente já tá te esperando de novo. 😊

Boa noite, Turvo! 😊

Tag alguém que ama sorvete tanto quanto você! 😍

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Aconchegante, emocional, comunidade`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Relacionamento / Comunidade
Objetivo: Fechar o primeiro dia da semana reforçando vínculo afetivo, antecipando a terça-feira.
Funil: Topo — fidelização e lembrança de marca
Ação esperada: Resposta ao story, emoji ou compartilhamento`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Encerramento do dia com tom caloroso, antecipando a terça-feira como gancho emocional positivo.

COMPOSIÇÃO DA IMAGEM:
• Fundo: degradê noturno de azul escuro (#003f6b) para azul turquesa (#00b4d8)
• Elementos: lua crescente e estrelinhas em amarelo (#f5c800)
• Centro: espaço limpo para o logo Guri com efeito de brilho suave

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo principal noturno
• Azul turquesa #00b4d8 — degradê superior
• Amarelo #f5c800 — lua, estrelas e detalhes
• Branco #ffffff — logo e texto

ESTILO VISUAL:
Suave e contemplativo, com leve antecipação positiva.`
        }
      ]
    },
    {
      id:'so37', date:'2026-06-23', time:'09h', format:'Story',
      title:'Produto do Dia — Terça-feira de sabor',
      driveFile:'mascote3d_guri_pose01_sorvete_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1Tb4fIXrE5vWurOTlJPjdfg3kxK9W8Olu/view',
      driveHint:'Mascote 3D Guri com sorvete — protagonista do story',
      texto:`🍦 Bom dia, Turvo!

Já é terça-feira e o Guri preparou tudo pra te receber hoje!

Hoje em destaque: [COLOQUE O SABOR DO DIA] 😍

Peça agora! Link na bio 📱 ou chama no WhatsApp 👇

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Festivo, colorido, energético`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Produto do Dia / Divulgação
Objetivo: Manter hábito diário de acompanhamento, reforçar presença constante da marca.
Funil: Fundo — conversão imediata
Ação esperada: Pedido pelo link da bio ou visita à loja no mesmo dia`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Story diário recorrente mantendo consistência visual, com mascote Guri como comunicador oficial.

COMPOSIÇÃO DA IMAGEM:
• Fundo: degradê diagonal de azul escuro (#003f6b) para azul turquesa (#00b4d8)
• Elementos decorativos: confetes e formas geométricas em amarelo (#f5c800) e branco
• Mascote Guri posicionado à direita, ocupando 60% da altura
• Caixa destacada em amarelo com borda arredondada para nome do sabor

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo principal
• Azul turquesa #00b4d8 — degradê e acentos
• Amarelo #f5c800 — caixa do sabor e confetes
• Branco #ffffff — texto e logo

ESTILO VISUAL:
Festivo e alegre, consistente com a identidade visual.`
        }
      ]
    },
    {
      id:'so38', date:'2026-06-23', time:'11h30', format:'Post',
      title:'Construção de Marca — Sabores que viram rotina',
      driveFile:'11.08 - Sabores Guri Mini BomBom de Açaí.png',
      driveUrl:'https://drive.google.com/file/d/1as6g-9NsXdkpm2Yrh-p__w3SCZ73NTNv/view',
      driveHint:'Post de sabores já produzido — pode repostar ou usar como referência',
      texto:`Tem gente que já não consegue passar a semana sem o nosso sorvete. E a gente entende. 😄🍦

Sabor de verdade vira hábito — e hábito bom é pra ser repetido.

Já é cliente fiel? Conta pra gente nos comentários! 👇

Venha provar em Turvo/PR!

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem: 80px nas bordas
Estilo: Food photography — produto como protagonista`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Construção de Marca / Fidelização
Objetivo: Reconhecer e valorizar publicamente os clientes fiéis, gerando engajamento via comentários e fortalecendo senso de comunidade em torno da marca.
Funil: Meio — fidelização e engajamento orgânico
Ação esperada: Comentário confirmando fidelidade, curtida, visita`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Post que celebra o hábito de consumo recorrente, reconhecendo e valorizando os clientes fiéis como parte da identidade da marca.

COMPOSIÇÃO DA IMAGEM:
• Ângulo: flat lay ou 3/4 elevado, destacando textura cremosa
• Produto: sorvete/açaí em destaque com coberturas visíveis
• Superfície: azul turquesa (#00b4d8) ou mármore branco
• Luz: natural e suave

PALETA OBRIGATÓRIA:
• Azul turquesa #00b4d8 — fundo/superfície
• Amarelo #f5c800 — elementos decorativos
• Azul escuro #003f6b — texto e logo
• Branco #ffffff — espaço limpo ao redor

ESTILO VISUAL:
Food photography profissional, destacando textura e frescor.`
        }
      ]
    },
    {
      id:'so39', date:'2026-06-23', time:'15h', format:'Story',
      title:'Promoção do Dia — Terça com desconto',
      driveFile:'mascote3d_guri_pose02_apresentando_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1saHs8AqxRT27bXp_AMtPw8UjThvDvp7f/view',
      driveHint:'Mascote pose 02 "apresentando" — ideal para anunciar promoção',
      texto:`☀️ TERÇA-FEIRA TEM DESCONTO ESPECIAL!

Combo do dia:
🍦 Pote 500ml por R$ [VALOR]

Só hoje! Corre lá ou chama no WhatsApp 👇
Link na bio para pedir online 📱

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Promocional com urgência visual`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Promoção do Dia / Oferta com Urgência
Objetivo: Gerar pedido ou visita imediata no período da tarde.
Funil: Fundo — conversão imediata
Ação esperada: Pedido online ou visita à loja no mesmo dia`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Story de promoção com alta energia visual, mascote Guri apresentando a oferta do dia.

COMPOSIÇÃO DA IMAGEM:
• Fundo: amarelo vibrante (#f5c800) como cor dominante
• Elementos: raios de sol estilizados em azul escuro (#003f6b)
• Mascote Guri pose 02 posicionado à esquerda, gesticulando para a direita
• Área direita: caixa de preço em azul escuro com texto branco

PALETA OBRIGATÓRIA:
• Amarelo #f5c800 — fundo dominante
• Azul escuro #003f6b — caixas de texto e "SÓ HOJE"
• Azul turquesa #00b4d8 — acentos e setas
• Branco #ffffff — texto sobre fundo escuro

ESTILO VISUAL:
Alta energia, impacto visual imediato.`
        }
      ]
    },
    {
      id:'so40', date:'2026-06-23', time:'19h', format:'Story',
      title:'Encerramento — Boa noite Turvo',
      driveFile:'LOGO-GURI-V2.png',
      driveUrl:'https://drive.google.com/file/d/1fO9HP4JSSYFfboE_jDGbNUFoRP38xcBk/view',
      driveHint:'Logo Guri V2 — elemento central do encerramento',
      texto:`Mais uma terça-feira chegando ao fim com muito sabor. 🍦💛

Amanhã é quarta — já estamos na metade da semana!

Boa noite, Turvo! 😊

Tag alguém que ama sorvete tanto quanto você! 😍

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Aconchegante, emocional, comunidade`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Relacionamento / Comunidade
Objetivo: Fechar o dia reforçando vínculo afetivo, antecipando quarta-feira.
Funil: Topo — fidelização e lembrança de marca
Ação esperada: Resposta ao story, emoji ou compartilhamento`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Encerramento do dia com tom caloroso, antecipando a quarta-feira como gancho emocional positivo.

COMPOSIÇÃO DA IMAGEM:
• Fundo: degradê noturno de azul escuro (#003f6b) para azul turquesa (#00b4d8)
• Elementos: lua crescente e estrelinhas em amarelo (#f5c800)
• Centro: espaço limpo para o logo Guri com efeito de brilho suave

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo principal noturno
• Azul turquesa #00b4d8 — degradê superior
• Amarelo #f5c800 — lua, estrelas e detalhes
• Branco #ffffff — logo e texto

ESTILO VISUAL:
Suave e contemplativo, com leve antecipação positiva.`
        }
      ]
    },
    {
      id:'so41', date:'2026-06-24', time:'09h', format:'Story',
      title:'Produto do Dia — Metade da semana com sabor',
      driveFile:'mascote3d_guri_pose01_sorvete_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1Tb4fIXrE5vWurOTlJPjdfg3kxK9W8Olu/view',
      driveHint:'Mascote 3D Guri com sorvete — protagonista do story',
      texto:`🍦 Bom dia, Turvo!

Já estamos na metade da semana e o Guri preparou tudo pra te receber hoje!

Hoje em destaque: [COLOQUE O SABOR DO DIA] 😍

Peça agora! Link na bio 📱 ou chama no WhatsApp 👇

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Festivo, colorido, energético`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Produto do Dia / Divulgação
Objetivo: Manter hábito diário de acompanhamento, reforçar presença constante da marca na metade da semana.
Funil: Fundo — conversão imediata
Ação esperada: Pedido pelo link da bio ou visita à loja no mesmo dia`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Story diário recorrente mantendo consistência visual, com mascote Guri como comunicador oficial.

COMPOSIÇÃO DA IMAGEM:
• Fundo: degradê diagonal de azul escuro (#003f6b) para azul turquesa (#00b4d8)
• Elementos decorativos: confetes e formas geométricas em amarelo (#f5c800) e branco
• Mascote Guri posicionado à direita, ocupando 60% da altura
• Caixa destacada em amarelo com borda arredondada para nome do sabor

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo principal
• Azul turquesa #00b4d8 — degradê e acentos
• Amarelo #f5c800 — caixa do sabor e confetes
• Branco #ffffff — texto e logo

ESTILO VISUAL:
Festivo e alegre, consistente com a identidade visual.`
        }
      ]
    },
    {
      id:'so42', date:'2026-06-24', time:'11h30', format:'Post',
      title:'Construção de Marca — Quarta é dia de açaí',
      driveFile:'11.08 - Sabores Guri Mini BomBom de Açaí.png',
      driveUrl:'https://drive.google.com/file/d/1as6g-9NsXdkpm2Yrh-p__w3SCZ73NTNv/view',
      driveHint:'Post de sabores já produzido — pode repostar ou usar como referência',
      texto:`Quarta-feira pede um açaí cremoso pra dar aquele gás na metade da semana. 🍇🍦

Fresquinho, saboroso e na medida certa pra recarregar a energia.

Venha provar e tirar suas próprias conclusões em Turvo/PR!

Qual cobertura você escolheria hoje? Comenta aí! 👇

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem: 80px nas bordas
Estilo: Food photography — produto como protagonista`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Construção de Marca / Engajamento
Objetivo: Posicionar o açaí como solução para a queda de energia típica de meio de semana, gerando engajamento via pergunta sobre cobertura favorita.
Funil: Topo/Meio — engajamento orgânico e desejo de consumo
Ação esperada: Comentário com cobertura favorita, curtida, visita à loja`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Post que associa o açaí à recarga de energia no meio da semana, convidando o público a interagir escolhendo sua cobertura favorita.

COMPOSIÇÃO DA IMAGEM:
• Ângulo: flat lay ou 3/4 elevado, destacando textura cremosa do açaí
• Produto: açaí em destaque com coberturas visíveis (granola, frutas)
• Superfície: azul turquesa (#00b4d8) ou mármore branco
• Luz: natural e suave, destacando a cremosidade

PALETA OBRIGATÓRIA:
• Azul turquesa #00b4d8 — fundo/superfície
• Amarelo #f5c800 — elementos decorativos
• Azul escuro #003f6b — texto e logo
• Branco #ffffff — espaço limpo ao redor

ESTILO VISUAL:
Food photography profissional, destacando textura e frescor do açaí especificamente.`
        }
      ]
    },
    {
      id:'so43', date:'2026-06-24', time:'15h', format:'Story',
      title:'Promoção do Dia — Quarta-feira com oferta especial',
      driveFile:'mascote3d_guri_pose02_apresentando_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1saHs8AqxRT27bXp_AMtPw8UjThvDvp7f/view',
      driveHint:'Mascote pose 02 "apresentando" — ideal para anunciar promoção',
      texto:`☀️ QUARTA-FEIRA TEM DESCONTO ESPECIAL!

Combo do dia:
🍦 Pote 500ml por R$ [VALOR]

Só hoje! Corre lá ou chama no WhatsApp 👇
Link na bio para pedir online 📱

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Promocional com urgência visual`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Promoção do Dia / Oferta com Urgência
Objetivo: Gerar pedido ou visita imediata no período da tarde de quarta-feira.
Funil: Fundo — conversão imediata
Ação esperada: Pedido online ou visita à loja no mesmo dia`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Story de promoção com alta energia visual, mascote Guri apresentando a oferta do dia.

COMPOSIÇÃO DA IMAGEM:
• Fundo: amarelo vibrante (#f5c800) como cor dominante
• Elementos: raios de sol estilizados em azul escuro (#003f6b)
• Mascote Guri pose 02 posicionado à esquerda, gesticulando para a direita
• Área direita: caixa de preço em azul escuro com texto branco

PALETA OBRIGATÓRIA:
• Amarelo #f5c800 — fundo dominante
• Azul escuro #003f6b — caixas de texto e "SÓ HOJE"
• Azul turquesa #00b4d8 — acentos e setas
• Branco #ffffff — texto sobre fundo escuro

ESTILO VISUAL:
Alta energia, impacto visual imediato.`
        }
      ]
    },
    {
      id:'so44', date:'2026-06-24', time:'19h', format:'Story',
      title:'Encerramento — Boa noite Turvo',
      driveFile:'LOGO-GURI-V2.png',
      driveUrl:'https://drive.google.com/file/d/1fO9HP4JSSYFfboE_jDGbNUFoRP38xcBk/view',
      driveHint:'Logo Guri V2 — elemento central do encerramento',
      texto:`Mais uma quarta-feira chegando ao fim com muito sabor. 🍦💛

Já passamos da metade da semana — falta pouco pra sexta!

Boa noite, Turvo! 😊

Tag alguém que ama sorvete tanto quanto você! 😍

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Aconchegante, emocional, comunidade`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Relacionamento / Comunidade
Objetivo: Fechar o dia reforçando vínculo afetivo, antecipando a reta final da semana.
Funil: Topo — fidelização e lembrança de marca
Ação esperada: Resposta ao story, emoji ou compartilhamento`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Encerramento do dia com tom caloroso, antecipando a reta final da semana como gancho emocional positivo.

COMPOSIÇÃO DA IMAGEM:
• Fundo: degradê noturno de azul escuro (#003f6b) para azul turquesa (#00b4d8)
• Elementos: lua crescente e estrelinhas em amarelo (#f5c800)
• Centro: espaço limpo para o logo Guri com efeito de brilho suave

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo principal noturno
• Azul turquesa #00b4d8 — degradê superior
• Amarelo #f5c800 — lua, estrelas e detalhes
• Branco #ffffff — logo e texto

ESTILO VISUAL:
Suave e contemplativo, com leve antecipação positiva.`
        }
      ]
    },
    {
      id:'so45', date:'2026-06-25', time:'09h', format:'Story',
      title:'Produto do Dia — Quinta-feira pede um açaí cremoso',
      driveFile:'mascote3d_guri_pose01_sorvete_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1Tb4fIXrE5vWurOTlJPjdfg3kxK9W8Olu/view',
      driveHint:'Mascote pose 01 "sorvete" — ideal para anunciar produto do dia',
      texto:`Quinta-feira combina com um açaí bem cremoso. 🍇

Na hora que você quiser, do jeitinho que você gosta — com as frutinhas e coberturas que combinam com seu dia.

Vem com a gente! 😋
Link na bio para pedir online 📱

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Produto do dia, leve e convidativo`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Produto do Dia
Objetivo: Despertar desejo imediato pelo açaí no início da manhã, posicionando-o como opção de meio de manhã ou almoço leve.
Funil: Topo/Meio — desejo e lembrança de marca
Ação esperada: Pedido online ou visita à loja durante o dia`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Story vibrante de produto, com o mascote Guri apresentando um açaí cremoso e bem montado, despertando vontade imediata.

COMPOSIÇÃO DA IMAGEM:
• Fundo: azul turquesa (#00b4d8) vibrante
• Elemento principal: mascote Guri pose 01 "sorvete" interagindo com um pote de açaí ilustrado
• Topo com frutinhas, granola e cobertura visíveis e apetitosas
• Tipografia arredondada e divertida, alinhada à identidade da marca

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — fundo principal
• Amarelo #f5c800 — destaque e CTA
• Branco #ffffff — texto

ESTILO VISUAL:
Colorido, divertido, apetitoso — tom leve e despretensioso típico do storytelling da marca.`
        }
      ]
    },
    {
      id:'so46', date:'2026-06-25', time:'11h30', format:'Post',
      title:'Construção de Marca — O carinho que vai em cada pote',
      driveFile:'11.08 - Sabores Guri Mini BomBom de Açaí.png',
      driveUrl:'https://drive.google.com/file/d/1as6g-9NsXdkpm2Yrh-p__w3SCZ73NTNv/view',
      driveHint:'Foto de sabor específico — Mini BomBom de Açaí como prova de qualidade',
      texto:`Cada sabor aqui é pensado com carinho — não é só sorvete, é experiência. 🍦

Da escolha dos ingredientes até a montagem final, tudo pra você sentir que vale cada colherada.

Vem provar o melhor açaí da cidade! 🍇
Link na bio para pedir online 📱

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas
Estilo: Institucional, foco em qualidade do produto`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Construção de Marca
Objetivo: Reforçar de forma indireta o diferencial de qualidade e cuidado artesanal frente a opções industrializadas, sem citar concorrentes.
Funil: Meio — construção de percepção de valor
Ação esperada: Comentário, salvar o post, visita para experimentar`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Mostrar o cuidado artesanal por trás de cada sabor, usando uma foto real de produto para comunicar qualidade sem precisar dizer isso explicitamente.

COMPOSIÇÃO DA IMAGEM:
• Foto principal: produto real (Mini BomBom de Açaí) em destaque, bem iluminado
• Fundo: levemente desfocado, tons quentes e convidativos
• Tipografia: discreta, posicionada na parte inferior, sem competir com o produto

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque pontual
• Branco #ffffff — texto

ESTILO VISUAL:
Fotografia de produto realista e apetitosa, tom artesanal e caseiro — qualidade que se vê na imagem, sem precisar declarar.`
        }
      ]
    },
    {
      id:'so47', date:'2026-06-25', time:'15h', format:'Story',
      title:'Promoção do Dia — Quinta com oferta especial',
      driveFile:'mascote3d_guri_pose02_apresentando_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1saHs8AqxRT27bXp_AMtPw8UjThvDvp7f/view',
      driveHint:'Mascote pose 02 "apresentando" — ideal para anunciar promoção',
      texto:`🍦 QUINTA-FEIRA TEM DESCONTO ESPECIAL!

Combo do dia:
🍦 Pote 500ml por R$ [VALOR]

Só hoje! Corre lá ou chama no WhatsApp 👇
Link na bio para pedir online 📱

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Promocional com urgência visual`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Promoção do Dia / Oferta com Urgência
Objetivo: Gerar pedido ou visita imediata no período da tarde de quinta-feira.
Funil: Fundo — conversão imediata
Ação esperada: Pedido online ou visita à loja no mesmo dia`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Story de promoção com alta energia visual, mascote Guri apresentando a oferta do dia.

COMPOSIÇÃO DA IMAGEM:
• Fundo: amarelo vibrante (#f5c800) como base
• Elemento principal: mascote Guri pose 02 "apresentando" apontando para o valor da promoção
• Tipografia grande e impactante para o valor e o "só hoje"
• Selo ou faixa de urgência no canto superior

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — fundo e destaque principal
• Branco #ffffff — texto

ESTILO VISUAL:
Vibrante, urgente, divertido — comunicação rápida e fácil de entender em poucos segundos.`
        }
      ]
    },
    {
      id:'so48', date:'2026-06-25', time:'19h', format:'Story',
      title:'Encerramento — Boa noite Turvo',
      driveFile:'LOGO-GURI-V2.png',
      driveUrl:'https://drive.google.com/file/d/1fO9HP4JSSYFfboE_jDGbNUFoRP38xcBk/view',
      driveHint:'Logo da marca — encerramento do dia',
      texto:`Mais um dia de sabor por aqui. 🍦

Obrigado a cada um que passou na loja, pediu online ou só deu um like pra gente. 💛

Amanhã tem mais! Boa noite, Turvo. 🌙

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Encerramento leve e caloroso`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Encerramento / Humanização
Objetivo: Fechar o dia com tom de proximidade e gratidão, mantendo a marca presente até o último story do dia.
Funil: Topo — conexão emocional e fechamento de ciclo diário
Ação esperada: Visualização completa do story, resposta com emoji`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Story simples de encerramento de dia, tom caloroso e de agradecimento, reforçando a logo da marca antes do fim do expediente.

COMPOSIÇÃO DA IMAGEM:
• Fundo: azul escuro (#003f6b) com toque de estrelas ou textura noturna sutil
• Elemento principal: logo LOGO-GURI-V2 centralizado
• Tipografia simples e acolhedora para a mensagem de boa noite

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo principal
• Azul turquesa #00b4d8 — acento
• Amarelo #f5c800 — destaque pontual
• Branco #ffffff — texto

ESTILO VISUAL:
Calmo, caloroso, fechamento de dia — contraste com a energia vibrante dos posts anteriores do dia.`
        }
      ]
    },
    {
      id:'so49', date:'2026-06-26', time:'09h', format:'Story',
      title:'Produto do Dia — Sexta-feira pede sorvete',
      driveFile:'mascote3d_guri_pose01_sorvete_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1Tb4fIXrE5vWurOTlJPjdfg3kxK9W8Olu/view',
      driveHint:'Mascote pose 01 "sorvete" — ideal para anunciar produto do dia de sexta',
      texto:`Sexta-feira só fica completa com um sorvetinho bom. 🍦

Escolha o seu sabor favorito e comece o fim de semana com o pé direito.

Vem com a gente! 😋
Link na bio para pedir online 📱

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Produto do dia, energia de início de fim de semana`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Produto do Dia
Objetivo: Conectar a sexta-feira ao consumo de sorvete como ritual de início de fim de semana, gerando desejo de visita ainda na manhã.
Funil: Topo/Meio — desejo e lembrança de marca
Ação esperada: Pedido online ou visita à loja ao longo do dia`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Story de produto associando a sexta-feira a um momento de recompensa simples — o sorvete como início do fim de semana.

COMPOSIÇÃO DA IMAGEM:
• Fundo: azul turquesa (#00b4d8) vibrante
• Elemento principal: mascote Guri pose 01 "sorvete" em pose animada, transmitindo energia de sexta-feira
• Tipografia divertida reforçando "sexta-feira" com destaque

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — fundo principal
• Amarelo #f5c800 — destaque e CTA
• Branco #ffffff — texto

ESTILO VISUAL:
Colorido, animado, com energia de "começo de fim de semana" — tom mais festivo que os demais dias da semana.`
        }
      ]
    },
    {
      id:'so50', date:'2026-06-26', time:'11h30', format:'Post',
      title:'Construção de Marca — O cardápio gourmet que vira programa de fim de semana',
      driveFile:'11.08 - Sabores Guri Mini BomBom de Açaí.png',
      driveUrl:'https://drive.google.com/file/d/1as6g-9NsXdkpm2Yrh-p__w3SCZ73NTNv/view',
      driveHint:'Foto de sabor específico — prova de variedade do cardápio gourmet',
      texto:`Sexta-feira é dia de chamar a família ou os amigos pra um programa simples e gostoso: sorveteria. 🍦

Buffet, loja de fábrica e cardápio gourmet — tudo pensado pra você aproveitar o fim de semana com calma.

Te esperamos! 🍇
Link na bio para pedir online 📱

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas
Estilo: Institucional, foco em experiência de fim de semana`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Construção de Marca
Objetivo: Posicionar a sorveteria como destino de programa de fim de semana em família, destacando a variedade (buffet, loja de fábrica, cardápio gourmet) de forma indireta.
Funil: Meio — construção de percepção de valor e destino
Ação esperada: Comentário marcando família/amigos, planejamento de visita no fim de semana`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Comunicar a sorveteria como destino completo de fim de semana — não só um produto, mas uma experiência com variedade para todos os gostos.

COMPOSIÇÃO DA IMAGEM:
• Foto principal: produto real em destaque, bem iluminado, com aparência caseira e gourmet
• Fundo: levemente desfocado, tons quentes
• Tipografia: discreta, reforçando a ideia de "programa de fim de semana"

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque pontual
• Branco #ffffff — texto

ESTILO VISUAL:
Fotografia de produto acolhedora e familiar, tom de "programa de fim de semana" — convite implícito para reunir pessoas.`
        }
      ]
    },
    {
      id:'so51', date:'2026-06-26', time:'15h', format:'Story',
      title:'Promoção do Dia — Sexta com oferta de fim de semana',
      driveFile:'mascote3d_guri_pose02_apresentando_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1saHs8AqxRT27bXp_AMtPw8UjThvDvp7f/view',
      driveHint:'Mascote pose 02 "apresentando" — ideal para anunciar promoção de fim de semana',
      texto:`🍦 SEXTA-FEIRA TEM DESCONTO PRA COMEÇAR O FIM DE SEMANA!

Combo do dia:
🍦 Pote 500ml por R$ [VALOR]

Só hoje! Corre lá ou chama no WhatsApp 👇
Link na bio para pedir online 📱

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Promocional com urgência visual e energia de fim de semana`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Promoção do Dia / Oferta com Urgência
Objetivo: Gerar pedido ou visita imediata na tarde de sexta-feira, aproveitando o gatilho de início de fim de semana.
Funil: Fundo — conversão imediata
Ação esperada: Pedido online ou visita à loja no mesmo dia`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Story de promoção com energia de início de fim de semana, mascote Guri apresentando a oferta com tom mais festivo que os dias úteis.

COMPOSIÇÃO DA IMAGEM:
• Fundo: amarelo vibrante (#f5c800) como base
• Elemento principal: mascote Guri pose 02 "apresentando" apontando para o valor da promoção
• Tipografia grande e impactante para o valor e o "só hoje"
• Elemento visual sugerindo fim de semana (ex.: confete sutil ou faixa festiva)

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — fundo e destaque principal
• Branco #ffffff — texto

ESTILO VISUAL:
Vibrante, urgente e festivo — comunicação rápida com energia de "começou o fim de semana".`
        }
      ]
    },
    {
      id:'so52', date:'2026-06-26', time:'19h', format:'Story',
      title:'Encerramento — Boa noite Turvo, bom fim de semana',
      driveFile:'LOGO-GURI-V2.png',
      driveUrl:'https://drive.google.com/file/d/1fO9HP4JSSYFfboE_jDGbNUFoRP38xcBk/view',
      driveHint:'Logo da marca — encerramento da semana',
      texto:`Mais uma semana de sabor se encerrando por aqui. 🍦

Obrigado por cada visita, cada pedido, cada like. Vocês são o motivo de a gente fazer tudo com tanto carinho. 💛

Bom fim de semana, Turvo! Segunda a gente volta com tudo. 🌙

#sorvete #sorveteria #gelato #frozen #sorvetegourmet #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Encerramento de semana, leve e caloroso`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Encerramento / Humanização
Objetivo: Fechar a semana com tom de gratidão e proximidade, reforçando vínculo emocional com os clientes antes do fim de semana.
Funil: Topo — conexão emocional e fechamento de ciclo semanal
Ação esperada: Visualização completa do story, resposta com emoji`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Story de encerramento de semana, tom caloroso e grato, reforçando a logo da marca antes do fim de semana.

COMPOSIÇÃO DA IMAGEM:
• Fundo: azul escuro (#003f6b) com textura noturna sutil
• Elemento principal: logo LOGO-GURI-V2 centralizado
• Tipografia simples e acolhedora para a mensagem de boa noite e bom fim de semana

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo principal
• Azul turquesa #00b4d8 — acento
• Amarelo #f5c800 — destaque pontual
• Branco #ffffff — texto

ESTILO VISUAL:
Calmo, caloroso, fechamento de semana — transmite gratidão genuína pelo relacionamento com os clientes.`
        }
      ]
    },
    {
      id:'so53', date:'2026-06-27', time:'09h', format:'Story',
      title:'Produto do Dia — Sábado começa com sorvete',
      driveFile:'mascote3d_guri_pose01_sorvete_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1Tb4fIXrE5vWurOTlJPjdfg3kxK9W8Olu/view',
      driveHint:'Mascote 3D do Guri apresentando o sorvete — abertura do sábado',
      texto:`Bom dia! ☀️🍦

Sábado chegou e o Guri já tá pronto pra adoçar seu dia. Que tal começar o fim de semana com aquele sabor que você ama?

Loja aberta, buffet montado, tudo fresquinho. Vem! 🍨`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Produto do Dia / Abertura
Objetivo: Abrir o sábado com energia, convidando o público a iniciar o fim de semana com a sorveteria como primeira parada.
Funil: Topo — lembrança de marca e desejo
Ação esperada: Visualização, resposta ao story, visita à loja`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Abertura alegre de sábado com o mascote Guri convidando para o fim de semana doce.

COMPOSIÇÃO DA IMAGEM:
• Elemento principal: mascote 3D do Guri apresentando o sorvete
• Fundo: tons claros e quentes de manhã
• Sensação: alegria, frescor, convite

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Alegre e convidativo, foco no mascote. Tom de abertura de fim de semana. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'so54', date:'2026-06-27', time:'11h', format:'Post',
      title:'Produto do Dia — O sabor que combina com sábado',
      driveFile:'11.08 - Sabores Guri Mini BomBom de Açaí.png',
      driveUrl:'https://drive.google.com/file/d/1as6g-9NsXdkpm2Yrh-p__w3SCZ73NTNv/view',
      driveHint:'Foto real de produto gourmet — destaque de sabor do dia',
      texto:`Olha só que delícia pra fechar a manhã de sábado. 🍫🍦

Feito com capricho, do jeitinho que o Guri gosta de entregar: sabor de verdade, textura cremosa e aquela vontade de repetir.

Passa aqui e experimente! 🛵 Link na bio pra pedir online.

#sorvetegourmet #sorvetesguriturvo #sorvetedodia #turvopr #saboreie`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas
Estilo: Foto de produto, apetite appeal`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Produto do Dia
Objetivo: Despertar desejo imediato pelo produto gourmet, destacando qualidade e textura para conversão em visita ou pedido online.
Funil: Meio/Fundo — desejo e ação
Ação esperada: Pedido online via link na bio, visita à loja, comentário`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Foto de produto com forte apelo de apetite — o sabor gourmet como recompensa do sábado.

COMPOSIÇÃO DA IMAGEM:
• Foto principal: produto real em destaque, bem iluminado, cremoso
• Fundo: levemente desfocado, tons quentes
• Detalhe: textura visível, aparência artesanal

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Fotografia de produto profissional com apelo de apetite. Tom acolhedor e gourmet. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'so55', date:'2026-06-27', time:'13h', format:'Story',
      title:'Bastidores — Maria Júlia no atendimento',
      driveFile:'mascote3d_guri_pose02_apresentando_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1saHs8AqxRT27bXp_AMtPw8UjThvDvp7f/view',
      driveHint:'Mascote 3D — usar como apoio visual à apresentação da atendente',
      texto:`Quem já veio na loja conhece o sorriso da Maria Júlia. 😊🍦

É ela que ajuda você a escolher entre tantos sabores e ainda dá aquela dica do que tá saindo mais fresquinho.

Vem ser bem atendido neste sábado! 🧡`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Bastidores / Humanização da equipe
Objetivo: Apresentar a Maria Júlia (atendimento) individualmente, criando proximidade e reforçando o atendimento acolhedor como marca da casa.
Funil: Topo — conexão e confiança
Ação esperada: Resposta ao story, identificação dos clientes habituais`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Apresentar a Maria Júlia como rosto do atendimento — proximidade e simpatia da equipe.

COMPOSIÇÃO DA IMAGEM:
• Elemento principal: mascote 3D do Guri em pose de apresentação, como apoio visual amigável
• Fundo: tons claros e quentes
• Sensação: simpatia, acolhimento, atendimento humano

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Tom de bastidor acolhedor, foco em proximidade humana. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'so56', date:'2026-06-27', time:'15h', format:'Post',
      title:'Promoção do Dia — Sábado tem oferta especial',
      driveFile:'mascote3d_guri_pose01_sorvete_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1Tb4fIXrE5vWurOTlJPjdfg3kxK9W8Olu/view',
      driveHint:'Mascote 3D do Guri com sorvete — destaque da promoção',
      texto:`Sábado de oferta na sorveteria! 🎉🍦

Aproveita o fim de semana pra adoçar a vida pagando menos. Promoção válida só hoje — vem garantir a sua!

🛵 Link na bio pra pedir online
📍 Loja de fábrica, buffet e gourmet

#promocaododia #sorvetesguriturvo #sabadodeoferta #turvopr #sorvetebarato`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas
Estilo: Promocional, destaque de oferta`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Promoção do Dia
Objetivo: Gerar urgência e conversão com oferta válida apenas no sábado, impulsionando visita e pedidos.
Funil: Fundo — conversão direta
Ação esperada: Pedido online, visita à loja, compartilhamento da oferta`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Oferta de sábado com senso de urgência — "só hoje" — usando o mascote para reforçar o apelo.

COMPOSIÇÃO DA IMAGEM:
• Elemento principal: mascote 3D do Guri com sorvete, em destaque
• Fundo: cores vibrantes, clima de festa
• Espaço para destaque da oferta (selo/faixa)

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque da oferta
• Branco #ffffff — texto

ESTILO VISUAL:
Vibrante e promocional, com senso de urgência. Tom alegre de fim de semana. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'so57', date:'2026-06-27', time:'17h', format:'Story',
      title:'Construção de Marca — Sábado em família é aqui',
      driveFile:'mascote3d_guri_pose02_apresentando_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1saHs8AqxRT27bXp_AMtPw8UjThvDvp7f/view',
      driveHint:'Mascote 3D apresentando — clima de programa em família',
      texto:`Sabe aquele programa simples que junta todo mundo? 🍦👨‍👩‍👧‍👦

É isso que a gente quer ser no seu fim de semana: o ponto de encontro doce da família em Turvo.

Traz a galera neste sábado! 🧡`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Construção de Marca
Objetivo: Posicionar a sorveteria como ponto de encontro afetivo da família no fim de semana, fortalecendo vínculo emocional com a marca.
Funil: Meio — percepção de valor e pertencimento
Ação esperada: Resposta ao story, planejamento de visita em família`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
A sorveteria como ponto de encontro afetivo da família no sábado — pertencimento e tradição local.

COMPOSIÇÃO DA IMAGEM:
• Elemento principal: mascote 3D do Guri em pose acolhedora
• Fundo: tons quentes e familiares
• Sensação: união, afeto, tradição

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Afetivo e acolhedor, tom de tradição familiar. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'so58', date:'2026-06-27', time:'19h', format:'Story',
      title:'Encerramento — Boa noite de sábado',
      driveFile:'LOGO-GURI-V2.png',
      driveUrl:'https://drive.google.com/file/d/1fO9HP4JSSYFfboE_jDGbNUFoRP38xcBk/view',
      driveHint:'Logo do Guri — fechamento institucional do sábado',
      texto:`Que sábado gostoso! 🍦🌙

Obrigado a todo mundo que passou aqui hoje e deixou o dia mais doce com a gente.

Amanhã tem mais — domingo também é dia de sorvete. Boa noite! 🧡`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Encerramento / Relacionamento
Objetivo: Fechar o sábado com tom de gratidão e já antecipar o domingo, mantendo a marca presente e calorosa.
Funil: Topo — relacionamento e continuidade
Ação esperada: Visualização, resposta com emoji, retorno no dia seguinte`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Fechamento do sábado com gratidão e gancho para o domingo.

COMPOSIÇÃO DA IMAGEM:
• Elemento principal: logo do Guri centralizado
• Fundo: tom noturno suave, aconchegante
• Sensação: gratidão, encerramento caloroso

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo/acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Institucional e acolhedor, clima noturno de fim de dia. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'so59', date:'2026-06-28', time:'09h', format:'Story',
      title:'Produto do Dia — Domingo pede sorvete',
      driveFile:'mascote3d_guri_pose01_sorvete_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1Tb4fIXrE5vWurOTlJPjdfg3kxK9W8Olu/view',
      driveHint:'Mascote 3D do Guri com sorvete — abertura do domingo',
      texto:`Bom domingo! ☀️🍦

Dia de descansar, ficar com quem a gente gosta e, claro, tomar um sorvete gostoso.

O Guri tá te esperando! Loja aberta. 🍨`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Produto do Dia / Abertura
Objetivo: Abrir o domingo com tom leve, associando o dia de descanso ao prazer de tomar sorvete.
Funil: Topo — lembrança de marca
Ação esperada: Visualização, visita à loja`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Abertura de domingo tranquila, sorvete como parte do dia de descanso.

COMPOSIÇÃO DA IMAGEM:
• Elemento principal: mascote 3D do Guri com sorvete
• Fundo: tons claros de manhã de domingo
• Sensação: leveza, descanso, prazer

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Leve e tranquilo, clima de domingo. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'so60', date:'2026-06-28', time:'11h', format:'Post',
      title:'Produto do Dia — A sobremesa do almoço de domingo',
      driveFile:'11.08 - Sabores Guri Mini BomBom de Açaí.png',
      driveUrl:'https://drive.google.com/file/d/1as6g-9NsXdkpm2Yrh-p__w3SCZ73NTNv/view',
      driveHint:'Foto real de produto gourmet — sobremesa de domingo',
      texto:`Já pensou na sobremesa do almoço de domingo? 🍫🍦

A gente resolve pra você: sabor gourmet, textura cremosa e aquele toque especial que transforma a refeição em momento.

Passa aqui ou peça online! 🛵 Link na bio.

#sobremesa #sorvetegourmet #sorvetesguriturvo #domingoemfamilia #turvopr`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas
Estilo: Foto de produto, apetite appeal`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Produto do Dia
Objetivo: Conectar o produto à ocasião do almoço de domingo em família, gerando desejo e conversão como sobremesa.
Funil: Meio/Fundo — desejo e ação
Ação esperada: Pedido online, visita à loja`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
O produto como sobremesa perfeita do almoço de domingo — momento afetivo em família.

COMPOSIÇÃO DA IMAGEM:
• Foto principal: produto real cremoso, bem iluminado
• Fundo: tons quentes, levemente desfocado
• Detalhe: textura e aparência artesanal

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Fotografia de produto com apelo de apetite, tom familiar de domingo. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'so61', date:'2026-06-28', time:'13h', format:'Story',
      title:'Bastidores — Maria Clara no balcão',
      driveFile:'mascote3d_guri_pose02_apresentando_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1saHs8AqxRT27bXp_AMtPw8UjThvDvp7f/view',
      driveHint:'Mascote 3D apresentando — apoio à humanização da atendente',
      texto:`No domingo quem te recebe com sorriso é a Maria Clara. 😊🍦

Sempre pronta pra ajudar você a montar aquele potão do jeito que você gosta.

Vem dar um oi e tomar um sorvete! 🧡`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Bastidores / Humanização da equipe
Objetivo: Apresentar a Maria Clara (atendimento) individualmente, reforçando o atendimento caloroso como marca da casa.
Funil: Topo — conexão e confiança
Ação esperada: Resposta ao story, identificação dos clientes`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Apresentar a Maria Clara como rosto do atendimento de domingo — simpatia e proximidade.

COMPOSIÇÃO DA IMAGEM:
• Elemento principal: mascote 3D do Guri em pose de apresentação
• Fundo: tons claros e quentes
• Sensação: simpatia, acolhimento

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Tom de bastidor acolhedor, foco em proximidade. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'so62', date:'2026-06-28', time:'15h', format:'Post',
      title:'Construção de Marca — Mais que sorvete, um momento',
      driveFile:'LOGO-GURI-V2.png',
      driveUrl:'https://drive.google.com/file/d/1fO9HP4JSSYFfboE_jDGbNUFoRP38xcBk/view',
      driveHint:'Logo do Guri — post institucional de marca',
      texto:`Tem coisa melhor que uma tarde de domingo com sorvete na mão? 🍦💛

Pra gente, sorvete não é só sobremesa — é desculpa pra desacelerar, conversar e aproveitar quem está por perto.

É isso que o Guri quer fazer parte: dos seus melhores momentos. 🧡

#sorvetesguriturvo #momentosguri #domingoperfeito #turvopr #marcalocal`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas
Estilo: Institucional, construção de marca`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Construção de Marca
Objetivo: Elevar a percepção da marca associando o sorvete a momentos afetivos de domingo, indo além do produto.
Funil: Meio — percepção de valor e vínculo emocional
Ação esperada: Curtida, salvamento, comentário marcando alguém`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Sorvete como pretexto para momentos afetivos — posicionamento emocional da marca.

COMPOSIÇÃO DA IMAGEM:
• Elemento principal: logo do Guri com tratamento acolhedor
• Fundo: tarde de domingo, tons quentes
• Sensação: afeto, desaceleração, convívio

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Emocional e acolhedor, tom de marca afetiva. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'so63', date:'2026-06-28', time:'16h30', format:'Story',
      title:'Promoção do Dia — Domingo com gostinho de oferta',
      driveFile:'mascote3d_guri_pose01_sorvete_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1Tb4fIXrE5vWurOTlJPjdfg3kxK9W8Olu/view',
      driveHint:'Mascote 3D do Guri com sorvete — destaque promocional',
      texto:`Domingo também tem oferta! 🎉🍦

Aproveita a tardezinha pra passar aqui e adoçar o fim de semana pagando menos. Só hoje!

🛵 Link na bio pra pedir online`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Promoção do Dia
Objetivo: Gerar conversão de fim de tarde de domingo com oferta de validade imediata.
Funil: Fundo — conversão direta
Ação esperada: Pedido online, visita à loja`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Oferta de domingo à tarde com senso de urgência ("só hoje").

COMPOSIÇÃO DA IMAGEM:
• Elemento principal: mascote 3D do Guri com sorvete
• Fundo: cores vibrantes, clima de tarde
• Espaço para selo/faixa de oferta

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque da oferta
• Branco #ffffff — texto

ESTILO VISUAL:
Vibrante e promocional, senso de urgência leve. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'so64', date:'2026-06-28', time:'18h', format:'Post',
      title:'Produto do Dia — Fecha o domingo com chave de ouro',
      driveFile:'11.08 - Sabores Guri Mini BomBom de Açaí.png',
      driveUrl:'https://drive.google.com/file/d/1as6g-9NsXdkpm2Yrh-p__w3SCZ73NTNv/view',
      driveHint:'Foto real de produto gourmet — encerramento do fim de semana',
      texto:`Última chamada do fim de semana! 🍦🌙

Antes de a segunda chegar, que tal fechar o domingo com aquele sabor que vale a pena? O Guri preparou tudo com carinho pra você.

🛵 Peça online — link na bio
📍 Loja aberta até mais tarde

#sorvetegourmet #sorvetesguriturvo #domingoadocado #turvopr #sorvetedodia`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas
Estilo: Foto de produto, apetite appeal com gancho de fechamento`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Produto do Dia / Conversão
Objetivo: Aproveitar o fim do domingo para gerar uma última conversão antes da semana, com apelo de "última chamada".
Funil: Fundo — conversão direta
Ação esperada: Pedido online, visita à loja`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Última oportunidade do fim de semana — fechar o domingo com o produto gourmet.

COMPOSIÇÃO DA IMAGEM:
• Foto principal: produto real cremoso e convidativo
• Fundo: tons quentes de fim de tarde
• Detalhe: textura artesanal em destaque

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Fotografia de produto com apelo de apetite, tom de fechamento aconchegante. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'so65', date:'2026-06-28', time:'20h', format:'Story',
      title:'Encerramento — Boa semana, Turvo',
      driveFile:'LOGO-GURI-V2.png',
      driveUrl:'https://drive.google.com/file/d/1fO9HP4JSSYFfboE_jDGbNUFoRP38xcBk/view',
      driveHint:'Logo do Guri — fechamento institucional do fim de semana',
      texto:`E assim a gente fecha mais um fim de semana doce. 🍦🧡

Obrigado por escolher o Guri pra adoçar seus dias. Que a semana que começa amanhã seja leve e cheia de coisa boa.

Até amanhã! 🌙`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Encerramento / Relacionamento
Objetivo: Fechar o fim de semana com gratidão e desejo de boa semana, mantendo a marca presente e afetiva.
Funil: Topo — relacionamento e continuidade
Ação esperada: Visualização, resposta com emoji`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Fechamento do fim de semana com gratidão e mensagem de boa semana.

COMPOSIÇÃO DA IMAGEM:
• Elemento principal: logo do Guri centralizado
• Fundo: tom noturno suave
• Sensação: gratidão, aconchego, despedida calorosa

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo/acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Institucional e acolhedor, clima noturno de domingo. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'so66', date:'2026-06-29', time:'09h', format:'Story',
      title:'Produto do Dia — Começa a semana com sabor',
      driveFile:'mascote3d_guri_pose01_sorvete_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1Tb4fIXrE5vWurOTlJPjdfg3kxK9W8Olu/view',
      driveHint:'Mascote 3D Guri com sorvete — protagonista do story. ⚠️ ATENÇÃO: substituir o trecho entre colchetes pelo sabor real do dia antes de aprovar/publicar.',
      texto:`🍦 Segunda-feira em Turvo começa com sorvete bom!

Hoje na vitrine: [✏️ EDITAR ANTES DE PUBLICAR — sabor de hoje] 😍

Pra quem já decidiu que segunda não vai ser sem graça. Peça já! Link na bio 📱 ou chama no WhatsApp 👇`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Festivo, colorido, energético`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Produto do Dia / Divulgação
Objetivo: Criar hábito diário de acompanhamento do perfil — o público espera saber o sabor do dia. ATENÇÃO: editar o sabor antes de aprovar o card (campo sinalizado no texto) para não publicar com o placeholder visível.
Funil: Fundo — conversão imediata (visita física)
Ação esperada: Visita à sorveteria no dia`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Story diário recorrente com identidade visual consistente. O mascote 3D Guri é o comunicador oficial — transmite alegria e personalidade da marca.

COMPOSIÇÃO DA IMAGEM:
• Fundo: degradê diagonal de azul escuro (#003f6b) para azul turquesa (#00b4d8)
• Elementos decorativos: confetes e formas geométricas em amarelo (#f5c800) e branco
• Mascote Guri posicionado à direita, ocupando 60% da altura
• Caixa destacada em amarelo (#f5c800) com nome do sabor do dia

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo principal
• Azul turquesa #00b4d8 — degradê e acentos
• Amarelo #f5c800 — caixa do sabor e confetes
• Branco #ffffff — texto e logo

ESTILO VISUAL:
Festivo e alegre como a marca Guri. Mascote 3D como centro emocional da composição. Sem texto além do sabor do dia inserido na caixa.`
        }
      ]
    },
    {
      id:'so67', date:'2026-06-29', time:'11h30', format:'Post',
      title:'Promoção do Dia — Segunda tem motivo pra sorrir',
      driveFile:'11.08 - Sabores Guri Mini BomBom de Açaí.png',
      driveUrl:'https://drive.google.com/file/d/1as6g-9NsXdkpm2Yrh-p__w3SCZ73NTNv/view',
      driveHint:'Foto real do produto em destaque — oferta de segunda-feira',
      texto:`Segunda-feira não precisa ser sem graça quando tem promoção de sorvete no meio. 🍦💛

Hoje tem condição especial pra você adoçar o começo da semana. Chama no WhatsApp e confere a oferta de hoje!

📍 Loja de fábrica, buffet com mais de 40 sabores e cardápio gourmet
📲 Chama no WhatsApp — link na bio

#promocaodaguri #sorvetesguriturvo #turvopr #sorveteemturvo #segundafeira`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas
Estilo: Vibrante, foco em oferta`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Promoção do Dia / Conversão
Objetivo: Quebrar a resistência típica de segunda-feira com oferta especial, gerando visita imediata à loja.
Funil: Fundo — conversão direta
Ação esperada: Contato via WhatsApp perguntando a oferta do dia, visita à loja`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Usar a segunda-feira (dia historicamente mais fraco de movimento) como motivo pra oferta especial, com tom alegre e convidativo.

COMPOSIÇÃO DA IMAGEM:
• Elemento principal: foto real do produto em destaque
• Fundo: cores vibrantes da marca (amarelo/turquesa)
• Selo ou faixa de "oferta do dia" em destaque

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — selo/faixa de oferta
• Branco #ffffff — texto

ESTILO VISUAL:
Vibrante e convidativo. Selo de oferta como elemento gráfico simples, sem texto livre adicional.`
        }
      ]
    },
    {
      id:'so68', date:'2026-06-29', time:'15h', format:'Carrossel',
      title:'Bastidores — Como nasce um sorvete Guri',
      driveFile:'mascote3d_guri_pose02_apresentando_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1saHs8AqxRT27bXp_AMtPw8UjThvDvp7f/view',
      driveHint:'Mascote 3D apresentando — usar como guia visual; preferir fotos reais da fábrica nos slides centrais',
      texto:`Slide 1: \"Você sabe como nasce um sorvete Guri? Vem com a gente.\"
Slide 2: \"Tudo começa na nossa fábrica própria, aqui em Turvo\"
Slide 3: \"Selecionamos os ingredientes com o mesmo cuidado de quem faz pra família\"
Slide 4: \"Cada sabor passa por teste antes de chegar no balcão\"
Slide 5: \"O resultado: sorvete 100% turvense, feito de verdade\"

Salva esse carrossel e mostra pra quem ainda acha que sorvete bom só vem de fora. 🧡
Visite nossa loja-fábrica! 📍

#sorvetesguriturvo #fabricadesorvete #turvopr #sorveteartesanal #marcalocal`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Carrossel Instagram (5 slides)
Dimensões: 1080 × 1080px por slide (proporção 1:1)
Resolução: 72 DPI
Margem: 80px nas bordas
Estilo: Bastidores de produção, storytelling visual`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Bastidores / Construção de Marca
Objetivo: Mostrar o processo real de fabricação própria como prova do diferencial "100% turvense" e qualidade artesanal, gerando orgulho local e confiança no produto.
Funil: Meio — construção de confiança e diferenciação
Ação esperada: Deslizar o carrossel completo, salvar, comentário com orgulho local, visita à loja-fábrica`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Storytelling visual do processo de fabricação própria — do ingrediente ao balcão — reforçando autenticidade e produção local sem citar concorrentes (que normalmente revendem sorvete de fora).

ESTRUTURA DOS SLIDES:
• Slide 1 — Capa-pergunta com mascote Guri curioso
• Slides 2-4 — Etapas reais da produção (fábrica, seleção, teste de sabor)
• Slide 5 — Conclusão de orgulho local + CTA de visita

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaques
• Branco #ffffff — texto

ESTILO VISUAL:
Autêntico, bastidor real de produção — fotos reais da fábrica sempre que possível, com frases curtas guiando a narrativa em cada slide.`
        }
      ]
    },
    {
      id:'so69', date:'2026-06-29', time:'19h', format:'Story',
      title:'Bastidores — Bruna fechando a segunda com a gente',
      driveFile:'LOGO-GURI-V2.png',
      driveUrl:'https://drive.google.com/file/d/1fO9HP4JSSYFfboE_jDGbNUFoRP38xcBk/view',
      driveHint:'Foto real da Bruna atendendo na loja — substituir pela foto real antes de publicar',
      texto:`Quem fechou a loja com a gente hoje foi a Bruna. 😊🍦

Ela é desse time que faz questão de te atender com calma, mesmo no fim do expediente.

Boa noite, Turvo. Até amanhã pra mais sorvete! 🌙🧡`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Bastidores / Humanização da equipe + Encerramento
Objetivo: Apresentar a Bruna individualmente no fechamento do dia, reforçando atendimento atencioso até o último cliente, e fechar a segunda-feira com tom afetivo.
Funil: Topo — conexão e confiança
Ação esperada: Resposta ao story, identificação dos clientes que já foram atendidos pela Bruna`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Apresentar a Bruna como rosto do fechamento — atendimento atencioso do início ao fim do expediente, fechando o dia com afeto.

COMPOSIÇÃO DA IMAGEM:
• Elemento principal: foto real da Bruna na loja (substituir placeholder do Drive)
• Fundo: tom noturno suave
• Sensação: simpatia, cuidado até o fim do dia

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo/acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Tom de bastidor acolhedor e noturno. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'so70', date:'2026-06-30', time:'09h', format:'Story',
      title:'Produto do Dia — Último dia de junho com sabor',
      driveFile:'mascote3d_guri_pose01_sorvete_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1Tb4fIXrE5vWurOTlJPjdfg3kxK9W8Olu/view',
      driveHint:'Mascote 3D Guri com sorvete — protagonista do story. ⚠️ ATENÇÃO: substituir o trecho entre colchetes pelo sabor real do dia antes de aprovar/publicar.',
      texto:`🍦 Terça-feira, último dia de junho — e a vitrine tá esperando você!

Hoje em destaque: [✏️ EDITAR ANTES DE PUBLICAR — sabor de hoje] 😍

Vem fechar o mês com a gente! Link na bio 📱 ou chama no WhatsApp 👇`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Festivo, colorido, energético`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Produto do Dia / Divulgação
Objetivo: Criar hábito diário de acompanhamento do perfil — o público espera saber o sabor do dia. ATENÇÃO: editar o sabor antes de aprovar o card (campo sinalizado no texto) para não publicar com o placeholder visível.
Funil: Fundo — conversão imediata (visita física)
Ação esperada: Visita à sorveteria no dia`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Story diário recorrente com identidade visual consistente, fechando o mês de junho. O mascote 3D Guri é o comunicador oficial.

COMPOSIÇÃO DA IMAGEM:
• Fundo: degradê diagonal de azul escuro (#003f6b) para azul turquesa (#00b4d8)
• Elementos decorativos: confetes e formas geométricas em amarelo (#f5c800) e branco
• Mascote Guri posicionado à direita, ocupando 60% da altura
• Caixa destacada em amarelo (#f5c800) com nome do sabor do dia

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo principal
• Azul turquesa #00b4d8 — degradê e acentos
• Amarelo #f5c800 — caixa do sabor e confetes
• Branco #ffffff — texto e logo

ESTILO VISUAL:
Festivo e alegre como a marca Guri. Sem texto além do sabor do dia inserido na caixa.`
        }
      ]
    },
    {
      id:'so71', date:'2026-06-30', time:'11h30', format:'Post',
      title:'Construção de Marca — Fechamos junho com muito sorvete e carinho',
      driveFile:'11.08 - Sabores Guri Mini BomBom de Açaí.png',
      driveUrl:'https://drive.google.com/file/d/1as6g-9NsXdkpm2Yrh-p__w3SCZ73NTNv/view',
      driveHint:'Foto real de produto/loja em momento de movimento — fechamento afetivo do mês',
      texto:`Mais um mês, mais um monte de potes entregues com carinho. 🍦🧡

Junho foi de açaí, gourmet, buffet cheio e gente nova conhecendo o Guri. Obrigado por fazer parte disso.

Julho já tá chegando com sabor novo. Fica de olho! 💛

#sorvetesguriturvo #marcalocal #turvopr #fimdemes #sorveteriaturvo`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas
Estilo: Institucional, fechamento de mês`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Construção de Marca / Relacionamento
Objetivo: Fechar o mês com gratidão e vínculo emocional, reforçando proximidade com a comunidade e antecipando conteúdo de julho.
Funil: Topo/Meio — relacionamento e retenção de atenção
Ação esperada: Curtida, comentário de carinho, expectativa para julho`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Fechamento afetivo do mês — gratidão pela comunidade e gancho leve pro mês seguinte.

COMPOSIÇÃO DA IMAGEM:
• Elemento principal: foto real de produto/loja em momento de movimento
• Fundo: tons quentes, clima de gratidão
• Sensação: carinho, comunidade, expectativa positiva

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Caloroso e institucional, tom de gratidão. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'so72', date:'2026-06-30', time:'15h', format:'Story',
      title:'Promoção do Dia — Última terça de junho com oferta',
      driveFile:'mascote3d_guri_pose02_apresentando_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1saHs8AqxRT27bXp_AMtPw8UjThvDvp7f/view',
      driveHint:'Mascote 3D Guri em pose animada — oferta de fechamento de mês',
      texto:`Hoje é a última terça de junho — e isso pede oferta especial. 🍦💛

Chama no WhatsApp e garante a sua antes que o mês vire. 👇

📲 Link na bio`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Festivo, foco em oferta`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Promoção do Dia / Conversão
Objetivo: Usar o fechamento simbólico do mês como gatilho de urgência genuína pra gerar contato e visita imediata.
Funil: Fundo — conversão direta
Ação esperada: Contato via WhatsApp, visita à loja ainda hoje`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Urgência de calendário genuína (última terça do mês) como gancho de oferta, sem artificialidade.

COMPOSIÇÃO DA IMAGEM:
• Elemento principal: mascote 3D Guri em pose animada
• Fundo: cores vibrantes da marca
• Selo de oferta especial em destaque

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — selo de oferta
• Branco #ffffff — texto

ESTILO VISUAL:
Vibrante, urgência leve e positiva. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'so73', date:'2026-06-30', time:'19h', format:'Story',
      title:'Encerramento — Amanhã vira o mês, Turvo',
      driveFile:'LOGO-GURI-V2.png',
      driveUrl:'https://drive.google.com/file/d/1fO9HP4JSSYFfboE_jDGbNUFoRP38xcBk/view',
      driveHint:'Logo do Guri — fechamento institucional do mês de junho',
      texto:`E assim a gente fecha o mês de junho. 🍦🧡

Foi bom dividir cada potinho, cada sabor novo, cada tarde de conversa no balcão com vocês.

Amanhã começa julho — e a gente já tá ansioso pra continuar adoçando os seus dias. Até lá! 🌙💛`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Encerramento / Relacionamento
Objetivo: Fechar o mês de junho com gratidão e criar expectativa positiva para julho, mantendo vínculo emocional com a comunidade.
Funil: Topo — relacionamento e continuidade
Ação esperada: Resposta com emoji, comentário de despedida do mês`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Fechamento simbólico do mês com gratidão, gerando ponte emocional para o início de julho.

COMPOSIÇÃO DA IMAGEM:
• Elemento principal: logo do Guri centralizado
• Fundo: tom noturno suave, leve efeito de "virada de página"
• Sensação: gratidão, expectativa, aconchego

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo/acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Institucional e acolhedor, clima de virada de mês. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'so74', date:'2026-07-01', time:'09h', format:'Story',
      title:'Produto do Dia — Chegou o Açaí com Whey',
      driveFile:'mascote3d_guri_pose01_sorvete_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1Tb4fIXrE5vWurOTlJPjdfg3kxK9W8Olu/view',
      driveHint:'Mascote 3D Guri — destacar o lançamento Açaí com Whey na caixa de sabor',
      texto:`🍦 Bom dia, Turvo! Hoje a vitrine tem novidade de peso.

Chegou o Açaí com Whey — sabor de sempre, com proteína de verdade pra quem treina e não quer abrir mão do sorvete. 💪😍

Vem provar! Link na bio 📱 ou chama no WhatsApp 👇`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Festivo, lançamento de produto`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Produto do Dia / Lançamento — Inverno Fitness
Objetivo: Anunciar o lançamento do Açaí com Whey pelo slot diário de "produto do dia", aproveitando o hábito já criado no público de checar a vitrine.
Funil: Fundo — conversão imediata (visita física)
Ação esperada: Visita à sorveteria, pedido do novo sabor`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Usar o slot recorrente de "produto do dia" pra estrear o primeiro item da linha Inverno Fitness, unindo hábito de conteúdo com lançamento de produto.

COMPOSIÇÃO DA IMAGEM:
• Fundo: degradê diagonal de azul escuro (#003f6b) para azul turquesa (#00b4d8)
• Confetes e formas em amarelo (#f5c800) e branco
• Mascote Guri posicionado à direita
• Caixa destacada em amarelo (#f5c800) com "Açaí com Whey"

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo principal
• Azul turquesa #00b4d8 — degradê e acentos
• Amarelo #f5c800 — caixa do produto
• Branco #ffffff — texto e logo

ESTILO VISUAL:
Festivo e alegre, mascote como centro emocional. Sem texto além do nome do produto na caixa.`
        }
      ]
    },
    {
      id:'so75', date:'2026-07-01', time:'11h30', format:'Post',
      title:'Inverno Fitness — Seu treino continua até na sobremesa',
      driveFile:'11.08 - Sabores Guri Mini BomBom de Açaí.png',
      driveUrl:'https://drive.google.com/file/d/1as6g-9NsXdkpm2Yrh-p__w3SCZ73NTNv/view',
      driveHint:'Foto real do Açaí com Whey ou da linha zero açúcar — substituir o asset de produto genérico antes de publicar',
      texto:`Inverno chegando, treino não para — e agora a sobremesa também ajuda. 🍦💪

Lançamos a linha Inverno Fitness: Açaí com Whey e opções zero açúcar, pra você cuidar do corpo sem abrir mão do sorvete que ama.

Durante a campanha, 20% de desconto na linha fitness. Sabor de sorveteria, consciência de quem treina. 🧡

Vem provar na loja ou peça pelo WhatsApp!
📍 Loja de fábrica, buffet com mais de 40 sabores e cardápio gourmet

#sorvetesguriturvo #invernofitness #acaicomwhey #turvopr #semacucar`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas
Estilo: Lançamento de linha, vibrante`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Lançamento de Linha / Posicionamento + Conversão
Objetivo: Lançar oficialmente a campanha Inverno Fitness e a nova linha de produtos (açaí com whey, zero açúcar), posicionando a marca como aliada de quem treina, e gerar visita/pedido imediato com o desconto.
Funil: Meio/Fundo — consideração e conversão
Ação esperada: Clique no link da bio, contato via WhatsApp, visita à loja pra experimentar a linha`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Reposicionar o sorvete como aliado (não vilão) de quem treina, lançando uma linha funcional sem perder o prazer do produto — slogan oficial da campanha como fio condutor.

COMPOSIÇÃO DA IMAGEM:
• Elemento principal: foto real do produto em destaque
• Elemento visual remetendo a fitness/treino de forma sutil
• Selo "Inverno Fitness" em destaque

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — selo da campanha
• Branco #ffffff — texto

ESTILO VISUAL:
Vibrante e aspiracional, sem deixar de ser convidativo. Selo de campanha como elemento gráfico, sem texto livre adicional.`
        }
      ]
    },
    {
      id:'so76', date:'2026-07-01', time:'15h', format:'Carrossel',
      title:'Inverno Fitness — 3 motivos pra trocar a sobremesa de hoje',
      driveFile:'mascote3d_guri_pose02_apresentando_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1saHs8AqxRT27bXp_AMtPw8UjThvDvp7f/view',
      driveHint:'Mascote 3D apresentando — usar como guia visual; preferir fotos reais do produto nos slides centrais',
      texto:`Slide 1: \"3 motivos pra trocar a sobremesa de hoje pelo Inverno Fitness\"
Slide 2: \"Motivo 1: Açaí com Whey tem proteína de verdade, não só promessa\"
Slide 3: \"Motivo 2: linha zero açúcar sem perder o sabor que você já ama\"
Slide 4: \"Motivo 3: 20% de desconto durante a campanha Inverno Fitness\"
Slide 5: \"Treino e sorvete podem coexistir. Seu treino continua até na sobremesa.\"

Salva esse carrossel pra lembrar na próxima vontade de sorvete. 🧡
Visite a loja ou peça pelo WhatsApp! 📍

#sorvetesguriturvo #invernofitness #acaicomwhey #turvopr #semacucar`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Carrossel Instagram (5 slides)
Dimensões: 1080 × 1080px por slide (proporção 1:1)
Resolução: 72 DPI
Margem: 80px nas bordas
Estilo: Educativo, alto valor de salvamento`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Educativo / Construção de Marca — Inverno Fitness
Objetivo: Usar formato de lista (alto valor de salvamento) pra educar o público sobre os diferenciais da nova linha fitness, reforçando a campanha de forma didática.
Funil: Meio — consideração e construção de posicionamento
Ação esperada: Deslizar o carrossel completo, salvar o post, comentário, clique no link da bio`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Formato de lista numerada que explica de forma rápida e didática por que a linha fitness é diferente, fechando com o slogan oficial da campanha.

ESTRUTURA DOS SLIDES:
• Slide 1 — Capa de impacto
• Slides 2-4 — Um motivo por slide
• Slide 5 — Fechamento com slogan + CTA

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaques
• Branco #ffffff — texto

ESTILO VISUAL:
Didático, alto contraste, frases curtas guiando cada slide.`
        }
      ]
    },
    {
      id:'so77', date:'2026-07-01', time:'19h', format:'Story',
      title:'Encerramento — Hoje foi dia de novidade',
      driveFile:'LOGO-GURI-V2.png',
      driveUrl:'https://drive.google.com/file/d/1fO9HP4JSSYFfboE_jDGbNUFoRP38xcBk/view',
      driveHint:'Logo do Guri — fechamento institucional do dia de lançamento',
      texto:`Hoje a vitrine ganhou um reforço novo: a linha Inverno Fitness chegou! 🍦💪

Quem já provou o Açaí com Whey hoje, conta pra gente o que achou. Quem ainda não provou, amanhã a loja te espera.

Boa noite, Turvo! 🌙🧡`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Encerramento / Reforço de Lançamento
Objetivo: Fechar o dia de lançamento da linha Inverno Fitness com tom afetivo, reforçando a novidade pra quem ainda não viu durante o dia.
Funil: Topo — relacionamento e reforço de awareness
Ação esperada: Comentário com feedback de quem já provou, visita no dia seguinte`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Fechamento afetivo do dia de lançamento, reforçando a novidade mais uma vez pra quem perdeu os posts anteriores.

COMPOSIÇÃO DA IMAGEM:
• Elemento principal: logo do Guri centralizado
• Fundo: tom noturno suave

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo/acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Institucional e acolhedor, clima noturno. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'so78', date:'2026-07-02', time:'09h', format:'Story',
      title:'Produto do Dia — Linha Zero Açúcar em destaque',
      driveFile:'mascote3d_guri_pose01_sorvete_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1Tb4fIXrE5vWurOTlJPjdfg3kxK9W8Olu/view',
      driveHint:'Mascote 3D Guri — destacar a linha zero açúcar na caixa de sabor',
      texto:`🍦 Quinta-feira com sabor que cuida de você.

Hoje em destaque: nossa linha Zero Açúcar — sabor de verdade, sem pesar na consciência. 😍

Vem provar! Link na bio 📱 ou chama no WhatsApp 👇`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Festivo, foco em produto`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Produto do Dia / Campanha — Inverno Fitness
Objetivo: Manter o hábito diário de divulgação de produto, agora destacando o segundo item da linha Inverno Fitness (zero açúcar).
Funil: Fundo — conversão imediata
Ação esperada: Visita à loja, pedido do produto`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Continuar a divulgação diária recorrente, agora com foco na linha zero açúcar da campanha Inverno Fitness.

COMPOSIÇÃO DA IMAGEM:
• Fundo: degradê diagonal de azul escuro (#003f6b) para azul turquesa (#00b4d8)
• Mascote Guri posicionado à direita
• Caixa destacada em amarelo (#f5c800) com "Zero Açúcar"

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo principal
• Azul turquesa #00b4d8 — degradê e acentos
• Amarelo #f5c800 — caixa do produto
• Branco #ffffff — texto

ESTILO VISUAL:
Festivo e alegre. Sem texto além do nome do produto na caixa.`
        }
      ]
    },
    {
      id:'so79', date:'2026-07-02', time:'11h30', format:'Post',
      title:'Inverno Fitness — 20% continua valendo',
      driveFile:'11.08 - Sabores Guri Mini BomBom de Açaí.png',
      driveUrl:'https://drive.google.com/file/d/1as6g-9NsXdkpm2Yrh-p__w3SCZ73NTNv/view',
      driveHint:'Foto real do produto da linha fitness em destaque',
      texto:`O desconto da campanha Inverno Fitness continua valendo! 🍦💪

20% na linha fitness (Açaí com Whey e Zero Açúcar) — só vir até a loja ou pedir pelo WhatsApp.

Quem já testou o sabor novo essa semana, comenta aqui o que achou! 🧡

#sorvetesguriturvo #invernofitness #promocaodaguri #turvopr #semacucar`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas
Estilo: Vibrante, foco em oferta`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Promoção / Conversão — Inverno Fitness
Objetivo: Reforçar a continuidade do desconto da campanha pra quem ainda não aproveitou no lançamento, gerando prova social via comentários de quem já testou.
Funil: Fundo — conversão direta
Ação esperada: Comentário com feedback, contato via WhatsApp, visita à loja`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Reforçar que a oferta de lançamento continua ativa, somando prova social de quem já experimentou.

COMPOSIÇÃO DA IMAGEM:
• Elemento principal: foto real do produto
• Selo de desconto em destaque

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — selo de oferta
• Branco #ffffff — texto

ESTILO VISUAL:
Vibrante e convidativo. Selo de oferta como elemento gráfico.`
        }
      ]
    },
    {
      id:'so80', date:'2026-07-02', time:'15h', format:'Story',
      title:'Bastidores — Luiza Helena e a linha Inverno Fitness',
      driveFile:'mascote3d_guri_pose02_apresentando_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1saHs8AqxRT27bXp_AMtPw8UjThvDvp7f/view',
      driveHint:'Foto real da Luiza Helena atendendo na loja — substituir pela foto real antes de publicar',
      texto:`Quem te atende com aquele sorriso na loja-fábrica? A Luiza Helena! 😊🍦

Ela já é fã da linha Inverno Fitness e recomenda pra quem treina e ainda assim quer um sorvete bom.

Vem conhecer ela e a novidade! 🧡`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Bastidores / Humanização da equipe + Campanha
Objetivo: Apresentar a Luiza Helena individualmente, completando a rotação de colaboradoras, conectando-a à campanha Inverno Fitness como prova social interna.
Funil: Topo/Meio — conexão e prova social
Ação esperada: Resposta ao story, identificação com a Luiza Helena, visita à loja`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Apresentar a Luiza Helena como rosto de confiança da loja-fábrica, somando recomendação pessoal da linha fitness.

COMPOSIÇÃO DA IMAGEM:
• Elemento principal: foto real da Luiza Helena na loja (substituir placeholder do Drive)
• Sensação: simpatia, recomendação genuína

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo/acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Tom de bastidor acolhedor. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'so81', date:'2026-07-02', time:'19h', format:'Story',
      title:'Encerramento — Mais um dia de sabor e treino',
      driveFile:'LOGO-GURI-V2.png',
      driveUrl:'https://drive.google.com/file/d/1fO9HP4JSSYFfboE_jDGbNUFoRP38xcBk/view',
      driveHint:'Logo do Guri — fechamento institucional do dia',
      texto:`Mais um dia chegando ao fim aqui em Turvo. 🍦🧡

Quem passou hoje na loja já sabe: dá pra cuidar do treino e ainda se permitir um sorvete bom. É disso que o Inverno Fitness se trata.

Boa noite! Até amanhã pra mais sabor. 🌙💛`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Encerramento / Relacionamento
Objetivo: Fechar o dia reforçando o posicionamento da campanha (treino + sorvete) de forma afetiva, mantendo vínculo com a comunidade.
Funil: Topo — relacionamento
Ação esperada: Resposta com emoji, comentário de despedida`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Fechamento afetivo reforçando o posicionamento central da campanha Inverno Fitness.

COMPOSIÇÃO DA IMAGEM:
• Elemento principal: logo centralizado
• Fundo: tom noturno

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo/acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Institucional e acolhedor. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'so82', date:'2026-07-03', time:'09h', format:'Story',
      title:'Produto do Dia — Sexta de sabor',
      driveFile:'mascote3d_guri_pose01_sorvete_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1Tb4fIXrE5vWurOTlJPjdfg3kxK9W8Olu/view',
      driveHint:'Mascote 3D Guri — protagonista do story. ⚠️ ATENÇÃO: substituir o trecho entre colchetes pelo sabor real do dia antes de aprovar/publicar.',
      texto:`🍦 Sexta-feira chegou e a vitrine também tem novidade.

Hoje em destaque: [✏️ EDITAR ANTES DE PUBLICAR — sabor de hoje] 😍

Vem fechar a semana com a gente! Link na bio 📱 ou chama no WhatsApp 👇`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Festivo, colorido, energético`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Produto do Dia / Divulgação
Objetivo: Manter o hábito diário de divulgação. ATENÇÃO: editar o sabor antes de aprovar o card pra não publicar com o placeholder visível.
Funil: Fundo — conversão imediata
Ação esperada: Visita à sorveteria no dia`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Story diário recorrente com identidade visual consistente. O mascote 3D Guri é o comunicador oficial.

COMPOSIÇÃO DA IMAGEM:
• Fundo: degradê diagonal de azul escuro (#003f6b) para azul turquesa (#00b4d8)
• Confetes e formas em amarelo (#f5c800) e branco
• Mascote Guri posicionado à direita
• Caixa destacada em amarelo (#f5c800) com nome do sabor do dia

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo principal
• Azul turquesa #00b4d8 — degradê e acentos
• Amarelo #f5c800 — caixa do sabor
• Branco #ffffff — texto e logo

ESTILO VISUAL:
Festivo e alegre. Sem texto além do sabor do dia na caixa.`
        }
      ]
    },
    {
      id:'so83', date:'2026-07-03', time:'11h30', format:'Carrossel',
      title:'Inverno Fitness — 4 formas de aproveitar o frio com a linha certa',
      driveFile:'11.08 - Sabores Guri Mini BomBom de Açaí.png',
      driveUrl:'https://drive.google.com/file/d/1as6g-9NsXdkpm2Yrh-p__w3SCZ73NTNv/view',
      driveHint:'Foto real dos produtos da linha fitness para os slides',
      texto:`Slide 1: \"4 formas de aproveitar o frio sem culpa\"
Slide 2: \"1. Açaí com Whey antes ou depois do treino\"
Slide 3: \"2. Zero Açúcar pra quem tá de dieta mas não quer abrir mão do doce\"
Slide 4: \"3. Combine com granola pra fechar a refeição pós-treino\"
Slide 5: \"4. Vem na loja-fábrica e monte o seu jeito — 20% de desconto na linha fitness\"

Salva esse carrossel pra próxima vontade de sorvete. 🧡

#sorvetesguriturvo #invernofitness #acaicomwhey #turvopr #semacucar`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Carrossel Instagram (5 slides)
Dimensões: 1080 × 1350px por slide (proporção 4:5, retrato)
Resolução: 72 DPI
Margem: 80px nas bordas
Estilo: Educativo`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Educativo / Campanha Inverno Fitness
Objetivo: Dar aplicação prática à linha fitness (como consumir, quando, com o quê), aumentando a percepção de utilidade real do produto.
Funil: Meio — consideração
Ação esperada: Salvar, deslizar completo, visita à loja`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Lista prática de formas de uso da linha fitness, reduzindo a abstração da campanha pra algo aplicável no dia a dia.

ESTRUTURA DOS SLIDES:
• Slide 1 — Capa
• Slides 2-4 — Formas de uso
• Slide 5 — Fechamento + CTA

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaques
• Branco #ffffff — texto

ESTILO VISUAL:
Didático, frases curtas guiando cada slide.`
        }
      ]
    },
    {
      id:'so84', date:'2026-07-03', time:'15h', format:'Post',
      title:'Quem faz a diferença aqui é você',
      driveFile:'mascote3d_guri_pose02_apresentando_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1saHs8AqxRT27bXp_AMtPw8UjThvDvp7f/view',
      driveHint:'Foto real da loja com movimento de clientes, ou ambiente acolhedor',
      texto:`A gente sempre fala da fábrica, do sorvete, da linha nova... mas quem faz tudo valer a pena é quem entra pela porta todo dia. 🍦🧡

Obrigado por fazer da Sorveteria Guri parte da rotina de Turvo.

Se você ainda não veio essa semana, a loja te espera! 💛

#sorvetesguriturvo #marcalocal #turvopr #comunidade #sorveteriaturvo`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1350px (proporção 4:5, retrato)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas
Estilo: Caloroso, institucional`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Relacionamento / Construção de Marca
Objetivo: Reforçar gratidão pela comunidade local, fortalecendo vínculo emocional fora do contexto de venda direta.
Funil: Topo — relacionamento
Ação esperada: Curtida, comentário de carinho`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Post de gratidão simples, sem venda direta, focado no vínculo com a comunidade de Turvo.

COMPOSIÇÃO DA IMAGEM:
• Foto real da loja com movimento de clientes (ou ambiente acolhedor)

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Caloroso, espontâneo. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'so85', date:'2026-07-03', time:'19h', format:'Story',
      title:'Encerramento — Mais uma sexta no bolso',
      driveFile:'LOGO-GURI-V2.png',
      driveUrl:'https://drive.google.com/file/d/1fO9HP4JSSYFfboE_jDGbNUFoRP38xcBk/view',
      driveHint:'Logo do Guri — fechamento institucional da sexta',
      texto:`Mais uma sexta-feira fechando por aqui. 🍦🧡

Quem provou a novidade da semana, conta pra gente como foi. Fim de semana chegando — vem com tudo!

Boa noite, Turvo! 🌙💛`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Encerramento / Relacionamento
Objetivo: Fechar a semana com tom afetivo, mantendo vínculo com a comunidade antes do fim de semana.
Funil: Topo — relacionamento
Ação esperada: Resposta com emoji, comentário`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Fechamento simples de sexta-feira, tom acolhedor.

COMPOSIÇÃO DA IMAGEM:
• Logo centralizado, tom noturno

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo/acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Institucional e acolhedor. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'so86', date:'2026-07-04', time:'09h', format:'Carrossel',
      title:'Inverno Fitness — Vale a pena trocar o sorvete comum?',
      driveFile:'mascote3d_guri_pose01_sorvete_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1Tb4fIXrE5vWurOTlJPjdfg3kxK9W8Olu/view',
      driveHint:'Mascote 3D + fotos reais dos produtos clássico e fitness',
      texto:`Slide 1: \"Vale a pena trocar seu sorvete de sempre pelo Inverno Fitness?\"
Slide 2: \"Se você treina: sim, o Açaí com Whey ajuda na recuperação muscular\"
Slide 3: \"Se você cuida da alimentação: sim, a linha zero açúcar não pesa na consciência\"
Slide 4: \"Se você só quer o sabor de sempre: os clássicos continuam aqui também\"
Slide 5: \"Sábado é dia bom pra decidir na hora — 20% de desconto na linha fitness\"

#sorvetesguriturvo #invernofitness #promocaodaguri #turvopr #semacucar`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Carrossel Instagram (5 slides)
Dimensões: 1080 × 1350px por slide (proporção 4:5, retrato)
Resolução: 72 DPI
Margem: 80px nas bordas`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Educativo / Conversão — Sábado
Objetivo: Ajudar o cliente a decidir entre a linha fitness e os sabores clássicos de forma transparente, sem forçar a venda, aumentando a confiança na recomendação.
Funil: Meio/Fundo — consideração e conversão
Ação esperada: Deslizar, salvar, visita à loja no sábado`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Responder de forma honesta "pra quem vale a pena" a linha fitness, sem empurrar pra todo mundo igual — gera confiança.

ESTRUTURA DOS SLIDES:
• Slide 1 — Pergunta
• Slides 2-4 — Cenários distintos
• Slide 5 — CTA

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaques
• Branco #ffffff — texto

ESTILO VISUAL:
Didático.`
        }
      ]
    },
    {
      id:'so87', date:'2026-07-04', time:'11h30', format:'Post',
      title:'Sábado de Inverno Fitness com 20%',
      driveFile:'11.08 - Sabores Guri Mini BomBom de Açaí.png',
      driveUrl:'https://drive.google.com/file/d/1as6g-9NsXdkpm2Yrh-p__w3SCZ73NTNv/view',
      driveHint:'Foto real do produto da linha fitness',
      texto:`Sábado é dia perfeito pra aproveitar o desconto da campanha Inverno Fitness. 🍦💪

20% na linha fitness — Açaí com Whey e Zero Açúcar — só vir até a loja ou chamar no WhatsApp.

📍 Loja de fábrica, buffet com mais de 40 sabores e cardápio gourmet

#sorvetesguriturvo #invernofitness #promocaodaguri #turvopr #acaicomwhey`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1350px (proporção 4:5, retrato)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas
Estilo: Vibrante`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Promoção / Conversão
Objetivo: Reforçar a oferta da campanha no fim de semana, quando o movimento da loja costuma ser maior.
Funil: Fundo — conversão direta
Ação esperada: Visita à loja, contato via WhatsApp`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Aproveitar o movimento natural de sábado pra reforçar a oferta vigente.

COMPOSIÇÃO DA IMAGEM:
• Foto real do produto, selo de oferta

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — selo de oferta
• Branco #ffffff — texto

ESTILO VISUAL:
Vibrante e convidativo.`
        }
      ]
    },
    {
      id:'so91', date:'2026-07-04', time:'13h', format:'Story',
      title:'Sábado na loja-fábrica',
      driveFile:'mascote3d_guri_pose02_apresentando_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1saHs8AqxRT27bXp_AMtPw8UjThvDvp7f/view',
      driveHint:'Ambiente movimentado da loja no sábado',
      texto:`Sábado de movimento bom aqui na loja-fábrica! 🍦🧡

Se você ainda não decidiu o que pedir, a dica é: comece pelo clássico e termine com a novidade fitness.

Te esperamos! 💛`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Engajamento / Movimento da loja
Objetivo: Reforçar presença no meio do sábado, sugerindo combinação de produtos pra aumentar ticket médio de forma natural.
Funil: Fundo — conversão
Ação esperada: Visita, pedido combinado`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Story de movimento real do sábado, com sugestão sutil de combo.

COMPOSIÇÃO DA IMAGEM:
• Ambiente movimentado da loja

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo/acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Espontâneo, tom de loja viva. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'so88', date:'2026-07-04', time:'15h', format:'Story',
      title:'Tarde de sábado é assim',
      driveFile:'LOGO-GURI-V2.png',
      driveUrl:'https://drive.google.com/file/d/1fO9HP4JSSYFfboE_jDGbNUFoRP38xcBk/view',
      driveHint:'Ambiente social da loja',
      texto:`Tarde de sábado com sorvete e boa companhia — combinação que não falha. 🍦🧡

Se o plano de hoje ainda tá em aberto, a gente já adianta uma sugestão. 😉

Vem com quem você gosta! 💛`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Construção de Marca / Engajamento
Objetivo: Posicionar a loja como destino natural de tarde de sábado com amigos/família, sem foco comercial direto.
Funil: Topo — relacionamento
Ação esperada: Visualização, comentário`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Tarde de sábado como contexto de consumo social, reforçando a loja como ponto de encontro.

COMPOSIÇÃO DA IMAGEM:
• Ambiente social da loja

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo/acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Caloroso e social. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'so89', date:'2026-07-04', time:'17h', format:'Post',
      title:'Entardecer de sábado pede um sabor especial',
      driveFile:'mascote3d_guri_pose01_sorvete_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1Tb4fIXrE5vWurOTlJPjdfg3kxK9W8Olu/view',
      driveHint:'Foto real do ambiente externo/entrada da loja no fim de tarde',
      texto:`O entardecer de sábado em Turvo combina com aquele sorvete que você anda querendo experimentar. 🍦🌅

Linha clássica ou Inverno Fitness — a escolha é sua, a vontade de vir é nossa sugestão.

📍 Loja de fábrica, buffet com mais de 40 sabores e cardápio gourmet

#sorvetesguriturvo #turvopr #entardecer #sorveteriaturvo #marcalocal`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1350px (proporção 4:5, retrato)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Construção de Marca / Ambientação
Objetivo: Usar o horário de entardecer (alto movimento social em pequenas cidades) como gancho de visita, sem foco apenas em desconto.
Funil: Topo/Meio — relacionamento e consideração
Ação esperada: Curtida, visita à loja`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Aproveitar o horário do entardecer, naturalmente associado a passeio/lazer em Turvo, pra convidar à visita.

COMPOSIÇÃO DA IMAGEM:
• Foto real do ambiente externo/entrada da loja no fim de tarde

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Quente, fotografia real. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'so90', date:'2026-07-04', time:'19h', format:'Carrossel',
      title:'Sábado à noite é aqui também',
      driveFile:'11.08 - Sabores Guri Mini BomBom de Açaí.png',
      driveUrl:'https://drive.google.com/file/d/1as6g-9NsXdkpm2Yrh-p__w3SCZ73NTNv/view',
      driveHint:'Fotos reais da loja à noite e do buffet',
      texto:`Slide 1: \"Sábado à noite também é dia de Sorveteria Guri\"
Slide 2: \"Aberto até mais tarde pra fechar bem o seu fim de semana\"
Slide 3: \"Buffet completo pra quem quer se servir à vontade\"
Slide 4: \"Linha Inverno Fitness disponível também à noite, com 20% de desconto\"
Slide 5: \"Te esperamos pra fechar o sábado com a gente\"

#sorvetesguriturvo #turvopr #sabadonoite #buffetdesorvete #invernofitness`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Carrossel Instagram (5 slides)
Dimensões: 1080 × 1350px por slide (proporção 4:5, retrato)
Resolução: 72 DPI
Margem: 80px nas bordas`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Construção de Marca / Conversão
Objetivo: Reforçar que a loja é opção também no período noturno de sábado, ampliando ocasiões de consumo, e lembrar do desconto vigente.
Funil: Meio/Fundo — consideração e conversão
Ação esperada: Deslizar completo, visita noturna`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Posicionar a loja como destino de sábado à noite, não só de tarde, expandindo a janela de consumo.

ESTRUTURA DOS SLIDES:
• Slide 1 — Capa
• Slides 2-3 — Diferenciais (horário, buffet)
• Slide 4 — Campanha
• Slide 5 — CTA

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaques
• Branco #ffffff — texto

ESTILO VISUAL:
Convidativo, tom noturno.`
        }
      ]
    },
    {
      id:'so92', date:'2026-07-05', time:'09h', format:'Story',
      title:'Produto do Dia — Domingo com sabor',
      driveFile:'mascote3d_guri_pose02_apresentando_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1saHs8AqxRT27bXp_AMtPw8UjThvDvp7f/view',
      driveHint:'Mascote 3D Guri — protagonista do story. ⚠️ ATENÇÃO: substituir o trecho entre colchetes pelo sabor real do dia antes de aprovar/publicar.',
      texto:`🍦 Domingo em Turvo começa com vitrine cheia de sabor.

Hoje em destaque: [✏️ EDITAR ANTES DE PUBLICAR — sabor de hoje] 😍

Vem provar! Link na bio 📱 ou chama no WhatsApp 👇`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Festivo, colorido`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Produto do Dia / Divulgação
Objetivo: Manter o hábito diário de divulgação. ATENÇÃO: editar o sabor antes de aprovar.
Funil: Fundo — conversão imediata
Ação esperada: Visita à sorveteria no dia`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Story diário recorrente com identidade visual consistente.

COMPOSIÇÃO DA IMAGEM:
• Fundo degradê azul escuro (#003f6b) → turquesa (#00b4d8)
• Mascote Guri à direita, caixa amarela com o sabor do dia

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo principal
• Azul turquesa #00b4d8 — degradê e acentos
• Amarelo #f5c800 — caixa do sabor
• Branco #ffffff — texto

ESTILO VISUAL:
Festivo e alegre. Sem texto além do sabor do dia na caixa.`
        }
      ]
    },
    {
      id:'so93', date:'2026-07-05', time:'11h', format:'Post',
      title:'Domingo em família pede sorvete',
      driveFile:'LOGO-GURI-V2.png',
      driveUrl:'https://drive.google.com/file/d/1fO9HP4JSSYFfboE_jDGbNUFoRP38xcBk/view',
      driveHint:'Foto real de produto/família, ou produto em destaque',
      texto:`Domingo de almoço em família combina com aquela sobremesa que todo mundo gosta. 🍦🧡

Linha clássica pros pequenos, Inverno Fitness pra quem cuida do treino — tem opção pra todo mundo na mesa.

📍 Loja de fábrica, buffet com mais de 40 sabores e cardápio gourmet

#sorvetesguriturvo #domingoemfamilia #turvopr #marcalocal #invernofitness`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1350px (proporção 4:5, retrato)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Construção de Marca / Família
Objetivo: Posicionar o produto como parte do ritual de domingo em família, ampliando contexto de consumo.
Funil: Topo/Meio — relacionamento
Ação esperada: Curtida, visita à loja`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Domingo em família como contexto natural de consumo, com opção pra cada perfil da mesa.

COMPOSIÇÃO DA IMAGEM:
• Foto real de produto/família (se disponível) ou produto em destaque

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Caloroso, familiar. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'so94', date:'2026-07-05', time:'13h', format:'Story',
      title:'Domingo de movimento na loja-fábrica',
      driveFile:'mascote3d_guri_pose01_sorvete_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1Tb4fIXrE5vWurOTlJPjdfg3kxK9W8Olu/view',
      driveHint:'Ambiente da loja em funcionamento no domingo',
      texto:`Domingo também é dia de loja aberta e fábrica funcionando! 🍦🧡

Se o almoço já foi, a sobremesa pode ser aqui. Te esperamos!`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Engajamento / Lembrete de Horário
Objetivo: Reforçar que a loja funciona normalmente no domingo, removendo dúvida de horário de funcionamento.
Funil: Fundo — conversão
Ação esperada: Visita à loja`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Lembrete simples de funcionamento dominical.

COMPOSIÇÃO DA IMAGEM:
• Ambiente da loja

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo/acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Espontâneo. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'so95', date:'2026-07-05', time:'15h', format:'Post',
      title:'Inverno Fitness — Domingo também tem 20%',
      driveFile:'11.08 - Sabores Guri Mini BomBom de Açaí.png',
      driveUrl:'https://drive.google.com/file/d/1as6g-9NsXdkpm2Yrh-p__w3SCZ73NTNv/view',
      driveHint:'Foto real do produto, selo de oferta',
      texto:`O desconto da campanha Inverno Fitness vale todo dia, incluindo hoje. 🍦💪

20% na linha fitness — Açaí com Whey e Zero Açúcar.

Vem fechar o fim de semana provando! 🧡

#sorvetesguriturvo #invernofitness #promocaodaguri #turvopr #acaicomwhey`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1350px (proporção 4:5, retrato)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Promoção / Conversão
Objetivo: Reforçar que o desconto da campanha vale também no domingo, evitando a suposição comum de que promoções só valem em dias de semana.
Funil: Fundo — conversão
Ação esperada: Visita à loja, contato via WhatsApp`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Esclarecer e reforçar a validade do desconto no domingo.

COMPOSIÇÃO DA IMAGEM:
• Foto real do produto, selo de oferta

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — selo de oferta
• Branco #ffffff — texto

ESTILO VISUAL:
Vibrante. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'so96', date:'2026-07-05', time:'16h30', format:'Story',
      title:'Bastidores — Maria Júlia também ama a novidade',
      driveFile:'mascote3d_guri_pose02_apresentando_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1saHs8AqxRT27bXp_AMtPw8UjThvDvp7f/view',
      driveHint:'Foto real da Maria Júlia atendendo na loja — substituir pela foto real antes de publicar',
      texto:`Quem já te atendeu aqui sabe: a Maria Júlia sempre tem uma indicação boa de sabor. 😊🍦

Hoje ela tá recomendando o Açaí com Whey pra quem treina.

Vem pedir a dica dela pessoalmente! 🧡`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Bastidores / Humanização da equipe
Objetivo: Retomar a rotação de humanização com a Maria Júlia, conectando-a à recomendação da linha fitness.
Funil: Topo/Meio — conexão e prova social
Ação esperada: Resposta ao story, identificação com a Maria Júlia`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Reforçar humanização com recomendação pessoal de produto.

COMPOSIÇÃO DA IMAGEM:
• Foto real da Maria Júlia na loja (substituir placeholder do Drive)

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo/acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Tom de bastidor acolhedor. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'so97', date:'2026-07-05', time:'18h', format:'Post',
      title:'Mais uma semana de sabor em Turvo',
      driveFile:'LOGO-GURI-V2.png',
      driveUrl:'https://drive.google.com/file/d/1fO9HP4JSSYFfboE_jDGbNUFoRP38xcBk/view',
      driveHint:'Logo ou produto em destaque',
      texto:`Fechando mais uma semana por aqui — com sabor de sempre e novidade fitness pegando gosto. 🍦🧡

Semana que vem tem mais. Até lá!

#sorvetesguriturvo #turvopr #marcalocal #sorveteriaturvo #semana`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1350px (proporção 4:5, retrato)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Construção de Marca / Relacionamento
Objetivo: Fechar a semana com tom de continuidade, mantendo expectativa pra semana seguinte.
Funil: Topo — relacionamento
Ação esperada: Curtida, comentário`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Fechamento de semana com tom de continuidade.

COMPOSIÇÃO DA IMAGEM:
• Logo ou produto em destaque

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo/acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Institucional e acolhedor. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'so98', date:'2026-07-05', time:'20h', format:'Story',
      title:'Encerramento — Boa semana, Turvo',
      driveFile:'mascote3d_guri_pose01_sorvete_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1Tb4fIXrE5vWurOTlJPjdfg3kxK9W8Olu/view',
      driveHint:'Logo ou mascote centralizado, tom noturno',
      texto:`Mais uma semana se encerrando por aqui. 🍦🧡

Obrigado por fazer parte de cada sabor dessa semana. Amanhã a semana recomeça — e a gente também.

Boa noite! 🌙💛`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Encerramento / Relacionamento
Objetivo: Fechar a semana com gratidão, criando ponte emocional pra próxima semana.
Funil: Topo — relacionamento
Ação esperada: Resposta com emoji, comentário de despedida`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Fechamento afetivo de semana.

COMPOSIÇÃO DA IMAGEM:
• Logo/mascote centralizado, tom noturno

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo/acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Institucional e acolhedor.`
        }
      ]
    },
    {
      id:'so99', date:'2026-07-06', time:'09h', format:'Story',
      title:'Produto do Dia — Segunda com sabor',
      driveFile:'mascote3d_guri_pose02_apresentando_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1saHs8AqxRT27bXp_AMtPw8UjThvDvp7f/view',
      driveHint:'Mascote 3D Guri — protagonista do story. ⚠️ ATENÇÃO: substituir o trecho entre colchetes pelo sabor real do dia antes de aprovar/publicar.',
      texto:`🍦 Segunda-feira também merece um sabor especial pra começar bem a semana.

Hoje em destaque: [✏️ EDITAR ANTES DE PUBLICAR — sabor de hoje] 😍

Vem provar! Link na bio 📱 ou chama no WhatsApp 👇`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Festivo, colorido`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Produto do Dia / Divulgação
Objetivo: Manter o hábito diário de divulgação. ATENÇÃO: editar o sabor antes de aprovar.
Funil: Fundo — conversão imediata
Ação esperada: Visita à sorveteria no dia`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Story diário recorrente com identidade visual consistente.

COMPOSIÇÃO DA IMAGEM:
• Fundo degradê azul escuro (#003f6b) → turquesa (#00b4d8)
• Mascote Guri à direita, caixa amarela com o sabor do dia

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo principal
• Azul turquesa #00b4d8 — degradê e acentos
• Amarelo #f5c800 — caixa do sabor
• Branco #ffffff — texto

ESTILO VISUAL:
Festivo e alegre.`
        }
      ]
    },
    {
      id:'so100', date:'2026-07-06', time:'11h30', format:'Post',
      title:'Você sabia que a Guri também é fábrica?',
      driveFile:'LOGO-GURI-V2.png',
      driveUrl:'https://drive.google.com/file/d/1fO9HP4JSSYFfboE_jDGbNUFoRP38xcBk/view',
      driveHint:'Foto real da produção/fábrica, ou logo em destaque',
      texto:`Curiosidade de segunda: além da loja, a Guri também é fábrica de sorvete. 🍦🧡

Tudo feito aqui mesmo em Turvo, todos os dias, com o mesmo carinho de sempre.

📍 Loja de fábrica, buffet com mais de 40 sabores e cardápio gourmet

#sorvetesguriturvo #turvopr #lojadefabrica #marcalocal`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1350px (proporção 4:5, retrato)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Construção de Marca / Institucional
Objetivo: Reforçar o posicionamento de loja de fábrica, um diferencial pouco explorado nos posts recentes, aumentando a percepção de frescor e qualidade.
Funil: Topo — construção de marca
Ação esperada: Curtida, comentário, visita à loja`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Destacar o diferencial de "loja de fábrica" — produção local em Turvo — pouco explorado nos posts recentes.

COMPOSIÇÃO DA IMAGEM:
• Foto real da produção/fábrica, ou logo em destaque

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Institucional, autêntico.`
        }
      ]
    },
    {
      id:'so101', date:'2026-07-06', time:'15h', format:'Story',
      title:'Enquete — Casquinha ou potinho?',
      driveFile:'mascote3d_guri_pose01_sorvete_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1Tb4fIXrE5vWurOTlJPjdfg3kxK9W8Olu/view',
      driveHint:'Mascote Guri com enquete interativa (sticker de enquete do Instagram)',
      texto:`Enquete rápida de segunda: no calor da tarde, você prefere casquinha 🍦 ou potinho 🥣?

Vota aí e depois vem provar sua escolha na Guri!`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Elemento interativo: Sticker de enquete do Instagram (2 opções)`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Enquete / Relacionamento
Objetivo: Usar o formato de enquete (ainda não explorado nos posts recentes) pra gerar interação leve no meio da tarde, aumentando alcance via participação no sticker.
Funil: Topo — engajamento
Ação esperada: Voto na enquete, visita à loja depois de votar`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Enquete leve e divertida pra gerar interação direta, formato novo na rotação de conteúdo.

COMPOSIÇÃO DA IMAGEM:
• Mascote Guri centralizado, com espaço reservado pro sticker de enquete

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo
• Azul turquesa #00b4d8 — degradê
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Divertido, leve, interativo.`
        }
      ]
    },
    {
      id:'so102', date:'2026-07-06', time:'19h', format:'Story',
      title:'Encerramento — Começamos a semana com sabor',
      driveFile:'LOGO-GURI-V2.png',
      driveUrl:'https://drive.google.com/file/d/1fO9HP4JSSYFfboE_jDGbNUFoRP38xcBk/view',
      driveHint:'Logo centralizado, tom noturno',
      texto:`Começamos a semana com sabor por aqui. 🍦🧡

Amanhã tem mais novidade te esperando. Boa noite, Turvo! 🌙💛`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Encerramento / Relacionamento
Objetivo: Fechar o primeiro dia da semana com tom leve, mantendo a expectativa pro dia seguinte.
Funil: Topo — relacionamento
Ação esperada: Resposta com emoji, comentário de despedida`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Fechamento afetivo do início de semana.

COMPOSIÇÃO DA IMAGEM:
• Logo centralizado, tom noturno

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo/acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Institucional e acolhedor.`
        }
      ]
    },
    {
      id:'so103', date:'2026-07-07', time:'09h', format:'Story',
      title:'Produto do Dia — Terça com sabor',
      driveFile:'mascote3d_guri_pose02_apresentando_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1saHs8AqxRT27bXp_AMtPw8UjThvDvp7f/view',
      driveHint:'Mascote 3D Guri — protagonista do story. ⚠️ ATENÇÃO: substituir o trecho entre colchetes pelo sabor real do dia antes de aprovar/publicar.',
      texto:`🍦 Terça-feira pede um sabor pra alegrar o dia.

Hoje em destaque: [✏️ EDITAR ANTES DE PUBLICAR — sabor de hoje] 😍

Vem provar! Link na bio 📱 ou chama no WhatsApp 👇`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Festivo, colorido`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Produto do Dia / Divulgação
Objetivo: Manter o hábito diário de divulgação. ATENÇÃO: editar o sabor antes de aprovar.
Funil: Fundo — conversão imediata
Ação esperada: Visita à sorveteria no dia`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Story diário recorrente com identidade visual consistente.

COMPOSIÇÃO DA IMAGEM:
• Fundo degradê azul escuro (#003f6b) → turquesa (#00b4d8)
• Mascote Guri à direita, caixa amarela com o sabor do dia

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo principal
• Azul turquesa #00b4d8 — degradê e acentos
• Amarelo #f5c800 — caixa do sabor
• Branco #ffffff — texto

ESTILO VISUAL:
Festivo e alegre.`
        }
      ]
    },
    {
      id:'so104', date:'2026-07-07', time:'11h30', format:'Post',
      title:'Bastidores da fábrica — cada sabor tem um processo',
      driveFile:'11.08 - Sabores Guri Mini BomBom de Açaí.png',
      driveUrl:'https://drive.google.com/file/d/1as6g-9NsXdkpm2Yrh-p__w3SCZ73NTNv/view',
      driveHint:'Foto real do processo de produção na fábrica — substituir pela foto real antes de publicar',
      texto:`Por trás de cada sabor tem um processo cuidadoso feito na nossa fábrica aqui em Turvo. 🍦🧡

Cada lote é pensado pra chegar fresquinho até você.

📍 Loja de fábrica, buffet com mais de 40 sabores e cardápio gourmet

#sorvetesguriturvo #bastidores #turvopr #marcalocal`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1350px (proporção 4:5, retrato)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Bastidores / Construção de Marca
Objetivo: Mostrar o processo de produção (bastidor de fábrica, diferente do bastidor de atendimento já usado com a Maria Júlia), reforçando qualidade e frescor.
Funil: Topo/Meio — construção de marca
Ação esperada: Curtida, comentário, salvar o post`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Bastidor de produção (fábrica), ângulo diferente do bastidor de atendimento já explorado.

COMPOSIÇÃO DA IMAGEM:
• Foto real do processo de produção na fábrica

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Autêntico, tom de bastidor.`
        }
      ]
    },
    {
      id:'so105', date:'2026-07-07', time:'15h', format:'Post',
      title:'Depois do treino, vem repor com a linha fitness',
      driveFile:'11.08 - Sabores Guri Mini BomBom de Açaí.png',
      driveUrl:'https://drive.google.com/file/d/1as6g-9NsXdkpm2Yrh-p__w3SCZ73NTNv/view',
      driveHint:'Foto real do produto Açaí com Whey, selo de oferta',
      texto:`Saiu da academia agora? Vem repor com a linha Inverno Fitness da Guri. 🍦💪

Açaí com Whey ou Zero Açúcar — com 20% de desconto na campanha.

Vem provar pertinho da Planeta Corpo!

#sorvetesguriturvo #invernofitness #acaicomwhey #turvopr`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1350px (proporção 4:5, retrato)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Promoção / Conversão
Objetivo: Criar um gancho de "depois do treino" pra linha fitness, conectando implicitamente com o público da Planeta Corpo (parceria informal entre as duas frentes de Gilson).
Funil: Fundo — conversão
Ação esperada: Visita à loja, contato via WhatsApp`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Conectar o momento pós-treino ao consumo da linha fitness, ângulo ainda não usado nos posts da campanha Inverno Fitness.

COMPOSIÇÃO DA IMAGEM:
• Foto real do produto Açaí com Whey, selo de oferta

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — selo de oferta
• Branco #ffffff — texto

ESTILO VISUAL:
Vibrante, energético.`
        }
      ]
    },
    {
      id:'so106', date:'2026-07-07', time:'19h', format:'Story',
      title:'Encerramento — Terça de sabor por aqui',
      driveFile:'mascote3d_guri_pose01_sorvete_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1Tb4fIXrE5vWurOTlJPjdfg3kxK9W8Olu/view',
      driveHint:'Mascote ou logo centralizado, tom noturno',
      texto:`Mais uma terça de sabor se encerrando por aqui. 🍦🧡

Amanhã tem mais novidade. Boa noite, Turvo! 🌙💛`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Encerramento / Relacionamento
Objetivo: Fechar o dia com tom leve, mantendo a rotina de encerramento diário.
Funil: Topo — relacionamento
Ação esperada: Resposta com emoji, comentário de despedida`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Fechamento afetivo do dia.

COMPOSIÇÃO DA IMAGEM:
• Mascote ou logo centralizado, tom noturno

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo/acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Institucional e acolhedor.`
        }
      ]
    },
    {
      id:'so107', date:'2026-07-08', time:'09h', format:'Story',
      title:'Produto do Dia — Quarta com sabor',
      driveFile:'mascote3d_guri_pose02_apresentando_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1saHs8AqxRT27bXp_AMtPw8UjThvDvp7f/view',
      driveHint:'Mascote 3D Guri — protagonista do story. ⚠️ ATENÇÃO: substituir o trecho entre colchetes pelo sabor real do dia antes de aprovar/publicar.',
      texto:`🍦 Quarta-feira também é dia de sabor especial.

Hoje em destaque: [✏️ EDITAR ANTES DE PUBLICAR — sabor de hoje] 😍

Vem provar! Link na bio 📱 ou chama no WhatsApp 👇`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Festivo, colorido`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Produto do Dia / Divulgação
Objetivo: Manter o hábito diário de divulgação. ATENÇÃO: editar o sabor antes de aprovar.
Funil: Fundo — conversão imediata
Ação esperada: Visita à sorveteria no dia`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Story diário recorrente com identidade visual consistente.

COMPOSIÇÃO DA IMAGEM:
• Fundo degradê azul escuro (#003f6b) → turquesa (#00b4d8)
• Mascote Guri à direita, caixa amarela com o sabor do dia

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo principal
• Azul turquesa #00b4d8 — degradê e acentos
• Amarelo #f5c800 — caixa do sabor
• Branco #ffffff — texto

ESTILO VISUAL:
Festivo e alegre.`
        }
      ]
    },
    {
      id:'so108', date:'2026-07-08', time:'11h30', format:'Post',
      title:'Quarta-feira pede uma pausa doce',
      driveFile:'LOGO-GURI-V2.png',
      driveUrl:'https://drive.google.com/file/d/1fO9HP4JSSYFfboE_jDGbNUFoRP38xcBk/view',
      driveHint:'Foto real de cliente saboreando o produto, ou produto em destaque',
      texto:`Quarta-feira de rotina corrida pede uma pausa doce no meio do caminho. 🍦🧡

Vem dar aquela quebrada no meio da semana com a gente.

📍 Loja de fábrica, buffet com mais de 40 sabores e cardápio gourmet

#sorvetesguriturvo #turvopr #pausadoce #marcalocal`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1350px (proporção 4:5, retrato)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Construção de Marca / Relacionamento
Objetivo: Posicionar a visita à sorveteria como uma pausa no meio da semana de rotina corrida, ângulo diferente do consumo em família de fim de semana.
Funil: Topo/Meio — relacionamento
Ação esperada: Curtida, visita à loja`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Posicionar o produto como pausa de meio de semana, contexto de consumo individual em vez de familiar.

COMPOSIÇÃO DA IMAGEM:
• Foto real de cliente saboreando o produto, ou produto em destaque

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Leve, acolhedor.`
        }
      ]
    },
    {
      id:'so109', date:'2026-07-08', time:'15h', format:'Story',
      title:'Tarde de quarta pede sorvete',
      driveFile:'mascote3d_guri_pose02_apresentando_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1saHs8AqxRT27bXp_AMtPw8UjThvDvp7f/view',
      driveHint:'Ambiente da loja no período da tarde',
      texto:`Tarde de quarta pedindo aquele sorvetinho pra refrescar o dia? 🍦😄

A loja tá aberta e te esperando aqui em Turvo!`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Engajamento / Lembrete de Horário
Objetivo: Reforçar o funcionamento da loja no período da tarde, aproveitando o pico natural de calor/vontade de sobremesa.
Funil: Fundo — conversão
Ação esperada: Visita à loja`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Lembrete simples de funcionamento no período de maior desejo por sorvete.

COMPOSIÇÃO DA IMAGEM:
• Ambiente da loja no período da tarde

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo/acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Espontâneo.`
        }
      ]
    },
    {
      id:'so110', date:'2026-07-08', time:'19h', format:'Story',
      title:'Encerramento — Faltam só 2 dias pro fim de semana',
      driveFile:'mascote3d_guri_pose01_sorvete_tamanho_grande.png',
      driveUrl:'https://drive.google.com/file/d/1Tb4fIXrE5vWurOTlJPjdfg3kxK9W8Olu/view',
      driveHint:'Mascote ou logo centralizado, tom noturno',
      texto:`Faltam só 2 dias pro fim de semana chegar. 🍦😄

Bora comemorar cada dia que passa com um sorvete? Boa noite, Turvo! 🌙💛`,
      secoes:[
        {
          num:'01', cor:'#f5c800', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Duração recomendada: 7 segundos`
        },
        {
          num:'02', cor:'#00b4d8', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Encerramento / Relacionamento
Objetivo: Fechar o dia criando expectativa leve pro fim de semana se aproximando, sem repetir a mesma frase de encerramento dos dias anteriores.
Funil: Topo — relacionamento
Ação esperada: Resposta com emoji, comentário de despedida`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Fechamento de dia com expectativa crescente pro fim de semana.

COMPOSIÇÃO DA IMAGEM:
• Mascote ou logo centralizado, tom noturno

PALETA OBRIGATÓRIA:
• Azul escuro #003f6b — fundo/acento
• Azul turquesa #00b4d8 — elementos secundários
• Amarelo #f5c800 — destaque
• Branco #ffffff — texto

ESTILO VISUAL:
Leve, animado.`
        }
      ]
    },
  ],

  gympulse:[
    {
      id:'gy2', date:'2026-06-16', time:'10h', format:'Post',
      title:'Funcionalidade — Monitor ao vivo',
      driveFile:'WhatsApp Image 2026-05-18 at 12.44.24.jpeg',
      driveUrl:'https://drive.google.com/file/d/17FVjyP_F1FcTo_zSI3jtay3D0dsasOJe/view',
      driveHint:'Screenshot real do monitor GympulsePro em Academia Life — hero visual do post',
      texto:`Você sabia que 70% dos alunos de academia abandonam nos primeiros 3 meses?

A razão? Falta de motivação e evolução visível.

Com o GympulsePro você transforma cada treino em pontos, rankings e conquistas:

✅ Monitor ao vivo com BPM em tempo real
✅ Rankings por categoria
✅ Engajamento comprovado
✅ Retenção aumentada

É assim que a Planeta Corpo mantém seus alunos treinando toda semana. 🚀

Seu negócio já usa gamificação? Comenta aí! 👇
Demo gratuita — link na bio 🎯

#gympulse #gympulsepro #gamificacaofitness #gamificacaoacademia #academiagamificada #fittech #gestacadeacademia #plataformaacademia #academia #treinomotivacao #musculacao #fitness #vidasaudavel #transformacaofisica #desafiofitness #academiamoderna #saas #empreendedor #negociodigital #software #inovacao #startup #growthhacking #leadgeneration #techforgym #academiadigital #tecnologiaesportiva #retencaodealunos #engajamentofitness #rankingacademia`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem: 80px nas bordas
Estilo: SaaS premium, tech, B2B`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Funcionalidade do Produto
Objetivo: Mostrar o monitor ao vivo como diferencial competitivo do GympulsePro — a funcionalidade mais visual e impactante do sistema. Usar screenshot real para credibilidade máxima.
Funil: Meio — consideração e avaliação (gestor já consciente do problema de retenção)
Ação esperada: Clique no link da bio, salvamento ou DM solicitando demo`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
O screenshot real do monitor GympulsePro é a prova mais poderosa. O gestor precisa VER o produto funcionando em outra academia real. Todo o design serve para destacar esse screenshot.

COMPOSIÇÃO DA IMAGEM:
• Layout: screenshot do monitor ocupa 60% do espaço central do post
• Frame/moldura: borda amarela (#f5c200) ao redor do screenshot — destaca e dá acabamento premium
• Fundo: preto (#0d0d0d) com elementos de interface tech em cinza escuro (#1c1c1c)
• Elementos decorativos ao redor: ícones de badge, troféu e pontos em amarelo (#f5c200)
• Logo GympulsePro no topo centralizado
• Lista de 4 benefícios na parte inferior

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo total
• Amarelo #f5c200 — frame do screenshot, ícones e destaques
• Cinza escuro #1c1c1c — elementos de interface decorativos
• Branco #ffffff — texto dos benefícios

HIERARQUIA VISUAL:
1. Screenshot real com frame amarelo — elemento hero
2. Logo GympulsePro no topo
3. 4 benefícios com ✅ amarelo na base
4. CTA implícito na legenda`
        }
      ]
    },
    {
      id:'gy4', date:'2026-06-16', time:'18h', format:'Carrossel',
      title:'Demo — Ranking semanal ao vivo',
      driveFile:'WhatsApp Image 2026-05-18 at 12.44.24.jpeg',
      driveUrl:'https://drive.google.com/file/d/17FVjyP_F1FcTo_zSI3jtay3D0dsasOJe/view',
      driveHint:'Screenshot monitor Academia Life — use nos slides intermediários',
      texto:`Slide 1: "Você está perdendo 40% da frequência dos seus alunos sem saber por quê"
Slide 2: "Alunos sem motivação visual somem nos primeiros 3 meses"
Slide 3: "Com o GympulsePro: ranking ao vivo, pontos e conquistas a cada treino"
Slide 4: [Screenshot real do monitor do Drive — prova visual]
Slide 5: "Academia Planeta Corpo: frequência consistente após 60 dias com GympulsePro"
Slide 6: "Quer esse resultado? Demo gratuita — manda mensagem! 👇"

Salva esse carrossel e manda pro dono da sua academia! 💪
Demo gratuita — link na bio 🎯

#gympulse #gympulsepro #gamificacaofitness #gamificacaoacademia #academiagamificada #fittech #gestacadeacademia #plataformaacademia #academia #treinomotivacao #musculacao #fitness #vidasaudavel #transformacaofisica #desafiofitness #academiamoderna #saas #empreendedor #negociodigital #software #inovacao #startup #growthhacking #leadgeneration #techforgym #academiadigital #tecnologiaesportiva #retencaodealunos #engajamentofitness #rankingacademia`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Carrossel Instagram
Dimensões: 1080 × 1080px por slide (proporção 1:1)
Total de slides: 5
Resolução: 72 DPI
Seta de navegação: visível nos slides 1 a 4
Estilo: Sequência narrativa — pergunta → resposta → prova → dado → CTA`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Demonstração de Produto / Demo
Objetivo: Conduzir o gestor de academia por uma narrativa de 5 slides que vai do problema (sem ranking) à solução (GympulsePro) com prova real no meio. O último slide é o CTA mais direto da semana.
Funil: Fundo — conversão direta para demo
Ação esperada: DM com "quero a demo" após o slide 5`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Carrossel narrativo que funciona como um mini funil de vendas. Cada slide tem uma função específica. A consistência visual entre os slides é fundamental — o gestor deve sentir que está dentro de um sistema coeso.

ESTRUTURA DOS 5 SLIDES:
• Slide 1 — Gancho/Pergunta
  Layout: Texto centralizado gigante. Fundo preto. Pergunta em amarelo. Seta de "arraste" visível.
  Mensagem: "SUA ACADEMIA TEM RANKING DE ALUNOS?"

• Slide 2 — Resposta/Solução
  Layout: Texto de resposta em branco sobre preto. Logo GympulsePro em amarelo no topo.
  Mensagem: "Com o GympulsePro tem — em tempo real"

• Slide 3 — Prova Visual (screenshot real)
  Layout: Screenshot do Drive ocupando 80% do slide. Frame amarelo ao redor.
  Mensagem: Caption "Isso é o ranking ao vivo na sua academia"

• Slide 4 — Dado/Resultado
  Layout: Número ou afirmação em amarelo grande. Texto de apoio em branco.
  Mensagem: "Aluno que aparece no ranking treina mais. Simples assim."

• Slide 5 — CTA
  Layout: Fundo AMARELO (#f5c200). Texto em PRETO (#0d0d0d). Máximo contraste.
  Mensagem: "DEMO GRATUITA? MANDA MENSAGEM! 👇"

PALETA OBRIGATÓRIA (todos os slides):
• Preto #0d0d0d — fundo slides 1, 2, 3, 4
• Amarelo #f5c200 — destaques e fundo slide 5
• Cinza escuro #1c1c1c — elementos secundários
• Branco #ffffff — textos sobre fundo escuro / preto #0d0d0d no slide 5`
        }
      ]
    },
    {
      id:'gy7', date:'2026-06-17', time:'10h', format:'Post',
      title:'Educativo — Gamificação não é modinha',
      driveFile:'WhatsApp Image 2026-05-20 at 11.13.27.jpeg',
      driveUrl:'https://drive.google.com/file/d/1O2WQFEl1ELDwTuq3tiGKP-RGuAPhLrES/view',
      driveHint:'Screenshot real do GympulsePro no Planeta Corpo — prova visual',
      texto:`Gamificação em academia não é modinha — é ciência comportamental aplicada. 🧠

O cérebro humano responde a recompensas visíveis e progresso mensurável. É assim que jogos viciam — e é assim que o GympulsePro mantém alunos engajados.

✅ Pontos por cada treino
✅ Rankings competitivos saudáveis
✅ Conquistas e desafios mensais

Seu negócio já usa gamificação? Comenta aí! 👇
Demo gratuita — link na bio 🚀

#gympulse #gympulsepro #gamificacaofitness #gamificacaoacademia #academiagamificada #fittech #gestacadeacademia #plataformaacademia #academia #treinomotivacao #musculacao #fitness #vidasaudavel #transformacaofisica #desafiofitness #academiamoderna #saas #empreendedor #negociodigital #software #inovacao #startup #growthhacking #leadgeneration #techforgym #academiadigital #tecnologiaesportiva #retencaodealunos #engajamentofitness #rankingacademia`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem: 80px nas bordas
Estilo: Educativo, tech, embasamento científico`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Educativo / Quebra de Objeção
Objetivo: Combater a possível objeção de que gamificação é "coisa passageira" ou superficial, trazendo embasamento em ciência comportamental para dar credibilidade séria ao conceito.
Funil: Topo — educação e autoridade no tema
Ação esperada: Comentário, salvamento, interesse em entender melhor`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Posicionar gamificação como ciência comportamental séria, não como "gimmick" passageiro — usando analogia com mecânicas de jogos que já provaram funcionar em escala.

COMPOSIÇÃO DA IMAGEM:
• Fundo: preto profundo (#0d0d0d) com grade digital sutil
• Elemento central: ícone estilizado de cérebro com circuitos/conexões em amarelo (#f5c200)
• Elementos secundários: pequenos ícones de troféu, estrela e gráfico ascendente ao redor
• Screenshot do GympulsePro (Drive) no canto inferior como prova de aplicação real

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo principal
• Amarelo #f5c200 — ícone de cérebro e destaques
• Cinza escuro #1c1c1c — elementos secundários e grade
• Branco #ffffff — texto explicativo

ESTILO VISUAL:
Dark tech premium com tom educativo e científico — mais sério e fundamentado que posts puramente promocionais.`
        }
      ]
    },
    {
      id:'gy8', date:'2026-06-17', time:'18h', format:'Story',
      title:'Funcionalidade — Fitcoins e recompensas reais',
      driveFile:'WhatsApp Image 2026-05-18 at 12.44.24.jpeg',
      driveUrl:'https://drive.google.com/file/d/17FVjyP_F1FcTo_zSI3jtay3D0dsasOJe/view',
      driveHint:'Screenshot monitor Academia Life — prova visual da plataforma em uso',
      texto:`Cada treino vira Fitcoins. Cada Fitcoin pode ser trocado por prêmios reais. 🪙

Squeeze, copo térmico, camiseta, suplementos — o aluno enxerga valor tangível no esforço que faz todos os dias.

Isso é retenção sendo construída na prática.

Quer ver isso funcionando na sua academia? 🎮
Demo gratuita — manda mensagem! 👇

#gympulse #gympulsepro #gamificacaofitness #gamificacaoacademia #academiagamificada #fittech #gestacadeacademia #plataformaacademia #academia #treinomotivacao #musculacao #fitness #vidasaudavel #transformacaofisica #desafiofitness #academiamoderna #saas #empreendedor #negociodigital #software #inovacao #startup #growthhacking #leadgeneration #techforgym #academiadigital #tecnologiaesportiva #retencaodealunos #engajamentofitness #rankingacademia`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Funcionalidade com apelo visual de recompensa`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Funcionalidade do Produto
Objetivo: Demonstrar o sistema de Fitcoins como ponte tangível entre esforço físico e recompensa real — diferencial competitivo concreto do GympulsePro.
Funil: Meio — consideração e diferenciação de concorrentes
Ação esperada: Salvamento, DM solicitando demo`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Visualizar a jornada "treino → pontos → recompensa real" de forma simples e atrativa, mostrando produtos reais que podem ser trocados (squeeze, camiseta, copo térmico).

COMPOSIÇÃO DA IMAGEM:
• Fundo: preto (#0d0d0d) com elementos tech sutis
• Elemento central: ícone de moeda estilizada (Fitcoin) com efeito de brilho em amarelo (#f5c200)
• Elementos ao redor: pequenos ícones simples de squeeze, camiseta e copo térmico
• Seta ou fluxo visual conectando "treino → moeda → produto"

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo principal
• Amarelo #f5c200 — moeda e destaques
• Cinza escuro #1c1c1c — ícones de produtos
• Branco #ffffff — texto explicativo

ESTILO VISUAL:
Dark tech premium, visual de "jornada de recompensa" clara e motivadora.`
        }
      ]
    },
    {
      id:'gy9', date:'2026-06-18', time:'10h', format:'Post',
      title:'Educativo — Gamificação não é modinha',
      driveFile:'WhatsApp Image 2026-05-20 at 11.13.27.jpeg',
      driveUrl:'https://drive.google.com/file/d/1O2WQFEl1ELDwTuq3tiGKP-RGuAPhLrES/view',
      driveHint:'Screenshot real do GympulsePro no Planeta Corpo — prova visual',
      texto:`Gamificação em academia não é modinha — é ciência comportamental aplicada. 🧠

O cérebro humano responde a recompensas visíveis e progresso mensurável. É assim que jogos viciam — e é assim que o GympulsePro mantém alunos engajados.

✅ Pontos por cada treino
✅ Rankings competitivos saudáveis
✅ Conquistas e desafios mensais

Seu negócio já usa gamificação? Comenta aí! 👇
Demo gratuita — link na bio 🚀

#gympulse #gympulsepro #gamificacaofitness #gamificacaoacademia #academiagamificada #fittech #gestacadeacademia #plataformaacademia #academia #treinomotivacao #musculacao #fitness #vidasaudavel #transformacaofisica #desafiofitness #academiamoderna #saas #empreendedor #negociodigital #software #inovacao #startup #growthhacking #leadgeneration #techforgym #academiadigital #tecnologiaesportiva #retencaodealunos #engajamentofitness #rankingacademia`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem: 80px nas bordas
Estilo: Educativo, tech, embasamento científico`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Educativo / Quebra de Objeção
Objetivo: Combater a objeção de que gamificação é "coisa passageira", trazendo embasamento em ciência comportamental.
Funil: Topo — educação e autoridade no tema
Ação esperada: Comentário, salvamento, interesse em entender melhor`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Posicionar gamificação como ciência comportamental séria, usando analogia com mecânicas de jogos que já provaram funcionar em escala.

COMPOSIÇÃO DA IMAGEM:
• Fundo: preto profundo (#0d0d0d) com grade digital sutil
• Elemento central: ícone estilizado de cérebro com circuitos em amarelo (#f5c200)
• Screenshot do GympulsePro (Drive) no canto inferior como prova de aplicação real

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo principal
• Amarelo #f5c200 — ícone de cérebro e destaques
• Cinza escuro #1c1c1c — elementos secundários
• Branco #ffffff — texto explicativo

ESTILO VISUAL:
Dark tech premium com tom educativo e científico.`
        }
      ]
    },
    {
      id:'gy10', date:'2026-06-18', time:'18h', format:'Story',
      title:'Funcionalidade — Fitcoins e recompensas reais',
      driveFile:'WhatsApp Image 2026-05-18 at 12.44.24.jpeg',
      driveUrl:'https://drive.google.com/file/d/17FVjyP_F1FcTo_zSI3jtay3D0dsasOJe/view',
      driveHint:'Screenshot monitor Academia Life — prova visual da plataforma em uso',
      texto:`Cada treino vira Fitcoins. Cada Fitcoin pode ser trocado por prêmios reais. 🪙

Squeeze, copo térmico, camiseta, suplementos — o aluno enxerga valor tangível no esforço que faz todos os dias.

Isso é retenção sendo construída na prática.

Quer ver isso funcionando na sua academia? 🎮
Demo gratuita — manda mensagem! 👇

#gympulse #gympulsepro #gamificacaofitness #gamificacaoacademia #academiagamificada #fittech #gestacadeacademia #plataformaacademia #academia #treinomotivacao #musculacao #fitness #vidasaudavel #transformacaofisica #desafiofitness #academiamoderna #saas #empreendedor #negociodigital #software #inovacao #startup #growthhacking #leadgeneration #techforgym #academiadigital #tecnologiaesportiva #retencaodealunos #engajamentofitness #rankingacademia`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Funcionalidade com apelo visual de recompensa`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Funcionalidade do Produto
Objetivo: Demonstrar Fitcoins como ponte tangível entre esforço físico e recompensa real.
Funil: Meio — consideração e diferenciação de concorrentes
Ação esperada: Salvamento, DM solicitando demo`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Visualizar a jornada "treino → pontos → recompensa real" mostrando produtos reais que podem ser trocados.

COMPOSIÇÃO DA IMAGEM:
• Fundo: preto (#0d0d0d) com elementos tech sutis
• Elemento central: ícone de moeda estilizada (Fitcoin) com brilho amarelo (#f5c200)
• Elementos ao redor: pequenos ícones de squeeze, camiseta e copo térmico

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo principal
• Amarelo #f5c200 — moeda e destaques
• Cinza escuro #1c1c1c — ícones de produtos
• Branco #ffffff — texto explicativo

ESTILO VISUAL:
Dark tech premium, visual de "jornada de recompensa" clara.`
        }
      ]
    },
    {
      id:'gy11', date:'2026-06-19', time:'10h', format:'Post',
      title:'Case Study — Academia Planeta Corpo',
      driveFile:'WhatsApp Image 2026-05-20 at 11.13.27.jpeg',
      driveUrl:'https://drive.google.com/file/d/1O2WQFEl1ELDwTuq3tiGKP-RGuAPhLrES/view',
      driveHint:'Screenshot real do GympulsePro no Planeta Corpo — prova visual',
      texto:`Academia Planeta Corpo: 215 alunos cadastrados, mais de 400 aulas realizadas com o GympulsePro. 📈

Não é teoria. É gamificação funcionando todos os dias numa academia real, com alunos reais batendo metas reais.

✅ Frequência consistente
✅ Comunidade engajada
✅ Alunos competindo por rankings

Você quer esse resultado na sua academia? 🎯

Demo gratuita — manda mensagem! 👇

#gympulse #gympulsepro #gamificacaofitness #gamificacaoacademia #academiagamificada #fittech #gestacadeacademia #plataformaacademia #academia #treinomotivacao #musculacao #fitness #vidasaudavel #transformacaofisica #desafiofitness #academiamoderna #saas #empreendedor #negociodigital #software #inovacao #startup #growthhacking #leadgeneration #techforgym #academiadigital #tecnologiaesportiva #retencaodealunos #engajamentofitness #rankingacademia`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem: 80px nas bordas
Estilo: Case study com dados reais`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Case Study / Prova Social B2B
Objetivo: Usar números reais e verificáveis da Academia Planeta Corpo como prova irrefutável de funcionamento.
Funil: Meio/Fundo — validação e conversão direta
Ação esperada: DM solicitando demo gratuita`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Apresentar números reais de uma academia cliente como prova irrefutável — números são mais convincentes que adjetivos.

COMPOSIÇÃO DA IMAGEM:
• Fundo: preto (#0d0d0d) com textura tech sutil
• Elemento central: números "215" e "400+" em destaque amarelo (#f5c200)
• Screenshot do GympulsePro (Drive) abaixo dos números — prova visual

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo total
• Amarelo #f5c200 — números em destaque e CTA
• Cinza escuro #1c1c1c — elementos de apoio
• Branco #ffffff — texto explicativo

ESTILO VISUAL:
Dashboard de resultados, profissional e direto.`
        }
      ]
    },
    {
      id:'gy12', date:'2026-06-19', time:'18h', format:'Carrossel',
      title:'Demo — Como funciona o GympulsePro',
      driveFile:'WhatsApp Image 2026-05-18 at 12.44.24.jpeg',
      driveUrl:'https://drive.google.com/file/d/17FVjyP_F1FcTo_zSI3jtay3D0dsasOJe/view',
      driveHint:'Screenshot monitor Academia Life — slides intermediários',
      texto:`Slide 1: "Como funciona o GympulsePro?"
Slide 2: "1. Aluno treina com monitor de frequência cardíaca"
Slide 3: "2. Cada minuto de esforço vira pontos automaticamente"
Slide 4: [Screenshot real do ranking ao vivo do Drive]
Slide 5: "3. Pontos se tornam Fitcoins, trocáveis por prêmios reais"
Slide 6: "Simples pro aluno. Poderoso pra retenção. Demo gratuita — manda mensagem! 👇"

#gympulse #gympulsepro #gamificacaofitness #gamificacaoacademia #academiagamificada #fittech #gestacadeacademia #plataformaacademia #academia #treinomotivacao #musculacao #fitness #vidasaudavel #transformacaofisica #desafiofitness #academiamoderna #saas #empreendedor #negociodigital #software #inovacao #startup #growthhacking #leadgeneration #techforgym #academiadigital #tecnologiaesportiva #retencaodealunos #engajamentofitness #rankingacademia`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Carrossel Instagram
Dimensões: 1080 × 1080px por slide (proporção 1:1)
Total de slides: 6
Resolução: 72 DPI
Estilo: Sequência explicativa passo a passo`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Demonstração de Produto / Como Funciona
Objetivo: Explicar o funcionamento da plataforma de forma simples e visual, removendo objeção de complexidade técnica para gestores não-tech.
Funil: Meio — educação detalhada do produto
Ação esperada: DM solicitando demo após entender o processo completo`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Carrossel explicativo em 3 passos simples — treino, pontos, recompensa — usando linguagem acessível para gestores não-técnicos.

ESTRUTURA DOS 6 SLIDES:
• Slide 1 — Pergunta de abertura: "Como funciona o GympulsePro?"
• Slide 2 — Passo 1: aluno treina com monitor
• Slide 3 — Passo 2: pontos automáticos
• Slide 4 — Prova visual: screenshot real do ranking
• Slide 5 — Passo 3: Fitcoins e recompensas
• Slide 6 — CTA: "Simples pro aluno, poderoso pra retenção"

PALETA OBRIGATÓRIA (todos os slides):
• Preto #0d0d0d — fundo base
• Amarelo #f5c200 — números de passos e destaques
• Cinza escuro #1c1c1c — elementos secundários
• Branco #ffffff — textos explicativos

ESTILO VISUAL:
Consistência visual total entre slides, numeração clara dos passos.`
        }
      ]
    },
    {
      id:'gy13', date:'2026-06-20', time:'10h', format:'Post',
      title:'Tendência — Fim de semana é hora de planejar',
      driveFile:'WhatsApp Image 2026-05-20 at 11.13.27.jpeg',
      driveUrl:'https://drive.google.com/file/d/1O2WQFEl1ELDwTuq3tiGKP-RGuAPhLrES/view',
      driveHint:'Screenshot real do GympulsePro no Planeta Corpo — prova visual',
      texto:`Sábado é um ótimo dia pra planejar melhorias na sua academia pra próxima semana. 📋

Enquanto o movimento é mais tranquilo, é hora de pensar: seus alunos estão realmente engajados ou só "aparecendo"?

A diferença entre retenção e abandono geralmente está na experiência que você oferece além do equipamento.

Vamos conversar sobre isso? Demo gratuita — link na bio 🚀

#gympulse #gympulsepro #gamificacaofitness #gamificacaoacademia #academiagamificada #fittech #gestacadeacademia #plataformaacademia #academia #treinomotivacao #musculacao #fitness #vidasaudavel #transformacaofisica #desafiofitness #academiamoderna #saas #empreendedor #negociodigital #software #inovacao #startup #growthhacking #leadgeneration #techforgym #academiadigital #tecnologiaesportiva #retencaodealunos #engajamentofitness #rankingacademia`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem: 80px nas bordas
Estilo: Reflexivo, tom de planejamento de fim de semana`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Reflexão / Convite à Ação
Objetivo: Aproveitar o momento de menor movimento de sábado (típico do público B2B) para gerar reflexão estratégica sobre retenção, posicionando-se como parceiro de melhoria contínua.
Funil: Topo/Meio — reflexão estratégica e geração de interesse em conversar
Ação esperada: Salvamento para reflexão posterior, DM com dúvidas`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Post reflexivo de sábado convidando o gestor a pensar estrategicamente sobre retenção, em vez de apenas vender o produto diretamente — tom mais consultivo, adequado ao ritmo mais lento de fim de semana B2B.

COMPOSIÇÃO DA IMAGEM:
• Fundo: preto (#0d0d0d) com elemento de calendário ou check-list estilizado
• Elemento central: ícone de lupa ou pergunta em amarelo (#f5c200), representando reflexão/análise
• Screenshot do GympulsePro (Drive) como prova de solução disponível

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo principal
• Amarelo #f5c200 — ícone central e destaques
• Cinza escuro #1c1c1c — elementos secundários
• Branco #ffffff — texto explicativo

ESTILO VISUAL:
Tom mais calmo e reflexivo que os posts de meio de semana, adequado ao ritmo de sábado.`
        }
      ]
    },
    {
      id:'gy14', date:'2026-06-20', time:'17h', format:'Story',
      title:'Curiosidade — Dado de retenção no fim de semana',
      driveFile:'WhatsApp Image 2026-05-18 at 12.44.24.jpeg',
      driveUrl:'https://drive.google.com/file/d/17FVjyP_F1FcTo_zSI3jtay3D0dsasOJe/view',
      driveHint:'Screenshot monitor Academia Life — prova visual',
      texto:`Curiosidade de sábado: academias com gamificação têm 30% mais frequência nos fins de semana. 📊

Por quê? Porque alunos engajados não veem o fim de semana como desculpa pra pausar — veem como oportunidade de subir no ranking enquanto os outros descansam. 😏

Interessante, né? Comenta aí o que achou! 👇

#gympulse #gympulsepro #gamificacaofitness #gamificacaoacademia #academiagamificada #fittech #gestacadeacademia #plataformaacademia #academia #treinomotivacao #musculacao #fitness #vidasaudavel #transformacaofisica #desafiofitness #academiamoderna #saas #empreendedor #negociodigital #software #inovacao #startup #growthhacking #leadgeneration #techforgym #academiadigital #tecnologiaesportiva #retencaodealunos #engajamentofitness #rankingacademia`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Curiosidade leve, tom de sábado mais descontraído`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Curiosidade / Dado Interessante
Objetivo: Engajar com tom mais leve e descontraído de sábado, trazendo dado curioso sobre comportamento competitivo em fins de semana gamificados.
Funil: Topo — engajamento leve e compartilhável
Ação esperada: Comentário, compartilhamento, curtida`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Dado curioso apresentado com tom leve e levemente bem-humorado, adequado ao clima mais relaxado de sábado, sobre como gamificação afeta comportamento em fins de semana.

COMPOSIÇÃO DA IMAGEM:
• Fundo: preto (#0d0d0d) com grade digital sutil
• Elemento central: número "30%" em destaque amarelo (#f5c200) com ícone de calendário de fim de semana
• Elemento secundário: pequeno ícone de troféu ou medalha sugerindo competição saudável

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo principal
• Amarelo #f5c200 — número e destaques
• Cinza escuro #1c1c1c — elementos secundários
• Branco #ffffff — texto explicativo

ESTILO VISUAL:
Tom mais leve e divertido que os posts de meio de semana, mantendo a estética dark tech.`
        }
      ]
    },
    {
      id:'gy15', date:'2026-06-22', time:'10h', format:'Post',
      title:'Resultado — Frequência maior em 60 dias',
      driveFile:'WhatsApp Image 2026-05-18 at 12.44.24.jpeg',
      driveUrl:'https://drive.google.com/file/d/17FVjyP_F1FcTo_zSI3jtay3D0dsasOJe/view',
      driveHint:'Screenshot real do monitor GympulsePro em Academia Life — prova visual de resultado',
      texto:`Academia que aplicou gamificação viu a frequência dos alunos subir mensuravelmente em 60 dias. 📈

Não é mágica — é comportamento humano respondendo a recompensa visível e progresso mensurável.

Aluno que vê seu progresso treina mais. Aluno que treina mais, fica mais tempo.

Quer ver isso na sua academia? Demo gratuita — link na bio 🚀

#gympulse #gympulsepro #gamificacaofitness #gamificacaoacademia #academiagamificada #fittech #gestacadeacademia #plataformaacademia #academia #treinomotivacao #musculacao #fitness #vidasaudavel #transformacaofisica #desafiofitness #academiamoderna #saas #empreendedor #negociodigital #software #inovacao #startup #growthhacking #leadgeneration #techforgym #academiadigital #tecnologiaesportiva #retencaodealunos #engajamentofitness #rankingacademia`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem: 80px nas bordas
Estilo: SaaS premium, tech, orientado a dados`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Resultado / Case de Sucesso
Objetivo: Abrir a semana com prova concreta de resultado mensurável, usando dado de aumento de frequência para gerar credibilidade e interesse imediato do gestor.
Funil: Meio/Fundo — prova de ROI e geração de interesse qualificado
Ação esperada: Clique no link da bio, DM solicitando demo`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Abrir a semana com dado concreto de resultado — frequência mensurável em 60 dias — para captar atenção do gestor de academia com prova, não promessa vaga.

COMPOSIÇÃO DA IMAGEM:
• Layout: gráfico estilizado de crescimento ascendente ocupando 50% do espaço
• Screenshot real do monitor GympulsePro como prova visual complementar, com frame amarelo
• Fundo preto (#0d0d0d) com elementos de interface tech em cinza escuro

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo total
• Amarelo #f5c200 — gráfico, frame e destaques
• Cinza escuro #1c1c1c — elementos de interface decorativos
• Branco #ffffff — texto explicativo

HIERARQUIA VISUAL:
1. Gráfico de crescimento — elemento hero
2. Screenshot real com frame amarelo — prova de produto
3. Frase de resultado — destaque médio
4. CTA implícito na legenda`
        }
      ]
    },
    {
      id:'gy16', date:'2026-06-22', time:'18h', format:'Story',
      title:'Funcionalidade — Desafios mensais personalizados',
      driveFile:'WhatsApp Image 2026-05-20 at 11.13.27.jpeg',
      driveUrl:'https://drive.google.com/file/d/1O2WQFEl1ELDwTuq3tiGKP-RGuAPhLrES/view',
      driveHint:'Screenshot real do GympulsePro no Planeta Corpo — prova visual',
      texto:`E se cada mês trouxesse um desafio novo pros seus alunos? 🏆

Com o GympulsePro você cria desafios mensais personalizados — corrida de pontos, meta de frequência, ranking por categoria.

Cada desafio é uma nova razão pro aluno voltar.

Quer ver isso funcionando na sua academia? 🎮
Demo gratuita — manda mensagem! 👇

#gympulse #gympulsepro #gamificacaofitness #gamificacaoacademia #academiagamificada #fittech #gestacadeacademia #plataformaacademia #academia #treinomotivacao #musculacao #fitness #vidasaudavel #transformacaofisica #desafiofitness #academiamoderna #saas #empreendedor #negociodigital #software #inovacao #startup #growthhacking #leadgeneration #techforgym #academiadigital #tecnologiaesportiva #retencaodealunos #engajamentofitness #rankingacademia`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Funcionalidade com apelo de novidade mensal`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Funcionalidade do Produto
Objetivo: Demonstrar a flexibilidade do sistema de desafios mensais como ferramenta de retenção contínua, mostrando que o produto se adapta à estratégia de cada academia.
Funil: Meio — consideração e diferenciação por flexibilidade
Ação esperada: Salvamento, DM solicitando demo`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Visualizar a flexibilidade dos desafios mensais personalizáveis, mostrando que a plataforma se adapta à estratégia de retenção de cada academia, não é um sistema rígido.

COMPOSIÇÃO DA IMAGEM:
• Fundo: preto (#0d0d0d) com elementos tech sutis
• Elemento central: calendário estilizado com ícone de troféu em cada "mês", em amarelo (#f5c200)
• Screenshot do GympulsePro (Drive) no canto inferior como prova de aplicação real

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo principal
• Amarelo #f5c200 — calendário e troféus
• Cinza escuro #1c1c1c — elementos secundários
• Branco #ffffff — texto explicativo

ESTILO VISUAL:
Dark tech premium, visual de "novidade recorrente" que evita estagnação na motivação dos alunos.`
        }
      ]
    },
    {
      id:'gy17', date:'2026-06-23', time:'10h', format:'Post',
      title:'Comparativo — Academia com e sem gamificação',
      driveFile:'WhatsApp Image 2026-05-18 at 12.44.24.jpeg',
      driveUrl:'https://drive.google.com/file/d/17FVjyP_F1FcTo_zSI3jtay3D0dsasOJe/view',
      driveHint:'Screenshot real do monitor GympulsePro em Academia Life — prova visual',
      texto:`Academia SEM gamificação: aluno treina, vai embora, some em 3 meses.

Academia COM GympulsePro: aluno treina, vê pontos subindo, compara no ranking, quer voltar amanhã. 🏆

A diferença não está no equipamento — está na experiência que você oferece além do treino.

Qual academia você quer ser? Demo gratuita — link na bio 🚀

#gympulse #gympulsepro #gamificacaofitness #gamificacaoacademia #academiagamificada #fittech #gestacadeacademia #plataformaacademia #academia #treinomotivacao #musculacao #fitness #vidasaudavel #transformacaofisica #desafiofitness #academiamoderna #saas #empreendedor #negociodigital #software #inovacao #startup #growthhacking #leadgeneration #techforgym #academiadigital #tecnologiaesportiva #retencaodealunos #engajamentofitness #rankingacademia`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem: 80px nas bordas
Estilo: Comparativo, contraste visual direto`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Comparativo / Quebra de Objeção
Objetivo: Ilustrar de forma direta o contraste entre academia sem gamificação (abandono) e com GympulsePro (engajamento), tornando o valor do produto imediatamente óbvio.
Funil: Meio — consideração através de contraste claro
Ação esperada: Salvamento, clique no link da bio, DM solicitando demo`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Layout dividido em dois lados (antes/depois ou sem/com), contrastando visualmente o cenário de abandono contra o cenário de engajamento contínuo proporcionado pelo GympulsePro.

COMPOSIÇÃO DA IMAGEM:
• Layout: post dividido verticalmente em duas metades
• Lado esquerdo ("SEM"): tons de cinza apagado, ícone de seta descendente, aluno saindo
• Lado direito ("COM GympulsePro"): preto vibrante com amarelo (#f5c200), screenshot real, seta ascendente
• Linha divisória central sutil

PALETA OBRIGATÓRIA:
• Cinza apagado #1c1c1c — lado "sem gamificação"
• Preto #0d0d0d — fundo lado "com GympulsePro"
• Amarelo #f5c200 — destaques do lado direito
• Branco #ffffff — textos de ambos os lados

ESTILO VISUAL:
Contraste visual imediato e didático — a diferença deve ser óbvia em menos de 2 segundos de visualização.`
        }
      ]
    },
    {
      id:'gy18', date:'2026-06-23', time:'18h', format:'Carrossel',
      title:'Como Funciona — Onboarding em 3 passos',
      driveFile:'WhatsApp Image 2026-05-20 at 11.13.27.jpeg',
      driveUrl:'https://drive.google.com/file/d/1O2WQFEl1ELDwTuq3tiGKP-RGuAPhLrES/view',
      driveHint:'Screenshot real do GympulsePro no Planeta Corpo — use no slide de prova',
      texto:`Slide 1: "Implementar gamificação na sua academia parece complicado?"
Slide 2: "Com o GympulsePro são só 3 passos simples"
Slide 3: "Passo 1: Conectamos o sistema aos equipamentos e cadastro de alunos"
Slide 4: "Passo 2: Alunos começam a ganhar pontos automaticamente a cada treino"
Slide 5: [Screenshot real do Drive — prova de que já está funcionando em outra academia]
Slide 6: "Passo 3: Você acompanha engajamento e retenção em tempo real. Demo gratuita — manda mensagem! 👇"

Salva esse carrossel e manda pro dono da sua academia! 💪
Demo gratuita — link na bio 🎯

#gympulse #gympulsepro #gamificacaofitness #gamificacaoacademia #academiagamificada #fittech #gestacadeacademia #plataformaacademia #academia #treinomotivacao #musculacao #fitness #vidasaudavel #transformacaofisica #desafiofitness #academiamoderna #saas #empreendedor #negociodigital #software #inovacao #startup #growthhacking #leadgeneration #techforgym #academiadigital #tecnologiaesportiva #retencaodealunos #engajamentofitness #rankingacademia`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Carrossel Instagram
Dimensões: 1080 × 1080px por slide (proporção 1:1)
Total de slides: 6
Resolução: 72 DPI
Estilo: Sequência explicativa passo a passo de implementação`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Demonstração de Produto / Onboarding
Objetivo: Remover a objeção de complexidade técnica na implementação, mostrando que o processo de começar a usar o GympulsePro é simples e rápido em apenas 3 passos.
Funil: Meio/Fundo — remoção de objeção de implementação e geração de demo
Ação esperada: DM com "quero a demo" após entender que o processo é simples`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Carrossel que desmistifica o processo de implementação, mostrando que adotar gamificação não exige conhecimento técnico do gestor — o GympulsePro cuida da parte complexa.

ESTRUTURA DOS 6 SLIDES:
• Slide 1 — Gancho/Objeção: "Parece complicado?"
• Slide 2 — Promessa de simplicidade: "São só 3 passos"
• Slide 3 — Passo 1: conexão do sistema
• Slide 4 — Passo 2: pontos automáticos
• Slide 5 — Prova visual: screenshot real funcionando em outra academia
• Slide 6 — Passo 3 + CTA: acompanhamento em tempo real e chamada para demo

PALETA OBRIGATÓRIA (todos os slides):
• Preto #0d0d0d — fundo base
• Amarelo #f5c200 — números de passos e destaques
• Cinza escuro #1c1c1c — elementos secundários
• Branco #ffffff — textos explicativos

ESTILO VISUAL:
Consistência visual total entre slides, numeração clara dos passos, tom tranquilizador sobre a simplicidade do processo.`
        }
      ]
    },
    {
      id:'gy19', date:'2026-06-24', time:'10h', format:'Post',
      title:'Depoimento — O que gestores dizem do GympulsePro',
      driveFile:'WhatsApp Image 2026-05-20 at 11.13.27.jpeg',
      driveUrl:'https://drive.google.com/file/d/1O2WQFEl1ELDwTuq3tiGKP-RGuAPhLrES/view',
      driveHint:'Screenshot real do GympulsePro no Planeta Corpo — prova visual de uso real',
      texto:`💬 "Depois que implementamos o ranking, nossos alunos começaram a se cobrar entre eles mesmos pra treinar. Isso eu não esperava." — Gestor de academia parceira

Esse é o tipo de efeito colateral positivo que a gamificação bem feita gera: o próprio aluno passa a ser o motor da própria constância.

Quer ouvir mais relatos como esse? Demo gratuita — link na bio 🚀

#gympulse #gympulsepro #gamificacaofitness #gamificacaoacademia #academiagamificada #fittech #gestacadeacademia #plataformaacademia #academia #treinomotivacao #musculacao #fitness #vidasaudavel #transformacaofisica #desafiofitness #academiamoderna #saas #empreendedor #negociodigital #software #inovacao #startup #growthhacking #leadgeneration #techforgym #academiadigital #tecnologiaesportiva #retencaodealunos #engajamentofitness #rankingacademia`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem: 80px nas bordas
Estilo: Depoimento, prova social B2B`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Prova Social / Depoimento
Objetivo: Usar a voz de um gestor parceiro real para validar o produto de forma mais convincente que qualquer argumento de venda direto, gerando confiança em gestores ainda indecisos.
Funil: Meio/Fundo — validação social e redução de risco percebido na decisão de compra
Ação esperada: Clique no link da bio, DM solicitando demo após validação social`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
O depoimento de um gestor real sobre um efeito inesperado e positivo (alunos se cobrando entre si) é a prova social mais convincente para outros gestores B2B avaliando a decisão de compra.

COMPOSIÇÃO DA IMAGEM:
• Fundo: preto (#0d0d0d) com moldura amarela (#f5c200) sutil
• Elemento principal: balão de citação estilizado ocupando 50% superior, com aspas em destaque
• Screenshot real do GympulsePro centralizado abaixo do balão como prova complementar
• Tipografia da citação: itálica, branca, tamanho grande e legível

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo principal
• Amarelo #f5c200 — moldura do balão e destaques
• Cinza escuro #1c1c1c — elementos secundários
• Branco #ffffff — texto da citação

ESTILO VISUAL:
Profissional e autêntico, tom de validação real de gestor para gestor — sem parecer depoimento forçado ou genérico.`
        }
      ]
    },
    {
      id:'gy20', date:'2026-06-24', time:'18h', format:'Story',
      title:'Curiosidade — Geração Z e gamificação',
      driveFile:'WhatsApp Image 2026-05-18 at 12.44.24.jpeg',
      driveUrl:'https://drive.google.com/file/d/17FVjyP_F1FcTo_zSI3jtay3D0dsasOJe/view',
      driveHint:'Screenshot monitor Academia Life — prova visual',
      texto:`Curiosidade de quarta: alunos da Geração Z respondem 2x mais a rankings e pontos do que a planos de treino tradicionais. 📊

Eles cresceram em ambientes gamificados — jogos, apps, redes sociais com métricas visíveis. Pra essa geração, progresso que não é visível parece que não existe.

Sua academia já fala a língua deles? 🎮
Demo gratuita — manda mensagem! 👇

#gympulse #gympulsepro #gamificacaofitness #gamificacaoacademia #academiagamificada #fittech #gestacadeacademia #plataformaacademia #academia #treinomotivacao #musculacao #fitness #vidasaudavel #transformacaofisica #desafiofitness #academiamoderna #saas #empreendedor #negociodigital #software #inovacao #startup #growthhacking #leadgeneration #techforgym #academiadigital #tecnologiaesportiva #retencaodealunos #engajamentofitness #rankingacademia`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Curiosidade leve, dado geracional`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Curiosidade / Dado Interessante
Objetivo: Trazer um dado geracional relevante para gestores que atendem público jovem, posicionando a gamificação como adequação necessária ao comportamento da Geração Z.
Funil: Topo — educação e geração de relevância estratégica
Ação esperada: Comentário, salvamento, interesse em entender melhor a aplicação`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Posicionar a gamificação como adequação geracional necessária, não apenas como ferramenta de motivação genérica — trazendo o público jovem como contexto estratégico relevante para o gestor.

COMPOSIÇÃO DA IMAGEM:
• Fundo: preto profundo (#0d0d0d) com grade digital sutil
• Elemento central: número "2x" em destaque amarelo (#f5c200), grande e impactante
• Elementos secundários: pequenos ícones de smartphone, controle de jogo e troféu ao redor
• Screenshot do GympulsePro (Drive) no canto inferior como prova de aplicação real

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo principal
• Amarelo #f5c200 — número "2x" e destaques
• Cinza escuro #1c1c1c — elementos secundários e grade
• Branco #ffffff — texto explicativo

ESTILO VISUAL:
Dark tech premium com tom de dado geracional relevante — mais estratégico que promocional direto.`
        }
      ]
    },
    {
      id:'gy21', date:'2026-06-25', time:'10h', format:'Post',
      title:'Mito x Verdade — Gamificação não é só pra academia grande',
      driveFile:'WhatsApp Image 2026-05-18 at 12.44.24.jpeg',
      driveUrl:'https://drive.google.com/file/d/17FVjyP_F1FcTo_zSI3jtay3D0dsasOJe/view',
      driveHint:'Screenshot real do GympulsePro — prova visual de uso real em academia de porte médio',
      texto:`MITO: gamificação só funciona em academia gigante, com milhares de alunos.

VERDADE: o efeito é o mesmo (ou maior) em academias de bairro — porque o vínculo entre aluno e gestor já é mais próximo, e o ranking só reforça isso.

O tamanho da academia não é o que define o resultado. É a constância de quem usa a ferramenta.

Quer ver como funciona na prática? Demo gratuita — link na bio 🚀

#gympulse #gympulsepro #gamificacaofitness #gamificacaoacademia #academiagamificada #fittech #gestacadeacademia #plataformaacademia #academia #treinomotivacao #musculacao #fitness #vidasaudavel #transformacaofisica #desafiofitness #academiamoderna #saas #empreendedor #negociodigital #software #inovacao #startup #growthhacking #leadgeneration #techforgym #academiadigital #tecnologiaesportiva #retencaodealunos #engajamentofitness #rankingacademia`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem: 80px nas bordas
Estilo: Educativo, formato mito x verdade`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Conteúdo Educativo / Quebra de Objeção
Objetivo: Desmontar a objeção comum de que gamificação é exclusiva de redes grandes, ampliando o público potencial de gestores de academias menores.
Funil: Topo/Meio — educação e quebra de objeção de compra
Ação esperada: Salvar o post, clicar no link da bio, DM solicitando demo`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Formato visual de "mito x verdade" para desconstruir a crença de que gamificação exige escala — usando um exemplo real de academia de bairro.

COMPOSIÇÃO DA IMAGEM:
• Fundo: preto (#0d0d0d) dividido em duas metades visuais
• Metade superior: "MITO" com ícone de X, tipografia tachada ou apagada
• Metade inferior: "VERDADE" com ícone de check, tipografia em destaque amarelo
• Screenshot real do app como prova complementar abaixo

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo principal
• Amarelo #f5c200 — destaques e divisores
• Cinza escuro #1c1c1c — elementos secundários
• Branco #ffffff — texto

ESTILO VISUAL:
Direto, educativo, fácil leitura — contraste visual forte entre mito e verdade para reter atenção.`
        }
      ]
    },
    {
      id:'gy22', date:'2026-06-25', time:'18h', format:'Carrossel',
      title:'Como Funciona — O ranking que aumenta a frequência dos alunos',
      driveFile:'WhatsApp Image 2026-05-20 at 11.13.27.jpeg',
      driveUrl:'https://drive.google.com/file/d/1O2WQFEl1ELDwTuq3tiGKP-RGuAPhLrES/view',
      driveHint:'Screenshot real do GympulsePro — tela de ranking como prova visual',
      texto:`Sabia que academias que usam ranking de frequência veem alunos comparecendo mais vezes por semana? 📊

Não é mágica — é psicologia simples: quando o esforço é visível e comparável, as pessoas se engajam mais.

Veja como o GympulsePro transforma frequência em jogo (sem virar bagunça):

➡️ Arraste para o lado e veja como funciona

Demo gratuita — link na bio 🚀

#gympulse #gympulsepro #gamificacaofitness #gamificacaoacademia #academiagamificada #fittech #gestacadeacademia #plataformaacademia #academia #treinomotivacao #musculacao #fitness #vidasaudavel #transformacaofisica #desafiofitness #academiamoderna #saas #empreendedor #negociodigital #software #inovacao #startup #growthhacking #leadgeneration #techforgym #academiadigital #tecnologiaesportiva #retencaodealunos #engajamentofitness #rankingacademia`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Carrossel Instagram (4 a 5 slides)
Dimensões: 1080 × 1080px por slide (proporção 1:1)
Resolução: 72 DPI
Margem: 80px nas bordas
Estilo: Educativo passo a passo`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Como Funciona / Educativo
Objetivo: Demonstrar de forma simples o mecanismo de ranking e seu impacto real na frequência dos alunos, gerando interesse qualificado em gestores.
Funil: Meio — educação sobre o produto e geração de interesse
Ação esperada: Deslizar o carrossel completo, clicar no link da bio, DM solicitando demo`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Carrossel educativo explicando o mecanismo do ranking de frequência em etapas simples, usando uma screenshot real como prova final.

COMPOSIÇÃO DA IMAGEM (por slide):
• Slide 1: capa com título "Como o ranking aumenta a frequência" e ícone de troféu/pódio
• Slides 2-3: explicação simples do mecanismo (pontos por check-in, posição no ranking, recompensas)
• Slide 4: screenshot real do app mostrando o ranking em funcionamento
• Slide final: CTA para demo gratuita

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo principal
• Amarelo #f5c200 — destaques e ícones
• Cinza escuro #1c1c1c — elementos secundários
• Branco #ffffff — texto

ESTILO VISUAL:
Profissional e didático, com progressão visual clara entre os slides — cada slide deve funcionar isoladamente também.`
        }
      ]
    },
    {
      id:'gy23', date:'2026-06-26', time:'10h', format:'Post',
      title:'Comece a Implementar — Antes da próxima segunda',
      driveFile:'WhatsApp Image 2026-05-18 at 12.44.24.jpeg',
      driveUrl:'https://drive.google.com/file/d/17FVjyP_F1FcTo_zSI3jtay3D0dsasOJe/view',
      driveHint:'Screenshot real do GympulsePro — tela inicial como prova visual',
      texto:`Sexta-feira é o melhor dia pra decidir o que muda na sua academia a partir de segunda. 🚀

Configurar a gamificação leva minutos. O impacto na frequência dos seus alunos, semanas.

Comece o fim de semana já com a decisão tomada — e chegue na segunda com a plataforma rodando.

Demo gratuita — link na bio, sem compromisso 💻

#gympulse #gympulsepro #gamificacaofitness #gamificacaoacademia #academiagamificada #fittech #gestacadeacademia #plataformaacademia #academia #treinomotivacao #musculacao #fitness #vidasaudavel #transformacaofisica #desafiofitness #academiamoderna #saas #empreendedor #negociodigital #software #inovacao #startup #growthhacking #leadgeneration #techforgym #academiadigital #tecnologiaesportiva #retencaodealunos #engajamentofitness #rankingacademia`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem: 80px nas bordas
Estilo: Conversão B2B com gatilho de fechamento de semana`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Conversão / CTA de Fim de Semana
Objetivo: Aproveitar o fechamento da semana para gerar agendamento de demo, posicionando a segunda-feira como ponto de partida ideal.
Funil: Fundo — conversão direta
Ação esperada: Clique no link da bio, agendamento de demo gratuita`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Usar o fechamento da semana como gatilho de decisão para gestores de academia, associando a simplicidade de implementação à facilidade de começar logo na segunda-feira.

COMPOSIÇÃO DA IMAGEM:
• Fundo: preto (#0d0d0d) com elementos amarelos de destaque
• Elemento principal: screenshot real da tela inicial do app, centralizado
• Tipografia de impacto reforçando "antes da próxima segunda"
• CTA em faixa inferior com contraste forte

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo principal
• Amarelo #f5c200 — destaques e CTA
• Cinza escuro #1c1c1c — elementos secundários
• Branco #ffffff — texto

ESTILO VISUAL:
Profissional, direto, com leve senso de oportunidade — tom B2B sem parecer promoção agressiva.`
        }
      ]
    },
    {
      id:'gy24', date:'2026-06-26', time:'18h', format:'Story',
      title:'Curiosidade — O dado que todo gestor de academia devia saber',
      driveFile:'WhatsApp Image 2026-05-20 at 11.13.27.jpeg',
      driveUrl:'https://drive.google.com/file/d/1O2WQFEl1ELDwTuq3tiGKP-RGuAPhLrES/view',
      driveHint:'Screenshot real do GympulsePro — gráfico de retenção como prova visual',
      texto:`Você sabia que a maior parte da evasão em academias acontece nas primeiras 4 a 6 semanas? 📉

É exatamente nessa fase que a gamificação tem mais impacto — porque ainda não existe o hábito formado, e cada check-in extra conta.

Quer entender como aplicar isso na sua academia? Demo gratuita — link na bio 🚀

#gympulse #gympulsepro #gamificacaofitness #gamificacaoacademia #academiagamificada #fittech #gestacadeacademia #plataformaacademia #academia #treinomotivacao #musculacao #fitness #vidasaudavel #transformacaofisica #desafiofitness #academiamoderna #saas #empreendedor #negociodigital #software #inovacao #startup #growthhacking #leadgeneration #techforgym #academiadigital #tecnologiaesportiva #retencaodealunos #engajamentofitness #rankingacademia`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Educativo, dado de impacto`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Curiosidade / Dado de Impacto
Objetivo: Apresentar um dado relevante sobre evasão para gerar reflexão em gestores e posicionar a gamificação como solução no período crítico.
Funil: Topo/Meio — educação e geração de interesse qualificado
Ação esperada: Compartilhar o story, clicar no link da bio, DM solicitando mais informações`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Story de dado de impacto sobre evasão em academias, conectando o problema ao momento certo de aplicar gamificação.

COMPOSIÇÃO DA IMAGEM:
• Fundo: preto (#0d0d0d) com elemento gráfico simples (curva de queda estilizada)
• Elemento principal: número/estatística em destaque, tipografia grande em amarelo
• Texto de apoio explicando o contexto de forma simples
• Screenshot real do gráfico de retenção como prova complementar

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo principal
• Amarelo #f5c200 — destaque do dado
• Cinza escuro #1c1c1c — elementos secundários
• Branco #ffffff — texto de apoio

ESTILO VISUAL:
Direto, baseado em dado, profissional — tom de insight de gestão, não de venda explícita.`
        }
      ]
    },
    {
      id:'gy25', date:'2026-06-27', time:'10h', format:'Post',
      title:'Conversão de fim de semana — Comece a semana com a academia gamificada',
      driveFile:'WhatsApp Image 2026-05-20 at 11.13.27.jpeg',
      driveUrl:'https://drive.google.com/file/d/1O2WQFEl1ELDwTuq3tiGKP-RGuAPhLrES/view',
      driveHint:'Screenshot real do GympulsePro — painel de ranking/engajamento',
      texto:`Fim de semana é quando o gestor para pra pensar no próximo passo. 🚀

E se a próxima semana da sua academia começasse com mais engajamento, mais retenção e alunos competindo de forma saudável pra bater metas?

É isso que a gamificação do GympulsePro entrega: ranking, monitoramento em tempo real, fitcoins e IA integrada — tudo num preço acessível.

Agende uma demo gratuita — link na bio. 📲

#gympulsepro #gamificacaoacademia #gestaodeacademia #retencaodealunos #fittech`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas
Estilo: Profissional, conversão B2B`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Conversão de fim de semana
Objetivo: Aproveitar o momento de reflexão do gestor no fim de semana para gerar agendamento de demo, destacando os diferenciais da plataforma de forma direta.
Funil: Fundo — conversão / geração de lead qualificado
Ação esperada: Clique no link da bio, DM solicitando demonstração`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
O fim de semana como momento de decisão do gestor — apresentar o GympulsePro como o passo que transforma a próxima semana da academia.

COMPOSIÇÃO DA IMAGEM:
• Elemento principal: screenshot real do painel (ranking/engajamento) em destaque
• Fundo: preto (#0d0d0d) com elementos gráficos sutis
• Destaque para os diferenciais (ranking, tempo real, fitcoins, IA)

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo principal
• Amarelo #f5c200 — destaque e CTA
• Cinza escuro #1c1c1c — elementos secundários
• Branco #ffffff — texto de apoio

ESTILO VISUAL:
Profissional, tom de produto/tech, foco em prova visual real. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'gy26', date:'2026-06-27', time:'18h', format:'Story',
      title:'Dado de retenção — O número que muda a gestão',
      driveFile:'WhatsApp Image 2026-05-18 at 12.44.24.jpeg',
      driveUrl:'https://drive.google.com/file/d/17FVjyP_F1FcTo_zSI3jtay3D0dsasOJe/view',
      driveHint:'Screenshot real do GympulsePro — dado de retenção/engajamento',
      texto:`Academias que gamificam a experiência do aluno retêm mais. 📊

Quando o aluno vê progresso, ranking e recompensa, ele volta — e voltar é o que mantém sua academia saudável financeiramente.

Quer ver esse efeito na prática? Demo gratuita no link da bio. 🚀`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Educativo, dado de impacto`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Dado de Retenção / Insight de gestão
Objetivo: Reforçar com argumento de retenção o valor da gamificação, gerando interesse qualificado no fim de semana.
Funil: Meio — educação e geração de interesse
Ação esperada: Visualização, clique no link da bio, DM`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Conectar gamificação a retenção e saúde financeira da academia, com dado/prova visual.

COMPOSIÇÃO DA IMAGEM:
• Elemento principal: screenshot real de dado de retenção/engajamento
• Fundo: preto (#0d0d0d) com curva ascendente estilizada
• Número/estatística em destaque, tipografia grande em amarelo

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo principal
• Amarelo #f5c200 — destaque do dado
• Cinza escuro #1c1c1c — elementos secundários
• Branco #ffffff — texto de apoio

ESTILO VISUAL:
Direto, baseado em dado, profissional — tom de insight de gestão. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'gy27', date:'2026-06-29', time:'10h', format:'Post',
      title:'Planejamento de Semana — O que sua academia não está medindo',
      driveFile:'WhatsApp Image 2026-05-20 at 11.13.27.jpeg',
      driveUrl:'https://drive.google.com/file/d/1O2WQFEl1ELDwTuq3tiGKP-RGuAPhLrES/view',
      driveHint:'Screenshot real do GympulsePro — painel de frequência/risco',
      texto:`Segunda-feira é dia de planejar a semana da academia. Mas você sabe quantos alunos estão prestes a desistir agora? 🤔

A maioria dos gestores só descobre a evasão quando o aluno já cancelou. O GympulsePro mostra o risco antes disso acontecer — com dados reais de frequência e engajamento.

Quer ver como funciona na sua academia? Demo gratuita — link na bio. 🚀

#gympulsepro #gestaodeacademia #retencaodealunos #academiagamificada #softwareacademia`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas
Estilo: Profissional, conversão B2B`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Planejamento de Semana / Conversão
Objetivo: Aproveitar o momento de planejamento semanal do gestor pra introduzir a dor da evasão invisível e posicionar o GympulsePro como ferramenta preventiva, gerando interesse qualificado.
Funil: Fundo — conversão / geração de lead qualificado
Ação esperada: Clique no link da bio, DM solicitando demonstração`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Trazer à consciência um problema que o gestor normalmente só percebe tarde demais (evasão) e posicionar o GympulsePro como o radar que evita essa surpresa.

COMPOSIÇÃO DA IMAGEM:
• Elemento principal: screenshot real do painel mostrando dados de frequência/risco
• Fundo: preto (#0d0d0d) com elementos gráficos sutis
• Destaque visual para o conceito de "alerta antecipado"

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo principal
• Amarelo #f5c200 — destaque e CTA
• Cinza escuro #1c1c1c — elementos secundários
• Branco #ffffff — texto de apoio

ESTILO VISUAL:
Profissional, tom de produto/tech, foco em prova visual real. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'gy28', date:'2026-06-29', time:'18h', format:'Story',
      title:'Funcionalidade — Fitcoins: o ponto que vira recompensa real',
      driveFile:'WhatsApp Image 2026-05-18 at 12.44.24.jpeg',
      driveUrl:'https://drive.google.com/file/d/17FVjyP_F1FcTo_zSI3jtay3D0dsasOJe/view',
      driveHint:'Screenshot real do GympulsePro — tela de fitcoins/recompensas',
      texto:`Sabia que cada check-in pode virar moeda dentro da sua academia? 🪙

O sistema de fitcoins do GympulsePro transforma frequência em recompensa real — e aluno que ganha, fica.

Quer ver isso rodando na prática? Demo gratuita no link da bio. 🚀`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Educativo, funcionalidade em destaque`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Funcionalidade / Educativo
Objetivo: Explicar de forma simples o mecanismo de fitcoins e seu impacto direto na retenção, gerando interesse qualificado em gestores.
Funil: Meio — educação sobre o produto
Ação esperada: Visualização, clique no link da bio, DM com dúvidas`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Explicar o mecanismo de fitcoins (check-in vira moeda/recompensa) como gatilho simples e tangível de retenção.

COMPOSIÇÃO DA IMAGEM:
• Elemento principal: screenshot real da tela de fitcoins/recompensas
• Fundo: preto (#0d0d0d) com ícone de moeda estilizado
• Número ou ícone de destaque em amarelo

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo principal
• Amarelo #f5c200 — destaque do conceito
• Cinza escuro #1c1c1c — elementos secundários
• Branco #ffffff — texto de apoio

ESTILO VISUAL:
Direto, tom de produto, foco em prova visual real. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'gy29', date:'2026-06-30', time:'10h', format:'Post',
      title:'Funcionalidade — A IA que avisa antes do aluno desistir',
      driveFile:'WhatsApp Image 2026-05-20 at 11.13.27.jpeg',
      driveUrl:'https://drive.google.com/file/d/1O2WQFEl1ELDwTuq3tiGKP-RGuAPhLrES/view',
      driveHint:'Screenshot real do GympulsePro — painel com alerta/indicador de risco',
      texto:`E se sua academia recebesse um aviso antes de um aluno cancelar — não depois? 🤖

A IA integrada do GympulsePro identifica padrões de queda de frequência e engajamento, avisando o gestor a tempo de agir.

Fechando o mês: quantos alunos sua academia perdeu em junho sem nem perceber a tempo? Demo gratuita — link na bio. 🚀

#gympulsepro #iaparaacademia #retencaodealunos #gestaodeacademia #fittech`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas
Estilo: Profissional, conversão B2B`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Funcionalidade / IA Preditiva
Objetivo: Destacar o recurso de IA preditiva como diferencial competitivo de alto valor, conectando ao fechamento do mês pra reforçar urgência e gerar leads qualificados.
Funil: Fundo — conversão / geração de lead qualificado
Ação esperada: Clique no link da bio, DM solicitando demonstração`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Posicionar a IA preditiva como o recurso que evita a "surpresa" do cancelamento, usando o fechamento de junho como gatilho de reflexão pro gestor.

COMPOSIÇÃO DA IMAGEM:
• Elemento principal: screenshot real do painel com alerta/indicador de risco
• Fundo: preto (#0d0d0d) com elementos gráficos de dados
• Destaque para o conceito de "alerta antecipado"

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo principal
• Amarelo #f5c200 — destaque e CTA
• Cinza escuro #1c1c1c — elementos secundários
• Branco #ffffff — texto de apoio

ESTILO VISUAL:
Profissional, tom de produto/tech avançado. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'gy30', date:'2026-06-30', time:'18h', format:'Story',
      title:'Reflexão — Quantos alunos sua academia perdeu este mês sem saber?',
      driveFile:'WhatsApp Image 2026-05-18 at 12.44.24.jpeg',
      driveUrl:'https://drive.google.com/file/d/17FVjyP_F1FcTo_zSI3jtay3D0dsasOJe/view',
      driveHint:'Elemento gráfico minimalista — curva discreta em queda, sem texto sobreposto',
      texto:`Última terça de junho. Pergunta sincera pro gestor: você sabe exatamente quantos alunos pararam de ir esse mês — e por quê? 🤔

A maioria não sabe. E o que não se mede, não se resolve.

Comece julho medindo de verdade. Demo gratuita — link na bio. 🚀`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Reflexivo, dado de impacto`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Reflexão de Gestão / Geração de Interesse
Objetivo: Provocar autoavaliação honesta do gestor sobre a falta de visibilidade da evasão, conectando ao início de julho como momento de virada de comportamento.
Funil: Meio — educação e geração de interesse qualificado
Ação esperada: Visualização, clique no link da bio, DM`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Pergunta retórica feita na legenda (não na imagem) que expõe um ponto cego comum de gestão — a imagem reforça visualmente a ideia de "queda silenciosa" sem estatística inventada.

COMPOSIÇÃO DA IMAGEM:
• Elemento principal: ícone gráfico de curva discreta em queda ou silhuetas que diminuem, simbolizando evasão não percebida
• Fundo: preto (#0d0d0d) com elementos gráficos sutis de dados
• Sensação: alerta silencioso, reflexão, não alarmismo

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo principal
• Amarelo #f5c200 — destaque do elemento gráfico
• Cinza escuro #1c1c1c — elementos secundários
• Branco #ffffff — detalhes

ESTILO VISUAL:
Direto, reflexivo, tom de virada de mês. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'gy31', date:'2026-07-01', time:'10h', format:'Post',
      title:'Comece Julho com Metas Claras de Retenção',
      driveFile:'WhatsApp Image 2026-05-20 at 11.13.27.jpeg',
      driveUrl:'https://drive.google.com/file/d/1O2WQFEl1ELDwTuq3tiGKP-RGuAPhLrES/view',
      driveHint:'Screenshot real do GympulsePro — painel com indicador de retenção',
      texto:`Julho começou. Sua academia já sabe qual é a meta de retenção do mês? 📊

A maioria dos gestores define meta de matrícula, mas esquece da meta de retenção — e é aí que o faturamento vaza.

O GympulsePro te mostra esse número em tempo real. Quer ver como? Demo gratuita — link na bio. 🚀

#gympulsepro #gestaodeacademia #retencaodealunos #metasdejulho #fittech`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas
Estilo: Profissional, conversão B2B`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Planejamento de Mês / Conversão
Objetivo: Aproveitar o início de julho (momento natural de definição de metas) pra introduzir a meta de retenção como ponto cego comum, posicionando o GympulsePro como ferramenta de visibilidade.
Funil: Fundo — conversão / geração de lead qualificado
Ação esperada: Clique no link da bio, DM solicitando demonstração`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Usar a virada de mês como gatilho de planejamento, trazendo à consciência a meta de retenção (normalmente esquecida frente à meta de matrícula).

COMPOSIÇÃO DA IMAGEM:
• Elemento principal: screenshot real do painel com indicador de retenção
• Fundo: preto (#0d0d0d) com elementos gráficos sutis

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo principal
• Amarelo #f5c200 — destaque e CTA
• Cinza escuro #1c1c1c — elementos secundários
• Branco #ffffff — texto de apoio

ESTILO VISUAL:
Profissional, tom de produto/tech. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'gy32', date:'2026-07-01', time:'18h', format:'Story',
      title:'Funcionalidade — Ranking de Engajamento em Tempo Real',
      driveFile:'WhatsApp Image 2026-05-18 at 12.44.24.jpeg',
      driveUrl:'https://drive.google.com/file/d/17FVjyP_F1FcTo_zSI3jtay3D0dsasOJe/view',
      driveHint:'Screenshot real do GympulsePro — tela de ranking de engajamento',
      texto:`Sabia que dá pra ver, em tempo real, quem são os alunos mais engajados da sua academia? 📈

O ranking de engajamento do GympulsePro mostra isso pra você — e até pros próprios alunos, que adoram competir de forma saudável.

Quer ver funcionando? Demo gratuita no link da bio. 🚀`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Educativo, funcionalidade em destaque`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Funcionalidade / Educativo
Objetivo: Explicar o recurso de ranking de engajamento como ferramenta de gamificação e retenção, gerando interesse qualificado em gestores.
Funil: Meio — educação sobre o produto
Ação esperada: Clique no link da bio, DM com dúvidas`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Explicar o ranking de engajamento como mecanismo de gamificação que beneficia gestor e aluno simultaneamente.

COMPOSIÇÃO DA IMAGEM:
• Elemento principal: screenshot real da tela de ranking
• Fundo: preto (#0d0d0d) com ícone de troféu/pódio

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo principal
• Amarelo #f5c200 — destaque
• Cinza escuro #1c1c1c — elementos secundários
• Branco #ffffff — texto de apoio

ESTILO VISUAL:
Direto, tom de produto. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'gy33', date:'2026-07-02', time:'10h', format:'Post',
      title:'Mito x Verdade — Gamificação só funciona pra academia grande',
      driveFile:'WhatsApp Image 2026-05-20 at 11.13.27.jpeg',
      driveUrl:'https://drive.google.com/file/d/1O2WQFEl1ELDwTuq3tiGKP-RGuAPhLrES/view',
      driveHint:'Layout dividido mito vs verdade — usar screenshot real do painel como apoio',
      texto:`Mito: \"Gamificação só funciona em academia grande, com muito aluno.\" ❌

Verdade: o efeito é proporcionalmente mais forte em academias pequenas e médias, onde cada aluno é visível e a comunidade é mais próxima. ✅

O GympulsePro foi pensado pra academia de qualquer tamanho. Quer testar na sua? Demo gratuita — link na bio. 🚀

#gympulsepro #gamificacaoacademia #gestaodeacademia #mitoeverdade #fittech`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas
Estilo: Mito x Verdade, contraste claro`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Mito x Verdade / Educativo
Objetivo: Desconstruir a objeção comum de que gamificação só serve pra academias grandes, ampliando o público qualificado de leads (academias pequenas/médias).
Funil: Meio — educação e quebra de objeção
Ação esperada: Clique no link da bio, DM solicitando demonstração`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Formato mito x verdade pra quebrar uma objeção comum de compra, ampliando o público percebido do produto.

COMPOSIÇÃO DA IMAGEM:
• Layout dividido: mito (vermelho/X) vs verdade (verde/check)
• Fundo preto, tipografia de apoio mínima

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo principal
• Amarelo #f5c200 — destaque
• Cinza escuro #1c1c1c — elementos secundários
• Branco #ffffff — texto de apoio

ESTILO VISUAL:
Profissional, contraste claro entre mito e verdade. Sem texto na imagem além dos ícones X/check.`
        }
      ]
    },
    {
      id:'gy34', date:'2026-07-02', time:'18h', format:'Carrossel',
      title:'Carrossel — 4 sinais de que sua academia está perdendo aluno sem saber',
      driveFile:'WhatsApp Image 2026-05-18 at 12.44.24.jpeg',
      driveUrl:'https://drive.google.com/file/d/17FVjyP_F1FcTo_zSI3jtay3D0dsasOJe/view',
      driveHint:'Carrossel educativo — usar screenshots reais do painel nos slides de apoio',
      texto:`Slide 1: \"4 sinais de que sua academia está perdendo aluno sem saber\"
Slide 2: \"Sinal 1: queda de frequência que ninguém está acompanhando\"
Slide 3: \"Sinal 2: nenhum sistema de alerta antes do cancelamento\"
Slide 4: \"Sinal 3: aluno engajado e aluno desengajado recebem o mesmo tratamento\"
Slide 5: \"Sinal 4: decisões de retenção baseadas em achismo, não em dado\"
Slide 6: \"O GympulsePro resolve os 4 ao mesmo tempo. Demo gratuita — link na bio.\"

#gympulsepro #retencaodealunos #gestaodeacademia #academiagamificada #softwareacademia`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Carrossel Instagram (6 slides)
Dimensões: 1080 × 1080px por slide (proporção 1:1)
Resolução: 72 DPI
Margem: 80px nas bordas
Estilo: Lista educativa, alto valor de salvamento`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Carrossel Educativo / Conversão
Objetivo: Usar formato de lista (alto poder de salvamento) pra expor pontos cegos comuns de gestão, posicionando o GympulsePro como solução integrada pros 4 ao mesmo tempo.
Funil: Meio/Fundo — consideração e conversão
Ação esperada: Deslizar o carrossel completo, salvar, clique no link da bio, DM solicitando demonstração`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Lista numerada de pontos cegos de gestão que geram evasão silenciosa, fechando com o GympulsePro como solução unificada.

ESTRUTURA DOS SLIDES:
• Slide 1 — Capa
• Slides 2-5 — Um sinal por slide
• Slide 6 — Virada com CTA

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo principal
• Amarelo #f5c200 — destaque
• Cinza escuro #1c1c1c — elementos secundários
• Branco #ffffff — texto de apoio

ESTILO VISUAL:
Profissional e didático, progressão visual clara entre os slides — cada slide deve funcionar isoladamente também.`
        }
      ]
    },
    {
      id:'gy35', date:'2026-07-03', time:'10h', format:'Post',
      title:'Por que seus alunos treinam melhor quando jogam',
      driveFile:'WhatsApp Image 2026-05-20 at 11.13.27.jpeg',
      driveUrl:'https://drive.google.com/file/d/1O2WQFEl1ELDwTuq3tiGKP-RGuAPhLrES/view',
      driveHint:'Ilustração ou screenshot combinando elemento de jogo (pontos/nível) com ambiente de academia',
      texto:`Gamificação não é "só um joguinho" — é psicologia comportamental aplicada ao treino. 🎮

Quando o aluno ganha pontos, sobe de nível ou disputa um ranking, o cérebro libera o mesmo tipo de recompensa que mantém ele engajado em qualquer jogo — só que aqui o resultado é frequência real na academia.

Quer ver isso funcionando na sua academia? Demo gratuita — link na bio. 🚀

#gympulsepro #gamificacaoacademia #gestaodeacademia #retencaodealunos #fittech`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1350px (proporção 4:5, retrato)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas
Estilo: Profissional, educativo`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Educativo / Conversão
Objetivo: Explicar o mecanismo psicológico por trás da gamificação de forma acessível, fortalecendo a credibilidade do produto além do "feature dump".
Funil: Meio/Fundo — consideração e conversão
Ação esperada: Clique no link da bio, DM solicitando demonstração`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Explicar o "porquê" comportamental da gamificação, não só o "o quê", aumentando a credibilidade do produto.

COMPOSIÇÃO DA IMAGEM:
• Ilustração ou screenshot real combinando elemento de jogo (pontos/nível) com ambiente de academia

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo principal
• Amarelo #f5c200 — destaque e CTA
• Cinza escuro #1c1c1c — elementos secundários
• Branco #ffffff — texto de apoio

ESTILO VISUAL:
Profissional, tom educativo. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'gy36', date:'2026-07-03', time:'18h', format:'Story',
      title:'O que gestores que usam o GympulsePro relatam',
      driveFile:'WhatsApp Image 2026-05-18 at 12.44.24.jpeg',
      driveUrl:'https://drive.google.com/file/d/17FVjyP_F1FcTo_zSI3jtay3D0dsasOJe/view',
      driveHint:'Visual com citação estilizada (sem atribuir a nome não confirmado) ou screenshot do painel',
      texto:`Gestores que adotaram o GympulsePro relatam algo em comum: aluno engajado falta menos e fica mais tempo. 📈

Não é mágica — é visibilidade. Quando você vê o que tá acontecendo, consegue agir antes de perder o aluno.

Quer ver como funciona na sua academia? Demo gratuita no link da bio. 🚀`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Profissional, prova social`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Case de Sucesso / Prova Social
Objetivo: Comunicar o benefício de retenção através de relato qualitativo de gestores reais, sem recorrer a estatística não verificada.
Funil: Meio — consideração
Ação esperada: Clique no link da bio, DM com dúvidas`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Prova social qualitativa (relato de gestores) em vez de número não verificado, mantendo credibilidade.

COMPOSIÇÃO DA IMAGEM:
• Visual com citação estilizada (sem atribuir a um nome específico não confirmado) ou screenshot do painel

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo principal
• Amarelo #f5c200 — destaque
• Cinza escuro #1c1c1c — elementos secundários
• Branco #ffffff — texto de apoio

ESTILO VISUAL:
Profissional. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'gy37', date:'2026-07-04', time:'10h', format:'Post',
      title:'Sábado é dia de olhar os números da semana',
      driveFile:'WhatsApp Image 2026-05-20 at 11.13.27.jpeg',
      driveUrl:'https://drive.google.com/file/d/1O2WQFEl1ELDwTuq3tiGKP-RGuAPhLrES/view',
      driveHint:'Screenshot real do painel com resumo semanal',
      texto:`Enquanto a academia funciona no ritmo de sábado, é um bom momento pra olhar os números da semana com calma. 📊

Quantos alunos engajaram? Quantos sumiram? O GympulsePro deixa essas respostas a um clique de distância, sem planilha manual.

Quer ver o seu painel funcionando assim? Demo gratuita — link na bio. 🚀

#gympulsepro #gestaodeacademia #dadosdeacademia #retencaodealunos #fittech`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1350px (proporção 4:5, retrato)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas
Estilo: Profissional, tom calmo`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Planejamento / Conversão
Objetivo: Aproveitar o ritmo mais calmo de sábado pra posicionar o GympulsePro como ferramenta de revisão semanal sem esforço manual.
Funil: Fundo — conversão
Ação esperada: Clique no link da bio, DM`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Sábado como momento natural de revisão de gestão, sem a urgência de dias de semana.

COMPOSIÇÃO DA IMAGEM:
• Screenshot real do painel com resumo semanal

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo principal
• Amarelo #f5c200 — destaque
• Cinza escuro #1c1c1c — elementos secundários
• Branco #ffffff — texto de apoio

ESTILO VISUAL:
Profissional, tom calmo. Sem texto na imagem.`
        }
      ]
    },
    {
      id:'gy38', date:'2026-07-04', time:'18h', format:'Story',
      title:'Seu aluno quer se comparar (e isso é bom)',
      driveFile:'WhatsApp Image 2026-05-18 at 12.44.24.jpeg',
      driveUrl:'https://drive.google.com/file/d/17FVjyP_F1FcTo_zSI3jtay3D0dsasOJe/view',
      driveHint:'Screenshot real da tela de ranking de engajamento',
      texto:`Aluno gosta de saber onde está no ranking — e isso pode trabalhar a favor da sua academia. 🏆

O ranking de engajamento do GympulsePro transforma essa vontade natural de comparação em mais frequência e mais motivação.

Quer ver funcionando? Demo gratuita no link da bio. 🚀`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Funcionalidade em destaque`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Funcionalidade / Comportamental
Objetivo: Conectar um instinto natural do aluno (comparação social) ao recurso de ranking, reforçando o valor prático da gamificação.
Funil: Meio — educação sobre o produto
Ação esperada: Clique no link da bio, DM`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Usar o instinto natural de comparação social como gancho pra explicar o ranking de engajamento.

COMPOSIÇÃO DA IMAGEM:
• Screenshot real da tela de ranking

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo principal
• Amarelo #f5c200 — destaque
• Cinza escuro #1c1c1c — elementos secundários
• Branco #ffffff — texto de apoio

ESTILO VISUAL:
Direto, tom de produto.`
        }
      ]
    },
    {
      id:'gy39', date:'2026-07-06', time:'10h', format:'Post',
      title:'Fim de mês não devia ser dor de cabeça com planilha',
      driveFile:'WhatsApp Image 2026-05-20 at 11.13.27.jpeg',
      driveUrl:'https://drive.google.com/file/d/1O2WQFEl1ELDwTuq3tiGKP-RGuAPhLrES/view',
      driveHint:'Screenshot real do relatório em PDF gerado pelo painel',
      texto:`Fim de mês não devia ser sinônimo de planilha manual e dor de cabeça. 📊

O GympulsePro gera relatório em PDF automático, com tudo que você precisa pra tomar decisão — sem exportar dado nenhum na mão.

Quer ver seu relatório funcionando assim? Demo gratuita — link na bio. 🚀

#gympulsepro #gestaodeacademia #relatorios #fittech`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1350px (proporção 4:5, retrato)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas
Estilo: Profissional, foco em produtividade`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Funcionalidade / Conversão
Objetivo: Divulgar o módulo de Relatórios PDF (ainda não destacado em posts recentes), atacando a dor comum de planilha manual em gestão de academia.
Funil: Meio/Fundo — consideração e conversão
Ação esperada: Clique no link da bio, DM solicitando demonstração`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Apresentar o módulo de Relatórios PDF como solução direta pra dor de gestão manual no fim do mês.

COMPOSIÇÃO DA IMAGEM:
• Screenshot real do relatório em PDF gerado pelo painel

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo principal
• Amarelo #f5c200 — destaque
• Cinza escuro #1c1c1c — elementos secundários
• Branco #ffffff — texto de apoio

ESTILO VISUAL:
Profissional, foco em produtividade.`
        }
      ]
    },
    {
      id:'gy40', date:'2026-07-06', time:'18h', format:'Story',
      title:'Reter custa menos que conquistar',
      driveFile:'WhatsApp Image 2026-05-18 at 12.44.24.jpeg',
      driveUrl:'https://drive.google.com/file/d/17FVjyP_F1FcTo_zSI3jtay3D0dsasOJe/view',
      driveHint:'Dado de mercado com visual de comparação (custo de retenção x aquisição)',
      texto:`Reter um aluno custa muito menos do que conquistar um novo. 📈

Ainda assim, a maioria das academias investe quase tudo em atração e quase nada em retenção. O GympulsePro te ajuda a virar esse jogo.

Quer entender como? Demo gratuita — link na bio. 🚀`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Dado de mercado, direto`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Dado de Mercado
Objetivo: Trazer um dado de mercado conhecido (custo de retenção vs. aquisição) pra reposicionar a prioridade de investimento do gestor rumo à retenção.
Funil: Topo/Meio — educação e consideração
Ação esperada: Clique no link da bio, DM solicitando demonstração`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Dado de mercado sobre custo de retenção vs. aquisição, reposicionando prioridade de investimento do gestor.

COMPOSIÇÃO DA IMAGEM:
• Visual de comparação simples entre custo de retenção e aquisição

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo principal
• Amarelo #f5c200 — destaque
• Cinza escuro #1c1c1c — elementos secundários
• Branco #ffffff — texto de apoio

ESTILO VISUAL:
Profissional, direto.`
        }
      ]
    },
    {
      id:'gy41', date:'2026-07-07', time:'10h', format:'Post',
      title:'Já criou um desafio na sua academia esse mês?',
      driveFile:'WhatsApp Image 2026-05-20 at 11.13.27.jpeg',
      driveUrl:'https://drive.google.com/file/d/1O2WQFEl1ELDwTuq3tiGKP-RGuAPhLrES/view',
      driveHint:'Screenshot real do módulo de Desafios no painel',
      texto:`Desafios dentro do app mantêm o aluno voltando só pra ver se superou a meta da semana. 🎯

É gamificação pura funcionando na prática — e é um dos recursos menos usados pelas academias que já têm o GympulsePro.

Já criou um desafio esse mês? Demo gratuita — link na bio. 🚀

#gympulsepro #gamificacaoacademia #desafios #retencaodealunos`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1080px (proporção 1:1)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas
Estilo: Profissional, foco em funcionalidade`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Funcionalidade / Ativação
Objetivo: Divulgar o módulo de Desafios (hoje subutilizado — só 1 cadastrado, 0 ativos) pra estimular academias já clientes a criarem desafios e atrair leads que buscam esse recurso.
Funil: Meio/Fundo — ativação e conversão
Ação esperada: Clique no link da bio, DM solicitando demonstração ou suporte pra criar desafio`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Divulgar o módulo de Desafios como recurso de gamificação de alto impacto e hoje subutilizado.

COMPOSIÇÃO DA IMAGEM:
• Screenshot real do módulo de Desafios no painel

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo principal
• Amarelo #f5c200 — destaque
• Cinza escuro #1c1c1c — elementos secundários
• Branco #ffffff — texto de apoio

ESTILO VISUAL:
Profissional, foco em ação.`
        }
      ]
    },
    {
      id:'gy42', date:'2026-07-07', time:'18h', format:'Story',
      title:'Não é só pra academia grande',
      driveFile:'WhatsApp Image 2026-05-18 at 12.44.24.jpeg',
      driveUrl:'https://drive.google.com/file/d/17FVjyP_F1FcTo_zSI3jtay3D0dsasOJe/view',
      driveHint:'Visual de personal trainer acompanhando aluno com dado em tempo real',
      texto:`Não é só pra academia grande — personal trainer também usa o GympulsePro pra acompanhar aluno em tempo real. 💪

BPM, pontos e frequência, tudo num só lugar, mesmo em atendimento individual.

Quer ver como funciona no seu atendimento? Demo gratuita — link na bio. 🚀`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Story Instagram
Dimensões: 1080 × 1920px (proporção 9:16)
Resolução: 72 DPI
Zona segura: 150px das bordas
Estilo: Profissional, foco em personal trainer`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Demo / Prova Social
Objetivo: Ampliar a percepção do público-alvo pra incluir personal trainers individuais (não só academias), endereçando esse segmento de baixo uso na base atual.
Funil: Meio/Fundo — consideração e conversão
Ação esperada: Clique no link da bio, DM solicitando demonstração`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Mostrar que o produto também serve personal trainers individuais, ampliando o público percebido.

COMPOSIÇÃO DA IMAGEM:
• Visual de personal trainer acompanhando aluno com dado em tempo real

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo principal
• Amarelo #f5c200 — destaque
• Cinza escuro #1c1c1c — elementos secundários
• Branco #ffffff — texto de apoio

ESTILO VISUAL:
Profissional, próximo.`
        }
      ]
    },
    {
      id:'gy43', date:'2026-07-08', time:'10h', format:'Post',
      title:'Ver o BPM em tempo real muda o ajuste da aula',
      driveFile:'WhatsApp Image 2026-05-20 at 11.13.27.jpeg',
      driveUrl:'https://drive.google.com/file/d/1O2WQFEl1ELDwTuq3tiGKP-RGuAPhLrES/view',
      driveHint:'Screenshot real do Monitor ao Vivo com BPM dos alunos',
      texto:`Ver o BPM do aluno em tempo real durante a aula muda a forma como você ajusta a intensidade na hora. 💓

É isso que o Monitor ao Vivo do GympulsePro faz — dado real, decisão na hora, sem depender de "achismo".

Quer ver o seu painel funcionando assim? Demo gratuita — link na bio. 🚀

#gympulsepro #monitoramento #gestaodeacademia #fittech`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Post Feed Instagram
Dimensões: 1080 × 1350px (proporção 4:5, retrato)
Resolução: 72 DPI
Margem de segurança: 80px nas bordas
Estilo: Profissional, foco em dado em tempo real`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Funcionalidade
Objetivo: Divulgar o módulo Monitor ao Vivo, ilustrando o valor prático do dado em tempo real na condução da aula, não só no relatório posterior.
Funil: Meio/Fundo — consideração e conversão
Ação esperada: Clique no link da bio, DM solicitando demonstração`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Mostrar o valor do dado em tempo real durante a aula, não apenas em relatório posterior.

COMPOSIÇÃO DA IMAGEM:
• Screenshot real do Monitor ao Vivo com BPM dos alunos

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo principal
• Amarelo #f5c200 — destaque
• Cinza escuro #1c1c1c — elementos secundários
• Branco #ffffff — texto de apoio

ESTILO VISUAL:
Profissional, dinâmico.`
        }
      ]
    },
    {
      id:'gy44', date:'2026-07-08', time:'18h', format:'Carrossel',
      title:'Carrossel — Como a gamificação funciona na prática',
      driveFile:'WhatsApp Image 2026-05-18 at 12.44.24.jpeg',
      driveUrl:'https://drive.google.com/file/d/17FVjyP_F1FcTo_zSI3jtay3D0dsasOJe/view',
      driveHint:'Carrossel educativo — usar screenshots reais do painel nos slides de apoio',
      texto:`Slide 1: "Como a gamificação do GympulsePro funciona, do sensor ao ranking"
Slide 2: "Passo 1: sensor capta BPM e frequência em tempo real durante a aula"
Slide 3: "Passo 2: o app converte esses dados em pontos automaticamente"
Slide 4: "Passo 3: os pontos alimentam o ranking de engajamento da turma"
Slide 5: "Passo 4: você vê tudo isso no painel, sem planilha manual"
Slide 6: "Quer ver isso rodando na sua academia? Demo gratuita — link na bio."

#gympulsepro #gamificacaoacademia #comofunciona #gestaodeacademia`,
      secoes:[
        {
          num:'01', cor:'#f5c200', titulo:'FORMATO E ESPECIFICAÇÕES',
          conteudo:`Tipo: Carrossel Instagram (6 slides)
Dimensões: 1080 × 1080px por slide (proporção 1:1)
Resolução: 72 DPI
Margem: 80px nas bordas
Estilo: Lista de passos, alto valor educativo`
        },
        {
          num:'02', cor:'#ffffff', titulo:'INTENÇÃO DA POSTAGEM',
          conteudo:`Tipo: Educativo / Conversão
Objetivo: Explicar o fluxo completo do produto (sensor → app → pontos → ranking) de forma didática, consolidando entendimento pra quem já viu posts de funcionalidades isoladas.
Funil: Meio/Fundo — consideração e conversão
Ação esperada: Deslizar o carrossel completo, salvar, clique no link da bio, DM solicitando demonstração`
        },
        {
          num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO',
          conteudo:`CONCEITO CENTRAL:
Consolidar em um só carrossel o fluxo completo do produto, que até aqui foi mostrado só em pedaços (funcionalidades isoladas).

ESTRUTURA DOS SLIDES:
• Slide 1 — Capa
• Slides 2-5 — Um passo do fluxo por slide
• Slide 6 — Fechamento com CTA

PALETA OBRIGATÓRIA:
• Preto #0d0d0d — fundo principal
• Amarelo #f5c200 — destaque
• Cinza escuro #1c1c1c — elementos secundários
• Branco #ffffff — texto de apoio

ESTILO VISUAL:
Profissional e didático, progressão visual clara entre os slides.`
        }
      ]
    },
  ]
};


// STATE
const SK='gilson_v5';
let S=JSON.parse(localStorage.getItem(SK)||'{}');
// PENDING costumava viver só na memória — se a aba recarregasse (F5 manual,
// o detector de versão nova, o navegador matando a aba em segundo plano)
// antes do push terminar, a fila era perdida silenciosamente: a edição
// continuava intacta no localStorage, mas nada mais sabia que precisava
// reenviar ela pro servidor. Foi assim que edições de card (ex: so86/so87)
// ficaram presas pra sempre só num aparelho. Agora cada Set persiste no
// localStorage a cada mudança, então uma fila pendente sobrevive a reload
// e é reenviada no próximo sync bem-sucedido.
function makePersistentSet(storageKey) {
  let initial = [];
  try { initial = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch (e) {}
  const s = new Set(initial);
  const persist = () => { try { localStorage.setItem(storageKey, JSON.stringify([...s])); } catch (e) {} };
  const origAdd = s.add.bind(s);
  const origDelete = s.delete.bind(s);
  const origClear = s.clear.bind(s);
  s.add = (v) => { origAdd(v); persist(); return s; };
  s.delete = (v) => { const r = origDelete(v); persist(); return r; };
  s.clear = () => { origClear(); persist(); };
  return s;
}
const PENDING = {
  done: makePersistentSet('pending_done'),
  edits: makePersistentSet('pending_edits'),
  images: makePersistentSet('pending_images'),
  published: makePersistentSet('pending_published'),
  reviewed: makePersistentSet('pending_reviewed')
};
const save=()=>localStorage.setItem(SK,JSON.stringify(S));
const done=id=>!!S[id];
const toggle=id=>{
  const willBeDone = !S[id];
  if (willBeDone && !hasValidImage(id)) {
    showToast('⚠️ Anexe uma mídia antes de validar como executado');
    flashImageBox(id);
    return;
  }
  // Melhoria 4: Se o badge está verde (ready/pendente), pedir confirmação
  if (willBeDone) {
    const badgeEl = document.getElementById('cfmt-'+id);
    const isPublished = badgeEl && badgeEl.classList.contains('published');
    if (!isPublished) {
      const ok = confirm('⚠️ Este card ainda não foi publicado (status azul).\n\nTem certeza que deseja marcar como Executado?\n\n(Publique no Instagram antes de marcar como feito)');
      if (!ok) return;
    }
  }
  S[id]=!S[id];save();PENDING.done.add(id);renderAll();buildHist();scheduleSync();
};
function hasValidImage(id){
  const img = getImageData(id);
  return !!(img && img.status === 'ok');
}
function flashImageBox(id){
  const card = document.getElementById('card-'+id);
  if (card && !card.classList.contains('open')) card.classList.add('open');
  const box = document.getElementById('imgbox-'+id);
  if (!box) return;
  box.scrollIntoView({behavior:'smooth', block:'center'});
  box.classList.add('needs-image');
  setTimeout(()=>box.classList.remove('needs-image'), 1600);
}

// ── HIDE COMPLETED FILTER ──
let hideDone = localStorage.getItem('hideDone') === '1';
function toggleHideDone(){
  hideDone = document.getElementById('hideDoneCheck').checked;
  localStorage.setItem('hideDone', hideDone ? '1' : '0');
  renderAll();
}

// ── PUBLICAÇÃO AUTOMÁTICA NO INSTAGRAM (via Zernio) ──
// Academia, Sorveteria e GympulsePro têm conta conectada no Zernio.
const ZERNIO_PROFILES = ['academia','sorveteria','gympulse'];

function getReviewed(id){ return localStorage.getItem('reviewed_'+id) === '1'; }
function setReviewed(id, val){
  localStorage.setItem('reviewed_'+id, val ? '1' : '0');
  PENDING.reviewed.add(id);
}
function toggleReviewed(id){
  const nv = !getReviewed(id);
  setReviewed(id, nv);
  const btn = document.getElementById('revbtn-'+id);
  if (btn) {
    btn.querySelector('span').textContent = (nv?'✅':'⬜') + ' Revisado';
    btn.style.cssText = nv ? 'background:#14532d;border-color:#4ade80;color:#4ade80;' : '';
  }
  rerenderPublishBlock(id);
  scheduleSync();
}
function isReadyForAutoPublish(id){
  const img = getImageData(id);
  return getReviewed(id) && !!(img && img.status === 'ok' && img.zernioStatus === 'ok' && img.zernioUrl);
}
function applySavedReviewed(){
  for (const profile of ['academia','sorveteria','gympulse']) {
    CONTENT[profile].forEach(item => { rerenderPublishBlock(item.id); });
  }
}

function getPublishData(id){
  try { return JSON.parse(localStorage.getItem('pub_'+id) || 'null'); } catch(e) { return null; }
}
function setPublishData(id, data){
  localStorage.setItem('pub_'+id, JSON.stringify(data));
  PENDING.published.add(id);
}
function applySavedPublished(){
  for (const profile of ['academia','sorveteria','gympulse']) {
    CONTENT[profile].forEach(item => { rerenderPublishBlock(item.id); });
  }
}
function rerenderPublishBlock(id){
  const el = document.getElementById('pubblock-'+id);
  if (el) el.outerHTML = publishBlockHTML(id);
  updateReadyBadge(id);
}
function updateReadyBadge(id){
  const found = findItem(id);
  if (!found) return;
  const { profile } = found;
  const pubData = getPublishData(id);
  const isPublishedNow = ZERNIO_PROFILES.includes(profile) && !!(pubData && pubData.status === 'ok');
  const imgData2 = getImageData(id);
  const isDriveReady = !!(imgData2 && imgData2.status === 'ok') && getReviewed(id);
  const isReadyToShow = !isPublishedNow && isDriveReady;
  const badgeEl = document.getElementById('cfmt-'+id);
  if (badgeEl) {
    badgeEl.classList.toggle('ready', isReadyToShow);
    badgeEl.classList.toggle('published', isPublishedNow);
  }
}
function publishBlockHTML(id){
  const pub = getPublishData(id);
  const reviewed = getReviewed(id);
  const ready = isReadyForAutoPublish(id);

  const reviewToggle = `
    <button type="button" class="review-toggle" id="revbtn-${id}" onclick="event.stopPropagation(); toggleReviewed('${id}');" style="${reviewed?'background:#14532d;border-color:#4ade80;color:#4ade80;':''}">
      <span>${reviewed?'✅':'⬜'} Revisado</span>
    </button>`;

  const readyBadge = ready
    ? `<span class="publish-badge ok">✅ 100% pronto — será publicado automaticamente no horário</span>`
    : `<span class="publish-badge pending">${reviewed ? (function(){
      const _img = getImageData(id);
      if (_img && _img.status === 'ok') {
        if (_img.zernioStatus === 'pending') return '⏳ Preparando automação Zernio...';
        if (_img.zernioStatus === 'error') return '⚠️ Falha no Zernio — tente substituir a mídia';
        return '⏳ Sincronizando com Zernio...';
      }
      return '⏳ Envie a mídia para liberar';
    })() : '⚠️ Marque como revisado pra liberar a automação'}</span>`;

  let actionHTML;
  if (pub && pub.status === 'publishing') {
    actionHTML = `<span class="publish-badge publishing">⏳ Publicando no Instagram...</span>`;
  } else if (pub && pub.status === 'ok') {
    const pubTime = pub.publishedAt ? ' em ' + new Date(pub.publishedAt).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : '';
    actionHTML = `
      <span class="publish-badge ok">✓ Publicado no Instagram${pubTime}</span>
      <button class="publish-btn" onclick="event.stopPropagation();publishToInstagram('${id}')">Republicar</button>
      <button class="unpublish-btn" onclick="event.stopPropagation();unpublishCard('${id}')">↩️ Não foi publicado</button>`;
  } else if (pub && pub.status === 'error') {
    actionHTML = `
      <span class="publish-badge error">⚠️ Falha ao publicar: ${pub.errorMsg || ''}</span>
      <button class="publish-btn" onclick="event.stopPropagation();publishToInstagram('${id}')">Tentar de novo</button>`;
  } else {
    actionHTML = `<button class="publish-btn" onclick="event.stopPropagation();publishToInstagram('${id}')">📤 Publicar agora no Instagram</button>`;
  }

  return `<div class="publish-block" id="pubblock-${id}">
    <div class="publish-row">${reviewToggle}${(!pub || pub.status!=='ok') ? readyBadge : ''}</div>
    <div class="publish-row">${actionHTML}</div>
  </div>`;
}

function blobToBase64(blob){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function downloadDriveFile(fileId){
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { 'Authorization': 'Bearer ' + driveAccessToken }
  });
  if (!res.ok) throw new Error('Não foi possível baixar a imagem do Drive (status ' + res.status + ').');
  return await res.blob();
}

async function publishToInstagram(id){
  const found = findItem(id);
  if (!found) return;
  const { item, profile } = found;

  if (!ZERNIO_PROFILES.includes(profile)) {
    showToast('Esse perfil não tem publicação automática configurada.');
    return;
  }
  if (!hasValidImage(id)) {
    showToast('⚠️ Anexe uma imagem antes de publicar');
    flashImageBox(id);
    return;
  }

  setPublishData(id, { status: 'publishing' });
  rerenderPublishBlock(id);

  const img = getImageData(id);

  // Se a imagem já foi enviada pro Zernio em segundo plano (fluxo normal),
  // publica direto sem precisar do login do Google.
  if (img.zernioStatus === 'ok' && img.zernioUrl) {
    try {
      const resp = await fetch('/api/publish-zernio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, caption: item.texto, format: item.format, zernioUrl: img.zernioUrl })
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) throw new Error(data.error || 'Falha desconhecida ao publicar.');
      setPublishData(id, { status: 'ok', postId: data.postId, publishedAt: new Date().toISOString() });
      rerenderPublishBlock(id);
      showToast('✅ Publicado no Instagram!');
      pushRemoteState();
    } catch (e) {
      setPublishData(id, { status: 'error', errorMsg: e.message || 'Erro de conexão' });
      rerenderPublishBlock(id);
    }
    return;
  }

  // Caminho antigo (imagem ainda não preparada no Zernio): baixa do Drive
  // com o login do navegador e sobe na hora.
  ensureDriveAuth(async (authErr) => {
    if (authErr) {
      setPublishData(id, { status: 'error', errorMsg: authErr.message });
      rerenderPublishBlock(id);
      return;
    }
    try {
      const blob = await downloadDriveFile(img.fileId);
      const base64 = await blobToBase64(blob);
      const mimeType = blob.type || 'image/jpeg';
      const fileName = img.fileName || ('post-' + id + '.jpg');

      const resp = await fetch('/api/publish-zernio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, caption: item.texto, fileName, mimeType, base64, format: item.format })
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        throw new Error(data.error || 'Falha desconhecida ao publicar.');
      }
      setPublishData(id, { status: 'ok', postId: data.postId, publishedAt: new Date().toISOString() });
      rerenderPublishBlock(id);
      showToast('✅ Publicado no Instagram!');
      pushRemoteState();
    } catch (e) {
      setPublishData(id, { status: 'error', errorMsg: e.message || 'Erro de conexão' });
      rerenderPublishBlock(id);
    }
  });
}

// ── IMAGE UPLOAD (Google Drive via service account) ──
function getImageData(id){
  try { return JSON.parse(localStorage.getItem('img_'+id) || 'null'); } catch(e) { return null; }
}
function setImageData(id, data){
  localStorage.setItem('img_'+id, JSON.stringify(data));
  if (id && typeof id === 'string' && !id.includes('-dyn-')) PENDING.images.add(id);
}

function imageBlockHTML(id, profile){
  const img = getImageData(id);
  if (img && img.status === 'ok') {
    // Auto-generated cards from Gympulse: show the actual system image as a large preview
    const isAutoGenerated = img.viewUrl && img.viewUrl.includes('supabase.co/storage');
    if (isAutoGenerated) {
      return `
        <div class="upload-preview-svg">
          <div class="svg-label">🤖 Imagem gerada pelo Gympulse</div>
          <a href="${img.viewUrl}" target="_blank" onclick="event.stopPropagation()">
            <img src="${img.viewUrl}" alt="Ranking gerado" loading="lazy">
          </a>
          <div class="svg-actions">
            <a class="upload-link" href="${img.viewUrl}" target="_blank" onclick="event.stopPropagation()">Abrir tamanho real ↗</a>
          </div>
        </div>`;
    }
    const thumb = img.thumbnailLink
      ? `<img class="upload-thumb" src="${img.thumbnailLink}" alt="">`
      : `<span class="upload-thumb-icon">🖼️</span>`;
    const zernioLine = img.zernioStatus === 'ok'
      ? `<div class="upload-status zernio-ok">✓ Disponível pra publicação automática</div>`
      : img.zernioStatus === 'error'
        ? `<div class="upload-status zernio-error">⚠️ Falha ao preparar para automação: ${img.zernioErrorMsg || ''} <button class="upload-replace" onclick="event.stopPropagation();retryZernioUpload('${id}','${profile}')">Tentar de novo</button></div>`
        : img.zernioStatus === 'pending'
          ? `<div class="upload-status loading">⏳ Preparando para publicação automática...</div>`
          : '';
    return `
      <div class="upload-preview">
        ${thumb}
        <div class="upload-info">
          <div class="upload-name">${img.fileName}</div>
          <div class="upload-status">✓ Enviado para o Drive (${profileFolderName(profile)})</div>
          ${zernioLine}
        </div>
        <div class="upload-actions">
          <a class="upload-link" href="${img.viewUrl}" target="_blank">Abrir ↗</a>
          <button class="upload-replace" onclick="event.stopPropagation();startImageUpload('${id}','${profile}')">Substituir</button>
        </div>
      </div>`;
  }
  if (img && img.status === 'uploading') {
    return `
      <div class="upload-preview">
        <span class="upload-thumb-icon">⏳</span>
        <div class="upload-info">
          <div class="upload-name">${img.fileName || 'Enviando...'}</div>
          <div class="upload-status loading">Enviando para o Drive...</div>
        </div>
      </div>`;
  }
  if (img && img.status === 'error') {
    return `
      <div class="upload-box" onclick="startImageUpload('${id}','${profile}')">
        <div class="upload-box-icon">⚠️</div>
        <div class="upload-box-text" style="color:#ff6b6b">Falha no envio — toque para tentar de novo</div>
        <div class="upload-box-hint">${img.errorMsg || ''}</div>
      </div>`;
  }
  return `
    <div class="upload-box" onclick="startImageUpload('${id}','${profile}')">
      <div class="upload-box-icon">📤</div>
      <div class="upload-box-text">Toque para enviar imagem ou vídeo da postagem</div>
      <div class="upload-box-hint">Vai direto para a pasta ${profileFolderName(profile)} no Drive</div>
    </div>`;
}

function profileFolderName(profile){
  return {academia:'Academia', sorveteria:'Sorveteria', gympulse:'Gympulse'}[profile] || profile;
}
const DRIVE_FOLDER_MAP = {
  academia: '1xltSXYrcyWBAmJxKMzohjG2uuPSPbkWq',
  sorveteria: '1OOZGQK1XO6XMH5K9VfyVXxk9Hdx3U_oS',
  gympulse: '1fxOPjshpJS10kbUeWKYm8UQmQMnN3Rt7'
};

function rerenderImageBox(id, profile){
  const box = document.getElementById('imgbox-'+id);
  if (box) box.innerHTML = imageBlockHTML(id, profile);
}

// ── GOOGLE OAUTH (browser-side, direct upload to Drive) ──
const GOOGLE_OAUTH_CLIENT_ID = '531127789749-cj3s2m5rn48g17t8u8hsf4jq86n6i1c1.apps.googleusercontent.com';
let gisTokenClient = null;
let driveAccessToken = null;
let driveTokenExpiry = 0;

function initGoogleAuth(){
  if (!window.google || !window.google.accounts) {
    setTimeout(initGoogleAuth, 300); // gsi script ainda carregando
    return;
  }
  gisTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_OAUTH_CLIENT_ID,
    scope: 'https://www.googleapis.com/auth/drive.file',
    callback: (resp) => {
      if (resp && resp.access_token) {
        driveAccessToken = resp.access_token;
        driveTokenExpiry = Date.now() + (resp.expires_in ? resp.expires_in * 1000 : 3000000);
        sessionStorage.setItem('gdrive_token', JSON.stringify({ t: driveAccessToken, exp: driveTokenExpiry }));
        updateDriveConnectBtn(true);
        resolvePendingAuth(null);
      } else {
        resolvePendingAuth(new Error('Login com Google não retornou permissão. Tente novamente.'));
      }
    },
    error_callback: (err) => {
      let msg = 'Não foi possível abrir o login do Google.';
      if (err && err.type === 'popup_failed_to_open') {
        msg = 'O navegador bloqueou a janela de login do Google. Permita pop-ups para este site e tente de novo.';
      } else if (err && err.type === 'popup_closed') {
        msg = 'A janela de login foi fechada antes de concluir. Tente novamente.';
      } else if (err && err.message) {
        msg = err.message;
      }
      resolvePendingAuth(new Error(msg));
    }
  });
  // Restore a still-valid token from this browser session, if any
  try {
    const saved = JSON.parse(sessionStorage.getItem('gdrive_token') || 'null');
    if (saved && saved.exp > Date.now() + 60000) {
      driveAccessToken = saved.t;
      driveTokenExpiry = saved.exp;
      updateDriveConnectBtn(true);
    }
  } catch(e) {}
}

// Resolves whatever upload is currently waiting on auth (success = null error, or an Error)
function resolvePendingAuth(err){
  if (window._authTimeoutId) { clearTimeout(window._authTimeoutId); window._authTimeoutId = null; }
  const fn = window._pendingUploadAfterAuth;
  window._pendingUploadAfterAuth = null;
  if (fn) {
    fn(err);
  } else if (err) {
    alert('Google Drive: ' + err.message);
  }
}

function updateDriveConnectBtn(connected){
  const btn = document.getElementById('driveConnectBtn');
  if (!btn) return;
  if (connected) {
    btn.textContent = '✓ Drive conectado';
    btn.classList.add('connected');
  } else {
    btn.textContent = '🔗 Conectar Drive';
    btn.classList.remove('connected');
  }
}

function hasValidDriveToken(){
  return !!driveAccessToken && Date.now() < driveTokenExpiry - 30000;
}

function connectGoogleDrive(){
  if (!gisTokenClient) { initGoogleAuth(); setTimeout(connectGoogleDrive, 400); return; }
  gisTokenClient.requestAccessToken({ prompt: hasValidDriveToken() ? '' : 'consent' });
}

// onReady(err) — err is null on success, or an Error describing what went wrong.
// Always resolves: either via the GIS success/error callback, or via a 25s
// safety timeout, so the UI can never get stuck spinning forever again.
function ensureDriveAuth(onReady){
  if (hasValidDriveToken()) { onReady(null); return; }
  window._pendingUploadAfterAuth = onReady;
  window._authTimeoutId = setTimeout(() => {
    resolvePendingAuth(new Error('O login com Google demorou demais ou não respondeu. Verifique se uma janela de pop-up foi bloqueada e tente novamente.'));
  }, 25000);
  if (!gisTokenClient) {
    initGoogleAuth();
    setTimeout(() => {
      if (gisTokenClient) gisTokenClient.requestAccessToken();
      else resolvePendingAuth(new Error('Não foi possível iniciar o login do Google. Recarregue a página e tente de novo.'));
    }, 600);
    return;
  }
  gisTokenClient.requestAccessToken();
}

async function uploadFileToDrive(file, folderId){
  const boundary = 'painelgilson' + Date.now();
  const metadata = { name: file.name, parents: [folderId] };
  const delimiter = '\r\n--' + boundary + '\r\n';
  const closeDelim = '\r\n--' + boundary + '--';
  const metaPart = delimiter + 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata);
  const mediaHeader = delimiter + 'Content-Type: ' + file.type + '\r\n\r\n';
  const body = new Blob([metaPart, mediaHeader, file, closeDelim]);

  const isVideo = file.type.startsWith('video/');
  const timeout = isVideo ? 120000 : 45000; // 2min vídeo, 45s imagem

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const timerId = setTimeout(() => { xhr.abort(); reject(new Error('Upload demorou demais. Verifique sua conexão.')); }, timeout);

    // Barra de progresso
    showUploadProgress(0, file.name);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        showUploadProgress(pct, file.name);
      }
    };

    xhr.onload = () => {
      clearTimeout(timerId);
      hideUploadProgress();
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data);
        } else if (xhr.status === 401) {
          reject(new Error('Sessão do Google expirou. Toque em "Conectar Drive" de novo.'));
        } else {
          reject(new Error((data.error && data.error.message) || 'Falha no upload'));
        }
      } catch(e) { reject(new Error('Resposta inválida do Drive')); }
    };

    xhr.onerror = () => { clearTimeout(timerId); hideUploadProgress(); reject(new Error('Erro de rede ao enviar para o Drive')); };
    xhr.onabort = () => { clearTimeout(timerId); hideUploadProgress(); };

    xhr.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,thumbnailLink');
    xhr.setRequestHeader('Authorization', 'Bearer ' + driveAccessToken);
    xhr.setRequestHeader('Content-Type', 'multipart/related; boundary=' + boundary);
    xhr.send(body);
  });
}

function showUploadProgress(pct, fileName) {
  let bar = document.getElementById('upload-progress-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'upload-progress-bar';
    bar.innerHTML = '<div class="up-inner"><div class="up-fill" id="up-fill"></div></div><div class="up-text" id="up-text"></div>';
    document.body.appendChild(bar);
  }
  bar.style.display = 'flex';
  document.getElementById('up-fill').style.width = pct + '%';
  const shortName = fileName.length > 25 ? fileName.slice(0,22) + '...' : fileName;
  document.getElementById('up-text').textContent = '📤 ' + shortName + ' — ' + pct + '%';
}

function hideUploadProgress() {
  const bar = document.getElementById('upload-progress-bar');
  if (bar) bar.style.display = 'none';
}

function startImageUpload(id, profile){
  ensureDriveAuth((authErr) => {
    if (authErr) {
      showToast('⚠️ ' + authErr.message);
      return;
    }
    document.getElementById('imgfile-'+id).click();
  });
}

async function handleImageSelect(id, profile, inputEl){
  let file = inputEl.files && inputEl.files[0];
  if (!file) return;
  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');
  if (!isImage && !isVideo) {
    setImageData(id, { status:'error', errorMsg:'Selecione uma imagem ou vídeo.' });
    rerenderImageBox(id, profile);
    return;
  }
  if (isVideo) {
    // Comprimir e converter vídeo para MP4 (720p, max 20MB)
    setImageData(id, { status:'uploading', fileName:'Comprimindo ' + file.name + '...' });
    rerenderImageBox(id, profile);
    try {
      file = await compressVideo(file);
    } catch(convErr) {
      setImageData(id, { status:'error', errorMsg:'Falha na compressão: ' + convErr.message });
      rerenderImageBox(id, profile);
      return;
    }
  }
  if (isImage && !['image/jpeg','image/png'].includes(file.type)) {
    // Converter imagem para JPEG
    try {
      file = await convertImageToJpeg(file);
    } catch(e) { /* se falhar, envia no formato original */ }
  }
  const maxSize = isVideo ? 100 * 1024 * 1024 : 15 * 1024 * 1024;
  const maxLabel = isVideo ? '100MB' : '15MB';
  if (file.size > maxSize) {
    setImageData(id, { status:'error', fileName:file.name, errorMsg:'Arquivo maior que ' + maxLabel + ' — reduza o tamanho e tente de novo.' });
    rerenderImageBox(id, profile);
    return;
  }

  setImageData(id, { status:'uploading', fileName:file.name });
  rerenderImageBox(id, profile);

  ensureDriveAuth(async (authErr) => {
    if (authErr) {
      setImageData(id, { status:'error', fileName:file.name, errorMsg: authErr.message });
      rerenderImageBox(id, profile);
      inputEl.value = '';
      return;
    }
    try {
      const folderId = DRIVE_FOLDER_MAP[profile];
      const data = await uploadFileToDrive(file, folderId);

      setImageData(id, {
        status: 'ok',
        fileId: data.id,
        viewUrl: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
        thumbnailLink: data.thumbnailLink || '',
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        zernioStatus: ZERNIO_PROFILES.includes(profile) ? 'pending' : 'n/a'
      });
      rerenderImageBox(id, profile);
      pushRemoteState();
      if (ZERNIO_PROFILES.includes(profile)) uploadToZernioBackground(id, profile, file);
    } catch (e) {
      setImageData(id, { status:'error', fileName:file.name, errorMsg: e.message || 'Erro de conexão' });
      rerenderImageBox(id, profile);
    } finally {
      inputEl.value = '';
    }
  });
}

async function retryZernioUpload(id, profile){
  const img = getImageData(id);
  if (!img || !img.fileId) return;
  setImageData(id, { ...img, zernioStatus: 'pending', zernioErrorMsg: '' });
  rerenderImageBox(id, profile);
  ensureDriveAuth(async (authErr) => {
    if (authErr) {
      setImageData(id, { ...img, zernioStatus: 'error', zernioErrorMsg: authErr.message });
      rerenderImageBox(id, profile);
      return;
    }
    try {
      const blob = await downloadDriveFile(img.fileId);
      const file = new File([blob], img.fileName || 'imagem.jpg', { type: blob.type || 'image/jpeg' });
      await uploadToZernioBackground(id, profile, file);
    } catch (e) {
      const current = getImageData(id) || {};
      setImageData(id, { ...current, zernioStatus: 'error', zernioErrorMsg: e.message || 'Erro de conexão' });
      rerenderImageBox(id, profile);
    }
  });
}

async function uploadToZernioBackground(id, profile, file){
  try {
    const base64 = await blobToBase64(file);
    const resp = await fetch('/api/zernio-media-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile, fileName: file.name, mimeType: file.type || 'image/jpeg', base64 })
    });
    const data = await resp.json();
    const current = getImageData(id) || {};
    if (!resp.ok || !data.ok) {
      setImageData(id, { ...current, zernioStatus: 'error', zernioErrorMsg: data.error || 'Falha desconhecida' });
    } else {
      setImageData(id, { ...current, zernioStatus: 'ok', zernioUrl: data.publicUrl });
    }
  } catch (e) {
    const current = getImageData(id) || {};
    setImageData(id, { ...current, zernioStatus: 'error', zernioErrorMsg: e.message || 'Erro de conexão' });
  }
  rerenderImageBox(id, profile);
  rerenderPublishBlock(id);
  pushRemoteState();
}

function applySavedImages(){
  for (const profile of ['academia','sorveteria','gympulse']) {
    CONTENT[profile].forEach(item => {
      rerenderImageBox(item.id, profile);
    });
  }
}

// ── FUSO HORÁRIO — tudo opera no horário de Brasília (America/Sao_Paulo, UTC-3 fixo) ──
// Corrige o bug de new Date().toISOString() (UTC) virar o dia seguinte entre ~21h e 00h BR.
function todayBR(){ return new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'}); }
function dateBR(offsetDays){
  const [y,m,d] = todayBR().split('-').map(Number);
  const t = Date.UTC(y, m-1, d) + (offsetDays||0)*86400000;
  return new Date(t).toISOString().slice(0,10);
}
function fmtDate(ds){
  const[y,m,d]=ds.split('-').map(Number);
  const dt=new Date(y,m-1,d);
  const dn=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const mn=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  return `${dn[dt.getDay()]}, ${d} de ${mn[m-1]} de ${y}`;
}

function groupBy(arr,key){return arr.reduce((g,x)=>{(g[x[key]]=g[x[key]]||[]).push(x);return g;},{});}

function paletteHTML(profile){
  return `<div class="palette-bar">${PALETTES[profile].map(c=>`
    <div class="pchip">
      <div class="pchip-dot" style="background:${c.hex};${c.hex==='#ffffff'?'border:1px solid #333':''}"></div>
      <span class="pchip-hex">${c.hex}</span>
      <span class="pchip-name">${c.name}</span>
    </div>`).join('')}</div>`;
}

function secColors(profile){
  const m={academia:['#e63900','#f5a623','#4ade80','#a78bfa'],sorveteria:['#f5c800','#00b4d8','#4ade80','#a78bfa'],gympulse:['#f5c200','#cccccc','#4ade80','#a78bfa']};
  return m[profile];
}

function cardHTML(item,profile){
  const d=done(item.id);
  const sc=secColors(profile);
  const secs=item.secoes.map((s,i)=>`
    <div class="prompt-section" id="ps-${item.id}-${i}">
      <div class="psec-header" onclick="toggleSec('${item.id}',${i})">
        <div class="psec-num" style="background:${s.cor}22;color:${s.cor}">${s.num}</div>
        <span class="psec-title" style="color:${s.cor}">${s.titulo}</span>
        <span class="psec-chev">▼</span>
      </div>
      <div class="psec-body">
        <div class="psec-content">${s.conteudo}</div>
        <button class="copybtn" onclick="cp('ps-content-${item.id}-${i}',this)">Copiar</button>
        <div style="display:none" id="ps-content-${item.id}-${i}">${s.conteudo}</div>
      </div>
    </div>`).join('');

  const acColor={academia:'#e63900',sorveteria:'#f5c800',gympulse:'#f5c200'}[profile];
  const pubData = getPublishData(item.id);
  const isPublishedNow = ZERNIO_PROFILES.includes(profile) && !!(pubData && pubData.status === 'ok');
  const _img = getImageData(item.id);
  const isDriveReady = !!(_img && _img.status === 'ok') && getReviewed(item.id);
  const isReadyToShow = !isPublishedNow && isDriveReady;
  const cfmtClass = isPublishedNow ? ' published' : (isReadyToShow ? ' ready' : '');

  return `
<div class="card ${d?'done':''}" data-p="${profile}" id="card-${item.id}">
  <div class="chead" onclick="expand('${item.id}')">
    <button class="chk" title="${hasValidImage(item.id)?'Marcar como executado':'Anexe uma imagem para poder validar'}" onclick="event.stopPropagation();toggle('${item.id}')">${d?'✓':''}</button>
    <div class="cmeta">
      <span class="ctag">${item.time}</span>
      <span class="cfmt${cfmtClass}" id="cfmt-${item.id}">${item.format}</span>
      <span class="ctitle">${item.title}</span>
    </div>
    <span class="cchev">▼</span>
  </div>
  <div class="cbody">

    <div class="block" style="display:flex;justify-content:flex-end;margin-top:12px;gap:6px;flex-wrap:wrap;">
      <button class="edit-btn" onclick="event.stopPropagation();openEdit('${item.id}')">✏️ Editar card</button>
      <button class="copy-all-btn" onclick="event.stopPropagation();copyAll('${item.id}')">📋 Copiar tudo</button>
      <button class="clone-btn" onclick="event.stopPropagation();cloneCard('${item.id}','${profile}')">🔄 Reaproveitar</button>
      <button class="delete-btn" onclick="event.stopPropagation();deleteCard('${item.id}','${profile}')">🗑️ Excluir</button>
    </div>
    ${ZERNIO_PROFILES.includes(profile) ? publishBlockHTML(item.id) : ''}
    <div class="block">
      <div class="blabel" style="color:#00b4d8">📎 Mídia a ser Publicada
        <a class="upload-link" style="margin-left:auto" href="https://drive.google.com/drive/folders/${DRIVE_FOLDER_MAP[profile]}" target="_blank" onclick="event.stopPropagation()">🔍 Buscar imagem</a>
      </div>
      <div id="imgbox-${item.id}">${imageBlockHTML(item.id, profile)}</div>
      <input type="file" accept="image/*,video/*" id="imgfile-${item.id}" style="display:none" ${item.format==='Carrossel'?'multiple':''} onchange="handleImageSelect('${item.id}','${profile}',this)">
      ${item.format==='Carrossel' ? carouselSlidesHTML(item.id, profile) : ''}
    </div>

    <div class="block">
      <div class="blabel" style="color:${acColor}">📝 Texto da postagem</div>
      <div class="tbox" id="texto-${item.id}">${item.texto}</div>
      <button class="copybtn" onclick="cp('texto-${item.id}',this)">Copiar texto</button>
    </div>

    <div class="block">
      <div class="blabel" style="color:#4ade80">🤖 Briefing criativo — ChatGPT / DALL-E 3</div>
      ${paletteHTML(profile)}
      <div class="prompt-wrap">${secs}</div>
    </div>

  </div>
</div>`;
}

function renderPanel(profile){
  const items=CONTENT[profile];
  const el=document.getElementById('p-'+profile);
  const total=items.length;
  const doneN=items.filter(i=>done(i.id)).length;
  const pct=total>0?Math.round(doneN/total*100):0;
  const c={academia:'#e63900',sorveteria:'#f5c800',gympulse:'#f5c200'}[profile];
  const visibleItems = hideDone ? items.filter(i=>!done(i.id)) : items;
  const groups=groupBy(visibleItems,'date');
  let html='';
  Object.keys(groups).sort().forEach(date=>{
    html+=`<div class="dgroup"><div class="dlabel">${fmtDate(date)}</div>`;
    groups[date].forEach(item=>{html+=cardHTML(item,profile);});
    html+='</div>';
  });
  const emptyMsg = hideDone && total>0 && visibleItems.length===0
    ? '<div class="empty"><div class="eico">🎉</div><p>Tudo concluído! Desmarque o filtro para ver tudo de novo.</p></div>'
    : '<div class="empty"><div class="eico">📭</div><p>Sem conteúdo ainda.</p></div>';
  el.innerHTML=`
    <div class="stats">
      <div class="stat"><div class="stat-n">${total}</div><div class="stat-l">Total</div></div>
      <div class="stat"><div class="stat-n" style="color:${c}">${doneN}</div><div class="stat-l">Feito</div></div>
      <div class="stat"><div class="stat-n">${total-doneN}</div><div class="stat-l">Pendente</div></div>
      <div class="stat"><div class="stat-n" style="color:${c}">${pct}%</div><div class="stat-l">Progresso</div></div>
    </div>${html||emptyMsg}`;
}

function renderAll(){
  try {
    // Preservar cards abertos antes de reconstruir
    const _openIds = [];
    document.querySelectorAll('.card.open').forEach(c => _openIds.push(c.id));
    ['academia','sorveteria','gympulse'].forEach(renderPanel);
    // Restaurar cards abertos
    _openIds.forEach(cid => { const el = document.getElementById(cid); if (el) el.classList.add('open'); });
  } catch(err) {
    console.error('Erro em renderAll:', err);
    showToast('⚠️ Erro ao renderizar — recarregue a página');
  }}

function buildHist(){
  const all=[
    ...CONTENT.academia.map(i=>({...i,color:'#e63900',label:'Academia'})),
    ...CONTENT.sorveteria.map(i=>({...i,color:'#f5c800',label:'Sorveteria'})),
    ...CONTENT.gympulse.map(i=>({...i,color:'#f5c200',label:'GympulsePro'}))
  ].sort((a,b)=>b.date.localeCompare(a.date)||a.time.localeCompare(b.time));

  const now = new Date();
  const curMonth = now.getMonth();
  const curYear = now.getFullYear();
  const groups = {};

  all.forEach(item => {
    const [y,m,d] = item.date.split('-').map(Number);
    const dt = new Date(y, m-1, d);
    let gk;

    if (dt.getMonth() === curMonth && dt.getFullYear() === curYear) {
      // Mês atual → agrupar por semana
      const dayOfWeek = dt.getDay();
      const weekStart = new Date(dt);
      weekStart.setDate(dt.getDate() - dayOfWeek);
      const ws = weekStart.toISOString().slice(0,10);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      const we = weekEnd.toISOString().slice(0,10);
      gk = `sem_${ws}`;
      if (!groups[gk]) groups[gk] = {
        label: `🗓️ Semana ${fmtDate(ws)} a ${fmtDate(we)}`,
        sort: ws,
        items: []
      };
    } else {
      // Mês anterior → agrupar por mês
      const mKey = `${y}-${String(m).padStart(2,'0')}`;
      gk = `mes_${mKey}`;
      if (!groups[gk]) {
        const mName = dt.toLocaleDateString('pt-BR', { month:'long', year:'numeric' });
        groups[gk] = {
          label: `📅 ${mName.charAt(0).toUpperCase() + mName.slice(1)}`,
          sort: mKey,
          items: []
        };
      }
    }
    groups[gk].items.push(item);
  });

  const sorted = Object.values(groups).sort((a,b) => b.sort.localeCompare(a.sort));

  document.getElementById('p-historico').innerHTML = sorted.map((g, gi) => `
    <div class="hist-group">
      <div class="hist-group-header" onclick="toggleHistGroup(this)">
        <span>${g.label}</span>
        <span class="hist-group-meta">
          <span class="hist-group-count">${g.items.length} posts</span>
          <span class="hist-group-chev">▼</span>
        </span>
      </div>
      <div class="hist-group-body" style="display:${gi===0?'block':'none'}">
        ${g.items.map(item => `
          <div class="hentry">
            <div class="hdot" style="background:${item.color}"></div>
            <div class="hinfo">
              <div class="htitle">${item.title}</div>
              <div class="hsub">${item.label} · ${item.time} · ${item.format} · ${fmtDate(item.date)}</div>
            </div>
            <div class="hbadge ${done(item.id)?'done':'pend'}">${done(item.id)?'FEITO':'PENDENTE'}</div>
          </div>`).join('')}
      </div>
    </div>`).join('');
}

function toggleHistGroup(el){
  const body = el.parentElement.querySelector('.hist-group-body');
  const chev = el.querySelector('.hist-group-chev');
  if (body.style.display === 'none') {
    body.style.display = 'block';
    chev.style.transform = 'rotate(180deg)';
  } else {
    body.style.display = 'none';
    chev.style.transform = 'rotate(0deg)';
  }
}

function expand(id){document.getElementById('card-'+id).classList.toggle('open');}
function toggleSec(cardId,idx){document.getElementById(`ps-${cardId}-${idx}`).classList.toggle('open');}

function cp(id,btn){
  const el=document.getElementById(id);
  if(!el)return;
  navigator.clipboard.writeText(el.textContent).then(()=>{
    const o=btn.textContent;btn.textContent='✓ Copiado!';
    setTimeout(()=>btn.textContent=o,1500);
  });
}

let activeProfile = 'academia';
function go(tab,el){
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('on'));
  document.getElementById('p-'+tab).classList.add('on');
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('on'));
  el.classList.add('on');
  if(['academia','sorveteria','gympulse'].includes(tab)) activeProfile = tab;
  // Esconder botão Nova Postagem no Histórico/Estratégia
  const npBtn = document.getElementById('newPostBtn');
  if(npBtn) npBtn.style.display = ['historico','estrategia'].includes(tab) ? 'none' : 'flex';
  if(tab==='historico') buildHist();
  if(tab==='estrategia') buildEstrategia();
}

(function(){
  const [yy,mm,dd]=todayBR().split('-').map(Number);
  const n=new Date(Date.UTC(yy,mm-1,dd));
  const dn=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
  const mn=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  document.getElementById('datepill').textContent=`${dn[n.getUTCDay()]} ${dd} ${mn[mm-1]}`;
})();





// ── ESTRATÉGIA ────────────────────────────────────────────────────────────
const ESTRATEGIA = {
  academia: {
    name: 'Planeta Corpo Club+',
    handle: '@planetacorpoclubmais',
    color: '#e63900',
    seguidores: '3.066', posts: '399', meta30: '3.500+', meta90: '5.000+',
    bio: `🏋️ Planeta Corpo Club+
📍 Av. Maria Bettega, 360 — Turvo/PR
💪 Musculação · Funcional · Coletivas · Jump
✨ Qualidade de vida desde 1998
👇 Aula experimental GRÁTIS — link abaixo!`,
    engajamento: [
      'Responder TODOS os comentários nas primeiras 2 horas',
      'Perguntar nos comentários: "Qual seu objetivo?" / "Qual seu maior desafio?"',
      'Convidar para WhatsApp: "Bora conversar? Manda mensagem! 👇"',
      'Stories: usar stickers de enquete, perguntas e contagem regressiva'
    ],
    ctas: [
      {tipo:'Prova social', txt:'Quer chegar lá também? Manda mensagem! 👇'},
      {tipo:'Dica de saúde', txt:'Comenta aqui: qual desses benefícios você mais quer?'},
      {tipo:'Matrícula', txt:'Aula experimental GRÁTIS — link na bio! 💪'},
      {tipo:'Humanização', txt:'Marque alguém que precisa conhecer esse lugar 🧡'},
      {tipo:'Reel', txt:'Salva esse vídeo para não esquecer! ✅'}
    ],
    hashtags: `GRANDES: #fitness #academia #musculação #saudeebemestar #vidafitness

MÉDIAS: #academiaparana #treinodiario #qualidadevida #mulheresativa #saudeemdia #treinofeminino #vidaativa #emagrecimento #treinofuncional #hiit #jump #musculacaofeminina #bemestarsaude #treinando #exerciciofisico

MICRO: #academiaturvoPR #turvoPR #planetacorpo #planetacorpoclubmais #academialocal #treinoturvo #guarapuava #guarapuavafit #interiorpr #cidadeinterior`,
    formatos: [
      {tipo:'Reels', pct:'60%', desc:'Maior alcance — prioridade máxima'},
      {tipo:'Carrosséis', pct:'25%', desc:'Educativo, planos de treino, guias'},
      {tipo:'Posts estáticos', pct:'15%', desc:'Promoções, anúncios, agradecimentos'}
    ],
    acoes: [
      'Atualizar a bio do Instagram com o novo texto',
      'Criar Linktree: WhatsApp + Site + Aula experimental GRÁTIS',
      'Priorizar Reels no lugar de posts estáticos',
      'Responder TODOS os comentários nas primeiras 2 horas',
      'Stories diários com stickers de enquete e perguntas'
    ]
  },

  sorveteria: {
    name: 'Sorvetes Guri',
    handle: '@sorvetesguriturvo',
    color: '#f5c800',
    seguidores: '2.236', posts: '104', meta30: '2.500+', meta90: '3.200+',
    bio: `🍦 Sorvetes Guri — Turvo/PR
🏪 Buffet · Loja de Fábrica · Gourmet
🕐 [HORÁRIO DE FUNCIONAMENTO]
📱 Peça agora — link abaixo!
💬 WhatsApp: (XX) XXXXX-XXXX`,
    engajamento: [
      'Responder TODOS os comentários nos primeiros 30 minutos',
      'Responder TODOS os DMs em até 1 hora',
      'Fazer perguntas: "Qual sabor você provaria?" / "Tag seu sabor favorito!"',
      'Stories: enquetes de sabores, perguntas, contagem regressiva',
      'Lives: 1-2 por mês apresentando produtos ou sabores novos'
    ],
    ctas: [
      {tipo:'Produto do dia', txt:'Peça agora! Link na bio 📱'},
      {tipo:'Promoção', txt:'Só hoje! Corre lá ou chama no WhatsApp 👇'},
      {tipo:'Lançamento', txt:'Qual você provaria? Comenta aí! 🍦'},
      {tipo:'Bastidores', txt:'Tag alguém que ama sorvete! 😍'},
      {tipo:'Enquete', txt:'Qual sabor devemos lançar? Comenta!'}
    ],
    hashtags: `GERAIS: #sorvete #sorveteria #gelato #frozen #sorvetegourmet

REGIONAIS: #turvo #turvopr #parana #sorveteparana #sorveteriaturvo #interiordoparana #sorvetesguriturvo #guriturvo

NICHO: #sorveteprofissional #buffetsorvete #sorvetesartesanais #sorvetesabores #acai #milkshake #picolé #sorvetederua

TENDÊNCIA: #sorveterialocal #comidaboa #foodporn #reelsinstagram #foodlovers #saboreie #experimenteaqui #sorvetedodia #temsorvete`,
    formatos: [
      {tipo:'Reels', pct:'3-4/sem', desc:'Primeiros 3s mostram produto irresistível'},
      {tipo:'Stories', pct:'2-3x/dia', desc:'Promoção do dia, bastidores, enquetes'},
      {tipo:'Feed', pct:'4-5/sem', desc:'Fotos de produto, lançamentos, promoções'},
      {tipo:'Lives', pct:'1-2/mês', desc:'Apresentação de sabores novos'}
    ],
    acoes: [
      'Atualizar bio com horário de funcionamento e WhatsApp',
      'Criar 4 Reels com primeiros 3 segundos mostrando o produto',
      'Fazer 1 Live apresentando sabor novo este mês',
      'Responder TODOS comentários em 30 min e DMs em 1 hora',
      'Story diário com enquete de sabores'
    ]
  },

  gympulse: {
    name: 'GympulsePro',
    handle: '@gympulsepro',
    color: '#f5c200',
    seguidores: '2', posts: '4', meta30: '50+', meta90: '200+',
    bio: `🎮 GympulsePro — Gamificação para Academias
⚡ Monitor ao vivo · Rankings · Fitcoins
🏆 Retenção comprovada de alunos
📱 Demo gratuita — link abaixo!
👇 Agende agora e veja ao vivo`,
    engajamento: [
      'Comentar em 10-15 posts de academias brasileiras por dia',
      'Responder TODOS os comentários imediatamente',
      'Responder DMs em até 1 hora',
      'Stories diários com polls e dúvidas de gestores',
      'Interagir com fitness coaches e personal trainers'
    ],
    ctas: [
      {tipo:'Educativo', txt:'Seu negócio já usa gamificação? Comenta aí! 👇'},
      {tipo:'Case study', txt:'Quer esse resultado? Agenda uma demo gratuita! Link na bio 🚀'},
      {tipo:'Funcionalidade', txt:'Quer ver ao vivo? Manda mensagem! 🎮'},
      {tipo:'Dado', txt:'Isso está acontecendo na sua academia? Comenta 👇'},
      {tipo:'Reel', txt:'Salva e manda pro dono da sua academia! 💪'}
    ],
    hashtags: `PRODUTO: #gympulse #gympulsepro #gamificacaofitness #gamificacaoacademia #academiagamificada #fittech #gestacadeacademia #plataformaacademia

FITNESS: #academia #treinomotivacao #musculacao #fitness #vidasaudavel #transformacaofisica #desafiofitness #academiamoderna

NEGÓCIO: #saas #empreendedor #negociodigital #software #inovacao #startup #growthhacking #leadgeneration

TECH: #techforgym #academiadigital #tecnologiaesportiva #retencaodealunos #engajamentofitness #rankingacademia`,
    formatos: [
      {tipo:'Reels', pct:'3x/sem', desc:'Demo rápida 15-30s com hook impactante'},
      {tipo:'Carrosséis', pct:'2x/sem', desc:'Educativos 5-7 slides sobre gamificação'},
      {tipo:'Post estático', pct:'1x/sem', desc:'Case study, estatística, depoimento'},
      {tipo:'Stories', pct:'Diários', desc:'Bastidores, polls, dúvidas respondidas'}
    ],
    acoes: [
      'Comentar em 10-15 perfis de academias hoje',
      'Gravar 3 Reels de demo rápida (15-30 segundos)',
      'Ativar ads R$20-50/dia segmentando donos de academia na semana 2',
      'Fechar 2+ academias parceiras para shoutouts mútuos no mês 1',
      'Criar série "Academia da Semana" destacando clientes'
    ]
  }
};

function buildEstrategia() {
  const el = document.getElementById('p-estrategia');
  const profiles = ['academia','sorveteria','gympulse'];
  const labels = ['🏋️ Academia','🍦 Sorveteria','🎮 GympulsePro'];

  let html = '';

  profiles.forEach((profile, pi) => {
    const d = ESTRATEGIA[profile];
    const c = d.color;
    const isLast = pi === profiles.length - 1;

    // Metas grid
    const metasHTML = `
      <div class="strat-grid">
        <div class="strat-card">
          <div class="strat-card-label">Seguidores atuais</div>
          <div class="strat-card-value" style="color:${c}">${d.seguidores}</div>
          <div class="strat-card-sub">${d.posts} posts publicados</div>
        </div>
        <div class="strat-card">
          <div class="strat-card-label">Meta 30 dias</div>
          <div class="strat-card-value" style="color:${c}">${d.meta30}</div>
          <div class="strat-card-sub">Meta 90 dias: ${d.meta90}</div>
        </div>
      </div>`;

    // CTAs
    const ctasHTML = d.ctas.map(cta => `
      <div class="strat-cta-item">
        <span class="strat-cta-type" style="background:${c}22;color:${c}">${cta.tipo}</span>
        <span class="strat-cta-text">${cta.txt}</span>
        <button class="copybtn" style="margin:0;flex-shrink:0" onclick="cpText('${cta.txt.replace(/'/g,"\'")}',this)">Copiar</button>
      </div>`).join('');

    // Formatos
    const fmtsHTML = d.formatos.map(f => `
      <div class="strat-cta-item">
        <span class="strat-cta-type" style="background:${c}22;color:${c}">${f.tipo}</span>
        <span class="strat-cta-text"><strong>${f.pct}</strong> — ${f.desc}</span>
      </div>`).join('');

    // Engajamento
    const engHTML = d.engajamento.map((e,i) => `
      <div class="strat-action">
        <div class="strat-action-num" style="background:${c}22;color:${c}">${i+1}</div>
        ${e}
      </div>`).join('');

    // Ações imediatas
    const acoesHTML = d.acoes.map((a,i) => `
      <div class="strat-action">
        <div class="strat-action-num" style="background:rgba(74,222,128,0.15);color:#4ade80">${i+1}</div>
        ${a}
      </div>`).join('');

    html += `
    <div class="strat-profile">
      <div class="strat-profile-header">
        <div class="strat-profile-dot" style="background:${c}"></div>
        <div>
          <div class="strat-profile-name">${d.name}</div>
          <div class="strat-profile-handle">${d.handle}</div>
        </div>
      </div>

      ${metasHTML}

      <div class="strat-section" style="margin-top:16px">
        <div class="strat-label" style="color:${c}">📝 Bio pronta para copiar</div>
        <div class="strat-box bio" id="bio-${profile}">${d.bio}</div>
        <button class="copybtn" onclick="cp('bio-${profile}',this)">Copiar bio</button>
      </div>

      <div class="strat-section">
        <div class="strat-label" style="color:${c}">🎯 CTAs por tipo de post</div>
        <div class="strat-cta-list">${ctasHTML}</div>
      </div>

      <div class="strat-section">
        <div class="strat-label" style="color:${c}">#️⃣ Hashtags (copiar bloco completo)</div>
        <div class="strat-box hashtags" id="ht-${profile}">${d.hashtags}</div>
        <button class="copybtn" onclick="cp('ht-${profile}',this)">Copiar hashtags</button>
      </div>

      <div class="strat-section">
        <div class="strat-label" style="color:${c}">📐 Mix de formatos</div>
        <div class="strat-cta-list">${fmtsHTML}</div>
      </div>

      <div class="strat-section">
        <div class="strat-label" style="color:${c}">💬 Regras de engajamento</div>
        <div class="strat-action-list">${engHTML}</div>
      </div>

      <div class="strat-section">
        <div class="strat-label" style="color:#4ade80">🚀 Ações imediatas</div>
        <div class="strat-action-list">${acoesHTML}</div>
      </div>

      ${!isLast ? '<div class="strat-divider"></div>' : ''}
    </div>`;
  });

  el.innerHTML = html;
}

function cpText(txt, btn) {
  navigator.clipboard.writeText(txt).then(() => {
    const o = btn.textContent;
    btn.textContent = '✓';
    setTimeout(() => btn.textContent = o, 1500);
  });
}

// ── SUPABASE SYNC ────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://ndzbfvxnallshfiouszk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_cEA3C8OvJgZfeZmbnfVYJg_3wuW1YAt';

// deleted_cards accumulates locally forever (old test clicks, stale ids from
// months ago) and was never meant to leave the browser it happened in. The
// first time this device runs the cross-device delete sync below, freeze
// whatever is already in deleted_cards as "legacy" so it's never pushed to
// Supabase — only ids deleted AFTER this point (genuinely new, deliberate
// clicks on 🗑️ Excluir) are eligible to sync to other devices.
if (!localStorage.getItem('deleted_legacy_baseline_set')) {
  localStorage.setItem('deleted_legacy_ignore', localStorage.getItem('deleted_cards') || '[]');
  localStorage.setItem('deleted_legacy_baseline_set', '1');
}
function getSyncableDeletedIds() {
  let raw = [];
  try { raw = JSON.parse(localStorage.getItem('deleted_cards') || '[]'); } catch(e) {}
  let legacy = [];
  try { legacy = JSON.parse(localStorage.getItem('deleted_legacy_ignore') || '[]'); } catch(e) {}
  const legacySet = new Set(legacy);
  return raw.filter(id => !legacySet.has(id));
}

function setSyncStatus(status) {
  const dot = document.getElementById('syncDot');
  const label = document.getElementById('syncLabel');
  if (!dot || !label) return;
  if (status === 'syncing') {
    dot.className = 'sync-dot syncing';
    label.textContent = 'Sincronizando';
  } else if (status === 'synced') {
    dot.className = 'sync-dot synced';
    label.textContent = 'Sincronizado';
  } else {
    dot.className = 'sync-dot';
    label.textContent = 'Offline';
  }
}

async function supabaseFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates',
      ...(options.headers || {})
    }
  });
  return res;
}

async function pullRemoteState() {
  setSyncStatus('syncing');
  try {
    const res = await supabaseFetch('painel_gilson_state?select=key,value');
    if (!res.ok) throw new Error('fetch failed');
    const rows = await res.json();
    const doneRow = rows.find(r => r.key === 'done');
    const editsRow = rows.find(r => r.key === 'edits');
    const imagesRow = rows.find(r => r.key === 'images');
    const publishedRow = rows.find(r => r.key === 'published');
    const reviewedRow = rows.find(r => r.key === 'reviewed');
    const dynamicRow = rows.find(r => r.key === 'gympulse_dynamic_cards');
    const deletedRow = rows.find(r => r.key === 'deleted');

    let changed = false;

    if (deletedRow && Array.isArray(deletedRow.value)) {
      let localDeleted = [];
      try { localDeleted = JSON.parse(localStorage.getItem('deleted_cards') || '[]'); } catch(e) {}
      const mergedDeleted = Array.from(new Set([...localDeleted, ...deletedRow.value]));
      localStorage.setItem('deleted_cards', JSON.stringify(mergedDeleted));
      mergedDeleted.forEach(id => {
        for (const profile of ['academia','sorveteria','gympulse']) {
          const idx = CONTENT[profile].findIndex(c => c.id === id);
          if (idx > -1) {
            CONTENT[profile].splice(idx, 1);
            delete S[id];
            localStorage.removeItem('img_' + id);
            localStorage.removeItem('carousel_' + id);
            localStorage.removeItem('edits_' + id);
            localStorage.removeItem('pub_' + id);
            localStorage.removeItem('reviewed_' + id);
          }
        }
      });
      save();
    }

    if (dynamicRow && dynamicRow.value) {
      try {
        const dynCards = dynamicRow.value;
        let parsedCards = typeof dynCards === 'string' ? JSON.parse(dynCards) : dynCards;
        // Excluir da injeção qualquer card que já foi apagado (localmente ou
        // em outro dispositivo) — sem isso, cards -dyn- excluídos voltavam
        // sempre, porque essa injeção ignorava a lista de deletados.
        let deletedIdsForDyn = [];
        try { deletedIdsForDyn = JSON.parse(localStorage.getItem('deleted_cards') || '[]'); } catch(e) {}
        const deletedSetForDyn = new Set(deletedIdsForDyn);
        if (Array.isArray(parsedCards)) parsedCards = parsedCards.filter(c => !deletedSetForDyn.has(c.id));
        if (Array.isArray(parsedCards) && parsedCards.length > 0) {
          // Inject into Academia tab (not Gympulse)
          CONTENT.academia = CONTENT.academia.filter(c => !c.id.includes('-dyn-'));
          CONTENT.academia.unshift(...parsedCards);
          // Auto-populate img_ localStorage so the image shows as ready without manual upload
          parsedCards.forEach(card => {
            if (card.driveUrl && !getImageData(card.id)) {
              const fileName = card.driveUrl.split('/').pop() || 'ranking.svg';
              setImageData(card.id, {
                status: 'ok',
                fileName: fileName,
                viewUrl: card.driveUrl,
                thumbnailLink: card.driveUrl,
                zernioStatus: 'ok',
                zernioUrl: card.driveUrl
              });
            }
          });
          changed = true;
        }
      } catch(e){}
    }

    if (doneRow && doneRow.value) {
      Object.keys(doneRow.value).forEach(id => {
        if (!PENDING.done.has(id)) {
          S[id] = doneRow.value[id];
        }
      });
      save();
    }
    if (editsRow && editsRow.value) {
      Object.keys(editsRow.value).forEach(id => {
        if (!PENDING.edits.has(id)) {
          localStorage.setItem('edits_' + id, JSON.stringify(editsRow.value[id]));
        }
      });
      applySavedEdits();
    }
    if (imagesRow && imagesRow.value) {
      Object.keys(imagesRow.value).forEach(id => {
        if (!PENDING.images.has(id)) {
          localStorage.setItem('img_' + id, JSON.stringify(imagesRow.value[id]));
        }
      });
      applySavedImages();
    }
    if (publishedRow && publishedRow.value) {
      Object.keys(publishedRow.value).forEach(id => {
        if (!PENDING.published.has(id)) {
          localStorage.setItem('pub_' + id, JSON.stringify(publishedRow.value[id]));
        }
      });
      applySavedPublished();
    }
    if (reviewedRow && reviewedRow.value) {
      Object.keys(reviewedRow.value).forEach(id => {
        if (!PENDING.reviewed.has(id)) {
          setReviewed(id, !!reviewedRow.value[id]);
        }
      });
    }
    // 🔐 'reviewed' é sincronizado aqui para que as mudanças cheguem em todos os lugares
    // desde que não tenha edição pendente no PENDING
    setSyncStatus('synced');
  } catch (e) {
    console.error('❌ Erro em pushRemoteState:', e.message, e);
    setSyncStatus('offline');
  }
}

// ── FALLBACK: merge manual via read-merge-write ──
// Usado quando a RPC merge_panel_state não existe ou falha.
async function manualMergePatches(patches) {
  // 1. Ler estado atual do Supabase
  const res = await supabaseFetch('painel_gilson_state?select=key,value');
  if (!res.ok) throw new Error('Falha ao ler estado para merge manual');
  const rows = await res.json();
  const getRow = (k) => (rows.find(r => r.key === k) || {}).value || {};
  const getArr = (k) => { const v = (rows.find(r => r.key === k) || {}).value; return Array.isArray(v) ? v : []; };

  // 2. Mesclar cada chave
  const upserts = [];
  const now = new Date().toISOString();
  if (patches.done) {
    const merged = { ...getRow('done'), ...patches.done };
    upserts.push({ key: 'done', value: merged, updated_at: now });
  }
  if (patches.edits) {
    const merged = { ...getRow('edits'), ...patches.edits };
    upserts.push({ key: 'edits', value: merged, updated_at: now });
  }
  if (patches.images) {
    const merged = { ...getRow('images'), ...patches.images };
    upserts.push({ key: 'images', value: merged, updated_at: now });
  }
  if (patches.published) {
    const merged = { ...getRow('published'), ...patches.published };
    upserts.push({ key: 'published', value: merged, updated_at: now });
  }
  if (patches.reviewed) {
    const merged = { ...getRow('reviewed'), ...patches.reviewed };
    upserts.push({ key: 'reviewed', value: merged, updated_at: now });
  }
  if (patches.deleted) {
    const merged = Array.from(new Set([...getArr('deleted'), ...patches.deleted]));
    upserts.push({ key: 'deleted', value: merged, updated_at: now });
  }

  // 3. Gravar tudo de volta
  if (upserts.length > 0) {
    const writeRes = await supabaseFetch('painel_gilson_state', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify(upserts)
    });
    if (!writeRes.ok) throw new Error('Falha no merge manual: ' + writeRes.status);
  }
}

async function pushRemoteState() {
  setSyncStatus('syncing');
  try {
    // Coleta o delta local (o que está pendente de sync)
    const localEdits = {};
    const localImages = {};
    const localPublished = {};
    const manifest = {};
    const today = todayBR();
    const seenInManifest = new Set();
    for (const profile of ['academia','sorveteria','gympulse']) {
      CONTENT[profile].forEach(item => {
        if (item.date !== today) return;
        if (seenInManifest.has(item.id)) return;
        seenInManifest.add(item.id);
        // FIX 2: Manifesto inclui TODOS os posts de hoje que ainda não foram
        // publicados no Instagram — independente do status "done" (checklist).
        // O "done" é controle visual do operador, não deve impedir publicação.
        const pubData = getPublishData(item.id);
        const alreadyPublished = !!(pubData && pubData.status === 'ok');
        if (!alreadyPublished && ZERNIO_PROFILES.includes(profile)) {
          manifest[item.id] = { profile, date: item.date, time: item.time, format: item.format, caption: item.texto };
        }
      });
    }
    PENDING.edits.forEach(id => {
      const savedEdit = localStorage.getItem('edits_' + id);
      if (savedEdit) { try { localEdits[id] = JSON.parse(savedEdit); } catch(e) {} }
    });
    PENDING.images.forEach(id => {
      const savedImg = localStorage.getItem('img_' + id);
      if (savedImg) { try { localImages[id] = JSON.parse(savedImg); } catch(e) {} }
    });
    PENDING.published.forEach(id => {
      const savedPub = localStorage.getItem('pub_' + id);
      if (savedPub) { try { localPublished[id] = JSON.parse(savedPub); } catch(e) {} }
    });
    const donePatch = {};
    PENDING.done.forEach(id => { donePatch[id] = !!S[id]; });
    const reviewedPatch = {};
    PENDING.reviewed.forEach(id => { reviewedPatch[id] = getReviewed(id); });
    // Só ids excluídos depois do congelamento de legado (ver getSyncableDeletedIds) —
    // exclusão é monotônica, o merge no servidor só faz união, nunca some.
    const deletedPatch = getSyncableDeletedIds();

    const patches = {};
    if (Object.keys(donePatch).length) patches.done = donePatch;
    if (Object.keys(localEdits).length) patches.edits = localEdits;
    if (Object.keys(localImages).length) patches.images = localImages;
    if (Object.keys(localPublished).length) patches.published = localPublished;
    if (Object.keys(reviewedPatch).length) patches.reviewed = reviewedPatch;
    if (deletedPatch.length) patches.deleted = deletedPatch;

    // FIX 1: Tenta RPC merge_panel_state; se falhar, usa fallback manual.
    if (Object.keys(patches).length > 0) {
      let rpcOk = false;
      try {
        const mergeRes = await supabaseFetch('rpc/merge_panel_state', {
          method: 'POST',
          body: JSON.stringify({ patches })
        });
        rpcOk = mergeRes.ok;
        if (!rpcOk) {
          console.warn('⚠️ merge_panel_state falhou (status ' + mergeRes.status + '), usando fallback manual');
        }
      } catch (rpcErr) {
        console.warn('⚠️ merge_panel_state indisponível, usando fallback manual:', rpcErr.message);
      }
      if (!rpcOk) {
        await manualMergePatches(patches);
      }
    }

    // Manifesto continua sendo uma foto completa (não um delta) — é só um
    // cache derivado do CONTENT de hoje pro cron ler, seguro sobrescrever.
    await supabaseFetch('painel_gilson_state', {
      method: 'POST',
      headers: { 'Prefer': 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify([{ key: 'manifest', value: manifest, updated_at: new Date().toISOString() }])
    });

    // Sucesso — pode limpar a fila local
    PENDING.done.clear();
    PENDING.edits.clear();
    PENDING.images.clear();
    PENDING.published.clear();
    PENDING.reviewed.clear();

    // Puxar o estado consolidado do servidor e aplicar localmente.
    await pullRemoteState();
    renderAll();
    if (typeof buildHist === 'function') buildHist();

    setSyncStatus('synced');
  } catch (e) {
    console.error('❌ Erro em pushRemoteState:', e.message, e);
    setSyncStatus('offline');
  }
}

let pushTimer = null;
let pushInProgress = false;
function scheduleSync() {
  if (pushTimer) clearTimeout(pushTimer);
  setSyncStatus('syncing');
  pushTimer = setTimeout(pushRemoteState, 800);
}

// FIX 3: Envia o estado pendente de forma confiável ao fechar/trocar aba.
// Usa keepalive no fetch (visibilitychange) e sendBeacon como último recurso
// (pagehide/beforeunload) — o browser garante delivery mesmo após tab close.
function buildBeaconPayload() {
  // Monta o manifesto atual pra enviar via sendBeacon
  const manifest = {};
  const today = todayBR();
  const seen = new Set();
  for (const profile of ['academia','sorveteria','gympulse']) {
    CONTENT[profile].forEach(item => {
      if (item.date !== today || seen.has(item.id)) return;
      seen.add(item.id);
      const pubData = getPublishData(item.id);
      const alreadyPublished = !!(pubData && pubData.status === 'ok');
      if (!alreadyPublished && ZERNIO_PROFILES.includes(profile)) {
        manifest[item.id] = { profile, date: item.date, time: item.time, format: item.format, caption: item.texto };
      }
    });
  }
  return JSON.stringify([{ key: 'manifest', value: manifest, updated_at: new Date().toISOString() }]);
}

function flushSyncNow(useKeepalive) {
  if (!pushTimer && !hasPendingSync()) return;
  if (pushTimer) {
    clearTimeout(pushTimer);
    pushTimer = null;
  }
  if (useKeepalive) {
    // visibilitychange: fetch com keepalive garante que o browser completa
    // o request mesmo com a aba em background
    try {
      fetch(`${SUPABASE_URL}/rest/v1/painel_gilson_state`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal'
        },
        body: buildBeaconPayload(),
        keepalive: true
      }).catch(() => {});
    } catch(e) {}
    // Agenda o push completo pro momento em que a aba voltar ao foco
    pushTimer = setTimeout(pushRemoteState, 100);
  } else {
    // pagehide/beforeunload: sendBeacon como último recurso
    try {
      const blob = new Blob([buildBeaconPayload()], { type: 'application/json' });
      navigator.sendBeacon(
        `${SUPABASE_URL}/rest/v1/painel_gilson_state?apikey=${SUPABASE_KEY}`,
        blob
      );
    } catch(e) {}
    // Tenta push normal também (pode completar se o browser permitir)
    pushRemoteState();
  }
}

function hasPendingSync() {
  return PENDING.done.size > 0 || PENDING.edits.size > 0 ||
         PENDING.images.size > 0 || PENDING.published.size > 0 ||
         PENDING.reviewed.size > 0;
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    flushSyncNow(true); // keepalive
  } else {
    // FIX 4: Ao voltar ao foco, re-sincroniza imediatamente
    syncWithRemote();
  }
});
window.addEventListener('pagehide', () => flushSyncNow(false));
window.addEventListener('beforeunload', () => flushSyncNow(false));

// ── COPIAR TUDO ──────────────────────────────────────────────────────────
function copyAll(id) {
  const found = findItem(id);
  if (!found) return;
  const { item } = found;

  let text = `📌 ${item.title}\n🕐 ${item.time} — ${item.format}\n\n`;
  text += `📝 TEXTO DA POSTAGEM:\n${item.texto}\n\n`;

  (item.secoes || []).forEach(s => {
    text += `${s.num} — ${s.titulo}:\n${s.conteudo}\n\n`;
  });

  navigator.clipboard.writeText(text.trim()).then(() => {
    showToast('✓ Card completo copiado!');
  });
}


let editingId = null;
let editingProfile = null;

function findItem(id) {
  for (const profile of ['academia','sorveteria','gympulse']) {
    const item = CONTENT[profile].find(i => i.id === id);
    if (item) return { item, profile };
  }
  return null;
}

function openEdit(id) {
  const found = findItem(id);
  if (!found) return;
  const { item, profile } = found;
  editingId = id;
  editingProfile = profile;

  // Load saved overrides from localStorage
  const saved = JSON.parse(localStorage.getItem('edits_' + id) || '{}');
  const data = { ...item, ...saved };

  document.getElementById('modalTitle').textContent = 'EDITAR — ' + data.title;
  document.getElementById('edit-time').value = data.time || '';
  document.getElementById('edit-format').value = data.format || 'Story';
  document.getElementById('edit-title').value = data.title || '';
  document.getElementById('edit-texto').value = data.texto || '';

  // Load secoes
  const secs = data.secoes || item.secoes || [];
  document.getElementById('edit-sec01').value = secs[0] ? secs[0].conteudo : '';
  document.getElementById('edit-sec02').value = secs[1] ? secs[1].conteudo : '';
  document.getElementById('edit-sec03').value = secs[2] ? secs[2].conteudo : '';

  document.getElementById('editModal').classList.add('on');
  document.body.style.overflow = 'hidden';
}

function closeModal(e) {
  if (e.target === document.getElementById('editModal')) closeModalDirect();
}

function closeModalDirect() {
  document.getElementById('editModal').classList.remove('on');
  document.body.style.overflow = '';
  editingId = null;
  editingProfile = null;
}

function saveEdit() {
  if (!editingId || !editingProfile) return;

  const found = findItem(editingId);
  if (!found) return;
  const { item } = found;

  // Build updated secoes preserving colors/nums
  const updatedSecs = (item.secoes || []).map((s, i) => {
    const fields = [
      document.getElementById('edit-sec01'),
      document.getElementById('edit-sec02'),
      document.getElementById('edit-sec03')
    ];
    return { ...s, conteudo: fields[i] ? fields[i].value : s.conteudo };
  });

  const edits = {
    time:   document.getElementById('edit-time').value,
    format: document.getElementById('edit-format').value,
    title:  document.getElementById('edit-title').value,
    texto:  document.getElementById('edit-texto').value,
    secoes: updatedSecs
  };

  // Save to localStorage
  localStorage.setItem('edits_' + editingId, JSON.stringify(edits));
  PENDING.edits.add(editingId);

  // Apply to CONTENT in memory
  Object.assign(item, edits);

  // Re-render
  renderAll();
  buildHist();
  closeModalDirect();
  showToast();
  pushRemoteState(); // explicit save = sync immediately, don't wait on debounce
}

function showToast(msg) {
  const t = document.getElementById('savedToast');
  if (msg) t.textContent = msg;
  else t.textContent = '✓ Alterações salvas!';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// Apply saved edits on load
function applySavedEdits() {
  const allIds = new Set();
  for (const profile of ['academia','sorveteria','gympulse']) {
    CONTENT[profile].forEach(item => {
      allIds.add(item.id);
      const saved = localStorage.getItem('edits_' + item.id);
      if (saved) {
        try { Object.assign(item, JSON.parse(saved)); } catch(e) {}
      }
    });
  }
  // Restaurar cards criados via Nova Postagem / Reaproveitar que não existem no HTML base
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key.startsWith('edits_')) continue;
    const id = key.replace('edits_', '');
    if (allIds.has(id)) continue; // já existe no CONTENT
    try {
      // Ignorar cards deletados
      var deletedCards = [];
      try { deletedCards = JSON.parse(localStorage.getItem('deleted_cards') || '[]'); } catch(e2) {}
      if (deletedCards.includes(id)) continue;
      const cardData = JSON.parse(localStorage.getItem(key));
      if (!cardData || !cardData.title) continue; // edit sem dados suficientes
      // Determinar profile pelo prefixo do ID ou pelo campo salvo
      let profile = null;
      if (id.startsWith('ac')) profile = 'academia';
      else if (id.startsWith('so')) profile = 'sorveteria';
      else if (id.startsWith('gy')) profile = 'gympulse';
      if (!profile) continue;
      // Montar card mínimo
      const newCard = {
        id: id,
        date: cardData.date || todayBR(),
        time: cardData.time || '12h',
        format: cardData.format || 'Post',
        title: cardData.title || 'Sem título',
        texto: cardData.texto || '',
        secoes: cardData.secoes || [
          {num:'01',cor:'#e63900',titulo:'FORMATO E ESPECIFICAÇÕES',conteudo:'A preencher'},
          {num:'02',cor:'#f5a623',titulo:'INTENÇÃO DA POSTAGEM',conteudo:'A preencher'},
          {num:'03',cor:'#4ade80',titulo:'BRIEFING CRIATIVO DETALHADO',conteudo:'A preencher'}
        ]
      };
      CONTENT[profile].push(newCard);
      allIds.add(id);
    } catch(e) { console.error('Erro ao restaurar card', id, e); }
  }
}

// Sync the hide-done checkbox with the stored preference
const hideDoneCheckEl = document.getElementById('hideDoneCheck');
if (hideDoneCheckEl) hideDoneCheckEl.checked = hideDone;

// Run before first render
applySavedEdits();

// Reconciliação única: antes da fila PENDING persistir no localStorage,
// edições feitas num aparelho podiam ficar presas lá pra sempre sem nunca
// voltar a ser marcadas como "precisa sincronizar" (foi o caso de so86/so87
// — a edição existia só no navegador, nunca tinha chegado no servidor).
// Isso varre uma vez só tudo que já existe localmente e marca como
// pendente, garantindo que suba no próximo sync — depois disso a fila
// persistente já cobre o resto.
if (!localStorage.getItem('pending_reconcile_v1_done')) {
  const allLocalKeys = [];
  for (let i = 0; i < localStorage.length; i++) allLocalKeys.push(localStorage.key(i));
  allLocalKeys.forEach(function (key) {
    if (key.startsWith('edits_')) PENDING.edits.add(key.slice('edits_'.length));
    else if (key.startsWith('img_')) PENDING.images.add(key.slice('img_'.length));
    else if (key.startsWith('pub_')) PENDING.published.add(key.slice('pub_'.length));
    else if (key.startsWith('reviewed_')) PENDING.reviewed.add(key.slice('reviewed_'.length));
  });
  localStorage.setItem('pending_reconcile_v1_done', '1');
}

renderAll();
initGoogleAuth();

// Pull remote state on load, then re-render with synced data, then push once
// to make sure the server-side manifest (used by the auto-publish cron) is
// always fresh — even on days nobody touches the panel.
// Sincronizar com Supabase ao carregar
let lastRemoteSync = 0;
async function syncWithRemote() {
  const now = Date.now();
  // Só sync a cada 30s para não sobrecarregar
  if (now - lastRemoteSync < 30000) return;
  lastRemoteSync = now;
  try {
    // FIX 4: Se há PENDING acumulado (push anterior falhou), retenta o push
    // completo em vez de só puxar. Isso garante retry automático sem depender
    // de ação do usuário.
    if (hasPendingSync()) {
      await pushRemoteState();
    } else {
      await pullRemoteState();
      renderAll();
      if (typeof buildHist === 'function') buildHist();
    }
  } catch(e) { console.error('Sync remoto falhou:', e); }
}
pullRemoteState().then(() => {
  renderAll();
  if (typeof buildHist === 'function') buildHist();
  pushRemoteState();
});

// Polling a cada 30s enquanto página está ativa
setInterval(syncWithRemote, 30000);

// ── DETECTOR DE VERSÃO DESATUALIZADA ────────────────────────────────────
// Abas abertas há muito tempo sem F5 ficam presas rodando um HTML/JS antigo
// pra sempre — foi a causa raiz de vários casos de "sumiu"/"voltou"/"não
// bate" entre dispositivos. Isso detecta quando o deploy mudou e avisa (ou
// atualiza sozinho) em vez de deixar a aba viver desatualizada.
const BUILD_ID = document.querySelector('meta[name="build-id"]').content;
let updateBannerShown = false;
function showUpdateBanner() {
  if (updateBannerShown) return;
  updateBannerShown = true;
  const bar = document.createElement('div');
  bar.id = 'updateBanner';
  bar.textContent = '🔄 Nova versão do painel disponível — clique aqui pra atualizar agora';
  bar.onclick = function () { location.reload(); };
  document.body.prepend(bar);
  // Atualiza sozinho depois de um tempo, mas só se não tiver modal aberto
  // (pra não interromper edição/criação de post em andamento)
  setTimeout(function () {
    if (!document.querySelector('.modal-overlay.on')) location.reload();
  }, 20000);
}
async function checkForUpdate() {
  try {
    const res = await fetch(location.pathname + '?_v=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) return;
    const text = await res.text();
    const match = text.match(/<meta name="build-id" content="([^"]+)">/);
    if (match && match[1] !== BUILD_ID) showUpdateBanner();
  } catch (e) { /* offline — ignora, tenta de novo depois */ }
}
setInterval(checkForUpdate, 60000);
document.addEventListener('visibilitychange', function () {
  if (!document.hidden) checkForUpdate();
});
checkForUpdate();




// ── MELHORIA 2: Carrossel múltiplos slides ──
function getCarouselData(id) {
  try { return JSON.parse(localStorage.getItem('carousel_'+id) || '[]'); } catch(e) { return []; }
}
function setCarouselData(id, data) {
  localStorage.setItem('carousel_'+id, JSON.stringify(data));
}
function carouselSlidesHTML(id, profile) {
  const slides = getCarouselData(id);
  const mainImg = getImageData(id);
  let html = '<div class="carousel-slides">';
  html += '<div class="carousel-label">📑 Slides do Carrossel</div>';

  // Slide 1 = imagem/vídeo principal
  if (mainImg && mainImg.status === 'ok') {
    html += '<div class="carousel-slide"><span>1️⃣ ' + (mainImg.fileName || 'Slide 1') + '</span><span class="slide-ok">✓</span></div>';
  } else {
    html += '<div class="carousel-slide" style="color:var(--txt3)"><span>1️⃣ Envie a mídia principal acima</span></div>';
  }

  // Slides adicionais
  slides.forEach((s, i) => {
    html += '<div class="carousel-slide"><span>' + (i+2) + '️⃣ ' + (s.fileName || 'Slide '+(i+2)) + '</span>';
    html += '<button class="slide-remove" onclick="removeCarouselSlide(\''+id+'\','+i+',\''+profile+'\')">✕</button></div>';
  });

  html += '<button class="slide-add-btn" onclick="addCarouselSlide(\''+id+'\',\''+profile+'\')">+ Adicionar slide</button>';
  html += '</div>';
  return html;
}

function addCarouselSlide(id, profile) {
  ensureDriveAuth((authErr) => {
    if (authErr) { showToast('⚠️ ' + authErr.message); return; }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/mp4,video/quicktime,video/webm';
    input.multiple = true;
    input.onchange = async (e) => {
      const slides = getCarouselData(id);
      for (const file of e.target.files) {

        try {
          const folderId = DRIVE_FOLDER_MAP[profile];
          const data = await uploadFileToDrive(file, folderId);
          slides.push({
            fileId: data.id,
            fileName: file.name,
            viewUrl: data.webViewLink || 'https://drive.google.com/file/d/'+data.id+'/view',
            uploadedAt: new Date().toISOString()
          });
        } catch(err) {
          showToast('❌ Erro ao enviar ' + file.name);
        }
      }
      setCarouselData(id, slides);
      renderAll(); buildHist();
      showToast('✓ ' + e.target.files.length + ' slide(s) adicionado(s)');
    };
    input.click();
  });
}

function removeCarouselSlide(id, index, profile) {
  const slides = getCarouselData(id);
  slides.splice(index, 1);
  setCarouselData(id, slides);
  renderAll(); buildHist();
}

// ── MELHORIA 3: Reaproveitar (clonar) postagem ──
function cloneCard(id, profile) {
  const source = CONTENT[profile].find(c => c.id === id);
  if (!source) { showToast('❌ Card não encontrado'); return; }

  // Preencher modal com dados do card original
  const modal = document.getElementById('cloneModal');
  modal.dataset.sourceId = id;
  modal.dataset.profile = profile;

  // Data padrão: amanhã
  document.getElementById('clone-date').value = dateBR(1);

  // Horário padrão: mesmo do original
  document.getElementById('clone-time').value = source.time;

  // Repetição padrão: nenhuma
  document.getElementById('clone-repeat').value = 'none';
  updateRepeatInfo();

  // Título para referência
  document.getElementById('clone-ref-title').textContent = source.title;

  modal.classList.add('open');
}

function updateRepeatInfo() {
  const repeat = document.getElementById('clone-repeat').value;
  const info = document.getElementById('clone-repeat-info');
  if (repeat === 'none') {
    info.textContent = 'Será criado apenas 1 card na data selecionada.';
  } else if (repeat === 'weekly') {
    info.textContent = 'Serão criados 4 cards: um por semana a partir da data selecionada.';
  } else if (repeat === 'monthly') {
    info.textContent = 'Serão criados 3 cards: um por mês a partir da data selecionada.';
  }
}

function closeCloneModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('cloneModal').classList.remove('open');
}

function executeClone() {
  const modal = document.getElementById('cloneModal');
  const sourceId = modal.dataset.sourceId;
  const profile = modal.dataset.profile;
  const source = CONTENT[profile].find(c => c.id === sourceId);
  if (!source) return;

  const baseDate = document.getElementById('clone-date').value;
  const time = document.getElementById('clone-time').value;
  const repeat = document.getElementById('clone-repeat').value;

  if (!baseDate) { showToast('⚠️ Selecione uma data'); return; }
  if (!time) { showToast('⚠️ Informe o horário'); return; }

  // Calcular datas de criação
  const dates = [baseDate];
  if (repeat === 'weekly') {
    for (let i = 1; i < 4; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + (7 * i));
      dates.push(d.toISOString().slice(0, 10));
    }
  } else if (repeat === 'monthly') {
    for (let i = 1; i < 3; i++) {
      const d = new Date(baseDate);
      d.setMonth(d.getMonth() + i);
      dates.push(d.toISOString().slice(0, 10));
    }
  }

  // ⚠️ VALIDAÇÃO: Verificar se o card original tem imagem
  const sourceImg = getImageData(sourceId);
  if (!sourceImg || sourceImg.status !== 'ok') {
    const cont = confirm('⚠️ O card original não tem imagem!\n\nDeseja continuar mesmo assim?\n(Você precisará adicionar uma imagem ao novo card antes de publicar)');
    if (!cont) {
      showToast('❌ Clone cancelado — imagem obrigatória');
      return;
    }
  }
  const sourceCarousel = getCarouselData(sourceId);

  dates.forEach((dt, idx) => {
    const clone = JSON.parse(JSON.stringify(source));
    clone.id = profile.slice(0, 2) + '_clone_' + Date.now() + '_' + idx;
    clone.date = dt;
    clone.time = time;
    clone.title = '🔄 ' + source.title.replace(/^🔄 /, '');
    CONTENT[profile].push(clone);

    // Persistir o clone em si (não só imagem/carrossel) — sem isso ele só
    // existe na memória desta aba e nunca chega a outro dispositivo.
    localStorage.setItem('edits_' + clone.id, JSON.stringify({
      date: clone.date, time: clone.time, format: clone.format,
      title: clone.title, texto: clone.texto, secoes: clone.secoes
    }));
    PENDING.edits.add(clone.id);

    // Garantir que o clone NÃO herda status "feito"
    delete S[clone.id];
    // Limpar status de publicação (é um post novo)
    localStorage.removeItem('pub_' + clone.id);

    // Copiar mídia do original para o clone
    if (sourceImg && sourceImg.status === 'ok') {
      setImageData(clone.id, JSON.parse(JSON.stringify(sourceImg)));
    }
    if (sourceCarousel && sourceCarousel.length > 0) {
      setCarouselData(clone.id, JSON.parse(JSON.stringify(sourceCarousel)));
    }
  });

  closeCloneModal({ target: modal, currentTarget: modal });
  renderAll();
  buildHist();
  pushRemoteState();

  if (dates.length === 1) {
    showToast('✓ Card clonado para ' + fmtDate(dates[0]));
  } else {
    showToast('✓ ' + dates.length + ' cards criados (' + (repeat === 'weekly' ? 'semanal' : 'mensal') + ')');
  }

  const tab = document.querySelector('.tab[data-p="' + profile + '"]');
  if (tab) tab.click();
}



// ── EXCLUIR CARD ──
function deleteCard(id, profile) {
  const item = CONTENT[profile].find(c => c.id === id);
  if (!item) return;
  const ok = confirm('🗑️ Excluir este card?\n\n"' + item.title + '"\n\nEssa ação não pode ser desfeita.');
  if (!ok) return;
  const idx = CONTENT[profile].findIndex(c => c.id === id);
  if (idx > -1) {
    CONTENT[profile].splice(idx, 1);
    localStorage.removeItem('img_' + id);
    localStorage.removeItem('carousel_' + id);
    localStorage.removeItem('edits_' + id);
    localStorage.removeItem('pub_' + id);
    localStorage.removeItem('reviewed_' + id);
    delete S[id];
    // Marcar como deletado para não voltar do Supabase
    var deleted = [];
    try { deleted = JSON.parse(localStorage.getItem('deleted_cards') || '[]'); } catch(e) {}
    if (!deleted.includes(id)) deleted.push(id);
    localStorage.setItem('deleted_cards', JSON.stringify(deleted));
    // Uma exclusão feita agora, de propósito, sempre tem que sincronizar —
    // mesmo que esse id já estivesse congelado como "legado" (backlog antigo
    // de antes do sync existir). Sem isso, excluir de novo um card que voltou
    // não tinha efeito nenhum nos outros dispositivos: a exclusão nunca saía
    // deste navegador.
    try {
      var legacyIgnore = JSON.parse(localStorage.getItem('deleted_legacy_ignore') || '[]');
      if (legacyIgnore.includes(id)) {
        localStorage.setItem('deleted_legacy_ignore', JSON.stringify(legacyIgnore.filter(function(x){ return x !== id; })));
      }
    } catch(e) {}
    save();
    renderAll();
    buildHist();
    pushRemoteState();
    showToast('🗑️ Card excluído e sincronizado');
  }
}

// ── NOVA POSTAGEM ──────────────────────────────────────────────────────────
let npSelectedFiles = [];

function openNewPostModal() {
  const modal = document.getElementById('newPostModal');
  document.getElementById('np-date').value = todayBR();
  document.getElementById('np-time').value = '10h';
  document.getElementById('np-format').value = 'Story';
  document.getElementById('np-title').value = '';
  document.getElementById('np-texto').value = '';
  document.getElementById('np-schedule-check').checked = false;
  document.getElementById('np-schedule-section').style.display = 'none';
  document.getElementById('np-repeat').value = 'none';
  npSelectedFiles = [];
  document.getElementById('np-media-list').innerHTML = '';
  document.getElementById('np-media-input').removeAttribute('multiple');
  document.getElementById('np-media-hint').textContent = 'Imagem ou vídeo.';
  npFormatChanged();

  // Profile bar
  const profileLabels = {academia:'🏋️ Academia', sorveteria:'🍦 Sorveteria', gympulse:'🎮 GympulsePro'};
  const profileColors = {academia:'#e63900', sorveteria:'#f5c800', gympulse:'#f5c200'};
  let barHtml = '';
  ['academia','sorveteria','gympulse'].forEach(p => {
    const sel = p === activeProfile ? ' np-profile-active' : '';
    barHtml += '<button class="np-profile-opt' + sel + '" style="--pc:' + profileColors[p] + '" data-p="' + p + '" onclick="npSelectProfile(\'' + p + '\')">' + profileLabels[p] + '</button>';
  });
  document.getElementById('np-profile-bar').innerHTML = barHtml;

  modal.classList.add('open');
}

function npSelectProfile(p) {
  activeProfile = p;
  document.querySelectorAll('.np-profile-opt').forEach(el => {
    el.classList.toggle('np-profile-active', el.dataset.p === p);
  });
}

function closeNewPostModal(e) {
  if (e && e.target !== e.currentTarget) return;
  document.getElementById('newPostModal').classList.remove('open');
}

function npFormatChanged() {
  const fmt = document.getElementById('np-format').value;
  const input = document.getElementById('np-media-input');
  const hint = document.getElementById('np-media-hint');
  if (fmt === 'Carrossel') {
    input.setAttribute('multiple', 'true');
    hint.textContent = 'Selecione várias imagens/vídeos para os slides do carrossel.';
  } else if (fmt === 'Reel') {
    input.removeAttribute('multiple');
    hint.textContent = 'Selecione um vídeo para o Reel.';
  } else {
    input.removeAttribute('multiple');
    hint.textContent = 'Imagem ou vídeo.';
  }
}

function npSelectMedia() {
  document.getElementById('np-media-input').click();
}

function npMediaSelected(inputEl) {
  if (!inputEl.files || !inputEl.files.length) return;
  for (const f of inputEl.files) {
    if (f.type.startsWith('video/') && f.type !== 'video/mp4') {
      showToast('📎 ' + f.name + ' será convertido para MP4 ao publicar');
    }
    npSelectedFiles.push(f);
  }
  npRenderMediaList();
  inputEl.value = '';
}

function npRenderMediaList() {
  const list = document.getElementById('np-media-list');
  if (!npSelectedFiles.length) { list.innerHTML = ''; return; }
  list.innerHTML = npSelectedFiles.map((f, i) => {
    const icon = f.type.startsWith('video') ? '🎬' : '🖼️';
    return '<div class="carousel-slide"><span>' + icon + ' ' + f.name + '</span><button class="slide-remove" onclick="npRemoveMedia(' + i + ')">✕</button></div>';
  }).join('');
}

function npRemoveMedia(idx) {
  npSelectedFiles.splice(idx, 1);
  npRenderMediaList();
}

function npToggleSchedule() {
  const checked = document.getElementById('np-schedule-check').checked;
  document.getElementById('np-schedule-section').style.display = checked ? 'block' : 'none';
  if (checked) npRepeatChanged();
}

function npRepeatChanged() {
  const val = document.getElementById('np-repeat').value;
  document.getElementById('np-manual-days').style.display = val === 'none' ? 'block' : 'none';
  document.getElementById('np-repeat-range').style.display = val !== 'none' ? 'block' : 'none';
  if (val !== 'none') {
    const baseDate = document.getElementById('np-date').value || todayBR();
    document.getElementById('np-repeat-start').value = baseDate;
    const endDate = new Date(baseDate);
    if (val === 'weekly') endDate.setDate(endDate.getDate() + 28);
    else endDate.setMonth(endDate.getMonth() + 3);
    document.getElementById('np-repeat-end').value = endDate.toISOString().slice(0,10);
    npUpdateRepeatInfo();
  }
}

function npUpdateRepeatInfo() {
  const val = document.getElementById('np-repeat').value;
  const start = document.getElementById('np-repeat-start').value;
  const end = document.getElementById('np-repeat-end').value;
  if (!start || !end) return;
  const dates = npCalcRepeatDates(val, start, end);
  const info = document.getElementById('np-repeat-info');
  info.textContent = 'Serão criados ' + dates.length + ' posts (' + (val === 'weekly' ? 'semanal' : 'mensal') + ') de ' + fmtDate(start) + ' a ' + fmtDate(end);
}

function npCalcRepeatDates(mode, start, end) {
  const dates = [];
  const d = new Date(start);
  const endD = new Date(end);
  while (d <= endD) {
    dates.push(d.toISOString().slice(0,10));
    if (mode === 'weekly') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
  }
  return dates;
}

function npAddExtraDate() {
  const container = document.getElementById('np-extra-dates');
  const input = document.createElement('input');
  input.className = 'field-input np-extra-date';
  input.type = 'date';
  container.appendChild(input);
}

async function executeNewPost() {
  const profile = activeProfile;
  const baseDate = document.getElementById('np-date').value;
  const time = document.getElementById('np-time').value;
  const format = document.getElementById('np-format').value;
  const title = document.getElementById('np-title').value.trim();
  const texto = document.getElementById('np-texto').value.trim();

  if (!baseDate) { showToast('⚠️ Selecione uma data'); return; }
  if (!title) { showToast('⚠️ Informe um título'); return; }

  // Calcular todas as datas
  let allDates = [baseDate];
  const scheduleOn = document.getElementById('np-schedule-check').checked;

  if (scheduleOn) {
    const repeat = document.getElementById('np-repeat').value;
    if (repeat === 'none') {
      // Dias manuais
      document.querySelectorAll('.np-extra-date').forEach(el => {
        if (el.value && !allDates.includes(el.value)) allDates.push(el.value);
      });
    } else {
      const start = document.getElementById('np-repeat-start').value;
      const end = document.getElementById('np-repeat-end').value;
      if (start && end) allDates = npCalcRepeatDates(repeat, start, end);
    }
  }

  // Upload de arquivos se houver
  let uploadedFiles = [];
  if (npSelectedFiles.length > 0 && hasValidDriveToken()) {
    showToast('📤 Enviando arquivos...');
    const folderId = DRIVE_FOLDER_MAP[profile];
    for (const file of npSelectedFiles) {
      try {
        const data = await uploadFileToDrive(file, folderId);
        uploadedFiles.push({
          fileId: data.id,
          fileName: file.name,
          fileType: file.type,
          viewUrl: data.webViewLink || 'https://drive.google.com/file/d/' + data.id + '/view',
          thumbnailLink: data.thumbnailLink || ''
        });
      } catch(err) {
        showToast('❌ Erro ao enviar ' + file.name);
      }
    }
  }

  // Criar posts
  allDates.forEach((dt, idx) => {
    const newId = profile.slice(0,2) + '_new_' + Date.now() + '_' + idx;
    const card = {
      id: newId,
      date: dt,
      time: time,
      format: format,
      title: title,
      texto: texto || '',
      secoes: [
        { num:'01', cor:'#e63900', titulo:'FORMATO E ESPECIFICAÇÕES', conteudo: formatSpec(format) },
        { num:'02', cor:'#f5a623', titulo:'INTENÇÃO DA POSTAGEM', conteudo: 'A preencher' },
        { num:'03', cor:'#4ade80', titulo:'BRIEFING CRIATIVO DETALHADO', conteudo: 'A preencher' }
      ]
    };
    CONTENT[profile].push(card);

    // Persistir o card em si (não só done/imagem/publicado) — sem isso ele
    // só existe na memória desta aba e nunca chega a outro dispositivo.
    localStorage.setItem('edits_' + newId, JSON.stringify({
      date: card.date, time: card.time, format: card.format,
      title: card.title, texto: card.texto, secoes: card.secoes
    }));
    PENDING.edits.add(newId);

    // Associar primeira imagem ao card
    if (uploadedFiles.length > 0) {
      const mainFile = uploadedFiles[0];
      setImageData(newId, {
        status: 'ok',
        fileId: mainFile.fileId,
        viewUrl: mainFile.viewUrl,
        thumbnailLink: mainFile.thumbnailLink,
        fileName: mainFile.fileName,
        uploadedAt: new Date().toISOString(),
        zernioStatus: 'n/a'
      });
      // Slides adicionais para Carrossel
      if (format === 'Carrossel' && uploadedFiles.length > 1) {
        const extraSlides = uploadedFiles.slice(1).map(f => ({
          fileId: f.fileId,
          fileName: f.fileName,
          viewUrl: f.viewUrl,
          uploadedAt: new Date().toISOString()
        }));
        setCarouselData(newId, extraSlides);
      }
    }
  });

  closeNewPostModal({target: document.getElementById('newPostModal'), currentTarget: document.getElementById('newPostModal')});
  renderAll();
  buildHist();
  scheduleSync();

  // Salvar imediatamente no Supabase para não perder dados
  pushRemoteState();

  if (allDates.length === 1) {
    showToast('✅ Postagem criada e salva!');
  } else {
    showToast('✅ ' + allDates.length + ' postagens criadas e salvas!');
  }

  const tab = document.querySelector('.tab[data-p="' + profile + '"]');
  if (tab) tab.click();
}

function formatSpec(fmt) {
  const specs = {
    'Story': 'Tipo: Story Instagram\nDimensões: 1080 × 1920px (proporção 9:16)\nResolução: 72 DPI\nZona segura: manter elementos entre 150px das bordas superior e inferior',
    'Post': 'Tipo: Post Feed Instagram\nDimensões: 1080 × 1080px (proporção 1:1)\nResolução: 72 DPI',
    'Carrossel': 'Tipo: Carrossel Instagram\nDimensões: 1080 × 1080px por slide (proporção 1:1)\nResolução: 72 DPI\nMáximo: 10 slides',
    'Reel': 'Tipo: Reel Instagram\nDimensões: 1080 × 1920px (proporção 9:16)\nResolução: 72 DPI\nDuração: até 90 segundos'
  };
  return specs[fmt] || specs['Post'];
}

// Atualizar info quando datas mudam
document.addEventListener('change', function(e) {
  if (e.target.id === 'np-repeat-start' || e.target.id === 'np-repeat-end') npUpdateRepeatInfo();
});


// ── DESFAZER PUBLICAÇÃO ──




function unpublishCard(id) {
  var ok = confirm('Confirma que este post NAO foi publicado no Instagram?\nIsso vai reverter o status para pendente.');
  if (!ok) return;
  localStorage.removeItem('pub_' + id);
  var found = findItem(id);
  if (found) rerenderPublishBlock(id, found.profile);
  renderAll();
  buildHist();
  scheduleSync();
  showToast('Status revertido — card pendente novamente');
}

// ── CONVERSÃO DE MÍDIA ──
async function convertImageToJpeg(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(blob => {
        URL.revokeObjectURL(url);
        if (!blob) { reject(new Error('Conversão falhou')); return; }
        const newName = file.name.replace(/\.[^.]+$/, '.jpg');
        resolve(new File([blob], newName, { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.92);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagem inválida')); };
    img.src = url;
  });
}

async function compressVideo(file) {
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('Conversão demorou muito — tente um vídeo mais curto')), 120000));
  showUploadProgress(0, 'Comprimindo ' + file.name + '...');
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  const url = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    video.onloadedmetadata = async () => {
      const duration = video.duration;
      if (!duration || duration > 90) {
        URL.revokeObjectURL(url);
        hideUploadProgress();
        reject(new Error('Vídeo tem mais de 90s (limite do Reel)'));
        return;
      }

      // Escalar para 720p max mantendo proporção
      let w = video.videoWidth;
      let h = video.videoHeight;
      const maxDim = 480;
      if (w > h) {
        if (h > maxDim) { w = Math.round(w * maxDim / h); h = maxDim; }
      } else {
        if (w > maxDim) { h = Math.round(h * maxDim / w); w = maxDim; }
      }
      // Garantir dimensões pares (exigido por codecs)
      w = w % 2 === 0 ? w : w + 1;
      h = h % 2 === 0 ? h : h + 1;

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');

      let mimeType = 'video/mp4';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp9';
        if (!MediaRecorder.isTypeSupported(mimeType)) mimeType = 'video/webm';
      }

      const stream = canvas.captureStream(24);
      try {
        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaElementSource(video);
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(dest);
        source.connect(audioCtx.destination);
        dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
      } catch(e) {}

      // Bitrate baixo para manter arquivo pequeno (~2Mbps)
      const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 1200000 });
      const chunks = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

      recorder.onstop = () => {
        URL.revokeObjectURL(url);
        hideUploadProgress();
        const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
        const ext = mimeType.includes('mp4') ? '.mp4' : '.webm';
        const newName = file.name.replace(/\.[^.]+$/, '_compressed' + ext);
        const compressed = new File([blob], newName, { type: mimeType.split(';')[0] });
        const sizeMB = (compressed.size / 1024 / 1024).toFixed(1);
        if (compressed.size > 8 * 1024 * 1024) {
          showToast('⚠️ Vídeo comprimido (' + sizeMB + 'MB) ainda grande. Tente um vídeo mais curto.');
        } else {
          showToast('✓ Vídeo comprimido: ' + sizeMB + 'MB (' + w + 'x' + h + ')');
        }
        resolve(compressed);
      };

      recorder.start(1000);
      video.currentTime = 0;
      await video.play();

      const drawFrame = () => {
        if (video.ended || video.paused) { recorder.stop(); return; }
        ctx.drawImage(video, 0, 0, w, h);
        const pct = Math.round((video.currentTime / duration) * 100);
        showUploadProgress(pct, 'Comprimindo ' + file.name + ' (' + pct + '%)');
        requestAnimationFrame(drawFrame);
      };
      drawFrame();
      video.onended = () => { if (recorder.state !== 'inactive') recorder.stop(); };
    };

    video.onerror = () => {
      URL.revokeObjectURL(url);
      hideUploadProgress();
      reject(new Error('Não foi possível abrir o vídeo'));
    };
    video.src = url;
  });
}
// ── LIMPEZA AUTOMÁTICA ──
function cleanupOldPosts() {
  const today = todayBR();
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (!key || (!key.startsWith('edits_') && !key.startsWith('img_') && !key.startsWith('carousel_'))) continue;
    try {
      const dataKey = key.replace(/^(edits_|img_|carousel_)/, 'edits_');
      const editData = JSON.parse(localStorage.getItem(dataKey) || '{}');
      const date = editData.date || today;
      // Limpar posts de ontem ou mais antigos que foram feitos
      if (date < today && editData.done) {
        localStorage.removeItem(key);
      }
    } catch(e) {}
  }
}
// Rodar 1x por dia ao carregar
if (!localStorage.getItem('lastCleanup') || new Date(localStorage.getItem('lastCleanup')).toDateString() !== new Date().toDateString()) {
  cleanupOldPosts();
  localStorage.setItem('lastCleanup', new Date().toISOString());
}
