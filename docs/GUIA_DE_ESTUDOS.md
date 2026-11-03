# Forno Studio — guia de estudos (arquivo por arquivo)

Este documento é uma trilha de aprendizado do projeto, não uma promessa de que a aplicação está pronta para clientes reais. O Forno Studio é uma **demonstração de portfólio**. Leia o código junto com as explicações: aprender não é só copiar.

## 1. Visão geral: para onde vai cada pedido?

```text
Navegador da pessoa
  -> Frontend Next.js/React (Discloud)
  -> API HTTP FastAPI/Python (Render)
  -> SQLAlchemy -> PostgreSQL (Neon)
                      |
                  produtos e pedidos
```

- **Node.js** é o ambiente JavaScript que executa o servidor do Next.js.
- **Next.js** é o framework baseado em React que cria as páginas do site.
- **FastAPI** implementa a API em Python; recebe requisições, valida dados e conversa com o banco.
- **PostgreSQL** armazena dados; **SQLAlchemy** permite manipulá-los pelo Python.
- **GitHub Actions** executa verificações do código; **Discloud/Render** executam os serviços publicados.

### Entenda primeiro estes termos

**Rota** é um endereço como `GET /api/products`. **HTTP** é o protocolo da comunicação. **JSON** é o formato das informações enviadas. **CRUD** significa criar, ler, atualizar e excluir (o projeto implementa várias dessas operações; não há exclusão de produto). **JWT** é um token assinado, usado aqui para sessões administrativas de 30 minutos.

## 2. Arquivos da API (Python)

| Arquivo | O que faz | O que estudar |
|---|---|---|
| `backend/app/main.py` | Inicializa o FastAPI, define as rotas de produtos, pedidos, acompanhamento, login e integração demonstrativa de pagamentos. Faz a regra de negócios. | `def`, `async def`, decorators `@app.get/post/patch`, `Depends`, `HTTPException` |
| `backend/app/admin_auth.py` | Valida usuário/senha uma única vez, emite JWT com expiração, verifica `Authorization: Bearer` e restringe tentativas repetidas de login. | `hmac`, JWT, variáveis de ambiente, `Lock` e rate limiting |
| `backend/app/database.py` | Cria a conexão com SQLite ou PostgreSQL; configura sessões de banco e a base dos modelos. | SQLAlchemy Engine, Session e `yield` |
| `backend/app/models.py` | Declara as tabelas `Product`, `Order` e `OrderItem`, inclusive relacionamentos. | Classes, ORM, chave primária e chave estrangeira |
| `backend/app/schemas.py` | Define os dados que as rotas podem receber/devolver, com validações Pydantic. | `BaseModel`, tipos, `Field` e status HTTP 422 |
| `backend/app/__init__.py` | Marca a pasta como pacote Python. | Imports e organização de módulos |
| `backend/requirements.txt` | Lista dependências Python; inclui FastAPI, SQLAlchemy, httpx, psycopg e PyJWT. | `pip`, dependências e versões |
| `backend/.env.example` | Exemplo de configurações locais, sem segredos reais. | Variáveis de ambiente e `.env` |
| `backend/Procfile` | Comando de inicialização para alguns serviços de hospedagem. | Uvicorn e deploy |
| `backend/tests/test_api.py` | Testa saúde da API, catálogo, login, expiração do token, bloqueio por tentativas, pedidos demo e atualização de status. | pytest, fixtures, TestClient, mocks de ambiente |

### Acompanhe a função de uma rota

1. `@app.get("/api/products")` atende a um GET.
2. `db: Session = Depends(get_db)` fornece uma sessão de banco.
3. A consulta SQLAlchemy procura produtos ativos.
4. `response_model=list[ProductOut]` controla os campos da resposta.
5. O frontend recebe o JSON e renderiza o cardápio.

Depois leia `create_order_record` em `main.py`: é onde produtos do banco, quantidades e preço final viram um pedido.

### Atenção: a autenticação

