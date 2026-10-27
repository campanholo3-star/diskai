@echo off
title Diskai - Discord Inteligente com Gravacao e Resumo por IA
echo ========================================================
echo        Iniciando Diskai (Discord com IA Integrada)
echo ========================================================
echo.
echo Abrindo o Diskai no seu navegador...
start http://localhost:5173
echo.
echo Iniciando servidor Vite local...
cd /d "%~dp0"
npm run dev
pause
