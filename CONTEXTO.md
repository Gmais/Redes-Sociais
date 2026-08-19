# 📋 Painel de Conteúdo Instagram — Contexto do Projeto

## 🎯 Visão Geral
Painel web privado para planejamento, execução e histórico de conteúdo Instagram das três marcas de Gilson Caetano. Ferramenta operacional de execução diária, não de planejamento estratégico. Síncrono entre dispositivos via Supabase + auto-publish para Instagram via API Zernio.

## 🔒 Regra fixa — Dimensões de imagem por formato

Esta regra é fixa e vale para todas as três marcas (Academia, Sorveteria, GympulsePro) e para todos os templates de briefing de imagem:

- **Post / Carrossel**: 1080×1350px (proporção 4:5)
- **Story**: 1080×1920px (proporção 9:16)
- **Nunca gerar imagem fora da faixa 0.75:1 a 1.91:1 para posts de feed** (Post/Carrossel)
- Sem texto sobreposto na imagem (todo copy vai na legenda)


---

## 🏢 Contexto do Negócio

### Três Marcas
1. **Academia Planeta Corpo Club+** (Turvo/PR)
   - Desde 1998
   - Localização: Av. Maria Bettega, 360
   - Contato: (42) 99922-2857
   - Instagram: @planetacorpoclubmais
   - Website: www.planetacorpoclubmais.com.br
   - Público: musculação, crossfit, lutas, judô infantil, recepção
   - Campanha ativa (jun/jul 2026): "Mês do Amigo" (20% desc para referenciador + novo aluno, meta 50-60 novos)

2. **Sorvetes Guri** (Turvo/PR)
   - Sorveteria com buffet, loja de fábrica (não é fábrica) e cardápio gourmet
   - Instagram: @sorvetesguriturvo_
   - Website: www.sorvetesguriturvo.com.br
   - Campanha ativa (jun/jul 2026): "Inverno Fitness" (açaí com whey, linha zero açúcar, 20% desc)

3. **GympulsePro** (B2B SaaS)
   - Plataforma de gamificação para gestão de academias
   - Website: gympulse.pro
   - Instagram: @gympulse.pro
   - Público: proprietários de academias, gerentes, educadores

---

## 🏗️ Infraestrutura Técnica

### Repositório & Deploy
- **GitHub:** `Gmais/Redes-Sociais` (branch `main`)
- **Vercel:** Deploy automático ~30s após push (projeto `redes-sociais`, team `Gilson's projects`)
- **URL ao vivo:** `redes-sociais-gilt-alpha.vercel.app`

### Banco de Dados
- **Supabase:** Projeto `ndzbfvxnallshfiouszk`
- **Tabela:** `painel_gilson_state`
- **Chaves de estado:** `manifest`, `published`, `reviewed`, `images`, `done`, `edits`
- **Sincronização:** ~30s (Supabase sobrescreve dados em HTML estático)

### Integração Google Drive
- **Serviço:** Upload automático de imagens geradas (IA) para Google Drive
- **Conta:** `upload-painel@painel-gilson.iam.gserviceaccount.com`
- **Pastas por marca:** `1-mZJyf6yFvnZhnTGUWhQxjl-OaGz7y1P` (raiz), subpastas por marca

### Publishing (Instagram)
- **Zernio API:** Publishing automático para Instagram
- **IDs de Conta:**
  - Academia: `6a3915825f7d1751ab4af026`
  - Sorveteria: `6a3916335f7d1751ab4afbe3`
  - GympulsePro: `6a3920625f7d1751ab4b6fdc`
- **Auto-publish:** Self-loop endpoint a cada 5 min (máx 5h50m por run), latência típica ~5 min
- **Verificação:** `evaluateDelivery()` checa entrega real no Instagram (não apenas aceição de API)

---

## 📱 Funcionalidades Principais

### Painel de Controle
- **Abas por marca** (Academia / Sorveteria / GympulsePro)
- **Checklist de execução:** feito/não feito por post
- **Modal de edição inline:** horário, formato, título, texto, briefing criativo
- **Botão "📋 Copiar tudo":** exporta conteúdo para clipboard
- **Indicador de sincronização:** ponto visual (laranja = sincronizando, verde = sincronizado)

