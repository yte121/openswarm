/**
 * Claude-Flow UI Module
 * Provides compatible UI solutions for different terminal environments
 */

export {
  CompatibleUI,
  createCompatibleUI,
  isRawModeSupported,
  launchUI,
  type UIProcess,
  type UISystemStats,
} from './compatible-ui.js';

export {
  handleRawModeError,
  withRawModeFallback,
  checkUISupport,
  showUISupport,
  type FallbackOptions,
} from './fallback-handler.js';

/**
 * Main UI launcher that automatically selects the best available UI
 */
export async function launchBestUI(): Promise<void> {
  const fallbackHandler = await import('./fallback-handler.js');
  const { checkUISupport, handleRawModeError } = fallbackHandler;
  const launchUI = (fallbackHandler as any).launchUI;
  const support = checkUISupport();

  if (support.supported) {
    try {
      await launchUI();
    } catch (error) {
      if (error instanceof Error) {
        await handleRawModeError(error, {
          enableUI: true,
          fallbackMessage: 'Falling back to compatible UI mode',
          showHelp: true,
        });
      }
    }
  } else {
    const { launchUI: launchCompatibleUI } = await import('./compatible-ui.js');
    console.log('🔄 Using compatible UI mode for this environment');
    await launchCompatibleUI();
  }
}
