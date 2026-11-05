import './ui/tokens.css';
import { BridgePlatform } from './platform/BridgePlatform';
import { FakePlatform } from './platform/platform';
import { App } from './app/app';

async function bootstrap(): Promise<void> {
  const uiRoot = document.getElementById('ui-root');
  const canvasContainer = document.getElementById('canvas-container');
  const loadingScreen = document.getElementById('loading-screen');

  if (!uiRoot || !canvasContainer) {
    throw new Error('Required DOM containers (#ui-root, #canvas-container) not found.');
  }

  // Use FakePlatform for e2e test automation if requested
  const isMockParam =
    typeof window !== 'undefined' && window.location.search.includes('mock=platform');

  const platform = isMockParam ? new FakePlatform() : new BridgePlatform();

  const app = new App(platform, uiRoot, canvasContainer, loadingScreen);
  await app.start();
}

window.addEventListener('contextmenu', (e) => e.preventDefault());
window.addEventListener('selectstart', (e) => e.preventDefault());
window.addEventListener('dragstart', (e) => e.preventDefault());

window.addEventListener('DOMContentLoaded', () => {
  bootstrap().catch((err) => {
    console.error('[Bootstrap] Unhandled error during application start:', err);
    const loadingText = document.getElementById('loading-text');
    if (loadingText) {
      loadingText.textContent = 'Something went wrong. Please reload the page.';
    }
  });
});
