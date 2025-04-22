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
    { url: './', title: 'Home' },
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



export async function fetchJSON(url) {
  try {
    // Fetch the JSON file from the given URL
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }

    console.log(response)
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}


// export function renderProjects(project, containerElement, headingLevel = 'h2') {
//   // Your code will go here
//   containerElement.innerHTML = '';

//   const article = document.createElement('article');

//   article.innerHTML = `
//     <${headingLevel}>${project.title}</${headingLevel}>
//     <img src="${project.image}" alt="${project.title}">
//     <p>${project.description}</p>
//   `;

//   containerElement.appendChild(article);
// } 


export function renderProjects(projects, containerElement, headingLevel = 'h2') {
  if (!containerElement) {
    console.error('Container element not found');
    return;
  }

  const validHeadingLevels = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
  if (!validHeadingLevels.includes(headingLevel)) {
    console.warn(`Invalid heading level "${headingLevel}", defaulting to h2`);
    headingLevel = 'h2';
  }

  containerElement.innerHTML = '';

  projects.forEach((project) => {
    const article = document.createElement('article');
    article.innerHTML = `
      <${headingLevel}>${project.title || 'Untitled Project'}</${headingLevel}>
      <img src="${project.image || ''}" alt="${project.title || 'Project image'}">
      <p>${project.description || 'No description available.'}</p>
    `;
    containerElement.appendChild(article);
  });
}


export async function fetchGitHubData(username) {
  // return statement here
  return fetchJSON(`https://api.github.com/users/${username}`);
}
