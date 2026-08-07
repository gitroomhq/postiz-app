const { join } = require('path');
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx,html}', '../../libraries/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        // --- redesign token layer -------------------------------------------
        // Aliases for the tokens declared at the top of src/app/colors.scss.
        //
        // Every one is `pq`-prefixed. Two reasons: the design's own names would
        // shadow Tailwind's built-in palettes — `amber` alone is used as
        // `amber-500` / `amber-600` in six places, and overriding it makes
        // those classes resolve to nothing — and the prefix makes it trivial to
        // find what still has to move when the old vocabulary is retired.
        //
        // The `newBgColor` / `customColorN` aliases below are that old
        // vocabulary. Both resolve to real variables until each screen is
        // migrated off them.
        pqBg: 'var(--bg)',
        pqInner: 'var(--inner)',
        pqRail: 'var(--rail)',
        pqRailLine: 'var(--railLine)',
        pqPop: 'var(--pop)',
        pqThird: 'var(--third)',
        pqSettings: 'var(--settings)',
        pqColColor: 'var(--colColor)',
        pqBtnSimple: 'var(--btnSimple)',
        pqLine: 'var(--line)',
        pqBorder: 'var(--border)',
        pqBlockSeparator: 'var(--blockSeparator)',
        pqText: 'var(--text)',
        pqMuted: 'var(--muted)',
        pqSoft: 'var(--soft)',
        pqBrand: 'var(--brand)',
        pqBrandHover: 'var(--brandHover)',
        pqBrandSoft: 'var(--brandSoft)',
        pqOnBrand: 'var(--onBrand)',
        pqBrandFaint: 'var(--brandFaint)',
        pqPink: 'var(--pink)',
        pqFocused: 'var(--focused)',
        pqBoxFocused: 'var(--boxFocused)',
        pqHover: 'var(--hover)',
        pqNavOn: 'var(--navOn)',
        pqNavActive: 'var(--navActive)',
        pqNavRowHover: 'var(--navRowHover)',
        pqDropHint: 'var(--dropHint)',
        pqHatch: 'var(--hatch)',
        pqUpgradeFg: 'var(--upgradeFg)',
        pqUpgradeFgHover: 'var(--upgradeFgHover)',
        pqUpgradeHover: 'var(--upgradeHover)',
        pqTableHeader: 'var(--tableHeader)',
        pqTableBorder: 'var(--tableBorder)',
        pqTableText: 'var(--tableText)',
        pqTableTextFocused: 'var(--tableTextFocused)',
        pqMenuDots: 'var(--menuDots)',
        pqPopup: 'var(--popup)',
        pqAiLockScrim: 'var(--aiLockScrim)',
        pqTourScrim: 'var(--tourScrim)',
        pqMediaScrim: 'var(--mediaScrim)',
        pqOk: 'var(--ok)',
        pqOkSoft: 'var(--okSoft)',
        pqOkLine: 'var(--okLine)',
        pqOkCard: 'var(--okCard)',
        pqOkCardRing: 'var(--okCardRing)',
        pqWarn: 'var(--warn)',
        pqWarnSoft: 'var(--warnSoft)',
        pqWarnLine: 'var(--warnLine)',
        pqDanger: 'var(--danger)',
        pqDangerSoft: 'var(--dangerSoft)',
        pqDangerLine: 'var(--dangerLine)',
        pqDangerChip: 'var(--dangerChip)',
        pqAmber: 'var(--amber)',
        pqAmberSoft: 'var(--amberSoft)',
        pqAmberLine: 'var(--amberLine)',
        pqStreak: 'var(--streak)',
        pqStreakSoft: 'var(--streakSoft)',
        pqAvatarBg: 'var(--avatarBg)',
        pqBadgeRing: 'var(--badgeRing)',
        // Lifetime / founding-member surfaces.
        pqLtCardOn: 'var(--ltCardOn)',
        pqLtCardOff: 'var(--ltCardOff)',
        pqLtSolid: 'var(--ltSolid)',
        pqLtSolidFg: 'var(--ltSolidFg)',
        pqLtAmber: 'var(--ltAmber)',
        pqLtText: 'var(--ltText)',
        pqLtDim: 'var(--ltDim)',
        pqLtDimmer: 'var(--ltDimmer)',
        pqLtLabel: 'var(--ltLabel)',
        pqLtLine: 'var(--ltLine)',
        pqLtLine2: 'var(--ltLine2)',
        pqLtRowBg: 'var(--ltRowBg)',
        pqLtChipBg: 'var(--ltChipBg)',
        pqLtSoft: 'var(--ltSoft)',
        pqLtOutline: 'var(--ltOutline)',
        pqLtTick: 'var(--ltTick)',
        pqLtTickFg: 'var(--ltTickFg)',
        // --- end redesign token layer ---------------------------------------

        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        textColor: 'var(--new-btn-text)',
        third: 'var(--color-third)',
        forth: 'var(--color-forth)',
        fifth: 'var(--color-fifth)',
        sixth: 'var(--color-sixth)',
        seventh: 'var(--color-seventh)',
        gray: 'var(--color-gray)',
        input: 'var(--color-input)',
        inputText: 'var(--color-input-text)',
        tableBorder: 'var(--color-table-border)',
        customColor1: 'var(--color-custom1)',
        customColor2: 'var(--color-custom2)',
        customColor3: 'var(--color-custom3)',
        customColor4: 'var(--color-custom4)',
        customColor5: 'var(--color-custom5)',
        customColor6: 'var(--color-custom6)',
        customColor7: 'var(--color-custom7)',
        customColor8: 'var(--color-custom8)',
        customColor9: 'var(--color-custom9)',
        customColor10: 'var(--color-custom10)',
        customColor11: 'var(--color-custom11)',
        customColor12: 'var(--color-custom12)',
        customColor13: 'var(--color-custom13)',
        customColor14: 'var(--color-custom14)',
        customColor15: 'var(--color-custom15)',
        customColor16: 'var(--color-custom16)',
        customColor17: 'var(--color-custom17)',
        customColor18: 'var(--color-custom18)',
        customColor19: 'var(--color-custom19)',
        customColor20: 'var(--color-custom20)',
        customColor21: 'var(--color-custom21)',
        customColor22: 'var(--color-custom22)',
        customColor23: 'var(--color-custom23)',
        customColor24: 'var(--color-custom24)',
        customColor25: 'var(--color-custom25)',
        customColor26: 'var(--color-custom26)',
        customColor27: 'var(--color-custom27)',
        customColor28: 'var(--color-custom28)',
        customColor29: 'var(--color-custom29)',
        customColor30: 'var(--color-custom30)',
        customColor31: 'var(--color-custom31)',
        customColor32: 'var(--color-custom32)',
        customColor33: 'var(--color-custom33)',
        customColor34: 'var(--color-custom34)',
        customColor35: 'var(--color-custom35)',
        customColor36: 'var(--color-custom36)',
        customColor37: 'var(--color-custom37)',
        customColor38: 'var(--color-custom38)',
        customColor39: 'var(--color-custom39)',
        customColor40: 'var(--color-custom40)',
        customColor41: 'var(--color-custom41)',
        customColor42: 'var(--color-custom42)',
        customColor43: 'var(--color-custom43)',
        customColor44: 'var(--color-custom44)',
        customColor45: 'var(--color-custom45)',
        customColor46: 'var(--color-custom46)',
        customColor47: 'var(--color-custom47)',
        customColor48: 'var(--color-custom48)',
        customColor49: 'var(--color-custom49)',
        customColor50: 'var(--color-custom50)',
        customColor51: 'var(--color-custom51)',
        customColor52: 'var(--color-custom52)',
        customColor53: 'var(--color-custom53)',
        customColor54: 'var(--color-custom54)',
        customColor55: 'var(--color-custom55)',
        modalCustom: 'var(--color-modalCustom)',

        newBgColor: 'var(--new-bgColor)',
        newBackdrop: 'var(--new-back-drop)',
        newSep: 'var(--new-sep)',
        newBorder: 'var(--new-border)',
        newBgColorInner: 'var(--new-bgColorInner)',
        newBgLineColor: 'var(--new-bgLineColor)',
        textItemFocused: 'var(--new-textItemFocused)',
        textItemBlur: 'var(--new-textItemBlur)',
        boxFocused: 'var(--new-boxFocused)',
        newTextColor: 'rgb(var(--new-textColor) / <alpha-value>)',
        blockSeparator: 'var(--new-blockSeparator)',
        btnSimple: 'var(--new-btn-simple)',
        btnText: 'var(--new-btn-text)',
        btnPrimary: 'var(--new-btn-primary)',
        ai: 'var(--new-ai-btn)',
        boxHover: 'var(--new-box-hover)',
        newTableBorder: 'var(--new-table-border)',
        newTableHeader: 'var(--new-table-header)',
        newTableText: 'var(--new-table-text)',
        newTableTextFocused: 'var(--new-table-text-focused)',
        newColColor: 'var(--new-col-color)',
        newSettings: 'var(--new-settings)',
        menuDots: 'var(--new-menu-dots)',
        menuDotsHover: 'var(--new-menu-hover)',
        bigStrip: 'var(--new-big-strips)',
        popup: 'var(--popup-color)',
        bgLinkedin: 'var(--linkedin-bg)',
        bgFacebook: 'var(--facebook-bg)',
        bgInstagram: 'var(--instagram-bg)',
        bgTiktokItem: 'var(--tiktok-item-bg)',
        bgTiktokItemIcon: 'var(--tiktok-item-icon-bg)',
        bgYoutube: 'var(--youtube-bg)',
        bgCommentFacebook: 'var(--facebook-bg-comment)',
        textLinkedin: 'var(--linkedin-text)',
        borderPreview: 'var(--border-preview)',
        borderLinkedin: 'var(--linkedin-border)',
        youtubeButton: 'var(--youtube-button)',
        youtubeBgAction: 'var(--youtube-action-color)',
        youtubeSvg: 'var(--youtube-svg-border)',
      },
      gridTemplateColumns: {
        13: 'repeat(13, minmax(0, 1fr));',
      },
      backgroundImage: {
        loginBox: 'url(/auth/login-box.png)',
        loginBg: 'url(/auth/bg-login.png)',
      },
      // Published as CSS variables by src/app/fonts.ts on <body>. This used to
      // read ['Helvetica Neue'], contradicting the font actually applied to
      // <body> — harmless only because nothing in the app used `font-sans`.
      fontFamily: {
        sans: [
          'var(--font-dm-sans)',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
        display: [
          'var(--font-jakarta)',
          'var(--font-dm-sans)',
          'ui-sans-serif',
          'sans-serif',
        ],
        // For values the reader copies rather than reads: API keys, MCP config,
        // channel IDs, CLI commands.
        mono: [
          'var(--font-jetbrains-mono)',
          'ui-monospace',
          'SFMono-Regular',
          'monospace',
        ],
      },
      // The design's radius scale. Modals are 24px and pills 999px, both of
      // which Tailwind already covers as `rounded-3xl` / `rounded-full`.
      borderRadius: {
        pqSm: 'var(--r-sm)',
        pqMd: 'var(--r-md)',
        pqLg: 'var(--r-lg)',
        pqXl: 'var(--r-xl)',
      },
      animation: {
        fade: 'fadeOut 0.5s ease-in-out',
        normalFadeIn: 'normalFadeIn 0.5s ease-in-out',
        fadeIn: 'normalFadeIn 0.2s ease-in-out forwards',
        normalFadeOut: 'normalFadeOut 0.5s linear 5s forwards',
        overflow: 'overFlow 0.5s ease-in-out forwards',
        overflowReverse: 'overFlowReverse 0.5s ease-in-out forwards',
        fadeDown: 'fadeDown 4s ease-in-out forwards',
        normalFadeDown: 'normalFadeDown 0.5s ease-in-out forwards',
        newMessages: 'newMessages 1s ease-in-out 4s forwards',
        marqueeUp: 'marquee-up 100s linear infinite',
        marqueeDown: 'marquee-down 100s linear infinite',
        // The redesign's motion. Keyframes live in src/app/global.scss rather
        // than in the `keyframes` block below, because several of them use
        // `var(--brand)` and reference the token layer directly.
        //
        // Transitions, for reference: 120ms ease for hover and colour, 180ms
        // cubic-bezier(.2,.8,.2,1) for anything that moves or resizes.
        pqSpin: 'pqspin 1s linear infinite',
        pqPop: 'pqpop 0.15s ease-out',
        pqFadeDown: 'pqfadeDown 0.24s cubic-bezier(.2,.8,.2,1)',
        pqIn: 'pqin 0.38s cubic-bezier(.2,.8,.3,1) both',
        pqTip: 'pqtip 0.12s ease-out',
        // Indefinite loops. Anything using one of these must also carry the
        // `pq-loop` class, which is what prefers-reduced-motion switches off —
        // see the note in global.scss.
        pqUnlim: 'pqunlim 1.9s ease-in-out infinite',
        pqTick: 'pqtick 1.9s ease-in-out infinite',
        pqRing: 'pqring 1.9s ease-in-out infinite',
        pqGlow: 'pqglow 5.5s ease-in-out infinite',
        pqBtnGlow: 'pqbtnglow 2.6s ease-in-out infinite',
        pqBtnBloom: 'pqbtnbloom 2.6s ease-in-out infinite',
        pqBtnSheen: 'pqbtnsheen 2.9s ease-in-out infinite',
      },
      boxShadow: {
        yellow: '0 0 60px 20px #6b6237',
        yellowToast: '0px 0px 50px rgba(252, 186, 3, 0.3)',
        greenToast: '0px 0px 50px rgba(60, 124, 90, 0.3)',
        menu: 'var(--menu-shadow)',
        previewShadow: 'var(--preview-box-shadow)',
        // The design's elevation scale: e1 at rest, e2 on hover and dropdowns,
        // e3 on modals. `pq` is the generic drop shadow.
        pqE1: 'var(--e1)',
        pqE2: 'var(--e2)',
        pqE3: 'var(--e3)',
        pq: 'var(--shadow)',
        // Elevation plus a hairline drawn as an inset ring rather than a
        // border, so the surface keeps its exact size. The toast is the one
        // place the design combines them.
        pqToast: 'var(--e3), inset 0 0 0 1px var(--border)',
        // The lift under the calendar's current-day number.
        pqToday: 'var(--todayGlow)',
      },
      dropShadow: {
        glow: [
          '0 0 6px rgba(250,204,21,0.6)',
          '0 0 12px rgba(250,204,21,0.5)',
          '0 0 24px rgba(250,204,21,0.4)',
        ],
      },
      // that is actual animation
      keyframes: (theme) => ({
        fadeOut: {
          '0%': {
            opacity: 0,
            transform: 'translateY(30px)',
          },
          '100%': {
            opacity: 1,
            transform: 'translateY(0)',
          },
        },
        normalFadeOut: {
          '0%': {
            opacity: 1,
          },
          '100%': {
            opacity: 0,
          },
        },
        normalFadeIn: {
          '0%': {
            opacity: 0,
          },
          '100%': {
            opacity: 1,
          },
        },
        overFlow: {
          '0%': {
            overflow: 'hidden',
          },
          '99%': {
            overflow: 'hidden',
          },
          '100%': {
            overflow: 'visible',
          },
        },
        overFlowReverse: {
          '0%': {
            overflow: 'visible',
          },
          '99%': {
            overflow: 'visible',
          },
          '100%': {
            overflow: 'hidden',
          },
        },
        fadeDown: {
          '0%': {
            opacity: 0,
            marginTop: -30,
          },
          '10%': {
            opacity: 1,
            marginTop: 0,
          },
          '85%': {
            opacity: 1,
            marginTop: 0,
          },
          '90%': {
            opacity: 1,
            marginTop: 10,
          },
          '100%': {
            opacity: 0,
            marginTop: -30,
          },
        },
        normalFadeDown: {
          '0%': {
            opacity: 0,
            transform: 'translateY(-30px)',
          },
          '100%': {
            opacity: 1,
            transform: 'translateY(0)',
          },
        },
        newMessages: {
          '0%': {
            backgroundColor: 'var(--color-seventh)',
            fontWeight: 'bold',
          },
          '99%': {
            backgroundColor: 'var(--color-third)',
            fontWeight: 'bold',
          },
          '100%': {
            backgroundColor: 'var(--color-third)',
            fontWeight: 'normal',
          },
        },
      }),
      screens: {
        mobile: {
          raw: '(max-width: 1025px)',
        },
        tablet: {
          raw: '(max-width: 1300px)',
        },
        iconBreak: {
          raw: '(max-width: 1560px)',
        },
        maxMedia: {
          raw: '(max-width: 1400px)',
        },
        minCustom: {
          raw: '(min-height: 800px)',
        },
        custom: {
          raw: '(max-height: 800px)',
        },
        xs: {
          max: '401px',
        },
      },
    },
  },
  plugins: [
    require('tailwind-scrollbar'),
    require('tailwindcss-rtl'),
    function ({ addVariant }) {
      addVariant('child', '& > *');
      addVariant('child-hover', '& > *:hover');
    },
  ],
};
