# Forno Studio — projeto Full Stack de pizzaria

Projeto educacional para portfólio: site premium em Next.js, cardápio, carrinho, checkout demonstrativo, registro e acompanhamento de pedidos, painel administrativo e integração opcional com Mercado Pago.

> **Uso recomendado na internet: portfólio/demonstração.** Não ative pagamentos reais nem use dados reais de clientes nesta versão. Em `DEMO_MODE=true`, a API anonimiza os dados enviados nos pedidos, desativa o Mercado Pago e permite demonstrar o fluxo sem armazenar nome, telefone ou endereço reais.

## Tecnologias
- Frontend: Next.js, React, TypeScript e CSS.
- Backend: Python, FastAPI e SQLAlchemy.
- Banco local: SQLite.
- Banco hospedado: PostgreSQL (driver psycopg 3).
- Pagamento: integração opcional com Mercado Pago Checkout Pro / Orders API, desabilitada no modo demo.

## Executar localmente no Windows

Requisitos: Node.js 20+ e Python 3.11+.

### 1. Backend
Abra PowerShell na pasta `backend` e execute, um comando por vez:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python -m uvicorn app.main:app --reload
```

Se o PowerShell bloquear a ativação de scripts, execute apenas nesta janela:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

API: http://127.0.0.1:8000 — documentação: http://127.0.0.1:8000/docs

### 2. Frontend
Abra uma segunda janela de PowerShell na pasta `frontend`:

```powershell
npm.cmd install
Copy-Item .env.local.example .env.local
npm.cmd run dev
```

Site: http://localhost:3000 — painel: http://localhost:3000/admin

O painel valida as credenciais no backend. Em ambiente local, o arquivo `backend/.env` começa com as credenciais de estudo `admin` / `troque-esta-senha`; substitua-as se o projeto ficar acessível a outras pessoas. Não existe mais senha administrativa em `NEXT_PUBLIC_*`.

## Publicar como portfólio (sem custo inicial, com limites dos planos gratuitos)

Arquitetura sugerida: GitHub para o código, Vercel para o frontend, Render para a API e Neon para PostgreSQL. Os serviços gratuitos podem dormir ou impor cotas; isso não é garantia de disponibilidade 24/7. Veja as limitações atuais nos documentos oficiais antes de publicar.

### A. Preparar o repositório GitHub
1. Crie um repositório novo no GitHub, preferencialmente público para portfólio.
2. Antes de enviar, confira `.gitignore`: nunca envie `.env`, `.env.local`, `.venv`, `node_modules`, `.next` ou `backend/pizza.db`.
3. Envie somente o código do projeto. Se já criou `.env` localmente, mantenha-o fora do GitHub.

### B. Criar o PostgreSQL no Neon
1. Crie um projeto PostgreSQL no Neon.
2. Copie a connection string com SSL. Guarde-a como segredo; não a publique.
3. Ela será usada no Render como `DATABASE_URL`. A API normaliza URLs `postgres://` e `postgresql://` para o driver psycopg 3.

### C. Publicar a API no Render
Crie um serviço **Web Service** conectado ao repositório GitHub e configure:
- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health Check Path: `/api/health`

Adicione as variáveis de ambiente no painel do Render:
- `DATABASE_URL` = connection string do Neon
- `ADMIN_USERNAME` = usuário administrativo exclusivo
- `ADMIN_PASSWORD` = senha longa, exclusiva e aleatória
- `DEMO_MODE` = `true`
- `CORS_ORIGINS` = URL final do frontend (você obterá na etapa D)
- `FRONTEND_PUBLIC_URL` = URL final do frontend
- `MERCADOPAGO_ACCESS_TOKEN` = deixar vazio
- `MERCADOPAGO_WEBHOOK_SECRET` = deixar vazio

Não use a senha de demonstração `troque-esta-senha` no serviço público. Não compartilhe os valores das variáveis em chats, prints ou no GitHub.

Após o deploy, abra `https://SEU-SERVICO.onrender.com/api/health`. Deve retornar JSON com `status: ok`. Copie a URL da API.

### D. Publicar o frontend na Vercel
1. Importe o mesmo repositório na Vercel.
2. Configure **Root Directory** como `frontend`.
3. Adicione a variável de ambiente `NEXT_PUBLIC_API_URL` com a URL pública do Render, por exemplo `https://nome-do-servico.onrender.com` (sem barra no final).
4. Adicione `NEXT_PUBLIC_DEMO_MODE` como `true`.
5. Clique em Deploy. A Vercel fornecerá uma URL `https://...vercel.app`.
6. Volte ao Render e ajuste `CORS_ORIGINS` e `FRONTEND_PUBLIC_URL` com a URL exata da Vercel, sem `/` no final. Salve e faça novo deploy/restart se necessário.

