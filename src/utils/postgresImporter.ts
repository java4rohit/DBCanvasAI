import type { Column, DataType, Relation, Table, TableColor } from '../types/schema';

interface ForeignKeyDefinition {
  tableName: string;
  columnNames: string[];
  targetTableName: string;
  targetColumnNames: string[];
  onDelete?: Relation['onDelete'];
}

interface ParsedTable {
  table: Table;
  foreignKeys: ForeignKeyDefinition[];
  relations: Relation[];
}

const TABLE_COLORS: TableColor[] = ['blue', 'emerald', 'amber', 'violet', 'rose', 'cyan', 'slate'];

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function stripComments(source: string): string {
  let result = '';
  let quote: "'" | '"' | null = null;
  let lineComment = false;
  let blockComment = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    const next = source[i + 1];
    if (lineComment) {
      if (char === '\n') {
        lineComment = false;
        result += char;
      } else {
        result += ' ';
      }
      continue;
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false;
        result += '  ';
        i++;
      } else {
        result += char === '\n' ? '\n' : ' ';
      }
      continue;
    }
    if (quote) {
      result += char;
      if (char === quote && next === quote) {
        result += next;
        i++;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      result += char;
    } else if (char === '-' && next === '-') {
      lineComment = true;
      result += '  ';
      i++;
    } else if (char === '/' && next === '*') {
      blockComment = true;
      result += '  ';
      i++;
    } else {
      result += char;
    }
  }
  return result;
}

function splitTopLevel(source: string, separator = ','): string[] {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  let quote: "'" | '"' | null = null;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    const next = source[i + 1];
    if (quote) {
      if (char === quote && next === quote) i++;
      else if (char === quote) quote = null;
    } else if (char === "'" || char === '"') {
      quote = char;
    } else if (char === '(') {
      depth++;
    } else if (char === ')') {
      depth--;
    } else if (char === separator && depth === 0) {
      parts.push(source.slice(start, i).trim());
      start = i + 1;
    }
  }
  const last = source.slice(start).trim();
  if (last) parts.push(last);
  return parts;
}

function normalizeIdentifier(identifier: string): string {
  return identifier.split('.').map(part => {
    const trimmed = part.trim();
    return trimmed.startsWith('"')
      ? trimmed.slice(1, -1).replace(/""/g, '"')
      : trimmed.toLowerCase();
  }).at(-1) ?? identifier;
}

function parseIdentifier(source: string): { value: string; rest: string } {
  const match = source.match(/^\s*((?:"(?:[^"]|"")*"|[A-Za-z_][\w$]*)(?:\s*\.\s*(?:"(?:[^"]|"")*"|[A-Za-z_][\w$]*))*)\s*/);
  if (!match) throw new Error(`Could not read SQL identifier near "${source.trim().slice(0, 40)}".`);
  return { value: normalizeIdentifier(match[1].replace(/\s/g, '')), rest: source.slice(match[0].length) };
}

