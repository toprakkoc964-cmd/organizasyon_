document.addEventListener('DOMContentLoaded', () => {

  // Intersection Observer for scroll animations
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.15
  };

  const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.animate-on-scroll').forEach(el => {
    observer.observe(el);
  });

  // Mobile menu toggle
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('.nav-links');

  if (hamburger) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('nav-active');
      // Change hamburger icon
      if(navLinks.classList.contains('nav-active')) {
        hamburger.innerHTML = '✕';
      } else {
        hamburger.innerHTML = '☰';
      }
    });
  }

  // Safari/iOS fixes for video freezing when changing tabs
  document.addEventListener("visibilitychange", () => {
    const video = document.querySelector('.hero-video');
    if (video && document.visibilityState === 'visible') {
      video.play().catch(e => console.log('Video autoplay resumed'));
    }
  });
});
