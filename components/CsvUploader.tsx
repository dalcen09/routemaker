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
    <div className="max-w-xl mx-auto">
      <div
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors
          ${dragging ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="text-5xl mb-4">📇</div>
        <p className="text-lg font-medium text-gray-700 mb-1">
          名刺登録アプリの CSV ファイルをアップロード
        </p>
        <p className="text-sm text-gray-500 mb-4">
          ドラッグ＆ドロップ、またはクリックして選択
        </p>
        <span className="inline-block bg-blue-600 text-white text-sm px-4 py-2 rounded-lg">
          ファイルを選択
        </span>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={onFileChange}
        />
      </div>

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
        <p className="font-medium mb-1">名刺登録アプリからのエクスポート方法</p>
        <ol className="list-decimal list-inside space-y-1 text-xs">
          <li>名刺登録アプリ → 名刺一覧 → エクスポート</li>
          <li>「CSV でエクスポート」を選択</li>
          <li>ダウンロードしたファイルをこちらにアップロード</li>
        </ol>
      </div>
    </div>
  );
}
