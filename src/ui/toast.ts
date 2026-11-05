/**
 * Lightweight Toast notification system.
 */

let container: HTMLElement | null = null;

function getContainer(): HTMLElement {
  if (!container || !container.isConnected) {
    container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      const uiRoot = document.getElementById('ui-root') || document.body;
      uiRoot.appendChild(container);
    }
  }
  return container;
}

export function showToast(
  message: string,
  type: 'info' | 'error' | 'success' = 'info',
  durationMs = 1600,
): void {
  const root = getContainer();
  while (root.firstChild) {
    root.firstChild.remove();
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'toast-error' : type === 'success' ? 'toast-success' : ''}`;
  toast.textContent = message;
  root.appendChild(toast);

  setTimeout(() => {
    if (!toast.isConnected) return;
    toast.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(6px)';
    setTimeout(() => {
      toast.remove();
    }, 210);
  }, durationMs);
}
