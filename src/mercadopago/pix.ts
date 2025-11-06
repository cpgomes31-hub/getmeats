// API REST do Mercado Pago via proxy do Vite (resolve CORS)
const MERCADO_PAGO_API_URL = '/api/mercadopago';
const ACCESS_TOKEN = (import.meta as any).env.VITE_MERCADO_PAGO_ACCESS_TOKEN || '';

console.log('🔑 Mercado Pago Token:', ACCESS_TOKEN ? `Presente (${ACCESS_TOKEN.substring(0, 20)}...)` : 'Ausente');

// Função para verificar se o token é de teste ou produção
export async function checkTokenType() {
  try {
    console.log('🔍 Verificando tipo do token...');

    const response = await fetch(`${MERCADO_PAGO_API_URL}/v1/payment_methods`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Token válido');

      // Verificar se estamos em sandbox/teste ou produção
      // Tokens de teste geralmente têm resposta diferente ou limitações
      const isTestToken = ACCESS_TOKEN.startsWith('TEST-');
      console.log('🏷️ Tipo do token:', isTestToken ? 'TESTE' : 'PRODUÇÃO');

      return {
        isValid: true,
        isTest: isTestToken,
        methodsCount: data.length
      };
    } else {
      const error = await response.json();
      console.log('❌ Token inválido:', error);
      return {
        isValid: false,
        error: error
      };
    }
  } catch (error) {
    console.error('❌ Erro na verificação:', error);
    return {
      isValid: false,
      error: error
    };
  }
}

export interface PixPaymentData {
  amount: number;
  description: string;
  payerEmail: string;
  payerName?: string;
}

export interface PixPaymentResponse {
  id: string;
  status: string;
  qrCode: string;
  qrCodeBase64: string;
  paymentLink: string;
  expiresAt: string;
}

export async function createPixPayment(data: PixPaymentData): Promise<PixPaymentResponse> {
  try {
    console.log('💰 Criando pagamento Pix:', data);

    // Testar token primeiro
    const tokenValid = await checkTokenType();
    if (!tokenValid.isValid) {
      throw new Error('Token do Mercado Pago inválido ou sem permissões');
    }

    const paymentData = {
      transaction_amount: data.amount,
      description: data.description,
      payment_method_id: 'pix',
      payer: {
        email: data.payerEmail,
        first_name: data.payerName?.split(' ')[0] || '',
        last_name: data.payerName?.split(' ').slice(1).join(' ') || '',
      },
    };

    console.log('📤 Enviando para API:', paymentData);

    const response = await fetch(`${MERCADO_PAGO_API_URL}/v1/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'X-Idempotency-Key': `pix_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      },
      body: JSON.stringify(paymentData),
    });

    console.log('📥 Resposta da API:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Erro detalhado:', errorData);
      throw new Error(`Erro na API do Mercado Pago: ${response.status} - ${errorData.message || 'Erro desconhecido'}`);
    }

    const payment = await response.json();
    console.log('✅ Pagamento criado:', payment);

    return {
      id: payment.id,
      status: payment.status,
      qrCode: payment.point_of_interaction?.transaction_data?.qr_code || '',
      qrCodeBase64: payment.point_of_interaction?.transaction_data?.qr_code_base64 || '',
      paymentLink: payment.point_of_interaction?.transaction_data?.ticket_url || '',
      expiresAt: payment.date_of_expiration || '',
    };
  } catch (error) {
    console.error('❌ Erro ao criar pagamento Pix:', error);
    throw error;
  }
}