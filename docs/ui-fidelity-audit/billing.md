# Fidelity audit — Billing + paywall/checkout (2026-08-05)

Source: side-by-side read of `design/handoff/design/PostQueen App v2.dc.html` (billing markup
2291–2541, vals 5687–5810 + 8019–8128; paywall markup 3524–3845, vals 5401–5620) against the
`pr14/live-matrix` implementation. **87 deltas.** Check off as closed.

**Photo fixture (Batch C):** shoot the 14-state × light/dark matrix — checklist in
[`billing-photo-fixture.md`](./billing-photo-fixture.md). CREATOR yearly \$132 and “months free”
copy are **Raise (product)**; lifetime scarcity counter is **Intentional skip**.

## A) Prototype — billing page visual inventory (DOM order)

Root `:2292` — `background:var(--inner); flex:1; overflow-y:auto; padding:24px 28px 48px`; inner
rail `:2293` `max-width:1080px; margin:0 auto; flex-direction:column; gap:24px`.

1. **Page header** `:2295-2300` — single `<h2>Plans</h2>`, Plus Jakarta 26px/600/-.02em. No
   subtitle, no right-side content.
2. **Lifetime upsell strip** `:2302-2319` (trial only) — `padding:16px 18px; radius:16px;
   background:linear-gradient(110deg,rgba(245,158,11,.15),rgba(245,158,11,.045) 58%,transparent);
   outline:1px solid rgba(245,158,11,.3); outline-offset:-1px`. 38px crown chip `radius:12px;
   bg:var(--ltChipBg); color:var(--ltAmber)`. Title 15.5/600 + pill `BECOME A FOUNDING MEMBER`
   (h19, r999, `--ltSolid`/`--ltSolidFg`, 9px/800/.05em). Sub 12.5 muted. Price: struck `$396/yr`
   13px soft · `$49` 26px/700 ltAmber · `once` 12px. CTA h38 r10 `--ltSolid`.
3. **Payment-failed strip** `:2321-2332` — r16; `linear-gradient(90deg,rgba(239,68,68,.13),
   rgba(239,68,68,.05) 55%,transparent); outline:1px solid rgba(239,68,68,.28)`; 38px chip
   `rgba(239,68,68,.16)` **card** icon `#ef4444`; title 14.5/600 "We could not charge your credit
   card"; body 12.5 muted + date + "Publishing pauses in 5 days"; button h36 r10 `#ef4444`/#fff.
4. **Trial banner** `:2338-2345` — `padding:11px 14px; radius:11px; bg:var(--brandSoft)` (lifetime
   trial: `--ltChipBg`); 16px clock; 13px text; CTA h32 r9 `--brand`/#fff "End free trial";
   optional ghost "Cancel trial".
5. **Discount strip** `:2347-2362` — green gradient + `outline:1px rgba(74,222,128,.26)`, r16;
   chip `rgba(74,222,128,.16)` tag icon; title 14.5/600 "50% discount active"; sub 12.5 muted;
   right: struck old 14px soft · new 24px/700 `--ok` font-display · per 12.5 muted.
