import type { z } from 'zod';

import { generateApplePass, generateDownloadUrl, generateGooglePass, generateQRCode } from '@/api/services/pass-generation';
import type { R2Metadata, R2StorageService } from '@/api/services/r2-storage';
import type { ApiEnv } from '@/api/types';
import type { selectPassSchema, selectPassTemplateSchema } from '@/db/validation/passes';

type Pass = z.infer<typeof selectPassSchema>;
type PassTemplate = z.infer<typeof selectPassTemplateSchema>;

// Strategy pattern for pass generation - consolidates duplicate logic
export type PassGenerationResult = {
  passId: string;
  fileType: string;
  platform: string;
  storageKey: string;
  bucketName: string;
  fileSize: number;
  mimeType: string;
  downloadUrl: string;
};

abstract class PassGenerationStrategy {
  constructor(protected storage: R2StorageService, protected env: ApiEnv['Bindings']) {}

  abstract generate(pass: Pass, template: PassTemplate): Promise<PassGenerationResult | null>;

  protected createStorageKey(pass: Pass, platform: string, extension: string): string {
    return `passes/${pass.organizationId}/${pass.id}/${platform}.${extension}`;
  }

  protected createMetadata(pass: Pass, type: string): R2Metadata {
    return {
      organizationId: pass.organizationId!,
      purpose: 'pass',
      type,
      uploadedAt: new Date().toISOString(),
    };
  }
}

class ApplePassStrategy extends PassGenerationStrategy {
  async generate(pass: Pass, template: PassTemplate): Promise<PassGenerationResult | null> {
    const passData = await generateApplePass(pass, template, this.env);
    if (!passData || !pass.id)
      return null;

    const storageKey = this.createStorageKey(pass, 'apple', 'pkpass');
    await this.storage.putObject(storageKey, passData, {
      contentType: 'application/vnd.apple.pkpass',
      metadata: this.createMetadata(pass, 'apple'),
    });

    return {
      passId: pass.id,
      fileType: 'pkpass',
      platform: 'apple',
      storageKey,
      bucketName: 'passes',
      fileSize: passData.byteLength,
      mimeType: 'application/vnd.apple.pkpass',
      downloadUrl: generateDownloadUrl(pass.id, 'apple', pass.authenticationToken, this.env),
    };
  }
}

class GooglePassStrategy extends PassGenerationStrategy {
  async generate(pass: Pass, template: PassTemplate): Promise<PassGenerationResult | null> {
    const passJwt = await generateGooglePass(pass, template, this.env);
    if (!passJwt || !pass.id)
      return null;

    const storageKey = this.createStorageKey(pass, 'google', 'jwt');
    const encoder = new TextEncoder();
    const passBuffer = encoder.encode(passJwt).buffer as ArrayBuffer;

    await this.storage.putObject(storageKey, passBuffer, {
      contentType: 'application/jwt',
      metadata: this.createMetadata(pass, 'google'),
    });

    return {
      passId: pass.id,
      fileType: 'google_pay_jwt',
      platform: 'google',
      storageKey,
      bucketName: 'passes',
      fileSize: passJwt.length,
      mimeType: 'application/jwt',
      downloadUrl: generateDownloadUrl(pass.id, 'google', pass.authenticationToken, this.env),
    };
  }
}

class QRCodeStrategy extends PassGenerationStrategy {
  async generate(pass: Pass, _template: PassTemplate): Promise<PassGenerationResult | null> {
    const qrData = await generateQRCode(pass, this.env);
    if (!qrData || !pass.id)
      return null;

    const storageKey = this.createStorageKey(pass, 'qr', 'png');
    await this.storage.putObject(storageKey, qrData, {
      contentType: 'image/png',
      metadata: this.createMetadata(pass, 'generic'),
    });

    return {
      passId: pass.id,
      fileType: 'qr_code',
      platform: 'generic',
      storageKey,
      bucketName: 'passes',
      fileSize: qrData.byteLength,
      mimeType: 'image/png',
      downloadUrl: generateDownloadUrl(pass.id, 'generic', pass.authenticationToken, this.env),
    };
  }
}

// Factory for pass generation strategies
export class PassGenerationFactory {
  private strategies: Map<string, PassGenerationStrategy> = new Map();

  constructor(storage: R2StorageService, env: ApiEnv['Bindings']) {
    this.strategies.set('apple', new ApplePassStrategy(storage, env));
    this.strategies.set('google', new GooglePassStrategy(storage, env));
    this.strategies.set('qr', new QRCodeStrategy(storage, env));
  }

  async generateAll(pass: Pass, template: PassTemplate): Promise<PassGenerationResult[]> {
    // Validate inputs
    if (!pass || !pass.id) {
      throw new Error('Invalid pass object - missing id');
    }

    if (!template) {
      throw new Error('Invalid template object');
    }

    const results = await Promise.allSettled(
      Array.from(this.strategies.values()).map(strategy => strategy.generate(pass, template)),
    );

    const successfulResults = results
      .filter((result): result is PromiseFulfilledResult<PassGenerationResult | null> =>
        result.status === 'fulfilled' && result.value !== null,
      )
      .map(result => result.value as PassGenerationResult);

    // Log any failures for debugging
    const failures = results
      .filter(result => result.status === 'rejected' || (result.status === 'fulfilled' && result.value === null));

    if (failures.length > 0) {
      console.warn('Some pass generation strategies failed:', {
        passId: pass.id,
        failureCount: failures.length,
        successCount: successfulResults.length,
        failures: failures.map(f => f.status === 'rejected' ? f.reason : 'returned null'),
      });
    }

    return successfulResults;
  }

  async generatePlatform(platform: string, pass: Pass, template: PassTemplate): Promise<PassGenerationResult | null> {
    const strategy = this.strategies.get(platform);
    return strategy ? await strategy.generate(pass, template) : null;
  }
}
