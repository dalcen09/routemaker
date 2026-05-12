import Papa from "papaparse";
import { Customer } from "./types";

// Eight CSV column → Customer field mapping
// Phone priority: 携帯電話 > TEL直通 > TEL部門 > TEL会社
const COLUMN_MAP: Record<string, keyof Customer | "__phone_low" | "__phone_mid"> = {
  // Name
  氏名: "lastName",          // Full name in one field
  姓: "lastName",
  名: "firstName",

  // Company / role
  会社名: "company",
  部署名: "department",      // Eight uses 部署名, not 部署
  部署: "department",
  役職: "title",

  // Contact
  "e-mail": "email",
  メールアドレス: "email",

  // Phone — higher-priority values overwrite lower ones
  携帯電話: "phone",         // highest priority
  TEL直通: "phone",
  TEL部門: "__phone_mid",
  TEL会社: "__phone_low",

  // Address
  住所: "address",
  "住所（会社）": "address",

  // Legacy Sansan-style columns
  "電話番号（携帯）": "phone",
  "電話番号（会社）": "__phone_low",
  電話番号: "phone",
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

  let phoneLow = "";
  let phoneMid = "";

  for (const [col, value] of Object.entries(row)) {
    const key = COLUMN_MAP[col.trim()];
    const v = value?.trim() ?? "";
    if (!key || !v) continue;

    if (key === "__phone_low") {
      if (!phoneLow) phoneLow = v;
    } else if (key === "__phone_mid") {
      if (!phoneMid) phoneMid = v;
    } else if (key === "phone") {
      if (!c.phone) c.phone = v;   // first high-priority phone wins
    } else if (key === "address") {
      if (!c.address) c.address = v;
    } else if (key === "email") {
      if (!c.email) c.email = v;
    } else {
      (c as unknown as Record<string, string>)[key as string] = v;
    }
  }

  // Fill phone from lower-priority columns if still empty
  if (!c.phone) c.phone = phoneMid || phoneLow;

  return c;
}

// Find the real header row by looking for the row that contains 会社名 or 氏名.
// Eight prepends 7 lines of metadata before the actual headers.
function extractDataCsv(csvText: string): string {
  const lines = csvText.split(/\r?\n/);
  const headerIdx = lines.findIndex((line) =>
    line.startsWith("会社名") || line.startsWith("氏名") || line.includes(",氏名,") || line.includes(",会社名,")
  );
  if (headerIdx === -1) return csvText; // unknown format — try parsing as-is
  return lines.slice(headerIdx).join("\n");
}

export function parseEightCsv(csvText: string): Customer[] {
  const dataCsv = extractDataCsv(csvText);
  const rows: Record<string, string>[] = [];

  Papa.parse<Record<string, string>>(dataCsv, {
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
