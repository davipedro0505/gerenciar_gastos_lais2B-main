# SISTEMA DE CONTROLE DE GASTOS

## INTEGRANTES DA EQUIPE
- **Laís Silvs**
- **Kelven Sérgio**
- **Davi Pedro**

---

# 1. IDENTIFICAÇÃO DO PROBLEMA

Atualmente no Brasil, muitas pessoas têm dificuldade em controlar seus gastos diários, especialmente os feitos em cartão de crédito. É comum perder o controle das faturas, eaquecer onde um gasto foi efetuado ou ultrapassar o limite disponível oferecido pelo banco.

Esse descontrole pode levar a:

- Acúmulo de dívidas
- Estouro de limite
- Falta de educação financeira
- Dificuldade em visualizar quanto se gasta em cada categoria

Geralmente, as pessoas TENTAM anotar as despesas em cadernos ou planilhas soltas, o que resulta em informações desorganizadas.

---

# 2. SOLUÇÃO DA NOSSA PROPOSTA

A solução é **uma aplicação web para controle de gastos**, o que o usuário poderá fazer:

- Registrar seus gastos
- Categorizar despesas
- Associar gastos a cartões
- Visualizar e gerenciar tudo em um único lugar

A aplicação será desenvolvida usando **JAVASCRIPT, HANDLEBARS e CSS**

Dessa maneira, o usuário terá uma visão completa e organizada da sua vida financeira, facilitando o planejamento e as decisões futuras. 

---

# 3. ENTIDADES DO SISTEMA

O sistema será estruturado em quatro entidades prinicpais:

1. **USUÁRIO**
2. **CARTÃO**
3. **GASTO**

---

# 4. REQUISITOS DA APLICAÇÃO

## Usuário
- Pode se cadastrar no sistema
- Deve editar ou excluir dados do usuário

## Cartão
- Pode cadastrar cartões
- Pode listar todos os cartões cadastrados
- Pode editar ou excluir um cartão

## Gasto
- Pode registrar novos gastos
- Listar todos os gastos
- Filtrar gastos por categoria ou cartão
- Pode editar ou excluir um gasto

---

# 5. TELA PRINCIPAL

A aplicação web terá uma tela principal com botões para acessar:

- CRUD de usuários
- CRUD de cartões 
- CRUD de gastos
- CRUD de categorias
- CRUD de orçamentos
- CRUD de resumos/relatórios de gastos

---
 
# 6. ENTIDADES IMPLEMENTADOS do SISTEMA


- **Categorias**: permite criar, listar, editar e excluir categorias de despesas (por exemplo: Alimentação, Transporte, Saúde). As categorias podem ser associadas a gastos e usadas como filtro nas listagens.

- **Orçamentos**: permite definir orçamentos mensais por usuário e categoria (mês/ano e limite de gasto). Serve para acompanhar limites planejados e comparar com os gastos reais.

- **Resumos / Relatórios**: gera e armazena resumos mensais por usuário (total gasto, total orçado, número de transações e categoria de maior gasto). Os resumos podem ser gerados a partir dos dados existentes e consultados na interface.

