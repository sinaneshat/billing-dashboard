'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib';

type PricingFeature = {
  text: string;
  included: boolean;
  description?: string;
};

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  metadata: unknown; // Database JSON metadata - can be any structure
};

type ShadcnPricingCardProps = {
  product: Product;
  onSelect: (productId: string) => void;
  className?: string;
};

export function ShadcnPricingCard({
  product,
  onSelect,
  className,
}: ShadcnPricingCardProps) {
  const t = useTranslations();
  const metadata = product.metadata as {
    pricing?: {
      usdPrice: number;
      tomanPrice: number;
      rialPrice: number;
      formattedPrice: string;
    };
    popular?: boolean;
    features?: string[];
    tier?: string;
    messagesPerMonth?: number;
    aiModelsLimit?: number;
    conversationsPerMonth?: number;
  } | null;

  const pricing = metadata?.pricing;
  const isPopular = metadata?.popular === true;
  const features = metadata?.features || [];

  // Create feature list with included status
  const featureList: PricingFeature[] = features.map(feature => ({
    text: feature,
    included: true,
  }));

  const handleSelectPlan = () => {
    onSelect(product.id);
  };

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-300 hover:shadow-lg',
        isPopular && 'border-2 border-purple-500 shadow-lg scale-105',
        className,
      )}
    >
      {/* Popular badge */}
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <Badge className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-3 py-1">
            {t('plans.mostPopular')}
          </Badge>
        </div>
      )}

      <CardHeader className="text-center pb-2">
        <CardTitle className="text-xl font-semibold">
          {product.name}
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          {product.description || t('plans.chooseDescription')}
        </CardDescription>

        {/* Pricing Display */}
        <div className="pt-4">
          {pricing?.usdPrice === 0
            ? (
                <div className="space-y-2">
                  <div className="text-4xl font-bold">{t('plans.free')}</div>
                  <div className="text-sm text-muted-foreground">{t('time.forever')}</div>
                </div>
              )
            : (
                <div className="space-y-2">
                  <div className="flex items-baseline justify-center gap-1">
                    <div className="text-4xl font-bold">
                      {pricing?.tomanPrice?.toLocaleString('en-US') || '0'}
                    </div>
                    <div className="text-lg text-muted-foreground">{t('currency.toman')}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t('time.perMonth')}
                    {' '}
                    (
                    {t('currency.dollar')}
                    {pricing?.usdPrice || 0}
                    {' '}
                    {t('currency.usd')}
                    )
                  </div>
                </div>
              )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* CTA Button */}
        <Button
          onClick={handleSelectPlan}
          className={cn(
            'w-full',
            isPopular
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white'
              : '',
          )}
          variant={isPopular ? 'default' : 'outline'}
        >
          {pricing?.usdPrice === 0 ? t('plans.getStartedFree') : t('plans.selectPlan')}
        </Button>

        {/* Features List */}
        {featureList.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-medium">{t('plans.whatsIncluded')}</div>
            <ul className="space-y-2">
              {featureList.map(feature => (
                <li key={feature.text} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">
                    {feature.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Usage Metrics */}
        {(metadata?.messagesPerMonth || metadata?.aiModelsLimit || metadata?.conversationsPerMonth) && (
          <div className="space-y-2 pt-2 border-t">
            <div className="text-sm font-medium">{t('plans.usageLimits')}</div>
            <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground">
              {metadata?.messagesPerMonth && (
                <div>
                  •
                  {' '}
                  {metadata.messagesPerMonth.toLocaleString()}
                  {' '}
                  {t('plans.messagesMonth')}
                </div>
              )}
              {metadata?.aiModelsLimit && (
                <div>
                  •
                  {' '}
                  {t('plans.upToModels', { count: metadata.aiModelsLimit })}
                </div>
              )}
              {metadata?.conversationsPerMonth && (
                <div>
                  •
                  {' '}
                  {metadata.conversationsPerMonth}
                  {' '}
                  {t('plans.conversationsMonth')}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
