const header = document.getElementById('siteHeader');
const toggle = document.getElementById('navToggle');

toggle.addEventListener('click', () => {
  const isOpen = header.classList.toggle('nav-open');
  toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
});

document.querySelectorAll('.site-nav-mobile a').forEach(link => {
  link.addEventListener('click', () => {
    header.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded', 'false');
  });
});
