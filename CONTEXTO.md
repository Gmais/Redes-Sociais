# 📋 Painel de Conteúdo Instagram — Contexto do Projeto

## 🎯 Visão Geral
Painel web privado para planejamento, execução e histórico de conteúdo Instagram das três marcas de Gilson Caetano. Ferramenta operacional de execução diária, não de planejamento estratégico. Síncrono entre dispositivos via Supabase + auto-publish para Instagram via API Zernio.

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
   - Sorveteria com buffet, loja de fábrica e cardápio gourmet
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
   - Dimensões: 1080×1350px (4:5 portrait) para Post/Carrossel
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

## 🎬 Campanhas Ativas (Jun/Jul 2026)

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
