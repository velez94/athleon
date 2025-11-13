describe('Landing Page', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should load the landing page', () => {
    cy.contains('Athleon').should('be.visible');
  });

  it('should have accessible navigation', () => {
    cy.get('nav[aria-label="Main navigation"]').should('exist');
    cy.get('a[href="/events"]').should('be.visible');
    cy.get('a[href="/wods"]').should('be.visible');
    cy.get('a[href="/exercises"]').should('be.visible');
  });

  it('should navigate to events page', () => {
    cy.get('a[href="/events"]').click();
    cy.url().should('include', '/events');
  });

  it('should open mobile menu on small screens', () => {
    cy.viewport('iphone-x');
    cy.get('[aria-label*="Open navigation menu"]').click();
    cy.get('#mobile-navigation').should('have.class', 'nav-links-open');
  });

  it('should close mobile menu on escape key', () => {
    cy.viewport('iphone-x');
    cy.get('[aria-label*="Open navigation menu"]').click();
    cy.get('body').type('{esc}');
    cy.get('#mobile-navigation').should('not.have.class', 'nav-links-open');
  });

  it('should have proper heading hierarchy', () => {
    cy.get('h1').should('exist');
    cy.get('h2').should('exist');
  });

  it('should have no accessibility violations', () => {
    cy.injectAxe();
    cy.checkA11y();
  });
});
