/* Punto de entrada común a todas las páginas de la intranet. */
import { ico, injectSprite } from './core/icons';
import { mountShell } from './core/shell';

declare global {
  interface Window { EFicon: typeof ico; }
}

injectSprite();
mountShell();
window.EFicon = ico;
