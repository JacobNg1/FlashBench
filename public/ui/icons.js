(function (root) {
  const svg = body => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
  const paths = {
    dashboard: '<rect x="3" y="3" width="7" height="8" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="15" width="7" height="6" rx="2"/>',
    schedule: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>',
    students: '<path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>',
    grades: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    homework: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3M7 8h.01M7 12h.01M7 16h.01"/>',
    recitation: '<path d="M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2zM9 7h7M9 11h5"/>',
    lesson: '<path d="M3 5.5L12 2l9 3.5L12 9 3 5.5zM6 7v7c3 2 9 2 12 0V7M21 6v7"/>',
    records: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V6zM14 2v4h4M8 13h8M8 17h6M8 9h2"/>',
    conversations: '<path d="M21 15a4 4 0 01-4 4H8l-5 3 1.5-4A7 7 0 013 15V8a4 4 0 014-4h10a4 4 0 014 4zM8 10h8M8 14h5"/>',
    communication: '<path d="M22 16.92v3a2 2 0 01-2.18 2 19.8 19.8 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.8 19.8 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.13 1 .37 1.98.72 2.91a2 2 0 01-.45 2.11L8.1 10a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.93.35 1.91.59 2.91.72A2 2 0 0122 16.92z"/>',
    todo: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 9h18M8 14l2 2 5-5"/>',
    resources: '<path d="M4 19.5A2.5 2.5 0 016.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>',
    news: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h10v5H7zM7 16h4M14 16h3"/>',
    teacherKit: '<path d="M9 18h6M10 22h4M8.5 14.5A7 7 0 1115.5 14.5C14.6 15.2 14 16 14 18h-4c0-2-.6-2.8-1.5-3.5z"/>',
    pictureBook: '<path d="M2 4h7a3 3 0 013 3v14a3 3 0 00-3-3H2zM22 4h-7a3 3 0 00-3 3v14a3 3 0 013-3h7z"/>',
    violations: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', edit: '<path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18M19 6v14H5V6M8 6V4h8v2M10 11v5M14 11v5"/>', check: '<path d="M20 6L9 17l-5-5"/>',
    close: '<path d="M18 6L6 18M6 6l12 12"/>', download: '<path d="M21 15v4H3v-4M7 10l5 5 5-5M12 15V3"/>', upload: '<path d="M21 15v4H3v-4M17 8l-5-5-5 5M12 3v12"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>', menu: '<path d="M3 6h18M3 12h18M3 18h18"/>', chevronDown: '<path d="M6 9l6 6 6-6"/>', chevronRight: '<path d="M9 18l6-6-6-6"/>',
    user: '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>', users: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87"/><circle cx="9" cy="7" r="4"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>', alert: '<path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0zM12 9v4M12 17h.01"/>', success: '<path d="M22 11.1V12a10 10 0 11-5.9-9.1M22 4L12 14l-3-3"/>',
    refresh: '<path d="M23 4v6h-6M1 20v-6h6M3.5 9a9 9 0 0114.9-3.4L23 10M1 14l4.6 4.4A9 9 0 0020.5 15"/>', folder: '<path d="M22 19V8H11L9 5H2v14a2 2 0 002 2h16a2 2 0 002-2z"/>', file: '<path d="M14 2H6v20h12V6zM14 2v4h4"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>', clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>', logout: '<path d="M9 21H5V3h4M16 17l5-5-5-5M21 12H9"/>',
    palette: '<circle cx="12" cy="12" r="9"/><circle cx="8" cy="9" r="1"/><circle cx="12" cy="7" r="1"/><circle cx="16" cy="10" r="1"/><path d="M15 17c-1 2-4 1-4-1s2-3 4-2c2 1 1 2 0 3z"/>', language: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/>', sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>', moon: '<path d="M21 12.8A9 9 0 1111.2 3 7 7 0 0021 12.8z"/>', monitor: '<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 22h8M12 18v4"/>', random: '<path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>', list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>', percent: '<circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9h.01M15 15h.01"/>', globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20"/>', external: '<path d="M18 13v7H4V6h7M15 3h6v6M10 14L21 3"/>', print: '<path d="M6 9V2h12v7M6 18H3v-7h18v7h-3M6 14h12v8H6z"/>', link: '<path d="M10 13a5 5 0 007.5.5l3-3a5 5 0 00-7-7l-1.7 1.7M14 11a5 5 0 00-7.5-.5l-3 3a5 5 0 007 7l1.7-1.7"/>', code: '<path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>', audio: '<path d="M3 18v-6a9 9 0 0118 0v6M21 19h-5v-5h5zM3 19h5v-5H3z"/>', mic: '<rect x="9" y="2" width="6" height="11" rx="3"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v3"/>', word: '<path d="M4 3h16v18H4zM8 8h8M8 12h8M8 16h5"/>'
  };
  const aliases = { book: 'recitation', newsIcon: 'news' };
  Object.keys(aliases).forEach(key => { paths[key] = paths[aliases[key]]; });
  root.ICON = Object.fromEntries(Object.entries(paths).map(([key, body]) => [key, svg(body)]));
})(typeof window !== 'undefined' ? window : globalThis);