### Histórico
- Ordem decrescente (mais recente primeiro)
- Rastreamento de posts publicados
- Histórico de edições

### Aba Estratégia
- Bio por perfil
- CTAs (call-to-action) por marca
- Blocos de hashtags (30 por categoria)
- Regras de engajamento

---

## 📊 Padrão de Conteúdo

### Volume Diário
- **Segunda-sexta:** 4 Academia + 4 Sorveteria + 2 GympulsePro = **10 posts/dia**
- **Sábado:** 2 Academia + 6 Sorveteria + 2 GympulsePro = **10 posts/dia**
- Distribuição otimizada para horários de pico por marca

### Estrutura de Card (3 seções)
```
01. FORMATO / SPECS
   - Tipo: Post, Carrossel, Story, Reel
  - Dimensões (regra fixa — Academia, Sorveteria, GympulsePro): Post/Carrossel = 1080×1350px (4:5) | Story = 1080×1920px (9:16)
      - Nunca gerar imagem fora da faixa 0.75:1 a 1.91:1 para posts de feed (Post/Carrossel)
      - Regra hashtags: 5 hashtags em Post, 0 em Story/Carrossel

02. INTENÇÃO DO POST
   - Objetivo: tráfego, engajamento, humanização, promo, educação, etc.
   - Público-alvo
   - Tom de voz

03. BRIEFING CRIATIVO DETALHADO
   - Descrição visual (sem texto sobreposto em imagem)
   - Elementos visuais, cores, estilo
   - Copy (texto do post)
   - Hashtags
```

### Regras de Conteúdo
- ✅ **Sem texto sobreposto em imagens** (regra obrigatória para prompts IA)
- ✅ **Máx 5 hashtags por Post** (regra de Instagram desde dez 2025)
- ✅ **Carrossel favorecido** (altas taxas de save/share)
- ✅ **Mix de formatos** (Post, Carrossel, Story, Reel)
- ✅ **Humanização com staff:** cada colaborador apresentado individualmente
- ✅ **Posicionamento indireto:** referenciar diferenças sem citar concorrentes
- ⚠️ **Academia — reforçar diferenciais com frequência:** Gilson notou (10/07) que os posts recentes estão com poucas postagens de diferencial competitivo. Ao planejar a semana da Academia, incluir pelo menos 1 post de diferencial a cada poucos dias, alternando entre: equipe 100% CREF, estrutura aeróbica completa, ambiente seguro para mulheres, atendimento próximo/personalizado (conhece seu nome), mensalidade única para todas as modalidades (vs. várias mensalidades avulsas), 27 anos de história/tradição em Turvo. Não deixar esse tipo de post cair de lado em favor só de humanização/prova social/convite.

### Diretrizes Visuais e de Leitura (Aplicáveis a todas as marcas)
*O objetivo principal é garantir o equilíbrio visual e a leitura rápida.*

**1. Proporção de Cores (Regra 60-30-10):**
- **60% Cor Dominante:** Geralmente o fundo. Serve como base visual da peça.
- **30% Cor Secundária:** Estrutura o design e dá suporte à marca (textos secundários, caixas, grafismos).
- **10% Cor de Destaque:** Usada exclusivamente para o CTA (Call to Action) e botões de conversão.

**2. Proporção de Textos:**
- **Anúncios Digitais (Meta/Google):** O texto deve ocupar, no máximo, 20% da área total da imagem. Mais do que isso reduz a entrega e o engajamento.
- **Hierarquia de Leitura:** 70% do impacto do texto deve vir do título principal (headline), deixando o restante para subtítulos e corpo.

**3. Boas Práticas Visuais:**
- **Espaço em Branco:** Pelo menos 30% a 40% da peça deve ser "vazia" (respiro) para não cansar os olhos.
- **Contraste Forte:** Texto escuro em fundo claro (ou vice-versa). Nunca use cores parecidas para fundo e tipografia.

### Staff para Posts de Humanização
**Academia:**
- Musculação: David, Lidiane, Ana, Thiago, Wesley
- Recepção: Juliana, Isadora
- Lutas/Muay Thai/Jiu Jitsu: João Alexandre
- Judô Infantil: Syonara
- Benchmark: Prof. Wellinton

