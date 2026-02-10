// ============================================
// WORKFLOW: DESATIVAR PROMOCOES
// Restaura titulo e descricao originais da planilha
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
  const tituloOriginal = prevData?.titulo_original || '';
  const descricaoOriginal = prevData?.descricao_original || '';

  var novoTitulo = tituloOriginal;
  var novaDescricao = descricaoOriginal;

  // Verificar se o ano esta correto no titulo
  if (novoTitulo && !novoTitulo.includes(ANO_ATUAL)) {
    var regexAno = /20[2][0-9]/g;
    if (regexAno.test(novoTitulo)) {
      novoTitulo = novoTitulo.replace(/20[2][0-9]/g, ANO_ATUAL);
    } else {
      var posicaoDoisPontos = novoTitulo.indexOf(':');
      if (posicaoDoisPontos > -1) {
        novoTitulo = novoTitulo.substring(0, posicaoDoisPontos) + ' ' + ANO_ATUAL + novoTitulo.substring(posicaoDoisPontos);
      } else {
        novoTitulo = novoTitulo + ' ' + ANO_ATUAL;
      }
    }
  }

  // Atualizar WordPress
  var wpStatus = 'erro';

  if (novoTitulo) {
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
  } else {
    wpStatus = 'ERRO: Titulo Original vazio na planilha';
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
