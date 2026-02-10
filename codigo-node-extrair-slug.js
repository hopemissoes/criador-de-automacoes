const items = $input.all();
const results = [];

for (const item of items) {
  const url = item.json['URL'] || '';

  // Pular linhas sem URL ou ja concluidas
  const status = item.json['Status'] || item.json['STATUS'] || '';
  if (!url || status === 'Concluido') continue;

  var slug = url.replace(/\/$/, '').split('/').pop();

  // Extrair cidade: tentar da coluna Cidade, senao do slug
  var cidade = item.json['Cidade'] || item.json['CIDADE'] || '';

  if (!cidade) {
    // Tentar extrair do slug (ex: plano-hapvida-londrina -> Londrina)
    var partes = slug.split('-');
    // Pegar a ultima parte como cidade (heuristica)
    if (partes.length > 2) {
      cidade = partes[partes.length - 1];
      cidade = cidade.charAt(0).toUpperCase() + cidade.slice(1);
    }
  }

  results.push({
    json: {
      ...item.json,
      slug: slug,
      cidade: cidade,
      promocao: item.json['Promocao (%)'] || item.json['Promocao'] || item.json['PROMOCAO'] || item.json['PROMOCAO (%)'] || '15',
      promocao_ativa: item.json['Promocao Ativa'] || item.json['PROMOCAO ATIVA'] || item.json['Promo Ativa'] || 'nao',
      titulo_original: item.json['Titulo Original'] || item.json['TITULO ORIGINAL'] || '',
      descricao_original: item.json['Descricao Original'] || item.json['DESCRICAO ORIGINAL'] || '',
      url_original: url,
      row_number: item.json['row_number'] || items.indexOf(item) + 2
    }
  });
}

return results;
