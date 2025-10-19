import React, { useState } from 'react';

interface FormulaHelperProps {
  onInsertFormula: (formula: string) => void;
}

const FormulaHelper: React.FC<FormulaHelperProps> = ({ onInsertFormula }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('basic');

  const formulaCategories = {
    basic: {
      name: '기본 수학',
      formulas: [
        { name: 'SUM', syntax: 'SUM(@데이터1, @데이터2, ...)', desc: '합계 계산' },
        { name: 'AVERAGE', syntax: 'AVERAGE(@데이터1, @데이터2, ...)', desc: '평균 계산' },
        { name: 'MAX', syntax: 'MAX(@데이터1, @데이터2, ...)', desc: '최대값' },
        { name: 'MIN', syntax: 'MIN(@데이터1, @데이터2, ...)', desc: '최소값' },
      ]
    },
    process: {
      name: '프로세스',
      formulas: [
        { name: 'PROGRESS', syntax: 'PROGRESS(@완료수, @전체수)', desc: '진행률 (%)' },
        { name: 'STATUS', syntax: 'STATUS(@진행률, "진행중", "완료", "지연")', desc: '상태 판정' },
        { name: 'DEADLINE', syntax: 'DEADLINE("2024-01-01", 30)', desc: '마감일 계산' },
        { name: 'WORKDAYS', syntax: 'WORKDAYS("2024-01-01", "2024-01-31")', desc: '업무일 계산' },
        { name: 'APPROVAL', syntax: 'APPROVAL(@현재승인수, @필요승인수)', desc: '승인 상태' },
      ]
    },
    data: {
      name: '데이터 참조',
      formulas: [
        { name: 'LATEST', syntax: 'LATEST(@데이터명)', desc: '최신 데이터값' },
        { name: 'PREVIOUS', syntax: 'PREVIOUS(@데이터명, 7)', desc: '이전 데이터값' },
        { name: 'SUM_BY', syntax: 'SUM_BY(@금액범위, @부서범위, "개발팀")', desc: '조건부 합계' },
      ]
    },
    logic: {
      name: '조건 로직',
      formulas: [
        { name: 'IF', syntax: 'IF(@값 > 100, "높음", "낮음")', desc: '조건부 값' },
        { name: 'COUNT_IF', syntax: 'COUNT_IF(@범위, "완료")', desc: '조건부 개수' },
      ]
    }
  };

  const handleFormulaClick = (syntax: string) => {
    onInsertFormula(syntax);
  };

  return (
    <div style={{
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      backgroundColor: 'white',
      border: '1px solid #ccc',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 1000,
      maxHeight: '400px',
      overflow: 'hidden',
      display: 'flex'
    }}>
      {/* Category tabs */}
      <div style={{
        width: '120px',
        borderRight: '1px solid #eee',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{
          padding: '8px 12px',
          fontSize: '12px',
          fontWeight: 'bold',
          color: '#666',
          borderBottom: '1px solid #eee'
        }}>
          함수 카테고리
        </div>
        {Object.entries(formulaCategories).map(([key, category]) => (
          <div
            key={key}
            style={{
              padding: '8px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              backgroundColor: selectedCategory === key ? '#007bff' : 'transparent',
              color: selectedCategory === key ? 'white' : '#333'
            }}
            onClick={() => setSelectedCategory(key)}
          >
            {category.name}
          </div>
        ))}
      </div>

      {/* Formula list */}
      <div style={{ flex: 1, maxHeight: '400px', overflowY: 'auto' }}>
        <div style={{
          padding: '8px 12px',
          fontSize: '12px',
          fontWeight: 'bold',
          color: '#666',
          borderBottom: '1px solid #eee',
          backgroundColor: '#f8f9fa'
        }}>
          {formulaCategories[selectedCategory as keyof typeof formulaCategories].name} 함수
        </div>
        
        {formulaCategories[selectedCategory as keyof typeof formulaCategories].formulas.map((formula, index) => (
          <div
            key={index}
            style={{
              padding: '12px',
              borderBottom: '1px solid #f0f0f0',
              cursor: 'pointer'
            }}
            onClick={() => handleFormulaClick(formula.syntax)}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = '#f5f5f5';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'white';
            }}
          >
            <div style={{
              fontWeight: 'bold',
              fontSize: '13px',
              marginBottom: '4px',
              color: '#007bff'
            }}>
              {formula.name}
            </div>
            <div style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              backgroundColor: '#f8f9fa',
              padding: '4px 6px',
              borderRadius: '3px',
              marginBottom: '4px',
              color: '#666'
            }}>
              {formula.syntax}
            </div>
            <div style={{
              fontSize: '11px',
              color: '#666'
            }}>
              {formula.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FormulaHelper;