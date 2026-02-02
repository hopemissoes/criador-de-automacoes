const puppeteer = require('puppeteer');

/**
 * Executa a cotação no Cotador Simplificado
 * Baseado no debug-local.js que funcionou
 */
async function executarCotacao(email, senha, cidade = 'Teresina - PI') {
  const debug = [];
  let browser;

  try {
    // Inicia o browser (usa Chromium embutido do Puppeteer)
    console.log('🚀 Iniciando browser...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
        '--no-zygote',
        '--window-size=1280,800'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    const w = (ms) => new Promise(r => setTimeout(r, ms));

    // === LOGIN ===
    console.log('📍 Acessando página de login...');
    await page.goto('https://app.cotadorsimplificado.com.br/login', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    await w(3000);
    debug.push('LOGIN_PAGE');

    // Email
    console.log('📧 Preenchendo email...');
    const emailInput = await page.$('#email_principal');
    if (emailInput) {
      await emailInput.click();
      await w(300);
      await emailInput.type(email, { delay: 30 });
    }
    await w(1000);
    debug.push('EMAIL');

    // Continuar com Email
    console.log('🔘 Clicando em Continuar...');
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')]
        .find(b => b.textContent.includes('Continuar com Email'));
      if (btn) btn.click();
    });
    await w(4000);
    debug.push('CONTINUAR');

    // Senha
    console.log('🔑 Preenchendo senha...');
    const senhaInput = await page.$('#pwdInput');
    if (senhaInput) {
      await senhaInput.click();
      await w(300);
      await senhaInput.type(senha, { delay: 30 });
    }
    await w(1000);
    debug.push('SENHA');

    // Entrar
    console.log('🚪 Clicando em Entrar...');
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')]
        .find(b => b.textContent.trim() === 'Entrar');
      if (btn) btn.click();
    });
    await w(6000);
    debug.push('ENTRAR');

    // Hapvida
    console.log('🏥 Selecionando Hapvida...');
    await page.evaluate(() => {
      const img = document.querySelector('img[src*="hapvida"]');
      if (img) {
        const parent = img.closest('.clickable-element') || img.parentElement?.parentElement;
        if (parent) parent.click();
      }
    });
    await w(3000);
    debug.push('HAPVIDA');

    // === NAVEGA PARA PÁGINA DO PRODUTO (igual ao local) ===
    console.log('📄 Navegando para página do produto...');
    await page.goto('https://app.cotadorsimplificado.com.br/?produto=hap', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await w(4000);
    debug.push('PRODUTO_PAGE');

    // === FORMULÁRIO ===
    // PME
    console.log('📋 Clicando em PME...');
    await page.evaluate(() => {
      const pme = [...document.querySelectorAll('.clickable-element')]
        .find(e => e.textContent.includes('PME') && e.textContent.includes('29'));
      if (pme) pme.click();
    });
    await w(3000);
    debug.push('PME');

    // Nome - com retry
    console.log('✏️ Preenchendo nome...');
    let nomeOk = false;
    for (let i = 0; i < 15; i++) {
      const nomeInput = await page.$('#id-nomelead');
      if (nomeInput) {
        await nomeInput.click();
        await nomeInput.type('teste', { delay: 20 });
        nomeOk = true;
        break;
      }
      await w(1000);
    }
    if (!nomeOk) {
      throw new Error('Campo nome não encontrado após 15 tentativas');
    }
    await w(1000);
    debug.push('NOME');

    // Avançar 1
    console.log('➡️ Avançar 1...');
    await clickVisibleButton(page, 'Avan');
    await w(4000);
    debug.push('AV1');

    // Cidade - com retry
    console.log('🏙️ Preenchendo cidade...');
    let cidadeOk = false;
    for (let i = 0; i < 15; i++) {
      const cidadeInput = await page.$('#cidade_nome');
      if (cidadeInput) {
        await cidadeInput.click();
        await w(500);
        await cidadeInput.type('teresina', { delay: 80 });
        cidadeOk = true;
        break;
      }
      await w(1000);
    }
    if (!cidadeOk) {
      throw new Error('Campo cidade não encontrado');
    }
    await w(2500);

    // Seleciona Teresina - PI usando mouse.click
    console.log('📍 Selecionando Teresina - PI...');
    const teresina = await page.evaluate(() => {
      for (const el of document.querySelectorAll('.clickable-element')) {
        if (el.textContent.trim() === 'Teresina - PI') {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0) {
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
          }
        }
      }
      return null;
    });
    if (teresina) {
      await page.mouse.click(teresina.x, teresina.y);
    }
    await w(2500);
    debug.push('CIDADE');

    // MEI
    console.log('🏢 Selecionando MEI...');
    try {
      await page.select('select.Dropdown', '"mei___empres_rio_individual"');
    } catch (e) { /* ignora */ }
    await w(2000);
    debug.push('MEI');

    // Avançar 2
    console.log('➡️ Avançar 2...');
    await clickVisibleButton(page, 'Avan');
    await w(4000);
    debug.push('AV2');

    // Faixas
    console.log('👥 Preenchendo faixas etárias...');
    const faixasCount = await page.evaluate(() => {
      let count = 0;
      document.querySelectorAll('input').forEach(inp => {
        const rect = inp.getBoundingClientRect();
        const style = getComputedStyle(inp);
        if (rect.width > 0 && style.display !== 'none' && !inp.id &&
            inp.placeholder === '0' && inp.className.includes('cocys')) {
          inp.value = '1';
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
          count++;
        }
      });
      return count;
    });
    await w(2000);
    debug.push(`FX:${faixasCount}`);

    // Avançar 3
    console.log('➡️ Avançar 3...');
    await clickVisibleButton(page, 'Avan');
    await w(5000);
    debug.push('AV3');

    // Add Produtos
    console.log('➕ Add Produtos...');
    await clickVisibleButton(page, 'Add Produtos', true);
    await w(4000);
    debug.push('ADD');

    // Hapvida no modal
    console.log('🏥 Selecionando Hapvida no modal...');
    const hapModal = await page.evaluate(() => {
      for (const el of document.querySelectorAll('.clickable-element')) {
        if (el.textContent.trim() === 'Hapvida') {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0) {
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
          }
        }
      }
      return null;
    });
    if (hapModal) {
      await page.mouse.click(hapModal.x, hapModal.y);
    }
    await w(4000);
    debug.push('HAP_MODAL');

    // Tabela
    console.log('📊 Selecionando tabela...');
    const tabela = await page.evaluate(() => {
      for (const el of document.querySelectorAll('.clickable-element')) {
        const t = el.textContent.trim();
        if (t.includes('Teresina') && t.includes('2') && t.includes('29')) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0) {
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
          }
        }
      }
      return null;
    });
    if (tabela) {
      await page.mouse.click(tabela.x, tabela.y);
    }
    await w(3000);
    debug.push('TABELA');

    // Ambulatorial
    console.log('🏥 Selecionando Ambulatorial...');
    const ambulatorial = await page.evaluate(() => {
      for (const el of document.querySelectorAll('.clickable-element')) {
        if (el.textContent.trim() === 'Ambulatorial') {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0) {
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
          }
        }
      }
      return null;
    });
    if (ambulatorial) {
      await page.mouse.click(ambulatorial.x, ambulatorial.y);
    }
    await w(2500);
    debug.push('AMBUL');

    // Acomodação
    console.log('🛏️ Selecionando acomodação...');
    const acomodacao = await page.evaluate(() => {
      for (const el of document.querySelectorAll('.clickable-element')) {
        const t = el.textContent.trim().toLowerCase();
        if (t.includes('sem acomodação') && t.includes('coparticipação')) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0) {
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
          }
        }
      }
      return null;
    });
    if (acomodacao) {
      await page.mouse.click(acomodacao.x, acomodacao.y);
    }
    await w(2500);
    debug.push('ACOMOD');

    // Fecha modal
    console.log('❌ Fechando modal...');
    await page.mouse.click(1200, 400);
    await w(4000);
    debug.push('FECHA');

    // === EXTRAI VALORES ===
    console.log('📊 Extraindo valores...');
    const faixas = await page.evaluate(() => {
      const nomes = [
        '0 a 18 anos', '19 a 23 anos', '24 a 28 anos', '29 a 33 anos',
        '34 a 38 anos', '39 a 43 anos', '44 a 48 anos', '49 a 53 anos',
        '54 a 58 anos', '59 anos ou mais'
      ];
      const valores = [];
      const regex = /^\d{2,3}[,.]\d{2}$/;

      document.querySelectorAll('div, span').forEach(el => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        if (style.display !== 'none' && rect.width > 0 && el.textContent.length < 15) {
          const text = el.textContent.trim();
          if (regex.test(text) && !valores.some(v => v.text === text)) {
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

    debug.push(`V:${faixas.length}`);

    console.log(`\n✅ Extração concluída! ${faixas.length} faixas encontradas.`);

    await browser.close();

    return {
      success: true,
      debug: debug.join('-'),
      faixas
    };

  } catch (error) {
    console.error(`❌ Erro: ${error.message}`);
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

/**
 * Clica em um botão visível que contém o texto
 */
async function clickVisibleButton(page, text, exact = false) {
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const info = await page.evaluate((el, txt, ex) => {
      const style = getComputedStyle(el);
      const content = el.textContent.trim();
      const matches = ex ? content === txt : content.includes(txt);
      return {
        matches,
        visible: style.display !== 'none' && style.visibility !== 'hidden'
      };
    }, btn, text, exact);

    if (info.matches && info.visible) {
      await btn.click();
      return true;
    }
  }
  return false;
}

module.exports = { executarCotacao };
