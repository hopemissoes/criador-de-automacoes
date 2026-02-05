// ============================================
// CONFIGURAÇÃO
const GEMINI_API_KEY = 'SUA_CHAVE_GEMINI_AQUI';
const GEMINI_MODEL = 'gemini-3-pro-preview';
const WP_USER = 'admin';
const WP_APP_PASSWORD = 'SUA_APP_PASSWORD_AQUI';
const WP_URL = 'https://salesesantos.adv.br';
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

  const tituloAtual = post.title?.rendered || '';
  const descricaoAtual = post.excerpt?.rendered?.replace(/<[^>]*>/g, '').trim() || '';
  const conteudo = post.content?.rendered?.replace(/<[^>]*>/g, '').substring(0, 500) || '';
  const prevData = $('Extrair Slug e Cidade').first().json;
  const cidade = prevData?.cidade || '';
  const promocao = prevData?.promocao || '0';

  // ---- PASSO 1: Chamar Gemini ----
  const promptSistema = 'Voce e um especialista em marketing juridico e SEO. Reformule titulos e meta descriptions de artigos de advocacia para incluir promocoes vigentes. Regras: 1) Titulo atrativo e profissional com a promocao. 2) Manter palavra-chave principal (area juridica + cidade). 3) Meta description entre 140-160 caracteres com call-to-action. 4) Tom profissional. 5) Promocao de forma elegante. Responda SEMPRE em JSON: {"novo_titulo": "...", "nova_descricao": "..."}';

  const promptUsuario = 'Reformule o titulo e descricao deste artigo do escritorio Sales e Santos Advogados. Titulo atual: ' + tituloAtual + '. Descricao atual: ' + descricaoAtual + '. Cidade: ' + cidade + '. Promocao: ' + promocao + '% de desconto. Contexto: ' + conteudo + '. Gere novo titulo e descricao em JSON.';

  const geminiBody = {
    systemInstruction: {
      parts: [{ text: promptSistema }]
    },
    contents: [{
      role: 'user',
      parts: [{ text: promptUsuario }]
    }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json'
    }
  };

  let novoTitulo = '';
  let novaDescricao = '';
  let debugGemini = '';

  try {
    const geminiResponse = await this.helpers.httpRequest({
      method: 'POST',
      url: 'https://generativelanguage.googleapis.com/v1beta/models/' + GEMINI_MODEL + ':generateContent?key=' + GEMINI_API_KEY,
      body: geminiBody,
      json: true,
      headers: { 'Content-Type': 'application/json' }
    });

    debugGemini = JSON.stringify(geminiResponse);

    const resposta = geminiResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';

    let parsed = null;
    try {
      parsed = JSON.parse(resposta);
    } catch (_e) {
      const jsonMatch = resposta.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    }

    if (parsed) {
      novoTitulo = parsed.novo_titulo || parsed.title || parsed.titulo || '';
      novaDescricao = parsed.nova_descricao || parsed.description || parsed.descricao || parsed.meta_description || '';
    }
  } catch (e) {
    novoTitulo = 'ERRO GEMINI: ' + e.message;
    debugGemini = e.message;
  }

  // ---- PASSO 2: Atualizar WordPress ----
  let wpStatus = 'erro';

  if (novoTitulo && !novoTitulo.startsWith('ERRO')) {
    try {
      const auth = Buffer.from(WP_USER + ':' + WP_APP_PASSWORD).toString('base64');
      await this.helpers.httpRequest({
        method: 'POST',
        url: WP_URL + '/wp-json/wp/v2/posts/' + post.id,
        body: {
          title: novoTitulo,
          excerpt: novaDescricao
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
      titulo_anterior: tituloAtual,
      url_original: prevData?.url_original || '',
      row_number: prevData?.row_number || 0,
      wp_status: wpStatus,
      debug_gemini: debugGemini
    }
  });
}

return results;
