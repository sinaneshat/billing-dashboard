'use client';

import React from 'react';

import { BankAuthorizationStepperOrchestrator } from './bank-authorization-stepper-orchestrator';

type BankAuthorizationStepperProps = {
  onSuccess?: (contractId: string) => void;
  onCancel?: () => void;
  selectedProduct?: {
    id: string;
    name: string;
    price: number;
  };
};

export function BankAuthorizationStepper(props: BankAuthorizationStepperProps) {
  return <BankAuthorizationStepperOrchestrator {...props} />;
}
