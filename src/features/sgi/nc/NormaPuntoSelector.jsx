import React, { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { NORMAS_ESTRUCTURA } from './normasData';

const findNode = (tree, id) => {
  for (const node of tree) {
    if (node.id === id) return node;
    if (node.sub) {
      const found = findNode(node.sub, id);
      if (found) return found;
    }
  }
  return null;
};

// Returns the ancestor chain for a selected id: [level1id, level2id, level3id?, ...]
const getAncestors = (tree, targetId, path = []) => {
  for (const node of tree) {
    const newPath = [...path, node.id];
    if (node.id === targetId) return newPath;
    if (node.sub) {
      const found = getAncestors(node.sub, targetId, newPath);
      if (found) return found;
    }
  }
  return null;
};

const NormaPuntoSelector = ({ norma, value, onChange }) => {
  const tree = NORMAS_ESTRUCTURA[norma] || [];

  // ancestors = [selectedL1, selectedL2, selectedL3, ...]
  const ancestors = useMemo(() => {
    if (!value) return [];
    return getAncestors(tree, value) || [];
  }, [value, tree]);

  // Build column list: always show root, then children of each selected level
  const columns = useMemo(() => {
    const cols = [tree];
    let currentSub = tree;
    for (const ancestorId of ancestors) {
      const node = findNode(currentSub, ancestorId);
      if (node?.sub?.length) {
        cols.push(node.sub);
        currentSub = node.sub;
      } else {
        break;
      }
    }
    return cols;
  }, [tree, ancestors]);

  const handleSelect = (colIndex, nodeId) => {
    // Trim ancestors to colIndex and set new selection at that level
    const newAncestors = [...ancestors.slice(0, colIndex), nodeId];
    const node = findNode(tree, nodeId);
    // If leaf node (no sub), mark as final value; otherwise mark intermediate
    onChange(nodeId);
  };

  if (norma === 'Otra' || !norma) {
    return (
      <input
        type="text"
        placeholder="Indicar punto de la norma..."
        value={value}
        onChange={e => onChange(e.target.value)}
        className="ncd-input"
      />
    );
  }

  return (
    <div className="nps-container">
      {value && (
        <div className="nps-selected-badge">
          <span>{value}</span>
          <button type="button" className="nps-clear" onClick={() => onChange('')}>×</button>
        </div>
      )}
      <div className="nps-columns">
        {columns.map((col, colIndex) => (
          <div key={colIndex} className="nps-column">
            {col.map(node => {
              const isSelected = ancestors[colIndex] === node.id;
              const isFinal = isSelected && (!node.sub || node.sub.length === 0);
              return (
                <button
                  key={node.id}
                  type="button"
                  className={`nps-item${isSelected ? ' selected' : ''}`}
                  onClick={() => handleSelect(colIndex, node.id)}
                  title={node.label}
                >
                  <span className="nps-item-label">{node.label}</span>
                  {node.sub?.length > 0 && (
                    <ChevronRight size={14} className="nps-chevron" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NormaPuntoSelector;
