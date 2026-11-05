import type { Column, DataType, Relation, Table, TableColor } from '../types/schema';

interface EntityDefinition {
  name: string;
  columns: Column[];
}

interface RelationshipDefinition {
  leftName: string;
  leftCardinality: string;
  rightCardinality: string;
  rightName: string;
}

const TABLE_COLORS: TableColor[] = ['blue', 'emerald', 'amber', 'violet', 'rose', 'cyan', 'slate'];

function createId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function parseDataType(rawType: string, lineNumber: number): { type: DataType; typeArgs?: string } {
  const normalized = rawType.trim().toLowerCase();
  const args = normalized.match(/^(.*?)\(([^)]+)\)$/);
  const typeName = (args?.[1] ?? normalized).trim();
  const typeArgs = args?.[2];
  const types: Record<string, DataType> = {
    uuid: 'UUID',
    bigserial: 'BIGSERIAL',
    bigint: 'BIGINT',
    int: 'INT',
    integer: 'INT',
    serial: 'SERIAL',
    smallint: 'SMALLINT',
    tinyint: 'SMALLINT',
    varchar: 'VARCHAR',
    'character varying': 'VARCHAR',
    char: 'CHAR',
    character: 'CHAR',
    text: 'TEXT',
    string: 'TEXT',
    boolean: 'BOOLEAN',
    bool: 'BOOLEAN',
    timestamp: 'TIMESTAMP',
    'timestamp without time zone': 'TIMESTAMP',
    timestamptz: 'TIMESTAMPTZ',
    'timestamp with time zone': 'TIMESTAMPTZ',
    date: 'DATE',
    time: 'TIME',
    decimal: 'DECIMAL',
    money: 'NUMERIC',
    numeric: 'NUMERIC',
    number: 'NUMERIC',
    float: 'FLOAT',
    real: 'FLOAT',
    double: 'FLOAT',
    'double precision': 'FLOAT',
    jsonb: 'JSONB',
    json: 'JSON',
    enum: 'ENUM',
    array: 'ARRAY',
    bytea: 'BYTEA',
  };
  const type = types[typeName];
  if (!type) throw new Error(`Unsupported Mermaid data type "${rawType}" on line ${lineNumber}.`);
  return { type, ...(typeArgs ? { typeArgs } : {}) };
}

function parseAttribute(line: string, lineNumber: number): Column {
  const match = line.match(/^\s*(.+?)\s+([A-Za-z_]\w*)(?:\s+((?:PK|FK|UK)(?:\s*,\s*(?:PK|FK|UK))*))?(?:\s+"([^"]*)")?\s*$/i);
  if (!match) {
    throw new Error(`Unsupported Mermaid attribute on line ${lineNumber}: ${line.trim()}`);
  }

  const [, rawType, name, rawKeys = '', comment] = match;
  const keys = rawKeys.toUpperCase().split(/\s*,\s*/);
  const parsedType = parseDataType(rawType, lineNumber);
  const isPrimaryKey = keys.includes('PK');

  return {
    id: createId('col'),
    name,
    ...parsedType,
    isPrimaryKey,
    isForeignKey: keys.includes('FK'),
    isNullable: !isPrimaryKey,
    isUnique: keys.includes('UK'),
    isIndexed: false,
    ...(comment ? { comment } : {}),
  };
}

function isMany(cardinality: string): boolean {
  return cardinality.includes('{') || cardinality.includes('}');
}

function isOptional(cardinality: string): boolean {
  return cardinality.includes('o');
}

function uniqueColumnName(table: Table, baseName: string): string {
  let name = baseName;
  let suffix = 2;
  while (table.columns.some(column => column.name.toLowerCase() === name.toLowerCase())) {
    name = `${baseName}_${suffix++}`;
  }
  return name;
}

