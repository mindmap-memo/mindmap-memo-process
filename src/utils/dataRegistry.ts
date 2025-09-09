import { DataRegistry, CellReference } from '../types';

export class DataRegistryManager {
  private dataRegistry: DataRegistry;
  private updateCallbacks: Set<() => void> = new Set();

  constructor(initialRegistry: DataRegistry = {}) {
    this.dataRegistry = initialRegistry;
  }

  // Register a named data point
  registerData(
    dataName: string,
    value: any,
    source: CellReference,
    type: string = 'text'
  ): void {
    const previousDependents = this.dataRegistry[dataName]?.dependents || [];
    
    this.dataRegistry[dataName] = {
      value,
      source,
      type,
      lastUpdated: new Date(),
      dependents: previousDependents
    };

    // Trigger updates for dependent cells
    this.notifyDependents(dataName);
    this.notifyUpdateCallbacks();
  }

  // Update existing data
  updateData(dataName: string, newValue: any): void {
    if (this.dataRegistry[dataName]) {
      this.dataRegistry[dataName].value = newValue;
      this.dataRegistry[dataName].lastUpdated = new Date();
      
      // Trigger updates for dependent cells
      this.notifyDependents(dataName);
      this.notifyUpdateCallbacks();
    }
  }

  // Get data value by name
  getData(dataName: string): any {
    return this.dataRegistry[dataName]?.value;
  }

  // Get data metadata
  getDataInfo(dataName: string) {
    return this.dataRegistry[dataName];
  }

  // Remove data
  removeData(dataName: string): void {
    if (this.dataRegistry[dataName]) {
      // Remove this data from dependents of other data
      Object.keys(this.dataRegistry).forEach(otherDataName => {
        if (otherDataName !== dataName) {
          const dependents = this.dataRegistry[otherDataName].dependents;
          const index = dependents.indexOf(dataName);
          if (index > -1) {
            dependents.splice(index, 1);
          }
        }
      });
      
      delete this.dataRegistry[dataName];
      this.notifyUpdateCallbacks();
    }
  }

  // Add dependency relationship
  addDependency(sourceDataName: string, dependentDataName: string): void {
    if (this.dataRegistry[sourceDataName]) {
      const dependents = this.dataRegistry[sourceDataName].dependents;
      if (!dependents.includes(dependentDataName)) {
        dependents.push(dependentDataName);
      }
    }
  }

  // Remove dependency relationship
  removeDependency(sourceDataName: string, dependentDataName: string): void {
    if (this.dataRegistry[sourceDataName]) {
      const dependents = this.dataRegistry[sourceDataName].dependents;
      const index = dependents.indexOf(dependentDataName);
      if (index > -1) {
        dependents.splice(index, 1);
      }
    }
  }

  // Get all data names
  getAllDataNames(): string[] {
    return Object.keys(this.dataRegistry);
  }

  // Get data names that match a pattern (for autocomplete)
  searchDataNames(pattern: string): string[] {
    const lowerPattern = pattern.toLowerCase();
    return Object.keys(this.dataRegistry).filter(name => 
      name.toLowerCase().includes(lowerPattern)
    );
  }

  // Get the full registry (for serialization)
  getRegistry(): DataRegistry {
    return { ...this.dataRegistry };
  }

  // Set the full registry (for deserialization)
  setRegistry(registry: DataRegistry): void {
    this.dataRegistry = registry;
    this.notifyUpdateCallbacks();
  }

  // Subscribe to registry updates
  subscribe(callback: () => void): () => void {
    this.updateCallbacks.add(callback);
    return () => {
      this.updateCallbacks.delete(callback);
    };
  }

  private notifyDependents(dataName: string): void {
    const dependents = this.dataRegistry[dataName]?.dependents || [];
    
    // For now, we'll just mark that dependents need update
    // In a full implementation, this would trigger re-calculation of dependent formulas
    dependents.forEach(dependentName => {
      console.log(`Data ${dependentName} needs update due to change in ${dataName}`);
    });
  }

  private notifyUpdateCallbacks(): void {
    this.updateCallbacks.forEach(callback => callback());
  }

  // Detect circular dependencies
  detectCircularDependency(dataName: string, dependencies: string[]): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCircularDep = (current: string): boolean => {
      if (recursionStack.has(current)) {
        return true; // Circular dependency detected
      }
      
      if (visited.has(current)) {
        return false;
      }

      visited.add(current);
      recursionStack.add(current);

      const currentDeps = this.dataRegistry[current]?.dependents || [];
      for (const dep of currentDeps) {
        if (hasCircularDep(dep)) {
          return true;
        }
      }

      recursionStack.delete(current);
      return false;
    };

    // Check if adding these dependencies would create a circular dependency
    for (const dep of dependencies) {
      if (hasCircularDep(dep)) {
        return true;
      }
    }

    return false;
  }

  // Get dependency tree for a data point
  getDependencyTree(dataName: string): any {
    const buildTree = (name: string, visited: Set<string>): any => {
      if (visited.has(name)) {
        return { name, circular: true };
      }

      visited.add(name);
      const data = this.dataRegistry[name];
      
      if (!data) {
        return { name, value: null, dependents: [] };
      }

      return {
        name,
        value: data.value,
        type: data.type,
        lastUpdated: data.lastUpdated,
        dependents: data.dependents.map(dep => buildTree(dep, new Set(visited)))
      };
    };

    return buildTree(dataName, new Set());
  }
}

// Singleton instance for global use
export const globalDataRegistry = new DataRegistryManager();