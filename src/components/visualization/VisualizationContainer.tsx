'use client';

import React, { ReactNode, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { SpeedControls } from './SpeedControls';
import { ChatPanel } from './ChatPanel';
import { ThirdTabPanel } from './ThirdTabPanel';
import { PredictionsPanel } from './PredictionsPanel';
import { WeatherDisplay } from './WeatherDisplay';

interface VisualizationContainerProps {
  children: ReactNode; // CanvasIsometricGrid component
}

export function VisualizationContainer({ children }: VisualizationContainerProps) {
  const [activeTab, setActiveTab] = useState('simulation');

  return (
    <div className="w-full h-full flex flex-col">
      <Tabs defaultValue="simulation" value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
        {/* Top bar with Chrome-style tabs */}
        <div className="flex">
          {/* Left side bar */}
          <div className="w-8 bg-card" />
          
          {/* Top bar with tabs */}
          <div className="flex-1 bg-card px-4 pt-1.5">
            <TabsList className="w-fit h-auto p-0 bg-transparent border-0 rounded-none gap-0">
              <TabsTrigger 
                value="simulation" 
                className="rounded-t-lg rounded-b-none border-2 border-b-0 border-border bg-muted/30 data-[state=active]:bg-card data-[state=active]:border-b-2 data-[state=active]:border-b-card data-[state=active]:mb-[-2px] data-[state=active]:shadow-none px-4 py-2 relative z-10"
              >
                Simulation
              </TabsTrigger>
              <TabsTrigger 
                value="chat"
                className="rounded-t-lg rounded-b-none border-2 border-b-0 border-l-0 border-border bg-muted/30 data-[state=active]:bg-card data-[state=active]:border-b-2 data-[state=active]:border-b-card data-[state=active]:mb-[-2px] data-[state=active]:shadow-none px-4 py-2 relative z-10"
              >
                Live Activity
              </TabsTrigger>
              <TabsTrigger 
                value="third"
                className="rounded-t-lg rounded-b-none border-2 border-b-0 border-l-0 border-border bg-muted/30 data-[state=active]:bg-card data-[state=active]:border-b-2 data-[state=active]:border-b-card data-[state=active]:mb-[-2px] data-[state=active]:shadow-none px-4 py-2 relative z-10"
              >
                User Database
              </TabsTrigger>
              <TabsTrigger 
                value="predictions"
                className="rounded-t-lg rounded-b-none border-2 border-b-0 border-l-0 border-border bg-muted/30 data-[state=active]:bg-card data-[state=active]:border-b-2 data-[state=active]:border-b-card data-[state=active]:mb-[-2px] data-[state=active]:shadow-none px-4 py-2 relative z-10"
              >
                Predictions
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* Right side bar */}
          <div className="w-8 bg-card" />
        </div>
        
        {/* Content area with side bars */}
        <div className="flex flex-1 min-h-0">
          {/* Left side bar */}
          <div className="w-8 bg-card" />
          
          {/* Main content area */}
          <div className="flex-1 min-w-0 min-h-0 relative">
            <TabsContent value="simulation" className="absolute inset-0 m-0 border-2 border-border rounded-lg shadow-lg bg-card overflow-hidden">
              {children}
            </TabsContent>
            
            <TabsContent value="chat" className="absolute inset-0 m-0 border-2 border-border rounded-lg shadow-lg bg-card overflow-y-auto">
              <ChatPanel />
            </TabsContent>
            
            <TabsContent value="third" className="absolute inset-0 m-0 border-2 border-border rounded-lg shadow-lg bg-card overflow-y-auto">
              <ThirdTabPanel />
            </TabsContent>
            
            <TabsContent value="predictions" className="absolute inset-0 m-0 border-2 border-border rounded-lg shadow-lg bg-card overflow-y-auto">
              <PredictionsPanel />
            </TabsContent>
          </div>
          
          {/* Right side bar */}
          <div className="w-8 bg-card" />
        </div>
        
        {/* Bottom bar with city name, weather, and speed controls - show for simulation and user database tabs */}
        {(activeTab === 'simulation' || activeTab === 'third') && (
          <div className="flex">
            {/* Left side bar */}
            <div className="w-8 bg-card" />
            
            {/* Bottom bar content */}
            <div className="flex-1 flex items-center justify-between px-6 py-2 bg-card">
              {activeTab === 'simulation' && (
                <>
                  <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-foreground">Turing City</h1>
                    <WeatherDisplay />
                  </div>
                  <SpeedControls />
                </>
              )}
            </div>
            
            {/* Right side bar */}
            <div className="w-8 bg-card" />
          </div>
        )}
      </Tabs>
    </div>
  );
}

