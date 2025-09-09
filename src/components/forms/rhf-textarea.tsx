// components/TextInput.tsx
import React from 'react';
import { useFormContext } from 'react-hook-form';

import type { GeneralFormProps } from '@/types/general';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../ui/form';
import { Textarea } from '../ui/textarea';

type Props = {
  placeholder?: string;
  rows?: number;
} & GeneralFormProps;

function RHFTextarea({
  name,
  title,
  description,
  placeholder,
  required,
  value: externalValue,
  onChange: externalOnChange,
  rows,
  className,
}: Props) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className || 'w-full'}>
          <FormLabel>{title}</FormLabel>
          <FormControl>
            <Textarea
              {...field}
              rows={rows}
              required={required}
              data-testid={field.name}
              placeholder={placeholder}
              className="resize-none"
              onChange={(e) => {
                field.onChange(e.target.value);
                if (externalOnChange) {
                  externalOnChange(e);
                }
              }}
              value={field.value !== undefined ? field.value : externalValue}
            />
          </FormControl>
          <FormDescription>
            {description}
            {' '}
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export default RHFTextarea;
