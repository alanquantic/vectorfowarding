const heroTitles = ["Grow your business", "Business startup", "Our story"];

const header = document.querySelector("[data-header]");
const heroSlides = [...document.querySelectorAll("[data-hero-slide]")];
const heroDots = [...document.querySelectorAll("[data-hero-dot]")];
const heroTitle = document.querySelector("[data-hero-title]");
const aboutImages = [...document.querySelectorAll("[data-about-image]")];
const aboutDots = [...document.querySelectorAll("[data-about-dot]")];
const menuToggle = document.querySelector("[data-menu-toggle]");
const menu = document.querySelector("[data-menu]");
const contactForm = document.querySelector("[data-contact-form]");
const feedback = document.querySelector("[data-form-feedback]");

let heroIndex = 0;
let aboutIndex = 0;

function setHeaderState() {
  if (!header) return;
  header.classList.toggle("is-solid", window.scrollY > 24);
}

function setHero(index) {
  heroIndex = index;

  heroSlides.forEach((slide, slideIndex) => {
    slide.classList.toggle("is-active", slideIndex === heroIndex);
  });

  heroDots.forEach((dot, dotIndex) => {
    const isActive = dotIndex === heroIndex;
    dot.classList.toggle("is-active", isActive);
    dot.setAttribute("aria-pressed", String(isActive));
  });

  if (heroTitle) {
    heroTitle.textContent = heroTitles[heroIndex];
  }
}

function setAbout(index) {
  aboutIndex = index;

  aboutImages.forEach((image, imageIndex) => {
    image.classList.toggle("is-active", imageIndex === aboutIndex);
  });

  aboutDots.forEach((dot, dotIndex) => {
    const isActive = dotIndex === aboutIndex;
    dot.classList.toggle("is-active", isActive);
    dot.setAttribute("aria-pressed", String(isActive));
  });
}

heroDots.forEach((dot, index) => {
  dot.addEventListener("click", () => setHero(index));
});

aboutDots.forEach((dot, index) => {
  dot.addEventListener("click", () => setAbout(index));
});

if (heroSlides.length > 1) {
  window.setInterval(() => {
    setHero((heroIndex + 1) % heroSlides.length);
  }, 5200);
}

if (aboutImages.length > 1) {
  window.setInterval(() => {
    setAbout((aboutIndex + 1) % aboutImages.length);
  }, 4300);
}

if (menuToggle && menu) {
  menuToggle.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  menu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menu.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

const revealItems = [...document.querySelectorAll("[data-reveal]")];

if ("IntersectionObserver" in window && revealItems.length) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

if (contactForm && feedback) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(contactForm);
    const contactEmail = contactForm.dataset.contactEmail || "";
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const message = String(formData.get("message") || "").trim();

    if (!contactEmail) {
      feedback.textContent = "Add a contact email to the form before publishing.";
      return;
    }

    const subject = encodeURIComponent(
      `Manufacturing project inquiry - ${name || "Vector website"}`
    );

    const body = encodeURIComponent(
      [
        `Name: ${name}`,
        `Email: ${email}`,
        `Phone: ${phone || "Not provided"}`,
        "",
        "Project details:",
        message,
      ].join("\n")
    );

    feedback.textContent = "Opening your default email app...";
    window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${body}`;
  });
}

window.addEventListener("scroll", setHeaderState, { passive: true });
window.addEventListener("load", setHeaderState);
setHeaderState();
setHero(0);
setAbout(0);
