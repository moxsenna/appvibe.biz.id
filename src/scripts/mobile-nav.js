export function initMobileNav() {
  const menuBtn = document.getElementById("menuBtn");
  const mobileNav = document.getElementById("mobileNav");

  menuBtn?.addEventListener("click", () => {
    const isShowing = mobileNav?.classList.toggle("show");
    menuBtn.textContent = isShowing ? '×' : '☰';
  });

  mobileNav?.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      mobileNav.classList.remove("show");
      if (menuBtn) menuBtn.textContent = '☰';
    });
  });
}