### E. Testar a versão pública
- `https://SUA-API.onrender.com/api/health` deve funcionar.
- `https://SUA-API.onrender.com/api/products` deve listar os produtos.
- O site da Vercel deve carregar o cardápio e permitir testar um pedido demonstrativo.
- A API em `DEMO_MODE=true` substitui nome, telefone, endereço e observações por dados fictícios antes de gravar o pedido; não deixe o cliente inserir informação real. Pagamentos online ficam desativados.
- O acesso administrativo funciona somente com `ADMIN_USERNAME` e `ADMIN_PASSWORD` definidos no backend.

## Diagnóstico rápido de publicação

Se o painel administrativo mostrar erro ao entrar:
1. Abra a API em `https://forno-studio-api.onrender.com/api/health`. O resultado esperado é `{"status":"ok","service":"Forno Studio API"}`.
2. Na Vercel, confirme `NEXT_PUBLIC_API_URL=https://forno-studio-api.onrender.com` e `NEXT_PUBLIC_DEMO_MODE=true`. Não coloque barra no final da URL.
3. Depois de alterar uma variável `NEXT_PUBLIC_*`, faça um novo deploy na Vercel; ela é aplicada durante a compilação.
4. No Render, confira se `CORS_ORIGINS` contém a URL pública exata da Vercel e se `ADMIN_USERNAME` e `ADMIN_PASSWORD` estão preenchidas. Não compartilhe esses valores.
5. Se a tela retornar um código HTTP, use-o para diferenciar credenciais inválidas (401), configuração ausente (503), rota não encontrada (404) e falha de conexão/CORS.

A camada de chamadas da API agora normaliza barras finais e apresenta uma mensagem mais útil quando o navegador não consegue conectar. O backend também normaliza as origens CORS e valida o status do pedido com um schema explícito.

## Melhorias de portfólio incluídas

- Metadados para compartilhamento em redes sociais (Open Graph/Twitter) e idioma/tema definidos.
- Rotas `/robots.txt` e `/sitemap.xml` para descoberta básica do site; área administrativa e links de acompanhamento ficam fora da indexação.
- Chamadas à API com tratamento de erro de rede e indicação da URL configurada.
- Validação tipada dos status de pedidos no backend e normalização de origens CORS.

## Próximos passos antes de usar com clientes reais

- Testar ponta a ponta: cardápio, carrinho, pedido demo, link de acompanhamento, login administrativo, alteração de status e edição de produtos.
- Adicionar testes automatizados de API, limitação de tentativas de login, sessões seguras com expiração e logs sem dados pessoais.
- Validar acessibilidade, desempenho móvel, imagens e links de contato/endereço antes de apresentar como projeto comercial.
- Só depois planejar pagamentos reais, webhooks em produção, backups e políticas de privacidade. O modo demo deve continuar ligado no portfólio.

## Segurança e limites

Esta versão é para portfólio/estudo, não uma operação de restaurante real. Antes de receber pedidos verdadeiros, será necessário revisão de segurança, proteção contra abuso (rate limiting), política de privacidade e retenção de dados, backups, tratamento de cancelamentos, monitoramento e testes completos. Em `DEMO_MODE=true`, os dados fornecidos ao endpoint público são substituídos antes de persistir, e o Checkout Pro fica bloqueado.

A autenticação do painel usa cabeçalhos enviados pelo navegador por HTTPS e não embute as credenciais no JavaScript público. Use uma senha longa e única. Essa versão ainda não inclui MFA, sessões de curta duração ou limite de tentativas de login; não a use para administrar uma loja real.

O plano gratuito do Render pode dormir após inatividade e perde arquivos locais em reinícios; por isso use Neon/PostgreSQL, não SQLite hospedado. O plano gratuito do Neon também escala a computação a zero e tem limites mensais. O Vercel Hobby destina-se a uso pessoal/não comercial. Consulte os planos atuais antes de uma utilização comercial.

## Mercado Pago (somente teste, não habilitado na versão pública)
A integração existente pode ser configurada para testes em um ambiente controlado. Não coloque Access Tokens no frontend ou no GitHub. Webhooks exigem URL pública HTTPS e assinatura validada. Para pagamentos reais, é necessária uma análise e preparação específica antes de ativar produção.

## Documentação oficial de hospedagem
- Vercel Hobby: https://vercel.com/docs/plans/hobby
- Render — deploy gratuito e limitações: https://render.com/docs/free
- Neon Free: https://neon.com/docs/introduction/pro-plan
