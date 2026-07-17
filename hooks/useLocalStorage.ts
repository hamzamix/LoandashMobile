// Fix: Import React to provide the React namespace for types like React.Dispatch.
import React, { useState, useEffect } from 'react';

function useLocalStorage<T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;
      const parsed = JSON.parse(item);
      if (Array.isArray(initialValue) && !Array.isArray(parsed)) return initialValue;
      return parsed;
    } catch (error) {
      console.error(`Failed to load "${key}" from localStorage:`, error);
      return initialValue;
    }
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Failed to save "${key}" to localStorage:`, error);
    }
  };
  
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        if (Array.isArray(initialValue) && !Array.isArray(parsed)) {
          setStoredValue(initialValue);
        } else {
          setStoredValue(parsed);
        }
      }
    } catch (error) {
        console.error(`Failed to parse localStorage key "${key}":`, error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);


  return [storedValue, setValue];
}

export default useLocalStorage;