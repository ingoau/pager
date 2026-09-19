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

const {
	toBeCreated,
	toBeAdded,
	toBeAddedIndexes,
	unsafeChanges,
	schemaProblems,
	runMigrations,
	compileMigrations
	// Report unsafe changes rather than throwing, so this script can print the
	// whole plan before deciding what to do with it.
} = await getMigrations(options, { throwOnUnsafe: false });

for (const problem of schemaProblems) {
	console.error(`schema problem: ${problem}`);
}

const pending =
	toBeCreated.length + toBeAdded.length + toBeAddedIndexes.length + unsafeChanges.length;

if (pending === 0) {
	console.log('Database is already up to date.');
	process.exit(schemaProblems.length > 0 ? 1 : 0);
}

for (const { table, fields } of toBeCreated) {
	console.log(`create table ${table} (${Object.keys(fields).join(', ')})`);
}
for (const { table, fields } of toBeAdded) {
	console.log(`alter table ${table} add ${Object.keys(fields).join(', ')}`);
}
for (const { table, name } of toBeAddedIndexes) {
	console.log(`create index ${name} on ${table}`);
}

if (unsafeChanges.length > 0) {
	// A required column with no default can't be backfilled on a table that
	// already has rows; better-auth refuses rather than guessing a value.
	console.error('\nRefusing to apply, these changes would need a backfill:');
	for (const change of unsafeChanges) console.error(`  ${change}`);
	console.error('\nAdd the columns by hand with a sensible default, then re-run.');
	process.exit(1);
}

if (dryRun) {
	console.log('\n--- SQL ---\n');
	console.log(await compileMigrations());
	process.exit(0);
}

await runMigrations();
console.log('\nDone.');
process.exit(0);