- `POST /api/admin/session` recebe as credenciais por HTTPS e devolve um JWT válido por 30 minutos.
- `GET /api/admin/orders` e rotas administrativas exigem o token no cabeçalho `Authorization`.
- O frontend mantém o token **somente na memória**: atualizar a página pede novo login.
- O limitador atual é **em memória por processo**. Ele não substitui uma solução compartilhada (Redis) para sistemas com múltiplas instâncias, nem protege sozinho de todos os ataques.
- O logout apaga o token no navegador; tokens emitidos não têm revogação remota antes de expirar.
- Use `ADMIN_SESSION_SECRET` exclusivo, com pelo menos 32 caracteres. **Nunca publique ou compartilhe o segredo.**

## 3. Arquivos do frontend (Next.js/React/TypeScript)

| Arquivo | O que faz | O que estudar |
|---|---|---|
| `frontend/src/app/layout.tsx` | Layout geral e metadados do site. | Componentes e props do Next.js |
| `frontend/src/app/page.tsx` | Página inicial; monta a apresentação. | Roteamento App Router |
| `frontend/src/app/pedir/page.tsx` | Rota que exibe o fluxo de pedidos. | Composição de componentes |
| `frontend/src/app/acompanhar/[token]/page.tsx` | Consulta o estado de um pedido pelo token do link. | Rotas dinâmicas, `fetch`, estado |
| `frontend/src/app/admin/page.tsx` | Login, token na memória, listagem de pedidos, alteração de status e edição de produtos. | `useState`, `useEffect`, formulários, cabeçalhos HTTP |
| `frontend/src/components/Landing.tsx` | Conteúdo visual da página inicial. | JSX, componentes e responsividade |
| `frontend/src/components/Storefront.tsx` | Cardápio, filtros, carrinho e checkout; em modo demo usa informações fictícias. | Eventos, listas `.map`, `useMemo`, `useState`, `fetch` |
| `frontend/src/lib/api.ts` | Define tipos TypeScript e funções para chamar a API. | `type`, `async/await`, `Promise`, tratamento de erros |
| `frontend/src/app/globals.css` | Estilos globais e regras de layout/responsividade. | CSS, Flexbox, Grid, media queries |
| `frontend/src/app/robots.ts` | Regras para mecanismos de busca. | SEO técnico |
| `frontend/src/app/sitemap.ts` | Mapa de URLs públicas do site. | SEO técnico |
| `frontend/public/` | Pasta para arquivos estáticos, quando utilizados. | Imagens e assets |

### O caminho de um clique no botão “Confirmar pedido”

1. `Storefront.tsx` reúne o carrinho e os dados do formulário.
2. `fetch` faz `POST /api/orders` enviando JSON.
3. `schemas.py` valida o corpo enviado.
4. `main.py` consulta os produtos, recalcula preços no servidor e salva com SQLAlchemy.
5. `models.py` define como pedido e itens são armazenados.
6. A resposta inclui identificador e token de acompanhamento.
7. `acompanhar/[token]/page.tsx` lê o estado do pedido sem exibir dados pessoais.

## 4. Configuração, qualidade e deploy

