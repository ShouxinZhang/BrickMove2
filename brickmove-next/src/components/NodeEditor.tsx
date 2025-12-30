"use client";

import React from 'react';
import { TreeNode } from '@/types';
import { Plus, Trash2, Code, FileText, GitBranch, Trash } from 'lucide-react';
import * as TreeUtils from '@/lib/tree';

interface NodeEditorProps {
  node: TreeNode;
  onUpdate: (updater: (root: TreeNode) => TreeNode) => void;
  onDelete: (id: string) => void;
}

export const NodeEditor: React.FC<NodeEditorProps> = ({ node, onUpdate, onDelete }) => {
  const isLeaf = node.children.length === 0;

  return (
    <div className="w-80 bg-white border-l border-gray-200 p-6 overflow-y-auto flex flex-col gap-6 shadow-lg">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <GitBranch size={20} className="text-indigo-600" />
          Node Editor
        </h2>
        <p className="text-xs text-gray-500 mb-4">ID: {node.id.slice(0, 8)}...</p>
      </div>

      {/* Statement */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <FileText size={16} />
          Statement
        </label>
        <textarea
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-800 min-h-[100px]"
          value={node.statement}
          onChange={(e) => onUpdate((root) => TreeUtils.updateStatement(root, node.id, e.target.value))}
          placeholder="Enter mathematical statement..."
        />
      </div>

      {/* APIs (Leaf Only) */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Code size={16} />
          Lean4 APIs
        </label>
        
        {!isLeaf ? (
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700 italic">
            APIs are only available on leaf nodes. This node has children.
          </div>
        ) : (
          <div className="space-y-3">
            {node.apis.map((api, idx) => (
              <div key={idx} className="flex flex-col gap-2 p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                <div className="flex gap-2">
                  <input
                    className="flex-1 p-2 border border-slate-200 rounded-md text-xs font-mono bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={typeof api === 'string' ? api : (api.name || '')}
                    onChange={(e) => onUpdate((root) => TreeUtils.updateApi(root, node.id, idx, e.target.value))}
                    placeholder="e.g. apply add_comm"
                  />
                  <button
                    onClick={() => onUpdate((root) => TreeUtils.removeApi(root, node.id, idx))}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Points:</span>
                  <div className="flex bg-white border border-slate-200 rounded-md p-0.5">
                    {[1, 2].map((p) => (
                      <button
                        key={p}
                        onClick={() => onUpdate((root) => TreeUtils.updateApiPoints(root, node.id, idx, p as 1 | 2))}
                        className={`px-3 py-1 text-[10px] font-bold rounded-sm transition-all ${
                          (typeof api === 'object' ? api.points : 1) === p 
                            ? 'bg-indigo-600 text-white shadow-sm' 
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        {p}pt
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={() => onUpdate((root) => TreeUtils.addApi(root, node.id))}
              className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-xs text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center justify-center gap-1"
            >
              <Plus size={14} /> Add API
            </button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-auto pt-6 border-t border-gray-100 space-y-3">
        {isLeaf ? (
          <button
            onClick={() => onUpdate((root) => TreeUtils.breakDownLeaf(root, node.id))}
            className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Break Down
          </button>
        ) : (
          <button
            onClick={() => onUpdate((root) => TreeUtils.addChildStep(root, node.id))}
            className="w-full py-2.5 bg-white border border-indigo-600 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Add Step
          </button>
        )}

        <button
          onClick={() => onDelete(node.id)}
          className="w-full py-2.5 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
        >
          <Trash size={18} /> Delete Node
        </button>
      </div>
    </div>
  );
};
