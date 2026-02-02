/**
 * Script para debug local - roda com Chrome visível
 * VERSÃO COM MÚLTIPLAS CIDADES (Teresina + Recife)
 *
 * Requisitos:
 *   npm install puppeteer
 *
 * Uso:
 *   node debug-local.js
 */

const puppeteer = require('puppeteer');

const EMAIL = 'jessicamendesbarbosa5@gmail.com';
const SENHA = 'amovoced28';

// Lista de cidades para cotar
const CIDADES = [
  { nome: 'Teresina', busca: 'teresina', seletor: 'Teresina - PI', tabela: 'Teresina' },
  { nome: 'Recife', busca: 'recife', seletor: 'Recife - PE', tabela: 'Recife' }
];

const wait = (ms) => new Promise(r => setTimeout(r, ms));

// Função para extrair valores das faixas etárias
async function extrairFaixas(page, cidade) {
  const faixas = await page.evaluate(() => {
    const nomes = [
      '0 a 18 anos', '19 a 23 anos', '24 a 28 anos', '29 a 33 anos',
      '34 a 38 anos', '39 a 43 anos', '44 a 48 anos', '49 a 53 anos',
      '54 a 58 anos', '59 anos ou mais'
    ];

    const isVisible = (el) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };

    const valores = [];
    const valorRegex = /^\d{2,3}[.,]\d{2}$/;

    document.querySelectorAll('div, span').forEach((el) => {
      if (isVisible(el) && el.textContent.length < 15) {
        const text = el.textContent.trim();
        if (valorRegex.test(text) && !valores.some(v => v.text === text)) {
          const rect = el.getBoundingClientRect();
          valores.push({ text, y: rect.y, x: rect.x });
        }
      }
    });

    valores.sort((a, b) => a.y - b.y);

    return valores.slice(0, 10).map((v, i) => ({
      faixa_etaria: nomes[i] || `Faixa ${i + 1}`,
      valor: 'R$ ' + v.text.replace('.', ',')
    }));
  });

  console.log(`\n=== FAIXAS ETÁRIAS - ${cidade} ===`);
  faixas.forEach(f => console.log(`${f.faixa_etaria}: ${f.valor}`));

  return faixas;
}

// Função para clicar em botão "Voltar"
async function clicarVoltar(page) {
  const voltarClicado = await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    for (const btn of buttons) {
      const style = window.getComputedStyle(btn);
      if (btn.textContent.includes('Voltar') && style.display !== 'none' && style.visibility !== 'hidden') {
        btn.click();
        return true;
      }
    }
    return false;
  });
  return voltarClicado;
}

