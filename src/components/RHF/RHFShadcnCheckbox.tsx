import React from 'react';
import { useFormContext } from 'react-hook-form';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import type { GeneralFormProps } from '@/types/general';

import { Checkbox } from '../ui/checkbox';

function RHFShadcnCheckbox({
  name,
  title,
  description,
  value: externalValue,
  required,
  onChange: externalOnChange,
}: GeneralFormProps) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex w-full flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
          <FormControl>
            <Checkbox
              required={required}
              data-testid={field.name}
              onCheckedChange={(e) => {
                if (externalOnChange) {
                  return externalOnChange?.({ target: { value: e } });
                }
                return field.onChange(e);
              }}
              checked={field.value !== undefined ? field.value : externalValue}
            />
          </FormControl>
          <div className="space-y-1 leading-none">
            <FormLabel>{title}</FormLabel>
            {description && <FormDescription>{description}</FormDescription>}
          </div>
        </FormItem>
      )}
    />
  );
}

export default RHFShadcnCheckbox;
