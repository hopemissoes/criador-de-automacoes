const express = require('express');
const { executarCotacao } = require('./cotador');

const app = express();
app.use(express.json());

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

// Executar cotação para múltiplas cidades COM WEBHOOK por cidade
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
    cidades = 'Teresina - PI',
    webhook_url = null  // URL para enviar resultado de cada cidade
  } = req.body || {};

  // Converte cidades para array se for string
  let cidadesArray = cidades;
  if (typeof cidades === 'string') {
    cidadesArray = cidades.split('\n').map(c => c.trim()).filter(c => c.length > 0);
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`[${new Date().toISOString()}] Iniciando cotação...`);
  console.log(`Email: ${email}`);
  console.log(`Cidades (${cidadesArray.length}):`, cidadesArray);
  console.log(`Webhook: ${webhook_url || 'não configurado'}`);
  console.log('='.repeat(50));

  status.running = true;
  status.lastRun = new Date().toISOString();

  try {
    const result = await executarCotacao(email, senha, cidadesArray, webhook_url);
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

Exemplo n8n (com webhook por cidade):
  POST http://localhost:${PORT}/cotacao
  Body: {
    "cidades": "Teresina - PI\\nRecife - PE",
    "webhook_url": "http://n8n:5678/webhook/cotacao-resultado"
  }

  O webhook receberá após CADA cidade:
  {
    "cidade": "Teresina - PI",
    "cidade_index": 1,
    "total_cidades": 2,
    "success": true,
    "faixas": [...]
  }
`);
});
