import React from 'react';

interface ErrorBoxProps {
  message: string | string[];
}

const ErrorBox: React.FC<ErrorBoxProps> = ({ message }) => {
  if (!message) return null;
  
  const messages = Array.isArray(message) ? message : [message];
  
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
      {messages.length === 1 ? (
        <p>{messages[0]}</p>
      ) : (
        <ul className="list-disc pl-5">
          {messages.map((msg, index) => (
            <li key={index}>{msg}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ErrorBox; 