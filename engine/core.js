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
  const STORAGE_ACCESSORY_KIT = 'agy_accessory_kit_v3';
  const STORAGE_ACCESSORY_MODE = 'agy_accessory_mode_v3';
  const STORAGE_ACC_CREST = 'agy_acc_crest_v3';
  const STORAGE_ACC_CHARM = 'agy_acc_charm_v3';
  const STORAGE_ACC_CORNERS = 'agy_acc_corners_v3';
  const STORAGE_ACC_SEAL = 'agy_acc_seal_v3';
  const STORAGE_ACC_RAIL = 'agy_acc_rail_v3';

  const ACCESSORY_MODES = {
    full: {
      label: 'Full Thematic Set',
      badge: '✦ All',
      desc: 'Top Crown Crest, Hanging Charm, Corner Guards, 3D Wax Seal & Luminous Rail'
    },
    jewelry: {
      label: 'Jewelry & Charms',
      badge: '💎 Jewelry',
      desc: 'Hanging Charm, Corner Guards & 3D Wax Seal (no top crest)'
    },
    crown: {
      label: 'Crown Crest & Seal',
      badge: '👑 Royal',
      desc: 'Symmetrical Crown Crest, 3D Wax Seal & Luminous Rail (no hanging charm)'
    },
    minimal: {
      label: 'Clean / Subtle Rail',
      badge: '━ Clean',
      desc: 'Minimal luminous accent rail & sleek clean borders only'
    }
  };

  const ACCESSORY_COMPONENTS = [
    { key: 'crest', prop: 'accCrest', label: 'Top Crown Crest', icon: '👑', desc: 'Symmetrical crown resting on card top' },
    { key: 'charm', prop: 'accCharm', label: 'Side Pendant Charm', icon: '💎', desc: 'Hanging bead talisman on bubble edge' },
    { key: 'corners', prop: 'accCorners', label: 'Corner Guards', icon: '🛡️', desc: '4-corner ornamental filigree brackets' },
    { key: 'seal', prop: 'accSeal', label: 'Wax Seal Stamp', icon: '💮', desc: '3D embossed wax seal on message corner' },
    { key: 'rail', prop: 'accRail', label: 'Luminous Rail', icon: '━', desc: 'Thematic glowing vertical edge rail' }
  ];

  const STORAGE_CUSTOM_PRESETS = 'agy_custom_presets_v1';
  const LIVE_DB_NAME = 'agy_live_wallpaper_db_v1';
  const LIVE_STORE_NAME = 'videos';

  function getCustomPresets() {
    try {
      const raw = localStorage.getItem(STORAGE_CUSTOM_PRESETS);
      if (raw !== null) {
        const fromLocal = JSON.parse(raw);
        if (fromLocal && typeof fromLocal === 'object') {
          for (const k of Object.keys(fromLocal)) {
            if (!THEMES[k]) fromLocal[k].isCustom = true;
          }
          return fromLocal;
        }
      }
      // Cold start hydration from initial daemon config
      const fromInit = (window.__AGY_INITIAL_CONFIG__ && window.__AGY_INITIAL_CONFIG__.customPresets) || {};
      for (const k of Object.keys(fromInit)) {
        if (!THEMES[k]) fromInit[k].isCustom = true;
      }
      if (Object.keys(fromInit).length > 0) {
        localStorage.setItem(STORAGE_CUSTOM_PRESETS, JSON.stringify(fromInit));
      }
      return fromInit;
    } catch (_) {
      return {};
    }
  }

  function saveCustomPreset(preset) {
    try {
      const presets = getCustomPresets();
      preset.isCustom = true;
      presets[preset.name] = preset;
      if (window.__AGY_INITIAL_CONFIG__) {
        if (!window.__AGY_INITIAL_CONFIG__.customPresets) {
          window.__AGY_INITIAL_CONFIG__.customPresets = {};
        }
        window.__AGY_INITIAL_CONFIG__.customPresets[preset.name] = preset;
      }
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
      if (window.__AGY_INITIAL_CONFIG__ && window.__AGY_INITIAL_CONFIG__.customPresets) {
        delete window.__AGY_INITIAL_CONFIG__.customPresets[presetName];
      }
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

  function svgToDataUri(svg) {
    return 'data:image/svg+xml,' + encodeURIComponent(svg.trim()).replace(/'/g, '%27').replace(/"/g, '%22');
  }

  function detectThemeMotif(name = '', concept = '', th = {}) {
    if (th && th.motif) return th.motif;
    const s = `${name} ${concept}`.toLowerCase();
    if (/obsidian|prism|gem|diamond|crystal|thach|midnight/i.test(s)) return 'obsidian_prism';
    if (/frost|blade|ice|tuyet|kiem|hiyuki|cold|winter|wuthering/i.test(s)) return 'frost_blade';
    if (/\b(dem|night|moon|star|astral|cosmic|trang|sao|galaxy|space|sky)\b/i.test(s) || /phong canh dem/i.test(s)) return 'night_astral';
    if (/sakura|flower|rose|hoa|petal|bloom|anime/i.test(s)) return 'sakura_bloom';
    if (/cyber|neon|tech|matrix|code|digital|glitch|circuit/i.test(s)) return 'cyber_neon';
    if (/royal|gold|crown|king|queen|hoang|gia|vintage|flame|fire|sun|solar|thien/i.test(s)) return 'royal_crest';

    if (th && th.primary && th.primary.startsWith('#') && th.primary.length >= 7) {
      const r = parseInt(th.primary.slice(1, 3), 16) || 0;
      const g = parseInt(th.primary.slice(3, 5), 16) || 0;
      const b = parseInt(th.primary.slice(5, 7), 16) || 0;
      const [h] = rgbToHsl(r, g, b);
      if (h >= 170 && h <= 215) return 'frost_blade';
      if (h >= 215 && h <= 280) return 'night_astral';
      if (h >= 280 && h <= 350) return 'sakura_bloom';
      if (h >= 20 && h <= 65) return 'royal_crest';
      if (h >= 110 && h <= 170) return 'cyber_neon';
    }
    return 'night_astral';
  }

  function getThematicCrestSvg(primary, secondary, motif = 'night_astral') {
    const p = primary || '#38bdf8';
    const s = secondary || p;

    if (motif === 'frost_blade') {
      return svgToDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 32" fill="none">
          <path d="M8 24 Q38 10 60 18 Q66 20 70 14 Q74 20 80 18 Q102 10 132 24" stroke="${p}" stroke-width="1.5" stroke-linecap="round" opacity="0.9"/>
          <path d="M24 20 Q48 10 70 16 Q92 10 116 20" stroke="${s}" stroke-width="1.1" stroke-linecap="round" opacity="0.75"/>
          <path d="M40 26 Q70 12 100 26" stroke="${p}" stroke-width="0.8" stroke-dasharray="2 3" opacity="0.6"/>
          <g transform="translate(70, 14)">
            <line x1="0" y1="-10" x2="0" y2="10" stroke="${p}" stroke-width="1.6" stroke-linecap="round"/>
            <line x1="-8.66" y1="-5" x2="8.66" y2="5" stroke="${s}" stroke-width="1.4" stroke-linecap="round"/>
            <line x1="-8.66" y1="5" x2="8.66" y2="-5" stroke="${s}" stroke-width="1.4" stroke-linecap="round"/>
            <path d="M-3 -6 L0 -9 L3 -6" stroke="${p}" stroke-width="1.2" fill="none" stroke-linecap="round"/>
            <path d="M-3 6 L0 9 L3 6" stroke="${p}" stroke-width="1.2" fill="none" stroke-linecap="round"/>
            <path d="M-7 -1 L-8.66 -5 L-5 -4" stroke="${s}" stroke-width="1" fill="none" stroke-linecap="round"/>
            <path d="M7 1 L8.66 5 L5 4" stroke="${s}" stroke-width="1" fill="none" stroke-linecap="round"/>
            <polygon points="0,-5 4,0 0,5 -4,0" fill="${p}" opacity="0.95"/>
            <circle cx="0" cy="0" r="1.5" fill="#ffffff"/>
          </g>
          <polygon points="46,14 48,10 50,14 48,18" fill="${s}" opacity="0.9"/>
          <polygon points="94,14 92,10 90,14 92,18" fill="${s}" opacity="0.9"/>
          <circle cx="34" cy="16" r="1.5" fill="${p}" opacity="0.85"/>
          <circle cx="106" cy="16" r="1.5" fill="${p}" opacity="0.85"/>
          <circle cx="20" cy="22" r="1.2" fill="${s}" opacity="0.75"/>
          <circle cx="120" cy="22" r="1.2" fill="${s}" opacity="0.75"/>
        </svg>
      `);
    }

    if (motif === 'night_astral') {
      return svgToDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 32" fill="none">
          <path d="M6 25 Q42 8 68 18 Q70 19 72 18 Q98 8 134 25" stroke="${p}" stroke-width="1.5" stroke-linecap="round" opacity="0.88"/>
          <path d="M20 22 Q48 10 70 15 Q92 10 120 22" stroke="${s}" stroke-width="1.1" stroke-linecap="round" opacity="0.75"/>
          <path d="M35 27 Q70 14 105 27" stroke="${p}" stroke-width="0.8" stroke-dasharray="3 3" opacity="0.55"/>
          <g transform="translate(70, 14)">
            <path d="M-1 -10 A 10 10 0 1 0 7 8 A 8 8 0 1 1 -1 -10 Z" fill="${p}" opacity="0.95"/>
            <g transform="translate(4, -1)">
              <polygon points="0,-7 1.8,-1.8 7,0 1.8,1.8 0,7 -1.8,1.8 -7,0 -1.8,-1.8" fill="${s}" opacity="0.95"/>
              <polygon points="0,-4.5 1.2,-1.2 4.5,0 1.2,1.2 0,4.5 -1.2,1.2 -4.5,0 -1.2,-1.2" fill="#ffffff" opacity="0.9"/>
              <circle cx="0" cy="0" r="1.2" fill="#ffffff"/>
            </g>
          </g>
          <polygon points="42,8.5 43,12 46.5,13 43,14 42,17.5 41,14 37.5,13 41,12" fill="${p}" opacity="0.9"/>
          <polygon points="98,8.5 99,12 102.5,13 99,14 98,17.5 97,14 93.5,13 97,12" fill="${p}" opacity="0.9"/>
          <circle cx="28" cy="18" r="1.6" fill="${s}" opacity="0.85"/>
          <circle cx="112" cy="18" r="1.6" fill="${s}" opacity="0.85"/>
          <circle cx="16" cy="23" r="1.2" fill="${p}" opacity="0.75"/>
          <circle cx="124" cy="23" r="1.2" fill="${p}" opacity="0.75"/>
        </svg>
      `);
    }

    if (motif === 'obsidian_prism') {
      return svgToDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 32" fill="none">
          <path d="M8 22 L36 12 L60 17 L70 12 L80 17 L104 12 L132 22" stroke="${p}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
          <path d="M22 24 L48 15 L70 19 L92 15 L118 24" stroke="${s}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" opacity="0.75"/>
          <g transform="translate(70, 14)">
            <polygon points="0,-11 9,-3 6,8 0,11 -6,8 -9,-3" stroke="${p}" stroke-width="1.4" fill="none" stroke-linejoin="round" opacity="0.85"/>
            <polygon points="0,-9 7,-2 4,6 0,8 -4,6 -7,-2" fill="${s}" opacity="0.85"/>
            <polygon points="0,-9 0,8 4,6 7,-2" fill="${p}" opacity="0.95"/>
            <line x1="0" y1="-9" x2="0" y2="8" stroke="#ffffff" stroke-width="0.9" opacity="0.7"/>
            <line x1="-7" y1="-2" x2="7" y2="-2" stroke="#ffffff" stroke-width="0.9" opacity="0.7"/>
            <circle cx="0" cy="-2" r="1.5" fill="#ffffff"/>
          </g>
          <polygon points="44,14 48,11 52,14 48,17" fill="${p}" opacity="0.9"/>
          <polygon points="96,14 92,11 88,14 92,17" fill="${p}" opacity="0.9"/>
          <circle cx="32" cy="15" r="1.5" fill="${s}" opacity="0.85"/>
          <circle cx="108" cy="15" r="1.5" fill="${s}" opacity="0.85"/>
        </svg>
      `);
    }

    if (motif === 'sakura_bloom') {
      return svgToDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 32" fill="none">
          <path d="M8 25 Q38 11 60 18 Q66 20 70 15 Q74 20 80 18 Q102 11 132 25" stroke="${p}" stroke-width="1.5" stroke-linecap="round" opacity="0.9"/>
          <path d="M24 21 Q48 11 70 16 Q92 11 116 21" stroke="${s}" stroke-width="1.1" stroke-linecap="round" opacity="0.75"/>
          <g transform="translate(70, 14)">
            <g transform="rotate(0)"><path d="M0 0 C-3 -4, -4 -9, 0 -10 C4 -9, 3 -4, 0 0" fill="${p}" opacity="0.92"/></g>
            <g transform="rotate(72)"><path d="M0 0 C-3 -4, -4 -9, 0 -10 C4 -9, 3 -4, 0 0" fill="${p}" opacity="0.92"/></g>
            <g transform="rotate(144)"><path d="M0 0 C-3 -4, -4 -9, 0 -10 C4 -9, 3 -4, 0 0" fill="${p}" opacity="0.92"/></g>
            <g transform="rotate(216)"><path d="M0 0 C-3 -4, -4 -9, 0 -10 C4 -9, 3 -4, 0 0" fill="${p}" opacity="0.92"/></g>
            <g transform="rotate(288)"><path d="M0 0 C-3 -4, -4 -9, 0 -10 C4 -9, 3 -4, 0 0" fill="${p}" opacity="0.92"/></g>
            <circle cx="0" cy="0" r="2.2" fill="${s}"/>
            <circle cx="0" cy="0" r="1.2" fill="#ffffff"/>
          </g>
          <g transform="translate(45, 12) rotate(-25)"><path d="M0 0 C-2 -2, -2 -5, 0 -6 C2 -5, 2 -2, 0 0" fill="${s}" opacity="0.85"/></g>
          <g transform="translate(95, 12) rotate(25)"><path d="M0 0 C-2 -2, -2 -5, 0 -6 C2 -5, 2 -2, 0 0" fill="${s}" opacity="0.85"/></g>
          <circle cx="30" cy="18" r="1.5" fill="${p}" opacity="0.8"/>
          <circle cx="110" cy="18" r="1.5" fill="${p}" opacity="0.8"/>
        </svg>
      `);
    }

    if (motif === 'cyber_neon') {
      return svgToDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 32" fill="none">
          <path d="M8 22 L32 22 L44 14 L62 14 L68 18 L72 18 L78 14 L96 14 L108 22 L132 22" stroke="${p}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
          <path d="M22 25 L38 25 L48 18 L64 18 L70 21 L76 18 L92 18 L102 25 L118 25" stroke="${s}" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" opacity="0.75"/>
          <g transform="translate(70, 14)">
            <polygon points="0,-8 7,-4 7,4 0,8 -7,4 -7,-4" stroke="${p}" stroke-width="1.5" fill="none"/>
            <polygon points="0,-5 4,-2.5 4,2.5 0,5 -4,2.5 -4,-2.5" fill="${s}" opacity="0.9"/>
            <circle cx="0" cy="0" r="1.5" fill="#ffffff"/>
          </g>
          <circle cx="44" cy="14" r="2" fill="${p}"/>
          <circle cx="96" cy="14" r="2" fill="${p}"/>
          <circle cx="32" cy="22" r="1.8" fill="${s}"/>
          <circle cx="108" cy="22" r="1.8" fill="${s}"/>
        </svg>
      `);
    }

    return svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 32" fill="none">
        <path d="M8 24 Q36 8 60 16 Q66 18 70 12 Q74 18 80 16 Q104 8 132 24" stroke="${p}" stroke-width="1.6" stroke-linecap="round" opacity="0.92"/>
        <path d="M22 20 Q46 10 70 15 Q94 10 118 20" stroke="${s}" stroke-width="1.2" stroke-linecap="round" opacity="0.78"/>
        <g transform="translate(70, 14)">
          <path d="M-8 4 L-9 -4 L-4 0 L0 -8 L4 0 L9 -4 L8 4 Z" fill="${p}" opacity="0.95"/>
          <path d="M-6 4 L0 -5 L6 4 Z" fill="${s}" opacity="0.9"/>
          <circle cx="0" cy="-9" r="1.5" fill="#ffffff"/>
          <circle cx="-9" cy="-5" r="1.2" fill="${s}"/>
          <circle cx="9" cy="-5" r="1.2" fill="${s}"/>
          <circle cx="0" cy="1" r="1.5" fill="#ffffff"/>
        </g>
        <circle cx="46" cy="14" r="2" fill="${s}" opacity="0.9"/>
        <circle cx="94" cy="14" r="2" fill="${s}" opacity="0.9"/>
        <circle cx="32" cy="17" r="1.5" fill="${p}" opacity="0.85"/>
        <circle cx="108" cy="17" r="1.5" fill="${p}" opacity="0.85"/>
      </svg>
    `);
  }

  function getThematicCornerSvg(primary, secondary, motif = 'night_astral') {
    const p = primary || '#38bdf8';
    const s = secondary || p;

    let microSymbol = `<circle cx="7" cy="7" r="2" fill="${p}"/>`;
    if (motif === 'frost_blade') {
      microSymbol = `
        <polygon points="7,2.5 8.5,5.5 11.5,7 8.5,8.5 7,11.5 5.5,8.5 2.5,7 5.5,5.5" fill="${p}" opacity="0.95"/>
        <circle cx="7" cy="7" r="1" fill="#ffffff"/>
      `;
    } else if (motif === 'night_astral') {
      microSymbol = `
        <path d="M5.5 3 A 4 4 0 1 0 9 7.5 A 3.2 3.2 0 1 1 5.5 3 Z" fill="${p}" opacity="0.95"/>
        <circle cx="8" cy="5.5" r="1.1" fill="${s}"/>
      `;
    } else if (motif === 'obsidian_prism') {
      microSymbol = `
        <polygon points="7,2.5 11,7 7,11.5 3,7" fill="${p}" opacity="0.9"/>
        <polygon points="7,4.5 9.5,7 7,9.5 4.5,7" fill="${s}"/>
      `;
    } else if (motif === 'sakura_bloom') {
      microSymbol = `
        <circle cx="7" cy="7" r="1.8" fill="${p}"/>
        <circle cx="7" cy="4.2" r="1.3" fill="${s}" opacity="0.85"/>
        <circle cx="9.6" cy="6.2" r="1.3" fill="${s}" opacity="0.85"/>
        <circle cx="8.6" cy="9.6" r="1.3" fill="${s}" opacity="0.85"/>
        <circle cx="5.4" cy="9.6" r="1.3" fill="${s}" opacity="0.85"/>
        <circle cx="4.4" cy="6.2" r="1.3" fill="${s}" opacity="0.85"/>
        <circle cx="7" cy="7" r="0.9" fill="#ffffff"/>
      `;
    } else if (motif === 'cyber_neon') {
      microSymbol = `
        <polygon points="7,3 10.5,5 10.5,9 7,11 3.5,9 3.5,5" stroke="${p}" stroke-width="1.1" fill="none"/>
        <circle cx="7" cy="7" r="1.4" fill="${s}"/>
      `;
    } else { // royal_crest
      microSymbol = `
        <polygon points="7,2.5 9.5,7 7,6 4.5,7" fill="${p}" opacity="0.95"/>
        <circle cx="7" cy="7" r="1.2" fill="${s}"/>
      `;
    }

    return svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none">
        <path d="M2 24 L2 6 Q2 2 6 2 L24 2" stroke="${p}" stroke-width="1.8" stroke-linecap="round" opacity="0.92"/>
        <path d="M5 18 L5 8 Q5 5 8 5 L18 5" stroke="${s}" stroke-width="1.2" stroke-linecap="round" opacity="0.78"/>
        ${microSymbol}
        <circle cx="15" cy="3.5" r="1.2" fill="${s}" opacity="0.85"/>
        <circle cx="3.5" cy="15" r="1.2" fill="${s}" opacity="0.85"/>
      </svg>
    `);
  }

  function getThemeCharmSvg(motif, primary, secondary) {
    const p = primary || '#38bdf8';
    const s = secondary || p;

    if (motif === 'frost_blade') {
      return svgToDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 84" fill="none">
          <path d="M20 2 C16 2 14 6 14 10 C14 14 18 17 20 18 C22 17 26 14 26 10 C26 6 24 2 20 2 Z" stroke="${s}" stroke-width="1.4" fill="none" opacity="0.9"/>
          <circle cx="20" cy="18" r="2.5" fill="${p}" stroke="#ffffff" stroke-width="0.8"/>
          <ellipse cx="20" cy="28" rx="15" ry="8" stroke="${p}" stroke-width="1.6" fill="#0c1424" opacity="0.95"/>
          <ellipse cx="20" cy="28" rx="12" ry="6" stroke="${s}" stroke-width="0.9" fill="none" opacity="0.8"/>
          <line x1="20" y1="23" x2="20" y2="33" stroke="${p}" stroke-width="1.2" stroke-linecap="round"/>
          <line x1="12" y1="28" x2="28" y2="28" stroke="${p}" stroke-width="1.2" stroke-linecap="round"/>
          <circle cx="20" cy="28" r="2" fill="#ffffff"/>
          <polygon points="20,36 24,41 20,46 16,41" fill="${p}" stroke="#ffffff" stroke-width="0.8"/>
          <circle cx="20" cy="49" r="1.8" fill="${s}"/>
          <path d="M14 53 Q20 50 26 53 L24 57 Q20 55 16 57 Z" fill="${p}" stroke="${s}" stroke-width="0.8"/>
          <path d="M16 57 Q13 70 14 82" stroke="${p}" stroke-width="1.4" stroke-linecap="round"/>
          <path d="M18 57 Q17 70 18 84" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" opacity="0.9"/>
          <path d="M20 57 L20 84" stroke="${s}" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M22 57 Q23 70 22 84" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" opacity="0.9"/>
          <path d="M24 57 Q27 70 26 82" stroke="${p}" stroke-width="1.4" stroke-linecap="round"/>
          <circle cx="15" cy="72" r="1.4" fill="${s}"/>
          <circle cx="25" cy="72" r="1.4" fill="${s}"/>
          <circle cx="20" cy="76" r="1.6" fill="#ffffff"/>
          <polygon points="7,24 8,26 10,27 8,28 7,30 6,28 4,27 6,26" fill="${p}" opacity="0.85"/>
          <polygon points="33,36 34,38 36,39 34,40 33,42 32,40 30,39 32,38" fill="${s}" opacity="0.85"/>
        </svg>
      `);
    }

    if (motif === 'night_astral') {
      return svgToDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 84" fill="none">
          <line x1="20" y1="1" x2="20" y2="15" stroke="${s}" stroke-width="1.2" stroke-dasharray="2 2"/>
          <circle cx="20" cy="15" r="2.5" fill="${p}"/>
          <circle cx="20" cy="29" r="13" stroke="${p}" stroke-width="1.5" fill="#090d1f" opacity="0.92"/>
          <ellipse cx="20" cy="29" rx="13" ry="5" stroke="${s}" stroke-width="0.9" fill="none" opacity="0.8"/>
          <path d="M17 20 A 9 9 0 1 0 24 35 A 7 7 0 1 1 17 20 Z" fill="${s}" opacity="0.95"/>
          <circle cx="22" cy="25" r="1.8" fill="#ffffff"/>
          <line x1="20" y1="42" x2="20" y2="58" stroke="${s}" stroke-width="1" stroke-dasharray="2 2"/>
          <line x1="12" y1="39" x2="9" y2="52" stroke="${p}" stroke-width="0.9" stroke-dasharray="2 2"/>
          <line x1="28" y1="39" x2="31" y2="52" stroke="${p}" stroke-width="0.9" stroke-dasharray="2 2"/>
          <polygon points="9,52 10.5,55 13.5,56 10.5,57 9,60 7.5,57 4.5,56 7.5,55" fill="${p}"/>
          <polygon points="31,52 32.5,55 35.5,56 32.5,57 31,60 29.5,57 26.5,56 29.5,55" fill="${p}"/>
          <g transform="translate(20, 68)">
            <polygon points="0,-12 2.5,-3 11,-3 4,2 6.5,10 0,5 -6.5,10 -4,2 -11,-3 -2.5,-3" fill="${s}" stroke="#ffffff" stroke-width="0.7"/>
            <circle cx="0" cy="0" r="2.2" fill="#ffffff"/>
          </g>
        </svg>
      `);
    }

    if (motif === 'royal_crest') {
      return svgToDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 84" fill="none">
          <path d="M10 2 L30 2 L28 6 L12 6 Z" fill="${p}" stroke="#ffffff" stroke-width="0.6"/>
          <path d="M14 6 L10 22 L20 18 L30 22 L26 6 Z" fill="#991b1b" stroke="${p}" stroke-width="1.2"/>
          <path d="M17 6 L15 20 L20 18 L25 20 L23 6 Z" fill="${s}" opacity="0.85"/>
          <circle cx="20" cy="18" r="3" fill="${p}" stroke="#ffffff" stroke-width="0.8"/>
          <circle cx="20" cy="36" r="14" fill="#1c140a" stroke="${p}" stroke-width="1.8"/>
          <circle cx="20" cy="36" r="11.5" stroke="${s}" stroke-width="0.9" stroke-dasharray="2 1.5"/>
          <g transform="translate(20, 36)">
            <path d="M0 -8 C-2 -4 -3 -1 0 3 C3 -1 2 -4 0 -8 Z" fill="${p}"/>
            <path d="M-1 1 C-5 0 -8 -3 -8 -6 C-7 -7 -5 -6 -4 -4 C-3 -1 -2 1 -1 1 Z" fill="${s}"/>
            <path d="M1 1 C5 0 8 -3 8 -6 C7 -7 5 -6 4 -4 C3 -1 2 1 1 1 Z" fill="${s}"/>
            <rect x="-5" y="1" width="10" height="2" rx="1" fill="${p}"/>
            <circle cx="0" cy="5" r="1" fill="#ffffff"/>
          </g>
          <line x1="20" y1="50" x2="20" y2="58" stroke="${p}" stroke-width="1.4"/>
          <circle cx="20" cy="58" r="2" fill="${s}"/>
          <path d="M20 60 C16 67 15 74 20 80 C25 74 24 67 20 60 Z" fill="#fef08a" stroke="${p}" stroke-width="1.2"/>
          <ellipse cx="19" cy="68" rx="1.5" ry="4" fill="#ffffff" opacity="0.75"/>
        </svg>
      `);
    }

    if (motif === 'obsidian_prism') {
      return svgToDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 84" fill="none">
          <polygon points="20,1 24,3 24,8 20,10 16,8 16,3" stroke="${p}" stroke-width="1.2" fill="none"/>
          <polygon points="20,8 24,10 24,15 20,17 16,15 16,10" stroke="${s}" stroke-width="1.2" fill="none"/>
          <circle cx="20" cy="20" r="3" fill="${p}" stroke="#ffffff" stroke-width="0.8"/>
          <g transform="translate(20, 48)">
            <polygon points="0,-24 14,-10 9,20 0,32 -9,20 -14,-10" fill="#090514" stroke="${p}" stroke-width="1.6"/>
            <polygon points="0,-24 14,-10 0,-4" fill="${p}" opacity="0.45"/>
            <polygon points="0,-24 -14,-10 0,-4" fill="${s}" opacity="0.35"/>
            <polygon points="14,-10 9,20 0,7 0,-4" fill="${s}" opacity="0.5"/>
            <polygon points="-14,-10 -9,20 0,7 0,-4" fill="${p}" opacity="0.6"/>
            <polygon points="0,7 9,20 0,32" fill="${p}" opacity="0.8"/>
            <polygon points="0,7 -9,20 0,32" fill="${s}" opacity="0.9"/>
            <line x1="0" y1="-24" x2="0" y2="32" stroke="#ffffff" stroke-width="1" opacity="0.85"/>
            <circle cx="0" cy="0" r="2.5" fill="#ffffff"/>
          </g>
          <polygon points="3,36 4,38 6,39 4,40 3,42 2,40 0,39 2,38" fill="${s}"/>
          <polygon points="37,48 38,50 40,51 38,52 37,54 36,52 34,51 36,50" fill="${p}"/>
        </svg>
      `);
    }

    if (motif === 'sakura_bloom') {
      return svgToDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 84" fill="none">
          <path d="M15 4 C15 10 25 10 25 4" stroke="${p}" stroke-width="1.5" fill="none"/>
          <circle cx="20" cy="14" r="3" fill="${s}" stroke="#ffffff" stroke-width="0.8"/>
          <g transform="translate(20, 28)">
            <g transform="rotate(0)"><path d="M0 0 C-2 -3 -3 -7 0 -8 C3 -7 2 -3 0 0" fill="${p}" opacity="0.95"/></g>
            <g transform="rotate(72)"><path d="M0 0 C-2 -3 -3 -7 0 -8 C3 -7 2 -3 0 0" fill="${p}" opacity="0.95"/></g>
            <g transform="rotate(144)"><path d="M0 0 C-2 -3 -3 -7 0 -8 C3 -7 2 -3 0 0" fill="${p}" opacity="0.95"/></g>
            <g transform="rotate(216)"><path d="M0 0 C-2 -3 -3 -7 0 -8 C3 -7 2 -3 0 0" fill="${p}" opacity="0.95"/></g>
            <g transform="rotate(288)"><path d="M0 0 C-2 -3 -3 -7 0 -8 C3 -7 2 -3 0 0" fill="${p}" opacity="0.95"/></g>
            <circle cx="0" cy="0" r="2.5" fill="${s}"/>
            <circle cx="0" cy="0" r="1.2" fill="#ffffff"/>
          </g>
          <line x1="20" y1="38" x2="20" y2="48" stroke="${p}" stroke-width="1.2"/>
          <circle cx="20" cy="54" r="6" fill="#fdf2f8" stroke="${s}" stroke-width="1.4"/>
          <circle cx="20" cy="57" r="1.5" fill="${p}"/>
          <path d="M16 60 Q13 72 15 84" stroke="${p}" stroke-width="1.4" stroke-linecap="round"/>
          <path d="M20 60 L20 84" stroke="${s}" stroke-width="1.5" stroke-linecap="round"/>
          <path d="M24 60 Q27 72 25 84" stroke="${p}" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
      `);
    }

    return svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 84" fill="none">
        <line x1="20" y1="2" x2="20" y2="16" stroke="${p}" stroke-width="1.5"/>
        <circle cx="20" cy="18" r="4" fill="${s}" stroke="#ffffff" stroke-width="1"/>
        <polygon points="20,24 32,38 20,52 8,38" fill="#111827" stroke="${p}" stroke-width="1.8"/>
        <polygon points="20,29 28,38 20,47 12,38" fill="${s}" opacity="0.75"/>
        <circle cx="20" cy="38" r="2.5" fill="#ffffff"/>
        <line x1="20" y1="52" x2="20" y2="68" stroke="${p}" stroke-width="1.5"/>
        <polygon points="20,68 25,76 20,84 15,76" fill="${p}"/>
      </svg>
    `);
  }

  function getThemeBadgeSvg(motif, primary, secondary, customTitle) {
    const p = primary || '#38bdf8';
    const s = secondary || p;

    let title = customTitle;
    let iconPath = '';

    if (motif === 'frost_blade') {
      title = title || '❄ HIYUKI • FROST BLADE';
      iconPath = `
        <g transform="translate(14, 13)">
          <line x1="-7" y1="0" x2="7" y2="0" stroke="${p}" stroke-width="1.4"/>
          <line x1="0" y1="-7" x2="0" y2="7" stroke="${p}" stroke-width="1.4"/>
          <line x1="-5" y1="-5" x2="5" y2="5" stroke="${s}" stroke-width="1.1"/>
          <line x1="-5" y1="5" x2="5" y2="-5" stroke="${s}" stroke-width="1.1"/>
          <circle cx="0" cy="0" r="1.5" fill="#ffffff"/>
        </g>
      `;
    } else if (motif === 'night_astral') {
      title = title || '✦ ASTRAL NIGHT • COSMOS';
      iconPath = `
        <g transform="translate(14, 13)">
          <path d="M-3 -6 A 6 6 0 1 0 4 5 A 4.5 4.5 0 1 1 -3 -6 Z" fill="${s}"/>
          <polygon points="2,-3 3,-1 5,0 3,1 2,3 1,1 -1,0 1,-1" fill="#ffffff"/>
        </g>
      `;
    } else if (motif === 'royal_crest') {
      title = title || '⚜ THIÊN • IMPERIAL';
      iconPath = `
        <g transform="translate(14, 13)">
          <path d="M0 -6 C-2 -3 -2 -1 0 2 C2 -1 2 -3 0 -6 Z" fill="${p}"/>
          <path d="M-1 0 C-4 -1 -6 -3 -5 -5 C-4 -4 -3 -2 -1 0 Z" fill="${s}"/>
          <path d="M1 0 C4 -1 6 -3 5 -5 C4 -4 3 -2 1 0 Z" fill="${s}"/>
          <rect x="-4" y="1" width="8" height="1.6" rx="0.8" fill="${p}"/>
        </g>
      `;
    } else if (motif === 'obsidian_prism') {
      title = title || '◈ OBSIDIAN • PRISM GEM';
      iconPath = `
        <g transform="translate(14, 13)">
          <polygon points="0,-7 6,-2 4,5 0,7 -4,5 -6,-2" stroke="${p}" stroke-width="1.2" fill="#0d0918"/>
          <polygon points="0,-5 4,-1 0,4 -4,-1" fill="${s}"/>
          <circle cx="0" cy="0" r="1.2" fill="#ffffff"/>
        </g>
      `;
    } else if (motif === 'sakura_bloom') {
      title = title || '🌸 SAKURA • BLOSSOM';
      iconPath = `
        <g transform="translate(14, 13)">
          <path d="M0 -6 C-2 -4 -2 -1 0 1 C2 -1 2 -4 0 -6 Z" fill="${p}"/>
          <circle cx="0" cy="0" r="1.5" fill="${s}"/>
        </g>
      `;
    } else {
      title = title || '✧ THEME STUDIO';
      iconPath = `
        <g transform="translate(14, 13)">
          <polygon points="0,-6 2,-2 6,0 2,2 0,6 -2,2 -6,0 -2,-2" fill="${p}"/>
          <circle cx="0" cy="0" r="1.2" fill="#ffffff"/>
        </g>
      `;
    }

    let cleanTitle = (title || '✧ THEME STUDIO').replace(/\s+/g, ' ').trim();
    if (cleanTitle.length > 24) {
      cleanTitle = cleanTitle.slice(0, 22) + '…';
    }
    const estTextW = Math.ceil(cleanTitle.length * 7.2);
    const totalW = Math.max(160, 32 + estTextW + 28);
    const rectW = totalW - 2;
    const innerRectW = totalW - 6;
    const dot1 = totalW - 16;
    const dot2 = totalW - 9;

    return svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} 26" fill="none">
        <defs>
          <linearGradient id="badgeBorder_${motif}" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="${p}" stop-opacity="0.9"/>
            <stop offset="50%" stop-color="${s}" stop-opacity="0.8"/>
            <stop offset="100%" stop-color="${p}" stop-opacity="0.9"/>
          </linearGradient>
          <linearGradient id="badgeBg_${motif}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0f172a" stop-opacity="0.92"/>
            <stop offset="100%" stop-color="#020617" stop-opacity="0.96"/>
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="${rectW}" height="24" rx="12" fill="url(#badgeBg_${motif})" stroke="url(#badgeBorder_${motif})" stroke-width="1.2"/>
        <rect x="3" y="3" width="${innerRectW}" height="20" rx="10" stroke="rgba(255,255,255,0.08)" stroke-width="0.8" fill="none"/>
        ${iconPath}
        <text x="28" y="16.5" fill="#f8fafc" font-size="9.5" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="700" letter-spacing="0.6">${cleanTitle}</text>
        <circle cx="${dot1}" cy="13" r="1.8" fill="${p}"/>
        <circle cx="${dot2}" cy="13" r="1.8" fill="${s}"/>
      </svg>
    `);
  }

  function getThemeWatermarkSvg(motif, primary, secondary) {
    const p = primary || '#38bdf8';
    const s = secondary || p;

    if (motif === 'frost_blade') {
      return svgToDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
          <g transform="translate(100, 100)" opacity="0.08">
            <circle cx="0" cy="0" r="90" stroke="${p}" stroke-width="1.5" stroke-dasharray="4 4"/>
            <circle cx="0" cy="0" r="76" stroke="${s}" stroke-width="1"/>
            <circle cx="0" cy="0" r="54" stroke="${p}" stroke-width="1.2" stroke-dasharray="2 3"/>
            <circle cx="0" cy="0" r="32" stroke="${s}" stroke-width="1"/>
            <line x1="-80" y1="-80" x2="80" y2="80" stroke="${p}" stroke-width="3" stroke-linecap="round"/>
            <line x1="-80" y1="80" x2="80" y2="-80" stroke="${p}" stroke-width="3" stroke-linecap="round"/>
            <ellipse cx="0" cy="0" rx="14" ry="7" transform="rotate(45)" stroke="${s}" stroke-width="2"/>
            <ellipse cx="0" cy="0" rx="14" ry="7" transform="rotate(-45)" stroke="${s}" stroke-width="2"/>
            <line x1="0" y1="-85" x2="0" y2="85" stroke="${s}" stroke-width="1.6"/>
            <line x1="-73.6" y1="-42.5" x2="73.6" y2="42.5" stroke="${s}" stroke-width="1.6"/>
            <line x1="-73.6" y1="42.5" x2="73.6" y2="-42.5" stroke="${s}" stroke-width="1.6"/>
            <path d="M-15 -60 L0 -75 L15 -60" stroke="${p}" stroke-width="1.5" fill="none"/>
            <path d="M-15 60 L0 75 L15 60" stroke="${p}" stroke-width="1.5" fill="none"/>
            <polygon points="0,-22 18,0 0,22 -18,0" stroke="${s}" stroke-width="1.5" fill="none"/>
          </g>
        </svg>
      `);
    }

    if (motif === 'night_astral') {
      return svgToDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
          <g transform="translate(100, 100)" opacity="0.08">
            <circle cx="0" cy="0" r="92" stroke="${p}" stroke-width="1.5" stroke-dasharray="5 3"/>
            <circle cx="0" cy="0" r="80" stroke="${s}" stroke-width="1.2"/>
            <ellipse cx="0" cy="0" rx="80" ry="34" stroke="${s}" stroke-width="1" transform="rotate(30)"/>
            <ellipse cx="0" cy="0" rx="80" ry="34" stroke="${p}" stroke-width="1" transform="rotate(-30)"/>
            <circle cx="0" cy="0" r="50" stroke="${p}" stroke-width="1.2" stroke-dasharray="3 4"/>
            <path d="M-22 -35 A 42 42 0 1 0 32 30 A 32 32 0 1 1 -22 -35 Z" stroke="${s}" stroke-width="2" fill="none"/>
            <polygon points="0,-65 8,-18 55,0 8,18 0,65 -8,18 -55,0 -8,-18" stroke="${p}" stroke-width="1.5" fill="none"/>
            <polygon points="0,-40 6,-12 34,0 6,12 0,40 -6,12 -34,0 -6,-12" stroke="${s}" stroke-width="1" fill="none"/>
            <circle cx="0" cy="-80" r="3" fill="${s}"/>
            <circle cx="0" cy="80" r="3" fill="${s}"/>
            <circle cx="-80" cy="0" r="3" fill="${p}"/>
            <circle cx="80" cy="0" r="3" fill="${p}"/>
          </g>
        </svg>
      `);
    }

    if (motif === 'royal_crest') {
      return svgToDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
          <g transform="translate(100, 100)" opacity="0.08">
            <circle cx="0" cy="0" r="90" stroke="${p}" stroke-width="1.5"/>
            <circle cx="0" cy="0" r="82" stroke="${s}" stroke-width="1" stroke-dasharray="2 3"/>
            <circle cx="0" cy="0" r="62" stroke="${p}" stroke-width="1.2"/>
            <path d="M-36 -10 L-42 -35 L-20 -24 L0 -45 L20 -24 L42 -35 L36 -10 Z" stroke="${p}" stroke-width="2" fill="none"/>
            <line x1="-36" y1="-10" x2="36" y2="-10" stroke="${s}" stroke-width="2"/>
            <path d="M0 -5 C-12 10 -15 28 0 45 C15 28 12 10 0 -5 Z" stroke="${s}" stroke-width="1.8" fill="none"/>
            <path d="M-6 12 C-24 10 -35 -4 -32 -18 C-26 -14 -18 -4 -6 12 Z" stroke="${p}" stroke-width="1.6" fill="none"/>
            <path d="M6 12 C24 10 35 -4 32 -18 C26 -14 18 -4 6 12 Z" stroke="${p}" stroke-width="1.6" fill="none"/>
            <line x1="-65" y1="55" x2="65" y2="-55" stroke="${s}" stroke-width="1.8"/>
            <line x1="65" y1="55" x2="-65" y2="-55" stroke="${s}" stroke-width="1.8"/>
          </g>
        </svg>
      `);
    }

    if (motif === 'obsidian_prism') {
      return svgToDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
          <g transform="translate(100, 100)" opacity="0.08">
            <polygon points="0,-88 76,-44 76,44 0,88 -76,44 -76,-44" stroke="${p}" stroke-width="1.8"/>
            <polygon points="0,-64 55,-32 55,32 0,64 -55,32 -55,-32" stroke="${s}" stroke-width="1.4"/>
            <line x1="0" y1="0" x2="0" y2="88" stroke="${p}" stroke-width="1.6"/>
            <line x1="0" y1="0" x2="-76" y2="-44" stroke="${p}" stroke-width="1.6"/>
            <line x1="0" y1="0" x2="76" y2="-44" stroke="${p}" stroke-width="1.6"/>
            <polygon points="0,-64 36,-18 0,28 -36,-18" stroke="${s}" stroke-width="1.5" fill="none"/>
            <line x1="-55" y1="32" x2="55" y2="-32" stroke="${p}" stroke-width="1" stroke-dasharray="3 3"/>
            <line x1="55" y1="32" x2="-55" y2="-32" stroke="${s}" stroke-width="1" stroke-dasharray="3 3"/>
          </g>
        </svg>
      `);
    }

    return svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
        <g transform="translate(100, 100)" opacity="0.08">
          <circle cx="0" cy="0" r="85" stroke="${p}" stroke-width="1.5" stroke-dasharray="4 4"/>
          <polygon points="0,-75 22,-22 75,0 22,22 0,75 -22,22 -75,0 -22,-22" stroke="${s}" stroke-width="1.5" fill="none"/>
          <circle cx="0" cy="0" r="30" stroke="${p}" stroke-width="1.2"/>
        </g>
      </svg>
    `);
  }

  function getThemeAgentAccentSvg(motif, primary, secondary) {
    const p = primary || '#38bdf8';
    const s = secondary || p;

    if (motif === 'frost_blade') {
      return svgToDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 16" fill="none">
          <line x1="0" y1="8" x2="38" y2="8" stroke="${p}" stroke-width="1.2"/>
          <line x1="62" y1="8" x2="100" y2="8" stroke="${p}" stroke-width="1.2"/>
          <g transform="translate(50, 8)">
            <polygon points="0,-6 4,0 0,6 -4,0" fill="${s}"/>
            <circle cx="0" cy="0" r="1.2" fill="#ffffff"/>
          </g>
          <circle cx="34" cy="8" r="1.5" fill="${s}"/>
          <circle cx="66" cy="8" r="1.5" fill="${s}"/>
        </svg>
      `);
    }

    if (motif === 'night_astral') {
      return svgToDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 16" fill="none">
          <line x1="0" y1="8" x2="36" y2="8" stroke="${s}" stroke-width="1.2" stroke-dasharray="3 2"/>
          <line x1="64" y1="8" x2="100" y2="8" stroke="${s}" stroke-width="1.2" stroke-dasharray="3 2"/>
          <g transform="translate(50, 8)">
            <polygon points="0,-6 1.8,-1.8 6,0 1.8,1.8 0,6 -1.8,1.8 -6,0 -1.8,-1.8" fill="${s}"/>
            <circle cx="0" cy="0" r="1" fill="#ffffff"/>
          </g>
          <circle cx="32" cy="8" r="1.5" fill="${p}"/>
          <circle cx="68" cy="8" r="1.5" fill="${p}"/>
        </svg>
      `);
    }

    if (motif === 'royal_crest') {
      return svgToDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 16" fill="none">
          <line x1="0" y1="8" x2="36" y2="8" stroke="${p}" stroke-width="1.4"/>
          <line x1="64" y1="8" x2="100" y2="8" stroke="${p}" stroke-width="1.4"/>
          <g transform="translate(50, 8)">
            <path d="M0 -5 C-1.5 -2 -1.5 0 0 2 C1.5 0 1.5 -2 0 -5 Z" fill="${p}"/>
            <circle cx="-3" cy="2" r="1" fill="${s}"/>
            <circle cx="3" cy="2" r="1" fill="${s}"/>
            <circle cx="0" cy="0" r="1" fill="#ffffff"/>
          </g>
          <circle cx="32" cy="8" r="1.6" fill="${p}"/>
          <circle cx="68" cy="8" r="1.6" fill="${p}"/>
        </svg>
      `);
    }

    return svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 16" fill="none">
        <line x1="0" y1="8" x2="38" y2="8" stroke="${p}" stroke-width="1.2"/>
        <line x1="62" y1="8" x2="100" y2="8" stroke="${p}" stroke-width="1.2"/>
        <polygon points="50,2 54,8 50,14 46,8" fill="${s}"/>
      </svg>
    `);
  }

  function getThemeUserCharmSvg(motif, primary, secondary) {
    const p = primary || '#38bdf8';
    const s = secondary || p;

    if (motif === 'frost_blade') {
      return svgToDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 68" fill="none">
          <circle cx="17" cy="6" r="3" stroke="${s}" stroke-width="1.2" fill="#0c1424"/>
          <line x1="17" y1="9" x2="17" y2="15" stroke="${p}" stroke-width="1.4"/>
          <rect x="7" y="15" width="20" height="24" rx="4" fill="#0f172a" stroke="${p}" stroke-width="1.4"/>
          <rect x="9" y="17" width="16" height="20" rx="2" stroke="${s}" stroke-width="0.8" stroke-dasharray="2 1.5" fill="none"/>
          <polygon points="17,21 21,27 17,33 13,27" fill="${p}"/>
          <circle cx="17" cy="27" r="1.5" fill="#ffffff"/>
          <circle cx="17" cy="42" r="2" fill="${s}"/>
          <path d="M13 46 Q17 44 21 46 L20 49 Q17 48 14 49 Z" fill="${p}"/>
          <path d="M14 49 Q12 59 13 68" stroke="${p}" stroke-width="1.2" stroke-linecap="round"/>
          <path d="M17 49 L17 68" stroke="${s}" stroke-width="1.4" stroke-linecap="round"/>
          <path d="M20 49 Q22 59 21 68" stroke="${p}" stroke-width="1.2" stroke-linecap="round"/>
          <circle cx="17" cy="62" r="1.4" fill="#ffffff"/>
        </svg>
      `);
    }

    if (motif === 'night_astral') {
      return svgToDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 68" fill="none">
          <line x1="17" y1="2" x2="17" y2="14" stroke="${s}" stroke-width="1" stroke-dasharray="1.5 1.5"/>
          <circle cx="17" cy="14" r="2.5" fill="${p}"/>
          <circle cx="17" cy="26" r="11" fill="#090d1f" stroke="${p}" stroke-width="1.4"/>
          <path d="M14 18 A 8 8 0 1 0 20 32 A 6 6 0 1 1 14 18 Z" fill="${s}"/>
          <circle cx="19" cy="23" r="1.5" fill="#ffffff"/>
          <line x1="17" y1="37" x2="17" y2="48" stroke="${s}" stroke-width="1" stroke-dasharray="2 1.5"/>
          <g transform="translate(17, 56)">
            <polygon points="0,-10 2,-2 10,-2 3.5,2 6,9 0,4.5 -6,9 -3.5,2 -10,-2 -2,-2" fill="${s}" stroke="#ffffff" stroke-width="0.6"/>
            <circle cx="0" cy="0" r="1.8" fill="#ffffff"/>
          </g>
        </svg>
      `);
    }

    if (motif === 'royal_crest') {
      return svgToDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 68" fill="none">
          <rect x="8" y="2" width="18" height="4" rx="2" fill="${p}" stroke="#ffffff" stroke-width="0.6"/>
          <path d="M12 6 L9 20 L17 17 L25 20 L22 6 Z" fill="#991b1b" stroke="${p}" stroke-width="1"/>
          <circle cx="17" cy="28" r="11" fill="#7f1d1d" stroke="${p}" stroke-width="1.6"/>
          <circle cx="17" cy="28" r="9" stroke="${s}" stroke-width="0.8" stroke-dasharray="1.5 1.5" fill="none"/>
          <g transform="translate(17, 28)">
            <path d="M0 -6 C-1.5 -3 -2 -1 0 2 C2 -1 1.5 -3 0 -6 Z" fill="${p}"/>
            <path d="M-1 0 C-4 -1 -5 -2 -4 -4 C-3 -3 -2 -1 -1 0 Z" fill="${s}"/>
            <path d="M1 0 C4 -1 5 -2 4 -4 C3 -3 2 -1 1 0 Z" fill="${s}"/>
            <rect x="-3" y="1" width="6" height="1.4" rx="0.7" fill="${p}"/>
          </g>
          <line x1="17" y1="39" x2="17" y2="48" stroke="${p}" stroke-width="1.2"/>
          <path d="M17 50 C14 56 13 62 17 66 C21 62 20 56 17 50 Z" fill="#fef08a" stroke="${p}" stroke-width="1"/>
        </svg>
      `);
    }

    if (motif === 'obsidian_prism') {
      return svgToDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 68" fill="none">
          <polygon points="17,2 20,4 20,8 17,10 14,8 14,4" stroke="${p}" stroke-width="1" fill="none"/>
          <polygon points="17,8 20,10 20,14 17,16 14,14 14,10" stroke="${s}" stroke-width="1" fill="none"/>
          <circle cx="17" cy="19" r="2.5" fill="${p}" stroke="#ffffff" stroke-width="0.6"/>
          <g transform="translate(17, 40)">
            <polygon points="0,-18 11,-8 7,16 0,26 -7,16 -11,-8" fill="#090514" stroke="${p}" stroke-width="1.4"/>
            <polygon points="0,-18 11,-8 0,-3" fill="${p}" opacity="0.5"/>
            <polygon points="0,-18 -11,-8 0,-3" fill="${s}" opacity="0.4"/>
            <polygon points="11,-8 7,16 0,5 0,-3" fill="${s}" opacity="0.6"/>
            <polygon points="-11,-8 -7,16 0,5 0,-3" fill="${p}" opacity="0.7"/>
            <polygon points="0,5 7,16 0,26" fill="${p}" opacity="0.85"/>
            <polygon points="0,5 -7,16 0,26" fill="${s}" opacity="0.95"/>
            <circle cx="0" cy="0" r="1.8" fill="#ffffff"/>
          </g>
        </svg>
      `);
    }

    return svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 68" fill="none">
        <line x1="17" y1="2" x2="17" y2="16" stroke="${p}" stroke-width="1.4"/>
        <circle cx="17" cy="18" r="3.5" fill="${s}"/>
        <polygon points="17,24 26,36 17,48 8,36" fill="#111827" stroke="${p}" stroke-width="1.5"/>
        <circle cx="17" cy="36" r="2" fill="#ffffff"/>
        <line x1="17" y1="48" x2="17" y2="66" stroke="${p}" stroke-width="1.4"/>
        <circle cx="17" cy="66" r="2" fill="${s}"/>
      </svg>
    `);
  }

  // Top Decorative Crest / Crown (viewBox="0 0 220 32")
  function getThemeTopCrestSvg(motif, primary, secondary) {
    const p = primary || '#38bdf8';
    const s = secondary || p;

    if (motif === 'frost_blade') {
      return svgToDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 32" fill="none">
          <defs>
            <linearGradient id="frostWingL" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0%" stop-color="${p}" stop-opacity="0.95"/>
              <stop offset="70%" stop-color="${s}" stop-opacity="0.5"/>
              <stop offset="100%" stop-color="${p}" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="frostWingR" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="${p}" stop-opacity="0.95"/>
              <stop offset="70%" stop-color="${s}" stop-opacity="0.5"/>
              <stop offset="100%" stop-color="${p}" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="crestGem" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#ffffff"/>
              <stop offset="40%" stop-color="${p}"/>
              <stop offset="100%" stop-color="${s}"/>
            </linearGradient>
          </defs>
          <path d="M110 18 Q80 14 30 18 Q65 10 95 12 Z" fill="url(#frostWingL)"/>
          <path d="M110 18 Q85 22 45 25 Q75 19 100 18 Z" fill="url(#frostWingL)" opacity="0.6"/>
          <line x1="110" y1="18" x2="20" y2="18" stroke="url(#frostWingL)" stroke-width="1.2"/>
          <circle cx="50" cy="18" r="2" fill="${s}"/>
          <circle cx="30" cy="18" r="1.5" fill="#fff"/>
          <circle cx="15" cy="18" r="1" fill="${p}"/>

          <path d="M110 18 Q140 14 190 18 Q155 10 125 12 Z" fill="url(#frostWingR)"/>
          <path d="M110 18 Q135 22 175 25 Q145 19 120 18 Z" fill="url(#frostWingR)" opacity="0.6"/>
          <line x1="110" y1="18" x2="200" y2="18" stroke="url(#frostWingR)" stroke-width="1.2"/>
          <circle cx="170" cy="18" r="2" fill="${s}"/>
          <circle cx="190" cy="18" r="1.5" fill="#fff"/>
          <circle cx="205" cy="18" r="1" fill="${p}"/>

          <g transform="translate(110, 18)">
            <circle cx="0" cy="0" r="11" fill="#090d16" stroke="${p}" stroke-width="1.2"/>
            <polygon points="0,-14 5,-4 13,0 5,4 0,14 -5,4 -13,0 -5,-4" fill="url(#crestGem)"/>
            <line x1="-8" y1="0" x2="8" y2="0" stroke="#fff" stroke-width="1.2"/>
            <line x1="0" y1="-8" x2="0" y2="8" stroke="#fff" stroke-width="1.2"/>
            <circle cx="0" cy="0" r="2.2" fill="#ffffff"/>
          </g>
        </svg>
      `);
    } else if (motif === 'night_astral') {
      return svgToDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 32" fill="none">
          <defs>
            <linearGradient id="astralWingL" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0%" stop-color="${p}" stop-opacity="0.95"/>
              <stop offset="65%" stop-color="${s}" stop-opacity="0.5"/>
              <stop offset="100%" stop-color="${p}" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="astralWingR" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="${p}" stop-opacity="0.95"/>
              <stop offset="65%" stop-color="${s}" stop-opacity="0.5"/>
              <stop offset="100%" stop-color="${p}" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <path d="M110 18 Q75 8 25 18 Q65 14 100 16 Z" fill="url(#astralWingL)"/>
          <line x1="110" y1="18" x2="20" y2="18" stroke="url(#astralWingL)" stroke-width="1.2"/>
          <polygon points="55,16 57,18 55,20 53,18" fill="#fff"/>
          <polygon points="35,16 36.5,18 35,20 33.5,18" fill="${s}"/>
          <circle cx="16" cy="18" r="1.5" fill="${p}"/>

          <path d="M110 18 Q145 8 195 18 Q155 14 120 16 Z" fill="url(#astralWingR)"/>
          <line x1="110" y1="18" x2="200" y2="18" stroke="url(#astralWingR)" stroke-width="1.2"/>
          <polygon points="165,16 167,18 165,20 163,18" fill="#fff"/>
          <polygon points="185,16 186.5,18 185,20 183.5,18" fill="${s}"/>
          <circle cx="204" cy="18" r="1.5" fill="${p}"/>

          <g transform="translate(110, 18)">
            <circle cx="0" cy="0" r="11" fill="#090d16" stroke="${s}" stroke-width="1.2"/>
            <path d="M-4 -9 A 9 9 0 1 0 6 7 A 6.8 6.8 0 1 1 -4 -9 Z" fill="${p}"/>
            <polygon points="3,-4 4.5,-1 7.5,0 4.5,1 3,4 1.5,1 -1.5,0 1.5,-1" fill="#fff"/>
            <circle cx="3" cy="0" r="1.2" fill="${s}"/>
          </g>
        </svg>
      `);
    } else if (motif === 'royal_crest') {
      return svgToDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 32" fill="none">
          <defs>
            <linearGradient id="goldWingL" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0%" stop-color="${p}" stop-opacity="0.95"/>
              <stop offset="70%" stop-color="${s}" stop-opacity="0.5"/>
              <stop offset="100%" stop-color="${p}" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="goldWingR" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="${p}" stop-opacity="0.95"/>
              <stop offset="70%" stop-color="${s}" stop-opacity="0.5"/>
              <stop offset="100%" stop-color="${p}" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <path d="M110 18 Q80 12 30 18 Q65 14 95 16 Z" fill="url(#goldWingL)"/>
          <line x1="110" y1="18" x2="20" y2="18" stroke="url(#goldWingL)" stroke-width="1.2"/>
          <circle cx="50" cy="18" r="2" fill="${s}"/>
          <circle cx="25" cy="18" r="1.5" fill="#fff"/>

          <path d="M110 18 Q140 12 190 18 Q155 14 125 16 Z" fill="url(#goldWingR)"/>
          <line x1="110" y1="18" x2="200" y2="18" stroke="url(#goldWingR)" stroke-width="1.2"/>
          <circle cx="170" cy="18" r="2" fill="${s}"/>
          <circle cx="195" cy="18" r="1.5" fill="#fff"/>

          <g transform="translate(110, 18)">
            <circle cx="0" cy="0" r="11" fill="#140f0c" stroke="${p}" stroke-width="1.2"/>
            <path d="M0 -9 C-3 -4 -3 -1 0 3 C3 -1 3 -4 0 -9 Z" fill="${p}"/>
            <path d="M-2 -2 C-6 -3 -9 -6 -8 -8 C-6 -7 -5 -4 -2 -2 Z" fill="${s}"/>
            <path d="M2 -2 C6 -3 9 -6 8 -8 C6 -7 5 -4 2 -2 Z" fill="${s}"/>
            <circle cx="0" cy="0" r="1.8" fill="#fff"/>
          </g>
        </svg>
      `);
    } else {
      return svgToDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 32" fill="none">
          <defs>
            <linearGradient id="cyberWingL" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0%" stop-color="${p}" stop-opacity="0.95"/>
              <stop offset="70%" stop-color="${s}" stop-opacity="0.5"/>
              <stop offset="100%" stop-color="${p}" stop-opacity="0"/>
            </linearGradient>
            <linearGradient id="cyberWingR" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="${p}" stop-opacity="0.95"/>
              <stop offset="70%" stop-color="${s}" stop-opacity="0.5"/>
              <stop offset="100%" stop-color="${p}" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <polyline points="110,18 70,18 60,14 20,14" stroke="url(#cyberWingL)" stroke-width="1.2" fill="none"/>
          <rect x="40" y="12" width="10" height="4" fill="${s}" opacity="0.6"/>
          <circle cx="20" cy="14" r="1.5" fill="${p}"/>

          <polyline points="110,18 150,18 160,14 200,14" stroke="url(#cyberWingR)" stroke-width="1.2" fill="none"/>
          <rect x="170" y="12" width="10" height="4" fill="${s}" opacity="0.6"/>
          <circle cx="200" cy="14" r="1.5" fill="${p}"/>

          <g transform="translate(110, 18)">
            <polygon points="0,-11 9,-5 9,5 0,11 -9,5 -9,-5" fill="#090d16" stroke="${p}" stroke-width="1.2"/>
            <polygon points="0,-7 6,-3 6,3 0,7 -6,3 -6,-3" fill="${s}" opacity="0.8"/>
            <circle cx="0" cy="0" r="2.2" fill="#fff"/>
          </g>
        </svg>
      `);
    }
  }

  // 3D Wax Seal / Royal Sigil Stamp (viewBox="0 0 36 36")
  function getThemeWaxSealSvg(motif, primary, secondary) {
    const p = primary || '#38bdf8';
    const s = secondary || p;

    let symbolSvg = '';
    if (motif === 'frost_blade') {
      symbolSvg = `
        <polygon points="0,-8 2,-2 8,0 2,2 0,8 -2,2 -8,0 -2,-2" fill="#ffffff"/>
        <circle cx="0" cy="0" r="1.8" fill="${p}"/>
        <line x1="-5" y1="-5" x2="5" y2="5" stroke="#ffffff" stroke-width="0.8" opacity="0.7"/>
        <line x1="5" y1="-5" x2="-5" y2="5" stroke="#ffffff" stroke-width="0.8" opacity="0.7"/>
      `;
    } else if (motif === 'night_astral') {
      symbolSvg = `
        <path d="M-2 -7 A 7 7 0 1 0 5 5 A 5.5 5.5 0 1 1 -2 -7 Z" fill="#ffffff"/>
        <polygon points="2,-3 3,-1 5,0 3,1 2,3 1,1 -1,0 1,-1" fill="${s}"/>
      `;
    } else if (motif === 'royal_crest') {
      symbolSvg = `
        <path d="M0 -7 C-2 -4 -2 -1 0 2 C2 -1 2 -4 0 -7 Z" fill="#ffffff"/>
        <path d="M-1 -1 C-4 -2 -6 -4 -5 -5 C-4 -4 -3 -2 -1 -1 Z" fill="${s}"/>
        <path d="M1 -1 C4 -2 6 -4 5 -5 C4 -4 3 -2 1 -1 Z" fill="${s}"/>
        <circle cx="0" cy="0" r="1.5" fill="#fff"/>
      `;
    } else {
      symbolSvg = `
        <polygon points="0,-7 6,-3 6,3 0,7 -6,3 -6,-3" stroke="#ffffff" stroke-width="1" fill="${p}" fill-opacity="0.3"/>
        <circle cx="0" cy="0" r="2" fill="#ffffff"/>
      `;
    }

    return svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" fill="none">
        <defs>
          <radialGradient id="sealShine_${motif}" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.4"/>
            <stop offset="45%" stop-color="${p}" stop-opacity="0.95"/>
            <stop offset="100%" stop-color="${s}" stop-opacity="0.85"/>
          </radialGradient>
        </defs>
        <path d="M18 1 C22 0.5 25 3 28 5 C31 7 34 10 35 14 C36 18 34 22 33 25 C31 29 28 32 24 34 C20 35 16 35 12 34 C8 32 5 29 3 25 C1 22 0 18 1 14 C2 10 5 7 8 5 C11 3 14 0.5 18 1 Z" fill="url(#sealShine_${motif})" stroke="${p}" stroke-width="0.8"/>
        <circle cx="18" cy="18" r="13" fill="#090d16" fill-opacity="0.85" stroke="${p}" stroke-width="1.2"/>
        <circle cx="18" cy="18" r="11.5" fill="none" stroke="${s}" stroke-width="0.6" stroke-dasharray="2 2" opacity="0.85"/>
        <g transform="translate(18, 18)">
          ${symbolSvg}
        </g>
      </svg>
    `);
  }

  function getThemeUserBadgeSvg(motif, primary, secondary, customTitle) {
    const p = primary || '#38bdf8';
    const s = secondary || p;

    let title = (customTitle || '').trim();
    if (!title) {
      if (motif === 'frost_blade') title = '❄ OPERATOR';
      else if (motif === 'night_astral') title = '✦ STAR PILOT';
      else if (motif === 'royal_crest') title = '⚜ IMPERIAL MASTER';
      else if (motif === 'obsidian_prism') title = '◈ CIPHER NODE';
      else title = '✦ OPERATOR';
    }

    if (title.length > 20) {
      title = title.slice(0, 18) + '…';
    }

    let iconSvg = `<polygon points="0,-4 3,0 0,4 -3,0" fill="${s}"/>`;
    if (motif === 'frost_blade') {
      iconSvg = `<polygon points="0,-5 4,0 0,5 -4,0" fill="${p}"/><circle cx="0" cy="0" r="1.2" fill="#fff"/>`;
    } else if (motif === 'night_astral') {
      iconSvg = `<path d="M-2 -4 A 4 4 0 1 0 3 3 A 3 3 0 1 1 -2 -4 Z" fill="${s}"/>`;
    } else if (motif === 'royal_crest') {
      iconSvg = `<path d="M0 -4 C-1 -2 -1 0 0 2 C1 0 1 -2 0 -4 Z" fill="${p}"/><circle cx="0" cy="3" r="0.8" fill="${s}"/>`;
    } else if (motif === 'obsidian_prism') {
      iconSvg = `<polygon points="0,-4 4,-1 2,3 0,4 -2,3 -4,-1" stroke="${p}" stroke-width="1" fill="${s}"/>`;
    }

    // Dynamic width calculation so text NEVER overlaps the right dot
    const estW = Math.ceil(title.length * 6.8);
    const totalW = Math.max(120, 26 + estW + 22);
    const dotX = totalW - 10;
    const rectW = totalW - 2;

    return svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} 22" fill="none">
        <defs>
          <linearGradient id="uBadgeBrd_${motif}" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="${p}" stop-opacity="0.95"/>
            <stop offset="100%" stop-color="${s}" stop-opacity="0.85"/>
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="${rectW}" height="20" rx="10" fill="#090d16" stroke="url(#uBadgeBrd_${motif})" stroke-width="1.2"/>
        <g transform="translate(13, 11)">
          ${iconSvg}
        </g>
        <text x="25" y="14.5" fill="#f8fafc" font-size="9" font-family="system-ui, -apple-system, sans-serif" font-weight="700" letter-spacing="0.5">${title}</text>
        <circle cx="${dotX}" cy="11" r="1.5" fill="${p}"/>
      </svg>
    `);
  }

  function getThemeAgentHeaderSvg(motif, primary, secondary, customTitle) {
    const p = primary || '#38bdf8';
    const s = secondary || p;

    let rawTitle = (customTitle || '').trim();
    if (!rawTitle) {
      if (motif === 'frost_blade') rawTitle = '❄ HIYUKI CORE';
      else if (motif === 'night_astral') rawTitle = '✦ ASTRAL ORACLE';
      else if (motif === 'royal_crest') rawTitle = '⚜ THIÊN CHRONICLE';
      else if (motif === 'obsidian_prism') rawTitle = '◈ OBSIDIAN CORE';
      else rawTitle = '✧ ANTIGRAVITY';
    }

    let title = rawTitle.replace(/\s+/g, ' ').trim();
    if (title.length > 24) {
      title = title.slice(0, 22) + '…';
    }

    let iconSvg = '';
    if (motif === 'frost_blade') {
      iconSvg = `
        <g transform="translate(14, 13)">
          <line x1="-6" y1="0" x2="6" y2="0" stroke="${p}" stroke-width="1.3"/>
          <line x1="0" y1="-6" x2="0" y2="6" stroke="${p}" stroke-width="1.3"/>
          <polygon points="0,-4 3,0 0,4 -3,0" fill="${s}"/>
          <circle cx="0" cy="0" r="1.4" fill="#fff"/>
        </g>
      `;
    } else if (motif === 'night_astral') {
      iconSvg = `
        <g transform="translate(14, 13)">
          <path d="M-3 -5 A 5 5 0 1 0 3 4 A 4 4 0 1 1 -3 -5 Z" fill="${s}"/>
          <polygon points="2,-3 3,-1 5,0 3,1 2,3 1,1 -1,0 1,-1" fill="#ffffff"/>
        </g>
      `;
    } else if (motif === 'royal_crest') {
      iconSvg = `
        <g transform="translate(14, 13)">
          <path d="M0 -5 C-1.5 -2.5 -1.5 0 0 2.5 C1.5 0 1.5 -2.5 0 -5 Z" fill="${p}"/>
          <circle cx="0" cy="2" r="1" fill="${s}"/>
        </g>
      `;
    } else {
      iconSvg = `
        <g transform="translate(14, 13)">
          <polygon points="0,-5 2,-2 5,0 2,2 0,5 -2,2 -5,0 -2,-2" fill="${p}"/>
          <circle cx="0" cy="0" r="1.2" fill="#ffffff"/>
        </g>
      `;
    }

    // Dynamic width calculation: 30px left icon space + text + 26px right dots space
    const estTextW = Math.ceil(title.length * 7.1);
    const totalW = Math.max(140, 30 + estTextW + 26);
    const rectW = totalW - 2;
    const innerRectW = totalW - 6;
    const dot1 = totalW - 14;
    const dot2 = totalW - 8;

    return svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalW} 26" fill="none">
        <defs>
          <linearGradient id="agHdrBrd_${motif}" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="${p}" stop-opacity="0.95"/>
            <stop offset="50%" stop-color="${s}" stop-opacity="0.85"/>
            <stop offset="100%" stop-color="${p}" stop-opacity="0.95"/>
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="${rectW}" height="24" rx="12" fill="#090d16" stroke="url(#agHdrBrd_${motif})" stroke-width="1.2"/>
        <rect x="3" y="3" width="${innerRectW}" height="20" rx="10" stroke="rgba(255,255,255,0.08)" stroke-width="0.8" fill="none"/>
        ${iconSvg}
        <text x="28" y="16.5" fill="#f8fafc" font-size="9" font-family="system-ui, -apple-system, sans-serif" font-weight="700" letter-spacing="0.5">${title}</text>
        <circle cx="${dot1}" cy="13" r="1.6" fill="${p}"/>
        <circle cx="${dot2}" cy="13" r="1.6" fill="${s}"/>
      </svg>
    `);
  }

  function getThemeAgentBroochSvg(motif, primary, secondary) {
    const p = primary || '#38bdf8';
    const s = secondary || p;

    if (motif === 'frost_blade') {
      return svgToDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="21" fill="#0c1424" stroke="${p}" stroke-width="1.6"/>
          <circle cx="24" cy="24" r="18" stroke="${s}" stroke-width="0.9" stroke-dasharray="2 2" fill="none"/>
          <g transform="translate(24, 24)">
            <line x1="0" y1="-14" x2="0" y2="14" stroke="${p}" stroke-width="1.4"/>
            <line x1="-12.1" y1="-7" x2="12.1" y2="7" stroke="${p}" stroke-width="1.4"/>
            <line x1="-12.1" y1="7" x2="12.1" y2="-7" stroke="${p}" stroke-width="1.4"/>
            <polygon points="0,-12 3.5,-5 0,0 -3.5,-5" fill="${s}"/>
            <polygon points="0,12 3.5,5 0,0 -3.5,5" fill="${s}"/>
            <polygon points="-10.4,-6 -3.5,-5 0,0 -7,-1" fill="${p}"/>
            <polygon points="10.4,6 3.5,5 0,0 7,1" fill="${p}"/>
            <polygon points="-10.4,6 -3.5,5 0,0 -7,1" fill="${p}"/>
            <polygon points="10.4,-6 3.5,-5 0,0 7,-1" fill="${p}"/>
            <circle cx="0" cy="0" r="3" fill="#ffffff"/>
          </g>
        </svg>
      `);
    }

    if (motif === 'night_astral') {
      return svgToDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="21" fill="#090d1f" stroke="${p}" stroke-width="1.6"/>
          <ellipse cx="24" cy="24" rx="21" ry="8" stroke="${s}" stroke-width="1" stroke-dasharray="2 1.5" transform="rotate(30 24 24)" fill="none"/>
          <g transform="translate(24, 24)">
            <path d="M-6 -10 A 11 11 0 1 0 7 11 A 8.5 8.5 0 1 1 -6 -10 Z" fill="${s}"/>
            <polygon points="0,-8 1.8,-1.8 8,0 1.8,1.8 0,8 -1.8,1.8 -8,0 -1.8,-1.8" fill="#ffffff"/>
            <circle cx="0" cy="0" r="1.5" fill="${p}"/>
          </g>
        </svg>
      `);
    }

    if (motif === 'royal_crest') {
      return svgToDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="21" fill="#1c140a" stroke="${p}" stroke-width="1.8"/>
          <circle cx="24" cy="24" r="18" stroke="${s}" stroke-width="1" stroke-dasharray="2 2" fill="none"/>
          <g transform="translate(24, 24)">
            <path d="M-10 6 L-12 -3 L-5 1 L0 -7 L5 1 L12 -3 L10 6 Z" fill="${p}" stroke="#ffffff" stroke-width="0.8"/>
            <circle cx="-12" cy="-4" r="1.5" fill="${s}"/>
            <circle cx="0" cy="-8" r="2" fill="#ffffff"/>
            <circle cx="12" cy="-4" r="1.5" fill="${s}"/>
            <line x1="-9" y1="6" x2="9" y2="6" stroke="${s}" stroke-width="1.8"/>
            <circle cx="0" cy="2" r="1.5" fill="${s}"/>
          </g>
        </svg>
      `);
    }

    if (motif === 'obsidian_prism') {
      return svgToDataUri(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
          <polygon points="24,3 42,13 42,35 24,45 6,35 6,13" fill="#090514" stroke="${p}" stroke-width="1.6"/>
          <polygon points="24,9 37,17 37,31 24,39 11,31 11,17" stroke="${s}" stroke-width="1" fill="none"/>
          <g transform="translate(24, 24)">
            <polygon points="0,-15 13,-7 0,0 -13,-7" fill="${p}" opacity="0.65"/>
            <polygon points="0,0 13,-7 13,8 0,15" fill="${s}" opacity="0.8"/>
            <polygon points="0,0 -13,-7 -13,8 0,15" fill="${p}" opacity="0.95"/>
            <circle cx="0" cy="0" r="2.5" fill="#ffffff"/>
          </g>
        </svg>
      `);
    }

    return svgToDataUri(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="21" fill="#111827" stroke="${p}" stroke-width="1.6"/>
        <polygon points="24,8 36,24 24,40 12,24" fill="${s}" opacity="0.8"/>
        <circle cx="24" cy="24" r="3" fill="#ffffff"/>
      </svg>
    `);
  }

  function getThemeComposerSpec(motif, primary, secondary, glow, secondaryGlow) {
    const p = primary || '#38bdf8';
    const s = secondary || p;
    const g = glow || p;
    const sg = secondaryGlow || g;

    switch (motif) {
      case 'frost_blade':
        return {
          borderRadius: '6px 26px 6px 26px',
          innerRadius: '4.5px 24px 4.5px 24px',
          previewRadius: '4px 16px 4px 16px',
          previewInnerRadius: '3px 14px 3px 14px',
          bubbleRadius: '4px 18px 4px 18px',
          bubblePreviewRadius: '3px 14px 3px 14px',
          outerBorder: `linear-gradient(135deg, #7dd3fc 0%, ${p}f0 32%, ${s}d9 68%, #c084fc 100%)`,
          boxShadow: `0 8px 32px rgba(0, 0, 0, 0.65), 0 0 20px ${g}, 0 0 35px ${sg}, inset 0 0 10px rgba(125, 211, 252, 0.28)`,
          bubbleShadow: `0 6px 24px rgba(0, 0, 0, 0.55), 0 0 16px ${g}`,
          crestPositionCss: 'right: 28px !important; left: auto !important; transform: none !important;',
          previewCrestPositionCss: 'right: 14px; left: auto; transform: none;',
          bubbleCrestPositionCss: 'right: 14px !important; left: auto !important; transform: none !important;',
          bubblePreviewCrestCss: 'right: 10px; left: auto; transform: none;',
          styleName: 'Frost Blade Crystalline Frame',
          styleDesc: 'Asymmetric Katana curves, sub-zero icy gradient & frost rapier snowflake crest'
        };

      case 'night_astral':
        return {
          borderRadius: '28px',
          innerRadius: '26px',
          previewRadius: '16px',
          previewInnerRadius: '14.5px',
          bubbleRadius: '22px',
          bubblePreviewRadius: '14px',
          outerBorder: `linear-gradient(90deg, ${p}f0 0%, #818cf8 35%, #fbbf24 75%, ${s}f0 100%)`,
          boxShadow: `0 10px 38px rgba(0, 0, 0, 0.72), 0 0 24px ${g}, 0 0 36px ${sg}`,
          bubbleShadow: `0 6px 24px rgba(0, 0, 0, 0.55), 0 0 18px ${g}, 0 0 24px ${sg}`,
          crestPositionCss: 'right: 32px !important; left: auto !important; transform: none !important;',
          previewCrestPositionCss: 'right: 16px; left: auto; transform: none;',
          bubbleCrestPositionCss: 'right: 16px !important; left: auto !important; transform: none !important;',
          bubblePreviewCrestCss: 'right: 12px; left: auto; transform: none;',
          styleName: 'Celestial Astral Arc Frame',
          styleDesc: 'Sweeping orbital capsule curves, midnight aura & radiant crescent moon crest'
        };

      case 'royal_crest':
        return {
          borderRadius: '8px',
          innerRadius: '6.5px',
          previewRadius: '5px',
          previewInnerRadius: '4px',
          bubbleRadius: '7px',
          bubblePreviewRadius: '5px',
          outerBorder: `linear-gradient(135deg, #fef08a 0%, ${p}f0 25%, #ca8a04 50%, #fef08a 75%, ${s}f0 100%)`,
          boxShadow: `0 8px 35px rgba(0, 0, 0, 0.75), 0 0 26px ${g}, 0 0 14px rgba(254, 240, 138, 0.4)`,
          bubbleShadow: `0 6px 24px rgba(0, 0, 0, 0.6), 0 0 18px ${g}`,
          crestPositionCss: 'left: 50% !important; right: auto !important; transform: translateX(-50%) !important;',
          previewCrestPositionCss: 'left: 50%; right: auto; transform: translateX(-50%);',
          bubbleCrestPositionCss: 'left: 50% !important; right: auto !important; transform: translateX(-50%) !important;',
          bubblePreviewCrestCss: 'left: 50%; right: auto; transform: translateX(-50%);',
          styleName: 'Imperial Baroque Gold Frame',
          styleDesc: 'Regal rectangular frame, antique gold double border & centered imperial crown'
        };

      case 'obsidian_prism':
        return {
          borderRadius: '4px 22px 4px 22px',
          innerRadius: '3px 20px 3px 20px',
          previewRadius: '3px 13px 3px 13px',
          previewInnerRadius: '2px 11.5px 2px 11.5px',
          bubbleRadius: '3px 16px 3px 16px',
          bubblePreviewRadius: '2.5px 12px 2.5px 12px',
          outerBorder: `linear-gradient(135deg, #c084fc 0%, ${p}f0 35%, #22d3ee 70%, ${s}f0 100%)`,
          boxShadow: `0 8px 32px rgba(0, 0, 0, 0.65), 0 0 22px ${g}, 0 0 16px rgba(34, 211, 238, 0.35)`,
          bubbleShadow: `0 6px 24px rgba(0, 0, 0, 0.55), 0 0 16px ${g}`,
          crestPositionCss: 'left: 50% !important; right: auto !important; transform: translateX(-50%) !important;',
          previewCrestPositionCss: 'left: 50%; right: auto; transform: translateX(-50%);',
          bubbleCrestPositionCss: 'left: 50% !important; right: auto !important; transform: translateX(-50%) !important;',
          bubblePreviewCrestCss: 'left: 50%; right: auto; transform: translateX(-50%);',
          styleName: 'Prism Diamond Cut Frame',
          styleDesc: 'Faceted geometric chamfers, violet-cyan refraction & diamond prism crest'
        };

      case 'sakura_bloom':
        return {
          borderRadius: '24px 8px 24px 8px',
          innerRadius: '22px 6.5px 22px 6.5px',
          previewRadius: '14px 5px 14px 5px',
          previewInnerRadius: '12.5px 4px 12.5px 4px',
          bubbleRadius: '18px 6px 18px 6px',
          bubblePreviewRadius: '13px 5px 13px 5px',
          outerBorder: `linear-gradient(135deg, #f472b6 0%, ${p}f0 40%, #fda4af 75%, ${s}f0 100%)`,
          boxShadow: `0 8px 30px rgba(0, 0, 0, 0.55), 0 0 22px rgba(244, 114, 182, 0.45)`,
          bubbleShadow: `0 6px 22px rgba(0, 0, 0, 0.5), 0 0 16px rgba(244, 114, 182, 0.4)`,
          crestPositionCss: 'right: 28px !important; left: auto !important; transform: none !important;',
          previewCrestPositionCss: 'right: 14px; left: auto; transform: none;',
          bubbleCrestPositionCss: 'right: 14px !important; left: auto !important; transform: none !important;',
          bubblePreviewCrestCss: 'right: 10px; left: auto; transform: none;',
          styleName: 'Sakura Petal Arc Frame',
          styleDesc: 'Delicate organic petal curves, spring blossom glow & cherry blossom crest'
        };

      case 'cyber_neon':
        return {
          borderRadius: '0px 16px 0px 16px',
          innerRadius: '0px 14px 0px 14px',
          previewRadius: '0px 10px 0px 10px',
          previewInnerRadius: '0px 8.5px 0px 8.5px',
          bubbleRadius: '0px 14px 0px 14px',
          bubblePreviewRadius: '0px 10px 0px 10px',
          outerBorder: `linear-gradient(90deg, #10b981 0%, ${p}f0 50%, ${s}f0 100%)`,
          boxShadow: `0 8px 30px rgba(0, 0, 0, 0.7), 0 0 22px #06b6d4, inset 0 0 8px #10b981`,
          bubbleShadow: `0 6px 24px rgba(0, 0, 0, 0.6), 0 0 16px #06b6d4`,
          crestPositionCss: 'right: 28px !important; left: auto !important; transform: none !important;',
          previewCrestPositionCss: 'right: 14px; left: auto; transform: none;',
          bubbleCrestPositionCss: 'right: 14px !important; left: auto !important; transform: none !important;',
          bubblePreviewCrestCss: 'right: 10px; left: auto; transform: none;',
          styleName: 'Cyber Neon Circuit Frame',
          styleDesc: 'Tech chamfer cuts, matrix pulse glow & digital hexagon circuit core'
        };

      default:
        return {
          borderRadius: '16px',
          innerRadius: '14.5px',
          previewRadius: '10px',
          previewInnerRadius: '8.5px',
          bubbleRadius: '14px',
          bubblePreviewRadius: '10px',
          outerBorder: `linear-gradient(135deg, ${p}f0 0%, ${s}d9 35%, ${p}c8 65%, ${s}f0 100%)`,
          boxShadow: `0 8px 30px rgba(0, 0, 0, 0.55), 0 0 18px ${g}`,
          bubbleShadow: `0 6px 24px rgba(0, 0, 0, 0.5), 0 0 14px ${g}`,
          crestPositionCss: 'right: 28px !important; left: auto !important; transform: none !important;',
          previewCrestPositionCss: 'right: 14px; left: auto; transform: none;',
          bubbleCrestPositionCss: 'right: 14px !important; left: auto !important; transform: none !important;',
          bubblePreviewCrestCss: 'right: 10px; left: auto; transform: none;',
          styleName: 'Thematic Custom Frame',
          styleDesc: 'Synced dynamic border and crest accents tuned to theme'
        };
    }
  }

  async function migrateExistingCustomPresets() {
    try {
      const presets = JSON.parse(localStorage.getItem(STORAGE_CUSTOM_PRESETS) || '{}');
      let changed = false;
      for (const [name, p] of Object.entries(presets)) {
        if (!p.motif) {
          p.motif = detectThemeMotif(name, p.concept, p);
          changed = true;
        }
        const isOldHardcoded = (p.primary === '#c084fc' || p.primary === '#38bdf8' || !p.inputCardBg);
        if (isOldHardcoded && p.wallpaper) {
          const palette = await extractPaletteFromImage(p.wallpaper);
          if (palette) {
            Object.assign(p, palette);
            changed = true;
          }
        }
        if (!p.accessories || p.accessories.version !== 3) {
          const pPrimary = p.primary || '#38bdf8';
          const pSecondary = p.secondary || pPrimary;
          p.accessories = {
            version: 3,
            crest: getThemeTopCrestSvg(p.motif, pPrimary, pSecondary),
            seal: getThemeWaxSealSvg(p.motif, pPrimary, pSecondary),
            charm: getThemeUserCharmSvg(p.motif, pPrimary, pSecondary),
            badge: getThemeUserBadgeSvg(p.motif, pPrimary, pSecondary, p.isCustom ? `◈ ${name.toUpperCase()}` : undefined),
            header: getThemeAgentHeaderSvg(p.motif, pPrimary, pSecondary, p.isCustom ? `✧ ${name.toUpperCase()}` : undefined),
            brooch: getThemeAgentBroochSvg(p.motif, pPrimary, pSecondary),
            watermark: getThemeWatermarkSvg(p.motif, pPrimary, pSecondary),
            corner: getThematicCornerSvg(pPrimary, pSecondary, p.motif)
          };
          changed = true;
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
    const rawKit = localStorage.getItem(STORAGE_ACCESSORY_KIT) || init.accessoryKit || 'sync';
    const accessoryKit = (rawKit === 'sync' || allThemes[rawKit]) ? rawKit : 'sync';
    const rawAccMode = localStorage.getItem(STORAGE_ACCESSORY_MODE) || init.accessoryMode || 'full';
    const accessoryMode = ACCESSORY_MODES[rawAccMode] ? rawAccMode : 'full';

    const accCrest = localStorage.getItem(STORAGE_ACC_CREST) !== null
      ? localStorage.getItem(STORAGE_ACC_CREST) === 'true'
      : (accessoryMode === 'full' || accessoryMode === 'crown');
    const accCharm = localStorage.getItem(STORAGE_ACC_CHARM) !== null
      ? localStorage.getItem(STORAGE_ACC_CHARM) === 'true'
      : (accessoryMode === 'full' || accessoryMode === 'jewelry');
    const accCorners = localStorage.getItem(STORAGE_ACC_CORNERS) !== null
      ? localStorage.getItem(STORAGE_ACC_CORNERS) === 'true'
      : (accessoryMode !== 'minimal');
    const accSeal = localStorage.getItem(STORAGE_ACC_SEAL) !== null
      ? localStorage.getItem(STORAGE_ACC_SEAL) === 'true'
      : (accessoryMode !== 'minimal');
    const accRail = localStorage.getItem(STORAGE_ACC_RAIL) !== null
      ? localStorage.getItem(STORAGE_ACC_RAIL) === 'true'
      : true;

    return {
      themeName, bubbleName, inputStyle, dimming, wpEnabled, customWp,
      userAvatar, agentAvatar, bgMode, accessoryKit, accessoryMode,
      accCrest, accCharm, accCorners, accSeal, accRail
    };
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
      if (overrides.accessoryKit !== undefined) {
        localStorage.setItem(STORAGE_ACCESSORY_KIT, overrides.accessoryKit);
      }
      if (overrides.accessoryMode !== undefined) {
        localStorage.setItem(STORAGE_ACCESSORY_MODE, overrides.accessoryMode);
      }
      if (overrides.accCrest !== undefined) {
        localStorage.setItem(STORAGE_ACC_CREST, String(overrides.accCrest));
      }
      if (overrides.accCharm !== undefined) {
        localStorage.setItem(STORAGE_ACC_CHARM, String(overrides.accCharm));
      }
      if (overrides.accCorners !== undefined) {
        localStorage.setItem(STORAGE_ACC_CORNERS, String(overrides.accCorners));
      }
      if (overrides.accSeal !== undefined) {
        localStorage.setItem(STORAGE_ACC_SEAL, String(overrides.accSeal));
      }
      if (overrides.accRail !== undefined) {
        localStorage.setItem(STORAGE_ACC_RAIL, String(overrides.accRail));
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
    const activeMotif = detectThemeMotif(st.bubbleName, bubbleTheme.concept, bubbleTheme);
    const composerSpec = getThemeComposerSpec(activeMotif, primaryColor, secondaryColor, bubbleTheme.glow, bubbleTheme.secondaryGlow);
    const cornerFiligreeUrl = bubbleTheme.cornerSvg || getThematicCornerSvg(primaryColor, secondaryColor, activeMotif);
    const crestOrnamentUrl = bubbleTheme.sticker || getThematicCrestSvg(primaryColor, secondaryColor, activeMotif);
    const charmPendantUrl = getThemeCharmSvg(activeMotif, primaryColor, secondaryColor);
    const themeBadgeUrl = getThemeBadgeSvg(activeMotif, primaryColor, secondaryColor, st.bubbleName);
    const watermarkUrl = getThemeWatermarkSvg(activeMotif, primaryColor, secondaryColor);
    const agentAccentUrl = getThemeAgentAccentSvg(activeMotif, primaryColor, secondaryColor);
    const isOrnamental = curInputStyle === 'ornamental';
    const isThematic = curInputStyle === 'thematic';
    const isGlass = curInputStyle === 'glass';
    const isMinimal = curInputStyle === 'minimal';

    // Resolve active accessory kit and display density mode
    const kitKey = (st.accessoryKit && st.accessoryKit !== 'sync') ? st.accessoryKit : st.bubbleName;
    const kitTheme = allThemes[kitKey] || bubbleTheme;
    const kitMotif = detectThemeMotif(kitKey, kitTheme.concept, kitTheme);
    const kitPrimary = kitTheme.primary || primaryColor;
    const kitSecondary = kitTheme.secondary || secondaryColor;
    const kitGlow = kitTheme.glow || bubbleTheme.glow || kitPrimary;

    const themeTopCrestUrl = (kitTheme.accessories && kitTheme.accessories.crest)
      ? kitTheme.accessories.crest
      : getThemeTopCrestSvg(kitMotif, kitPrimary, kitSecondary);

    const themeWaxSealUrl = (kitTheme.accessories && kitTheme.accessories.seal)
      ? kitTheme.accessories.seal
      : getThemeWaxSealSvg(kitMotif, kitPrimary, kitSecondary);

    const themeUserCharmUrl = (kitTheme.accessories && kitTheme.accessories.charm)
      ? kitTheme.accessories.charm
      : getThemeUserCharmSvg(kitMotif, kitPrimary, kitSecondary);

    const themeUserBadgeUrl = (kitTheme.accessories && kitTheme.accessories.badge)
      ? kitTheme.accessories.badge
      : getThemeUserBadgeSvg(kitMotif, kitPrimary, kitSecondary, kitTheme.isCustom ? `◈ ${kitKey.toUpperCase()}` : undefined);

    const themeAgentHeaderUrl = (kitTheme.accessories && kitTheme.accessories.header)
      ? kitTheme.accessories.header
      : getThemeAgentHeaderSvg(kitMotif, kitPrimary, kitSecondary, kitTheme.isCustom ? `✧ ${kitKey.toUpperCase()}` : undefined);

    const themeAgentBroochUrl = (kitTheme.accessories && kitTheme.accessories.brooch)
      ? kitTheme.accessories.brooch
      : getThemeAgentBroochSvg(kitMotif, kitPrimary, kitSecondary);

    const themeWatermarkUrl = (kitTheme.accessories && kitTheme.accessories.watermark)
      ? kitTheme.accessories.watermark
      : getThemeWatermarkSvg(kitMotif, kitPrimary, kitSecondary);

    const themeCornerSvgUrl = (kitTheme.accessories && kitTheme.accessories.corner)
      ? kitTheme.accessories.corner
      : (kitTheme.cornerSvg || getThematicCornerSvg(kitPrimary, kitSecondary, kitMotif));

    // Dynamic width calculation so title text NEVER overlaps dot ornaments
    let rawBadgeTitle = kitTheme.isCustom ? `◈ ${kitKey.toUpperCase()}` : '';
    if (!rawBadgeTitle) {
      if (kitMotif === 'frost_blade') rawBadgeTitle = '❄ OPERATOR';
      else if (kitMotif === 'night_astral') rawBadgeTitle = '✦ ASTRAL NODE';
      else if (kitMotif === 'royal_crest') rawBadgeTitle = '⚜ NOBLE PILOT';
      else if (kitMotif === 'obsidian_prism') rawBadgeTitle = '◈ CIPHER NODE';
      else rawBadgeTitle = '✦ OPERATOR';
    }
    const cleanBadgeTitle = rawBadgeTitle.replace(/\s+/g, ' ').trim();
    const finalBadgeTitle = cleanBadgeTitle.length > 20 ? cleanBadgeTitle.slice(0, 18) + '…' : cleanBadgeTitle;
    const estUserBadgeW = Math.max(120, 26 + Math.ceil(finalBadgeTitle.length * 6.8) + 22);

    let rawHeaderTitle = kitTheme.isCustom ? `✧ ${kitKey.toUpperCase()}` : '';
    if (!rawHeaderTitle) {
      if (kitMotif === 'frost_blade') rawHeaderTitle = '❄ HIYUKI CORE';
      else if (kitMotif === 'night_astral') rawHeaderTitle = '✦ ASTRAL ORACLE';
      else if (kitMotif === 'royal_crest') rawHeaderTitle = '⚜ THIÊN CHRONICLE';
      else if (kitMotif === 'obsidian_prism') rawHeaderTitle = '◈ OBSIDIAN CORE';
      else rawHeaderTitle = '✧ ANTIGRAVITY';
    }
    const cleanHdrTitle = rawHeaderTitle.replace(/\s+/g, ' ').trim();
    const finalHdrTitle = cleanHdrTitle.length > 24 ? cleanHdrTitle.slice(0, 22) + '…' : cleanHdrTitle;
    const estAgentHeaderW = Math.max(140, 30 + Math.ceil(finalHdrTitle.length * 7.1) + 26);

    let rawComposerTitle = st.bubbleName || '';
    if (!rawComposerTitle) {
      if (activeMotif === 'frost_blade') rawComposerTitle = '❄ HIYUKI • FROST BLADE';
      else if (activeMotif === 'night_astral') rawComposerTitle = '✦ ASTRAL NIGHT • COSMOS';
      else if (activeMotif === 'royal_crest') rawComposerTitle = '⚜ THIÊN • IMPERIAL';
      else if (activeMotif === 'obsidian_prism') rawComposerTitle = '◈ OBSIDIAN • PRISM GEM';
      else if (activeMotif === 'sakura_bloom') rawComposerTitle = '🌸 SAKURA • BLOSSOM';
      else rawComposerTitle = '✧ THEME STUDIO';
    }
    const cleanComposerTitle = rawComposerTitle.replace(/\s+/g, ' ').trim();
    const finalComposerTitle = cleanComposerTitle.length > 24 ? cleanComposerTitle.slice(0, 22) + '…' : cleanComposerTitle;
    const estComposerBadgeW = Math.max(160, 32 + Math.ceil(finalComposerTitle.length * 7.2) + 28);

    const showCrest = Boolean(st.accCrest) && (isOrnamental || isThematic);
    const showCharm = Boolean(st.accCharm) && (isOrnamental || isThematic);
    const showCorners = Boolean(st.accCorners) && (isOrnamental || isThematic);
    const showSeal = Boolean(st.accSeal) && (isOrnamental || isThematic);
    const showRail = Boolean(st.accRail);
    const showUserBadge = showCorners;
    const showAgentHeader = showCorners;
    const showAgentBrooch = showSeal;
    const showFiligree = showCorners;

    const bubbleStickerCss = (isOrnamental || isThematic) ? `
      .group\\/user-input-step {
        padding-top: ${(showCharm || showUserBadge) ? '22px' : '6px'} !important;
      }
      /* Sender Role Cartouche Badge (Dynamic Width, Zero Overlap) */
      :is(.agy-user-bubble-frame, div:has(> [data-testid="user-message-bubble"]))::before {
        content: "";
        position: absolute;
        top: -13px;
        right: 28px;
        width: ${estUserBadgeW}px;
        height: 22px;
        background-image: url("${themeUserBadgeUrl}");
        background-size: contain;
        background-position: center right;
        background-repeat: no-repeat;
        z-index: 25;
        pointer-events: none !important;
        filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.7)) drop-shadow(0 0 6px ${kitGlow});
        display: ${showUserBadge ? 'block' : 'none'} !important;
      }
      /* Floating Thematic Hanging Talisman Charm */
      :is(.agy-user-bubble-frame, div:has(> [data-testid="user-message-bubble"]))::after {
        content: "";
        position: absolute;
        top: -14px;
        left: -10px;
        width: 32px;
        height: 64px;
        background-image: url("${themeUserCharmUrl}");
        background-size: contain;
        background-position: top center;
        background-repeat: no-repeat;
        z-index: 26;
        pointer-events: none !important;
        filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.75)) drop-shadow(0 0 6px ${kitGlow});
        display: ${showCharm ? 'block' : 'none'} !important;
      }
      /* 3D Wax Seal Stamp on User Bubble (Bottom Right) */
      :is(.agy-user-bubble, [data-testid="user-message-bubble"])::after {
        content: "";
        position: absolute;
        bottom: -10px;
        right: -8px;
        width: 36px;
        height: 36px;
        background-image: url("${themeWaxSealUrl}");
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        z-index: 28;
        pointer-events: none !important;
        filter: drop-shadow(0 3px 8px rgba(0, 0, 0, 0.75)) drop-shadow(0 0 6px ${kitGlow});
        display: ${showSeal ? 'block' : 'none'} !important;
      }
    ` : `
      .group\\/user-input-step {
        padding-top: 4px !important;
      }
      :is(.agy-user-bubble-frame, div:has(> [data-testid="user-message-bubble"]))::before { display: none !important; }
      :is(.agy-user-bubble-frame, div:has(> [data-testid="user-message-bubble"]))::after { display: none !important; }
      :is(.agy-user-bubble, [data-testid="user-message-bubble"])::after { display: none !important; }
    `;

    const inputStickerCss = (isOrnamental || isThematic) ? `
      .surface-composer {
        margin-top: ${isOrnamental ? '24px' : '18px'} !important;
        overflow: visible !important;
      }
      /* Thematic Engraved Nameplate Badge */
      .surface-composer::before {
        content: "";
        position: absolute;
        top: -14px;
        left: 32px;
        width: ${estComposerBadgeW}px;
        height: 26px;
        background-image: url("${themeBadgeUrl}");
        background-size: contain;
        background-position: center left;
        background-repeat: no-repeat;
        z-index: 34;
        pointer-events: none !important;
        filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.7)) drop-shadow(0 0 6px ${bubbleTheme.glow});
      }
      /* Floating Thematic Charm / Tassel Pendant */
      .surface-composer::after {
        content: "";
        position: absolute;
        top: -16px;
        left: -12px;
        width: 36px;
        height: 80px;
        background-image: url("${charmPendantUrl}");
        background-size: contain;
        background-repeat: no-repeat;
        background-position: top center;
        z-index: 35;
        pointer-events: none !important;
        filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.75)) drop-shadow(0 0 8px ${bubbleTheme.glow});
        transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      }
      .surface-composer:hover::after {
        transform: translateY(-2px) rotate(2deg);
      }
      /* Top-right crest & corner filigree on composer card */
      .surface-composer-card::before {
        ${isOrnamental ? `
        content: "";
        position: absolute;
        top: -13px;
        ${composerSpec.crestPositionCss}
        width: 104px;
        height: 24px;
        background-image: url("${crestOrnamentUrl}");
        background-size: contain;
        background-position: center;
        background-repeat: no-repeat;
        z-index: 33;
        pointer-events: none !important;
        filter: drop-shadow(0 2px 8px ${bubbleTheme.glow});
        ` : 'display: none !important;'}
      }
      .surface-composer-card::after {
        ${isOrnamental ? `
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
        pointer-events: none !important;
        opacity: 0.88;
        ` : 'display: none !important;'}
      }
    ` : `
      .surface-composer::before,
      .surface-composer::after,
      .surface-composer-card::before,
      .surface-composer-card::after { display: none !important; }
    `;

    const inputCardBg =
      isGlass
        ? (bubbleTheme.inputGlassBg || 'rgba(16, 20, 30, 0.48)')
        : (bubbleTheme.inputCardBg || 'rgba(18, 24, 38, 0.90)');

    const inputOuterBorder =
      isOrnamental
        ? composerSpec.outerBorder
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

    const aiCardCss = `
      /* Translucent reading card for AI responses with thematic accent */
      .agy-shell [data-testid="agent-response"] {
        background: ${mainTheme.aiCardBg || 'rgba(18, 20, 30, 0.72)'} !important;
        ${isLight ? `color: ${uiInk} !important;` : ''}
        backdrop-filter: none !important;
        border-left: ${showRail ? `3.5px solid ${kitPrimary}` : `1px solid ${mainTheme.aiCardBorder || kitPrimary + '24'}`} !important;
        border-top: 1px solid ${mainTheme.aiCardBorder || `${kitPrimary}38`} !important;
        border-right: 1px solid ${mainTheme.aiCardBorder || `${kitPrimary}24`} !important;
        border-bottom: 1px solid ${mainTheme.aiCardBorder || `${kitPrimary}24`} !important;
        border-radius: 14px !important;
        padding: 16px 20px !important;
        margin-top: ${(showAgentHeader || showAgentBrooch || showCrest) ? '24px' : '10px'} !important;
        box-shadow: ${isLight
          ? '0 4px 14px rgba(15, 23, 42, 0.08)'
          : (showRail
            ? `0 6px 20px rgba(0, 0, 0, 0.35), -3px 0 16px ${kitGlow}35`
            : `0 4px 14px rgba(0, 0, 0, 0.25)`
          )
        } !important;
        box-sizing: border-box !important;
        position: relative !important;
        overflow: visible !important;
      }
      /* Thematic Intelligence Header Cartouche Banner (Dynamic Width, Zero Overlap) */
      .agy-shell [data-testid="agent-response"]::after {
        content: "";
        position: absolute;
        top: -14px;
        left: 56px;
        width: ${estAgentHeaderW}px;
        height: 26px;
        background-image: url("${themeAgentHeaderUrl}");
        background-size: contain;
        background-repeat: no-repeat;
        background-position: left center;
        pointer-events: none !important;
        filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.7)) drop-shadow(0 0 6px ${kitGlow});
        z-index: 10;
        display: ${showAgentHeader ? 'block' : 'none'} !important;
      }
      /* Top Crown Crest (Centered symmetrically on top border) */
      .agy-shell [data-testid="agent-response"] > div:not(.sr-only):first-of-type::after {
        content: "";
        position: absolute;
        top: -18px;
        left: 50%;
        transform: translateX(-50%);
        width: 220px;
        height: 32px;
        background-image: url("${themeTopCrestUrl}");
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        pointer-events: none !important;
        filter: drop-shadow(0 3px 10px rgba(0, 0, 0, 0.8)) drop-shadow(0 0 10px ${kitGlow});
        z-index: 15;
        display: ${showCrest ? 'block' : 'none'} !important;
      }
      /* Thematic Corner Brooch / Medallion */
      .agy-shell [data-testid="agent-response"] > div:not(.sr-only):first-of-type::before {
        content: "";
        position: absolute;
        top: -22px;
        right: 16px;
        width: 44px;
        height: 44px;
        background-image: url("${themeAgentBroochUrl}");
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        pointer-events: none !important;
        filter: drop-shadow(0 2px 10px rgba(0, 0, 0, 0.75)) drop-shadow(0 0 8px ${kitGlow});
        z-index: 12;
        display: ${showAgentBrooch ? 'block' : 'none'} !important;
      }
      .agy-shell [data-testid="agent-response"] pre {
        border-left: 2.5px solid ${kitPrimary} !important;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04) !important;
      }
      .agy-shell [data-testid="worked-for-collapsible"] {
        border: 1px solid ${kitPrimary}30 !important;
        border-radius: 8px !important;
        background: rgba(0, 0, 0, 0.2) !important;
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
    `;

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
      :is(.agy-user-bubble-frame, div:has(> [data-testid="user-message-bubble"])) {
        background: ${isOrnamental
          ? composerSpec.outerBorder
          : isThematic
          ? bubbleTheme.frameBg
          : (isGlass ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.12)')
        } !important;
        border-radius: ${bubbleTheme.isScroll ? '6px' : composerSpec.bubbleRadius} !important;
        box-shadow: ${isOrnamental
          ? composerSpec.bubbleShadow
          : isThematic
          ? `0 4px 18px rgba(0, 0, 0, 0.45), 0 0 12px ${bubbleTheme.glow}`
          : `0 2px 10px rgba(0, 0, 0, 0.3)`
        } !important;
        position: relative !important;
        overflow: visible !important;
        padding: ${isOrnamental ? '1.5px' : isThematic ? '1.2px' : '1px'} !important;
      }

      :is(.agy-user-bubble, [data-testid="user-message-bubble"]) {
        background-color: ${isGlass
          ? (bubbleTheme.inputGlassBg || 'rgba(14, 18, 28, 0.55)')
          : isMinimal
          ? 'rgba(16, 18, 26, 0.94)'
          : bubbleTheme.bg
        } !important;
        background-image: ${showFiligree ? `url("${themeWatermarkUrl}")` : 'none'} !important;
        background-repeat: no-repeat !important;
        background-position: right 6px bottom 4px !important;
        background-size: 64px 64px !important;
        border-radius: ${bubbleTheme.isScroll ? '5px' : composerSpec.bubbleRadius} !important;
        padding: ${(showCharm || showUserBadge) ? '10px 22px 10px 26px' : '8px 16px'} !important;
        color: ${bubbleTheme.textColor || '#f8fafc'} !important;
        border: ${isGlass ? '1px solid rgba(255, 255, 255, 0.1)' : (bubbleTheme.innerBorder || '1px solid rgba(255, 255, 255, 0.08)')} !important;
        overflow: visible !important;
        position: relative !important;
        font-weight: 450 !important;
      }

      :is(.agy-user-bubble, [data-testid="user-message-bubble"])::before {
        content: "";
        position: absolute;
        top: 3px;
        left: 4px;
        width: 16px;
        height: 16px;
        background-image: url("${themeCornerSvgUrl}");
        background-size: contain;
        background-repeat: no-repeat;
        pointer-events: none !important;
        opacity: 0.85;
        z-index: 10;
        display: ${showFiligree ? 'block' : 'none'} !important;
      }

      :is(.agy-user-bubble, [data-testid="user-message-bubble"]) * {
        color: ${bubbleTheme.textColor || '#f8fafc'} !important;
      }

      /* Double-Border Input Composer */
      .surface-composer {
        background: ${inputOuterBorder} !important;
        border-radius: ${composerSpec.borderRadius} !important;
        padding: ${isOrnamental ? '1.8px' : isThematic ? '1.5px' : '1px'} !important;
        box-shadow: ${isOrnamental
          ? composerSpec.boxShadow
          : isThematic
          ? `0 6px 24px rgba(0, 0, 0, 0.5), 0 0 14px ${bubbleTheme.glow}`
          : `0 2px 12px rgba(0, 0, 0, 0.3)`
        } !important;
        position: relative !important;
      }

      .surface-composer-card {
        background-color: ${inputCardBg} !important;
        background-image: ${isOrnamental || isThematic ? `url("${watermarkUrl}")` : 'none'} !important;
        background-repeat: no-repeat !important;
        background-position: right 24px center !important;
        background-size: 135px 135px !important;
        backdrop-filter: none !important;
        border-radius: ${composerSpec.innerRadius} !important;
        padding-left: 14px !important;
        position: relative !important;
        border: ${isGlass
          ? '1px solid rgba(255, 255, 255, 0.08)'
          : isMinimal
          ? '1px solid rgba(255, 255, 255, 0.06)'
          : (bubbleTheme.innerBorder || '1px solid rgba(255, 255, 255, 0.08)')
        } !important;
      }

      /* Thematic Action Orb (Send Button) */
      .surface-composer [data-testid="send-button"],
      .surface-composer .agy-send-button {
        background: linear-gradient(135deg, ${primaryColor}f0, ${secondaryColor}d9) !important;
        border: 1px solid rgba(255, 255, 255, 0.45) !important;
        box-shadow: 0 0 14px ${bubbleTheme.glow}, 0 2px 8px rgba(0, 0, 0, 0.5), inset 0 1px 2px rgba(255, 255, 255, 0.6) !important;
        transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        position: relative !important;
      }

      .surface-composer [data-testid="send-button"]:hover,
      .surface-composer .agy-send-button:hover {
        transform: scale(1.12) !important;
        box-shadow: 0 0 22px ${bubbleTheme.glow}, 0 4px 14px rgba(0, 0, 0, 0.65), inset 0 1px 2px #ffffff !important;
      }

      .surface-composer [data-testid="send-button"] svg,
      .surface-composer .agy-send-button svg {
        color: #ffffff !important;
        filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.6)) !important;
      }

      /* Thematic Model & Permission Selectors */
      .surface-composer [data-testid="model-selector-trigger"],
      .surface-composer [data-testid="permissions-selector-trigger"] {
        border: 1px solid ${primaryColor}40 !important;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3), inset 0 0 8px ${primaryColor}14 !important;
        transition: all 0.15s ease !important;
      }

      .surface-composer [data-testid="model-selector-trigger"]:hover,
      .surface-composer [data-testid="permissions-selector-trigger"]:hover {
        border-color: ${primaryColor}99 !important;
        box-shadow: 0 0 12px ${bubbleTheme.glow} !important;
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

      .agy-delete-preset-btn:hover {
        background: rgba(220, 38, 38, 0.9) !important;
        color: #ffffff !important;
        border-color: rgba(248, 113, 113, 0.8) !important;
        transform: scale(1.12) !important;
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
          <div id="agy-theme-modal-body" style="flex: 1; overflow: hidden; display: flex; flex-direction: column; height: 100%; min-height: 0;"></div>
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
    if (!container) return;
    const prevScrollEl = container.querySelector('#agy-theme-scroll-container') || container;
    const savedScrollTop = (prevScrollEl && prevScrollEl.scrollTop > 0)
      ? prevScrollEl.scrollTop
      : (container.scrollTop || 0);
    const st = getState();
    const curInputStyle = normalizeInputStyle(st.inputStyle);
    const allThemes = getAllThemes();
    const allThemeKeys = Object.keys(allThemes);
    const mainTheme = allThemes[st.themeName] || allThemes[DEFAULT_THEME_KEY] || {};
    const effUserAv = st.userAvatar === 'none' ? '' : (st.userAvatar || mainTheme.userAvatar || '');
    const effAgentAv = st.agentAvatar === 'none' ? '' : (st.agentAvatar || mainTheme.agentAvatar || '');

    const curAccMode = st.accessoryMode || 'full';
    const curAccKit = st.accessoryKit || 'sync';
    const activeKitKey = (curAccKit && curAccKit !== 'sync') ? curAccKit : st.bubbleName;
    const activeKitTh = allThemes[activeKitKey] || mainTheme;
    const activeKitMotif = detectThemeMotif(activeKitKey, activeKitTh.concept, activeKitTh);
    const akp = activeKitTh.primary || '#38bdf8';
    const aks = activeKitTh.secondary || akp;
    const akg = activeKitTh.glow || akp;

    const liveCrestUrl = (activeKitTh.accessories && activeKitTh.accessories.crest)
      ? activeKitTh.accessories.crest
      : getThemeTopCrestSvg(activeKitMotif, akp, aks);
    const liveSealUrl = (activeKitTh.accessories && activeKitTh.accessories.seal)
      ? activeKitTh.accessories.seal
      : getThemeWaxSealSvg(activeKitMotif, akp, aks);
    const liveCharmUrl = (activeKitTh.accessories && activeKitTh.accessories.charm)
      ? activeKitTh.accessories.charm
      : getThemeUserCharmSvg(activeKitMotif, akp, aks);
    const liveBadgeUrl = (activeKitTh.accessories && activeKitTh.accessories.badge)
      ? activeKitTh.accessories.badge
      : getThemeUserBadgeSvg(activeKitMotif, akp, aks, activeKitTh.isCustom ? `◈ ${activeKitKey.toUpperCase()}` : undefined);
    const liveHeaderUrl = (activeKitTh.accessories && activeKitTh.accessories.header)
      ? activeKitTh.accessories.header
      : getThemeAgentHeaderSvg(activeKitMotif, akp, aks, activeKitTh.isCustom ? `✧ ${activeKitKey.toUpperCase()}` : undefined);
    const liveBroochUrl = (activeKitTh.accessories && activeKitTh.accessories.brooch)
      ? activeKitTh.accessories.brooch
      : getThemeAgentBroochSvg(activeKitMotif, akp, aks);
    const liveCornerUrl = (activeKitTh.accessories && activeKitTh.accessories.corner)
      ? activeKitTh.accessories.corner
      : (activeKitTh.cornerSvg || getThematicCornerSvg(akp, aks, activeKitMotif));
    const liveWatermarkUrl = (activeKitTh.accessories && activeKitTh.accessories.watermark)
      ? activeKitTh.accessories.watermark
      : getThemeWatermarkSvg(activeKitMotif, akp, aks);

    const liveShowCrest = Boolean(st.accCrest);
    const liveShowCharm = Boolean(st.accCharm);
    const liveShowCorners = Boolean(st.accCorners);
    const liveShowSeal = Boolean(st.accSeal);
    const liveShowRail = Boolean(st.accRail);

    const topBadge = document.getElementById('agy-custom-theme-badge');
    if (topBadge) {
      topBadge.textContent = `${allThemeKeys.length} Preset${allThemeKeys.length > 1 ? 's' : ''}`;
    }

    container.innerHTML = `
      <div id="agy-theme-scroll-container" style="padding: 24px 32px 48px 32px; max-width: 860px; margin: 0 auto; overflow-y: auto; flex: 1; height: 100%; color: #f4f4f5;">
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
              const bMotif = detectThemeMotif(name, th.concept, th);
              const bSpec = getThemeComposerSpec(bMotif, bp, bs, th.glow, th.secondaryGlow);
              const bCornerSvg = th.cornerSvg || getThematicCornerSvg(bp, bs, bMotif);
              const bCrestSvg = th.sticker || getThematicCrestSvg(bp, bs, bMotif);

              let bOuterBg = '';
              let bOuterShadow = '';
              let bInnerBg = '';
              const showBubbleOrnaments = curInputStyle === 'ornamental' || curInputStyle === 'thematic';

              if (curInputStyle === 'ornamental') {
                bOuterBg = bSpec.outerBorder;
                bOuterShadow = bSpec.bubbleShadow;
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
                    <div class="agy-bubble-preview-outer" style="position: relative; width: 192px; height: 46px; padding: 1.2px; border-radius: ${th.isScroll ? '6px' : bSpec.bubblePreviewRadius}; background: ${bOuterBg}; box-shadow: ${bOuterShadow};">
                      <div class="agy-bubble-preview-crest" style="position: absolute; top: -10px; ${bSpec.bubblePreviewCrestCss} width: 62px; height: 16px; background-image: url('${bCrestSvg}'); background-size: contain; background-position: center; background-repeat: no-repeat; filter: drop-shadow(0 2px 6px ${th.glow || bp}); display: ${showBubbleOrnaments ? 'block' : 'none'}; pointer-events: none; z-index: 5;"></div>
                      <div class="agy-bubble-preview-corner" style="position: absolute; top: 2px; left: 2px; width: 14px; height: 14px; background-image: url('${bCornerSvg}'); background-size: contain; background-repeat: no-repeat; opacity: ${curInputStyle === 'ornamental' ? '0.95' : '0.82'}; display: ${showBubbleOrnaments ? 'block' : 'none'}; pointer-events: none; z-index: 5;"></div>
                      <div class="agy-bubble-preview-inner" style="position: relative; width: 100%; height: 100%; background: ${bInnerBg}; border: ${th.innerBorder || '1px solid ' + (th.borderColor || 'rgba(167, 139, 250, 0.34)')}; border-radius: ${th.isScroll ? '4px' : bSpec.bubblePreviewRadius}; display: flex; align-items: center; padding: 0 16px;">
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
              const curMotif = detectThemeMotif(st.bubbleName, activeBubbleTh.concept, activeBubbleTh);
              const curSpec = getThemeComposerSpec(curMotif, p, s, activeBubbleTh.glow, activeBubbleTh.secondaryGlow);
              const cornerSvg = activeBubbleTh.cornerSvg || getThematicCornerSvg(p, s, curMotif);
              const crestSvg = activeBubbleTh.sticker || getThematicCrestSvg(p, s, curMotif);
              const charmSvg = getThemeCharmSvg(curMotif, p, s);
              const watermarkSvg = getThemeWatermarkSvg(curMotif, p, s);

              let previewOuterBg = '';
              let previewOuterShadow = '';
              let previewInnerBg = '';
              let showCrest = false;
              let showCorner = false;
              let cardTitle = item.label;
              let cardDesc = item.desc;
              let pRadius = '10px';
              let pInnerRadius = '8.5px';
              let crestPosStyle = curSpec.previewCrestPositionCss;

              if (key === 'ornamental') {
                previewOuterBg = curSpec.outerBorder;
                previewOuterShadow = `0 4px 16px rgba(0,0,0,0.5), 0 0 12px ${activeBubbleTh.glow || p}`;
                previewInnerBg = activeBubbleTh.inputCardBg || 'rgba(26, 18, 15, 0.92)';
                showCrest = true;
                showCorner = true;
                cardTitle = curSpec.styleName;
                cardDesc = curSpec.styleDesc;
                pRadius = curSpec.previewRadius;
                pInnerRadius = curSpec.previewInnerRadius;
                crestPosStyle = curSpec.previewCrestPositionCss;
              } else if (key === 'thematic') {
                previewOuterBg = activeBubbleTh.frameBg || `linear-gradient(135deg, ${p}, ${s})`;
                previewOuterShadow = `0 4px 14px rgba(0,0,0,0.45), 0 0 10px ${activeBubbleTh.glow || p}`;
                previewInnerBg = activeBubbleTh.inputCardBg || 'rgba(26, 18, 15, 0.92)';
                showCrest = true;
                showCorner = true;
                pRadius = curSpec.previewRadius;
                pInnerRadius = curSpec.previewInnerRadius;
                crestPosStyle = curSpec.previewCrestPositionCss;
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
                  <div class="agy-input-preview-outer" style="position: relative; margin-top: 8px; padding: 1.5px; border-radius: ${pRadius}; background: ${previewOuterBg}; box-shadow: ${previewOuterShadow};">
                    <div class="agy-input-preview-charm" style="position: absolute; top: -14px; left: 8px; width: 18px; height: 38px; background-image: url('${charmSvg}'); background-size: contain; background-repeat: no-repeat; display: ${showCrest ? 'block' : 'none'}; pointer-events: none; z-index: 6; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));"></div>
                    <div class="agy-input-preview-crest" style="position: absolute; top: -11px; ${crestPosStyle} width: 72px; height: 18px; background-image: url('${crestSvg}'); background-size: contain; background-position: center; background-repeat: no-repeat; display: ${showCrest ? 'block' : 'none'}; pointer-events: none; z-index: 5; filter: drop-shadow(0 2px 6px ${activeBubbleTh.glow || p});"></div>
                    <div class="agy-input-preview-corner-bl" style="position: absolute; bottom: 2px; right: 2px; width: 13px; height: 13px; background-image: url('${cornerSvg}'); background-size: contain; background-repeat: no-repeat; transform: rotate(180deg); display: ${showCorner ? 'block' : 'none'}; pointer-events: none; z-index: 5; opacity: ${key === 'ornamental' ? '0.92' : '0.75'};"></div>
                    <div class="agy-input-preview-corner-tl" style="position: absolute; top: 2px; left: 2px; width: 12px; height: 12px; background-image: url('${cornerSvg}'); background-size: contain; background-repeat: no-repeat; display: ${showCorner ? 'block' : 'none'}; pointer-events: none; z-index: 5; opacity: ${key === 'ornamental' ? '0.92' : '0.75'};"></div>
                    <div class="agy-input-preview-inner" style="background: ${previewInnerBg}; background-image: ${showCrest ? `url('${watermarkSvg}')` : 'none'}; background-repeat: no-repeat; background-position: right 6px center; background-size: 38px 38px; border-radius: ${pInnerRadius}; padding: 8px 12px; font-size: 12px; color: #a1a1aa; display: flex; justify-content: space-between; align-items: center;">
                      <span>Ask anything, @ to mention...</span>
                      <span class="agy-input-preview-turbo" style="color: #fff; background: linear-gradient(135deg, ${p}, ${s}); padding: 2px 8px; border-radius: 9999px; font-size: 10.5px; font-weight: 600; box-shadow: 0 0 6px ${activeBubbleTh.glow || p};">Send →</span>
                    </div>
                  </div>
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                      <div class="agy-input-card-title" style="font-size: 13.5px; font-weight: 500; color: #e4e4e7;">${cardTitle}</div>
                      <div class="agy-input-card-desc" style="font-size: 11.5px; color: #a1a1aa;">${cardDesc}</div>
                    </div>
                    <div class="agy-card-check-slot">${isSelected ? CHECK_SVG : ''}</div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <div style="margin-bottom: 28px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <div style="font-size: 15px; font-weight: 600; color: #ffffff;">Message Box Accessories</div>
            <span style="font-size: 12px; color: #a1a1aa;">Thematic charms, seals, role badges & brooches</span>
          </div>
          <div style="font-size: 12.5px; color: #a1a1aa; margin-bottom: 14px;">Customize the ornamental accessories on User Chat Bubbles and Assistant Response turns. Uploaded themes generate their own matching kit automatically.</div>

          <!-- Accessory Density / Display Mode -->
          <div style="margin-bottom: 16px;">
            <div style="font-size: 12.5px; font-weight: 500; color: #d4d4d8; margin-bottom: 8px;">Accessory Style Mode (Quick Presets)</div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
              ${Object.entries(ACCESSORY_MODES).map(([modeKey, modeInfo]) => {
                const isSel = modeKey === curAccMode;
                return `
                  <div class="agy-acc-mode-btn" data-mode="${modeKey}" style="border-radius: 10px; border: ${isSel ? '1.5px solid #f4f4f5' : '1px solid rgba(255, 255, 255, 0.12)'}; background: ${isSel ? 'rgba(42, 34, 30, 0.68)' : 'rgba(14, 12, 12, 0.78)'}; padding: 12px 14px; cursor: pointer; display: flex; flex-direction: column; justify-content: space-between; gap: 6px; transition: border-color 0.15s ease, background-color 0.15s ease;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span style="font-size: 13px; font-weight: 600; color: ${isSel ? '#ffffff' : '#e4e4e7'};">${modeInfo.label}</span>
                      <div class="agy-card-check-slot">${isSel ? CHECK_SVG : ''}</div>
                    </div>
                    <div style="font-size: 11px; color: #a1a1aa; line-height: 1.35;">${modeInfo.desc}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Granular Component Toggles -->
          <div style="margin-bottom: 16px;">
            <div style="font-size: 12.5px; font-weight: 500; color: #d4d4d8; margin-bottom: 8px;">Individual Accessory Parts (Granular Customization)</div>
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;">
              ${ACCESSORY_COMPONENTS.map(comp => {
                const isPartOn = Boolean(st[comp.prop]);
                return `
                  <button class="agy-acc-part-btn" data-prop="${comp.prop}" type="button" style="border-radius: 8px; border: ${isPartOn ? '1.5px solid ' + akp : '1px solid rgba(255, 255, 255, 0.12)'}; background: ${isPartOn ? 'rgba(56, 189, 248, 0.15)' : 'rgba(14, 12, 12, 0.78)'}; padding: 8px 6px; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; transition: all 0.15s ease;">
                    <span style="font-size: 16px;">${comp.icon}</span>
                    <span style="font-size: 10.5px; font-weight: 600; color: ${isPartOn ? '#ffffff' : '#a1a1aa'}; text-align: center; white-space: nowrap;">${comp.label}</span>
                    <span style="font-size: 9px; padding: 1px 6px; border-radius: 4px; background: ${isPartOn ? akp : 'rgba(255,255,255,0.08)'}; color: ${isPartOn ? '#000' : '#71717a'}; font-weight: 700;">${isPartOn ? 'ON' : 'OFF'}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Accessory Theme Kit Selection -->
          <div style="margin-bottom: 16px;">
            <div style="font-size: 12.5px; font-weight: 500; color: #d4d4d8; margin-bottom: 8px;">Theme Accessory Kits</div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
              <!-- Synced with Active Theme -->
              ${(() => {
                const isSyncedSel = curAccKit === 'sync';
                return `
                  <div class="agy-acc-kit-card" data-kit="sync" style="border-radius: 12px; border: ${isSyncedSel ? '1.5px solid #f4f4f5' : '1px solid rgba(255, 255, 255, 0.12)'}; background: ${isSyncedSel ? 'rgba(42, 34, 30, 0.68)' : 'rgba(14, 12, 12, 0.78)'}; padding: 14px 16px; cursor: pointer; display: flex; flex-direction: column; justify-content: space-between; gap: 10px; transition: border-color 0.15s ease, background-color 0.15s ease;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <div>
                        <div style="font-size: 13.5px; font-weight: 600; color: #ffffff;">✨ Synced with Active Theme</div>
                        <div style="font-size: 11.5px; color: #a1a1aa;">Automatically adapts to active preset (${st.themeName})</div>
                      </div>
                      <div class="agy-card-check-slot">${isSyncedSel ? CHECK_SVG : ''}</div>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0, 0, 0, 0.35); border-radius: 8px; padding: 6px 12px; gap: 6px;">
                      <div style="width: 16px; height: 32px; background-image: url('${liveCharmUrl}'); background-size: contain; background-repeat: no-repeat;" title="Talisman Charm"></div>
                      <div style="width: 80px; height: 16px; background-image: url('${liveBadgeUrl}'); background-size: contain; background-repeat: no-repeat;" title="Role Badge"></div>
                      <div style="width: 70px; height: 16px; background-image: url('${liveCrestUrl}'); background-size: contain; background-repeat: no-repeat; background-position: center;" title="Top Crown Crest"></div>
                      <div style="width: 22px; height: 22px; background-image: url('${liveSealUrl}'); background-size: contain; background-repeat: no-repeat;" title="3D Wax Seal"></div>
                      <div style="width: 22px; height: 22px; background-image: url('${liveBroochUrl}'); background-size: contain; background-repeat: no-repeat;" title="Corner Brooch"></div>
                    </div>
                  </div>
                `;
              })()}

              <!-- Individual Theme Kits -->
              ${allThemeKeys.map(name => {
                const th = allThemes[name] || {};
                const isSel = curAccKit === name;
                const tp = th.primary || '#38bdf8';
                const ts = th.secondary || tp;
                const tMotif = detectThemeMotif(name, th.concept, th);
                const tCrestUrl = (th.accessories && th.accessories.crest) ? th.accessories.crest : getThemeTopCrestSvg(tMotif, tp, ts);
                const tSealUrl = (th.accessories && th.accessories.seal) ? th.accessories.seal : getThemeWaxSealSvg(tMotif, tp, ts);
                const tCharmUrl = (th.accessories && th.accessories.charm) ? th.accessories.charm : getThemeUserCharmSvg(tMotif, tp, ts);
                const tBadgeUrl = (th.accessories && th.accessories.badge) ? th.accessories.badge : getThemeUserBadgeSvg(tMotif, tp, ts, th.isCustom ? `◈ ${name.toUpperCase()}` : undefined);
                const tBroochUrl = (th.accessories && th.accessories.brooch) ? th.accessories.brooch : getThemeAgentBroochSvg(tMotif, tp, ts);

                return `
                  <div class="agy-acc-kit-card" data-kit="${name}" style="border-radius: 12px; border: ${isSel ? '1.5px solid #f4f4f5' : '1px solid rgba(255, 255, 255, 0.12)'}; background: ${isSel ? 'rgba(42, 34, 30, 0.68)' : 'rgba(14, 12, 12, 0.78)'}; padding: 14px 16px; cursor: pointer; display: flex; flex-direction: column; justify-content: space-between; gap: 10px; transition: border-color 0.15s ease, background-color 0.15s ease;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <div>
                        <div style="font-size: 13.5px; font-weight: 600; color: #ffffff;">${name} Kit</div>
                        <div style="font-size: 11.5px; color: #a1a1aa;">${th.concept || 'Custom Theme Kit'}</div>
                      </div>
                      <div class="agy-card-check-slot">${isSel ? CHECK_SVG : ''}</div>
                    </div>
                    <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0, 0, 0, 0.35); border-radius: 8px; padding: 6px 12px; gap: 6px;">
                      <div style="width: 16px; height: 32px; background-image: url('${tCharmUrl}'); background-size: contain; background-repeat: no-repeat;" title="Talisman Charm"></div>
                      <div style="width: 80px; height: 16px; background-image: url('${tBadgeUrl}'); background-size: contain; background-repeat: no-repeat;" title="Role Badge"></div>
                      <div style="width: 70px; height: 16px; background-image: url('${tCrestUrl}'); background-size: contain; background-repeat: no-repeat; background-position: center;" title="Top Crown Crest"></div>
                      <div style="width: 22px; height: 22px; background-image: url('${tSealUrl}'); background-size: contain; background-repeat: no-repeat;" title="3D Wax Seal"></div>
                      <div style="width: 22px; height: 22px; background-image: url('${tBroochUrl}'); background-size: contain; background-repeat: no-repeat;" title="Corner Brooch"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Live Mini-Preview of Message Box Accessories -->
          <div style="border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.12); background: rgba(10, 12, 18, 0.7); padding: 16px 20px; margin-top: 14px; position: relative;">
            <div style="font-size: 12px; font-weight: 600; color: #a1a1aa; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
              <span>LIVE ACCESSORIES PREVIEW (${curAccKit === 'sync' ? `SYNCED • ${st.themeName}` : curAccKit})</span>
              <span style="font-size: 11.5px; color: ${akp}; font-weight: 600;">Mode: ${ACCESSORY_MODES[curAccMode]?.label || curAccMode}</span>
            </div>

            <!-- Mini User Bubble Preview -->
            <div style="position: relative; width: 100%; max-width: 440px; margin-left: auto; margin-top: 16px; margin-bottom: 16px; padding: 1.5px; border-radius: 12px; background: ${activeKitTh.frameBg || `linear-gradient(135deg, ${akp}, ${aks})`}; box-shadow: 0 4px 14px rgba(0,0,0,0.4), 0 0 10px ${akg}35;">
              ${liveShowCorners ? `<div style="position: absolute; top: -11px; right: 20px; width: 120px; height: 18px; background-image: url('${liveBadgeUrl}'); background-size: contain; background-repeat: no-repeat; z-index: 5; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.7));"></div>` : ''}
              ${liveShowCharm ? `<div style="position: absolute; top: -12px; left: -8px; width: 22px; height: 46px; background-image: url('${liveCharmUrl}'); background-size: contain; background-repeat: no-repeat; z-index: 6; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.75));"></div>` : ''}
              ${liveShowSeal ? `<div style="position: absolute; bottom: -8px; right: -6px; width: 26px; height: 26px; background-image: url('${liveSealUrl}'); background-size: contain; background-repeat: no-repeat; z-index: 7; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.75));"></div>` : ''}
              <div style="position: relative; background: ${activeKitTh.bg || 'rgba(17, 24, 39, 0.95)'}; border-radius: 11px; padding: 8px 18px 8px 22px; font-size: 12px; color: ${activeKitTh.textColor || '#fff'}; background-image: ${liveShowCorners ? `url('${liveWatermarkUrl}')` : 'none'}; background-size: 44px; background-position: right 6px bottom 4px; background-repeat: no-repeat;">
                ${liveShowCorners ? `<div style="position: absolute; top: 3px; left: 3px; width: 12px; height: 12px; background-image: url('${liveCornerUrl}'); background-size: contain; background-repeat: no-repeat; opacity: 0.85;"></div>` : ''}
                <span>Can we customize the message accessories per theme?</span>
              </div>
            </div>

            <!-- Mini Agent Turn Preview -->
            <div style="position: relative; width: 100%; margin-top: 24px; border-radius: 12px; border-left: ${liveShowRail ? `3.5px solid ${akp}` : `1px solid ${akp}20`}; border-top: 1px solid ${akp}35; border-right: 1px solid ${akp}20; border-bottom: 1px solid ${akp}20; background: rgba(18, 20, 28, 0.72); padding: 14px 16px; box-shadow: ${liveShowRail ? `0 4px 14px rgba(0,0,0,0.35), -2px 0 10px ${akg}25` : `0 2px 8px rgba(0,0,0,0.2)`};">
              ${liveShowCrest ? `<div style="position: absolute; top: -14px; left: 50%; transform: translateX(-50%); width: 180px; height: 26px; background-image: url('${liveCrestUrl}'); background-size: contain; background-repeat: no-repeat; background-position: center; z-index: 7; filter: drop-shadow(0 2px 8px rgba(0,0,0,0.8)) drop-shadow(0 0 8px ${akg});"></div>` : ''}
              ${liveShowCorners ? `<div style="position: absolute; top: -12px; left: 38px; width: 170px; height: 22px; background-image: url('${liveHeaderUrl}'); background-size: contain; background-repeat: no-repeat; z-index: 5; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.7));"></div>` : ''}
              ${liveShowSeal ? `<div style="position: absolute; top: -16px; right: 14px; width: 34px; height: 34px; background-image: url('${liveBroochUrl}'); background-size: contain; background-repeat: no-repeat; z-index: 6; filter: drop-shadow(0 2px 8px rgba(0,0,0,0.75));"></div>` : ''}
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <div style="width: 20px; height: 20px; border-radius: 9999px; border: 1.2px solid ${aks}; background: #0c1424; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #fff;">AI</div>
                <span style="font-size: 11px; font-weight: 600; color: #94a3b8;">Antigravity Engine</span>
              </div>
              <div style="font-size: 12px; color: #e2e8f0; line-height: 1.4;">
                Each theme automatically crafts a matching set of hanging seals, crown crests, role plaques, intelligence banners, and jewelry brooches!
              </div>
            </div>
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
              const isCustomTheme = Boolean(th.isCustom || !THEMES[name]);
              const thumbBg = th.wallpaper
                ? `linear-gradient(180deg, rgba(0,0,0,0.15), rgba(14,12,12,0.85)), url('${th.wallpaper}')`
                : (th.pureBg || th.bg);
              const thumbOrnamentStyle = th.isOrnament
                ? 'right: 10px; bottom: 8px; width: 76px; height: 24px; background-position: center;'
                : 'right: 12px; bottom: 4px; width: 42px; height: 38px; background-position: bottom center;';
              const safeName = String(name).replace(/"/g, '&quot;');
              return `
                <div class="agy-preset-card" data-name="${safeName}" style="position: relative; border-radius: 12px; border: ${isSelected ? '1.5px solid #f4f4f5' : '1px solid rgba(255, 255, 255, 0.12)'}; background: rgba(14, 12, 12, 0.82); overflow: hidden; cursor: pointer; display: flex; flex-direction: column; transition: border-color 0.15s ease, transform 0.1s ease;">
                  <div style="height: 68px; width: 100%; background-image: ${thumbBg}; background-size: cover; background-position: ${th.bgPosition || 'center'}; position: relative; display: flex; align-items: flex-end; padding: 8px 14px;">
                    ${th.sticker ? `<div style="position: absolute; ${thumbOrnamentStyle} background-image: url('${th.sticker}'); background-size: contain; background-repeat: no-repeat; pointer-events: none;"></div>` : ''}
                    <span style="font-size: 13.5px; font-weight: 600; color: #fff; text-shadow: 0 1px 4px rgba(0,0,0,0.9); z-index: 1;">${name}</span>
                    ${isCustomTheme ? `
                      <button class="agy-delete-preset-btn" data-preset="${safeName}" title="Delete preset ${safeName}" style="position: absolute; top: 6px; right: 6px; width: 24px; height: 24px; border-radius: 6px; background: rgba(0,0,0,0.65); border: 1px solid rgba(255,255,255,0.2); color: #fca5a5; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: bold; cursor: pointer; transition: all 0.15s ease; z-index: 2;">
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
      const activeMotif = detectThemeMotif(bName, activeTh.concept, activeTh);
      const curSpec = getThemeComposerSpec(activeMotif, p, s, activeTh.glow, activeTh.secondaryGlow);
      const cornerSvg = activeTh.cornerSvg || getThematicCornerSvg(p, s, activeMotif);
      const crestSvg = activeTh.sticker || getThematicCrestSvg(p, s, activeMotif);
      const charmSvg = getThemeCharmSvg(activeMotif, p, s);
      const watermarkSvg = getThemeWatermarkSvg(activeMotif, p, s);
      const curStyle = normalizeInputStyle(getState().inputStyle);

      container.querySelectorAll('.agy-input-card').forEach(card => {
        const key = card.dataset.style;
        const outer = card.querySelector('.agy-input-preview-outer');
        if (outer) {
          if (key === 'ornamental') {
            outer.style.borderRadius = curSpec.previewRadius;
            outer.style.background = curSpec.outerBorder;
            outer.style.boxShadow = `0 4px 16px rgba(0,0,0,0.5), 0 0 12px ${activeTh.glow || p}`;
          } else if (key === 'thematic') {
            outer.style.borderRadius = curSpec.previewRadius;
            outer.style.background = activeTh.frameBg || `linear-gradient(135deg, ${p}, ${s})`;
            outer.style.boxShadow = `0 4px 14px rgba(0,0,0,0.45), 0 0 10px ${activeTh.glow || p}`;
          } else if (key === 'glass') {
            outer.style.borderRadius = '10px';
            outer.style.background = 'rgba(255, 255, 255, 0.16)';
            outer.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
          } else {
            outer.style.borderRadius = '10px';
            outer.style.background = 'rgba(255, 255, 255, 0.12)';
            outer.style.boxShadow = 'none';
          }
        }
        const inner = card.querySelector('.agy-input-preview-inner');
        if (inner) {
          inner.style.borderRadius = (key === 'ornamental' || key === 'thematic')
            ? curSpec.previewInnerRadius
            : '8.5px';
          inner.style.background = key === 'glass'
            ? (activeTh.inputGlassBg || 'rgba(20, 15, 13, 0.45)')
            : key === 'minimal'
            ? 'rgba(18, 20, 28, 0.94)'
            : (activeTh.inputCardBg || 'rgba(26, 18, 15, 0.92)');
          inner.style.backgroundImage = (key === 'ornamental' || key === 'thematic')
            ? `url('${watermarkSvg}')`
            : 'none';
        }
        const charm = card.querySelector('.agy-input-preview-charm');
        if (charm) {
          charm.style.backgroundImage = `url('${charmSvg}')`;
          charm.style.display = (key === 'ornamental' || key === 'thematic') ? 'block' : 'none';
        }
        const crest = card.querySelector('.agy-input-preview-crest');
        if (crest) {
          crest.style.backgroundImage = `url('${crestSvg}')`;
          crest.style.filter = `drop-shadow(0 2px 6px ${activeTh.glow || p})`;
          crest.style.display = (key === 'ornamental' || key === 'thematic') ? 'block' : 'none';
          if (curSpec.crestPositionCss.includes('left: 50%')) {
            crest.style.left = '50%';
            crest.style.right = 'auto';
            crest.style.transform = 'translateX(-50%)';
          } else if (curSpec.crestPositionCss.includes('right: 32px')) {
            crest.style.left = 'auto';
            crest.style.right = '16px';
            crest.style.transform = 'none';
          } else {
            crest.style.left = 'auto';
            crest.style.right = '14px';
            crest.style.transform = 'none';
          }
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
        if (key === 'ornamental') {
          const t = card.querySelector('.agy-input-card-title');
          const d = card.querySelector('.agy-input-card-desc');
          if (t) t.textContent = curSpec.styleName;
          if (d) d.textContent = curSpec.styleDesc;
        }
        const turbo = card.querySelector('.agy-input-preview-turbo');
        if (turbo) {
          turbo.style.background = `linear-gradient(135deg, ${p}, ${s})`;
          turbo.style.boxShadow = `0 0 6px ${activeTh.glow || p}`;
          turbo.style.color = '#ffffff';
        }
      });

      container.querySelectorAll('.agy-bubble-card').forEach(bCard => {
        const thName = bCard.dataset.name;
        const th = allTh[thName] || {};
        const bp = th.primary || '#38bdf8';
        const bs = th.secondary || bp;
        const bMotif = detectThemeMotif(thName, th.concept, th);
        const bSpec = getThemeComposerSpec(bMotif, bp, bs, th.glow, th.secondaryGlow);
        const bCornerSvg = th.cornerSvg || getThematicCornerSvg(bp, bs, bMotif);
        const bCrestSvg = th.sticker || getThematicCrestSvg(bp, bs, bMotif);

        const bOuter = bCard.querySelector('.agy-bubble-preview-outer');
        if (bOuter) {
          bOuter.style.borderRadius = bSpec.bubblePreviewRadius;
          bOuter.style.background = curStyle === 'ornamental'
            ? bSpec.outerBorder
            : curStyle === 'thematic'
            ? (th.frameBg || `linear-gradient(135deg, ${bp}, ${bs})`)
            : (curStyle === 'glass' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.12)');
          bOuter.style.boxShadow = curStyle === 'ornamental'
            ? bSpec.bubbleShadow
            : curStyle === 'thematic'
            ? `0 4px 14px rgba(0,0,0,0.45), 0 0 10px ${th.glow || bp}`
            : '0 2px 8px rgba(0,0,0,0.3)';
        }
        const bInner = bCard.querySelector('.agy-bubble-preview-inner');
        if (bInner) {
          bInner.style.borderRadius = bSpec.bubblePreviewRadius;
          bInner.style.background = curStyle === 'glass'
            ? (th.inputGlassBg || 'rgba(14, 18, 28, 0.55)')
            : curStyle === 'minimal'
            ? 'rgba(16, 18, 26, 0.94)'
            : (th.bg || 'rgba(17, 24, 39, 0.9)');
        }
        const showBubbleOrnaments = curStyle === 'ornamental' || curStyle === 'thematic';
        const bCrest = bCard.querySelector('.agy-bubble-preview-crest');
        if (bCrest) {
          bCrest.style.backgroundImage = `url('${bCrestSvg}')`;
          bCrest.style.display = showBubbleOrnaments ? 'block' : 'none';
          if (bSpec.bubbleCrestPositionCss.includes('left: 50%')) {
            bCrest.style.left = '50%';
            bCrest.style.right = 'auto';
            bCrest.style.transform = 'translateX(-50%)';
          } else {
            bCrest.style.left = 'auto';
            bCrest.style.right = '10px';
            bCrest.style.transform = 'none';
          }
        }
        const bCorner = bCard.querySelector('.agy-bubble-preview-corner');
        if (bCorner) {
          bCorner.style.backgroundImage = `url('${bCornerSvg}')`;
          bCorner.style.display = showBubbleOrnaments ? 'block' : 'none';
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
            const motif = detectThemeMotif(themeName, 'Custom Live Wallpaper • MP4', palette);

            const p = palette.primary || '#38bdf8';
            const s = palette.secondary || p;
            const newAccessories = {
              version: 3,
              crest: getThemeTopCrestSvg(motif, p, s),
              seal: getThemeWaxSealSvg(motif, p, s),
              charm: getThemeUserCharmSvg(motif, p, s),
              badge: getThemeUserBadgeSvg(motif, p, s, `◈ ${themeName.toUpperCase()}`),
              header: getThemeAgentHeaderSvg(motif, p, s, `✧ ${themeName.toUpperCase()}`),
              brooch: getThemeAgentBroochSvg(motif, p, s),
              watermark: getThemeWatermarkSvg(motif, p, s),
              corner: getThematicCornerSvg(p, s, motif)
            };

            const newPreset = {
              id: 'custom_' + Date.now(),
              name: themeName,
              isCustom: true,
              bgMode: 'live',
              videoKey: videoKey,
              wallpaper: thumb,
              concept: 'Custom Live Wallpaper • MP4',
              motif: motif,
              accessories: newAccessories,
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

            applyTheme({ themeName: themeName, bubbleName: themeName, accessoryKit: themeName, inputStyle: curStyle, customWp: '', bgMode: 'live', wpEnabled: true });
            renderThemePanels(container);
          } catch (err) {
            console.error('Failed to save live video preset:', err);
          }
        } else {
          const reader = new FileReader();
          reader.onload = async () => {
            const dataUrl = reader.result;
            const palette = (await extractPaletteFromImage(dataUrl)) || getFallbackPalette('static');
            const motif = detectThemeMotif(themeName, 'Custom Image Wallpaper', palette);
            const p = palette.primary || '#38bdf8';
            const s = palette.secondary || p;
            const newAccessories = {
              version: 3,
              crest: getThemeTopCrestSvg(motif, p, s),
              seal: getThemeWaxSealSvg(motif, p, s),
              charm: getThemeUserCharmSvg(motif, p, s),
              badge: getThemeUserBadgeSvg(motif, p, s, `◈ ${themeName.toUpperCase()}`),
              header: getThemeAgentHeaderSvg(motif, p, s, `✧ ${themeName.toUpperCase()}`),
              brooch: getThemeAgentBroochSvg(motif, p, s),
              watermark: getThemeWatermarkSvg(motif, p, s),
              corner: getThematicCornerSvg(p, s, motif)
            };
            const newPreset = {
              id: 'custom_' + Date.now(),
              name: themeName,
              isCustom: true,
              bgMode: 'static',
              wallpaper: dataUrl,
              concept: 'Custom Image Wallpaper',
              motif: motif,
              accessories: newAccessories,
              ...palette
            };
            saveCustomPreset(newPreset);
            applyTheme({ themeName: themeName, bubbleName: themeName, accessoryKit: themeName, inputStyle: curStyle, customWp: '', bgMode: 'static', wpEnabled: true });
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
    if (resetBtn) {
      resetBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        localStorage.removeItem(STORAGE_CUSTOM_WP);
        localStorage.removeItem(STORAGE_USER_AVATAR);
        localStorage.removeItem(STORAGE_AGENT_AVATAR);
        localStorage.removeItem(STORAGE_THEME);
        localStorage.removeItem(STORAGE_BUBBLE);
        localStorage.removeItem(STORAGE_INPUT);
        localStorage.removeItem(STORAGE_DIMMING);
        localStorage.removeItem(STORAGE_WP_ENABLED);
        localStorage.removeItem(STORAGE_BG_MODE);
        localStorage.removeItem(STORAGE_ACCESSORY_KIT);
        localStorage.removeItem(STORAGE_ACCESSORY_MODE);
        localStorage.removeItem(STORAGE_ACC_CREST);
        localStorage.removeItem(STORAGE_ACC_CHARM);
        localStorage.removeItem(STORAGE_ACC_CORNERS);
        localStorage.removeItem(STORAGE_ACC_SEAL);
        localStorage.removeItem(STORAGE_ACC_RAIL);
        const defStyle = 'thematic';
        applyTheme({
          themeName: DEFAULT_THEME_KEY,
          bubbleName: DEFAULT_THEME_KEY,
          accessoryKit: 'sync',
          accessoryMode: 'full',
          accCrest: true,
          accCharm: true,
          accCorners: true,
          accSeal: true,
          accRail: true,
          inputStyle: defStyle,
          dimming: 69,
          wpEnabled: true,
          customWp: '',
          userAvatar: '',
          agentAvatar: '',
          bgMode: 'static'
        });
        renderThemePanels(container);
      });
    }

    container.querySelectorAll('.agy-preset-card').forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const name = card.dataset.name;
        const allTh = getAllThemes();
        const th = allTh[name] || {};
        const targetMode = th.bgMode || (th.liveVideo ? 'live' : 'static');
        applyTheme({
          themeName: name,
          bubbleName: name,
          inputStyle: 'ornamental',
          customWp: '',
          bgMode: targetMode
        });
        renderThemePanels(container);
      });
    });

    container.querySelectorAll('.agy-delete-preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const presetName = btn.dataset.preset;
        if (!presetName) return;

        const curTheme = localStorage.getItem(STORAGE_THEME);
        const curBubble = localStorage.getItem(STORAGE_BUBBLE);
        const curKit = localStorage.getItem(STORAGE_ACCESSORY_KIT);

        removeCustomPreset(presetName);

        const overrides = {};
        if (curTheme === presetName) {
          overrides.themeName = DEFAULT_THEME_KEY;
          overrides.bubbleName = DEFAULT_THEME_KEY;
          overrides.customWp = '';
          overrides.bgMode = 'static';
          const v = document.getElementById('agy-live-video');
          if (v) {
            v.pause();
            v.removeAttribute('src');
            v.load();
          }
          if (window.__AGY_ACTIVE_BLOB_URL__) {
            try { URL.revokeObjectURL(window.__AGY_ACTIVE_BLOB_URL__); } catch (_) {}
            window.__AGY_ACTIVE_BLOB_URL__ = null;
          }
        } else if (curBubble === presetName) {
          overrides.bubbleName = curTheme || DEFAULT_THEME_KEY;
        }
        if (curKit === presetName) {
          overrides.accessoryKit = 'sync';
        }
        if (Object.keys(overrides).length > 0) {
          applyTheme(overrides);
        }
        renderThemePanels(container);
      });
    });

    container.querySelectorAll('.agy-bubble-card').forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const name = card.dataset.name;
        applyTheme({ bubbleName: name });
        renderThemePanels(container);
      });
    });

    container.querySelectorAll('.agy-input-card').forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const styleKey = normalizeInputStyle(card.dataset.style);
        applyTheme({ inputStyle: styleKey });
        renderThemePanels(container);
      });
    });

    container.querySelectorAll('.agy-acc-mode-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const mode = btn.dataset.mode;
        const overrides = { accessoryMode: mode };
        if (mode === 'full') {
          overrides.accCrest = true;
          overrides.accCharm = true;
          overrides.accCorners = true;
          overrides.accSeal = true;
          overrides.accRail = true;
        } else if (mode === 'jewelry') {
          overrides.accCrest = false;
          overrides.accCharm = true;
          overrides.accCorners = true;
          overrides.accSeal = true;
          overrides.accRail = true;
        } else if (mode === 'crown') {
          overrides.accCrest = true;
          overrides.accCharm = false;
          overrides.accCorners = true;
          overrides.accSeal = true;
          overrides.accRail = true;
        } else if (mode === 'minimal') {
          overrides.accCrest = false;
          overrides.accCharm = false;
          overrides.accCorners = false;
          overrides.accSeal = false;
          overrides.accRail = true;
        }
        applyTheme(overrides);
        renderThemePanels(container);
      });
    });

    container.querySelectorAll('.agy-acc-part-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const prop = btn.dataset.prop;
        const curVal = Boolean(getState()[prop]);
        const newVal = !curVal;
        applyTheme({ [prop]: newVal });
        renderThemePanels(container);
      });
    });

    container.querySelectorAll('.agy-acc-kit-card').forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const kit = card.dataset.kit;
        applyTheme({ accessoryKit: kit });
        renderThemePanels(container);
      });
    });

    const restoreScroll = () => {
      if (savedScrollTop <= 0) return;
      const newScrollEl = container.querySelector('#agy-theme-scroll-container') || container;
      if (newScrollEl) {
        newScrollEl.scrollTop = savedScrollTop;
      }
      if (container && container !== newScrollEl && container.scrollTop > 0) {
        container.scrollTop = 0;
      }
    };
    restoreScroll();
    requestAnimationFrame(restoreScroll);
    setTimeout(restoreScroll, 10);
    setTimeout(restoreScroll, 40);
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
        <div id="agy-settings-theme-body" style="flex: 1; overflow: hidden; display: flex; flex-direction: column; height: 100%; min-height: 0;"></div>
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
