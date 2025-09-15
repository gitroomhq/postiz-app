const { join } = require('path');
module.exports = {
  content: ['./src/**/*.{ts,tsx,html}', '../../libraries/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
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
        menuDots: 'var(--new-menu-dots)',
        menuDotsHover: 'var(--new-menu-hover)',
        bigStrip: 'var(--new-big-strips)',
        popup: 'var(--popup-color)',
      },
      gridTemplateColumns: {
        13: 'repeat(13, minmax(0, 1fr));',
      },
      backgroundImage: {
        loginBox: 'url(/auth/login-box.png)',
        loginBg: 'url(/auth/bg-login.png)',
      },
      fontFamily: {
        sans: ['Helvetica Neue'],
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
      },
      boxShadow: {
        yellow: '0 0 60px 20px #6b6237',
        yellowToast: '0px 0px 50px rgba(252, 186, 3, 0.3)',
        greenToast: '0px 0px 50px rgba(60, 124, 90, 0.3)',
        menu: 'var(--menu-shadow)',
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
