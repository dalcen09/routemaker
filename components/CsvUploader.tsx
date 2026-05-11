"use client";

import { useRef, useState } from "react";
import { parseEightCsv as parseCsv } from "@/lib/parseEightCsv";
import { Customer } from "@/lib/types";

interface Props {
  onCustomersLoaded: (customers: Customer[]) => void;
}

export default function CsvUploader({ onCustomersLoaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(file: File) {
    setError(null);
    if (!file.name.endsWith(".csv")) {
      setError("CSVファイルを選択してください。");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const customers = parseCsv(text);
        if (customers.length === 0) {
          setError("住所が含まれる連絡先が見つかりませんでした。CSVに「住所」列があるか確認してください。");
          return;
        }
        onCustomersLoaded(customers);
      } catch {
        setError("CSVの読み込みに失敗しました。");
      }
    };
    reader.readAsText(file, "UTF-8");
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="w-full">
      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-2xl p-14 text-center cursor-pointer transition-all duration-200
          ${dragging
            ? "border-blue-500 bg-blue-50 scale-[1.01]"
            : "border-slate-200 bg-white hover:border-blue-400 hover:bg-slate-50"
          }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <div>
            <p className="text-base font-semibold text-slate-800">
              名刺登録アプリの CSV ファイルをアップロード
            </p>
            <p className="text-sm text-slate-400 mt-1">
              ドラッグ＆ドロップ、またはクリックして選択
            </p>
          </div>
          <span className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors shadow-sm">
            ファイルを選択
          </span>
        </div>
        <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={onFileChange} />
      </div>

      {/* Error */}
      {error && (
        <div className="mt-3 flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {/* Hint */}
      <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
        <p className="font-semibold mb-1.5 flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
          </svg>
          名刺登録アプリからのエクスポート方法
        </p>
        <ol className="list-decimal list-inside space-y-1 text-xs text-amber-700">
          <li>名刺登録アプリ → 名刺一覧 → エクスポート</li>
          <li>「CSV でエクスポート」を選択</li>
          <li>ダウンロードしたファイルをこちらにアップロード</li>
        </ol>
      </div>
    </div>
  );
}
