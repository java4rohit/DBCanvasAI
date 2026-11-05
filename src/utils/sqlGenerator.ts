import type { Table, Relation, Column } from '../types/schema';

export type Dialect = 'postgresql' | 'mysql' | 'sqlite' | 'prisma' | 'dbml' | 'mermaid';

function mapPostgresType(col: Column): string {
  switch (col.type) {
    case 'UUID':
      return 'UUID';
    case 'BIGSERIAL':
      return 'BIGSERIAL';
    case 'BIGINT':
      return 'BIGINT';
    case 'SERIAL':
      return 'SERIAL';
    case 'INT':
      return 'INTEGER';
    case 'SMALLINT':
      return 'SMALLINT';
    case 'VARCHAR':
      return `VARCHAR(${col.typeArgs || '255'})`;
    case 'CHAR':
      return `CHAR(${col.typeArgs || '1'})`;
    case 'TEXT':
      return 'TEXT';
    case 'BOOLEAN':
      return 'BOOLEAN';
    case 'TIMESTAMP':
      return 'TIMESTAMPTZ';
    case 'TIMESTAMPTZ':
      return 'TIMESTAMPTZ';
    case 'DATE':
      return 'DATE';
    case 'TIME':
      return 'TIME';
    case 'DECIMAL':
      return `DECIMAL(${col.typeArgs || '10,2'})`;
    case 'NUMERIC':
      return `NUMERIC${col.typeArgs ? `(${col.typeArgs})` : ''}`;
    case 'FLOAT':
      return 'DOUBLE PRECISION';
    case 'JSONB':
      return 'JSONB';
    case 'JSON':
      return 'JSON';
    case 'ENUM':
      return 'VARCHAR(50)';
    case 'ARRAY':
      return 'TEXT[]';
    case 'BYTEA':
      return 'BYTEA';
    default:
      return 'TEXT';
  }
}

function mapMysqlType(col: Column): string {
  switch (col.type) {
    case 'UUID':
      return 'CHAR(36)';
    case 'BIGSERIAL':
    case 'BIGINT':
      return 'BIGINT';
    case 'SERIAL':
    case 'INT':
      return 'INT';
    case 'SMALLINT':
      return 'SMALLINT';
    case 'VARCHAR':
      return `VARCHAR(${col.typeArgs || '255'})`;
    case 'CHAR':
      return `CHAR(${col.typeArgs || '1'})`;
    case 'TEXT':
      return 'TEXT';
    case 'BOOLEAN':
      return 'TINYINT(1)';
    case 'TIMESTAMP':
    case 'TIMESTAMPTZ':
      return 'DATETIME';
    case 'DATE':
      return 'DATE';
    case 'TIME':
      return 'TIME';
    case 'DECIMAL':
      return `DECIMAL(${col.typeArgs || '10,2'})`;
    case 'NUMERIC':
      return `NUMERIC${col.typeArgs ? `(${col.typeArgs})` : ''}`;
    case 'FLOAT':
      return 'DOUBLE';
    case 'JSONB':
    case 'JSON':
    case 'ARRAY':
      return 'JSON';
    case 'BYTEA':
      return 'BLOB';
    case 'ENUM':
      return 'VARCHAR(50)';
    default:
      return 'TEXT';
  }
}

export function generatePostgreSql(tables: Table[], relations: Relation[]): string {
  let output = `-- ==========================================================\n`;
  output += `-- sys0 LMS Database Lab · Production PostgreSQL Schema\n`;
  output += `-- Generated on ${new Date().toISOString()}\n`;
  output += `-- Tables: ${tables.length} | Foreign Keys: ${relations.length}\n`;
  output += `-- ==========================================================\n\n`;

  output += `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n\n`;

  // Create tables
  for (const table of tables) {
    if (table.comment) {
      output += `-- ${table.comment}\n`;
    }
    output += `CREATE TABLE "${table.name}" (\n`;
    const colLines: string[] = [];

    for (const col of table.columns) {
      let line = `  "${col.name}" ${mapPostgresType(col)}`;
      if (col.isPrimaryKey) {
        line += ' PRIMARY KEY';
        if (col.type === 'UUID' && !col.defaultValue) {
          line += ' DEFAULT uuid_generate_v4()';
        }
      }
      if (!col.isNullable && !col.isPrimaryKey) {
        line += ' NOT NULL';
      }
      if (col.isUnique && !col.isPrimaryKey) {
        line += ' UNIQUE';
      }
      if (col.defaultValue && !col.isPrimaryKey) {
        line += ` DEFAULT ${col.defaultValue}`;
      }
      colLines.push(line);
    }
    for (const columns of table.uniqueTogether ?? []) {
      colLines.push(`  UNIQUE (${columns.map(name => `"${name}"`).join(', ')})`);
    }

    output += colLines.join(',\n');
    output += '\n);\n\n';
  }

  // Foreign keys
  if (relations.length > 0) {
    output += `-- ----------------------------------------------------------\n`;
    output += `-- Foreign Key Constraints & Cascades\n`;
    output += `-- ----------------------------------------------------------\n`;
    for (const rel of relations) {
      const srcTable = tables.find((t) => t.id === rel.sourceTableId);
      const tgtTable = tables.find((t) => t.id === rel.targetTableId);
      const srcCol = srcTable?.columns.find((c) => c.id === rel.sourceColumnId);
      const tgtCol = tgtTable?.columns.find((c) => c.id === rel.targetColumnId);

      if (srcTable && tgtTable && srcCol && tgtCol) {
        const fkName = `fk_${srcTable.name}_${srcCol.name}`;
        const onDel = rel.onDelete ? ` ON DELETE ${rel.onDelete}` : '';
        output += `ALTER TABLE "${srcTable.name}"\n`;
        output += `  ADD CONSTRAINT "${fkName}" FOREIGN KEY ("${srcCol.name}")\n`;
        output += `  REFERENCES "${tgtTable.name}" ("${tgtCol.name}")${onDel};\n\n`;
      }
    }
  }

  // Indexes
  output += `-- ----------------------------------------------------------\n`;
  output += `-- High-Traffic Indexes for Query Optimization\n`;
  output += `-- ----------------------------------------------------------\n`;
  let idxCount = 0;
  for (const table of tables) {
    for (const col of table.columns) {
      if (col.isIndexed && !col.isPrimaryKey && !col.isUnique) {
        idxCount++;
        output += `CREATE INDEX "idx_${table.name}_${col.name}" ON "${table.name}" ("${col.name}");\n`;
      }
    }
  }
  if (idxCount === 0) {
    output += `-- No custom non-PK indexes defined\n`;
  }

  return output;
}

