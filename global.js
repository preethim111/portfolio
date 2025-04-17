console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

// const navLinks = $$("nav a");

// let currentLink = navLinks.find(
//     (a) => a.host === location.host && a.pathname === location.pathname
// );  

// currentLink?.classList.add('current');

// console.log(navLinks);

const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"                  // Local server
  : "/portfolio/";         // GitHub Pages repo name

 

let pages = [
    { url: '', title: 'Home' },
    { url: 'projects/', title: 'Projects' },
    { url: 'cv/', title: 'CV' },
    { url: 'contact/', title: 'Contact' },
    { url: 'https://github.com/preethim111', title: 'Profile' },
]

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
    let url = p.url;
    let title = p.title;

    if (!url.startsWith('http')) {
        url = BASE_PATH + url;
      }

    // next step: create link and add it to nav
    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;
    nav.append(a);

    a.classList.toggle(
        'current',
        a.host === location.host && a.pathname === location.pathname
    );

    a.toggleAttribute("target", a.host !== location.host)

}

document.addEventListener("DOMContentLoaded", () => {
  document.body.insertAdjacentHTML(
    "afterbegin",
    `
    <label class="color-scheme">
      Theme:
      <select id="theme-select">
        <option value="light dark">Automatic</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
    `
  );

  const themeSelect = document.getElementById("theme-select");
  const root = document.documentElement;

  // if it exists, load stored theme preference
  const stored = localStorage.getItem("color-scheme");
  if (stored) {
    root.style.colorScheme = stored;
    themeSelect.value = stored;
  }

  // apply the selected theme on changed
  themeSelect.addEventListener("change", () => {
    const selected = themeSelect.value;
    root.style.colorScheme = selected;
    localStorage.setItem("color-scheme", selected);
  });
});