**Sorveteria:**
- Atendentes: Maria Júlia, Maria Clara, Bruna, Luiza Helena

---

## 🏋️ Academia — Estrutura Semanal de Conteúdo (regra fixa, atualizada em 19/08/2026)

Ajusta a cadência de Humanização (deixa de ser diária), adiciona um pilar de "Modalidade" e substitui, só para a Academia, a regra genérica de cadência de campanha por uma cadência baseada na semana do mês.

### Humanização (equipe) — não é mais diária
- **1 Post por semana, sempre quinta-feira.**
- **+ 1 Story por semana** (qualquer outro dia).
- Mantém a mesma ordem de rodízio dos colaboradores já usada (ver [[project_gilson_negocios]] "Rotação de humanização da Academia") — só a cadência muda (2 aparições/semana em vez de quase diária), não a ordem.

### Modalidade — pelo menos 1x por semana
- Falar sobre uma das modalidades (Musculação, Dança, Spinning, Funcional, Jump, HIIT, aulas do Prof. Wellinton) pelo menos 1x por semana.
- Alterna o formato a cada semana: numa semana em Story, na semana seguinte em Post.

### Campanha ativa — cadência por semana do mês (substitui, só para a Academia, a regra genérica de "~1 post a cada 3 dias")
- **1ª semana do mês (dias 1-7):** campanha aparece **todo dia** (Story, Reel ou Post, variando o formato e o ângulo).
- **2ª e 3ª semanas (dias 8-21, aprox.):** campanha aparece **~3x por semana**.
- **Última semana do mês (dia 22 até o fim do mês):** campanha aparece **todo dia** de novo.
- Vale para qualquer campanha ativa da Academia (a atual, "Agosto Vale Mais na Planeta", encerrou em 31/08 — aplicar essa cadência assim que a próxima campanha for definida).

---

## 🍦 Sorveteria — Estrutura Diária de Conteúdo (regra fixa, atualizada em 18/08/2026)

Substitui a estrutura anterior (2 Post + 2 Story fixos por horário, ver histórico do index.html até 17/08/2026). A partir daqui, aplicar sempre:

### Regra de formatos
- **Apenas 1 Post por dia.** As demais postagens do dia (geralmente 3) alternam entre **Story** e **Reel**.

### Pilares obrigatórios (dentro dos 4 posts diários)
1. **Produto da loja — todo dia, sempre em Story.** Fala sobre um produto da lista **Loja** abaixo (descrição, variedade, preço).
2. **Produto do buffet — todo dia, alternando Story/Post dia a dia.** Fala sobre um produto da lista **Buffet** abaixo (descrição, variedade, preço). Quando o dia cair em "Post" nessa alternância, esse é o único Post do dia (ocupa a cota da regra acima).
3. **Carrinho de Sorvete para eventos — pelo menos 1 dia por semana.** Post ou Story sobre o serviço de locação do Carrinho de Sorvete Guri para festas de aniversário e eventos.
4. **Humanização — 1x por semana, de preferência sexta-feira.** Apresentar um dos colaboradores da Sorveteria (Maria Júlia, Maria Clara, Bruna, Luiza Helena — ver lista acima).
5. **Demais slots do dia:** seguem o mix padrão já existente (Bastidores, Enquete, Construção de Marca, Relacionamento, Promoção de campanha ativa quando houver), em Story ou Reel.

### ⚠️ Preços não disponíveis
A lista de produtos enviada por Gilson (`produtos - produtos.csv`, 18/08/2026) veio com a coluna de preço em branco. **Não inventar valores** — perguntar a Gilson o preço antes de citar um número específico num post, ou usar linguagem sem valor até ele fornecer.

