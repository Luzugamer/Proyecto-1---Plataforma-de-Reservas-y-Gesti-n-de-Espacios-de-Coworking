import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useResetPassword } from '../hooks/usePasswordReset';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/shared/components/ui/Card';
import { Input } from '@/shared/components/ui/Input';
import { Label } from '@/shared/components/ui/Label';
import { Button } from '@/shared/components/ui/Button';
import { Alert, AlertTitle, AlertDescription } from '@/shared/components/ui/Alert';
import { Key, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const ResetPasswordForm: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialToken = searchParams.get('token') || '';

  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    token?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const navigate = useNavigate();
  const { mutate: resetPassword, isPending, error } = useResetPassword();

  const validate = () => {
    const errors: { token?: string; newPassword?: string; confirmPassword?: string } = {};

    if (!token.trim()) {
      errors.token = 'El token de restablecimiento es obligatorio';
    }

    if (!newPassword) {
      errors.newPassword = 'La nueva contraseña es obligatoria';
    } else if (newPassword.length < 8) {
      errors.newPassword = 'La contraseña debe tener al menos 8 caracteres';
    }

    if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    resetPassword(
      { token, newPassword },
      {
        onSuccess: () => {
          setIsSuccess(true);
        },
      }
    );
  };

  const isInvalidToken = error?.code === 'INVALID_OR_EXPIRED_RESET_TOKEN';

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="shadow-lg border-slate-200">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <Key className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Nueva Contraseña</CardTitle>
          <CardDescription>
            Ingresa tu token de seguridad recibido y define tu nueva contraseña
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isSuccess ? (
            <div className="space-y-4">
              <Alert variant="success">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>¡Contraseña actualizada!</AlertTitle>
                <AlertDescription>
                  Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión con tu nueva clave.
                </AlertDescription>
              </Alert>
              <Button onClick={() => navigate('/login')} className="w-full">
                Ir a Iniciar Sesión
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {isInvalidToken && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Token inválido o expirado</AlertTitle>
                  <AlertDescription>
                    El token de recuperación no es válido o ha superado la hora de vigencia. Por favor solicita un nuevo enlace.
                  </AlertDescription>
                </Alert>
              )}

              {error && !isInvalidToken && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error.message}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1">
                <Label htmlFor="token" required>
                  Token de Seguridad
                </Label>
                <Input
                  id="token"
                  placeholder="Ej. rst_01"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  error={formErrors.token}
                  disabled={isPending}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="newPassword" required>
                  Nueva Contraseña
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  error={formErrors.newPassword}
                  disabled={isPending}
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="confirmPassword" required>
                  Confirmar Nueva Contraseña
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repite tu nueva contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={formErrors.confirmPassword}
                  disabled={isPending}
                  autoComplete="new-password"
                />
              </div>

              <Button type="submit" className="w-full" isLoading={isPending}>
                Restablecer Contraseña
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="flex justify-center border-t border-slate-100 pt-4 text-center">
          <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Cancelar y volver al login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};
