// Nedtrekksmenyer i toppfeltet (Fil, Rediger, Vis, Hjelp).
import { h } from './dom.js';

/**
 * @param menus [{ label, items: [{ label, shortcut, action } | '-'] }]
 */
export function buildMenus(root, menus) {
  let open = null;
  const closeAll = () => {
    open?.classList.remove('open');
    open?.querySelector('.menu-list')?.setAttribute('hidden', '');
    open = null;
  };

  for (const menu of menus) {
    const list = h(
      'div',
      { class: 'menu-list', role: 'menu', hidden: true },
      menu.items.map((item) =>
        item === '-'
          ? h('hr')
          : h(
              'button',
              {
                type: 'button',
                role: 'menuitem',
                onclick: () => {
                  closeAll();
                  item.action();
                },
              },
              h('span', { text: item.label }),
              item.shortcut ? h('kbd', { text: item.shortcut }) : null,
            ),
      ),
    );
    const wrap = h(
      'div',
      { class: 'menu' },
      h('button', {
        type: 'button',
        'aria-haspopup': 'true',
        text: `${menu.label} ▾`,
        onclick: (e) => {
          e.stopPropagation();
          const was = open === wrap;
          closeAll();
          if (!was) {
            open = wrap;
            wrap.classList.add('open');
            list.removeAttribute('hidden');
          }
        },
        onmouseenter: () => {
          if (open && open !== wrap) {
            closeAll();
            open = wrap;
            wrap.classList.add('open');
            list.removeAttribute('hidden');
          }
        },
      }),
      list,
    );
    root.append(wrap);
  }

  document.addEventListener('click', (e) => {
    if (open && !open.contains(e.target)) closeAll();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAll();
  });
}