### Lista de Produtos — Loja (todo item SEM "Caixa 7L sorvete sabor" na descrição, uso: Story diário do pilar 1)
**Picolés de fruta:** abacaxi com hortelã, abacaxi, açaí 50g, água de coco 50g, groselha, limão, maracujá 50g, melancia 50g, morango, tangerina, uva.
**Picolés de leite:** café com chocolate, chocolate, coco branco, coco queimado, leite condensado, leitinho, maçã verde, mamão, maracujá, melão chinês, milho verde, morango, torta de limão 50g, uva 50g, manga 50g.
**Picolés especiais:** paçoca cremosa, uva ao creme, Bonello (choco menta, creme de avelã, iogurte grego com frutas do bosque, pistache), cookie crocante, brownie, doce de leite, alfajor, brigadeiro, flocos, Skimo, tablete, Pinta Língua, unicórnio, Supremo Bianco, Supremo Nero, pé de moleque, Supremo moranguinho, açaí com leitinho 50g, zero açúcar (baunilha, chocolate).
**Sorvete Guri Gurt:** chiclete, leite condensado, maracujá, morango, uva.
**Copas, potes e cones (embalagem individual/família):** Copa sorvete 90ml Boca Loca, Copa sundae baunilha trufado, Copa sorvete 80g uva ao creme, Copa 160g açaí zero açúcar, Pote 1L uva ao creme, Pote 400ml Guri + Chanty morango, Pote 400ml Guri + leite trufado, Pote 1kg açaí com guaraná, Pote 1kg açaí com leitinho, Cone confete, Cone torta alemã, Casquinha La Morena, Mini açaí 105g, Mini bombom coco.
**Baldes 5L/2L (venda para casa):** 5L (alfajor, Choco Dream, clássico bombom, iogurte grego com frutas, marula com brigadeiro artesanal, Guri + Chanty morango, Guri + iogurte com amora, Guri + leite trufado, Gelakuka brigadeiro e leite condensado, Gelakuka creme, Gelakuka napolitano); Pote 2L (choco menta, cookie crocante, floresta negra, Mon Laté, olho de sogra, pavê latino, romeu e julieta, torta alemã, torta de limão, mousse de maracujá trufado, cocada cremosa, paçoca cremosa, abacaxi e coco, abacaxi, brigadeiro, chocolate branco, creme, flocos, napolitano, passas ao rum).
**Baldone:** Chocolitano, Flocos, Napolitano.
**Sobremesas e salgados:** Petit gateau chocolate 240g, Petit gateau doce de leite 240g, assado de calabresa com queijo cheddar, bauru de frango, bauru de presunto e queijo, calzone de frango, calzone de palmito, doguinho, hambúrguer.

### Lista de Produtos — Buffet (todo item "Caixa 7L", uso: pilar 2, Story/Post alternado)
Todos vendidos em caixa de 7 litros para reposição do buffet self-service — inclui as variações "sorvete sabor", "açaí", "gelatto" e "premium"/"zero açúcar":
Açaí tradicional, açaí com leitinho, açaí com avelã, açaí zero açúcar, gelatto sabor pistache, sorvete sabor: chocolate belga, coco com abóbora, fubá com goiabada, manga com abacaxi e hortelã, manga com maracujá, mousse de maracujá trufado, abacaxi, banana caramelizada, Blue Ice, brigadeiro, café com brigadeiro, chiclete, chocolate branco, chocolate, choco menta, clássico bombom, cocada cremosa, coco branco, cookie crocante, creme, creme de cupuaçu, doce de leite, flocos, floresta negra, iogurte grego com frutas do bosque, leite condensado, maracujá, marula com brigadeiro artesanal, milho verde, Mon Laté, morango, nata, olho de sogra, paçoca cremosa, passas ao rum, pavê latino, pistache, romeu e julieta, torta alemã, torta de limão, uva, uva ao creme; sorvete premium sabor alfajor, sorvete premium sabor Choco Dream; sorvete zero açúcar sabor baunilha, sorvete zero açúcar sabor chocolate.

---

## 🎬 Campanhas

### 🟢 ATIVA — Academia: "Cuidado que se Multiplica" (Setembro Amarelo, 01-30/09/2026)
Substitui "Agosto Vale Mais na Planeta" (encerrada 31/08/2026). Kit completo colado por Gilson em 19/08/2026, confirmando que esse é o padrão oficial de campanha (visão geral + pilares + script de vendas + WhatsApp + calendário + posts/stories/reels). Fonte: www.planetacorpoclubmais.com.br/campanha.

**Mecânica:** plano trimestral/semestral/anual = desconto especial + "Tempo de Cuidado" (trimestral 7 dias, semestral 15 dias, anual 1 mês) — a pessoa usa no próprio plano ou presenteia alguém (aluna ativa ou alguém novo, que tem até 30 dias pra iniciar). Anual pago no cartão também ganha fone Bluetooth (brinde limitado). Público: novas matrículas, rematrículas, ex-alunos.

