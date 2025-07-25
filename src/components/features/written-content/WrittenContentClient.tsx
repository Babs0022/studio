
"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";
import Logo from "@/components/shared/Logo";
import AnimatedLoadingText from "@/components/shared/AnimatedLoadingText";

// Workflow components
import ContentIdeaForm from '@/components/content-workflow/ContentIdeaForm';
import OutlineEditor, { type OutlineItem } from '@/components/content-workflow/OutlineEditor';
import ContentDrafting, { type GenerationMode } from "@/components/content-workflow/ContentDrafting";
import ContentOptimizer, { type OptimizationOptions } from "@/components/content-workflow/ContentOptimizer";
import ContentExporter from "@/components/content-workflow/ContentExporter";

// AI Flows
import { generateContentOutline } from "@/ai/flows/generate-content-outline-flow";
import { generateFullContentDraft } from "@/ai/flows/generate-full-content-draft-flow";
import { generateSectionDraft } from "@/ai/flows/generate-section-draft-flow";
import { optimizeContent } from "@/ai/flows/optimize-content-flow";
import type { ContentIdeaFormData } from "@/types/ai";


// Services
import { saveProject } from "@/services/projectService";
import { submitFeedback } from "@/services/feedbackService";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { ToastAction } from "@/components/ui/toast";

const steps = [
  { step: 1, name: 'Idea Definition' },
  { step: 2, name: 'Outline Generation' },
  { step: 3, name: 'Content Drafting' },
  { step: 4, name: 'AI Optimization' },
  { step: 5, name: 'Review & Export' },
];

const initialState = {
    contentIdea: {},
    generatedOutline: '',
    finalOutline: [],
    draftContent: '',
    optimizationSuggestions: '',
    isLoading: false,
    isSaving: false,
    projectId: null,
    generationMode: 'full' as GenerationMode,
    isLoadingSectionIndex: null as number | null,
    draftedSections: new Set<number>(),
};


