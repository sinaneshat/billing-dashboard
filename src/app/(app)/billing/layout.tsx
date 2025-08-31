'use client';

import type React from 'react';

import { PaymentHistory } from '@/components/billing/payment-history';
import { PaymentMethods } from '@/components/billing/payment-methods';
import { SubscriptionManagement } from '@/components/billing/subscription-management';
import { PageHeader } from '@/components/dashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type BillingLayoutProps = {
  children: React.ReactNode;
};

export default function BillingLayout({ children }: BillingLayoutProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & Subscriptions"
        description="Manage your subscriptions, payment methods, and billing history"
      />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="methods">Payment Methods</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {children}
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-6">
          <SubscriptionManagement />
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <PaymentHistory />
        </TabsContent>

        <TabsContent value="methods" className="space-y-6">
          <PaymentMethods />
        </TabsContent>
      </Tabs>
    </div>
  );
}
