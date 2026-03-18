'use client';
import { __awaiter } from "tslib";
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ConnectionProvider, useWallet, WalletProvider as WalletProviderWrapper, } from '@solana/wallet-adapter-react';
import { useWalletMultiButton } from '@solana/wallet-adapter-base-ui';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { TorusWalletAdapter, BitgetWalletAdapter, CloverWalletAdapter, Coin98WalletAdapter, FractalWalletAdapter, HyperPayWalletAdapter, KeystoneWalletAdapter, KrystalWalletAdapter, LedgerWalletAdapter, MathWalletAdapter, NightlyWalletAdapter, NufiWalletAdapter, OntoWalletAdapter, ParticleAdapter, PhantomWalletAdapter, SafePalWalletAdapter, SaifuWalletAdapter, SalmonWalletAdapter, SolflareWalletAdapter, TokenaryWalletAdapter, TrustWalletAdapter, XDEFIWalletAdapter, TokenPocketWalletAdapter, } from '@postiz/wallets';
import { WalletModalProvider, useWalletModal, } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
// Default styles that can be overridden by your app
import '@solana/wallet-adapter-react-ui/styles.css';
import { useFetch } from "../../../../../../libraries/helpers/src/utils/custom.fetch";
import { WalletUiProvider } from "./placeholder/wallet.ui.provider";
const WalletProvider = () => {
    const gotoLogin = useCallback((code) => __awaiter(void 0, void 0, void 0, function* () {
        window.location.href = `/auth?provider=FARCASTER&code=${code}`;
    }), []);
    return <ButtonCaster login={gotoLogin}/>;
};
export const ButtonCaster = (props) => {
    const network = WalletAdapterNetwork.Mainnet;
    // You can also provide a custom RPC endpoint.
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);
    const wallets = useMemo(() => [
        new TokenPocketWalletAdapter(),
        new TorusWalletAdapter(),
        new BitgetWalletAdapter(),
        new CloverWalletAdapter(),
        new Coin98WalletAdapter(),
        new FractalWalletAdapter(),
        new HyperPayWalletAdapter(),
        new KeystoneWalletAdapter(),
        new KrystalWalletAdapter(),
        new LedgerWalletAdapter(),
        new MathWalletAdapter(),
        new NightlyWalletAdapter(),
        new NufiWalletAdapter(),
        new OntoWalletAdapter(),
        new ParticleAdapter(),
        new PhantomWalletAdapter(),
        new SafePalWalletAdapter(),
        new SaifuWalletAdapter(),
        new SalmonWalletAdapter(),
        new SolflareWalletAdapter(),
        new TokenaryWalletAdapter(),
        new TrustWalletAdapter(),
        new XDEFIWalletAdapter(),
    ], 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [network]);
    return (<ConnectionProvider endpoint={endpoint}>
      <WalletProviderWrapper wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          <DisabledAutoConnect />
        </WalletModalProvider>
      </WalletProviderWrapper>
    </ConnectionProvider>);
};
const DisabledAutoConnect = () => {
    const [connect, setConnect] = useState(false);
    const wallet = useWallet();
    const toConnect = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        try {
            wallet.select(null);
        }
        catch (err) {
            /** empty */
        }
        try {
            yield wallet.disconnect();
        }
        catch (err) {
            /** empty */
        }
        setConnect(true);
    }), []);
    useEffect(() => {
        toConnect();
    }, []);
    if (connect) {
        return <InnerWallet />;
    }
    return <WalletUiProvider />;
};
const InnerWallet = () => {
    const walletModal = useWalletModal();
    const wallet = useWallet();
    const fetch = useFetch();
    const { buttonState } = useWalletMultiButton({
        onSelectWallet: () => {
            return;
        },
    });
    const connect = useCallback(() => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c;
        if (buttonState !== 'connected') {
            return;
        }
        try {
            const challenge = yield (yield fetch(`/auth/oauth/WALLET?publicKey=${(_a = wallet === null || wallet === void 0 ? void 0 : wallet.publicKey) === null || _a === void 0 ? void 0 : _a.toString()}`)).text();
            const encoded = new TextEncoder().encode(challenge);
            const signed = yield ((_b = wallet === null || wallet === void 0 ? void 0 : wallet.signMessage) === null || _b === void 0 ? void 0 : _b.call(wallet, encoded));
            const info = Buffer.from(JSON.stringify({
                // @ts-ignore
                signature: Buffer.from(signed).toString('hex'),
                challenge,
                publicKey: (_c = wallet === null || wallet === void 0 ? void 0 : wallet.publicKey) === null || _c === void 0 ? void 0 : _c.toString(),
            })).toString('base64');
            window.location.href = `/auth?provider=WALLET&code=${info}`;
        }
        catch (err) {
            walletModal.setVisible(false);
            wallet.select(null);
            wallet.disconnect().catch(() => {
                /** empty */
            });
        }
    }), [wallet, buttonState]);
    useEffect(() => {
        if (buttonState === 'has-wallet') {
            wallet
                .connect()
                .then(() => {
                /** empty */
            })
                .catch(() => {
                wallet.select(null);
                wallet.disconnect();
            });
        }
        if (buttonState === 'connected') {
            connect();
        }
    }, [buttonState]);
    return (<div onClick={() => walletModal.setVisible(true)} className="flex-1">
      <WalletUiProvider />
    </div>);
};
export default WalletProvider;
//# sourceMappingURL=wallet.provider.js.map