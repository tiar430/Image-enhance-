
export interface Filter {
  id: string;
  name: string;
  prompt: string;
  icon: React.ComponentType<{ className?: string }>;
}
