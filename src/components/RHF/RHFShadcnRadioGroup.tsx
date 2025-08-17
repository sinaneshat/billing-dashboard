// components/TextInput.tsx
import React from 'react';
import { useFormContext } from 'react-hook-form';

import type { FormOptions, GeneralFormProps } from '@/types/general';

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';

type Props = {
  options: FormOptions;
} & GeneralFormProps;
function RHFShadcnRadioGroup({
  name,
  options,
  title,
  required,
  value: externalValue,
  onChange: externalOnChange,
}: Props) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="w-full space-y-3">
          <FormLabel>{title}</FormLabel>
          <FormControl>
            <RadioGroup
              data-testid={field.name}
              onValueChange={(e) => {
                if (externalOnChange) {
                  return externalOnChange?.({ target: { value: e } });
                }
                return field.onChange(e);
              }}
              required={required}
              defaultValue={
                field.value !== undefined ? field.value : externalValue
              }
              className="flex flex-col space-y-1"
            >
              {options.map(item => (
                <FormItem
                  key={item.value}
                  className="flex items-center space-x-3 space-y-0"
                >
                  <FormControl>
                    <RadioGroupItem value={item.value} />
                  </FormControl>
                  <FormLabel className="font-normal">{item.label}</FormLabel>
                </FormItem>
              ))}
            </RadioGroup>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default RHFShadcnRadioGroup;