function parseColumnType(source: string): { type: DataType; typeArgs?: string; rest: string } {
  const match = source.match(/^\s*(DOUBLE\s+PRECISION|TIMESTAMP(?:\s+(?:WITH|WITHOUT)\s+TIME\s+ZONE)?|TIME(?:\s+(?:WITH|WITHOUT)\s+TIME\s+ZONE)?|CHARACTER\s+VARYING|CHARACTER|VARCHAR|CHAR|SMALLINT|INT2|BIGINT|INT8|INTEGER|INT4|INT|SERIAL2|SERIAL4|SERIAL8|SERIAL|BIGSERIAL|UUID|BOOLEAN|BOOL|TEXT|BYTEA|JSONB|JSON|NUMERIC|DECIMAL|REAL|FLOAT8|FLOAT4|FLOAT|MONEY|DATE|ENUM)(?:\s*\(([^)]*)\))?(\[\])?/i);
  if (!match) throw new Error(`Unsupported PostgreSQL column type near "${source.trim().slice(0, 50)}".`);

  const typeName = match[1].toUpperCase().replace(/\s+/g, ' ');
  const typeMap: Record<string, DataType> = {
    'DOUBLE PRECISION': 'FLOAT',
    TIMESTAMP: 'TIMESTAMP',
    'TIMESTAMP WITH TIME ZONE': 'TIMESTAMPTZ',
    'TIMESTAMP WITHOUT TIME ZONE': 'TIMESTAMP',
    TIME: 'TIME',
    'TIME WITH TIME ZONE': 'TIME',
    'TIME WITHOUT TIME ZONE': 'TIME',
    'CHARACTER VARYING': 'VARCHAR',
    CHARACTER: 'CHAR',
    VARCHAR: 'VARCHAR',
    CHAR: 'CHAR',
    SMALLINT: 'SMALLINT',
    INT2: 'SMALLINT',
    BIGINT: 'BIGINT',
    INT8: 'BIGINT',
    INTEGER: 'INT',
    INT4: 'INT',
    INT: 'INT',
    SERIAL2: 'SMALLINT',
    SERIAL4: 'SERIAL',
    SERIAL8: 'BIGSERIAL',
    SERIAL: 'SERIAL',
    BIGSERIAL: 'BIGSERIAL',
    UUID: 'UUID',
    BOOLEAN: 'BOOLEAN',
    BOOL: 'BOOLEAN',
    TEXT: 'TEXT',
    BYTEA: 'BYTEA',
    JSONB: 'JSONB',
    JSON: 'JSON',
    NUMERIC: 'NUMERIC',
    DECIMAL: 'DECIMAL',
    REAL: 'FLOAT',
    FLOAT8: 'FLOAT',
    FLOAT4: 'FLOAT',
    FLOAT: 'FLOAT',
    MONEY: 'NUMERIC',
    DATE: 'DATE',
    ENUM: 'ENUM',
  };
  const type = match[3] ? 'ARRAY' : typeMap[typeName];
  const typeArgs = match[3] ? typeName : match[2]?.trim();
  return {
    type,
    ...(typeArgs ? { typeArgs } : {}),
    rest: source.slice(match[0].length),
  };
}

function parseForeignKey(
  tableName: string,
  columnNames: string[],
  source: string,
): ForeignKeyDefinition {
  const match = source.match(/\bREFERENCES\s+((?:"(?:[^"]|"")*"|[A-Za-z_][\w$]*)(?:\s*\.\s*(?:"(?:[^"]|"")*"|[A-Za-z_][\w$]*))*)\s*(?:\(([^)]*)\))?/i);
  if (!match) throw new Error(`Unsupported foreign-key definition in table "${tableName}".`);
  const targetTableName = normalizeIdentifier(match[1].replace(/\s/g, ''));
  const targetColumnNames = match[2]
    ? splitTopLevel(match[2]).map(name => parseIdentifier(name).value)
    : [];
  const deleteAction = source.match(/\bON\s+DELETE\s+(CASCADE|SET\s+NULL|RESTRICT|NO\s+ACTION)\b/i)?.[1]?.toUpperCase() as Relation['onDelete'] | undefined;
  return {
    tableName,
    columnNames,
    targetTableName,
    targetColumnNames,
    ...(deleteAction ? { onDelete: deleteAction } : {}),
  };
}

