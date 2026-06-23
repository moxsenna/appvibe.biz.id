export function initMobileNav() {
  const menuBtn = document.getElementById("menuBtn");
  const mobileNav = document.getElementById("mobileNav");

  menuBtn?.addEventListener("click", () => {
    mobileNav?.classList.toggle("show");
  });

  mobileNav?.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      mobileNav.classList.remove("show");
    });
  });
}
