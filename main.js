function getBasePath() {
  const configuredBase = import.meta.env.BASE_URL || "/";

  // In GitHub Pages, this keeps links under /<repo>/ even if build base is not set.
  if (configuredBase !== "/") {
    return configuredBase.endsWith("/") ? configuredBase : `${configuredBase}/`;
  }

  const [firstSegment] = window.location.pathname.split("/").filter(Boolean);
  return firstSegment ? `/${firstSegment}/` : "/";
}

const base = getBasePath();

const sessions = [
  {
    id: 1,
    title: "Session 1",
    description: "Basic scene setup and a rotating cube.",
    href: `${base}src/session1/index.html`,
    tags: ["Scene", "Geometry", "Animation"],
  },
  {
    id: 2,
    title: "Session 2",
    description: "Indexed geometry and wireframe cube construction.",
    href: `${base}src/session2/index.html`,
    tags: ["BufferGeometry", "Indices", "Wireframe"],
  },
  {
    id: 3,
    title: "Session 3",
    description: "Textured primitives and material variety.",
    href: `${base}src/session3/index.html`,
    tags: ["Textures", "Materials", "Lighting"],
  },
  {
    id: 4,
    title: "Session 4",
    description: "Lighting controls with a small interactive demo.",
    href: `${base}src/session4/index.html`,
    tags: ["Lights", "GUI", "Interactivity"],
  },
  {
    id: 5,
    title: "Session 5",
    description: "Transforms, keyboard movement, and GUI-driven controls.",
    href: `${base}src/session5/index.html`,
    tags: ["Position", "Rotation", "Scale"],
  },
  {
    id: 6,
    title: "Session 6",
    description: "Camera modes, skybox background, and navigation patterns.",
    href: `${base}src/session6/index.html`,
    tags: ["Skybox", "Orbit", "First Person"],
  },
  {
    id: 10,
    title: "Session 10",
    description: "Particle system animations using procedural canvas textures.",
    href: `${base}src/session10/index.html`,
    tags: ["Particles", "Textures", "Animation"],
  },
  {
    id: 7,
    title: "Mid Exam",
    description: "Midterm examination covering sessions 1-6 concepts.",
    href: `${base}src/exam-mid/index.html`,
    tags: ["Review", "Assessment", "Comprehensive"],
  },
  {
    id: 8,
    title: "End Exam",
    description: "Final examination covering all concepts.",
    href: `${base}src/exam-end/index.html`,
    tags: ["Final", "Assessment", "Comprehensive"],
  },
];

const grid = document.querySelector("#session-grid");

if (grid) {
  grid.replaceChildren(); // clear any existing content

  sessions.forEach((session) => {
    const article = document.createElement("article");
    article.className = `card ${session.locked ? "locked" : ""}`;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = String(session.id).padStart(2, "0");
    article.appendChild(meta);

    const h2 = document.createElement("h2");
    h2.textContent = session.title;
    article.appendChild(h2);

    const p = document.createElement("p");
    p.textContent = session.description;
    article.appendChild(p);

    const tagsContainer = document.createElement("div");
    tagsContainer.className = "tags";
    session.tags.forEach((tagText) => {
      const tag = document.createElement("span");
      tag.className = "tag";
      tag.textContent = tagText;
      tagsContainer.appendChild(tag);
    });
    article.appendChild(tagsContainer);

    const actions = document.createElement("div");
    actions.className = "actions";

    const statusMeta = document.createElement("span");
    statusMeta.className = "meta";
    statusMeta.textContent = session.locked ? "██████" : "Open practical";
    actions.appendChild(statusMeta);

    if (session.locked) {
      const btn = document.createElement("span");
      btn.className = "button disabled";
      btn.setAttribute("aria-disabled", "true");
      btn.textContent = "██████";
      actions.appendChild(btn);
    } else {
      const btn = document.createElement("a");
      btn.className = "button";
      btn.href = session.href;
      btn.textContent = "Launch";
      actions.appendChild(btn);
    }

    article.appendChild(actions);
    grid.appendChild(article);
  });
}
