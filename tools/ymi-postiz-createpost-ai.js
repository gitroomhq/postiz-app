(function () {
  if (window.__ymiPostizAiLoaded) return;
  window.__ymiPostizAiLoaded = true;

  function adminApiHeaders() {
    var headers = { 'Content-Type': 'application/json' };
    var token = '';
    try {
      token = localStorage.getItem('auth') || localStorage.getItem('postiz_auth') || sessionStorage.getItem('auth') || '';
      if (!token) {
        var match = document.cookie.match(/(?:^|; )auth=([^;]*)/);
        if (match) token = decodeURIComponent(match[1]);
      }
    } catch (e) {}
    if (token) headers.auth = token;
    return headers;
  }

  function setNativeValue(el, value) {
    if (!el) return;

    if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
      const proto = Object.getPrototypeOf(el);
      const desc = Object.getOwnPropertyDescriptor(proto, 'value');
      if (desc && desc.set) desc.set.call(el, value);
      else el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    if (el.isContentEditable) {
      el.focus();
      try {
        document.execCommand('selectAll', false, null);
        document.execCommand('insertText', false, value);
      } catch (_) {
        el.textContent = value;
      }
      el.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function findComposer() {
    const textareas = Array.from(document.querySelectorAll('textarea'));
    const textarea = textareas.find((t) => {
      const ph = String(t.getAttribute('placeholder') || '').toLowerCase();
      return ph.includes('write something') || ph.includes('write');
    });
    if (textarea) return textarea;

    const richEditors = Array.from(document.querySelectorAll('[contenteditable="true"]'));
    const richEditor = richEditors.find((el) => {
      const aria = String(el.getAttribute('aria-label') || '').toLowerCase();
      const cls = String(el.className || '').toLowerCase();
      const dataPh = String(el.getAttribute('data-placeholder') || '').toLowerCase();
      const ph = String(el.getAttribute('placeholder') || '').toLowerCase();
      return (
        aria.includes('write') ||
        dataPh.includes('write') ||
        ph.includes('write') ||
        cls.includes('prosemirror')
      );
    });
    return richEditor || null;
  }

  function findButtonByText(text) {
    const target = String(text || '').trim().toLowerCase();
    if (!target) return null;
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.find((btn) => String(btn.textContent || '').trim().toLowerCase().includes(target)) || null;
  }

  function isVisible(element) {
    return !!(element && element.offsetParent !== null && element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0);
  }

  function clickElement(element) {
    if (!element) return;
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  }

  function findInsertMediaControl(target) {
    const targetRect = target && target.getBoundingClientRect ? target.getBoundingClientRect() : null;
    const exactLabels = Array.from(document.querySelectorAll('div,span,button')).filter(function (element) {
      return isVisible(element) && String(element.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase() === 'insert media';
    });
    const candidates = exactLabels.map(function (label) {
      let current = label;
      for (let depth = 0; current && current !== document.body && depth < 7; depth += 1, current = current.parentElement) {
        const classes = String(current.className || '');
        if (isVisible(current) && (classes.includes('cursor-pointer') || current.getAttribute('role') === 'button' || current.tagName === 'BUTTON')) {
          return current;
        }
      }
      return label.parentElement;
    }).filter(isVisible);
    return candidates.sort(function (a, b) {
      const aRect = a.getBoundingClientRect();
      const bRect = b.getBoundingClientRect();
      if (!targetRect) return aRect.top - bRect.top;
      const aScore = Math.abs(aRect.left - targetRect.left) + Math.abs(aRect.top - targetRect.bottom);
      const bScore = Math.abs(bRect.left - targetRect.left) + Math.abs(bRect.top - targetRect.bottom);
      return aScore - bScore;
    })[0] || null;
  }

  function findMediaModalRoot(searchInput) {
    let current = searchInput;
    for (let depth = 0; current && current !== document.body && depth < 12; depth += 1, current = current.parentElement) {
      const label = String(current.textContent || '').replace(/\s+/g, ' ').toLowerCase();
      if (label.includes('add selected media') && label.includes('search by file name')) return current;
    }
    return document;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeTagsInput(value) {
    return String(value || '')
      .split(/[\n,\s]+/)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map((tag) => (tag.startsWith('#') ? tag : ('#' + tag)));
  }

  function normalizeListInput(value) {
    return String(value || '')
      .split(/[\n,|]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function clampImageCount(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return 1;
    return Math.min(5, Math.max(1, Math.floor(n)));
  }

  function pickFromList(list, index) {
    if (!Array.isArray(list) || list.length === 0) return '';
    return String(list[index % list.length] || '').trim();
  }

  function buildImagePromptVariants(basePrompt, count, directives) {
    const total = clampImageCount(count);
    const moods = normalizeListInput(directives && directives.moods);
    const objects = normalizeListInput(directives && directives.objects);
    const style = String((directives && directives.style) || '').trim();
    const lighting = String((directives && directives.lighting) || '').trim();
    const prompts = [];
    for (let i = 0; i < total; i += 1) {
      if (i === 0) {
        prompts.push(basePrompt);
      } else {
        const mood = pickFromList(moods, i);
        const objectFocus = pickFromList(objects, i);
        const guidance = [
          'Variation ' + (i + 1) + ': keep the same brand identity and typography, but create a clearly different concept from previous images.',
          mood ? ('Mood focus: ' + mood + '.') : 'Mood focus: use a clearly different emotional tone than prior variation.',
          objectFocus ? ('Primary object focus: ' + objectFocus + '.') : 'Primary object focus: use a different hero product/object than previous variation.',
          style ? ('Visual style direction: ' + style + '.') : '',
          lighting ? ('Lighting direction: ' + lighting + '.') : '',
          'Also change camera angle, composition, and depth while preserving photorealism and premium quality.'
        ].filter(Boolean).join(' ');
        prompts.push(basePrompt + '\n\n' + guidance);
      }
    }
    return prompts;
  }

  const DEFAULT_LUXURY_IMAGE_TEMPLATE = [
    'Create a premium cinematic social media cover image for **{{brand}}**, a luxury furniture and electronics wholesaler and manufacturer of handmade customised furniture.',
    '',
    '**Visual concept:** The hero image must show the exact product, service, occasion, or offer named in “Topic context” below. Never substitute an unrelated furniture item. For example, a sweets or bakery campaign must visibly feature premium sweets, cakes, or a festive dessert display; a furniture campaign must visibly feature the requested furniture. Only use luxury furniture when the topic is actually about furniture.',
    '',
    '**Mood:** aspirational, luxurious, timeless, sophisticated and emotionally captivating.',
    '',
    '**Style:** ultra-premium luxury commercial photography, photorealistic, cinematic lighting, architectural digest aesthetic, high-end furniture campaign, realistic material textures, elegant shadows, subtle warm ambient lighting, immaculate composition, sophisticated depth of field.',
    '',
    '**Composition:** vertical 4:5 social media format. Hero furniture positioned prominently in the lower/middle frame, dramatic architectural space behind it, generous negative space in the upper portion for typography. Camera at a premium interior-design editorial angle, slightly low perspective, 35mm cinematic lens.',
    '',
    '**Color palette:** warm wood, ivory, champagne, soft beige, subtle charcoal accents. No excessive colors.',
    '',
    '**Brand feeling:** "Not just furniture. Something unmistakably yours."',
    '',
    'Reserve a clean, low-detail strip at the top for the exact brand lockup Postiz will add after generation.',
    'Do not render logos, brand names, taglines, captions, watermarks, or any other text in the generated image.',
    '',
    'No people, no children, no dialogue, no clutter, no price tags, no promotional stickers, no discount badges, no cheap retail aesthetic, no excessive text, no distorted furniture, no unrealistic materials.',
    '',
    'The final image should look like a **Rs10-crore luxury interior campaign**, not a conventional furniture advertisement.',
    '',
    'Topic context: {{topic}} — this is mandatory visual subject matter.',
    'Tone: {{tone}}',
    'Goal: {{goal}}',
    'Audience: {{audience}}',
    'Language: {{language}}',
    'Preferred objects: {{objects}}',
    'Mood options: {{moods}}',
    'Visual style preference: {{style}}',
    'Lighting preference: {{lighting}}'
  ].join('\n');

  const STRATEGY_PRESETS = {
    product_showcase: {
      label: 'Product Showcase',
      moods: 'luxury, polished, premium, confident, aspirational',
      objects: 'hero sofa, handcrafted dining set, statement console, designer recliner, signature TV wall',
      style: 'high-end product campaign photography',
      lighting: 'studio-soft key light with premium contrast',
    },
    room_story: {
      label: 'Room Story',
      moods: 'cozy, lived-in, welcoming, elegant, warm',
      objects: 'family lounge sofa, coffee table styling, reading nook chair, media wall, handcrafted sideboard',
      style: 'editorial interior storytelling photography',
      lighting: 'natural daylight mixed with warm ambient practical lights',
    },
    festive_campaign: {
      label: 'Festive Campaign',
      moods: 'festive, joyful, celebratory, rich, vibrant',
      objects: 'festive living room setup, embellished sofa set, dining spread setup, decor console, statement lighting corner',
      style: 'luxury festive brand campaign photography',
      lighting: 'golden festive highlights with cinematic glow',
    },
    minimal_editorial: {
      label: 'Minimal Editorial',
      moods: 'minimal, calm, refined, modern, serene',
      objects: 'minimal sculptural sofa, clean dining silhouette, elegant accent chair, streamlined console, architectural shelf unit',
      style: 'minimalist architectural editorial photography',
      lighting: 'soft directional daylight with subtle shadows',
    },
    luxury_cinematic: {
      label: 'Luxury Cinematic',
      moods: 'dramatic, royal, luxurious, timeless, majestic',
      objects: 'grand hero sofa, bespoke dining island setup, statement lounge chair, premium entertainment wall, handcrafted focal furniture',
      style: 'cinematic luxury interior commercial photography',
      lighting: 'dramatic cinematic key light with warm rim accents',
    },
  };

  function fillTemplate(template, values) {
    let out = String(template || '');
    Object.keys(values).forEach(function (key) {
      const value = String(values[key] || '');
      out = out.replace(new RegExp('{{\\s*' + key + '\\s*}}', 'gi'), value);
    });
    return out;
  }

  function buildPostText(result, manualTagsValue) {
    // Hashtags are useful on social feeds, but are noisy and unnatural in a
    // one-to-one WhatsApp message.
    const tags = document.querySelector('[data-whatsapp-composer-mode]')
      ? []
      : normalizeTagsInput(manualTagsValue);
    return [
      result.hook || '',
      result.caption || '',
      tags.join(' '),
      result.cta || ''
    ].filter(Boolean).join('\n\n').trim();
  }

  function renderGeneratedPreview(previewEl, generated) {
    if (!previewEl) return;
    if (!generated) {
      previewEl.innerHTML = '<div style="opacity:.8;">No preview yet. Generate AI post to see a formatted preview.</div>';
      return;
    }

    const hook = escapeHtml(generated.hook || '');
    const caption = escapeHtml(generated.caption || '');
    const cta = escapeHtml(generated.cta || '');
    const tags = normalizeTagsInput(generated.tagsText || '').map(escapeHtml).join(' ');
    const images = Array.isArray(generated.previewImages) && generated.previewImages.length
      ? generated.previewImages
      : (Array.isArray(generated.generatedImages) && generated.generatedImages.length
        ? generated.generatedImages
        : (generated.generatedImage ? [generated.generatedImage] : []));
    const imagePrompt = escapeHtml((generated.imagePrompts && generated.imagePrompts[0]) || generated.imagePromptUsed || '');
    const imageHtml = images.length
      ? ('<div style="margin-top:8px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
         images.map(function (src, idx) {
           return '<img alt="AI generated ' + (idx + 1) + '" src="' + escapeHtml(src) + '" style="width:100%;border-radius:8px;border:1px solid #2f3440;" />';
         }).join('') + '</div>')
      : '<div style="margin-top:8px;opacity:.8;">No image returned. Prompt: ' + imagePrompt + '</div>';

    previewEl.innerHTML = [
      '<div style="background:#0f131b;border:1px solid #2f3440;border-radius:8px;padding:10px;">',
      '  <div style="font-weight:700;margin-bottom:6px;">' + hook + '</div>',
      '  <div style="white-space:pre-wrap;line-height:1.45;">' + caption + '</div>',
      tags ? ('  <div style="margin-top:8px;color:#93c5fd;">' + tags + '</div>') : '',
      cta ? ('  <div style="margin-top:8px;font-weight:600;">' + cta + '</div>') : '',
      imageHtml,
      '</div>'
    ].join('');
  }

  function renderMediaInPostPreview(images) {
    const sources = Array.isArray(images) ? images.filter(Boolean).slice(0, 4) : [];
    if (!sources.length) return;
    // WhatsApp owns its preview. Injecting a second image panel beside it
    // breaks the two-column composer layout and makes the preview misleading.
    if (document.querySelector('[data-whatsapp-composer-mode]')) return;

    const title = Array.from(document.querySelectorAll('h1,h2,h3,h4,div')).find(function (element) {
      return element.offsetParent !== null && String(element.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase() === 'post preview';
    });
    if (!title) return;

    const header = title.parentElement;
    const panel = header && header.parentElement;
    if (!header || !panel) return;

    let mediaPreview = panel.querySelector('[data-ymi-post-preview-media]');
    if (!mediaPreview) {
      mediaPreview = document.createElement('div');
      mediaPreview.setAttribute('data-ymi-post-preview-media', 'true');
      mediaPreview.style.cssText = 'margin:12px 18px 4px;padding:10px;border:1px solid #3d3d46;border-radius:10px;background:#14161d;';
      header.insertAdjacentElement('afterend', mediaPreview);
    }

    mediaPreview.innerHTML = [
      '<div style="font-size:12px;font-weight:700;margin-bottom:8px;color:#e5e7eb;">AI media preview · ' + sources.length + ' image' + (sources.length === 1 ? '' : 's') + '</div>',
      '<div style="display:grid;grid-template-columns:repeat(' + Math.min(sources.length, 2) + ',minmax(0,1fr));gap:8px;">',
      sources.map(function (source, index) {
        return '<img src="' + escapeHtml(source) + '" alt="Generated post media ' + (index + 1) + '" style="width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:7px;border:1px solid #2f3440;" />';
      }).join(''),
      '</div>'
    ].join('');
  }

  function clearPostPreviewMedia() {
    document.querySelectorAll('[data-ymi-post-preview-media]').forEach(function (element) { element.remove(); });
  }

  function waitFor(check, timeoutMs) {
    const timeout = Number(timeoutMs || 8000);
    const started = Date.now();
    return new Promise(function (resolve, reject) {
      function poll() {
        let value = null;
        try { value = check(); } catch (_) {}
        if (value) return resolve(value);
        if (Date.now() - started >= timeout) {
          return reject(new Error('Timed out while adding generated media to Postiz.'));
        }
        setTimeout(poll, 150);
      }
      poll();
    });
  }

  function drawFittedText(context, value, x, y, maxWidth, startingSize, minSize) {
    let size = startingSize;
    context.font = '700 ' + size + 'px Inter, Arial, sans-serif';
    while (size > minSize && context.measureText(value).width > maxWidth) {
      size -= 1;
      context.font = '700 ' + size + 'px Inter, Arial, sans-serif';
    }
    context.fillText(value, x, y);
  }

  async function applyBrandLockup(blob, brandName, tagline) {
    if (!brandName && !tagline) return blob;
    const objectUrl = URL.createObjectURL(blob);
    try {
      const image = await new Promise(function (resolve, reject) {
        const element = new Image();
        element.onload = function () { resolve(element); };
        element.onerror = function () { reject(new Error('Generated image could not be decoded.')); };
        element.src = objectUrl;
      });
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;
      if (!width || !height) return blob;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0, width, height);

      const padding = Math.max(22, Math.round(width * 0.035));
      const barHeight = Math.max(90, Math.min(Math.round(height * 0.18), Math.round(width * 0.24)));
      context.fillStyle = 'rgba(255, 253, 248, 0.94)';
      context.fillRect(0, 0, width, barHeight);
      context.fillStyle = '#1b1714';
      const textWidth = width - (padding * 2);
      const brandSize = Math.max(22, Math.round(width * 0.06));
      const taglineSize = Math.max(14, Math.round(width * 0.026));
      const brandY = padding + brandSize;
      if (brandName) drawFittedText(context, String(brandName), padding, brandY, textWidth, brandSize, 18);
      if (tagline) {
        context.fillStyle = '#725c40';
        context.font = '500 ' + taglineSize + 'px Inter, Arial, sans-serif';
        let size = taglineSize;
        while (size > 12 && context.measureText(String(tagline)).width > textWidth) {
          size -= 1;
          context.font = '500 ' + size + 'px Inter, Arial, sans-serif';
        }
        context.fillText(String(tagline), padding, Math.min(barHeight - padding, brandY + size + Math.max(8, Math.round(width * 0.012))));
      }
      const mimeType = blob.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const result = await new Promise(function (resolve) {
        canvas.toBlob(resolve, mimeType, 0.94);
      });
      return result && result.size ? result : blob;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function asDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = function () { reject(new Error('Could not prepare branded preview.')); };
      reader.readAsDataURL(blob);
    });
  }

  async function createBrandedPreview(source, brandName, tagline) {
    try {
      const response = await fetch(source);
      if (!response.ok) return source;
      const branded = await applyBrandLockup(await response.blob(), brandName, tagline);
      return branded && branded.size ? await asDataUrl(branded) : source;
    } catch (_) {
      return source;
    }
  }

  async function uploadGeneratedImage(source, index, brandName, tagline) {
    const imageResponse = await fetch(source);
    if (!imageResponse.ok) throw new Error('Could not read the generated image.');
    let blob = await imageResponse.blob();
    if (!blob || !blob.size) throw new Error('Generated image was empty.');
    blob = await applyBrandLockup(blob, brandName, tagline);

    const extension = blob.type === 'image/png' ? 'png' : 'jpg';
    const formData = new FormData();
    formData.append('file', blob, 'gemini-ai-' + Date.now() + '-' + index + '.' + extension);
    // Postiz serves its authenticated media controller at /media, not /api/media.
    // The latter is an unrelated API proxy route and silently prevented the
    // branded lockup from reaching the media library.
    const uploadResponse = await fetch('/media/upload-simple', {
      method: 'POST',
      body: formData,
      credentials: 'same-origin'
    });
    const uploaded = await uploadResponse.json().catch(function () { return null; });
    if (!uploadResponse.ok || !uploaded || !uploaded.id || !uploaded.path) {
      const detail = (uploaded && (uploaded.message || uploaded.error)) || '';
      throw new Error('Postiz could not save the generated image (HTTP ' + uploadResponse.status + ')' + (detail ? ': ' + detail : '.'));
    }
    return uploaded;
  }

  async function selectUploadedMedia(uploadedMedia, target) {
    const uploads = Array.isArray(uploadedMedia) ? uploadedMedia.filter(Boolean) : [uploadedMedia].filter(Boolean);
    if (!uploads.length) return;
    const insertButton = findInsertMediaControl(target);
    if (!insertButton) throw new Error('Open the Postiz Insert Media picker, then try Generate AI Post again.');
    clickElement(insertButton);

    const search = await waitFor(function () {
      return Array.from(document.querySelectorAll('input')).find(function (input) {
        return String(input.getAttribute('placeholder') || '').toLowerCase().includes('search by file name') && input.offsetParent !== null;
      });
    });
    const modal = findMediaModalRoot(search);
    for (let index = 0; index < uploads.length; index += 1) {
      const uploaded = uploads[index];
      const fileName = String(uploaded.path || '').split('/').pop().split('?')[0];
      setNativeValue(search, fileName);
      const image = await waitFor(function () {
        return Array.from((modal || document).querySelectorAll('img')).find(function (img) {
          const source = String(img.getAttribute('src') || '');
          return img.offsetParent !== null && (source.includes(fileName) || source.includes(String(uploaded.id)));
        });
      });
      const mediaCard = image.closest('.group');
      const selectable = mediaCard && mediaCard.firstElementChild;
      if (!selectable) throw new Error('Saved image could not be selected in the Postiz media library.');
      clickElement(selectable);
      await new Promise(function (resolve) { setTimeout(resolve, 120); });
    }

    const addButton = await waitFor(function () {
      return Array.from(document.querySelectorAll('button')).find(function (button) {
        const label = String(button.textContent || '').trim().toLowerCase();
        return button.offsetParent !== null && label.includes('add selected media') && !button.disabled;
      });
    });
    clickElement(addButton);
    await waitFor(function () {
      return !isVisible(addButton);
    }, 8000);

    for (let index = 0; index < uploads.length; index += 1) {
      const fileName = String(uploads[index].path || '').split('/').pop().split('?')[0];
      await waitFor(function () {
        return Array.from(document.querySelectorAll('img')).some(function (img) {
          return isVisible(img) && !modal.contains(img) && String(img.getAttribute('src') || '').includes(fileName);
        });
      }, 8000);
    }
  }

  async function attachGeneratedImagesToPostiz(images, target, brandName, tagline) {
    const sources = Array.isArray(images) ? images.filter(Boolean).slice(0, 4) : [];
    if (!sources.length) return 0;
    const uploaded = [];
    for (let index = 0; index < sources.length; index += 1) {
      uploaded.push(await uploadGeneratedImage(sources[index], index + 1, brandName, tagline));
    }
    await selectUploadedMedia(uploaded, target);
    return uploaded.length;
  }

  function openAiImageToolAndFillPrompt(target, prompt, statusEl) {
    if (!target || !prompt) {
      if (statusEl) statusEl.textContent = 'Image prompt unavailable.';
      return;
    }

    const targetRect = target.getBoundingClientRect();
    const iconButtons = Array.from(document.querySelectorAll('button')).filter(function (btn) {
      const txt = String(btn.textContent || '').trim().toLowerCase();
      const aria = String(btn.getAttribute('aria-label') || '').toLowerCase();
      const title = String(btn.getAttribute('title') || '').toLowerCase();
      const cls = String(btn.className || '').toLowerCase();
      const rect = btn.getBoundingClientRect();
      const iconLike = !txt || txt.length < 3;
      const nearComposer = rect.top <= targetRect.bottom && rect.top >= (targetRect.top - 160) && rect.left <= (targetRect.left + 120);
      const hinted = aria.includes('image') || title.includes('image') || cls.includes('image');
      return (nearComposer && iconLike) || hinted;
    });

    const aiImageButton = iconButtons[0] || null;
    if (!aiImageButton) {
      if (statusEl) statusEl.textContent = 'AI Image icon not found. Copy prompt and use icon manually.';
      return;
    }

    aiImageButton.click();

    const tryInject = function (attempt) {
      const inputs = Array.from(document.querySelectorAll('textarea,input,[contenteditable="true"]')).filter(function (el) {
        const ph = String(el.getAttribute('placeholder') || '').toLowerCase();
        const aria = String(el.getAttribute('aria-label') || '').toLowerCase();
        const visible = el.offsetParent !== null;
        return visible && (ph.includes('prompt') || ph.includes('describe') || aria.includes('prompt'));
      });

      const promptField = inputs[0] || null;
      if (!promptField) {
        if (attempt < 6) {
          setTimeout(function () { tryInject(attempt + 1); }, 300);
          return;
        }
        if (statusEl) statusEl.textContent = 'Opened AI Image tool. Paste prompt manually if field is not auto-detected.';
        return;
      }

      setNativeValue(promptField, prompt);
      const generateBtn = findButtonByText('generate') || findButtonByText('create');
      if (generateBtn) generateBtn.click();
      if (statusEl) statusEl.textContent = 'Prompt sent to AI Image icon and generation triggered.';
    };

    setTimeout(function () { tryInject(0); }, 250);
  }

  function makePanel(target) {
    if (document.querySelector('[data-ymi-postiz-ai]')) return;

    const wrap = document.createElement('div');
    wrap.setAttribute('data-ymi-postiz-ai', 'true');
    wrap.style.cssText = [
      'margin:12px 0',
      'padding:12px',
      'border:1px solid #3d3d46',
      'border-radius:10px',
      'background:#17171c',
      'color:#f3f4f6',
      'font-family:Inter,Segoe UI,sans-serif',
      'font-size:13px'
    ].join(';');

    wrap.innerHTML = [
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;">',
      '  <strong style="font-size:13px;">AI Create Post Assistant</strong>',
      '  <span style="font-size:11px;opacity:.8;">YehMeraIndia style: hook + caption + hashtags</span>',
      '</div>',
      '<div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:8px;margin-bottom:8px;">',
      '  <input data-ymi-topic placeholder="Post topic (required)" style="width:100%;padding:8px;border-radius:8px;border:1px solid #3d3d46;background:#111217;color:#f3f4f6;" />',
      '  <input data-ymi-tone placeholder="Tone" value="bold and energetic" style="width:100%;padding:8px;border-radius:8px;border:1px solid #3d3d46;background:#111217;color:#f3f4f6;" />',
      '  <input data-ymi-goal placeholder="Goal" value="engagement and shares" style="width:100%;padding:8px;border-radius:8px;border:1px solid #3d3d46;background:#111217;color:#f3f4f6;" />',
      '</div>',
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px;">',
      '  <select data-ymi-audience style="width:100%;padding:8px;border-radius:8px;border:1px solid #3d3d46;background:#111217;color:#f3f4f6;" title="Used as AI writing context, not paid-ad targeting"><option>Indian young adults</option><option>General audience</option><option>Families and homeowners</option><option>Luxury buyers</option><option>Local shoppers</option><option>Existing customers</option><option>Professionals</option></select>',
      '  <input data-ymi-area placeholder="City / service area" style="width:100%;padding:8px;border-radius:8px;border:1px solid #3d3d46;background:#111217;color:#f3f4f6;" title="Used as AI writing context, not paid-ad targeting" />',
      '  <input data-ymi-language placeholder="Language" value="Hinglish" style="width:100%;padding:8px;border-radius:8px;border:1px solid #3d3d46;background:#111217;color:#f3f4f6;" />',
      '</div>',
      '<div style="display:grid;grid-template-columns:2fr 1fr 120px;gap:8px;margin-bottom:8px;">',
      '  <input data-ymi-tags placeholder="#tag1 #tag2 (editable)" style="width:100%;padding:8px;border-radius:8px;border:1px solid #3d3d46;background:#111217;color:#f3f4f6;" />',
      '  <label style="display:flex;align-items:center;gap:8px;padding:8px;border-radius:8px;border:1px solid #3d3d46;background:#111217;color:#f3f4f6;font-size:12px;">',
      '    <input type="checkbox" data-ymi-image-check checked /> Generate image(s)',
      '  </label>',
      '  <input type="number" min="1" max="4" value="1" data-ymi-image-count style="width:100%;padding:8px;border-radius:8px;border:1px solid #3d3d46;background:#111217;color:#f3f4f6;" title="Up to four distinct images when paid Gemini image mode is enabled" />',
      '</div>',
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">',
      '  <select data-ymi-ai-provider style="width:100%;padding:8px;border-radius:8px;border:1px solid #3d3d46;background:#111217;color:#f3f4f6;"><option value="openrouter">OpenRouter</option><option value="openai">OpenAI</option><option value="gemini">Google Gemini</option></select>',
      '  <select data-ymi-ai-model style="width:100%;padding:8px;border-radius:8px;border:1px solid #3d3d46;background:#111217;color:#f3f4f6;"><option value="openrouter/free">Loading free OpenRouter models…</option></select>',
      '</div>',
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">',
      '  <select data-ymi-image-provider style="width:100%;padding:8px;border-radius:8px;border:1px solid #3d3d46;background:#111217;color:#f3f4f6;"><option value="gemini" selected>Gemini image generation</option><option value="openrouter">OpenRouter image generation</option></select>',
      '  <select data-ymi-image-model style="width:100%;padding:8px;border-radius:8px;border:1px solid #3d3d46;background:#111217;color:#f3f4f6;"><option value="google/gemini-2.5-flash-image">Loading image models…</option></select>',
      '</div>',
      '<label style="display:flex;align-items:center;gap:7px;margin:-2px 0 8px;font-size:12px;color:#cbd5e1;"><input type="checkbox" data-ymi-show-paid-models /> Include paid OpenRouter text models (image models may use credits) <span data-ymi-model-catalog-status></span></label>',
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">',
      '  <input data-ymi-brand placeholder="Brand name" value="JK Mall" style="width:100%;padding:8px;border-radius:8px;border:1px solid #3d3d46;background:#111217;color:#f3f4f6;" />',
      '  <input data-ymi-tagline placeholder="Tagline" value="Where Spaces Become Yours." style="width:100%;padding:8px;border-radius:8px;border:1px solid #3d3d46;background:#111217;color:#f3f4f6;" />',
      '</div>',
      '<div style="display:grid;grid-template-columns:1fr 160px;gap:8px;margin-bottom:8px;">',
      '  <select data-ymi-variation-strategy style="width:100%;padding:8px;border-radius:8px;border:1px solid #3d3d46;background:#111217;color:#f3f4f6;">',
      '    <option value="luxury_cinematic">Variation Strategy: Luxury Cinematic</option>',
      '    <option value="product_showcase">Variation Strategy: Product Showcase</option>',
      '    <option value="room_story">Variation Strategy: Room Story</option>',
      '    <option value="festive_campaign">Variation Strategy: Festive Campaign</option>',
      '    <option value="minimal_editorial">Variation Strategy: Minimal Editorial</option>',
      '  </select>',
      '  <button type="button" data-ymi-variation-apply style="background:#334155;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer;">Apply Preset</button>',
      '</div>',
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">',
      '  <input data-ymi-image-moods placeholder="Moods (comma/new line)" value="luxury, cozy, modern, festive, dramatic" style="width:100%;padding:8px;border-radius:8px;border:1px solid #3d3d46;background:#111217;color:#f3f4f6;" />',
      '  <input data-ymi-image-objects placeholder="Objects to focus (comma/new line)" value="hero sofa, dining set, console table, lounge chair, premium TV wall" style="width:100%;padding:8px;border-radius:8px;border:1px solid #3d3d46;background:#111217;color:#f3f4f6;" />',
      '</div>',
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">',
      '  <input data-ymi-image-style placeholder="Visual style" value="ultra-premium commercial photography" style="width:100%;padding:8px;border-radius:8px;border:1px solid #3d3d46;background:#111217;color:#f3f4f6;" />',
      '  <input data-ymi-image-lighting placeholder="Lighting" value="cinematic warm ambient lighting" style="width:100%;padding:8px;border-radius:8px;border:1px solid #3d3d46;background:#111217;color:#f3f4f6;" />',
      '</div>',
      '<div style="margin-bottom:8px;">',
      '  <button type="button" data-ymi-toggle-prompt aria-expanded="false" style="background:transparent;color:#c4b5fd;border:1px solid #5b21b6;border-radius:8px;padding:7px 10px;cursor:pointer;">Show image prompt box</button>',
      '  <textarea data-ymi-image-template rows="6" hidden style="width:100%;margin-top:8px;padding:8px;border-radius:8px;border:1px solid #3d3d46;background:#111217;color:#f3f4f6;resize:vertical;" placeholder="Optional custom AI image prompt template. Leave hidden/blank to use Postiz defaults."></textarea>',
      '</div>',
      '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">',
      '  <button type="button" data-ymi-generate style="background:#7c3aed;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer;">Generate AI Post</button>',
      '  <button type="button" data-ymi-preview-post style="background:#475569;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer;">Preview Post</button>',
       '  <button type="button" data-ymi-close-preview style="background:#374151;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer;display:none;">Back to Edit</button>',
       '  <select data-ymi-rewrite-provider style="padding:8px;border-radius:8px;border:1px solid #3d3d46;background:#111217;color:#f3f4f6;"><option value="openrouter">Rewrite AI: OpenRouter</option><option value="openai">Rewrite AI: OpenAI</option><option value="gemini">Rewrite AI: Gemini</option></select>',
       '  <select data-ymi-rewrite-mood style="padding:8px;border-radius:8px;border:1px solid #3d3d46;background:#111217;color:#f3f4f6;"><option value="friendly">Rewrite: Friendly</option><option value="professional">Rewrite: Professional</option><option value="excited">Rewrite: Excited</option><option value="luxurious and aspirational">Rewrite: Luxury</option><option value="playful">Rewrite: Playful</option><option value="urgent but trustworthy">Rewrite: Urgent</option><option value="warm and empathetic">Rewrite: Empathetic</option></select>',
      '  <button type="button" data-ymi-rewrite style="background:#0f766e;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer;">Rewrite Manual Post</button>',
      '  <button type="button" data-ymi-paste style="background:#2563eb;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer;display:none;">Paste to Composer</button>',
      '  <button type="button" data-ymi-copy style="background:#0ea5e9;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer;display:none;">Copy Text</button>',
      '  <button type="button" data-ymi-draft style="background:#16a34a;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer;display:none;">Save Draft</button>',
      '  <button type="button" data-ymi-publish style="background:#ef4444;color:#fff;border:none;border-radius:8px;padding:8px 12px;cursor:pointer;display:none;">Publish Now</button>',
      '  <button type="button" data-ymi-image-icon style="background:#f59e0b;color:#111827;border:none;border-radius:8px;padding:8px 12px;cursor:pointer;display:none;">Use AI Image Icon</button>',
      '  <button type="button" data-ymi-image-icon-next style="background:#fbbf24;color:#111827;border:none;border-radius:8px;padding:8px 12px;cursor:pointer;display:none;">Next AI Image</button>',
      '  <span data-ymi-status style="font-size:12px;opacity:.85"></span>',
      '</div>',
      '<div data-ymi-preview style="margin-top:10px;font-size:12px;"></div>'
    ].join('');

    const holder = target.closest('div') || target.parentElement;
    if (holder && holder.parentElement) {
      holder.parentElement.insertBefore(wrap, holder);
    } else {
      target.parentElement.insertBefore(wrap, target);
    }

    if (document.querySelector('[data-whatsapp-composer-mode]')) {
      const title = wrap.querySelector('strong');
      const subtitle = wrap.querySelector('span');
      if (title) title.textContent = 'AI WhatsApp Message Assistant';
      if (subtitle) {
        subtitle.textContent = 'Direct, concise customer copy · no hashtags';
      }
    }

    const topic = wrap.querySelector('[data-ymi-topic]');
    const tone = wrap.querySelector('[data-ymi-tone]');
    const goal = wrap.querySelector('[data-ymi-goal]');
    const audience = wrap.querySelector('[data-ymi-audience]');
    const area = wrap.querySelector('[data-ymi-area]');
    const language = wrap.querySelector('[data-ymi-language]');
    const tagsInput = wrap.querySelector('[data-ymi-tags]');
    const imageCheck = wrap.querySelector('[data-ymi-image-check]');
    const imageCountInput = wrap.querySelector('[data-ymi-image-count]');
    const aiProviderInput = wrap.querySelector('[data-ymi-ai-provider]');
    const aiModelInput = wrap.querySelector('[data-ymi-ai-model]');
    const imageProviderInput = wrap.querySelector('[data-ymi-image-provider]');
    const imageModelInput = wrap.querySelector('[data-ymi-image-model]');
    const showPaidModelsInput = wrap.querySelector('[data-ymi-show-paid-models]');
    const modelCatalogStatus = wrap.querySelector('[data-ymi-model-catalog-status]');
    const brandInput = wrap.querySelector('[data-ymi-brand]');
    const taglineInput = wrap.querySelector('[data-ymi-tagline]');
    const variationStrategy = wrap.querySelector('[data-ymi-variation-strategy]');
    const variationApply = wrap.querySelector('[data-ymi-variation-apply]');
    const imageMoodsInput = wrap.querySelector('[data-ymi-image-moods]');
    const imageObjectsInput = wrap.querySelector('[data-ymi-image-objects]');
    const imageStyleInput = wrap.querySelector('[data-ymi-image-style]');
    const imageLightingInput = wrap.querySelector('[data-ymi-image-lighting]');
    const imageTemplateInput = wrap.querySelector('[data-ymi-image-template]');
    const togglePrompt = wrap.querySelector('[data-ymi-toggle-prompt]');
    const generate = wrap.querySelector('[data-ymi-generate]');
    const previewPost = wrap.querySelector('[data-ymi-preview-post]');
    const closePreview = wrap.querySelector('[data-ymi-close-preview]');
    const rewriteProvider = wrap.querySelector('[data-ymi-rewrite-provider]');
    const rewriteMood = wrap.querySelector('[data-ymi-rewrite-mood]');
    const rewrite = wrap.querySelector('[data-ymi-rewrite]');
    const paste = wrap.querySelector('[data-ymi-paste]');
    const copy = wrap.querySelector('[data-ymi-copy]');
    const draft = wrap.querySelector('[data-ymi-draft]');
    const publish = wrap.querySelector('[data-ymi-publish]');
    const imageIcon = wrap.querySelector('[data-ymi-image-icon]');
    const imageIconNext = wrap.querySelector('[data-ymi-image-icon-next]');
    const status = wrap.querySelector('[data-ymi-status]');
    const previewEl = wrap.querySelector('[data-ymi-preview]');

    if (document.querySelector('[data-whatsapp-composer-mode]') && tagsInput?.parentElement) {
      // This row also contains the image toggle and count. Hiding its parent
      // accidentally disabled image generation for WhatsApp posts.
      tagsInput.style.display = 'none';
      tagsInput.parentElement.style.gridTemplateColumns = '1fr 120px';
    }

    const providerDefaults = {
      openrouter: { text: 'openai/gpt-4o-mini', image: 'gemini-3.1-flash-lite-image' },
      openai: { text: 'gpt-4o-mini', image: 'openai/gpt-5-image' },
      gemini: { text: 'gemini-3.1-flash-lite', image: 'gemini-3.1-flash-lite-image' }
    };
    function setModelOptions(select, models, selected, emptyLabel) {
      if (!select) return;
      select.innerHTML = '';
      if (!models.length) {
        const option = document.createElement('option');
        option.value = ''; option.textContent = emptyLabel;
        select.appendChild(option);
        select.disabled = true;
        return;
      }
      select.disabled = false;
      models.forEach(function (model) {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name + ' — ' + model.id + (model.free ? ' · FREE' : ' · uses credits');
        if (model.id === selected) option.selected = true;
        select.appendChild(option);
      });
      if (!select.value) select.value = models[0].id;
    }
    function setBuiltInModelOptions(provider) {
      const textModels = provider === 'gemini'
        ? [{ id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite' }, { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite' }, { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash' }]
        : [{ id: 'gpt-4o-mini', name: 'GPT-4o mini' }];
      setModelOptions(aiModelInput, textModels, providerDefaults[provider].text, 'No models configured');
    }
    function setGeminiImageOptions() {
      setModelOptions(imageModelInput, [
        { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image (Nano Banana)' },
        { id: 'gemini-3.1-flash-lite-image', name: 'Gemini 3.1 Flash Lite Image' },
        { id: 'gemini-3.1-flash-image', name: 'Gemini 3.1 Flash Image' },
        { id: 'gemini-3-pro-image', name: 'Gemini 3 Pro Image' }
      ], 'gemini-3.1-flash-lite-image', 'No image models configured');
    }
    async function refreshOpenRouterModels() {
      if (!aiProviderInput || aiProviderInput.value !== 'openrouter') {
        if (aiProviderInput) setBuiltInModelOptions(aiProviderInput.value);
        if (imageProviderInput && imageProviderInput.value === 'gemini') setGeminiImageOptions();
        return;
      }
      const previousText = String(aiModelInput && aiModelInput.value || 'openrouter/free');
      const previousImage = String(imageModelInput && imageModelInput.value || 'google/gemini-2.5-flash-image');
      if (modelCatalogStatus) modelCatalogStatus.textContent = 'Loading catalog…';
      try {
        const paid = !!(showPaidModelsInput && showPaidModelsInput.checked);
        const response = await fetch('http://localhost:3001/api/ai/models?includePaid=' + (paid ? 'true' : 'false'), { headers: adminApiHeaders() });
        const data = await response.json().catch(function () { return {}; });
        if (!response.ok) throw new Error(data.error || 'Could not load model catalog.');
        const textModels = Array.isArray(data.textModels) ? data.textModels : [];
        const imageModels = Array.isArray(data.imageModels) ? data.imageModels : [];
        setModelOptions(aiModelInput, textModels, previousText, 'No free text models currently listed');
        if (imageProviderInput && imageProviderInput.value === 'gemini') setGeminiImageOptions();
        else {
          const recommendedImage = imageModels.some(function (model) { return model.id === 'google/gemini-3.1-flash-image'; })
            ? 'google/gemini-3.1-flash-image'
            : (imageModels.some(function (model) { return model.id === 'google/gemini-2.5-flash-image'; })
              ? 'google/gemini-2.5-flash-image'
              : (imageModels[0] && imageModels[0].id));
          const keepPrevious = imageModels.some(function (model) { return model.id === previousImage; }) && !/^openrouter\/auto(?:$|:)/.test(previousImage);
          setModelOptions(imageModelInput, imageModels, keepPrevious ? previousImage : recommendedImage, 'No image-capable models currently listed');
        }
        if (modelCatalogStatus) {
          const freeImages = imageModels.filter(function (model) { return model.free; }).length;
          modelCatalogStatus.textContent = paid
            ? (textModels.length + ' text models · ' + imageModels.length + ' image models')
            : (textModels.length + ' free text models · ' + (freeImages ? (freeImages + ' free image models') : (imageModels.length + ' image models use credits')));
        }
      } catch (error) {
        if (modelCatalogStatus) modelCatalogStatus.textContent = 'Catalog unavailable';
        setModelOptions(aiModelInput, [{ id: 'openrouter/free', name: 'OpenRouter Free Models Router', free: true }], previousText, 'Catalog unavailable');
        setModelOptions(imageModelInput, [{ id: 'google/gemini-2.5-flash-image', name: 'Google: Nano Banana (Gemini 2.5 Flash Image)', free: false }], previousImage, 'Catalog unavailable');
      }
    }
    if (togglePrompt && imageTemplateInput) {
      togglePrompt.addEventListener('click', function () {
        const nextHidden = !imageTemplateInput.hidden;
        imageTemplateInput.hidden = nextHidden;
        togglePrompt.setAttribute('aria-expanded', String(!nextHidden));
        togglePrompt.textContent = nextHidden ? 'Show image prompt box' : 'Hide image prompt box';
      });
    }
    if (aiProviderInput) {
      aiProviderInput.addEventListener('change', function () {
        const selected = providerDefaults[aiProviderInput.value] || providerDefaults.openrouter;
        if (aiModelInput && aiProviderInput.value !== 'openrouter') aiModelInput.value = selected.text;
        if (imageProviderInput) imageProviderInput.value = aiProviderInput.value === 'gemini' ? 'gemini' : 'openrouter';
        if (imageModelInput && aiProviderInput.value !== 'openrouter') imageModelInput.value = selected.image;
        refreshOpenRouterModels();
      });
    }
    if (showPaidModelsInput) showPaidModelsInput.addEventListener('change', refreshOpenRouterModels);
    if (imageProviderInput) imageProviderInput.addEventListener('change', refreshOpenRouterModels);
    refreshOpenRouterModels();

    // Keep manual rewrite where people actually write: directly above the
    // composer media toolbar, rather than hidden in the AI generation panel.
    const manualRewriteBar = document.createElement('div');
    manualRewriteBar.setAttribute('data-ymi-manual-rewrite-bar', 'true');
    manualRewriteBar.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:8px 0;padding:8px;border:1px solid #3d3d46;border-radius:8px;background:#17171c;color:#f3f4f6;font-size:12px;';
    const manualRewriteLabel = document.createElement('span');
    manualRewriteLabel.textContent = 'Rewrite this manual post:';
    manualRewriteLabel.style.fontWeight = '600';
    manualRewriteBar.appendChild(manualRewriteLabel);
    manualRewriteBar.appendChild(rewriteProvider);
    manualRewriteBar.appendChild(rewriteMood);
    manualRewriteBar.appendChild(rewrite);
    const composerMediaControl = findInsertMediaControl(target);
    const composerToolbar = composerMediaControl && composerMediaControl.parentElement;
    if (composerToolbar && composerToolbar.parentElement) {
      composerToolbar.parentElement.insertBefore(manualRewriteBar, composerToolbar);
    } else {
      target.parentElement.insertBefore(manualRewriteBar, target.nextSibling);
    }

    if (imageTemplateInput && !String(imageTemplateInput.value || '').trim()) {
      imageTemplateInput.value = DEFAULT_LUXURY_IMAGE_TEMPLATE;
    }

    function applyStrategyPreset() {
      const key = String(variationStrategy && variationStrategy.value || 'luxury_cinematic').trim();
      const preset = STRATEGY_PRESETS[key] || STRATEGY_PRESETS.luxury_cinematic;
      if (!preset) return;
      if (imageMoodsInput) imageMoodsInput.value = preset.moods;
      if (imageObjectsInput) imageObjectsInput.value = preset.objects;
      if (imageStyleInput) imageStyleInput.value = preset.style;
      if (imageLightingInput) imageLightingInput.value = preset.lighting;
      if (status) status.textContent = 'Applied variation strategy: ' + preset.label + '.';
    }

    applyStrategyPreset();
    if (variationApply) variationApply.addEventListener('click', applyStrategyPreset);
    if (variationStrategy) variationStrategy.addEventListener('change', applyStrategyPreset);

    let generated = null;
    let iconPromptQueue = [];
    let iconPromptIndex = 0;
    renderGeneratedPreview(previewEl, generated);

    function showComposerPreview() {
      const text = String(target.value || target.textContent || '').trim();
      if (!text) {
        status.textContent = 'Write or generate a post before previewing it.';
        return;
      }
      const imageHtml = generated && generated.generatedImages && generated.generatedImages.length
        ? generated.generatedImages.slice(0, 4).map(function (src, index) { return '<img src="' + escapeHtml(src) + '" alt="Preview media ' + (index + 1) + '" style="width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:7px;" />'; }).join('')
        : '';
      previewEl.innerHTML = '<div style="background:#0f131b;border:1px solid #2f3440;border-radius:8px;padding:10px;"><div style="font-weight:700;margin-bottom:6px;">Post preview</div><div style="white-space:pre-wrap;line-height:1.45;">' + escapeHtml(text) + '</div>' + (imageHtml ? '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px;">' + imageHtml + '</div>' : '') + '</div>';
      if (generated && generated.generatedImages) renderMediaInPostPreview(generated.generatedImages);
      closePreview.style.display = 'inline-block';
      status.textContent = 'Preview is open. Choose Back to Edit to continue editing.';
    }

    previewPost.addEventListener('click', showComposerPreview);
    closePreview.addEventListener('click', function () {
      previewEl.innerHTML = '';
      clearPostPreviewMedia();
      closePreview.style.display = 'none';
      target.focus();
      status.textContent = 'Back to edit mode. Your post text is unchanged.';
    });

    rewrite.addEventListener('click', async function () {
      const content = String(target.value || target.textContent || '').trim();
      if (!content) { status.textContent = 'Write a manual post in the composer first.'; return; }
      rewrite.disabled = true;
      status.textContent = 'Rewriting your manual post...';
      try {
        const response = await fetch('http://localhost:3001/api/ai/rewrite', {
          method: 'POST', headers: adminApiHeaders(),
          body: JSON.stringify({ content: content, provider: String(rewriteProvider.value || 'openai'), mood: String(rewriteMood.value || 'friendly'), audience: String(audience.value || 'General audience'), area: String(area ? area.value : ''), language: String(language.value || 'Hinglish'), platform: document.querySelector('[data-whatsapp-composer-mode]') ? 'whatsapp' : 'instagram' })
        });
        const data = await response.json().catch(function () { return {}; });
        if (!response.ok) throw new Error(data.error || 'AI rewrite failed');
        setNativeValue(target, data.content);
        target.focus();
        generated = null;
        clearPostPreviewMedia();
        status.textContent = 'Manual post rewritten with ' + String(data.provider || rewriteProvider.value || 'AI') + '. Select Preview Post to review it before publishing.';
      } catch (error) {
        status.textContent = (error && error.message) || 'AI rewrite failed.';
      } finally { rewrite.disabled = false; }
    });

    generate.addEventListener('click', async function () {
      const topicValue = String(topic.value || '').trim();
      if (!topicValue) {
        status.textContent = 'Topic is required.';
        return;
      }

      generate.disabled = true;
      paste.style.display = 'none';
      copy.style.display = 'none';
      draft.style.display = 'none';
      publish.style.display = 'none';
      imageIcon.style.display = 'none';
      imageIconNext.style.display = 'none';
      status.textContent = 'Generating...';

      try {
        const brandName = String(brandInput ? brandInput.value : '').trim() || 'JK Mall';
        const tagline = String(taglineInput ? taglineInput.value : '').trim() || 'Where Spaces Become Yours.';
        const imageMoods = String(imageMoodsInput ? imageMoodsInput.value : '').trim();
        const imageObjects = String(imageObjectsInput ? imageObjectsInput.value : '').trim();
        const imageStyle = String(imageStyleInput ? imageStyleInput.value : '').trim();
        const imageLighting = String(imageLightingInput ? imageLightingInput.value : '').trim();
        const imagePromptTemplate = String(imageTemplateInput ? imageTemplateInput.value : '').trim();

        const response = await fetch('http://localhost:3001/api/ai/generate', {
          method: 'POST',
          headers: adminApiHeaders(),
          body: JSON.stringify({
            topic: topicValue,
            // WhatsApp requires direct, concise customer copy; the AI service
            // receives that context when its dedicated composer is selected.
            platform: document.querySelector('[data-whatsapp-composer-mode]')
              ? 'whatsapp'
              : 'instagram',
            postType: document.querySelector('[data-whatsapp-composer-mode]')
              ? 'message'
              : 'social-post',
            tone: String(tone.value || '').trim() || 'bold and energetic',
            goal: String(goal.value || '').trim() || 'engagement and shares',
            audience: String(audience.value || '').trim() || 'Indian young adults',
            area: String(area ? area.value : '').trim(),
            language: String(language.value || '').trim() || 'Hinglish',
            generateImage: !!(imageCheck && imageCheck.checked),
            imageCount: clampImageCount(imageCountInput ? imageCountInput.value : 1),
            provider: String(aiProviderInput ? aiProviderInput.value : 'openrouter'),
            imageProvider: String(imageProviderInput ? imageProviderInput.value : 'openrouter'),
            model: String(aiModelInput ? aiModelInput.value : '').trim(),
            imageModel: String(imageModelInput ? imageModelInput.value : '').trim(),
            brandName: brandName,
            tagline: tagline,
            imageMoods: imageMoods,
            imageObjects: imageObjects,
            imageStyle: imageStyle,
            imageLighting: imageLighting,
            imagePromptTemplate: imagePromptTemplate
          })
        });

        const data = await response.json().catch(function () { return {}; });
        if (!response.ok) throw new Error(data.error || 'AI request failed');

        const tagsText = Array.isArray(data.hashtags) ? data.hashtags.join(' ') : '';
        generated = {
          hook: data.hook || '',
          caption: data.caption || '',
          cta: data.cta || '',
          imagePrompts: Array.isArray(data.imagePrompts) ? data.imagePrompts : [],
          imagePromptUsed: data.imagePromptUsed || '',
          generatedImage: data.generatedImage || '',
          generatedImages: Array.isArray(data.generatedImages) ? data.generatedImages : (data.generatedImage ? [data.generatedImage] : []),
          tagsText: tagsText,
          freeMode: !!data.freeMode,
          freeModeReason: data.freeModeReason || '',
          imageQuotaExceeded: !!data.imageQuotaExceeded,
          imageGenerationError: data.imageGenerationError || '',
          imageProvider: data.provider && data.provider.image ? data.provider.image : String(imageProviderInput ? imageProviderInput.value : ''),
          imageProviderFallbackNotice: data.imageProviderFallbackNotice || '',
          paidImageMode: !!data.paidImageMode,
          imageLimit: Number(data.imageLimit || 1),
          mediaGenerationNotice: data.mediaGenerationNotice || ''
        };

        if (!generated.caption && !generated.hook) throw new Error('AI returned empty content');
        generated.previewImages = await Promise.all(generated.generatedImages.map(function (source) {
          return createBrandedPreview(source, brandName, tagline);
        }));
        if (tagsInput) tagsInput.value = generated.tagsText;
        renderGeneratedPreview(previewEl, generated);
        renderMediaInPostPreview(generated.previewImages);
        const postText = buildPostText(generated, tagsInput ? tagsInput.value : '');
        setNativeValue(target, postText);
        target.focus();
        let attachedImageCount = 0;
        let attachmentNotice = '';
        if (generated.generatedImages && generated.generatedImages.length) {
          status.textContent = 'Saving Gemini image to Postiz media...';
          try {
            attachedImageCount = await attachGeneratedImagesToPostiz(generated.generatedImages, target, brandName, tagline);
          } catch (attachmentError) {
            attachedImageCount = 0;
            attachmentNotice = ' Generated media could not be attached to the composer. Open Insert Media and select the saved Gemini image(s), then retry.';
          }
        }
        if (generated.freeMode) {
          status.textContent = (generated.freeModeReason || 'Free fallback mode active.') + ' Post text copied to the composer.';
        } else if (generated.imageQuotaExceeded && !(generated.generatedImages && generated.generatedImages.length)) {
          status.textContent = generated.imageProvider === 'openrouter'
            ? 'Post copy is now in the composer. OpenRouter image credits are unavailable for this account. Select “Gemini image generation” to use the configured Gemini image quota.'
            : 'Post copy is now in the composer. Gemini image quota is unavailable; enable image billing/quota to receive an image preview.';
        } else if (generated.imageGenerationError && !(generated.generatedImages && generated.generatedImages.length)) {
          status.textContent = 'Post copy is now in the composer. Image generation unavailable: ' + generated.imageGenerationError;
        } else {
          status.textContent = generated.generatedImages && generated.generatedImages.length
            ? ('Generated with ' + generated.generatedImages.length + ' Gemini image preview(s); ' + attachedImageCount + ' image attached to this Postiz post.')
            : 'Post copy is now in the composer. Image generation was not selected.';
        }
        if (attachmentNotice) status.textContent += attachmentNotice;
        if (generated.mediaGenerationNotice) status.textContent += ' ' + generated.mediaGenerationNotice;
        if (generated.imageProviderFallbackNotice) status.textContent += ' ' + generated.imageProviderFallbackNotice;
        paste.style.display = 'inline-block';
        copy.style.display = 'inline-block';
        draft.style.display = 'inline-block';
        publish.style.display = 'inline-block';
        imageIcon.style.display = 'none';
        closePreview.style.display = 'inline-block';
        iconPromptQueue = [];
        iconPromptIndex = 0;
      } catch (err) {
        const message = (err && err.message) ? err.message : 'Generation failed';
        if (generated && generated.generatedImages && generated.generatedImages.length) {
          renderGeneratedPreview(previewEl, generated);
          renderMediaInPostPreview(generated.generatedImages);
          status.textContent = message + ' Generated image preview is still available; post text remains in the composer.';
        } else {
          generated = null;
          renderGeneratedPreview(previewEl, generated);
          status.textContent = message;
        }
      } finally {
        generate.disabled = false;
      }
    });

    paste.addEventListener('click', function () {
      if (!generated) return;
      const postText = buildPostText(generated, tagsInput ? tagsInput.value : '');
      setNativeValue(target, postText);
      target.focus();
      status.textContent = 'Inserted into composer.';
    });

    copy.addEventListener('click', async function () {
      if (!generated) return;
      const postText = buildPostText(generated, tagsInput ? tagsInput.value : '');
      try {
        await navigator.clipboard.writeText(postText);
        status.textContent = 'Copied post text. You can customize more tags before paste.';
      } catch (_) {
        status.textContent = 'Copy failed. Use Paste to Composer.';
      }
    });

    draft.addEventListener('click', function () {
      if (!generated) return;
      const postText = buildPostText(generated, tagsInput ? tagsInput.value : '');
      setNativeValue(target, postText);
      target.focus();

      const saveDraftBtn = findButtonByText('save as draft');
      if (!saveDraftBtn) {
        status.textContent = 'Save draft button not found. Click Save as draft manually.';
        return;
      }
      saveDraftBtn.click();
      status.textContent = 'Draft save triggered. Check Calendar entries for the saved draft.';
    });

    publish.addEventListener('click', function () {
      if (!generated) return;
      const postText = buildPostText(generated, tagsInput ? tagsInput.value : '');
      setNativeValue(target, postText);
      target.focus();

      const publishBtn = findButtonByText('publish now') || findButtonByText('post now') || findButtonByText('add to calendar');
      if (!publishBtn) {
        status.textContent = 'Publish button not found. Use Save as draft/Add to Calendar manually.';
        return;
      }
      publishBtn.click();
      status.textContent = 'Publish action triggered.';
    });

    imageIcon.addEventListener('click', function () {
      const brandName = String(brandInput ? brandInput.value : '').trim() || 'JK Mall';
      const tagline = String(taglineInput ? taglineInput.value : '').trim() || 'Where Spaces Become Yours.';
      const imageMoods = String(imageMoodsInput ? imageMoodsInput.value : '').trim();
      const imageObjects = String(imageObjectsInput ? imageObjectsInput.value : '').trim();
      const imageStyle = String(imageStyleInput ? imageStyleInput.value : '').trim();
      const imageLighting = String(imageLightingInput ? imageLightingInput.value : '').trim();
      const template = String(imageTemplateInput ? imageTemplateInput.value : '').trim() || DEFAULT_LUXURY_IMAGE_TEMPLATE;

      const promptFromGenerated = generated && generated.imagePromptUsed ? String(generated.imagePromptUsed) : '';
      const composedPrompt = promptFromGenerated || fillTemplate(template, {
        brand: brandName,
        tagline: tagline,
        topic: String(topic.value || '').trim(),
        tone: String(tone.value || '').trim(),
        goal: String(goal.value || '').trim(),
        audience: String(audience.value || '').trim(),
        language: String(language.value || '').trim(),
        objects: imageObjects,
        moods: imageMoods,
        style: imageStyle,
        lighting: imageLighting,
      });

      iconPromptQueue = buildImagePromptVariants(composedPrompt, imageCountInput ? imageCountInput.value : 1, {
        moods: imageMoods,
        objects: imageObjects,
        style: imageStyle,
        lighting: imageLighting,
      });
      iconPromptIndex = 0;
      openAiImageToolAndFillPrompt(target, iconPromptQueue[iconPromptIndex], status);
      iconPromptIndex += 1;
      imageIconNext.style.display = iconPromptIndex < iconPromptQueue.length ? 'inline-block' : 'none';
      if (iconPromptQueue.length > 1) {
        status.textContent = 'AI Image icon prompt 1/' + iconPromptQueue.length + ' sent. Click Next AI Image for more variations.';
      }
    });

    imageIconNext.addEventListener('click', function () {
      if (!iconPromptQueue.length || iconPromptIndex >= iconPromptQueue.length) {
        status.textContent = 'No pending image variations. Click Use AI Image Icon again.';
        imageIconNext.style.display = 'none';
        return;
      }
      openAiImageToolAndFillPrompt(target, iconPromptQueue[iconPromptIndex], status);
      iconPromptIndex += 1;
      imageIconNext.style.display = iconPromptIndex < iconPromptQueue.length ? 'inline-block' : 'none';
      status.textContent = 'AI Image icon prompt ' + iconPromptIndex + '/' + iconPromptQueue.length + ' sent.';
    });
  }

  function mount() {
    const composer = findComposer();
    if (composer) makePanel(composer);
  }

  const observer = new MutationObserver(function () { mount(); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, { once: true });
  } else {
    mount();
  }
})();