// Função para preencher cidade e seguir o fluxo
async function processarCidade(page, cidade, isFirstCity) {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`PROCESSANDO CIDADE: ${cidade.nome}`);
  console.log('='.repeat(50));

  if (!isFirstCity) {
    // Se não é a primeira cidade, precisa limpar e preencher o campo cidade
    const cidadeInput = await page.$('#cidade_nome');
    if (cidadeInput) {
      // Limpa o campo
      await cidadeInput.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await wait(500);

      // Digita a nova cidade
      await cidadeInput.type(cidade.busca, { delay: 100 });
      console.log(`Cidade digitada: ${cidade.busca}`);
    }
  } else {
    // Primeira cidade - preenche normalmente
    await page.waitForSelector('#cidade_nome', { timeout: 10000 });
    const cidadeInput = await page.$('#cidade_nome');
    if (cidadeInput) {
      await cidadeInput.click();
      await wait(500);
      await cidadeInput.type(cidade.busca, { delay: 100 });
      console.log(`Cidade digitada: ${cidade.busca}`);
    }
  }

  // Espera o dropdown filtrar
  console.log(`Aguardando dropdown filtrar para ${cidade.nome}...`);
  await wait(2000);

  // Clica na cidade
  const cidadeCoords = await page.evaluate((seletor) => {
    const clickables = document.querySelectorAll('.clickable-element');
    for (const el of clickables) {
      if (el.textContent.trim() === seletor) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
        }
      }
    }
    return null;
  }, cidade.seletor);

  if (cidadeCoords) {
    await page.mouse.click(cidadeCoords.x, cidadeCoords.y);
    console.log(`${cidade.nome} clicada`);
  } else {
    console.log(`ERRO: ${cidade.seletor} não encontrado!`);
    return null;
  }
  await wait(2000);

  // Seleciona empresa MEI
  console.log('Selecionando empresa MEI...');
  try {
    await page.waitForSelector('select.Dropdown', { timeout: 5000 });
    await page.click('select.Dropdown');
    await wait(500);
    await page.select('select.Dropdown', '"mei___empres_rio_individual"');
    console.log('MEI selecionado');
  } catch(e) {
    console.log('Erro ao selecionar MEI:', e.message);
  }
  await wait(1500);

  // Clica Avançar 2
  console.log('Clicando Avançar 2...');
  const buttons2 = await page.$$('button');
  for (const btn of buttons2) {
    const info = await page.evaluate(el => {
      const style = window.getComputedStyle(el);
      return { text: el.textContent, display: style.display, visibility: style.visibility };
    }, btn);
    if (info.text && info.text.includes('Avan') && info.display !== 'none' && info.visibility !== 'hidden') {
      await btn.click();
      console.log('Avançar 2 clicado');
      break;
    }
  }
  await wait(3000);

  // Preenche faixas etárias
  console.log('Preenchendo faixas etárias...');
  const faixasResult = await page.evaluate(() => {
    const allInputs = document.querySelectorAll('input');
    let count = 0;

    [...allInputs].forEach((inp) => {
      const rect = inp.getBoundingClientRect();
      const style = window.getComputedStyle(inp);
      const isVisible = rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      const isFaixaInput = inp.placeholder === '0' && inp.className.includes('cocys');

      if (isVisible && !inp.id && isFaixaInput) {
        inp.focus();
        inp.value = '1';
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
        count++;
      }
    });

    return count;
  });
  console.log('Faixas preenchidas:', faixasResult);
  await wait(1500);

  // Clica Avançar 3
  console.log('Clicando Avançar 3...');
  const buttons3 = await page.$$('button');
  for (const btn of buttons3) {
    const info = await page.evaluate(el => {
      const style = window.getComputedStyle(el);
      return { text: el.textContent, display: style.display, visibility: style.visibility };
    }, btn);
    if (info.text && info.text.includes('Avan') && info.display !== 'none' && info.visibility !== 'hidden') {
      await btn.click();
      console.log('Avançar 3 clicado');
      break;
    }
  }
  await wait(4000);

  // Clica em Add Produtos
  console.log('Clicando Add Produtos...');
  const buttons4 = await page.$$('button');
  for (const btn of buttons4) {
    const info = await page.evaluate(el => {
      const style = window.getComputedStyle(el);
      return { text: el.textContent.trim(), display: style.display, visibility: style.visibility };
    }, btn);
    if (info.text === 'Add Produtos' && info.display !== 'none' && info.visibility !== 'hidden') {
      await btn.click();
      console.log('Add Produtos clicado');
      break;
    }
  }
  await wait(3000);

  // Clica em Hapvida
  console.log('Clicando em Hapvida...');
  const hapvidaCoords = await page.evaluate(() => {
    const clickables = document.querySelectorAll('.clickable-element');
    for (const el of clickables) {
      if (el.textContent.trim() === 'Hapvida') {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
        }
      }
    }
    return null;
  });

  if (hapvidaCoords) {
    await page.mouse.click(hapvidaCoords.x, hapvidaCoords.y);
    console.log('Hapvida clicado');
  }
  await wait(3000);

  // Clica na tabela da cidade
  console.log(`Clicando na tabela de ${cidade.nome}...`);
  const tabelaCoords = await page.evaluate((cidadeTabela) => {
    const clickables = document.querySelectorAll('.clickable-element');
    for (const el of clickables) {
      const text = el.textContent.trim();
      if (text.includes(cidadeTabela) && text.includes('2') && text.includes('29')) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, text };
        }
      }
    }
    return null;
  }, cidade.tabela);

  if (tabelaCoords) {
    await page.mouse.click(tabelaCoords.x, tabelaCoords.y);
    console.log(`Tabela clicada: ${tabelaCoords.text}`);
  } else {
    console.log(`AVISO: Tabela de ${cidade.nome} não encontrada, tentando primeira disponível...`);
    // Tenta clicar na primeira tabela disponível
    const primeiraTabela = await page.evaluate(() => {
      const clickables = document.querySelectorAll('.clickable-element');
      for (const el of clickables) {
        const text = el.textContent.trim();
        if (text.includes('2') && text.includes('29') && !text.includes('Hapvida')) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, text };
          }
        }
      }
      return null;
    });
    if (primeiraTabela) {
      await page.mouse.click(primeiraTabela.x, primeiraTabela.y);
      console.log(`Tabela alternativa clicada: ${primeiraTabela.text}`);
    }
  }
  await wait(2000);

  // Clica em Ambulatorial
  console.log('Clicando em Ambulatorial...');
  const ambulatorialCoords = await page.evaluate(() => {
    const clickables = document.querySelectorAll('.clickable-element');
    for (const el of clickables) {
      if (el.textContent.trim() === 'Ambulatorial') {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
        }
      }
    }
    return null;
  });

  if (ambulatorialCoords) {
    await page.mouse.click(ambulatorialCoords.x, ambulatorialCoords.y);
    console.log('Ambulatorial clicado');
  }
  await wait(2000);

  // Clica em "Sem acomodação / Com coparticipação"
  console.log('Clicando em Sem acomodação / Com coparticipação...');
  const acomodacaoCoords = await page.evaluate(() => {
    const clickables = document.querySelectorAll('.clickable-element');
    for (const el of clickables) {
      const text = el.textContent.trim().toLowerCase();
      if (text.includes('sem acomodação') && text.includes('coparticipação')) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
        }
      }
    }
    return null;
  });

  if (acomodacaoCoords) {
    await page.mouse.click(acomodacaoCoords.x, acomodacaoCoords.y);
    console.log('Acomodação clicada');
  }
  await wait(2000);

  // Fecha o modal
  console.log('Fechando modal (clique em espaço vazio)...');
  await page.mouse.click(1200, 400);
  await wait(3000);

  // Extrai os valores das faixas etárias
  const faixas = await extrairFaixas(page, cidade.nome);

  // Aguarda tempo extra para n8n captar os dados
  console.log('\n>>> Aguardando 5 segundos para n8n captar os dados... <<<');
  await wait(5000);

  return faixas;
}

