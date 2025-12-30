"use client";

import React, { useState, useEffect } from 'react';
import { TreeNode } from '@/types';
import { GraphRenderer } from '@/components/GraphRenderer';
import { NodeEditor } from '@/components/NodeEditor';
import * as TreeUtils from '@/lib/tree';
import { Save, FolderOpen, Plus, Trash2, Download } from 'lucide-react';

export default function Home() {
  const [root, setRoot] = useState<TreeNode | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const [availableTrees, setAvailableTrees] = useState<string[]>([]);
  const [currentFilename, setCurrentFilename] = useState('default.json');
  const [showFileMenu, setShowFileMenu] = useState(false);

  const fetchTreeList = async (): Promise<string[]> => {
    const res = await fetch('/api/list-trees');
    if (!res.ok) throw new Error(`Failed to list trees: ${res.status}`);
    const data = (await res.json()) as string[];
    setAvailableTrees(Array.isArray(data) ? data : []);
    return Array.isArray(data) ? data : [];
  };

  const createLocalEmptyTree = () => {
    const initial = {
      id: crypto.randomUUID(),
      statement: '',
      apis: [],
      children: [],
    } satisfies TreeNode;
    return initial;
  };

  const loadTree = async (filename: string) => {
    setLoading(true);
    setLoadError(null);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(`/api/tree?filename=${encodeURIComponent(filename)}`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Failed to load tree: ${res.status}`);

      const data = (await res.json()) as TreeNode | null;
      const nextRoot = data && typeof data === 'object' && 'id' in data ? data : createLocalEmptyTree();

      setRoot(nextRoot);
      setSelectedId(nextRoot.id);
      setCurrentFilename(filename);
    } catch (err) {
      console.error(err);
      const fallback = createLocalEmptyTree();
      setRoot(fallback);
      setSelectedId(fallback.id);
      setLoadError('Failed to load tree. Created a new empty tree instead.');
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
      setShowFileMenu(false);
    }
  };

  // Initialize
  useEffect(() => {
    (async () => {
      try {
        const files = await fetchTreeList();
        const initial = files.includes('default.json') ? 'default.json' : files[0] || 'default.json';
        await loadTree(initial);
      } catch (e) {
        console.error(e);
        const initial = createLocalEmptyTree();
        setRoot(initial);
        setSelectedId(initial.id);
        setLoading(false);
        setLoadError('Failed to initialize. Created a new empty tree.');
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    if (!root) return;
    setSaving(true);
    try {
      await fetch('/api/tree', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tree: root, filename: currentFilename }),
      });
      fetchTreeList();
    } catch (error) {
      console.error(error);
      alert('Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleNewTree = () => {
    const name = prompt('Enter new tree filename (e.g. theorem1.json):', 'new_tree.json');
    if (!name) return;
    const filename = name.endsWith('.json') ? name : `${name}.json`;
    
    const initial = {
      id: crypto.randomUUID(),
      statement: 'New Mathematical Statement',
      apis: [],
      children: [],
    } satisfies TreeNode;
    setRoot(initial);
    setSelectedId(initial.id);
    setCurrentFilename(filename);
    setShowFileMenu(false);
  };

  const handleExportCsv = () => {
    if (!root) return;
    const csv = TreeUtils.exportTreeToCsv(root);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentFilename.replace('.json', '')}_leaves.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteFile = async (filename: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!confirm(`Delete ${filename}?`)) return;
      await fetch(`/api/tree?filename=${filename}`, { method: 'DELETE' });
      fetchTreeList();
      if (currentFilename === filename) {
          loadTree('default.json');
      }
  };

  const handleUpdate = (updater: (root: TreeNode) => TreeNode) => {
    if (!root) return;
    setRoot(updater(root));
  };

  const handleDeleteNode = (id: string) => {
    if (!root) return;
    if (id === root.id) {
      if (confirm('Reset entire tree?')) {
        const initial = {
          id: crypto.randomUUID(),
          statement: '',
          apis: [],
          children: [],
        };
        setRoot(initial);
        setSelectedId(initial.id);
      }
      return;
    }

    const next = TreeUtils.deleteNodeById(root, id);
    setRoot(next);
    if (selectedId === id) setSelectedId(root.id);
  };

  if (loading) return <div className="p-8">Loading...</div>;

  if (!root) {
    return (
      <div className="p-8">
        <div className="text-slate-900 font-semibold">Nothing loaded.</div>
        {loadError && <div className="mt-2 text-sm text-red-600">{loadError}</div>}
      </div>
    );
  }

  const selectedNode = selectedId ? TreeUtils.findNodeById(root, selectedId) : null;

  return (
    <main className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b bg-white px-8 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-slate-900">BrickMove</h1>
          <div className="h-6 w-px bg-slate-200" />
          <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
            <FolderOpen size={16} />
            {currentFilename}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowFileMenu(!showFileMenu)}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <FolderOpen size={18} />
              Open / Manage
            </button>

            {showFileMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-2">
                <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Your Trees</div>
                <div className="max-h-60 overflow-y-auto">
                  {availableTrees.map(file => (
                    <div
                      key={file}
                      onClick={() => loadTree(file)}
                      className={`px-4 py-2 text-sm cursor-pointer flex justify-between items-center group ${currentFilename === file ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}`}
                    >
                      <span className="truncate">{file}</span>
                      <button 
                        onClick={(e) => handleDeleteFile(file, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-100 mt-2 pt-2 px-2">
                  <button
                    onClick={handleNewTree}
                    className="w-full px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center gap-2 font-medium transition-colors"
                  >
                    <Plus size={18} />
                    Create New Tree
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleExportCsv}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <Download size={18} />
            Export CSV
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm font-medium flex items-center gap-2 shadow-md shadow-indigo-200"
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Tree'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Graph Area */}
        <div className="flex-1 p-8 overflow-hidden flex flex-col relative">
          <GraphRenderer root={root} selectedId={selectedId} onSelect={setSelectedId} />
        </div>

        {/* Sidebar Editor */}
        {selectedNode && (
          <NodeEditor node={selectedNode} onUpdate={handleUpdate} onDelete={handleDeleteNode} />
        )}
      </div>
    </main>
  );
}


