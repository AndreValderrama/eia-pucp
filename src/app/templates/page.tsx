'use client';

import { useState } from 'react';
import { actionService } from '@/lib/services/action-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Map, Trash2, Anchor, Dam, Search } from 'lucide-react';
import ActionTree from '@/components/ActionTree';
import { Input } from '@/components/ui/input';

export default function TemplatesPage() {
  const projectTypes = actionService.getAvailableProjectTypes();
  const [activeTab, setActiveTab] = useState(projectTypes[0]);
  const [searchQuery, setSearchQuery] = useState('');

  const getIcon = (type: string) => {
    switch (type) {
      case 'Proyecto Vial': return <Map className="h-5 w-5" />;
      case 'Vertedero': return <Trash2 className="h-5 w-5" />;
      case 'Puerto': return <Anchor className="h-5 w-5" />;
      case 'Presa': return <Dam className="h-5 w-5" />;
      default: return <BookOpen className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="font-headline text-3xl text-primary flex items-center gap-2">
            <BookOpen className="h-8 w-8" /> Project Frameworks
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse standardized hierarchical actions for different environmental project types.
          </p>
        </div>
      </div>

      <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 lg:grid-cols-4 h-auto p-1 bg-muted/50">
          {projectTypes.map((type) => (
            <TabsTrigger 
              key={type} 
              value={type}
              className="flex items-center gap-2 py-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              {getIcon(type)}
              <span className="hidden sm:inline">{type}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {projectTypes.map((type) => (
          <TabsContent key={type} value={type} className="mt-6">
            <Card className="shadow-lg border-t-4 border-t-primary overflow-hidden">
              <CardHeader className="bg-muted/30">
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="text-2xl font-headline flex items-center gap-2">
                            {getIcon(type)}
                            {type} Template
                        </CardTitle>
                        <CardDescription>
                            Standardized structure of Phases, Labors, and Actions for {type} assessments.
                        </CardDescription>
                    </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <ActionTree nodes={actionService.getActionsForType(type)} />
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
      
      <div className="bg-primary/5 rounded-xl p-6 border border-primary/10">
        <h3 className="font-headline text-lg text-primary mb-2">How to use these templates?</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          These frameworks are automatically applied when you create a new project of a specific type. 
          They provide the standardized list of <strong>Actions</strong> you can select from when defining 
          environmental effects for your alternatives, ensuring consistent and rigorous assessments.
        </p>
      </div>
    </div>
  );
}
