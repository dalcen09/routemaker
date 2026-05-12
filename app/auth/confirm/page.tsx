"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

function ConfirmInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");
    const code = searchParams.get("code");

    if (code) {
      // PKCE flow: exchange the code for a session
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          setErrorMsg(error.message);
          setStatus("error");
        } else {
          setStatus("success");
        }
      });
    } else if (tokenHash && type) {
      // Token hash flow
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as any }).then(({ error }) => {
        if (error) {
          setErrorMsg(error.message);
          setStatus("error");
        } else {
          setStatus("success");
        }
      });
    } else {
      // No params — check if already signed in (e.g., hash fragment flow handled by SDK)
      supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          setStatus("success");
        } else {
          setErrorMsg("確認リンクが無効か期限切れです。");
          setStatus("error");
        }
      });
    }
  }, [searchParams]);

  useEffect(() => {
    if (status === "success") {
      const timer = setTimeout(() => router.push("/login"), 5000);
      return () => clearTimeout(timer);
    }
  }, [status, router]);

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {status === "loading" && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 mb-4">
              <svg className="w-7 h-7 text-slate-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
            <p className="text-slate-500 text-sm">確認中...</p>
          </div>
        )}

        {status === "success" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-5">
              <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">
              メールアドレスが確認されました
            </h1>
            <p className="text-sm text-slate-500 mb-6">
              アカウントが有効化されました。ログインしてご利用ください。
            </p>
            <Link
              href="/login"
              className="inline-block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors shadow-sm"
            >
              ログインページへ
            </Link>
            <p className="text-xs text-slate-400 mt-3">5秒後に自動的にリダイレクトされます</p>
          </div>
        )}

        {status === "error" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-5">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">
              確認に失敗しました
            </h1>
            <p className="text-sm text-slate-500 mb-2">
              {errorMsg || "リンクが無効か期限切れです。"}
            </p>
            <p className="text-xs text-slate-400 mb-6">
              もう一度サインアップしてメールを再送してください。
            </p>
            <Link
              href="/login"
              className="inline-block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors shadow-sm"
            >
              ログインページへ戻る
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-slate-900 px-6 py-0">
        <div className="max-w-7xl mx-auto flex items-center h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c-.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
              </svg>
            </div>
            <span className="text-base font-semibold text-white tracking-tight">Route Planner</span>
          </div>
        </div>
      </header>
      <Suspense fallback={
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-400 text-sm">読み込み中...</p>
        </div>
      }>
        <ConfirmInner />
      </Suspense>
    </div>
  );
}
