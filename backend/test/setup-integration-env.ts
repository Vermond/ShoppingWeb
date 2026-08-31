import { validateIntegrationDatabaseEnvironment } from './integration/integration-database';

process.env.NODE_ENV = 'test';
validateIntegrationDatabaseEnvironment();
