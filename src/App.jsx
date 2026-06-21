import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  MarkerType,
} from '@xyflow/react';
import dagre from 'dagre';
import { Search, Brain, Folder, Network, HelpCircle, LayoutGrid, Edit3, Save, X } from 'lucide-react';
import CustomNode from './CustomNode';
import graphData from '../data.json';

// Import CSS
import '@xyflow/react/dist/style.css';
import './index.css';

// Node type mapping
const nodeTypes = {
  custom: CustomNode,
};

// Dagre Layout function
const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === 'LR';
  
  // Configure Dagre spacing
  dagreGraph.setGraph({ 
    rankdir: direction, 
    ranker: 'network-simplex', 
    nodesep: 60, 
    ranksep: 100 
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 260, height: 110 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: isHorizontal ? 'left' : 'top',
      sourcePosition: isHorizontal ? 'right' : 'bottom',
      position: {
        x: nodeWithPosition.x - 130, // offset half width
        y: nodeWithPosition.y - 55,  // offset half height
      },
    };
  });
};

function GraphApp() {
  const { fitView } = useReactFlow();
  
  // Graph reactive state
  const [currentGraphData, setCurrentGraphData] = useState(graphData);
  
  // Layout direction state: 'TB' (Top-to-Bottom) or 'LR' (Left-to-Right)
  const [direction, setDirection] = useState('TB');
  
  // Search query
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected Node state
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  // Map initial nodes and edges from currentGraphData
  const initialNodes = useMemo(() => {
    return currentGraphData.nodes.map((node) => ({
      id: node.id,
      type: 'custom',
      data: {
        label: node.label,
        group: node.group,
        summary: node.summary,
        content: node.content,
        exists: node.exists,
      },
      position: { x: 0, y: 0 },
    }));
  }, [currentGraphData]);

  const initialEdges = useMemo(() => {
    return currentGraphData.edges.map((edge, idx) => ({
      id: `edge-${idx}`,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      animated: true,
      style: { stroke: 'rgba(99, 102, 241, 0.45)', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#6366f1',
        width: 15,
        height: 15,
      },
    }));
  }, [currentGraphData]);

  // React Flow states
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Perform layouting when direction or graph data updates
  useEffect(() => {
    const layouted = getLayoutedElements(initialNodes, initialEdges, direction);
    setNodes(layouted);
    setEdges(initialEdges);
    
    // Fit view after a tiny delay to ensure nodes are mounted
    setTimeout(() => {
      fitView({ padding: 0.15, duration: 800 });
    }, 100);
  }, [direction, initialNodes, initialEdges, setNodes, setEdges, fitView]);

  // Toast Auto-dismiss
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Highlight nodes matching search
  const filteredNodesList = useMemo(() => {
    return currentGraphData.nodes.filter(
      (node) =>
        node.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (node.summary && node.summary.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [searchQuery, currentGraphData]);

  // Modify nodes dynamically to highlight searched items and selection
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        const matchesSearch =
          searchQuery &&
          (node.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (node.data.summary && node.data.summary.toLowerCase().includes(searchQuery.toLowerCase())));

        return {
          ...node,
          selected: node.id === selectedNodeId,
          style: matchesSearch
            ? { border: '2px solid #06b6d4', boxShadow: '0 0 16px rgba(6, 182, 212, 0.5)' }
            : undefined,
        };
      })
    );
  }, [searchQuery, selectedNodeId, setNodes]);

  // Center canvas on a specific node
  const handleSelectNode = useCallback(
    (nodeId) => {
      setIsEditing(false); // Reset edit state on navigation
      setSelectedNodeId(nodeId);
      const node = nodes.find((n) => n.id === nodeId);
      if (node) {
        fitView({
          nodes: [{ id: nodeId }],
          duration: 800,
          maxZoom: 1.1,
          padding: 0.2,
        });
      }
    },
    [nodes, fitView]
  );

  // React Flow node click event
  const onNodeClick = useCallback(
    (_, node) => {
      setIsEditing(false); // Reset edit state on click
      setSelectedNodeId(node.id);
    },
    []
  );

  // Get active node detail
  const activeNode = useMemo(() => {
    if (!selectedNodeId) return null;
    return currentGraphData.nodes.find((node) => node.id === selectedNodeId);
  }, [selectedNodeId, currentGraphData]);

  // Save modified markdown to file
  const handleSave = async () => {
    if (!activeNode) return;
    try {
      const response = await fetch('/api/save-node', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: activeNode.id, content: editContent }),
      });
      
      if (!response.ok) throw new Error('저장에 실패했습니다.');
      
      const updatedData = await response.json();
      setCurrentGraphData(updatedData);
      setIsEditing(false);
      setToastMessage('성공적으로 저장되었습니다!');
    } catch (err) {
      console.error(err);
      setToastMessage('저장 중 오류가 발생했습니다.');
    }
  };

  // Simple Markdown inline parser with wiki-link navigation support
  const parseInlineContent = (text, allNodes, onLinkClick) => {
    if (!text) return '';
    const regex = /(\[\[.*?\]\]|\*\*.*?\*\*)/g;
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (part.startsWith('[[') && part.endsWith(']]')) {
        const inner = part.substring(2, part.length - 2);
        const linkParts = inner.split('|');
        const targetId = linkParts[0].split('#')[0].trim();
        const displayLabel = linkParts[1] ? linkParts[1].trim() : targetId;

        const targetExists = allNodes.some((n) => n.id === targetId && n.exists);

        return (
          <span
            key={index}
            className={`wikilink ${!targetExists ? 'missing' : ''}`}
            onClick={() => targetExists && onLinkClick(targetId)}
            title={targetExists ? `${targetId} 노드로 이동` : '외부 노드 (파일 없음)'}
          >
            {displayLabel}
          </span>
        );
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.substring(2, part.length - 2)}</strong>;
      }
      return part;
    });
  };

  // Convert raw markdown to React components
  const renderMarkdown = (text, allNodes, onLinkClick) => {
    if (!text) return null;
    const lines = text.split('\n');

    return lines.map((line, idx) => {
      const trimmed = line.trim();

      // Heading 1
      if (trimmed.startsWith('# ')) {
        return (
          <h1 key={idx} className="md-h1">
            {parseInlineContent(trimmed.substring(2), allNodes, onLinkClick)}
          </h1>
        );
      }
      // Heading 2
      if (trimmed.startsWith('## ')) {
        return (
          <h2 key={idx} className="md-h2">
            {parseInlineContent(trimmed.substring(3), allNodes, onLinkClick)}
          </h2>
        );
      }
      // Heading 3
      if (trimmed.startsWith('### ')) {
        return (
          <h3 key={idx} className="md-h3">
            {parseInlineContent(trimmed.substring(4), allNodes, onLinkClick)}
          </h3>
        );
      }
      // Lists
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        return (
          <li key={idx} className="md-li">
            {parseInlineContent(trimmed.substring(2), allNodes, onLinkClick)}
          </li>
        );
      }
      // Empty lines
      if (trimmed === '') {
        return <div key={idx} className="md-spacer" style={{ height: '10px' }} />;
      }
      // Default paragraph
      return (
        <p key={idx} className="md-p">
          {parseInlineContent(line, allNodes, onLinkClick)}
        </p>
      );
    });
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = currentGraphData.nodes.length;
    const local = currentGraphData.nodes.filter(n => n.exists).length;
    const external = total - local;
    return { total, local, external };
  }, [currentGraphData]);

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notification">
          {toastMessage}
        </div>
      )}

      {/* Left Sidebar (Search, Info, Node List) */}
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-title">
            <Brain size={22} className="text-indigo-400" />
            Obsidian 보상 패턴 맵
          </div>
          <div className="sidebar-subtitle">해부학적 기능 보상 시각화 분석기</div>
        </div>

        <div className="sidebar-content">
          <div className="search-container">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="패턴/통증 검색..."
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">전체 노드</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#818cf8' }}>{stats.local}</div>
              <div className="stat-label">로컬 파일</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#94a3b8' }}>{stats.external}</div>
              <div className="stat-label">미작성 연결</div>
            </div>
          </div>

          <div className="node-list">
            {filteredNodesList.length === 0 ? (
              <div style={{ color: '#64748b', fontSize: '0.8rem', textAlign: 'center', marginTop: '20px' }}>
                검색 결과가 없습니다.
              </div>
            ) : (
              filteredNodesList.map((node) => (
                <div
                  key={node.id}
                  className={`node-list-item ${selectedNodeId === node.id ? 'selected' : ''}`}
                  onClick={() => handleSelectNode(node.id)}
                >
                  <div className="node-list-item-header">
                    <span className="node-list-item-title">{node.id}</span>
                    <span className={`node-list-item-tag ${node.exists ? 'local' : 'external'}`}>
                      {node.exists ? '로컬' : '외부'}
                    </span>
                  </div>
                  {node.summary && (
                    <span className="node-list-item-desc">
                      {node.summary.replace(/\n/g, ' ')}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="canvas-container">
        {/* Layout direction toolbar */}
        <div className="layout-toolbar">
          <button
            className={`toolbar-button ${direction === 'TB' ? 'active' : ''}`}
            onClick={() => setDirection('TB')}
            title="상하 배치 적용"
          >
            <Network size={14} style={{ transform: 'rotate(90deg)' }} />
            상하 계층형
          </button>
          <button
            className={`toolbar-button ${direction === 'LR' ? 'active' : ''}`}
            onClick={() => setDirection('LR')}
            title="좌우 배치 적용"
          >
            <Network size={14} />
            좌우 계층형
          </button>
          <button
            className="toolbar-button"
            onClick={() => fitView({ padding: 0.15, duration: 800 })}
            title="화면 맞춤"
          >
            <LayoutGrid size={14} />
            전체 맞춤
          </button>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.2}
          maxZoom={2}
        >
          <Controls />
          <MiniMap nodeStrokeWidth={3} zoomable pannable />
          <Background color="rgba(255, 255, 255, 0.05)" gap={16} size={1} />
        </ReactFlow>
      </div>

      {/* Right Sidebar (Details & Editor) */}
      <div className="sidebar right">
        <div className="sidebar-content" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {activeNode ? (
            <div className="detail-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="detail-header" style={{ flexShrink: 0 }}>
                <div className="detail-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div className="detail-meta">
                    <Folder size={14} className="text-gray-400" />
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {activeNode.group === 'external' ? '미작성 연결' : `보상패턴 볼트 / ${activeNode.group}`}
                    </span>
                  </div>
                  
                  <div className="detail-actions">
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="action-button save" onClick={handleSave} title="저장">
                          <Save size={12} />
                          저장
                        </button>
                        <button className="action-button cancel" onClick={() => setIsEditing(false)} title="취소">
                          <X size={12} />
                          취소
                        </button>
                      </div>
                    ) : (
                      <button 
                        className="action-button edit" 
                        onClick={() => {
                          setEditContent(activeNode.content || '');
                          setIsEditing(true);
                        }}
                        title="편집"
                      >
                        <Edit3 size={12} />
                        편집
                      </button>
                    )}
                  </div>
                </div>
                <h1 className="detail-title">{activeNode.id}</h1>
              </div>

              <div className="detail-body-scroll" style={{ flex: 1, overflowY: 'auto', marginTop: '16px' }}>
                {isEditing ? (
                  <textarea
                    className="editor-textarea"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="마크다운 형식으로 내용을 편집할 수 있습니다..."
                  />
                ) : (
                  <div className="markdown-body">
                    {renderMarkdown(activeNode.content, currentGraphData.nodes, handleSelectNode)}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="detail-empty">
              <HelpCircle size={40} className="detail-empty-icon" />
              <h3>분석 대상을 선택해 주세요</h3>
              <p style={{ fontSize: '0.75rem', marginTop: '6px', color: '#64748b' }}>
                좌측 목록이나 중앙 그래프에서 노드를 선택하면 자세한 연결 구조와 해부학적 해설을 볼 수 있습니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <GraphApp />
    </ReactFlowProvider>
  );
}