function parseTableBody(tableName: string, body: string, index: number): ParsedTable {
  const columns: Column[] = [];
  const foreignKeys: ForeignKeyDefinition[] = [];
  const primaryKeyColumns: string[] = [];
  const uniqueTogether: string[][] = [];
  const definitions = splitTopLevel(body);

  for (const rawDefinition of definitions) {
    const definition = rawDefinition.replace(/^CONSTRAINT\s+(?:"(?:[^"]|"")*"|[\w$]+)\s+/i, '').trim();
    const primaryKey = definition.match(/^PRIMARY\s+KEY\s*\(([^)]*)\)/i);
    if (primaryKey) {
      primaryKeyColumns.push(...splitTopLevel(primaryKey[1]).map(name => parseIdentifier(name).value));
      continue;
    }
    const tableUnique = definition.match(/^UNIQUE(?:\s+(?:NULLS\s+NOT\s+DISTINCT|NULLS\s+DISTINCT))?\s*\(([^)]*)\)/i);
    if (tableUnique) {
      uniqueTogether.push(splitTopLevel(tableUnique[1]).map(name => parseIdentifier(name).value));
      continue;
    }
    const tableForeignKey = definition.match(/^FOREIGN\s+KEY\s*\(([^)]*)\)\s*(.+)$/i);
    if (tableForeignKey) {
      foreignKeys.push(parseForeignKey(
        tableName,
        splitTopLevel(tableForeignKey[1]).map(name => parseIdentifier(name).value),
        tableForeignKey[2],
      ));
      continue;
    }
    if (/^CHECK\b/i.test(definition)) continue;
    if (/^(EXCLUDE|LIKE|INHERITS)\b/i.test(definition)) {
      throw new Error(`Unsupported table constraint in "${tableName}": ${definition.slice(0, 50)}`);
    }

    const parsedName = parseIdentifier(definition);
    const parsedType = parseColumnType(parsedName.rest);
    const rest = parsedType.rest;
    const isPrimaryKey = /\bPRIMARY\s+KEY\b/i.test(rest);
    const isUnique = /\bUNIQUE\b/i.test(rest);
    const isNullable = !isPrimaryKey && !/\bNOT\s+NULL\b/i.test(rest);
    const defaultMatch = rest.match(/\bDEFAULT\s+((?:'(?:[^']|'')*'|"(?:""|[^"])*"|[^\s,]+)(?:\s*\([^)]*\))?)/i);
    const column: Column = {
      id: createId('col'),
      name: parsedName.value,
      type: parsedType.type,
      ...(parsedType.typeArgs ? { typeArgs: parsedType.typeArgs } : {}),
      isPrimaryKey,
      isForeignKey: /\bREFERENCES\b/i.test(rest),
      isNullable,
      isUnique,
      isIndexed: false,
      ...(defaultMatch ? { defaultValue: defaultMatch[1] } : {}),
    };
    columns.push(column);
    if (isPrimaryKey) primaryKeyColumns.push(column.name);
    if (isUnique) uniqueTogether.push([column.name]);
    if (column.isForeignKey) foreignKeys.push(parseForeignKey(tableName, [column.name], rest));
  }

  for (const name of primaryKeyColumns) {
    const column = columns.find(item => item.name.toLowerCase() === name.toLowerCase());
    if (!column) throw new Error(`Primary-key column "${name}" was not found in table "${tableName}".`);
    column.isPrimaryKey = true;
    column.isNullable = false;
  }
  return {
    table: {
      id: createId('table'),
      name: tableName,
      columns,
      color: TABLE_COLORS[index % TABLE_COLORS.length],
      position: { x: 60 + (index % 4) * 360, y: 80 + Math.floor(index / 4) * 320 },
      ...(uniqueTogether.length ? { uniqueTogether } : {}),
    },
    foreignKeys,
    relations: [],
  };
}

function hasUniqueKey(table: Table, columnNames: string[]): boolean {
  const names = new Set(columnNames.map(name => name.toLowerCase()));
  const primaryKeyColumns = table.columns.filter(column => column.isPrimaryKey).map(column => column.name.toLowerCase());
  if (primaryKeyColumns.length === names.size && primaryKeyColumns.every(name => names.has(name))) return true;
  if (columnNames.length === 1 && table.columns.find(column => column.name.toLowerCase() === columnNames[0].toLowerCase())?.isUnique) {
    return true;
  }
  return (table.uniqueTogether ?? []).some(group => {
    const groupNames = new Set(group.map(name => name.toLowerCase()));
    return groupNames.size === names.size && [...groupNames].every(name => names.has(name));
  });
}

function readCreateTableStatements(source: string): { tableName: string; body: string }[] {
  const statements: { tableName: string; body: string }[] = [];
  const createTablePattern = /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?((?:"(?:[^"]|"")*"|[A-Za-z_][\w$]*)(?:\s*\.\s*(?:"(?:[^"]|"")*"|[A-Za-z_][\w$]*))*)\s*\(/gi;
  let match: RegExpExecArray | null;
  while ((match = createTablePattern.exec(source))) {
    let depth = 1;
    let quote: "'" | '"' | null = null;
    let end = createTablePattern.lastIndex;
    for (; end < source.length && depth > 0; end++) {
      const char = source[end];
      const next = source[end + 1];
      if (quote) {
        if (char === quote && next === quote) end++;
        else if (char === quote) quote = null;
      } else if (char === "'" || char === '"') {
        quote = char;
      } else if (char === '(') {
        depth++;
      } else if (char === ')') {
        depth--;
      }
    }
    if (depth !== 0) throw new Error(`CREATE TABLE "${normalizeIdentifier(match[1])}" has unclosed parentheses.`);
    statements.push({
      tableName: normalizeIdentifier(match[1].replace(/\s/g, '')),
      body: source.slice(createTablePattern.lastIndex, end - 1),
    });
    createTablePattern.lastIndex = end;
  }
  return statements;
}

