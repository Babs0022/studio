
"use client";

import { useState } from "react";
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Button } from "@/components/ui/button";
import { Copy, Check, Terminal, Folder, File as FileIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { cn } from "@/lib/utils";

interface File {
  filePath: string;
  componentCode: string;
  instructions: string;
}

interface MultiCodeDisplayProps {
  files: File[];
  finalInstructions: string;
  variant?: 'full' | 'preview';
}

interface FileTree {
  [key: string]: FileTree | File;
}

// --- HELPER FUNCTIONS ---
const buildFileTree = (files: File[]): FileTree => {
    const tree: FileTree = {};
    files.forEach(file => {
      // Use a regex to handle both Windows and Unix-style paths
      const parts = file.filePath.split(/[\\/]/);
      let currentLevel = tree;
      parts.forEach((part, index) => {
        if (!part) return; // Skip empty parts from leading slashes
        if (index === parts.length - 1) {
          currentLevel[part] = file;
        } else {
            if (!currentLevel[part] || ('filePath' in currentLevel[part])) {
                currentLevel[part] = {};
            }
            currentLevel = currentLevel[part] as FileTree;
        }
      });
    });
    return tree;
  };
  
const getLanguage = (filePath: string): string => {
    const extension = filePath.split('.').pop()?.toLowerCase() || '';
    switch (extension) {
        case 'tsx':
        case 'jsx':
            return 'tsx';
        case 'ts':
            return 'typescript';
        case 'js':
            return 'javascript';
        case 'json':
            return 'json';
        case 'css':
            return 'css';
        case 'md':
            return 'markdown';
        default:
            return 'plaintext';
    }
};

// --- UI COMPONENTS ---
const CodeBlockWithHeader = ({ file }: { file: File }) => {
  const [copied, setCopied] = useState(false);
  const language = getLanguage(file.filePath);

  const handleCopy = () => {
    navigator.clipboard.writeText(file.componentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-4 overflow-hidden rounded-lg border bg-secondary">
      <div className="flex items-center justify-between bg-muted/30 px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
            <FileIcon className="h-4 w-4 shrink-0" />
            <div className="min-w-0">
                <p className="truncate font-mono text-sm font-medium">{file.filePath}</p>
                <p className="truncate text-xs text-muted-foreground">{file.instructions}</p>
            </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleCopy}>
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          <span className="sr-only">Copy Code</span>
        </Button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{ margin: 0, backgroundColor: 'transparent' }}
        codeTagProps={{
          style: {
            fontFamily: "var(--font-code, monospace)",
            fontSize: "0.875rem",
          },
        }}
        className="!p-4 max-h-[60vh] overflow-auto"
      >
        {file.componentCode}
      </SyntaxHighlighter>
    </div>
  );
};


const RenderFileTree = ({ tree, level = 0 }: { tree: FileTree, level?: number }) => {
  return (
    <div className={cn(level > 0 && "ml-4 pl-4 border-l border-dashed border-border")}>
      {Object.entries(tree)
        // Sort to show folders first, then files alphabetically
        .sort(([aName, aNode], [bName, bNode]) => {
            const aIsFile = 'filePath' in aNode;
            const bIsFile = 'filePath' in bNode;
            if (aIsFile && !bIsFile) return 1;
            if (!aIsFile && bIsFile) return -1;
            return aName.localeCompare(bName);
        })
        .map(([name, node]) => {
        // Check if node is a file by looking for filePath property
        if (node && typeof node === 'object' && 'filePath' in node) {
          return <CodeBlockWithHeader key={name} file={node as File} />;
        } else {
          return (
             <div key={name} className="mt-4">
                <div className="flex items-center gap-2">
                  <Folder className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold text-muted-foreground">{name}</span>
                </div>
                <RenderFileTree tree={node as FileTree} level={level + 1} />
              </div>
          );
        }
      })}
    </div>
  );
};


// --- MAIN COMPONENT ---

export default function MultiCodeDisplay({ files, finalInstructions, variant = 'full' }: MultiCodeDisplayProps) {
  const fileTree = buildFileTree(files);

  return (
    <div className="space-y-8">
      {variant === 'full' && (
        <div>
          <h2 className="text-3xl font-bold">Your Application is Ready!</h2>
          <p className="mt-2 text-lg text-muted-foreground">Create the files below to set up your new application.</p>
        </div>
      )}
      
      <div className="file-tree-container">
        <RenderFileTree tree={fileTree} />
      </div>

      <Card className="bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal />
            Final Steps
          </CardTitle>
          <CardDescription>Complete these final steps to run your application.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="rounded-md bg-muted/80 p-4 font-mono text-sm">{finalInstructions}</p>
        </CardContent>
      </Card>
    </div>
  );
}
