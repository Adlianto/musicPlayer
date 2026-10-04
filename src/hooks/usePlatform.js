import { useMemo } from 'react';
import { getPlatformCapabilities } from '../services/platform/platformCapabilities.js';

/**
 * usePlatform.js
 * Hook untuk mengevaluasi kapabilitas dan identitas runtime platform aktif.
 */
export function usePlatform() {
  const capabilities = useMemo(() => {
    return getPlatformCapabilities();
  }, []);

  return {
    ...capabilities,
    isWeb: capabilities.platform === 'web',
    isTauri: capabilities.platform === 'tauri',
    isAndroid: capabilities.platform === 'android',
  };
}
