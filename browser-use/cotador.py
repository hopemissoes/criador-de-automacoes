#!/usr/bin/env python3
"""
Browser Use - Cotador Hapvida
Usa IA para automatizar a extração de valores das faixas etárias
"""

import asyncio
import os
from browser_use import Agent
from langchain_anthropic import ChatAnthropic

async def executar_cotacao(email: str, senha: str, cidade: str = "Teresina - PI"):
    """
    Executa a cotação no Cotador Simplificado usando Browser Use (IA)

    Args:
        email: Email de login
        senha: Senha de login
        cidade: Cidade para a cotação (default: Teresina - PI)

    Returns:
        dict com success e faixas etárias
    """

    # Prompt detalhado para a IA
    task = f"""
Você precisa extrair os valores das faixas etárias do plano Hapvida no site Cotador Simplificado.

PASSO A PASSO:

1. ACESSE: https://app.cotadorsimplificado.com.br/login

2. FAÇA LOGIN:
   - Digite o email: {email}
   - Clique em "Continuar com Email"
   - Aguarde o campo de senha aparecer
   - Digite a senha: {senha}
   - Clique em "Entrar"
   - Aguarde a página carregar completamente

3. SELECIONE HAPVIDA:
   - Encontre e clique no card/imagem do Hapvida (tem o logo da operadora)

4. PREENCHA O FORMULÁRIO:
   - Clique em "PME (de 2 a 29 vidas)"
   - Aguarde o formulário carregar
   - Digite "teste" no campo Nome
   - Clique em "Avançar"

5. CIDADE E TIPO:
   - Digite "teresina" no campo de cidade
   - Selecione "{cidade}" na lista que aparece
   - Selecione "MEI - Empresário Individual" no dropdown de tipo de empresa
   - Clique em "Avançar"

6. FAIXAS ETÁRIAS:
   - Você verá 10 campos de quantidade (um para cada faixa etária)
   - Preencha "1" em TODOS os 10 campos
   - Clique em "Avançar"

7. SELEÇÃO DE PRODUTO:
   - Clique no botão "Add Produtos"
   - No modal que abrir, clique em "Hapvida"
   - Selecione a tabela que contém "Teresina" e "2 a 29"
   - Clique em "Ambulatorial"
   - Selecione a opção que contém "sem acomodação" e "coparticipação"
   - Clique fora do modal para fechar (ou clique em área vazia)

8. EXTRAIA OS VALORES:
   - Na tabela de resultados que aparece, extraia os valores de cada faixa etária
   - Os valores estão na coluna de preços, um para cada faixa

IMPORTANTE: Retorne APENAS um JSON válido no formato abaixo, sem texto adicional:
{{
  "success": true,
  "faixas": [
    {{"faixa_etaria": "0 a 18 anos", "valor": "R$ XX,XX"}},
    {{"faixa_etaria": "19 a 23 anos", "valor": "R$ XX,XX"}},
    {{"faixa_etaria": "24 a 28 anos", "valor": "R$ XX,XX"}},
    {{"faixa_etaria": "29 a 33 anos", "valor": "R$ XX,XX"}},
    {{"faixa_etaria": "34 a 38 anos", "valor": "R$ XX,XX"}},
    {{"faixa_etaria": "39 a 43 anos", "valor": "R$ XX,XX"}},
    {{"faixa_etaria": "44 a 48 anos", "valor": "R$ XX,XX"}},
    {{"faixa_etaria": "49 a 53 anos", "valor": "R$ XX,XX"}},
    {{"faixa_etaria": "54 a 58 anos", "valor": "R$ XX,XX"}},
    {{"faixa_etaria": "59 anos ou mais", "valor": "R$ XX,XX"}}
  ]
}}
"""

    # Verifica API key
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return {"success": False, "error": "ANTHROPIC_API_KEY não configurada"}

    try:
        # Configura o modelo Claude
        llm = ChatAnthropic(
            model="claude-sonnet-4-20250514",
            timeout=300,
            temperature=0,
            api_key=api_key
        )

        # Cria o agente Browser Use
        agent = Agent(
            task=task,
            llm=llm,
            use_vision=True,
        )

        # Executa a tarefa
        result = await agent.run(max_steps=60)

        # Tenta parsear o resultado como JSON
        import json
        try:
            # Procura por JSON no resultado
            result_str = str(result)
            start = result_str.find('{')
            end = result_str.rfind('}') + 1
            if start != -1 and end > start:
                json_str = result_str[start:end]
                parsed = json.loads(json_str)
                return parsed
        except json.JSONDecodeError:
            pass

        # Se não conseguiu parsear, retorna o resultado bruto
        return {"success": True, "raw_result": str(result)}

    except Exception as e:
        return {"success": False, "error": str(e)}


# Para teste local
if __name__ == "__main__":
    import sys

    if not os.getenv("ANTHROPIC_API_KEY"):
        print("ERRO: Configure ANTHROPIC_API_KEY")
        print("Execute: export ANTHROPIC_API_KEY='sua-chave'")
        sys.exit(1)

    print("Iniciando cotação...")
    result = asyncio.run(executar_cotacao(
        email="jessicamendesbarbosa5@gmail.com",
        senha="amovoced28",
        cidade="Teresina - PI"
    ))
    print("\nResultado:")
    print(result)