async function main() {
  console.log('Iniciando Chrome...');

  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 50,
    defaultViewport: { width: 1280, height: 800 },
    args: ['--start-maximized']
  });

  const page = await browser.newPage();
  const resultados = {};

  try {
    // ========== FASE 1: LOGIN ==========
    console.log('\n=== FASE 1: LOGIN ===');

    await page.goto('https://app.cotadorsimplificado.com.br/login', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    console.log('Página de login carregada');
    await wait(2000);

    // Email
    const emailInput = await page.$('#email_principal');
    if (emailInput) {
      await emailInput.click();
      await emailInput.type(EMAIL, { delay: 30 });
      console.log('Email digitado');
    }
    await wait(1000);

    // Botão Continuar com Email
    let buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent, btn);
      if (text && text.includes('Continuar com Email')) {
        await btn.click();
        console.log('Clicou em Continuar com Email');
        break;
      }
    }
    await wait(2000);

    // Senha
    await page.waitForSelector('#pwdInput', { timeout: 15000 });
    const senhaInput = await page.$('#pwdInput');
    if (senhaInput) {
      await senhaInput.click();
      await senhaInput.type(SENHA, { delay: 30 });
      console.log('Senha digitada');
    }
    await wait(1000);

    // Botão Entrar
    buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await page.evaluate(el => el.textContent.trim(), btn);
      if (text === 'Entrar') {
        await btn.click();
        console.log('Clicou em Entrar');
        break;
      }
    }
    await wait(6000);

    // Clica no Hapvida
    const hapvidaImg = await page.$('img[src*="hapvida"]');
    if (hapvidaImg) {
      const parent = await hapvidaImg.evaluateHandle(el => el.closest('.clickable-element') || el.parentElement.parentElement);
      await parent.click();
      console.log('Clicou no Hapvida');
      await wait(3000);
    }

    console.log('Login concluído!');

    // ========== FASE 2: FORMULÁRIO INICIAL ==========
    console.log('\n=== FASE 2: FORMULÁRIO ===');

    // Vai para página do Hapvida
    await page.goto('https://app.cotadorsimplificado.com.br/?produto=hap', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await wait(4000);
    console.log('Página Hapvida carregada');

    // Clica em PME
    const pmeClicked = await page.evaluate(() => {
      const pme = [...document.querySelectorAll('.clickable-element')].find(e =>
        e.textContent.includes('PME') && e.textContent.includes('29')
      );
      if (pme) { pme.click(); return true; }
      return false;
    });
    console.log('PME clicado:', pmeClicked);
    await wait(2000);

    // Preenche nome
    await page.waitForSelector('#id-nomelead', { timeout: 10000 });
    const nomeInput = await page.$('#id-nomelead');
    if (nomeInput) {
      await nomeInput.click();
      await wait(300);
      await nomeInput.type('teste', { delay: 30 });
      console.log('Nome preenchido');
    }

    // Clica Avançar 1
    console.log('Clicando Avançar 1...');
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Avan'));
      if (btn) btn.click();
    });
    await wait(3000);
    console.log('Avançar 1 clicado');

    // ========== PROCESSA CADA CIDADE ==========
    for (let i = 0; i < CIDADES.length; i++) {
      const cidade = CIDADES[i];
      const isFirstCity = (i === 0);

      const faixas = await processarCidade(page, cidade, isFirstCity);
      resultados[cidade.nome] = faixas;

      // Se não é a última cidade, volta para a página de cidades
      if (i < CIDADES.length - 1) {
        console.log('\n>>> VOLTANDO PARA PRÓXIMA CIDADE <<<');

        // Clica Voltar (vai para página das faixas)
        console.log('Clicando Voltar (1)...');
        await clicarVoltar(page);
        await wait(2000);

        // Clica Voltar novamente (vai para página das cidades)
        console.log('Clicando Voltar (2)...');
        await clicarVoltar(page);
        await wait(2000);

        console.log('Voltou para página de cidades');
      }
    }

    // ========== RESUMO FINAL ==========
    console.log('\n' + '='.repeat(60));
    console.log('RESUMO FINAL - COTAÇÕES');
    console.log('='.repeat(60));

    for (const [cidade, faixas] of Object.entries(resultados)) {
      console.log(`\n--- ${cidade} ---`);
      if (faixas && faixas.length > 0) {
        faixas.forEach(f => console.log(`  ${f.faixa_etaria}: ${f.valor}`));
      } else {
        console.log('  Sem dados');
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('JSON FINAL:');
    console.log('='.repeat(60));
    console.log(JSON.stringify(resultados, null, 2));

    console.log('\n\n>>> O CHROME VAI FICAR ABERTO PARA VOCÊ INSPECIONAR <<<');
    console.log('>>> PRESSIONE CTRL+C NO TERMINAL PARA FECHAR <<<\n');

    // Mantém aberto para inspeção
    await wait(600000);

  } catch (error) {
    console.error('\n!!! ERRO !!!');
    console.error(error.message);
    console.log('\n>>> O CHROME VAI FICAR ABERTO PARA VOCÊ INSPECIONAR <<<');
    await wait(600000);
  }
}

main();
