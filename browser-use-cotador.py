#!/usr/bin/env python3
"""
Browser Use - Cotador Hapvida
Usa IA para automatizar a extração de valores das faixas etárias
"""

import asyncio
import os
import json
from browser_use import Agent, Controller
from langchain_anthropic import ChatAnthropic

# Configurações
EMAIL = "jessicamendesbarbosa5@gmail.com"
SENHA = "amovoced28"

# Prompt detalhado para a IA
TASK = f"""
Você precisa extrair os valores das faixas etárias do plano Hapvida no site Cotador Simplificado.

PASSO A PASSO:

1. ACESSE: https://app.cotadorsimplificado.com.br/login

2. FAÇA LOGIN:
   - Digite o email: {EMAIL}
   - Clique em "Continuar com Email"
   - Digite a senha: {SENHA}
   - Clique em "Entrar"
   - Aguarde carregar

3. SELECIONE HAPVIDA:
   - Encontre e clique no card/imagem do Hapvida

4. PREENCHA O FORMULÁRIO:
   - Clique em "PME (de 2 a 29 vidas)"
   - Digite "teste" no campo Nome
   - Clique em "Avançar"

5. CIDADE E TIPO:
   - Digite "teresina" no campo de cidade
   - Selecione "Teresina - PI" na lista
   - Selecione "MEI" no dropdown
   - Clique em "Avançar"

6. FAIXAS ETÁRIAS:
   - Preencha "1" em TODOS os campos de quantidade (são 10 campos para cada faixa etária)
   - Clique em "Avançar"

7. SELEÇÃO DE PRODUTO:
   - Clique em "Add Produtos"
   - No modal, clique em "Hapvida"
   - Selecione a tabela que contém "Teresina" e "2 a 29"
   - Clique em "Ambulatorial"
   - Selecione a opção com "sem acomodação" e "coparticipação"
   - Clique fora do modal para fechar

8. EXTRAIA OS VALORES:
   - Na tabela de resultados, extraia os valores de cada faixa etária:
     - 0 a 18 anos: valor
     - 19 a 23 anos: valor
     - 24 a 28 anos: valor
     - 29 a 33 anos: valor
     - 34 a 38 anos: valor
     - 39 a 43 anos: valor
     - 44 a 48 anos: valor
     - 49 a 53 anos: valor
     - 54 a 58 anos: valor
     - 59 anos ou mais: valor

RETORNE os valores em formato JSON assim:
{{
  "success": true,
  "faixas": [
    {{"faixa_etaria": "0 a 18 anos", "valor": "R$ XX,XX"}},
    {{"faixa_etaria": "19 a 23 anos", "valor": "R$ XX,XX"}},
    ...
  ]
}}
"""

async def main():
    # Configura o modelo (Claude)
    llm = ChatAnthropic(
        model="claude-sonnet-4-20250514",
        timeout=300,
        temperature=0
    )

    # Cria o agente
    agent = Agent(
        task=TASK,
        llm=llm,
        use_vision=True,  # Usa visão para entender a página
    )

    try:
        # Executa a tarefa
        result = await agent.run(max_steps=50)

        # Tenta parsear o resultado como JSON
        print("\n" + "="*50)
        print("RESULTADO:")
        print("="*50)
        print(result)

    except Exception as e:
        print(f"Erro: {e}")
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    # Verifica se a API key está configurada
    if not os.getenv("ANTHROPIC_API_KEY"):
        print("ERRO: Configure a variável ANTHROPIC_API_KEY")
        print("Execute: export ANTHROPIC_API_KEY='sua-chave-aqui'")
        exit(1)

    asyncio.run(main())
