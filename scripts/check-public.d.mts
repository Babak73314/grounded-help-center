export declare const RULES: Array<{ id: string; pattern: RegExp }>;
export declare function findProblems(text: string): Array<{ rule: string; line: number }>;
export declare function trackedFiles(root?: string): string[];
export declare function checkPublic(files: string[]): { problems: string[]; scanned: number; lockfiles: string[] };
