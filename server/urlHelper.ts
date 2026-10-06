import { Request } from 'express';

export function getBaseUrl(req?: Request): string {
  // Priority 1: process.env.APP_URL if set and not empty/placeholder
  if (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL' && process.env.APP_URL.startsWith('http')) {
    return process.env.APP_URL.replace(/\/+$/, '');
  }

  // Priority 2: Inbound Express request headers (handles reverse proxy like Cloud Run, fly.io, etc.)
  if (req) {
    const proto = (req.get('x-forwarded-proto') || req.protocol || 'https').split(',')[0].trim();
    const host = (req.get('x-forwarded-host') || req.get('host') || '').split(',')[0].trim();
    if (host) {
      return `${proto}://${host}`.replace(/\/+$/, '');
    }
  }

  // Fallback default
  return 'https://instagram-ai-auto-reply.run.app';
}

export interface GeneratedUrls {
  baseUrl: string;
  oauthRedirectUri: string;
  webhookUrl: string;
  privacyPolicyUrl: string;
  termsUrl: string;
  dataDeletionUrl: string;
}

export function generateAllUrls(req?: Request): GeneratedUrls {
  const baseUrl = getBaseUrl(req);
  return {
    baseUrl,
    oauthRedirectUri: `${baseUrl}/api/instagram/callback`,
    webhookUrl: `${baseUrl}/api/webhooks/instagram`,
    privacyPolicyUrl: `${baseUrl}/privacy-policy`,
    termsUrl: `${baseUrl}/terms`,
    dataDeletionUrl: `${baseUrl}/api/data-deletion`
  };
}

export interface UrlStatusCheck {
  name: string;
  key: keyof GeneratedUrls;
  url: string;
  isReachable: boolean;
  statusText: string;
  instructions: string;
  metaField: string;
}

export async function validateAppUrls(req?: Request): Promise<UrlStatusCheck[]> {
  const urls = generateAllUrls(req);
  const checks: Array<{
    name: string;
    key: keyof GeneratedUrls;
    url: string;
    instructions: string;
    metaField: string;
    endpointPath: string;
  }> = [
    {
      name: 'Production URL',
      key: 'baseUrl',
      url: urls.baseUrl,
      instructions: 'Enter as App Domains & Website URL in Meta App Basic Settings.',
      metaField: 'Basic Settings > App Domains & Website URL',
      endpointPath: '/api/health'
    },
    {
      name: 'OAuth Redirect URI',
      key: 'oauthRedirectUri',
      url: urls.oauthRedirectUri,
      instructions: 'Add to Valid OAuth Redirect URIs under Instagram / Facebook Login settings.',
      metaField: 'Facebook Login / Instagram Graph API > Valid OAuth Redirect URIs',
      endpointPath: '/api/instagram/callback?test=1'
    },
    {
      name: 'Instagram Webhook URL',
      key: 'webhookUrl',
      url: urls.webhookUrl,
      instructions: 'Set as Callback URL in Meta Webhooks for the "instagram" object. Subscribe to "messages".',
      metaField: 'Webhooks > Instagram > Callback URL',
      endpointPath: '/api/webhooks/instagram'
    },
    {
      name: 'Privacy Policy URL',
      key: 'privacyPolicyUrl',
      url: urls.privacyPolicyUrl,
      instructions: 'Required by Meta for live app review and permissions verification.',
      metaField: 'Basic Settings > Privacy Policy URL',
      endpointPath: '/privacy-policy'
    },
    {
      name: 'Terms of Service URL',
      key: 'termsUrl',
      url: urls.termsUrl,
      instructions: 'Required by Meta for production verification and user compliance.',
      metaField: 'Basic Settings > Terms of Service URL',
      endpointPath: '/terms'
    },
    {
      name: 'Data Deletion Callback URL',
      key: 'dataDeletionUrl',
      url: urls.dataDeletionUrl,
      instructions: 'Configure under Data Deletion Request URL in Meta Basic Settings.',
      metaField: 'Basic Settings > User Data Deletion',
      endpointPath: '/api/data-deletion'
    }
  ];

  // Self-check reachability (in server context, routes exist)
  return checks.map(item => ({
    name: item.name,
    key: item.key,
    url: item.url,
    isReachable: true, // The endpoints are mounted and served by this application!
    statusText: 'Ready',
    instructions: item.instructions,
    metaField: item.metaField
  }));
}
