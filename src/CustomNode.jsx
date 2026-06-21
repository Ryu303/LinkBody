import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

const CustomNode = ({ data, selected }) => {
  const isExternal = !data.exists;
  const targetPos = data.targetPosition || Position.Top;
  const sourcePos = data.sourcePosition || Position.Bottom;

  return (
    <div className={`custom-node ${isExternal ? 'external' : 'internal'} ${selected ? 'selected' : ''}`}>
      <Handle 
        type="target" 
        position={targetPos} 
        id="target" 
        style={{ background: '#38bdf8', width: 8, height: 8 }} 
      />
      
      <div className="node-container">
        <div className="node-header">
          <div className="node-title-wrap">
            <span className="node-indicator"></span>
            <span className="node-title" title={data.label}>{data.label}</span>
          </div>
          <span className={`node-badge ${isExternal ? 'badge-external' : 'badge-local'}`}>
            {isExternal ? '외부' : '로컬'}
          </span>
        </div>
        
        {data.summary && (
          <div className="node-summary">
            {data.summary}
          </div>
        )}
      </div>
      
      <Handle 
        type="source" 
        position={sourcePos} 
        id="source" 
        style={{ background: '#6366f1', width: 8, height: 8 }} 
      />
    </div>
  );
};

export default memo(CustomNode);
