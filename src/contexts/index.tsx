import React, { ReactNode, useMemo } from 'react';
import { AppStateProvider, AppStateContextType } from './AppStateContext';
import { SelectionProvider, SelectionContextType } from './SelectionContext';
import { PanelProvider, PanelContextType } from './PanelContext';
import { ConnectionProvider, ConnectionContextType } from './ConnectionContext';
import { QuickNavProvider, QuickNavContextType } from './QuickNavContext';

// 모든 Context를 통합한 Provider Props
interface AppProvidersProps {
  children: ReactNode;
  appState: AppStateContextType;
  selection: SelectionContextType;
  panel: PanelContextType;
  connection: ConnectionContextType;
  quickNav: QuickNavContextType;
}

/**
 * 애플리케이션의 모든 Context Provider를 통합한 컴포넌트
 * Context를 여러 개로 분리하여 관심사를 명확하게 구분하고,
 * 하위 컴포넌트에서 필요한 Context만 구독할 수 있도록 함
 */
export const AppProviders: React.FC<AppProvidersProps> = ({
  children,
  appState,
  selection,
  panel,
  connection,
  quickNav
}) => {
  return (
    <AppStateProvider value={appState}>
      <SelectionProvider value={selection}>
        <PanelProvider value={panel}>
          <ConnectionProvider value={connection}>
            <QuickNavProvider value={quickNav}>
              {children}
            </QuickNavProvider>
          </ConnectionProvider>
        </PanelProvider>
      </SelectionProvider>
    </AppStateProvider>
  );
};

// Context Hooks를 re-export
export { useAppStateContext } from './AppStateContext';
export { useSelection } from './SelectionContext';
export { usePanel } from './PanelContext';
export { useConnection } from './ConnectionContext';
export { useQuickNav } from './QuickNavContext';

// Context Types를 re-export
export type { AppStateContextType } from './AppStateContext';
export type { SelectionContextType } from './SelectionContext';
export type { PanelContextType } from './PanelContext';
export type { ConnectionContextType } from './ConnectionContext';
export type { QuickNavContextType } from './QuickNavContext';
