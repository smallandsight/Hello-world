import { SetMetadata } from '@nestjs/common';

export const THROTTLE_KEY = '__throttle__';

export interface ThrottleOptions {
  windowMs?: number;
  limit?: number;
  keyPrefix?: string;
}

const DEFAULT_OPTIONS: ThrottleOptions = {
  windowMs: 60000,
  limit: 100,
  keyPrefix: 'throttle',
};

export const THROTTLE_PRESETS: Record<string, ThrottleOptions> = {
  global: { windowMs: 60_000, limit: 100 },
  user: { windowMs: 60_000, limit: 30 },
  login: { windowMs: 900_000, limit: 5 },
  sms: { windowMs: 60_000, limit: 1 },
  sensitive: { windowMs: 300_000, limit: 5 },
};

export function Throttle(optionsOrKey?: string | ThrottleOptions) {
  let optionsObj: ThrottleOptions;

  if (typeof optionsOrKey === 'string') {
    const preset = THROTTLE_PRESETS[optionsOrKey];
    if (!preset) throw new Error(`Unknown throttle preset: ${optionsOrKey}`);
    optionsObj = preset;
  } else if (typeof optionsOrKey === 'object') {
    optionsObj = optionsOrKey;
  } else {
    optionsObj = DEFAULT_OPTIONS;
  }

  return SetMetadata(THROTTLE_KEY, [JSON.stringify(optionsObj)]);
}
