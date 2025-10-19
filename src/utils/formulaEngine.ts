import { DataRegistry } from '../types';

export class FormulaEngine {
  private dataRegistry: DataRegistry;

  constructor(dataRegistry: DataRegistry) {
    this.dataRegistry = dataRegistry;
  }

  // Parse and evaluate formulas
  evaluateFormula(formula: string): any {
    try {
      // Remove = sign if present
      const cleanFormula = formula.startsWith('=') ? formula.slice(1) : formula;
      
      // Replace data references (@dataName) with actual values
      const processedFormula = this.replaceDataReferences(cleanFormula);
      
      // Handle built-in functions
      const result = this.evaluateBuiltinFunctions(processedFormula);
      
      return result;
    } catch (error) {
      console.error('Formula evaluation error:', error);
      return `#ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  private replaceDataReferences(formula: string): string {
    // Replace @dataName with actual values
    return formula.replace(/@([a-zA-Z가-힣_][a-zA-Z가-힣0-9_]*)/g, (match, dataName) => {
      const registryKey = dataName;
      if (this.dataRegistry[registryKey]) {
        const value = this.dataRegistry[registryKey].value;
        return typeof value === 'number' ? value.toString() : `"${value}"`;
      }
      return '0'; // Default to 0 if data not found
    });
  }

  private evaluateBuiltinFunctions(formula: string): any {
    // Handle SUM function
    if (formula.match(/SUM\s*\(/)) {
      return this.evaluateSumFunction(formula);
    }

    // Handle AVERAGE function
    if (formula.match(/AVERAGE\s*\(/)) {
      return this.evaluateAverageFunction(formula);
    }

    // Handle MAX function
    if (formula.match(/MAX\s*\(/)) {
      return this.evaluateMaxFunction(formula);
    }

    // Handle MIN function
    if (formula.match(/MIN\s*\(/)) {
      return this.evaluateMinFunction(formula);
    }

    // Handle COUNT_IF function
    if (formula.match(/COUNT_IF\s*\(/)) {
      return this.evaluateCountIfFunction(formula);
    }

    // Handle IF function
    if (formula.match(/IF\s*\(/)) {
      return this.evaluateIfFunction(formula);
    }

    // Handle PROGRESS function
    if (formula.match(/PROGRESS\s*\(/)) {
      return this.evaluateProgressFunction(formula);
    }

    // Handle STATUS function
    if (formula.match(/STATUS\s*\(/)) {
      return this.evaluateStatusFunction(formula);
    }

    // Handle DEADLINE function
    if (formula.match(/DEADLINE\s*\(/)) {
      return this.evaluateDeadlineFunction(formula);
    }

    // Handle WORKDAYS function
    if (formula.match(/WORKDAYS\s*\(/)) {
      return this.evaluateWorkdaysFunction(formula);
    }

    // Handle APPROVAL function
    if (formula.match(/APPROVAL\s*\(/)) {
      return this.evaluateApprovalFunction(formula);
    }

    // Handle LATEST function
    if (formula.match(/LATEST\s*\(/)) {
      return this.evaluateLatestFunction(formula);
    }

    // Handle PREVIOUS function
    if (formula.match(/PREVIOUS\s*\(/)) {
      return this.evaluatePreviousFunction(formula);
    }

    // Handle SUM_BY function
    if (formula.match(/SUM_BY\s*\(/)) {
      return this.evaluateSumByFunction(formula);
    }

    // For simple mathematical expressions, use eval (with safety checks)
    try {
      // Only allow safe mathematical expressions
      if (this.isSafeMathExpression(formula)) {
        return eval(formula);
      }
      return formula; // Return as-is if not a math expression
    } catch {
      return formula;
    }
  }

  private evaluateSumFunction(formula: string): number {
    const match = formula.match(/SUM\s*\((.*?)\)/);
    if (!match) return 0;

    const args = this.parseArguments(match[1]);
    return args.reduce((sum, arg) => sum + this.parseNumber(arg), 0);
  }

  private evaluateAverageFunction(formula: string): number {
    const match = formula.match(/AVERAGE\s*\((.*?)\)/);
    if (!match) return 0;

    const args = this.parseArguments(match[1]);
    const numbers = args.map(arg => this.parseNumber(arg));
    return numbers.length > 0 ? numbers.reduce((sum, num) => sum + num, 0) / numbers.length : 0;
  }

  private evaluateMaxFunction(formula: string): number {
    const match = formula.match(/MAX\s*\((.*?)\)/);
    if (!match) return 0;

    const args = this.parseArguments(match[1]);
    const numbers = args.map(arg => this.parseNumber(arg));
    return numbers.length > 0 ? Math.max(...numbers) : 0;
  }

  private evaluateMinFunction(formula: string): number {
    const match = formula.match(/MIN\s*\((.*?)\)/);
    if (!match) return 0;

    const args = this.parseArguments(match[1]);
    const numbers = args.map(arg => this.parseNumber(arg));
    return numbers.length > 0 ? Math.min(...numbers) : 0;
  }

  private evaluateCountIfFunction(formula: string): number {
    const match = formula.match(/COUNT_IF\s*\((.*?),\s*(.*?)\)/);
    if (!match) return 0;

    const range = match[1].trim();
    const condition = match[2].trim().replace(/['"]/g, '');
    
    // This is a simplified implementation
    // In a real system, you'd need to handle ranges and conditions more robustly
    return 0;
  }

  private evaluateIfFunction(formula: string): any {
    const match = formula.match(/IF\s*\((.*?),\s*(.*?),\s*(.*?)\)/);
    if (!match) return '';

    const condition = match[1].trim();
    const trueValue = match[2].trim().replace(/['"]/g, '');
    const falseValue = match[3].trim().replace(/['"]/g, '');

    try {
      const conditionResult = eval(condition);
      return conditionResult ? trueValue : falseValue;
    } catch {
      return falseValue;
    }
  }

  private evaluateProgressFunction(formula: string): string {
    const match = formula.match(/PROGRESS\s*\((.*?),\s*(.*?)\)/);
    if (!match) return '0%';

    const completed = this.parseNumber(match[1]);
    const total = this.parseNumber(match[2]);
    
    if (total === 0) return '0%';
    const percentage = Math.round((completed / total) * 100);
    return `${percentage}%`;
  }

  private evaluateStatusFunction(formula: string): string {
    const match = formula.match(/STATUS\s*\((.*?),\s*(.*?),\s*(.*?),\s*(.*?)\)/);
    if (!match) return '';

    const value = this.parseNumber(match[1]);
    const inProgressLabel = match[2].trim().replace(/['"]/g, '');
    const completedLabel = match[3].trim().replace(/['"]/g, '');
    const delayedLabel = match[4].trim().replace(/['"]/g, '');

    if (value >= 100) return completedLabel;
    if (value >= 80) return inProgressLabel;
    return delayedLabel;
  }

  private evaluateDeadlineFunction(formula: string): string {
    const match = formula.match(/DEADLINE\s*\((.*?),\s*(.*?)\)/);
    if (!match) return '';

    const startDateStr = match[1].trim().replace(/['"]/g, '');
    const daysToAdd = this.parseNumber(match[2]);

    try {
      let startDate: Date;
      if (startDateStr.toUpperCase() === 'TODAY()') {
        startDate = new Date();
      } else {
        startDate = new Date(startDateStr);
      }
      
      if (isNaN(startDate.getTime())) return '';
      
      const deadline = new Date(startDate.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
      return deadline.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }

  private evaluateWorkdaysFunction(formula: string): number {
    const match = formula.match(/WORKDAYS\s*\((.*?),\s*(.*?)\)/);
    if (!match) return 0;

    const startDateStr = match[1].trim().replace(/['"]/g, '');
    const endDateStr = match[2].trim().replace(/['"]/g, '');

    try {
      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;
      
      let workdays = 0;
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
          workdays++;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return workdays;
    } catch {
      return 0;
    }
  }

  private evaluateApprovalFunction(formula: string): string {
    const match = formula.match(/APPROVAL\s*\((.*?),\s*(.*?)\)/);
    if (!match) return '';

    const currentApprovals = this.parseNumber(match[1]);
    const requiredApprovals = this.parseNumber(match[2]);

    if (currentApprovals >= requiredApprovals) {
      return '승인완료';
    } else {
      return `${currentApprovals}/${requiredApprovals} 승인`;
    }
  }

  private evaluateLatestFunction(formula: string): any {
    const match = formula.match(/LATEST\s*\((.*?)\)/);
    if (!match) return '';

    const dataName = match[1].trim().replace(/['"@]/g, '');
    const dataInfo = this.dataRegistry[dataName];
    
    if (!dataInfo) return '';
    
    return dataInfo.value;
  }

  private evaluatePreviousFunction(formula: string): any {
    const match = formula.match(/PREVIOUS\s*\((.*?),\s*(.*?)\)/);
    if (!match) return '';

    const dataName = match[1].trim().replace(/['"@]/g, '');
    const daysAgo = this.parseNumber(match[2]);
    
    // This is a simplified implementation
    // In a real system, you'd need to track historical data
    const dataInfo = this.dataRegistry[dataName];
    if (!dataInfo) return '';
    
    // For now, just return the current value
    // In a full implementation, you'd look up historical data
    return dataInfo.value;
  }

  private evaluateSumByFunction(formula: string): number {
    const match = formula.match(/SUM_BY\s*\((.*?),\s*(.*?),\s*(.*?)\)/);
    if (!match) return 0;

    // This is a simplified implementation
    // In a real system, you'd need to handle ranges and conditions more robustly
    const valueRange = match[1].trim();
    const conditionRange = match[2].trim();
    const condition = match[3].trim().replace(/['"]/g, '');
    
    // For now, return 0 as this would require more complex range parsing
    return 0;
  }

  private parseArguments(argString: string): string[] {
    return argString.split(',').map(arg => arg.trim());
  }

  private parseNumber(value: string): number {
    // Remove quotes and try to parse as number
    const cleanValue = value.replace(/['"]/g, '');
    const number = parseFloat(cleanValue);
    return isNaN(number) ? 0 : number;
  }

  private isSafeMathExpression(expression: string): boolean {
    // Only allow numbers, operators, parentheses, and dots
    return /^[\d+\-*/.() ]+$/.test(expression);
  }

  // Get all data names referenced in a formula
  getDataDependencies(formula: string): string[] {
    const matches = formula.match(/@([a-zA-Z가-힣_][a-zA-Z가-힣0-9_]*)/g) || [];
    return matches.map(match => match.slice(1)); // Remove @ prefix
  }
}

// Helper functions for formula validation and processing
export const validateDataName = (name: string): boolean => {
  return /^[a-zA-Z가-힣_][a-zA-Z가-힣0-9_]*$/.test(name);
};

export const formatCellValue = (value: any, type: string, format?: string): string => {
  switch (type) {
    case 'number':
      if (typeof value === 'number') {
        if (format === 'currency') {
          return value.toLocaleString() + '원';
        }
        if (format === 'percentage') {
          return (value * 100).toFixed(1) + '%';
        }
        return value.toLocaleString();
      }
      return value?.toString() || '0';
    
    case 'date':
      if (value instanceof Date) {
        return format ? value.toLocaleDateString('ko-KR') : value.toISOString().split('T')[0];
      }
      return value?.toString() || '';
    
    case 'checkbox':
      return value ? '✓' : '☐';
    
    default:
      return value?.toString() || '';
  }
};