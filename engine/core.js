(() => {
  const THEMES = /*__THEMES_PLACEHOLDER__*/{};
  const THEME_KEYS = Object.keys(THEMES);
  const DEFAULT_THEME_KEY = THEME_KEYS[0] || 'Default';

  const STORAGE_THEME = 'agy_theme_v3';
  const STORAGE_BUBBLE = 'agy_bubble_v3';
  const STORAGE_INPUT = 'agy_input_v3';
  const STORAGE_DIMMING = 'agy_dimming_v3';
  const STORAGE_WP_ENABLED = 'agy_wp_enabled_v3';
  const STORAGE_CUSTOM_WP = 'agy_custom_wp_v3';
  const STORAGE_USER_AVATAR = 'agy_user_avatar_v3';
  const STORAGE_AGENT_AVATAR = 'agy_agent_avatar_v3';
  const STORAGE_BG_MODE = 'agy_bg_mode_v3';

  const STORAGE_CUSTOM_PRESETS = 'agy_custom_presets_v1';
  const LIVE_DB_NAME = 'agy_live_wallpaper_db_v1';
  const LIVE_STORE_NAME = 'videos';

  function getCustomPresets() {
    try {
      const fromLocal = JSON.parse(localStorage.getItem(STORAGE_CUSTOM_PRESETS) || '{}');
      const fromInit = (window.__AGY_INITIAL_CONFIG__ && window.__AGY_INITIAL_CONFIG__.customPresets) || {};
      return { ...fromInit, ...fromLocal };
    } catch (_) {
      return {};
    }
  }

  function saveCustomPreset(preset) {
    try {
      const presets = getCustomPresets();
      presets[preset.name] = preset;
      localStorage.setItem(STORAGE_CUSTOM_PRESETS, JSON.stringify(presets));
      if (window.agySaveThemeConfig) {
        window.agySaveThemeConfig(JSON.stringify({ customPresets: presets }));
      }
    } catch (_) {}
  }

  function removeCustomPreset(presetName) {
    try {
      const presets = getCustomPresets();
      const p = presets[presetName];
      if (p && p.videoKey) {
        deleteLiveVideoBlob(p.videoKey);
      }
      delete presets[presetName];
      localStorage.setItem(STORAGE_CUSTOM_PRESETS, JSON.stringify(presets));
      if (window.agySaveThemeConfig) {
        window.agySaveThemeConfig(JSON.stringify({ customPresets: presets }));
      }
    } catch (_) {}
  }

  function getAllThemes() {
    return { ...THEMES, ...getCustomPresets() };
  }

  function openLiveDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(LIVE_DB_NAME, 1);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(LIVE_STORE_NAME)) {
          db.createObjectStore(LIVE_STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function saveLiveVideoBlob(blob, key = 'active_live_mp4') {
    const db = await openLiveDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(LIVE_STORE_NAME, 'readwrite');
      tx.objectStore(LIVE_STORE_NAME).put(blob, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getLiveVideoBlob(key = 'active_live_mp4') {
    try {
      const db = await openLiveDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(LIVE_STORE_NAME, 'readonly');
        const req = tx.objectStore(LIVE_STORE_NAME).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (_) {
      return null;
    }
  }

  async function deleteLiveVideoBlob(key) {
    try {
      const db = await openLiveDb();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(LIVE_STORE_NAME, 'readwrite');
        tx.objectStore(LIVE_STORE_NAME).delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (_) {}
  }

  function extractVideoThumbnail(file) {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      const url = URL.createObjectURL(file);
      video.src = url;

      let resolved = false;
      const done = (thumb) => {
        if (resolved) return;
        resolved = true;
        URL.revokeObjectURL(url);
        video.remove();
        resolve(thumb);
      };

      video.onloadeddata = () => {
        try {
          video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
        } catch (_) {
          capture();
        }
      };

      video.onseeked = () => {
        capture();
      };

      function capture() {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 320;
          canvas.height = 180;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, 320, 180);
          const thumb = canvas.toDataURL('image/webp', 0.85);
          done(thumb);
        } catch (_) {
          done('');
        }
      }

      video.onerror = () => done('');
      setTimeout(() => done(''), 2000);
    });
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return [Math.round(h * 360), s, l];
  }

  function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, (h / 360) + 1/3);
      g = hue2rgb(p, q, h / 360);
      b = hue2rgb(p, q, (h / 360) - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  function toHex(r, g, b) {
    return '#' + [r, g, b].map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('');
  }

  function boostAccent(r, g, b, minL = 0.58, maxL = 0.72) {
    const [h, s, l] = rgbToHsl(r, g, b);
    const targetS = Math.min(1, Math.max(0.68, s * 1.3));
    const targetL = Math.min(maxL, Math.max(minL, l < 0.50 ? l * 1.35 : l));
    const [br, bg, bb] = hslToRgb(h, targetS, targetL);
    return { hex: toHex(br, bg, bb), r: br, g: bg, b: bb };
  }

  function extractPaletteFromCanvas(canvas) {
    try {
      const sampleCanvas = document.createElement('canvas');
      sampleCanvas.width = 64;
      sampleCanvas.height = 64;
      const ctx = sampleCanvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(canvas, 0, 0, 64, 64);
      const data = ctx.getImageData(0, 0, 64, 64).data;

      const buckets = Array.from({ length: 24 }, () => ({ count: 0, sSum: 0, lSum: 0, rSum: 0, gSum: 0, bSum: 0 }));
      let totalR = 0, totalG = 0, totalB = 0, totalCount = 0;

      for (let i = 0; i < data.length; i += 8) {
        const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
        if (a < 128) continue;
        totalR += r; totalG += g; totalB += b; totalCount++;
        const [h, s, l] = rgbToHsl(r, g, b);
        if (s >= 0.20 && l >= 0.18 && l <= 0.88) {
          const bIdx = Math.floor((h % 360) / 15);
          buckets[bIdx].count++;
          buckets[bIdx].sSum += s;
          buckets[bIdx].lSum += l;
          buckets[bIdx].rSum += r;
          buckets[bIdx].gSum += g;
          buckets[bIdx].bSum += b;
        }
      }

      let bestBucket = -1;
      let maxScore = -1;
      for (let i = 0; i < 24; i++) {
        if (buckets[i].count === 0) continue;
        const avgS = buckets[i].sSum / buckets[i].count;
        const avgL = buckets[i].lSum / buckets[i].count;
        const score = buckets[i].count * (avgS ** 1.3) * (1 - Math.abs(avgL - 0.55));
        if (score > maxScore) {
          maxScore = score;
          bestBucket = i;
        }
      }

      let pR, pG, pB, sR, sG, sB;
      if (bestBucket !== -1) {
        const rawPR = buckets[bestBucket].rSum / buckets[bestBucket].count;
        const rawPG = buckets[bestBucket].gSum / buckets[bestBucket].count;
        const rawPB = buckets[bestBucket].bSum / buckets[bestBucket].count;
        const boosted = boostAccent(rawPR, rawPG, rawPB, 0.58, 0.70);
        pR = boosted.r; pG = boosted.g; pB = boosted.b;

        let secBucket = -1;
        let secScore = -1;
        for (let i = 0; i < 24; i++) {
          const diff = Math.min(Math.abs(i - bestBucket), 24 - Math.abs(i - bestBucket));
          if (diff < 2 || buckets[i].count === 0) continue;
          const avgS = buckets[i].sSum / buckets[i].count;
          const avgL = buckets[i].lSum / buckets[i].count;
          const score = buckets[i].count * avgS * (1 - Math.abs(avgL - 0.55));
          if (score > secScore) {
            secScore = score;
            secBucket = i;
          }
        }

        if (secBucket !== -1) {
          const rawSR = buckets[secBucket].rSum / buckets[secBucket].count;
          const rawSG = buckets[secBucket].gSum / buckets[secBucket].count;
          const rawSB = buckets[secBucket].bSum / buckets[secBucket].count;
          const boostedSec = boostAccent(rawSR, rawSG, rawSB, 0.60, 0.75);
          sR = boostedSec.r; sG = boostedSec.g; sB = boostedSec.b;
        } else {
          const [pH, pS] = rgbToHsl(pR, pG, pB);
          const [r2, g2, b2] = hslToRgb((pH + 35) % 360, Math.min(1, pS * 1.1), 0.65);
          sR = r2; sG = g2; sB = b2;
        }
      } else {
        pR = 56; pG = 189; pB = 248;
        sR = 129; sG = 140; sB = 248;
      }

      const avgR = totalCount ? totalR / totalCount : 15;
      const avgG = totalCount ? totalG / totalCount : 20;
      const avgB = totalCount ? totalB / totalCount : 30;
      const darkR = Math.max(6, Math.min(22, Math.round(avgR * 0.10 + pR * 0.04)));
      const darkG = Math.max(8, Math.min(24, Math.round(avgG * 0.10 + pG * 0.04)));
      const darkB = Math.max(12, Math.min(32, Math.round(avgB * 0.10 + pB * 0.04)));

      const primary = toHex(pR, pG, pB);
      const secondary = toHex(sR, sG, sB);

      return {
        primary,
        secondary,
        borderColor: `rgba(${pR}, ${pG}, ${pB}, 0.38)`,
        glow: `rgba(${pR}, ${pG}, ${pB}, 0.32)`,
        secondaryGlow: `rgba(${sR}, ${sG}, ${sB}, 0.22)`,
        bg: `linear-gradient(145deg, rgba(${darkR+10}, ${darkG+10}, ${darkB+16}, 0.88) 0%, rgba(${darkR+2}, ${darkG+2}, ${darkB+6}, 0.94) 100%)`,
        frameBg: `linear-gradient(135deg, ${primary}e6 0%, ${secondary}c0 50%, ${primary}d9 100%)`,
        textColor: '#f8fafc',
        clearBackdrop: true,
        overlayRgb: `${darkR}, ${darkG}, ${darkB}`,
        unifiedGlass: true,
        innerBorder: `1px solid rgba(${pR}, ${pG}, ${pB}, 0.22)`,
        inputCardBg: `linear-gradient(145deg, rgba(${darkR+12}, ${darkG+12}, ${darkB+18}, 0.90) 0%, rgba(${darkR+4}, ${darkG+4}, ${darkB+8}, 0.95) 100%)`,
        inputGlassBg: `rgba(${darkR+8}, ${darkG+8}, ${darkB+12}, 0.55)`,
        aiCardBg: `rgba(${darkR+6}, ${darkG+6}, ${darkB+10}, 0.76)`,
        aiCardBorder: `rgba(${pR}, ${pG}, ${pB}, 0.18)`,
        btnBg: `rgba(${Math.min(255, darkR+22)}, ${Math.min(255, darkG+22)}, ${Math.min(255, darkB+32)}, 0.65)`,
        sidebarBg: `rgba(${darkR+4}, ${darkG+4}, ${darkB+8}, 0.55)`,
        sidebarHoverBg: `rgba(${pR}, ${pG}, ${pB}, 0.12)`,
        headerBg: `rgba(${darkR+4}, ${darkG+4}, ${darkB+8}, 0.50)`,
        headerBorder: `rgba(${pR}, ${pG}, ${pB}, 0.14)`,
        cardBg: `rgba(${darkR+8}, ${darkG+8}, ${darkB+14}, 0.82)`,
        cardSelectedBg: `rgba(${pR}, ${pG}, ${pB}, 0.28)`
      };
    } catch (e) {
      console.warn('Palette extraction error:', e);
      return null;
    }
  }

  function extractPaletteFromImage(source) {
    return new Promise((resolve) => {
      if (!source) return resolve(null);
      if (source instanceof HTMLCanvasElement) {
        return resolve(extractPaletteFromCanvas(source));
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 64;
          canvas.height = 64;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, 64, 64);
          resolve(extractPaletteFromCanvas(canvas));
        } catch (_) {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = typeof source === 'string' ? source : (source.src || '');
    });
  }

  function getFallbackPalette(mode = 'live') {
    const isLive = mode === 'live';
    const primary = isLive ? '#c084fc' : '#38bdf8';
    const secondary = isLive ? '#f472b6' : '#818cf8';
    const pR = isLive ? 192 : 56, pG = isLive ? 132 : 189, pB = isLive ? 252 : 248;
    const darkR = isLive ? 14 : 10, darkG = isLive ? 10 : 14, darkB = isLive ? 24 : 26;
    return {
      primary,
      secondary,
      borderColor: `rgba(${pR}, ${pG}, ${pB}, 0.38)`,
      glow: `rgba(${pR}, ${pG}, ${pB}, 0.32)`,
      secondaryGlow: isLive ? 'rgba(244, 114, 182, 0.22)' : 'rgba(129, 140, 248, 0.22)',
      bg: `linear-gradient(145deg, rgba(${darkR+8}, ${darkG+8}, ${darkB+12}, 0.88) 0%, rgba(${darkR}, ${darkG}, ${darkB}, 0.94) 100%)`,
      frameBg: `linear-gradient(135deg, ${primary}e6 0%, ${secondary}c0 50%, ${primary}d9 100%)`,
      textColor: '#f8fafc',
      clearBackdrop: true,
      overlayRgb: `${darkR}, ${darkG}, ${darkB}`,
      unifiedGlass: true,
      innerBorder: `1px solid rgba(${pR}, ${pG}, ${pB}, 0.22)`,
      inputCardBg: `linear-gradient(145deg, rgba(${darkR+10}, ${darkG+10}, ${darkB+14}, 0.90) 0%, rgba(${darkR+2}, ${darkG+2}, ${darkB+6}, 0.95) 100%)`,
      inputGlassBg: `rgba(${darkR+6}, ${darkG+6}, ${darkB+10}, 0.55)`,
      aiCardBg: `rgba(${darkR+4}, ${darkG+4}, ${darkB+8}, 0.76)`,
      aiCardBorder: `rgba(${pR}, ${pG}, ${pB}, 0.18)`,
      btnBg: `rgba(${darkR+20}, ${darkG+20}, ${darkB+28}, 0.65)`,
      sidebarBg: `rgba(${darkR+2}, ${darkG+2}, ${darkB+6}, 0.55)`,
      sidebarHoverBg: `rgba(${pR}, ${pG}, ${pB}, 0.12)`,
      headerBg: `rgba(${darkR+2}, ${darkG+2}, ${darkB+6}, 0.50)`,
      headerBorder: `rgba(${pR}, ${pG}, ${pB}, 0.14)`,
      cardBg: `rgba(${darkR+6}, ${darkG+6}, ${darkB+10}, 0.82)`,
      cardSelectedBg: `rgba(${pR}, ${pG}, ${pB}, 0.28)`
    };
  }

  function getThematicCornerSvg(primary, secondary) {
    const p = encodeURIComponent(primary || '#38bdf8');
    const s = encodeURIComponent(secondary || primary || '#818cf8');
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 40 40'%3E%3Cpath d='M2 24 L2 6 Q2 2 6 2 L24 2' stroke='${p}' stroke-width='1.8' fill='none' stroke-linecap='round' opacity='0.92'/%3E%3Cpath d='M5 18 L5 8 Q5 5 8 5 L18 5' stroke='${s}' stroke-width='1.2' fill='none' stroke-linecap='round' opacity='0.78'/%3E%3Ccircle cx='7' cy='7' r='2.2' fill='${p}' opacity='0.95'/%3E%3Ccircle cx='15' cy='3.5' r='1.2' fill='${s}' opacity='0.85'/%3E%3Ccircle cx='3.5' cy='15' r='1.2' fill='${s}' opacity='0.85'/%3E%3C/svg%3E`;
  }

  function getThematicCrestSvg(primary, secondary) {
    const p = encodeURIComponent(primary || '#38bdf8');
    const s = encodeURIComponent(secondary || primary || '#818cf8');
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 24' fill='none'%3E%3Cpath d='M8 18 Q28 8 44 14 Q47 15 50 11 Q53 15 56 14 Q72 8 92 18' stroke='${p}' stroke-width='1.5' stroke-linecap='round' opacity='0.88'/%3E%3Cpath d='M22 15 Q36 6 50 8 Q64 6 78 15' stroke='${s}' stroke-width='1.1' stroke-linecap='round' opacity='0.72'/%3E%3Cpath d='M50 3 L53.5 10 L50 17 L46.5 10 Z' fill='${p}' opacity='0.95'/%3E%3Ccircle cx='50' cy='10' r='1.6' fill='${s}'/%3E%3Ccircle cx='34' cy='11.5' r='1.3' fill='${p}' opacity='0.85'/%3E%3Ccircle cx='66' cy='11.5' r='1.3' fill='${p}' opacity='0.85'/%3E%3C/svg%3E`;
  }

  async function migrateExistingCustomPresets() {
    try {
      const presets = JSON.parse(localStorage.getItem(STORAGE_CUSTOM_PRESETS) || '{}');
      let changed = false;
      for (const [name, p] of Object.entries(presets)) {
        const isOldHardcoded = (p.primary === '#c084fc' || p.primary === '#38bdf8' || !p.inputCardBg);
        if (isOldHardcoded && p.wallpaper) {
          const palette = await extractPaletteFromImage(p.wallpaper);
          if (palette) {
            Object.assign(p, palette);
            changed = true;
          }
        }
      }
      if (changed) {
        localStorage.setItem(STORAGE_CUSTOM_PRESETS, JSON.stringify(presets));
        if (window.agySaveThemeConfig) {
          try { window.agySaveThemeConfig(JSON.stringify({ customPresets: presets })); } catch (_) {}
        }
        applyTheme();
      }
    } catch (_) {}
  }

  function formatThemeName(filename) {
    let base = filename.replace(/\.[^/.]+$/, '');
    base = base.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
    base = base.replace(/\b(moewalls|com|net|org|wallpaper|1080p|4k|hd)\b/gi, '').trim();
    base = base.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
    return (base.replace(/\b\w/g, c => c.toUpperCase()) || 'Custom Theme').slice(0, 30);
  }

  // Pre-load live video blob state & register existing video if needed
  getLiveVideoBlob('active_live_mp4').then(async (blob) => {
    if (blob) {
      window.__AGY_HAS_LIVE_VIDEO__ = true;
      if (!window.__AGY_ACTIVE_BLOB_URL__) {
        window.__AGY_ACTIVE_BLOB_URL__ = URL.createObjectURL(blob);
      }
      const v = document.getElementById('agy-live-video');
      if (v && (!v.src || !v.src.startsWith('blob:'))) {
        v.src = window.__AGY_ACTIVE_BLOB_URL__;
        if (getState().bgMode === 'live' && getState().wpEnabled && !document.hidden) {
          v.play().catch(() => {});
        }
      }
      // Auto-register legacy uploaded video if customPresets is currently empty
      const existingCustom = getCustomPresets();
      if (Object.keys(existingCustom).length === 0) {
        const thumb = await extractVideoThumbnail(blob);
        const palette = (await extractPaletteFromImage(thumb)) || getFallbackPalette('live');
        saveCustomPreset({
          id: 'custom_live_init',
          name: 'Hiyuki Frost Blade',
          isCustom: true,
          bgMode: 'live',
          videoKey: 'active_live_mp4',
          wallpaper: thumb,
          concept: 'Custom Live Wallpaper • MP4',
          ...palette
        });
      }
    }
  });

  // Smart Auto-Pause: 0% CPU/GPU overhead when window is hidden or blurred
  if (!window.__AGY_LIVE_PAUSE_LISTENER__) {
    window.__AGY_LIVE_PAUSE_LISTENER__ = true;
    const handleVis = () => {
      const v = document.getElementById('agy-live-video');
      if (!v) return;
      const st = getState();
      if (st.bgMode !== 'live' || !st.wpEnabled) return;
      if (document.hidden) {
        v.pause();
      } else {
        v.play().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVis);
    window.addEventListener('blur', () => {
      const v = document.getElementById('agy-live-video');
      if (v && getState().bgMode === 'live') v.pause();
    });
    window.addEventListener('focus', () => {
      const v = document.getElementById('agy-live-video');
      if (v && getState().bgMode === 'live' && getState().wpEnabled && !document.hidden) {
        v.play().catch(() => {});
      }
    });
  }

  const CHECK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

  const INPUT_STYLES = {
    'thematic': {
      label: 'Thematic Composer Frame',
      desc: 'Dual-line border and glowing frame strictly tuned to active theme colors'
    },
    'ornamental': {
      label: 'Ornamental Composer Frame',
      desc: 'Intricate SVG corner filigrees & decorative crest flourished with theme accents'
    },
    'glass': {
      label: 'Translucent Crystal Glass',
      desc: 'Lets more of your background artwork shine through with frosted transparency'
    },
    'minimal': {
      label: 'Minimal Clean',
      desc: 'Sleek hairline border without corner ornaments or top decorative crests'
    }
  };

  function normalizeInputStyle(rawStyle) {
    if (rawStyle === 'sync') return 'thematic';
    if (rawStyle === 'double_gold') return 'ornamental';
    if (INPUT_STYLES[rawStyle]) return rawStyle;
    return 'thematic';
  }

  function getState() {
    const init = window.__AGY_INITIAL_CONFIG__ || {};
    const allThemes = getAllThemes();
    const allKeys = Object.keys(allThemes);
    const defKey = allKeys[0] || DEFAULT_THEME_KEY;
    const rawTheme = localStorage.getItem(STORAGE_THEME) || init.themeName || defKey;
    const themeName = allThemes[rawTheme] ? rawTheme : defKey;
    const rawBubble = localStorage.getItem(STORAGE_BUBBLE) || init.bubbleName || themeName;
    const bubbleName = allThemes[rawBubble] ? rawBubble : themeName;
    const rawInput = localStorage.getItem(STORAGE_INPUT) || init.inputStyle || 'thematic';
    const inputStyle = normalizeInputStyle(rawInput);
    const dimming = parseInt(localStorage.getItem(STORAGE_DIMMING) || (init.dimming !== undefined ? init.dimming : '69'), 10);
    const wpEnabled = localStorage.getItem(STORAGE_WP_ENABLED) !== null
      ? localStorage.getItem(STORAGE_WP_ENABLED) !== 'false'
      : (init.wpEnabled !== undefined ? init.wpEnabled : true);
    const customWp = localStorage.getItem(STORAGE_CUSTOM_WP) || init.customWp || '';
    const userAvatar = localStorage.getItem(STORAGE_USER_AVATAR) ?? init.userAvatar ?? '';
    const agentAvatar = localStorage.getItem(STORAGE_AGENT_AVATAR) ?? init.agentAvatar ?? '';
    const bgMode = localStorage.getItem(STORAGE_BG_MODE) || init.bgMode || 'static';
    return { themeName, bubbleName, inputStyle, dimming, wpEnabled, customWp, userAvatar, agentAvatar, bgMode };
  }

  // Downscale user/agent avatar uploads to 192x192 WebP once so theme_config.json stays tiny
  function compressAvatarFile(file, callback) {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          const size = 192;
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          const natW = img.naturalWidth || size;
          const natH = img.naturalHeight || size;
          const side = Math.min(natW, natH);
          const sx = Math.max(0, Math.floor((natW - side) / 2));
          const sy = Math.max(0, Math.floor((natH - side) / 2));
          ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
          const out = canvas.toDataURL('image/webp', 0.88);
          callback(out && out.startsWith('data:image/webp') ? out : canvas.toDataURL('image/png'));
        } catch (e) {
          callback(String(reader.result || ''));
        }
      };
      img.onerror = () => callback(String(reader.result || ''));
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  }

  // Pre-bake L-shaped header/sidebar glass blur once per theme/dimming change to avoid per-frame GPU backdrop readback
  function syncPrebakedGlass(wpUrl, overlayRgb, overlayAlpha, tintBg, blurStr) {
    const shell = document.querySelector('.agy-shell');
    if (!wpUrl) {
      if (shell) shell.style.removeProperty('--agy-l-glass-bg');
      return;
    }
    const key = `${wpUrl.slice(0, 64)}|${wpUrl.length}|${overlayRgb}|${overlayAlpha.toFixed(3)}|${tintBg}|${blurStr}`;
    window.__AGY_BLUR_CACHE__ = window.__AGY_BLUR_CACHE__ || {};
    const cached = window.__AGY_BLUR_CACHE__[key];
    if (cached) {
      if (shell) shell.style.setProperty('--agy-l-glass-bg', 'url("' + cached + '")');
      return;
    }
    const img = new Image();
    img.onload = () => {
      try {
        const w = 640;
        const h = Math.max(180, Math.round((img.naturalHeight || 1440) * (w / (img.naturalWidth || 2560))));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const pxMatch = String(blurStr || '3px').match(/(\d+(?:\.\d+)?)/);
        const scaledBlur = Math.max(1, Math.min(8, Math.round((pxMatch ? parseFloat(pxMatch[1]) : 3) * 0.75)));
        ctx.filter = `blur(${scaledBlur}px)`;
        ctx.drawImage(img, -12, -12, w + 24, h + 24);
        ctx.filter = 'none';
        ctx.fillStyle = `rgba(${overlayRgb}, ${overlayAlpha})`;
        ctx.fillRect(0, 0, w, h);
        if (tintBg) {
          ctx.fillStyle = tintBg;
          ctx.fillRect(0, 0, w, h);
        }
        const baked = canvas.toDataURL('image/webp', 0.85);
        window.__AGY_BLUR_CACHE__[key] = baked;
        const curShell = document.querySelector('.agy-shell');
        if (curShell) curShell.style.setProperty('--agy-l-glass-bg', 'url("' + baked + '")');
      } catch (e) {}
    };
    img.src = wpUrl;
  }

  function applyTheme(overrides = {}) {
    const st = { ...getState(), ...overrides };
    try {
      localStorage.setItem(STORAGE_THEME, st.themeName);
      localStorage.setItem(STORAGE_BUBBLE, st.bubbleName);
      localStorage.setItem(STORAGE_INPUT, st.inputStyle);
      localStorage.setItem(STORAGE_DIMMING, String(st.dimming));
      localStorage.setItem(STORAGE_WP_ENABLED, String(st.wpEnabled));
      if (overrides.customWp !== undefined) {
        localStorage.setItem(STORAGE_CUSTOM_WP, overrides.customWp);
      }
      if (overrides.userAvatar !== undefined) {
        localStorage.setItem(STORAGE_USER_AVATAR, overrides.userAvatar);
      }
      if (overrides.agentAvatar !== undefined) {
        localStorage.setItem(STORAGE_AGENT_AVATAR, overrides.agentAvatar);
      }
      if (overrides.bgMode !== undefined) {
        localStorage.setItem(STORAGE_BG_MODE, overrides.bgMode);
      }
    } catch (e) {}

    if (window.agySaveThemeConfig) {
      try {
        window.agySaveThemeConfig(JSON.stringify(st));
      } catch (e) {}
    }

    const allThemes = getAllThemes();
    const mainTheme = allThemes[st.themeName] || allThemes[DEFAULT_THEME_KEY] || {};
    const bubbleTheme = allThemes[st.bubbleName] || mainTheme;
    const wpUrl = st.customWp || mainTheme.wallpaper || '';

    const oldLegacy = document.getElementById('antigravity-ho-ly-chibi-theme');
    if (oldLegacy) oldLegacy.remove();

    let styleEl = document.getElementById('antigravity-custom-theme-active');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'antigravity-custom-theme-active';
      document.head.appendChild(styleEl);
    }

    const overlayAlpha = mainTheme.clearBackdrop
      ? Math.min(0.92, Math.max(0.0, ((st.dimming - 10) / 82) * 0.85))
      : Math.min(0.92, Math.max(0.12, (st.dimming / 100) * 0.78));
    const overlayRgb = mainTheme.overlayRgb || '10, 7, 6';
    const bgPosition = mainTheme.bgPosition || 'center center';
    const secondaryGlowStop = mainTheme.secondaryGlow
      ? `, radial-gradient(circle at 22% 72%, ${mainTheme.secondaryGlow} 0%, transparent 55%)`
      : '';

    let bgLayers = '';
    if (wpUrl) {
      bgLayers = mainTheme.clearBackdrop
        ? `linear-gradient(180deg, rgba(${overlayRgb}, ${overlayAlpha}) 0%, rgba(${overlayRgb}, ${overlayAlpha}) 100%), url("${wpUrl}")`
        : `radial-gradient(circle at 75% 40%, ${mainTheme.glow} 0%, transparent 65%)${secondaryGlowStop}, linear-gradient(180deg, rgba(${overlayRgb}, ${overlayAlpha * 0.85}) 0%, rgba(${overlayRgb}, ${overlayAlpha}) 100%), url("${wpUrl}")`;
    } else {
      bgLayers = mainTheme.pureBg || `radial-gradient(circle at 75% 30%, ${mainTheme.glow} 0%, transparent 60%), linear-gradient(160deg, rgba(${overlayRgb}, 0.96) 0%, #070910 100%)`;
    }

    const isLive = Boolean(st.wpEnabled && st.bgMode === 'live');
    const wpCss = st.wpEnabled ? `
      .agy-shell {
        position: relative !important;
        ${isLive ? 'background-image: none !important; background-color: transparent !important;' : `
        background-image: ${bgLayers} !important;
        background-size: cover !important;
        background-position: ${bgPosition} !important;
        background-repeat: no-repeat !important;
        image-rendering: auto !important;`}
      }
      /* Ensure live video container stays firmly in background */
      #agy-live-video-container {
        position: absolute !important;
        inset: 0 !important;
        width: 100% !important;
        height: 100% !important;
        z-index: 0 !important;
        pointer-events: none !important;
        overflow: hidden !important;
        clip-path: var(--agy-hole-clip, none) !important;
      }
      #agy-live-video {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
        display: block !important;
        pointer-events: none !important;
      }
      #agy-live-scrim {
        position: absolute !important;
        inset: 0 !important;
        width: 100% !important;
        height: 100% !important;
        pointer-events: none !important;
        z-index: 1 !important;
        transition: background-color 0.1s ease !important;
      }
      .agy-shell > div.agy-inset-shell,
      .agy-shell > div:not(#agy-live-video-container) {
        position: relative !important;
        z-index: 2 !important;
      }
      /* Keep transparent scrollers on GPU composited-scrolling layers */
      .agy-shell .overflow-y-auto {
        will-change: scroll-position;
      }
      .agy-sheet,
      .agy-inset-shell,
      .browser-hole-opaque,
      [data-main-content-body="true"],
      [data-side-panel-body="true"],
      [class*="agy-inset-shell"],
      [class*="--shell-canvas"],
      .agy-shell div.absolute.bottom-0.pointer-events-none,
      .agy-shell [class*="z-50"] .pointer-events-none.right-full,
      .agy-shell .bg-background:not(.settings-modal-container):not(.settings-modal-container *):not(#agy-custom-theme-modal-backdrop *) {
        background: transparent !important;
        background-color: transparent !important;
        background-image: none !important;
      }
      /* Browser split-pane hole cutout: keep wallpaper & L-glass visible outside [data-browser-hole] without covering live BrowserView */
      body[data-has-browser-hole="true"] .agy-shell[data-agy-hole-active="1"]::after {
        content: "";
        position: absolute;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        background-image: ${bgLayers};
        background-size: cover;
        background-position: ${bgPosition};
        background-repeat: no-repeat;
        clip-path: var(--agy-hole-clip, none);
        will-change: transform;
      }
      body[data-has-browser-hole="true"] .agy-shell[data-agy-hole-active="1"] > :not([data-has-browser-hole="true"]):not([data-browser-hole]:not([data-browser-hole="false"])):not(.settings-modal-container),
      body[data-has-browser-hole="true"] .agy-shell[data-agy-hole-active="1"] .browser-hole-opaque:not([data-has-browser-hole="true"]),
      body[data-has-browser-hole="true"] .agy-shell[data-agy-hole-active="1"] [data-pane-id]:not([data-has-browser-hole="true"]),
      body[data-has-browser-hole="true"] .agy-shell[data-agy-hole-active="1"] [data-tiling-pane]:not([data-has-browser-hole="true"]),
      body[data-has-browser-hole="true"] .agy-shell[data-agy-hole-active="1"] [data-main-content-header]:not([data-has-browser-hole="true"]),
      body[data-has-browser-hole="true"] .agy-shell[data-agy-hole-active="1"] [data-side-panel-strip]:not([data-has-browser-hole="true"]) {
        background: transparent !important;
        background-color: transparent !important;
        background-image: none !important;
      }
      body[data-has-browser-hole="true"] .agy-shell[data-agy-hole-active="1"] :is([data-main-content-body], [data-side-panel-body]):not([data-has-browser-hole="true"]) {
        box-shadow: none !important;
      }
      body[data-has-browser-hole="true"] .agy-shell[data-agy-hole-active="1"] [data-split-sash] {
        background: rgba(56, 189, 248, 0.14) !important;
        background-image: none !important;
      }
    ` : `
      .agy-shell {
        background: #111113 !important;
      }
    `;

    const curInputStyle = normalizeInputStyle(st.inputStyle);
    const primaryColor = bubbleTheme.primary || '#38bdf8';
    const secondaryColor = bubbleTheme.secondary || primaryColor;
    const cornerFiligreeUrl = bubbleTheme.cornerSvg || getThematicCornerSvg(primaryColor, secondaryColor);
    const crestOrnamentUrl = bubbleTheme.sticker || getThematicCrestSvg(primaryColor, secondaryColor);
    const isOrnamental = curInputStyle === 'ornamental';
    const isThematic = curInputStyle === 'thematic';
    const isGlass = curInputStyle === 'glass';
    const isMinimal = curInputStyle === 'minimal';

    const bubbleStickerCss = isOrnamental ? `
      .group\\/user-input-step {
        padding-top: 18px !important;
      }
      .agy-user-bubble-frame::before {
        content: "";
        position: absolute;
        top: -11px;
        right: 14px;
        width: 76px;
        height: 18px;
        background-image: url("${crestOrnamentUrl}");
        background-size: contain;
        background-position: center;
        background-repeat: no-repeat;
        z-index: 25;
        pointer-events: none;
        filter: drop-shadow(0 2px 6px ${bubbleTheme.glow});
        transition: transform 0.2s ease;
      }
    ` : `
      .group\\/user-input-step {
        padding-top: 4px !important;
      }
      .agy-user-bubble-frame::before { display: none !important; }
    `;

    const inputStickerCss = isOrnamental ? `
      .surface-composer {
        margin-top: 18px !important;
        overflow: visible !important;
      }
      .surface-composer::before {
        content: "";
        position: absolute;
        top: -12px;
        right: 28px;
        width: 96px;
        height: 22px;
        background-image: url("${crestOrnamentUrl}");
        background-size: contain;
        background-position: center;
        background-repeat: no-repeat;
        z-index: 30;
        pointer-events: none;
        filter: drop-shadow(0 2px 8px ${bubbleTheme.glow});
      }
      .surface-composer::after {
        content: "";
        position: absolute;
        top: 3px;
        left: 4px;
        width: 18px;
        height: 18px;
        background-image: url("${cornerFiligreeUrl}");
        background-size: contain;
        background-repeat: no-repeat;
        z-index: 25;
        pointer-events: none;
        opacity: 0.92;
      }
      .surface-composer-card::after {
        content: "";
        position: absolute;
        bottom: 3px;
        right: 4px;
        width: 18px;
        height: 18px;
        background-image: url("${cornerFiligreeUrl}");
        background-size: contain;
        background-repeat: no-repeat;
        transform: rotate(180deg);
        z-index: 25;
        pointer-events: none;
        opacity: 0.85;
      }
    ` : (isThematic ? `
      .surface-composer {
        margin-top: 6px !important;
        overflow: visible !important;
      }
      .surface-composer::before { display: none !important; }
      .surface-composer::after {
        content: "";
        position: absolute;
        top: 3px;
        left: 4px;
        width: 16px;
        height: 16px;
        background-image: url("${cornerFiligreeUrl}");
        background-size: contain;
        background-repeat: no-repeat;
        z-index: 25;
        pointer-events: none;
        opacity: 0.75;
      }
      .surface-composer-card::after { display: none !important; }
    ` : `
      .surface-composer::before,
      .surface-composer::after,
      .surface-composer-card::after { display: none !important; }
    `);

    const inputCardBg =
      isGlass
        ? (bubbleTheme.inputGlassBg || 'rgba(16, 20, 30, 0.48)')
        : (bubbleTheme.inputCardBg || 'rgba(18, 24, 38, 0.90)');

    const inputOuterBorder =
      isOrnamental
        ? `linear-gradient(135deg, ${primaryColor}f0 0%, ${secondaryColor}d9 35%, ${primaryColor}c8 65%, ${secondaryColor}f0 100%)`
        : isThematic
        ? bubbleTheme.frameBg
        : isGlass
        ? 'rgba(255, 255, 255, 0.16)'
        : 'rgba(255, 255, 255, 0.12)';

    const sidebarBg = mainTheme.sidebarBg || 'rgba(14, 10, 8, 0.68)';
    const sidebarHoverBg = mainTheme.sidebarHoverBg || 'rgba(255, 255, 255, 0.08)';
    const btnBg = mainTheme.btnBg || 'rgba(48, 30, 22, 0.62)';
    const modalBg = mainTheme.modalBg || 'rgba(14, 12, 12, 0.96)';
    const innerBubbleBorder = bubbleTheme.isScroll
      ? '2px solid #78350f'
      : (bubbleTheme.innerBorder || '1px solid rgba(255, 255, 255, 0.06)');

    const isLight = Boolean(mainTheme.isLight);
    const uiInk = mainTheme.uiTextColor || (isLight ? '#0f172a' : 'rgba(248, 250, 252, 0.96)');
    const uiMutedInk = mainTheme.uiMutedColor || (isLight ? '#334155' : 'rgba(241, 245, 249, 0.92)');
    const uiShadow = isLight ? 'none' : '0 1px 4px rgba(0, 0, 0, 0.92), 0 0 8px rgba(0, 0, 0, 0.68)';
    const pillBg = mainTheme.pillBg || (isLight ? 'rgba(255, 255, 255, 0.78)' : 'rgba(6, 11, 24, 0.78)');
    const pillHoverBg = mainTheme.pillHoverBg || (isLight ? 'rgba(255, 255, 255, 0.94)' : 'rgba(10, 18, 38, 0.92)');
    const pillText = mainTheme.pillTextColor || (isLight ? '#0f172a' : '#f8fafc');
    const pillBorder = mainTheme.pillBorder || (isLight ? 'rgba(15, 23, 42, 0.16)' : 'rgba(255, 255, 255, 0.16)');
    const preCodeBg = isLight ? `rgba(${overlayRgb}, 0.72)` : `rgba(${overlayRgb}, 0.56)`;

    const effectiveUserAvatar = st.userAvatar === 'none' ? '' : (st.userAvatar || mainTheme.userAvatar || '');
    const effectiveAgentAvatar = st.agentAvatar === 'none' ? '' : (st.agentAvatar || mainTheme.agentAvatar || '');

    const avatarCss = `
      ${effectiveUserAvatar ? `
      .agy-shell [data-testid="user-message"] {
        position: relative !important;
        padding-right: 42px !important;
      }
      .agy-shell [data-testid="user-message"]::after {
        content: "";
        position: absolute;
        right: 0;
        bottom: 6px;
        width: 32px;
        height: 32px;
        border-radius: 9999px;
        background-image: url("${effectiveUserAvatar}");
        background-size: cover;
        background-position: center;
        border: 1.5px solid ${mainTheme.primary};
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4), 0 0 8px ${mainTheme.glow};
        pointer-events: none;
      }
      ` : ''}
      ${effectiveAgentAvatar ? `
      .agy-shell [data-testid="agent-response"] {
        position: relative !important;
        padding-left: 52px !important;
        min-height: 50px !important;
      }
      .agy-shell [data-testid="agent-response"]::before {
        content: "";
        position: absolute;
        top: 12px;
        left: 12px;
        width: 30px;
        height: 30px;
        border-radius: 9999px;
        background-image: url("${effectiveAgentAvatar}");
        background-size: cover;
        background-position: center;
        border: 1.5px solid ${mainTheme.secondary || mainTheme.primary};
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4), 0 0 8px ${mainTheme.secondaryGlow || mainTheme.glow};
        pointer-events: none;
      }
      ` : ''}
    `;

    const sidebarEnhanceCss = (mainTheme.sidebarEnhanceText || isLight) ? `
      .agy-shell .bg-sidebar a,
      .agy-shell .bg-sidebar span,
      .agy-shell .bg-sidebar button {
        color: ${isLight ? uiInk : 'inherit'};
        text-shadow: ${isLight ? 'none' : '0 1px 3px rgba(0, 0, 0, 0.88)'};
      }
      .agy-shell .bg-sidebar .text-muted-foreground,
      .agy-shell .bg-sidebar .text-secondary-foreground {
        color: ${uiMutedInk} !important;
      }
    ` : '';

    const aiCardCss = mainTheme.aiCardBg ? `
      /* Translucent reading card for AI responses (zero live backdrop-filter for max 120fps scroll) */
      .agy-shell [data-testid="agent-response"] {
        background: ${mainTheme.aiCardBg} !important;
        ${isLight ? `color: ${uiInk} !important;` : ''}
        backdrop-filter: none !important;
        border: 1px solid ${mainTheme.aiCardBorder || (isLight ? 'rgba(15, 23, 42, 0.12)' : 'rgba(255, 255, 255, 0.1)')} !important;
        border-radius: 14px !important;
        padding: 12px 16px !important;
        box-shadow: ${isLight ? '0 4px 14px rgba(15, 23, 42, 0.08)' : '0 4px 14px rgba(0, 0, 0, 0.28)'} !important;
        box-sizing: border-box !important;
      }
      ${isLight ? `
      .agy-shell [data-main-content-body="true"],
      .agy-shell [data-testid="agent-response"] :is(p, li, span, code, h1, h2, h3, h4, strong, td, th) {
        color: ${uiInk};
      }
      ` : ''}
      .agy-shell [data-main-content-body="true"] h1,
      .agy-shell [data-main-content-body="true"] h2 {
        text-shadow: ${isLight ? 'none' : '0 2px 10px rgba(0, 0, 0, 0.85)'};
      }
    ` : '';

    const useUnifiedGlass = Boolean(st.wpEnabled && wpUrl && mainTheme.unifiedGlass);
    if (useUnifiedGlass && typeof syncShellMetrics === 'function') {
      syncShellMetrics();
    }
    if (useUnifiedGlass) {
      syncPrebakedGlass(wpUrl, overlayRgb, overlayAlpha, mainTheme.headerBg || '', mainTheme.headerBlur || '3px');
    } else {
      syncPrebakedGlass(null);
    }

    const sidePanelCss = st.wpEnabled ? `
      /* Frosted pre-baked glass + dark/light reading scrim for right-side Artifact / Text / Diff split panels */
      ${useUnifiedGlass ? `
      .agy-shell[data-agy-side-glass="1"]::before {
        clip-path: polygon(
          evenodd,
          0 0,
          100% 0,
          100% var(--agy-hdr-h, 75px),
          var(--agy-sidebar-w, 256px) var(--agy-hdr-h, 75px),
          var(--agy-sidebar-w, 256px) 100%,
          0 100%,
          0 0,
          var(--agy-side-l, 100%) var(--agy-side-t, 75px),
          var(--agy-side-r, 100%) var(--agy-side-t, 75px),
          var(--agy-side-r, 100%) var(--agy-side-b, 100%),
          var(--agy-side-l, 100%) var(--agy-side-b, 100%),
          var(--agy-side-l, 100%) var(--agy-side-t, 75px)
        ) !important;
      }
      ` : ''}
      body:not([data-has-browser-hole="true"]) .agy-shell [data-side-panel-body="true"]:not([data-has-browser-hole="true"]):not(:has([data-browser-hole]:not([data-browser-hole="false"]))) {
        background: ${mainTheme.aiCardBg || `rgba(${overlayRgb}, 0.72)`} !important;
        ${isLight ? `color: ${uiInk} !important;` : ''}
        backdrop-filter: none !important;
        border-left: 1px solid ${mainTheme.aiCardBorder || (isLight ? 'rgba(15, 23, 42, 0.14)' : 'rgba(255, 255, 255, 0.14)')} !important;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04) !important;
      }
      body:not([data-has-browser-hole="true"]) .agy-shell [data-side-panel-body="true"]:not([data-has-browser-hole="true"]):not(:has([data-browser-hole]:not([data-browser-hole="false"]))) pre {
        background: ${preCodeBg} !important;
        border: 1px solid ${mainTheme.aiCardBorder || (isLight ? 'rgba(15, 23, 42, 0.14)' : 'rgba(255, 255, 255, 0.14)')} !important;
        border-radius: 10px !important;
      }
      .agy-shell [data-side-panel-body="true"] :is(h1, h2, h3, h4) {
        ${isLight ? `color: ${uiInk} !important;` : ''}
        text-shadow: ${isLight ? 'none' : '0 1px 6px rgba(0, 0, 0, 0.85)'};
      }
    ` : '';

    const headerCss = mainTheme.headerBg ? `
      /* Frosted top titlebar & seamless L-shaped unified glass (zero live backdrop-filter) */
      ${useUnifiedGlass ? `
      .agy-shell {
        position: relative !important;
      }
      .agy-shell > div.agy-inset-shell,
      .agy-shell > div:not(#agy-live-video-container) {
        position: relative !important;
        z-index: 2 !important;
      }
      .agy-shell::before {
        content: "";
        position: absolute;
        inset: 0;
        z-index: 1;
        pointer-events: none;
        background-color: ${mainTheme.headerBg};
        background-image: var(--agy-l-glass-bg, none);
        background-size: cover;
        background-position: ${bgPosition};
        background-repeat: no-repeat;
        backdrop-filter: none !important;
        will-change: transform;
        clip-path: polygon(
          0 0,
          100% 0,
          100% var(--agy-hdr-h, 75px),
          var(--agy-sidebar-w, 256px) var(--agy-hdr-h, 75px),
          var(--agy-sidebar-w, 256px) 100%,
          0 100%
        );
      }
      .agy-shell [class*="@container/titlebar"] {
        background: transparent !important;
        backdrop-filter: none !important;
        border-bottom: 1px solid ${mainTheme.headerBorder || 'rgba(56, 189, 248, 0.10)'} !important;
      }
      ` : `
      .agy-shell [class*="@container/titlebar"] {
        background: ${mainTheme.headerBg} !important;
        backdrop-filter: none !important;
        border-bottom: 1px solid ${mainTheme.headerBorder || 'rgba(56, 189, 248, 0.15)'} !important;
      }
      `}
      .agy-shell [class*="@container/titlebar"] [data-testid="breadcrumb-segment"],
      .agy-shell [class*="@container/titlebar"] [data-testid="pane-titlebar-toolbar"] button,
      .agy-shell [class*="@container/titlebar"] [data-testid="pane-titlebar-toolbar"] span {
        color: ${uiInk} !important;
        text-shadow: ${uiShadow};
      }
      .agy-shell [class*="@container/titlebar"] [data-testid="pane-titlebar-toolbar"] button.border {
        background: ${isLight ? 'rgba(255, 255, 255, 0.56)' : 'rgba(6, 11, 24, 0.36)'} !important;
        border-color: ${pillBorder} !important;
      }
    ` : '';

    const sidebarOuterCss = useUnifiedGlass ? `
      .agy-shell aside,
      .agy-shell [data-sidebar="true"],
      .agy-shell .bg-sidebar {
        background: transparent !important;
        backdrop-filter: none !important;
      }
    ` : `
      .agy-shell aside,
      .agy-shell [data-sidebar="true"],
      .agy-shell .bg-sidebar {
        background: ${sidebarBg} !important;
        backdrop-filter: none !important;
      }
    `;

    styleEl.textContent = `
      ${wpCss}

      /* Translucent themed sidebar (unified via ::before when unifiedGlass is active) */
      ${sidebarOuterCss}
      .agy-shell .bg-sidebar .bg-sidebar,
      .agy-shell [data-sidebar="true"] .bg-sidebar,
      .agy-shell .bg-sidebar [class*="group/headerbtn"],
      .agy-shell .bg-sidebar [class*="group/section-header"] {
        background: transparent !important;
        backdrop-filter: none !important;
      }
      /* Preserve virtual list positioning; hide sticky headers only while scrolled */
      .agy-shell .bg-sidebar .agy-scrolled > .w-full.relative > .bg-sidebar[style*="position: sticky"] {
        opacity: 0 !important;
        pointer-events: none !important;
        transition: opacity 0.14s ease !important;
      }
      .agy-shell .bg-sidebar [class*="group/headerbtn"]:hover,
      .agy-shell .bg-sidebar a:hover {
        background: ${sidebarHoverBg} !important;
      }
      ${sidebarEnhanceCss}
      ${aiCardCss}
      ${sidePanelCss}
      ${avatarCss}
      ${headerCss}

      /* "+ New Conversation" button glow */
      .agy-button-custom.border.border-border {
        background: ${btnBg} !important;
        border-color: ${mainTheme.borderColor} !important;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3) !important;
      }

      /* User Chat Bubble Double-Border Frame & Ornament */
      .agy-user-bubble-frame {
        background: ${isOrnamental
          ? `linear-gradient(135deg, ${primaryColor}f0 0%, ${secondaryColor}d9 50%, ${primaryColor}f0 100%)`
          : isThematic
          ? bubbleTheme.frameBg
          : (isGlass ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.12)')
        } !important;
        border-radius: ${bubbleTheme.isScroll ? '6px' : '14px'} !important;
        box-shadow: ${isOrnamental
          ? `0 6px 24px rgba(0, 0, 0, 0.55), 0 0 16px ${bubbleTheme.glow}`
          : isThematic
          ? `0 4px 18px rgba(0, 0, 0, 0.45), 0 0 12px ${bubbleTheme.glow}`
          : `0 2px 10px rgba(0, 0, 0, 0.3)`
        } !important;
        position: relative !important;
        overflow: visible !important;
        padding: ${isOrnamental ? '1.5px' : isThematic ? '1.2px' : '1px'} !important;
      }

      .agy-user-bubble-frame::after {
        ${(isOrnamental || isThematic) ? `
        content: "";
        position: absolute;
        top: 3px;
        left: 3px;
        width: ${isOrnamental ? '18px' : '15px'};
        height: ${isOrnamental ? '18px' : '15px'};
        background-image: url("${cornerFiligreeUrl}");
        background-size: contain;
        background-repeat: no-repeat;
        pointer-events: none;
        opacity: ${isOrnamental ? '0.92' : '0.75'};
        z-index: 25;
        ` : 'display: none !important;'}
      }

      .agy-user-bubble {
        background: ${isGlass
          ? (bubbleTheme.inputGlassBg || 'rgba(14, 18, 28, 0.55)')
          : isMinimal
          ? 'rgba(16, 18, 26, 0.94)'
          : bubbleTheme.bg
        } !important;
        border-radius: ${bubbleTheme.isScroll ? '5px' : '13px'} !important;
        padding: 8px 16px !important;
        color: ${bubbleTheme.textColor || '#f8fafc'} !important;
        border: ${isGlass ? '1px solid rgba(255, 255, 255, 0.1)' : (bubbleTheme.innerBorder || '1px solid rgba(255, 255, 255, 0.08)')} !important;
        overflow: visible !important;
        font-weight: 450 !important;
      }

      .agy-user-bubble * {
        color: ${bubbleTheme.textColor || '#f8fafc'} !important;
      }

      /* Double-Border Input Composer */
      .surface-composer {
        background: ${inputOuterBorder} !important;
        border-radius: 16px !important;
        padding: ${isOrnamental ? '1.8px' : isThematic ? '1.5px' : '1px'} !important;
        box-shadow: ${isOrnamental
          ? `0 8px 30px rgba(0, 0, 0, 0.55), 0 0 18px ${bubbleTheme.glow}, 0 0 32px ${bubbleTheme.secondaryGlow || bubbleTheme.glow}`
          : isThematic
          ? `0 6px 24px rgba(0, 0, 0, 0.5), 0 0 14px ${bubbleTheme.glow}`
          : `0 2px 12px rgba(0, 0, 0, 0.3)`
        } !important;
        position: relative !important;
      }

      .surface-composer-card {
        background: ${inputCardBg} !important;
        backdrop-filter: none !important;
        border-radius: 14.5px !important;
        position: relative !important;
        border: ${isGlass
          ? '1px solid rgba(255, 255, 255, 0.08)'
          : isMinimal
          ? '1px solid rgba(255, 255, 255, 0.06)'
          : (bubbleTheme.innerBorder || '1px solid rgba(255, 255, 255, 0.08)')
        } !important;
      }

      /* High-contrast pill badges for top composer bar (adaptive light/dark theme) */
      .surface-composer [data-testid="project-selector-trigger"],
      .surface-composer [data-testid="branch-pill-trigger"],
      .surface-composer [aria-label="Select Environment"],
      .surface-composer > :not(.surface-composer-card) [data-testid="input-box-bottom-toolbar"] button,
      .surface-composer > :not(.surface-composer-card) [data-testid="input-box-bottom-toolbar"] [role="button"] {
        background: ${pillBg} !important;
        color: ${pillText} !important;
        border: 1px solid ${pillBorder} !important;
        border-radius: 9999px !important;
        font-weight: 500 !important;
        box-shadow: 0 1px 6px rgba(0, 0, 0, 0.25) !important;
        margin: 1px 2px !important;
        transition: background-color 0.15s ease, border-color 0.15s ease !important;
      }
      .surface-composer [data-testid="branch-pill-trigger"],
      .surface-composer [aria-label="Select Environment"],
      .surface-composer > :not(.surface-composer-card) [data-testid="input-box-bottom-toolbar"] button:not([data-testid="project-selector-trigger"]),
      .surface-composer > :not(.surface-composer-card) [data-testid="input-box-bottom-toolbar"] [role="button"]:not([data-testid="project-selector-trigger"]) {
        padding-left: 8px !important;
        padding-right: 7px !important;
        gap: 4px !important;
      }
      .surface-composer [data-testid="project-selector-trigger"]:hover,
      .surface-composer [data-testid="branch-pill-trigger"]:hover,
      .surface-composer [aria-label="Select Environment"]:hover,
      .surface-composer > :not(.surface-composer-card) [data-testid="input-box-bottom-toolbar"] button:hover,
      .surface-composer > :not(.surface-composer-card) [data-testid="input-box-bottom-toolbar"] [role="button"]:hover {
        background: ${pillHoverBg} !important;
        border-color: ${mainTheme.borderColor} !important;
        color: ${pillText} !important;
      }
      .surface-composer [data-testid="project-selector-trigger"] *,
      .surface-composer [data-testid="branch-pill-trigger"] *,
      .surface-composer [aria-label="Select Environment"] *,
      .surface-composer > :not(.surface-composer-card) [data-testid="input-box-bottom-toolbar"] button *,
      .surface-composer > :not(.surface-composer-card) [data-testid="input-box-bottom-toolbar"] [role="button"] * {
        color: ${pillText} !important;
      }
      .surface-composer > :not(.surface-composer-card) [data-testid="input-box-bottom-toolbar"] .ml-auto > * {
        background: ${pillBg} !important;
        color: ${pillText} !important;
        border-radius: 9999px !important;
        padding: 2px 8px !important;
      }

      ${bubbleStickerCss}
      ${inputStickerCss}

      @media (max-width: 640px) {
        .agy-user-bubble-frame::before,
        .surface-composer::before {
          transform: scale(0.78);
          transform-origin: bottom right;
        }
      }

      .settings-modal-container {
        background: ${modalBg} !important;
        border: 1px solid ${mainTheme.borderColor} !important;
        box-shadow: 0 12px 48px rgba(0, 0, 0, 0.75), 0 0 24px ${mainTheme.glow} !important;
        backdrop-filter: none !important;
      }

      #agy-custom-theme-modal-dialog {
        background: ${modalBg} !important;
        border-color: ${mainTheme.borderColor} !important;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.9), 0 0 32px ${mainTheme.glow} !important;
      }
      #agy-custom-theme-modal-header {
        background: ${mainTheme.modalHeaderBg || 'rgba(22, 16, 14, 0.85)'} !important;
      }
      #agy-custom-theme-badge {
        color: ${mainTheme.primary} !important;
        border-color: ${mainTheme.borderColor} !important;
        background: ${mainTheme.glow} !important;
      }
      #agy-custom-theme-sidebar-btn svg {
        color: ${mainTheme.primary} !important;
      }
    `;

    syncLiveWallpaper(st, overlayRgb, overlayAlpha);
    syncTitleBarOverlay(st);
    scheduleTitleBarSync(st);
  }
  window.__AGY_APPLY_THEME__ = applyTheme;

  function syncLiveWallpaper(st, overlayRgb, overlayAlpha) {
    const shell = document.querySelector('.agy-shell');
    if (!shell) return;

    let container = document.getElementById('agy-live-video-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'agy-live-video-container';
      container.style.cssText = 'position: absolute !important; inset: 0 !important; width: 100% !important; height: 100% !important; z-index: 0 !important; pointer-events: none !important; overflow: hidden !important; clip-path: var(--agy-hole-clip, none) !important; display: none;';

      const video = document.createElement('video');
      video.id = 'agy-live-video';
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.playsInline = true;
      video.style.cssText = 'width: 100% !important; height: 100% !important; object-fit: cover !important; display: block !important; pointer-events: none !important;';

      const scrim = document.createElement('div');
      scrim.id = 'agy-live-scrim';
      scrim.style.cssText = 'position: absolute !important; inset: 0 !important; width: 100% !important; height: 100% !important; pointer-events: none !important; z-index: 1 !important; transition: background-color 0.1s ease !important;';

      container.appendChild(video);
      container.appendChild(scrim);
      shell.appendChild(container); // Append as background layer so it NEVER disturbs main UI flow
    }

    const video = document.getElementById('agy-live-video');
    const scrim = document.getElementById('agy-live-scrim');

    if (st.wpEnabled && st.bgMode === 'live') {
      container.style.display = 'block';
      if (scrim) {
        scrim.style.backgroundColor = `rgba(${overlayRgb}, ${overlayAlpha})`;
      }
      if (video) {
        const allThemes = getAllThemes();
        const activeTheme = allThemes[st.themeName] || {};
        const targetVideoKey = activeTheme.videoKey || 'active_live_mp4';

        if (video.getAttribute('data-video-key') !== targetVideoKey || !video.src) {
          getLiveVideoBlob(targetVideoKey).then((blob) => {
            if (blob) {
              window.__AGY_HAS_LIVE_VIDEO__ = true;
              if (window.__AGY_ACTIVE_BLOB_URL__) {
                try { URL.revokeObjectURL(window.__AGY_ACTIVE_BLOB_URL__); } catch (_) {}
              }
              const url = URL.createObjectURL(blob);
              window.__AGY_ACTIVE_BLOB_URL__ = url;
              video.setAttribute('data-video-key', targetVideoKey);
              video.src = url;
              if (!document.hidden) video.play().catch(() => {});
            }
          });
        } else if (!document.hidden) {
          video.play().catch(() => {});
        }
      }
    } else {
      container.style.display = 'none';
      if (video) {
        video.pause();
      }
    }
  }

  function syncTitleBarOverlay(stOverride) {
    const st = stOverride || getState();
    const allTh = getAllThemes();
    const activeTh = allTh[st.themeName] || allTh[DEFAULT_THEME_KEY] || {};
    if (window.electronNative && typeof window.electronNative.setTitleBarOverlay === 'function') {
      try {
        window.electronNative.setTitleBarOverlay({
          color: st.wpEnabled ? '#00000000' : '#111114',
          symbolColor: (st.wpEnabled && activeTh.isLight) ? '#0f172a' : '#f8fafc'
        });
      } catch (e) {}
    }
  }

  function clearTitleBarTimers() {
    if (Array.isArray(window.__AGY_TBO_TIMERS__)) {
      window.__AGY_TBO_TIMERS__.forEach(id => clearTimeout(id));
    }
    window.__AGY_TBO_TIMERS__ = [];
  }

  function scheduleTitleBarSync(stOverride) {
    clearTitleBarTimers();
    const st = stOverride || getState();
    syncTitleBarOverlay(st);
    [300, 900, 2000, 4000, 7000].forEach(ms => {
      window.__AGY_TBO_TIMERS__.push(setTimeout(() => syncTitleBarOverlay(), ms));
    });
  }

  function removeCustomTheme() {
    clearTitleBarTimers();
    if (window.__AGY_SCROLL_AC__) {
      try { window.__AGY_SCROLL_AC__.abort(); } catch (e) {}
    }
    const styleEl = document.getElementById('antigravity-custom-theme-active');
    if (styleEl) styleEl.remove();
    const navBtn = document.getElementById('agy-custom-theme-sidebar-btn');
    if (navBtn) navBtn.remove();
    const settingsBtn = document.getElementById('agy-custom-theme-settings-btn');
    if (settingsBtn) settingsBtn.remove();
    const modal = document.getElementById('agy-custom-theme-modal-backdrop');
    if (modal) modal.remove();
    const liveContainer = document.getElementById('agy-live-video-container');
    if (liveContainer) liveContainer.remove();
    const shell = document.querySelector('.agy-shell');
    if (shell) {
      delete shell.dataset.agyHoleActive;
      shell.style.removeProperty('--agy-hole-clip');
      shell.style.removeProperty('--agy-l-glass-bg');
    }
    if (window.electronNative && typeof window.electronNative.setTitleBarOverlay === 'function') {
      try {
        window.electronNative.setTitleBarOverlay({ color: '#111114', symbolColor: '#f8fafc' });
      } catch (e) {}
    }
  }

  window.__ANTIGRAVITY_APPLY_CUSTOM_THEME__ = applyTheme;
  window.__ANTIGRAVITY_REMOVE_CUSTOM_THEME__ = removeCustomTheme;
  window.__ANTIGRAVITY_OPEN_THEME_MODAL__ = openCustomThemeModal;

  applyTheme();

  function openCustomThemeModal() {
    const settingsModal = document.querySelector('.settings-modal-container');
    if (settingsModal) {
      injectSettingsModalTab();
      activateSettingsCustomThemeTab(settingsModal);
      return;
    }
    const spans = Array.from(document.querySelectorAll('.bg-sidebar span'));
    const settingsSpan = spans.find(s => s.textContent.trim() === 'Settings');
    if (settingsSpan) {
      const btn = settingsSpan.closest('button, a, div[role="button"]') || settingsSpan.parentElement;
      if (btn) {
        btn.click();
        setTimeout(() => {
          const m = document.querySelector('.settings-modal-container');
          if (m) {
            injectSettingsModalTab();
            activateSettingsCustomThemeTab(m);
          }
        }, 120);
        return;
      }
    }

    let backdrop = document.getElementById('agy-custom-theme-modal-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'agy-custom-theme-modal-backdrop';
      backdrop.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 32px;
        background: rgba(0, 0, 0, 0.65);
        backdrop-filter: blur(10px);
      `;

      backdrop.innerHTML = `
        <div id="agy-custom-theme-modal-dialog" style="background: rgba(16, 12, 11, 0.97); border: 1.2px solid rgba(212, 148, 106, 0.35); border-radius: 18px; width: 100%; max-width: 900px; height: 86vh; max-height: 860px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 24px 64px rgba(0, 0, 0, 0.9), 0 0 32px rgba(224, 142, 85, 0.25); font-family: system-ui, -apple-system, sans-serif;">
          <div id="agy-custom-theme-modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 18px 26px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); background: rgba(22, 16, 14, 0.85);">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 17px; font-weight: 600; color: #f4f4f5; letter-spacing: -0.2px;">Custom Theme Studio</span>
              <span id="agy-custom-theme-badge" style="font-size: 11.5px; padding: 2.5px 9px; border-radius: 9999px; background: rgba(224, 142, 85, 0.2); color: #e08e55; font-weight: 500; border: 1px solid rgba(224, 142, 85, 0.3);">${THEME_KEYS.length} Preset${THEME_KEYS.length > 1 ? 's' : ''}</span>
            </div>
            <button id="agy-theme-modal-close-btn" type="button" style="background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.1); color: #d4d4d8; cursor: pointer; width: 30px; height: 30px; border-radius: 8px; font-size: 15px; display: flex; align-items: center; justify-content: center; transition: all 0.15s ease;">✕</button>
          </div>
          <div id="agy-theme-modal-body" style="flex: 1; overflow-y: auto; height: 100%;"></div>
        </div>
      `;

      document.body.appendChild(backdrop);

      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) backdrop.style.display = 'none';
      });
      backdrop.querySelector('#agy-theme-modal-close-btn').addEventListener('click', () => {
        backdrop.style.display = 'none';
      });
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && backdrop.style.display !== 'none') {
          backdrop.style.display = 'none';
        }
      });
    }

    backdrop.style.display = 'flex';
    const body = backdrop.querySelector('#agy-theme-modal-body');
    renderThemePanels(body);
  }

  function renderThemePanels(container) {
    const st = getState();
    const curInputStyle = normalizeInputStyle(st.inputStyle);
    const allThemes = getAllThemes();
    const allThemeKeys = Object.keys(allThemes);
    const mainTheme = allThemes[st.themeName] || allThemes[DEFAULT_THEME_KEY] || {};
    const effUserAv = st.userAvatar === 'none' ? '' : (st.userAvatar || mainTheme.userAvatar || '');
    const effAgentAv = st.agentAvatar === 'none' ? '' : (st.agentAvatar || mainTheme.agentAvatar || '');

    const topBadge = document.getElementById('agy-custom-theme-badge');
    if (topBadge) {
      topBadge.textContent = `${allThemeKeys.length} Preset${allThemeKeys.length > 1 ? 's' : ''}`;
    }

    container.innerHTML = `
      <div id="agy-theme-scroll-container" style="padding: 24px 32px 48px 32px; max-width: 860px; margin: 0 auto; overflow-y: auto; height: 100%; color: #f4f4f5;">
        <div style="border: 1px solid ${mainTheme.borderColor}; background: ${mainTheme.cardBg || 'rgba(22, 16, 14, 0.72)'}; border-radius: 12px; padding: 16px 20px; margin-bottom: 14px; display: flex; flex-direction: column; gap: 14px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
              <div style="font-size: 14.5px; font-weight: 600; color: #f4f4f5; margin-bottom: 2px;">Wallpaper & Backdrop Dimming</div>
              <div style="font-size: 12.5px; color: #a1a1aa;">Balance artwork clarity against code & message readability.</div>
            </div>
            <!-- Auto-detected Format Badge -->
            <div style="display: flex; align-items: center; gap: 8px;">
              <span id="agy-bg-format-badge" style="font-size: 12px; padding: 4px 10px; border-radius: 8px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); color: #e4e4e7; font-weight: 500; display: inline-flex; align-items: center; gap: 5px;">
                ${st.bgMode === 'live' ? `🎬 Live Video: ${st.themeName || 'Custom'}` : `🖼️ Preset: ${st.themeName || 'Custom'}`}
              </span>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; padding-top: 4px; border-top: 1px solid rgba(255, 255, 255, 0.06);">
            <div style="display: flex; align-items: center; gap: 14px;">
              <label style="display: flex; align-items: center; gap: 6px; font-size: 12.5px; color: #d4d4d8; cursor: pointer;">
                <input id="agy-wp-toggle" type="checkbox" ${st.wpEnabled ? 'checked' : ''} style="accent-color: ${mainTheme.primary}; cursor: pointer;" />
                Enable Backdrop
              </label>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 12px; color: #a1a1aa;">Dimming:</span>
                <input id="agy-dim-slider" type="range" min="15" max="92" value="${st.dimming}" style="width: 120px; cursor: pointer; accent-color: #ffffff; height: 5px;" />
                <span id="agy-dim-val" style="font-size: 12.5px; color: #a1a1aa; min-width: 32px; text-align: right;">${st.dimming}%</span>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 10px;">
              <label style="padding: 6px 14px; border-radius: 8px; background: rgba(255, 255, 255, 0.09); border: 1px solid ${mainTheme.borderColor}; color: #f4f4f5; font-size: 12px; font-weight: 500; cursor: pointer; white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; transition: all 0.15s ease;">
                <span>📁 Upload Wallpaper (Image / MP4)</span>
                <input id="agy-unified-upload" type="file" accept="image/*,video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" style="display: none;" />
              </label>
              <button id="agy-reset-btn" type="button" style="padding: 6px 12px; border-radius: 8px; background: rgba(239, 68, 68, 0.14); border: 1px solid rgba(239, 68, 68, 0.35); color: #fca5a5; font-size: 12px; cursor: pointer; white-space: nowrap;">
                Reset Default
              </button>
            </div>
          </div>
        </div>

        <div style="border: 1px solid ${mainTheme.borderColor}; background: ${mainTheme.cardBg || 'rgba(22, 16, 14, 0.72)'}; border-radius: 12px; padding: 14px 20px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
          <div>
            <div style="font-size: 14px; font-weight: 600; color: #f4f4f5; margin-bottom: 2px;">Chat Avatars (User & AI Agent)</div>
            <div style="font-size: 12px; color: #a1a1aa;">Optional circular profile badges rendered beside chat messages (auto-compressed WebP).</div>
          </div>
          <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div id="agy-user-av-preview" style="width: 30px; height: 30px; border-radius: 9999px; border: 1.5px solid ${mainTheme.primary}; background: rgba(255,255,255,0.06) ${effUserAv ? `url('${effUserAv}') center/cover no-repeat` : ''}; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #a1a1aa;">${effUserAv ? '' : 'U'}</div>
              <label style="padding: 4px 10px; border-radius: 7px; background: rgba(255, 255, 255, 0.08); border: 1px solid ${mainTheme.borderColor}; color: #f4f4f5; font-size: 12px; cursor: pointer; white-space: nowrap;">
                User
                <input id="agy-user-av-upload" type="file" accept="image/*" style="display: none;" />
              </label>
              <button id="agy-user-av-clear" type="button" style="padding: 4px 8px; border-radius: 7px; background: transparent; border: 1px solid rgba(255, 255, 255, 0.14); color: #a1a1aa; font-size: 11.5px; cursor: pointer;">Off</button>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div id="agy-agent-av-preview" style="width: 30px; height: 30px; border-radius: 9999px; border: 1.5px solid ${mainTheme.secondary || mainTheme.primary}; background: rgba(255,255,255,0.06) ${effAgentAv ? `url('${effAgentAv}') center/cover no-repeat` : ''}; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #a1a1aa;">${effAgentAv ? '' : 'AI'}</div>
              <label style="padding: 4px 10px; border-radius: 7px; background: rgba(255, 255, 255, 0.08); border: 1px solid ${mainTheme.borderColor}; color: #f4f4f5; font-size: 12px; cursor: pointer; white-space: nowrap;">
                Agent
                <input id="agy-agent-av-upload" type="file" accept="image/*" style="display: none;" />
              </label>
              <button id="agy-agent-av-clear" type="button" style="padding: 4px 8px; border-radius: 7px; background: transparent; border: 1px solid rgba(255, 255, 255, 0.14); color: #a1a1aa; font-size: 11.5px; cursor: pointer;">Off</button>
            </div>
          </div>
        </div>

        <div style="margin-bottom: 28px;">
          <div style="font-size: 15px; font-weight: 600; color: #ffffff; margin-bottom: 4px;">User Chat Bubble</div>
          <div style="font-size: 12.5px; color: #a1a1aa; margin-bottom: 14px;">Mix and match bubble frame & ornament independently from the active wallpaper.</div>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
            ${allThemeKeys.map(name => {
              const th = allThemes[name] || {};
              const isSelected = name === st.bubbleName;
              const bp = th.primary || '#38bdf8';
              const bs = th.secondary || bp;
              const bCornerSvg = th.cornerSvg || getThematicCornerSvg(bp, bs);
              const bCrestSvg = th.sticker || getThematicCrestSvg(bp, bs);

              let bOuterBg = '';
              let bOuterShadow = '';
              let bInnerBg = '';
              if (curInputStyle === 'ornamental') {
                bOuterBg = `linear-gradient(135deg, ${bp}f0 0%, ${bs}d9 50%, ${bp}f0 100%)`;
                bOuterShadow = `0 4px 14px rgba(0,0,0,0.45), 0 0 12px ${th.glow || bp}`;
                bInnerBg = th.bg || 'rgba(17, 24, 39, 0.9)';
              } else if (curInputStyle === 'thematic') {
                bOuterBg = th.frameBg || `linear-gradient(135deg, ${bp}, ${bs})`;
                bOuterShadow = `0 4px 14px rgba(0,0,0,0.45), 0 0 10px ${th.glow || bp}`;
                bInnerBg = th.bg || 'rgba(17, 24, 39, 0.9)';
              } else if (curInputStyle === 'glass') {
                bOuterBg = 'rgba(255, 255, 255, 0.16)';
                bOuterShadow = '0 2px 8px rgba(0,0,0,0.3)';
                bInnerBg = th.inputGlassBg || 'rgba(14, 18, 28, 0.55)';
              } else {
                bOuterBg = 'rgba(255, 255, 255, 0.12)';
                bOuterShadow = 'none';
                bInnerBg = 'rgba(16, 18, 26, 0.94)';
              }

              return `
                <div class="agy-bubble-card" data-name="${name}" style="position: relative; border-radius: 12px; border: ${isSelected ? '1.5px solid #f4f4f5' : '1px solid rgba(255, 255, 255, 0.12)'}; background: ${isSelected ? 'rgba(42, 34, 30, 0.68)' : 'rgba(14, 12, 12, 0.78)'}; padding: 22px 18px 14px 18px; cursor: pointer; display: flex; flex-direction: column; justify-content: space-between; min-height: 112px; transition: border-color 0.15s ease, background-color 0.15s ease;">
                  <div style="display: flex; justify-content: center; align-items: center; width: 100%; margin-top: 6px; margin-bottom: 10px;">
                    <div class="agy-bubble-preview-outer" style="position: relative; width: 192px; height: 46px; padding: 1.2px; border-radius: ${th.isScroll ? '6px' : '12px'}; background: ${bOuterBg}; box-shadow: ${bOuterShadow};">
                      <div class="agy-bubble-preview-crest" style="position: absolute; top: -8px; right: 10px; width: 56px; height: 14px; background-image: url('${bCrestSvg}'); background-size: contain; background-position: center; background-repeat: no-repeat; filter: drop-shadow(0 2px 5px ${th.glow || bp}); display: ${curInputStyle === 'ornamental' ? 'block' : 'none'}; pointer-events: none; z-index: 5;"></div>
                      <div class="agy-bubble-preview-corner" style="position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; background-image: url('${bCornerSvg}'); background-size: contain; background-repeat: no-repeat; opacity: ${curInputStyle === 'ornamental' ? '0.92' : '0.75'}; display: ${(curInputStyle === 'ornamental' || curInputStyle === 'thematic') ? 'block' : 'none'}; pointer-events: none; z-index: 5;"></div>
                      <div class="agy-bubble-preview-inner" style="position: relative; width: 100%; height: 100%; background: ${bInnerBg}; border: ${th.innerBorder || '1px solid ' + (th.borderColor || 'rgba(167, 139, 250, 0.34)')}; border-radius: ${th.isScroll ? '4px' : '11px'}; display: flex; align-items: center; padding: 0 16px;">
                        <span style="font-size: 13.5px; font-weight: 500; color: ${th.textColor || '#fff'};">Hello ✨</span>
                      </div>
                    </div>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 13.5px; font-weight: 500; color: #e4e4e7;">${name}</span>
                    <div class="agy-card-check-slot">${isSelected ? CHECK_SVG : ''}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div style="margin-bottom: 28px;">
          <div style="font-size: 15px; font-weight: 600; color: #ffffff; margin-bottom: 4px;">Composer Style</div>
          <div style="font-size: 12.5px; color: #a1a1aa; margin-bottom: 14px;">Customize the chat input frame without affecting keyboard shortcuts or attachments.</div>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
            ${Object.entries(INPUT_STYLES).map(([key, item]) => {
              const isSelected = key === curInputStyle;
              const activeBubbleTh = allThemes[st.bubbleName] || mainTheme;
              const p = activeBubbleTh.primary || '#38bdf8';
              const s = activeBubbleTh.secondary || p;
              const cornerSvg = activeBubbleTh.cornerSvg || getThematicCornerSvg(p, s);
              const crestSvg = activeBubbleTh.sticker || getThematicCrestSvg(p, s);

              let previewOuterBg = '';
              let previewOuterShadow = '';
              let previewInnerBg = '';
              let showCrest = false;
              let showCorner = false;

              if (key === 'ornamental') {
                previewOuterBg = `linear-gradient(135deg, ${p}f0 0%, ${s}d9 35%, ${p}c8 65%, ${s}f0 100%)`;
                previewOuterShadow = `0 4px 16px rgba(0,0,0,0.5), 0 0 12px ${activeBubbleTh.glow || p}`;
                previewInnerBg = activeBubbleTh.inputCardBg || 'rgba(26, 18, 15, 0.92)';
                showCrest = true;
                showCorner = true;
              } else if (key === 'thematic') {
                previewOuterBg = activeBubbleTh.frameBg || `linear-gradient(135deg, ${p}, ${s})`;
                previewOuterShadow = `0 4px 14px rgba(0,0,0,0.45), 0 0 10px ${activeBubbleTh.glow || p}`;
                previewInnerBg = activeBubbleTh.inputCardBg || 'rgba(26, 18, 15, 0.92)';
                showCrest = false;
                showCorner = true;
              } else if (key === 'glass') {
                previewOuterBg = 'rgba(255, 255, 255, 0.16)';
                previewOuterShadow = '0 2px 8px rgba(0,0,0,0.3)';
                previewInnerBg = activeBubbleTh.inputGlassBg || 'rgba(20, 15, 13, 0.45)';
                showCrest = false;
                showCorner = false;
              } else { // minimal
                previewOuterBg = 'rgba(255, 255, 255, 0.12)';
                previewOuterShadow = 'none';
                previewInnerBg = 'rgba(18, 20, 28, 0.94)';
                showCrest = false;
                showCorner = false;
              }

              return `
                <div class="agy-input-card" data-style="${key}" style="border-radius: 12px; border: ${isSelected ? '1.5px solid #f4f4f5' : '1px solid rgba(255, 255, 255, 0.12)'}; background: ${isSelected ? 'rgba(42, 34, 30, 0.68)' : 'rgba(14, 12, 12, 0.78)'}; padding: 16px 18px; cursor: pointer; display: flex; flex-direction: column; gap: 12px; transition: border-color 0.15s ease, background-color 0.15s ease;">
                  <div class="agy-input-preview-outer" style="position: relative; margin-top: 8px; padding: 1.5px; border-radius: 10px; background: ${previewOuterBg}; box-shadow: ${previewOuterShadow};">
                    <div class="agy-input-preview-crest" style="position: absolute; top: -10px; right: 14px; width: 68px; height: 16px; background-image: url('${crestSvg}'); background-size: contain; background-position: center; background-repeat: no-repeat; display: ${showCrest ? 'block' : 'none'}; pointer-events: none; z-index: 5; filter: drop-shadow(0 2px 6px ${activeBubbleTh.glow || p});"></div>
                    <div class="agy-input-preview-corner-bl" style="position: absolute; bottom: 2px; right: 2px; width: 13px; height: 13px; background-image: url('${cornerSvg}'); background-size: contain; background-repeat: no-repeat; transform: rotate(180deg); display: ${showCorner ? 'block' : 'none'}; pointer-events: none; z-index: 5; opacity: ${key === 'ornamental' ? '0.92' : '0.75'};"></div>
                    <div class="agy-input-preview-corner-tl" style="position: absolute; top: 2px; left: 2px; width: 12px; height: 12px; background-image: url('${cornerSvg}'); background-size: contain; background-repeat: no-repeat; display: ${showCorner ? 'block' : 'none'}; pointer-events: none; z-index: 5; opacity: ${key === 'ornamental' ? '0.92' : '0.75'};"></div>
                    <div class="agy-input-preview-inner" style="background: ${previewInnerBg}; border-radius: 9px; padding: 8px 12px; font-size: 12px; color: #a1a1aa; display: flex; justify-content: space-between; align-items: center;">
                      <span>Ask anything, @ to mention...</span>
                      <span class="agy-input-preview-turbo" style="color: ${p}; font-size: 11px;">Send →</span>
                    </div>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <div style="font-size: 13.5px; font-weight: 500; color: #e4e4e7;">${item.label}</div>
                      <div style="font-size: 11.5px; color: #a1a1aa;">${item.desc}</div>
                    </div>
                    <div class="agy-card-check-slot">${isSelected ? CHECK_SVG : ''}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <div style="font-size: 15px; font-weight: 600; color: #ffffff;">Theme Presets (${allThemeKeys.length})</div>
            <span style="font-size: 12px; color: #a1a1aa;">Custom wallpapers are saved here</span>
          </div>
          <div style="font-size: 12.5px; color: #a1a1aa; margin-bottom: 14px;">Complete backdrop, palette, unified L-glass, and matching ornaments. Click any preset to switch.</div>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
            ${allThemeKeys.map(name => {
              const th = allThemes[name] || {};
              const isSelected = name === st.themeName;
              const isLive = th.bgMode === 'live' || Boolean(th.liveVideo);
              const thumbBg = th.wallpaper
                ? `linear-gradient(180deg, rgba(0,0,0,0.15), rgba(14,12,12,0.85)), url('${th.wallpaper}')`
                : (th.pureBg || th.bg);
              const thumbOrnamentStyle = th.isOrnament
                ? 'right: 10px; bottom: 8px; width: 76px; height: 24px; background-position: center;'
                : 'right: 12px; bottom: 4px; width: 42px; height: 38px; background-position: bottom center;';
              return `
                <div class="agy-preset-card" data-name="${name}" style="position: relative; border-radius: 12px; border: ${isSelected ? '1.5px solid #f4f4f5' : '1px solid rgba(255, 255, 255, 0.12)'}; background: rgba(14, 12, 12, 0.82); overflow: hidden; cursor: pointer; display: flex; flex-direction: column; transition: border-color 0.15s ease, transform 0.1s ease;">
                  <div style="height: 68px; width: 100%; background-image: ${thumbBg}; background-size: cover; background-position: ${th.bgPosition || 'center'}; position: relative; display: flex; align-items: flex-end; padding: 8px 14px;">
                    ${th.sticker ? `<div style="position: absolute; ${thumbOrnamentStyle} background-image: url('${th.sticker}'); background-size: contain; background-repeat: no-repeat; pointer-events: none;"></div>` : ''}
                    <span style="font-size: 13.5px; font-weight: 600; color: #fff; text-shadow: 0 1px 4px rgba(0,0,0,0.9); z-index: 1;">${name}</span>
                    ${th.isCustom ? `
                      <button class="agy-delete-preset-btn" data-preset="${name}" title="Delete preset" style="position: absolute; top: 6px; right: 6px; width: 22px; height: 22px; border-radius: 6px; background: rgba(0,0,0,0.65); border: 1px solid rgba(255,255,255,0.2); color: #fca5a5; display: flex; align-items: center; justify-content: center; font-size: 12px; cursor: pointer; transition: all 0.15s ease; z-index: 2;">
                        ✕
                      </button>
                    ` : ''}
                  </div>
                  <div style="padding: 10px 14px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 12px; color: #a1a1aa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 260px;">${th.concept || ''}</span>
                    <div class="agy-card-check-slot">${isSelected ? CHECK_SVG : ''}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;

    function updateInputPreviews(bName) {
      const allTh = getAllThemes();
      const activeTh = allTh[bName] || allTh[DEFAULT_THEME_KEY] || {};
      const p = activeTh.primary || '#38bdf8';
      const s = activeTh.secondary || p;
      const cornerSvg = activeTh.cornerSvg || getThematicCornerSvg(p, s);
      const crestSvg = activeTh.sticker || getThematicCrestSvg(p, s);
      const curStyle = normalizeInputStyle(getState().inputStyle);

      container.querySelectorAll('.agy-input-card').forEach(card => {
        const key = card.dataset.style;
        const outer = card.querySelector('.agy-input-preview-outer');
        if (outer) {
          if (key === 'ornamental') {
            outer.style.background = `linear-gradient(135deg, ${p}f0 0%, ${s}d9 35%, ${p}c8 65%, ${s}f0 100%)`;
            outer.style.boxShadow = `0 4px 16px rgba(0,0,0,0.5), 0 0 12px ${activeTh.glow || p}`;
          } else if (key === 'thematic') {
            outer.style.background = activeTh.frameBg || `linear-gradient(135deg, ${p}, ${s})`;
            outer.style.boxShadow = `0 4px 14px rgba(0,0,0,0.45), 0 0 10px ${activeTh.glow || p}`;
          } else if (key === 'glass') {
            outer.style.background = 'rgba(255, 255, 255, 0.16)';
            outer.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
          } else {
            outer.style.background = 'rgba(255, 255, 255, 0.12)';
            outer.style.boxShadow = 'none';
          }
        }
        const inner = card.querySelector('.agy-input-preview-inner');
        if (inner) {
          inner.style.background = key === 'glass'
            ? (activeTh.inputGlassBg || 'rgba(20, 15, 13, 0.45)')
            : key === 'minimal'
            ? 'rgba(18, 20, 28, 0.94)'
            : (activeTh.inputCardBg || 'rgba(26, 18, 15, 0.92)');
        }
        const crest = card.querySelector('.agy-input-preview-crest');
        if (crest) {
          crest.style.backgroundImage = `url('${crestSvg}')`;
          crest.style.filter = `drop-shadow(0 2px 6px ${activeTh.glow || p})`;
          crest.style.display = key === 'ornamental' ? 'block' : 'none';
        }
        const cBl = card.querySelector('.agy-input-preview-corner-bl');
        if (cBl) {
          cBl.style.backgroundImage = `url('${cornerSvg}')`;
          cBl.style.display = (key === 'ornamental' || key === 'thematic') ? 'block' : 'none';
        }
        const cTl = card.querySelector('.agy-input-preview-corner-tl');
        if (cTl) {
          cTl.style.backgroundImage = `url('${cornerSvg}')`;
          cTl.style.display = (key === 'ornamental' || key === 'thematic') ? 'block' : 'none';
        }
        const turbo = card.querySelector('.agy-input-preview-turbo');
        if (turbo) {
          turbo.style.color = p;
        }
      });

      container.querySelectorAll('.agy-bubble-card').forEach(bCard => {
        const thName = bCard.dataset.name;
        const th = allTh[thName] || {};
        const bp = th.primary || '#38bdf8';
        const bs = th.secondary || bp;
        const bCornerSvg = th.cornerSvg || getThematicCornerSvg(bp, bs);
        const bCrestSvg = th.sticker || getThematicCrestSvg(bp, bs);

        const bOuter = bCard.querySelector('.agy-bubble-preview-outer');
        if (bOuter) {
          bOuter.style.background = curStyle === 'ornamental'
            ? `linear-gradient(135deg, ${bp}f0 0%, ${bs}d9 50%, ${bp}f0 100%)`
            : curStyle === 'thematic'
            ? (th.frameBg || `linear-gradient(135deg, ${bp}, ${bs})`)
            : (curStyle === 'glass' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.12)');
          bOuter.style.boxShadow = curStyle === 'ornamental'
            ? `0 4px 14px rgba(0,0,0,0.45), 0 0 12px ${th.glow || bp}`
            : curStyle === 'thematic'
            ? `0 4px 14px rgba(0,0,0,0.45), 0 0 10px ${th.glow || bp}`
            : '0 2px 8px rgba(0,0,0,0.3)';
        }
        const bInner = bCard.querySelector('.agy-bubble-preview-inner');
        if (bInner) {
          bInner.style.background = curStyle === 'glass'
            ? (th.inputGlassBg || 'rgba(14, 18, 28, 0.55)')
            : curStyle === 'minimal'
            ? 'rgba(16, 18, 26, 0.94)'
            : (th.bg || 'rgba(17, 24, 39, 0.9)');
        }
        const bCrest = bCard.querySelector('.agy-bubble-preview-crest');
        if (bCrest) {
          bCrest.style.backgroundImage = `url('${bCrestSvg}')`;
          bCrest.style.display = curStyle === 'ornamental' ? 'block' : 'none';
        }
        const bCorner = bCard.querySelector('.agy-bubble-preview-corner');
        if (bCorner) {
          bCorner.style.backgroundImage = `url('${bCornerSvg}')`;
          bCorner.style.display = (curStyle === 'ornamental' || curStyle === 'thematic') ? 'block' : 'none';
        }
      });
    }

    const slider = container.querySelector('#agy-dim-slider');
    const valLabel = container.querySelector('#agy-dim-val');
    slider.addEventListener('input', (e) => {
      const v = parseInt(e.target.value, 10);
      valLabel.textContent = v + '%';
      applyTheme({ dimming: v });
    });

    const wpToggle = container.querySelector('#agy-wp-toggle');
    wpToggle.addEventListener('change', (e) => {
      applyTheme({ wpEnabled: e.target.checked });
    });

    const unifiedUpload = container.querySelector('#agy-unified-upload');
    if (unifiedUpload) {
      unifiedUpload.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const isVideo = (file.type && file.type.startsWith('video/')) ||
          /\.(mp4|webm|mov|m4v)$/i.test(file.name || '');
        const themeName = formatThemeName(file.name);
        const curStyle = normalizeInputStyle(getState().inputStyle);

        if (isVideo) {
          try {
            const videoKey = 'video_' + Date.now();
            await saveLiveVideoBlob(file, videoKey);
            const thumb = await extractVideoThumbnail(file);
            const palette = (await extractPaletteFromImage(thumb)) || getFallbackPalette('live');

            const newPreset = {
              id: 'custom_' + Date.now(),
              name: themeName,
              isCustom: true,
              bgMode: 'live',
              videoKey: videoKey,
              wallpaper: thumb,
              concept: 'Custom Live Wallpaper • MP4',
              ...palette
            };
            saveCustomPreset(newPreset);

            window.__AGY_HAS_LIVE_VIDEO__ = true;
            if (window.__AGY_ACTIVE_BLOB_URL__) {
              try { URL.revokeObjectURL(window.__AGY_ACTIVE_BLOB_URL__); } catch (_) {}
            }
            const blobUrl = URL.createObjectURL(file);
            window.__AGY_ACTIVE_BLOB_URL__ = blobUrl;

            const v = document.getElementById('agy-live-video');
            if (v) {
              v.setAttribute('data-video-key', videoKey);
              v.src = blobUrl;
              v.play().catch(() => {});
            }

            applyTheme({ themeName: themeName, bubbleName: themeName, inputStyle: curStyle, customWp: '', bgMode: 'live', wpEnabled: true });
            renderThemePanels(container);
          } catch (err) {
            console.error('Failed to save live video preset:', err);
          }
        } else {
          const reader = new FileReader();
          reader.onload = async () => {
            const dataUrl = reader.result;
            const palette = (await extractPaletteFromImage(dataUrl)) || getFallbackPalette('static');
            const newPreset = {
              id: 'custom_' + Date.now(),
              name: themeName,
              isCustom: true,
              bgMode: 'static',
              wallpaper: dataUrl,
              concept: 'Custom Image Wallpaper',
              ...palette
            };
            saveCustomPreset(newPreset);
            applyTheme({ themeName: themeName, bubbleName: themeName, inputStyle: curStyle, customWp: '', bgMode: 'static', wpEnabled: true });
            renderThemePanels(container);
          };
          reader.readAsDataURL(file);
        }
      });
    }

    const userAvUpload = container.querySelector('#agy-user-av-upload');
    const userAvPreview = container.querySelector('#agy-user-av-preview');
    const userAvClear = container.querySelector('#agy-user-av-clear');
    const agentAvUpload = container.querySelector('#agy-agent-av-upload');
    const agentAvPreview = container.querySelector('#agy-agent-av-preview');
    const agentAvClear = container.querySelector('#agy-agent-av-clear');

    function syncAvPreview(el, url, fallbackText) {
      if (!el) return;
      if (url) {
        el.style.backgroundImage = `url("${url}")`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
        el.textContent = '';
      } else {
        el.style.backgroundImage = 'none';
        el.textContent = fallbackText;
      }
    }

    if (userAvUpload) {
      userAvUpload.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        compressAvatarFile(file, (dataUrl) => {
          applyTheme({ userAvatar: dataUrl });
          syncAvPreview(userAvPreview, dataUrl, 'U');
        });
      });
    }
    if (userAvClear) {
      userAvClear.addEventListener('click', () => {
        applyTheme({ userAvatar: 'none' });
        syncAvPreview(userAvPreview, '', 'U');
      });
    }
    if (agentAvUpload) {
      agentAvUpload.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        compressAvatarFile(file, (dataUrl) => {
          applyTheme({ agentAvatar: dataUrl });
          syncAvPreview(agentAvPreview, dataUrl, 'AI');
        });
      });
    }
    if (agentAvClear) {
      agentAvClear.addEventListener('click', () => {
        applyTheme({ agentAvatar: 'none' });
        syncAvPreview(agentAvPreview, '', 'AI');
      });
    }

    const resetBtn = container.querySelector('#agy-reset-btn');
    resetBtn.addEventListener('click', () => {
      localStorage.removeItem(STORAGE_CUSTOM_WP);
      localStorage.removeItem(STORAGE_USER_AVATAR);
      localStorage.removeItem(STORAGE_AGENT_AVATAR);
      localStorage.removeItem(STORAGE_THEME);
      localStorage.removeItem(STORAGE_BUBBLE);
      localStorage.removeItem(STORAGE_INPUT);
      localStorage.removeItem(STORAGE_DIMMING);
      localStorage.removeItem(STORAGE_WP_ENABLED);
      localStorage.removeItem(STORAGE_BG_MODE);
      const defStyle = 'thematic';
      applyTheme({
        themeName: DEFAULT_THEME_KEY,
        bubbleName: DEFAULT_THEME_KEY,
        inputStyle: defStyle,
        dimming: 69,
        wpEnabled: true,
        customWp: '',
        userAvatar: '',
        agentAvatar: '',
        bgMode: 'static'
      });
      const allTh = getAllThemes();
      const defTh = allTh[DEFAULT_THEME_KEY] || {};
      const badge = container.querySelector('#agy-bg-format-badge');
      if (badge) {
        badge.textContent = `🖼️ Preset: ${DEFAULT_THEME_KEY}`;
      }
      syncAvPreview(userAvPreview, defTh.userAvatar || '', 'U');
      syncAvPreview(agentAvPreview, defTh.agentAvatar || '', 'AI');
      if (slider) slider.value = 69;
      if (valLabel) valLabel.textContent = '69%';
      if (wpToggle) wpToggle.checked = true;

      container.querySelectorAll('.agy-preset-card').forEach(c => {
        const isSel = c.dataset.name === DEFAULT_THEME_KEY;
        c.style.border = isSel ? '1.5px solid #f4f4f5' : '1px solid rgba(255, 255, 255, 0.12)';
        const slot = c.querySelector('.agy-card-check-slot');
        if (slot) slot.innerHTML = isSel ? CHECK_SVG : '';
      });
      container.querySelectorAll('.agy-bubble-card').forEach(b => {
        const isSel = b.dataset.name === DEFAULT_THEME_KEY;
        b.style.border = isSel ? '1.5px solid #f4f4f5' : '1px solid rgba(255, 255, 255, 0.12)';
        b.style.background = isSel ? 'rgba(42, 34, 30, 0.68)' : 'rgba(14, 12, 12, 0.78)';
        const slot = b.querySelector('.agy-card-check-slot');
        if (slot) slot.innerHTML = isSel ? CHECK_SVG : '';
      });
      container.querySelectorAll('.agy-input-card').forEach(c => {
        const isSel = c.dataset.style === defStyle;
        c.style.border = isSel ? '1.5px solid #f4f4f5' : '1px solid rgba(255, 255, 255, 0.12)';
        c.style.background = isSel ? 'rgba(42, 34, 30, 0.68)' : 'rgba(14, 12, 12, 0.78)';
        const slot = c.querySelector('.agy-card-check-slot');
        if (slot) slot.innerHTML = isSel ? CHECK_SVG : '';
      });
      updateInputPreviews(DEFAULT_THEME_KEY);
    });

    container.querySelectorAll('.agy-preset-card').forEach(card => {
      card.addEventListener('click', () => {
        const name = card.dataset.name;
        const allTh = getAllThemes();
        const th = allTh[name] || {};
        const targetMode = th.bgMode || (th.liveVideo ? 'live' : 'static');
        const curStyle = normalizeInputStyle(getState().inputStyle);
        applyTheme({
          themeName: name,
          bubbleName: name,
          inputStyle: curStyle,
          customWp: '',
          bgMode: targetMode
        });

        const badge = container.querySelector('#agy-bg-format-badge');
        if (badge) {
          badge.textContent = targetMode === 'live' ? `🎬 Live Video: ${name}` : `🖼️ Preset: ${name}`;
        }

        container.querySelectorAll('.agy-preset-card').forEach(c => {
          const isSel = c.dataset.name === name;
          c.style.border = isSel ? '1.5px solid #f4f4f5' : '1px solid rgba(255, 255, 255, 0.12)';
          const slot = c.querySelector('.agy-card-check-slot');
          if (slot) slot.innerHTML = isSel ? CHECK_SVG : '';
        });

        container.querySelectorAll('.agy-bubble-card').forEach(b => {
          const isSel = b.dataset.name === name;
          b.style.border = isSel ? '1.5px solid #f4f4f5' : '1px solid rgba(255, 255, 255, 0.12)';
          b.style.background = isSel ? 'rgba(42, 34, 30, 0.68)' : 'rgba(14, 12, 12, 0.78)';
          const slot = b.querySelector('.agy-card-check-slot');
          if (slot) slot.innerHTML = isSel ? CHECK_SVG : '';
        });

        container.querySelectorAll('.agy-input-card').forEach(c => {
          const isSel = c.dataset.style === curStyle;
          c.style.border = isSel ? '1.5px solid #f4f4f5' : '1px solid rgba(255, 255, 255, 0.12)';
          c.style.background = isSel ? 'rgba(42, 34, 30, 0.68)' : 'rgba(14, 12, 12, 0.78)';
          const slot = c.querySelector('.agy-card-check-slot');
          if (slot) slot.innerHTML = isSel ? CHECK_SVG : '';
        });

        updateInputPreviews(name);
      });
    });

    container.querySelectorAll('.agy-delete-preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const presetName = btn.dataset.preset;
        if (!presetName) return;
        removeCustomPreset(presetName);
        const st = getState();
        if (st.themeName === presetName) {
          applyTheme({
            themeName: DEFAULT_THEME_KEY,
            bubbleName: DEFAULT_THEME_KEY,
            customWp: '',
            bgMode: 'static'
          });
        }
        renderThemePanels(container);
      });
    });

    container.querySelectorAll('.agy-bubble-card').forEach(card => {
      card.addEventListener('click', () => {
        const name = card.dataset.name;
        applyTheme({ bubbleName: name });

        container.querySelectorAll('.agy-bubble-card').forEach(b => {
          const isSel = b.dataset.name === name;
          b.style.border = isSel ? '1.5px solid #f4f4f5' : '1px solid rgba(255, 255, 255, 0.12)';
          b.style.background = isSel ? 'rgba(42, 34, 30, 0.68)' : 'rgba(14, 12, 12, 0.78)';
          const slot = b.querySelector('.agy-card-check-slot');
          if (slot) slot.innerHTML = isSel ? CHECK_SVG : '';
        });

        updateInputPreviews(name);
      });
    });

    container.querySelectorAll('.agy-input-card').forEach(card => {
      card.addEventListener('click', () => {
        const styleKey = normalizeInputStyle(card.dataset.style);
        applyTheme({ inputStyle: styleKey });

        container.querySelectorAll('.agy-input-card').forEach(c => {
          const isSel = c.dataset.style === styleKey;
          c.style.border = isSel ? '1.5px solid #f4f4f5' : '1px solid rgba(255, 255, 255, 0.12)';
          c.style.background = isSel ? 'rgba(42, 34, 30, 0.68)' : 'rgba(14, 12, 12, 0.78)';
          const slot = c.querySelector('.agy-card-check-slot');
          if (slot) slot.innerHTML = isSel ? CHECK_SVG : '';
        });

        const curBubble = getState().bubbleName;
        updateInputPreviews(curBubble);
      });
    });
  }

  function removeMainSidebarButton() {
    const btn = document.getElementById('agy-custom-theme-sidebar-btn');
    if (btn) btn.remove();
  }

  function activateSettingsCustomThemeTab(modal) {
    if (!modal) modal = document.querySelector('.settings-modal-container');
    if (!modal) return;

    const tabBtn = modal.querySelector('#agy-settings-custom-theme-tab');
    if (!tabBtn) return;

    tabBtn.className = 'flex items-center gap-1.5 w-full px-2 py-1 rounded-lg cursor-pointer border-none text-left transition-all outline-none bg-sidebar-secondary';
    const span = tabBtn.querySelector('span');
    if (span) {
      span.className = 'transition-colors select-none truncate flex-1 text-foreground font-medium';
    }

    const navList = tabBtn.closest('.flex.flex-col')?.parentElement || modal;
    navList.querySelectorAll('button:not(#agy-settings-custom-theme-tab)').forEach(b => {
      b.className = 'flex items-center gap-1.5 w-full px-2 py-1 rounded-lg cursor-pointer border-none text-left transition-all outline-none hover:bg-sidebar-muted';
      const sp = b.querySelector('span');
      if (sp) sp.className = 'transition-colors select-none truncate flex-1 text-secondary-foreground group-hover/nav-item:text-foreground';
    });

    const splitRoot = modal.querySelector('[data-split-root="true"]');
    const contentPane = splitRoot ? splitRoot.children[1] : null;
    if (!contentPane) return;

    const nativeContent = contentPane.querySelector(':scope > div:not(#agy-settings-custom-theme-pane)');
    if (nativeContent) nativeContent.style.display = 'none';

    let customPane = contentPane.querySelector('#agy-settings-custom-theme-pane');
    if (!customPane) {
      customPane = document.createElement('div');
      customPane.id = 'agy-settings-custom-theme-pane';
      customPane.style.cssText = 'position: relative; width: 100%; height: 100%; min-height: 0; flex-grow: 1; display: flex; flex-direction: column; overflow: hidden;';
      customPane.innerHTML = `
        <div style="padding: 24px 32px 14px 32px; border-bottom: 1px solid rgba(255, 255, 255, 0.08); background: rgba(22, 16, 14, 0.35); flex-shrink: 0;">
          <div style="font-size: 19px; font-weight: 600; color: #f4f4f5; margin-bottom: 3px;">Custom theme</div>
          <div style="font-size: 13px; color: #a1a1aa;">Customize wallpaper backgrounds (images or MP4 live videos), chat bubbles, and glassmorphic styling.</div>
        </div>
        <div id="agy-settings-theme-body" style="flex: 1; overflow-y: auto; height: 100%;"></div>
      `;
      contentPane.appendChild(customPane);
    }

    customPane.style.display = 'flex';
    const body = customPane.querySelector('#agy-settings-theme-body');
    if (body) {
      renderThemePanels(body);
    }
  }

  function deactivateSettingsCustomThemeTab(modal) {
    if (!modal) modal = document.querySelector('.settings-modal-container');
    if (!modal) return;

    const tabBtn = modal.querySelector('#agy-settings-custom-theme-tab');
    if (tabBtn) {
      tabBtn.className = 'flex items-center gap-1.5 w-full px-2 py-1 rounded-lg cursor-pointer border-none text-left transition-all outline-none hover:bg-sidebar-muted';
      const span = tabBtn.querySelector('span');
      if (span) {
        span.className = 'transition-colors select-none truncate flex-1 text-secondary-foreground group-hover/nav-item:text-foreground';
      }
    }

    const splitRoot = modal.querySelector('[data-split-root="true"]');
    const contentPane = splitRoot ? splitRoot.children[1] : null;
    if (!contentPane) return;

    const customPane = contentPane.querySelector('#agy-settings-custom-theme-pane');
    if (customPane) customPane.style.display = 'none';

    const nativeContent = contentPane.querySelector(':scope > div:not(#agy-settings-custom-theme-pane)');
    if (nativeContent) nativeContent.style.display = '';
  }

  function injectSettingsModalTab() {
    const modal = document.querySelector('.settings-modal-container');
    if (!modal) return;

    const oldBtn = modal.querySelector('#agy-custom-theme-settings-btn');
    if (oldBtn) oldBtn.remove();

    const appearanceNav = modal.querySelector('[data-testid="settings-nav-item-Appearance"]');
    if (!appearanceNav) return;

    const appearanceRow = appearanceNav.closest('[class*="group/nav-item"]') || appearanceNav.parentElement;
    const navList = appearanceRow ? appearanceRow.parentElement : null;
    if (!navList) return;

    let tabRow = modal.querySelector('#agy-settings-custom-theme-tab-container');
    if (!tabRow) {
      tabRow = document.createElement('div');
      tabRow.id = 'agy-settings-custom-theme-tab-container';
      tabRow.className = 'relative group/nav-item mx-2';
      tabRow.innerHTML = `
        <button type="button" data-testid="settings-nav-item-CustomTheme" id="agy-settings-custom-theme-tab" class="flex items-center gap-1.5 w-full px-2 py-1 rounded-lg cursor-pointer border-none text-left transition-all outline-none hover:bg-sidebar-muted">
          <span class="transition-colors select-none truncate flex-1 text-secondary-foreground group-hover/nav-item:text-foreground">Custom theme</span>
        </button>
      `;

      appearanceRow.parentNode.insertBefore(tabRow, appearanceRow.nextSibling);
    }

    const tabBtn = tabRow.querySelector('#agy-settings-custom-theme-tab');
    if (tabBtn && !tabBtn.dataset.agyTabBound) {
      tabBtn.dataset.agyTabBound = '1';
      tabBtn.addEventListener('click', (e) => {
        e.preventDefault();
        activateSettingsCustomThemeTab(modal);
      });
    }

    navList.querySelectorAll('button:not(#agy-settings-custom-theme-tab)').forEach(btn => {
      if (!btn.dataset.agyNavBound) {
        btn.dataset.agyNavBound = '1';
        btn.addEventListener('click', () => {
          deactivateSettingsCustomThemeTab(modal);
        });
      }
    });
  }

  function hookSidebarScroll() {
    if (!window.__AGY_SCROLL_AC__) return;
    const scrollers = document.querySelectorAll('.agy-shell .bg-sidebar .overflow-y-auto');
    scrollers.forEach(sc => {
      if (sc.dataset.agyScrollBound) return;
      sc.dataset.agyScrollBound = '1';
      const sync = () => sc.classList.toggle('agy-scrolled', sc.scrollTop > 2);
      sync();
      sc.addEventListener('scroll', sync, { passive: true, signal: window.__AGY_SCROLL_AC__.signal });
    });
  }

  function syncShellMetrics() {
    const shell = document.querySelector('.agy-shell');
    if (!shell) return;
    const split = shell.querySelector('[data-testid="sidebar-split"]');
    const sidebarPane = split ? split.firstElementChild : null;
    const titleBar = shell.querySelector('[class*="@container/titlebar"]');
    const sw = sidebarPane ? Math.round(sidebarPane.getBoundingClientRect().width) : 0;
    const shellRect = shell.getBoundingClientRect();
    const hdrBottom = titleBar ? Math.round(titleBar.getBoundingClientRect().bottom - shellRect.top) : 35;
    shell.style.setProperty('--agy-sidebar-w', sw + 'px');
    shell.style.setProperty('--agy-hdr-h', hdrBottom + 'px');

    const hasHoleAttr = document.body.getAttribute('data-has-browser-hole') === 'true';
    const holeEl = hasHoleAttr ? shell.querySelector('[data-browser-hole]:not([data-browser-hole="false"])') : null;
    if (holeEl) {
      if (window.__AGY_SHELL_RO__ && window.__AGY_HOLE_EL__ !== holeEl) {
        try { window.__AGY_SHELL_RO__.observe(holeEl); } catch (e) {}
        window.__AGY_HOLE_EL__ = holeEl;
      }
      const hRect = holeEl.getBoundingClientRect();
      if (hRect.width > 1 && hRect.height > 1) {
        const l = Math.max(0, Math.round(hRect.left - shellRect.left));
        const t = Math.max(0, Math.round(hRect.top - shellRect.top));
        const r = Math.max(l, Math.round(hRect.right - shellRect.left));
        const b = Math.max(t, Math.round(hRect.bottom - shellRect.top));
        shell.style.setProperty(
          '--agy-hole-clip',
          `polygon(evenodd, 0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${l}px ${t}px, ${r}px ${t}px, ${r}px ${b}px, ${l}px ${b}px, ${l}px ${t}px)`
        );
        shell.dataset.agyHoleActive = '1';
        delete shell.dataset.agySideGlass;
        return;
      }
    }
    window.__AGY_HOLE_EL__ = null;
    delete shell.dataset.agyHoleActive;
    shell.style.removeProperty('--agy-hole-clip');

    const sideBody = shell.querySelector('[data-side-panel-body="true"]');
    if (sideBody) {
      if (window.__AGY_SHELL_RO__ && window.__AGY_SIDE_EL__ !== sideBody) {
        try { window.__AGY_SHELL_RO__.observe(sideBody); } catch (e) {}
        window.__AGY_SIDE_EL__ = sideBody;
      }
      const sRect = sideBody.getBoundingClientRect();
      const hasContent = sideBody.children.length > 0;
      if (hasContent && sRect.width > 24 && sRect.height > 24 && sRect.left < shellRect.right - 8 && sRect.right > shellRect.left + 8) {
        const sl = Math.max(sw, Math.round(sRect.left - shellRect.left));
        const st = Math.max(hdrBottom, Math.round(sRect.top - shellRect.top));
        const sr = Math.min(Math.round(shellRect.width), Math.max(sl, Math.round(sRect.right - shellRect.left)));
        const sb = Math.min(Math.round(shellRect.height), Math.max(st, Math.round(sRect.bottom - shellRect.top)));
        if (sr - sl > 20 && sb - st > 20) {
          shell.style.setProperty('--agy-side-l', sl + 'px');
          shell.style.setProperty('--agy-side-t', st + 'px');
          shell.style.setProperty('--agy-side-r', sr + 'px');
          shell.style.setProperty('--agy-side-b', sb + 'px');
          shell.dataset.agySideGlass = '1';
          return;
        }
      }
    }
    delete shell.dataset.agySideGlass;
  }

  function hookShellMetrics() {
    const shell = document.querySelector('.agy-shell');
    if (!shell) return;
    if (!shell.dataset.agyTboMounted) {
      shell.dataset.agyTboMounted = '1';
      scheduleTitleBarSync();
    }
    if (!window.__AGY_SHELL_RO__ && typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(syncShellMetrics);
      ro.observe(shell);
      const sidebarPane = shell.querySelector('[data-testid="sidebar-split"]')?.firstElementChild;
      if (sidebarPane) ro.observe(sidebarPane);
      window.__AGY_SHELL_RO__ = ro;
    }
    syncShellMetrics();
  }

  function tick() {
    removeMainSidebarButton();
    injectSettingsModalTab();
    hookSidebarScroll();
    hookShellMetrics();
  }

  function scheduleTick() {
    if (window.__AGY_TICK_RAF__) return;
    window.__AGY_TICK_RAF__ = requestAnimationFrame(() => {
      window.__AGY_TICK_RAF__ = 0;
      tick();
    });
  }

  clearTitleBarTimers();
  if (window.__AGY_TICK_RAF__) {
    cancelAnimationFrame(window.__AGY_TICK_RAF__);
    window.__AGY_TICK_RAF__ = 0;
  }
  if (window.__AGY_SHELL_RO__) {
    try { window.__AGY_SHELL_RO__.disconnect(); } catch (e) {}
    window.__AGY_SHELL_RO__ = null;
  }
  if (window.__AGY_SCROLL_AC__) {
    try { window.__AGY_SCROLL_AC__.abort(); } catch (e) {}
  }
  window.__AGY_SCROLL_AC__ = new AbortController();
  window.addEventListener('load', () => scheduleTitleBarSync(), { signal: window.__AGY_SCROLL_AC__.signal });
  window.addEventListener('focus', () => syncTitleBarOverlay(), { signal: window.__AGY_SCROLL_AC__.signal });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) syncTitleBarOverlay();
  }, { signal: window.__AGY_SCROLL_AC__.signal });
  document.querySelectorAll('[data-agy-scroll-bound]').forEach(el => delete el.dataset.agyScrollBound);
  document.querySelectorAll('[data-agy-tbo-mounted]').forEach(el => delete el.dataset.agyTboMounted);
  const staleBackdrop = document.getElementById('agy-custom-theme-modal-backdrop');
  if (staleBackdrop) staleBackdrop.remove();
  const staleSidebarBtn = document.getElementById('agy-custom-theme-sidebar-btn');
  if (staleSidebarBtn) staleSidebarBtn.remove();
  const staleSettingsBtn = document.getElementById('agy-custom-theme-settings-btn');
  if (staleSettingsBtn) staleSettingsBtn.remove();

  window.__AGY_HOLE_EL__ = null;
  if (window.__AGY_MODAL_OBSERVER__) {
    window.__AGY_MODAL_OBSERVER__.disconnect();
  }
  window.__AGY_MODAL_OBSERVER__ = new MutationObserver(scheduleTick);
  window.__AGY_MODAL_OBSERVER__.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-has-browser-hole', 'data-browser-hole']
  });
  migrateExistingCustomPresets();
  tick();

  return 'Antigravity Custom Theme Engine Ready!';
})();
