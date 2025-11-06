import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from '@/hooks/use-toast';

interface DetailedData {
  [key: string]: any;
}

const API_BASE_URL = 'http://127.0.0.1:8000';

export default function FileDetails() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const [fileData, setFileData] = useState<DetailedData[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFileDetail = async () => {
      if (!fileId) return;
      
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/files/data/${fileId}/`);
        if (!response.ok) throw new Error('Failed to fetch file details');
        const data = await response.json();
        setFileData(data);
      } catch (error: any) {
        toast({
          title: "Failed to load file details",
          description: error.message,
          variant: "destructive",
        });
        navigate('/');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFileDetail();
  }, [fileId, navigate]);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>

        <Card className="p-6 shadow-[var(--shadow-card)]">
          <h1 className="text-2xl font-semibold mb-6 text-card-foreground">File Details - ID: {fileId}</h1>
          
          {isLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : fileData && fileData.length > 0 ? (
            <ScrollArea className="h-[calc(100vh-250px)]">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 bg-card z-10">
                    <tr className="border-b-2 border-border">
                      {Object.keys(fileData[0]).map((key) => (
                        <th key={key} className="text-left p-3 font-semibold text-card-foreground bg-accent/5 whitespace-nowrap">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fileData.map((row, index) => (
                      <tr key={index} className="border-b border-border hover:bg-accent/5 transition-colors">
                        {Object.values(row).map((value, colIndex) => (
                          <td key={colIndex} className="p-3 text-sm text-card-foreground whitespace-nowrap">
                            {String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          ) : (
            <p className="text-muted-foreground text-center py-12">No data available</p>
          )}
        </Card>
      </div>
    </div>
  );
}
