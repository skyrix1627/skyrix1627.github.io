// Shortcut for document.getElementById
const getById = (id) => document.getElementById(id);

// Creates an element with an optional class and text
const createElementWithText = (tagName, className, text) => {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

// Save a value in the browser (ignore errors)
function saveToStorage(key, value) {
  try { localStorage.setItem(key, value); } catch (error) { }
}

// Read a saved value (null if missing or blocked)
function loadFromStorage(key) {
  try { return localStorage.getItem(key); } catch (error) { return null; }
}

// All CV content, filled in after data.json loads
let cvData = null;

// "sv" or "en": saved choice, else browser language, else English
let currentLanguage = loadFromStorage("cv-lang") ||
  ((navigator.language || "").toLowerCase().startsWith("sv") ? "sv" : "en");

// "dark" or "light": saved choice, else system setting, else light
let currentTheme = loadFromStorage("cv-theme") ||
  (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");

// Fills a section with entries (education, certificates, work)
function renderEntries(containerElement, entryList) {
  containerElement.replaceChildren(); // clear old content
  entryList.forEach((entry) => {
    const entryBox = createElementWithText("div", "entry");
    const entryHeader = createElementWithText("div", "entry-head");
    entryHeader.append(
      createElementWithText("span", "entry-title", entry.title),
      createElementWithText("span", "entry-date", entry.date)
    );
    entryBox.append(entryHeader);
    // Only show organization if there is one
    if (entry.org) entryBox.append(createElementWithText("div", "entry-org", entry.org));
    entryBox.append(createElementWithText("p", null, entry.text));
    containerElement.append(entryBox);
  });
}

// Adds a label and value to the details list
// Value can be: an array (multiple lines), a { text, href } link, or plain text
function appendDetail(detailsList, labelText, value) {
  detailsList.append(createElementWithText("dt", null, labelText));
  const definitionDescription = createElementWithText("dd");
  if (Array.isArray(value)) {
    value.forEach((lineText, lineIndex) => {
      if (lineIndex) definitionDescription.append(document.createElement("br")); // new line
      definitionDescription.append(lineText);
    });
  } else if (value && value.href) {
    const linkElement = createElementWithText("a", null, value.text);
    linkElement.href = value.href;
    definitionDescription.append(linkElement);
  } else {
    definitionDescription.textContent = value;
  }
  detailsList.append(definitionDescription);
}

// Draws the whole page. Runs after data loads and when language/theme changes
function renderPage() {
  if (!cvData) return; // data not loaded yet

  const translations = cvData[currentLanguage]; // text that depends on language
  const shared = cvData.shared; // data that is the same in all languages

  document.documentElement.lang = currentLanguage;
  document.documentElement.dataset.theme = currentTheme; // CSS uses this for colors
  document.title = shared.name + " – " + translations.ui.pageTitle;

  // Profile picture (removed if no photo is set in data.json)
  const photoElement = getById("photo");
  if (photoElement) {
    if (shared.photo) {
      photoElement.src = shared.photo;
      photoElement.alt = translations.ui.photoAlt; // read by screen readers
    } else {
      photoElement.remove();
    }
  }

  // Language button (aria-label is for screen readers)
  getById("lang-btn").textContent = translations.ui.langBtn;
  getById("lang-btn").setAttribute(
    "aria-label",
    currentLanguage === "sv" ? "Switch to English" : "Byt till svenska"
  );

  // Theme button (aria-pressed tells screen readers if dark mode is on)
  getById("theme-btn").textContent =
    currentTheme === "dark" ? translations.ui.themeDark : translations.ui.themeLight;
  getById("theme-btn").setAttribute("aria-pressed", String(currentTheme === "dark"));

  // Section headings
  const headings = translations.headings;
  getById("h-details").textContent = headings.details;
  getById("h-skills").textContent = headings.skills;
  getById("h-profile").textContent = headings.profile;
  getById("h-education").textContent = headings.education;
  getById("h-certs").textContent = headings.certs;
  getById("h-work").textContent = headings.work;
  getById("h-tech").textContent = headings.tech;
  getById("h-hobbies").textContent = headings.hobbies;

  // Personal details
  const detailsList = getById("details");
  detailsList.replaceChildren();
  appendDetail(detailsList, translations.labels.name, shared.name);
  appendDetail(detailsList, translations.labels.email, { text: shared.email, href: "mailto:" + shared.email }); // opens email app
  appendDetail(detailsList, translations.labels.birth, translations.details.birth);
  appendDetail(detailsList, translations.labels.license, translations.details.license);
  appendDetail(detailsList, translations.labels.gender, translations.details.gender);

  // Skills with a 5-dot rating
  const skillsList = getById("skills");
  skillsList.replaceChildren();
  shared.skills.forEach((skill) => {
    const listItem = createElementWithText("li");
    const levelDots = createElementWithText("span", "dots");
    levelDots.setAttribute("role", "img"); // screen readers read the label below
    levelDots.setAttribute("aria-label", skill.level + " / 5");
    // Draw 5 dots, the first "level" ones are filled
    for (let dotIndex = 0; dotIndex < 5; dotIndex++) {
      levelDots.append(createElementWithText("i", dotIndex < skill.level ? "on" : ""));
    }
    listItem.append(createElementWithText("span", null, skill[currentLanguage]), levelDots);
    skillsList.append(listItem);
  });

  // Profile and entry sections
  getById("profile").textContent = translations.profile;
  renderEntries(getById("education"), translations.education);
  renderEntries(getById("certs"), translations.certs);
  renderEntries(getById("work"), translations.work);

  // Technologies, grouped and shown as chips
  const techContainer = getById("tech");
  techContainer.replaceChildren();
  shared.tech.forEach((techGroup) => {
    const groupRow = createElementWithText("div", "tech-group");
    groupRow.append(createElementWithText("div", "tech-label", techGroup[currentLanguage]));
    const chipList = createElementWithText("ul", "chips");
    techGroup.items.forEach((itemName) => chipList.append(createElementWithText("li", null, itemName)));
    groupRow.append(chipList);
    techContainer.append(groupRow);
  });

  // Hobbies
  const hobbiesList = getById("hobbies");
  hobbiesList.replaceChildren();
  translations.hobbies.forEach((hobby) => hobbiesList.append(createElementWithText("li", null, hobby)));
}

// Language button: switch, save, redraw
getById("lang-btn").addEventListener("click", () => {
  currentLanguage = currentLanguage === "sv" ? "en" : "sv";
  saveToStorage("cv-lang", currentLanguage);
  renderPage();
});

// Theme button: switch, save, redraw
getById("theme-btn").addEventListener("click", () => {
  currentTheme = currentTheme === "dark" ? "light" : "dark";
  saveToStorage("cv-theme", currentTheme);
  renderPage();
});

// Load the CV content from data.json
fetch("data.json")
  .then((response) => {
    if (!response.ok) throw new Error(response.status); // treat 404 etc. as errors
    return response.json();
  })
  .then((loadedData) => {
    cvData = loadedData;
    renderPage();
  })
  .catch(() => {
    // Usually happens when the file is opened by double-clicking instead of via a web server
    document.querySelector(".inner").textContent =
      "Could not load data.json. Open the site through a web server (or host it) instead of double-clicking the file.";
  });