// Configuration Prism.js personnalisée
// Désactive la coloration automatique pour éviter les faux positifs
Prism.manual = true;

// Désactive la coloration automatique sur les éléments sans classe de langage
Prism.hooks.add('before-highlight', function(env) {
  if (!env.language) {
    env.language = 'text';
  }
});

// Configuration pour ne colorer que les blocs de code avec langage spécifié
Prism.hooks.add('before-sanity-check', function(env) {
  if (!env.element.classList.contains('language-markdown') && 
      !env.element.classList.contains('language-text')) {
    env.language = 'text';
  }
});
