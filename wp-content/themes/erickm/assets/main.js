(function () {
	'use strict';

	var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	/* Menu do celular */
	var toggle = document.querySelector('.navtoggle');
	var nav = document.getElementById('menu');
	if (toggle && nav) {
		var setMenu = function (open) {
			toggle.setAttribute('aria-expanded', String(open));
			toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
			document.documentElement.classList.toggle('menu-open', open);
		};
		toggle.addEventListener('click', function () {
			setMenu(toggle.getAttribute('aria-expanded') !== 'true');
		});
		nav.addEventListener('click', function (e) {
			if (e.target.closest('a[href]:not(.glink)')) setMenu(false);
		});
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape') setMenu(false);
		});
		window.matchMedia('(min-width: 900px)').addEventListener('change', function () {
			setMenu(false);
		});
	}

	/* Idioma: o GTranslate carrega a tradução sob demanda, então o clique espera por ela */
	var lang = document.querySelector('.lang');
	if (lang) {
		/* A retomada automática do plugin trava ao trocar de página; o tema refaz a escolha depois de carregar */
		var savedLang = null;
		try {
			var stored = JSON.parse(localStorage.getItem('__GT_TRANSLATE_LANGS'));
			if (stored && stored.tgtLang && stored.tgtLang !== 'pt') {
				savedLang = stored.tgtLang;
				localStorage.removeItem('__GT_TRANSLATE_LANGS');
			}
		} catch (err) {
			savedLang = null;
		}
		if (savedLang) {
			window.addEventListener('load', function () {
				var wrapper = lang.querySelector('.gtranslate_wrapper');
				var chosen = wrapper && wrapper.querySelector('a[data-gt-lang="' + savedLang + '"]');
				if (!chosen) return;
				wrapper.dispatchEvent(new Event('pointerenter'));
				chosen.click();
			});
		}

		lang.addEventListener('click', function (e) {
			var link = e.target.closest('a[data-gt-lang]');
			if (!link || window.__GT || lang.dataset.waited) return;
			e.preventDefault();
			e.stopPropagation();
			var tries = 0;
			var wait = setInterval(function () {
				tries += 1;
				if (!window.__GT && tries < 50) return;
				clearInterval(wait);
				lang.dataset.waited = '1';
				link.click();
			}, 100);
		}, true);
	}

	/* Cabeçalho ganha fundo ao rolar */
	var bar = document.querySelector('.topbar');
	var onScroll = function () {
		bar.classList.toggle('is-stuck', window.scrollY > 12);
	};
	onScroll();
	window.addEventListener('scroll', onScroll, { passive: true });

	/* Elementos surgem ao entrar na tela */
	var items = document.querySelectorAll('.reveal');
	if (calm || !('IntersectionObserver' in window)) {
		items.forEach(function (el) { el.classList.add('is-in'); });
	} else {
		var io = new IntersectionObserver(function (entries) {
			entries.forEach(function (e) {
				if (e.isIntersecting) {
					e.target.classList.add('is-in');
					io.unobserve(e.target);
				}
			});
		}, { rootMargin: '0px 0px -6% 0px' });
		items.forEach(function (el) { io.observe(el); });
	}

	/* Certificados: filtro, "ver todos" e ampliação */
	var list = document.querySelector('[data-certs]');
	if (list) {
		var LIMIT = 12;
		var cards = Array.prototype.slice.call(list.children);
		var bar2 = document.querySelector('[data-filters]');
		var more = document.querySelector('[data-more]');
		var filter = '*';
		var expanded = false;

		var paint = function () {
			var shown = 0;
			var matches = 0;
			cards.forEach(function (li) {
				var match = filter === '*' || li.dataset.cat === filter;
				if (match) matches++;
				var visible = match && (expanded || filter !== '*' || shown < LIMIT);
				if (visible) shown++;
				li.hidden = !visible;
			});
			more.hidden = shown >= matches;
		};
		bar2.hidden = false;
		bar2.addEventListener('click', function (e) {
			var b = e.target.closest('button');
			if (!b) return;
			filter = b.dataset.filter;
			bar2.querySelectorAll('button').forEach(function (x) {
				x.setAttribute('aria-pressed', String(x === b));
			});
			paint();
		});
		more.querySelector('button').addEventListener('click', function () {
			expanded = true;
			paint();
		});
		paint();

		var box = document.getElementById('lightbox');
		if (box && box.showModal) {
			var img = box.querySelector('img');
			var cap = box.querySelector('p');
			list.addEventListener('click', function (e) {
				var a = e.target.closest('a');
				if (!a) return;
				e.preventDefault();
				img.src = a.href;
				img.alt = 'Certificado ' + a.dataset.title;
				cap.textContent = a.dataset.title;
				box.showModal();
			});
			box.addEventListener('click', function (e) {
				if (e.target === box) box.close();
			});
		}
	}

	/* Contato: o site é estático, então a mensagem vai pelo aplicativo de e-mail do visitante */
	var form = document.getElementById('contato-form');
	if (form) {
		form.addEventListener('submit', function (e) {
			e.preventDefault();
			var d = new FormData(form);
			var body = d.get('mensagem') + '\n\n' + d.get('nome') + '\n' + d.get('email');
			window.location.href = 'mailto:' + form.dataset.email +
				'?subject=' + encodeURIComponent(d.get('assunto')) +
				'&body=' + encodeURIComponent(body);
		});
	}

	/* Hero: partículas em escoamento potencial em torno de um cilindro (o círculo da malha do retrato) */
	var canvas = document.getElementById('flow');
	var portrait = document.getElementById('portrait');
	if (canvas && portrait && !calm) {
		var ctx = canvas.getContext('2d');
		var W = 0, H = 0, cx = 0, cy = 0, R = 1, dpr = 1, parts = [], raf = 0, running = false;
		var U = 1.1;

		var size = function () {
			var host = canvas.getBoundingClientRect();
			var p = portrait.getBoundingClientRect();
			dpr = Math.min(window.devicePixelRatio || 1, 2);
			W = host.width;
			H = host.height;
			canvas.width = W * dpr;
			canvas.height = H * dpr;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
			cx = p.left - host.left + p.width * 0.5;
			cy = p.top - host.top + p.height * 0.445;
			R = p.width * 0.42;
			var n = W < 700 ? 60 : 150;
			parts = [];
			for (var i = 0; i < n; i++) parts.push(spawn(Math.random() * W));
		};
		var spawn = function (x) {
			return { x: x, y: Math.random() * H, life: 80 + Math.random() * 260 };
		};
		var step = function () {
			ctx.globalCompositeOperation = 'destination-out';
			ctx.fillStyle = 'rgba(0,0,0,.028)';
			ctx.fillRect(0, 0, W, H);
			ctx.globalCompositeOperation = 'source-over';
			ctx.strokeStyle = 'rgba(22,224,216,.2)';
			ctx.lineWidth = 1;
			ctx.beginPath();
			for (var i = 0; i < parts.length; i++) {
				var p = parts[i];
				var dx = p.x - cx, dy = p.y - cy;
				var r2 = dx * dx + dy * dy;
				var inside = r2 < R * R;
				var k = R * R / (r2 * r2 || 1);
				var u = inside ? 0 : U * (1 - k * (dx * dx - dy * dy));
				var v = inside ? 0 : U * (-2 * k * dx * dy);
				ctx.moveTo(p.x, p.y);
				p.x += u;
				p.y += v;
				ctx.lineTo(p.x, p.y);
				p.life--;
				if (inside || p.x > W + 8 || p.life < 0) parts[i] = spawn(p.life < 0 ? Math.random() * W : -4);
			}
			ctx.stroke();
			raf = window.requestAnimationFrame(step);
		};
		var play = function (on) {
			if (on === running) return;
			running = on;
			if (on) raf = window.requestAnimationFrame(step);
			else window.cancelAnimationFrame(raf);
		};
		var boot = function () {
			size();
			new IntersectionObserver(function (e) { play(e[0].isIntersecting); }).observe(canvas);
			document.addEventListener('visibilitychange', function () { play(!document.hidden); });
			var t;
			window.addEventListener('resize', function () {
				clearTimeout(t);
				t = setTimeout(size, 200);
			});
		};
		if (portrait.complete) boot();
		else portrait.addEventListener('load', boot, { once: true });
	}
})();
