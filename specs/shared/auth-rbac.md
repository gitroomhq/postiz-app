# Spec — Auth & RBAC (Fase 1)
> Fonte: PLANO-MESTRE.md Camada 2. Esta spec detalha a implementação; não duplica decisões.

## Objetivo
Dois tipos de acesso: **login/senha** (equipe interna) e **link único** (cliente final, sem login).

## Roles Vocaccio × Roles Postiz

O Postiz já tem `enum Role { SUPERADMIN, ADMIN, USER }` em `UserOrganization.role`.
**Não modificar esse enum** (código upstream depende dele). Estratégia:

1. Adicionar `enum VocaccioRole { OWNER, OPERATOR, EDITOR, VIEWER_INTERNAL, CLIENT_USER }`
2. Adicionar campo `vocaccioRole VocaccioRole? @default(VIEWER_INTERNAL)` em `UserOrganization`
3. Mapeamento de compatibilidade (para o código Postiz continuar funcionando):

| VocaccioRole | Role Postiz espelhado |
|---|---|
| OWNER | SUPERADMIN |
| OPERATOR | ADMIN |
| EDITOR | USER |
| VIEWER_INTERNAL | USER |
| CLIENT_USER (futuro, inativo no MVP) | USER |

`GUEST_LINK` e `VISITOR` **não são roles de User** — GUEST_LINK é um token
(`ProjectAccessLink`, ver database-schema.md), VISITOR é o não-autenticado da LP.

## Senhas — argon2id

- Postiz usa bcrypt (`bcrypt` no package.json). Vocaccio exige **argon2id**.
- Substituir no serviço de auth: hash novo = argon2id; verificação híbrida na transição
  (prefixo `$argon2id$` → argon2; senão bcrypt → re-hash argon2id no login bem-sucedido).
- Lib: `argon2` (npm). Parâmetros: memoryCost 19456 (19 MiB), timeCost 2, parallelism 1
  (OWASP mínimo recomendado).

## Seed do OWNER

- `prisma db seed` lê `ADMIN_EMAIL`, `ADMIN_INITIAL_PASSWORD`, `ADMIN_NAME` do `.env`.
- Cria User + UserOrganization com `vocaccioRole=OWNER`, `role=SUPERADMIN`.
- Flag `mustChangePassword=true` → 1º login redireciona para troca obrigatória.

## Link único (GUEST_LINK) — implementação na Fase 2, schema na Fase 1

- Token = UUID v4 + HMAC-SHA256(uuid, `GUEST_LINK_SECRET`); só o **hash** vai ao banco.
- Revogável (`revokedAt`), rate limit por IP+token, permissões revalidadas a cada request.
- Log de eventos: view, approve, request_change, comment.
- URL: `aprovar.vocacc.io/[token]`.

## Matriz de permissões (MVP)

| Recurso | OWNER | OPERATOR | EDITOR | VIEWER_INT | GUEST_LINK |
|---|---|---|---|---|---|
| CRM (clientes/projetos) | CRUD | CRUD | R | R | — |
| Conteúdo (criar/editar) | ✅ | ✅ | ✅ | — | — |
| Aprovar/comentar material | ✅ | ✅ | — | — | ✅ (só seu projeto) |
| Integrações sociais | ✅ | ✅ | — | — | — |
| Configurações globais | ✅ | — | — | — | — |
| Publicação (Percy) | ✅ | ✅ | — | — | — |

## Regras de segurança não-negociáveis (da Camada 2)
2FA OWNER/OPERATOR · rate limit login 5/15min · refresh token rotation · CSRF ·
tokens OAuth AES-256-GCM nunca no frontend · RLS por cliente/projeto · logs de auditoria.

## Critérios de aceite Fase 1
- [ ] Login com argon2id funcional; seed do OWNER cria conta; 1º login força troca de senha
- [ ] `vocaccoRole` aplicado no middleware de autorização das rotas /hub/crm
- [ ] Usuário EDITOR não acessa configurações; VIEWER_INTERNAL não edita
- [ ] Schema de ProjectAccessLink criado (uso real na Fase 2)
