import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Search, Download, RefreshCw, FileText } from 'lucide-react';
import { cn } from '../../lib/utils';

const HistoryTable = ({ 
  history, 
  searchTerm, 
  setSearchTerm, 
  handleExport, 
  isExporting, 
  selectedDate,
  setSelectedDate 
}) => {
  return (
    <Card className="bg-white shadow-md border border-gray-100">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <CardTitle className="text-xl font-bold text-gray-800">Scan History</CardTitle>
          <div className="text-sm text-gray-500 mt-1">Real-time scan logs</div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search AWB..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-full sm:w-[200px]"
            />
          </div>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full sm:w-[150px]"
          />
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => handleExport('all')} 
            disabled={isExporting}
            title="Export All"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground w-[100px]">Time</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">AWB</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                  <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Type</th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="h-48 text-center align-middle">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <div className="bg-gray-100 p-4 rounded-full">
                          <FileText className="h-8 w-8 text-gray-400" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium text-gray-900">No scan history found</p>
                          <p className="text-sm text-gray-500">Try adjusting your filters or start scanning packages.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  history.map((item) => (
                    <tr key={item.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <td className="p-4 align-middle font-mono text-xs text-gray-500">
                        {new Date(item.scanned_at).toLocaleTimeString('th-TH')}
                      </td>
                      <td className="p-4 align-middle font-medium font-mono">
                        {item.awb}
                      </td>
                      <td className="p-4 align-middle">
                        <Badge 
                          variant={
                            item.status === 'match' ? 'success' : 
                            item.status === 'duplicate' ? 'warning' : 
                            'destructive'
                          }
                          className="capitalize"
                        >
                          {item.status}
                        </Badge>
                      </td>
                      <td className="p-4 align-middle text-right">
                        <span className="text-xs text-gray-400 uppercase tracking-wider">
                          SCAN
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="text-xs text-muted-foreground">
            Showing {history.length} records
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default HistoryTable;
