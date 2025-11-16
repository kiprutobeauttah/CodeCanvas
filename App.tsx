import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { generateExecutionTrace } from './services/geminiService';
import type { ExecutionStep, Theme, Language } from './types';
import { SunIcon, MoonIcon, PlayIcon, PauseIcon, StepBackIcon, StepForwardIcon, ZapIcon } from './components/icons';

const defaultCode = {
  python: `def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n-i-1):
            if arr[j] > arr[j+1]:
                arr[j], arr[j+1] = arr[j+1], arr[j]
    return arr

my_array = [64, 34, 25, 12, 22, 11, 90]
sorted_array = bubble_sort(my_array)
print(sorted_array)`,
  javascript: `function bubbleSort(arr) {
    const n = arr.length;
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
            }
        }
    }
    return arr;
}

let myArray = [64, 34, 25, 12, 22, 11, 90];
let sortedArray = bubbleSort(myArray);
console.log(sortedArray);`
};

// --- Helper Components (defined outside App to prevent re-creation on re-renders) ---

interface GradientCardProps {
  children: React.ReactNode;
  className?: string;
}

const GradientCard: React.FC<GradientCardProps> = ({ children, className = '' }) => (
  <div className={`relative p-px rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 ${className}`}>
    <div className="bg-slate-50 dark:bg-slate-900 rounded-[11px] h-full w-full p-4 sm:p-6">
      {children}
    </div>
  </div>
);

interface HeaderProps {
  theme: Theme;
  onThemeToggle: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  isLoading: boolean;
}

const Header: React.FC<HeaderProps> = ({ theme, onThemeToggle, language, onLanguageChange, isLoading }) => (
  <header className="flex items-center justify-between p-4">
    <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center">
            <ZapIcon className="w-5 h-5 text-white"/>
        </div>
        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
          CodeCanvas
        </h1>
    </div>
    <div className="flex items-center gap-4">
        <div className="flex items-center p-1 rounded-lg bg-slate-200 dark:bg-slate-800">
            <button onClick={() => onLanguageChange('python')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${language === 'python' ? 'bg-white dark:bg-slate-700 text-indigo-500' : 'text-slate-600 dark:text-slate-300'}`} disabled={isLoading}>Python</button>
            <button onClick={() => onLanguageChange('javascript')} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${language === 'javascript' ? 'bg-white dark:bg-slate-700 text-indigo-500' : 'text-slate-600 dark:text-slate-300'}`} disabled={isLoading}>JavaScript</button>
        </div>
        <button onClick={onThemeToggle} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
          {theme === 'light' ? <MoonIcon className="w-5 h-5 text-slate-700"/> : <SunIcon className="w-5 h-5 text-slate-300"/>}
        </button>
    </div>
  </header>
);

// --- Main App Component ---

