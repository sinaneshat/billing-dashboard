import { createOpenApiApp } from '@/api/factory';

import {
  initiateDirectDebitContractHandler,
  verifyDirectDebitContractHandler,
} from './direct-debit-handler';
import {
  initiateDirectDebitContractRoute,
  verifyDirectDebitContractRoute,
} from './direct-debit-routes';
import {
  createPaymentMethodHandler,
  deletePaymentMethodHandler,
  getPaymentMethodsHandler,
  setDefaultPaymentMethodHandler,
} from './handler';
import {
  createPaymentMethodRoute,
  deletePaymentMethodRoute,
  getPaymentMethodsRoute,
  setDefaultPaymentMethodRoute,
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

// POST /payment-methods/direct-debit-setup - NEW: ZarinPal Direct Debit Contract Setup
app.openapi(initiateDirectDebitContractRoute, initiateDirectDebitContractHandler);

// POST /payment-methods/verify-direct-debit-contract - NEW: Verify Direct Debit Contract
app.openapi(verifyDirectDebitContractRoute, verifyDirectDebitContractHandler);

export default app;
