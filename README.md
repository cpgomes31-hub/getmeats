# GET Meats — prototype

Projeto inicial do GET Meats. Este repositório contém o scaffold inicial (Vite + React + TypeScript + Tailwind) e a página de login com integração básica ao Firebase Auth.

## Primeiros passos (Windows PowerShell)

1. Instalar dependências:

```powershell
npm install
```

2. Rodar em dev:

```powershell
npm run dev
```

## Configuração Mercado Pago e EmailJS

Para pagamentos Pix e envio de emails:

1. **Mercado Pago**:
   - Crie uma conta em [Mercado Pago](https://www.mercadopago.com.br/)
   - Acesse [Suas Integrações](https://www.mercadopago.com.br/developers/panel/app) e crie uma aplicação
   - Obtenha o Access Token de produção/teste
   - Adicione ao `.env.local`: `VITE_MERCADO_PAGO_ACCESS_TOKEN=seu_token_aqui`

   **Nota:** A integração usa a API REST com proxy Vite para resolver problemas de CORS em desenvolvimento.

2. **EmailJS**:
   - Crie uma conta em [EmailJS](https://www.emailjs.com/)
   - Crie um serviço de email (Gmail, Outlook, etc.)
   - Crie um template de email com variáveis: `{{to_name}}`, `{{message}}`, `{{payment_link}}`, `{{qr_code}}`
   - Obtenha Service ID, Template ID e Public Key
   - Adicione ao `.env.local`:
     ```
     VITE_EMAILJS_SERVICE_ID=seu_service_id
     VITE_EMAILJS_TEMPLATE_ID=seu_template_id
     VITE_EMAILJS_PUBLIC_KEY=sua_public_key
     ```

3. Copie `.env.example` para `.env.local` e preencha as variáveis.

## Testando a integração

1. Abra http://localhost:5173
2. Para adicionar dados de teste, abra o console do navegador e execute:
   ```javascript
   import('./firebase/test-data.js').then(m => m.addSampleBox())
   ```
3. Recarregue a página para ver as caixas disponíveis
4. Teste o fluxo: Login → Completar cadastro → Sinalizar compra

## Estrutura do projeto

- `src/types/`: Definições TypeScript para caixas, compras e usuários
- `src/firebase/`: Configuração e serviços Firebase
- `src/pages/`: Páginas da aplicação
- `src/context/`: Contextos React (Auth)
- `src/styles/`: Estilos globais e Tailwind

## Próximos passos

- Implementar painel de gestão para gestores
- Adicionar upload de fotos para caixas
- Implementar notificações e status de compras
- Adicionar QR Code para pagamentos PIX
- Migrar para Flutter/React Native para app mobile

## Observações importantes

- A fonte '29LT Zarid Serif' é comercial — coloque os arquivos `.woff/.woff2` em `src/assets/fonts/` e remova do `.gitignore` se quiser comitar.
- Para subir ao GitHub, inicialize o repositório localmente, adicione remoto e faça push. Recomendo usar SSH ou token pessoal para autenticar.
