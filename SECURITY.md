# Segurança do Forno Studio

- Não publique arquivos `.env` ou `.env.local`, tokens do Mercado Pago, senhas administrativas ou strings de conexão do PostgreSQL.
- Para portfólio público, configure `DEMO_MODE=true`, mantenha o token de pagamento vazio e use credenciais administrativas únicas no serviço backend.
- Esta versão é educacional e não deve ser usada para pedidos ou pagamentos reais sem revisão de segurança e privacidade.
- Se um segredo for enviado ao GitHub por engano, removê-lo do arquivo não basta: revogue/rotacione o segredo imediatamente.
