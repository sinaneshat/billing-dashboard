'use client';

import { Check, CreditCard, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/ui/cn';

import { GlowingEffect } from './glowing-effect';
import { HoverBorderGradient } from './hover-border-gradient';

interface PricingCardProps {
  name: string;
  description?: string | null;
  price: {
    amount: number;
    currency: string;
    interval: 'month' | 'year';
    trialDays?: number | null;
  };
  features?: string[] | null;
  isCurrentPlan?: boolean;
  isMostPopular?: boolean;
  isProcessing?: boolean;
  onSubscribe?: () => void;
  onManageBilling?: () => void;
  className?: string;
  delay?: number;
  annualSavingsPercent?: number;
}

export function PricingCard({
  name,
  description,
  price,
  features,
  isCurrentPlan = false,
  isMostPopular = false,
  isProcessing = false,
  onSubscribe,
  onManageBilling,
  className,
  delay = 0,
  annualSavingsPercent,
}: PricingCardProps) {
  const t = useTranslations('pricing.card');

  const handleAction = () => {
    if (isCurrentPlan && onManageBilling) {
      onManageBilling();
    }
    else if (!isCurrentPlan && onSubscribe) {
      onSubscribe();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={cn('relative h-full', className)}
    >
      {/* Most Popular Badge - Outside card container for proper z-index */}
      {isMostPopular && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay + 0.2, duration: 0.3 }}
          className="absolute -top-3 left-1/2 z-20 -translate-x-1/2"
        >
          <div className="whitespace-nowrap rounded-full bg-gradient-to-r from-primary to-primary/80 px-3 py-1 text-xs font-medium text-primary-foreground shadow-lg">
            {t('mostPopular')}
          </div>
        </motion.div>
      )}

      {/* Current Plan Badge - Outside card container for proper z-index */}
      {isCurrentPlan && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: delay + 0.2, duration: 0.3 }}
          className="absolute -top-3 left-1/2 z-20 -translate-x-1/2"
        >
          <div className="flex items-center gap-1.5 whitespace-nowrap rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground shadow-lg">
            <CreditCard className="size-3" />
            {t('currentPlan')}
          </div>
        </motion.div>
      )}

      <div className="relative h-full rounded-2xl border p-2 md:rounded-3xl md:p-3">
        <GlowingEffect
          blur={0}
          borderWidth={2}
          spread={80}
          glow={isMostPopular}
          disabled={false}
          proximity={64}
          inactiveZone={0.01}
        />

        <div className="border-0.75 relative flex h-full flex-col overflow-hidden rounded-xl bg-background p-6 dark:shadow-[0px_0px_27px_0px_#2D2D2D]">

          {/* Card Content */}
          <div className="relative flex flex-1 flex-col gap-6">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: delay + 0.1, duration: 0.4 }}
              className="space-y-2"
            >
              <h3 className="text-2xl font-semibold tracking-tight">
                {name}
              </h3>
              {description && (
                <p className="text-sm text-muted-foreground">
                  {description}
                </p>
              )}
            </motion.div>

            {/* Pricing */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: delay + 0.2, duration: 0.4 }}
              className="space-y-2"
            >
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight">
                  {price.currency.toUpperCase()}
                  {' '}
                  {(price.amount / 100).toFixed(2)}
                </span>
                <span className="text-sm text-muted-foreground">
                  /
                  {price.interval}
                </span>
              </div>

              {/* Trial Period Badge */}
              {price.trialDays && price.trialDays > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: delay + 0.25, duration: 0.3 }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-600 dark:text-green-400"
                >
                  <svg
                    className="size-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {price.trialDays}
                  {' '}
                  {t('daysFreeTrial')}
                </motion.div>
              )}

              {/* Annual Savings Badge */}
              {annualSavingsPercent && annualSavingsPercent > 0 && price.interval === 'year' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: delay + 0.3, duration: 0.3 }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                >
                  <svg
                    className="size-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {t('saveAnnually', { percent: annualSavingsPercent })}
                </motion.div>
              )}
            </motion.div>

            {/* Features */}
            {features && features.length > 0 && (
              <motion.ul
                initial="hidden"
                animate="show"
                variants={{
                  hidden: { opacity: 0 },
                  show: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.05,
                      delayChildren: delay + 0.3,
                    },
                  },
                }}
                className="flex-1 space-y-3"
              >
                {features.map((feature, idx) => (
                  <motion.li
                    key={idx}
                    variants={{
                      hidden: { opacity: 0, x: -10 },
                      show: { opacity: 1, x: 0 },
                    }}
                    transition={{
                      type: 'spring',
                      stiffness: 500,
                      damping: 40,
                    }}
                    className="flex items-start gap-3"
                  >
                    <div className="mt-0.5 rounded-full bg-primary/10 p-1">
                      <Check className="size-3.5 text-primary" />
                    </div>
                    <span className="flex-1 text-sm text-muted-foreground">
                      {feature}
                    </span>
                  </motion.li>
                ))}
              </motion.ul>
            )}

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: delay + 0.4, duration: 0.4 }}
            >
              <HoverBorderGradient
                as="button"
                containerClassName={cn(
                  'w-full rounded-md',
                  isProcessing && 'cursor-not-allowed opacity-50',
                )}
                className={cn(
                  'w-full text-center text-sm font-medium transition-all duration-200',
                  isMostPopular && 'bg-primary text-primary-foreground',
                  isCurrentPlan && 'bg-muted/50 text-muted-foreground',
                  !isMostPopular && !isCurrentPlan && 'bg-background text-foreground',
                )}
                onClick={handleAction}
                disabled={isProcessing}
              >
                {isProcessing
                  ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('loading', { ns: 'common' })}
                      </span>
                    )
                  : isCurrentPlan
                    ? (
                        t('manageBilling')
                      )
                    : (
                        t('subscribe')
                      )}
              </HoverBorderGradient>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
