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

// Executar cotação
app.post('/cotacao', async (req, res) => {
  if (status.running) {
    return res.status(429).json({
      success: false,
      error: 'Já existe uma cotação em andamento'
    });
  }

  // Parâmetros opcionais
  const {
    email = 'jessicamendesbarbosa5@gmail.com',
    senha = 'amovoced28',
    cidade = 'Teresina - PI'
  } = req.body || {};

  console.log(`\n${'='.repeat(50)}`);
  console.log(`[${new Date().toISOString()}] Iniciando cotação...`);
  console.log(`Email: ${email}`);
  console.log(`Cidade: ${cidade}`);
  console.log('='.repeat(50));

  status.running = true;
  status.lastRun = new Date().toISOString();

  try {
    const result = await executarCotacao(email, senha, cidade);
    status.lastResult = result;
    status.running = false;

    console.log(`\n✅ Cotação finalizada!`);
    console.log(`Faixas encontradas: ${result.faixas?.length || 0}`);

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

Exemplo n8n:
  POST http://localhost:${PORT}/cotacao
  Body: {"email": "...", "senha": "...", "cidade": "Teresina - PI"}
`);
});