export function generateMySql(tables: Table[], relations: Relation[]): string {
  let output = `-- MySQL 8.0 DDL Schema\n`;
  output += `-- Generated by sys0 DB Lab\n\n`;

  for (const table of tables) {
    output += `CREATE TABLE \`${table.name}\` (\n`;
    const lines: string[] = [];
    for (const col of table.columns) {
      let l = `  \`${col.name}\` ${mapMysqlType(col)}`;
      if (col.isPrimaryKey && (col.type === 'SERIAL' || col.type === 'BIGSERIAL')) l += ' AUTO_INCREMENT';
      if (col.isPrimaryKey) l += ' PRIMARY KEY';
      if (!col.isNullable && !col.isPrimaryKey) l += ' NOT NULL';
      if (col.isUnique && !col.isPrimaryKey) l += ' UNIQUE';
      if (col.defaultValue && !col.isPrimaryKey) l += ` DEFAULT ${col.defaultValue}`;
      lines.push(l);
    }
    for (const columns of table.uniqueTogether ?? []) {
      lines.push(`  UNIQUE (${columns.map(name => `\`${name}\``).join(', ')})`);
    }
    output += lines.join(',\n');
    output += '\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n';
  }

  for (const rel of relations) {
    const srcTable = tables.find((t) => t.id === rel.sourceTableId);
    const tgtTable = tables.find((t) => t.id === rel.targetTableId);
    const srcCol = srcTable?.columns.find((c) => c.id === rel.sourceColumnId);
    const tgtCol = tgtTable?.columns.find((c) => c.id === rel.targetColumnId);
    if (srcTable && tgtTable && srcCol && tgtCol) {
      output += `ALTER TABLE \`${srcTable.name}\` ADD CONSTRAINT \`fk_${srcTable.name}_${srcCol.name}\` FOREIGN KEY (\`${srcCol.name}\`) REFERENCES \`${tgtTable.name}\` (\`${tgtCol.name}\`);\n`;
    }
  }

  return output;
}

export function generatePrisma(tables: Table[], _relations: Relation[]): string {
  let output = `// Prisma Schema\n// datasource & generator\n`;
  output += `datasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}\n\n`;
  output += `generator client {\n  provider = "prisma-client-js"\n}\n\n`;

  for (const table of tables) {
    const modelName = table.name.charAt(0).toUpperCase() + table.name.slice(1);
    output += `model ${modelName} {\n`;
    for (const col of table.columns) {
      let prismaType = 'String';
      if (col.type === 'INT') prismaType = 'Int';
      if (col.type === 'BIGINT') prismaType = 'BigInt';
      if (col.type === 'BIGSERIAL') prismaType = 'BigInt';
      if (col.type === 'SERIAL' || col.type === 'SMALLINT') prismaType = 'Int';
      if (col.type === 'VARCHAR' || col.type === 'CHAR' || col.type === 'TEXT' || col.type === 'UUID') prismaType = 'String';
      if (col.type === 'BOOLEAN') prismaType = 'Boolean';
      if (col.type === 'TIMESTAMP') prismaType = 'DateTime';
      if (col.type === 'TIMESTAMPTZ' || col.type === 'DATE' || col.type === 'TIME') prismaType = 'DateTime';
      if (col.type === 'DECIMAL') prismaType = 'Decimal';
      if (col.type === 'NUMERIC' || col.type === 'FLOAT') prismaType = 'Decimal';
      if (col.type === 'JSONB' || col.type === 'JSON') prismaType = 'Json';
      if (col.type === 'ARRAY') prismaType = 'String[]';

      let line = `  ${col.name.padEnd(20)} ${prismaType}${col.isNullable ? '?' : ''}`;
      if (col.isPrimaryKey) {
        line += col.type === 'UUID' ? ' @id @default(uuid())' : ' @id @default(autoincrement())';
      }
      if (col.isUnique && !col.isPrimaryKey) {
        line += ' @unique';
      }
      if (col.defaultValue && !col.isPrimaryKey) {
        line += ` @default(${col.defaultValue})`;
      }
      output += `${line}\n`;
    }
    output += `\n  @@map("${table.name}")\n`;
    output += `}\n\n`;
  }

  return output;
}