| Arquivo | Por que existe |
|---|---|
| `frontend/package.json` | Dependências e comandos `dev`, `build`, `start`, `lint` do Next.js |
| `frontend/package-lock.json` | Congela versões de dependências para instalação reproduzível |
| `frontend/tsconfig.json` | Configuração do TypeScript |
| `frontend/next.config.ts` | Configurações do build Next.js, incluindo modo standalone |
| `frontend/next-env.d.ts` | Tipos gerados pelo Next.js |
| `frontend/eslint.config.mjs` | Configura regras de análise estática |
| `frontend/.env.local.example` | Variáveis de exemplo para frontend local |
| `frontend/.env.discloud.example` | Variáveis de exemplo para deploy na Discloud |
| `frontend/discloud.config` | Configuração alternativa de hospedagem do frontend |
| `frontend/.discloudignore` | Arquivos a não incluir no pacote frontend |
| `package.json` (raiz) | Comandos Node usados pela integração da Discloud |
| `server.js` (raiz) | Inicia a aplicação Next.js compilada no ambiente de hospedagem |
| `scripts/discloud-build.cjs` | Empacota os arquivos Next.js necessários para rodar na Discloud |
| `discloud.config` (raiz) | Indica `MAIN`, comandos de build/start, tipo e ID da aplicação |
| `.discloudignore` | Exclui arquivos indesejados do pacote na raiz |
| `.gitignore` | Evita versionar segredos, dependências e artefatos locais |
| `render.yaml` | Declara a configuração sugerida da API no Render |
| `.github/workflows/quality.yml` | Compila frontend e executa testes automatizados da API em pull requests |
| `.github/workflows/discloud-readiness.yml` | Testa o pacote standalone e sua inicialização isolada |
| `README.md` | Documentação geral, execução local e publicação |
| `SECURITY.md` | Cuidados de segurança e limites do projeto |
| `docs/GUIA_DE_ESTUDOS.md` | Este roteiro de aprendizado |

## 5. Rodar no Windows (PowerShell)

No terminal da pasta **backend**:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt pytest
Copy-Item .env.example .env
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Copie o resultado do último comando para `ADMIN_SESSION_SECRET` no **seu** `backend/.env`; não cole o valor no GitHub nem no chat. Em seguida:

```powershell
python -m uvicorn app.main:app --reload
```

Abra outro terminal na **raiz do repositório** e rode:

```powershell
$env:PYTHONPATH = "backend"
python -m pytest -q backend/tests
```

Para o frontend, na pasta `frontend`:

```powershell
npm install
Copy-Item .env.local.example .env.local
npm run dev
```

Acesse `http://localhost:3000` e `http://127.0.0.1:8000/docs`.

**Não use `DEMO_MODE=false` nem habilite pagamentos em uma publicação pública de portfólio.** O backend em demo substitui os dados enviados antes de gravá-los, e o frontend demo preenche os campos com informações fictícias. O app não está pronto para operação comercial.

## 6. Trilha de seis semanas para aprender de verdade

| Semana | Aprender | Exercício prático (sem copiar a solução) |
|---|---|---|
| 1 | Python, funções, dicionários, HTTP e JSON | Escrever `GET /api/health` e uma rota que retorna três sabores |
| 2 | FastAPI, Pydantic, parâmetros e erros HTTP | Criar uma rota que valida um produto com preço positivo |
| 3 | SQL, SQLite, SQLAlchemy, relacionamentos | Criar suas próprias tabelas de `Cliente` e `Pedido` em um miniapp |
| 4 | HTML, CSS, JavaScript, TypeScript e React | Criar um catálogo simples sem backend e com filtro por categoria |
| 5 | Next.js, `fetch`, formulários, estado e API | Conectar seu catálogo novo à API de produtos |
| 6 | Autenticação, pytest, Git/GitHub e deploy | Implementar testes e publicar um miniapp separado |

**Regra para aprender:** antes de pedir à IA para escrever uma função, tente descrevê-la em português; depois escreva um esboço em código; por fim use a IA para revisar e explicar o que você não entendeu.

## 7. Checklist antes de mesclar e publicar esta atualização

1. Validar os checks do pull request (testes de API + build Next.js + pacote Discloud).
2. Criar no **Render**, em variáveis privadas, `ADMIN_SESSION_SECRET` longo e exclusivo (não inserir no código).
3. Verificar que `ADMIN_USERNAME`, `ADMIN_PASSWORD` e `DEMO_MODE=true` estão corretos.
4. Planejar a publicação conjunta do backend e frontend: o novo painel só funciona quando **ambos** usam autenticação por token; não mesclar automaticamente sem estar preparado para essa transição.
5. Testar login, logout, expiração, criação de pedido demo, atualização de status, carrinho e experiência no celular.
6. Conservar backups do banco e não habilitar pagamentos reais.

O projeto ainda precisa de revisão de segurança, observabilidade e testes de ponta a ponta antes de atender clientes reais.
