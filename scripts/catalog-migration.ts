import { writeFileSync } from 'node:fs';
import { catalog } from '../apps/mobile/src/data/catalog';
const quote = (text: string) => `'${text.replaceAll("'", "''")}'`;
const values = catalog.map(e => `(${quote(e.id)}, ${quote(e.name)}, ${quote(e.equipment)}, ARRAY[${e.muscles.map(quote).join(', ')}], ${quote(e.pattern)}, ${quote(e.instructions)})`).join(',\n');
// Run only when creating this initial seed migration. Later catalog edits require a new migration.
writeFileSync('supabase/migrations/202610090003_catalog.sql', `-- Original text catalog; no scraped assets.\nbegin;\ninsert into public.exercises (id, name, equipment, muscle_groups, movement_pattern, instructions) values\n${values};\ncommit;\n`);
