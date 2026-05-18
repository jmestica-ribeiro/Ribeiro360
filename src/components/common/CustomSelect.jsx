import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import './CustomSelect.css';

const CustomSelect = ({ options, value, onChange, icon: Icon, placeholder }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = options.find(o => (o.value ?? o) === value);
  const label = selected ? (selected.label ?? selected) : (placeholder || options[0]);
  const isDefault = value === options[0]?.value ?? value === options[0];

  return (
    <div className={`cselect-root${open ? ' cselect-open' : ''}${!isDefault ? ' cselect-active' : ''}`} ref={ref}>
      <button className="cselect-trigger" onClick={() => setOpen(o => !o)} type="button">
        {Icon && <Icon size={13} className="cselect-icon" />}
        <span className="cselect-value">{label}</span>
        <ChevronDown size={13} className="cselect-chevron" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="cselect-panel"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
          >
            {options.map((opt) => {
              const val = opt.value ?? opt;
              const lbl = opt.label ?? opt;
              const active = val === value;
              return (
                <button
                  key={val}
                  className={`cselect-item${active ? ' cselect-item-active' : ''}`}
                  onClick={() => { onChange(val); setOpen(false); }}
                  type="button"
                >
                  <span>{lbl}</span>
                  {active && <Check size={13} className="cselect-check" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomSelect;
