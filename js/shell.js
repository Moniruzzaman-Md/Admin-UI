/* Renders the shared admin header + sidebar — a copy of the live portal's frame.
   Page markup: <body data-page="hotel-apis"> <main class="shell-main">...</main> <script src="js/shell.js"></script>
   To link a redesigned screen, set `page` on its sidebar entry below. */
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
    ] },
  ];

  const current = document.body.dataset.page;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ico = name => `<span class="side-ico"><i class="fas fa-${name}"></i></span>`;

  const groups = MENU.map(g => {
    const open = g.items.some(i => i.page === current);
    const body = g.items.map(i =>
      `<li><a class="side-menu-hover side-sub${i.page === current ? ' current' : ''}" href="${i.href}">${ico(i.icon)}${esc(i.label)}</a></li>`
    ).join('');
    return `<li class="side-acc${open ? ' open' : ''}">
      <button type="button" class="side-acc-btn" aria-expanded="${open}">${ico(g.icon)}<span>${esc(g.label)}${g.badge ? `&nbsp;&nbsp;<span class="badge">${g.badge}</span>` : ''}</span></button>
      <ul class="side-acc-body">${body}</ul></li>`;
  }).join('');

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
          <button type="button" class="search-btn"><i class="fas fa-search"></i><span>Search</span></button>
        </form>
      </div>
      <div class="shell-user">
        <button type="button" class="notification-btn" aria-label="Notifications"><i class="fas fa-bell"></i></button>
        <img class="avatar-image" src="assets/profile_icon.png" alt="Profile">
      </div>
    </nav>`;

  const sidebar = `<div class="shell-sidebar" aria-label="Main menu"><ul>
      ${groups}</ul></div>`;

  const main = document.querySelector('.shell-main');
  document.body.insertAdjacentHTML('afterbegin', header + `<div class="shell-row">${sidebar}<div class="shell-content"></div></div>`);
  if (main) document.querySelector('.shell-content').appendChild(main);

  document.querySelectorAll('.side-acc-btn').forEach(b => b.addEventListener('click', () => {
    const li = b.parentElement; li.classList.toggle('open'); b.setAttribute('aria-expanded', li.classList.contains('open'));
  }));
  document.querySelector('.sidebar-toggle').addEventListener('click', () => document.body.classList.toggle('sidebar-collapsed'));
})();
