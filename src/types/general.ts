import type { LucideIcon } from 'lucide-react';

export type FormOption = {
  label: string;
  value: string;
  description?: string;
};
export type FormOptions = FormOption[] | [];

export type InitialDefaultValues = string | number | null | boolean | undefined;

export type GeneralFormProps = {
  colSpan?: number;
  onChange?: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { value: InitialDefaultValues } }) => void;
  name: string;
  id?: string;
  title: string;
  value?: InitialDefaultValues;
  defaultValue?: InitialDefaultValues;
  description?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

export type TextInputProps = {
  variant:
    | 'text'
    | 'checkbox'
    | 'date'
    | 'switch'
    | 'number'
    | 'url'
    | 'email'
    | 'textarea';
} & GeneralFormProps;

export type WithOptionsProps = {
  variant: 'radio' | 'select' | 'combobox' | 'trigger_schedule';
  options: FormOptions;
} & GeneralFormProps;

export type NavItem = {
  href?: string;
  icon?: LucideIcon; // Specify the icon as a LucideIcon component
  children?: NavItem[] | [];
  onClick?: () => void;
} & FormOption;

export enum AIHistoryStatus {
  Aborted = 'aborted',
  Success = 'success',
  Error = 'error',
}

export type ApiDefaultError = {
  message: string;
};

export type ServiceConfig = {
  basePath?: string;
  showToasts?: boolean;
  authToken?: string;
};

export type CustomFetchConfig = {
  cache?: 'default' | 'no-store' | 'reload' | 'force-cache' | 'only-if-cached';
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
} & RequestInit & Partial<ServiceConfig>;
