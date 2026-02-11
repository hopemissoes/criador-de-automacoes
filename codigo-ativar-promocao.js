// ============================================
// WORKFLOW: ATIVAR PROMOCOES
// Extrai slug, busca post, consulta menor preco e aplica titulo/descricao
// ============================================
const WP_USER = 'hopemissoes';
const WP_APP_PASSWORD = 'SUA_APP_PASSWORD_AQUI';
const WP_URL = 'https://tabelaplanos.com.br';
const ANO_ATUAL = '2026';
// ============================================

const CIDADES_50 = [
  'sao paulo',
  'jundiai',
  'mogi das cruzes',
  'sao bernardo do campo',
  'ribeirao preto',
  'santos',
  'campinas',
  'rio de janeiro'
];

var auth = Buffer.from(WP_USER + ':' + WP_APP_PASSWORD).toString('base64');

// Buscar shortcodes de menor preco do plugin
var mapaShortcodes = {};
var mapaNomes = {};
try {
  var precos = await this.helpers.httpRequest({
    method: 'GET',
    url: WP_URL + '/wp-admin/admin-ajax.php?action=gpp_menor_preco',
    json: true
  });
  for (var p = 0; p < precos.length; p++) {
    var nomeNorm = precos[p].nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    mapaShortcodes[nomeNorm] = precos[p].shortcode;
    mapaShortcodes[precos[p].shortcode_base] = precos[p].shortcode;
    mapaNomes[precos[p].shortcode_base] = precos[p].nome;
  }
} catch (e) {}

const items = $input.all();
const results = [];

for (let i = 0; i < items.length; i++) {
  const row = items[i].json;

  var url = row['URL'] || row['url'] || '';
  var status = row['Status'] || row['STATUS'] || '';
  var cidade = row['Cidade'] || row['CIDADE'] || '';
  var promocao = row['Promocao (%)'] || row['Promocao'] || row['PROMOCAO'] || '15';

  if (!url || status === 'Concluido') continue;

  var slug = url.replace(/\/$/, '').split('/').pop();

  // Extrair cidade do slug se a coluna estiver vazia
  if (!cidade) {
    var cidadePart = slug.replace(/^plano-hapvida-/, '').replace(/^hapvida-/, '');
    if (mapaNomes[cidadePart]) {
      cidade = mapaNomes[cidadePart];
    } else {
      cidade = cidadePart.split('-').map(function(p) {
        if (p === 'do' || p === 'da' || p === 'de' || p === 'das' || p === 'dos') return p;
        return p.charAt(0).toUpperCase() + p.slice(1);
      }).join(' ');
    }
  }

  // Buscar post no WordPress pelo slug
  var post = null;
  try {
    var wpPosts = await this.helpers.httpRequest({
      method: 'GET',
      url: WP_URL + '/wp-json/wp/v2/posts?slug=' + slug,
      json: true,
      headers: { 'Authorization': 'Basic ' + auth }
    });
    if (Array.isArray(wpPosts) && wpPosts.length > 0) {
      post = wpPosts[0];
    }
  } catch (e) {
    results.push({ json: { erro: 'Erro ao buscar post: ' + e.message, url: url } });
    continue;
  }

  if (!post || !post.id) {
    results.push({ json: { erro: 'Post nao encontrado para slug: ' + slug, url: url } });
    continue;
  }

  // Buscar shortcode de menor preco
  var cidadeNorm = cidade.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  var shortcode = mapaShortcodes[cidadeNorm] || '';

  if (!shortcode) {
    var cidadeSlug = cidadeNorm.replace(/\s+/g, '-');
    shortcode = mapaShortcodes[cidadeSlug] || '';
  }

  if (!shortcode) {
    var cidadePart2 = slug.replace(/^plano-hapvida-/, '').replace(/^hapvida-/, '');
    shortcode = mapaShortcodes[cidadePart2] || '';
  }

  if (!shortcode) {
    var cidadeSlug2 = cidadeNorm.replace(/\s+/g, '-');
    shortcode = '[' + cidadeSlug2 + '_emp_ambulatorialtotal]';
  }

  var eh50 = CIDADES_50.indexOf(cidadeNorm) !== -1;

  var textoPromoHTML = eh50
    ? 'Promo\u00e7\u00e3o de 50% na primeira parcela (\u00faltimos dias).'
    : 'Promo\u00e7\u00e3o de ' + promocao + '% nas 3 primeiras parcelas (\u00faltimos dias).';

  // Titulo em HTML (H1 da pagina)
  var novoTitulo = '<p style="margin:0;">'
    + '<span style="font-size:28px; font-weight:bold;">Plano Hapvida ' + cidade + ' ' + ANO_ATUAL + ':</span><br>'
    + '<span style="font-size:20px;">' + textoPromoHTML + '</span><br>'
    + '<span style="font-size:16px; color:#0054B8; font-weight:bold;">Pre\u00e7os a partir de R$ ' + shortcode + '.</span>'
    + '</p>';

  // Rank Math titulo (sem HTML, com emoji)
  var rankMathTitulo = String.fromCodePoint(0x2705) + 'Plano Hapvida ' + cidade + ' ' + ANO_ATUAL + ': a partir de ' + shortcode;

  // Descricao
  var textoPromoDesc = eh50
    ? '50% de desconto na primeira parcela'
    : promocao + '% de desconto nas 3 primeiras parcelas';

  var novaDescricao = String.fromCodePoint(0x2705) + ' Plano Hapvida em ' + cidade + ' com ' + textoPromoDesc + '. Faca uma cotacao em menos de 1 minuto.';

  var wpStatus = 'erro';
  try {
    await this.helpers.httpRequest({
      method: 'POST',
      url: WP_URL + '/wp-json/wp/v2/posts/' + post.id,
      body: {
        title: novoTitulo,
        excerpt: novaDescricao,
        meta: {
          rank_math_description: novaDescricao,
          rank_math_title: rankMathTitulo
        }
      },
      json: true,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + auth
      }
    });
    wpStatus = 'ok';
  } catch (e) {
    wpStatus = 'ERRO WP: ' + e.message;
  }

  results.push({
    json: {
      post_id: post.id,
      novo_titulo: novoTitulo,
      nova_descricao: novaDescricao,
      shortcode_usado: shortcode,
      cidade: cidade,
      url_original: url,
      row_number: row['row_number'] || i + 2,
      wp_status: wpStatus
    }
  });
}

return results;
