#!/usr/bin/env python3
"""
API Server para Browser Use - Cotador Hapvida
O n8n pode chamar este servidor via HTTP POST
"""

from flask import Flask, request, jsonify
import asyncio
import os
import threading
from cotador import executar_cotacao

app = Flask(__name__)

# Status da execução atual
status = {
    "running": False,
    "last_result": None,
    "last_error": None
}

def run_async(coro):
    """Executa coroutine em thread separada"""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()

@app.route('/health', methods=['GET'])
def health():
    """Health check"""
    return jsonify({"status": "ok", "running": status["running"]})

@app.route('/cotacao', methods=['POST'])
def cotacao():
    """
    Executa a cotação

    Body JSON (opcional):
    {
        "email": "email@exemplo.com",
        "senha": "senha123",
        "cidade": "Teresina - PI"
    }
    """
    if status["running"]:
        return jsonify({"error": "Já existe uma cotação em andamento"}), 429

    # Pega parâmetros do body ou usa padrão
    data = request.get_json() or {}
    email = data.get("email", os.getenv("COTADOR_EMAIL", "jessicamendesbarbosa5@gmail.com"))
    senha = data.get("senha", os.getenv("COTADOR_SENHA", "amovoced28"))
    cidade = data.get("cidade", "Teresina - PI")

    status["running"] = True
    status["last_error"] = None

    try:
        # Executa a cotação
        result = run_async(executar_cotacao(email, senha, cidade))
        status["last_result"] = result
        status["running"] = False
        return jsonify(result)

    except Exception as e:
        status["running"] = False
        status["last_error"] = str(e)
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/status', methods=['GET'])
def get_status():
    """Retorna status da última execução"""
    return jsonify(status)

if __name__ == '__main__':
    port = int(os.getenv("PORT", 3000))
    print(f"🚀 Browser Use Cotador API rodando na porta {port}")
    print(f"📍 Endpoints:")
    print(f"   GET  /health  - Health check")
    print(f"   POST /cotacao - Executar cotação")
    print(f"   GET  /status  - Status da última execução")
    app.run(host='0.0.0.0', port=port, debug=False)
