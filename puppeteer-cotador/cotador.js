const puppeteer = require('puppeteer');

const wait = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Executa a cotação no Cotador Simplificado
 * BASEADO EXATAMENTE no debug-local.js que funcionou
 */
async function executarCotacao(email, senha, cidade = 'Teresina - PI') {
  const debug = [];
  let browser;

  try {
    console.log('🚀 Iniciando Chrome...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ],
      defaultViewport: { width: 1280, height: 800 }
    });

    const page = await browser.newPage();

    // ========== FASE 1: LOGIN ==========
    console.log('\n=== FASE 1: LOGIN ===');

    await page.goto('https://app.cotadorsimplificado.com.br/login', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    console.log('Página de login carregada');
    await wait(2000);
    debug.push('LOGIN_PAGE');

    // Email
    const emailInput = await page.$('#email_principal');
    if (emailInput) {
      await emailInput.click();
      await emailInput.type(email, { delay: 30 });
      console.log('Email digitado');
    }
    await wait(1000);
    debug.push('EMAIL');

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
    debug.push('CONTINUAR');

    // Senha
    await page.waitForSelector('#pwdInput', { timeout: 15000 });
    const senhaInput = await page.$('#pwdInput');
    if (senhaInput) {
      await senhaInput.click();
      await senhaInput.type(senha, { delay: 30 });
      console.log('Senha digitada');
    }
    await wait(1000);
    debug.push('SENHA');

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
    debug.push('ENTRAR');

    // Clica no Hapvida
    const hapvidaImg = await page.$('img[src*="hapvida"]');
    if (hapvidaImg) {
      const parent = await hapvidaImg.evaluateHandle(el => el.closest('.clickable-element') || el.parentElement.parentElement);
      await parent.click();
      console.log('Clicou no Hapvida');
      await wait(3000);
    }
    debug.push('HAPVIDA');

    console.log('Login concluído!');

    // ========== FASE 2: FORMULÁRIO ==========
    console.log('\n=== FASE 2: FORMULÁRIO ===');

    // Vai para página do Hapvida
    await page.goto('https://app.cotadorsimplificado.com.br/?produto=hap', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await wait(4000);
    console.log('Página Hapvida carregada');
    debug.push('PRODUTO_PAGE');

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
    debug.push('PME');

    // Preenche nome
    await page.waitForSelector('#id-nomelead', { timeout: 10000 });
    const nomeInput = await page.$('#id-nomelead');
    if (nomeInput) {
      await nomeInput.click();
      await wait(300);
      await nomeInput.type('teste', { delay: 30 });
      console.log('Nome preenchido');
    }
    debug.push('NOME');

    // Clica Avançar 1
    console.log('\nClicando Avançar 1...');
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Avan'));
      if (btn) btn.click();
    });
    await wait(3000);
    console.log('Avançar 1 clicado');
    debug.push('AV1');

    // Preenche cidade
    await page.waitForSelector('#cidade_nome', { timeout: 10000 });
    const cidadeInput = await page.$('#cidade_nome');
    if (cidadeInput) {
      await cidadeInput.click();
      await wait(500);
      await cidadeInput.type('teresina', { delay: 100 });
      console.log('Cidade digitada: teresina');
    }

    // Espera o dropdown filtrar
    console.log('Aguardando dropdown filtrar para Teresina...');
    await wait(2000);

    // Pega as coordenadas do elemento clickable-element com Teresina e clica
    const teresinaCoords = await page.evaluate(() => {
      const clickables = document.querySelectorAll('.clickable-element');
      for (const el of clickables) {
        if (el.textContent.trim() === 'Teresina - PI') {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
          }
        }
      }
      return null;
    });

    if (teresinaCoords) {
      console.log('Clicando via page.mouse.click()...');
      await page.mouse.click(teresinaCoords.x, teresinaCoords.y);
      console.log('Cidade clicada via mouse');
    }
    await wait(2000);
    debug.push('CIDADE');

    // Seleciona empresa MEI
    console.log('\nSelecionando empresa MEI...');
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
    debug.push('MEI');

    // Clica Avançar 2 (botão VISÍVEL)
    console.log('\nClicando Avançar 2...');
    const buttons2 = await page.$$('button');
    for (const btn of buttons2) {
      const info = await page.evaluate(el => {
        const style = window.getComputedStyle(el);
        return {
          text: el.textContent,
          display: style.display,
          visibility: style.visibility
        };
      }, btn);
      if (info.text && info.text.includes('Avan') && info.display !== 'none' && info.visibility !== 'hidden') {
        await btn.click();
        console.log('Avançar 2 clicado');
        break;
      }
    }
    await wait(3000);
    debug.push('AV2');

    // ========== FASE 3: FAIXAS ETÁRIAS ==========
    console.log('\n=== FASE 3: FAIXAS ETÁRIAS ===');

    // Preenche APENAS os inputs de faixas etárias
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
    debug.push('FX:' + faixasResult);

    // Clica Avançar 3 (botão VISÍVEL)
    console.log('\nClicando Avançar 3...');
    const buttons3 = await page.$$('button');
    for (const btn of buttons3) {
      const info = await page.evaluate(el => {
        const style = window.getComputedStyle(el);
        return {
          text: el.textContent,
          display: style.display,
          visibility: style.visibility
        };
      }, btn);
      if (info.text && info.text.includes('Avan') && info.display !== 'none' && info.visibility !== 'hidden') {
        await btn.click();
        console.log('Avançar 3 clicado');
        break;
      }
    }
    await wait(4000);
    debug.push('AV3');

    // ========== FASE 4: ADD PRODUTOS ==========
    console.log('\n=== FASE 4: ADD PRODUTOS ===');

    const buttons4 = await page.$$('button');
    for (const btn of buttons4) {
      const info = await page.evaluate(el => {
        const style = window.getComputedStyle(el);
        return {
          text: el.textContent.trim(),
          display: style.display,
          visibility: style.visibility
        };
      }, btn);
      if (info.text === 'Add Produtos' && info.display !== 'none' && info.visibility !== 'hidden') {
        await btn.click();
        console.log('Add Produtos clicado');
        break;
      }
    }
    await wait(3000);
    debug.push('ADD');

    // ========== FASE 5: CLICA EM HAPVIDA ==========
    console.log('\n=== FASE 5: CLICA EM HAPVIDA ===');

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
    debug.push('HAP_MODAL');

    // ========== FASE 6: ESCOLHER TABELA ==========
    console.log('\n=== FASE 6: ESCOLHER TABELA ===');

    const tabelaCoords = await page.evaluate(() => {
      const clickables = document.querySelectorAll('.clickable-element');
      for (const el of clickables) {
        const text = el.textContent.trim();
        if (text.includes('Teresina') && text.includes('2') && text.includes('29')) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
          }
        }
      }
      return null;
    });

    if (tabelaCoords) {
      await page.mouse.click(tabelaCoords.x, tabelaCoords.y);
      console.log('Tabela clicada');
    }
    await wait(2000);
    debug.push('TABELA');

    // ========== FASE 7: AMBULATORIAL ==========
    console.log('\n=== FASE 7: CLICA EM AMBULATORIAL ===');

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
    debug.push('AMBUL');

    // ========== FASE 8: ACOMODAÇÃO ==========
    console.log('\n=== FASE 8: CLICA EM SEM ACOMODAÇÃO ===');

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
    debug.push('ACOMOD');

    // ========== FASE 9: FECHA MODAL ==========
    console.log('\n=== FASE 9: FECHA O MODAL ===');

    await page.mouse.click(1200, 400);
    console.log('Clique em espaço vazio executado');
    await wait(3000);
    debug.push('FECHA');

    // ========== FASE 10: EXTRAI VALORES ==========
    console.log('\n=== FASE 10: EXTRAI VALORES ===');

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

    debug.push('V:' + faixas.length);
    console.log(`\n✅ Extração concluída! ${faixas.length} faixas encontradas.`);

    await browser.close();

    return {
      success: true,
      debug: debug.join('-'),
      faixas
    };

  } catch (error) {
    console.error('\n❌ ERRO:', error.message);
    debug.push('ERRO');
    if (browser) {
      await browser.close();
    }
    return {
      success: false,
      error: error.message,
      debug: debug.join('-')
    };
  }
}

module.exports = { executarCotacao };
