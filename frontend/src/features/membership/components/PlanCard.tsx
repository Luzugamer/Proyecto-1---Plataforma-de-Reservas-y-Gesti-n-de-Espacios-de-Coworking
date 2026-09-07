import React from 'react';
import { MembershipPlan } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card';

export const PlanCard: React.FC<{ plan: MembershipPlan }> = ({ plan }) => (
  <Card className="border-slate-200 shadow-sm">
    <CardHeader>
      <CardTitle>{plan.name}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      <p className="text-3xl font-black text-slate-900">
        {plan.currency} {plan.price.toFixed(2)}
        <span className="text-sm font-medium text-slate-500"> / mes</span>
      </p>
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
        {plan.monthlyCredits} créditos por ciclo
      </p>
      <p className="text-xs text-slate-500">Los créditos no usados caducan al terminar el ciclo.</p>
    </CardContent>
  </Card>
);