**3 pilares (1 por foco de semana):**
1. "Você também merece cuidado" (autocuidado não é egoísmo) — semana 1
2. "Cuidado que se multiplica" (benefício pode ser presenteado) — semanas 2-3
3. "Setembro é o momento" (urgência, só vale em setembro) — semana 4

**⚠️ Regra de sensibilidade (Setembro Amarelo):** post do dia 10/09 é institucional sobre saúde mental (CVV 188), **sem oferta comercial nem CTA de venda**. Nunca dizer que treino substitui terapia/atendimento profissional.

**Calendário (por semana — distribuir nos dias respeitando a cadência de "🏋️ Academia — Estrutura Semanal de Conteúdo" acima):**
| Semana | Foco | Feed | Stories | Reels |
|---|---|---|---|---|
| 1 (1-6) | Lançamento e conceito | Post 1 — anúncio oficial | Teaser + explicação da escolha | Reel 1 — "Você também merece cuidado" |
| 2 (7-13) | Setembro Amarelo e autocuidado | Post 2 — carrossel "Para quem vai seu Tempo de Cuidado?" | Enquete + dia 10 institucional | Reel 2 — "Cuidado que se multiplica" |
| 3 (14-20) | Benefícios e prova social | Post 3 — anual no cartão + fone | Fone, rotina, depoimento | Reel 3 — "O que cabe na sua rotina?" |
| 4 (21-30) | Fechamento com urgência | Post 4 — últimos dias | Contagem regressiva | — |

**Copy pronta:**
- Post 1: "VOCÊ CUIDA DE TODO MUNDO. MAS QUEM CUIDA DE VOCÊ?" — legenda sobre Tempo de Cuidado (usar ou presentear) + fone no anual no cartão.
- Post 2 (carrossel 6 cards): "Em setembro, o cuidado se multiplica." → "Fechou plano? Você ganha Tempo de Cuidado." → "Trimestral: 7 dias. Semestral: 15 dias. Anual: 1 mês." → "Pode ser para você." → "Ou para alguém que você quer ver se cuidando também." → "Escolha seu plano, aproveite o desconto especial e compartilhe cuidado."
- Post 3: "PLANO ANUAL NO CARTÃO — Desconto especial + 1 mês de Tempo de Cuidado + fone Bluetooth" — "válido durante setembro ou enquanto durarem os fones".
- Post 4: "ÚLTIMOS DIAS PARA MULTIPLICAR CUIDADO." — "Não deixe você para depois."
- Stories (12, temas não datados): teaser → "quem cuida de você?" → benefício → enquete (mim/alguém especial) → tabela 7/15/30 dias → detalhe do anual → rotina real → **dia 10: institucional CVV 188** → caixinha de pergunta → resposta a objeção → fone real → fechamento com contagem regressiva.
- Reel 1 "Você também merece cuidado" (20s): clipes reais + convite pra se colocar na agenda.
- Reel 2 "Para quem vai o seu Tempo de Cuidado?" (15s): treino individual vs. presentear amiga.
- Reel 3 "O plano anual é para quem decidiu se priorizar" (20s): professor falando + cortes de aula, termina com desconto+1mês+fone.

*(Script de vendas/WhatsApp/objeções e checklist operacional do Gilson não entram como card do painel — são material interno das consultoras, guardado à parte na memória do projeto.)*

---

## 🎬 Campanhas Encerradas (histórico)

### Academia: "Mês do Amigo"
- **Slogan:** "Amigo que treina junto, economiza junto."
- **Oferta:** 20% de desconto para referenciador + novo aluno
- **Meta:** 50-60 novos alunos
- **Duração:** Junho/Julho

### Sorveteria: "Inverno Fitness"
- **Slogan:** "Seu treino continua até na sobremesa."
- **Produtos:** Açaí com whey protein, linha zero açúcar
- **Oferta:** 20% de desconto
- **Duração:** Junho/Julho

