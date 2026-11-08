/* Formulario de ingreso: código + contraseña (al inicio, la contraseña es el mismo código). */
import { ROLE_NAME, currentAccount, demoAccounts, homeFor, login, resetDemoPasswords } from './session';

export function wireLogin(): void {
  const form = document.getElementById('login-form') as HTMLFormElement | null;
  if (!form) return;
  const code = form.querySelector<HTMLInputElement>('#codigo')!;
  const pass = form.querySelector<HTMLInputElement>('#clave')!;
  const msg = form.querySelector<HTMLElement>('#login-msg')!;
  const btn = form.querySelector<HTMLButtonElement>('button[type=submit]')!;
  const params = new URLSearchParams(location.search);

  const show = (text: string, kind: 'error' | 'info' = 'error') => {
    msg.textContent = text;
    msg.className = `login-msg ${kind}`;
    msg.hidden = !text;
  };
  if (params.get('salir') === '1') show('Cerraste sesión correctamente.', 'info');
  else if (params.get('next')) show('Inicia sesión para continuar.', 'info');

  // Si ya hay sesión, se ofrece continuar
  const acc = currentAccount();
  const cont = document.getElementById('login-continue');
  if (acc && cont) {
    cont.hidden = false;
    cont.innerHTML = `Ya iniciaste sesión como <b>${acc.name}</b> · <a href="${homeFor(acc.role)}">Continuar</a>`;
  }

  let timer = 0;
  const lock = (secs: number) => {
    btn.disabled = true;
    let left = secs;
    const tick = () => {
      show(`Demasiados intentos. Espera ${left} s para volver a intentar.`);
      if (left-- <= 0) { clearInterval(timer); btn.disabled = false; show(''); }
    };
    tick();
    timer = window.setInterval(tick, 1000);
  };

  [code, pass].forEach((i) => i.addEventListener('input', () => { i.removeAttribute('aria-invalid'); if (!btn.disabled) show(''); }));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const r = login(code.value, pass.value);
    if (r.ok) {
      btn.disabled = true;
      btn.textContent = 'Ingresando…';
      const next = params.get('next');
      const dest = next && /^[a-z-]+\.html(#[\w-]*)?$/.test(next) && (['docente', 'estudiante', 'apoderado'].includes(r.account.role) ? next !== 'admin.html' : true) ? next : homeFor(r.account.role);
      location.href = dest;
      return;
    }
    if (r.reason === 'empty') {
      show('Escribe tu código y tu contraseña.');
      (code.value ? pass : code).setAttribute('aria-invalid', 'true');
      (code.value ? pass : code).focus();
    } else if (r.reason === 'locked') lock(r.wait ?? 60);
    else if (r.reason === 'blocked') show('Tu cuenta está bloqueada. Comunícate con la administración del colegio.');
    else if (r.reason === 'inactive') show('Tu cuenta está desactivada. Si crees que es un error, comunícate con la administración.');
    else {
      show(`Código o contraseña incorrectos. ${r.left === 1 ? 'Te queda 1 intento' : `Te quedan ${r.left} intentos`} antes de esperar un minuto.`);
      pass.value = '';
      pass.setAttribute('aria-invalid', 'true');
      pass.focus();
    }
  });

  // Cuentas de prueba: un toque llena el formulario
  const demo = document.getElementById('demo-accounts');
  if (demo) {
    demo.innerHTML = demoAccounts().map((a) => `<button type="button" class="demo-acc" data-code="${a.code}"><b>${a.code}</b><span>${ROLE_NAME[a.role]}</span></button>`).join('');
    demo.insertAdjacentHTML('afterend', '<button type="button" class="link-btn" id="demo-reset">Restablecer las contraseñas de prueba</button>');
    document.getElementById('demo-reset')?.addEventListener('click', () => { resetDemoPasswords(); clearInterval(timer); btn.disabled = false; show('Listo: la contraseña de cada cuenta de prueba vuelve a ser su código.', 'info'); });
    demo.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-code]');
      if (!b) return;
      code.value = b.dataset.code!;
      pass.value = b.dataset.code!;
      show('');
      btn.focus();
    });
  }
}
