// Type declarations for Tauri API modules
declare module '@tauri-apps/api/tauri' {
  export function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
}

declare module '@tauri-apps/plugin-dialog' {
  export interface OpenDialogOptions {
    directory?: boolean;
    multiple?: boolean;
    defaultPath?: string;
    title?: string;
    filters?: {
      name: string;
      extensions: string[];
    }[];
  }
  export function open(options?: OpenDialogOptions): Promise<string | string[] | null>;
  export function save(options?: OpenDialogOptions): Promise<string | null>;
}

declare module '@tauri-apps/plugin-shell' {
  export interface CommandOptions {
    cwd?: string;
    env?: Record<string, string>;
  }
  
  export interface SpawnOptions extends CommandOptions {
    stdout?: (line: string) => void;
    stderr?: (line: string) => void;
  }
  
  export interface Child<T> {
    code: number;
    signal: number | null;
    stdout: T;
    stderr: T;
  }
  
  export interface CommandChild {
    on(event: 'close', callback: (code: number | null) => void): void;
    stdout: { on(event: 'data', callback: (line: string) => void): void };
    stderr: { on(event: 'data', callback: (line: string) => void): void };
    write(data: string): void;
    kill(): Promise<void>;
  }
  
  export class Command<O = string> {
    static sidecar<O = string>(
      program: string,
      args?: string[],
      options?: CommandOptions
    ): Command<O>;
    
    static create<O = string>(
      program: string,
      args?: string[],
      options?: CommandOptions
    ): Command<O>;
    
    constructor(program: string, args?: string[], options?: CommandOptions);
    spawn(): Promise<CommandChild>;
    execute(): Promise<Child<O>>;
  }
  
  export function open(path: string): Promise<void>;
}

declare module '@tauri-apps/api/event' {
  export interface Event<T = unknown> {
    event: string;
    windowLabel: string;
    payload: T;
  }
  export type EventCallback<T = unknown> = (event: Event<T>) => void;
  export type UnlistenFn = () => void;
  
  export function emit(event: string, payload?: unknown): Promise<void>;
  export function listen<T>(event: string, callback: EventCallback<T>): Promise<UnlistenFn>;
  export function once<T>(event: string, callback: EventCallback<T>): Promise<UnlistenFn>;
} 