### Sorveteria: "Não Fuja da Dieta!" (lançamento jul/2026)
- **Slogan:** "Não fuja da dieta!"
- **Produto:** Linha de Smoothies Proteicos Guri — 3 sabores: Zero Baunilha, Zero Chocolate e Açaí Zero, todos com 21g de proteína
- **Preço de lançamento:** R$19,90
- **Status:** Lançada em julho/2026, é uma extensão/evolução da linha fitness já existente (Inverno Fitness — açaí com whey, zero açúcar)
- **Ação necessária:** priorizar essa campanha no conteúdo da Sorveteria a partir do lançamento (19/07), mantendo a linha "Inverno Fitness" como pano de fundo da mesma proposta (sorvete que cabe na dieta)

### Sorveteria: "Queridinhos do Papai" (Ago/2026)
- **Contexto:** Agosto é o mês dos Pais
- **Produtos:** Linha Leve para Casa — sabores Flocos, Brigadeiro e Napolitano
- **Preço promocional:** R$24,90 (cada sabor)
- **Duração:** Mês de agosto/2026 inteiro
- **Ação necessária:** priorizar essa campanha no conteúdo da Sorveteria a partir de 01/08, mas com espaçamento — não repetir a promoção todos os dias pra não ficar cansativo. Seguir a regra geral de cadência de campanha (~1 post a cada 3 dias), variando o ângulo (lançamento, sabor em destaque, praticidade de ter em casa, etc.), e manter o mix normal (produto do dia com outros sabores, construção de marca, relacionamento) rodando nos demais posts

### Sorveteria: Férias Escolares (13 a 24/07)
- **Período:** 13/07 a 24/07/2026 são dias de férias escolares em Turvo/PR
- **Ação necessária:** pensar em postagens específicas para esse período — público muda (crianças/famílias com mais tempo livre durante a semana, não só fim de semana), oportunidade de reforçar visitas em dias úteis, combos família, brincadeiras/atividades para crianças na loja, horários alternativos de pico
- Ao gerar conteúdo da Sorveteria para datas entre 13/07 e 24/07, priorizar ângulo de férias escolares em vez do mix padrão de dia útil

---

## 🔧 Questões Técnicas em Aberto

### Críticas
1. **Chave admin Supabase:** Localização não confirmada — necessária para writes de estado direto do ambiente Claude
2. **HTTP outbound bloqueado:** Claude não consegue chamar Supabase/Vercel de bash — soluções precisam rodar em Vercel ou browser
3. **Chaves Zernio expostas:** API keys `sk_e2fcbf7c`, `sk_8f2dab48` foram expostas em histórico — precisam ser rotacionadas

### Mitigações em Progresso
- Reativar `cron-job.org` como gatilho redundante (ativa independente de self-loop)
- Confirmar e localizar chave admin Supabase
- Rotação de chaves Zernio

#### Semana 1 (01-07 de julho)
**Tema:** Lançamento da campanha | Tom: Convite e curiosidade

- **01/07 (seg) 8h — Story:** "Início oficial do Mês do Amigo — Teaser visual" | Preto + laranja, emojis 🧡
- **01/07 (seg) 17h — Post Feed:** "Anúncio oficial da campanha" | Briefing criativo + copy conversacional | CTA claro: "Trague seu amigo"
- **02/07 (ter) 12h — Story:** Dúvida comum #1 ("Como funciona?") — resposta rápida
- **03/07 (qua) 20h — Bastidores:** Humanização — colaborador falando sobre benefício de treinar com amigo
- **04/07 (qui) 17h — Reel:** "Treinar com amigo" (motivação, diversão, comunidade)
- **05/07 (sex) 8h — Story:** Prova social — "João trouxe sua amiga Maria, ambos ganharam 20% de desconto!"
- **05/07 (sex) 20h — Post Feed:** "Depoimento/case" — Como treinar junto transforma a jornada

#### Semana 2 (08-14 de julho)
**Tema:** Momentum e prova social | Tom: Celebração de resultados iniciais

- **08/07 (seg) 12h — Story:** Contador visual ("X alunos já participaram!")
- **09/07 (ter) 17h — Post Feed:** "Dica de saúde" — Benefícios psicológicos de treinar em dupla
- **10/07 (qua) 20h — Bastidores:** Humanização — outra colaboradora apresentada
- **11/07 (qui) 9h — Story:** Enquete: "Você já convidou seu melhor amigo?"
- **12/07 (sex) 17h — Reel:** "Transformação" — antes/depois de dupla treinando 30 dias
- **13/07 (sab) 15h — Post Feed:** Ajuste sábado — destaque de promoção (2 posts Academia, 6 Sorveteria)
- **14/07 (dom) — Pausa orgânica ou story leve**

