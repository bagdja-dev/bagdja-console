import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateCurl(url: string, options: {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}) {
  const { method = 'GET', headers = {}, body } = options;
  let curl = `curl -X ${method.toUpperCase()} '${url}'`;

  Object.entries(headers).forEach(([key, value]) => {
    curl += ` \\\n  -H '${key}: ${value}'`;
  });

  if (body) {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
    // Escape single quotes in body for shell
    const escapedBody = bodyStr.replace(/'/g, "'\\''");
    curl += ` \\\n  -d '${escapedBody}'`;
  }

  return curl;
}

