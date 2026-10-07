export interface FormField {
  type:
    | "text"
    | "email"
    | "password"
    | "textarea"
    | "select"
    | "checkbox"
    | "radio"
    | "date"
    | "tel";
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  colSpan?: string;
}

export interface FormProps {
  formId?: string;
  formName?: string;
  formPurpose?: string;
  actionUrl?: string;
  method?: "POST" | "GET";
  fields: FormField[];
  style?: React.CSSProperties;
}
