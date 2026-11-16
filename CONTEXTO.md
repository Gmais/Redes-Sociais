# Contexto do Projeto — Painel de Conteúdo Instagram

> **Última revisão: 16/11/2026.**
> Este arquivo é lido por pessoas **e pelo Modo Automático** (`api/auto-content.js` envia o arquivo inteiro à IA a cada geração, junto com o `voice.md` da marca). Por isso: sem senhas/chaves, curto, e atualizado no mesmo dia em que algo muda. **Campanha com data final vencida vai para "Encerradas" no mesmo dia** — a IA só anuncia o que está em "Ativas".

## 1. O que é o painel
Painel web privado de Gilson Caetano para planejar, executar e registrar o Instagram de três marcas. Cada post vira um card (data, horário, formato, legenda, briefing da imagem). A mídia é enviada ao Instagram pela Zernio (agendamento/publicação) e uma cópia fica no Google Drive. O estado sincroniza entre dispositivos pelo Supabase.

## 2. Regras fixas (todas as marcas)
- **Formatos:** Story = 1080×1920 px (9:16). Post de feed = 1080×1350 px (4:5). O Instagram recusa imagem de feed fora de 0,75:1 a 1,91:1.
- **Sem Reel e sem Carrossel** nos cards gerados (regra de Outubro/2026). O feed é só Post estático, com baixa frequência; o resto do volume é Story. (Vídeo MP4/MOV enviado manualmente pelo painel continua permitido.)
- **Sem texto sobreposto na imagem.** Todo o copy vai na legenda.
- **Hashtags:** Story = 0. Post = exatamente 5, no fim da legenda.
- **Legenda pronta para publicar:** português do Brasil, tom de voz e emojis conforme o `voice.md` da marca, CTA coerente com o objetivo. Sem travessão (— ou –) na legenda.
- **Voz de cada marca:** `instagram/planeta-corpo/voice.md`, `instagram/sorveteria-guri/voice.md`, `instagram/gympulse/voice.md` (legendas aprovadas, palavras proibidas, assuntos evitados, bordão, CTA). Este arquivo manda em fatos, campanhas, formatos e frequência; o `voice.md` manda em como escrever.
- **Nunca inventar** preço, condição, prazo, sabor, funcionalidade, número ou dado. Sem preço confirmado, escrever sem valor.
- **Nunca citar concorrentes.** Diferenciais aparecem de forma indireta.
- **Campanha/promoção:** só anunciar o que está em "Ativas" (seção 5), respeitando a data final. Em "Encerradas", nunca.
- **Datas de conscientização** (saúde mental, câncer de mama, saúde do homem etc.): post institucional, **sem oferta e sem CTA de venda**. Nunca dizer que treinar previne doença ou substitui exame, terapia ou tratamento.
- **Não repetir o mesmo produto/assunto em dias seguidos** nem repetir frases de posts recentes. O painel marca como "parecida" e o Modo Automático reescreve ou descarta.
- **Data da geração manda:** conferir a data do post contra os períodos das campanhas antes de citá-las.

## 3. As três marcas

### Academia Planeta Corpo Club+ (Turvo/PR)
- Desde **1998** (escrever "desde 1998"; não calcular a idade). Av. Maria Bettega, 360, Centro. WhatsApp (42) 99922-2857.
- Instagram @planetacorpoclubmais · www.planetacorpoclubmais.com.br
- Modalidades: musculação, crossfit, dança, spinning, funcional, jump, HIIT, lutas (muay thai/jiu-jitsu), judô infantil, aulas do Prof. Wellinton.
- **Público:** principalmente mulheres de 30 a 40 anos de Turvo, sem apelo atlético; buscam saúde, sono e disposição, não estética nem performance.
- **Tom:** acolhedor, conversa entre amigas, sem linguagem fitness agressiva, sem "GRÁTIS!" gritado, **sem emojis de fogo ou músculo**. Emojis padrão: 🧡 🌿.
- **Paleta:** laranja `#e63900` (principal/CTA), azul escuro `#003f6b` (acento), preto `#1a1a1a`, branco `#ffffff`.
- **Funil:** Prova Social → Dica de Saúde → Convite à Matrícula → Humanização.