function createForeignKey(
  child: Table,
  parent: Table,
  parentColumn: Column,
  nullable: boolean,
  unique: boolean,
): Column {
  const parentName = parent.name.replace(/[^A-Za-z0-9_]/g, '_').toLowerCase();
  const parentColumnName = parentColumn.name.replace(/[^A-Za-z0-9_]/g, '_').toLowerCase();
  const columnName = uniqueColumnName(child, `${parentName}_${parentColumnName}`);
  const type = parentColumn.type === 'SERIAL' ? 'INT' : parentColumn.type === 'BIGSERIAL' ? 'BIGINT' : parentColumn.type;
  const column: Column = {
    id: createId('col'),
    name: columnName,
    type,
    ...(type === parentColumn.type && parentColumn.typeArgs ? { typeArgs: parentColumn.typeArgs } : {}),
    isPrimaryKey: false,
    isForeignKey: true,
    references: {
      tableId: parent.id,
      columnId: parentColumn.id,
      tableName: parent.name,
      columnName: parentColumn.name,
    },
    isNullable: nullable,
    isUnique: unique,
    isIndexed: false,
  };
  child.columns.push(column);
  return column;
}

function resolveForeignKeyColumn(
  child: Table,
  parent: Table,
  parentColumn: Column,
  cardinality: string,
  unique: boolean,
): Column {
  const parentStem = parent.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const parentPk = parentColumn.name.toLowerCase();
  const candidates = child.columns.filter(column => column.isForeignKey && !column.references);
  const matched = candidates.find(column => {
    const name = column.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return name.includes(parentStem) || name === parentPk;
  });
  const column = matched ?? (candidates.length === 1 ? candidates[0] : undefined);
  if (!column) {
    return createForeignKey(child, parent, parentColumn, isOptional(cardinality), unique);
  }

  column.isForeignKey = true;
  column.type = parentColumn.type === 'SERIAL' ? 'INT' : parentColumn.type === 'BIGSERIAL' ? 'BIGINT' : parentColumn.type;
  column.typeArgs = column.type === parentColumn.type ? parentColumn.typeArgs : undefined;
  column.isNullable = isOptional(cardinality);
  column.isUnique = column.isUnique || unique;
  column.references = {
    tableId: parent.id,
    columnId: parentColumn.id,
    tableName: parent.name,
    columnName: parentColumn.name,
  };
  return column;
}

