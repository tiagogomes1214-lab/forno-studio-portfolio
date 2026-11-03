# Segurança do Forno Studio

Este projeto é **portfólio/demonstração**, não uma plataforma pronta para clientes reais.

- Nunca publique arquivos `.env`/`.env.local`, senhas, `ADMIN_SESSION_SECRET`, token do Mercado Pago ou URL privada do PostgreSQL.
- Configure no backend `ADMIN_USERNAME`, `ADMIN_PASSWORD` e `ADMIN_SESSION_SECRET` (segredo exclusivo de 32+ caracteres). O segredo deve ser gerado aleatoriamente e cadastrado no provedor de hospedagem.
- `POST /api/admin/session` autentica as credenciais uma vez; a API exige JWT no cabeçalho `Authorization` nas operações administrativas. O JWT expira em 30 minutos, fica somente na memória do frontend e não pode ser revogado individualmente antes da expiração.
- O bloqueio após tentativas malsucedidas é **em memória por processo**, agrupado por IP; para um ambiente real, use proteção distribuída e considere redes compartilhadas e proxies. Ele não substitui proteção contra ataques automatizados.
- Use HTTPS, `CORS_ORIGINS` restrito aos endereços corretos e `DEMO_MODE=true` na publicação demonstrativa. O frontend demonstrativo usa dados fictícios; o backend substitui nome, telefone, endereço e notas antes de gravar.
- Mantenha pagamentos desabilitados em produção pública de portfólio. A integração opcional com Mercado Pago não foi aprovada para uso real.
- Não disponibilize dados reais de clientes; revise privacidade, backups, monitoramento, trilha de auditoria, sessão e testes de ponta a ponta antes de uso comercial.
- Caso um segredo seja acidentalmente enviado ao GitHub, **revogue e rotacione imediatamente**. Apenas remover o arquivo do histórico recente não invalida o segredo.

## Publicação segura da atualização

As mudanças de autenticação são coordenadas entre frontend e backend. Antes de mesclar esta branch no `main`, adicione `ADMIN_SESSION_SECRET` às variáveis privadas do Render. Depois do merge e dos deploys de backend/frontend, teste o login e as operações administrativas. Pode haver interrupção temporária do painel durante a transição entre as versões; a versão no ar não é modificada por este pull request enquanto ele estiver aberto.
