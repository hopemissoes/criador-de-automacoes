// ============================================
// WORKFLOW: ATIVAR PROMOCOES
// Aplica titulo e descricao promocional para todas as URLs
// ============================================
const WP_USER = 'admin';
const WP_APP_PASSWORD = 'SUA_APP_PASSWORD_AQUI';
const WP_URL = 'https://salesesantos.adv.br';
const ANO_ATUAL = '2026';
// ============================================

const items = $input.all();
const results = [];

for (const item of items) {
  const posts = item.json;
  const post = Array.isArray(posts) ? posts[0] : posts;

  if (!post || !post.id) {
    results.push({ json: { erro: 'Post nao encontrado' } });
    continue;
  }

  const prevData = $('Extrair Slug e Cidade').first().json;
  const cidade = prevData?.cidade || '';
  const promocao = prevData?.promocao || '15';

  // Gerar shortcode da cidade (ex: londrina_emp_ambulatorialtotal)
  var cidadeSlug = cidade.toLowerCase();
  cidadeSlug = cidadeSlug.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  cidadeSlug = cidadeSlug.replace(/\s+/g, '_');
  var shortcode = '[' + cidadeSlug + '_emp_ambulatorialtotal]';

  // Titulo e descricao promocional
  var novoTitulo = String.fromCodePoint(0x2705) + 'Plano Hapvida ' + cidade + ' ' + ANO_ATUAL + ': a partir de ' + shortcode;
  var novaDescricao = String.fromCodePoint(0x2705) + ' Plano Hapvida em ' + cidade + ' com ' + promocao + '% de desconto nas 3 primeiras parcelas. Faca uma cotacao em menos de 1 minuto.';

  // Atualizar WordPress
  var wpStatus = 'erro';

  try {
    var auth = Buffer.from(WP_USER + ':' + WP_APP_PASSWORD).toString('base64');
    await this.helpers.httpRequest({
      method: 'POST',
      url: WP_URL + '/wp-json/wp/v2/posts/' + post.id,
      body: {
        title: novoTitulo,
        excerpt: novaDescricao,
        meta: {
          rank_math_description: novaDescricao,
          rank_math_title: novoTitulo
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
      cidade: cidade,
      url_original: prevData?.url_original || '',
      row_number: prevData?.row_number || 0,
      wp_status: wpStatus
    }
  });
}

return results;
