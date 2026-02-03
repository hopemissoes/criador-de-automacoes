/**
 * Script para debug local - roda com Chrome visível
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

const wait = (ms) => new Promise(r => setTimeout(r, ms));

// Função para verificar o estado da cidade (todos os campos possíveis)
async function checkCidade(page, momento) {
  const info = await page.evaluate(() => {
    const result = {};

    // Campo principal
    const inp = document.querySelector('#cidade_nome');
    result.cidade_nome = inp ? inp.value : 'não encontrado';

    // Procura outros campos que possam conter cidade
    const allInputs = document.querySelectorAll('input');
    allInputs.forEach(i => {
      if (i.value && i.value.length > 0 && i.value.length < 50) {
        if (i.id) result[`input#${i.id}`] = i.value;
      }
    });

    // Procura data attributes relacionados a cidade
    const elementsWithData = document.querySelectorAll('[data-cidade], [data-city], [data-value]');
    elementsWithData.forEach((el, idx) => {
      result[`data-${idx}`] = el.dataset.cidade || el.dataset.city || el.dataset.value;
    });

    // Verifica texto visível que contenha cidade
    const textosPagina = document.body.innerText;
    if (textosPagina.includes('Teresina')) result.textoTeresina = 'presente';
    if (textosPagina.includes('Quixadá')) result.textoQuixada = 'presente';
    if (textosPagina.includes('Recife')) result.textoRecife = 'presente';

    return result;
  });

  console.log(`[CIDADE CHECK - ${momento}]:`, JSON.stringify(info));
  return info;
}

async function main() {
  console.log('Iniciando Chrome...');

  const browser = await puppeteer.launch({
    headless: false,      // Chrome visível!
    slowMo: 50,           // Mais lento para ver as ações
    defaultViewport: { width: 1280, height: 800 },
    args: ['--start-maximized']
  });

  const page = await browser.newPage();

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

    // ========== FASE 2: FORMULÁRIO ==========
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
    console.log('\nClicando Avançar 1...');
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find(b => b.textContent.includes('Avan'));
      if (btn) btn.click();
    });
    await wait(3000);
    console.log('Avançar 1 clicado');

    // Verifica página
    const pageInfo = await page.evaluate(() => {
      return {
        selects: document.querySelectorAll('select').length,
        inputs: document.querySelectorAll('input').length,
        temCidade: !!document.querySelector('#cidade_nome')
      };
    });
    console.log('Página após Avançar 1:', pageInfo);

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
    await wait(2000); // Espera o filtro processar

    // Verifica o que tem no dropdown agora
    const dropdownInfo = await page.evaluate(() => {
      const allGf = document.querySelectorAll('.GroupFocus');
      for (const gf of allGf) {
        if (gf.textContent.includes('SELECIONE')) {
          const items = gf.querySelectorAll('.group-item');
          return {
            found: true,
            itemCount: items.length,
            items: [...items].map(i => i.textContent.trim())
          };
        }
      }
      return { found: false };
    });
    console.log('Dropdown:', dropdownInfo.itemCount, 'itens:', dropdownInfo.items);

    // DEBUG: Ver todos os elementos do dropdown após filtrar
    console.log('\n=== DEBUG DO DROPDOWN DE CIDADE ===');
    const dropdownDebug = await page.evaluate(() => {
      const result = {
        groupFocus: [],
        groupItems: [],
        allDivsWithTeresina: []
      };

      // Pega todos os GroupFocus
      document.querySelectorAll('.GroupFocus').forEach((gf, idx) => {
        const rect = gf.getBoundingClientRect();
        const style = window.getComputedStyle(gf);
        result.groupFocus.push({
          index: idx,
          text: gf.textContent.substring(0, 100),
          display: style.display,
          visibility: style.visibility,
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
        });
      });

      // Pega todos os group-item
      document.querySelectorAll('.group-item').forEach((item, idx) => {
        const rect = item.getBoundingClientRect();
        const style = window.getComputedStyle(item);
        if (rect.width > 0 && rect.height > 0) {
          result.groupItems.push({
            index: idx,
            text: item.textContent.trim(),
            className: item.className,
            display: style.display,
            rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
          });
        }
      });

      // Pega qualquer div que contenha "Teresina"
      document.querySelectorAll('div').forEach((div) => {
        if (div.textContent.includes('Teresina') && div.textContent.length < 50) {
          const rect = div.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            result.allDivsWithTeresina.push({
              text: div.textContent.trim(),
              className: div.className,
              tagName: div.tagName,
              rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
            });
          }
        }
      });

      return result;
    });

    console.log('\n--- GroupFocus elements ---');
    dropdownDebug.groupFocus.forEach((g, i) => {
      console.log(`${i}: display=${g.display} | "${g.text.substring(0, 50)}..."`);
    });

    console.log('\n--- Group-item elements (visíveis) ---');
    dropdownDebug.groupItems.forEach((g, i) => {
      console.log(`${i}: "${g.text}" | class="${g.className}" | rect: x=${g.rect.x}, y=${g.rect.y}`);
    });

    console.log('\n--- Divs com "Teresina" ---');
    dropdownDebug.allDivsWithTeresina.forEach((d, i) => {
      console.log(`${i}: "${d.text}" | class="${d.className}" | rect: x=${d.rect.x}, y=${d.rect.y}`);
    });

    // Pega as coordenadas do elemento clickable-element com Teresina e clica
    const teresinaCoords = await page.evaluate(() => {
      // Procura o clickable-element que contém exatamente "Teresina - PI"
      const clickables = document.querySelectorAll('.clickable-element');
      for (const el of clickables) {
        if (el.textContent.trim() === 'Teresina - PI') {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return {
              x: rect.x + rect.width / 2,
              y: rect.y + rect.height / 2,
              text: el.textContent.trim(),
              width: rect.width,
              height: rect.height
            };
          }
        }
      }
      return null;
    });

    if (teresinaCoords) {
      console.log(`Coordenadas de Teresina (clickable-element): x=${teresinaCoords.x}, y=${teresinaCoords.y} (${teresinaCoords.width}x${teresinaCoords.height})`);
      console.log('Clicando via page.mouse.click()...');
      await page.mouse.click(teresinaCoords.x, teresinaCoords.y);
      console.log('Cidade clicada via mouse');
    } else {
      console.log('ERRO: Elemento Teresina não encontrado!');
    }
    await wait(2000);
    await checkCidade(page, 'Após clicar na cidade');

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
      try {
        await page.click('select');
        await wait(500);
        await page.select('select', '"mei___empres_rio_individual"');
        console.log('MEI selecionado (fallback)');
      } catch(e2) {
        console.log('Fallback também falhou:', e2.message);
      }
    }
    await wait(1500);
    await checkCidade(page, 'Após selecionar MEI');

    // Clica Avançar 2 (botão VISÍVEL - há 2, um escondido)
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
        const box = await btn.boundingBox();
        console.log(`Avançar 2 - coordenadas: x=${box.x + box.width/2}, y=${box.y + box.height/2}`);
        await btn.click();
        console.log('Avançar 2 clicado');
        break;
      }
    }
    await wait(3000);
    await checkCidade(page, 'Após Avançar 2');

    // ========== FASE 3: FAIXAS ETÁRIAS ==========
    console.log('\n=== FASE 3: FAIXAS ETÁRIAS ===');

    // Debug: ver todos os inputs ANTES de preencher
    const inputsDebug = await page.evaluate(() => {
      const allInputs = document.querySelectorAll('input');
      return [...allInputs].map(inp => {
        const rect = inp.getBoundingClientRect();
        const style = window.getComputedStyle(inp);
        return {
          id: inp.id,
          type: inp.type,
          placeholder: inp.placeholder,
          value: inp.value,
          className: inp.className,
          display: style.display,
          visibility: style.visibility,
          width: rect.width,
          height: rect.height,
          visible: rect.width > 0 && style.display !== 'none'
        };
      });
    });

    console.log('\n--- TODOS os inputs na página ---');
    inputsDebug.forEach((inp, idx) => {
      console.log(`${idx}: id="${inp.id}" type="${inp.type}" placeholder="${inp.placeholder}" value="${inp.value}" visible=${inp.visible}`);
    });

    // Preenche APENAS os inputs de faixas etárias (placeholder="0" e classe contém "cocys")
    console.log('\n--- Preenchendo apenas inputs de faixas etárias ---');
    const faixasResult = await page.evaluate(() => {
      const allInputs = document.querySelectorAll('input');
      let count = 0;
      const preenchidos = [];

      [...allInputs].forEach((inp, idx) => {
        const rect = inp.getBoundingClientRect();
        const style = window.getComputedStyle(inp);
        const isVisible = rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';

        // Só preenche se: visível, sem id, placeholder="0", e classe contém "cocys" (inputs de faixa)
        const isFaixaInput = inp.placeholder === '0' && inp.className.includes('cocys');

        if (isVisible && !inp.id && isFaixaInput) {
          inp.focus();
          inp.value = '1';
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
          count++;
          preenchidos.push({ idx, placeholder: inp.placeholder, className: inp.className });
        }
      });

      return { total: count, preenchidos };
    });
    console.log('Faixas preenchidas:', faixasResult.total);
    console.log('Inputs preenchidos:', JSON.stringify(faixasResult.preenchidos, null, 2));
    await wait(1500);
    await checkCidade(page, 'Após preencher faixas');

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
        const box = await btn.boundingBox();
        console.log(`Avançar 3 - coordenadas: x=${box.x + box.width/2}, y=${box.y + box.height/2}`);
        await btn.click();
        console.log('Avançar 3 clicado');
        break;
      }
    }
    await wait(4000);
    await checkCidade(page, 'Após Avançar 3');

    // ========== DEBUG DA NOVA PÁGINA ==========
    console.log('\n=== DEBUG DA PÁGINA APÓS AVANÇAR 3 ===');

    const debugPage = await page.evaluate(() => {
      const allButtons = document.querySelectorAll('button');
      const allClickables = document.querySelectorAll('.clickable-element');
      const allInputs = document.querySelectorAll('input');
      const allSelects = document.querySelectorAll('select');

      // Filtra elementos visíveis
      const isVisible = (el) => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
      };

      return {
        pageText: document.body.innerText.substring(0, 500),
        buttons: [...allButtons].filter(isVisible).map(b => ({
          text: b.textContent.trim().substring(0, 50),
          className: b.className,
          disabled: b.disabled
        })),
        clickables: [...allClickables].filter(isVisible).map(c => ({
          text: c.textContent.trim().substring(0, 50),
          className: c.className
        })),
        inputs: [...allInputs].filter(isVisible).map(i => ({
          id: i.id,
          placeholder: i.placeholder,
          type: i.type,
          className: i.className
        })),
        selects: [...allSelects].filter(isVisible).map(s => ({
          id: s.id,
          className: s.className,
          options: [...s.options].map(o => o.text).slice(0, 5)
        }))
      };
    });

    console.log('\n--- Texto da página (primeiros 500 chars) ---');
    console.log(debugPage.pageText);

    console.log('\n--- Buttons visíveis ---');
    debugPage.buttons.forEach((b, i) => {
      console.log(`${i}: "${b.text}" | disabled: ${b.disabled}`);
    });

    console.log('\n--- Clickable elements visíveis ---');
    debugPage.clickables.forEach((c, i) => {
      console.log(`${i}: "${c.text}"`);
    });

    console.log('\n--- Inputs visíveis ---');
    debugPage.inputs.forEach((i, idx) => {
      console.log(`${idx}: id="${i.id}" placeholder="${i.placeholder}" type="${i.type}"`);
    });

    console.log('\n--- Selects visíveis ---');
    debugPage.selects.forEach((s, idx) => {
      console.log(`${idx}: id="${s.id}" options: ${s.options.join(', ')}`);
    });

    // ========== FASE 4: CLICA EM ADD PRODUTOS ==========
    console.log('\n=== FASE 4: ADD PRODUTOS ===');

    // Clica no botão "Add Produtos" VISÍVEL (há 2, um escondido)
    const buttons4 = await page.$$('button');
    let addProdutosClicado = false;
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
        const box = await btn.boundingBox();
        console.log(`Add Produtos - coordenadas: x=${box.x + box.width/2}, y=${box.y + box.height/2}`);
        await btn.click();
        console.log('Add Produtos clicado');
        addProdutosClicado = true;
        break;
      }
    }

    if (!addProdutosClicado) {
      console.log('ERRO: Botão Add Produtos não encontrado!');
    }

    await wait(3000);

    // ========== DEBUG COMPLETO APÓS ADD PRODUTOS ==========
    console.log('\n=== DEBUG COMPLETO APÓS ADD PRODUTOS ===');

    const debugModal = await page.evaluate(() => {
      const isVisible = (el) => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };

      const allClickables = document.querySelectorAll('.clickable-element');
      const allButtons = document.querySelectorAll('button');
      const allDivs = document.querySelectorAll('div');
      const allImgs = document.querySelectorAll('img');

      return {
        clickables: [...allClickables].filter(isVisible).map(el => {
          const rect = el.getBoundingClientRect();
          return {
            text: el.textContent.trim().substring(0, 80),
            className: el.className,
            rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height }
          };
        }),
        buttons: [...allButtons].filter(isVisible).map(b => ({
          text: b.textContent.trim().substring(0, 50),
          disabled: b.disabled
        })),
        divsComHapvida: [...allDivs].filter(d => d.textContent.includes('Hapvida') && d.textContent.length < 100).filter(isVisible).map(d => {
          const rect = d.getBoundingClientRect();
          return {
            text: d.textContent.trim(),
            className: d.className,
            rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height }
          };
        }),
        imgsComHapvida: [...allImgs].filter(i => i.src && i.src.toLowerCase().includes('hapvida')).map(i => {
          const rect = i.getBoundingClientRect();
          return {
            src: i.src,
            alt: i.alt,
            rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height }
          };
        }),
        pageText: document.body.innerText.substring(0, 1000)
      };
    });

    console.log('\n--- Texto da página (1000 chars) ---');
    console.log(debugModal.pageText);

    console.log('\n--- Clickable elements visíveis ---');
    debugModal.clickables.forEach((c, i) => {
      console.log(`${i}: "${c.text}" | x=${c.rect.x}, y=${c.rect.y}`);
    });

    console.log('\n--- Buttons visíveis ---');
    debugModal.buttons.forEach((b, i) => {
      console.log(`${i}: "${b.text}" | disabled: ${b.disabled}`);
    });

    console.log('\n--- Divs com "Hapvida" ---');
    debugModal.divsComHapvida.forEach((d, i) => {
      console.log(`${i}: "${d.text}" | class="${d.className}" | x=${d.rect.x}, y=${d.rect.y}`);
    });

    console.log('\n--- Imagens com "Hapvida" ---');
    debugModal.imgsComHapvida.forEach((img, i) => {
      console.log(`${i}: src="${img.src}" | x=${img.rect.x}, y=${img.rect.y}`);
    });

    // ========== FASE 5: CLICA EM HAPVIDA ==========
    console.log('\n=== FASE 5: CLICA EM HAPVIDA ===');

    // Pega coordenadas do clickable-element com texto exato "Hapvida"
    const hapvidaCoords = await page.evaluate(() => {
      const clickables = document.querySelectorAll('.clickable-element');
      for (const el of clickables) {
        if (el.textContent.trim() === 'Hapvida') {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, text: el.textContent.trim() };
          }
        }
      }
      return null;
    });

    if (hapvidaCoords) {
      console.log(`Clicando em Hapvida: x=${hapvidaCoords.x}, y=${hapvidaCoords.y}`);
      await page.mouse.click(hapvidaCoords.x, hapvidaCoords.y);
      console.log('Hapvida clicado');
    } else {
      console.log('ERRO: Elemento Hapvida não encontrado!');
    }

    await wait(3000);

    // ========== FASE 6: ESCOLHER TABELA ==========
    console.log('\n=== FASE 6: ESCOLHER TABELA ===');

    // Debug: ver elementos da tabela
    const debugTabela = await page.evaluate(() => {
      const isVisible = (el) => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };

      const allClickables = document.querySelectorAll('.clickable-element');
      return [...allClickables].filter(isVisible).filter(el =>
        el.textContent.includes('Teresina') || el.textContent.includes('Tabela')
      ).map(el => {
        const rect = el.getBoundingClientRect();
        return { text: el.textContent.trim(), x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
      });
    });

    console.log('Elementos com Teresina/Tabela:');
    debugTabela.forEach((t, i) => console.log(`${i}: "${t.text}" | x=${t.x}, y=${t.y}`));

    // Clica na tabela "Hapvida Teresina 2 a 29"
    const tabelaCoords = await page.evaluate(() => {
      const clickables = document.querySelectorAll('.clickable-element');
      for (const el of clickables) {
        const text = el.textContent.trim();
        if (text.includes('Teresina') && text.includes('2') && text.includes('29')) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, text };
          }
        }
      }
      return null;
    });

    if (tabelaCoords) {
      console.log(`Clicando na tabela: "${tabelaCoords.text}" x=${tabelaCoords.x}, y=${tabelaCoords.y}`);
      await page.mouse.click(tabelaCoords.x, tabelaCoords.y);
      console.log('Tabela clicada');
    } else {
      console.log('ERRO: Tabela "Hapvida Teresina 2 a 29" não encontrada!');
    }

    await wait(2000);

    // ========== FASE 7: CLICA EM "AMBULATORIAL" ==========
    console.log('\n=== FASE 7: CLICA EM AMBULATORIAL ===');

    const ambulatorialCoords = await page.evaluate(() => {
      const clickables = document.querySelectorAll('.clickable-element');
      for (const el of clickables) {
        if (el.textContent.trim() === 'Ambulatorial') {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, text: el.textContent.trim() };
          }
        }
      }
      return null;
    });

    if (ambulatorialCoords) {
      console.log(`Clicando em Ambulatorial: x=${ambulatorialCoords.x}, y=${ambulatorialCoords.y}`);
      await page.mouse.click(ambulatorialCoords.x, ambulatorialCoords.y);
      console.log('Ambulatorial clicado');
    } else {
      console.log('ERRO: Elemento Ambulatorial não encontrado!');
    }

    await wait(2000);

    // ========== FASE 8: CLICA EM "SEM ACOMODAÇÃO / COM COPARTICIPAÇÃO" ==========
    console.log('\n=== FASE 8: CLICA EM SEM ACOMODAÇÃO / COM COPARTICIPAÇÃO ===');

    const acomodacaoCoords = await page.evaluate(() => {
      const clickables = document.querySelectorAll('.clickable-element');
      for (const el of clickables) {
        const text = el.textContent.trim().toLowerCase();
        if (text.includes('sem acomodação') && text.includes('coparticipação')) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, text: el.textContent.trim() };
          }
        }
      }
      return null;
    });

    if (acomodacaoCoords) {
      console.log(`Clicando em: "${acomodacaoCoords.text}" x=${acomodacaoCoords.x}, y=${acomodacaoCoords.y}`);
      await page.mouse.click(acomodacaoCoords.x, acomodacaoCoords.y);
      console.log('Acomodação clicada');
    } else {
      console.log('ERRO: Elemento "Sem acomodação / Com coparticipação" não encontrado!');
    }

    await wait(2000);

    // ========== FASE 9: FECHA O MODAL ==========
    console.log('\n=== FASE 9: FECHA O MODAL ===');

    // Clica em um espaço vazio para fechar o modal (canto direito da tela)
    console.log('Clicando em espaço vazio para fechar modal...');
    await page.mouse.click(1200, 400);
    console.log('Clique em espaço vazio executado');

    await wait(3000);

    // ========== FASE 10: DEBUG DA TABELA DE FAIXAS ETÁRIAS ==========
    console.log('\n=== FASE 10: DEBUG DA TABELA DE FAIXAS ETÁRIAS ===');

    const debugFaixas = await page.evaluate(() => {
      const isVisible = (el) => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      };

      const result = {
        tabelas: [],
        linhasComFaixa: [],
        celulasComValor: [],
        textoCompleto: ''
      };

      // Procura tabelas
      const tables = document.querySelectorAll('table');
      tables.forEach((table, idx) => {
        if (isVisible(table)) {
          const rows = table.querySelectorAll('tr');
          const tableData = {
            index: idx,
            rowCount: rows.length,
            rows: []
          };
          rows.forEach((row, rowIdx) => {
            const cells = row.querySelectorAll('td, th');
            const rowData = [...cells].map(c => c.textContent.trim()).filter(t => t.length > 0);
            if (rowData.length > 0) {
              tableData.rows.push({ rowIdx, cells: rowData });
            }
          });
          result.tabelas.push(tableData);
        }
      });

      // Procura elementos com texto de faixa etária (0-18, 19-23, etc.)
      const allElements = document.querySelectorAll('div, span, td, th, p');
      const faixaRegex = /\d{1,2}\s*[-a]\s*\d{1,2}|\d{1,2}\s*anos?|0-18|19-23|24-28|29-33|34-38|39-43|44-48|49-53|54-58|59\+|acima/i;

      allElements.forEach((el) => {
        if (isVisible(el) && el.textContent.length < 200) {
          const text = el.textContent.trim();
          if (faixaRegex.test(text)) {
            const rect = el.getBoundingClientRect();
            result.linhasComFaixa.push({
              text: text,
              tag: el.tagName,
              className: el.className,
              x: Math.round(rect.x),
              y: Math.round(rect.y)
            });
          }
        }
      });

      // Procura valores numéricos que podem ser preços (R$ ou números com vírgula)
      const valorRegex = /R\$\s*[\d.,]+|\d{1,3}[.,]\d{2}/;
      allElements.forEach((el) => {
        if (isVisible(el) && el.textContent.length < 100) {
          const text = el.textContent.trim();
          if (valorRegex.test(text) && !text.includes('anos')) {
            const rect = el.getBoundingClientRect();
            result.celulasComValor.push({
              text: text,
              tag: el.tagName,
              x: Math.round(rect.x),
              y: Math.round(rect.y)
            });
          }
        }
      });

      // Pega texto visível da página (área principal)
      result.textoCompleto = document.body.innerText.substring(0, 3000);

      return result;
    });

    console.log('\n--- TABELAS ENCONTRADAS ---');
    if (debugFaixas.tabelas.length === 0) {
      console.log('Nenhuma tabela <table> encontrada');
    } else {
      debugFaixas.tabelas.forEach((t, i) => {
        console.log(`\nTabela ${i} (${t.rowCount} linhas):`);
        t.rows.forEach(r => {
          console.log(`  Linha ${r.rowIdx}: ${r.cells.join(' | ')}`);
        });
      });
    }

    console.log('\n--- ELEMENTOS COM FAIXAS ETÁRIAS ---');
    debugFaixas.linhasComFaixa.slice(0, 30).forEach((f, i) => {
      console.log(`${i}: "${f.text}" | tag=${f.tag} | x=${f.x}, y=${f.y}`);
    });

    console.log('\n--- VALORES NUMÉRICOS (possíveis preços) ---');
    debugFaixas.celulasComValor.slice(0, 30).forEach((v, i) => {
      console.log(`${i}: "${v.text}" | tag=${v.tag} | x=${v.x}, y=${v.y}`);
    });

    console.log('\n--- TEXTO DA PÁGINA (3000 chars) ---');
    console.log(debugFaixas.textoCompleto);

    console.log('\n\n>>> O CHROME VAI FICAR ABERTO PARA VOCÊ INSPECIONAR <<<');
    console.log('>>> PRESSIONE CTRL+C NO TERMINAL PARA FECHAR <<<\n');

    // Mantém aberto para inspeção
    await wait(600000); // 10 minutos

  } catch (error) {
    console.error('\n!!! ERRO !!!');
    console.error(error.message);
    console.log('\n>>> O CHROME VAI FICAR ABERTO PARA VOCÊ INSPECIONAR <<<');
    await wait(600000);
  }
}

main();
