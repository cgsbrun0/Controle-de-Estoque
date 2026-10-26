# Verificação da entrega

Verificado com Node.js 24.22.1:

- Instalação das dependências com npm e arquivo de versões travadas (`package-lock.json`).
- TypeScript sem erros e frontend compilado com `npm run build`.
- `npm test`: três grupos de testes passaram, incluindo pedidos HTTP ao servidor Express com SQLite temporário.
- Login, saída, criação de usuários pelo terminal e senha oculta na digitação.
- Usuários da mesma equipe acessam o mesmo estoque; equipes distintas ficam separadas.
- Cadastro, edição, remoção, estoque automático, mínimos e dupla confirmação.
- Entradas, saídas, bloqueio por estoque insuficiente e proteção contra repetição de lançamento.
- Conflitos de versão e rollback do saldo quando a gravação do histórico falha.
- Importação, preservação de códigos, linhas incompletas e reimportação sem duplicidade.
- Teste adicional de leitura com a planilha fornecida na conversa, sem incluí-la na entrega.
- Backup SQLite consistente e histórico com autor da movimentação.
- Inicialização por `npm start`, página compilada, carregamento de JavaScript, rota de saúde e API exigindo login.

Docker não estava disponível no ambiente de preparação. Os arquivos Dockerfile, Compose e exemplo de proxy estão incluídos, mas a construção e execução da imagem Docker não foram verificadas aqui. A publicação externa e a configuração do domínio/HTTPS ficam a cargo de quem hospedar o projeto.

A instalação começa sem usuários e sem dados reais. As credenciais de teste foram geradas durante a verificação, fora da pasta entregue, e não fazem parte do projeto.
