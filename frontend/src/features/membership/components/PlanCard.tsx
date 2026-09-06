import React from 'react';
import { MembershipPlan, PlanTier } from '../types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Check, Zap, Sparkles, Shield } from 'lucide-react';
import { cn } from '@/shared/utils/cn';

interface PlanCardProps {
  plan: MembershipPlan;
  currentPlanId?: PlanTier;
  onSelectPlan: (plan: MembershipPlan) => void;
}

export const PlanCard: React.FC<PlanCardProps> = ({
  plan,
  currentPlanId,
  onSelectPlan,
}) => {
  const isCurrent = currentPlanId === plan.id;

  return (
    <Card
      className={cn(
        'relative flex flex-col justify-between transition-all duration-200',
        plan.isPopular && 'border-blue-500 shadow-md ring-1 ring-blue-500',
        isCurrent && 'border-emerald-500 bg-emerald-50/20 ring-1 ring-emerald-500'
      )}
    >
      {plan.isPopular && !isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-xs font-semibold text-white shadow-sm flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          Más Popular
        </div>
      )}

      {isCurrent && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-semibold text-white shadow-sm flex items-center gap-1">
          <Shield className="h-3 w-3" />
          Tu Plan Activo
        </div>
      )}

      <div>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-bold text-slate-900">{plan.name}</CardTitle>
            <div className="rounded-lg bg-blue-50 p-2 text-blue-700">
              <Zap className="h-5 w-5" />
            </div>
          </div>
          <CardDescription className="text-xs text-slate-600 mt-1">
            {plan.description}
          </CardDescription>

          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-slate-900">
              ${plan.pricePerMonth}
            </span>
            <span className="text-sm font-medium text-slate-500">/ mes</span>
          </div>

          <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 border border-amber-200">
            <span>🪙 {plan.monthlyCredits} créditos mensuales</span>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="border-t border-slate-100 pt-4 space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Beneficios incluidos:
            </p>
            <ul className="space-y-2">
              {plan.features.map((feat, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                  <Check className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </div>

      <div className="p-6 pt-0 mt-4">
        {isCurrent ? (
          <Button
            variant="outline"
            className="w-full border-emerald-300 text-emerald-800 bg-emerald-50 cursor-default hover:bg-emerald-50"
            disabled
          >
            Plan Actual
          </Button>
        ) : (
          <Button
            variant={plan.isPopular ? 'default' : 'outline'}
            className="w-full"
            onClick={() => onSelectPlan(plan)}
          >
            Cambiar a {plan.name}
          </Button>
        )}
      </div>
    </Card>
  );
};
