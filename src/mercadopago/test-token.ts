// Script de teste do token Mercado Pago
// Execute no console do navegador: import('./src/mercadopago/test-token.js').then(m => m.testToken())

import { checkTokenType, createPixPayment } from './pix.js';

declare global {
  interface Window {
    testMercadoPagoToken: () => Promise<boolean>;
    testPixPayment: () => Promise<void>;
  }
}

export async function runTokenTest() {
  console.log('🚀 Iniciando teste do token Mercado Pago...');
  const result = await checkTokenType();

  if (result.isValid) {
    console.log('📊 Resultado do teste:', result.isTest ? '✅ Token de TESTE válido' : '✅ Token de PRODUÇÃO válido');
    console.log('📊 Métodos de pagamento disponíveis:', result.methodsCount);
  } else {
    console.log('📊 Resultado do teste: ❌ Token inválido');
    console.log('📊 Erro:', result.error);
  }

  return result.isValid;
}

export async function testPixCreation() {
  console.log('💰 Testando criação de pagamento Pix...');

  try {
    const result = await createPixPayment({
      amount: 0.01, // Valor mínimo para teste
      description: 'Teste de integração Pix',
      payerEmail: 'teste@example.com',
      payerName: 'Usuário Teste'
    });

    console.log('✅ Pagamento Pix criado com sucesso!');
    console.log('📊 ID do pagamento:', result.id);
    console.log('📊 Status:', result.status);
    console.log('📊 Link:', result.paymentLink);

  } catch (error) {
    console.log('❌ Falha na criação do Pix:', error.message);
  }
}

// Para uso direto no console
window.testMercadoPagoToken = runTokenTest;
window.testPixPayment = testPixCreation;