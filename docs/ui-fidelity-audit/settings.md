# Fidelity audit — Settings (2026-08-05)

Source: side-by-side read of `design/handoff/design/PostQueen App v2.dc.html` (settings markup
2591–2868, vals 5134–5165 + 6588–6600 + 6642–6800) against `pr14/live-matrix`. **78 deltas.**

## A) Prototype settings inventory

### Shell
- Scrim `:2591` fixed inset-0 z-90 `rgba(0,0,0,.55)` `padding:44px 24px`, centered.
- Card `:2592` `width:min(1040px,100%); height:min(680px,100%); r16; bg:var(--pop);
  box-shadow:var(--e3),inset 0 0 0 1px var(--border); overflow:hidden; animation:pqpop .16s`.
- Mobile/tablet `:163-166`: card 100%/100%, r0, column; nav → `max-height:132px` top strip with
  border-bottom; tablet scrim padding 20px.
- Close `:2617-2619`: absolute `top:14px; right:16px`, 30×30, r8, hover `--hover`, 17px X.
- Content pane `:2620-2621`: `flex:1; overflow-y:auto; padding:26px 28px 34px; bg:var(--inner)`;
  inner column `max-width:920px`.
- Tab title `:2622` h3 20px/**500**; description `:2623` `margin-top:4px` muted 14px.
- Radii `--r-sm:8 --r-md:10 --r-lg:14 --r-xl:18`.

### Left sub-nav
- Rail `:2594` `width:236px; bg:var(--bg); border-right:1px var(--line)`.
- **Search** `:2596-2599`: h34, r-sm, `bg:var(--inner)`, inset 1px border, `padding:0 11px 0 31px`,
  13px, 15px magnifier at left:10/top:10 soft; placeholder "Search settings"; wrapper pad
  `14px 12px 10px`.
- Body `:2601` `padding:0 8px 14px; gap:16px` groups; heading `:2604` `padding:0 9px 5px;
  10.5px/600 uppercase .07em soft`; item gap 1px.
- Item `:2606-2608`: h34, gap 9, `padding:0 9px`, r-sm, 13px; **16px stroked SVG icon** (paths
  `:5134-5146`); hover `inset 0 0 0 999px rgba(124,58,237,.10)`.
- Selected `:5161-5165`: `bg rgba(124,58,237,.15)`, `fg var(--focused)`, 600.
- Groups `:5150-5153`: **Workspace** [Global Settings, Language, Teams] · **More** [Social Sets,
  Signatures, Auto Post, Webhooks, Integrations] · **Developers** [Developers, Approved Apps].
- Gating `:5148-5149`: teams:team_members, sets/signatures:!free, autopost, webhooks>0,
  api/approved_apps:public_api.
- Billing settings-nav'da YOK (billing bir sayfa); Connections settings-nav'da YOK (kendi sayfası,
  `:2014`; Developers sekmesindeki "Open Connections" butonu + rail butonu oradan ulaşır).

### Tab titles/descriptions (`:6588-6600`)
global_settings "Global Settings" · language "Language"/"Pick the language for the interface,
emails and AI prompts." · teams "Team Members" · billing "Plan & invoices" · integrations
"Integrations"/"Extend PostQueen with other tools" · webhooks "Webhooks (3/N)" · autopost
"Autopost" · sets "Social Sets (3)" · signatures "Signatures" · api "Developers"/"Use the public
API to schedule posts from your own systems." · approved_apps "Approved Apps"

### Shared primitives
- **Card**: `r-md; bg:var(--pop); inset 0 0 0 1px var(--border); padding:15px 16px`.
- **List card**: same, `overflow:hidden`, no padding; rows `padding:13px 15px; gap:11px;
  border-bottom:1px var(--line)`.
- **Section label**: 13.5px/600; sub-desc 12.5px muted `margin-top:3px`.
- **Toggle**: 40×22 r999, track `--brand`/`--border`, knob 16×16 white top:3 left:3→23,
  transition .15s.
- **Chip button**: h32 `padding:0 13px` r-sm 12.5px; selected `bg:var(--brandSoft)` + inset 1px
  brand + 600; unselected transparent + border ring + muted.
- **Primary CTA**: `align-self:flex-start; h34; padding:0 13px 0 11px; r-sm; brand/#fff;
  13px/600` + inline 15px plus SVG.
- **Neutral small button**: h30 `padding:0 11-14px` r-sm|8 `bg:var(--settings)` text 12.5/500-600.
- **Icon-buttons**: 28×28 r7 transparent soft; hover `--hover` → text (edit) / `--warn` (delete);
  15px SVG.
- **Row icon tile**: 30×30 r9 `--settings` muted + 15px glyph.
- **Mono meta**: JetBrains Mono 11.5px soft truncated.

### Per-tab (proto lines)
- Global Settings `:2625-2663`: 3 cards gap10 mt18. Date Metrics = title + 2 chips. Email
  Notifications = title (pb6) + 3 rows `padding:11px 0; border-top:1px var(--line)`, name 13/500,
  desc 12 muted mt2, toggle right. Shortlink = title + 12.5 desc + 3 chips wrap.
- Language `:2665-2675`: grid `auto-fill minmax(150px,1fr) gap:8px`; tile h44 `padding:0 13px`
  r-md `bg:var(--pop)` inset ring border→brand, **horizontal**: 17px flag emoji + name flex-1 +
  15px brand check when selected; 600 selected.
- Teams `:2677-2699`: list card. Row: 30px round avatar (brand/photo, white 12/700 initial) +
  name 13.5/600 + email 12 muted + role pill (h21 `padding:0 9px` r999 `--settings` muted 11/600)
  + 28px trash (visibility:hidden for super-admin). CTA brand "Invite member" + plus.
- Integrations `:2702-2726`: grid `auto-fill minmax(320px,1fr) gap:12px`; card `min-height:184px;
  padding:17px; r16; bg:var(--inner); outline:1px var(--border)`, hover brand outline; 42px r12
  icon tile PNG 24px; title 14.5/600/-.01em; status 11.5/600 + 5px dot ok/soft; 2-line-clamp 13px
  desc; footer border-top pt13, 31px CTA (brand когда not connected / settings connected) + ghost
  Disconnect (soft, hover warn).
- Webhooks `:2728-2750`: list card, 30px link tile, name 13.5/600, mono URL, 2 icon-buttons; CTA
  "Add a webhook".
- Autopost `:2752-2777`: list card, 30px RSS tile, title + mono URL, 40×22 toggle inline, 2
  icon-buttons; CTA "Add an autopost".
- Social Sets `:2779-2801`: list card **with table header** (`padding:10px 15px;
  bg:var(--tableHeader); 11px/700 uppercase .06em soft` → Name flex-1 / Actions 150px). Rows
  `padding:11px 15px; border-top`, name 13.5/500 + two 30px pill Edit/Delete; CTA "Add a social
  set".
- Signatures `:2803-2824`: list card, no tile; preview 13.5 truncated + "Auto add? Yes/No" 12
  muted altında; 2 icon-buttons; CTA "Add a signature".
- Developers `:2826-2850`: **2 kart**. (1) "API key" + desc "One key authenticates the REST API,
  the MCP server, the CLI and the n8n node." + masked key (h38 `padding:0 12px` r-sm `bg:var(--bg)`
  inset ring mono 12.5) + üç 30px nötr buton Reveal/Copy/**Rotate key** (warn renkli). (2)
  "Connect an AI agent" yatay kart + 32px brand "**Open Connections**". Alt-sekme yok, CLI/MCP
  blokları yok (onlar Connections sayfasında).
- Approved Apps `:2852-2868`: list card. Row `padding:12px 15px; gap:12px`: 40px round tile
  (`--settings`, muted 15/600 initial), name 14/700, desc 12 muted, "Authorized on {date}" 12
  muted, 30px r8 settings **Revoke** (hover warn).

## C) Delta checklist

Shell: 
- [ ] 1 modal sunum (scrim+kart) — repo bare route (settings/page.tsx:15)
- [ ] 2 kart çerçevesi 1040×680 r16 --pop e3+ring
- [ ] 3 pqpop animasyonu
- [ ] 4 kapatma X butonu
- [ ] 5 mobil/tablet kuralları (100%, nav 132px üst şerit)
- [ ] 6 içerik max-width:920px
- [ ] 7 pane padding 26/28/34
- [ ] 8 pane bg: --inner pane on --pop card (repo ikisi de aynı renk)
- [ ] 9 FREE-tier `SettingsComponent` w-[500px] kutusu (settings.component:330-349) düzelt

Sub-nav:
- [ ] 10 Search settings kutusu
- [ ] 11 satır ikonları (proto :5134-5146 path'leri verbatim)
- [ ] 12 rail border-right hairline
- [ ] 13 rail bg --bg (tonal adım)
- [ ] 14 genişlik 260→236
- [ ] 15 padding 14/12/10 + 0/8/14
- [ ] 16 satır h38→34
- [ ] 17 satır 14→13px
- [ ] 18 satır padding 0 9px
- [ ] 19 item gap 1px
- [ ] 20 grup gap 16px
- [ ] 21 grup başlığı 10.5px soft
- [ ] 22 hover tint seçili satırda da
- [ ] 23 grup adı "More" + "Social Sets" (owner kararı: tasarım metni; design-change-log:194
      aksini söylüyor ama owner bu oturumda tasarımı seçti)
- [ ] 24 [code-has] Plan & invoices satırı — kalır (Workspace), tasarım idiomunda (log'a not)
- [ ] 25 [code-has] Connections satırı — kalkar; Developers'taki "Open Connections" + rail butonu
- [ ] 26 Integrations satırı More grubuna gelir
- [ ] (owner kararı) Plugs + Affiliate More grubuna repo-only satır olarak eklenir (rail'den
      taşınıyor; gate'ler aynen)

Content-pane:
- [ ] 27 tek paylaşılan başlık/desc bloğu shell'de; Language/Plan&invoices/Developers'ta eksik
- [ ] 28 başlık 20px/500
- [ ] 29 desc muted 14 mt4 her sekmede
- [ ] 30 blok ritmi mt18 + gap10

Primitifler:
- [ ] 31 kart bg-sixth → --pop
- [ ] 32 border → inset ring --border
- [ ] 33 radius 4 → r-md 10
- [ ] 34 padding 24 → 15/16
- [ ] 35 iç gap 24 → 13
- [ ] 36 section label 13.5/600
- [ ] 37 hairline list-card modeli (webhooks/autopost/sets/signatures/approved-apps)
- [ ] 38 30×30 r9 satır ikon tile'ları
- [ ] 39 mono URL (JetBrains 11.5 soft)
- [ ] 40 28px ikon-buton Edit/Delete (delete hover warn)
- [ ] 41 h34 artı-ikonlu birincil CTA
- [ ] 42 toggle 57×34 customColor → 40×22 brand/border (slider.tsx — global etki)

Per-tab:
- [ ] 43 Date Metrics: select → 2 chip
- [ ] 44 Shortlink: select → 3 chip
- [ ] 45 Shortlink fazladan iç etiket satırı kalkar
- [ ] 46 e-posta satırları arası hairline
- [ ] 47 e-posta satır adı 13/500
- [ ] 48 Language yatay 44px satır tile
- [ ] 49 Language seçili: brand ring + tik + 600
- [ ] 50 Language grid auto-fill 150px
- [ ] 51 Language tile r-md + --pop
- [ ] 52 Mantine <Text> kalkar (language.component:12,115)
- [ ] 53 Teams avatar
- [ ] 54 Teams e-posta satırı (isim olarak local-part hack'i yerine)
- [ ] 55 Teams rol pill'i
- [ ] 56 Teams satır düzeni (avatar+isim bloğu+pill+ikon)
- [ ] 57 Teams remove → 28px trash ikon (super-admin visibility:hidden)
- [ ] 58 Teams CTA "Invite member"
- [ ] 59 Sets tablo başlık şeridi (--tableHeader 11/700)
- [ ] 60 Sets aksiyonları 30px settings pill
- [ ] 61 Sets CTA "Add a social set"
- [ ] 62 4 sekmede grid-pseudo-table → hairline list-card
- [ ] 63 Signature "Auto add?" ikinci satır olarak
- [ ] 64 Signature absolute-truncation hack'i kalkar
- [ ] 65 Developers "Connect an AI agent" kartı + Open Connections
- [ ] 66 [code-has] Access/Apps alt-sekme pill'leri — Apps içeriği korunur; sunum tasarım
      idiomunda sadeleşir (log'a not)
- [ ] 67 [code-has] 4 satırlık açıklama paragrafı — desc'e iner
- [ ] 68 CLI + MCP blokları Developers'tan Connections sayfasına
- [ ] 69 Docs/N8N/Open Wizard butonları — capability korunur, tasarım idiomunda (log'a not)
- [ ] 70 API key alanı h38 --bg inset mono; blur-sm maskesi yerine maskeli string
- [ ] 71 Developers kart reçetesi düz --pop
- [ ] 72 Developers butonları 30px nötr; Rotate warn
- [ ] 73 Approved Apps hairline list
- [ ] 74 Approved Apps avatar --settings
- [ ] 75 Revoke 30px settings pill hover warn
- [ ] 76 [code-has] boş durum "No approved apps yet." — kalır (doğru davranış)
- [ ] 77 Integrations settings sekmesi (320px grid, 184px kart, r16, durum noktası, footer);
      /third-party → /settings?tab=integrations redirect (routes baseline gerekçeli güncellenir)
- [ ] 78 Plan & invoices: h3/desc eklenir; border → inset ring idiomu

## D) Legacy to clear (settings tree)

- D1 bg-sixth/border-fifth: metric:35, email-notifications:101,110, shortlink:68,75, teams:175,
  signatures:83, github:35,90,197 (ölü sekme), webhooks:72, autopost:80,360, sets:174,
  approved-apps:75,85, slider.tsx:18
- D2 customColor*: teams:192 (custom3+21), signatures:234 (custom2), autopost:360 (custom2),
  slider.tsx:20 (custom4), :26 (custom5)
- D3 raw hex: signatures:238 + autopost:360 `scrollbar-thumb-[#612AD5]`; developer:595
  bg-red-600; button.tsx:70 danger bg-red-500, :11/:100 color="#fff"
- D4 newBg*: settings.component:207,234; language:100-101; public.component:236,317,424,472,580,
  612; developer (16 satır); select.tsx:57
- D5 **bug**: `bg-newBgColorInnerInner` tanımsız — public.component:234,423,579 kartları arka
  plansız
- D6 tip ölçeği: nav 14→13; email 14→13; kart başlıkları 15→13.5; buton metinleri 12.5-13;
  third-party başlık 18→14.5
