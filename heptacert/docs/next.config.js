const withNextra = require("nextra")({
  theme: "nextra-theme-docs",
  themeConfig: "./theme.config.jsx",
  defaultShowCopyCode: true,
});

module.exports = withNextra({
  i18n: {
    locales: ["tr", "en"],
    defaultLocale: "tr",
  },
  reactStrictMode: true,
});