### Sorvetes Guri (Turvo/PR)
- Sorveteria com **buffet**, **loja de fábrica** (não é fábrica) e cardápio gourmet. Mascote 3D "Guri".
- Instagram @sorvetesguriturvo_ · www.sorvetesguriturvo.com.br
- **Público:** famílias de Turvo e região, todas as idades; consumo por impulso (calor, tarde, fim de semana) e por ocasião.
- **Tom:** leve, alegre, festivo, familiar — "vizinho querido".
- **Paleta:** azul escuro `#003f6b`, turquesa `#00b4d8`, amarelo `#f5c800` (destaque/CTA), branco.
- **Objetivo:** reconhecimento da marca e visita à loja no mesmo dia.

### GympulsePro (B2B SaaS)
- gympulse.pro · Instagram @gympulse.pro
- **O que é:** plataforma de gamificação para academias; monitora biometria em tempo real (BPM por ANT+/Bluetooth) e transforma em pontos e rankings.
- **Módulos (únicos que podem ser citados):** Monitor ao Vivo, Rankings, Cadastros, Relatórios PDF, Fitcoins, IA de Engajamento (alertas e WhatsApp), Portal do Aluno, Desafios.
- **Público:** donos e gestores de academia, professores de educação física com estúdio.
- **Tom:** profissional, tecnológico, orientado a dados (retenção, ROI, engajamento). Sem fitness genérico. Visual escuro premium.
- **Paleta:** amarelo `#f5c200` (principal), preto `#0d0d0d`, cinza `#1c1c1c`, branco.
- **Funil:** Dado de Mercado → Funcionalidade → Prova Social → Demo.

## 4. Estrutura de conteúdo por marca (regra fixa, Outubro/2026)

### Academia — 3 postagens por dia
- Horários padrão: 07h00, 12h00, 18h30 (ajustar ao melhor engajamento).
- **1 Post por semana (quinta-feira)**. Todo o resto é Story.
- **Humanização:** 1 Post por semana (quinta) + 1 Story por semana. Apresentar um colaborador por vez, nesta ordem de rodízio: David, Lidiane, Ana, Thiago, Wesley, Juliana, João Alexandre, Syonara, Wellinton, Isadora (não repetir a mesma pessoa em poucos dias). Staff: musculação (David, Lidiane, Ana, Thiago, Wesley), recepção (Juliana, Isadora), lutas (João Alexandre), judô infantil (Syonara), aulas do Prof. Wellinton.
- **Modalidade:** pelo menos 1x por semana, alternando Story numa semana e Post na seguinte.
- **Diferenciais** — a cada poucos dias, em rodízio: equipe 100% CREF · estrutura aeróbica completa · ambiente seguro para mulheres · atendimento próximo (conhece seu nome) · mensalidade única para todas as modalidades · tradição desde 1998.
- **Campanha ativa (quando houver):** 1ª semana do mês (dias 1–7) todo dia; 2ª e 3ª semanas (8–21) cerca de 3x por semana; última semana (22 em diante) todo dia.
- Tipos de intenção: Prova Social, Dica de Saúde, Convite à Matrícula, Humanização, Diferencial, Modalidade.

### Sorveteria — 4 postagens por dia
- Horários padrão: 09h00, 12h00, 15h30, 19h00.
- **1 Post por semana (sexta-feira)**. Todo o resto é Story.
- Pilares dentro das 4 postagens do dia:
  1. **Produto da loja** — sempre Story. Item da lista "Loja" (seção 7).
  2. **Produto do buffet** — Story (ou o Post da semana). Item da lista "Buffet" (seção 7).
  3. **Carrinho de Sorvete para eventos** — **no máximo 1 dia por semana** (teto, não mínimo). Serviço de locação para festas e eventos. O painel descarta repetição na mesma semana.
  4. **Humanização** — 1x por semana, de preferência sexta. Apresentar uma atendente: Maria Júlia, Maria Clara, Bruna ou Luiza Helena.
  5. **Encerramento do dia** — todo dia, no horário de fechamento da loja, sempre Story: agradecimento + convite para voltar amanhã, tom leve de "vizinho querido". Usar um **template fixo por dia da semana** (reaproveitar o texto do mesmo dia da semana anterior, trocando só o que mudou). **O título começa com "Encerramento do dia"** (assim o painel não o acusa de repetição).
  6. **Demais slots:** Bastidores, Enquete, Construção de Marca, Relacionamento ou Promoção de campanha ativa (quando houver), sempre Story.
