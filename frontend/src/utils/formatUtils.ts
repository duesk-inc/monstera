// 日付フォーマットユーティリティ
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return "-";

  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}/${month}/${day}`;
};

// 日時フォーマットユーティリティ
export const formatDateTime = (
  date: string | Date | null | undefined,
): string => {
  if (!date) return "-";

  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "-";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");

  return `${year}/${month}/${day} ${hours}:${minutes}`;
};

// 金額フォーマットユーティリティ
export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return "-";

  return `¥${amount.toLocaleString("ja-JP")}`;
};

// ステータスラベル取得
export const getStatusLabel = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    draft: "下書き",
    sent: "送信済み",
    paid: "支払済み",
    overdue: "期限切れ",
    cancelled: "キャンセル",
    active: "アクティブ",
    inactive: "非アクティブ",
    completed: "完了",
    pending: "保留中",
    new: "新規",
    negotiation: "商談中",
    proposal: "提案中",
    contract: "契約前",
    closed_won: "成約",
    closed_lost: "失注",
  };

  return statusMap[status] || status;
};

// ステータスカラー取得
export const getStatusColor = (status: string): string => {
  const colorMap: { [key: string]: string } = {
    draft: "gray",
    sent: "blue",
    paid: "green",
    overdue: "red",
    cancelled: "gray",
    active: "green",
    inactive: "gray",
    completed: "green",
    pending: "yellow",
    new: "blue",
    negotiation: "indigo",
    proposal: "purple",
    contract: "pink",
    closed_won: "green",
    closed_lost: "red",
  };

  return colorMap[status] || "gray";
};

// 課金タイプラベル取得
export const getBillingTypeLabel = (type: string): string => {
  const typeMap: { [key: string]: string } = {
    fixed: "固定",
    hourly: "時間制",
    project: "プロジェクト",
  };

  return typeMap[type] || type;
};

// 契約タイプラベル取得
export const getContractTypeLabel = (type: string): string => {
  const typeMap: { [key: string]: string } = {
    ses: "SES契約",
    contract: "請負契約",
    dispatch: "派遣契約",
  };

  return typeMap[type] || type;
};

// 数値フォーマットユーティリティ
export const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return "-";

  return num.toLocaleString("ja-JP");
};
