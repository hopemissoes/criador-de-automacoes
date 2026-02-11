// ============================================
// WORKFLOW: DESATIVAR PROMOCOES
// Remove texto promocional, mantém shortcode de menor preco
// ============================================
const WP_USER = 'hopemissoes';
const WP_APP_PASSWORD = 'SUA_APP_PASSWORD_AQUI';
const WP_URL = 'https://tabelaplanos.com.br';
const ANO_ATUAL = '2026';
// ============================================

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

  if (!url || status === 'Concluido') continue;

  var slug = url.replace(/\/$/, '').split('/').pop();

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

  // Titulo HTML sem promocao
  var novoTitulo = '<p style="margin:0;">'
    + '<span style="font-size:28px; font-weight:bold;">Plano Hapvida ' + cidade + ' ' + ANO_ATUAL + ':</span><br>'
    + '<span style="font-size:16px; color:#0054B8; font-weight:bold;">Pre\u00e7os a partir de R$ ' + shortcode + '.</span>'
    + '</p>';

  // Rank Math titulo sem emoji
  var rankMathTitulo = 'Plano Hapvida ' + cidade + ' ' + ANO_ATUAL + ': a partir de R$ ' + shortcode;

  // Descricao template
  var novaDescricao = 'Plano de sa\u00fade Hapvida em ' + cidade + ' a partir de R$ ' + shortcode + '. Consulte a tabela de pre\u00e7os ' + ANO_ATUAL + ', rede credenciada, car\u00eancias e tipos de planos. Cota\u00e7\u00e3o gr\u00e1tis!';

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
