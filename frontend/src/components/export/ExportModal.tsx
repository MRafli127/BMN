'use client';

import { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  Package,
  Users,
  FileText,
  ChevronLeft,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Select, Label } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { exportService, generateExportFilename } from '@/services/export.service';
import { downloadBlob } from '@/lib/download';
import type { FilterExport } from '@/services/export.service';

interface ExportOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  serviceMethod: 'exportPeminjaman' | 'exportBarang' | 'exportUsers';
  filename: string;
}

const exportOptions: ExportOption[] = [
  {
    id: 'peminjaman',
    label: 'Export Peminjaman',
    description: 'Unduh data peminjaman dalam format Excel',
    icon: <FileText className="h-5 w-5" />,
    serviceMethod: 'exportPeminjaman',
    filename: 'peminjaman',
  },
  {
    id: 'barang',
    label: 'Export Barang',
    description: 'Unduh data inventaris barang BMN',
    icon: <Package className="h-5 w-5" />,
    serviceMethod: 'exportBarang',
    filename: 'barang',
  },
  {
    id: 'users',
    label: 'Export Users',
    description: 'Unduh data pengguna sistem',
    icon: <Users className="h-5 w-5" />,
    serviceMethod: 'exportUsers',
    filename: 'users',
  },
];

interface FilterPeminjamanProps {
  filter: FilterExport;
  onChange: (filter: FilterExport) => void;
}

function FilterPeminjaman({ filter, onChange }: FilterPeminjamanProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dari">Dari Tanggal</Label>
          <Input
            id="dari"
            type="date"
            value={filter.dari || ''}
            onChange={(e) => onChange({ ...filter, dari: e.target.value || undefined })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sampai">Sampai Tanggal</Label>
          <Input
            id="sampai"
            type="date"
            value={filter.sampai || ''}
            onChange={(e) => onChange({ ...filter, sampai: e.target.value || undefined })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={filter.status || 'all'}
          onChange={(e) => onChange({ ...filter, status: e.target.value === 'all' ? undefined : e.target.value })}
        >
          <option value="all">Semua Status</option>
          <option value="MENUNGGU">Menunggu</option>
          <option value="DISETUJUI">Disetujui</option>
          <option value="DITOLAK">Ditolak</option>
          <option value="DIPINJAM">Dipinjam</option>
          <option value="DIKEMBALIKAN">Dikembalikan</option>
          <option value="TERLAMBAT">Terlambat</option>
        </Select>
      </div>
    </div>
  );
}

interface FilterBarangProps {
  filter: FilterExport;
  onChange: (filter: FilterExport) => void;
}

function FilterBarang({ filter, onChange }: FilterBarangProps) {
  const opsiFilterBarang = [
    { value: '015110199411868000KP', label: '015110199411868000KP' },
    { value: '015110199411868001KP', label: '015110199411868001KP' },
    { value: '015110199411868002KP', label: '015110199411868002KP' },
    { value: '015110199411868003KP', label: '015110199411868003KP' },
    { value: '015110199411868004KP', label: '015110199411868004KP' },
    { value: '015110199411868005KP', label: '015110199411868005KP' },
    { value: '015110199411868006KP', label: '015110199411868006KP' },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="kodeSatker">Kode Satker</Label>
        <Select
          value={filter.kodeSatker || 'all'}
          onChange={(e) => onChange({ ...filter, kodeSatker: e.target.value === 'all' ? undefined : e.target.value })}
        >
          <option value="all">Semua Kode Satker</option>
          {opsiFilterBarang.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="kondisi">Kondisi</Label>
        <Select
          value={filter.kondisi || 'all'}
          onChange={(e) => onChange({ ...filter, kondisi: e.target.value === 'all' ? undefined : e.target.value })}
        >
          <option value="all">Semua Kondisi</option>
          <option value="BAIK">Baik</option>
          <option value="RUSAK_RINGAN">Rusak Ringan</option>
          <option value="RUSAK_BERAT">Rusak Berat</option>
        </Select>
      </div>
    </div>
  );
}

interface FilterUsersProps {
  filter: FilterExport;
  onChange: (filter: FilterExport) => void;
}

function FilterUsers({ filter, onChange }: FilterUsersProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="role">Role</Label>
      <Select
        value={filter.role || 'all'}
        onChange={(e) => onChange({ ...filter, role: e.target.value === 'all' ? undefined : e.target.value })}
      >
        <option value="all">Semua Role</option>
        <option value="ADMIN">Administrator</option>
        <option value="PEMINJAM">Peminjam</option>
      </Select>
    </div>
  );
}

interface ExportModalProps {
  trigger?: React.ReactNode;
}

export function ExportModal({ trigger }: ExportModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedExport, setSelectedExport] = useState<ExportOption | null>(null);
  const [filter, setFilter] = useState<FilterExport>({});
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!selectedExport) return;

    setLoading(true);
    try {
      const blob = await exportService[selectedExport.serviceMethod](filter);
      const filename = generateExportFilename(selectedExport.filename);
      downloadBlob(blob, filename);
      setOpen(false);
      setSelectedExport(null);
      setFilter({});
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setSelectedExport(null);
    setFilter({});
  };

  const renderFilter = () => {
    if (!selectedExport) return null;

    switch (selectedExport.id) {
      case 'peminjaman':
        return <FilterPeminjaman filter={filter} onChange={setFilter} />;
      case 'barang':
        return <FilterBarang filter={filter} onChange={setFilter} />;
      case 'users':
        return <FilterUsers filter={filter} onChange={setFilter} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="bg-white text-primary hover:bg-white">
            <Download className="h-4 w-4" />
            Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Export Data
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedExport ? (
            <div className="grid gap-3">
              {exportOptions.map((option) => (
                <Card
                  key={option.id}
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => setSelectedExport(option)}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {option.icon}
                    </div>
                    <div>
                      <p className="font-medium">{option.label}</p>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="-ml-2 flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Kembali
              </Button>

              <div className="rounded-lg border p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {selectedExport.icon}
                  </div>
                  <div>
                    <p className="font-medium">{selectedExport.label}</p>
                    <p className="text-xs text-muted-foreground">Format: Excel (.xlsx)</p>
                  </div>
                </div>

                {renderFilter()}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Batal
                </Button>
                <Button onClick={handleExport} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Mengunduh...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Download
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