- **Títulos dos cards:** "Produto da loja — <item>", "Produto do buffet — <item>", "Carrinho de Sorvete para eventos", "Humanização — <nome>", "Encerramento do dia — <dia/tema>".
- Tipos de intenção: Produto do Dia, Construção de Marca, Promoção, Relacionamento.
- **Preços:** a lista de produtos veio sem preço. Não citar valor. Só vale preço de campanha que esteja em "Ativas".

### GympulsePro — 1 postagem por dia
- Horário padrão: 12h00.
- **1 Post a cada 15 dias**. Nos outros dias, Story.
- Alternar módulos em rodízio, sem repetir o mesmo módulo ou a mesma estatística em dias seguidos. Só citar dados que estejam neste arquivo ou no bloco "DADOS REAIS" que o Modo Automático recebe (seção 9).

## 5. Campanhas

### Ativas
**Nenhuma campanha ou promoção ativa informada para novembro/2026.**
Enquanto o Gilson não definir uma, usar o mix padrão de cada marca (seção 4), sem citar desconto, brinde, preço promocional nem prazo.

### Encerradas — NÃO anunciar
| Marca | Campanha | Período |
|---|---|---|
| Academia | "Cuidado que se Multiplica" — Outubro Rosa | 01–31/10/2026 (encerrada) |
| Sorveteria | Dia das Crianças — Guri Gurt a R$ 0,99 | até 31/10/2026 (encerrada; o preço R$ 0,99 não vale mais) |
| Academia | "Cuidado que se Multiplica" — Setembro Amarelo | 01–30/09/2026 |
| Academia | "Agosto Vale Mais na Planeta" | agosto/2026 |
| Sorveteria | "Queridinhos do Papai" (Dia dos Pais) | agosto/2026 |
| Sorveteria | "Não Fuja da Dieta!" (smoothies proteicos) | lançada 19/07/2026; pausada desde 01/08 — só voltar se o Gilson pedir |
| Academia | "Mês do Amigo" | junho–31/07/2026 |
| Sorveteria | "Inverno Fitness" | junho–julho/2026 |
| Sorveteria | Férias escolares | 13–24/07/2026 |

## 6. Novidade permanente — MQV (Academia)
Fonte: www.planetacorpoclubmais.com.br/mqv (conferida em 13/10/2026). Serve como conteúdo educativo/de diferencial, **sem virar oferta comercial**.
- **O que é:** Mapeamento de Qualidade de Vida — questionário rápido sobre a rotina do aluno (sono, estresse, dor, trabalho, alimentação, objetivos) para o professor enxergar a pessoa inteira, não só peso e medidas. Frase da página: **"Seu treino começa pelo que acontece fora da academia."**
- **Como funciona:** (1) abrir o link e informar o número de matrícula; (2) responder 40 perguntas de toque no celular, cerca de 5 minutos, sem resposta certa ou errada; (3) o professor recebe a **Roda da Vida** do aluno, 10 pilares com nota de 0 a 100%; (4) refazer a cada **90 dias** para acompanhar a evolução.
- **Os 10 pilares:** Sono · Estresse e ansiedade · Humor e bem-estar · Vida social · Energia e disposição · Dores no corpo · Saúde no trabalho · Alimentação e peso · Condicionamento · Esporte.
- **Benefícios:** treino ajustado ao momento (intensidade, horário, exercícios); conversa mais próxima com o professor; progresso medido além da balança; o professor pode sugerir nutricionista ou fisioterapeuta quando fizer sentido.
- **Como participar:** agendaplanetacorpo.vercel.app/mqv/responder (botão "Responder meu MQV"); sem senha nem app; ter a matrícula em mãos. Público: alunos da Planeta Corpo.
- **Limites:** só a equipe vê o MQV. **Não é diagnóstico médico.** Nunca prometer resultado clínico. A página não informa preço, condições nem cronograma — não inventar.
- CTA sugerido: "Responda seu MQV".

## 7. Produtos da Sorveteria
Lista enviada por Gilson em 18/08/2026 (sem preços).

> **Catálogo real (desde 16/11/2026):** os produtos da loja e do cardápio gourmet, com foto, vêm ao vivo do site da Sorvetes Guri (projeto Siteguri, `lib/guri-catalog.js`). O Modo Automático recebe esse catálogo e ele manda sobre a lista "Loja" abaixo. O gerador de imagem anexa sozinho a foto real do produto do card. Os sabores do **buffet (Caixa 7L)** não estão cadastrados no site: seguem na lista abaixo.