#### Semana 3 (15-21 de julho)
**Tema:** Meio da campanha — lembrança urgente | Tom: FOMO positivo ("Não perca!")

- **15/07 (seg) 8h — Story:** "Faltam 16 dias — Traga seu amigo agora!" (urgência gentil)
- **16/07 (ter) 12h — Post Feed:** "Últimas semanas — Aproveita enquanto dura!"
- **17/07 (qua) 20h — Bastidores:** Humanização — colaborador #3
- **18/07 (qui) 17h — Story:** Votação ("Qual horário você e seu amigo vão treinar?")
- **19/07 (sex) 8h — Reel:** Montagem dinâmica — 3 histórias de duplas felizes
- **19/07 (fri) 17h — Post Feed:** Relatório intermediário ("Já somos X novos alunos!")
- **20/07 (sab) 15h — Post Feed:** Ajuste sábado
- **21/07 (dom) — Pausa**

#### Semana 4 (22-31 de julho)
**Tema:** Reta final — Fechamento da campanha | Tom: Urgência e reconhecimento

- **22/07 (seg) 12h — Story:** "Uma semana para terminar! Traga seu amigo agora!"
- **23/07 (ter) 17h — Post Feed:** "Top 5 Duplas da Semana" (prova social + gamificação)
- **24/07 (qua) 20h — Bastidores:** Humanização — colaborador #4
- **25/07 (qui) 9h — Story:** "Últimos dias!" (contagem regressiva visual)
- **26/07 (fri) 17h — Post Feed:** Testemunhais compilado ("Veja o que as duplas estão dizendo")
- **26/07 (fri) 20h — Reel:** Montagem "Mês do Amigo em 15 segundos" (compilation)
- **29/07 (seg) 8h — Story:** "HOJE É O ÚLTIMO DIA!" (urgência total)
- **29/07 (ter) 12h — Post Feed:** Encerramento oficial com números finais
- **31/07 (qua) 20h — Bastidores/Story:** Agradecimento à comunidade + teaser do que vem em agosto

### Estrutura de cada card de conteúdo — Mês do Amigo
*Aplicar este template em todos os posts durante julho:*

