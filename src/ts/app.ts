/* Punto de entrada común a todas las páginas de la intranet. */
import { ico, injectSprite } from './core/icons';
import { mountShell } from './core/shell';
import { wireLogin } from './core/login';

declare global {
  interface Window { EFicon: typeof ico; }
}

injectSprite();
mountShell();
wireLogin();
window.EFicon = ico;
