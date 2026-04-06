import { MethodMetaData } from '@nestjs/common';
import { THROTTLE_PRESETS, type ThrottleOptions } from './throttle.guard';

/**
 * 限流装饰器
 * 使用方式：@Throttle({ windowMs: 60000, limit: 100 })
 *
 * 也支持预设策略：@Throttle('login') 等价于 @Throttle({ windowMs: 900000, limit: 5 })
 */
export function Throttle(optionsOrKey?: string | ThrottleOptions) {
  let optionsObj: ThrottleOptions;

  if (typeof optionsOrKey === 'string') {
    const preset = THROTTLE_PRESETS[optionsOrKey];
    if (!preset) throw new Error(`未知限流策略: ${optionsOrKey}`);
    optionsObj = preset;
  } else if (typeof optionsOrKey === 'object') {
    optionsObj = optionsOrKey;
  } else {
    optionsObj = DEFAULT_OPTIONS;
  }

  return (target: object, key: string, descriptor: PropertyDescriptor) => {
    MethodMetaData(METADATA_KEY, [JSON.stringify(optionsObj)])(target, key, descriptor);
  };
}