export default function App() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [language, setLanguage] = useState<Language>('javascript');
  const [code, setCode] = useState<string>(defaultCode.javascript);
  const [executionTrace, setExecutionTrace] = useState<ExecutionStep[] | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(2); // steps per second
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [breakpoints, setBreakpoints] = useState<Set<number>>(new Set());

  const playIntervalRef = useRef<number | null>(null);
  const codeDisplayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);
  
  // Set initial language and code
  useEffect(()=> {
      handleLanguageChange('javascript');
  },[]);

  useEffect(() => {
    if (isPlaying && executionTrace) {
      playIntervalRef.current = window.setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= executionTrace.length - 1) {
            return prev;
          }
          const nextStep = executionTrace[prev + 1];
          if (breakpoints.has(nextStep.lineNumber)) {
            setIsPlaying(false);
          }
          return prev + 1;
        });
      }, 1000 / speed);
    } else if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
    }
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, executionTrace, speed, breakpoints]);
  
  useEffect(() => {
    if(executionTrace && currentStep >= executionTrace.length - 1) {
        setIsPlaying(false);
    }
  }, [currentStep, executionTrace]);

  useEffect(() => {
    const lineElement = codeDisplayRef.current?.querySelector(`[data-line-number="${executionTrace?.[currentStep]?.lineNumber}"]`);
    lineElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [currentStep, executionTrace]);


  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  
  const toggleBreakpoint = (lineNumber: number) => {
    setBreakpoints(prev => {
      const newBreakpoints = new Set(prev);
      if (newBreakpoints.has(lineNumber)) {
        newBreakpoints.delete(lineNumber);
      } else {
        newBreakpoints.add(lineNumber);
      }
      return newBreakpoints;
    });
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    setCode(defaultCode[lang]);
    setExecutionTrace(null);
    setCurrentStep(0);
    setError(null);
    setBreakpoints(new Set());
  }

  const handleVisualize = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setExecutionTrace(null);
    setCurrentStep(0);
    setIsPlaying(false);
    try {
      const trace = await generateExecutionTrace(code, language);
      setExecutionTrace(trace);
    } catch (e) {
        if (e instanceof Error) {
            setError(e.message);
        } else {
            setError('An unexpected error occurred.');
        }
    } finally {
      setIsLoading(false);
    }
  }, [code, language]);

  const handleStep = (direction: 'forward' | 'backward') => {
    if (!executionTrace) return;
    setIsPlaying(false);
    if (direction === 'forward') {
      setCurrentStep(prev => Math.min(prev + 1, executionTrace.length - 1));
    } else {
      setCurrentStep(prev => Math.max(prev - 1, 0));
    }
  };

  const currentExecutionStep = executionTrace?.[currentStep];
  const arrayVariables = currentExecutionStep ? Object.entries(currentExecutionStep.variables)
    .filter(([, value]) => Array.isArray(value) && value.every(item => typeof item === 'number'))
    : [];

  const codeLines = code.split('\n');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans transition-colors">
      <Header 
        theme={theme} 
        onThemeToggle={toggleTheme} 
        language={language}
        onLanguageChange={handleLanguageChange}
        isLoading={isLoading}
      />
      <main className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Panel: Code & Controls */}
        <div className="flex flex-col gap-4">
            <GradientCard className="flex-grow flex flex-col min-h-[400px]">
                <h2 className="text-lg font-semibold mb-3 text-slate-700 dark:text-slate-300">Code Editor</h2>
                 {executionTrace ? (
                    <div ref={codeDisplayRef} className="font-mono text-sm overflow-auto flex-grow bg-slate-100 dark:bg-slate-800/50 p-3 rounded-lg">
                        {codeLines.map((line, index) => {
                            const lineNumber = index + 1;
                            const hasBreakpoint = breakpoints.has(lineNumber);
                            const isCurrentLine = currentExecutionStep?.lineNumber === lineNumber;
                            return (
                                <div key={index} data-line-number={lineNumber} className={`flex transition-colors duration-300 rounded-md ${hasBreakpoint ? 'bg-red-500/10' : ''} ${isCurrentLine ? 'bg-indigo-500/20' : ''}`}>
                                    <div 
                                      className="flex items-center justify-end pr-4 text-slate-400 dark:text-slate-600 select-none w-12 cursor-pointer"
                                      onClick={() => toggleBreakpoint(lineNumber)}
                                      title={`Toggle breakpoint on line ${lineNumber}`}
                                    >
                                        {hasBreakpoint && <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />}
                                        <span className="w-4 text-right">{lineNumber}</span>
                                    </div>
                                    <pre className="whitespace-pre-wrap flex-1">{line}</pre>
                                </div>
                            );
                        })}
                    </div>
                 ) : (
                    <textarea
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="w-full h-full flex-grow p-3 bg-slate-100 dark:bg-slate-800/50 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        placeholder="Enter your code here..."
                        disabled={isLoading}
                    />
                 )}
            </GradientCard>
        </div>

        {/* Right Panel: Visualization & State */}
        <div className="flex flex-col gap-4">
            <GradientCard className="min-h-[300px] flex flex-col">
                <h2 className="text-lg font-semibold mb-3 text-slate-700 dark:text-slate-300">Visualization</h2>
                <div className="flex-grow flex items-center justify-center">
                  {isLoading ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 border-4 border-t-indigo-500 border-slate-200 dark:border-slate-700 rounded-full animate-spin"></div>
                      <p className="text-sm text-slate-500">Simulating code execution...</p>
                    </div>
                  ) : error ? (
                    <div className="text-center text-red-500 p-4 bg-red-500/10 rounded-lg">
                        <p className="font-semibold">Visualization Failed</p>
                        <p className="text-sm mt-1">{error}</p>
                    </div>
                  ) : executionTrace && arrayVariables.length > 0 ? (
                    <div className="w-full h-full min-h-[250px]">
                        {arrayVariables.map(([name, data]) => (
                            <div key={name}>
                                <h3 className="text-center font-mono text-sm mb-2">{name}</h3>
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={data.map((value, index) => ({ index, value }))} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                        <XAxis dataKey="index" tickLine={false} axisLine={false} />
                                        <YAxis tickLine={false} axisLine={false} />
                                        <Tooltip cursor={{fill: 'rgba(128, 128, 128, 0.1)'}} contentStyle={{ backgroundColor: theme === 'dark' ? '#334155' : '#fff', border: '1px solid #64748b' }} />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                          {data.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={ index % 2 === 0 ? '#818cf8' : '#a78bfa' } />
                                          ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ))}
                    </div>
                  ) : (
                    <div className="text-center text-slate-500">
                        <ZapIcon className="mx-auto w-12 h-12 mb-2 text-slate-400" />
                        <p className="font-semibold">Welcome to CodeCanvas</p>
                        <p className="text-sm">The default bubble sort example is ready. Click 'Visualize' to begin.</p>
                    </div>
                  )}
                </div>
            </GradientCard>
            <GradientCard>
                <h2 className="text-lg font-semibold mb-3 text-slate-700 dark:text-slate-300">Execution State</h2>
                <div className="min-h-[100px] flex flex-col">
                    <div className="bg-slate-100 dark:bg-slate-800/50 rounded-lg p-3 font-mono text-sm mb-4 flex-grow">
                        <p className="font-semibold text-indigo-400 mb-2">Description:</p>
                        <p>{currentExecutionStep?.description || 'Waiting for visualization...'}</p>

                        <p className="font-semibold text-purple-400 mt-3 mb-2">Variables:</p>
                        {currentExecutionStep && Object.keys(currentExecutionStep.variables).length > 0 ? (
                            <pre className="overflow-auto">{JSON.stringify(currentExecutionStep.variables, null, 2)}</pre>
                        ) : <p>No variables in scope.</p>}
                    </div>
                    {/* Controls */}
                    <div className="flex items-center justify-between gap-4 mt-2">
                      <div className="flex items-center gap-2">
                          <button onClick={() => handleStep('backward')} disabled={!executionTrace || currentStep === 0 || isLoading} className="p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                            <StepBackIcon className="w-5 h-5"/>
                          </button>
                          <button onClick={() => setIsPlaying(prev => !prev)} disabled={!executionTrace || isLoading || (executionTrace && currentStep === executionTrace.length - 1)} className="p-3 rounded-full bg-indigo-500 text-white hover:bg-indigo-600 transition-colors disabled:bg-indigo-500/50 disabled:cursor-not-allowed">
                            {isPlaying ? <PauseIcon className="w-5 h-5"/> : <PlayIcon className="w-5 h-5"/>}
                          </button>
                          <button onClick={() => handleStep('forward')} disabled={!executionTrace || currentStep === executionTrace.length - 1 || isLoading} className="p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                            <StepForwardIcon className="w-5 h-5"/>
                          </button>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                          <span>Speed</span>
                          <input type="range" min="1" max="10" value={speed} onChange={e => setSpeed(Number(e.target.value))} className="w-24 accent-indigo-500" disabled={!executionTrace || isLoading} />
                      </div>
                    </div>
                </div>
            </GradientCard>
        </div>
      </main>
      <div className="fixed bottom-4 right-4">
        <button onClick={handleVisualize} disabled={isLoading} className="relative inline-flex items-center justify-center p-0.5 mb-2 me-2 overflow-hidden text-sm font-medium text-gray-900 rounded-lg group bg-gradient-to-br from-purple-600 to-blue-500 group-hover:from-purple-600 group-hover:to-blue-500 hover:text-white dark:text-white focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 disabled:opacity-60 disabled:cursor-not-allowed">
            <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-white dark:bg-gray-900 rounded-md group-hover:bg-opacity-0">
                {isLoading ? 'Visualizing...' : 'Visualize Code'}
            </span>
        </button>
      </div>
    </div>
  );
}
