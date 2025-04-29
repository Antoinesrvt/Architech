import { useState, useEffect } from 'react';
import { useFrameworkStore } from '@/lib/store/framework-store';
import { frameworkService } from '@/lib/api';

export function useFrameworkSelection() {
  const { frameworks, setFrameworks } = useFrameworkStore();
  const [selectedFrameworkId, setSelectedFrameworkId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>('web');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Get the selected framework
  const selectedFramework = selectedFrameworkId
    ? frameworks.find(f => f.id === selectedFrameworkId)
    : null;

  // Filter frameworks by type
  const frameworksByType = frameworks.filter(framework => framework.type === selectedType);

  // Load frameworks
  const loadFrameworks = async () => {
    if (frameworks.length > 0) return;

    setLoading(true);
    setError(null);

    try {
      const loadedFrameworks = await frameworkService.getFrameworks();
      setFrameworks(loadedFrameworks);
    } catch (err) {
      setError('Failed to load frameworks');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadFrameworks();
  }, []);

  // Select a framework
  const selectFramework = (frameworkId: string) => {
    setSelectedFrameworkId(frameworkId);
  };

  return {
    frameworks,
    frameworksByType,
    selectedFramework,
    selectedFrameworkId,
    selectedType,
    loading,
    error,
    setSelectedType,
    selectFramework,
    loadFrameworks,
  };
} 