function addIndexes(source: string, tables: Table[]): void {
  const tableMap = new Map(tables.map(table => [table.name.toLowerCase(), table]));
  const indexPattern = /\bCREATE\s+(UNIQUE\s+)?INDEX\s+(?:(?:"(?:[^"]|"")*"|[\w$]+)\s+)?ON\s+((?:"(?:[^"]|"")*"|[A-Za-z_][\w$]*)(?:\s*\.\s*(?:"(?:[^"]|"")*"|[A-Za-z_][\w$]*))*)\s*(?:USING\s+\w+\s*)?\(([^)]*)\)/gi;
  let match: RegExpExecArray | null;
  while ((match = indexPattern.exec(source))) {
    const table = tableMap.get(normalizeIdentifier(match[2].replace(/\s/g, '')).toLowerCase());
    if (!table) continue;
    const columnNames = splitTopLevel(match[3])
      .filter(name => !name.includes('('))
      .map(name => parseIdentifier(name).value);
    if (match[1] && columnNames.length > 1) {
      const key = new Set(columnNames.map(name => name.toLowerCase()));
      const exists = (table.uniqueTogether ?? []).some(group => {
        const groupNames = new Set(group.map(name => name.toLowerCase()));
        return groupNames.size === key.size && [...groupNames].every(name => key.has(name));
      });
      if (!exists) table.uniqueTogether = [...(table.uniqueTogether ?? []), columnNames];
    }
    for (const name of columnNames) {
      const column = table.columns.find(item => item.name.toLowerCase() === name.toLowerCase());
      if (column) {
        column.isIndexed = true;
        if (match[1] && columnNames.length === 1) column.isUnique = true;
      }
    }
  }
}

export function parsePostgresDDL(source: string): { tables: Table[]; relations: Relation[] } {
  const sql = stripComments(source);
  const tableStatements = readCreateTableStatements(sql);
  if (tableStatements.length === 0) {
    throw new Error('No PostgreSQL CREATE TABLE statements found.');
  }

  const parsedTables = tableStatements.map(({ tableName, body }, index) => parseTableBody(tableName, body, index));
  const tables = parsedTables.map(parsed => parsed.table);
  addIndexes(sql, tables);
  const tableByName = new Map<string, Table>();
  for (const table of tables) {
    const key = table.name.toLowerCase();
    if (tableByName.has(key)) throw new Error(`More than one imported table is named "${table.name}".`);
    tableByName.set(key, table);
  }

  for (const parsed of parsedTables) {
    for (const foreignKey of parsed.foreignKeys) {
      const child = tableByName.get(foreignKey.tableName.toLowerCase());
      const parent = tableByName.get(foreignKey.targetTableName.toLowerCase());
      if (!child || !parent) {
        throw new Error(`Foreign key from "${foreignKey.tableName}" references missing table "${foreignKey.targetTableName}".`);
      }
      const sourceColumns = foreignKey.columnNames.map(name => {
        const column = child.columns.find(item => item.name.toLowerCase() === name.toLowerCase());
        if (!column) throw new Error(`Foreign-key column "${name}" was not found in "${child.name}".`);
        return column;
      });
      const targetColumns = foreignKey.targetColumnNames.length
        ? foreignKey.targetColumnNames.map(name => {
          const column = parent.columns.find(item => item.name.toLowerCase() === name.toLowerCase());
          if (!column) throw new Error(`Referenced column "${name}" was not found in "${parent.name}".`);
          return column;
        })
        : parent.columns.filter(column => column.isPrimaryKey);
      if (sourceColumns.length !== targetColumns.length || targetColumns.length === 0) {
        throw new Error(`Could not resolve the referenced primary key for "${child.name}".`);
      }

      const group = sourceColumns.map(column => column.name);
      const isUnique = hasUniqueKey(child, group);
      sourceColumns.forEach((sourceColumn, index) => {
        const targetColumn = targetColumns[index];
        sourceColumn.isForeignKey = true;
        sourceColumn.references = {
          tableId: parent.id,
          columnId: targetColumn.id,
          tableName: parent.name,
          columnName: targetColumn.name,
        };
      });
      sourceColumns.forEach((sourceColumn, index) => {
        const targetColumn = targetColumns[index];
        const relation: Relation = {
          id: createId('rel'),
          sourceTableId: child.id,
          sourceColumnId: sourceColumn.id,
          targetTableId: parent.id,
          targetColumnId: targetColumn.id,
          type: isUnique ? '1:1' : '1:N',
          ...(foreignKey.onDelete ? { onDelete: foreignKey.onDelete } : {}),
        };
        parsed.relations.push(relation);
      });
    }
  }

  const alterForeignKeyPattern = /\bALTER\s+TABLE\s+(?:ONLY\s+)?((?:"(?:[^"]|"")*"|[A-Za-z_][\w$]*)(?:\s*\.\s*(?:"(?:[^"]|"")*"|[A-Za-z_][\w$]*))*)\s+ADD\s+(?:CONSTRAINT\s+(?:"(?:[^"]|"")*"|[\w$]+)\s+)?FOREIGN\s+KEY\s*\(([^)]*)\)\s*(.+?)(?:;|$)/gis;
  let alterMatch: RegExpExecArray | null;
  while ((alterMatch = alterForeignKeyPattern.exec(sql))) {
    const tableName = normalizeIdentifier(alterMatch[1].replace(/\s/g, ''));
    const definition = parseForeignKey(
      tableName,
      splitTopLevel(alterMatch[2]).map(name => parseIdentifier(name).value),
      alterMatch[3],
    );
    const child = tableByName.get(tableName.toLowerCase());
    const parent = tableByName.get(definition.targetTableName.toLowerCase());
    if (!child || !parent) {
      throw new Error(`Foreign key from "${tableName}" references missing table "${definition.targetTableName}".`);
    }
    const parsed = parsedTables.find(item => item.table.id === child.id)!;
    if (!parsed.foreignKeys.some(key =>
      key.tableName.toLowerCase() === definition.tableName.toLowerCase()
      && key.columnNames.join(',').toLowerCase() === definition.columnNames.join(',').toLowerCase()
      && key.targetTableName.toLowerCase() === definition.targetTableName.toLowerCase()
    )) {
      parsed.foreignKeys.push(definition);
      const targetCols = definition.targetColumnNames.length
        ? definition.targetColumnNames.map(name => parent.columns.find(column => column.name.toLowerCase() === name.toLowerCase()))
        : parent.columns.filter(column => column.isPrimaryKey);
      const sourceCols = definition.columnNames.map(name => child.columns.find(column => column.name.toLowerCase() === name.toLowerCase()));
      if (sourceCols.some(column => !column) || targetCols.some(column => !column) || sourceCols.length !== targetCols.length || targetCols.length === 0) {
        throw new Error(`Could not resolve the foreign key from "${child.name}" to "${parent.name}".`);
      }
      const validSourceCols = sourceCols as Column[];
      const validTargetCols = targetCols as Column[];
      const group = validSourceCols.map(column => column.name);
      const isUnique = hasUniqueKey(child, group);
      validSourceCols.forEach((sourceColumn, index) => {
        const targetColumn = validTargetCols[index];
        sourceColumn.isForeignKey = true;
        sourceColumn.references = { tableId: parent.id, columnId: targetColumn.id, tableName: parent.name, columnName: targetColumn.name };
        parsed.relations.push({
          id: createId('rel'),
          sourceTableId: child.id,
          sourceColumnId: sourceColumn.id,
          targetTableId: parent.id,
          targetColumnId: targetColumn.id,
          type: isUnique ? '1:1' : '1:N',
          ...(definition.onDelete ? { onDelete: definition.onDelete } : {}),
        });
      });
    }
  }

  return { tables, relations: parsedTables.flatMap(parsed => parsed.relations) };
}
