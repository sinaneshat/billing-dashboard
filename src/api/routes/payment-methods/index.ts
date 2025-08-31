import { createOpenApiApp } from '@/api/factory';

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

export default app;
