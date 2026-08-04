# Fidelity audit — AI Copilot (/agents) (2026-08-05)

Source: side-by-side read of `design/handoff/design/PostQueen App v2.dc.html` (`page:'agent'`,
markup 1520–1654 + channels panel 1141–1186; vals 5084–5089, 7488–7501, 7603–7664) against
`pr14/live-matrix`. **35+ deltas.** Not: prototipte `aiagents` FARKLI bir sayfa (Connections);
agent sayfasının anahtarı `agent`.

## A) Prototype inventory

- Topbar: "AI Copilot" 15.5/600 Jakarta + subtitle 11.5 soft (zaten eşleşiyor).
- **Channels panel = paylaşılan chrome sidebar'ı** (`showChannelsPanel` agent'ı içerir, `:5224`),
  260px / 100px collapsed, başlık "Select channels" (`:6343`).
  - Header `:1143-1151`: 12px UPPERCASE 600 .06em muted + kanal **sayacı** 11px soft .75;
    border-bottom hairline; collapse 26×26 r7 transparent, panel-collapse glifi, hover --hover.
  - `:1153-1158` **"Add Channel"** butonu h36 r9 `--settings`.
  - Rows `:1161-1181`: `padding:7px 6px 7px 9px` r-sm; 3px sol brand seçim çubuğu; 32×32 avatar
    r9 initial + 17px platform rozeti ring; iki satır: isim 14px + meta 12px; 3-nokta menü.
  - Agent-sayfası satır durumları `:5084-5089`: seçili → opacity 1, `bg:var(--brandSoft)`, brand
    sol çubuk, **16px mor tik rozeti sol-üstte**; seçili değil → opacity .6, transparent.