export function generateDbml(tables: Table[], relations: Relation[]): string {
  let output = `// Database Markup Language (DBML)\n\n`;
  for (const table of tables) {
    output += `Table ${table.name} {\n`;
    for (const col of table.columns) {
      const settings: string[] = [];
      if (col.isPrimaryKey) settings.push('pk');
      if (col.isUnique) settings.push('unique');
      if (!col.isNullable) settings.push('not null');
      if (col.defaultValue) settings.push(`default: \`${col.defaultValue}\``);
      const setStr = settings.length ? ` [${settings.join(', ')}]` : '';
      output += `  ${col.name} ${col.type.toLowerCase()}${setStr}\n`;
    }
    output += `}\n\n`;
  }

  for (const rel of relations) {
    const srcTable = tables.find((t) => t.id === rel.sourceTableId);
    const tgtTable = tables.find((t) => t.id === rel.targetTableId);
    const srcCol = srcTable?.columns.find((c) => c.id === rel.sourceColumnId);
    const tgtCol = tgtTable?.columns.find((c) => c.id === rel.targetColumnId);
    if (srcTable && tgtTable && srcCol && tgtCol) {
      output += `Ref: ${srcTable.name}.${srcCol.name} > ${tgtTable.name}.${tgtCol.name}\n`;
    }
  }

  return output;
}

export function generateMermaid(tables: Table[], relations: Relation[]): string {
  let output = `erDiagram\n`;
  for (const table of tables) {
    output += `    ${table.name} {\n`;
    for (const col of table.columns) {
      let key = '';
      if (col.isPrimaryKey) key = 'PK';
      else if (col.isForeignKey) key = 'FK';
      output += `        ${col.type.toLowerCase()} ${col.name} ${key}\n`;
    }
    output += `    }\n`;
  }

  for (const rel of relations) {
    const srcTable = tables.find((t) => t.id === rel.sourceTableId);
    const tgtTable = tables.find((t) => t.id === rel.targetTableId);
    if (srcTable && tgtTable) {
      output += `    ${tgtTable.name} ||--o{ ${srcTable.name} : "has"\n`;
    }
  }

  return output;
}

export interface ExplainSimulationResult {
  query: string;
  targetTable: string;
  lookupColumn: string;
  hasIndex: boolean;
  scanType: 'Index Scan' | 'Sequential Scan (Full Table Scan)';
  estimatedCost: string;
  rowsExamined: string;
  executionTimeMs: number;
  verdict: 'EXCELLENT' | 'CRITICAL BOTTLENECK';
  recommendation: string;
}

export function simulateExplain(
  table: Table,
  columnName: string,
  rowCount: number = 250000
): ExplainSimulationResult {
  const col = table.columns.find((c) => c.name.toLowerCase() === columnName.toLowerCase());
  const hasIndex = col?.isIndexed || col?.isPrimaryKey || col?.isUnique || false;

  const query = `SELECT * FROM "${table.name}" WHERE "${columnName}" = 'value';`;

  if (hasIndex) {
    return {
      query,
      targetTable: table.name,
      lookupColumn: columnName,
      hasIndex: true,
      scanType: 'Index Scan',
      estimatedCost: '0.28..8.30',
      rowsExamined: '1 row',
      executionTimeMs: 0.14,
      verdict: 'EXCELLENT',
      recommendation:
        'B-Tree Index hit! Query retrieves data with logarithmic complexity O(log N) without reading irrelevant table blocks from disk.',
    };
  } else {
    return {
      query,
      targetTable: table.name,
      lookupColumn: columnName,
      hasIndex: false,
      scanType: 'Sequential Scan (Full Table Scan)',
      estimatedCost: '0.00..45280.00',
      rowsExamined: `${rowCount.toLocaleString()} rows`,
      executionTimeMs: 142.8,
      verdict: 'CRITICAL BOTTLENECK',
      recommendation: `WARNING: Sequential scan across ${rowCount.toLocaleString()} rows! Under high LMS student concurrency, this causes massive disk I/O spikes and pool starvation. Add an INDEX on "${table.name}.${columnName}".`,
    };
  }
}
