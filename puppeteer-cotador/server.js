const express = require('express');
const { executarCotacao } = require('./cotador');

const app = express();
app.use(express.json());

// Mapeamento de cidades para UF (auto-completar)
const CIDADES_UF = {
  // Nordeste
  'teresina': 'PI',
  'recife': 'PE',
  'fortaleza': 'CE',
  'salvador': 'BA',
  'natal': 'RN',
  'joao pessoa': 'PB',
  'maceio': 'AL',
  'aracaju': 'SE',
  'sao luis': 'MA',
  // Sudeste
  'sao paulo': 'SP',
  'rio de janeiro': 'RJ',
  'belo horizonte': 'MG',
  'vitoria': 'ES',
  'campinas': 'SP',
  'guarulhos': 'SP',
  'santos': 'SP',
  'niteroi': 'RJ',
  'uberlandia': 'MG',
  // Sul
  'curitiba': 'PR',
  'porto alegre': 'RS',
  'florianopolis': 'SC',
  'londrina': 'PR',
  'joinville': 'SC',
  // Centro-Oeste
  'brasilia': 'DF',
  'goiania': 'GO',
  'campo grande': 'MS',
  'cuiaba': 'MT',
  // Norte
  'manaus': 'AM',
  'belem': 'PA',
  'porto velho': 'RO',
  'macapa': 'AP',
  'boa vista': 'RR',
  'palmas': 'TO',
  'rio branco': 'AC',
  // Cidades adicionais Hapvida
  'petrolina': 'PE',
  'caruaru': 'PE',
  'olinda': 'PE',
  'jaboatao': 'PE',
  'paulista': 'PE',
  'parnaiba': 'PI',
  'picos': 'PI',
  'sobral': 'CE',
  'juazeiro do norte': 'CE',
  'caucaia': 'CE',
  'feira de santana': 'BA',
  'vitoria da conquista': 'BA',
  'ilheus': 'BA',
  'itabuna': 'BA',
  'mossoró': 'RN',
  'parnamirim': 'RN',
  'campina grande': 'PB',
  'imperatriz': 'MA'
};

// Função para normalizar e completar cidade com UF
function normalizarCidade(cidade) {
  // Se já tem " - ", retorna como está
  if (cidade.includes(' - ')) {
    return cidade;
  }

  // Normaliza para buscar no mapa (minúsculo, sem acentos)
  const cidadeNormalizada = cidade.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim();

  // Busca UF no mapa
  const uf = CIDADES_UF[cidadeNormalizada];

  if (uf) {
    // Capitaliza primeira letra de cada palavra
    const cidadeCapitalizada = cidade.trim()
      .split(' ')
      .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join(' ');
    return `${cidadeCapitalizada} - ${uf}`;
  }

  // Se não encontrou, retorna original (vai falhar no dropdown)
  console.log(`⚠️ Cidade não mapeada: ${cidade}`);
  return cidade;
}

// Status da execução
let status = {
  running: false,
  lastResult: null,
  lastRun: null
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', running: status.running });
});

// Status da última execução
app.get('/status', (req, res) => {
  res.json(status);
});

// Executar cotação para múltiplas cidades
app.post('/cotacao', async (req, res) => {
  if (status.running) {
    return res.status(429).json({
      success: false,
      error: 'Já existe uma cotação em andamento'
    });
  }

  // Parâmetros
  const {
    email = 'jessicamendesbarbosa5@gmail.com',
    senha = 'amovoced28',
    cidades = 'Teresina - PI'  // Pode ser string (uma por linha) ou array
  } = req.body || {};

  // Converte cidades para array se for string
  let cidadesArray = cidades;
  if (typeof cidades === 'string') {
    cidadesArray = cidades.split('\n').map(c => c.trim()).filter(c => c.length > 0);
  }

  // Normaliza cidades (auto-completa UF se necessário)
  cidadesArray = cidadesArray.map(c => normalizarCidade(c));
  console.log('Cidades normalizadas:', cidadesArray);

  console.log(`\n${'='.repeat(50)}`);
  console.log(`[${new Date().toISOString()}] Iniciando cotação...`);
  console.log(`Email: ${email}`);
  console.log(`Cidades (${cidadesArray.length}):`, cidadesArray);
  console.log('='.repeat(50));

  status.running = true;
  status.lastRun = new Date().toISOString();

  try {
    const result = await executarCotacao(email, senha, cidadesArray);
    status.lastResult = result;
    status.running = false;

    console.log(`\n✅ Cotação finalizada!`);
    console.log(`Total de cidades processadas: ${result.total_cidades || 0}`);

    res.json(result);
  } catch (error) {
    status.running = false;
    status.lastResult = { success: false, error: error.message };

    console.error(`\n❌ Erro: ${error.message}`);

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
🚀 Puppeteer Cotador API
========================
Porta: ${PORT}

Endpoints:
  GET  /health  - Health check
  GET  /status  - Status da última execução
  POST /cotacao - Executar cotação

Exemplo n8n (múltiplas cidades):
  POST http://localhost:${PORT}/cotacao
  Body: {
    "email": "...",
    "senha": "...",
    "cidades": "Teresina - PI\\nRecife - PE\\nSalvador - BA"
  }

  Ou com array:
  Body: {
    "cidades": ["Teresina - PI", "Recife - PE"]
  }
`);
});