6. **Cancel-notice strip** `:2364-2375` — orange gradient, r16, `outline:1px rgba(251,146,60,.26)`;
   chip `rgba(251,146,60,.15)` warn icon; title 14.5/600 "Your subscription will be canceled at
   {date}"; sub; **Reactivate subscription** h36 r10 `--brand` + `box-shadow:0 4px 14px -6px
   rgba(124,58,237,.7)`.
7. **Plan-meta + period toggle row** `:2378-2393` — `margin-top:12px; padding-top:22px;
   border-top:1px solid var(--line)`. Left: `planMeta` 13px muted = "PostQueen PRO · renews {date}"
   / "· free trial until …" / "· access until …" (`:5767-5777`). Right: segmented pill `padding:4px;
   r999; bg:var(--settings)`; two h34 r999 13px/600 buttons, active `bg:var(--inner)` +
   `box-shadow:var(--e2)`, inactive transparent + muted; Yearly carries green pill h22 r999
   `rgba(74,222,128,.14)`/`--ok` 11px/700 "{n} months free" (per current plan).
8. **Plan grid** `:2400` — `grid; grid-template-columns:repeat(auto-fit,minmax(238px,1fr));
   gap:13px`. Card `:2402`: `padding:20px; radius:16px; background:{cardBg}; outline:{ring};
   outline-offset:-1px; gap:15px`.
   - `cardBg` `:8053`: `--inner`; AGENCY = `linear-gradient(150deg,rgba(124,58,237,.16),
     rgba(224,24,158,.07) 45%,var(--inner) 78%)`; lifetime = `--ltCardOn`.
   - `ring` `:8054`: current `1.5px solid var(--brand)`; AGENCY `1px rgba(124,58,237,.4)`; else
     `1px var(--border)`; lifetime `1.5px var(--ltLine2)`.
   - **MOST POPULAR** `:2403`: absolute `top:-9px; right:22px; h20; padding:0 9px; r999;
     bg:var(--brand); #fff; 10px/700/.05em` (PRO only). Sibling **LIFETIME** `:2404` on `--ltSolid`.
   - Name `:2406` 14px/600/.02em; colour soft → text (current) → ltAmber (lifetime).
   - Price `:2408` font-display **29px**/600/-.02em + per 13px muted.
   - Yearly save line `:2411` 12.5px soft = "$33/mo · save $192 a year" (`:8035`).
   - Prorate line `:2412` 12.5px/600, `min-height:17px`, colour `--ok`/`--soft`/`--ltAmber`; copy
     "(Pay Today $x)" | "Renews {date}" | "Never renews".
   - CTA `:2414` h40 r10 13.5/600; brand+#fff, or transparent + `inset 0 0 0 1px var(--border)` +
     muted for current plan (`:8058-8060`).
   - Divider `:2415` 1px `--line`.
   - Features `:2416-2423` gap 9; tick = 17×17 `radius:5px; bg:var(--brand)` + 12px white check;
     label 13px/1.5 muted; "Unlimited channels" → `--focused`, 600, `animation:pqunlim 1.9s
     ease-in-out infinite` (`:8061-8067`).
9. **Lifetime block** `:2429-2507` (`isLifetime && !ltTrial`) — hero `padding:24px; r18;
   linear-gradient(135deg,rgba(245,158,11,.17)…); outline:1px rgba(245,158,11,.34)`; 46px chip
   r14; title `PostQueen {tier}` 22px display + `FOUNDING MEMBER` pill; heart "Thank you for
   backing PostQueen early." 13.5/600 ltAmber; right price 26px/700 ltAmber + 12px soft sub.
   Facts row `:2453-2460` `border-top:1px var(--ltLine2)`, **4 cells**: label 10.5px/700/.07em
   `--ltLabel`, value 14.5/600. Then `<h3>Lifetime deal</h3>` 19px/600; grid
   `repeat(auto-fit,minmax(280px,1fr)) gap:13px` → **Current package** (`padding:20; r14;
   bg --inner; outline 1px --border`, kicker 12px/600/.06em uppercase soft, name 24px display,
   ticked features) and **Next package** (`outline:1.5px var(--brand)`, brand kicker) with Code
   input (h40 r10 `bg:var(--bg)`, inset border, JetBrains Mono 13px/.05em) + Claim h40 r10 brand.
10. **Portal/cancel row** `:2509-2516` — full-width card `padding:16px 18px; r14; bg:var(--inner);
    outline:1px var(--border)`. Left: "Payment method & invoices" 14/600 + 12.5 muted sub. Right:
    **Open billing portal** h38 r10 `bg:var(--settings)`/text; ghost **Cancel subscription** h38
    transparent soft, hover `--warn` + `--hover`.
11. **FAQ** `:2518-2537` — `<h3>Frequently asked questions</h3>` display 22px/600/-.018em; list
    gap 9. Item `:2526`: `padding:19px 22px; r14; bg:var(--inner); outline:1px {ring};
    outline-offset:-1px; transition:outline-color .14s`, ring border→brand when open, hover→brand.
    Question 15.5px/600. Chevron in 26×26 r8 tinted square (`--settings`→`--brandSoft`,
    soft→brand), `rotate(180deg); transition:.18s`. Answer 14px/1.7 muted, `margin-top:11px;
    padding-right:38px`.
- **Not in the design billing page:** any logout control; MONTHLY/YEARLY word labels; knob switch.

## C) Delta checklist — billing page

