import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useLogin } from '../hooks/useLogin';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/shared/components/ui/Card';
import { Input } from '@/shared/components/ui/Input';
import { Label } from '@/shared/components/ui/Label';
import { Button } from '@/shared/components/ui/Button';
import { Alert, AlertTitle, AlertDescription } from '@/shared/components/ui/Alert';
import { Lock, AlertTriangle, ShieldAlert, Sparkles } from 'lucide-react';

const DEMO_ACCOUNTS = [
  {
    name: 'Ana Torres',
    roleLabel: 'Miembro Starter',
    plan: 'Starter • 15 cr',
    email: 'miembro@coworking.local',
    pass: 'Miembro123!',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  {
    name: 'Mateo Rossi',
    roleLabel: 'Miembro Pro',
    plan: 'Pro • 45 cr',
    email: 'pro@coworking.local',
    pass: 'Pro123!',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  },
  {
    name: 'Sofía Valdivia',
    roleLabel: 'Enterprise',
    plan: 'Enterprise • 120 cr',
    email: 'enterprise@coworking.local',
    pass: 'Enterprise123!',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  {
    name: 'Carlos Mendoza',
    roleLabel: 'Admin Sede',
    plan: 'Acceso Total',
    email: 'admin@coworking.local',
    pass: 'Admin123!',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  {
    name: 'Valeria Gómez',
    roleLabel: 'Recepción',
    plan: 'Check-in / Operativo',
    email: 'recepcion@coworking.local',
    pass: 'Recepcion123!',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
];

export const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formErrors, setFormErrors] = useState<{ email?: string; password?: string }>({});

  const navigate = useNavigate();
  const location = useLocation();
  const { mutate: login, isPending, error } = useLogin();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const validate = () => {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errors.email = 'El correo electrónico es requerido';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Formato de correo no válido';
    }
    if (!password) {
      errors.password = 'La contraseña es requerida';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    login(
      { email, password },
      {
        onSuccess: (data) => {
          if (data.user.role === 'SITE_ADMIN' || data.user.role === 'RECEPTIONIST') {
            navigate(from.startsWith('/admin') ? from : '/admin', { replace: true });
          } else {
            navigate(from, { replace: true });
          }
        },
      }
    );
  };

  const isLocked = error?.code === 'ACCOUNT_LOCKED';
  const isInvalidCredentials = error?.code === 'INVALID_CREDENTIALS';

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="shadow-lg border-slate-200">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <Lock className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold">Iniciar Sesión</CardTitle>
          <CardDescription>
            Ingresa tus credenciales para acceder a la plataforma de Coworking
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isLocked && (
              <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Cuenta bloqueada temporalmente</AlertTitle>
                <AlertDescription>
                  Has superado el límite de 5 intentos fallidos consecutivos. Por seguridad, tu cuenta ha
                  sido bloqueada por 15 minutos. Puedes esperar o{' '}
                  <Link to="/forgot-password" className="font-semibold underline hover:text-red-950">
                    restablecer tu contraseña
                  </Link>
                  .
                </AlertDescription>
              </Alert>
            )}

            {isInvalidCredentials && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Credenciales inválidas</AlertTitle>
                <AlertDescription>
                  El correo electrónico o la contraseña ingresados no son correctos.
                </AlertDescription>
              </Alert>
            )}

            {error && !isLocked && !isInvalidCredentials && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1">
              <Label htmlFor="email" required>
                Correo Electrónico
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@coworking.local"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={formErrors.email}
                  disabled={isPending}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" required>
                  Contraseña
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-medium"
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={formErrors.password}
                disabled={isPending}
                autoComplete="current-password"
              />
            </div>

            <Button type="submit" className="w-full mt-2" isLoading={isPending}>
              Ingresar al Sistema
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col space-y-3 border-t border-slate-100 pt-4 text-center">
          <p className="text-sm text-slate-600">
            ¿Aún no tienes una membresía?{' '}
            <Link to="/register" className="font-semibold text-blue-600 hover:underline">
              Registrarse aquí
            </Link>
          </p>

          <div className="w-full rounded-lg bg-slate-50 p-3 text-xs border border-slate-200 text-left space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                Acceso Rápido (Perfiles de Prueba)
              </span>
              <span className="text-[10px] text-slate-400 font-medium">1-clic para rellenar</span>
            </div>
            <div className="grid grid-cols-1 gap-1.5 pt-1">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword(acc.pass);
                    setFormErrors({});
                  }}
                  className="flex items-center justify-between p-2 rounded-md bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors text-left group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-800 text-xs group-hover:text-blue-700">
                        {acc.name}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${acc.badgeColor}`}>
                        {acc.roleLabel}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 truncate block">
                      {acc.email}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-600 shrink-0 bg-slate-100 px-1.5 py-0.5 rounded">
                    {acc.plan}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};
