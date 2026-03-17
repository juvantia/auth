'use client';

import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { User, Camera, Check, Loader2 } from 'lucide-react';

interface OnboardingFormProps {
    onComplete: (data: any) => void;
}

export default function OnboardingForm({ onComplete }: OnboardingFormProps) {
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [image, setImage] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);

    const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const reader = new FileReader();
            reader.addEventListener('load', () => setImage(reader.result as string));
            reader.readAsDataURL(e.target.files[0]);
            setStep(2);
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            onComplete({ name, username, avatar_url: '/placeholder.png' });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-2 text-center">Welcome to Juvantia</h2>
            <p className="text-zinc-500 text-center mb-8">Let's set up your profile</p>

            {step === 1 ? (
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Display Name</label>
                        <input 
                            type="text" 
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all"
                            placeholder="John Doe"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Username</label>
                        <input 
                            type="text" 
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all"
                            placeholder="johndoe"
                        />
                    </div>
                    <div className="relative group cursor-pointer">
                        <input 
                            type="file" 
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="w-full py-12 border-2 border-dashed border-zinc-800 rounded-xl flex flex-col items-center justify-center group-hover:border-blue-500 transition-all">
                            <Camera className="w-8 h-8 text-zinc-500 mb-2 group-hover:text-blue-500" />
                            <p className="text-sm text-zinc-500 group-hover:text-blue-500">Upload Avatar</p>
                        </div>
                    </div>
                    <button 
                        disabled={!name || !username}
                        onClick={() => setStep(2)}
                        className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all disabled:opacity-50"
                    >
                        Continue
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="relative h-64 bg-black rounded-xl overflow-hidden">
                        {image && (
                            <Cropper
                                image={image}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                            />
                        )}
                    </div>
                    <div className="space-y-2">
                        <input 
                            type="range" 
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="w-full accent-blue-500"
                        />
                    </div>
                    <button 
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-all flex items-center justify-center"
                    >
                        {loading ? <Loader2 className="animate-spin mr-2" /> : <Check className="mr-2" />}
                        Complete Profile
                    </button>
                    <button onClick={() => setStep(1)} className="w-full text-zinc-500 text-sm hover:text-white transition-colors">Back</button>
                </div>
            )}
        </div>
    );
}