### Loja (itens SEM "Caixa 7L" — pilar 1)
**Picolés de fruta:** abacaxi com hortelã, abacaxi, açaí 50g, água de coco 50g, groselha, limão, maracujá 50g, melancia 50g, morango, tangerina, uva.
**Picolés de leite:** café com chocolate, chocolate, coco branco, coco queimado, leite condensado, leitinho, maçã verde, mamão, maracujá, melão chinês, milho verde, morango, torta de limão 50g, uva 50g, manga 50g.
**Picolés especiais:** paçoca cremosa, uva ao creme, Bonello (choco menta, creme de avelã, iogurte grego com frutas do bosque, pistache), cookie crocante, brownie, doce de leite, alfajor, brigadeiro, flocos, Skimo, tablete, Pinta Língua, unicórnio, Supremo Bianco, Supremo Nero, pé de moleque, Supremo moranguinho, açaí com leitinho 50g, zero açúcar (baunilha, chocolate).
**Sorvete Guri Gurt:** chiclete, leite condensado, maracujá, morango, uva.
**Copas, potes e cones:** Copa sorvete 90ml Boca Loca, Copa sundae baunilha trufado, Copa sorvete 80g uva ao creme, Copa 160g açaí zero açúcar, Pote 1L uva ao creme, Pote 400ml Guri + Chanty morango, Pote 400ml Guri + leite trufado, Pote 1kg açaí com guaraná, Pote 1kg açaí com leitinho, Cone confete, Cone torta alemã, Casquinha La Morena, Mini açaí 105g, Mini bombom coco.
**Baldes 5L / potes 2L (para levar pra casa):** 5L (alfajor, Choco Dream, clássico bombom, iogurte grego com frutas, marula com brigadeiro artesanal, Guri + Chanty morango, Guri + iogurte com amora, Guri + leite trufado, Gelakuka brigadeiro e leite condensado, Gelakuka creme, Gelakuka napolitano); Pote 2L (choco menta, cookie crocante, floresta negra, Mon Laté, olho de sogra, pavê latino, romeu e julieta, torta alemã, torta de limão, mousse de maracujá trufado, cocada cremosa, paçoca cremosa, abacaxi e coco, abacaxi, brigadeiro, chocolate branco, creme, flocos, napolitano, passas ao rum).
**Baldone:** Chocolitano, Flocos, Napolitano.
**Sobremesas e salgados:** Petit gateau chocolate 240g, Petit gateau doce de leite 240g, assado de calabresa com queijo cheddar, bauru de frango, bauru de presunto e queijo, calzone de frango, calzone de palmito, doguinho, hambúrguer.

### Buffet (itens "Caixa 7L" — pilar 2)
Vendidos em caixa de 7 litros para reposição do buffet self-service, incluindo as variações "sorvete sabor", "açaí", "gelatto", "premium" e "zero açúcar":
Açaí tradicional, açaí com leitinho, açaí com avelã, açaí zero açúcar, gelatto sabor pistache, sorvete sabor: chocolate belga, coco com abóbora, fubá com goiabada, manga com abacaxi e hortelã, manga com maracujá, mousse de maracujá trufado, abacaxi, banana caramelizada, Blue Ice, brigadeiro, café com brigadeiro, chiclete, chocolate branco, chocolate, choco menta, clássico bombom, cocada cremosa, coco branco, cookie crocante, creme, creme de cupuaçu, doce de leite, flocos, floresta negra, iogurte grego com frutas do bosque, leite condensado, maracujá, marula com brigadeiro artesanal, milho verde, Mon Laté, morango, nata, olho de sogra, paçoca cremosa, passas ao rum, pavê latino, pistache, romeu e julieta, torta alemã, torta de limão, uva, uva ao creme; sorvete premium sabor alfajor; sorvete premium sabor Choco Dream; sorvete zero açúcar sabor baunilha; sorvete zero açúcar sabor chocolate.

## 8. Estrutura de cada card
1. **Formato / specs** — tipo (Post ou Story), dimensões, regra de hashtags.
2. **Intenção** — pilar, objetivo, público, tom, CTA.
3. **Briefing criativo** — cena, elementos, cores da marca, estilo. Sem texto sobreposto.