- [x] 1. max-width:1080px centred column (`billing/page.tsx`)
- [x] 2. "Plans" heading 26px display/600/-.02em
- [x] 3. Period control: knob `<Slider>` → segmented pill (main.billing); owner override 2026-08-05: inactive Monthly/Yearly use `text-pqText` (was too grey in light)
- [x] 4. Green "{n} months free" pill in Yearly toggle (shot CREATOR active)
- [x] 5. planMeta line + period control row (shot: PostQueen CREATOR + Monthly/Yearly)
- [x] 6. Lifetime upsell strip for trial users (proto :2302-2319) — 110deg ltSoft gradient
- [x] 7. Trial banner with "End free trial" CTA (proto :2338-2345) — FinishTrial sheet matched 2026-08-05
- [x] 8. Payment-failed strip → `pqDanger*` gradient (code; cell 09 not shootable without Stripe fail)
- [x] 9. Payment-failed CTA h36 r10 `bg-pqDanger`
- [x] 10. Plan card radius 16px
- [x] 11. Plan card bg-sixth → var(--inner) (main.billing plan cards `bg-pqInner`)
- [x] 12. Plan card outline 1px --border offset -1
- [x] 13. Current-plan brand ring (shot CREATOR)
- [x] 14. AGENCY gradient + violet ring (code path on AGENCY current)
- [x] 15. MOST POPULAR badge on PRO (shot)
- [x] 16. LIFETIME badge variant (lifetime surface code)
- [x] 17. grid auto-fit minmax(238px,1fr)
- [x] 18. Grid gap 13
- [x] 19. Price 29px display/600
- [x] 20. Plan name 14px/600 + state colours
- [x] 21. Yearly per-mo / save line (repo pricing; CREATOR $132 Raise)
- [x] 22. Prorate / renew meta above CTA (code)
- [x] 23. 1px divider between CTA and features
- [x] 24. Feature ticks brand tile + white check (shot)
- [x] 25. Feature list 13px rhythm
- [x] 26. Unlimited channels focused treatment (shot AGENCY card)
- [x] 27. Portal/cancel full-width card row (shot)
- [x] 28. Cancel ghost soft / hover warn
- [x] 29. Open billing portal h38 bg-pqSettings
- [x] 30. Cancel notice amber gradient + Reactivate (code; cell 06 not shootable)
- [x] 31. FAQ heading restored, 22px display (faq.component)
- [x] 32. FAQ item radius 8 → 14 (faq.component)
- [x] 33. FAQ surface bg-sixth/tableBorder → --inner + brand-on-open outline
- [x] 34. FAQ padding 24 → 19px 22px
- [x] 35. FAQ question 20px → 15.5px/600
- [x] 36. FAQ plus/minus → rotating chevron in 26px tinted r8 square
- [x] 37. FAQ answer 14px/1.7 muted pr-38
- [x] 38. FAQ list rhythm gap 9
- [x] 39. LogoutComponent — removed / not on billing page (design)
- [x] 40. Non-admin fallback design idiom (billing.component centred card)
- [x] 41. Lifetime surface on /billing itself (redirect gone; FoundingMember + packages)
- [x] 42. Current/Next package cards → --inner r14 + kicker + 24px display name
- [x] 43. Next-package 1.5px brand ring + brand kicker (proto :2485-2486)
- [x] 44. Founding facts row inside hero w/ border-top ltLine2, 4 cells incl. MEMBER SINCE
- [x] 45. [code-has] countdown+purchase on /billing/lifetime — amber founding card + 1080 shell (2026-08-05); scarcity chip still Intentional skip

## D) Prototype — paywall/checkout inventory

Fixed overlay `inset:0; z-index:3000; bg:var(--bg)`, body `padding-bottom:132px`. Header `:3528`
h**68**, `padding:0 40px`, `bg:var(--inner)`, `border-bottom:1px var(--line)`, sticky: 34px brand
tile r10 → wordmark `postqueen` 19px/800/-.025em → `v3.1.7` 12.5px soft → 1px sep → "Checkout"
15px/600 muted → right `gap:2px`: **Help** (h36 r10 text button + popover), **Developers** (text
button), sep, language (flag+code h36), theme 36×36, org switcher (22px tile), sep, logout icon.
Admin-required `:3588-3596` inside same shell: 56px circle `--settings`, h1 24px/700, p 16px/1.6
muted, `max-width:520px`.
Body `:3598` `gap:56px; padding:56px 40px 40px`.
- **Left** `:3600` (flex:1, gap 40): hero h1 54/42/34px **800** `line-height:1.06`/-.035em, second
  half `--brand` (`:3603`); sub 17px/1.5 muted `max-width:50ch`; trust row 3× 14.5px/500 + 18px
  `--ok` circle-check, nowrap, `gap:10px 22px`; lapsed strip `rgba(251,146,60,.1)` + outline
  `.25`, r14 "Your subscription ended on {date}"; **Payment details card** `:3616-3665`
  `padding:34px 32px; r22; bg:var(--inner); outline:1px var(--line); box-shadow:var(--e1)` + h2
  21px/600 + MC/VISA/AMEX svg chips, saved-card row (`--settings` r14, "Use another card" brand
  underline), fields h54 r14 `--settings` 16px, Stripe wordmark line 14px muted; **FAQ**
  `:3667-3682` h2 22px/600, items `padding:24px 26px; r18; bg --inner`, question 18px/600, 20px
  chevron `transition .25s`, answer 16px/1.6 muted `max-width:66ch`.
