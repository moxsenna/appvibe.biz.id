const IMAGE_COUNT = 13;
const IMAGE_PATHS = Array.from({ length: IMAGE_COUNT }, (_, i) => `/products/product-${i + 1}.webp`);

export function initShowcase3D() {
  const container = document.querySelector('.showcase-canvas');
  if (!container) return;

  // Wait until container has dimensions
  if (container.clientWidth === 0) {
    const ro = new ResizeObserver(() => {
      if (container.clientWidth > 0) {
        ro.disconnect();
        build(container);
      }
    });
    ro.observe(container);
    return;
  }

  build(container);
}

function build(container) {
  container.innerHTML = '';

  // Build carousel DOM
  const ring = document.createElement('div');
  ring.className = 'showcase-ring';

  IMAGE_PATHS.forEach((path, i) => {
    const card = document.createElement('div');
    card.className = 'showcase-ring-card';
    card.innerHTML = `<img src="${path}" alt="Product ${i + 1}" width="200" height="300">`;
    ring.appendChild(card);
  });

  container.appendChild(ring);

  // 3D setup
  const cards = ring.querySelectorAll('.showcase-ring-card');
  const angleStep = 360 / IMAGE_COUNT;

  function getRadius() {
    const w = container.clientWidth;
    if (w < 400) return 200;
    if (w < 600) return 280;
    if (w < 800) return 360;
    return 420;
  }

  function applyTransforms(r) {
    cards.forEach((card, i) => {
      card.style.transform = `rotateY(${i * angleStep}deg) translateZ(${r}px)`;
    });
  }

  let radius = getRadius();
  applyTransforms(radius);

  // Auto-rotate
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let rotation = 0;
  let targetRotation = 0;
  let isDragging = false;
  let startX = 0;
  let dragStartRotation = 0;
  const autoRotate = !reducedMotion;

  function animate() {
    if (autoRotate && !isDragging) {
      targetRotation -= 0.12;
    }
    rotation += (targetRotation - rotation) * 0.06;
    ring.style.transform = `translateZ(-${radius}px) rotateY(${rotation}deg)`;
    requestAnimationFrame(animate);
  }
  animate();

  // Drag — pointer events
  container.addEventListener('pointerdown', (e) => {
    isDragging = true;
    startX = e.clientX;
    dragStartRotation = targetRotation;
    container.style.cursor = 'grabbing';
  });

  window.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    targetRotation = dragStartRotation + (e.clientX - startX) * 0.3;
  });

  window.addEventListener('pointerup', () => {
    if (isDragging) {
      isDragging = false;
      container.style.cursor = 'grab';
    }
  });

  // Touch
  container.addEventListener('touchstart', (e) => {
    isDragging = true;
    startX = e.touches[0].clientX;
    dragStartRotation = targetRotation;
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    targetRotation = dragStartRotation + (e.touches[0].clientX - startX) * 0.3;
  }, { passive: true });

  window.addEventListener('touchend', () => {
    isDragging = false;
  });

  container.style.cursor = 'grab';

  // Resize
  window.addEventListener('resize', () => {
    radius = getRadius();
    applyTransforms(radius);
  });
}