export default function WrittenContentClient() {
  const [currentStep, setCurrentStep] = useState(1);
  const [state, setState] = useState<{
      contentIdea: Partial<ContentIdeaFormData>;
      generatedOutline: string;
      finalOutline: OutlineItem[];
      draftContent: string;
      optimizationSuggestions: string;
      isLoading: boolean;
      isSaving: boolean;
      projectId: string | null;
      generationMode: GenerationMode;
      isLoadingSectionIndex: number | null;
      draftedSections: Set<number>;
  }>(initialState);

  const { user } = useAuth();
  const { toast } = useToast();

  const handleReset = useCallback(() => {
    setState(initialState);
    setCurrentStep(1);
  }, []);
  
  const handleDataChange = useCallback((data: ContentIdeaFormData) => {
    setState(s => ({ ...s, contentIdea: data }));
  }, []);

  const handleOutlineChange = useCallback((items: OutlineItem[]) => {
    setState(s => ({ ...s, finalOutline: items }));
  }, []);

  const handleGenerateOutline = async (isRegenerating = false) => {
      if (!isStep1Complete || !user) return;
      
      setState(s => ({ ...s, isLoading: true, generatedOutline: '' }));
      if (!isRegenerating) {
        setCurrentStep(2);
      }
      
      try {
          const { otherAudience, ...rest } = state.contentIdea as any; // Cast to any to handle otherAudience
          const result = await generateContentOutline({
            ...rest,
            mainTopic: state.contentIdea.mainTopic!,
            targetAudience: state.contentIdea.targetAudience === 'Other' ? otherAudience || '' : state.contentIdea.targetAudience || '',
            keywords: state.contentIdea.keywords || [],
          });
          setState(s => ({ ...s, generatedOutline: result.outline.join('\n') }));
      } catch (error) {
          console.error("Outline generation failed:", error);
          toast({ variant: 'destructive', title: 'Outline Generation Failed', description: error instanceof Error ? error.message : 'An unknown error occurred.' });
      } finally {
          setState(s => ({ ...s, isLoading: false }));
      }
  };

  const commonDraftingInput = useCallback(() => {
    const { otherAudience, ...rest } = state.contentIdea as any;
    return {
        ...rest,
        mainTopic: state.contentIdea.mainTopic!,
        targetAudience: state.contentIdea.targetAudience === 'Other' ? otherAudience || '' : state.contentIdea.targetAudience || '',
        keywords: state.contentIdea.keywords,
        contentType: state.contentIdea.contentType!,
        purpose: state.contentIdea.purpose!,
        desiredTone: state.contentIdea.desiredTone!,
        desiredLength: state.contentIdea.desiredLength!,
        finalOutline: state.finalOutline.map(item => item.text),
    };
  }, [state.contentIdea, state.finalOutline]);


  const handleDrafting = async (mode: GenerationMode) => {
    if (!user || state.finalOutline.length === 0) return;
    setState(s => ({ ...s, isLoading: true, draftContent: '', draftedSections: new Set() }));

    try {
        if (mode === 'full') {
            const result = await generateFullContentDraft(commonDraftingInput());
            setState(s => ({ ...s, draftContent: result.generatedContent, draftedSections: new Set(s.finalOutline.map((_, i) => i)) }));
        }
    } catch (error) {
        console.error("Drafting failed:", error);
        toast({ variant: 'destructive', title: 'Drafting Failed', description: error instanceof Error ? error.message : 'An unknown error occurred.' });
    } finally {
        setState(s => ({ ...s, isLoading: false }));
    }
  };
  
  const handleGenerateSection = async (index: number) => {
    if (!user || !state.finalOutline[index]) return;
    
    setState(s => ({ ...s, isLoadingSectionIndex: index }));

    const sectionToDraft = state.finalOutline[index].text;
    
    try {
        const result = await generateSectionDraft({
            ...(commonDraftingInput()),
            sectionToDraft,
            fullOutline: state.finalOutline.map(item => item.text),
            priorContent: state.draftContent,
        });
        
        setState(s => ({
            ...s,
            draftContent: (s.draftContent ? s.draftContent + '\n\n' : '') + `## ${sectionToDraft}\n\n` + result.generatedSectionContent,
            draftedSections: new Set(s.draftedSections).add(index),
        }));

    } catch (error) {
        console.error("Section drafting failed:", error);
        toast({ variant: 'destructive', title: 'Section Drafting Failed', description: error instanceof Error ? error.message : 'An unknown error occurred.' });
    } finally {
        setState(s => ({ ...s, isLoadingSectionIndex: null }));
    }
  };

  const handleRegenerate = async () => {
    if (state.generationMode === 'full') {
        await handleDrafting('full');
    } else {
        toast({title: "Regeneration in section mode is not yet implemented."});
        // Here you could potentially clear the last section and regenerate it
    }
  };

  const handleOptimization = async (optimizations: OptimizationOptions, tone: string) => {
    setState(s => ({ ...s, isLoading: true, optimizationSuggestions: '' }));
    try {
        const result = await optimizeContent({
            content: state.draftContent,
            optimizations,
            toneParameter: tone,
        });
        setState(s => ({ ...s, optimizationSuggestions: result.optimizedContent }));
        
    } catch (error) {
        console.error("Optimization failed:", error);
        toast({ variant: 'destructive', title: 'Optimization Failed', description: error instanceof Error ? error.message : 'An unknown error occurred.' });
    } finally {
        setState(s => ({ ...s, isLoading: false }));
    }
  };

  const handleApplyOptimizationChanges = (newContent: string) => {
    setState(s => ({ ...s, draftContent: newContent, optimizationSuggestions: '' }));
    toast({ title: 'Changes Applied!', description: 'Your draft has been updated with the AI suggestions.' });
  };

  const handleSave = async () => {
    if (!user || !state.draftContent) return;
    setState(s => ({ ...s, isSaving: true }));
    try {
        const id = await saveProject({
            userId: user.uid,
            type: 'written-content',
            content: state.draftContent,
        });
        setState(s => ({ ...s, projectId: id }));
        toast({
            title: "Project Saved!",
            description: "Your content has been saved to your projects.",
            action: <ToastAction altText="View Project" asChild><Link href={`/dashboard/projects/${id}`}>View</Link></ToastAction>,
        });
    } catch (error) {
        console.error("Failed to save project:", error);
        toast({ variant: "destructive", title: "Save Failed", description: error instanceof Error ? error.message : "An unknown error occurred." });
    } finally {
        setState(s => ({ ...s, isSaving: false }));
    }
  };

  const handleFeedback = (rating: 'good' | 'bad') => {
    if (!user || !state.projectId) {
        toast({ variant: 'destructive', title: "Cannot give feedback", description: "You must save the project first." });
        return;
    }
    submitFeedback({ userId: user.uid, projectId: state.projectId, rating });
  };


  const handlePrevious = () => setCurrentStep((prev) => Math.max(prev - 1, 1));
  
  const handleNext = () => {
      if (currentStep === 1) {
          handleGenerateOutline();
      } else {
          setCurrentStep((prev) => Math.min(prev + 1, steps.length));
      }
  };

  const progressPercentage = (currentStep / steps.length) * 100;
  
  const isStep1Complete = 
    state.contentIdea.mainTopic && state.contentIdea.mainTopic.trim() !== '' && state.contentIdea.purpose && state.contentIdea.purpose.trim() !== '';

  const renderStepContent = () => {
      if (state.isLoading && currentStep !== 1) {
          return (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
                  <AnimatedLoadingText />
              </div>
          );
      }

      switch (currentStep) {
          case 1:
              return <ContentIdeaForm onDataChange={handleDataChange} initialData={state.contentIdea as ContentIdeaFormData} />;
          case 2:
              return <OutlineEditor aiGeneratedOutline={state.generatedOutline} onGenerateNewOutline={() => handleGenerateOutline(true)} onOutlineChange={handleOutlineChange} />;
          case 3:
              return <ContentDrafting 
                        outline={state.finalOutline}
                        content={state.draftContent}
                        onContentChange={(newContent) => setState(s => ({ ...s, draftContent: newContent }))}
                        onGenerate={handleDrafting}
                        onGenerateSection={handleGenerateSection}
                        onRegenerate={handleRegenerate}
                        generationMode={state.generationMode}
                        onGenerationModeChange={(mode) => setState(s => ({ ...s, generationMode: mode, draftContent: '', draftedSections: new Set() }))}
                        isLoading={state.isLoading}
                        isLoadingSectionIndex={state.isLoadingSectionIndex}
                        draftedSections={state.draftedSections}
                      />;
          case 4:
              return <ContentOptimizer 
                        originalContent={state.draftContent} 
                        suggestions={state.optimizationSuggestions} 
                        onRunOptimization={handleOptimization} 
                        onApplyChanges={handleApplyOptimizationChanges}
                        isLoading={state.isLoading} 
                      />;
          case 5:
              return <ContentExporter 
                        finalContent={state.draftContent} 
                        isSaving={state.isSaving}
                        onSaveContent={handleSave} 
                        onStartNew={handleReset} 
                        onFeedback={handleFeedback} 
                      />;
          default:
              return null;
      }
  };

  const getNextButtonDisabledState = () => {
    if (state.isLoading) return true;
    if (currentStep === 1 && !isStep1Complete) return true;
    if (currentStep === 2 && state.finalOutline.length === 0) return true;
    if (currentStep === 3) {
        if (state.generationMode === 'full' && state.draftedSections.size === 0) return true;
        if (state.generationMode === 'section' && state.draftedSections.size < state.finalOutline.length) return true;
    }
    if (currentStep === 5) return true; // No "Next" on the last step
    return false;
  };

  return (
    <div className="space-y-8">
        <div className="mb-6">
            <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">{steps[currentStep - 1].name}</h2>
            <span className="text-sm text-muted-foreground">
                Step {currentStep} of {steps.length}
            </span>
            </div>
            <Progress value={progressPercentage} className="w-full mt-2" />
        </div>
        
        <div className="min-h-[400px]">
            {renderStepContent()}
        </div>
        
        <div className="flex justify-between mt-8">
            <Button onClick={handlePrevious} disabled={currentStep === 1} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Previous
            </Button>
            {currentStep < steps.length && (
                <Button onClick={handleNext} disabled={getNextButtonDisabledState()}>
                    {state.isLoading ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {currentStep === 1 ? 'Generate Outline' : 'Next'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
            )}
        </div>
    </div>
  );
}