**`01` Formato/Specs**
- Story 1080×1920 | Feed 1080×1350 (4:5) | Carrossel 1080×1350 (4:5) | Reel 1080×1920
- Cores obrigatórias: Laranja (#e63900), Preto (#1a1a1a), Branco (#ffffff)
- Emojis: 🧡💛🌿 (sem fogo, sem músculo)
- Sem texto na imagem (todo copy é legenda)

**`02` Intenção do post**
- Funil: Awareness (semana 1) → Consideration (semanas 2-3) → Conversion (semana 4)
- CTA obrigatório: "Traga seu amigo", "Convide agora", "Participe da campanha", "Clique no link"
- Ação esperada: Compartilhamento interno, tagged friends, DM para dúvidas, clique no link da bio

**`03` Briefing criativo detalhado**
- Paleta visual: Laranja destaque, preto fundo, branco texto
- Composição: Centrado, limpo, energético mas acolhedor
- Hierarquia: Slogan → Imagem/Vídeo → Copy → CTA
- Tone: Conversacional, amigável, sem jargão fitness agressivo

### Hashtags — Campanha Mês do Amigo
*30 hashtags por post (padrão Academia):*
#MêsDoAmigo #AmigoQueTreinaJunto #AmigoQuePoupaTambém #AcademiaPlanetaCorpo #TreinoEmDupla #ComunidadeQueMotiva #QualidadeDeVida #AmigosDeTreino #DescontoParaDupla #MatrículaAgora #TreineComMotivaçãoDoble #SaudeCom Amigo #MotivacaoComParceria #AmigoIndica #AmigoSalva #TurvoPR #AcademiaLocal #27AnosDePadrão #SaudePsicológica #ConsistênciaTriplicada #DuplaDeSuccesso #AmigoMelhorQueSuplemento #TreineComemoia #Gym #FitnessComunidade #BenefíciosdoTreino #DescubraseuMelhorAmigo #JuntosSomosFortes #ComunidadeAcademia #CompromissoMútuo

---

## 📈 Métricas & Objetivos

### KPIs Rastreados
- Engajamento (likes, comments, shares) por post
- Taxa de clique (CTR) para links em bio
- Crescimento de followers por marca
- Conversão de referências (Academia "Mês do Amigo")
- Taxa de desconto aplicado (Sorveteria "Inverno Fitness")

### Cadência de Análise
- Semanal: Top posts, trending topics
- Mensal: Performance por campaign, ajuste de volume/mix

---

## 👤 Responsabilidades & Acesso

**Claude:** Execução técnica completa (criação de conteúdo, deploy, troubleshooting)
**Gilson:** Aprovação de estratégia, feedback criativo, decisões de campanha

**Acesso:**
- GitHub token: `ghp_***`
- Vercel team: `team_qNwqDFsenUMf0RhyXOxzC6l1`
- Supabase public key: `sb_publishable_cEA3C8OvJgZfeZmbnfVYJg_3wuW1YAt`

---

## 📚 Referência Rápida

| Recurso | URL/Localização |
|---------|-----------------|
| **Painel ao vivo** | redes-sociais-gilt-alpha.vercel.app |
| **Repositório** | github.com/Gmais/Redes-Sociais |
| **Contexto estratégico** | CONTEXTO.md (raiz do repo) |
| **Pasta Google Drive** | 1-mZJyf6yFvnZhnTGUWhQxjl-OaGz7y1P |
| **Banco de dados** | Supabase project `ndzbfvxnallshfiouszk` |

---

## 📐 ESPECIFICAÇÕES TÉCNICAS POR FORMATO
| Formato | Dimensões | Proporção | Uso |
|---|---|---|---|
| Story | 1080 × 1920px | 9:16 | Engajamento rápido, urgência, bastidores |
| Post Feed | 1080 × 1350px | 4:5 | Alcance, construção de marca, matrículas |
| Carrossel | 1080 × 1350px por slide | 4:5 | Educação, demonstração, narrativa |
| Reel | 1080 × 1920px | 9:16 | Crescimento de seguidores |

> **⚠️ REGRA DE FORMATO (atualizada em 26/06/2026):** Todo **Post de feed** e **Carrossel** deve ser produzido em **1080 × 1350px (proporção 4:5, retrato)** — formato vertical que ocupa mais área no feed do Instagram e tende a ter mais alcance. Aplicar em TODAS as próximas publicações, tanto na seção `01 Formato/Specs` dos cards quanto nos prompts de geração de imagem por IA (gerar a imagem já em 1080×1350). Story e Reel permanecem em 1080 × 1920px (9:16). Mantém-se a regra de **sem texto na imagem** (todo copy vai na legenda).

### Tipos de intenção por perfil
**Academia:** Prova Social, Dica de Saúde, Convite à Matrícula, Humanização
**Sorveteria:** Produto do Dia, Construção de Marca, Promoção, Relacionamento
**GympulsePro:** Dado de Mercado, Funcionalidade, Prova Social, Demo

---

## 🛠️ INFRAESTRUTURA TÉCNICA

### Painel de conteúdo
- **Repositório:** github.com/Gmais/Redes-Sociais
- **Arquivo principal:** `index.html`
- **Deploy:** automático via push no GitHub → Vercel

### GympulsePro
- **Frontend:** Next.js/React no Vercel
- **Banco de dados:** Supabase
- **Edge Functions:** Anthropic API (Claude)

---

## ⚡ COMO EXECUTAR TAREFAS

### Gerar conteúdo do dia
Quando Gilson pedir "gera o conteúdo de [dia]":
1. Gere os cards com o formato completo (formato técnico + intenção + briefing criativo)
2. Atualize o `index.html` com os novos cards (validar sintaxe JS antes de commitar)
3. Faça commit com mensagem clara (ex: "conteúdo 19/06 - ...")
4. Push para o GitHub — Vercel publica automaticamente

**Última atualização:** Jun 29, 2026  
**Status:** Operacional com mitigações em progresso
