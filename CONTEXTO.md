# CONTEXTO — GILSON CAETANO
> Arquivo de contexto para o Claude (aqui ou no Antigravity).
> Leia este arquivo SEMPRE antes de gerar qualquer conteúdo ou executar qualquer tarefa.
> Última atualização: 19 de junho de 2026

---

## 🧑 QUEM É GILSON

Gilson Caetano é professor de Educação Física (SEED/PR — Colégio Estadual Edite C. Marques, Guarapuava/PR), dono da academia Planeta Corpo Club+ e da Sorveteria Guri em Turvo/PR, e desenvolvedor/operador do GympulsePro (gympulse.pro), uma plataforma SaaS de gamificação para academias.

**Localização:** Turvo/PR e Guarapuava/PR
**Perfil:** Executa tudo sozinho — ensino, gestão da academia, sorveteria e desenvolvimento de software. Alta capacidade técnica e criativa, mas com tempo extremamente limitado.
**Relação com IA:** Usa Claude como parceiro estratégico e operacional. Prefere respostas diretas, executáveis e sem enrolação.

---

## 🏋️ FRENTE 1 — PLANETA CORPO CLUB+

### Dados gerais
- **Site:** planetacorpoclubmais.com.br
- **Instagram:** @planetacorpoclubmais
- **Endereço:** Av. Maria Bettega, 360 — Centro, Turvo/PR
- **WhatsApp:** (42) 99922-2857
- **Fundação:** 1998 (27+ anos de história)
- **Mensalidade:** R$ 209/mês — todas as modalidades inclusas, horário livre
- **Seguidores Instagram:** ~3.066 | Posts: ~399

### Modalidades
Musculação, Dança, Spinning, Funcional, Jump, HIIT e aulas coletivas

### Público-alvo
- **Primário:** Mulheres de 30 a 40 anos, moradoras de Turvo/PR
- **Perfil:** Pessoas comuns, sem apelo atlético ou estético. Buscam qualidade de vida, saúde, disposição, sono melhor e redução de estresse — NÃO performance ou estética
- **Comportamento:** Têm receio de academia (julgamento, complexidade), valorizam ambiente acolhedor e comunidade local

### Identidade visual
- **Laranja:** `#e63900` — cor principal, CTA, destaques
- **Teal:** `#00b4b4` — acento secundário
- **Preto:** `#1a1a1a` — fundo e overlays
- **Branco:** `#ffffff` — texto principal

### Tom de voz
Acolhedor, próximo, como conversa entre amigas. Sem linguagem fitness agressiva. Sem "GRÁTIS!" gritado. Sem emojis de fogo ou músculo. Usar 🧡💛🌿 como emojis padrão.

### Bio oficial
```
🏋️ Planeta Corpo Club+
📍 Av. Maria Bettega, 360 — Turvo/PR
💪 Musculação · Funcional · Coletivas · Jump
✨ Qualidade de vida desde 1998
👇 Aula experimental GRÁTIS — link abaixo!
```

### Intenção no Instagram
**Converter seguidores em matrículas.** Funil: Prova social → Dica de saúde → Convite direto → Humanização

### Diferenciais competitivos (usar para contrapor concorrência, sem citar nomes)
- ❌ Não apoiamos uso de anabolizantes — saúde de verdade, sem atalhos perigosos
- ✅ Melhor estrutura aeróbica da região
- 🚫 Zero tolerância a assédio com mulheres — ambiente seguro é prioridade
- 🎓 Maior equipe de profissionais com CREF
- 🏠 100% turvense — mais de 27 anos de história local genuína

### Regras de engajamento (obrigatórias)
- Responder comentários e DMs rapidamente
- Stories com enquetes e perguntas
- CTA claro em todo post
- Reels priorizados quando possível

---

## 👥 EQUIPE — COLABORADORES PARA HUMANIZAÇÃO (ROTATIVO)

> Adicionado em 19/06/2026. A postagem de bastidores apresentando o **Prof. Wellinton** (story "Bastidores — Professor Wellinton em ação", 17/06) teve performance muito positiva. Decisão: replicar essa temática apresentando os demais colaboradores da Planeta Corpo Club+, um por vez.

### Lista de colaboradores a apresentar
| Nome | Função |
|---|---|
| David | Musculação |
| Lidiane | Musculação |
| Ana | Musculação |
| Thiago | Musculação |
| Wesley | Musculação |
| Juliana | Recepção |
| Isadora | Recepção |

### Regras de execução
- **Ordem de apresentação:** livre — Claude escolhe a sequência (sugestão: intercalar musculação e recepção para variar o cenário visual)
- **Cadência:** NÃO precisa ser um por dia nem todos na mesma semana — distribuir conforme o calendário de conteúdo, sem forçar
- **Slot recomendado:** seguir o formato que funcionou — Story 20h "Bastidores", no mesmo tom usado com o Prof. Wellinton (humanização, reconhecimento nominal, autenticidade, sem produção pesada)
- **Estrutura do texto:** sempre nomear a pessoa + função, reforçar que o cuidado/atendimento é pessoal (não anônimo), fechar com CTA de marcação de amigos
- **Paleta e restrições:** seguir o padrão já definido (preto `#1a1a1a` overlay mínimo, laranja `#e63900` em detalhes, branco `#ffffff` texto, emojis 🧡💛 apenas)
- **Imagem:** preferencialmente foto real do colaborador atuando (Drive) — se não houver foto disponível, usar foto do espaço/equipamento da modalidade dele e nomear no texto

---

## 📐 ESPECIFICAÇÕES TÉCNICAS POR FORMATO
| Formato | Dimensões | Proporção | Uso |
|---|---|---|---|
| Story | 1080 × 1920px | 9:16 | Engajamento rápido, urgência, bastidores |
| Post Feed | 1080 × 1080px | 1:1 | Alcance, construção de marca, matrículas |
| Carrossel | 1080 × 1080px por slide | 1:1 | Educação, demonstração, narrativa |
| Reel | 1080 × 1920px | 9:16 | Crescimento de seguidores |

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
