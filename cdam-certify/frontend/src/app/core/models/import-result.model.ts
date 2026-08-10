export interface ImportRowError {
  row: number;
  reason: string;
}

export interface ImportResult {
  totalRows: number;
  imported: number;
  skippedDuplicates: number;
  errors: ImportRowError[];
}
