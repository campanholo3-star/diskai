# 🎙️ Diskai - Discord Inteligente com Gravação & Resumo por IA

**Diskai** é uma recriação completa, moderna e funcional do **Discord**, desenvolvida do zero e equipada com um estúdio de inteligência artificial para **gravar reuniões** e **gerar atas executivas/resumos automáticos** após as chamadas, tanto em canais de servidores quanto em **Mensagens Diretas (DMs / 1-on-1)**.

---

## 🚀 Principais Funcionalidades

### 1. 💬 Mensagens Diretas (Direct) & Sistema de Amigos
- **Painel de Amigos Completo**:
  - Filtros por abas: **Disponível (Online)**, **Todos**, **Pendente** e **Bloqueado**.
  - **Adicionar Amigo**: Campo dedicado com validação por nome ou tag (ex: `carlos#2048` ou `ana#1024`).
  - **Ativo Agora**: Barra lateral direita exibindo o que cada amigo está fazendo em tempo real (Figma, VS Code, Spotify).
- **Conversas Privadas (1-on-1 DMs)**:
  - Histórico de mensagens privadas com amigos e com o **Diskai AI Bot**.
  - Envio de anexos, emojis rápidos e reações interativas.
- **Chamadas 1-on-1 Privadas**:
  - Inicie chamadas de voz ou vídeo diretamente no topo da DM (ícone 📞 ou 📹).
  - **Suporte a gravação de áudio e resumo por IA em chamadas privadas 1-on-1**, ideal para entrevistas, alinhamentos e reuniões individuais!

### 2. 🏛️ Experiência Completa do Discord (Servidores & Canais)
- **Navegação por Servidores**: Barra lateral esquerda com servidores ativos, indicador visual de pílula animada, servidor oficial do Diskai, criação de novos servidores e exploração de comunidades públicas.
- **Canais de Texto & Voz**: Categorias organizadas, tópicos de canais e badges para salas com IA.
- **Chat Interativo**: Envio de mensagens em tempo real, suporte a embeds ricos, emojis rápidos, reações instantâneas com contadores e comandos de barra (`/gravar`, `/resumo`).
- **Lista de Membros**: Administradores, Membros Online, Em Chamada e Bots do Diskai.
- **Dock de Usuário**: Controle rápido de microfone (Mute/Unmute), fones (Ensurdecer), perfil com avatar e status customizável (Online, Idle, DND, Offline).
- **Efeitos Sonoros Sintetizados**: Toques de entrada, saída, mute e início de gravação gerados nativamente via Web Audio API.

### 3. 🔴 Gravação de Reunião em Alta Definição
- Entre em qualquer canal de voz de servidor ou chamada privada de DM com um clique.
- Clique em **"Gravar Reunião"** para iniciar a captura do áudio.
- **Timer de Gravação em Tempo Real** (`REC 00:42`) e visualizador dinâmico de ondas de áudio (waveform).
- **Transcrição ao Vivo**: Painel lateral que exibe em tempo real o que cada participante está falando durante a gravação.
- Suporte a ligar/desligar câmera (Webcam) e compartilhamento de tela (Screen Share).

### 4. 🤖 Resumo Inteligente Pós-Call (Diskai AI Studio)
Ao clicar no botão de encerramento **"Encerrar & Resumir Reunião"**:
- **Player de Áudio Embutido**: Ouça a gravação da reunião, altere a velocidade de reprodução (1x, 1.25x, 1.5x, 2x) ou faça o download do áudio `.webm`.
- **Resumo Executivo**: Síntese direta e clara dos tópicos discutidos e tom da conversa.
- **Plano de Ação Interativo (Action Items)**: Lista de tarefas com checkboxes clicáveis, responsáveis atribuídos (`@Carlos`, `@Ana`, etc.) e prioridades (Alta, Média, Baixa).
- **Tópicos & Timestamps**: Momentos chave da gravação com marcadores de tempo clicáveis.
- **Decisões Tomadas**: Registro formal de todas as resoluções aprovadas.
- **Ações de 1 Clique**:
  - 📢 **Postar no Canal #resumos-de-reunioes ou DM**: Envia automaticamente um Discord Embed estilizado para o chat de texto.
  - 📋 **Copiar em Markdown**: Copia a ata completa formatada para a área de transferência.
  - 💾 **Baixar Ata (.md)**: Faz o download imediato do arquivo Markdown no computador.
  - 🤖 **Refinamento com IA**: Permite enviar um comando para re-resumir focando em aspectos específicos (ex: técnico, prazos, etc.).

