# GetMeats - E-commerce de Caixas de Carne

Sistema completo de e-commerce para venda de caixas de carne com integração Pix do Mercado Pago.

## 🚀 Funcionalidades

### ✅ Implementadas
- **Autenticação Firebase** - Login/cadastro com Google e email
- **Sistema de Caixas** - CRUD completo de produtos
- **Painel Admin** - Gestão completa com filtros e status
- **Área do Cliente** - Meus Pedidos com acompanhamento completo
- **Fluxo de Compra** - Sinalização de interesse e checkout
- **Integração Pix** - Pagamentos via Mercado Pago
- **Sistema de Emails** - Notificações automáticas via EmailJS
- **Soft Delete** - Exclusão lógica com restauração
- **Interface Responsiva** - Design moderno com Tailwind CSS

### 🔄 Fluxo da Aplicação
1. **Cliente** navega e sinaliza interesse em caixas
2. **Sistema** gera Pix único via Mercado Pago
3. **Email** é enviado automaticamente com link de pagamento
4. **Admin** gerencia pedidos e caixas via painel completo

## 🛠️ Tecnologias

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Firebase (Auth + Firestore)
- **Pagamentos**: Mercado Pago API
- **Emails**: EmailJS
- **Styling**: Tailwind CSS
- **Build**: Vite

## 📋 Pré-requisitos

- Node.js 16+
- Conta Google (para Firebase)
- Conta Mercado Pago
- Conta EmailJS

## 🚀 Instalação e Configuração

### 1. Clone o repositório
```bash
git clone https://github.com/cpgomes31-hub/getmeats.git
cd getmeats
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente
```bash
cp .env.example .env.local
```

Edite `.env.local` com suas credenciais:

#### Firebase
- Acesse [Firebase Console](https://console.firebase.google.com/)
- Crie um projeto e habilite Authentication + Firestore
- Copie as configurações do SDK para o `.env.local`:
  ```
  VITE_FIREBASE_API_KEY=your_api_key_here
  VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
  VITE_FIREBASE_PROJECT_ID=your_project_id
  VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
  VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
  VITE_FIREBASE_APP_ID=your_app_id
  ```

#### Mercado Pago
- Acesse [Mercado Pago Developers](https://www.mercadopago.com.br/developers/)
- Crie uma aplicação e gere um Access Token
- Configure para produção se necessário

#### EmailJS
- Acesse [EmailJS](https://www.emailjs.com/)
- Crie serviço, template e obtenha as credenciais

### 4. Execute o projeto
```bash
npm run dev
```

Acesse `http://localhost:5173`

## 🔧 Scripts Disponíveis

```bash
npm run dev      # Inicia servidor de desenvolvimento
npm run build    # Build para produção
npm run preview  # Preview do build
```

## 📁 Estrutura do Projeto

```
src/
├── components/          # Componentes reutilizáveis
├── context/            # Contextos React (Auth)
├── firebase/           # Configurações e serviços Firebase
├── mercadopago/        # Integração Mercado Pago
├── pages/             # Páginas da aplicação
├── services/          # Serviços externos (EmailJS)
├── styles/            # Estilos globais
└── types/             # Definições TypeScript
```

## 🎯 Como Usar

### 👤 Clientes (Usuários Finais)
1. **Página Inicial**: Visualize todas as caixas de carne disponíveis
2. **Login**: Faça login com Google ou email/senha
3. **Complete seu perfil**: Adicione dados pessoais necessários
4. **Faça pedidos**: Sinalize interesse nas caixas desejadas
5. **Acompanhe pagamentos**: Receba links Pix por email
6. **Meus Pedidos**: Acompanhe status e copie links de pagamento (apenas quando logado)

### 👨‍💼 Administradores/Gestores
1. **Login Admin**: Clique em "Admin" no menu
2. **Credenciais**:
   - **Email:** `admin@getmeats.com`
   - **Senha:** `123`
3. **Painel Completo**: Gerencie caixas, pedidos e usuários
4. **Sistema Independente**: Não utiliza Firebase Auth

### 🔄 Estados de Navegação

#### **Não Logado**:
- Página Inicial | Entrar | Admin

#### **Logado como Cliente**:
- Página Inicial | Meus Pedidos | Sair

#### **Logado como Admin**:
- Página Inicial | Admin | Sair

#### **Logout**: Sempre redireciona para Página Inicial

## � Sistema de Autenticação

O sistema possui **dois tipos de usuários** com autenticação separada:

### 👤 Clientes
- Login via **Google** ou **email/senha**
- Acesso ao catálogo de produtos
- Área "Meus Pedidos" (apenas quando logado)
- Fluxo completo de compra

### 👨‍💼 Administradores/Gestores
- Login dedicado com credenciais específicas
- **Email:** `admin@getmeats.com`
- **Senha:** `123`
- Acesso completo ao painel administrativo
- Gestão de caixas, pedidos e usuários

### 🔄 Regras de Autenticação
- **Usuários não podem estar logados simultaneamente** como cliente e admin
- **Menu "Meus Pedidos"** aparece apenas para clientes logados
- **Menu "Admin"** redireciona para login administrativo se não estiver logado como gestor
- **Botão "Sair"** disponível para logout completo

## 📊 Status do Projeto

✅ **Completo e Funcional**
- E-commerce fully operational
- Integração Pix working
- Sistema de emails ativo
- Painel admin completo
- Área do cliente com acompanhamento de pedidos

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📝 Licença

Este projeto é privado e confidencial.

---

**Desenvolvido com ❤️ para o GetMeats**
