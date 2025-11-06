import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-full mx-auto space-y-4 md:space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </div>

        <div className="bg-card rounded-lg shadow-lg border border-border">
          <div className="p-4 md:p-6 border-b border-border">
            <h1 className="text-xl md:text-2xl font-semibold text-card-foreground">
              File Details - ID: {fileId}
            </h1>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : fileData && fileData.length > 0 ? (
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-200px)]">
              <table className="w-full border-collapse min-w-max">
                <thead className="sticky top-0 bg-muted/50 backdrop-blur-sm z-10">
                  <tr className="border-b-2 border-border">
                    {Object.keys(fileData[0]).map((key) => (
                      <th 
                        key={key} 
                        className="text-left p-3 md:p-4 font-semibold text-card-foreground whitespace-nowrap text-sm md:text-base"
                      >
                        {key.replace(/_/g, ' ').toUpperCase()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fileData.map((row, index) => (
                    <tr 
                      key={index} 
                      className="border-b border-border hover:bg-accent/10 transition-colors"
                    >
                      {Object.values(row).map((value, colIndex) => (
                        <td 
                          key={colIndex} 
                          className="p-3 md:p-4 text-sm text-card-foreground whitespace-nowrap"
                        >
                          {value !== null && value !== undefined ? String(value) : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <p className="text-muted-foreground">No data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