### 5. 🗄️ Backend Supabase & Autenticação Cloud
- **Integração Supabase Nativa (`@supabase/supabase-js`)**:
  - Salve contas, perfis, mensagens e atas diretamente na nuvem.
  - **Modal de Autenticação (`AuthModal`)**:
    - **Entrar (Login)** e **Criar Conta (Sign Up)** com validação de senha e persistência de sessão.
    - **Conectar Supabase**: Insira sua `Project URL` e `Anon Public Key` diretamente na interface com teste de ping em tempo real.
    - **Modo Local / Demo Automático**: Funciona 100% offline se o Supabase não estiver conectado.
  - **Esquema de Banco de Dados (`supabase/schema.sql`)**:
    - Script PostgreSQL completo com tabelas `profiles`, `servers`, `channels`, `messages`, `direct_messages`, `meeting_summaries`, buckets de Storage (`avatars` e `attachments`) e políticas RLS.

### 6. 🖼️ Troca de Foto de Perfil pelo Computador
- Em **Configurações do Usuário > Perfil do Usuário**:
  - Botão **"Carregar Foto do Computador"**: Permite escolher qualquer imagem local do PC (PNG, JPG, WebP, GIF até 8MB).
  - Leitura instantânea via `FileReader` para pré-visualização em tempo real no banner e card de perfil.
  - Presets rápidos e opção de restaurar avatar padrão.

### 7. 📎 Transferência de Documentos & Arquivos no Chat
- Envie arquivos em **Canais de Texto** e **Mensagens Diretas (DMs)**:
  - Suporte a múltiplos anexos: **PDFs**, **Documentos Word/Excel/Docs**, **Fotos e Imagens**, **Vídeos** e **Áudio**.
  - **Barra de Anexos Pendentes**: Pré-visualize arquivos selecionados antes do envio, com tamanho formatado em KB/MB e botão para remover.
  - **Cards Estilizados no Chat**:
    - **Imagens**: Miniatura com ampliação em lightbox e botão de download.
    - **Vídeos**: Player de vídeo HTML5 integrado com controles e download.
    - **Áudios**: Player de áudio integrado com download.
    - **PDFs & Documentos**: Ícone específico por extensão, tamanho do arquivo e download com 1 clique.

### 8. 🎓 Tutorial Interativo para Iniciantes
- Modal interativo acessível em qualquer tela pelo botão **"🎓 Guia do Iniciante"** ou no topo das Mensagens Diretas:
  1. **Boas-vindas ao Diskai**: Visão geral e diferenciais de IA.
  2. **Direct & Amigos**: Como usar conversas privadas e adicionar contatos.
  3. **Salas de Voz e Chamadas**: Como entrar e usar microfone/câmera/tela.
  4. **Gravação com 1 Clique**: Onde fica o botão REC e a transcrição ao vivo.
  5. **Resumo por IA**: Como acessar atas automáticas e listas de tarefas.

---

## 🧪 Testes Automatizados
O projeto conta com suíte de testes unitários para cada etapa e função:
```bash
npm test
```
* **Duração & Formatação de Tempo**: Validação de conversão de segundos em `MM:SS`.
* **Motor de Resumo IA**: Validação de pauta, tarefas acionáveis e análise de sentimento.
* **Conversor Markdown**: Validação da formatação com caixas de seleção `[x]` e tags `@`.
* **Filtros do Direct & Amigos**: Validação das listas Online, Todos, Pendentes e Bloqueados.
* **Passos do Tutorial do Iniciante**: Validação de integridade dos 5 passos guiados.

---

## 💻 Como Iniciar o Diskai

### Método 1: Pelo Atalho na Área de Trabalho
1. Dê um duplo clique no arquivo `Abrir_Diskai.bat` localizado na sua Área de Trabalho (`Desktop`).
2. O Diskai iniciará e abrirá automaticamente no seu navegador em `http://localhost:5173`.

### Método 2: Pelo Terminal
```bash
cd "C:\Users\zeit-\Desktop\Diskai"
npm run dev
```

---

## 🛠️ Tecnologias Utilizadas
- **React 18** + **TypeScript**
- **Vite** (Build ultra-rápido)
- **Tailwind CSS** (Paleta e tokens autênticos do Discord: `#1e1f22`, `#2b2d31`, `#313338`, `#5865F2`)
- **Lucide Icons**
- **Web Audio API** & **MediaStream / MediaRecorder API**
- **Canvas-Confetti**
- **Node.js Test Runner Nativo**
