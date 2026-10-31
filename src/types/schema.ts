export type DataType =
  | 'UUID'
  | 'BIGSERIAL'
  | 'BIGINT'
  | 'INT'
  | 'SERIAL'
  | 'SMALLINT'
  | 'VARCHAR'
  | 'CHAR'
  | 'TEXT'
  | 'BOOLEAN'
  | 'TIMESTAMP'
  | 'TIMESTAMPTZ'
  | 'DATE'
  | 'TIME'
  | 'DECIMAL'
  | 'NUMERIC'
  | 'FLOAT'
  | 'JSONB'
  | 'JSON'
  | 'ENUM'
  | 'ARRAY'
  | 'BYTEA';

export interface Column {
  id: string;
  name: string;
  type: DataType;
  typeArgs?: string; // e.g. "255" or "10,2"
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  references?: {
    tableId: string;
    columnId: string;
    tableName?: string;
    columnName?: string;
  };
  isNullable: boolean;
  isUnique: boolean;
  isIndexed: boolean;
  defaultValue?: string;
  comment?: string;
}

export type TableColor = 'blue' | 'emerald' | 'amber' | 'violet' | 'rose' | 'cyan' | 'slate';

export interface Table {
  id: string;
  name: string;
  columns: Column[];
  color: TableColor;
  position: { x: number; y: number };
  width?: number; // resizable card width, default 280
  comment?: string;
  uniqueTogether?: string[][]; // each inner array = one UNIQUE constraint across those column names
}

export interface Relation {
  id: string;
  sourceTableId: string;
  sourceColumnId: string;
  targetTableId: string;
  targetColumnId: string;
  type: '1:1' | '1:N' | 'N:M';
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface ValidationRule {
  id: string;
  description: string;
  validate: (tables: Table[], relations: Relation[]) => { passed: boolean; message: string };
}

export interface LabStep {
  stepNumber: number;
  title: string;
  category: string;
  estimatedMinutes: number;
  overview: string;
  architectureContext: string;
  scaleConsiderations: string[];
  tasks: {
    id: string;
    text: string;
    detail: string;
  }[];
  validationRules: ValidationRule[];
  hints: string[];
  starterTables: Table[];
  solutionTables: Table[];
  solutionRelations: Relation[];
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface RequirementItem {
  id: string;
  text: string;
}

export interface ProjectMeta {
  name: string;
  functionalRequirements: RequirementItem[];
  nonFunctionalRequirements: RequirementItem[];
}