- **Right** `:3685` `flex:0 0 520px`, gap 20: **Lifetime card** `:3687-3731` r22
  `bg:var(--ltCardOn|Off)`, ring 1.5px ltAmber when picked, 20px radio dot, FOUNDING MEMBER pill,
  ONE-TIME PAYMENT chip (`--ltChipBg` + inset 1px rgba(245,158,11,.4)), title 21px, struck $396/yr
  + **$49 38px/700 ltAmber**, 2-col features w/ `--ltTick` tiles, footer countdown `{h}:{m}:{s}` /
  LAST CHANCE chip + "7-day free trial first"; **OR SUBSCRIBE divider** `:3733-3737` (hairlines +
  11.5px/700/.09em soft); **Plan card** `:3739-3786` r22 `--inner` + e1: "Choose a plan" 19px/600
  + pill toggle (r999 `--settings`, h32 buttons, green pill h21), 2×2 grid gap 11 tiles
  `padding:14px 16px; r14`, selected `bg:var(--brandSoft)` + 1.5px brand, **18px radio dot** w/
  white check, name 14.5/600, POPULAR pill h19 r999 9.5px/800/.05em, price 24px/600 display + per
  12.5 muted `padding-left:27px`; amber upsell `:3768-3771` "Or pay $49 once and keep Pro forever
  · Switch" (inset 1px rgba(245,158,11,.3), r14); footer `border-top` "Included in {plan}"
  14px/600 muted + 2-col features, 17px r5 brand ticks; **Order summary** `:3788-3834` r22
  `--inner` + e1, `padding:24px 26px 26px`, title 17px/600, rows 15px, discount row `{code} · 20%
  off` `--ok` amount, trial-credit row, coupon closed h44 r12 `--settings` + brand tag icon +
  brand "Add", coupon open `1px dashed var(--brand)` r13 (input h44 r11, Apply h44 r11 brand),
  applied chip h46 r13 `--okSoft`, hairline, **Due today** 16px/600 + 26px/600 display, `pwThen`
  14px muted, cancel-note `padding:13px 15px; r13; bg:var(--brandSoft)` + brand check-circle,
  14px/1.5.
- **Pay bar** `:3838-3845` fixed bottom h**92**, `padding:0 40px`, `bg:var(--inner)`,
  `border-top:1px var(--line)`, right-aligned two-line block (15.5/600 + 14px muted) + submit
  **h56, padding:0 30px, r15, brand, 16px/700, box-shadow:0 14px 30px -14px rgba(124,58,237,.95)**.

## Delta checklist — paywall/checkout

- [x] 46. Header h68 px-40 sticky
- [x] 47. Version chip beside wordmark (NEXT_PUBLIC_APP_VERSION)
- [x] 48. Header Help via HelpMenu (Developers capability elsewhere)
      (first.billing:285-300)
- [ ] 49. [code-has] AttachToFeedbackIcon in checkout header (first.billing:293) — kalır (repo
      capability), tasarım idiomunda
