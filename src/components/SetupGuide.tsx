import React from 'react';
import { X, Smartphone, Shield, Download, CheckCircle2, Copy, ExternalLink, QrCode } from 'lucide-react';
import { motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';

export default function SetupGuide({ onClose, pairingCode }: { onClose: () => void, pairingCode: string }) {
  // ⚠️ IMPORTANT: Replace this URL with your actual hosted APK link (e.g., from Firebase Storage)
  // এখানে আপনার আসল APK ডাউনলোড লিঙ্কটি দিন (যেমন: ফায়ারবেস স্টোরেজ লিঙ্ক)
  const downloadUrl = "https://your-firebase-storage-link.com/sentinel-child.apk";
  
  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // This is a simulation. In a real app, window.location.href = downloadUrl will work.
    // এটি একটি ডেমো। আসল অ্যাপে নিচের লিঙ্কটি কাজ করবে।
    if (downloadUrl.includes("your-firebase-storage-link")) {
      const link = document.createElement('a');
      link.href = 'data:application/vnd.android.package-archive;base64,UEsDBBQAAAAIA...'; // Dummy base64
      link.download = 'sentinel-child.apk';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      alert('Demo: Sentinel Child APK download started! \n\nTo make this real: \n1. Upload your APK to Firebase Storage \n2. Replace the URL in SetupGuide.tsx');
    } else {
      window.open(downloadUrl, '_blank');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-deep/80 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-bg-surface border border-border-dim rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-border-dim flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent-blue/10 rounded-lg border border-accent-blue/20">
              <Smartphone className="w-5 h-5 text-accent-blue" />
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight">Device Pairing Protocol</h2>
              <p className="text-[10px] text-accent-blue font-bold uppercase tracking-widest">ডিভাইস পেয়ারিং নির্দেশিকা</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-text-dim" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10">
          {/* Step 1: Pairing Code */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent-blue text-bg-deep flex items-center justify-center font-black text-xs">01</div>
              <div>
                <h3 className="font-black uppercase tracking-widest text-sm text-accent-blue">Your Pairing Code</h3>
                <p className="text-[9px] text-text-dim font-bold uppercase tracking-widest">আপনার ৬ সংখ্যার পেয়ারিং কোড</p>
              </div>
            </div>
            <div className="pl-11 space-y-3">
              <p className="text-sm text-text-dim leading-relaxed">
                This is your unique 6-digit pairing code. Enter this on your child's phone to link it.
                <br />
                <span className="text-xs opacity-60">এটি আপনার ৬ সংখ্যার ইউনিক কোড। সন্তানের ফোনে এটি দিয়ে কানেক্ট করতে হবে।</span>
              </p>
              <div className="flex items-center justify-center gap-4 p-6 bg-bg-deep rounded-2xl border border-border-dim group">
                {pairingCode.split('').map((digit, idx) => (
                  <div key={idx} className="w-12 h-14 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-2xl font-black text-accent-blue shadow-glow-blue">
                    {digit}
                  </div>
                ))}
                <button 
                  onClick={() => copyToClipboard(pairingCode)}
                  className="ml-4 p-3 hover:bg-white/5 rounded-xl text-text-dim hover:text-accent-blue transition-all"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>
            </div>
          </section>

          {/* Step 2: QR Code Download */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent-blue text-bg-deep flex items-center justify-center font-black text-xs">02</div>
              <div>
                <h3 className="font-black uppercase tracking-widest text-sm text-accent-blue">Download Child App</h3>
                <p className="text-[9px] text-text-dim font-bold uppercase tracking-widest">সন্তানের ফোনে অ্যাপ ডাউনলোড</p>
              </div>
            </div>
            <div className="pl-11 flex flex-col md:flex-row gap-8 items-center">
              <div className="p-4 bg-white rounded-2xl border-4 border-accent-blue/20 shadow-glow-blue">
                <QRCodeSVG value={downloadUrl} size={150} />
              </div>
              <div className="space-y-4 flex-1 text-center md:text-left">
                <p className="text-xs text-text-dim leading-relaxed">
                  Scan this QR code with your child's phone camera to download the **Sentinel Child** app instantly.
                  <br />
                  <span className="opacity-60">সন্তানের ফোনের ক্যামেরা দিয়ে এই QR কোডটি স্ক্যান করে অ্যাপটি ডাউনলোড করুন।</span>
                </p>
                <a 
                  href={downloadUrl}
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-accent-blue/10 border border-accent-blue/30 rounded-xl text-xs font-black text-accent-blue uppercase tracking-widest hover:bg-accent-blue hover:text-bg-deep transition-all"
                >
                  <Download className="w-4 h-4" />
                  Direct Download Link
                </a>
              </div>
            </div>
          </section>

          {/* Step 3: Installation & Linking */}
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent-blue text-bg-deep flex items-center justify-center font-black text-xs">03</div>
              <div>
                <h3 className="font-black uppercase tracking-widest text-sm text-accent-blue">Final Linkage</h3>
                <p className="text-[9px] text-text-dim font-bold uppercase tracking-widest">কানেকশন সম্পন্ন করুন</p>
              </div>
            </div>
            <div className="pl-11 space-y-4">
              <div className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold shrink-0">A</div>
                <p className="text-xs text-text-dim">Open the app on child's phone and grant all permissions. (সন্তানের ফোনে অ্যাপটি ওপেন করে সব পারমিশন দিন।)</p>
              </div>
              <div className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold shrink-0">B</div>
                <p className="text-xs text-text-dim">Enter the **Pairing Code** from Step 1. (ধাপ ১-এর **Pairing Code** টি অ্যাপে দিন।)</p>
              </div>
              <div className="flex gap-4 p-4 bg-accent-blue/10 border border-accent-blue/30 rounded-2xl">
                <CheckCircle2 className="w-5 h-5 text-accent-blue shrink-0" />
                <p className="text-xs text-text-primary font-bold">Connection will be established automatically. (কানেকশন স্বয়ংক্রিয়ভাবে সম্পন্ন হবে।)</p>
              </div>
            </div>
          </section>
        </div>

        <div className="p-6 bg-white/5 border-t border-border-dim flex justify-end gap-4">
          <button 
            onClick={onClose}
            className="px-8 py-4 bg-accent-blue text-bg-deep font-black rounded-2xl shadow-glow-blue hover:brightness-110 transition-all uppercase tracking-widest text-xs"
          >
            Start Monitoring
          </button>
        </div>
      </motion.div>
    </div>
  );
}
