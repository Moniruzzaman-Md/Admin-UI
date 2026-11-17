/* Renders the shared admin header + sidebar. Usage:
   <body data-page="hotel-apis"> ... <main class="shell-main">...</main> <script src="js/shell.js"></script>
   Add a redesigned screen to PAGES so it appears in the sidebar. */
(function () {
  const PAGES = [
    { id: 'hotel-apis', group: 'Hotel Management', label: 'Hotel API List', href: 'hotel-apis.html' },
  ];

  // Top-level menu as it appears in the live portal (2026-11-17).
  const GROUPS = [
    'Flight Management', 'Hotel Management', 'Hotel map', 'Insurance Management', 'Attraction Management',
    'Tour Package Management', 'Bus Management', 'Train Management', 'eSIM Management', 'Car Rental Management',
    'Agent Management', 'Partner Management', 'Booking Management (Office)', 'Booking Management (Agent)',
    'Booking Management (B2C)', 'Booking Management (Hotel)', 'Booking Management (Insurance)',
    'Booking Management (Attraction)', 'Booking Management (Tour Package)', 'Booking Management (Bus)',
    'Booking Management (Car Rental)', 'Booking Management (Train)', 'Booking Management (eSIM)',
    'Commission Management', 'Business Settings', 'Ticket Support', 'Flight Info', 'Flight Info (New)', 'CMS', 'Reports',
  ];

  const ICON = {
    grid: '<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    map: '<path d="m1 6 7-3 8 3 7-3v15l-7 3-8-3-7 3z"/><path d="M8 3v15M16 6v15"/>',
    chev: '<path d="m6 9 6 6 6-6"/>',
    menu: '<path d="m11 17-5-5 5-5M18 17l-5-5 5-5"/>',
    bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  };
  const svg = (name, size = 16) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[name]}</svg>`;

  const current = document.body.dataset.page;
  const iconFor = g => g.startsWith('Booking') ? 'tag' : g === 'Hotel map' ? 'map' : 'users';

  const groupsHtml = GROUPS.map(g => {
    const pages = PAGES.filter(p => p.group === g);
    const open = pages.some(p => p.id === current);
    const sub = pages.length
      ? pages.map(p => `<a href="${p.href}" class="${p.id === current ? 'active' : ''}">${p.label}</a>`).join('')
      : '<a class="soon">Not in prototype yet</a>';
    return `<div class="shell-nav-group${open ? ' open' : ''}">
      <button class="shell-nav-item" type="button">${svg(iconFor(g))}<span>${g}</span><span class="chev">${svg('chev', 14)}</span></button>
      <div class="shell-sub">${sub}</div></div>`;
  }).join('');

  const header = `<header class="shell-header">
      <a class="shell-logo" href="index.html">mynztrip<span>.com</span></a>
      <button class="shell-icon-btn" type="button" aria-label="Collapse menu">${svg('menu')}</button>
      <div class="shell-search">${svg('search', 15)}<input placeholder="Booking ID, PNR, Ticket No..." aria-label="Global search"><button type="button">Search</button></div>
      <div class="shell-right"><span aria-label="Notifications">${svg('bell', 18)}</span><span class="shell-avatar">SA</span></div>
    </header>`;
  const sidebar = `<nav class="shell-sidebar" aria-label="Main menu">
      <a class="shell-nav-item" href="index.html">${svg('grid')}<span>Dashboard</span></a>${groupsHtml}</nav>`;

  document.body.insertAdjacentHTML('afterbegin', header + sidebar);
  document.querySelectorAll('.shell-nav-group > .shell-nav-item').forEach(b =>
    b.addEventListener('click', () => b.parentElement.classList.toggle('open')));
})();
