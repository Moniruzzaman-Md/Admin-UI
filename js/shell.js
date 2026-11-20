/* Renders the shared admin header + sidebar — a copy of the live portal's frame, including
   the collapse (72px icon strip with flyouts), hover states and the header dropdowns.
   Page markup: <body data-page="hotel-apis"> <main class="shell-main">...</main> <script src="js/shell.js"></script> */
(function () {
  // Font Awesome 5 (the portal uses FA5 solid icons)
  if (!document.querySelector('link[data-fa]')) {
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.dataset.fa = '';
    l.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css';
    document.head.appendChild(l);
  }

  // Only screens we've redesigned appear here. Labels/icons match the live portal's sidebar.
  // When a new screen is redesigned, add its group (if new) and its entry.
  const MENU = [
    { label: 'Hotel Management', icon: 'users', items: [
      { label: 'Api List', icon: 'list-alt', page: 'hotel-apis', href: 'hotel-apis.html' },
      { label: 'Markup', icon: 'sliders-h', page: 'markup-commission', href: 'markup-commission.html' },
    ] },
    { label: 'Logs', icon: 'user-lock', items: [
      { label: 'Hotel', icon: 'address-book', page: 'hotel-logs', href: 'hotel-logs.html' },
      { label: 'Hotel Api', icon: 'address-book', page: 'hotel-api-logs', href: 'hotel-api-logs.html' },
    ] },
  ];

  const current = document.body.dataset.page;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ico = name => `<span class="side-ico"><i class="fas fa-${name}"></i></span>`;

  // expanded accordion
  const fullList = MENU.map(g => {
    const open = g.items.some(i => i.page === current);
    const body = g.items.map(i =>
      `<li><a class="side-sub${i.page === current ? ' current' : ''}" href="${i.href}"${i.page === current ? ' aria-current="page"' : ''}>${ico(i.icon)}${esc(i.label)}</a></li>`).join('');
    return `<li class="side-acc${open ? ' open' : ''}">
      <button type="button" class="side-acc-btn" aria-expanded="${open}">${ico(g.icon)}<span>${esc(g.label)}</span></button>
      <ul class="side-acc-body">${body}</ul></li>`;
  }).join('');

  // slim strip: icon buttons, each with a flyout
  const slimList = MENU.map((g, n) => `<li class="slim-group">
      <button type="button" class="slim-btn${g.items.some(i => i.page === current) ? ' current' : ''}" data-flyout="fly-${n}" aria-expanded="false" aria-label="${esc(g.label)}"><i class="fas fa-${g.icon}"></i></button>
      <ul class="slim-flyout" id="fly-${n}">${g.items.map(i =>
        `<li><a class="slim-submenu-item${i.page === current ? ' current' : ''}" href="${i.href}"${i.page === current ? ' aria-current="page"' : ''}>${ico(i.icon)}${esc(i.label)}</a></li>`).join('')}</ul></li>`).join('');

  const header = `<nav class="shell-header">
      <a class="shell-logo" href="index.html"><img src="assets/mynztrip_logo_white.png" alt="mynztrip.com"></a>
      <div class="shell-nav-btns">
        <button type="button" class="nav-icon-btn sidebar-toggle" aria-label="Toggle menu"><i class="fas fa-angle-double-left"></i></button>
        <a class="nav-icon-btn" aria-label="Messages"><i class="fas fa-comment text-danger"></i></a>
      </div>
      <div class="shell-search-col">
        <form class="search-box" onsubmit="return false">
          <i class="fas fa-search search-icon"></i>
          <input type="text" placeholder="Booking ID, PNR, Ticket No..." aria-label="Global search">
          <div class="search-dd">
            <button type="button" class="search-btn" aria-haspopup="true" aria-expanded="false"><i class="fas fa-search"></i><span>Search</span></button>
            <ul class="dd-menu" role="menu">
              <li><button type="button" class="dd-item" role="menuitem">Flight</button></li>
              <li><button type="button" class="dd-item" role="menuitem">Hotel</button></li>
              <li><button type="button" class="dd-item" role="menuitem">Bus</button></li>
            </ul>
          </div>
        </form>
      </div>
      <div class="shell-user">
        <button type="button" class="notification-btn" aria-label="Notifications" title="Opens All Notifications in the portal (not in prototype)"><i class="fas fa-bell"></i></button>
        <img class="avatar-image" src="assets/profile-photo.png" alt="Profile" tabindex="0" role="button" aria-haspopup="true" aria-expanded="false">
        <div class="profile-dropdown" role="menu">
          <button type="button" role="menuitem">My Profile</button>
          <button type="button" role="menuitem">Change Password</button>
          <div class="dd-divider"></div>
          <button type="button" role="menuitem" class="text-danger">Logout</button>
        </div>
      </div>
    </nav>`;

  const sidebar = `<div class="shell-sidebar" aria-label="Main menu">
      <ul class="full-list">${fullList}</ul>
      <ul class="slim-list">${slimList}</ul></div>`;

  const main = document.querySelector('.shell-main');
  document.body.insertAdjacentHTML('afterbegin', header + `<div class="shell-row">${sidebar}<div class="shell-content"></div></div>`);
  if (main) document.querySelector('.shell-content').appendChild(main);

  /* ---------- behaviour ---------- */
  const $ = s => document.querySelector(s);
  const closeAll = except => {
    document.querySelectorAll('.dd-menu.show, .profile-dropdown.show, .slim-flyout.show').forEach(m => { if (m !== except) m.classList.remove('show'); });
    document.querySelectorAll('[aria-expanded="true"].search-btn, [aria-expanded="true"].avatar-image, .slim-btn.show').forEach(b => {
      if (!except || !b.parentElement.contains(except)) { b.setAttribute('aria-expanded', 'false'); b.classList.remove('show'); }
    });
  };
  const toggleMenu = (btn, menu) => {
    const open = !menu.classList.contains('show');
    closeAll(menu);
    menu.classList.toggle('show', open);
    btn.setAttribute('aria-expanded', open);
    return open;
  };

  // accordion
  document.querySelectorAll('.side-acc-btn').forEach(b => b.addEventListener('click', () => {
    const li = b.parentElement; li.classList.toggle('open'); b.setAttribute('aria-expanded', li.classList.contains('open'));
  }));

  // collapse to the 72px strip (toggle icon rotates 180°)
  $('.sidebar-toggle').addEventListener('click', e => {
    const slim = document.body.classList.toggle('sidebar-slim');
    e.currentTarget.classList.toggle('is-slim', slim);
    closeAll();
  });

  // slim flyouts open to the right of their button (placement: right-start)
  document.querySelectorAll('.slim-btn').forEach(b => b.addEventListener('click', e => {
    e.stopPropagation();
    const fly = document.getElementById(b.dataset.flyout);
    const open = toggleMenu(b, fly);
    b.classList.toggle('show', open);
    if (open) { const r = b.getBoundingClientRect(); fly.style.left = (r.right + 2) + 'px'; fly.style.top = r.top + 'px'; }
  }));

  // header dropdowns
  const sBtn = $('.search-btn'), sMenu = $('.dd-menu');
  sBtn.addEventListener('click', e => { e.stopPropagation(); toggleMenu(sBtn, sMenu); });
  sMenu.addEventListener('click', e => { if (e.target.closest('.dd-item')) closeAll(); });

  const av = $('.avatar-image'), pMenu = $('.profile-dropdown');
  av.addEventListener('click', e => { e.stopPropagation(); toggleMenu(av, pMenu); });
  av.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); av.click(); } });
  pMenu.addEventListener('click', e => { if (e.target.closest('button')) closeAll(); });

  document.addEventListener('click', e => { if (!e.target.closest('.dd-menu, .profile-dropdown, .slim-flyout')) closeAll(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });
  $('.shell-sidebar').addEventListener('scroll', () => closeAll());
})();
