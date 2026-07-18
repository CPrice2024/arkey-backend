const locales = require("../locales");

function t(language = "en") {
    return locales[language] || locales.en;
}

module.exports = t;