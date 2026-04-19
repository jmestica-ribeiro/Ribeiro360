import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import './Organigrama.css';

const OrgCard = ({ node }) => (
  <motion.div
    className="org-card"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
    transition={{ duration: 0.2 }}
  >
    <div className="org-card-avatar" style={{ borderColor: node.area_color || '#e5e7eb' }}>
      {node.foto_url
        ? <img src={node.foto_url} alt={node.nombre} />
        : <User size={22} color={node.area_color || '#9ca3af'} />
      }
    </div>
    <div className="org-card-info">
      <span className="org-card-name">{node.nombre}</span>
      <span className="org-card-role">{node.cargo}</span>
      {node.area && (
        <span className="org-card-area" style={{ backgroundColor: node.area_color + '22', color: node.area_color }}>
          {node.area}
        </span>
      )}
    </div>
  </motion.div>
);

const TreeNode = ({ node, allNodes }) => {
  const children = allNodes
    .filter(n => n.parent_id === node.id)
    .sort((a, b) => a.numero_orden - b.numero_orden);

  return (
    <div className="org-tree-node">
      <OrgCard node={node} />
      {children.length > 0 && (
        <>
          <div className="org-vline" />
          <div className="org-children">
            {children.map(child => (
              <div key={child.id} className="org-child-wrap">
                <TreeNode node={child} allNodes={allNodes} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const Organigrama = () => {
  const [nodos, setNodos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    fetchNodos();
  }, []);

  const fetchNodos = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('organigrama_nodos')
      .select('*')
      .eq('activo', true)
      .order('numero_orden');
    if (data) setNodos(data);
    setIsLoading(false);
  };

  const roots = nodos.filter(n => !n.parent_id);

  return (
    <div className="organigrama-container">
      <div className="org-header">
        <div>
          <h2>Organigrama Institucional</h2>
          <p>Estructura jerárquica de Ribeiro SRL</p>
        </div>
        <div className="org-zoom-controls">
          <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} title="Alejar">
            <ZoomOut size={16} />
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(1.5, z + 0.1))} title="Acercar">
            <ZoomIn size={16} />
          </button>
          <button onClick={() => setZoom(1)} title="Restablecer">
            <Maximize2 size={16} />
          </button>
        </div>
      </div>

      <div className="org-viewport">
        {isLoading ? (
          <div className="org-loading">
            {[1,2,3].map(i => <div key={i} className="skeleton" style={{ width: 180, height: 96, borderRadius: 12 }} />)}
          </div>
        ) : roots.length === 0 ? (
          <div className="org-empty">
            <User size={40} />
            <p>No hay nodos en el organigrama todavía.</p>
            <span>Agregá nodos desde el Panel Admin.</span>
          </div>
        ) : (
          <div className="org-tree-wrapper" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
            {roots.map(root => (
              <TreeNode key={root.id} node={root} allNodes={nodos} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Organigrama;