- Body `:1520-1654`: root `bg:var(--inner)` 3 kolon.
  - `:1522-1549` **AI-lock overlay** (trial gate): scrim + blur, 440px kart r20, 52px kilit tile
    brandSoft, 21px "AI Copilot unlocks after your trial", perk listesi, parlayan brand CTA +
    ghost buton. (Repo'da gate yok — davranış eklemesi, owner'a raise edilmişti X-lock'ta; burada
    sadece görsel yüzeyi hazırla, gate işlevi ayrıca değerlendirilir → log'a not.)
  - `:1550` chat kolonu flex:1 **border-right hairline**; `:1551` mesaj scroller `padding:24px;
    gap:16px; max-width:840px; margin:0 auto`.
  - `:1552-1568` **boş-durum hero**: ortalı `padding:56px 0 30px`; 54px sparkle tile r16
    brandSoft/focused; H 24px/600/-.02em **"What are we posting today?"**; sub 14.5 muted; tek
    öneri kartı "Prefer your own AI tool?" (`--pop`, inset ring, r14, 30px ikon tile, chevron,
    hover brand ring). `chatSuggestions` (`:7637-7642`) template'te RENDER EDİLMİYOR — port etme.
  - Mesajlar `:1569-1574`, `:7488-7501`: asistan sol, max-w 100%, **26×26 "PQ" avatar** r8
    brandSoft/focused; gövde transparent, r0, `padding:10px 0 10px 2px`, 13.5px/1.65. Kullanıcı
    sağ, max-w **78%**, avatarsız, `bg:var(--brand)` #fff, `padding:10px 13px`,
    `border-radius:14px 14px 5px 14px`. **Mesaj altı aksiyon ikonu yok.**
  - `:1575-1588` plan/draft kartı: r10 `--tableHeader` inset ring, platform ikonlu satırlar +
    mono zaman, "Open the composer" brand butonu.
  - `:1590-1603` **"Posting to" çip satırı**: etiket 11.5 soft + kanal pill'leri h26 r999
    `--settings`, 18px renkli initial + platform rozeti.
  - `:1604` **composer çerçevesi**: r14 (r-lg), **`bg:var(--pop)`**, `inset 0 0 0 1px
    var(--border), var(--e1)`, `padding:11px 12px 9px`, gap 7; 840px merkez kolonda
    `padding:0 24px 20px`.
  - `:1605-1612` çerçeve içi medya küçük resimleri 58×58 r9 + kırmızı 17px çarpı.
  - `:1613` textarea: transparent, bordersız, min-h 52 / max-h 180, 14px/1.6, placeholder
    "Ask Copilot to draft, schedule or generate…".
  - `:1614-1629` çerçeve İÇİ toolbar: 4 ghost buton h30 r8 transparent soft 12px/600 — Insert
    media / Generate image / Generate video / Design media (image+video hover brandSoft/focused)
    — boşluk — **send 32×32 r10 brand beyaz ok**, boşken opacity .4.
  - `:1634-1652` sağ **"Chats" rail**: 232px / **56px collapsed**, `bg:var(--inner)`,
    border-left hairline, padding 16/12 gap 9. "CHATS" 10.5/600 uppercase .07em soft + pin
    toggle. **"New chat"** h34 r-sm brand 13px/600 artı glifi (collapse'ta ikon-only). Thread
    satırları `padding:7px 9px` r-sm 12.5px muted, aktif `bg:var(--navOn)` + text.

## C) Delta checklist

Chat/mesajlar:
- [ ] 1 boş-durum hero (sparkle tile + "What are we posting today?" + sub)
- [ ] 2 5-paragraf `labels.initial` selamlaması kalkar (owner kararı 2; log'a not — agent copy
      değişikliği D maddesindeki eski soruyu kapatır)
- [ ] 3 "Prefer your own AI tool?" MCP öneri kartı
- [ ] 4 SDK mesaj aksiyonları (regenerate/copy/thumbs) — kalır ama sessiz ghost stile çekilir
      (kapasite korunur; log'a not)
- [ ] 5 26×26 "PQ" asistan avatarı
- [ ] 6 kullanıcı balonu brand+#fff (repo: #ededf0 çünkü --copilot-kit-primary-color =
      --new-btn-text; agent.chat:64-65)
- [ ] 7 balon şekli 14/14/5/14 pad 10/13 max-w 78%; `min-w-[300px]` kalkar (agent.chat:172)
- [ ] 8 mesaj tipografisi 13.5/1.65
- [ ] 9 mesaj kolonu max-w 840px merkez pad 24 gap 16
- [ ] 10 kolon hairline'ları (chat border-right, rail border-left)
- [ ] 11 plan/draft kartı ("Open the composer") — davranış bağlamı: ajan cevabı formatına bağlı;
      görsel bileşen hazırlanır, tetiği mevcut cevap akışına bağlanabiliyorsa bağlanır, yoksa
      log'a raise
- [ ] 12 AI-lock overlay görseli — gate işlevi owner'a raise (davranış); yüzey hazır olur

Composer:
- [ ] 13 composer --pop kartı r14 inset+e1 (SDK #2c2c2c pill yerine)
- [ ] 14 840px merkez
- [ ] 15 placeholder "Ask Copilot to draft, schedule or generate…" (i18n anahtarıyla)
- [ ] 16 send 32×32 r10 brand dolu, boşken .4
- [ ] 17 toolbar ghost butonlar h30 r8 soft 12/600 (bg-newColColor pill'ler yerine;
      media.component:980,993, ai.image:150)
- [ ] 18 toolbar çerçevenin İÇİNE (MediaPortal üst şeridi + rm-bg hack'i kalkar)
- [ ] 19 Generate image/video birinci sınıf butonlar (gate: tier.ai aynen korunur — buton görünümü
      eşit ağırlıkta, gate render'ı değiştirmez)
- [ ] 20 "Posting to" çip satırı
- [ ] 21 58×58 ek küçük resimleri + kırmızı çarpı ("Attachments" etiketi kalkar)
- [ ] 22 "Powered by CopilotKit" hook'u kalkar (agent.input:69-71)

Sol kanal kolonu:
- [ ] 23 panel başlığı 12px UPPERCASE + sayaç + hairline (20px h2 yerine)
- [ ] 24 collapse 26×26 transparent panel glifi
- [ ] 25 "Add Channel" butonu (mevcut useAddProvider hook'u ile — yeni akış yok)
- [ ] 26 seçili-değil opacity .2 → .6
- [ ] 27 seçili durum: brandSoft zemin + 3px brand çubuk + 16px tik rozeti
- [ ] 28 avatar 32×32 r9 + 17px rozet --inner ring
- [ ] 29 meta ikinci satır + 3-nokta menü (menü mevcut channel menüsünü açar — calendar
      kolonundaki menu.tsx yeniden kullanılır)
- [ ] 30 satır kutusu padding+radius+brand hover tint

Sağ Chats rail:
- [ ] 31 232px / 56px collapse + pin
- [ ] 32 "CHATS" etiketi + pin butonu
- [ ] 33 "New chat" h34 r-sm 13/600 (h44 16px yerine)
- [ ] 34 thread satırları 12.5 muted, aktif --navOn
- [ ] 35 rail padding 16/12 gap 9

Zaten eşleşen: topbar başlık/alt başlık (36); chatSuggestions çipleri prototipte render edilmiyor
— PORT ETME (37).

## D) Legacy to clear (agents tree)

agent.tsx: 120,302,383 bg-newBgColorInner; 128,387 scrollbar-thumb-fifth; 143 text-btnText
bg-btnSimple; 170 hover:bg-boxHover; 182 bg-red-500; 185 bg-primary/60; 201 border-fifth; 391
text-white bg-btnPrimary; 403 stroke="white"; 418-419 bg-newBgColor.
agent.chat.tsx: 64-65 CopilotKit değişkenleri --new-* token'lara bağlı; 68 bg-newBgColorInner;
155,158 injected HTML border-newBgColorInner.
media.component.tsx:971-1013 + ai.image.tsx:150: bg-newColColor pill'ler (composer toolbar).
global.scss: 809-836 CopilotKit override'ları yeniden yazılır; 414-453 ölü yorumlu blok silinir.
SDK devralınan hex'ler: #2c2c2c, rgb(45,45,45), rgb(28,28,28), #808080 — hepsi
--copilot-kit-* değişkenleri token'lara bağlanarak ezilir.
