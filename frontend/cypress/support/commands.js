// Custom commands for Cypress

// Login command
Cypress.Commands.add('login', (email, password) => {
  cy.visit('/login');
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();
});

// Accessibility testing
import 'cypress-axe';

Cypress.Commands.add('injectAxe', () => {
  cy.window({ log: false }).then((window) => {
    const script = window.document.createElement('script');
    script.src = 'https://unpkg.com/axe-core@4.7.0/axe.min.js';
    window.document.head.appendChild(script);
  });
});

Cypress.Commands.add('checkA11y', (context, options) => {
  cy.window({ log: false }).then((win) => {
    if (win.axe) {
      return cy.wrap(win.axe.run(context || win.document, options || {})).then((results) => {
        if (results.violations.length) {
          cy.task('log', results.violations);
          throw new Error(`${results.violations.length} accessibility violation(s) detected`);
        }
      });
    }
  });
});
