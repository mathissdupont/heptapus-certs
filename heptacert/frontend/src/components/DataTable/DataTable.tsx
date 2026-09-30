"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
} from "@tanstack/react-table";
import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Search,
  ArrowUpDown,
  Eye,
  ChevronDown,
} from "lucide-react";
import { useToast } from "@/hooks/useToast";

interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  onSelectionChange?: (selected: TData[]) => void;
  enableColumnVisibility?: boolean;
  pageSize?: number;
  searchable?: boolean;
  searchPlaceholder?: string;
  enableExport?: boolean;
  exportFileName?: string;
}

export function DataTable<TData extends Record<string, any>>({
  columns,
  data,
  onSelectionChange,
  enableColumnVisibility = true,
  pageSize = 10,
  searchable = true,
  searchPlaceholder = "Ara...",
  enableExport = true,
  exportFileName = "export.csv",
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [globalFilter, setGlobalFilter] = useState("");
  const toast = useToast();

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
  });

  useEffect(() => {
    if (onSelectionChange) {
      const selected = table.getFilteredSelectedRowModel().rows.map((row) => row.original);
      onSelectionChange(selected);
    }
  }, [rowSelection, onSelectionChange]);

  const visibleColumns = table.getVisibleLeafColumns();
  const selectedRows = table.getFilteredSelectedRowModel().rows;

  const handleExportCSV = () => {
    try {
      const headers = visibleColumns.map((col) => col.columnDef.header).join(",");
      const rows = selectedRows.length > 0 ? selectedRows : table.getRowModel().rows;

      const csvContent = [
        headers,
        ...rows.map((row) =>
          visibleColumns
            .map((col) => {
              const value = row.getValue(col.id);
              const stringValue = String(value ?? "");
              return stringValue.includes(",") ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
            })
            .join(",")
        ),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", exportFileName);
      link.click();

      toast.success(`${rows.length} satır başarıyla dışa aktarıldı`);
    } catch (err) {
      toast.error("Dışa aktarma başarısız");
    }
  };

  return (
    <div className="flex w-full flex-col gap-3.5 antialiased">

      {/* 1. ÜST ARAÇ ÇUBUĞU (Toolbar) */}
      <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        {searchable && (
          <div className="relative min-w-0 flex-1 sm:max-w-xs md:max-w-sm">
            <label htmlFor="table-search" className="sr-only">Tabloda Ara</label>
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-content-muted stroke-[2]" aria-hidden="true" />
            <input
              id="table-search"
              placeholder={searchPlaceholder}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full min-h-[38px] rounded-xl border border-outline-subtle bg-raised pl-9 pr-4 text-xs font-medium text-content-primary transition-all outline-none hover:border-outline-strong focus:border-outline-strong focus:ring-1 focus:ring-outline-strong placeholder:text-content-muted"
              aria-label="Tablo içeriğini ara"
            />
          </div>
        )}

        {/* Aksiyon Grubu */}
        <div className="flex flex-wrap items-center gap-2">
          {selectedRows.length > 0 && (
            <div
              className="inline-flex items-center rounded-lg border border-outline-strong bg-inverse-surface px-2.5 py-1 text-11 font-bold text-white tracking-tight shadow-sm animate-in fade-in zoom-in-95 duration-100"
              role="status"
              aria-live="polite"
            >
              {selectedRows.length} Seçili
            </div>
          )}

          {enableExport && (
            <button
              onClick={handleExportCSV}
              className="inline-flex min-h-[38px] items-center justify-center gap-1.5 rounded-xl border border-outline-subtle bg-raised px-3.5 py-2 text-xs font-semibold text-content-secondary shadow-sm transition hover:bg-canvas hover:text-content-primary active:scale-95"
              aria-label={selectedRows.length > 0 ? "Seçili satırları CSV olarak dışa aktar" : "Tüm satırları CSV olarak dışa aktar"}
            >
              <Download className="h-3.5 w-3.5 text-content-muted stroke-[2]" aria-hidden="true" />
              <span>Dışa Aktar</span>
            </button>
          )}

          {enableColumnVisibility && (
            <details className="relative group select-none">
              <summary
                className="inline-flex min-h-[38px] list-none items-center justify-center gap-1.5 rounded-xl border border-outline-subtle bg-raised px-3.5 py-2 text-xs font-semibold text-content-secondary shadow-sm transition hover:bg-canvas hover:text-content-primary active:scale-95 cursor-pointer [&::-webkit-details-marker]:hidden"
                aria-label="Kolon görünürlük menüsünü aç"
              >
                <Eye className="h-3.5 w-3.5 text-content-muted stroke-[2]" aria-hidden="true" />
                <span>Kolonlar</span>
                <ChevronDown className="h-3 w-3 text-content-muted transition-transform duration-200 group-open:rotate-180" />
              </summary>

              {/* Apple Tipi Kolon Seçim Dropdown Paneli */}
              <div
                className="absolute right-0 top-full z-20 mt-1.5 min-w-[180px] overflow-hidden rounded-xl border border-outline-subtle/80 bg-raised/95 p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.08)] backdrop-blur-xl animate-in fade-in zoom-in-98 duration-100"
                role="menu"
              >
                <div className="max-h-48 overflow-y-auto space-y-0.5 scrollbar-none">
                  {table.getAllLeafColumns().map((column) => (
                    <label key={column.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-content-secondary hover:bg-canvas hover:text-content-primary transition-colors">
                      <input
                        type="checkbox"
                        checked={column.getIsVisible()}
                        onChange={column.getToggleVisibilityHandler()}
                        className="h-3.5 w-3.5 cursor-pointer rounded-md border-outline-strong text-content-primary focus:ring-0 focus:ring-offset-0"
                      />
                      <span className="truncate">{String(column.columnDef.header)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </details>
          )}
        </div>
      </div>

      {/* 2. TABLO GÖVDESİ (Table Wrapper) */}
      <div className="w-full overflow-hidden rounded-2xl border border-outline-subtle bg-raised shadow-sm">
        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full text-left border-collapse">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-outline-subtle bg-canvas/50">
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="whitespace-nowrap px-5 py-3 text-11 font-bold uppercase tracking-wider text-content-muted select-none">
                      {header.isPlaceholder ? null : (
                        <div
                          onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                          className={`inline-flex items-center gap-1.5 ${header.column.getCanSort() ? "cursor-pointer text-content-muted hover:text-content-primary transition-colors" : ""}`}
                          role={header.column.getCanSort() ? "button" : undefined}
                          tabIndex={header.column.getCanSort() ? 0 : undefined}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getCanSort() && (
                            <ArrowUpDown className="h-3 w-3 text-content-muted stroke-[2.5]" aria-hidden="true" />
                          )}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-outline-subtle">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="transition-all hover:bg-canvas/40">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-5 py-3.5 text-xs font-medium text-content-secondary tracking-tight">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sonuç Bulunamadı Alanı */}
        {table.getRowModel().rows.length === 0 && (
          <div className="w-full py-14 text-center text-xs font-semibold text-content-muted tracking-tight" role="status">
            Sonuç bulunamadı
          </div>
        )}
      </div>

      {/* 3. SAYFALAMA PANELI (Pagination) */}
      <div
        className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-outline-subtle bg-raised px-4 py-3 text-xs text-content-muted shadow-sm sm:flex-row"
        role="region"
        aria-label="Tablo sayfalama alanı"
      >
        <div className="font-semibold tracking-tight text-content-muted">
          {table.getFilteredRowModel().rows.length === 0
            ? "Kayıt yok"
            : `${table.getState().pagination.pageIndex * pageSize + 1} - ${Math.min(
                (table.getState().pagination.pageIndex + 1) * pageSize,
                table.getFilteredRowModel().rows.length
              )} / ${table.getFilteredRowModel().rows.length} kayıt`}
        </div>

        {/* Sayfa Navigasyon Buton Grubu */}
        <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Sayfalama kontrolleri">
          <div className="flex items-center gap-1">
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-outline-subtle bg-raised text-content-muted transition-all hover:text-content-primary disabled:opacity-30 shadow-sm"
              aria-label="İlk sayfaya git"
            >
              <ChevronsLeft className="h-3.5 w-3.5 stroke-[2]" aria-hidden="true" />
            </button>

            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-outline-subtle bg-raised text-content-muted transition-all hover:text-content-primary disabled:opacity-30 shadow-sm"
              aria-label="Önceki sayfaya git"
            >
              <ChevronLeft className="h-3.5 w-3.5 stroke-[2]" aria-hidden="true" />
            </button>
          </div>

          {/* Sayfa İndeksi Manuel Giriş */}
          <div className="flex items-center gap-1.5 font-semibold text-content-muted">
            <span>Sayfa</span>
            <input
              type="number"
              value={table.getState().pagination.pageIndex + 1}
              onChange={(e) => {
                const page = e.target.value ? Number(e.target.value) - 1 : 0;
                table.setPageIndex(page);
              }}
              min={1}
              max={table.getPageCount()}
              className="w-10 min-h-[26px] rounded-lg border border-outline-subtle px-1.5 py-0.5 text-center text-xs font-bold text-content-primary outline-none focus:border-outline-strong"
              aria-label="Mevcut sayfa"
            />
            <span>/ {table.getPageCount()}</span>
          </div>

          {/* Sayfa Başına Satır Limiti Seçimi */}
          <div className="relative inline-flex items-center">
            <select
              value={table.getState().pagination.pageSize}
              onChange={(e) => {
                table.setPageSize(Number(e.target.value));
              }}
              className="appearance-none rounded-lg border border-outline-subtle bg-raised pl-2.5 pr-6 py-0.5 min-h-[26px] text-xs font-bold text-content-secondary outline-none hover:border-outline-strong transition-all cursor-pointer"
              aria-label="Sayfa başına kayıt limiti seçimi"
            >
              {[5, 10, 20, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size} / sayfa
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 h-3 w-3 text-content-muted" />
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-outline-subtle bg-raised text-content-muted transition-all hover:text-content-primary disabled:opacity-30 shadow-sm"
              aria-label="Sonraki sayfaya git"
            >
              <ChevronRight className="h-3.5 w-3.5 stroke-[2]" aria-hidden="true" />
            </button>

            <button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-outline-subtle bg-raised text-content-muted transition-all hover:text-content-primary disabled:opacity-30 shadow-sm"
              aria-label="Son sayfaya git"
            >
              <ChevronsRight className="h-3.5 w-3.5 stroke-[2]" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}