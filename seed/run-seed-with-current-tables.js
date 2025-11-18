#!/usr/bin/env node

// Set environment variables with current table names
process.env.ORGANIZATIONS_TABLE = 'Athleon-development-OrganizationsOrganizationsTableECC8F9CE-J35ALRAB5IO6';
process.env.ORGANIZATION_MEMBERS_TABLE = 'Athleon-development-OrganizationsOrganizationMembersTable46313781-QUHZA4F6TI61';
process.env.ORGANIZATION_EVENTS_TABLE = 'Athleon-development-OrganizationsOrganizationEventsTable7597D5EB-1XX00AKSXEU0J';
process.env.EVENTS_TABLE = 'Athleon-development-CompetitionsEventsTable5FF68F4B-1KYM40V6NU4IB';
process.env.ATHLETES_TABLE = 'Athleon-development-AthletesAthletesTable83BA454D-2AJSCGKR07IB';
process.env.CATEGORIES_TABLE = 'Athleon-development-CategoriesCategoriesTable6441F570-LT9OMJZDY1ZG';
process.env.WODS_TABLE = 'Athleon-development-WodsWodsTableC84CB78B-ZVG9JE0QE3CK';
process.env.EXERCISES_TABLE = 'Athleon-development-ScoringExerciseLibraryTable4BA87342-XHHEA1QX03IF';
process.env.USER_POOL_ID = 'us-east-2_hVzMW4EYB';

console.log('🌱 Running seed with current table names...\n');

// Run seed-current-data.js with correct table names
require('./seed-current-data.js');
