import { createOpenApiApp } from '@/api/factory';

import {
  enableDirectDebitHandler,
  initiateCardAdditionHandler,
  verifyCardAdditionHandler,
} from './card-addition-handler';
import {
  createPaymentMethodHandler,
  deletePaymentMethodHandler,
  getPaymentMethodsHandler,
  setDefaultPaymentMethodHandler,
} from './handler';
import {
  createPaymentMethodRoute,
  deletePaymentMethodRoute,
  enableDirectDebitRoute,
  getPaymentMethodsRoute,
  initiateCardAdditionRoute,
  setDefaultPaymentMethodRoute,
  verifyCardAdditionRoute,
} from './route';

const app = createOpenApiApp();

// GET /payment-methods
app.openapi(getPaymentMethodsRoute, getPaymentMethodsHandler);

// POST /payment-methods
app.openapi(createPaymentMethodRoute, createPaymentMethodHandler);

// DELETE /payment-methods/:id
app.openapi(deletePaymentMethodRoute, deletePaymentMethodHandler);

// PATCH /payment-methods/:id/default
app.openapi(setDefaultPaymentMethodRoute, setDefaultPaymentMethodHandler);

// POST /payment-methods/card-addition - New card addition flow
app.openapi(initiateCardAdditionRoute, initiateCardAdditionHandler);

// POST /payment-methods/verify-card - Verify card addition
app.openapi(verifyCardAdditionRoute, verifyCardAdditionHandler);

// POST /payment-methods/:id/enable-direct-debit - Enable direct debit for payment method
app.openapi(enableDirectDebitRoute, enableDirectDebitHandler);

export default app;
