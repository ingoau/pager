/**
 * Create or update the database schema.
 *
 *   bun run db:migrate         apply the changes
 *   bun run db:migrate --dry   print the SQL without running it
 *
 * The schema is derived from the same better-auth config the app runs, so the
 * auth tables, the extra user columns and the page log all stay in sync.
 */
import { getMigrations } from 'better-auth/db/migration';
import { createAuthOptions } from '../src/lib/server/auth-options';

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		console.error(`Missing required environment variable: ${name}`);
		process.exit(1);
	}
	return value;
}

const dryRun = process.argv.includes('--dry');

const options = createAuthOptions({
	secret: requireEnv('BETTER_AUTH_SECRET'),
	baseURL: requireEnv('BETTER_AUTH_URL'),
	databaseUrl: requireEnv('DATABASE_URL')
});

const { toBeCreated, toBeAdded, runMigrations, compileMigrations } = await getMigrations(options);

if (toBeCreated.length === 0 && toBeAdded.length === 0) {
	console.log('Database is already up to date.');
	process.exit(0);
}

for (const { table, fields } of toBeCreated) {
	console.log(`create table ${table} (${Object.keys(fields).join(', ')})`);
}
for (const { table, fields } of toBeAdded) {
	console.log(`alter table ${table} add ${Object.keys(fields).join(', ')}`);
}

if (dryRun) {
	console.log('\n--- SQL ---\n');
	console.log(await compileMigrations());
	process.exit(0);
}

await runMigrations();
console.log('\nDone.');
process.exit(0);
