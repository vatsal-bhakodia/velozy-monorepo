import { useNode, Element } from "@craftjs/core";
import ToolBar from "@/components/builder/toolbar";
import React from "react";
import { Button } from "@/components/builder/elements/button";
import { FormField, FormProps } from "./types";
import { FormFieldSettings } from "./settings";

export const Form = () => {
  const {
    connectors: { connect, drag },
    props,
  } = useNode((node) => ({
    props: node.data.props as FormProps,
  }));

  const renderField = (field: FormField, index: number) => {
    switch (field.type) {
      case "text":
      case "email":
      case "password":
      case "date":
      case "tel":
        return (
          <div
            key={index}
            className={`mb-4 ${field.colSpan || "col-span-full"}`}
          >
            <label className="block text-sm font-medium mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type={field.type}
              name={field.name}
              placeholder={field.placeholder}
              required={field.required}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        );
      case "textarea":
        return (
          <div
            key={index}
            className={`mb-4 ${field.colSpan || "col-span-full"}`}
          >
            <label className="block text-sm font-medium mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <textarea
              name={field.name}
              placeholder={field.placeholder}
              required={field.required}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              rows={4}
            />
          </div>
        );
      case "select":
        return (
          <div
            key={index}
            className={`mb-4 ${field.colSpan || "col-span-full"}`}
          >
            <label className="block text-sm font-medium mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              name={field.name}
              required={field.required}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">
                {field.placeholder || "Select an option"}
              </option>
              {field.options?.map((option, i) => (
                <option key={i} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        );
      case "checkbox":
        return (
          <div
            key={index}
            className={`mb-4 flex items-center ${
              field.colSpan || "col-span-full"
            }`}
          >
            <input
              type="checkbox"
              id={`${field.name}-${index}`}
              name={field.name}
              required={field.required}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label
              htmlFor={`${field.name}-${index}`}
              className="ml-2 text-sm font-medium"
            >
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
          </div>
        );
      case "radio":
        return (
          <div
            key={index}
            className={`mb-4 ${field.colSpan || "col-span-full"}`}
          >
            <fieldset>
              <legend className="text-sm font-medium mb-2">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </legend>
              <div className="space-y-2">
                {field.options?.map((option, i) => (
                  <div key={i} className="flex items-center">
                    <input
                      type="radio"
                      id={`${field.name}-${i}`}
                      name={field.name}
                      value={option}
                      required={field.required}
                      className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label
                      htmlFor={`${field.name}-${i}`}
                      className="ml-2 text-sm"
                    >
                      {option}
                    </label>
                  </div>
                ))}
              </div>
            </fieldset>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <form
      ref={(ref: HTMLFormElement | null) => {
        if (ref) connect(drag(ref));
      }}
      action={props.actionUrl}
      method={props.method || "POST"}
      className="w-full grid grid-cols-12 gap-4"
      style={props.style}
    >
      {props.fields &&
        props.fields.map((field: FormField, index: number) =>
          renderField(field, index),
        )}

      <div className="col-span-full flex justify-start mt-6">
        <Element
          is={Button}
          text="Submit"
          type="submit"
          className="w-full"
          id={`submit-form-btn-${crypto.randomUUID()}`}
        />
      </div>
    </form>
  );
};

// craft js configuration for the Form component
Form.craft = {
  displayName: "Form",
  props: {
    actionUrl: "",
    method: "POST",
    fields: [
      {
        type: "text" as const,
        name: "full_name",
        label: "Full Name",
        placeholder: "Enter your full name",
        required: true,
        colSpan: "col-span-6",
      },
      {
        type: "email" as const,
        name: "email_address",
        label: "Email Address",
        placeholder: "Enter your email address",
        required: true,
        colSpan: "col-span-6",
      },
      {
        type: "textarea" as const,
        name: "message",
        label: "Message",
        placeholder: "Enter your message here",
        required: false,
        colSpan: "col-span-full",
      },
    ],
    style: {
      width: "100%",
    },
  },
  rules: {
    canDrag: () => true,
  },
  isCanvas: true,
  related: {
    toolbar: ToolBar,
  },
  toolbarSections: ["dimensions"],
  customToolbarSections: [
    {
      key: "formFieldSettings",
      label: "Form Fields",
      icon: "FieldIcon",
      component: <FormFieldSettings />,
      priority: 1,
    },
  ],
};
