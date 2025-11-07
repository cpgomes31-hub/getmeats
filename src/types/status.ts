// src/types/status.ts

/**
 * Status da Caixa Pré-Paga
 */
export enum BoxStatus {
  WAITING_PURCHASES = 'Aguardando compras',
  WAITING_SUPPLIER_ORDER = 'Aguardando pedido ao fornecedor',
  WAITING_SUPPLIER_DELIVERY = 'Aguardando entrega fornecedor',
  SUPPLIER_DELIVERY_RECEIVED = 'Entrega do fornecedor recebida',
  DISPATCHING = 'Despachando',
  COMPLETED = 'Finalizada',
  CANCELLED = 'Cancelada'
}

/**
 * Status dos Pedidos dos Clientes (Pré-Pago)
 */
export enum OrderStatus {
  WAITING_PAYMENT = 'Aguardando pagamento cliente',
  WAITING_BOX_CLOSURE = 'Aguardando fechamento da caixa',
  IN_PURCHASE_PROCESS = 'Em processo de compra',
  WAITING_SUPPLIER = 'Aguardando fornecedor - frigorífico',
  WAITING_CLIENT_SHIPMENT = 'Aguardando envio para o cliente',
  DISPATCHING_TO_CLIENT = 'Despachando para o cliente',
  DELIVERED_TO_CLIENT = 'Entregue ao cliente',
  CANCELLED = 'Cancelado'
}

/**
 * Transições válidas para Status da Caixa
 */
const BOX_STATUS_TRANSITIONS: Record<BoxStatus, BoxStatus[]> = {
  [BoxStatus.WAITING_PURCHASES]: [BoxStatus.WAITING_SUPPLIER_ORDER, BoxStatus.CANCELLED],
  [BoxStatus.WAITING_SUPPLIER_ORDER]: [BoxStatus.WAITING_SUPPLIER_DELIVERY, BoxStatus.CANCELLED],
  [BoxStatus.WAITING_SUPPLIER_DELIVERY]: [BoxStatus.SUPPLIER_DELIVERY_RECEIVED],
  [BoxStatus.SUPPLIER_DELIVERY_RECEIVED]: [BoxStatus.DISPATCHING],
  [BoxStatus.DISPATCHING]: [BoxStatus.COMPLETED],
  [BoxStatus.COMPLETED]: [],
  [BoxStatus.CANCELLED]: []
};

/**
 * Transições válidas para Status dos Pedidos
 */
const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.WAITING_PAYMENT]: [OrderStatus.WAITING_BOX_CLOSURE],
  [OrderStatus.WAITING_BOX_CLOSURE]: [OrderStatus.IN_PURCHASE_PROCESS],
  [OrderStatus.IN_PURCHASE_PROCESS]: [OrderStatus.WAITING_SUPPLIER],
  [OrderStatus.WAITING_SUPPLIER]: [OrderStatus.WAITING_CLIENT_SHIPMENT],
  [OrderStatus.WAITING_CLIENT_SHIPMENT]: [OrderStatus.DISPATCHING_TO_CLIENT],
  [OrderStatus.DISPATCHING_TO_CLIENT]: [OrderStatus.DELIVERED_TO_CLIENT],
  [OrderStatus.DELIVERED_TO_CLIENT]: [],
  [OrderStatus.CANCELLED]: []
};

/**
 * Valida se uma transição de status é permitida
 * @param currentStatus Status atual
 * @param nextStatus Status desejado
 * @param type Tipo: 'box' para caixa, 'order' para pedido
 * @returns true se a transição é válida
 */
export function isValidStatusTransition(
  currentStatus: BoxStatus | OrderStatus,
  nextStatus: BoxStatus | OrderStatus,
  type: 'box' | 'order'
): boolean {
  if (type === 'box') {
    const transitions = BOX_STATUS_TRANSITIONS[currentStatus as BoxStatus];
    return transitions ? transitions.includes(nextStatus as BoxStatus) : false;
  } else {
    const transitions = ORDER_STATUS_TRANSITIONS[currentStatus as OrderStatus];
    return transitions ? transitions.includes(nextStatus as OrderStatus) : false;
  }
}

/**
 * Mapeamento dos status antigos para os novos (para compatibilidade com dados existentes)
 */
export const LEGACY_BOX_STATUS_MAP: Record<string, BoxStatus> = {
  'awaiting_customer_purchases': BoxStatus.WAITING_PURCHASES,
  'awaiting_supplier_purchase': BoxStatus.WAITING_SUPPLIER_ORDER,
  'awaiting_supplier_delivery': BoxStatus.WAITING_SUPPLIER_DELIVERY,
  'received_at_warehouse': BoxStatus.SUPPLIER_DELIVERY_RECEIVED,
  'dispatching_to_customers': BoxStatus.DISPATCHING,
  'completed': BoxStatus.COMPLETED,
  'cancelled': BoxStatus.CANCELLED
};

export const LEGACY_ORDER_STATUS_MAP: Record<string, OrderStatus> = {
  'awaiting_box_closure': OrderStatus.WAITING_BOX_CLOSURE,
  'awaiting_payment': OrderStatus.WAITING_PAYMENT,
  'awaiting_supplier': OrderStatus.WAITING_SUPPLIER,
  'dispatching': OrderStatus.DISPATCHING_TO_CLIENT,
  'delivered': OrderStatus.DELIVERED_TO_CLIENT,
  'cancelled': OrderStatus.CANCELLED
};

/**
 * Converte status legado para novo formato
 */
export function mapLegacyBoxStatus(legacyStatus: string): BoxStatus {
  return LEGACY_BOX_STATUS_MAP[legacyStatus] || BoxStatus.WAITING_PURCHASES;
}

export function mapLegacyOrderStatus(legacyStatus: string): OrderStatus {
  return LEGACY_ORDER_STATUS_MAP[legacyStatus] || OrderStatus.WAITING_PAYMENT;
}

/**
 * Obtém os próximos status válidos para um status atual
 * @param currentStatus Status atual
 * @param type Tipo: 'box' para caixa, 'order' para pedido
 * @returns Array de status válidos para transição
 */
export function getValidNextStatuses(
  currentStatus: BoxStatus | OrderStatus,
  type: 'box' | 'order'
): (BoxStatus | OrderStatus)[] {
  if (type === 'box') {
    return BOX_STATUS_TRANSITIONS[currentStatus as BoxStatus] || [];
  } else {
    return ORDER_STATUS_TRANSITIONS[currentStatus as OrderStatus] || [];
  }
}