# Automação WordPress - Atualização de Artigos com Promoções

Workflow n8n que atualiza automaticamente títulos e descrições de artigos no WordPress com base em promoções vigentes, usando IA para reformular o conteúdo.

## Fluxo do Workflow

```
Planilha Google → Filtrar Pendentes → Extrair Slug → Buscar Post no WP → IA Reformula → Atualizar WP → Marcar Concluído
```

**Nodes do workflow:**

1. **Início Manual** - Dispara o workflow manualmente
2. **Ler Planilha Google** - Lê todas as linhas da planilha
3. **Filtrar Pendentes** - Ignora linhas já concluídas ou sem URL
4. **Extrair Slug e Cidade** - Pega o slug e cidade da URL do artigo
5. **Buscar Post no WordPress** - Consulta a API REST do WP pelo slug
6. **Preparar Dados para IA** - Organiza título atual, descrição e % da promoção
7. **IA - Reformular Título (Gemini)** - Envia para Google Gemini 3 Pro reformular com a promoção
8. **Processar Resposta da IA** - Extrai o novo título e descrição do JSON
9. **Atualizar Post WordPress** - Atualiza o artigo via API REST
10. **Atualizar Planilha - Concluído** - Marca a linha como "Concluído"

## Configuração

### 1. Importar o Workflow no n8n

1. Acesse seu n8n
2. Vá em **Workflows** → **Import from File**
3. Selecione o arquivo `workflows/wordpress-promo-automation.json`

### 2. Configurar Credenciais

Você precisa criar 3 credenciais no n8n:

#### WordPress (HTTP Basic Auth)
- Vá em **Credentials** → **New Credential** → **HTTP Basic Auth**
- **User:** `admin`
- **Password:** sua Application Password do WordPress
- Associe aos nodes: "Buscar Post no WordPress" e "Atualizar Post WordPress"

#### Google Sheets (OAuth2)
- Vá em **Credentials** → **New Credential** → **Google Sheets OAuth2**
- Siga o processo de autenticação com sua conta Google
- Associe aos nodes: "Ler Planilha Google" e "Atualizar Planilha - Concluído"

#### Google Gemini API (HTTP Query Auth)
- Vá em **Credentials** → **New Credential** → **HTTP Query Auth**
- **Name:** `key`
- **Value:** sua API Key do Google Gemini
- Associe ao node: "IA - Reformular Título (Gemini)"

### 3. Configurar a Planilha Google

Crie uma planilha no Google Sheets com estas colunas:

| URL | Promoção (%) | Novo Título | Nova Descrição | Status |
|-----|-------------|-------------|----------------|--------|
| https://salesesantos.adv.br/advogado-trabalhista-sao-paulo/ | 30 | | | |
| https://salesesantos.adv.br/advogado-previdenciario-rio-de-janeiro/ | 20 | | | |

- **URL** (obrigatória): URL completa do artigo no WordPress
- **Promoção (%)** (obrigatória): Percentual de desconto vigente
- **Novo Título**: Preenchido automaticamente pelo workflow
- **Nova Descrição**: Preenchido automaticamente pelo workflow
- **Status**: Preenchido automaticamente como "Concluído"

Veja o arquivo `planilha-exemplo.csv` para referência.

### 4. Vincular a Planilha ao Workflow

1. Abra o workflow importado no n8n
2. Clique no node **"Ler Planilha Google"**
3. Selecione sua planilha e a aba correta
4. Faça o mesmo no node **"Atualizar Planilha - Concluído"**

## Como Usar

1. Preencha a planilha com as URLs dos artigos e o % de promoção
2. Abra o workflow no n8n
3. Clique em **"Execute Workflow"**
4. Aguarde a execução - cada artigo será processado sequencialmente
5. Confira na planilha: a coluna "Status" mostrará "Concluído" e os novos títulos/descrições

## Personalização

### Trocar o modelo de IA

No node **"IA - Reformular Título (Gemini)"**, na URL, você pode trocar o modelo:
- `gemini-3-pro` (atual) - Mais inteligente, melhor qualidade
- `gemini-2.0-flash` - Mais rápido e econômico
- `temperature`: Ajustar no body JSON (0.3 = conservador, 0.9 = criativo)

### Ajustar o prompt da IA

O prompt está no node **"IA - Reformular Título (Gemini)"** no campo `systemInstruction` do body JSON. Você pode personalizar as regras de reformulação conforme seu estilo.

### Agendar execução automática

Substitua o node "Início Manual" por um **Schedule Trigger** para rodar automaticamente (ex: todo dia às 8h).

## Estrutura do Projeto

```
criador-de-automacoes/
├── .mcp.json                                    # Configuração MCP do n8n
├── README.md                                    # Este arquivo
├── planilha-exemplo.csv                         # Modelo de planilha
└── workflows/
    └── wordpress-promo-automation.json          # Workflow n8n importável
```
