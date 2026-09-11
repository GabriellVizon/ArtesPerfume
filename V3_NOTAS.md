# Notas da V3

Esta versão foi pensada para aprovação visual, não como identidade final.

## Decisões do protótipo

1. A página de detalhes é dinâmica. Não existe um HTML separado para cada perfume.
2. O catálogo também possui uma visão rápida em modal.
3. Favoritos ficam apenas no navegador do visitante via localStorage.
4. O CTA comercial é "Tenho interesse"; sem estoque, vira "Consultar disponibilidade".
5. A página de contato oferece "Agendar uma experiência" e monta a mensagem no WhatsApp.
6. Dashboard e editor usam dados reais das APIs administrativas.
7. O nome "Aura Noir" pode ser substituído posteriormente pelas variáveis públicas do `.env`.
8. A integração real com Instagram permanece para a etapa posterior ao deploy/aprovação.


## V3.1 — Ajustes do protótipo

- O cadastro/edição de perfumes agora aceita foto do celular ou computador.
- A foto é otimizada no navegador e armazenada junto ao produto no PostgreSQL, sem depender de um diretório local do servidor.
- URL HTTPS continua disponível como alternativa.
- A tela pública de Contato foi removida, assim como os links que apontavam para ela.
- O atendimento de interesse em um perfume continua sendo feito diretamente pelo botão de WhatsApp nos detalhes e na visualização rápida.
