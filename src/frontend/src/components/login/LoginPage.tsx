import AddressPill from "../AddressPill";
import Button from "../ui/Button";
import ConnectButton from "./ConnectButton";
import LoginButton from "./LoginButton";
import { faWaveSquare, faChevronLeft } from "@fortawesome/free-solid-svg-icons";
import { isChainIdSupported } from "../../wagmi/is-chain-id-supported";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { useChainId } from "wagmi";
import { useEffect } from "react";
import { useSiwe } from "ic-siwe-js/react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface LoginPageProps {
  onLoginComplete?: () => void;
}

export default function LoginPage({ onLoginComplete }: LoginPageProps): React.ReactElement {
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { loginError, identity } = useSiwe();
  const isAuthenticated = !!identity;

  /**
   * Show an error toast if the login call fails.
   */
  useEffect(() => {
    if (loginError) {
      toast.error(loginError.message, {
        position: "bottom-right",
      });
    }
  }, [loginError]);

  /**
   * Return to main page after successful login
   */
  useEffect(() => {
    if (isAuthenticated && onLoginComplete) {
      onLoginComplete();
    }
  }, [isAuthenticated, onLoginComplete]);

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen p-4 bg-zinc-900 text-zinc-100">
      {/* Back button */}
      {onLoginComplete && (
        <button 
          onClick={onLoginComplete} 
          className="absolute flex items-center gap-2 p-2 text-sm top-4 left-4 text-zinc-400 hover:text-white"
        >
          <FontAwesomeIcon icon={faChevronLeft} />
          <span>Back</span>
        </button>
      )}
      
      <div className="flex items-center justify-center gap-5 md:gap-20 mb-8">
        <img alt="ic" className="w-16 h-16 md:w-24 md:h-24" src="/ic.svg" />
        <img alt="siwe" className="w-16 h-16 md:w-24 md:h-24" src="/siwe.svg" />
      </div>
      
      <div className="px-6 mb-10 text-xl font-bold text-center md:text-3xl">
        Sign In With Ethereum
      </div>
      
      <div className="w-80 md:w-96 border-zinc-700/50 border-[1px] bg-zinc-800 drop-shadow-xl rounded-2xl flex flex-col items-center py-5 px-5 mx-5">
        <div className="flex flex-col items-center w-full gap-8 p-6">
          <div className="flex items-center justify-center w-full gap-5">
            <div className="flex items-center justify-center w-8 h-8 text-lg font-bold rounded-full bg-zinc-300 text-zinc-800">
              1
            </div>
            <div className="flex-1">
              {!isConnected && <ConnectButton />}
              {isConnected && isChainIdSupported(chainId) && (
                <AddressPill
                  address={address}
                  className="justify-center w-full"
                />
              )}
              {isConnected && !isChainIdSupported(chainId) && (
                <Button disabled icon={faWaveSquare} variant="outline">
                  Unsupported Network
                </Button>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-center w-full gap-5">
            <div className="flex items-center justify-center w-8 h-8 text-lg font-bold rounded-full bg-zinc-300 text-zinc-800">
              2
            </div>
            <div className="flex-1">
              <LoginButton className="w-full" />
            </div>
          </div>
        </div>
      </div>
      
      <p className="mt-6 text-sm text-zinc-500">
        Connect your wallet and sign the message to verify ownership
      </p>
    </div>
  );
}
