// Table UI コンポーネント

import React from "react";

interface TableProps {
  className?: string;
  children: React.ReactNode;
}

interface TableHeaderProps {
  className?: string;
  children: React.ReactNode;
}

interface TableBodyProps {
  className?: string;
  children: React.ReactNode;
}

interface TableRowProps {
  className?: string;
  children: React.ReactNode;
}

interface TableHeadProps {
  className?: string;
  children: React.ReactNode;
}

interface TableCellProps {
  className?: string;
  children: React.ReactNode;
}

export const Table: React.FC<TableProps> = ({ className = "", children }) => {
  return (
    <div className="relative w-full overflow-auto">
      <table className={`w-full caption-bottom text-sm ${className}`}>
        {children}
      </table>
    </div>
  );
};

export const TableHeader: React.FC<TableHeaderProps> = ({ className = "", children }) => {
  return (
    <thead className={`[&_tr]:border-b ${className}`}>
      {children}
    </thead>
  );
};

export const TableBody: React.FC<TableBodyProps> = ({ className = "", children }) => {
  return (
    <tbody className={`[&_tr:last-child]:border-0 ${className}`}>
      {children}
    </tbody>
  );
};

export const TableRow: React.FC<TableRowProps> = ({ className = "", children }) => {
  return (
    <tr className={`border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted ${className}`}>
      {children}
    </tr>
  );
};

export const TableHead: React.FC<TableHeadProps> = ({ className = "", children }) => {
  return (
    <th className={`h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 ${className}`}>
      {children}
    </th>
  );
};

export const TableCell: React.FC<TableCellProps> = ({ className = "", children }) => {
  return (
    <td className={`p-4 align-middle [&:has([role=checkbox])]:pr-0 ${className}`}>
      {children}
    </td>
  );
};