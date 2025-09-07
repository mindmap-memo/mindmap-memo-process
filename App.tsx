import React from 'react';

interface AppProps {
  title?: string;
}

const App: React.FC<AppProps> = ({ title = "React TypeScript App" }) => {
  const [count, setCount] = React.useState<number>(0);

  const handleIncrement = (): void => {
    setCount(prev => prev + 1);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>{title}</h1>
      <div>
        <p>Count: {count}</p>
        <button onClick={handleIncrement}>Increment</button>
      </div>
    </div>
  );
};

export default App;