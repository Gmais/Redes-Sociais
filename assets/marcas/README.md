# Logos e mascotes para o botão "Gerar imagem"

O endpoint `api/generate-image.js` usa estes arquivos como referência, para que o
logo (e o mascote, quando existir) apareçam sempre na arte gerada pela IA.

Estrutura (PNG com fundo transparente é o ideal, até ~2 MB cada):

    assets/marcas/academia/logo.png
    assets/marcas/sorveteria/logo.png
    assets/marcas/sorveteria/mascote.png
    assets/marcas/gympulse/logo.png
    assets/marcas/<perfil>/mascote.png   (opcional, só se a marca tiver mascote)

Arquivos já conhecidos no Drive:
- Academia: "Logo Academia Oficial Vermelho.png"
- Sorveteria: "LOGO-GURI-V2.png" e mascote "mascote3d_guri_pose01_sorvete_tamanho_grande.png"
  (o original tem 23 MB — reduza para ~1024 px antes de colocar aqui)
- GympulsePro: logo ainda não localizado no Drive
