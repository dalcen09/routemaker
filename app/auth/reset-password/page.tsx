"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Establish session from the link parameters
  useEffect(() => {
    const code = searchParams.get("code");

    if (code) {
      // PKCE flow
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) { setInitError(error.message); }
        else { setReady(true); }
      });
      return;
    }

    // Hash / implicit flow — SDK fires PASSWORD_RECOVERY on onAuthStateChange
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });

    // Also check if there's already an active recovery session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, [searchParams]);

  useEffect(() => {
    if (done) {
      const t = setTimeout(() => router.push("/login"), 4000);
      return () => clearTimeout(t);
    }
  }, [done, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError("パスワードは8文字以上で入力してください。"); return; }
    if (password !== confirm) { setError("パスワードが一致しません。"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "パスワードの変更に失敗しました。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {initError ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-5">
              <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">リンクが無効です</h1>
            <p className="text-sm text-slate-500 mb-6">{initError}</p>
            <Link href="/login" className="inline-block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors shadow-sm">
              ログインページへ戻る
            </Link>
          </div>
        ) : done ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-5">
              <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">パスワードを変更しました</h1>
            <p className="text-sm text-slate-500 mb-6">新しいパスワードでログインしてください。</p>
            <Link href="/login" className="inline-block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors shadow-sm">
              ログインページへ
            </Link>
            <p className="text-xs text-slate-400 mt-3">4秒後に自動的にリダイレクトされます</p>
          </div>
        ) : !ready ? (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 mb-4">
              <svg className="w-7 h-7 text-slate-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
            <p className="text-slate-500 text-sm">確認中...</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 mb-4 shadow-lg shadow-blue-200">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-slate-900">新しいパスワードを設定</h1>
              <p className="text-sm text-slate-500 mt-1">8文字以上で入力してください</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">新しいパスワード</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="8文字以上"
                  required
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">パスワード確認</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="もう一度入力"
                  required
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-xl text-sm transition-colors shadow-sm mt-2 flex items-center justify-center gap-2"
              >
                {saving && (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                )}
                パスワードを変更する
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
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
        <ResetPasswordInner />
      </Suspense>
    </div>
  );
}
