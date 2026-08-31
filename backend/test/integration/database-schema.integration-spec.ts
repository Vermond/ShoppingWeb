import {
  assertRequiredSchema,
  createIntegrationDatabase,
  type IntegrationDatabase,
} from './integration-database';

describe('Database schema integration', () => {
  let database: IntegrationDatabase | undefined;

  beforeAll(async () => {
    database = createIntegrationDatabase();
    await database.query('SELECT 1');
  });

  afterAll(async () => {
    await database?.close();
  });

  it('contains the application schemas and tables used by the backend', async () => {
    await expect(assertRequiredSchema(database!)).resolves.toBeUndefined();
  });

  it('contains the columns required by the current API contracts', async () => {
    const result = await database!.query<{
      table_schema: string;
      table_name: string;
      column_name: string;
    }>(
      `
        SELECT table_schema, table_name, column_name
        FROM information_schema.columns
        WHERE (table_schema, table_name, column_name) IN (
          ('auth', 'users', 'role'),
          ('auth', 'users', 'status'),
          ('auth', 'users', 'email_verified'),
          ('auth', 'refresh_tokens', 'session_id'),
          ('catalog', 'products', 'max_order_quantity'),
          ('sales', 'orders', 'subtotal'),
          ('sales', 'orders', 'shipping_fee'),
          ('sales', 'orders', 'discount_amount'),
          ('sales', 'shipping_policy', 'is_active'),
          ('sales', 'order_status_history', 'changed_by')
        )
      `,
    );
    const actual = new Set(
      result.rows.map(
        (row) => `${row.table_schema}.${row.table_name}.${row.column_name}`,
      ),
    );
    const required = [
      'auth.users.role',
      'auth.users.status',
      'auth.users.email_verified',
      'auth.refresh_tokens.session_id',
      'catalog.products.max_order_quantity',
      'sales.orders.subtotal',
      'sales.orders.shipping_fee',
      'sales.orders.discount_amount',
      'sales.shipping_policy.is_active',
      'sales.order_status_history.changed_by',
    ];

    expect(required.filter((column) => !actual.has(column))).toEqual([]);
  });

  it('has applied every checked-in schema migration', async () => {
    const result = await database!.query<{ version: string }>(
      'SELECT version FROM public.schema_migrations ORDER BY version ASC',
    );
    const appliedVersions = result.rows.map((row) => row.version);

    expect(appliedVersions).toEqual(
      expect.arrayContaining([
        '000_initial_schema.sql',
        '001_products_pagination_index.sql',
        '002_refresh_tokens_session.sql',
        '003_order_status_history.sql',
        '004_admin_products_indexes.sql',
        '005_admin_customers_indexes.sql',
        '006_admin_reports_indexes.sql',
        '007_consistency_indexes.sql',
      ]),
    );
  });
});
