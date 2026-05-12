"use client";
import React, { useEffect, useState } from "react";
import { getKernelClient } from "@/lib/zerodev";
import { encodeFunctionData } from "viem";

export default function SignPage() {
    const [txData, setTxData] = useState<any>(null);
    const [status, setStatus] = useState("Waiting for transaction data...");
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        fetch("/api/user/profile")
            .then(res => res.json())
            .then(data => {
                // The API returns the user object directly, not wrapped in { success, user }
                if (data && data.username) {
                    setProfile(data);
                } else {
                    setStatus("Please log in first.");
                }
            })
            .catch(e => {
                console.error("Profile fetch error:", e);
                setStatus("Error loading profile");
            });

        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === "SIGN_TX") {
                setTxData(event.data.payload);
                setStatus("Ready to sign");
            }
        };
        window.addEventListener("message", handleMessage);

        if (window.opener) {
            window.opener.postMessage({ type: "SIGNER_READY" }, "*");
        }

        return () => window.removeEventListener("message", handleMessage);
    }, []);

    const handleSign = async () => {
        if (!profile?.username || !txData) return;
        try {
            setStatus("Initializing Passkey...");
            const kernel = await getKernelClient({ username: profile.username });
            if (!kernel) throw new Error("Failed to init Kernel");

            setStatus("Please authenticate with FaceID/TouchID...");
            
            let data = txData.data;
            if (txData.abi && txData.functionName) {
                data = encodeFunctionData({
                    abi: txData.abi,
                    functionName: txData.functionName,
                    args: txData.args
                });
            }

            const txHash = await kernel.client.sendTransaction({
                to: txData.to,
                value: txData.value ? BigInt(txData.value) : BigInt(0),
                data: data || "0x",
            });

            setStatus("Transaction sent! You can close this window.");
            if (window.opener) {
                window.opener.postMessage({ type: "TX_SUCCESS", hash: txHash }, "*");
            }
            setTimeout(() => window.close(), 1500);
        } catch (e: any) {
            console.error(e);
            setStatus(`Error: ${e.message}`);
            if (window.opener) {
                window.opener.postMessage({ type: "TX_ERROR", error: e.message }, "*");
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#050a09] text-white flex flex-col items-center justify-center p-6" style={{ fontFamily: "Space Grotesk, sans-serif" }}>
            <div className="w-full max-w-md bg-[#0f1413] border border-[#00FF88]/20 p-6 shadow-[0_0_40px_rgba(0,255,136,0.1)] text-center">
                <h1 className="font-semibold text-xl text-[#00FF88] uppercase tracking-widest mb-4" style={{ fontFamily: "Cinzel, serif" }}>Confirm Transaction</h1>
                
                <p className="text-sm text-gray-400 mb-6">{status}</p>

                {txData && profile && (
                    <div className="mb-6 bg-black/50 p-4 border border-white/5 text-left text-xs text-gray-300 break-all overflow-auto max-h-32">
                        <p className="text-[#00D4FF] mb-2 uppercase tracking-wider font-bold">Details</p>
                        <p><strong>To:</strong> {txData.to}</p>
                        {txData.functionName && <p><strong>Method:</strong> {txData.functionName}</p>}
                    </div>
                )}

                <button 
                    onClick={handleSign}
                    disabled={!txData || !profile?.username || status.includes("Wait") || status.includes("Initializ")}
                    className="w-full py-4 bg-[#00FF88]/10 text-[#00FF88] border border-[#00FF88]/40 uppercase tracking-[0.2em] font-bold text-sm hover:bg-[#00FF88] hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Sign & Send
                </button>
            </div>
        </div>
    );
}
