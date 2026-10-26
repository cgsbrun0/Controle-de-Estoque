# Controle de estoque

Desenvolvi esse modelo para poder fazer o controle do estoque de materiais em uma oficina. Como trabalhamos com servicos de consertos de carretas e cavalos (caminhões) então temos que saber quais materiais temos, onde compramos, quantos temos em estoque para saber como vamos proceder nas próximas operacoes que temos para realizar. Dessa forma, podemos os itens que usaremos como exemplo são voltados para esse setor.
Com essa ideia, busco integrar meus conhecimentos voltados para Front-End + TypeScript, Back-End + Node.js e banco de dados (SQLite) para poder desenvolver uma forma simples e limpa de armazenamento de dados.

## Funcionalidades

- Código (com zeros à esquerda), nome do produto, tipo, estoque mínimo, estoque atual, estoque inicial, total de entradas, total de saídas e status.
- Saldo = inicial + entradas − saídas. Abaixo do mínimo quando saldo < mínimo; OK quando saldo ≥ mínimo.
- Cadastro e edição dos dados do item. Quantidades mudam pelos botões Entrada e Saída.
- Duas confirmações para entrada, saída e remoção. Saída acima do saldo é bloqueada.
- Histórico com usuário responsável, data, quantidades e saldos. Remoção retira o cadastro da lista e preserva o histórico.
- Importação .xlsx de até 8 MB, até 5.000 itens, com prévia, identificação de linhas sem nome e saldos divergentes. Códigos existentes são ignorados.
- Busca e exportação CSV. O CSV é uma consulta do estoque, não substitui o backup completo.
- Login local com senha derivada por scrypt e sessão em cookie HttpOnly. Não depende de login no ChatGPT.
- Usuários do mesmo estoque compartilham cadastros e movimentações; estoques com nomes diferentes permanecem separados.

## 1. Abrir no VS Code e executar

Instale Node.js **24.x** e npm. Extraia o ZIP, abra a pasta `controle-estoque` no VS Code e use o terminal integrado:

```bash
npm ci
```

Copie `.env.example` para `.env`. Linux/macOS:

```bash
cp .env.example .env
```

No PowerShell:

```powershell
Copy-Item .env.example .env
```

Crie seu primeiro usuário. Digite a senha interativamente, com pelo menos 12 caracteres:

```bash
npm run usuario:criar -- caio --estoque equipe
```

Depois:

```bash
npm run dev
```

Abra **http://localhost:3000** e entre com o usuário criado. O banco é criado automaticamente em `data/estoque.sqlite`. As migrações são aplicadas uma única vez, sem apagar os dados.

Para outra pessoa trabalhar no mesmo estoque, crie outro usuário com **o mesmo identificador de estoque**:

```bash
npm run usuario:criar -- colaborador --estoque equipe
```

Ambos poderão cadastrar, editar, remover e movimentar os mesmos itens. Todos os usuários criados têm controle completo dentro do estoque indicado. A administração das contas é feita pelo terminal; não há cadastro público nem níveis de permissão nesta versão. Cada pessoa deve usar sua própria conta.

Para redefinir uma senha e encerrar as sessões do usuário:

```bash
npm run usuario:criar -- colaborador --redefinir
```

A redefinição mantém o estoque já associado ao usuário. Não há recuperação de senha por e-mail.

## 2. Importar seus dados

Entre, clique em **Importar Excel** e selecione sua planilha `.xlsx`. A aba `ESTOQUE ATUAL` será reconhecida quando existir. A prévia informa novos códigos, códigos já existentes, linhas sem nome e diferenças entre o saldo exibido no Excel e o resultado de inicial + entradas − saídas.

Revise e confirme. Campos obrigatórios ausentes não viram valores inventados. Linhas com código, mas sem nome, ficam fora da importação. Um saldo negativo calculado a partir dos dados de origem é sinalizado e pode ser importado para revisão; novas saídas continuam bloqueadas enquanto não houver saldo disponível.

A leitura utiliza os valores salvos no Excel, inclusive resultados armazenados das fórmulas. O programa recalcula o saldo a partir dos totais importados, mas não executa todas as fórmulas do Excel. Se o arquivo não tiver resultados armazenados para os totais, abra-o no Excel ou LibreOffice, recalcule e salve antes de importar.

Os totais anteriores são importados sem reconstruir os lançamentos históricos das demais abas. O histórico do aplicativo passa a registrar as novas operações. O ZIP não contém sua planilha original nem dados reais de estoque.

## 3. Publicar com Docker em um servidor

Requisitos: Docker com Compose, domínio apontado para o servidor e um proxy HTTPS. O aplicativo usa um arquivo SQLite, portanto publique uma única instância com disco persistente. Não é uma configuração para múltiplas réplicas ou funções sem armazenamento persistente.

1. Envie o projeto para seu servidor ou clone seu repositório.
2. Crie `.env` a partir de `.env.example` e configure:

```dotenv
APP_URL=https://estoque.seu-dominio.com.br
TRUST_PROXY=1
```

Use `TRUST_PROXY=1` somente para o cenário de um proxy confiável descrito abaixo. Ajuste ao seu ambiente, sem habilitar confiança irrestrita.

3. Construa a imagem:

```bash
docker compose build
```

4. Crie os usuários no volume de produção:

```bash
docker compose run --rm app npm run usuario:criar -- caio --estoque equipe
docker compose run --rm app npm run usuario:criar -- colaborador --estoque equipe
```

5. Inicie:

```bash
docker compose up -d
```

6. Configure Caddy ou outro proxy HTTPS no mesmo servidor, fora do Compose, encaminhando seu domínio para `127.0.0.1:3000`. O arquivo `Caddyfile.example` mostra o bloco necessário; substitua o domínio. Configure o proxy antes de tentar entrar pelo domínio.
7. Abra o endereço HTTPS configurado em `APP_URL` e entre.

O Compose publica a porta 3000 somente em `127.0.0.1`; o acesso externo passa pelo proxy. Não existe publicação automática ao extrair o ZIP. Você precisa fornecer o servidor, domínio e configuração HTTPS.

O volume `estoque_data` mantém o banco; `estoque_backups` guarda backups. Não use `docker compose down -v` para uma atualização: esse comando remove os volumes e seus dados.

### Publicação sem Docker

Em um servidor com Node.js 24, execute `npm ci`, crie `.env` com o domínio HTTPS, crie os usuários, rode `npm run build` e inicie `npm start` com um gerenciador de processos. Configure proxy HTTPS e uma pasta persistente em `DB_PATH`. Mantenha `HOST=127.0.0.1` quando o proxy estiver no mesmo servidor. Em contêineres ou plataformas que exigirem conexão por outra interface, configure `HOST=0.0.0.0`.


## Referências técnicas

- Node.js 24 / SQLite: https://nodejs.org/download/release/latest-v24.x/docs/api/sqlite.html
- Volumes Docker: https://docs.docker.com/engine/storage/volumes/
- Caddy reverse proxy: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy

