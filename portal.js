/* A small, dependency-free particle portal. All coordinates are CSS pixels. */
(function () {
  'use strict';

  var canvas = document.getElementById('portalCanvas');
  var stage = document.getElementById('portalStage');
  var controls = document.getElementById('portalControls');
  var pauseButton = document.getElementById('portalPause');
  var jumpButton = document.getElementById('portalJump');
  var earthButton = document.getElementById('earthToggle');
  if (!canvas || !stage || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var TAU = Math.PI * 2;
  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reducedMotion = motionQuery.matches;
  var paused = false;
  var visible = true;
  var frame = 0;
  var lastTime = 0;
  var time = 0;
  var width = 0;
  var height = 0;
  var radius = 0;
  var particles = [];
  var sparks = [];
  var pointer = { x: 0, y: 0, targetX: 0, targetY: 0, active: false };
  var energy = 0;
  var arrival = reducedMotion ? 1 : 0;
  var gwen = document.documentElement.dataset.earth === '65' ? 1 : 0;
  var targetGwen = gwen;
  var sparkBudget = 0;
  var palette = [];
  var milesColors = [[255, 91, 24], [255, 40, 22], [255, 180, 61], [255, 228, 158], [243, 42, 116], [66, 211, 242]];
  var gwenColors = [[255, 90, 170], [237, 48, 134], [255, 158, 116], [255, 231, 215], [168, 91, 255], [91, 239, 229]];

  function random(min, max) { return min + Math.random() * (max - min); }
  function mix(a, b, amount) { return a + (b - a) * amount; }

  // Interpolate along six straight edges rather than a circular orbit.
  function hexPoint(phase, r, rotation) {
    var sector = ((phase % TAU + TAU) % TAU) / TAU * 6;
    var edge = Math.floor(sector);
    var fraction = sector - edge;
    var a = edge * Math.PI / 3 + rotation;
    var b = a + Math.PI / 3;
    return {
      x: mix(Math.cos(a), Math.cos(b), fraction) * r,
      y: mix(Math.sin(a), Math.sin(b), fraction) * r * 1.08
    };
  }

  function updatePalette() {
    for (var i = 0; i < milesColors.length; i++) {
      palette[i] = 'rgb(' + milesColors[i].map(function (value, channel) {
        return Math.round(mix(value, gwenColors[i][channel], gwen));
      }).join(',') + ')';
    }
  }

  function resize() {
    var bounds = canvas.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    // Cap the backing store on high-density phones and retina displays.
    var dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    radius = Math.min(width * .43, height * .40, stage.clientWidth * .54);
    var count = stage.clientWidth < 360 ? 520 : 940;
    particles = Array.from({ length: count }, function (_, i) {
      return {
        phase: random(0, TAU),
        band: i % 5,
        spread: random(-1, 1),
        speed: random(.12, .32),
        length: random(.004, .036),
        size: random(.5, 1.65),
        seed: random(0, TAU),
        color: Math.random() < .09 ? (Math.random() < .5 ? 4 : 5) : i % 4
      };
    });
    sparks.length = 0;
    updatePalette();
    draw();
  }

  function ringRotation(band) {
    return -Math.PI / 6 + (band - 2) * .055 + Math.sin(time * .2 + band) * .035;
  }

  function emitSpark(burst) {
    var phase = random(0, TAU);
    var rotation = ringRotation(2);
    var point = hexPoint(phase, radius * random(.91, 1.04), rotation);
    var direction = Math.atan2(point.y, point.x) + random(-.45, .45);
    var speed = random(12, burst ? 155 : 62);
    sparks.push({
      x: point.x, y: point.y,
      vx: Math.cos(direction) * speed - Math.sin(direction) * 18,
      vy: Math.sin(direction) * speed + Math.cos(direction) * 18,
      age: 0, life: random(.35, burst ? 1.2 : 1.6),
      size: random(.6, 1.7), color: Math.random() < .2 ? 5 : Math.floor(random(0, 4))
    });
  }

  function drawRing(r, rotation, color, opacity, lineWidth, offset) {
    ctx.beginPath();
    for (var i = 0; i <= 6; i++) {
      var angle = i * Math.PI / 3 + rotation;
      var x = Math.cos(angle) * r + offset;
      var y = Math.sin(angle) * r * 1.08;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  function draw() {
    if (!width || !height) return;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width / 2 + pointer.x * 7, height / 2 + pointer.y * 7);
    var expansion = 1 + energy * .065;
    var opening = .82 + arrival * .18;
    ctx.scale(expansion * opening, expansion * opening);
    ctx.globalAlpha = .3 + arrival * .7;

    // An ink-dark opening and a restrained halo keep the portrait legible.
    var halo = ctx.createRadialGradient(0, 0, radius * .54, 0, 0, radius * 1.26);
    halo.addColorStop(0, 'rgba(9, 5, 21, .8)');
    halo.addColorStop(.48, gwen > .5 ? 'rgba(121, 21, 84, .17)' : 'rgba(152, 37, 13, .19)');
    halo.addColorStop(.72, gwen > .5 ? 'rgba(250, 60, 150, .09)' : 'rgba(255, 91, 24, .10)');
    halo.addColorStop(1, 'rgba(10, 5, 18, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(-width / 2, -height / 2, width, height);

    // Faint nested facets give the opening depth without a filled neon disc.
    ctx.globalCompositeOperation = 'lighter';
    for (var layer = 0; layer < 7; layer++) {
      var depth = layer / 6;
      drawRing(radius * (.47 + depth * .54), -.52 + depth * .13 + time * .018,
        palette[layer % 2 === 0 ? 4 : 0], .035 + depth * .065, .7, 0);
    }

    for (var band = 0; band < 5; band++) {
      var r = radius * (.86 + band * .037);
      var rotation = ringRotation(band);
      drawRing(r, rotation, palette[0], .055 + energy * .03, 12, 0);
      drawRing(r, rotation, palette[band === 2 ? 2 : 0], .28 + energy * .12, band === 2 ? 1.3 : .65, 0);
      // Misregistered print colors on the outer contour.
      if (band === 4) {
        drawRing(r + 4, rotation, palette[5], .14, .8, 3);
        drawRing(r + 1, rotation, palette[4], .23, 1, -3);
      }
    }

    // Each particle travels independently along a noisy hexagonal streamline.
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var phase = p.phase + time * p.speed;
      var wave = Math.sin(phase * 13 + p.seed + time * .7);
      var orbit = radius * (.86 + p.band * .037) + p.spread * (5 + energy * 9) + wave * 2.4;
      var rotation = ringRotation(p.band);
      var point = hexPoint(phase, orbit, rotation);
      var previous = hexPoint(phase - p.length * (1 + energy * 2), orbit, rotation);
      var nearPointer = pointer.active ? Math.max(0, 1 - Math.hypot(point.x / radius - pointer.x, point.y / radius - pointer.y)) : 0;
      ctx.globalAlpha = (.25 + (Math.sin(p.seed + time * 1.3) + 1) * .24 + nearPointer * .25) * (.35 + arrival * .65);
      ctx.strokeStyle = palette[p.color];
      ctx.lineWidth = p.size + nearPointer * .7;
      ctx.beginPath();
      ctx.moveTo(previous.x, previous.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }

    for (var j = 0; j < sparks.length; j++) {
      var s = sparks[j];
      ctx.globalAlpha = Math.pow(1 - s.age / s.life, 1.5) * .8;
      ctx.strokeStyle = palette[s.color];
      ctx.lineWidth = s.size;
      ctx.beginPath();
      ctx.moveTo(s.x - s.vx * .035, s.y - s.vy * .035);
      ctx.lineTo(s.x, s.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function shouldAnimate() { return !paused && !reducedMotion && visible && !document.hidden; }

  function tick(now) {
    frame = 0;
    if (!shouldAnimate()) return;
    var dt = lastTime ? Math.min((now - lastTime) / 1000, .04) : 1 / 60;
    lastTime = now;
    time += dt * (1 + energy * 1.8);
    arrival = Math.min(1, arrival + dt * .9);
    energy = Math.max(0, energy - dt * .85);
    gwen = mix(gwen, targetGwen, 1 - Math.exp(-dt * 5));
    pointer.x = mix(pointer.x, pointer.targetX, 1 - Math.exp(-dt * 5));
    pointer.y = mix(pointer.y, pointer.targetY, 1 - Math.exp(-dt * 5));
    updatePalette();
    for (var i = sparks.length - 1; i >= 0; i--) {
      var s = sparks[i];
      s.age += dt;
      if (s.age >= s.life) { sparks.splice(i, 1); continue; }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += dt * 12;
    }
    sparkBudget += dt * (pointer.active ? 44 : 22);
    while (sparkBudget >= 1 && sparks.length < 240) { emitSpark(false); sparkBudget--; }
    sparkBudget = Math.min(sparkBudget, 1);
    draw();
    frame = requestAnimationFrame(tick);
  }

  function syncAnimation() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    lastTime = 0;
    if (shouldAnimate()) frame = requestAnimationFrame(tick);
    else {
      // Static mode reflects the active dimension without moving or flashing.
      arrival = 1;
      energy = 0;
      gwen = targetGwen;
      updatePalette();
      draw();
    }
  }

  stage.addEventListener('pointermove', function (event) {
    if (!shouldAnimate() || event.pointerType === 'touch') return;
    var bounds = stage.getBoundingClientRect();
    pointer.targetX = Math.max(-1, Math.min(1, (event.clientX - bounds.left - bounds.width / 2) / radius));
    pointer.targetY = Math.max(-1, Math.min(1, (event.clientY - bounds.top - bounds.height / 2) / radius));
    pointer.active = true;
  });
  stage.addEventListener('pointerleave', function () {
    pointer.targetX = pointer.targetY = 0;
    pointer.active = false;
  });

  jumpButton.addEventListener('click', function () { earthButton.click(); });
  window.addEventListener('dimensionchange', function () {
    targetGwen = document.documentElement.dataset.earth === '65' ? 1 : 0;
    if (shouldAnimate()) {
      energy = 1;
      for (var i = 0; i < 90 && sparks.length < 240; i++) emitSpark(true);
    } else syncAnimation();
  });
  pauseButton.addEventListener('click', function () {
    paused = !paused;
    pauseButton.setAttribute('aria-pressed', String(paused));
    pauseButton.setAttribute('aria-label', paused ? 'Resume portal animation' : 'Pause portal animation');
    syncAnimation();
  });
  function onMotionChange(event) {
    reducedMotion = event.matches;
    pauseButton.hidden = reducedMotion;
    syncAnimation();
  }
  if (motionQuery.addEventListener) motionQuery.addEventListener('change', onMotionChange);
  else motionQuery.addListener(onMotionChange);
  document.addEventListener('visibilitychange', syncAnimation);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      syncAnimation();
    }, { rootMargin: '60px' }).observe(stage);
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);
  else window.addEventListener('resize', resize);

  resize();
  stage.classList.add('portal-ready');
  controls.hidden = false;
  pauseButton.hidden = reducedMotion;
  syncAnimation();
})();