export function parseMermaidER(source: string): { tables: Table[]; relations: Relation[] } {
  const lines = source.replace(/^\uFEFF/, '').split(/\r?\n/);
  const entities = new Map<string, EntityDefinition>();
  const explicitEntities = new Set<string>();
  const relationships: RelationshipDefinition[] = [];
  let currentEntity: EntityDefinition | null = null;
  let hasErDiagram = false;

  for (const [index, rawLine] of lines.entries()) {
    const line = rawLine.trim();
    const lineNumber = index + 1;
    if (!line || line.startsWith('%%') || line.startsWith('```')) continue;
    if (!hasErDiagram) {
      if (line === 'erDiagram') {
        hasErDiagram = true;
        continue;
      }
      if (line.startsWith('#')) continue;
      throw new Error(`Expected "erDiagram" on line ${lineNumber}.`);
    }

    if (currentEntity) {
      if (line === '}') {
        currentEntity = null;
      } else {
        currentEntity.columns.push(parseAttribute(line, lineNumber));
      }
      continue;
    }

    const entityStart = line.match(/^([A-Za-z_]\w*)\s*\{$/);
    if (entityStart) {
      const name = entityStart[1];
      if (explicitEntities.has(name)) throw new Error(`Entity "${name}" is defined more than once.`);
      currentEntity = { name, columns: [] };
      entities.set(name, currentEntity);
      explicitEntities.add(name);
      continue;
    }

    const relationship = line.match(/^([A-Za-z_]\w*)\s+([|o{}]{1,2})(--|\.\.)([|o{}]{1,2})\s+([A-Za-z_]\w*)(?:\s*:\s*.*)?$/);
    if (relationship) {
      const [, leftName, leftCardinality, , rightCardinality, rightName] = relationship;
      relationships.push({ leftName, leftCardinality, rightCardinality, rightName });
      if (!entities.has(leftName)) entities.set(leftName, { name: leftName, columns: [] });
      if (!entities.has(rightName)) entities.set(rightName, { name: rightName, columns: [] });
      continue;
    }

    if (/^(title|direction)\b/i.test(line)) continue;
    throw new Error(`Unsupported Mermaid ER syntax on line ${lineNumber}: ${line}`);
  }

  if (!hasErDiagram) throw new Error('This file does not contain a Mermaid erDiagram.');
  if (currentEntity) throw new Error(`Entity "${currentEntity.name}" is missing its closing "}".`);
  if (entities.size === 0) throw new Error('No entities or relationships were found in this Mermaid diagram.');

  const tables: Table[] = Array.from(entities.values(), (entity, index) => {
    const columns = entity.columns;
    if (!columns.some(column => column.isPrimaryKey)) {
      columns.unshift({
        id: createId('col'),
        name: 'id',
        type: 'SERIAL',
        isPrimaryKey: true,
        isForeignKey: false,
        isNullable: false,
        isUnique: false,
        isIndexed: false,
      });
    }
    return {
      id: createId('table'),
      name: entity.name,
      columns,
      color: TABLE_COLORS[index % TABLE_COLORS.length],
      position: { x: 60 + (index % 4) * 360, y: 80 + Math.floor(index / 4) * 320 },
    };
  });

  const tableByName = new Map(tables.map(table => [table.name, table]));
  const relations: Relation[] = [];

  relationships.forEach(({ leftName, leftCardinality, rightCardinality, rightName }, index) => {
    const left = tableByName.get(leftName)!;
    const right = tableByName.get(rightName)!;
    const leftPk = left.columns.find(column => column.isPrimaryKey)!;
    const rightPk = right.columns.find(column => column.isPrimaryKey)!;
    const leftMany = isMany(leftCardinality);
    const rightMany = isMany(rightCardinality);

    if (leftMany && rightMany) {
      let junctionName = `${left.name}_${right.name}`;
      let suffix = 2;
      while (tableByName.has(junctionName)) junctionName = `${left.name}_${right.name}_${suffix++}`;
      const junction: Table = {
        id: createId('table'),
        name: junctionName,
        columns: [],
        color: TABLE_COLORS[tables.length % TABLE_COLORS.length],
        position: { x: 60 + (tables.length % 4) * 360, y: 80 + Math.floor(tables.length / 4) * 320 },
      };
      tables.push(junction);
      tableByName.set(junctionName, junction);
      const leftFk = createForeignKey(junction, left, leftPk, false, false);
      const rightFk = createForeignKey(junction, right, rightPk, false, false);
      junction.uniqueTogether = [[leftFk.name, rightFk.name]];
      junction.columns.unshift({
        id: createId('col'),
        name: 'id',
        type: 'SERIAL',
        isPrimaryKey: true,
        isForeignKey: false,
        isNullable: false,
        isUnique: false,
        isIndexed: false,
      });
      relations.push(
        { id: createId(`rel${index}`), sourceTableId: junction.id, sourceColumnId: leftFk.id, targetTableId: left.id, targetColumnId: leftPk.id, type: '1:N' },
        { id: createId(`rel${index}`), sourceTableId: junction.id, sourceColumnId: rightFk.id, targetTableId: right.id, targetColumnId: rightPk.id, type: '1:N' },
      );
      return;
    }

    const child = leftMany ? left : right;
    const parent = leftMany ? right : left;
    const parentColumn = leftMany ? rightPk : leftPk;
    const parentCardinality = leftMany ? rightCardinality : leftCardinality;
    const childColumn = resolveForeignKeyColumn(child, parent, parentColumn, parentCardinality, !leftMany && !rightMany);
    relations.push({
      id: createId('rel'),
      sourceTableId: child.id,
      sourceColumnId: childColumn.id,
      targetTableId: parent.id,
      targetColumnId: parentColumn.id,
      type: leftMany || rightMany ? '1:N' : '1:1',
    });
  });

  return { tables, relations };
}
