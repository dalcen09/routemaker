import Papa from "papaparse";
import { Customer } from "./types";

type CustomerStringKeys = "lastName" | "firstName" | "company" | "department" | "title" | "email" | "phone" | "address";

const COLUMN_MAP: Record<string, CustomerStringKeys> = {
  姓: "lastName",
  名: "firstName",
  "姓（読み）": "lastName",
  "名（読み）": "firstName",
  会社名: "company",
  部署: "department",
  役職: "title",
  メールアドレス: "email",
  "電話番号（会社）": "phone",
  "電話番号（携帯）": "phone",
  電話番号: "phone",
  住所: "address",
  "住所（会社）": "address",
};

function buildCustomer(row: Record<string, string>, index: number): Customer {
  const c: Customer = {
    id: `customer-${index}`,
    lastName: "",
    firstName: "",
    company: "",
    department: "",
    title: "",
    email: "",
    phone: "",
    address: "",
  };

  for (const [col, value] of Object.entries(row)) {
    const key = COLUMN_MAP[col.trim()];
    if (key && value?.trim()) {
      if (key === "phone" && c.phone) continue;
      if (key === "address" && c.address) continue;
      c[key] = value.trim();
    }
  }

  return c;
}

export function parseEightCsv(csvText: string): Customer[] {
  const rows: Record<string, string>[] = [];

  Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    complete(result) {
      rows.push(...result.data);
    },
  });

  return rows
    .map((row, i) => buildCustomer(row, i))
    .filter((c) => c.address.length > 0);
}
