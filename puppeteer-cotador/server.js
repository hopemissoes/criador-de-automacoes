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

// Executar cotação para múltiplas cidades
// WhatsApp é enviado DIRETO do cotador após cada cidade
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
    // Opcional: sobrescrever configuração do WhatsApp
    whatsapp_numero,
    evolution_url,
    evolution_apikey
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
  console.log(`WhatsApp: será enviado após cada cidade`);
  console.log('='.repeat(50));

  status.running = true;
  status.lastRun = new Date().toISOString();

  try {
    // Config opcional para sobrescrever Evolution API
    const config = {};
    if (whatsapp_numero) config.whatsapp_numero = whatsapp_numero;
    if (evolution_url) config.evolution_url = evolution_url;
    if (evolution_apikey) config.evolution_apikey = evolution_apikey;

    const result = await executarCotacao(email, senha, cidadesArray, config);
    status.lastResult = result;
    status.running = false;

    console.log(`\n✅ Cotação finalizada!`);
    console.log(`Total de cidades: ${result.total_cidades || 0}`);
    console.log(`Sucesso: ${result.sucesso || 0}`);
    console.log(`Falhas: ${result.falhas || 0}`);

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

Exemplo (cidades via n8n):
  POST http://localhost:${PORT}/cotacao
  Body: {
    "cidades": "Teresina - PI\\nRecife - PE\\nSalvador - BA"
  }

O WhatsApp é enviado AUTOMATICAMENTE após cada cidade!
Não precisa de webhook nem workflow separado.
`);
});
