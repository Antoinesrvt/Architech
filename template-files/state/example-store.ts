import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface ExampleState {
  counter: number;
  text: string;
  
  // Actions
  increment: () => void;
  decrement: () => void;
  setText: (text: string) => void;
  reset: () => void;
}

export const useExampleStore = create<ExampleState>()(
  // First apply persist middleware
  persist(
    // Then apply immer middleware
    immer(
      (set) => ({
        counter: 0,
        text: '',
        
        increment: () => set((state) => { state.counter += 1 }),
        decrement: () => set((state) => { state.counter -= 1 }),
        setText: (text) => set((state) => { state.text = text }),
        reset: () => set({ counter: 0, text: '' }),
      }),
    ),
    {
      name: 'example-storage', // unique name for localStorage
    }
  )
); 