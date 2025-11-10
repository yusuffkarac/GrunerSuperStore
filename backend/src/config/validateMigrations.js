import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

/**
 * Migration validation script
 * Checks migration files for common issues before production deployment
 */
async function validateMigrations() {
  console.log('🔍 Validating migrations before production deployment...\n');

  const issues = [];
  const warnings = [];

  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');

    // Read all migration files
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(file => file.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('⚠️  No migration files found');
      return;
    }

    console.log(`Found ${files.length} migration file(s)\n`);

    // Check 1: File naming convention
    console.log('📋 Check 1: File naming convention...');
    files.forEach(file => {
      if (!/^\d{3}_/.test(file)) {
        warnings.push(`Migration file "${file}" doesn't follow naming convention (should start with 3 digits)`);
      }
    });
    console.log('✅ File naming convention check completed\n');

    // Check 2: Idempotency (IF NOT EXISTS, IF EXISTS checks)
    console.log('📋 Check 2: Idempotency (safe for re-execution)...');
    files.forEach(file => {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const upperContent = content.toUpperCase();

      // Check for DROP statements without IF EXISTS
      const dropMatches = content.match(/DROP\s+(TABLE|COLUMN|INDEX|CONSTRAINT|TYPE|FUNCTION)\s+([^\s;]+)/gi);
      if (dropMatches) {
        dropMatches.forEach(match => {
          if (!match.includes('IF EXISTS')) {
            issues.push(`⚠️  "${file}" contains DROP without IF EXISTS: ${match.trim()}`);
          }
        });
      }

      // Check for CREATE statements without IF NOT EXISTS
      const createMatches = content.match(/CREATE\s+(TABLE|COLUMN|INDEX|CONSTRAINT|TYPE|FUNCTION)\s+([^\s(]+)/gi);
      if (createMatches) {
        createMatches.forEach(match => {
          if (!match.includes('IF NOT EXISTS') && !match.includes('OR REPLACE')) {
            // Some CREATE statements are safe (like CREATE OR REPLACE FUNCTION)
            if (!match.includes('FUNCTION') || !match.includes('OR REPLACE')) {
              warnings.push(`⚠️  "${file}" contains CREATE without IF NOT EXISTS: ${match.trim()}`);
            }
          }
        });
      }

      // Check for ALTER TABLE ADD COLUMN without IF NOT EXISTS
      const alterAddMatches = content.match(/ALTER\s+TABLE\s+[^\s]+\s+ADD\s+COLUMN\s+([^\s;]+)/gi);
      if (alterAddMatches) {
        alterAddMatches.forEach(match => {
          if (!match.includes('IF NOT EXISTS')) {
            issues.push(`⚠️  "${file}" contains ALTER TABLE ADD COLUMN without IF NOT EXISTS: ${match.trim()}`);
          }
        });
      }
    });
    console.log('✅ Idempotency check completed\n');

    // Check 3: Transaction safety
    console.log('📋 Check 3: Transaction safety...');
    files.forEach(file => {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const upperContent = content.toUpperCase();

      // Check for COMMIT/ROLLBACK (should be handled by migration runner)
      if (content.includes('COMMIT') || content.includes('ROLLBACK')) {
        warnings.push(`⚠️  "${file}" contains COMMIT/ROLLBACK statements (migration runner handles transactions)`);
      }

      // Check for DDL statements that can't be rolled back
      const ddlStatements = [
        'DROP TABLE',
        'DROP COLUMN',
        'TRUNCATE',
        'ALTER TABLE ... DROP'
      ];
      ddlStatements.forEach(ddl => {
        if (upperContent.includes(ddl)) {
          warnings.push(`⚠️  "${file}" contains potentially destructive DDL: ${ddl}`);
        }
      });
    });
    console.log('✅ Transaction safety check completed\n');

    // Check 4: Data migration safety
    console.log('📋 Check 4: Data migration safety...');
    files.forEach(file => {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const upperContent = content.toUpperCase();

      // Check for UPDATE/DELETE without WHERE clause
      if (upperContent.includes('UPDATE ') && !upperContent.includes('WHERE')) {
        issues.push(`❌ "${file}" contains UPDATE without WHERE clause (dangerous!)`);
      }

      if (upperContent.includes('DELETE FROM ') && !upperContent.includes('WHERE')) {
        issues.push(`❌ "${file}" contains DELETE without WHERE clause (dangerous!)`);
      }

      // Check for TRUNCATE
      if (upperContent.includes('TRUNCATE')) {
        warnings.push(`⚠️  "${file}" contains TRUNCATE statement (will delete all data)`);
      }
    });
    console.log('✅ Data migration safety check completed\n');

    // Check 5: Syntax validation (basic)
    console.log('📋 Check 5: SQL syntax validation...');
    files.forEach(file => {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const content = fs.readFileSync(filePath, 'utf8');

      // Basic syntax checks
      const openParens = (content.match(/\(/g) || []).length;
      const closeParens = (content.match(/\)/g) || []).length;
      if (openParens !== closeParens) {
        issues.push(`❌ "${file}" has mismatched parentheses`);
      }

      // Check for common SQL errors
      if (content.includes(';;')) {
        warnings.push(`⚠️  "${file}" contains double semicolons (may cause issues)`);
      }
    });
    console.log('✅ SQL syntax validation completed\n');

    // Summary
    console.log('=' .repeat(80));
    console.log('📊 Validation Summary');
    console.log('=' .repeat(80));

    if (issues.length === 0 && warnings.length === 0) {
      console.log('✅ All checks passed! Migrations are ready for production.\n');
    } else {
      if (issues.length > 0) {
        console.log(`\n❌ Critical Issues Found: ${issues.length}`);
        issues.forEach(issue => console.log(`   ${issue}`));
      }

      if (warnings.length > 0) {
        console.log(`\n⚠️  Warnings: ${warnings.length}`);
        warnings.forEach(warning => console.log(`   ${warning}`));
      }

      console.log('\n💡 Recommendations:');
      if (issues.length > 0) {
        console.log('   - Fix all critical issues before deploying to production');
        console.log('   - Use IF NOT EXISTS / IF EXISTS for idempotent migrations');
        console.log('   - Always include WHERE clauses in UPDATE/DELETE statements');
      }
      if (warnings.length > 0) {
        console.log('   - Review warnings and ensure they are intentional');
        console.log('   - Consider making migrations more idempotent');
      }
      console.log('');
    }

    // Exit with error code if critical issues found
    if (issues.length > 0) {
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run validation
validateMigrations();