Diretrizes visuais: regra 60-30-10 (60% cor dominante/fundo, 30% secundária, 10% destaque só no CTA); pelo menos 30% de área "vazia" para respiro; contraste forte entre texto e fundo; headline responde por ~70% do impacto do texto.

## 9. Referência técnica (não usar nos posts)
- **Repositório:** github.com/Gmais/Redes-Sociais (branch `main`). **Deploy:** push na `main` → Vercel (projeto `redes-sociais`), cerca de 30 s. **Painel:** redes-sociais-gilt-alpha.vercel.app
- **Banco do painel:** Supabase `ggphrgfgckpsspbsguhp`, tabela `painel_gilson_state`. (O projeto `ndzbfvxnallshfiouszk` é o do **GymPulse**, não do painel.)
- **Mídia:** o arquivo vai primeiro para a Zernio (sem login; o link temporário vale **7 dias**) e depois para o Google Drive em segundo plano (cópia permanente; exige "Conectar Drive"). Pastas do Drive: Academia `1xltSXYrcyWBAmJxKMzohjG2uuPSPbkWq` · Sorveteria `1OOZGQK1XO6XMH5K9VfyVXxk9Hdx3U_oS` · Gympulse `1fxOPjshpJS10kbUeWKYm8UQmQMnN3Rt7`.
- **Vídeo:** MP4 ou MOV; até 300 MB (Story até 100 MB). Vídeo único fora de Story sai como Reel.
- **Publicação:** Zernio. Contas: Academia `6ace80c0a737012bc49cb80c` · Sorveteria `6a3916335f7d1751ab4afbe3` · GympulsePro `6a3920625f7d1751ab4b6fdc`. Para trocar a conta de uma marca: conectar a nova na Zernio e criar no Vercel `ZERNIO_ACCOUNT_ACADEMIA` / `ZERNIO_ACCOUNT_SORVETERIA` / `ZERNIO_ACCOUNT_GYMPULSE`, depois Redeploy (posts já agendados continuam na conta antiga).
- **Confirmação:** o cron (GitHub Actions) consulta a Zernio e só marca "publicado" quando o Instagram confirma.
- **Modo Automático:** gera os próximos 3 dias de cada marca ligada, lendo este arquivo inteiro e o `voice.md` da marca (linhas com `[PREENCHER]` são ignoradas); cron diário do Vercel. Conferir se o deploy enxerga os arquivos: `GET /api/auto-content?check=voz` (só mostra tamanhos; 0 = não achou).
- **Dados reais integrados (16/11/2026):** GymFit (catraca da Planeta Corpo) e GymPulse (aulas da Planeta Corpo e totais da plataforma) gravam **só totais e médias** todo dia às 05h30 (Brasília) em `painel_gilson_state` (`dados_gymfit`, `dados_gympulse_planeta`, `dados_gympulse_plataforma`), por `pg_cron` em cada projeto (SQL em `integracoes/`). O Modo Automático da Academia e do GympulsePro recebe esses números; dado com mais de 3 dias é ignorado. Sorveteria: catálogo e fotos vêm ao vivo do site da loja (seção 7).
- **Segredos** (chaves da Zernio, OpenAI/Gemini, tokens) ficam só nas variáveis do Vercel — nunca neste arquivo.

## 10. Como gerar o conteúdo do dia (para o Claude)
Quando o Gilson pedir "gera o conteúdo de [dia]":
1. Ler o `voice.md` de cada marca (seção 2) antes de escrever.
2. Gerar os cards completos (specs + intenção + briefing) seguindo as seções 2 a 5.
3. Passar as legendas pelo `/ig-human` (tira travessão, caracteres invisíveis e vocabulário de IA). Para Post, conferir a primeira linha com `/ig-caption` (o feed só mostra ~125 caracteres).
4. Atualizar o `index.html` e validar a sintaxe do JavaScript antes de commitar.
5. Commit com mensagem clara (ex.: "conteudo 05/11 - ...") e push na `main`.

As skills `ig-*` ficam em `.claude/skills/` (pacote instagram-agent-skill, MIT). Elas procuram a voz em `~/.claude/instagram/voice.md`; neste projeto a voz é por marca, então sempre passar o caminho do `voice.md` da marca no pedido.
