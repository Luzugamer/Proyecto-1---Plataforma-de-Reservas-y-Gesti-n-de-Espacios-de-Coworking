import React from 'react';
import { LoginForm } from '../components/LoginForm';

export const LoginPage: React.FC = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-100">
      <div className="w-full max-w-md mb-6 text-center">
        <h1 className="text-3xl font-extrabold text-blue-900 tracking-tight">COWORK<span className="text-blue-600">HUB</span></h1>
        <p className="text-sm text-slate-500 font-medium">Gestión de Espacios y Reservas</p>
      </div>
      <LoginForm />
    </div>
  );
};
