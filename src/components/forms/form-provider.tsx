import React from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import { FormProvider as Form } from 'react-hook-form';

type Props<
  TFieldValues extends FieldValues = FieldValues,
  TContext = unknown,
  TTransformedValues = TFieldValues,
> = {
  children: React.ReactNode;
  methods: UseFormReturn<TFieldValues, TContext, TTransformedValues>;
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
};

function FormProvider<
  TFieldValues extends FieldValues = FieldValues,
  TContext = unknown,
  TTransformedValues = undefined,
>({
  children,
  onSubmit,
  methods,
}: Props<TFieldValues, TContext, TTransformedValues>) {
  return (
    <Form {...methods}>
      <form onSubmit={onSubmit}>{children}</form>
    </Form>
  );
}

export default FormProvider;
