# Instagran — Painel de Conteúdo Instagram

- Regras, marcas, campanhas e o passo a passo para gerar conteúdo: `CONTEXTO.md` (seção 10 = como gerar o conteúdo do dia).
- Voz de cada marca: `instagram/planeta-corpo/voice.md`, `instagram/sorveteria-guri/voice.md`, `instagram/gympulse/voice.md`. O `CONTEXTO.md` manda em fatos, campanhas, formatos e frequência; o `voice.md` manda em como escrever.
- Skills `ig-*` (`.claude/skills/`): elas procuram `~/.claude/instagram/voice.md`, que não existe aqui. Ao usar qualquer `/ig-*`, ler o `voice.md` da marca do pedido; se a marca não estiver clara, perguntar.
- Scripts Python das skills: usar `python`, não `python3` (Windows).
- O Modo Automático (`api/auto-content.js`) envia o `CONTEXTO.md` e o `voice.md` da marca à OpenAI: nada de senha, chave ou dado pessoal nesses arquivos.
