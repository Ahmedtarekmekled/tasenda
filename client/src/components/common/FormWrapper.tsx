import React from 'react';

interface FormWrapperProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
}

const FormWrapper: React.FC<FormWrapperProps> = ({
  title,
  subtitle,
  children,
  onSubmit,
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">{title}</h2>
          {subtitle && <p className="mt-2 text-sm text-gray-600">{subtitle}</p>}
        </div>
        <form className="mt-8 space-y-6" onSubmit={onSubmit}>
          {children}
        </form>
      </div>
    </div>
  );
};

export default FormWrapper; 