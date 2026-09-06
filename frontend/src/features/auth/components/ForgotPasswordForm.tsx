import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForgotPassword } from '../hooks/usePasswordReset';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/shared/components/ui/Card';
import { Input } from '@/shared/components/ui/Input';
import { Label } from '@/shared/components/ui/Label';
import { Button } from '@/shared/components/ui/Button';
import { Alert, AlertTitle, AlertDescription } from '@/shared/components/ui/Alert';
import { KeyRound, CheckCircle2, ArrowLeft } from 'lucide-react';

export const ForgotPasswordForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const { mutate: forgotPassword, isPending, data: responseData } = useForgotPassword();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setEmailError('Ingresa tu correo electrónico');
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setEmailError('Ingresa un formato de correo válido');
      return;
    }
    setEmailError('');

    forgotPassword(
      { email },
      {
        onSuccess: () => {
          setIsSubmitted(true);
        },
      }
    );
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="shadow-lg border-slate-200">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
            <KeyRound className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Recuperar Contraseña</CardTitle>
          <CardDescription>
            Te enviaremos un enlace con un token de un solo uso válido por 1 hora
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isSubmitted ? (
            <div className="space-y-4">
              <Alert variant="success">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Solicitud procesada</AlertTitle>
                <AlertDescription>
                  {responseData?.message || 'Si el email existe, se enviaron instrucciones.'}
                </AlertDescription>
              </Alert>
              <p className="text-xs text-slate-500 text-center">
                (En entorno de pruebas MSW, puedes usar el token de prueba <code>rst_01</code> en la pantalla de restablecimiento).
              </p>
              <div className="pt-2">
                <Link to="/reset-password?token=rst_01">
                  <Button variant="outline" className="w-full">
                    Ir a Restablecer Contraseña (Demo Token rst_01)
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="email" required>
                  Correo Electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@coworking.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={emailError}
                  disabled={isPending}
                  autoComplete="email"
                />
              </div>

              <Button type="submit" className="w-full" isLoading={isPending}>
                Enviar Instrucciones
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="flex justify-center border-t border-slate-100 pt-4 text-center">
          <Link to="/login" className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio de sesión
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};
