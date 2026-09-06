import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useRegister } from '../hooks/useRegister';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/shared/components/ui/Card';
import { Input } from '@/shared/components/ui/Input';
import { Label } from '@/shared/components/ui/Label';
import { Button } from '@/shared/components/ui/Button';
import { Alert, AlertTitle, AlertDescription } from '@/shared/components/ui/Alert';
import { UserPlus, AlertTriangle } from 'lucide-react';

export const RegisterForm: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const navigate = useNavigate();
  const { mutate: register, isPending, error } = useRegister();

  const validate = () => {
    const errors: {
      name?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!name.trim()) {
      errors.name = 'El nombre completo es obligatorio';
    }

    if (!email.trim()) {
      errors.email = 'El correo electrónico es obligatorio';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Ingresa un formato de correo válido';
    }

    if (!password) {
      errors.password = 'La contraseña es obligatoria';
    } else if (password.length < 8) {
      errors.password = 'La contraseña debe tener al menos 8 caracteres';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    register(
      { name, email, password },
      {
        onSuccess: () => {
          // Auto-login exitoso, redirigir a dashboard
          navigate('/dashboard', {
            replace: true,
            state: { message: '¡Cuenta creada y sesión iniciada exitosamente!' },
          });
        },
      }
    );
  };

  const isEmailTaken = error?.code === 'EMAIL_ALREADY_REGISTERED';

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="shadow-lg border-slate-200">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <UserPlus className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Crear Cuenta de Miembro</CardTitle>
          <CardDescription>
            Únete a nuestra red de coworking y gestiona tus reservas de espacios y salas
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && !isEmailTaken && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error en el registro</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1">
              <Label htmlFor="name" required>
                Nombre Completo
              </Label>
              <Input
                id="name"
                placeholder="Ej. Ana Torres"
                value={name}
                onChange={(e) => setName(e.target.value)}
                error={formErrors.name}
                disabled={isPending}
                autoComplete="name"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="email" required>
                Correo Electrónico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="ana@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={
                  formErrors.email ||
                  (isEmailTaken ? 'Este correo electrónico ya se encuentra registrado' : undefined)
                }
                disabled={isPending}
                autoComplete="email"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password" required>
                Contraseña
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={formErrors.password}
                disabled={isPending}
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="confirmPassword" required>
                Confirmar Contraseña
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Repite tu contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={formErrors.confirmPassword}
                disabled={isPending}
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700" isLoading={isPending}>
              Registrarse e Iniciar Sesión
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center border-t border-slate-100 pt-4 text-center">
          <p className="text-sm text-slate-600">
            ¿Ya tienes una cuenta?{' '}
            <Link to="/login" className="font-semibold text-blue-600 hover:underline">
              Iniciar Sesión
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};
