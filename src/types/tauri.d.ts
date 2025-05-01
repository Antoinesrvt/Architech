// Type declarations for Tauri API modules
declare module '@tauri-apps/api' {
  export * as clipboard from '@tauri-apps/api/clipboard';
  export * as dialog from '@tauri-apps/api/dialog';
  export * as event from '@tauri-apps/api/event';
  export * as fs from '@tauri-apps/api/fs';
  export * as http from '@tauri-apps/api/http';
  export * as os from '@tauri-apps/api/os';
  export * as path from '@tauri-apps/api/path';
  export * as process from '@tauri-apps/api/process';
  export * as shell from '@tauri-apps/api/shell';
  export * as tauri from '@tauri-apps/api/tauri';
  export * as window from '@tauri-apps/api/window';
}

declare module '@tauri-apps/api/tauri' {
  export function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T>;
}

declare module '@tauri-apps/api/clipboard' {
  export function writeText(text: string): Promise<void>;
  export function readText(): Promise<string>;
}

declare module '@tauri-apps/api/dialog' {
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

declare module '@tauri-apps/api/fs' {
  export enum BaseDirectory {
    Audio = 1,
    Cache = 2,
    Config = 3,
    Data = 4,
    LocalData = 5,
    Desktop = 6,
    Document = 7,
    Download = 8,
    Executable = 9,
    Font = 10,
    Home = 11,
    Picture = 12,
    Public = 13,
    Runtime = 14,
    Template = 15,
    Video = 16,
    Resource = 17,
    App = 18,
    Log = 19,
    Temp = 20,
    AppConfig = 21,
    AppData = 22,
    AppLocalData = 23,
    AppCache = 24,
    AppLog = 25
  }
  
  export function readTextFile(path: string, options?: { dir?: BaseDirectory }): Promise<string>;
  export function writeTextFile(path: string, contents: string, options?: { dir?: BaseDirectory }): Promise<void>;
  export function readBinaryFile(path: string, options?: { dir?: BaseDirectory }): Promise<Uint8Array>;
  export function writeBinaryFile(path: string, contents: Uint8Array, options?: { dir?: BaseDirectory }): Promise<void>;
}

declare module '@tauri-apps/api/shell' {
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