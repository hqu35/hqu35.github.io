(function () {
  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Profile picture: glitch-swap between the two variants -------------
  var photoBtn = document.getElementById('photoToggle');
  var img = document.getElementById('profilePic');
  var sources = ['ryan-formal.jpg', 'ryan-artistic.jpg'];

  // Warm the cache so the swap is instant.
  new Image().src = sources[1];

  photoBtn.addEventListener('click', function () {
    var next = img.src.indexOf(sources[0]) !== -1 ? sources[1] : sources[0];
    if (reduceMotion) { img.src = next; return; }
    photoBtn.classList.remove('glitching');
    void photoBtn.offsetWidth; // restart the animation
    photoBtn.classList.add('glitching');
    setTimeout(function () { img.src = next; }, 160);
    setTimeout(function () { photoBtn.classList.remove('glitching'); }, 380);
  });

  // --- Dimension (color theme) toggle ------------------------------------
  var earthBtn = document.getElementById('earthToggle');
  earthBtn.addEventListener('click', function () {
    var next = root.dataset.earth === '65' ? '1610' : '65';
    root.dataset.earth = next;
    try { localStorage.setItem('earth', next); } catch (e) {}
    if (!reduceMotion) {
      var flash = document.createElement('div');
      flash.className = 'dimension-flash';
      document.body.appendChild(flash);
      flash.addEventListener('animationend', function () { flash.remove(); });
    }
  });

  // --- Scroll reveal ------------------------------------------------------
  var panels = document.querySelectorAll('.reveal');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    panels.forEach(function (el) { el.classList.add('is-in'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  panels.forEach(function (el) { io.observe(el); });
})();
