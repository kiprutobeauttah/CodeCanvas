
export interface ExecutionStep {
  lineNumber: number;
  variables: Record<string, any>;
  description: string;
  output: string[] | null;
}

export type Theme = 'light' | 'dark';

export type Language = 'python' | 'javascript';
