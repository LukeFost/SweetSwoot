import { ReactNode } from 'react';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'viem/chains';

interface AppOnchainKitProviderProps {
  children: ReactNode;
}

export function AppOnchainKitProvider({ children }: AppOnchainKitProviderProps) {
  return (
    <OnchainKitProvider
      apiKey={import.meta.env.VITE_PUBLIC_ONCHAINKIT_API_KEY}
      chain={base}
      projectId={import.meta.env.VITE_PUBLIC_CDP_PROJECT_ID}
      config={{
        appearance: {
          name: 'ShawtyFormVideo',
          mode: 'auto',
          theme: 'default',
        },
      }}
    >
      {children}
    </OnchainKitProvider>
  );
}