- [ ] 50. H1 46/600 → 54/800/1.06/-.035em (first.billing:156)
- [ ] 51. H1 highlight text-pqPink → --brand (first.billing:176,185)
- [ ] 52. Hero sub 17px max-w-50ch (first.billing:194)
- [ ] 53. Trust row 14.5/500 gap 10x22 nowrap (first.billing:225-251)
- [ ] 54. Amber lapsed strip "Your subscription ended on {date}" (proto :3610-3613; tarih için
      Stripe'tan okuma gerekir — yoksa tarihsiz cümle, invent etme)
- [ ] 55. Lifetime/founding card in right column (proto :3687-3731)
- [ ] 56. OR SUBSCRIBE divider (proto :3733-3737)
- [ ] 57. Amber "$49 once" upsell under plan grid (proto :3768-3771)
- [ ] 58. Plan picker wrapped in r22 --inner card + footer section (first.billing:342-478)
- [ ] 59. "Choose a Plan" 24/700 → 19/600 display (first.billing:343)
- [ ] 60. Period toggle → r999 pill on --settings h32 (first.billing:346-366)
- [ ] 61. Months-free badge → r999 h21 pill, exact per-plan figure (first.billing:373-377)
- [ ] 62. Radio dot on plan tiles (proto :3755-3757)
- [ ] 63. Selected tile bg --brandSoft (proto :5509)
- [ ] 64. Tiles fixed 266×138 → auto-height padding:14px 16px r14 (first.billing:388)
- [ ] 65. Tile price 44px → 24px display + 12.5 unit (first.billing:411-423)
- [ ] 66. Yearly tile shows /mo effective price (proto :5505-5506)
- [ ] 67. POPULAR badge → r999 h19 9.5/800/.05em (first.billing:403-408)
- [ ] 68. [code-has] "Switch to yearly" strip — design's slot is the amber lifetime upsell;
      52/57 ile birlikte değerlendir (log'a not)
- [ ] 69. "Features" heading → "Included in {plan}" 14/600 muted in card footer
      (first.billing:473-478)
- [ ] 70. Checkout ticks → 17×17 r5 brand tile, 14px/600 labels (first.billing:583-599)
- [ ] 71. pqunlim glow on Unlimited/Yours forever (proto :5528-5531)
- [ ] 72. FAQ: left column, always visible (first.billing:479-482)
- [ ] 73. Checkout FAQ own scale: padding 24/26, r18, q 18px, a 16px/1.6 66ch (proto :3671-3677)
- [ ] 74. Payment details card container + 21px/600 heading + card-brand chips
      (embedded.billing:153-164)
- [ ] 75. MC/VISA/AMEX chips row (proto :3620-3622)
- [ ] 76. Order summary → right column under plan card (embedded.billing:234)
- [ ] 77. Order summary container r22 --inner + e1 (embedded.billing:238)
- [ ] 78. "Order Summary" 24/700 → 17/600 inline (embedded.billing:235)
- [ ] 79. Due today 18px → 26px/600 display (embedded.billing:308)
- [ ] 80. "Then …" line 14px muted (embedded.billing:315)
- [ ] 81. Cancel-anytime note → brandSoft box + brand check icon (embedded.billing:323-330)
- [ ] 82. Coupon closed → h44 r12 settings button + brand tag icon (embedded.billing:552-577)
- [ ] 83. Coupon open → dashed brand r13 box, h44 r11 fields (embedded.billing:580-628)
- [ ] 84. Applied coupon chip → okSoft h46 r13 + ok check (pqPink/#FC69FF kalkar)
      (embedded.billing:406-431)
- [ ] 85. Pay button h42 → h56 r15 16/700 + brand shadow (embedded.billing:666)
- [ ] 86. Pay bar → h92 flat padding:0 40px + two-line right block (embedded.billing:640-663)
- [ ] 87. Admin-required → in-paywall centred state + 56px circle icon
      (billing.admin.required:22-46)

## Cancel retention dialog (`billingDlg`) — 2026-08-05

| Step | App | Status |
| --- | --- | --- |
| Confirm + Keep my plan / Yes, cancel | `BillingCancelDialog` | Match |
| Amber team-removal note on confirm | when downgrading from team plan | Match |
| Before you cancel + Apply 50% | when `check-discount` + not lifetime trial | Match |
| Feedback ≥20 chars → cancel | same APIs | Match |
| Lifetime trial skips 50%×3 | owner — uses $24.50 instead | Match |
| Lifetime trial $24.50 retention | `POST /billing/apply-lifetime-retention` | Match |
| Confusing “No, cancel!” | removed on this path | Match |

## E) Legacy styling to clear (billing tree)

- main.billing: :69 `color="#fff"`; :193 `!bg-red-800`; :224 `bg-newBgColorInner`; :377,:398
  `text-textColor`; :622 `bg-sixth rounded-[4px]`; :663 `!bg-red-500`; :708 `bg-red-500`;
  :513-519 Slider (`border-fifth`, `bg-customColor4/5`)
- faq.component: :67 `bg-sixth border-tableBorder`; :116 `text-customColor17`
- lifetime.deal: :342,:371 `bg-sixth rounded-[4px]`
- first.billing: :264 `bg-newBgColorInner`; :266,:320,:337,:346,:391 `border-newColColor`; :267
  `text-textColor`; :274,290,292 `bg-blockSeparator`; :285 `text-textItemBlur`; :287,300
  `hover:text-newTextColor`; :351,362 `bg-boxFocused text-textItemFocused`
- billing.admin.required: :22-37 newBg*/textItemBlur seti
- embedded.billing: :73,75,85 Stripe Appearance hex'leri (token değerlerinden türet, yorumla);
  :195 `#635BFF` Stripe brand (kalır); :417 `stroke="#FC69FF"`; çok sayıda `text-textColor` /
  `border-newColColor` / `bg-newBgColor(Inner)` / `bg-boxFocused`
- Token gap: `--ltCardOn/--ltCardOff` alias'ı tailwind.config.cjs'te yok → ekle
