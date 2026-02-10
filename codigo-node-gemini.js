// ============================================
// CONFIGURACAO
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
  const promocaoAtiva = (prevData?.promocao_ativa || '').toString().toLowerCase().trim();
  const promocao = prevData?.promocao || '15';
  const tituloOriginal = prevData?.titulo_original || '';
  const descricaoOriginal = prevData?.descricao_original || '';

  // Gerar shortcode da cidade (ex: londrina_emp_ambulatorialtotal)
  var cidadeSlug = cidade.toLowerCase();
  cidadeSlug = cidadeSlug.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  cidadeSlug = cidadeSlug.replace(/\s+/g, '_');
  var shortcode = '[' + cidadeSlug + '_emp_ambulatorialtotal]';

  var novoTitulo = '';
  var novaDescricao = '';
  var acao = '';

  // ============================================
  // FLUXO 1: PROMOCAO ATIVADA
  // ============================================
  if (promocaoAtiva === 'sim' || promocaoAtiva === 's' || promocaoAtiva === 'true' || promocaoAtiva === '1') {
    acao = 'promocao_ativada';
    novoTitulo = String.fromCodePoint(0x2705) + 'Plano Hapvida ' + cidade + ' ' + ANO_ATUAL + ': a partir de ' + shortcode;
    novaDescricao = String.fromCodePoint(0x2705) + ' Plano Hapvida em ' + cidade + ' com ' + promocao + '% de desconto nas 3 primeiras parcelas. Faca uma cotacao em menos de 1 minuto.';
  }
  // ============================================
  // FLUXO 2: PROMOCAO DESATIVADA
  // ============================================
  else {
    acao = 'promocao_desativada';
    novoTitulo = tituloOriginal;
    novaDescricao = descricaoOriginal;
  }

  // Verificar se o ano esta correto no titulo
  if (novoTitulo && !novoTitulo.includes(ANO_ATUAL)) {
    // Tentar substituir ano antigo (2020-2029)
    var regexAno = /20[2][0-9]/g;
    if (regexAno.test(novoTitulo)) {
      novoTitulo = novoTitulo.replace(/20[2][0-9]/g, ANO_ATUAL);
    } else {
      // Se nao tinha ano, adicionar antes do ':'
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
  }

  results.push({
    json: {
      post_id: post.id,
      novo_titulo: novoTitulo,
      nova_descricao: novaDescricao,
      url_original: prevData?.url_original || '',
      row_number: prevData?.row_number || 0,
      wp_status: wpStatus,
      acao: acao
    }
  });
}

return results;
