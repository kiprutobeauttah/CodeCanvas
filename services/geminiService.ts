import { ExecutionStep, Language } from '../types';

/**
 * Finds the 1-based line number of the first line containing a specific substring.
 * @param codeLines - Array of code lines.
 * @param searchString - The string to search for.
 * @param startLine - The 0-based line index to start searching from.
 * @returns The 1-based line number, or a fallback if not found.
 */
const findLine = (codeLines: string[], searchString: string, startLine = 0): number => {
  const index = codeLines.findIndex((line, i) => i >= startLine && line.includes(searchString));
  return index !== -1 ? index + 1 : startLine + 1;
};


class BubbleSortSimulator {
    private codeLines: string[];
    private trace: ExecutionStep[] = [];
    private variables: Record<string, any> = {};
    private output: string[] = [];
    private currentLine = 1;

    constructor(code: string) {
        this.codeLines = code.split('\n');
    }

    private logStep(description: string, lineNumber?: number) {
        if (lineNumber) {
            this.currentLine = lineNumber;
        }
        this.trace.push({
            lineNumber: this.currentLine,
            variables: JSON.parse(JSON.stringify(this.variables)), // Deep copy
            description,
            output: this.output.length > 0 ? [...this.output] : null,
        });
        this.output = []; // Clear output after step
    }

    private evaluate(expression: string): any {
        // A simple evaluator for this specific case. Not for general use.
        try {
            // Using new Function is a security risk in general, but here it's evaluating
            // expressions from user-provided code in a sandboxed context for demonstration.
            const scope = Object.keys(this.variables);
            const values = Object.values(this.variables);
            const evaluator = new Function(...scope, `"use strict"; return (${expression});`);
            return evaluator(...values);
        } catch (e) {
             // Fallback for array literals which aren't valid expressions alone
            if (expression.trim().startsWith('[')) {
                return JSON.parse(expression.replace(/'/g, '"'));
            }
            console.error(`Could not evaluate: ${expression}`, e);
            return null;
        }
    }

    run(): ExecutionStep[] {
        const arrInitRegex = /(?:let|var|const)\s+([a-zA-Z0-9_]+)\s*=\s*(\[.*\])/;
        const codeText = this.codeLines.join('\n');
        const arrMatch = codeText.match(arrInitRegex);

        if (!arrMatch) {
            throw new Error("Could not find an array initialization like 'let myArray = [...]'. The simulator is not generic enough for this code.");
        }
        
        const arrName = arrMatch[1];
        const arrValue = this.evaluate(arrMatch[2]);
        const n = arrValue.length;

        this.variables[arrName] = arrValue;
        const initLine = findLine(this.codeLines, arrMatch[0]);
        this.logStep(`Initialize array '${arrName}' with ${arrValue.length} elements.`, initLine);
        
        const nInitLine = findLine(this.codeLines, 'n =');
        this.variables['n'] = n;
        this.logStep(`Initialize 'n' with the length of the array, which is ${n}.`, nInitLine);

        const arr = [...arrValue];

        const outerLoopLine = findLine(this.codeLines, 'for (let i');
        for (let i = 0; i < n; i++) {
            this.variables['i'] = i;
            this.logStep(`Outer loop starts iteration. 'i' is now ${i}.`, outerLoopLine);

            const innerLoopLine = findLine(this.codeLines, 'for (let j');
            for (let j = 0; j < n - i - 1; j++) {
                this.variables['j'] = j;
                this.logStep(`Inner loop starts iteration. 'j' is now ${j}.`, innerLoopLine);

                const ifLine = findLine(this.codeLines, `if (arr[j]`);
                const val1 = arr[j];
                const val2 = arr[j + 1];
                this.logStep(`Comparing ${arrName}[${j}] (${val1}) with ${arrName}[${j + 1}] (${val2}).`, ifLine);

                if (val1 > val2) {
                    const swapLine = findLine(this.codeLines, `[${arrName}[j]`);
                    this.logStep(`Condition true (${val1} > ${val2}). Swapping elements.`, swapLine);
                    
                    [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
                    this.variables[arrName] = [...arr]; // Update state with copy
                    this.logStep(`Array is now [${arr.join(', ')}].`, swapLine);
                }
            }
        }
        
        const finalAssignLine = findLine(this.codeLines, 'sortedArray =');
        this.variables['sortedArray'] = [...arr];
        this.logStep(`Sorting complete. Final array assigned to 'sortedArray'.`, finalAssignLine);

        const logLine = findLine(this.codeLines, 'console.log');
        this.output = [`[${arr.join(', ')}]`];
        this.logStep(`Printing the final sorted array to the console.`, logLine);

        return this.trace;
    }
}


export const generateExecutionTrace = async (code: string, language: Language): Promise<ExecutionStep[]> => {
    // This is a highly simplified, non-generic simulator that serves as a non-AI demo.
    // It only works for the provided bubble sort example. A full implementation
    // requires a proper parser and interpreter as outlined in the project vision.
    if (language === 'python') {
        throw new Error("This non-AI demonstrator currently only supports the JavaScript bubble sort example. Please switch languages.");
    }
    if (!code.includes('bubbleSort') || !code.includes('arr.length')) {
        throw new Error("The current non-AI simulator is a demonstration and only understands the default bubble sort code.");
    }

    try {
        const simulator = new BubbleSortSimulator(code);
        const trace = simulator.run();
        // Add a small delay to make the simulation feel substantial, even though it's instant.
        await new Promise(resolve => setTimeout(resolve, 500));
        return trace;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Simulation Failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred during simulation.");
    }
};
